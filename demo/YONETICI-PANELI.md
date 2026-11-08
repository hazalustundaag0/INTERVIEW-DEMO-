# Yönetici Paneli (frontend)

Interview Demo yönetici paneli. Gereksinim raporu v1.2.0, Bölüm 3, 16 ve 18'deki yönetici kapsamını karşılar. Danışan ve guru ekranlarıyla aynı yapıda yazıldı: düz HTML, vanilla JS ve ortak `../theme.css`. Derleme adımı yok.

Panel **yalnız gerçek backend ile** çalışır (Etap 3, K70). Mock mod, tarayıcıda demo veri ve demo hesabı yoktur.

## Çalıştırma (yerel, Windows / PowerShell)

1. Backend (API `127.0.0.1:8090`, DB `interview-demo-db` `127.0.0.1:5434`):

   ```powershell
   cd backend
   .\scripts\dev.ps1 run
   ```

2. Frontend dev sunucusu (tek origin `http://localhost:3000`, K59):

   ```powershell
   cd frontend
   node scripts/dev-server.mjs
   ```

3. Tarayıcıda `http://localhost:3000/demo/giris-yonetici.html` aç. Sayfayı `file://` ya da başka bir porttan açma; CORS yalnız `http://localhost:3000`'e izin verir.

Yönetici hesabı `frontend/scripts/seed-demo.mjs` (veya `go run ./cmd/admin create-admin`) ile oluşturulur. Yerel geliştirme hesabı `admin@example.test`; parola yalnız `ADMIN_PASSWORD` ortam değişkeninden gelir ve repoya yazılmaz.

## Backend bağlantısı

- Taban adres `config.js` içindeki `APP_CONFIG.apiBaseUrl` (`http://127.0.0.1:8090/api/v1`). Her sayfa `config.js`'i `yonetici-api.js`'ten önce yükler.
- Giriş `POST /auth/login` ile `client_type: "admin"` gönderir. Yanıttaki rol `admin` değilse oturum açılmaz.
- Oturum `sessionStorage`'dadır: `idToken.admin` (token) ve `idUser.admin` (`{id, first_name, last_name, role, client_type, expires_at}`; e-posta saklanmaz). Biçim `api-client.js`'teki `idToken.candidate` / `idToken.guru` ile aynıdır. Token `localStorage`'a yazılmaz ve loglanmaz.
- Her sayfa açılışında oturum yerelde (rol, istemci tipi, süre) denetlenir, ardından `GET /auth/me` ile sunucuda doğrulanır. Yan menüdeki e-posta bu yanıttan gelir.
- Herhangi bir istekte 401 gelirse oturum silinir ve `giris-yonetici.html?return=<sayfa>` açılır (`return` yalnız `yonetici-*.html` olabilir).
- Çıkış `POST /auth/logout` çağırır, ardından `idToken.admin` / `idUser.admin` silinir.
- Mock döneminden kalan `localStorage` anahtarları (`demoYoneticiOturum`, `yoneticiDemoVeri`) panel açılışında ve `gate.js` eski anahtar temizliğinde silinir.
- İstekler `APP_CONFIG.requestTimeoutMs` (15 sn) sonra kesilir. 5xx hatalarında mesajın sonuna `Hata kodu: <request_id>` eklenir.
- Tüm istekler `yonetici-api.js` içinden geçer. Yollar, alan adları (snake_case), para (`amount_minor`, kuruş), YZ maliyeti (`cost_micro`), sayfalama (`items` / `next_cursor`) ve hata gövdesi (problem+json: `code`, `message`, `fields`, `request_id`) `backend/api/openapi.yaml` ile aynıdır.
- `gate.js` ve `api-client.js` yönetici sayfalarına yüklenmez (`pageRole()` yönetici sayfalarını tanımaz).

## Sayfalar ve kullandıkları uç noktalar

| Sayfa | Dosya | Uç noktalar |
|---|---|---|
| Giriş | `giris-yonetici.html` | `POST /auth/login`, `POST /auth/logout` |
| Tüm sayfalar | `yonetici.js` | `GET /auth/me` (oturum doğrulama) |
| Genel bakış | `yonetici-panel.*` | `GET /admin/users`, `/admin/payments`, `/admin/ai-costs`, `/admin/audit-logs` |
| Kullanıcılar | `yonetici-kullanicilar.*` | `GET /admin/users`, `PATCH /admin/users/{id}/status`, `POST /admin/users/{id}/logout-all` |
| Gurular | `yonetici-gurular.*` | `GET /admin/gurus` (sayfalı; hesap bilgisi `account` içinde), `POST /admin/gurus`, `PUT /admin/gurus/{guruID}`, `POST /admin/gurus/{userID}/invitation`, `GET /public/sectors` |
| Profil formu | `yonetici-profil-formu.*` | `GET/POST /admin/profile-fields`, `PUT /admin/profile-fields/{id}`, `POST …/{id}/options`, `PUT /admin/profile-field-options/{id}` |
| Soru setleri | `yonetici-soru-setleri.*` | `GET/POST /admin/question-sets` (`copy_from` ile yeni sürüm), `GET/PATCH …/{id}`, `POST …/{id}/questions`, `…/publish`, `…/deactivate`, `PUT/DELETE /admin/questions/{id}` |
| Kurallar ve istemler | `yonetici-kurallar.*` | `GET/POST /admin/follow-up-rules`, `PUT …/{id}`, `GET/POST /admin/prompt-configs`, `GET/PUT /admin/prompt-configs/{id}`, adımlar, `…/publish`, `…/deactivate` |
| Hizmetler ve fiyatlar | `yonetici-hizmetler.*` | `GET/POST /admin/services`, `PUT …/{id}`, `…/templates`, `PUT /admin/session-templates/{id}`, `GET/POST …/prices` |
| Ödemeler | `yonetici-odemeler.*` | `GET /admin/payments?status=`, `GET /admin/payments/{id}`, `GET /admin/users?role=candidate` |
| YZ kullanımı | `yonetici-yz-kullanim.*` | `GET /admin/ai-costs`, `GET /admin/ai-requests`, `GET /admin/users?role=candidate` |
| Denetim kayıtları | `yonetici-denetim.*` | `GET /admin/audit-logs` (eylem, varlık, tarih ve kullanıcı filtreleri), `GET /admin/users` |

Ortak dosyalar:
- `yonetici.css`: yerleşim ve bileşenler.
- `yonetici.js`: yan menü, oturum kontrolü, modal, onay ve bildirim.
- `yonetici-api.js`: API katmanı (oturum, zaman aşımı, hata modeli).
- `config.js`: API taban adresi ve zaman aşımları (81 Frontend Platform).

## Davranış notları

- **Sürümleme:** Soru setleri ve istem yapılandırmaları yayınlandıktan sonra değiştirilemez. Düzenleme için "yeni sürüm" ile kopya taslak açılır, düzenlenir ve "yayınla ve etkinleştir" ile devreye alınır. Aynı addaki önceki etkin sürüm kapanır.
- **İstem zinciri:** Liste ucu adımları döndürmez; seçili sürümün adımları `GET /admin/prompt-configs/{id}` ile yüklenir. "Yeni sürüm" isteği kaynağın açıklamasını, uydurmayı önleme kurallarını (`rule_set`) ve parametrelerini de gönderir. Panel, oluşan taslağın kural ve parametrelerini kaynakla karşılaştırır; fark varsa uyarır. Kural seti boş bir yapılandırma yayınlanmaz.
- **Fiyatlar** düzenlenmez. Geçerlilik başlangıçlı yeni kural eklenir. Backend eski kuralı kapatmaz; geçerli fiyat başlamış en yeni kuraldır. Daha eski açık kurallar "Yerini aldı" rozetiyle gösterilir.
- **Profil formu alanları** ve seçenekleri silinmez, pasife alınır (backend'de silme ucu yok). Sıra `sort_order` takasıyla değişir.
- **Kişisel veri:** CV, cevap ve hikâye içerikleri yönetici panelinde gösterilmez. Kart bilgisi hiçbir yerde yoktur.
- **Onaylar:** Pasife alma (hesap, takip kuralı, profil alanı/seçeneği), oturumları kapatma, hizmeti satıştan kaldırma, fiyat kuralı kaydı, sürüm oluşturma/yayınlama/etkinleştirme/devre dışı bırakma ve silme işlemleri onay penceresi ister. Onay mesajı düz metin olarak basılır (`Y.onay`, vurgu için `Y.vurgu`).
- **XSS:** Sunucudan gelen tüm metinler `Yonetici.e()` ile kaçışlanır veya `textContent` ile basılır.
