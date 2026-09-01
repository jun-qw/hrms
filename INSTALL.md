# 설치 가이드

*한국어 · [English](INSTALL.en.md)*

Docker와 Docker Compose만 있으면 서버 한 대에 설치할 수 있습니다.
데이터베이스 생성, 스키마 적용, 기본 데이터 입력은 첫 기동 때 자동으로 처리됩니다.

## 1. 요구 사항

- Docker Engine 24 이상 (Docker Compose v2 포함)
- 서버 여유 메모리 2GB, 디스크 5GB 이상
- 열어야 할 포트: 애플리케이션 1개(기본 3000). 데이터베이스 포트는 외부에 노출하지 않습니다.

## 2. 설정

```bash
cp .env.docker.example .env
```

`.env`를 열어 아래 세 가지를 반드시 채웁니다.

| 항목 | 설명 |
|------|------|
| `POSTGRES_PASSWORD` | 데이터베이스 비밀번호 |
| `SESSION_SECRET` | 로그인 세션 서명 키 (아래 명령으로 생성) |
| `SEED_ADMIN_PASSWORD` | 최초 관리자 계정의 비밀번호 |

세션 키 생성:

```bash
openssl rand -hex 32
```

`SESSION_SECRET`이 비어 있거나 예시 값 그대로면 컨테이너가 시작을 거부합니다.

## 3. 실행

```bash
docker compose up -d
```

첫 기동에는 이미지 빌드까지 포함해 몇 분이 걸립니다. 진행 상황은 다음으로 확인합니다.

```bash
docker compose logs -f app
```

`hrms: starting server on port 3000`이 보이면 준비가 끝난 것입니다.
브라우저에서 `http://<서버주소>:3000` 으로 접속해 `.env`에 지정한 관리자 계정으로 로그인합니다.

> **첫 로그인 후 관리자 비밀번호를 변경하세요.** `.env` 파일에 평문으로 남아 있습니다.

## 4. 최초 설정 순서

1. **설정 > 브랜딩** — 회사 로고, 시스템 이름, 브랜드 색상을 등록합니다.
2. **설정 > 회사정보** — 회사명, 사업자등록번호, 대표자, 주소를 입력합니다.
   증명서와 급여명세서에 그대로 출력됩니다.
3. **인사정보 > 데이터 가져오기** — 엑셀 템플릿을 내려받아 조직도와 사원 명부를
   작성한 뒤 업로드합니다. 부서·직급·직책·사원이 한 번에 등록됩니다.
4. **설정 > 급여설정** — 4대보험 요율과 비과세 한도를 회사 기준에 맞게 조정합니다.
5. **설정 > 메뉴권한** — 역할별로 접근 가능한 메뉴를 조정합니다.

## 5. 운영

### 상태 확인

```bash
docker compose ps
curl http://localhost:3000/api/health
```

`{"status":"ok","database":"ok"}` 가 정상 응답입니다.

### 백업

모든 데이터(직원, 근태, 급여, 설정, 로고까지)는 데이터베이스 한 곳에 있습니다.

```bash
docker compose exec -T db pg_dump -U hrms hrms | gzip > hrms-$(date +%F).sql.gz
```

복원:

```bash
gunzip -c hrms-2026-01-31.sql.gz | docker compose exec -T db psql -U hrms hrms
```

정기 백업은 위 명령을 cron에 등록하면 됩니다.

### 업그레이드

```bash
git pull            # 또는 새 소스 배포
docker compose build app
docker compose up -d
```

새 버전의 데이터베이스 변경 사항은 기동 시 자동 적용됩니다. 업그레이드 전 백업을 권장합니다.

### 로그

```bash
docker compose logs -f app     # 애플리케이션
docker compose logs -f db      # 데이터베이스
```

## 6. 참고 사항

### 외부 데이터베이스 사용

사내 PostgreSQL을 이미 운영 중이라면 compose의 `db` 서비스를 지우고
`app` 서비스의 `DATABASE_URL`만 해당 서버로 지정하면 됩니다.
PostgreSQL 14 이상을 지원합니다.

### HTTPS

이 이미지는 HTTP로 서비스합니다. 외부에 공개한다면 앞단에 Nginx, Caddy 같은
리버스 프록시를 두고 TLS를 종료시키세요. 세션 쿠키는 `NODE_ENV=production`에서
`Secure` 속성으로 발급되므로 HTTPS 환경이 필요합니다.

### 데모 데이터

기능을 먼저 살펴보려면 `.env`에 `SEED_DEMO_DATA=true`를 설정한 뒤 기동하세요.
가상의 직원 110명과 조직도가 함께 등록됩니다. **실제 운영 설치에서는 `false`로 두세요.**

데모 데이터를 지우고 처음부터 시작하려면 관리자로 로그인해
**인사정보 > 데이터 가져오기 > 전체 데이터 초기화**를 실행합니다.

### 전체 삭제

```bash
docker compose down -v    # -v 는 데이터베이스 볼륨까지 삭제합니다
```

## 7. 문제 해결

| 증상 | 확인할 것 |
|------|-----------|
| `SESSION_SECRET is not set` 로그 후 종료 | `.env`의 `SESSION_SECRET` 값을 채웠는지 |
| `database was not reachable` 로그 후 종료 | `docker compose logs db`, 디스크 여유 공간 |
| 로그인은 되는데 화면이 비어 있음 | `curl /api/health`의 `database` 값, 앱 로그의 오류 |
| 포트 충돌 | `.env`의 `APP_PORT`를 다른 값으로 변경 |
