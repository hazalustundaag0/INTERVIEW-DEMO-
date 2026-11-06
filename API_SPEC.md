# API sözleşmesi

## Durum

Bu belge, depodaki backend kodundan çıkarılmış bir HTTP API sözleşmesi içermez; çünkü incelemede route/controller, API DTO, OpenAPI tanımı veya backend kaynak kodu bulunmadı. Bu nedenle burada doğrulanabilir endpoint, method, path, request/response alanı ya da hata sözleşmesi yoktur.

`demo/` içindeki kod tarayıcı `localStorage` verisini okur/yazar. İncelenen UI dosyalarında `fetch`, Axios veya `/api/...` çağrısı bulunmadı. `BACKEND-API-SPEC.md`, `BACKEND-ARCHITECTURE.md`, `BACKEND-DATA-MODEL.md`, `ARCHITECTURE.md`, `PRD.md`, `PAGES_MAP.md` ve eski `API_SPEC.md` taslak niteliğindedir; uygulamanın gerçek backend sözleşmesinin kanıtı sayılmamıştır.

## Backend'den doğrulanabilen uçlar

Yok. Repo içinde backend route/controller kodu veya API tanım dosyası tespit edilmedi.

## UI ve backend arasındaki bilinen durum

- UI'ın kullandığı backend endpoint'i: yok; UI demo verisini tarayıcı depolamasında yönetiyor.
- Backend'de olup UI'ın kullanmadığı endpoint'ler: backend kaynak kodu bulunmadığından belirlenemiyor.
- UI alanlarının gerçek backend response alanlarına eşlemesi: backend DTO/response bulunmadığından belirlenemiyor.

UI tarafında kullanılan localStorage anahtarlarının ve alan şekillerinin envanteri [UI_BACKEND_GAPS.md](./UI_BACKEND_GAPS.md) içinde, yalnızca demo/mock olarak işaretlenerek verilmiştir. Bunlar API alanı veya endpoint önerisi değildir.

## Sözleşmeyi tamamlamak için gereken kaynaklar

Backend route/controller'ları, request/response DTO'ları ve entity/model tanımları ile migration/schema dosyaları repoya eklendiğinde bu belge doğrudan onlardan çıkarılmalıdır. Bir route veya alanı sırf UI mock'unda bulunduğu için gerçek API sözleşmesi olarak kaydetmeyin.
