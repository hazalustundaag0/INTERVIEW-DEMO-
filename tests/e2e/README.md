# Tarayıcı uçtan uca testleri (Playwright + Chromium)

QA (70) Etap 2 betikleri; K65 ile kalıcı hâle getirildi (sahibi 81). Gerçek API'ye karşı, gerçek tıklamalarla
aday + guru akışlarını, güvenlik negatiflerini ve panel yerleşimini (1440×900 / 390×844) doğrular.

## Kurulum (bir kez)

```powershell
cd C:\Users\RESUL\Desktop\Interview-Demo\frontend\tests\e2e
npm install                      # playwright 1.48.2 (sürüm sabit, yalnız bu klasörde)
npx playwright install chromium  # tarayıcı makinede yoksa
```

## Önkoşullar

- API `http://127.0.0.1:8090` (`APP_ENV=local`, `EMAIL_SENDER=log`, `AI_PROVIDER=dev`, `CORS_ALLOWED_ORIGINS=http://localhost:3000`)
- Dev sunucusu `http://localhost:3000` (`..\..\scripts\dev.ps1`)
- Seed: `..\..\scripts\dev.ps1 seed` (demo guru + 1.500 TRY)

## Ortam değişkenleri (parolalar yalnız buradan; dosyada sabit parola yok)

| Değişken | Zorunlu | Açıklama |
|---|---|---|
| `DEMO_GURU_PASSWORD` | evet | seed gurusunun parolası (`seed-demo.mjs` ile belirlenen) |
| `E2E_CANDIDATE_PASSWORD` | s2 için | s2'nin oluşturduğu test adaylarına verilecek parola (≥12 karakter) |
| `ADMIN_PASSWORD` | s11 için | yönetici hesabının parolası (`ADMIN_EMAIL` vars. `admin@example.test`) |
| `DEMO_GURU_EMAIL` | hayır | varsayılan `deniz.kurgu@gurus.example.test` |
| `E2E_BASE_URL`, `API_BASE_URL`, `BACKEND_DIR`, `E2E_OUTPUT_DIR` | hayır | adresler / `data/mail` / çıktı klasörü |

## Çalıştırma

```powershell
$env:DEMO_GURU_PASSWORD = '…'; $env:E2E_CANDIDATE_PASSWORD = '…'
node run-all.mjs            # tam akış: s1 … s10 (yeni A/B adayları)
node run-all.mjs s10        # yalnız panel yerleşimi + çıkış (önceki koşunun output/cand-A.json'u gerekir)
node s2-onboarding.mjs B    # tek aşama
```

| Aşama | Kapsam |
|---|---|
| s1 | public: landing, katalog, danışman detayı, mobil taşma |
| s2 A/B | kayıt → e-posta bağlantısı → parola → sipariş (A: `guru_visibility`) → devpay |
| s3 | guru girişi (yanlış parola, aday hesabı reddi), müsaitlik ekleme formu |
| s4 | müsaitlik görünümü, mobil guru paneli |
| s5 A/B | profil, CV, randevu ön koşulları, takvim |
| s7a | guru 1. seansı tamamlar (s6'dan önce koşar) |
| s6 A | soru 1–5 + takip, çıktılar, "Hikâyemi onayla" |
| s7b/c | K45 hikâye görünürlüğü (B hazır hikâye), not + ödev |
| s8 | güvenlik: açık yönlendirme, token, rol, IDOR |
| s9 | çeşitli |
| s10 | QA-011/012/013: panel yerleşimi 1440/390, kenar kartı adı, "Çıkış yap" uçtan uca |
| s11 | Etap 3 yönetici paneli: giriş/çıkış + Geri, 10 ekran (1440/390), guru ekle + davet e-postası + davet kabul, pasif/aktif (token iptali), profil alanı, soru seti / istem yeni sürüm (kural seti korunur, boş kural setiyle yayın istemci + sunucu 422), fiyat rozetleri, kayıt filtreleri, rol ayrımı, XSS, `?return=`, kişisel veri. `output/cand-A.json` / `cand-B.json` (s2) gerekir; test verisi `qa70e3_*` pasif/gizli |

Çıktılar `output/` altında (git'e girmez): `shots/*.png`, `s*.json` sonuçları, `cand-*.json` (koşunun test
adayları), `tokens.json` (token önbelleği). **Giriş IP sınırı 30/15 dk:** tam akış ~14 giriş yapar; token önbelleği
tekrar girişleri önler. Süresi dolmuş/iptal edilmiş token hatası alırsanız `output/tokens.json`'u silin.
