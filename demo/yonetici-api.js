// yonetici-api.js: Yönetici panelinin backend ile konuştuğu tek katman (Etap 3, 85).
//
// Sözleşme: backend/api/openapi.yaml. Sahte veri / mock mod YOKTUR (K70, K58): her çağrı gerçek API'ye gider.
//   Taban adres: window.APP_CONFIG.apiBaseUrl (config.js; yerelde http://127.0.0.1:8090/api/v1). Bu dosyadan
//   önce <script src="config.js"> yüklenmelidir.
//   Oturum (K71): sessionStorage 'idToken.admin' (yalın token) + 'idUser.admin' (api-client.js'teki özet biçimi:
//   {id, first_name, last_name, role, client_type:'admin', expires_at}; e-posta saklanmaz). Token asla
//   loglanmaz ve localStorage'a yazılmaz.
//   gate.js / api-client.js yönetici sayfalarına yüklenmez (pageRole yönetici sayfalarını tanımaz); bu dosya
//   aynı anahtar biçimini kendisi uygular.
(function () {
  var CFG = window.APP_CONFIG || {};
  if (!CFG.apiBaseUrl) console.error('yonetici-api.js: APP_CONFIG.apiBaseUrl yok; config.js bu dosyadan önce yüklenmeli.');
  var TABAN_URL = CFG.apiBaseUrl || 'http://127.0.0.1:8090/api/v1';
  var ZAMAN_ASIMI = Number(CFG.requestTimeoutMs) || 15000;
  var TOKEN_ANAHTARI = 'idToken.admin';
  var KULLANICI_ANAHTARI = 'idUser.admin';
  // Mock dönemi kalıntıları: paylaşılan tarayıcıda eski admin token'ı / kurgusal kişi verisi kalmasın (GAP-Y12).
  var ESKI_ANAHTARLAR = ['demoYoneticiOturum', 'yoneticiDemoVeri'];

  try { ESKI_ANAHTARLAR.forEach(function (k) { window.localStorage.removeItem(k); }); } catch (h) { /* depolama kapalı */ }

  function Problem(status, code, message, fields, requestId) {
    this.name = 'Problem';
    this.status = status;
    this.code = code;
    this.requestId = requestId || null;
    // 5xx'te destek için istek kimliği mesaja eklenir (GAP-Y15; api-client.js userMessage ile aynı biçim).
    this.message = message + (status >= 500 && status !== 501 && requestId ? ' Hata kodu: ' + requestId : '');
    this.fields = fields || null;
  }
  Problem.prototype = Object.create(Error.prototype);

  var DURUM_MESAJI = {
    400: 'İstek işlenemedi. Bilgileri kontrol edip tekrar dene.',
    401: 'Oturumun sona erdi. Lütfen tekrar giriş yap.',
    403: 'Bu işlem için yetkin yok.',
    404: 'Kayıt bulunamadı.',
    409: 'İşlem şu anki durumla çakışıyor. Sayfayı yenileyip tekrar dene.',
    422: 'Bazı alanlar geçersiz.',
    429: 'Çok fazla deneme yapıldı. Biraz bekleyip tekrar dene.',
    500: 'Beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar dene.',
    503: 'Hizmet şu anda hazır değil. Lütfen biraz sonra tekrar dene.'
  };

  // ---------------- Oturum ----------------
  function depoAl(k) { try { return window.sessionStorage.getItem(k); } catch (h) { return null; } }
  function depoYaz(k, v) { try { window.sessionStorage.setItem(k, v); return true; } catch (h) { return false; } }
  function depoSil(k) { try { window.sessionStorage.removeItem(k); } catch (h) { /* yok say */ } }

  function oturumSil() {
    depoSil(TOKEN_ANAHTARI);
    depoSil(KULLANICI_ANAHTARI);
  }

  // Geçerli yönetici oturumu: {token, expires_at, user}; yoksa / süresi dolmuşsa / rol admin değilse null.
  function oturumGetir() {
    var token = depoAl(TOKEN_ANAHTARI);
    var ham = depoAl(KULLANICI_ANAHTARI);
    if (!token || !ham) { if (token || ham) oturumSil(); return null; }
    var user = null;
    try { user = JSON.parse(ham); } catch (h) { user = null; }
    if (!user || user.role !== 'admin' || user.client_type !== 'admin' || !user.expires_at || !(Date.parse(user.expires_at) > Date.now())) {
      oturumSil();
      return null;
    }
    return { token: token, expires_at: user.expires_at, user: user };
  }

  function oturumKaydet(login) {
    var u = login.user || {};
    var ozet = { id: u.id, first_name: u.first_name || '', last_name: u.last_name || '', role: u.role, client_type: 'admin', expires_at: login.expires_at };
    if (!depoYaz(TOKEN_ANAHTARI, login.token) || !depoYaz(KULLANICI_ANAHTARI, JSON.stringify(ozet))) {
      oturumSil();
      return false;
    }
    return true;
  }

  function girisSayfasinaGit() {
    var sayfa = location.pathname.split('/').pop();
    location.href = 'giris-yonetici.html' + (sayfa && /^yonetici-[a-z0-9-]+\.html$/.test(sayfa) ? '?return=' + encodeURIComponent(sayfa) : '');
  }

  // ---------------- İstek ----------------
  // secenek.yonlendirme401 === false → 401'de oturum silinir ama sayfa değişmez (çıkış, giriş).
  function istek(yontem, yol, govde, secenek) {
    var s = secenek || {};
    var o = oturumGetir();
    var basliklar = { Accept: 'application/json' };
    if (govde !== undefined) basliklar['Content-Type'] = 'application/json';
    if (o && yol !== '/auth/login') basliklar.Authorization = 'Bearer ' + o.token;
    var denetleyici = typeof AbortController === 'function' ? new AbortController() : null;
    var zamanAsti = false;
    var zamanlayici = denetleyici ? setTimeout(function () { zamanAsti = true; denetleyici.abort(); }, s.zamanAsimi || ZAMAN_ASIMI) : null;
    return fetch(TABAN_URL + yol, {
      method: yontem,
      headers: basliklar,
      body: govde !== undefined ? JSON.stringify(govde) : undefined,
      signal: denetleyici ? denetleyici.signal : undefined,
      credentials: 'omit'
    })
      .catch(function () {
        if (zamanAsti) throw new Problem(0, 'timeout', 'İşlem zaman aşımına uğradı. Lütfen tekrar dene.');
        throw new Problem(0, 'network_error', 'Sunucuya ulaşılamadı. Bağlantını kontrol edip tekrar dene.');
      })
      .then(function (yanit) {
        return yanit.text().then(function (metin) {
          clearTimeout(zamanlayici);
          var veri = null;
          if (metin) { try { veri = JSON.parse(metin); } catch (h) { veri = null; } }
          if (yanit.ok) return veri;
          var rid = (veri && veri.request_id) || yanit.headers.get('X-Request-ID');
          var p = new Problem(yanit.status, (veri && veri.code) || 'http_' + yanit.status,
            (veri && (veri.message || veri.detail)) || DURUM_MESAJI[yanit.status] || DURUM_MESAJI[500], veri && veri.fields, rid);
          if (yanit.status === 401 && yol !== '/auth/login') {
            oturumSil();
            if (s.yonlendirme401 !== false) girisSayfasinaGit();
          }
          throw p;
        });
      }, function (h) { clearTimeout(zamanlayici); throw h; });
  }

  function sorgu(params) {
    var s = new URLSearchParams();
    Object.keys(params || {}).forEach(function (k) { if (params[k] !== undefined && params[k] !== null && params[k] !== '') s.set(k, params[k]); });
    var m = s.toString();
    return m ? '?' + m : '';
  }

  // Sayfalı bir listenin tamamını (en fazla ust kayıt) toplar.
  function hepsi(yol, params, ust) {
    var toplam = [];
    ust = ust || 1000;
    function sayfa(cursor) {
      var p = Object.assign({}, params, { limit: 100, cursor: cursor });
      return istek('GET', yol + sorgu(p)).then(function (y) {
        toplam = toplam.concat(y.items || []);
        if (y.next_cursor && toplam.length < ust) return sayfa(y.next_cursor);
        return toplam;
      });
    }
    return sayfa(null);
  }

  function girisYap(eposta, parola) {
    oturumSil();
    return istek('POST', '/auth/login', { email: eposta, password: parola, client_type: 'admin', device_info: 'Yönetici paneli (web)' }).then(function (login) {
      if (!login || !login.token || !login.user || login.user.role !== 'admin') throw new Problem(403, 'client_not_allowed', 'Bu hesapla bu uygulamaya giriş yapılamaz.');
      if (!oturumKaydet(login)) throw new Problem(0, 'storage_unavailable', 'Oturum bu tarayıcıda saklanamadı. Gizli pencere ayarlarını kontrol et.');
      return login;
    });
  }

  // GET /auth/me: token'ı sunucuda doğrular (iptal edilmiş / pasif hesap → 401 → giriş sayfası).
  function ben() {
    return istek('GET', '/auth/me').then(function (m) {
      if (!m || !m.user || m.user.role !== 'admin' || m.client_type !== 'admin') {
        oturumSil();
        girisSayfasinaGit();
        throw new Problem(403, 'forbidden', 'Bu sayfa yalnız yöneticiler içindir.');
      }
      return m;
    });
  }

  function cikisYap() {
    var p = oturumGetir() ? istek('POST', '/auth/logout', undefined, { yonlendirme401: false }) : Promise.resolve();
    return p.catch(function () { /* token zaten geçersiz olabilir; yerel oturum yine kapatılır */ }).then(function () {
      oturumSil();
      location.href = 'giris-yonetici.html';
    });
  }

  window.YoneticiAPI = {
    Problem: Problem,
    istek: istek,
    sorgu: sorgu,
    hepsi: hepsi,
    get: function (yol, params) { return istek('GET', yol + sorgu(params)); },
    post: function (yol, govde) { return istek('POST', yol, govde); },
    put: function (yol, govde) { return istek('PUT', yol, govde || {}); },
    patch: function (yol, govde) { return istek('PATCH', yol, govde || {}); },
    del: function (yol) { return istek('DELETE', yol); },
    oturumGetir: oturumGetir,
    oturumSil: oturumSil,
    girisYap: girisYap,
    ben: ben,
    cikisYap: cikisYap
  };
})();
