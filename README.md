# ClearPrice

**Hospital Price Transparency Platform**

ClearPrice makes hospital pricing data searchable and understandable. It ingests
the CMS-mandated machine-readable files that every U.S. hospital must publish
under 45 CFR Part 180, parses and indexes them, and puts a simple search UI
in front. Includes AI-powered Q&A, comparison tools, and an admin control panel
for managing ingestion.

Live at: https://clearpricehealth.org

## What's in here

```
backend/    FastAPI + Celery + SQLAlchemy (Python 3.11+)
frontend/   Next.js 14 + TypeScript + Tailwind
ops/        systemd service units
```

## Stack

| Layer | Technology |
|---|---|
| API | FastAPI 0.136, Pydantic 2, async SQLAlchemy 2 |
| Worker | Celery 5.6, Redis broker |
| Database | PostgreSQL 17 (pg_trgm, pgcrypto, tsvector) |
| AI | Anthropic Claude (runtime config via DB) |
| Frontend | Next.js 14 App Router + TypeScript + Tailwind + Material Design 3 tokens |
| Auth | PyJWT + bcrypt (no python-jose / no passlib) |
| Monitoring | Celery Flower, self-hosted Umami analytics |

## Features

- **Search**: Full-text (tsvector) + fuzzy (pg_trgm) across all procedures
- **Compare**: 2-5 hospitals side-by-side on the same procedure with savings analysis
- **AI assistant**: Plain-English Q&A over the pricing data (Anthropic Claude)
- **Admin panel**: Hospital manager, CSV upload, live task status bar, stop/start controls
- **Data sources**: CMS directory importer (~5,400 hospitals), Dolthub URL filler, Providence system scraper
- **Self-healing**: Watchdog sweep every 15 min revives stuck tasks, retries transient failures, queues overdue hospitals
- **Runtime settings**: All sensitive config (API keys, OAuth, SMTP) managed via Admin UI, encrypted at rest with pgcrypto
- **Production hardening**: UFW firewall, fail2ban for SSH, CSP + HSTS headers, encrypted settings, rate limiting

## Quick Start (Production Deployment)

### 1. Server requirements
- Debian 13 (trixie) or similar
- Python 3.11+
- Node.js 20+
- PostgreSQL 17 with pg_trgm, pgcrypto, unaccent extensions
- Redis 7+ with `requirepass` configured

### 2. Install backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in secrets
python scripts/init_db.py   # creates tables + seeds settings + first admin
```

### 3. Install frontend
```bash
cd ../frontend
npm install
cp .env.local.example .env.local
npm run build
```

### 4. Install systemd services
```bash
sudo cp ops/systemd/*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now clearprice-api clearprice-worker clearprice-beat clearprice-frontend clearprice-flower
```

### 5. Verify
```bash
curl http://localhost:8000/api/health
curl http://localhost:3000
```

## Data Flow

```
CMS Directory (5,400+ hospitals)
         ↓
Hospital URL discovery (Providence scraper, Dolthub, manual)
         ↓
Nightly Celery beat → ingest_providence / ingest_all_active
         ↓
Celery worker streams MRF JSON (ijson, no memory blow-up)
         ↓
Upsert into procedures / charges / payer_rates
         ↓
Search / Compare / AI endpoints
```

## Architecture Principles

- **Settings service**: All runtime config lives in `system_settings` table, cached in Redis (60s TTL), fallback to env. Admin UI is the single write path. Sensitive values encrypted via pgcrypto `pgp_sym_encrypt` using a dedicated `ENCRYPTION_KEY` (separate from `APP_SECRET_KEY`).
- **Stream parsing**: Files range 50 MB to 800 MB; we never load them into memory. Uses `ijson.items()` against a file-like wrapper over `httpx.stream`.
- **Self-healing**: `watchdog_sweep` runs every 15 min via Celery beat AND can be invoked synchronously from the admin API if workers are blocked. It detects stuck "running" rows, queues overdue hospitals, and retries transient failures.
- **Zero-trust secrets**: No passwords / API keys in code. `.env` for infrastructure only. Everything else in the DB, encrypted. Admin UI is the management interface.
- **Rebuild-from-spec**: The codebase follows a "bricks and studs" philosophy — each module is self-contained with a clear contract. See `ai_context/MODULAR_DESIGN_PHILOSOPHY.md` (not included here; upstream reference).

## Admin Endpoints (partial)

```
GET  /api/admin/health/ingest              # Traffic-light status
POST /api/admin/health/force-watchdog      # Run watchdog synchronously
GET  /api/admin/tasks/active               # Live Celery task list
POST /api/admin/tasks/{id}/revoke          # Stop a task
POST /api/admin/ingest/all-active          # Trigger full ingest
GET  /api/admin/sources/coverage           # URL coverage report
POST /api/admin/sources/import-cms         # Load CMS directory
POST /api/admin/sources/validate-urls      # HEAD-check all URLs
GET  /api/admin/hospitals/manage           # Admin hospital list
POST /api/admin/hospitals/manage           # Create
PUT  /api/admin/hospitals/manage/{id}      # Update
POST /api/admin/hospitals/manage/{id}/ingest  # Trigger one
POST /api/admin/hospitals/manage/bulk-upload  # CSV upload
```

## Data Sources

- **CMS Hospital General Information** — the authoritative directory of ~5,400 U.S. acute care and critical access hospitals ([data.cms.gov](https://data.cms.gov/provider-data/dataset/xubh-q36u))
- **Providence transparency page** — direct scraper for Providence Health & Services hospitals
- **Dolthub `hospital-price-transparency`** — community-maintained URL dataset (2021-era; most URLs dead, some still work)
- **Manual entry** — via Admin UI or CSV bulk upload

## Security

- All traffic HTTPS (behind reverse proxy)
- Passwords hashed with bcrypt
- JWT access tokens (30 min) + refresh tokens (7 days, rotated on refresh)
- Admin endpoints require `role=admin` on JWT
- Rate limiting on auth and search endpoints (slowapi)
- CSP, HSTS, X-Frame-Options headers on every response
- Fail2ban for SSH brute-force protection
- UFW firewall restricting exposed ports
- Flower dashboard bound to 127.0.0.1 (not internet-exposed)
- API docs disabled in production

## Philosophy

> Show what the hospitals published. Explain what it means. Get out of the way.

No advertising. No referral fees. No "estimates" we made up. If a price is wrong,
it's wrong in the hospital's file — we tell users that and link to the source.

## License

The hospital pricing data is public record under 45 CFR Part 180.
This codebase is provided as-is. See LICENSE file for details.

## Contributing

This is primarily a single-operator deployment. Corrections and suggestions
welcome at <corrections@clearpricehealth.org> or via GitHub issues.
