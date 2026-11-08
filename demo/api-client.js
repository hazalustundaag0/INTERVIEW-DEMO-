// api-client.js — Backend'e TEK erişim noktası. Sahibi: 81 Frontend Platform.
// Sözleşme: [[81 - Frontend Platform Agent#Sağladığı Sözleşmeler]].
//
// Kurallar (Etap 2):
//  - Sayfalar backend'e yalnız window.Api üzerinden erişir; doğrudan fetch yazılmaz.
//  - Bearer token yalnız sessionStorage'da, rol başına ayrı anahtarda tutulur
//    (idToken.candidate / idToken.guru) ve ASLA loglanmaz / localStorage'a yazılmaz.
//  - Hatalar daima ApiError (RFC 9457 problem+json'dan) olarak fırlatılır.
//  - 401 (unauthenticated) → ilgili rolün token'ı temizlenir, giriş sayfasına ?return= ile gidilir.
//
// Bağımlılık: config.js (window.APP_CONFIG) bu dosyadan ÖNCE yüklenmelidir.
(function () {
  'use strict';

  const CONFIG = window.APP_CONFIG || {};
  const BASE_URL = String(CONFIG.apiBaseUrl || 'http://127.0.0.1:8090/api/v1').replace(/\/+$/, '');
  const DEFAULT_TIMEOUT = Number(CONFIG.requestTimeoutMs) || 15000;
  const UPLOAD_TIMEOUT = Number(CONFIG.uploadTimeoutMs) || 40000;
  const AI_TIMEOUT = Number(CONFIG.aiTimeoutMs) || 75000;
  const LOCALE = CONFIG.locale || 'tr-TR';
  const TIME_ZONE = CONFIG.timeZone || 'Europe/Istanbul';

  const ROLES = Object.freeze({ CANDIDATE: 'candidate', GURU: 'guru' });
  const LOGIN_PAGES = Object.freeze({ candidate: 'giris.html', guru: 'giris-danisman.html' });
  const HOME_PAGES = Object.freeze({ candidate: 'ana.html', guru: 'guru-danisanlar.html' });
  const NO_RETURN_PAGES = ['giris.html', 'giris-danisman.html', 'kayit.html', 'eposta.html', 'davet.html', 'giris-hata-rol.html'];
  const MAX_FILE_BYTES = 10 * 1024 * 1024;

  // ─── Sayfa / rol ────────────────────────────────────────────────────────────
  function pageName() {
    return location.pathname.split('/').pop() || 'index.html';
  }

  // Sayfanın hangi rolün token'ını kullandığı. guru-* ve guru girişi → guru;
  // davet.html?mode=invite (guru daveti) → guru; diğer her şey → candidate.
  function pageRole(page) {
    const name = page || pageName();
    if (name.startsWith('guru-') || name === 'giris-danisman.html') return ROLES.GURU;
    if (name === 'davet.html' && new URLSearchParams(location.search).get('mode') === 'invite') return ROLES.GURU;
    return ROLES.CANDIDATE;
  }

  function normalizeRole(role) {
    if (role === 'guru' || role === 'danisman') return ROLES.GURU;
    if (role === 'candidate' || role === 'danisan') return ROLES.CANDIDATE;
    return pageRole();
  }

  // Yalnız aynı klasördeki bir .html sayfasına (sorgu/fragment dahil) dönüşe izin verir.
  function safeReturnPath(value) {
    if (typeof value !== 'string' ||
        !/^[a-z0-9][a-z0-9_-]*\.html(?:[?#][^/\\\u0000-\u001f]*)?$/i.test(value)) {
      return null;
    }
    const target = value.split(/[?#]/)[0].toLowerCase();
    return NO_RETURN_PAGES.includes(target) ? null : value;
  }

  function currentReturnPath() {
    return safeReturnPath(pageName() + location.search) || null;
  }

  // ─── Depolama (yalnız sessionStorage) ──────────────────────────────────────
  const store = {
    get(key) {
      try { return window.sessionStorage.getItem(key); } catch (error) { return null; }
    },
    set(key, value) {
      try { window.sessionStorage.setItem(key, value); return true; } catch (error) { return false; }
    },
    remove(key) {
      try { window.sessionStorage.removeItem(key); } catch (error) { /* yok say */ }
    }
  };
  const tokenKey = role => 'idToken.' + role;
  const userKey = role => 'idUser.' + role;

  function emitSession(role, user) {
    try {
      window.dispatchEvent(new CustomEvent('api:session', { detail: { role, user } }));
    } catch (error) { /* eski tarayıcı */ }
  }

  function getUser(role) {
    const r = normalizeRole(role);
    const raw = store.get(userKey(r));
    if (!raw) return null;
    try {
      const user = JSON.parse(raw);
      return user && typeof user === 'object' ? user : null;
    } catch (error) {
      store.remove(userKey(r));
      return null;
    }
  }

  function getToken(role) {
    const r = normalizeRole(role);
    const token = store.get(tokenKey(r));
    if (!token) return null;
    const user = getUser(r);
    if (user && user.expires_at && Date.parse(user.expires_at) <= Date.now()) {
      clearSession(r);
      return null;
    }
    return token;
  }

  function hasSession(role) {
    return Boolean(getToken(role));
  }

  // Yalnız gösterim için gereken asgari kullanıcı özeti saklanır (e-posta tutulmaz).
  function cacheUser(role, user, extra) {
    if (!user) return;
    const previous = getUser(role) || {};
    const summary = {
      id: user.id,
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      role: user.role,
      client_type: (extra && extra.client_type) || previous.client_type || role,
      expires_at: (extra && extra.expires_at) || previous.expires_at || null
    };
    store.set(userKey(role), JSON.stringify(summary));
    emitSession(role, summary);
  }

  function setSession(role, login) {
    const r = normalizeRole(role);
    if (!login || typeof login.token !== 'string') return false;
    if (!store.set(tokenKey(r), login.token)) return false;
    cacheUser(r, login.user, { client_type: r, expires_at: login.expires_at });
    return true;
  }

  function clearSession(role) {
    const r = normalizeRole(role);
    store.remove(tokenKey(r));
    store.remove(userKey(r));
    emitSession(r, null);
  }

  function redirectToLogin(role, returnPath) {
    const r = normalizeRole(role);
    const login = LOGIN_PAGES[r];
    if (pageName() === login) return;
    const target = safeReturnPath(returnPath || '') || currentReturnPath();
    location.replace(login + (target ? '?return=' + encodeURIComponent(target) : ''));
  }

  // ─── Hata modeli ───────────────────────────────────────────────────────────
  const STATUS_MESSAGES = {
    0: 'Sunucuya ulaşılamadı. Bağlantını kontrol edip tekrar dene.',
    400: 'İstek işlenemedi. Bilgileri kontrol edip tekrar dene.',
    401: 'Oturumun sona erdi. Lütfen tekrar giriş yap.',
    403: 'Bu işlem için yetkin yok.',
    404: 'Kayıt bulunamadı.',
    409: 'İşlem şu anki durumla çakışıyor. Sayfayı yenileyip tekrar dene.',
    413: 'Dosya çok büyük. En fazla 10 MB yükleyebilirsin.',
    415: 'Bu dosya türü desteklenmiyor.',
    422: 'Bazı alanlar geçersiz.',
    429: 'Çok fazla deneme yapıldı. Biraz bekleyip tekrar dene.',
    500: 'Beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar dene.',
    501: 'Bu özellik henüz kullanılamıyor.',
    502: 'Sonuç üretilemedi. Lütfen tekrar dene.',
    503: 'Hizmet şu anda hazır değil. Lütfen biraz sonra tekrar dene.',
    504: 'İşlem zaman aşımına uğradı. Lütfen tekrar dene.'
  };

  // Alan hatası değerleri bazen kod (required, too_short …), bazen Türkçe mesajdır.
  const FIELD_CODE_MESSAGES = {
    required: 'Bu alan zorunlu.',
    too_short: 'Parola en az 12 karakter olmalıdır.',
    too_long: 'Değer çok uzun.',
    invalid_characters: 'Geçersiz karakterler içeriyor.',
    repetitive: 'Parola çok az farklı karakter içeriyor.',
    common: 'Bu parola çok yaygın; lütfen başka bir parola seç.',
    contains_personal_info: 'Parola adını veya e-posta adresini içeremez.',
    invalid_option: 'Geçersiz bir seçenek seçildi.',
    single_option_only: 'Yalnızca bir seçenek seçebilirsin.',
    unknown_field: 'Tanınmayan alan.',
    invalid: 'Geçersiz değer.'
  };

  function fieldMessage(value) {
    const text = String(value == null ? '' : value).trim();
    if (/^[a-z_]+$/.test(text)) return FIELD_CODE_MESSAGES[text] || FIELD_CODE_MESSAGES.invalid;
    return text || FIELD_CODE_MESSAGES.invalid;
  }

  class ApiError extends Error {
    constructor(init) {
      const data = init || {};
      const status = Number(data.status) || 0;
      super(data.message || STATUS_MESSAGES[status] || STATUS_MESSAGES[500]);
      this.name = 'ApiError';
      this.status = status;
      this.code = data.code || (status ? 'http_' + status : 'network_error');
      this.fields = data.fields && typeof data.fields === 'object' ? data.fields : {};
      this.missing = Array.isArray(data.missing) ? data.missing : [];
      this.requestId = data.requestId || null;
      this.retryAfter = Number.isFinite(data.retryAfter) ? data.retryAfter : null;
      this.type = data.type || null;
      this.title = data.title || null;
      this.problem = data.problem || null;
    }

    // Kullanıcıya gösterilecek tam metin (429 bekleme süresi, 5xx destek kodu dahil).
    get userMessage() {
      let text = this.message;
      if (this.status === 429 && this.retryAfter) {
        const minutes = Math.ceil(this.retryAfter / 60);
        text += this.retryAfter >= 120 ? ` (${minutes} dk sonra tekrar dene)` : ` (${this.retryAfter} sn sonra tekrar dene)`;
      }
      if (this.status >= 500 && this.status !== 501 && this.requestId) {
        text += ` Hata kodu: ${this.requestId}`;
      }
      return text;
    }

    is(code) {
      return this.code === code;
    }

    get isNetwork() { return this.code === 'network_error'; }
    get isTimeout() { return this.code === 'timeout'; }
    get isValidation() { return this.status === 422 || this.code === 'weak_password'; }
  }

  async function errorFromResponse(response) {
    let problem = null;
    const contentType = response.headers.get('Content-Type') || '';
    if (/json/i.test(contentType)) {
      try { problem = await response.json(); } catch (error) { problem = null; }
    }
    const retryHeader = response.headers.get('Retry-After');
    const retryAfter = retryHeader && /^\d+$/.test(retryHeader.trim()) ? Number(retryHeader.trim()) : null;
    const status = (problem && Number(problem.status)) || response.status;
    return new ApiError({
      status,
      code: problem && problem.code,
      // Sözleşme `message` alanıdır; RFC 9457 `detail` yedek olarak okunur.
      message: (problem && (problem.message || problem.detail)) || STATUS_MESSAGES[status] || STATUS_MESSAGES[500],
      fields: problem && problem.fields,
      missing: problem && problem.missing,
      requestId: (problem && problem.request_id) || response.headers.get('X-Request-ID'),
      retryAfter,
      type: problem && problem.type,
      title: problem && problem.title,
      problem
    });
  }

  // ─── Çekirdek istek ────────────────────────────────────────────────────────
  function buildUrl(path, query) {
    if (/^https?:/i.test(path)) throw new Error('Api: yalnız göreli API yolu kullanın (/candidate/...).');
    const url = new URL(BASE_URL + (path.startsWith('/') ? path : '/' + path));
    if (query && typeof query === 'object') {
      Object.entries(query).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        if (Array.isArray(value)) value.forEach(item => url.searchParams.append(key, String(item)));
        else url.searchParams.set(key, String(value));
      });
    }
    return url.toString();
  }

  function newIdempotencyKey() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  function parseFilename(disposition) {
    if (!disposition) return null;
    const star = /filename\*\s*=\s*(?:UTF-8|utf-8)''([^;]+)/.exec(disposition);
    if (star) {
      try { return decodeURIComponent(star[1].trim().replace(/^"|"$/g, '')); } catch (error) { /* düz ada düş */ }
    }
    const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(disposition);
    return plain ? plain[1].trim() : null;
  }

  /**
   * request(method, path, options) → Promise<veri | null>
   * options:
   *   query         {object}  sorgu parametreleri (undefined/null/'' atlanır)
   *   body          {object|FormData|Blob}  JSON nesnesi otomatik serileştirilir
   *   role          'candidate'|'guru'  hangi token kullanılacak (varsayılan: sayfanın rolü)
   *   auth          {boolean} false → Authorization eklenmez (public/auth uçları)
   *   redirectOn401 {boolean} false → 401'de yönlendirme yapılmaz (token yine temizlenir)
   *   idempotencyKey{string}  Idempotency-Key başlığı (satın alma / ödeme yeniden deneme)
   *   timeoutMs     {number}  varsayılan config.requestTimeoutMs
   *   signal        {AbortSignal}
   *   headers       {object}
   *   responseType  'json'|'blob'|'text'  (varsayılan json)
   */
  async function request(method, path, options) {
    const opts = options || {};
    const role = normalizeRole(opts.role);
    const headers = new Headers(opts.headers || {});
    headers.set('Accept', opts.responseType === 'blob' ? '*/*' : 'application/json, application/problem+json');

    let body = opts.body;
    if (body !== undefined && body !== null && !(body instanceof FormData) && !(body instanceof Blob)) {
      headers.set('Content-Type', 'application/json');
      body = JSON.stringify(body);
    }
    if (opts.auth !== false) {
      const token = getToken(role);
      if (token) headers.set('Authorization', 'Bearer ' + token);
    }
    if (opts.idempotencyKey) headers.set('Idempotency-Key', opts.idempotencyKey);

    const controller = new AbortController();
    const timeoutMs = Number(opts.timeoutMs) || DEFAULT_TIMEOUT;
    let timedOut = false;
    const timer = window.setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
    if (opts.signal) {
      if (opts.signal.aborted) controller.abort();
      else opts.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    let response;
    try {
      response = await fetch(buildUrl(path, opts.query), {
        method: method.toUpperCase(),
        headers,
        body: body === null ? undefined : body,
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-store',
        redirect: 'error',
        signal: controller.signal
      });
    } catch (error) {
      window.clearTimeout(timer);
      if (timedOut) throw new ApiError({ status: 0, code: 'timeout', message: STATUS_MESSAGES[504] });
      if (opts.signal && opts.signal.aborted) throw new ApiError({ status: 0, code: 'aborted', message: 'İstek iptal edildi.' });
      throw new ApiError({ status: 0, code: 'network_error', message: STATUS_MESSAGES[0] });
    }
    window.clearTimeout(timer);

    if (!response.ok) {
      const error = await errorFromResponse(response);
      if (error.status === 401 && error.code !== 'invalid_credentials' && opts.auth !== false) {
        clearSession(role);
        if (opts.redirectOn401 !== false) redirectToLogin(role);
      }
      throw error;
    }

    if (opts.responseType === 'blob') {
      const blob = await response.blob();
      return {
        blob,
        filename: parseFilename(response.headers.get('Content-Disposition')),
        contentType: response.headers.get('Content-Type') || blob.type || 'application/octet-stream'
      };
    }
    if (response.status === 204) return null;
    const text = await response.text();
    if (!text) return null;
    if (opts.responseType === 'text') return text;
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new ApiError({ status: response.status, code: 'invalid_response', message: 'Sunucudan beklenmeyen bir yanıt alındı.' });
    }
  }

  const get = (path, opts) => request('GET', path, opts);
  const post = (path, body, opts) => request('POST', path, Object.assign({}, opts, { body }));
  const put = (path, body, opts) => request('PUT', path, Object.assign({}, opts, { body }));
  const patch = (path, body, opts) => request('PATCH', path, Object.assign({}, opts, { body }));
  const del = (path, opts) => request('DELETE', path, opts);

  // Aktif onay gerektiren uçlar (AUD-06): gövdeye confirm:true eklenir.
  // Örn. Api.confirm('POST', `/candidate/cv/${id}/approve`)
  function confirm(method, path, body, opts) {
    return request(method, path, Object.assign({}, opts, { body: Object.assign({}, body || {}, { confirm: true }) }));
  }

  // ─── Sayfalama ({items, next_cursor}) ───────────────────────────────────────
  async function page(path, opts) {
    const o = opts || {};
    const query = Object.assign({}, o.query, { limit: o.limit || 20, cursor: o.cursor || undefined });
    const data = await get(path, Object.assign({}, o, { query }));
    return { items: (data && data.items) || [], nextCursor: (data && data.next_cursor) || null };
  }

  async function* paginate(path, opts) {
    const o = opts || {};
    const maxPages = o.maxPages || 50;
    let cursor = o.cursor || null;
    let pages = 0;
    do {
      const result = await page(path, Object.assign({}, o, { cursor, limit: o.limit || 100 }));
      for (const item of result.items) yield item;
      cursor = result.nextCursor;
      pages += 1;
    } while (cursor && pages < maxPages);
  }

  async function listAll(path, opts) {
    const items = [];
    for await (const item of paginate(path, opts)) items.push(item);
    return items;
  }

  // ─── Dosyalar ──────────────────────────────────────────────────────────────
  const FILE_TYPES = {
    pdf: { ext: /\.pdf$/i, mime: 'application/pdf' },
    docx: { ext: /\.docx$/i, mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
  };

  // İstemci tarafı ön kontrol (sunucu yine içerikten denetler). Hata metni veya null döner.
  function validateFile(file, types) {
    if (!file) return 'Bir dosya seç.';
    if (file.size === 0) return 'Dosya boş.';
    if (file.size > MAX_FILE_BYTES) return STATUS_MESSAGES[413];
    const allowed = types || ['pdf', 'docx'];
    const ok = allowed.some(type => FILE_TYPES[type] &&
      (FILE_TYPES[type].ext.test(file.name || '') || file.type === FILE_TYPES[type].mime));
    return ok ? null : 'Yalnızca ' + allowed.map(t => t.toUpperCase()).join(' veya ') + ' dosyası yükleyebilirsin.';
  }

  // Multipart yükleme: Api.upload('/candidate/cv', { file }) veya
  // Api.upload(`/candidate/assignments/${id}/submission`, { file, fields: { text } })
  function upload(path, opts) {
    const o = opts || {};
    const form = new FormData();
    Object.entries(o.fields || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) form.append(key, String(value));
    });
    if (o.file) form.append(o.fileField || 'file', o.file, o.file.name);
    return request(o.method || 'POST', path, Object.assign({}, o, { body: form, timeoutMs: o.timeoutMs || UPLOAD_TIMEOUT }));
  }

  // Bearer ile dosya indirme. save !== false ise tarayıcı indirmesini tetikler.
  async function download(path, opts) {
    const o = opts || {};
    const result = await request('GET', path, Object.assign({}, o, { responseType: 'blob', timeoutMs: o.timeoutMs || UPLOAD_TIMEOUT }));
    const filename = o.filename || result.filename || 'dosya';
    if (o.save !== false) {
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.rel = 'noopener';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    }
    return Object.assign({}, result, { filename });
  }

  // ─── Kimlik ────────────────────────────────────────────────────────────────
  const auth = {
    // client_type sayfaya göre sabittir: giris.html → candidate, giris-danisman.html → guru.
    async login(input) {
      const data = input || {};
      const clientType = normalizeRole(data.clientType || pageRole());
      const login = await post('/auth/login', {
        email: String(data.email || '').trim(),
        password: data.password || '',
        client_type: clientType,
        device_info: data.deviceInfo || undefined
      }, { auth: false });
      if (!setSession(clientType, login)) {
        throw new ApiError({ status: 0, code: 'storage_unavailable', message: 'Oturum bu tarayıcıda saklanamadı. Gizli pencere ayarlarını kontrol et.' });
      }
      return login;
    },

    async logout(options) {
      const o = options || {};
      const role = normalizeRole(o.role);
      if (getToken(role)) {
        try {
          await post('/auth/logout', undefined, { role, redirectOn401: false });
        } catch (error) {
          // Token zaten geçersizse de yerel oturum kapatılır.
        }
      }
      clearSession(role);
      if (o.redirectTo !== false) location.href = o.redirectTo || 'index.html';
    },

    // GET /auth/me → { user, client_type, token_expires_at }; kullanıcı önbelleğini tazeler.
    async me(options) {
      const o = options || {};
      const role = normalizeRole(o.role);
      const me = await get('/auth/me', { role, redirectOn401: o.redirectOn401 });
      if (me && me.user) cacheUser(role, me.user, { client_type: me.client_type, expires_at: me.token_expires_at });
      return me;
    },

    register(input) {
      const d = input || {};
      return post('/auth/register', {
        first_name: d.firstName, last_name: d.lastName, email: d.email, language: d.language || undefined
      }, { auth: false });
    },
    verifyEmail(token, password) {
      return post('/auth/verify-email', { token, password }, { auth: false });
    },
    resendVerification(email) {
      return post('/auth/resend-verification', { email }, { auth: false });
    },
    requestPasswordReset(email) {
      return post('/auth/password-reset/request', { email }, { auth: false });
    },
    confirmPasswordReset(token, password) {
      return post('/auth/password-reset/confirm', { token, password }, { auth: false });
    },

    // E-posta bağlantısındaki #token=… değerini okur ve adres çubuğundan siler
    // (token geçmişe/Referer'a sızmasın). Bir kez okunur; sayfa değişkeninde tutun.
    takeLinkToken() {
      const match = /(?:^|[#&])token=([^&]+)/.exec(location.hash || '');
      if (!match) return null;
      try {
        history.replaceState(history.state, '', location.pathname + location.search);
      } catch (error) { /* yok say */ }
      try { return decodeURIComponent(match[1]); } catch (error) { return null; }
    }
  };

  // ─── Biçimlendirme ─────────────────────────────────────────────────────────
  const format = {
    // amount_minor (kuruş) + ISO 4217 → "1.500,00 ₺"
    money(amountMinor, currency, options) {
      const value = Number(amountMinor) / 100;
      if (!Number.isFinite(value)) return '—';
      const o = options || {};
      return new Intl.NumberFormat(LOCALE, {
        style: 'currency',
        currency: currency || 'TRY',
        minimumFractionDigits: o.decimals === undefined ? (value % 1 === 0 ? 0 : 2) : o.decimals,
        maximumFractionDigits: o.decimals === undefined ? 2 : o.decimals
      }).format(value);
    },
    date(iso, options) {
      const d = iso instanceof Date ? iso : new Date(iso);
      if (Number.isNaN(d.getTime())) return '';
      return new Intl.DateTimeFormat(LOCALE, Object.assign({ timeZone: TIME_ZONE, day: 'numeric', month: 'long', year: 'numeric' }, options)).format(d);
    },
    time(iso) {
      const d = iso instanceof Date ? iso : new Date(iso);
      if (Number.isNaN(d.getTime())) return '';
      return new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
    },
    dateTime(iso) {
      const date = format.date(iso, { weekday: 'long' });
      return date ? date + ' · ' + format.time(iso) : '';
    },
    fullName(user) {
      return [user && user.first_name, user && user.last_name].filter(Boolean).join(' ').trim();
    },
    initials(name) {
      return String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2)
        .map(part => part.charAt(0).toLocaleUpperCase(LOCALE)).join('');
    }
  };

  // ─── Ortak UI yardımcıları ─────────────────────────────────────────────────
  // Görsel dil: theme.css'teki .api-alert / .api-field-error (giriş ekranının mevcut
  // uyarı kutusu ve alan hatası stilinin aynısı). Yeni bileşen icat edilmez.
  const originalContent = new WeakMap();

  function resolve(target) {
    if (!target) return null;
    return typeof target === 'string' ? document.querySelector(target) : target;
  }

  function errorMessage(error, fallback) {
    if (error instanceof ApiError) return error.userMessage;
    return fallback || STATUS_MESSAGES[500];
  }

  const ui = {
    // Butonu/kapsayıcıyı yükleniyor durumuna alır. Buton metni opsiyonel olarak değişir.
    setLoading(target, loading, options) {
      const el = resolve(target);
      if (!el) return;
      const o = options || {};
      if (loading) {
        el.setAttribute('aria-busy', 'true');
        if ('disabled' in el) {
          if (!originalContent.has(el)) originalContent.set(el, { html: el.innerHTML, disabled: el.disabled });
          el.disabled = true;
          if (o.text) el.textContent = o.text;
        }
      } else {
        el.removeAttribute('aria-busy');
        const saved = originalContent.get(el);
        if (saved) {
          el.innerHTML = saved.html;
          el.disabled = saved.disabled;
          originalContent.delete(el);
        }
      }
    },

    // fn çalışırken target yükleniyor durumundadır; hata yeniden fırlatılır.
    async withLoading(target, fn, options) {
      ui.setLoading(target, true, options);
      try {
        return await fn();
      } finally {
        ui.setLoading(target, false);
      }
    },

    // Hata mesajını gösterir. target: .api-alert öğesi ya da içine/önüne uyarı eklenecek kapsayıcı.
    // options.position: 'prepend' (varsayılan) | 'append' | 'before' | 'after'
    showError(target, error, options) {
      const o = options || {};
      const host = resolve(target);
      const message = typeof error === 'string' ? error : errorMessage(error, o.fallback);
      if (!host) {
        console.error('Hata mesajı için alan bulunamadı:', message);
        return null;
      }
      let alert = host.matches('.api-alert, [data-api-alert]') ? host : null;
      if (!alert) {
        alert = o.position === 'before' ? host.previousElementSibling
          : o.position === 'after' ? host.nextElementSibling
            : host.querySelector(':scope > .api-alert');
        if (!alert || !alert.matches('.api-alert')) {
          alert = document.createElement('p');
          alert.className = 'api-alert';
          if (o.position === 'before') host.insertAdjacentElement('beforebegin', alert);
          else if (o.position === 'after') host.insertAdjacentElement('afterend', alert);
          else if (o.position === 'append') host.appendChild(alert);
          else host.prepend(alert);
        }
      }
      alert.setAttribute('role', 'alert');
      alert.setAttribute('aria-live', 'polite');
      alert.classList.toggle('api-alert--info', o.tone === 'info');
      alert.textContent = message;
      alert.hidden = false;
      alert.classList.remove('hidden');
      return alert;
    },

    clearError(target) {
      const host = resolve(target);
      if (!host) return;
      const alerts = host.matches('.api-alert, [data-api-alert]') ? [host]
        : [host.querySelector(':scope > .api-alert'), host.previousElementSibling, host.nextElementSibling]
          .filter(el => el && el.matches('.api-alert'));
      alerts.forEach(alert => { alert.textContent = ''; alert.hidden = true; });
    },

    message: errorMessage,
    fieldMessage,

    // 422/weak_password `fields` → form alanları. Alan bulma sırası:
    // options.map[alan] seçicisi → [name=alan] → #alan. Hata öğesi: #<id>-error,
    // [data-error-for=alan] veya alanın hemen ardına eklenen .api-field-error.
    // Eşleşmeyen alan adları dizisi döner (sayfa bunları genel uyarıda gösterebilir).
    applyFieldErrors(form, error, options) {
      const root = resolve(form) || document;
      const o = options || {};
      const fields = error instanceof ApiError ? error.fields : (error || {});
      ui.clearFieldErrors(root);
      const unmatched = [];
      let first = null;
      Object.entries(fields).forEach(([name, value]) => {
        const selector = o.map && o.map[name];
        let input = selector ? root.querySelector(selector) : null;
        if (!input) input = root.querySelector(`[name="${CSS.escape(name)}"]`) || root.querySelector('#' + CSS.escape(name));
        if (!input) { unmatched.push(name); return; }
        const text = (o.messages && o.messages[name]) || fieldMessage(value);
        input.setAttribute('aria-invalid', 'true');
        let holder = (input.id && root.querySelector('#' + CSS.escape(input.id + '-error'))) ||
          root.querySelector(`[data-error-for="${CSS.escape(name)}"]`);
        if (!holder) {
          holder = document.createElement('p');
          holder.className = 'api-field-error';
          holder.dataset.apiFieldError = 'true';
          (input.closest('[data-field]') || input).insertAdjacentElement('afterend', holder);
        }
        if (holder.id) input.setAttribute('aria-describedby', holder.id);
        holder.textContent = text;
        holder.hidden = false;
        holder.classList.remove('hidden');
        if (!first) first = input;
      });
      if (first && o.focus !== false) first.focus();
      return unmatched;
    },

    clearFieldErrors(form) {
      const root = resolve(form) || document;
      root.querySelectorAll('[aria-invalid="true"]').forEach(input => input.removeAttribute('aria-invalid'));
      root.querySelectorAll('[data-api-field-error]').forEach(node => node.remove());
      root.querySelectorAll('[id$="-error"], [data-error-for]').forEach(node => {
        if (node.matches('.api-alert')) return;
        node.textContent = '';
        node.classList.add('hidden');
      });
    }
  };

  window.Api = Object.freeze({
    config: Object.freeze({ baseUrl: BASE_URL, timeoutMs: DEFAULT_TIMEOUT, uploadTimeoutMs: UPLOAD_TIMEOUT, aiTimeoutMs: AI_TIMEOUT, locale: LOCALE, timeZone: TIME_ZONE }),
    ROLES,
    LOGIN_PAGES,
    HOME_PAGES,
    MAX_FILE_BYTES,
    ApiError,
    pageName,
    pageRole,
    safeReturnPath,
    currentReturnPath,
    redirectToLogin,
    // oturum
    getToken,
    hasSession,
    getUser,
    clearSession,
    // istekler
    request,
    get,
    post,
    put,
    patch,
    del,
    confirm,
    newIdempotencyKey,
    page,
    paginate,
    listAll,
    upload,
    download,
    validateFile,
    auth,
    format,
    ui
  });
})();
