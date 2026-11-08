// Token önbelleği (giriş IP sınırı 30/15 dk): hesap başına bir giriş, sessionStorage enjeksiyonuyla yeniden kullanım.
// Önbellek output/tokens.json (git dışı). Süresi dolan/iptal edilen token için dosyayı silin.
import fs from 'node:fs';
import { apiLogin, statePath } from './lib.mjs';

const FILE = statePath('tokens.json');
export async function token(key, email, password, clientType) {
  const cache = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : {};
  const hit = cache[key];
  if (hit && (!hit.user.expires_at || Date.parse(hit.user.expires_at) > Date.now() + 60000)) return hit;
  const r = await apiLogin(email, password, clientType);
  const u = r.user || {};
  cache[key] = { token: r.token, user: { id: u.id, first_name: u.first_name, last_name: u.last_name, role: u.role, client_type: clientType, expires_at: r.expires_at } };
  fs.writeFileSync(FILE, JSON.stringify(cache, null, 1));
  return cache[key];
}

// Bir rol oturumunu bağlamdaki her sayfaya enjekte eder (api-client.js'in girişten sonra yaptığı gibi).
export async function inject(ctx, role, t) {
  await ctx.addInitScript(([role, tok, user]) => {
    if (!sessionStorage.getItem('idToken.' + role)) {
      sessionStorage.setItem('idToken.' + role, tok);
      sessionStorage.setItem('idUser.' + role, JSON.stringify(user));
    }
  }, [role, t.token, t.user]);
}

// Önbellekteki bir token'ı geçersiz say (ör. çıkış testi sunucuda iptal ettikten sonra).
export function forget(key) {
  if (!fs.existsSync(FILE)) return;
  const cache = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  delete cache[key];
  fs.writeFileSync(FILE, JSON.stringify(cache, null, 1));
}
