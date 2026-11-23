// routes.js — Temiz adres tablosu (Etap 8, K112). Sahibi: 81 Frontend Platform. TEK KAYNAK:
//   * tarayıcı: window.Routes (her sayfada config.js'ten hemen sonra yüklenir)
//   * dev sunucusu: scripts/dev-server.mjs bu dosyayı okur (temiz adres → demo/<dosya>, eski /demo/*.html → 301)
//   * nginx: scripts/gen-routes.mjs → deploy/web/routes.conf (üretilmiş; elle düzenlemeyin)
// Kurallar: aday sayfaları öneksiz, danışman /guru/..., yönetici /yonetici/..., ana sayfa "/".
// Sayfa dosyaları demo/ altında kalır; statik kaynaklar mutlak /demo/... yolundan, tema /theme.css'ten gelir.
(function (root) {
  'use strict';

  // temiz yol → demo/ altındaki dosya
  const PAGES = Object.freeze({
    '/': 'index.html',
    // Ziyaretçi / aday
    '/giris': 'giris.html',
    '/kayit': 'kayit.html',
    '/kayit/eposta': 'eposta.html',
    '/parola': 'davet.html',
    '/danismanlar': 'danismanlar.html',
    '/danisman': 'danisman.html',
    '/hizmet': 'hizmet.html',
    '/siparis': 'siparis.html',
    '/odeme/basarili': 'odeme-ok.html',
    '/odeme/bekleniyor': 'odeme-bekle.html',
    '/odeme/hata': 'odeme-hata.html',
    '/panel': 'ana.html',
    '/profil': 'profil.html',
    '/cv': 'cv.html',
    '/randevu': 'randevu-on.html',
    '/randevu/takvim': 'takvim.html',
    '/randevu/tamam': 'randevu-ok.html',
    '/randevu/ikinci-seans': 'seans2-ok.html',
    '/seanslar': 'seanslar.html',
    '/seanslar/notlar': 'seans-notlari.html',
    '/hikaye/yaz': 'hikaye-giris.html',
    '/hikaye/oneriler': 'hikaye-oneriler.html',
    '/hikaye/hazir': 'ciktilar.html',
    '/odevler': 'odevler.html',
    '/odevler/goruntule': 'odev-goruntule.html',
    '/odevler/teslim': 'odev-teslim.html',
    // Danışman (guru)
    '/guru/giris': 'giris-danisman.html',
    '/guru/danisanlar': 'guru-danisanlar.html',
    '/guru/danisan': 'guru-danisan-detay.html',
    '/guru/hikaye': 'guru-hikaye.html',
    '/guru/notlar': 'guru-notlar.html',
    '/guru/odevler': 'guru-odevler.html',
    '/guru/musaitlik': 'guru-musaitlik.html',
    '/guru/musaitlik/ekle': 'guru-musaitlik-ekle.html',
    '/guru/seanslar': 'guru-seanslar.html',
    '/guru/profil': 'guru-profil.html',
    // Yönetici
    '/yonetici/giris': 'giris-yonetici.html',
    '/yonetici/panel': 'yonetici-panel.html',
    '/yonetici/kullanicilar': 'yonetici-kullanicilar.html',
    '/yonetici/gurular': 'yonetici-gurular.html',
    '/yonetici/hizmetler': 'yonetici-hizmetler.html',
    '/yonetici/icerik': 'yonetici-icerik.html',
    '/yonetici/odemeler': 'yonetici-odemeler.html',
    '/yonetici/kurallar': 'yonetici-kurallar.html',
    '/yonetici/soru-setleri': 'yonetici-soru-setleri.html',
    '/yonetici/profil-formu': 'yonetici-profil-formu.html',
    '/yonetici/yz-kullanim': 'yonetici-yz-kullanim.html',
    '/yonetici/denetim': 'yonetici-denetim.html'
  });

  // Dosyası olmayan kısa yollar ve kaldırılan eski sayfalar → 301 hedefi (temiz yol).
  const ALIASES = Object.freeze({
    '/guru': '/guru/danisanlar',
    '/yonetici': '/yonetici/panel'
  });
  const LEGACY_FILES = Object.freeze({
    'danisman-profil.html': '/danisman',   // eski profil adresi (?id= korunur)
    'giris-hata-rol.html': '/giris'        // K113: rol hata sayfası kaldırıldı
  });

  // K116 (Etap 10): sayfa sınıfları — tek kaynak. "Kimlik" sayfaları (giriş/kayıt/parola) oturumsuz açılır ve
  // panel menüsü almaz; "herkese açık" = oturum gerektirmeyen tüm sayfalar (kimlik sayfaları dahil).
  const AUTH_PAGES = Object.freeze(['/giris', '/kayit', '/kayit/eposta', '/parola', '/guru/giris', '/yonetici/giris']);
  const PUBLIC_PAGES = Object.freeze(['/', '/danismanlar', '/danisman'].concat(AUTH_PAGES));
  const LOGIN_PAGES = Object.freeze({ aday: '/giris', guru: '/guru/giris', yonetici: '/yonetici/giris' });
  const HOME_PAGES = Object.freeze({ aday: '/panel', guru: '/guru/danisanlar', yonetici: '/yonetici/panel' });

  const FILE_TO_PATH = {};
  Object.keys(PAGES).forEach(p => { FILE_TO_PATH[PAGES[p]] = p; });
  Object.keys(LEGACY_FILES).forEach(f => { FILE_TO_PATH[f] = LEGACY_FILES[f]; });
  Object.freeze(FILE_TO_PATH);

  function normalize(pathname) {
    const p = String(pathname || '/').replace(/\/{2,}/g, '/');
    return p.length > 1 ? p.replace(/\/+$/, '') : '/';
  }

  // Herhangi bir yol (temiz ya da eski /demo/x.html) → kanonik temiz yol; tanınmıyorsa null.
  function canonical(pathname) {
    const p = normalize(pathname);
    if (Object.prototype.hasOwnProperty.call(PAGES, p)) return p;
    if (Object.prototype.hasOwnProperty.call(ALIASES, p)) return ALIASES[p];
    const legacy = /^(?:\/demo)?\/?([a-z0-9-]+\.html)$/.exec(p);
    if (legacy && Object.prototype.hasOwnProperty.call(FILE_TO_PATH, legacy[1])) return FILE_TO_PATH[legacy[1]];
    if (p === '/demo') return '/';
    return null;
  }

  // Bulunulan sayfanın temiz yolu (ör. '/guru/danisanlar'); bilinmiyorsa normalize edilmiş yol.
  function page() {
    const loc = root.location;
    return (loc && canonical(loc.pathname)) || normalize(loc ? loc.pathname : '/');
  }

  function isPage(path) {
    return Object.prototype.hasOwnProperty.call(PAGES, normalize(path));
  }

  // Göreli "x.html?…" ya da temiz "/x?…" → temiz "/x?…" (sorgu/fragment korunur); tanınmıyorsa null.
  function href(value) {
    if (typeof value !== 'string' || !value) return null;
    const m = /^([^?#]*)(.*)$/.exec(value);
    const path = canonical(m[1].startsWith('/') ? m[1] : '/' + m[1]);
    return path ? path + m[2] : null;
  }

  // Rol alanı: '/guru/…' → guru, '/yonetici/…' → yonetici, diğerleri → aday (önek, giriş sayfaları dahil).
  function area(path) {
    const p = normalize(path === undefined ? page() : path);
    if (p === '/guru' || p.startsWith('/guru/')) return 'guru';
    if (p === '/yonetici' || p.startsWith('/yonetici/')) return 'yonetici';
    return 'aday';
  }
  function isAuthPage(path) { return AUTH_PAGES.includes(normalize(path === undefined ? page() : path)); }
  function isPublic(path) { return PUBLIC_PAGES.includes(normalize(path === undefined ? page() : path)); }
  // Oturum isteyen panel sayfası (menü/sidebar alır). area verilirse yalnız o rolün panelinde true.
  function isPanel(path, role) {
    const p = normalize(path === undefined ? page() : path);
    return isPage(p) && !isPublic(p) && (!role || area(p) === role);
  }

  const api = Object.freeze({ PAGES, ALIASES, LEGACY_FILES, FILE_TO_PATH, AUTH_PAGES, PUBLIC_PAGES, LOGIN_PAGES, HOME_PAGES,
    normalize, canonical, page, isPage, href, area, isAuthPage, isPublic, isPanel });
  if (root) root.Routes = api;
  if (typeof module === 'object' && module && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
