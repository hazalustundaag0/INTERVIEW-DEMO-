// Tüm tarayıcı aşamalarını sırayla koşar (her aşama ayrı süreç; biri FAIL verirse diğerleri yine koşar).
//   node run-all.mjs              → tam akış (yeni A/B adayları oluşturur)
//   node run-all.mjs s10 s1       → yalnız verilen aşamalar (önceki koşunun output/ durumu kullanılır)
// Giriş IP sınırı 30/15 dk: tam akış ~14 giriş yapar; arka arkaya iki tam koşu yapmayın.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STAGES = [
  ['s1', 's1-public.mjs'],
  ['s2', 's2-onboarding.mjs', 'A'], ['s2', 's2-onboarding.mjs', 'B'],
  ['s3', 's3-guru1.mjs'],
  ['s4', 's4-guru-avail.mjs'],
  ['s5', 's5-journey.mjs', 'A'], ['s5', 's5-journey.mjs', 'B'],
  // s7a (guru 1. seansı tamamlar) s6'dan önce: hikâye akışı FIRST_SESSION_DONE ister.
  ['s7a', 's7a-guru-complete.mjs'],
  ['s6', 's6-story.mjs', 'A'],
  ['s7b', 's7b-guru-story.mjs'], ['s7c', 's7c-odev.mjs'],
  ['s8', 's8-security.mjs'],
  ['s9', 's9-misc.mjs'],
  ['s10', 's10-layout.mjs'],
  // Etap 3 yönetici paneli (70 QA): ADMIN_PASSWORD env; ~6 giriş yapar.
  ['s11', 's11-yonetici.mjs']
];
const only = process.argv.slice(2);
const summary = [];
for (const [id, file, arg] of STAGES) {
  if (only.length && !only.includes(id)) continue;
  console.log(`\n=== ${id} ${file} ${arg || ''}`);
  const r = spawnSync(process.execPath, [file, ...(arg ? [arg] : [])], { cwd: HERE, stdio: 'inherit', env: process.env });
  summary.push(`${id}${arg ? ' ' + arg : ''}: ${r.status === 0 ? 'OK' : 'FAIL (' + r.status + ')'}`);
}
console.log('\n' + summary.join('\n'));
process.exit(summary.some(s => s.includes('FAIL')) ? 1 : 0);
