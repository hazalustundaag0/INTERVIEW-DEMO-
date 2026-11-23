// config.js — Frontend çalışma zamanı yapılandırması (tek yer). Sahibi: 81 Frontend Platform.
// API adresini değiştirmek için yalnız API_BASE_URL satırını düzenleyin.
// Not: Windows'ta "localhost" önce ::1'e gider; API yalnız IPv4'te dinlediği için 127.0.0.1 kullanılır.
// CORS yalnız sayfanın origin'ine bakar: sayfayı daima http://localhost:3000 üzerinden açın (K59).
// Docker (web imajı, K96): aşağıdaki API_BASE_URL satırı konteyner açılışında API_BASE_URL ortam
// değişkeniyle yeniden yazılır (varsayılan '/api/v1' = aynı origin, ters vekil). Göreli değer sayfanın
// kökenine göre mutlak adrese çevrilir. Satırın biçimini değiştirmeyin (deploy/web/entrypoint.sh).
(function () {
  var API_BASE_URL = 'http://127.0.0.1:8090/api/v1';
  if (API_BASE_URL.charAt(0) === '/') API_BASE_URL = location.origin + API_BASE_URL;
  // K102 (Etap 6): önizleme modu (giriş yapmadan ekranlara bakma, ?onizleme=aday|danisman) YALNIZ yerel
  // geliştirmede. Bu dosyada değer daima false'tur; yalnız scripts/dev-server.mjs servis ederken true yapar.
  // Docker web imajı (deploy/web/entrypoint.sh) satırı ayrıca false'a sabitler. Satır biçimini değiştirmeyin.
  var PREVIEW_ALLOWED = false;
  var PREVIEW_HOST = ['localhost', '127.0.0.1'].indexOf(location.hostname) !== -1;

  window.APP_CONFIG = Object.freeze({
    apiBaseUrl: API_BASE_URL,
    // Önizleme modu yalnız: dev sunucusu (PREVIEW_ALLOWED) + yerel adres. URL/depolama ile açılamaz (dondurulmuş).
    previewAllowed: PREVIEW_ALLOWED === true && PREVIEW_HOST,
    // İstek zaman aşımları (ms). Yapay zekâ uçları backend'de 70 sn, dosya uçları 30 sn deadline'a sahip.
    requestTimeoutMs: 15000,
    aiTimeoutMs: 75000,
    uploadTimeoutMs: 40000,
    // Gösterim: API daima UTC RFC 3339 döner; ekranda Türkiye saati gösterilir.
    timeZone: 'Europe/Istanbul',
    locale: 'tr-TR',
    // Seans süresi varsayılanı (hizmetten gelmezse).
    sessionDurationMinutes: 60
  });
})();
