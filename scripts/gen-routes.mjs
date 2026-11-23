#!/usr/bin/env node
// gen-routes.mjs — K112 (Etap 8): demo/routes.js (tek kaynak) → nginx eşleme dosyası. Sahibi: 81.
//   node scripts/gen-routes.mjs            → ../deploy/web/routes.conf yazar
//   node scripts/gen-routes.mjs --check    → dosya güncel değilse çıkış kodu 1 (yazmaz)
//   node scripts/gen-routes.mjs <çıktı>    → başka bir yola yazar
// nginx: $page_file (temiz adres → demo/ altındaki dosya) ve $legacy_target (eski /demo/*.html, /demo,
// kısa yollar, sondaki "/" → 301 hedefi). deploy/web/nginx.conf bu dosyayı http bloğunda include eder.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sandbox = { module: { exports: {} } };
sandbox.globalThis = sandbox;
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'demo', 'routes.js'), 'utf8'), sandbox, { filename: 'routes.js' });
const R = sandbox.module.exports;

const SAFE = /^\/[a-z0-9/-]*$/;
const FILE = /^[a-z0-9-]+\.html$/;
const q = v => '"' + v + '"';
const pages = [];
const legacy = [['/demo', '/'], ['/demo/', '/']];
for (const [p, f] of Object.entries(R.PAGES)) {
  if (!SAFE.test(p) || !FILE.test(f)) throw new Error('geçersiz rota: ' + p + ' → ' + f);
  if (!fs.existsSync(path.join(ROOT, 'demo', f))) throw new Error('dosya yok: demo/' + f);
  pages.push([p, f]);
  if (p !== '/') legacy.push([p + '/', p]);
}
for (const [f, p] of Object.entries(R.FILE_TO_PATH)) {
  if (!FILE.test(f) || !SAFE.test(p)) throw new Error('geçersiz eski adres: ' + f);
  legacy.push(['/demo/' + f, p]);
}
for (const [a, p] of Object.entries(R.ALIASES)) {
  if (!SAFE.test(a) || !SAFE.test(p)) throw new Error('geçersiz kısa yol: ' + a);
  legacy.push([a, p], [a + '/', p]);
}
const pad = n => ' '.repeat(Math.max(1, 34 - n.length));
const body = [
  '# routes.conf — ÜRETİLMİŞ DOSYA, elle düzenlemeyin. Kaynak: frontend/demo/routes.js',
  '# Üretim: node frontend/scripts/gen-routes.mjs (K112, Etap 8). nginx.conf http bloğunda include edilir.',
  '',
  '# Temiz sayfa adresi → /usr/share/nginx/html/demo/ altındaki dosya',
  'map $uri $page_file {',
  '    default ' + q('') + ';',
  ...pages.map(([p, f]) => '    ' + q(p) + pad(p) + q(f) + ';'),
  '}',
  '',
  '# Eski /demo/*.html, /demo, kısa yollar ve sondaki "/" → 301 hedefi (sorgu dizesi korunur)',
  'map $uri $legacy_target {',
  '    default ' + q('') + ';',
  ...legacy.map(([from, to]) => '    ' + q(from) + pad(from) + q(to) + ';'),
  '}',
  ''
].join('\n');

const args = process.argv.slice(2);
const check = args.includes('--check');
const out = path.resolve(args.find(a => !a.startsWith('--')) || path.join(ROOT, '..', 'deploy', 'web', 'routes.conf'));
if (check) {
  const current = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
  if (current !== body) { console.error('routes.conf güncel değil: node frontend/scripts/gen-routes.mjs'); process.exit(1); }
  console.log('routes.conf güncel (' + pages.length + ' sayfa, ' + legacy.length + ' yönlendirme)');
} else {
  fs.writeFileSync(out, body);
  console.log(out + ' yazıldı (' + pages.length + ' sayfa, ' + legacy.length + ' yönlendirme)');
}
