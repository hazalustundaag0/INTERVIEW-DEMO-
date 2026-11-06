# API sözleşmesi (öneri)

## 1. Durum ve kaynak ilkesi

Repoda çalışan backend, route/controller, request/response DTO, OpenAPI tanımı veya migration bulunmadı. demo UI'sı HTTP çağrısı yapmıyor; localStorage, sabit mock'lar ve sayfa yönlendirmeleri kullanıyor. Aşağıdaki endpoint ve JSON'lar uygulanmış gerçekler değil, önerilen backend sözleşmesidir.

Backend eklendiğinde route/model/DTO/migration gerçekleri bu sözleşmenin kaynağı olur. Backend yokken UI yalnızca ekran alanı ve akış ihtiyacını gösterir. PRD.md, PAGES_MAP.md ve DATA_MODEL.md bu iş kapsamında değiştirilmemiştir. DATA_MODEL.md backend entity bulunmadığını söyler; burada geçen JSON'lar kalıcı model kararı değildir.

PAGES_MAP.md endpoint'leri /api/v1 öneki olmadan gösterir. Bu dosyada aynı uçlar /api/v1 ile yazılır. {id} path parametresidir. Sürüm öneki, HTTP/JSON ve JWT örnekleri varsayımdır.

## 2. Genel wire-format kuralları

### Kimlik doğrulama ve erişim

| Etiket | Önerilen erişim |
|---|---|
| Public | Token gerekmez; kayıt/giriş ve yayınlı katalog için hız sınırlaması gerekir. |
| Candidate | danisan; yalnızca kendi kaydı/enrollment'ı ve kendisiyle paylaşılmış içerik. |
| Guru | danisman; kendi profili/müsaitliği ve kendisine atanmış aday/enrollment. Ham CV/cevap erişiminde ayrıca geçerli rıza gerekir. |
| Admin | yonetici; PRD hedef rolüdür, demo'da admin ekranı yoktur. |
| Provider | Ödeme webhook'u; oturum token'ı değil imza doğrulaması kullanır. |

Varsayım: oturum gerektiren örneklerde Authorization başlığı Bearer TOKEN biçimindedir. JWT/cookie/header, token ömrü, refresh stratejisi ve admin MFA seçilmemiştir. Tarayıcı localStorage oturumu production kimliği sayılmaz. Her istekte rolün yanında nesne sahipliği, Guru ataması ve gerekli consent kontrol edilir.

### Başarılı yanıtlar ve standart hata

Tek kaynak yanıtında doğrudan JSON kaynak nesnesi döner. Liste yanıtı:

~~~json
{
  "data": [],
  "page": { "limit": 20, "nextCursor": null, "hasMore": false }
}
~~~

Hata yanıtı:

~~~json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "İstek doğrulanamadı.",
    "details": [{ "field": "email", "code": "INVALID_FORMAT", "message": "Geçerli e-posta gir." }],
    "requestId": "req_example"
  }
}
~~~

| HTTP | Genel hata kodları |
|---|---|
| 400 | VALIDATION_FAILED, INVALID_FILTER, INVALID_SORT |
| 401 | AUTHENTICATION_REQUIRED, TOKEN_EXPIRED, INVALID_CREDENTIALS |
| 403 | FORBIDDEN, ROLE_REQUIRED, CONSENT_REQUIRED |
| 404 | RESOURCE_NOT_FOUND (başka kullanıcının kaydının varlığını açığa çıkarmaz) |
| 409 | STATE_CONFLICT, SLOT_UNAVAILABLE, IDEMPOTENCY_CONFLICT, VERSION_CONFLICT |
| 413 / 415 | FILE_TOO_LARGE, UNSUPPORTED_MEDIA_TYPE |
| 422 | BUSINESS_RULE_VIOLATION, BOOKING_PREREQUISITES_INCOMPLETE |
| 429 | RATE_LIMITED |
| 500 / 502 / 503 | INTERNAL_ERROR, INTEGRATION_FAILURE, SERVICE_UNAVAILABLE |

Her uç ayrıca tabloda yazan özel hataları döndürebilir. CV, ham cevap, hikâye, not, parola, token veya payment raw payload hata mesajına/loga kopyalanmaz.

### Listeleme, filtreleme, sıralama, tarih ve sürümleme

- Varsayım: liste uçları limit (varsayılan 20, önerilen 1–100) ve opak cursor alır; page.nextCursor/hasMore döndürür. UI'da sayfalama kontrolü görünmüyor.
- Varsayım: yalnızca uçta belirtilen filtreler kabul edilir. Guru kataloğu q, sector, sort; takvim from, to, timezone; durum listeleri status alabilir. Bilinmeyen filtre 400 INVALID_FILTER olur.
- sort/order=asc|desc yalnızca ilgili listede geçerlidir. danismanlar.html sıralaması recommended|name|experience olarak eşlenir.
- UI tarih/saat alanları tarih (YYYY-MM-DD), bas/bit (HH:mm), durum (musait|rezerve) adlarıyla korunur. UTC timestamp gerekirse ek alanla verilir; timezone kararı açık kalır.
- Varsayım: /api/v1 path sürümüdür; kırıcı değişiklik yeni major path ister. Content-Type JSON'dur; dosya aktarımı upload uçlarında ayrıca tanımlanır.
- Varsayım: ödeme/rezervasyon gibi tekrarlanabilir işlemler Idempotency-Key alır.

## 3. Endpoint katalogu

Örnekler öneridir. UI wire-format alanları kasıtlı korunmuştur; backend DTO'su bulunduğu anlamına gelmez. Kısaltılmış hata kodları standart hata tablosuyla birlikte değerlendirilir.

### 3.1 Kimlik, hesap ve oturum

| Method / URL | Açıklama / auth | Request (path/query/body) | Başarılı response örneği | Özel hatalar |
|---|---|---|---|---|
| POST /api/v1/auth/register | Aday kaydı / Public | Body {"name":"Elif Yılmaz","email":"elif@example.test","password":"…"} | 201 {"user":{"id":"usr_1","role":"danisan","name":"Elif Yılmaz","email":"elif@example.test","state":"new"},"verification":{"required":true}} | EMAIL_ALREADY_REGISTERED, PASSWORD_POLICY_FAILED |
| POST /api/v1/auth/email-verifications | Kod gönder/yenile / Public | Body {"email":"elif@example.test"} | 202 {"sent":true,"expiresInSeconds":600} | VERIFICATION_RATE_LIMITED |
| POST /api/v1/auth/email-verifications/confirm | E-posta doğrula / Public | Body {"email":"elif@example.test","code":"123456"} | 200 {"user":{"id":"usr_1","role":"danisan","name":"Elif Yılmaz","email":"elif@example.test","state":"active"},"accessToken":"<redacted>","expiresIn":900} | INVALID_VERIFICATION_CODE, VERIFICATION_EXPIRED |
| POST /api/v1/auth/sessions | Aday/Guru girişi / Public | Body {"email":"elif@example.test","password":"…","role":"danisan"} | 200 {"user":{"id":"usr_1","role":"danisan","name":"Elif Yılmaz","email":"elif@example.test","state":"active"},"accessToken":"<redacted>","expiresIn":900} | INVALID_CREDENTIALS, EMAIL_NOT_VERIFIED, ROLE_MISMATCH, ACCOUNT_SUSPENDED |
| DELETE /api/v1/auth/sessions/current | Oturumu kapat / Candidate, Guru, Admin | Bearer token; body yok | 200 {"revoked":true} | TOKEN_ALREADY_REVOKED |
| GET /api/v1/me | Oturum kullanıcısı / Candidate, Guru, Admin | Bearer token | 200 {"id":"usr_1","role":"danisan","name":"Elif Yılmaz","email":"elif@example.test","state":"active"} | — |
| POST /api/v1/auth/password-resets | Parola sıfırlama başlat / Public; UI'da bağlantı var | Body {"email":"elif@example.test"} | 202 {"accepted":true} | RATE_LIMITED |
| POST /api/v1/auth/password-resets/confirm | Parola sıfırlamayı tamamla / Public; varsayım | Body {"token":"<redacted>","password":"…"} | 200 {"reset":true} | RESET_TOKEN_INVALID, RESET_TOKEN_EXPIRED |
| POST /api/v1/auth/invitations/accept | Guru davetini kabul et / Public; varsayım | Body {"token":"<redacted>","password":"…"} | 200 {"user":{"id":"usr_g1","role":"danisman","name":"Selin Arslan","state":"active"}} | INVITATION_INVALID, INVITATION_EXPIRED |

### 3.2 Keşif ve enrollment

| Method / URL | Açıklama / auth | Request (path/query/body) | Başarılı response örneği | Özel hatalar |
|---|---|---|---|---|
| GET /api/v1/services | Aktif hizmet kataloğu / Public | Query active, limit, cursor | 200 {"data":[{"id":"svc_1","service":"Satış hikâyesi oluşturma","sessions":2,"minutes":50,"price":1500,"currency":"TRY","active":true}],"page":{"limit":20,"nextCursor":null,"hasMore":false}} | INVALID_FILTER |
| GET /api/v1/gurus | Yayınlı Guru listesi / Public | Query q, sector, sort, order, limit, cursor | 200 {"data":[{"id":"selin-arslan","ad":"Selin Arslan","unvan":"Kıdemli Satış Direktörü & Mentor","deneyimYili":12,"sektorler":["Teknoloji","SaaS"],"uzmanlik":["Satış liderliği"],"ucret":1500,"yayinda":true}],"page":{"limit":20,"nextCursor":null,"hasMore":false}} | INVALID_FILTER, INVALID_SORT |
| GET /api/v1/gurus/{guruId} | Yayınlı Guru detayı / Public | Path guruId | 200 {"id":"selin-arslan","ad":"Selin Arslan","unvan":"Mentor","deneyimYili":12,"sektorler":["Teknoloji"],"hakkinda":"…","uzmanlik":[],"deneyim":[],"egitim":[],"sertifikalar":[],"yaklasim":[],"kimlerleCalisirim":[],"sss":[],"ucret":1500,"yayinda":true} | GURU_NOT_PUBLISHED |
| GET /api/v1/gurus/{guruId}/availability | Adaya açık slotlar / Public | Path guruId; query from, to, timezone, limit, cursor | 200 {"data":[{"id":"slot_1","tarih":"2027-01-11","bas":"10:00","bit":"10:50","durum":"musait"}],"page":{"limit":100,"nextCursor":null,"hasMore":false}} | INVALID_DATE_RANGE |
| POST /api/v1/enrollments | Seçimi enrollment'a çevir / Candidate | Body {"service":"Satış hikâyesi oluşturma","guru":"Selin Arslan"}; kimlik alanlarıyla body alternatifi açık karar | 201 {"id":"enr_1","service":"Satış hikâyesi oluşturma","sessions":2,"minutes":50,"price":1500,"guru":"Selin Arslan","status":"DRAFT"} | SERVICE_UNAVAILABLE, GURU_NOT_AVAILABLE |
| GET /api/v1/me/enrollments | Aday enrollment listesi / Candidate | Query status, limit, cursor | 200 {"data":[{"id":"enr_1","service":"Satış hikâyesi oluşturma","sessions":2,"minutes":50,"price":1500,"guru":"Selin Arslan","status":"ACTIVE"}],"page":{"limit":20,"nextCursor":null,"hasMore":false}} | INVALID_FILTER |
| GET /api/v1/enrollments/{enrollmentId} | Sipariş/enrollment özeti / sahibi Candidate; atanmış Guru sınırlı görünüm | Path enrollmentId | 200 {"id":"enr_1","service":"Satış hikâyesi oluşturma","sessions":2,"minutes":50,"price":1500,"guru":"Selin Arslan","status":"PENDING_PAYMENT","paymentStatus":"PENDING"} | ENROLLMENT_ACCESS_DENIED |
| POST /api/v1/enrollments/{enrollmentId}/consents | Rıza kararı kaydet / enrollment sahibi Candidate | Body {"purpose":"EXPLICIT_CONSENT","documentVersion":"kvkk-1.0","decision":"GRANTED"} | 201 {"id":"cons_1","enrollmentId":"enr_1","purpose":"EXPLICIT_CONSENT","documentVersion":"kvkk-1.0","decision":"GRANTED","decidedAt":"2026-11-06T12:00:00Z"} | CONSENT_VERSION_INVALID, ENROLLMENT_ACCESS_DENIED |

### 3.3 Ödeme

| Method / URL | Açıklama / auth | Request (path/query/body) | Başarılı response örneği | Özel hatalar |
|---|---|---|---|---|
| POST /api/v1/enrollments/{enrollmentId}/payments | Sağlayıcı checkout başlat / Candidate sahibi | Header Idempotency-Key; body {"method":"CARD"}; kart numarası/CCV gönderilmez | 201 {"id":"pay_1","enrollmentId":"enr_1","status":"PENDING","amount":1500,"currency":"TRY","checkoutUrl":"https://provider.example/…"} | PAYMENT_ALREADY_PAID, PAYMENT_PROVIDER_UNAVAILABLE, IDEMPOTENCY_CONFLICT |
| GET /api/v1/payments/{paymentId} | Ödeme durumunu sorgula / Candidate sahibi, Admin | Path paymentId | 200 {"id":"pay_1","status":"PAID","amount":1500,"currency":"TRY","paidAt":"2026-11-06T12:01:00Z"} | PAYMENT_ACCESS_DENIED |
| POST /api/v1/webhooks/payments/{provider} | Sağlayıcı bildirimi / Provider signature | Sağlayıcı imzalı raw body; imza başlığı sağlayıcıya göre | 200 {"received":true,"processed":true} | INVALID_PROVIDER_SIGNATURE, DUPLICATE_EVENT |

### 3.4 Profil ve CV

| Method / URL | Açıklama / auth | Request (path/query/body) | Başarılı response örneği | Özel hatalar |
|---|---|---|---|---|
| GET /api/v1/profile-form | Aktif form tanımı / Candidate | Yok | 200 {"version":1,"fields":[{"key":"targetPosition","label":"Hedef pozisyon","type":"text","required":true},{"key":"sector","label":"Sektör","type":"text","required":true}]} | CONFIGURATION_UNAVAILABLE |
| GET /api/v1/me/profile | Aday profilini getir / Candidate | Yok | 200 {"targetPosition":"Kıdemli Satış Yöneticisi","sector":"Teknoloji & SaaS","participationReason":"…","additionalNotes":"…"} | — |
| PUT /api/v1/me/profile | Aday profilini kaydet / Candidate | Body {"targetPosition":"Kıdemli Satış Yöneticisi","sector":"Teknoloji & SaaS","participationReason":"…","additionalNotes":"…"} | 200 {"targetPosition":"Kıdemli Satış Yöneticisi","sector":"Teknoloji & SaaS","participationReason":"…","additionalNotes":"…","updatedAt":"2026-11-06T12:00:00Z"} | PROFILE_VALIDATION_FAILED |
| GET /api/v1/enrollments/{enrollmentId}/booking-readiness | Randevu ön koşulları / Candidate sahibi | Path enrollmentId | 200 {"ready":false,"missing":["profile","consent","cvApproval"]} | ENROLLMENT_ACCESS_DENIED |
| POST /api/v1/enrollments/{enrollmentId}/cv-files | CV upload başlat/metadata kaydet / Candidate sahibi | Multipart veya upload intent; aktarım biçimi/limit karara bağlı | 201 {"id":"cv_1","fileName":"cv.pdf","status":"PROCESSING","candidateApproved":false} | FILE_TOO_LARGE, UNSUPPORTED_MEDIA_TYPE |
| POST /api/v1/enrollments/{enrollmentId}/cv-manual-entry | CV bilgilerini elle kaydet / Candidate sahibi | UI alanları kesin değil; örnek body {"entries":[{"section":"experience","text":"…"}]} öneridir | 201 {"id":"manual_cv_1","entries":[{"section":"experience","text":"…"}],"candidateApproved":true} | CV_ENTRY_INVALID |
| GET /api/v1/cv-files/{cvFileId} | CV parse/durumunu gör / Candidate sahibi; Guru ancak atama+consent ile | Path cvFileId | 200 {"id":"cv_1","status":"PARSED","parsedData":{"experience":[],"education":[],"skills":[]},"candidateApproved":false} | CV_ACCESS_DENIED |
| PUT /api/v1/cv-files/{cvFileId}/approval | Parse verisini adayca onayla / Candidate sahibi | Body {"approved":true} | 200 {"id":"cv_1","candidateApproved":true,"approvedAt":"2026-11-06T12:00:00Z"} | CV_NOT_READY, CV_ACCESS_DENIED |
| DELETE /api/v1/cv-files/{cvFileId} | CV silme isteği / Candidate sahibi | Path cvFileId | 202 {"accepted":true,"id":"cv_1"} | CV_ACCESS_DENIED, RETENTION_RESTRICTION |

### 3.5 Müsaitlik, randevu ve seans

| Method / URL | Açıklama / auth | Request (path/query/body) | Başarılı response örneği | Özel hatalar |
|---|---|---|---|---|
| GET /api/v1/guru/availability | Guru kendi takvimi / Guru | Query from, to | 200 {"data":[{"id":"slot_1","tarih":"2027-01-11","bas":"10:00","bit":"10:50","durum":"musait"}],"page":{"limit":100,"nextCursor":null,"hasMore":false}} | INVALID_DATE_RANGE |
| POST /api/v1/guru/availability | Müsait slot ekle / Guru | Body {"slots":[{"tarih":"2027-01-11","bas":"10:00","bit":"10:50","durum":"musait"}]} | 201 {"data":[{"id":"slot_1","tarih":"2027-01-11","bas":"10:00","bit":"10:50","durum":"musait"}]} | SLOT_OVERLAP, INVALID_TIME_RANGE |
| PUT /api/v1/guru/availability | Slotları toplu güncelle / Guru; replace/upsert semantiği karara bağlı | Body {"slots":[{"id":"slot_1","tarih":"2027-01-11","bas":"10:00","bit":"10:50","durum":"musait"}]} | 200 {"data":[{"id":"slot_1","tarih":"2027-01-11","bas":"10:00","bit":"10:50","durum":"musait"}]} | SLOT_RESERVED, SLOT_OVERLAP |
| DELETE /api/v1/guru/availability/{slotId} | Boş slotu kaldır / Guru | Path slotId | 200 {"deleted":true} | SLOT_RESERVED, RESOURCE_NOT_FOUND |
| POST /api/v1/enrollments/{enrollmentId}/appointments | Slotu atomik rezerve et / Candidate sahibi | Header Idempotency-Key; body {"availabilityId":"slot_1"} | 201 {"id":"apt_1","tarih":"2027-01-11","bas":"10:00","bit":"10:50","aday":"Elif Yılmaz","danışman":"Selin Arslan","danismanId":"selin-arslan","durum":"BOOKED"} | SLOT_UNAVAILABLE, BOOKING_PREREQUISITES_INCOMPLETE |
| GET /api/v1/me/appointments | Aday seans/randevu listesi / Candidate | Query status, limit, cursor | 200 {"data":[{"id":"apt_1","tarih":"2027-01-11","bas":"10:00","bit":"10:50","danışman":"Selin Arslan","danismanId":"selin-arslan","durum":"BOOKED"}],"page":{"limit":20,"nextCursor":null,"hasMore":false}} | INVALID_FILTER |
| GET /api/v1/guru/appointments | Guru seans listesi / Guru | Query status, limit, cursor | 200 {"data":[{"id":"apt_1","tarih":"2027-01-11","bas":"10:00","bit":"10:50","aday":"Elif Yılmaz","durum":"BOOKED"}],"page":{"limit":20,"nextCursor":null,"hasMore":false}} | INVALID_FILTER |
| GET /api/v1/appointments/{appointmentId} | Randevu detayı / ilgili Candidate veya atanmış Guru | Path appointmentId | 200 {"id":"apt_1","tarih":"2027-01-11","bas":"10:00","bit":"10:50","aday":"Elif Yılmaz","danışman":"Selin Arslan","danismanId":"selin-arslan","durum":"BOOKED"} | APPOINTMENT_ACCESS_DENIED |
| PATCH /api/v1/appointments/{appointmentId} | Seans durumunu değiştir / ilgili Guru; iptal izinleri açık karar | Body {"durum":"COMPLETED"} | 200 {"id":"apt_1","durum":"COMPLETED"} | INVALID_STATE_TRANSITION, APPOINTMENT_ACCESS_DENIED |
| PUT /api/v1/appointments/{appointmentId}/meeting-link | Toplantı linki kaydet / atanmış Guru; provider kararı gerekli | Body {"meetingUrl":"https://meeting.example/…"} | 200 {"id":"apt_1","meetingUrl":"https://meeting.example/…"} | MEETING_PROVIDER_UNAVAILABLE, APPOINTMENT_ACCESS_DENIED |

### 3.6 Hikâye, soru ve çıktılar

| Method / URL | Açıklama / auth | Request (path/query/body) | Başarılı response örneği | Özel hatalar |
|---|---|---|---|---|
| POST /api/v1/enrollments/{enrollmentId}/story-sessions | Hikâye oturumu başlat/devam / Candidate sahibi | Body boş veya {"action":"resume"} | 201 {"id":"story_1","status":"QA_IN_PROGRESS","currentQuestion":"1"} | STORY_NOT_AVAILABLE |
| GET /api/v1/story-sessions/current | Devam edilebilir oturum / Candidate | Yok | 200 {"id":"story_1","status":"QA_IN_PROGRESS","currentQuestion":"1","answers":{"1":"…"}} | STORY_SESSION_NOT_FOUND |
| GET /api/v1/story-sessions/{storySessionId} | Oturum ve cevapları getir / sahibi Candidate; Guru için atama+consent | Path storySessionId | 200 {"id":"story_1","status":"QA_IN_PROGRESS","currentQuestion":"1","answers":{"1":"…"}} | STORY_SESSION_ACCESS_DENIED |
| PUT /api/v1/story-sessions/{storySessionId}/answers/{questionId} | Cevabı kaydet / sahibi Candidate | Path questionId; body {"cevap":"…"} | 200 {"storySessionId":"story_1","questionId":"1","cevap":"…","status":"ANSWERED"} | QUESTION_NOT_FOUND, STORY_SESSION_CLOSED |
| POST /api/v1/story-sessions/{storySessionId}/answers/{questionId}/skip | Soruyu atla/bilmiyorum / sahibi Candidate | Path questionId; body boş | 200 {"storySessionId":"story_1","questionId":"1","status":"SKIPPED"} | QUESTION_NOT_FOUND, STORY_SESSION_CLOSED |
| POST /api/v1/story-sessions/{storySessionId}/follow-ups | Takip sorusu al / sahibi Candidate | Body {"questionId":"1"} | 201 {"id":"followup_1","question":"Bu sonucu nasıl ölçtün?","cevap":null} | FOLLOW_UP_LIMIT_REACHED, AI_UNAVAILABLE |
| POST /api/v1/story-sessions/{storySessionId}/generate | Hikâye/çıktı üret / sahibi Candidate | Header Idempotency-Key; body {} | 202 {"jobId":"job_1","status":"PROCESSING"} | CV_APPROVAL_REQUIRED, AI_UNAVAILABLE |
| POST /api/v1/story-sessions/{storySessionId}/drafts | Aday düzenlemesi/hazır metin kaydet / sahibi Candidate | Body {"metin":"…","kaynak":"CANDIDATE_EDIT"} | 201 {"id":"draft_2","surum":2,"metin":"…","kaynak":"CANDIDATE_EDIT"} | VERSION_CONFLICT, STORY_SESSION_CLOSED |
| GET /api/v1/story-sessions/{storySessionId}/drafts | Taslak sürümleri / sahibi Candidate | Yok | 200 {"data":[{"id":"draft_1","surum":1,"metin":"…","kaynak":"AI"}]} | STORY_SESSION_ACCESS_DENIED |
| GET /api/v1/story-sessions/{storySessionId}/outputs | Hikâye ve türetilmiş çıktılar / sahibi Candidate | Yok | 200 {"surum":1,"cumleler":[{"cumleId":"c1","metin":"…","kaynak":"cevap:1","bilgiGerekli":false}],"takipler":[],"ciktilar":{"ozet":"…","mulakat":[],"cv":"…"},"oneriler":[]} | OUTPUTS_NOT_READY, STORY_SESSION_ACCESS_DENIED |
| GET /api/v1/guru/story-sessions/{storySessionId} | Atanmış Guru hikâye görünümü / Guru+atama+consent | Path storySessionId | 200 {"surum":1,"cumleler":[{"cumleId":"c1","metin":"…","bilgiGerekli":false}],"takipler":[],"ciktilar":{},"oneriler":[]} | CONSENT_REQUIRED, STORY_SESSION_ACCESS_DENIED |
| GET /api/v1/guru/story-sessions/{storySessionId}/sources | Cümle kaynakları / Guru+atama+consent | Path storySessionId | 200 {"data":[{"cumleId":"c1","kaynak":"cevap:1","metin":"…"}]} | CONSENT_REQUIRED, STORY_SESSION_ACCESS_DENIED |

### 3.7 Guru çalışma alanı, notlar ve ödevler

| Method / URL | Açıklama / auth | Request (path/query/body) | Başarılı response örneği | Özel hatalar |
|---|---|---|---|---|
| GET /api/v1/guru/candidates | Atanmış aday listesi / Guru | Query q, status, limit, cursor | 200 {"data":[{"id":"cand_1","ad":"Elif Yılmaz","hedefPozisyon":"Satış Yöneticisi","durum":"ACTIVE"}],"page":{"limit":20,"nextCursor":null,"hasMore":false}} | INVALID_FILTER |
| GET /api/v1/guru/candidates/{candidateId} | Aday özeti / atanmış Guru | Path candidateId | 200 {"id":"cand_1","ad":"Elif Yılmaz","hedefPozisyon":"Satış Yöneticisi","seanslar":[]} | CANDIDATE_ACCESS_DENIED |
| GET /api/v1/guru/candidates/{candidateId}/appointments | Aday seansları / atanmış Guru | Path candidateId | 200 {"data":[{"id":"apt_1","tarih":"2027-01-11","bas":"10:00","bit":"10:50","durum":"BOOKED"}]} | CANDIDATE_ACCESS_DENIED |
| GET /api/v1/enrollments/{enrollmentId}/notes | Enrollment notları / atanmış Guru | Path enrollmentId | 200 {"data":[{"id":"note_1","cumleId":"c1","metin":"…","tarih":"2026-11-06","status":"DRAFT"}]} | ENROLLMENT_ACCESS_DENIED |
| POST /api/v1/enrollments/{enrollmentId}/notes | Not taslağı / atanmış Guru | Body {"cumleId":"c1","metin":"…","session":1} | 201 {"id":"note_1","cumleId":"c1","metin":"…","tarih":"2026-11-06","status":"DRAFT"} | ENROLLMENT_ACCESS_DENIED |
| PUT /api/v1/enrollments/{enrollmentId}/notes/{noteId} | Notu güncelle / not sahibi Guru | Body {"metin":"…"} | 200 {"id":"note_1","cumleId":"c1","metin":"…","tarih":"2026-11-06","status":"DRAFT"} | NOTE_NOT_EDITABLE, NOTE_ACCESS_DENIED |
| POST /api/v1/enrollments/{enrollmentId}/notes/{noteId}/share | Notu paylaş / not sahibi Guru; onay kuralı PRD'ye tabi | Body {"confirmed":true} | 200 {"id":"note_1","status":"SHARED","sharedAt":"2026-11-06T12:00:00Z"} | SHARE_CONFIRMATION_REQUIRED, NOTE_ACCESS_DENIED |
| GET /api/v1/me/notes | Adayla paylaşılmış notlar / Candidate | Query session, limit, cursor | 200 {"data":[{"cumleId":"c1","metin":"…","tarih":"2026-11-06","status":"SHARED"}],"page":{"limit":20,"nextCursor":null,"hasMore":false}} | INVALID_FILTER |
| GET /api/v1/enrollments/{enrollmentId}/assignments | Guru talepleri / atanmış Guru | Path enrollmentId | 200 {"data":[{"id":"task_1","type":"Ödev","title":"Hazırlık","deadline":"2026-11-20","details":"…","status":"OPEN"}]} | ENROLLMENT_ACCESS_DENIED |
| POST /api/v1/enrollments/{enrollmentId}/assignments | Ödev/belge/soru talebi / atanmış Guru | Body {"type":"Ödev","title":"Hazırlık","deadline":"2026-11-20","details":"…"} veya {"type":"Soru","title":"Ön hazırlık","questions":["…"]} | 201 {"id":"task_1","type":"Ödev","title":"Hazırlık","deadline":"2026-11-20","details":"…","status":"OPEN"} | ASSIGNMENT_INVALID, ENROLLMENT_ACCESS_DENIED |
| GET /api/v1/me/assignments | Aday görevleri / Candidate | Query status, limit, cursor | 200 {"data":[{"id":"task_1","type":"Ödev","title":"Hazırlık","deadline":"2026-11-20","details":"…","status":"OPEN"}],"page":{"limit":20,"nextCursor":null,"hasMore":false}} | INVALID_FILTER |
| GET /api/v1/assignments/{assignmentId} | Görev detayı / ilgili Candidate veya atanmış Guru | Path assignmentId | 200 {"id":"task_1","type":"Ödev","title":"Hazırlık","deadline":"2026-11-20","details":"…","status":"OPEN"} | ASSIGNMENT_ACCESS_DENIED |
| POST /api/v1/assignments/{assignmentId}/submissions | Metin/dosya teslimi / assignment adayı | Body {"text":"…"} veya multipart file | 201 {"id":"sub_1","assignmentId":"task_1","text":"…","status":"SUBMITTED","submittedAt":"2026-11-06T12:00:00Z"} | SUBMISSION_CLOSED, FILE_TOO_LARGE |

### 3.8 Guru profili

| Method / URL | Açıklama / auth | Request (path/query/body) | Başarılı response örneği | Özel hatalar |
|---|---|---|---|---|
| GET /api/v1/guru/profile | Düzenleme profilini getir / Guru | Yok | 200 {"name":"Selin Arslan","title":"Mentor","experience":12,"sectors":["Teknoloji"],"about":"…","expertise":[],"experienceList":[],"education":[],"certificates":[],"approach":[],"clients":[],"faqs":[],"price":1500,"published":false} | — |
| PUT /api/v1/guru/profile | Profil taslağını güncelle / Guru | guruProfile camelCase alanları | 200 {"name":"Selin Arslan","title":"Mentor","experience":12,"sectors":["Teknoloji"],"about":"…","expertise":[],"experienceList":[],"education":[],"certificates":[],"approach":[],"clients":[],"faqs":[],"price":1500,"published":false} | PROFILE_VALIDATION_FAILED |
| POST /api/v1/guru/profile/publish | Profili yayınla / Guru | Body {} | 200 {"published":true} | PROFILE_INCOMPLETE, PUBLISH_REVIEW_REQUIRED |

### 3.9 Yönetici uçları — hedef kapsam, demo ekranı yok

Varsayım: PRD yönetici yapılandırma/denetim hedefi tanımlar. Aşağıdaki uçlar demo akışından türememiştir; yönetici UI ve yetki matrisi ayrıca karara bağlanmalıdır.

| Method / URL | Açıklama / auth | Request (path/query/body) | Başarılı response örneği | Özel hatalar |
|---|---|---|---|---|
| GET /api/v1/admin/users | Hesapları listele / Admin | Query q, role, status, limit, cursor | 200 {"data":[{"id":"usr_1","role":"danisan","state":"active"}],"page":{"limit":20,"nextCursor":null,"hasMore":false}} | INVALID_FILTER |
| PATCH /api/v1/admin/users/{userId} | Hesap durumunu güncelle / Admin | Body {"state":"suspended"} | 200 {"id":"usr_1","state":"suspended"} | INVALID_STATE_TRANSITION |
| GET /api/v1/admin/profile-form | Form config getir / Admin | Yok | 200 {"version":1,"fields":[]} | — |
| PUT /api/v1/admin/profile-form | Form config sürümle / Admin | Body {"fields":[]} | 200 {"version":2,"fields":[]} | VERSION_CONFLICT |
| GET /api/v1/admin/question-sets | Soru setlerini listele / Admin | Query limit, cursor | 200 {"data":[],"page":{"limit":20,"nextCursor":null,"hasMore":false}} | — |
| POST /api/v1/admin/question-sets | Soru seti sürümü oluştur / Admin | Body {"name":"Satış hikâyesi","language":"tr","questions":[]} | 201 {"id":"qs_1","version":1,"status":"DRAFT"} | QUESTION_SET_INVALID |
| GET /api/v1/admin/services | Hizmet/fiyat config listele / Admin | Query limit, cursor | 200 {"data":[],"page":{"limit":20,"nextCursor":null,"hasMore":false}} | — |
| PUT /api/v1/admin/services/{serviceId} | Hizmet/fiyat config güncelle / Admin | Body {"service":"…","sessions":2,"minutes":50,"price":1500,"active":true} | 200 {"id":"svc_1","service":"…","sessions":2,"minutes":50,"price":1500,"active":true} | SERVICE_INVALID, VERSION_CONFLICT |
| GET /api/v1/admin/payments | Ödemeleri incele / Admin | Query status, from, to, limit, cursor | 200 {"data":[],"page":{"limit":20,"nextCursor":null,"hasMore":false}} | INVALID_FILTER |
| GET /api/v1/admin/ai-requests | AI kullanımını incele / Admin | Query from, to, provider, limit, cursor | 200 {"data":[],"page":{"limit":20,"nextCursor":null,"hasMore":false}} | INVALID_FILTER |
| GET /api/v1/admin/audit-logs | Audit kayıtlarını incele / Admin | Query actorId, entityType, from, to, limit, cursor | 200 {"data":[],"page":{"limit":20,"nextCursor":null,"hasMore":false}} | INVALID_FILTER |

## 4. UI ↔ Doküman Uyumsuzlukları

Bu bölüm UI ile doküman önerileri arasındaki farkları kaydeder; backend uygulamasıyla fark anlamına gelmez. Gerçek backend bulunmadığından gerçek request/response farkı saptanamaz. PRD.md, PAGES_MAP.md ve DATA_MODEL.md değiştirilmemiştir.

### Demo'da olup dokümanda olmayan veya eksik tanımlananlar

| Demo bulgusu | Dokümandaki durum / fark |
|---|---|
| LocalStorage anahtarları demoOturum, demoSecim, demoMusaitlik, demoRandevu, guruProfile, guruElifTasks, demoOdevler, demoGuruNotlari, demoSoruCevaplari, demoHikaye, demoHikayeGapTypes ve akış işaretleri | DATA_MODEL.md kalıcı entity tanımlamadığını bildirir; PAGES_MAP/API bu storage anahtarlarının tümünü tek tek kapsamaz. Bunlar UI mock state'idir, entity değildir. |
| Takvim slotu id, tarih, bas, bit, durum alanlarıyla; randevu ayrıca aday, aksanlı danışman ve danismanId ile saklanır | PAGES_MAP ekran ihtiyacını sayar, JSON alan/tiplerinin tümünü belirtmez. Bu API örneklerinde wire-format olarak korunur; kesin response değildir. |
| guruProfile edit modeli name, title, experience, sectors, about, expertise, experienceList, education, certificates, approach, clients, faqs, price, published alanlarını kullanır | PAGES_MAP alanları Türkçe özetler; ayrıntılı camelCase profile wire shape'i tanımlamaz. |
| demoSoruCevaplari \"1\"–\"5\" string anahtarları ve string cevap değerleri saklar; hikâye state'i takip/çıktıları da içerir | PAGES_MAP answers uçlarında {questionId} kullanır; sıra numarası ile backend ID arasındaki mapping tanımlı değildir. |
| Ödeme yöntemi, profil/CV/rıza tamamlanma flag'leri, seçili takvim tarihi/saati, demo seans/link flag'leri, seçili aday gibi geçici UI değerleri vardır | PAGES_MAP bunların bir kısmını kapsar; hepsi için API alanı/CRUD tanımlamaz. UI flag'leri kalıcı state olarak varsayılmamalıdır. |

### Dokümanda olup demo'da olmayan

| Doküman önerisi | Demo durumu |
|---|---|
| Parola reset başlatma/tamamlama uçları | giris.html yardım bağlantısı gösterir; parola reset ekranı ve tam akış yoktur. |
| Admin kullanıcı/form/soru seti/hizmet/payment/AI/audit uçları | PRD hedef kapsamı tanımlar; ana 44 sayfada yönetici paneli veya admin rol akışı yoktur. |
| Cursor sayfalama, JSON hata gövdesi, request ID, idempotency header'ı | UI HTTP isteği yapmadığından görünür davranış/alanı yoktur. |
| Upload intent, CV parse/onay API'si, webhook imza doğrulama, payment status ve background job durumu | Ekranlar bu işlemleri demo olarak taklit eder; gerçek servis/API değildir. |
| Guru profil publish, davet kabul ve Guru yönetim uçları | İlgili demo ekranları/aksiyonları olsa da backend çağrısı veya sunucu iş kuralı yoktur. |

### İsim, tip ve yol gösterimi farkları

| Konu | Demo/UI | Doküman farkı ve gereken eşleme |
|---|---|---|
| Guru katalog/profil | advisors.js katalog alanları ad, unvan, deneyimYili (number), sektorler, hakkinda, uzmanlik, deneyim, egitim, sertifikalar, yaklasim, kimlerleCalisirim, sss, ucret, yayinda; guruProfile edit modeli İngilizce camelCase | Public catalog serializer ve edit DTO farklı shape'tir; adapter açıkça eşlemelidir. |
| Slot ve randevu | tarih ISO date string; bas/bit HH:mm; durum Türkçe musait/rezerve; randevuda danışman anahtarı aksanlıdır | Eski backend taslaklarında UTC timestamp/İngilizce enum önerileri vardır; saat dilimi ve enum dönüşümü karara bağlanmalıdır. |
| Ödev türü | UI Ödev/Belge/Soru ve koşullu details/questions alanlarını kullanır | Eski backend taslakları HOMEWORK/DOCUMENT_REQUEST/QUESTION enum'larını önerir; serializer mapping gerekir. DATA_MODEL.md bunları tanımlamaz. |
| Soru anahtarı ve hikâye | demoSoruCevaplari \"1\"–\"5\" string key; demoHikaye surum, cumleler, takipler, ciktilar, oneriler | PAGES_MAP {questionId}, TASKS questionNo/answer route'ları ve eski veri modeli UUID/sequence ayrımıyla aynı değildir. Tip ve ID mapping kararı yoktur. |
| Path gösterimi | PAGES_MAP endpoint'leri /api/v1 olmadan, {id} ile yazar | API_SPEC /api/v1 ekler; TASKS bazı yerde :id yazar. Metin biçimi/versiyon gösterimi birebir değil. |
| Sayfalama | UI listelerinde kontrol yok | API varsayımı limit/cursor ekler; ekran ihtiyacı değil, backend ölçekleme önerisidir. |

## 5. Varsayımlar ve açık kararlar

- Bütün endpoint'ler backend yokken hazırlanmış öneridir; PRD/PAGES_MAP'teki MVP ihtiyacı ve demo alanları referans alınmıştır.
- UI alanlarının bütün validation/nullable kuralları her ekrandan çıkarılamaz; JSON örneği şema onayı değildir.
- Auth/JWT/cookie, OTP, parola reset, admin yetkisi, pagination, timezone, ödeme sağlayıcısı, upload biçimi/limitleri, LLM/CV parser, story async işi, Guru daveti ve paylaşım onay akışı seçilmemiştir.
- DATA_MODEL.md değiştirilmediği için burada kullanılan nesne/entity anlamları kalıcı şema olarak yorumlanmamalıdır.
- API uygulamasından önce PAGES_MAP, TASKS ve bu öneri tek bir OpenAPI sözleşmesine göre uzlaştırılmalıdır. Değiştirilmeyen belgelerdeki farklar bu raporda bırakılmıştır.

## 6. İlgili belgeler

- PRD.md — ürün gereksinimleri
- PAGES_MAP.md — sayfa ve önerilen endpoint eşlemesi
- DATA_MODEL.md — kalıcı veri modeli durumu
- ARCHITECTURE.md — mimari öneri
- TASKS.md — backend görev planı
- UI_BACKEND_GAPS.md — localStorage envanteri ve backend kaynak taraması
