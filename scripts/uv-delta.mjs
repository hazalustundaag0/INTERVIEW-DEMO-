#!/usr/bin/env node
// uv-delta.mjs — Etap 4 (Ultraviolet): bir sayfada Hazal'ın HENÜZ uygulanmamış değişikliklerini gösterir.
// Sahibi: 81 Frontend Platform. Sayfa sahipleri (82/83/84) S1 işinde iş listesi olarak kullanır.
//
//   node scripts/uv-delta.mjs demo/profil.html            → etiket düzeyinde fark (mevcut dosya → 3-yollu birleşim)
//   node scripts/uv-delta.mjs demo/profil.html --out x.html → birleşimi (çakışma işaretleriyle) dosyaya yazar
//   node scripts/uv-delta.mjs --summary demo/*.html       → sayfa başına "temiz / çakışan" parça sayısı
//
// Yöntem: tek satırlık HTML'ler '<' öncesinden satırlara bölünür; `git merge-file` ile
//   ours = çalışma ağacındaki dosya, base = 8e2033d (ortak taban), theirs = origin/main (Hazal, 671690b)
// birleştirilir. Çıktıdaki '+' satırları Hazal'ın sayfaya gelecek değişiklikleridir; çakışma blokları
// (<<<<<<< mevcut / >>>>>>> hazal) elle karar ister. Bu betik depoya YAZMAZ (--out yalnız verilen yola).
// Uyarı: Hazal'ın sürümündeki demo-flow-nav, sabit "Selin Arslan" vb. ve silinmiş betik referansları
// (hikaye-veri.js …) da fark olarak görünür; bunlar alınmaz (K79, K83).
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE_REV = process.env.UV_BASE || '8e2033d';
const THEIRS_REV = process.env.UV_THEIRS || 'origin/main';

const args = process.argv.slice(2);
const summary = args.includes('--summary');
const outIndex = args.indexOf('--out');
const outFile = outIndex >= 0 ? args[outIndex + 1] : null;
const files = args.filter((a, i) => !a.startsWith('--') && (outIndex < 0 || i !== outIndex + 1));

if (!files.length) {
  console.error('Kullanım: node scripts/uv-delta.mjs <demo/sayfa.html> [--out yol] | --summary <dosyalar…>');
  process.exit(2);
}

const show = (rev, file) => {
  try {
    return execFileSync('git', ['-C', ROOT, 'show', `${rev}:${file}`], { encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
};
const split = s => s.replace(/\r\n/g, '\n').replace(/\n/g, '\u0002\n').replace(/</g, '\u0001\n<');
const join = s => s.replace(/\u0001\n/g, '').replace(/\u0002\n/g, '\n');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'uv-delta-'));

function merge(file) {
  const rel = file.replace(/\\/g, '/').replace(/^\.\//, '');
  const current = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const parts = { cur: split(current), base: split(show(BASE_REV, rel)), hazal: split(show(THEIRS_REV, rel)) };
  const p = {};
  for (const [k, v] of Object.entries(parts)) {
    p[k] = path.join(tmp, `${rel.replace(/[\\/]/g, '_')}.${k}`);
    fs.writeFileSync(p[k], v);
  }
  const r = spawnSync('git', ['merge-file', '-p', '-L', 'mevcut', '-L', 'taban', '-L', 'hazal', p.cur, p.base, p.hazal], { encoding: 'utf8', maxBuffer: 64 << 20 });
  const merged = r.stdout;
  const conflicts = (merged.match(/^<<<<<<< mevcut/gm) || []).length;
  p.merged = p.cur + '.merged';
  fs.writeFileSync(p.merged, merged);
  const d = spawnSync('git', ['diff', '--no-index', '--no-color', '-U1', p.cur, p.merged], { encoding: 'utf8', maxBuffer: 64 << 20 });
  const diff = d.stdout.split('\n').slice(4).map(line => line.replace(/\u0001|\u0002/g, '')).join('\n');
  const hunks = (diff.match(/^@@/gm) || []).length;
  return { rel, merged, conflicts, hunks, diff };
}

for (const file of files) {
  const m = merge(file);
  if (summary) {
    console.log(`${m.rel}\tfark parçası ${m.hunks}\tçakışan ${m.conflicts}`);
    continue;
  }
  console.log(`# ${m.rel}: ${m.hunks} fark parçası, ${m.conflicts} çakışma (mevcut → +Hazal)`);
  console.log(m.diff || '(fark yok)');
  if (outFile) {
    fs.writeFileSync(path.resolve(outFile), join(m.merged));
    console.log(`→ birleşim yazıldı: ${path.resolve(outFile)}`);
  }
}
fs.rmSync(tmp, { recursive: true, force: true });
