// config.js — Frontend çalışma zamanı yapılandırması (tek yer). Sahibi: 81 Frontend Platform.
// API adresini değiştirmek için yalnız API_BASE_URL satırını düzenleyin.
// Not: Windows'ta "localhost" önce ::1'e gider; API yalnız IPv4'te dinlediği için 127.0.0.1 kullanılır.
// CORS yalnız sayfanın origin'ine bakar: sayfayı daima http://localhost:3000 üzerinden açın (K59).
(function () {
  var API_BASE_URL = 'http://127.0.0.1:8090/api/v1';

  window.APP_CONFIG = Object.freeze({
    apiBaseUrl: API_BASE_URL,
    // İstek zaman aşımları (ms). YZ uçları backend'de 70 sn, dosya uçları 30 sn deadline'a sahip.
    requestTimeoutMs: 15000,
    aiTimeoutMs: 75000,
    uploadTimeoutMs: 40000,
    // Gösterim: API daima UTC RFC 3339 döner; ekranda Türkiye saati gösterilir.
    timeZone: 'Europe/Istanbul',
    locale: 'tr-TR',
    // Seans süresi varsayılanı (hizmetten gelmezse).
    sessionDurationMinutes: 50
  });
})();
