# Yönetici Paneli (frontend)

Interview Demo yönetici paneli. Gereksinim raporu v1.2.0, Bölüm 3, 16 ve 18'deki yönetici kapsamını karşılar. Danışan ve guru ekranlarıyla aynı yapıda yazıldı: düz HTML, vanilla JS ve ortak `../theme.css`. Derleme adımı yok.

## Çalıştırma

Repo kökünden statik bir sunucu başlat:

```bash
python3 -m http.server 3002
# http://localhost:3002/demo/giris-yonetici.html
```

Demo modunda giriş bilgileri: `yonetici@interviewdemo.com`, parola olarak en az 6 karakterli herhangi bir şey.

Demo verisi tarayıcıda (`localStorage: yoneticiDemoVeri`) tutulur. Sıfırlamak için konsolda `YoneticiVeri.sifirla()` çalıştır ve sayfayı yenile.

## Gerçek backend'e bağlama

Ayar tek dosyadadır: `yonetici-ayar.js`.

```js
window.YONETICI_API_AYAR = { MOD: 'api', TABAN_URL: 'http://localhost:8080/api/v1' };
```

- Giriş `POST /auth/login` ile `client_type: "admin"` gönderir. Bearer token `localStorage.demoYoneticiOturum` içinde tutulur.
- 401 gelirse oturum silinir ve giriş sayfasına dönülür.
- Backend `.env` dosyasındaki `ADMIN_PANEL_URL` (varsayılan `http://localhost:3002`) ya da `CORS_ALLOWED_ORIGINS`, panelin açıldığı origin'i içermelidir.
- Tüm istekler `yonetici-api.js` içinden geçer. Yollar, alan adları (snake_case), para (`amount_minor`, kuruş), YZ maliyeti (`cost_micro`), sayfalama (`items` / `next_cursor`) ve hata gövdesi (problem+json: `code`, `message`, `fields`) `backend/api/openapi.yaml` v0.2.0 ile birebir aynıdır.
- Mock mod da aynı sözleşmeyi uygular. Bilinmeyen alanları 422 ile reddeder, yayınlanmış sürümde değişikliği 409 `immutable` ile reddeder ve her değişikliği backend'in eylem adlarıyla denetim kaydına yazar.

## Backend'de eksik olan uç nokta

| Uç nokta | Neden |
|---|---|
| `GET /admin/gurus` → `{ items: GuruProfile[] }` | Yönetici guru profillerini (pasifler dahil) listeleyemiyor. `POST /admin/gurus` ve `PUT /admin/gurus/{guruID}` var. `GET /public/gurus` ise yalnız aktifleri ve `user_id` olmadan döner. Panel bu uç nokta yoksa uyarı gösterir ve yalnız guru hesaplarını listeler. |

Önerilen SQL: `gurus.sql` içindeki `ListActiveGurus` sorgusunun `is_active` / `status` filtresi olmayan hâli. Sektörler `guru_sectors` üzerinden eklenir. Sıralama `created_at DESC`.

## Sayfalar ve kullandıkları uç noktalar

| Sayfa | Dosya | Uç noktalar |
|---|---|---|
| Giriş | `giris-yonetici.html` | `POST /auth/login`, `POST /auth/logout` |
| Genel bakış | `yonetici-panel.*` | `GET /admin/users`, `/admin/payments`, `/admin/ai-costs`, `/admin/audit-logs` |
| Kullanıcılar | `yonetici-kullanicilar.*` | `GET /admin/users`, `PATCH /admin/users/{id}/status`, `POST /admin/users/{id}/logout-all` |
| Gurular | `yonetici-gurular.*` | `GET /admin/gurus` (eksik), `POST /admin/gurus`, `PUT /admin/gurus/{id}`, `POST /admin/gurus/{userID}/invitation`, `GET /public/sectors` |
| Profil formu | `yonetici-profil-formu.*` | `GET/POST /admin/profile-fields`, `PUT /admin/profile-fields/{id}`, `POST …/{id}/options`, `PUT /admin/profile-field-options/{id}` |
| Soru setleri | `yonetici-soru-setleri.*` | `GET/POST /admin/question-sets` (`copy_from` ile yeni sürüm), `GET/PATCH …/{id}`, `POST …/{id}/questions`, `…/publish`, `…/deactivate`, `PUT/DELETE /admin/questions/{id}` |
| Kurallar ve istemler | `yonetici-kurallar.*` | `GET/POST /admin/follow-up-rules`, `PUT …/{id}`, `GET/POST /admin/prompt-configs`, `PUT …/{id}`, adımlar, `…/publish`, `…/deactivate` |
| Hizmetler ve fiyatlar | `yonetici-hizmetler.*` | `GET/POST /admin/services`, `PUT …/{id}`, `…/templates`, `PUT /admin/session-templates/{id}`, `GET/POST …/prices` |
| Ödemeler | `yonetici-odemeler.*` | `GET /admin/payments?status=`, `GET /admin/payments/{id}` |
| YZ kullanımı | `yonetici-yz-kullanim.*` | `GET /admin/ai-costs`, `GET /admin/ai-requests` |
| Denetim kayıtları | `yonetici-denetim.*` | `GET /admin/audit-logs` (eylem, varlık, tarih ve kullanıcı filtreleri) |

Ortak dosyalar:
- `yonetici.css`: yerleşim ve bileşenler.
- `yonetici.js`: yan menü, oturum kontrolü, modal, onay ve bildirim.
- `yonetici-api.js`: API katmanı.
- `yonetici-veri.js`: mock veri. Yapılandırma verisi backend seed migration'ından alındı, kişi ve kayıt verisi kurgusaldır.

## Davranış notları

- **Sürümleme:** Soru setleri ve istem yapılandırmaları yayınlandıktan sonra değiştirilemez. Düzenleme için "yeni sürüm" ile kopya taslak açılır, düzenlenir ve "yayınla ve etkinleştir" ile devreye alınır. Aynı addaki önceki etkin sürüm kapanır.
- **Fiyatlar** düzenlenmez. Geçerlilik başlangıçlı yeni kural eklenir.
- **Profil formu alanları** ve seçenekleri silinmez, pasife alınır (backend'de silme ucu yok). Sıra `sort_order` takasıyla değişir.
- **Kişisel veri:** CV, cevap ve hikâye içerikleri yönetici panelinde gösterilmez. Kart bilgisi hiçbir yerde yoktur.
- Pasife alma, oturumları kapatma ve sürüm etkinleştirme gibi önemli işlemler onay penceresi ister.
