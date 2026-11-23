#!/usr/bin/env node
// dev-server.mjs — Bağımlılıksız statik geliştirme sunucusu (K59). Sahibi: 81 Frontend Platform.
//   node scripts/dev-server.mjs            → http://localhost:3000 (yalnız 127.0.0.1'e bağlanır)
//   PORT=3100 node scripts/dev-server.mjs  → farklı port (CORS_ALLOWED_ORIGINS da değişmeli!)
// Kök: frontend/. K112 (Etap 8): sayfalar temiz adreslerden servis edilir (demo/routes.js tablosu: "/" → index,
// "/giris", "/guru/danisanlar", "/yonetici/panel" …). Eski /demo/<sayfa>.html → 301 temiz adres (sorgu korunur).
// Statik kaynaklar yalnız /demo/** (sayfa .html'leri hariç) ve /theme.css; scripts/, tests/, README ve
// dot-dosyalar 404 (QA-019). E-posta bağlantıları (backend: APP_PUBLIC_URL/verify-email, /reset-password;
// GURU_PANEL_URL/set-password; token #fragment'ta) sorgu korunarak /parola'ya 302 ile yönlenir. Fragment
// tarayıcıda kalır ve yönlendirmede otomatik korunur (RFC 7231 §7.1.2); sunucuya hiç gelmez.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT) || 3000;

// K112 (Etap 8): temiz adres tablosu tek kaynaktan (demo/routes.js) okunur.
function loadRoutes() {
  const sandbox = { module: { exports: {} } };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'demo', 'routes.js'), 'utf8'), sandbox, { filename: 'routes.js' });
  return sandbox.module.exports;
}
const ROUTES = loadRoutes();

const LINK_ROUTES = {
  '/verify-email': 'verify',   // aday kayıt doğrulaması + parola belirleme
  '/set-password': 'invite',   // guru daveti
  '/reset-password': 'reset'   // parola sıfırlama
};

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.pdf': 'application/pdf'
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    ...headers
  });
  res.end(body);
}

function redirect(res, location, status = 302) {
  send(res, status, '', { Location: location });
}

// URL yolunu ROOT altındaki gerçek dosyaya çevirir; ROOT dışına çıkan her şey null.
function resolveFile(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.includes('\0') || decoded.includes('\\')) return null;
  const segments = decoded.split('/').filter(Boolean);
  if (segments.some(seg => seg === '..' || seg === '.' || seg.startsWith('.'))) return null; // gizli dosyalar (.git) dahil
  const candidate = path.resolve(ROOT, ...segments);
  const rel = path.relative(ROOT, candidate);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return candidate;
}

// İzin listesi (kodu çözülmüş yol üzerinde; traversal ayrıca resolveFile ile engellenir).
const PUBLIC_FILES = new Set(['/theme.css']);
const PUBLIC_PREFIXES = ['/demo/'];
function isPublicPath(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return false;
  }
  return PUBLIC_FILES.has(decoded) || PUBLIC_PREFIXES.some(prefix => decoded.startsWith(prefix));
}

function serveFile(req, res, file) {
  fs.stat(file, (err, stat) => {
    if (err || !stat || !stat.isFile()) {
      send(res, 404, 'Not Found');
      return;
    }
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    // K102 (Etap 6): yerel önizleme modu yalnız bu sunucu üzerinden açılabilir. config.js'teki
    // "var PREVIEW_ALLOWED = false;" satırı yalnız burada true yapılır (Docker web imajında false kalır).
    if (path.basename(file) === 'config.js' && path.basename(path.dirname(file)) === 'demo') {
      const body = Buffer.from(fs.readFileSync(file, 'utf8').replace(/var PREVIEW_ALLOWED = false;/, 'var PREVIEW_ALLOWED = true;'));
      res.writeHead(200, {
        'Content-Type': type, 'Content-Length': body.length, 'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer'
      });
      res.end(req.method === 'HEAD' ? undefined : body);
      return;
    }
    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': stat.size,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer'
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    fs.createReadStream(file).on('error', () => res.destroy()).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(res, 405, 'Method Not Allowed', { Allow: 'GET, HEAD' });
    return;
  }
  let url;
  try {
    url = new URL(req.url, `http://${HOST}:${PORT}`);
  } catch {
    send(res, 400, 'Bad Request');
    return;
  }
  const pathname = url.pathname.replace(/\/+$/, '') || '/';

  if (LINK_ROUTES[pathname]) {
    const params = new URLSearchParams(url.search);
    params.set('mode', LINK_ROUTES[pathname]);
    redirect(res, '/parola?' + params.toString());
    return;
  }
  // K112: temiz sayfa adresi → demo/<dosya>; sondaki "/" ve kısa yollar (/guru, /yonetici) → 301.
  if (Object.prototype.hasOwnProperty.call(ROUTES.PAGES, url.pathname)) {
    serveFile(req, res, path.join(ROOT, 'demo', ROUTES.PAGES[url.pathname]));
    return;
  }
  if (pathname !== url.pathname && Object.prototype.hasOwnProperty.call(ROUTES.PAGES, pathname)) {
    redirect(res, pathname + url.search, 301);
    return;
  }
  if (Object.prototype.hasOwnProperty.call(ROUTES.ALIASES, pathname)) {
    redirect(res, ROUTES.ALIASES[pathname] + url.search, 301);
    return;
  }
  // Eski adresler: /demo, /demo/, /demo/<sayfa>.html → 301 temiz adres (e-posta/yer imleri kırılmaz).
  const legacy = /^\/demo(?:\/([a-z0-9-]+\.html)?)?\/?$/.exec(url.pathname);
  if (legacy) {
    const target = legacy[1] ? ROUTES.FILE_TO_PATH[legacy[1]] : '/';
    if (target) {
      redirect(res, target + url.search, 301);
      return;
    }
  }
  // Tablo dışı .html'ler (eski tasarım klasörleri vb.) servis edilmez.
  if (/\.html$/i.test(url.pathname)) {
    send(res, 404, 'Not Found');
    return;
  }

  // QA-019: yalnız uygulama dosyaları servis edilir — demo/ ve kökteki theme.css. scripts/, tests/,
  // README, eski tasarım klasörleri ve dot-dosyalar 404 (betiklerdeki yerel ayarlar okunamasın).
  if (!isPublicPath(url.pathname)) {
    send(res, 404, 'Not Found');
    return;
  }
  let file = resolveFile(url.pathname);
  if (!file) {
    send(res, 404, 'Not Found');
    return;
  }
  fs.stat(file, (err, stat) => {
    if (!err && stat.isDirectory()) {
      send(res, 404, 'Not Found');   // dizin listesi / dizin index'i yok (sayfalar temiz adreslerden)
      return;
    }
    serveFile(req, res, file);
  });
});

server.on('error', error => {
  console.error(`Dev sunucusu başlatılamadı (${HOST}:${PORT}): ${error.message}`);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`Interview Demo frontend: http://localhost:${PORT}/  (kök: ${ROOT}, yalnız ${HOST})`);
  console.log('Not: sayfaları http://127.0.0.1 değil http://localhost üzerinden açın (CORS origin).');
});
