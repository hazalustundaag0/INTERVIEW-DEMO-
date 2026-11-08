#!/usr/bin/env node
// dev-server.mjs — Bağımlılıksız statik geliştirme sunucusu (K59). Sahibi: 81 Frontend Platform.
//   node scripts/dev-server.mjs            → http://localhost:3000 (yalnız 127.0.0.1'e bağlanır)
//   PORT=3100 node scripts/dev-server.mjs  → farklı port (CORS_ALLOWED_ORIGINS da değişmeli!)
// Kök: frontend/ (sayfalar ../theme.css kullanır). / → /demo/index.html. Yalnız /demo/** ve /theme.css
// servis edilir; scripts/, tests/, README ve dot-dosyalar 404 (QA-019).
// E-posta bağlantıları (backend: APP_PUBLIC_URL/verify-email, /reset-password; GURU_PANEL_URL/set-password;
// token #fragment'ta) sorgu korunarak davet.html'e 302 ile yönlenir. Fragment tarayıcıda kalır ve
// yönlendirmede otomatik korunur (RFC 7231 §7.1.2); sunucuya hiç gelmez.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT) || 3000;

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

function redirect(res, location) {
  send(res, 302, '', { Location: location });
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

  if (pathname === '/') {
    redirect(res, '/demo/index.html');
    return;
  }
  if (LINK_ROUTES[pathname]) {
    const params = new URLSearchParams(url.search);
    params.set('mode', LINK_ROUTES[pathname]);
    redirect(res, '/demo/davet.html?' + params.toString());
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
      if (!url.pathname.endsWith('/')) {
        redirect(res, url.pathname + '/' + url.search);
        return;
      }
      file = path.join(file, 'index.html');
      stat = fs.existsSync(file) ? fs.statSync(file) : null;
    }
    if (err || !stat || !stat.isFile()) {
      send(res, 404, 'Not Found');
      return;
    }
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
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
});

server.on('error', error => {
  console.error(`Dev sunucusu başlatılamadı (${HOST}:${PORT}): ${error.message}`);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`Interview Demo frontend: http://localhost:${PORT}/  (kök: ${ROOT}, yalnız ${HOST})`);
  console.log('Not: sayfaları http://127.0.0.1 değil http://localhost üzerinden açın (CORS origin).');
});
