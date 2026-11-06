# Interview Demo — AI Kod Asistanı Rehberi

## Proje özeti

Interview Demo, adayların kariyer hikâyesi hazırlamasına ve danışman/Guru ile çalışmasına yönelik statik bir HTML prototipidir. `demo/` altındaki arayüz aday, Guru, hizmet, randevu, seans, hikâye ve ödev akışlarını gösterir. UI'da gerçek backend bağlantısı yoktur; örnek ve değişebilir durumların önemli kısmı `localStorage` içindedir.

## Teknoloji durumu

- Mevcut UI: düz HTML, CSS ve tarayıcı JavaScript; sayfalar `file://` ile de açılabilir.
- Backend: henüz oluşturulmamıştır.
- Backend dili/framework, veritabanı, hosting, queue, auth sağlayıcısı, file store, e-posta, ödeme, CV parser ve LLM: **seçilmemiştir**.
- Repo kökünde şu an `package.json`, lockfile, `Makefile`, `pyproject.toml`, `requirements*.txt`, `Cargo.toml`, `go.mod` veya `.csproj` yoktur. Bu nedenle backend çalıştırma, build, lint veya test komutu varmış gibi davranma.
- JWT, ilişkisel DB, API sürümü ve dosya aktarım biçimi dokümanlarda öneri/varsayım olabilir; karar kaydı olmadan bunları onaylı teknoloji gibi sunma.

## Kaynak belgeler ve öncelik

1. Kullanıcının güncel ürün/uygulama talimatı.
2. Ürün davranışı ve gereksinimler: [PRD.md](./PRD.md).
3. Ekran, route, aksiyon ve UI kapsamı: [PAGES_MAP.md](./PAGES_MAP.md).
4. Veri varlıkları, alanlar ve durumlar: [DATA_MODEL.md](./DATA_MODEL.md).
5. HTTP endpoint sözleşmesi ve wire-format: [API_SPEC.md](./API_SPEC.md).
6. Mimari öneriler: [ARCHITECTURE.md](./ARCHITECTURE.md).
7. İş sırası ve kabul kriterleri: [TASKS.md](./TASKS.md).
8. Önceki taslaklar: [BACKEND-API-SPEC.md](./BACKEND-API-SPEC.md), [BACKEND-DATA-MODEL.md](./BACKEND-DATA-MODEL.md), [BACKEND-ARCHITECTURE.md](./BACKEND-ARCHITECTURE.md), [BACKEND-IMPLEMENTATION-PLAN.md](./BACKEND-IMPLEMENTATION-PLAN.md).

Belgeler arasında çelişki görürsen sessizce birini seçip sözleşmeyi değiştirme. Önce farkı belirt; API kodu başlamadan route, parametre ve alanlar OpenAPI/API_SPEC'te netleştirilmelidir. API uygulaması için endpoint method/path/body/response bakımından `API_SPEC.md` esas alınır; `PAGES_MAP.md` sayfa ve aksiyon kapsamını belirler; `DATA_MODEL.md` kalıcı veri modelini tanımlar.

## Kodlama ve isimlendirme kuralları

- Teknoloji seçilmeden dil/framework bağımlı kod veya klasör standardı dayatma. Stack seçildiğinde resmi formatter, linter, type checker ve test runner'ı kullan; repo standardı olarak kaydet.
- Domain kurallarını HTTP controller, UI DOM veya dış sağlayıcı SDK'sına gömme. Kullanım senaryosu/domain kuralları, persistence ve integration adapter'ları ayrılmalıdır.
- API path'leri `/api/v1` ve İngilizce çoğul/kaynak biçiminde; `API_SPEC.md`'deki method/path/parametre adlarıyla birebir tutulmalıdır.
- UI/mock wire-format alanlarını (`tarih`, `bas`, `bit`, `danışman`, `cumleId`, `metin`, `surum`, `guruProfile` içindeki camelCase alanları) sessizce yeniden adlandırma. DB alanları farklıysa açık serializer/adapter eşlemesi ve test ekle.
- DB entity/enum isimleri [DATA_MODEL.md](./DATA_MODEL.md)'deki adlarla eşleştirilmelidir. Onaylı model değişikliği varsa önce belge ve migration birlikte güncellenmelidir.
- `VARSAYIM:` ile işaretli önerileri onaylanmış gerçek gibi kodlama. İlgili ürün/teknoloji kararı olmadan entegrasyonu etkinleştirme.
- Türkçe UI metinlerini/karakterlerini, mevcut davranış ve demo verilerini kullanıcı talebi olmadan değiştirme. Kimlik doğrulama veya ödeme için demo/localStorage bilgisini production trust source kabul etme.
- UI'da gösterilen fiyat, rol veya kaynak ID'sine güvenme; fiyat/izin/enrollment/consent kontrollerini backend'de doğrula.
- Varsayılan olarak yeni dependency, abstraction veya konfigürasyon ekleme. Güvenlik, idempotency, kişisel veri ve hata davranışını görünür ve test edilebilir tut.

## Güvenlik ve veri koruma — yapılmaması gerekenler

- Secret, token, parola, `.env` gerçek değeri veya kişisel veri örneğini source control'e koyma.
- CV, ham cevap, hikâye, Guru notu, payment raw payload veya token'ı loglara/hata mesajına yazma.
- Kart numarası/CCV saklama veya uygulama sunucusundan geçirme.
- Sadece role kontrolüyle yetinme: kaynak sahipliği, Guru ataması, enrollment ve geçerli consent ilişkisini her istekte doğrula.
- Kullanıcıdan gelen ID'yi yetki kanıtı sayma; başka aday ID'siyle erişim/IDOR testlerini atlama.
- Candidate-approved olmayan CV'yi story generation'a kaynak olarak verme.
- Ödeme, slot rezervasyonu, webhook, retry veya story version işlemlerini idempotency/transaction gereksinimi olmadan uygulama.
- Gerçek aday verisini LLM/CV parser'a, sağlayıcı veri işleme ve KVKK koşulları onaylanmadan gönderme.
- Tarayıcı `localStorage` değerlerini kimlik doğrulama, rol, fiyat veya ödeme için güvenilir kabul etme.

## Çalıştırma ve doğrulama

Backend için doğrulanmış çalıştırma/test/build komutu henüz yoktur; önce Faz 0'da stack ve araçlar seçilmelidir. Komut uydurma veya başka projeden kopyalama.

Mevcut dokümantasyon değişikliklerinde kullanılabilecek doğrulama:

```sh
git diff --check
```

Kod eklendikten sonra seçilmiş stack'in CI komutlarını bu bölüme açıkça ekle ve bu komutları gerçekten çalıştırmadan başarılı olduklarını iddia etme. UI değişikliklerinde ilgili `demo/*.html` dosyalarını ve tarayıcı akışlarını ayrıca doğrula; `file://` tarayıcı origin'inin canlı API güvenlik/erişim testi olmadığını unutma.

## Değişiklik akışı

1. İlgili sayfa, script, mevcut API taslağı ve data modelini oku; aynı işi yapan mevcut helper/adapter'ı ara.
2. Değişiklikten önce endpoint, actor/role, ownership, consent ve state transition'ı belirle.
3. Migration, validation, authorization ve testleri aynı iş birimi içinde ekle.
4. UI mock alanları ile API response alanları arasındaki mapping'i test et.
5. En küçük hedefli testleri, sonra gerekli bütün kontrolleri çalıştır; başarısızlığı ve eksik bağımlılığı açıkça bildir.
6. Sadece istenen kapsamı değiştir; kullanıcıya ait, önceden var olan veya ilgisiz çalışma ağacı değişikliklerini geri alma.

## Varsayımlar ve açık noktalar

- Backend stack ve komutları henüz belirlenmemiştir; bu rehber var olmayan bir server'ın çalıştığını varsaymaz.
- `TASKS.md` efor büyüklükleri ve API/mimari önerileri planlama varsayımlarıdır.
- Mevcut UI'da Yönetici paneli bulunmaz.
- Auth yöntemi, JWT cookie/header stratejisi ve süreleri; provider'lar; dosya sınırları/retention; appointment timezone/iptal; LLM veri işleme koşulları ve admin yetki matrisi karara açıktır.
- [API_SPEC.md](./API_SPEC.md) çalışan backend sözleşmesi değil, backend kodu bulunmadığı için hazırlanmış bir öneridir. [PAGES_MAP.md](./PAGES_MAP.md)'deki örnek path'ler `/api/v1` öneki olmadan yazılmıştır; öneri ile uyuşmazlıkları sessizce düzeltme, uygulama öncesinde ortak OpenAPI sözleşmesi için raporla. [DATA_MODEL.md](./DATA_MODEL.md) şu an doğrulanmış entity tanımı içermemektedir.
