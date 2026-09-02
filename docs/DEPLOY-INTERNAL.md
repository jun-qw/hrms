# 사내 서버 배포 가이드

회사 내부 서버(항상 켜 두는 PC 한 대면 충분합니다)에 올려서, 직원들이 사내망에서
브라우저로 접속하게 하는 절차입니다. 인사시스템을 처음 설치하는 사람을 기준으로
썼습니다.

**소요 시간**: 처음이면 1~2시간 (대부분 Docker 설치 대기).

## 준비물

- 항상 켜 두는 Windows PC 또는 서버 1대 (메모리 8GB 이상 권장)
- 그 PC의 **고정 IP** — 공유기/네트워크 관리 화면에서 IP를 고정하세요.
  IP가 바뀌면 직원들이 저장해 둔 주소가 끊어집니다.
- GitHub `jun-qw` 계정 접근 (저장소가 비공개라 로그인이 필요합니다)

## 1. Docker 설치

서버 PC에서 https://www.docker.com/products/docker-desktop 에서
**Docker Desktop for Windows**를 내려받아 설치합니다. 설치 후 재부팅하고,
Docker Desktop을 실행해 왼쪽 아래가 초록색(Engine running)이 될 때까지
기다립니다.

> Docker Desktop 설정 → General → **"Start Docker Desktop when you sign in"**
> 을 켜 두세요. PC가 재부팅돼도 시스템이 저절로 올라옵니다.

## 2. 소스 받기

명령 프롬프트(cmd)에서:

```bash
git clone https://github.com/jun-qw/hrms.git C:\hrms
```

로그인을 물으면 jun-qw 계정으로 로그인합니다. (또는 GitHub 웹에서
Code → Download ZIP 으로 받아 `C:\hrms` 에 풀어도 됩니다.)

## 3. 설정 파일 만들기

`C:\hrms` 폴더에 `.env` 라는 이름의 파일을 만들고 아래 내용을 채웁니다.
`.env.docker.example` 을 복사해서 고쳐도 됩니다.

```
POSTGRES_PASSWORD=여기에-데이터베이스-비밀번호
SESSION_SECRET=여기에-64자리-무작위-문자열
RESIDENT_NUMBER_KEY=여기에-또다른-64자리-무작위-문자열
SEED_ADMIN_EMAIL=admin@daehan-at.co.kr
SEED_ADMIN_PASSWORD=여기에-관리자-초기-비밀번호
APP_PORT=3000
```

무작위 문자열은 명령 프롬프트에서 이렇게 만듭니다 (두 번 실행해서 각각 사용):

```bash
powershell -Command "-join ((48..57)+(97..102) | Get-Random -Count 64 | % {[char]$_})"
```

> **`RESIDENT_NUMBER_KEY` 는 반드시 따로 보관하세요.** 주민등록번호 암호화
> 키입니다. 이 키를 잃어버리면 데이터베이스 백업이 있어도 주민번호를 되살릴
> 수 없습니다. `.env` 파일 전체를 USB 등 안전한 곳에 복사해 두는 것을
> 권장합니다.

## 4. 올리기

```bash
cd C:\hrms
docker compose up -d --build
```

처음에는 이미지를 빌드하느라 5~10분 걸립니다. 끝나면:

```bash
docker compose ps
```

`hrms-app` 과 `hrms-db` 가 모두 `running (healthy)` 이면 성공입니다.
서버 PC 브라우저에서 http://localhost:3000 이 열리는지 확인하세요.
시작 시 마이그레이션과 기본 시드가 자동으로 돕니다.

## 5. 데이터 옮기기 (개발 PC → 서버)

개발 PC(지금까지 작업한 컴퓨터)에서 자료를 내보냅니다:

```bash
npm run db:export hrms-export.json
```

> 개발 서버(npm run start:prod)가 떠 있으면 먼저 끄세요 — 개발 DB는 한
> 프로세스만 열 수 있습니다.

만들어진 `hrms-export.json` 을 USB나 사내망 공유폴더로 서버 PC의 `C:\hrms` 에
복사한 뒤, 서버 PC에서:

```bash
cd C:\hrms
docker compose cp hrms-export.json app:/tmp/hrms-export.json
docker compose exec app node scripts/import-data.js /tmp/hrms-export.json --wipe
```

`총 7,516행 들여왔습니다` 같은 요약이 나오면 끝입니다. 명부 115명, 급여
기준액, 근태, 연도별 요율, 로그인 계정까지 전부 옮겨집니다.

> **옮긴 뒤 `hrms-export.json` 은 양쪽 PC에서 모두 지우세요.** 전 직원의
> 개인정보가 들어 있는 파일입니다.

> 개발 DB의 주민등록번호는 암호화된 채로 옮겨지므로, 서버의
> `RESIDENT_NUMBER_KEY` 가 개발 PC `.env.local` 의 키와 **같아야** 복호화
> 됩니다. 키를 새로 만들었으면 개발 PC 키를 서버 `.env` 에 그대로 옮기세요.

## 6. 직원 접속

서버 PC의 IP를 확인합니다 (`ipconfig` → IPv4 주소, 예: 192.168.0.50).
직원들은 사내망에서 브라우저로:

```
http://192.168.0.50:3000
```

Windows 방화벽이 물으면 "허용"을 누르고, 안 물었는데 다른 PC에서 안 열리면:

```bash
netsh advfirewall firewall add rule name="HRMS" dir=in action=allow protocol=TCP localport=3000
```

각 직원의 로그인 계정은 관리자가 만들어 줍니다. 일반 직원은 로그인하면
마이페이지만 보입니다 — 더 열어 주려면 설정 > 메뉴권한에서 조정합니다.

## 7. 백업 (반드시)

데이터베이스는 Docker 볼륨(`hrms-pgdata`) 안에 있습니다. 주 1회 이상:

```bash
docker compose exec db pg_dump -U hrms hrms > C:\hrms-backup\hrms-%date:~0,10%.sql
```

작업 스케줄러에 등록해 두면 자동으로 됩니다. **백업 파일과
`RESIDENT_NUMBER_KEY` 는 한 쌍입니다** — 파일만 있고 키가 없으면 주민번호는
복구되지 않습니다.

복원은:

```bash
docker compose exec -T db psql -U hrms hrms < 백업파일.sql
```

## 8. 업데이트

코드가 바뀌면 서버 PC에서:

```bash
cd C:\hrms
git pull
docker compose up -d --build
```

자료는 볼륨에 있어 그대로 남고, 마이그레이션은 시작할 때 자동으로 적용됩니다.

## 하지 말 것

- **포트를 인터넷에 열지 마세요** (공유기 포트포워딩 금지). 이 구성은
  사내망 전용입니다. HTTPS와 접속 통제 없이 인터넷에 열면 전 직원의
  개인정보가 위험해집니다. 외부 접속이 필요해지면 VPN을 먼저 검토하세요.
- `.env` 를 카톡·메일로 보내지 마세요. 비밀키가 들어 있습니다.
- `docker compose down -v` 를 함부로 치지 마세요 — `-v` 는 **데이터 볼륨까지
  지웁니다.** 내리기만 할 때는 `docker compose down` 입니다.

## 문제가 생기면

| 증상 | 확인 |
|------|------|
| 페이지가 안 열림 | `docker compose ps` — app 이 restarting 이면 `docker compose logs app --tail 50` |
| "SESSION_SECRET is not set" | `.env` 파일이 `C:\hrms` 에 있는지, 이름이 정확히 `.env` 인지 (`.env.txt` 아님) |
| 다른 PC에서만 안 열림 | 방화벽 규칙 (6번 항목) · 서버 IP가 바뀌지 않았는지 |
| 로그인이 안 됨 | 관리자 계정은 `.env` 의 SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD |
