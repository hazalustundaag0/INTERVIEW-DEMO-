# Backend Geliştirme Görevleri

## Kullanım ve öncelik

Bu görev listesi mevcut UI ve backend taslak belgelerinden türetilmiştir. Uygulama kodu, API veya veritabanı henüz bulunmadığından eforlar ilk tahmindir; seçilecek stack, entegrasyonlar ve ekip kapasitesine göre yeniden ölçülmelidir. Burada geçen entity/table adları DATA_MODEL.md'de tanımlı gerçek backend varlıkları değil, önerilen uygulama kapsamıdır.

- Fazlar teknik bağımlılık sırasındadır. Bir fazın görevleri, tabloda belirtilen önkoşulları tamamlanmadan başlatılmamalıdır.
- Efor: **S** = küçük (yaklaşık 1–3 mühendis-günü), **M** = orta (4–8 mühendis-günü), **L** = büyük (9+ mühendis-günü). Bu süreler yalnızca kaba planlama varsayımıdır; takvim taahhüdü değildir.
- Endpoint'ler [API_SPEC.md](./API_SPEC.md)'deki `/api/v1` önerisiyle hizalanmalıdır. `{id}` path placeholder gösterimi kullanılır; ürün kapsamı veya teknoloji kararı gerektiren işler **karar kapısı** olarak işaretlenmiştir.
- İlgili sayfalar [PAGES_MAP.md](./PAGES_MAP.md)'deki `demo/` HTML route adlarıdır. Yönetici UI'ı mevcut değildir.

## Faz 0 — Kararlar ve temel kurulum

| ID | Görev / açıklama | Kabul kriterleri | Efor | Önkoşul | İlgili sayfalar / endpointler |
|---|---|---|---|---|---|
| T0.1 | Ürün ve teknoloji kararlarını kapat: backend dili/framework, DB, hosting, file store, queue, auth, e-posta, ödeme, CV parser, LLM; rıza, saklama ve rollerin kapsamını belirle. | Karar kaydı bu seçimleri ve sahiplerini içerir; açık kalan her madde, hangi akışları engellediği ve karar sorumlusuyla listelenir. KVKK/harici YZ/veri konumu kararları uygulamadan önce onaylanır. | M | Yok | Tüm 44 UI route'u; endpoint yok |
| T0.2 | Seçilen teknolojiyle backend iskeletini ve migration/test çalıştırma yolunu oluştur. | Uygulama seçilen ortamda başlar; health/readiness davranışı tanımlıdır; ilk migration ve boş test çalıştırılabilir; örnek config'te secret bulunmaz. | M | T0.1 | Endpoint yok |
| T0.3 | API sözleşmesi temellerini uygula: `/api/v1`, request validation, ortak hata şekli, request ID, OpenAPI/contract doğrulama. | Bilinmeyen/bozuk input tutarlı `400` hatası verir; her hata yanıtında `error.code` ve `requestId` vardır; endpoint schema'ları API_SPEC örnekleriyle test edilir. | M | T0.2 | Tüm sayfalar; API_SPEC genel sözleşmesi |
| T0.4 | Geliştirme/CI güvenlik ve kod kalite kapılarını kur. | Format/lint/type-check (seçilen stack'in araçları) ve testler CI'da çalışır; secret taraması ve dependency güncelleme politikası belirlenir; başarısız kontrol merge'ü engeller. | M | T0.2 | Endpoint yok |

## Faz 1 — Kimlik, roller ve katalog

| ID | Görev / açıklama | Kabul kriterleri | Efor | Önkoşul | İlgili sayfalar / endpointler |
|---|---|---|---|---|---|
| T1.1 | Kullanıcı, aday ve Guru profil repository/model/migration'larını oluştur. | E-posta normalize/unique kuralı, hesap durumları ve rol ilişkileri migration ile uygulanır; parola düz metin olarak saklanmaz; test DB'de migrate/rollback doğrulanır. | M | T0.2, T0.3 | `kayit.html`, `giris.html`, `giris-danisman.html`, `guru-profil.html`; `Users`, `Candidates`, `GuruProfiles`, `UserRoles` |
| T1.2 | Aday kaydı, e-posta doğrulama kodu gönderimi ve doğrulamasını uygula. | Tek kullanımlık kodun süresi ve tekrar kullanım engeli test edilir; tekrar gönderim rate limitlidir; kullanıcı varlığını açığa çıkaran yanıt verilmez; başarılı doğrulamada API_SPEC oturum/yanıt alanları döner. | M | T1.1 | `kayit.html`, `eposta.html`; `POST /api/v1/auth/register`, `POST /api/v1/auth/email-verifications`, `POST /api/v1/auth/email-verifications/confirm` |
| T1.3 | Giriş, access token/oturum, logout ve `/me` akışını uygula; rol ve kaynak sahipliği policy'lerini ekle. | Geçersiz, süresi dolmuş ve iptal edilmiş token reddedilir; aday/Guru/Admin role kapsamı test edilir; kaynak ID değiştirmek başka kullanıcının verisini açmaz; logout mevcut oturumu iptal eder. | L | T1.1, T0.1 | `giris.html`, `giris-danisman.html`, `giris-hata-rol.html`, `ana.html`; `POST /api/v1/auth/sessions`, `DELETE /api/v1/auth/sessions/current`, `GET /api/v1/me` |
| T1.4 | Parola sıfırlama ve Guru davet kabul akışlarını uygula; yalnızca ürün kararı sonrası. | Tek kullanımlık reset/davet token'ı süresi dolunca ve ikinci kullanımda reddedilir; parolalar hash'lenir; hesap rolü davet kaydıyla eşleşir; kabul edilen davet audit kaydı üretir. | M | T1.2, T1.3, T0.1 | `giris.html`, `giris-danisman.html`, `davet.html`; `POST /api/v1/auth/password-resets`, `POST /api/v1/auth/password-resets/confirm`, `POST /api/v1/auth/invitations/accept` |
| T1.5 | Hizmet katalogu ve yayınlı Guru arama/detay API'lerini oluştur. | Yalnızca aktif hizmet/yayınlı Guru listelenir; arama, sektör filtresi ve sıralama izinli alanlarda çalışır; pagination sınırları doğrulanır; fiyat/seans istemci input'undan güvenilmez. | M | T1.1, T0.3 | `index.html`, `danismanlar.html`, `danisman.html`, `danisman-profil.html`, `hizmet.html`; `GET /api/v1/services`, `GET /api/v1/gurus`, `GET /api/v1/gurus/:guruId`, `GET /api/v1/gurus/:guruId/availability` |

## Faz 2 — Enrollment, rıza ve ödeme

| ID | Görev / açıklama | Kabul kriterleri | Efor | Önkoşul | İlgili sayfalar / endpointler |
|---|---|---|---|---|---|
| T2.1 | Hizmet/Guru seçimini sunucu doğrulamalı enrollment'a dönüştür; aday enrollment listele/detayla. | Servis ve Guru durumu backend'de doğrulanır; fiyat, para birimi, seans sayısı ve süresi katalogdan snapshot edilir; sahibi olmayan enrollment okunamaz. | M | T1.3, T1.5 | `hizmet.html`, `siparis.html`, `ana.html`; `POST /api/v1/enrollments`, `GET /api/v1/me/enrollments`, `GET /api/v1/enrollments/:enrollmentId` |
| T2.2 | Sürümlü rıza kaydı ve enrollment/ödeme durum geçişlerini uygula. | Rıza; kullanıcı, enrollment, amaç, metin sürümü, karar ve zamanla kaydedilir; rıza geri çekme/etki kararı uygulanır; randevu ön koşulu satın alma kuralından ayrı tutulur. | M | T2.1, T0.1 | `siparis.html`, `randevu-on.html`; `POST /api/v1/enrollments/:enrollmentId/consents` |
| T2.3 | Ödeme adapter'ı ve checkout başlatmayı kur. | Kart numarası/CCV backend'e girmez veya loglanmaz; ücret enrollment snapshot'ından alınır; aynı `Idempotency-Key` ile çift tahsilat/çift payment oluşmaz; provider seçimi yapılandırma dışından yapılmaz. | L | T2.1, T2.2, T0.1 | `siparis.html`; `POST /api/v1/enrollments/:enrollmentId/payments` |
| T2.4 | Ödeme webhook imza doğrulama, tekrar olay idempotency'si ve durum sorgusunu uygula. | İmzasız/bozuk webhook reddedilir; tekrar event ikinci kez iş etkisi yaratmaz; provider sonucu enrollment/payment state'e tutarlı yansır; hassas provider payload redakte edilir. | M | T2.3 | `odeme-ok.html`, `odeme-bekle.html`, `odeme-hata.html`; `POST /api/v1/webhooks/payments/:provider`, `GET /api/v1/payments/:paymentId`, `GET /api/v1/enrollments/:enrollmentId` |

## Faz 3 — Profil, CV ve takvim

| ID | Görev / açıklama | Kabul kriterleri | Efor | Önkoşul | İlgili sayfalar / endpointler |
|---|---|---|---|---|---|
| T3.1 | Sürümlü dinamik profil formu ve aday TargetContext saklamasını uygula. | Aktif form version API'den sunulur; gerekli alanlar backend'de doğrulanır; hedef pozisyon/sektör çifti için UI'da olmayan eşleşme zorunluluğu eklenmez; alanlar API_SPEC adlarına serialize edilir. | M | T1.3, T0.1 | `profil.html`; `GET /api/v1/profile-form`, `GET /api/v1/me/profile`, `PUT /api/v1/me/profile`; `ProfileFormVersions`, `ProfileFormFields`, `TargetContexts` |
| T3.2 | CV dosya upload intent, private storage, parse durum sorgusu ve silme akışını uygula. | Yalnızca izinli dosya tipi/limit kabul edilir; storage erişimi private ve süreli olur; parse hatası görünür durum üretir; yetkisiz Aday/Guru erişimi reddedilir. Kesin dosya limitleri karar kapısından gelir. | L | T3.1, T2.1, T0.1 | `cv.html`; `POST /api/v1/enrollments/:enrollmentId/cv-files`, `GET /api/v1/cv-files/:cvFileId`, `DELETE /api/v1/cv-files/:cvFileId`; `CVFiles` |
| T3.3 | Elle CV girişi, aday parse-onayı ve randevu hazır olma kontrolünü uygula. | Elle giriş ve dosya parse aynı erişim/onay politikasına uyar; aday onayı olmadan CV hikâye üretiminde kullanılamaz; readiness eksik koşulları doğru döndürür; booking API readiness'i tekrar sunucu tarafında kontrol eder. | M | T3.2, T2.2 | `cv.html`, `randevu-on.html`; `POST /api/v1/enrollments/:enrollmentId/cv-manual-entry`, `PUT /api/v1/cv-files/:cvFileId/approval`, `GET /api/v1/enrollments/:enrollmentId/booking-readiness`; `ManualCVEntries`, `CVFiles` |
| T3.4 | Guru müsaitlik oluşturma, listeleme, güncelleme ve silme akışını uygula. | Başlangıç/bitiş ve timezone doğrulanır; çakışan slot reddedilir; rezervasyonlu slot silinemez/değiştirilemez; haftalık tekrar davranışı kararı açıkça uygulanır. | M | T1.3, T0.1 | `danisman.html`, `takvim.html`, `guru-musaitlik.html`, `guru-musaitlik-ekle.html`; `GET /api/v1/guru/availability`, `POST /api/v1/guru/availability`, `PUT /api/v1/guru/availability`, `DELETE /api/v1/guru/availability/:slotId`; `GuruAvailability` |
| T3.5 | Atomik slot rezervasyonu, appointment liste/detay ve seans geçişlerini uygula. | Aynı slot için eşzamanlı iki rezervasyondan yalnızca biri başarılı olur; profil/rıza/CV/ödeme/uygun seans kuralları server-side doğrulanır; aday ve assigned Guru kapsamları test edilir. | L | T3.3, T3.4, T2.4 | `takvim.html`, `randevu-ok.html`, `seanslar.html`, `seans2-ok.html`, `guru-seanslar.html`, `guru-danisan-detay.html`; `POST /api/v1/enrollments/:enrollmentId/appointments`, `GET /api/v1/me/appointments`, `GET /api/v1/guru/appointments`, `GET /api/v1/appointments/:appointmentId`, `PATCH /api/v1/appointments/:appointmentId`; `EnrollmentSessions`, `Appointments` |
| T3.6 | Guru toplantı bağlantısı ve ilgili seans bağlantı görünümünü uygula; sağlayıcı seçimini ayrıca doğrula. | Link yalnızca ilgili seans erişimine sahip kişilere döner; URL doğrulanır; sağlayıcı yoksa sahte success response verilmez. | S | T3.5, T0.1 | `guru-seanslar.html`, `seanslar.html`; `PUT /api/v1/appointments/:appointmentId/meeting-link` |

## Faz 4 — Hikâye oturumu ve üretim

| ID | Görev / açıklama | Kabul kriterleri | Efor | Önkoşul | İlgili sayfalar / endpointler |
|---|---|---|---|---|---|
| T4.1 | Sürümlü soru setleri, oturum oluşturma/devam ve soru ilerlemesini uygula. | Oturum hangi soru seti sürümüyle başladıysa onunla devam eder; yalnızca satın alınmış/uygun enrollment başlatabilir; duraklatılmış oturum kaybolmadan tekrar açılır. | M | T3.5 | `hikaye-giris.html`, `soru1.html`–`soru5.html`; `POST /api/v1/enrollments/:enrollmentId/story-sessions`, `GET /api/v1/story-sessions/current`, `GET /api/v1/story-sessions/:storySessionId`; `QuestionSets`, `Questions`, `StorySessions` |
| T4.2 | Ana cevapları autosave ve soru atlama akışını uygula. | API, UI'nın `"1"`–`"5"` string anahtarlarını ve cevap metinlerini kabul eder; cevap kaydı idempotent güncellenir; atlanan soru durumu ayrıca tutulur; UI sıra numarası ile API `questionId` eşlemesi adapter'da görünür olur; yetkisiz/kapalı oturum değiştirilemez. | M | T4.1 | `soru1.html`–`soru5.html`; `PUT /api/v1/story-sessions/{storySessionId}/answers/{questionId}`, `POST /api/v1/story-sessions/{storySessionId}/answers/{questionId}/skip`; `Answers` önerisi |
| T4.3 | Follow-up üretimi ve iki ardışık takip sınırını uygula. | Ana cevap olmadan follow-up üretilmez; arka arkaya takip üst sınırı 2'dir; başarısız LLM çağrısı cevabı kaybettirmez; model yanıtı şema doğrulamasından geçer. | L | T4.2, T0.1 | `soru1.html`–`soru5.html`; `POST /api/v1/story-sessions/:storySessionId/follow-ups`; `FollowUps` |
| T4.4 | Candidate draft/external story kaydı, AI üretim işi ve çıktı/sürüm okuma-yazmasını uygula. | Harici hikâye ve AI draft kaynağı ayırt edilir; üretim async ise durum izlenebilir; üretilen her cümle kaynak veya `bilgiGerekli` işareti taşır; yeni sürüm eskisini ezmez. | L | T3.3, T4.2, T4.3 | `hikaye-yukle.html`, `ciktilar.html`; `POST /api/v1/story-sessions/:storySessionId/drafts`, `GET /api/v1/story-sessions/:storySessionId/drafts`, `POST /api/v1/story-sessions/:storySessionId/generate`, `GET /api/v1/story-sessions/:storySessionId/outputs`; `StoryDrafts`, `StoryOutputs`, `StorySources` |
| T4.5 | AI adapter, prompt sürümü, timeout/retry ve AIRequestLogs ekle. | Provider API key secret yönetimindedir; timeout ve kontrollü retry uygulanır; kişisel ham prompt/cevap loglanmaz; model, istek türü, token, maliyet, süre ve sonuç metadata'sı ölçülür. | L | T0.1, T4.3, T4.4 | `soru1.html`–`soru5.html`, `hikaye-yukle.html`, `ciktilar.html`; `POST /api/v1/story-sessions/:storySessionId/follow-ups`, `POST /api/v1/story-sessions/:storySessionId/generate`, `GET /api/v1/admin/ai-requests`; `PromptVersions`, `AIRequestLogs` |

## Faz 5 — Guru çalışma alanı, ödevler ve yönetim

| ID | Görev / açıklama | Kabul kriterleri | Efor | Önkoşul | İlgili sayfalar / endpointler |
|---|---|---|---|---|---|
| T5.1 | Guru aday listesi/detayı, atanmış enrollment ve seans bilgilerini uygula. | Guru sadece kendisine atanmış ve izin verilen alanları görür; arama/sıralama filtresi doğrulanır; aday kişisel verisi response/log kapsamı test edilir. | M | T3.5, T2.2 | `guru-danisanlar.html`, `guru-danisan-detay.html`; `GET /api/v1/guru/candidates`, `GET /api/v1/guru/candidates/:candidateId`, `GET /api/v1/guru/candidates/:candidateId/appointments` |
| T5.2 | Guru seans hikâyesi/kaynak okuma ve hikâye cümlesi notlarını uygula. | Atama ve uygun rıza olmadan raw answers/CV/source erişimi reddedilir; not doğru `cumleId`'ye bağlıdır; candidate serializer mevcut hikâye alanlarını korur. | M | T4.4, T5.1 | `guru-hikaye.html`; `GET /api/v1/guru/story-sessions/:storySessionId`, `GET /api/v1/guru/story-sessions/:storySessionId/sources`, `POST /api/v1/story-sessions/:storySessionId/notes`; `GuruNotes`, `StorySources` |
| T5.3 | Genel/seans notu oluşturma, güncelleme, paylaşma ve aday görünümünü uygula. | Taslak aday API'sinde görünmez; paylaşım onayı ve `SHARED` geçişi audit edilir; yalnızca adayla paylaşılan not adaya döner; note sahibi olmayan Guru güncelleyemez. | M | T5.1, T2.2 | `guru-notlar.html`, `seans-notlari.html`, `ana.html`; `GET /api/v1/enrollments/:enrollmentId/notes`, `POST /api/v1/enrollments/:enrollmentId/notes`, `PUT /api/v1/enrollments/:enrollmentId/notes/:noteId`, `POST /api/v1/enrollments/:enrollmentId/notes/:noteId/share`, `GET /api/v1/me/notes`; `GuruNotes` |
| T5.4 | Guru assignment üretimi, aday detay/listesi ve teslim akışını uygula. | `Ödev`/`Belge` `details`, `Soru` `questions` alanları doğrulanır; yalnızca assignment sahibi aday teslim eder; son tarih/durum geçişi ve metin/dosya teslimi testlidir. | L | T5.1, T3.2 | `guru-odevler.html`, `odevler.html`, `odev-goruntule.html`, `odev-teslim.html`; `GET /api/v1/enrollments/:enrollmentId/assignments`, `POST /api/v1/enrollments/:enrollmentId/assignments`, `GET /api/v1/me/assignments`, `GET /api/v1/assignments/:assignmentId`, `POST /api/v1/assignments/:assignmentId/submissions`; `Assignments`, `AssignmentSubmissions`, `SubmissionFiles` |
| T5.5 | Guru profilini getir/güncelle/yayınla. | API_SPEC `guruProfile` camelCase alanları korunur; public katalog serializer'ı ile profil edit serializer'ı test edilir; eksik zorunlu profil yayınlanamaz; fiyat yetkisi ayrıca uygulanır. | M | T1.3, T1.5 | `guru-profil.html`, `danisman.html`, `danismanlar.html`; `GET /api/v1/guru/profile`, `PUT /api/v1/guru/profile`, `POST /api/v1/guru/profile/publish`; `GuruProfiles` |
| T5.6 | Yönetici kullanıcı, dinamik form, soru seti ve hizmet/fiyat API'lerini uygula; admin UI kapsamını ayrıca planla. | Yetkisiz roller reddedilir; config güncellemeleri sürümlüdür; hizmet fiyat/seans değişiklikleri mevcut enrollment snapshot'ını değiştirmez; her değişiklik audit edilir. | L | T1.3, T3.1, T4.1, T1.5, T0.1 | Yönetici UI mevcut değil; `GET /api/v1/admin/users`, `PATCH /api/v1/admin/users/:userId`, `GET /api/v1/admin/profile-form`, `PUT /api/v1/admin/profile-form`, `GET /api/v1/admin/question-sets`, `POST /api/v1/admin/question-sets`, `GET /api/v1/admin/services`, `PUT /api/v1/admin/services/:serviceId` |
| T5.7 | Yönetici payment ve audit raporlarını, uygun erişim kontrolleriyle sun. | Listeler pagination/filter uygular; hassas ödeme alanları redakte edilir; audit geçmişi değiştirilmeden saklanır; yalnızca Admin okuyabilir. | M | T2.4, T0.3 | Yönetici UI mevcut değil; `GET /api/v1/admin/payments`, `GET /api/v1/admin/audit-logs` |

## Faz 6 — Sertleştirme ve pilot

| ID | Görev / açıklama | Kabul kriterleri | Efor | Önkoşul | İlgili sayfalar / endpointler |
|---|---|---|---|---|---|
| T6.1 | Tam API authorization, privacy, rate limit ve hassas veri redaction testlerini çalıştır. | Rol/nesne/consent matrisindeki negatif testler geçer; auth/upload/AI endpointleri rate limitlidir; log ve hata gövdelerinde secret/PII sızıntısı bulunmaz. | L | T1.3, T2.2, T3.2, T4.5, T5.1 | Auth, CV, story, notes, assignments, payments ve admin endpointleri |
| T6.2 | UI → API adapter ve uçtan uca aday/Guru akışlarını entegre et. | `demo/` akışlarının localStorage yerine API durumuyla çalışması; ana başarılı akışın kayıt→ödeme→CV onayı→randevu→hikâye→not/ödev/teslim testinden geçmesi; dosya:// ortamında API erişimi varsayılmaması. | L | Faz 1–5 | 44 route; ilgili tüm `/api/v1` uçları |
| T6.3 | Provider sandbox, failure injection, backup/restore ve kapasite/pilot doğrulaması yap. | Duplicate webhook, ödeme/LLM/storage timeout, queue retry ve slot çakışması testleri geçer; backup restore belgelenir; latency/maliyet ölçümü raporlanır; pilot öncesi açık KVKK/ürün kararları onaylanır. | L | T6.1, T6.2 | Ödeme, dosya, AI ve randevu uçları |

## Sayfa kapsamı kontrol listesi

Bu liste her ana UI route'unun en az bir görevle ilişkilendirildiğini doğrular; route'lar bugün backend'e bağlanmış değildir.

| Sayfa grubu | Route'lar | Görev |
|---|---|---|
| Tanıtım/katalog/hesap | `index.html`, `danismanlar.html`, `danisman.html`, `danisman-profil.html`, `kayit.html`, `eposta.html`, `giris.html`, `giris-danisman.html`, `giris-hata-rol.html`, `davet.html`, `hizmet.html` | T1.2–T1.5 |
| Sipariş/ödeme | `siparis.html`, `odeme-ok.html`, `odeme-bekle.html`, `odeme-hata.html` | T2.1–T2.4 |
| Aday profil/CV/randevu/seans | `ana.html`, `profil.html`, `cv.html`, `randevu-on.html`, `takvim.html`, `randevu-ok.html`, `seanslar.html`, `seans-notlari.html`, `seans2-ok.html` | T2.1, T3.1–T3.6, T5.3 |
| Aday hikâye/ödev | `hikaye-giris.html`, `soru1.html`, `soru2.html`, `soru3.html`, `soru4.html`, `soru5.html`, `hikaye-yukle.html`, `ciktilar.html`, `odevler.html`, `odev-goruntule.html`, `odev-teslim.html` | T4.1–T4.5, T5.4 |
| Guru alanı | `guru-danisanlar.html`, `guru-danisan-detay.html`, `guru-hikaye.html`, `guru-notlar.html`, `guru-odevler.html`, `guru-musaitlik.html`, `guru-musaitlik-ekle.html`, `guru-seanslar.html`, `guru-profil.html` | T3.4–T3.6, T5.1–T5.5 |

## Varsayımlar ve UI'da eksik/belirsiz noktalar

- **VARSAYIM:** Efor aralıkları mühendis-günü ve S/M/L sınıflaması için öneridir; teyitli tahmin değildir.
- **VARSAYIM:** Faz 0'daki kararlar tamamlanmadan teknolojiye özel scaffold veya production entegrasyonu başlatılmaz.
- UI statik HTML/JavaScript ve `localStorage` demo durumudur; API çağrısı, gerçek oturum, DB, ödeme sağlayıcısı, file store, e-posta veya LLM entegrasyonu yoktur.
- Rapor auth yöntemini maskelemiştir. JWT, e-posta parola/reset ve Guru daveti davranışları karar/varsayım kapısıdır.
- Mevcut UI'da Yönetici ekranı yoktur; admin API görevleri rapor kapsamının hedefi olarak tutulur, UI geliştirme ayrıca kapsamlandırılmalıdır.
- Ödeme sağlayıcısı, refund/iptal kuralları, fiyatın minor-unit dönüşümü ve rıza metinlerinin satın alma/randevuya etkisi kesinleşmemiştir.
- CV/hikâye/ödev dosya tipi, üst boyut, malware scan, storage region, retention ve silme/backup davranışı açık karardır.
- LLM/CV parser sağlayıcısı, aday verisinin işlenme yeri, model eğitimi kullanımı, prompt saklama ve KVKK aktarım koşulları onaylanmalıdır.
- Appointment timezone, tekrar eden müsaitlik semantiği, no-show/iptal, meeting provider ve gerçek meeting URL davranışı kesinleşmemiştir.
- PAGES_MAP endpoint örnekleri `/api/v1` öneki olmadan yazılmıştır; API_SPEC bu prefix'i öneri olarak ekler. PAGES_MAP ve DATA_MODEL kullanıcı talimatı gereği değiştirilmemiştir. API öncesinde endpoint/path ve mock-to-wire mapping tek OpenAPI sözleşmesinde karara bağlanmalıdır.
- Rapor performans hedefleri ve pilot kullanıcı sayıları öneridir; Faz 6'da gerçek kapasite ölçümüyle doğrulanmalıdır.
