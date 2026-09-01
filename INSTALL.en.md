# Installation Guide

*[한국어](INSTALL.md) · English*

Docker and Docker Compose are all you need to install this on a single server.
Creating the database, applying the schema and loading the default data all
happen automatically on first start.

## 1. Requirements

- Docker Engine 24 or later (including Docker Compose v2)
- 2 GB free memory and 5 GB free disk on the server
- One port to open: the application (3000 by default). The database port is not
  exposed outside the host.

## 2. Configuration

```bash
cp .env.docker.example .env
```

Open `.env` and fill in these three values. They have no usable defaults.

| Setting | Purpose |
|---------|---------|
| `POSTGRES_PASSWORD` | Database password |
| `SESSION_SECRET` | Signs the login session cookie (generate it, see below) |
| `SEED_ADMIN_PASSWORD` | Password for the first administrator account |

Generate the session secret:

```bash
openssl rand -hex 32
```

The container refuses to start if `SESSION_SECRET` is empty or still holds the
example value.

## 3. Starting

```bash
docker compose up -d
```

The first start takes a few minutes because it builds the image. Watch progress
with:

```bash
docker compose logs -f app
```

`hrms: starting server on port 3000` means it is ready. Open
`http://<server-address>:3000` and sign in with the administrator account you
configured in `.env`.

> **Change the administrator password after the first sign-in.** It is stored in
> plain text in `.env`.

## 4. First-run setup order

1. **Settings › Branding (브랜딩)** — company logo, product name, brand colour.
2. **Settings › Company info (회사정보)** — company name, registration number,
   representative, address. These print on certificates and payslips exactly as
   entered.
3. **Employees › Data import (데이터 가져오기)** — download the Excel template,
   fill in the organisation and staff list, and upload it. Departments, ranks,
   titles and employees are registered in one pass.
4. **Settings › Payroll (급여설정)** — adjust the social-insurance rates and
   tax-free allowance limits to the company's figures.
5. **Settings › Menu permissions (메뉴권한)** — decide which menus each role sees.

## 5. Operating

### Health check

```bash
docker compose ps
curl http://localhost:3000/api/health
```

A healthy response is `{"status":"ok","database":"ok"}`.

### Backup

Everything — employees, attendance, payroll, settings, even logos and attached
documents — lives in the one database.

```bash
docker compose exec -T db pg_dump -U hrms hrms | gzip > hrms-$(date +%F).sql.gz
```

Restore:

```bash
gunzip -c hrms-2026-01-31.sql.gz | docker compose exec -T db psql -U hrms hrms
```

Schedule the backup command with cron for regular backups.

### Upgrading

```bash
git pull            # or deploy the new source
docker compose build app
docker compose up -d
```

Database changes in the new version are applied automatically on start. Take a
backup first.

### Logs

```bash
docker compose logs -f app     # application
docker compose logs -f db      # database
```

## 6. Notes

### Using an existing PostgreSQL server

If the customer already runs PostgreSQL, delete the `db` service from the
compose file and point `DATABASE_URL` on the `app` service at their server.
PostgreSQL 14 or later is supported.

### HTTPS

This image serves plain HTTP. Put a reverse proxy (Nginx, Caddy) in front of it
and terminate TLS there if it is reachable from outside. Session cookies are
issued with the `Secure` attribute under `NODE_ENV=production`, so HTTPS is
required in that case.

### Demo data

To explore the product first, set `SEED_DEMO_DATA=true` in `.env` before
starting. A sample organisation of 110 employees is loaded alongside the
defaults. **Leave it `false` for a real installation.**

To clear the demo data and start clean, sign in as administrator and use
**Employees › Data import › Reset all data (전체 데이터 초기화)**.

### Removing everything

```bash
docker compose down -v    # -v also deletes the database volume
```

## 7. Troubleshooting

| Symptom | What to check |
|---------|---------------|
| Exits with `SESSION_SECRET is not set` | Whether `SESSION_SECRET` in `.env` has a value |
| Exits with `database was not reachable` | `docker compose logs db`, free disk space |
| Signs in but screens are empty | The `database` field of `curl /api/health`, then the app logs |
| Port already in use | Change `APP_PORT` in `.env` |
