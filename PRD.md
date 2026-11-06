# Interview Demo — Ürün Gereksinimleri (PRD)

## 1. Belge kapsamı ve kaynak

Bu PRD, `demo/` altındaki 44 ana HTML sayfasını ve 27.10.2026 tarihli *Müşteri Gereksinimleri ve Fonksiyonel Gereksinim Analizi Raporu*'nu temel alır. UI şu an düz HTML/CSS/JavaScript demo olarak çalışır; sayfalarda gerçek API/backend entegrasyonu yoktur. Arayüzde görülen örnek veriler ve `localStorage` state'i üretim verisi veya tamamlanmış işlev olarak değerlendirilmemelidir.

**Ürün amacı:** Adayların kariyer deneyimlerini danışmanlarla çalışarak mülakatta kullanabilecekleri, kendi gerçeklerine dayanan bir hikâye ve destekleyici çıktılara dönüştürmesine yardımcı olmak. Yapay zekâ aday adına başarı veya kariyer bilgisi uydurmaz.

## 2. Hedef kullanıcılar, roller ve yetkiler

| Rol | Hedef ve yetki özeti | Mevcut UI durumu |
|---|---|---|
| Danışan (Aday) | Hesap açma/doğrulama, hizmet ve Guru seçme, ödeme ve rıza, profil/CV, seans planlama, hikâye akışı ve çıktılar, kendisiyle paylaşılan notları okuma, ödev/belge görme ve teslim etme | Aday sayfaları ve demo akışları var |
| Guru (Danışman) | Kendi adaylarını ve seanslarını görme; adayın rızası dahilinde hikâye/kaynakları inceleme; not yazma/paylaşma; ödev veya belge talep etme; müsaitlik ve profil yönetme | Guru sayfaları ve demo akışları var |
| Yönetici | Kullanıcı/Guru hesaplarını, dinamik profil formunu, soru setlerini/kuralları, hizmet/seans/fiyatları ve operasyon kayıtlarını yönetme | Rapor kapsamındadır; ana UI dizininde yönetici paneli/rolü yoktur |

**VARSAYIM:** Kaynak kaydı kullanıcı hesabı ile tekil ilişkilendirilir. Bir kullanıcının birden fazla rol taşıması, yönetici alt rolleri ve hesapların birleştirilmesi henüz karara bağlanmamıştır. Yetki yalnızca arayüz görünürlüğüne değil, her API isteğinde rol ve kaynağın sahipliği/atanma ilişkisine dayanmalıdır.

## 3. Kullanıcı hikâyeleri

Bu hikâyeler sayfalardaki görünür ekran ve etkileşimlerden, ayrıca raporun açık MVP kapsamından türetilmiştir. Statik ekranların varlığı backend işlevinin mevcut olduğu anlamına gelmez.

### Aday keşif, hesap ve satın alma

- **US-001 — Ürünü anlama:** Aday olarak, `index.html`'de hizmetin nasıl çalıştığını ve beklenen çıktıları incelemek istiyorum ki devam edip etmeyeceğime karar verebileyim.
- **US-002 — Guru keşfi:** Aday olarak, `danismanlar.html` ve `danisman.html` üzerinde danışmanları arayıp sektör/uzmanlık ve deneyime göre incelemek istiyorum ki uygun Guru'yu seçebileyim. `danisman-profil.html` eski URL'si seçilmiş profile yönlendirmelidir.
- **US-003 — Hesap açma:** Aday olarak, `kayit.html`'de gerekli kayıt bilgilerini verip `eposta.html`'de e-postamı doğrulamak istiyorum ki hesabım oluşturulsun. Doğrulama servisi UI'da mock'tur.
- **US-004 — Giriş:** Aday veya Guru olarak, kendi rolümle `giris.html`/`giris-danisman.html` üzerinden giriş yapıp korumalı sayfalara erişmek istiyorum. `giris-hata-rol.html` yanlış rol denemesini açıklar; `davet.html` Guru hesap etkinleştirme görünümüdür.
- **US-005 — Hizmet ve Guru seçimi:** Aday olarak, `hizmet.html`'de hizmetleri ve yayınlı Guru'ları arayıp filtreleyerek seçimimi yapmak istiyorum ki satın alma özeti hizmete, seans sayısına ve Guru'ya göre doğru oluşsun.
- **US-006 — Sipariş ve ödeme:** Aday olarak, `siparis.html`'de sipariş özeti, ödeme yöntemi ve KVKK/açık rıza seçeneklerini görüp sağlayıcı üzerinden ödeme yapmak; `odeme-ok.html`, `odeme-bekle.html` veya `odeme-hata.html`'de gerçek ödeme durumunu görmek istiyorum.

### Aday hazırlık, seans ve hikâye

- **US-007 — Profil tamamlama:** Aday olarak, `profil.html`'de hedef pozisyon, sektör, katılım nedeni ve ek bilgileri kaydetmek istiyorum ki Guru seans öncesi bağlamı görebilsin. Profil ödemeden sonra ertelenebilir, fakat randevu öncesi tamamlanmalıdır.
- **US-008 — CV ekleme/onay:** Aday olarak, `cv.html`'de CV yüklemek veya elle bilgi girmek, çıkarılan bilgileri kontrol edip onaylamak istiyorum ki yanlış/adayca doğrulanmamış bilgi hikâyeye girmesin.
- **US-009 — Randevu ön koşullarını tamamlama:** Aday olarak, `randevu-on.html`'de eksik profil, rıza veya CV onayı adımlarını tamamlayıp takvime geçmek istiyorum.
- **US-010 — Seans planlama:** Aday olarak, `takvim.html`'de Guru'nun uygun tarih/saatlerini görüp çakışmadan randevu almak; `randevu-ok.html` ve `seanslar.html`'de randevu/seans durumunu görmek istiyorum.
- **US-011 — Seans notlarını okuma:** Aday olarak, paylaşılmış ilk seans notlarını `seans-notlari.html`'de görmek ve ana ekrandan erişmek istiyorum. `seans2-ok.html` ikinci seans planlama sonucu görünümüdür.
- **US-012 — Hikâye çalışmasını sürdürme:** Aday olarak, `ana.html`/`hikaye-giris.html` üzerinden hikâye oluşturmayı seçmek veya hazır metin yüklemek; `soru1.html`–`soru5.html` içinde yanıtlarımın saklanıp kaldığım yerden devam etmesini istiyorum.
- **US-013 — Hikâyeyi inceleme ve çıktıları kullanma:** Aday olarak, `hikaye-yukle.html` ile hazır metin vermek veya oluşturulan hikâye/özet/mülakat cevapları/CV özetini `ciktilar.html`'de inceleyip düzenlemek istiyorum. Her generated cümle kaynağına izlenebilir olmalıdır.
- **US-014 — Seanslarımı yönetme:** Aday olarak, `seanslar.html`'de yaklaşan ve tamamlanan seansları, tarih/saat, Guru ve not bağlantılarını görmek istiyorum.
- **US-015 — Ödev ve belge teslimi:** Aday olarak, `odevler.html` ve `odev-goruntule.html` üzerinden talebi görmek, `odev-teslim.html`'de metin veya dosya ile yanıtlamak istiyorum.

### Guru akışları

- **US-016 — Adayları görüntüleme:** Guru olarak, `guru-danisanlar.html`'de kendime atanmış adayları ve çalışma durumlarını, `guru-danisan-detay.html`'de adayın profil ön bilgisini ve seanslarını görmek istiyorum.
- **US-017 — Hikâye ve kaynakları inceleme:** Guru olarak, `guru-hikaye.html`'de aday rızası varsa hikâyeyi, ilgili kaynakları ve bilgi gerekli alanları incelemek istiyorum.
- **US-018 — Not yazma ve paylaşma:** Guru olarak, `guru-notlar.html`'de seans notu yazıp taslak tutmak veya aday ekranında görüneceğini onaylayarak paylaşmak istiyorum.
- **US-019 — Ödev/belge talebi:** Guru olarak, `guru-odevler.html`'de ödev, belge veya soru talebi tanımlayıp aday teslimini takip etmek istiyorum. Satış hikâyesi soru akışı raporda ödev sayılmaz.
- **US-020 — Seans ve müsaitlik:** Guru olarak, `guru-seanslar.html`'de seansları yönetmek; `guru-musaitlik.html`/`guru-musaitlik-ekle.html`'de uygun zamanları tanımlamak istiyorum.
- **US-021 — Profil yönetimi:** Guru olarak, `guru-profil.html`'de profil/uzmanlık ve yayın durumunu düzenlemek istiyorum.

### Yönetici

- **US-022 — Platformu yapılandırma:** Yönetici olarak, profildeki dinamik alanları, soru setlerini/kuralları, hizmet/seans/fiyat tanımlarını, kullanıcı/Guru hesaplarını yönetmek ve ödeme/AI kullanım kayıtlarını incelemek istiyorum.
- **US-023 — Denetlenebilirliği sağlama:** Yetkili yönetici olarak, kritik kullanıcı, onay, ödeme, CV/hikâye, paylaşım ve yapılandırma değişikliklerinin kim/ne zaman yaptığını izlemek istiyorum. Yönetici UI'ı mevcut sayfa envanterinde yoktur.

## 4. Fonksiyonel gereksinimler

| ID | Gereksinim |
|---|---|
| FR-001 | Sistem, aday, Guru ve yönetici rollerini ve rol bazlı API yetkilendirmesini desteklemelidir. Yönetici rolü rapor hedefidir; mevcut UI'da yoktur. |
| FR-002 | Aday kaydı ve e-posta doğrulaması sağlanmalıdır. Kayıt alanlarının kesin listesi (rapor ad-soyad/e-posta, UI ayrıca parola gösteriyor) açık sorudur. |
| FR-003 | Aday ve Guru için kimlik doğrulama, rol kontrolü, oturum iptali ve hesap durum yönetimi sağlanmalıdır. |
| FR-004 | Yayınlı Guru kataloğu arama, sektör filtresi ve sıralama ile sunulmalıdır; mevcut UI arama/sektör filtreleme ve önerilen/A-Z/deneyim sıralaması içerir. |
| FR-005 | Aktif hizmet ve Guru seçimi ile ürünün seans sayısı/süresi ve satın alma fiyatı sunucuda doğrulanmalıdır. Seans adedi aday tarafından seçilmemelidir. |
| FR-006 | Hizmet/enrollment ve ödeme durumları ayrı tutulmalı; ödeme `PENDING`, `PAID`, `FAILED`, `REFUNDED` durumlarında izlenmelidir. |
| FR-007 | Ödeme, üçüncü taraf sağlayıcıdan başlatılmalı ve doğrulanmış sağlayıcı bildirimiyle sonuçlandırılmalıdır. Kart verisi sistemde alınmamalı/saklanmamalıdır. |
| FR-008 | KVKK aydınlatma/açık rıza metin sürümü, kabul zamanı ve ilgili kullanıcı/enrollment kaydedilmelidir. Satın alma ve randevu ön koşulları rapordaki kurala göre ayrılmalıdır. |
| FR-009 | Aday profili, hedef bağlamı ve dinamik form cevabı kaydedilmeli; sektör ile hedef pozisyonun uyumlu olması zorunlu tutulmamalıdır. |
| FR-010 | Aday CV yükleyebilmeli veya bilgileri elle girebilmelidir. Format, boyut sınırı ve saklama politikası teyit edilmelidir. |
| FR-011 | CV ayrıştırmasından gelen deneyim/eğitim/yetkinlikler aday tarafından onaylanmadan hikâye üretiminde kullanılamamalıdır. |
| FR-012 | Guru müsaitliği tarih/saat dilimiyle yönetilmeli ve aday uygun slotlardan randevu alabilmelidir. |
| FR-013 | Randevu oluşturma API'si profil, gerekli rıza ve CV onayı tamamlanmadan rezervasyonu reddetmelidir. |
| FR-014 | Slot rezervasyonu eşzamanlı isteklerde çakışmayı önlemeli; aynı slot için en fazla bir aktif rezervasyon bulunmalıdır. |
| FR-015 | Enrollment'ın hizmet tanımındaki seans adedi kadar seans kaydı ve durum takibi bulunmalıdır. |
| FR-016 | Hikâye oturumu aşağıdaki durum makinesini ve ara vermeden devam etmeyi desteklemelidir: `NOT_STARTED`, `PURCHASED`, `PROFILE_COMPLETED`, `CV_UPLOADED`, `FIRST_SESSION_DONE`, `QA_IN_PROGRESS`, `DRAFT_GENERATED`, `CANDIDATE_EDITED`, `SUMMARY_READY`, `COMPLETED`, `PAUSED`, `CANCELLED`. |
| FR-017 | İlk sürüm hikâye akışı yapılandırılmış beş ana soruyu sunmalı; soru seti ve sürümü her oturuma bağlanmalıdır. |
| FR-018 | Cevaplar otomatik kaydedilmeli; aday geri döndüğünde aynı cevaplardan ve sıradan devam edebilmelidir. |
| FR-019 | Tanımlı kurallarda takip sorusu sorulmalı, ardışık takip sayısı ikiyi aşmamalı; aday bilmiyorum/hatırlamıyorum derse ısrar edilmemelidir. |
| FR-020 | Hikâye üretimi adayın cevaplarına ve onaylı CV kaynaklarına dayanmalı; eksik bilgi `[bilgi gerekli]` olarak belirtilmeli, verilmemiş rakam/unvan/şirket/tarih veya övgü sıfatı eklenmemelidir. |
| FR-021 | Her hikâye cümlesi, mümkün olduğunda kaynak cevap/takip cevabı/CV kaydına bağlanmalı; kaynak ve draft sürümleri geriye dönük sessizce değiştirilmemelidir. |
| FR-022 | Aday taslak hikâyeyi düzenleyebilmeli; düzenlenen/yeni bilgi içeren metin yeni sürüm ve kaynak kaydı oluşturmalıdır. Harici hikâye aday beyanı olarak YZ üretiminden ayrılmalıdır. |
| FR-023 | Aynı oturumdan hikâye iskeleti/metni, kısa özet, 2–3 mülakat cevap taslağı ve CV özet paragrafı üretilebilmeli/görüntülenebilmelidir. |
| FR-024 | Guru yalnızca kendisine atanmış adayları görebilmeli; CV ve ham cevaplara yalnızca geçerli aday rızasıyla erişebilmelidir. |
| FR-025 | Guru notu taslak/paylaşıldı durumlarını desteklemeli; adayla paylaşım öncesinde aktif onay alınmalıdır. Aday yalnızca kendisiyle paylaşılan notu görebilmelidir. |
| FR-026 | Guru adayın enrollment'ına ödev veya belge talebi ekleyebilmeli; aday ilgili talebi metin/dosya ile teslim edebilmelidir. |
| FR-027 | Guru profil, uzmanlık, yayınlılık ve müsaitlik bilgilerini yönetebilmelidir; ödeme fiyatı yönetim yetkisi ayrıca kararlaştırılmalıdır. |
| FR-028 | Yönetici kullanıcı/Guru, dinamik profil alanı, soru seti/kurallar, hizmet/seans/fiyat yapılandırmasını yönetebilmelidir. İlgili UI geliştirilmelidir. |
| FR-029 | Yönetici ödeme durumlarını ve YZ çağrı sayısı, model, token, maliyet ve süre kayıtlarını görüntüleyebilmelidir. |
| FR-030 | Kritik olaylar AuditLogs'a aktör, zaman ve olay türüyle kaydedilmelidir; yönetici yapılandırma değişiklikleri de denetlenmelidir. |
| FR-031 | Bildirim/e-posta gönderimleri gerektiğinde durum ve zaman bilgisiyle izlenmelidir. E-posta hedef SLA'sı öneri düzeyindedir. |
| FR-032 | Hesap/veri silme ve iptal/iade talepleri için iş akışı desteklenmelidir; retention ve iade kuralları hukuk/iş kararı beklemektedir. |

## 5. Fonksiyonel olmayan gereksinimler

| ID | Alan | Gereksinim / durum |
|---|---|---|
| NFR-001 | Güvenlik | Her istekte kimlik, rol ve kayıt sahipliği/atama ilişkisi sunucu tarafında denetlenmelidir. UI'da menü saklamak yetkilendirme değildir. |
| NFR-002 | Kimlik bilgileri | Parola düz metin saklanmamalı; rapor oturum token'larının sunucuda hash'lenmesi ve iptali gereksinimini tanımlar. Auth yöntemi ve token ömürleri karara açık. |
| NFR-003 | KVKK | CV, kariyer geçmişi, cevaplar ve hikâyeler kişisel veridir. Aydınlatma/rıza sürümü, amaç, erişim ve silme süreci kaydedilmelidir. Hukuki uygunluk ayrıca doğrulanmalıdır. |
| NFR-004 | YZ veri koruma | Dış YZ sağlayıcısının veri konumu, eğitim kullanımı, saklama ve yurt dışı aktarımı netleşmeden gerçek aday verisi gönderilmemelidir. |
| NFR-005 | Dosya güvenliği | CV, hikâye ve teslim dosyaları yetkili erişim ve güvenli depolamayla korunmalıdır; depolama/şifreleme/retention çözümü seçilmemiştir. |
| NFR-006 | Ödeme güvenliği | Kart verisi uygulamaya alınmamalı; ödeme sağlayıcı referansı ve durumuyla yetinilmelidir. Sağlayıcı seçilmemiştir. |
| NFR-007 | Veri bütünlüğü | Slot rezervasyonu, ödeme durum geçişi ve sürüm oluşturma eşzamanlı/tekrarlı isteklerde tutarlı ve idempotent olmalıdır. **VARSAYIM:** Transaction/benzersiz kısıt veya eşdeğer mekanizma kullanılır. |
| NFR-008 | Denetim | Giriş, rıza, profil, CV, hikâye üretimi/düzenleme, not/ödev, ödeme/iade, silme ve yönetici değişiklikleri audit edilebilir olmalıdır. Hassas içerik loglara gereksiz kopyalanmamalıdır. |
| NFR-009 | YZ izleme | Her YZ isteğinde istek türü, model, token, maliyet, süre ve zaman ölçülmelidir. Ham prompt/yanıtı loglama kararı ayrıca verilir. |
| NFR-010 | Performans | Raporun önerisi: yaklaşık 20 aday + 5 Guru oturumu; sonraki/takip soru çoğunlukla 5 sn, en geç 10 sn; çıktı 30 sn hedef, 60 sn üst sınır. Pilotla teyit edilmeli. |
| NFR-011 | Dosya/ödeme SLA | Rapor önerisi: CV upload 10 sn, parse 30 sn; ödeme yanıtı 10 sn; bekleyen ödeme 5 dk içinde yeniden sorgulama. Kesin kabul hedefi karara açık. |
| NFR-012 | Dayanıklılık | Entegrasyon hatasında aday cevabı kaybolmamalı; zaman aşımı/yeniden deneme davranışı aday ve operatöre açık olmalıdır. |
| NFR-013 | Erişilebilirlik/UX | UI mobil uyumlu tasarlanmıştır; yükleme, hata, boş durum, doğrulama ve erişilebilir form etiketleri backend entegrasyonunda korunmalıdır. |
| NFR-014 | Saklama/silme | Saklama süresi, retention istisnaları, yedeklerden silme ve anonimleştirme hukuk/iş kararı bekler; varsayılan kalıcı saklama kabul edilmemelidir. |

## 6. Kapsam dışı

Demo/MVP dışı olarak raporda belirtilenler:

- Sepet, paket indirimi, fatura, komisyon ve haftalık Guru ödemeleri.
- Guru başvuru, belge doğrulama ve yönetici onay akışı.
- Üyelik sonrası YZ ile Guru eşleştirme/öneri.
- YZ destekli CV oluşturucu; MVP yalnızca hikâyeden CV özeti üretir.
- Sesli YZ provası, otomatik debrief, ses/beden dili analizi, avatar veya akran pratiği.
- Blog, kaynaklar, tanıtım videosu ve raporda belirtilen pazarlama sayfaları.
- Google/LinkedIn girişi, SMS/WhatsApp bildirimleri.
- Referans/ödül, kampanya, kurumsal/üniversite paketi.
- Çok dilli arayüz ve İngilizce çıktı; ilk sürüm Türkçe.
- Gerçek mülakatta gizli yardım ve otomatik başvuru özellikleri (geliştirilmeyecektir).

Yönetici paneli kapsam içindedir ancak UI'da henüz bulunmaz. Sepet/fatura kapsam dışı olsa da temel tekil hizmet ödemesi rapor kapsamındadır.

## 7. Varsayımlar ve açık sorular

### Varsayımlar

- **VARSAYIM:** Raporun FK ve işlem gereksinimleri ilişkisel veri modelini uygun kılar; DBMS seçilmemiştir.
- **VARSAYIM:** API önerileri HTTP/JSON ve REST benzeri kaynak tasarımına dayanır; teknoloji seçimi değildir.
- **VARSAYIM:** Pilot için modüler tek deploy edilebilir backend, mikroservislerden daha düşük operasyon yükü sağlayabilir; ekip kararı gerekir.
- UI'da görülen `Elif Yılmaz`, `Selin Arslan`, örnek seanslar, fiyatlar, ödevler ve hikâye sabit/demo verisidir; üretim gerçekleri değildir.

### Açık sorular

1. Backend framework/runtime, DBMS, hosting, file store, e-posta, LLM ve ödeme sağlayıcısı nedir?
2. Kayıtta parola gerçekten istenecek mi? Rapor yalnızca ad/e-posta derken mevcut kayıt UI'ında parola alanı var.
3. E-posta doğrulaması OTP mi bağlantı mı; parola sıfırlama ve davet süreçleri nasıl olacak?
4. Kimlik doğrulama teknolojisi raporda maskelidir; token/cookie türü, ömür, admin MFA ve eşzamanlı cihaz politikası nedir?
5. Aday rızasının kesin metni/sürümü/kapsamı nedir; satın alma mı, randevu mu öncesi zorunlu? Guru CV/ham yanıtlara erişim rızası nasıl alınır/geri çekilir?
6. Nihai hizmet listesi/fiyat/seans süreleri, ödeme test modu, iptal/iade/no-show ve ek seans kuralları nelerdir?
7. Canlı görüşme sağlayıcısı ve randevu iptal/yeniden planlama kuralları nedir?
8. CV/teslim dosyası türleri, limit, parse sağlayıcısı ve saklama süreleri nedir?
9. LLM sağlayıcısı/modeli, veri konumu, eğitim kullanımı, aktarım ve saklama şartları nedir?
10. Demo/pilot gerçek aday verisiyle mi yapılacak? Hukuki görüş ve veri silme süreçlerini kim onaylayacak?
11. Yönetici panelinin MVP ekranları, alt rolleri ve yetki matrisi nedir?
12. Rapor performans/SLA hedefleri onaylı kabul kriteri midir? Takvim ve ekip sorumlulukları güncel mi?

## 8. İlgili teknik belgeler

- [Sayfa ve API eşlemesi](./PAGES_MAP.md)
- [Veri modeli](./DATA_MODEL.md)
- [Backend mimari taslağı](./BACKEND-ARCHITECTURE.md)
- [Backend API taslağı](./BACKEND-API-SPEC.md)
- [Uygulama planı ve ayrıntılı açık sorular](./BACKEND-IMPLEMENTATION-PLAN.md)
