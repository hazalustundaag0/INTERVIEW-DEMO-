// yonetici-ayar.js: Yönetici panelinin backend bağlantı ayarı.
//   MOD: 'mock' → tarayıcıdaki demo veri (backend gerekmez)
//   MOD: 'api'  → gerçek backend (Bearer token ile)
// TABAN_URL: backend'in /api/v1 adresi. Backend .env içinde CORS_ALLOWED_ORIGINS (veya ADMIN_PANEL_URL)
// panelin açıldığı origin'i içermelidir.
window.YONETICI_API_AYAR = {
  MOD: 'mock',
  TABAN_URL: 'http://localhost:8080/api/v1'
};
