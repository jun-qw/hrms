import 'server-only';
import crypto from 'crypto';

/**
 * 주민등록번호 같은 고유식별정보 다루기.
 *
 * 개인정보보호법 제24조의2는 주민등록번호를 **암호화하여 저장**하도록 정하고
 * 있습니다(시행령 제21조의2). 지금까지 `employees.resident_number` 는 평문
 * 컬럼이었습니다 — 데이터베이스 백업 파일 하나가 새면 전 직원의 주민번호가
 * 그대로 나갑니다.
 *
 * 여기서 정하는 규칙은 세 가지입니다.
 *
 * 1. **저장은 암호화.** AES-256-GCM. 열마다 난수 IV를 쓰므로 같은 번호도 서로
 *    다른 암호문이 됩니다.
 * 2. **화면은 마스킹이 기본.** 생년월일 여섯 자리와 성별 한 자리까지만 보이고
 *    뒤는 가립니다. 실무에서 필요한 것은 대부분 여기까지입니다.
 * 3. **전체 열람은 별도 요청 + 기록.** 마스킹을 벗기려면 따로 서버 액션을
 *    호출해야 하고, 그 호출은 감사로그에 남습니다. 목록 조회에 섞어 두면
 *    "누가 언제 누구 것을 봤는가" 를 영영 알 수 없습니다.
 *
 * 키는 `RESIDENT_NUMBER_KEY` 환경변수에서 읽습니다. 없으면 `SESSION_SECRET` 을
 * 재료로 파생합니다 — 별도 키를 두는 편이 낫지만, 키가 없다고 조용히 평문으로
 * 저장하는 것보다는 낫습니다.
 */

const ALGORITHM = 'aes-256-gcm';
/** 암호문임을 알아보는 표시. 이미 있는 평문과 섞여 있어도 구분됩니다. */
const PREFIX = 'enc.v1.';

function key(): Buffer {
  const explicit = process.env.RESIDENT_NUMBER_KEY;
  if (explicit && explicit.length >= 32) {
    return crypto.createHash('sha256').update(explicit).digest();
  }
  const fallback = process.env.SESSION_SECRET;
  if (!fallback || fallback.startsWith('change-me')) {
    throw new Error(
      'RESIDENT_NUMBER_KEY 또는 SESSION_SECRET 이 설정되지 않았습니다. 주민등록번호를 암호화할 수 없습니다.',
    );
  }
  // 세션 키를 그대로 쓰지 않고 용도를 섞어 파생합니다. 한쪽이 새도 다른 쪽을
  // 바로 풀지 못하게 하기 위해서입니다.
  return crypto.createHash('sha256').update(`resident-number:${fallback}`).digest();
}

export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

/** 저장용 암호문. 빈 값은 그대로 둡니다 — 빈 문자열을 암호화할 이유가 없습니다. */
export function encryptSensitive(plain: string | null | undefined): string | null {
  const raw = String(plain ?? '').trim();
  if (!raw) return null;
  if (isEncrypted(raw)) return raw;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key(), iv);
  const body = Buffer.concat([cipher.update(raw, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64url')}.${tag.toString('base64url')}.${body.toString('base64url')}`;
}

/**
 * 평문으로 되돌립니다.
 *
 * 암호문이 아니면 그대로 돌려줍니다 — 이행 도중에는 암호화된 행과 아직 안 된
 * 행이 섞여 있고, 그때 실패시키면 화면이 통째로 비어 버립니다.
 */
export function decryptSensitive(stored: string | null | undefined): string | null {
  const raw = String(stored ?? '').trim();
  if (!raw) return null;
  if (!isEncrypted(raw)) return raw;

  try {
    const [ivPart, tagPart, bodyPart] = raw.slice(PREFIX.length).split('.');
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      key(),
      Buffer.from(ivPart, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(bodyPart, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    // 키가 바뀌었거나 자료가 손상된 경우입니다. 조용히 평문처럼 보여 주면
    // 담당자가 암호문을 주민번호로 착각해 옮겨 적습니다.
    return null;
  }
}

/**
 * 화면에 기본으로 나가는 형태 — `900101-1******`.
 *
 * 뒤 여섯 자리를 가립니다. 성별 자리(7번째)까지 남기는 것은 실무에서 성별
 * 확인에 쓰이고, 그 한 자리만으로는 나머지를 알 수 없기 때문입니다.
 */
export function maskResidentNumber(plain: string | null | undefined): string | null {
  const digits = String(plain ?? '').replace(/\D/g, '');
  if (digits.length < 7) return plain ? '******' : null;
  return `${digits.slice(0, 6)}-${digits[6]}${'*'.repeat(6)}`;
}

/** 저장된 값(암호문이든 평문이든)을 바로 마스킹 형태로. */
export function maskStored(stored: string | null | undefined): string | null {
  return maskResidentNumber(decryptSensitive(stored));
}

/** 형식 검사. 13자리이고 생년월일이 말이 되는지까지만 봅니다. */
export function isValidResidentNumber(plain: string | null | undefined): boolean {
  const d = String(plain ?? '').replace(/\D/g, '');
  if (d.length !== 13) return false;
  const century = { '1': 1900, '2': 1900, '3': 2000, '4': 2000, '5': 1900, '6': 1900, '7': 2000, '8': 2000, '9': 1800, '0': 1800 }[d[6]];
  if (!century) return false;
  const year = century + Number(d.slice(0, 2));
  const month = Number(d.slice(2, 4));
  const day = Number(d.slice(4, 6));
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const probe = new Date(year, month - 1, day);
  return probe.getMonth() === month - 1 && probe.getDate() === day;
}
