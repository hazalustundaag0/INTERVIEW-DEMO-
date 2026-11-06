# UI–backend uyumsuzluk raporu

## İnceleme sonucu

Bu rapor `demo/` altındaki HTML/JavaScript ile depodaki backend kaynaklarını karşılaştırmak için hazırlandı. Repoda route/controller, request/response DTO, entity/model veya migration/schema dosyası bulunmadı. UI JavaScript'inde `fetch`, Axios ya da `/api/...` çağrısı da bulunmadı. Dolayısıyla backend ile gerçek alan adı/tip karşılaştırması veya endpoint karşılaştırması yapılamaz.

Önemli: aşağıdaki UI anahtarları ve biçimler yalnızca tarayıcı demosunun kullandığı localStorage verisidir. Backend sözleşmesi oldukları anlamına gelmez.

## UI'da olup backend'de doğrulanamayan veri

Backend kodunda karşılığı doğrulanamayan UI depolama anahtarları:

| UI localStorage anahtarı | UI'daki kullanım/şekil (özet) | Backend karşılığı |
|---|---|---|
| `demoOturum` | Oturum/rol ve kullanıcı bilgileri; gate/auth akışları okur ve yazar | Backend auth/session modeli bulunamadı |
| `demoSecim` | Hizmet, seans, dakika, fiyat ve Guru seçimi | Backend katalog/enrollment modeli bulunamadı |
| `demoMusaitlik` | Slot dizisi; `id`, `tarih`, `bas`, `bit`, `durum` gibi alanlar | Backend müsaitlik modeli bulunamadı |
| `demoRandevu` | Seçilen randevu; tarih/saat ve aday/Guru gösterim bilgileri | Backend randevu modeli bulunamadı |
| `guruProfile` | Guru profil alanları (`name`, `title`, `experience`, `sectors` vb.) | Backend profil DTO/entity bulunamadı |
| `guruElifTasks`, `demoOdevler` | Ödev/belge/soru görev dizileri; UI'da farklı ekranlar kullanır | Backend assignment/submission modeli bulunamadı |
| `demoGuruNotlari`, `demoSeansNotu` | Guru/seans notları | Backend not modeli bulunamadı |
| `demoSoruCevaplari` | Soru numaralarını cevap metinleriyle eşleyen nesne | Backend soru/cevap DTO/entity bulunamadı |
| `demoHikaye`, `demoHazirHikaye`, `demoHikayeGapTypes` | Hikâye verisi, yüklenen hikâye metni ve bilgi boşluğu türleri | Backend story modeli bulunamadı |
| `demoProfilTamamlandi`, `demoCvOnaylandi`, `demoKvkkOnaylandi` | Akış adımlarını gösteren string boolean değerler | Backend profil/CV/rıza durum modeli bulunamadı |
| `demoOdemeAlindi`, `demoOdemeYontemi` | Ödeme akışının demo işaretleri/yöntemi | Backend ödeme modeli bulunamadı |
| `demoIlkSeansTamamlandi`, `demoLinkDurumu` | Seans durumu ve bağlantı demo işareti | Backend seans modeli bulunamadı |
| `demoTarih`, `demoSaat`, `demoMusaitlikHafta` | Takvim seçim/gezinme değerleri | Backend karşılığı belirlenemedi |
| `guruServicePrice` | Guru hizmet fiyatı için demo değer | Backend fiyat modeli bulunamadı |
| `demoEmail`, `demoDevam`, `soruNo`, `demoSelectedCandidate` | Akış devamı, seçim ve geçici sayfa durumu | Backend karşılığı belirlenemedi |

`demo` dışındaki HTML sayfalarında da bazı değerler doğrudan sayfa içinde varsayılan JSON olarak tanımlanmıştır. Bunların backend karşılığı da doğrulanamaz.

## Alan adı/tip farklılıkları

Gerçek backend DTO/response bulunmadığı için mock ile gerçek response arasında saptanmış bir alan adı veya tip farkı yoktur; bu karşılaştırma yapılamamaktadır. Örneğin `demoMusaitlik` içindeki `tarih`/`bas`/`bit`/`durum`, `guruProfile` içindeki camelCase alanlar ve `demoSoruCevaplari` içindeki string soru anahtarları UI şekilleridir. Bunları önceki dokümanlardaki öneri alanlarıyla karşılaştırıp backend farkı olarak raporlamak yanlış olur.

## Endpoint uyumsuzlukları

- **UI'ın kullandığı ama backend'de karşılığı olmayan endpoint:** UI herhangi bir backend endpoint'i çağırmıyor; bu nedenle böyle bir kullanım yok.
- **UI aksiyonları için backend endpoint karşılığı:** kayıt/giriş, hizmet-Guru seçimi, ödeme, profil/CV/rıza, randevu/müsaitlik, soru-cevap/hikâye, Guru notu ve ödev akışları UI'da mevcut; ancak bunlar localStorage/demo davranışları. Backend route'u bulunmadığından eşleştirilemez.
- **Backend'de olup UI'ın kullanmadığı endpoint:** backend route kaynağı bulunmadığından liste çıkarılamıyor.

## Dosya taraması

- Backend kaynak ve migration bulmak için repo dosyaları tarandı; uygulama kodu yerine statik `demo/` UI'sı ve dokümanlar bulundu.
- UI kodu `fetch`, Axios ve `/api/...` çağrıları için tarandı; HTTP API çağrısı bulunmadı.
- Önceki `API_SPEC.md` ve `DATA_MODEL.md` içerikleri backend kanıtına dayanmadığı için tahmin/öneri endpoint ve entity'leri kaldırıldı. Bu belgeler şimdi backend kodu bulunmadığı durumunu açıkça kaydediyor.

Backend kodu repoya eklendiğinde bu rapor yeniden çalıştırılmalı; burada “belirlenemiyor” yazan maddeler gerçek route, DTO, model ve migration ile tek tek karşılaştırılmalıdır.
