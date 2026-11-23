// test-env.mjs — doğrulama betikleri ve e2e için ortak adres/ortam ayarı (Etap 5). Sahibi: 81.
//
// Ortam değişkenleri (hepsi isteğe bağlı; varsayılanlar bugünkü yerel geliştirme düzenidir):
//   WEB_BASE_URL   Tarayıcının açtığı sitenin kökü. Varsayılan http://localhost:3000 (dev-server.mjs).
//                  Docker yığını: http://localhost:8088. (Eski ad E2E_BASE_URL de okunur.)
//   API_BASE_URL   API tabanı. Varsayılan http://127.0.0.1:8090/api/v1 (backend dev.ps1 run).
//                  Docker yığını: http://localhost:8088/api/v1 (web'in ters vekili, aynı origin).
//   MAIL_DIR       EMAIL_SENDER=log ileti kutusu. Varsayılan BACKEND_DIR/data/mail.
//                  Docker'da mail volume'unun host'a yansıtıldığı klasör (frontend/README.md).
//   BACKEND_DIR    backend klasörü (varsayılan ../../backend).
//
// Notlar:
//   - WEB_ORIGIN, isteklerde tarayıcının göndereceği Origin başlığıdır (CORS bununla denetlenir).
//   - Node fetch'te Windows "localhost"u önce ::1'e çözebilir; sunucular 127.0.0.1'e bağlı olduğundan
//     doğrudan isteklerde host "127.0.0.1"e çevrilir (webFetchUrl / API_FETCH_BASE). Origin başlığı değişmez.
//   - SAME_ORIGIN: API, sitenin kendisinden vekilleniyorsa (Docker/nginx) true. Davranışı farklı olan
//     sunucu kontrolleri (ör. nginx'in `..%2f` için 400 dönmesi) bu bayrağa göre değil, kabul kümesiyle yazılır.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const strip = value => String(value).replace(/\/+$/, '');
const loopback = value => {
  const url = new URL(value);
  if (url.hostname === 'localhost') url.hostname = '127.0.0.1';
  return strip(url.href);
};

export const WEB_BASE_URL = strip(process.env.WEB_BASE_URL || process.env.E2E_BASE_URL || 'http://localhost:3000');
export const WEB_ORIGIN = new URL(WEB_BASE_URL).origin;
export const WEB_HOST = new URL(WEB_BASE_URL).host;                 // ör. localhost:3000 (açık yönlendirme kontrolleri)
export const WEB_FETCH_BASE = loopback(WEB_BASE_URL);               // Node'dan doğrudan istek için
export const API_BASE_URL = strip(process.env.API_BASE_URL || 'http://127.0.0.1:8090/api/v1');
export const API_ROOT = API_BASE_URL.replace(/\/api\/v1$/, '');
export const API_FETCH_BASE = loopback(API_BASE_URL);
export const SAME_ORIGIN = new URL(loopback(API_BASE_URL)).origin === new URL(WEB_FETCH_BASE).origin;
// CORS'un reddetmesi gereken köken: sitenin "127.0.0.1" ↔ "localhost" ikizi (izin listesinde yok).
export const FOREIGN_ORIGIN = (() => {
  const url = new URL(WEB_ORIGIN);
  url.hostname = url.hostname === 'localhost' ? '127.0.0.1' : 'localhost';
  return url.origin;
})();
export const BACKEND_DIR = path.resolve(process.env.BACKEND_DIR || path.join(HERE, '..', '..', 'backend'));
export const MAIL_DIR = path.resolve(process.env.MAIL_DIR || path.join(BACKEND_DIR, 'data', 'mail'));

export const webUrl = (p = '') => WEB_BASE_URL + (p.startsWith('/') ? p : '/' + p);
export const pageUrl = (name = '') => webUrl('/demo/' + String(name).replace(/^\/+/, ''));
export const webFetchUrl = (p = '') => WEB_FETCH_BASE + (p.startsWith('/') ? p : '/' + p);

// jsdom testleri sayfaları diskten yükler: config.js'teki API tabanı API_BASE_URL'e çevrilir (Docker web imajının
// açılışta yaptığı yeniden yazımın test eşdeğeri; varsayılanda değer aynı). Satır biçimi: var API_BASE_URL = '…';
export function rewriteConfigJs(source) {
  return String(source).replace(/var API_BASE_URL = '[^']*';/, `var API_BASE_URL = '${API_FETCH_BASE}';`);
}
export const isConfigJs = url => /\/demo\/config\.js$/.test(new URL(url).pathname);

export function describeTarget() {
  return `site ${WEB_BASE_URL} · API ${API_BASE_URL}${SAME_ORIGIN ? ' (aynı origin)' : ''} · mail ${MAIL_DIR}`;
}
