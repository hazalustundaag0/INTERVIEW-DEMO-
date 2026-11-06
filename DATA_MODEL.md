# Kalıcı veri modeli

## Durum

Bu belge, backend entity/model veya migration'lardan çıkarılmış bir kalıcı veri modeli içermez. Depoda backend kaynak kodu, ORM entity/model tanımı, migration, SQL schema veya benzeri kalıcı veri tanımı tespit edilmedi. Bu nedenle backend tablo/entity adları, kolonlar, tipler, null kuralları, ilişkiler, enum'lar ve indeksler için doğrulanabilir bilgi yoktur.

Önceden yazılmış model önerileri (`BACKEND-DATA-MODEL.md`, `BACKEND-ARCHITECTURE.md`, `ARCHITECTURE.md` ve bu dosyanın önceki taslağı) gerçek model kanıtı değildir; entity/alan/ilişki önerileri bu belgeden çıkarılmıştır. `demo/` verisi tarayıcı `localStorage`'ında tutulur ve kalıcı backend kaydı olarak değerlendirilmemelidir.

## Backend'den doğrulanabilen entity'ler

Yok. Backend model veya migration kaynağı bulunmadı.

## UI demo depolaması

UI tarafındaki storage anahtarları ve demo veri şekilleri [UI_BACKEND_GAPS.md](./UI_BACKEND_GAPS.md) dosyasında envanterlenmiştir. Bunlar backend entity, kolon veya enum sözleşmesi değildir. UI'nın iki farklı anahtarda benzer ödev verisi tutması gibi demo uygulama ayrıntıları da tek bir kalıcı modele dönüştürülmemiştir.

## Modeli çıkarmak için gereken kaynaklar

Backend entity/model sınıfları ve migration/schema dosyaları repoya eklendiğinde gerçek alan adları, tipler, zorunluluklar, ilişkiler, benzersizlikler ve durum değerleri bu kaynaklardan çıkarılmalıdır. UI mock alanlarıyla farklılıklar ayrı uyumluluk raporunda tutulmalıdır.
