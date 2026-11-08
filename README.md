# Interview Demo — Frontend (Etap 2 / MVP-1)

Statik HTML + vanilla JS arayüz (`demo/` + `theme.css`), Go API'ye (`../backend`) bağlanır.
`ınterview-danışan/` ve `stitch_*` klasörleri eski tasarım referansıdır; değiştirilmez.

## Yerel topoloji (K59)

| Bileşen | Adres |
|---|---|
| Frontend (aday + guru, tek origin) | `http://localhost:3000` → `/demo/index.html` |
| API | `http://127.0.0.1:8090/api/v1` (`demo/config.js`) |
| PostgreSQL | `127.0.0.1:5434` (`interview-demo-db`) |
| E-posta (EMAIL_SENDER=log) | `backend/data/mail/*.txt` |

> Sayfaları **`http://localhost:3000`** üzerinden açın. `127.0.0.1:3000` farklı bir origin'dir ve CORS tarafından reddedilir.
> 5433 ve 8080 bu makinede başka projelere aittir; o konteyner/süreçlere dokunmayın.

## Gereksinimler

Docker Desktop, Go 1.27, Node.js ≥ 20 (bağımlılık kurulumu yok).

## 1) Backend

```powershell
cd C:\Users\RESUL\Desktop\Interview-Demo\backend
# Docker Desktop kapalıysa: Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

`.env` içinde şu değerler olmalı (K59 / K58):

```
APP_ENV=local
HTTP_ADDR=127.0.0.1:8090
DB_HOST_PORT=5434
APP_DATABASE_URL=postgres://app_rw:app_rw_dev@localhost:5434/interview_demo?sslmode=disable
MIGRATE_DATABASE_URL=postgres://app_owner:app_owner_dev@localhost:5434/interview_demo?sslmode=disable
EMAIL_SENDER=log
PAYMENT_PROVIDER=devpay
AI_PROVIDER=dev
APP_PUBLIC_URL=http://localhost:3000
GURU_PANEL_URL=http://localhost:3000
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

```powershell
.\scripts\dev.ps1 up            # PostgreSQL (127.0.0.1:5434)
.\scripts\dev.ps1 migrate-up
Get-Content internal\db\seed\001_dev_gurus.sql -Raw | docker exec -i interview-demo-db psql -U app_rw -d interview_demo -v ON_ERROR_STOP=1
.\scripts\dev.ps1 run           # API → http://127.0.0.1:8090 (ayrı terminalde açık kalır)
curl.exe -s http://127.0.0.1:8090/readyz
```

## 2) Frontend

```powershell
cd C:\Users\RESUL\Desktop\Interview-Demo\frontend
.\scripts\dev.ps1               # = node scripts/dev-server.mjs → http://localhost:3000
```

Dev sunucusu: kök `frontend/`, yalnız `127.0.0.1`'e bağlanır, `Cache-Control: no-store`, doğru MIME, path traversal ve gizli dosya (`.git`, `.env`) engeli. Yalnız `/demo/**` ve `/theme.css` servis edilir; `scripts/`, `tests/`, README ve dot-dosyalar 404 (QA-019).
E-posta bağlantıları: `/verify-email` → `demo/davet.html?mode=verify`, `/set-password` → `?mode=invite`, `/reset-password` → `?mode=reset` (sorgu korunur, `#token=…` tarayıcıda kalır).

## 3) Demo verisi (GAP-B22, K54) — idempotent

```powershell
$env:ADMIN_PASSWORD = '<yerel yönetici parolası, ≥12>'
$env:DEMO_GURU_PASSWORD = '<yerel guru parolası, ≥12>'
.\scripts\dev.ps1 seed          # = node scripts/seed-demo.mjs
```

- Yönetici yoksa `go run ./cmd/admin create-admin` (parola yalnız env'den) — varsayılan `admin@example.test`.
- Seed gurusu `deniz.kurgu@gurus.example.test` için davet → `data/mail` bağlantısı → parola belirleme → `client_type=guru` girişi doğrulanır.
- Aktif hizmete 1.500 TRY fiyat kuralı (zaten öyleyse atlanır).
- Ayarlar: `ADMIN_EMAIL`, `DEMO_GURU_EMAIL`, `DEMO_PRICE_MINOR`, `API_BASE_URL`, `BACKEND_DIR`.

Aday hesabı: `kayit.html` → `backend\data\mail\` altındaki en yeni `*_email_verification_*.txt` içindeki bağlantı.

## 4) Doğrulama

```powershell
.\scripts\dev.ps1 check                          # tüm JS: node --check
$env:DEMO_GURU_PASSWORD = '…'; node scripts/verify-platform.mjs   # dev sunucusu + CORS + api-client (gerçek API)
```

### Tarayıcı testleri (Playwright, K65)

`tests/e2e/` — kendi `package.json`'ı (playwright 1.48.2), `npm install` ile kurulur; parolalar yalnız env'den.
Ayrıntı: [`tests/e2e/README.md`](tests/e2e/README.md).

```powershell
cd tests\e2e; npm install
$env:DEMO_GURU_PASSWORD='…'; $env:E2E_CANDIDATE_PASSWORD='…'; node run-all.mjs
```

## Ortak altyapı (81)

| Dosya | Görev |
|---|---|
| `demo/config.js` | API adresi ve zaman aşımları (tek yer) |
| `demo/api-client.js` | `window.Api`: fetch sarmalayıcı, Bearer (sessionStorage `idToken.candidate` / `idToken.guru`), problem+json → `ApiError`, 401 → giriş `?return=`, sayfalama, yükleme/indirme, `confirm`, `Idempotency-Key`, `Api.ui` |
| `demo/gate.js` | Rol bazlı sayfa kapısı, `/auth/me` doğrulaması, `window.sessionReady` |
| `demo/nav.js` | Saf gezinme motoru; `[data-action]`/`[data-nav-skip]` öğelerini atlar; `Nav.registerRoutes/go` |
| `demo/js/advisors.js` | `Advisors.list/get/sectors` (GET /public/gurus) |
| `demo/secim.js` | `Selection` (URL'de `?service=&guru=` UUID) |
| `demo/availability.js` | `SlotTime` (UTC ↔ Europe/Istanbul) |
| `demo/appointment-sync.js` | `SessionView` (seans kartı yardımcıları) |
| `demo/hikaye-model.js` | `StoryModel` (DraftView/Outputs → görünüm modeli) |

Ayrıntılı sözleşme: Obsidian `Interview Demo/81 - Frontend Platform Agent.md`.
Kural: sayfalar backend'e yalnız `window.Api` ile erişir; token/parola/bağlantı `localStorage`'a yazılmaz ve loglanmaz.
