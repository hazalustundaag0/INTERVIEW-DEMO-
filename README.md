# Interview Demo — Frontend (Etap 2 / MVP-1)

Statik HTML + vanilla JS arayüz (`demo/` + `theme.css`), Go API'ye (`../backend`) bağlanır.
`ınterview-danışan/` ve `stitch_*` klasörleri eski tasarım referansıdır; değiştirilmez.

## Yerel topoloji (K59)

| Bileşen | Adres |
|---|---|
| Frontend (aday + guru, tek origin) | `http://localhost:3000/` (temiz adresler, K112) |
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

Dev sunucusu: kök `frontend/`, yalnız `127.0.0.1`'e bağlanır, `Cache-Control: no-store`, doğru MIME, path traversal ve gizli dosya (`.git`, `.env`) engeli. Sayfalar temiz adreslerden servis edilir (K112, Etap 8): tablo `demo/routes.js` (tek kaynak) — `/` ana sayfa, aday öneksiz (`/giris`, `/panel`, `/hikaye/yaz` …), danışman `/guru/…`, yönetici `/yonetici/…`. Eski `/demo/<sayfa>.html` → 301 temiz adres. Statik kaynaklar yalnız `/demo/**` (sayfa `.html`'leri hariç) ve `/theme.css`; `scripts/`, `tests/`, README ve dot-dosyalar 404 (QA-019). nginx tablosu `node scripts/gen-routes.mjs` ile `deploy/web/routes.conf`'a üretilir (`--check` güncelliği denetler; `deploy/build.sh web` bunu çalıştırır).
E-posta bağlantıları: `/verify-email` → `/parola?mode=verify`, `/set-password` → `?mode=invite`, `/reset-password` → `?mode=reset` (sorgu korunur, `#token=…` tarayıcıda kalır).

## 3) Demo verisi (GAP-B22, K54) — idempotent

```powershell
$env:ADMIN_PASSWORD = '<yerel yönetici parolası, ≥12>'
$env:DEMO_GURU_PASSWORD = '<yerel guru parolası, ≥12>'
.\scripts\dev.ps1 seed          # = node scripts/seed-demo.mjs
```

- Yönetici yoksa `go run ./cmd/admin create-admin` (parola yalnız env'den) — varsayılan `admin@example.test`.
- Seed gurusu `deniz.kurgu@gurus.example.test` için davet → `data/mail` bağlantısı → parola belirleme → `client_type=guru` girişi doğrulanır.
- Hizmet fiyatı seed edilmez; aktif fiyat varsa yalnızca API'den okunur.
- Ayarlar: `ADMIN_EMAIL`, `DEMO_GURU_EMAIL`, `API_BASE_URL`, `BACKEND_DIR`.

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

### Docker yığınına karşı test (Etap 5)

Doğrulama betikleri (`scripts/verify-*.mjs`, `dom-smoke-83.mjs`) ve e2e aynı ortam değişkenlerini okur
(`scripts/test-env.mjs`, `tests/e2e/lib.mjs`). Varsayılanlar yerel geliştirmedir; Docker yığını (`deploy/`,
`http://localhost:8088`, API aynı origin'de `/api/v1`) için:

| Değişken | Yerel varsayılan | Docker yığını |
|---|---|---|
| `WEB_BASE_URL` (eski ad `E2E_BASE_URL`) | `http://localhost:3000` | `http://localhost:8088` |
| `API_BASE_URL` | `http://127.0.0.1:8090/api/v1` | `http://localhost:8088/api/v1` |
| `MAIL_DIR` | `../backend/data/mail` | mail volume'unun yansıması (aşağıda) |

```powershell
cd ..\deploy; docker compose up -d; cd ..rontend       # proje interview-demo-stack; seed: deploy/README.md
.\scripts\dev.ps1 stack-mail                             # mail volume → tests\e2e\output\stack-mail
$env:WEB_BASE_URL = 'http://localhost:8088'
$env:API_BASE_URL = 'http://localhost:8088/api/v1'
$env:MAIL_DIR = "$PWD	ests\e2e\output\stack-mail"
$env:DEMO_GURU_PASSWORD = '…'; $env:ADMIN_PASSWORD = '…'   # deploy/.env'deki değerler
node scripts/verify-platform.mjs; node scripts/verify-82.mjs   # … verify-83/84/85, dom-smoke-83
cd tests\e2e; $env:E2E_CANDIDATE_PASSWORD = '…'; node run-all.mjs
.\scripts\dev.ps1 stack-mail-stop; cd ..\deploy; docker compose down   # volume'lar kalır
```

- Origin başlığı ve açık yönlendirme / e-posta bağlantısı beklentileri `WEB_BASE_URL`'den türetilir
  (Docker'da `PUBLIC_URL` ile aynı olmalı).
- Sunucu farkları kabul kümesiyle yazılır: path traversal `..%2f` → 404 (dev sunucusu) ya da 400 (nginx reddi);
  davet yönlendirmesinde parametre sırası; MIME'de charset.
- nginx CSP'si `'unsafe-eval'` içermez: e2e `page.waitForFunction` yerine `lib.mjs` `waitForDom` (page.evaluate
  ile yoklama) kullanır. `bypassCSP` kullanılmaz; ürün CSP'si gevşetilmez.
- `dom-smoke-83` sayfaları diskten yükler; `config.js` içindeki API tabanını `API_BASE_URL`'e çevirir.
- Giriş IP sınırı (30/15 dk/uç) Docker'da tüm istemciler için ortak olabilir (vekil arkasında); tam e2e ile
  verify-* betiklerini arka arkaya koşarken 429 görürseniz bekleyin.

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
