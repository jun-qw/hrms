/**
 * 이름 이니셜 아바타.
 *
 * 사진이 없는 사원이 대부분이라 목록·카드에서는 이름 두 글자를 색 원 위에
 * 올립니다. 색은 이름 해시로 고정되므로 같은 사람은 어느 화면에서나 같은
 * 색입니다. 팔레트는 디자인 시안의 9색 — 채도를 낮춘 먹색 계열이라 상태색과
 * 헷갈리지 않습니다.
 */
const AVATAR_PALETTE = [
  '#3b4a7a',
  '#8a5a15',
  '#2f6b4a',
  '#a3341f',
  '#5b3a7a',
  '#7a5b3b',
  '#3a6b7a',
  '#7a3a5b',
  '#4a5b3a',
];

export function avatarColor(seed: string): string {
  let sum = 0;
  for (const ch of seed) sum += ch.charCodeAt(0);
  return AVATAR_PALETTE[Math.abs(sum) % AVATAR_PALETTE.length];
}

/** 한국 이름은 성 1자 + 이름 첫 자, 영문은 첫 두 글자. */
export function initials(name: string): string {
  const trimmed = name.replace(/\s/g, '');
  if (!trimmed) return '?';
  if (/^[A-Za-z]/.test(trimmed)) {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : trimmed.slice(0, 2).toUpperCase();
  }
  return trimmed.slice(0, 2);
}
