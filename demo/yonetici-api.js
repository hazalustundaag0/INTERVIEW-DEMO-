// yonetici-api.js: Yönetici panelinin backend ile konuştuğu tek katman.
//
// Sözleşme: Interview-Demo-Backend-Api-Db / backend/api/openapi.yaml (v0.2.0).
//   MOD = 'api'  → istekler TABAN_URL + yol adresine "Authorization: Bearer <token>" ile gider.
//   MOD = 'mock' → aynı yollar tarayıcıdaki demo veriyle (yonetici-veri.js) yanıtlanır; şekiller,
//                  hata gövdeleri (problem+json) ve sayfalama (items/next_cursor) backend ile aynıdır.
//
// Gerçek backend'e geçmek için: sayfadan önce window.YONETICI_API_AYAR = { MOD: 'api', TABAN_URL: 'http://localhost:8080/api/v1' }
// tanımlayın ya da aşağıdaki varsayılanları değiştirin. Backend CORS listesine panelin origin'i eklenmelidir
// (ADMIN_PANEL_URL veya CORS_ALLOWED_ORIGINS).
//
// Backend'de henüz OLMAYAN, panelin beklediği uç nokta:
//   GET /admin/gurus → { items: GuruProfile[] }  (pasifler dahil tüm guru profilleri; bkz. YONETICI-PANELI.md)
(function () {
  var dis = window.YONETICI_API_AYAR || {};
  var AYAR = {
    MOD: dis.MOD || 'mock',
    TABAN_URL: dis.TABAN_URL || 'http://localhost:8080/api/v1',
    OTURUM_ANAHTARI: 'demoYoneticiOturum'
  };

  function Problem(status, code, message, fields) {
    this.name = 'Problem';
    this.status = status;
    this.code = code;
    this.message = message;
    this.fields = fields || null;
  }
  Problem.prototype = Object.create(Error.prototype);

  // ---------------- Oturum ----------------
  function oturumGetir() {
    try {
      var ham = localStorage.getItem(AYAR.OTURUM_ANAHTARI);
      if (!ham) return null;
      var o = JSON.parse(ham);
      if (!o || !o.token || !o.expires_at || Date.parse(o.expires_at) <= Date.now() || !o.user || o.user.role !== 'admin') {
        localStorage.removeItem(AYAR.OTURUM_ANAHTARI);
        return null;
      }
      return o;
    } catch (hata) {
      return null;
    }
  }
  function oturumKaydet(login) {
    try {
      localStorage.setItem(AYAR.OTURUM_ANAHTARI, JSON.stringify({ token: login.token, expires_at: login.expires_at, user: login.user }));
      return true;
    } catch (hata) {
      console.error('Yönetici oturumu kaydedilemedi.', hata);
      return false;
    }
  }
  function oturumSil() {
    try { localStorage.removeItem(AYAR.OTURUM_ANAHTARI); } catch (hata) { /* yok say */ }
  }
  function girisSayfasinaGit() {
    var sayfa = location.pathname.split('/').pop();
    location.href = 'giris-yonetici.html' + (sayfa && sayfa !== 'giris-yonetici.html' ? '?return=' + encodeURIComponent(sayfa) : '');
  }

  // ---------------- Gerçek API ----------------
  function gercekIstek(yontem, yol, govde) {
    var o = oturumGetir();
    var basliklar = { Accept: 'application/json' };
    if (govde !== undefined) basliklar['Content-Type'] = 'application/json';
    if (o) basliklar.Authorization = 'Bearer ' + o.token;
    return fetch(AYAR.TABAN_URL + yol, { method: yontem, headers: basliklar, body: govde !== undefined ? JSON.stringify(govde) : undefined })
      .catch(function () { throw new Problem(0, 'network_error', 'Sunucuya ulaşılamadı. Bağlantınızı kontrol edin.'); })
      .then(function (yanit) {
        return yanit.text().then(function (metin) {
          var veri = null;
          if (metin) { try { veri = JSON.parse(metin); } catch (h) { veri = null; } }
          if (yanit.ok) return veri;
          var p = new Problem(yanit.status, (veri && veri.code) || 'http_' + yanit.status, (veri && veri.message) || 'İstek başarısız oldu.', veri && veri.fields);
          if (yanit.status === 401 && yol !== '/auth/login') { oturumSil(); girisSayfasinaGit(); }
          throw p;
        });
      });
  }

  // ---------------- Mock API ----------------
  var M = (function () {
    function db() { return window.YoneticiVeri.yukle(); }
    function kopya(x) { return x === undefined ? undefined : JSON.parse(JSON.stringify(x)); }
    function simdi() { return new Date().toISOString(); }
    function yeniUuid() {
      var h = Array.from({ length: 32 }, function () { return Math.floor(Math.random() * 16).toString(16); }).join('');
      return h.slice(0, 8) + '-' + h.slice(8, 12) + '-7' + h.slice(13, 16) + '-8' + h.slice(17, 20) + '-' + h.slice(20, 32);
    }
    function hata(status, code, message, fields) { throw new Problem(status, code, message, fields); }
    function bul(liste, id) { var x = liste.find(function (k) { return k.id === id; }); if (!x) hata(404, 'not_found', 'Kayıt bulunamadı.'); return x; }

    function aktor() {
      var o = oturumGetir();
      if (!o) hata(401, 'unauthenticated', 'Oturum geçersiz veya süresi dolmuş. Lütfen tekrar giriş yapın.');
      return o.user;
    }

    function denetim(eylem, varlik, varlikId, eski, yeni) {
      var d = db(), u = oturumGetir();
      d.sayaclar.audit += 1;
      d.audit_logs.push({ id: d.sayaclar.audit, actor_user_id: u ? u.user.id : null, actor_role: u ? 'admin' : null, action: eylem, entity_type: varlik, entity_id: varlikId,
        old_value: eski === undefined ? null : kopya(eski), new_value: yeni === undefined ? null : kopya(yeni), ip: '127.0.0.1', user_agent: navigator.userAgent.slice(0, 120),
        request_id: 'req_mock_' + d.sayaclar.audit, created_at: simdi() });
    }

    // Backend bilinmeyen alanları reddeder (422 validation_failed); mock da aynı davranır.
    function sema(g, izinli, zorunlu) {
      g = g || {};
      var fields = {};
      Object.keys(g).forEach(function (k) { if (izinli.indexOf(k) === -1) fields[k] = 'Bilinmeyen alan.'; });
      (zorunlu || []).forEach(function (k) { if (g[k] === undefined || g[k] === null || (typeof g[k] === 'string' && !g[k].trim())) fields[k] = 'Bu alan zorunludur.'; });
      if (Object.keys(fields).length) hata(422, 'validation_failed', 'Bazı alanlar geçersiz.', fields);
      return g;
    }

    function sayfala(liste, q) {
      var limit = Math.min(100, Math.max(1, parseInt(q.limit || '20', 10) || 20));
      var bas = q.cursor ? parseInt(atob(q.cursor), 10) || 0 : 0;
      var dilim = liste.slice(bas, bas + limit);
      return { items: kopya(dilim), next_cursor: bas + limit < liste.length ? btoa(String(bas + limit)) : null };
    }
    function zamanAraligi(liste, q, alan) {
      return liste.filter(function (x) {
        if (q.from && x[alan] < new Date(q.from).toISOString()) return false;
        if (q.to && x[alan] >= new Date(q.to).toISOString()) return false;
        return true;
      });
    }
    function yeniden(a, b) { return b.created_at.localeCompare(a.created_at) || (b.id > a.id ? 1 : -1); }

    function soruSetiDetay(set) {
      return { question_set: kopya(set), questions: kopya(db().questions.filter(function (q) { return q.question_set_id === set.id; }).sort(function (a, b) { return a.sequence_no - b.sequence_no; })) };
    }
    function yayinda(set) { if (set.published_at) hata(409, 'immutable', 'Bu kayıt artık değiştirilemez.'); }
    function sonrakiSurum(liste, ad) { return liste.filter(function (x) { return x.name === ad; }).reduce(function (m, x) { return Math.max(m, x.version); }, 0) + 1; }
    function epostaGecerli(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || ''); }
    function guruCikti(g) { var u = db().users.find(function (x) { return x.id === g.user_id; }); var c = kopya(g); if (u) { c.first_name = u.first_name; c.last_name = u.last_name; } return c; }
    function sektorleriCoz(ids) {
      return (ids || []).map(function (id) { var s = db().sectors.find(function (x) { return x.id === id; }); if (!s) hata(422, 'validation_failed', 'Bazı alanlar geçersiz.', { sector_ids: 'Bilinmeyen sektör.' }); return kopya(s); });
    }

    var R = [];
    function rota(yontem, desen, fn) { R.push([yontem, new RegExp('^' + desen.replace(/\{[^}]+\}/g, '([^/]+)') + '$'), fn]); }

    // ---- Kimlik
    rota('POST', '/auth/login', function (p, q, g) {
      sema(g, ['email', 'password', 'client_type', 'device_info'], ['email', 'password', 'client_type']);
      var u = db().users.find(function (x) { return x.email.toLowerCase() === String(g.email).trim().toLowerCase(); });
      if (!u || String(g.password).length < 6) hata(401, 'invalid_credentials', 'E-posta veya parola hatalı.');
      if (u.status !== 'active') hata(403, 'account_disabled', 'Hesabınız pasif durumda.');
      if (u.role !== g.client_type) hata(403, 'client_not_allowed', 'Bu hesapla bu uygulamaya giriş yapılamaz.');
      u.last_login_at = simdi();
      return { token: 'idt_mock_' + yeniUuid().replace(/-/g, ''), token_type: 'Bearer', expires_at: new Date(Date.now() + 8 * 3600e3).toISOString(), user: kopya(u) };
    });
    rota('POST', '/auth/logout', function () { return null; });
    rota('GET', '/auth/me', function () { var o = oturumGetir(); aktor(); return { user: kopya(bul(db().users, o.user.id)), client_type: 'admin', token_expires_at: o.expires_at }; });
    rota('GET', '/public/sectors', function () { return { items: kopya(db().sectors.slice().sort(function (a, b) { return a.sort_order - b.sort_order; })) }; });

    // ---- Kullanıcılar ve gurular
    rota('GET', '/admin/users', function (p, q) {
      aktor();
      return sayfala(db().users.filter(function (u) { return !q.role || u.role === q.role; }).sort(yeniden), q);
    });
    rota('PATCH', '/admin/users/{userID}/status', function (p, q, g) {
      var a = aktor();
      sema(g, ['status'], ['status']);
      if (['active', 'passive'].indexOf(g.status) === -1) hata(422, 'validation_failed', 'Bazı alanlar geçersiz.', { status: 'active veya passive olmalı.' });
      var u = bul(db().users, p[0]);
      if (u.id === a.id && g.status === 'passive') hata(409, 'cannot_deactivate_self', 'Kendi hesabınızı pasife alamazsınız.');
      if (u.status !== g.status) { denetim('user.status_changed', 'users', u.id, { status: u.status }, { status: g.status }); u.status = g.status; u.updated_at = simdi(); }
      return kopya(u);
    });
    rota('POST', '/admin/users/{userID}/logout-all', function (p) {
      aktor();
      var u = bul(db().users, p[0]);
      var adet = u.last_login_at ? 1 : 0;
      denetim('user.tokens_revoked', 'users', u.id, null, { revoked_tokens: adet });
      return { revoked_tokens: adet };
    });
    rota('GET', '/admin/gurus', function () { aktor(); return { items: db().guru_profiles.map(guruCikti).sort(yeniden) }; });
    rota('POST', '/admin/gurus', function (p, q, g) {
      aktor();
      sema(g, ['first_name', 'last_name', 'email', 'language', 'title', 'expertise_area', 'seniority', 'short_bio', 'is_active', 'sector_ids'], ['first_name', 'last_name', 'email', 'title', 'expertise_area']);
      if (!epostaGecerli(g.email)) hata(422, 'validation_failed', 'Bazı alanlar geçersiz.', { email: 'Geçerli bir e-posta girin.' });
      var d = db();
      if (d.users.some(function (u) { return u.email.toLowerCase() === g.email.trim().toLowerCase(); })) hata(409, 'email_taken', 'Bu e-posta adresi zaten kayıtlı.');
      var z = simdi();
      var u = { id: yeniUuid(), first_name: g.first_name.trim(), last_name: g.last_name.trim(), email: g.email.trim().toLowerCase(), role: 'guru', status: 'active', preferred_language: g.language || 'tr', email_verified_at: null, password_set: false, last_login_at: null, created_at: z, updated_at: z };
      var gp = { id: yeniUuid(), user_id: u.id, first_name: u.first_name, last_name: u.last_name, title: g.title.trim(), expertise_area: g.expertise_area.trim(), seniority: g.seniority || null, short_bio: g.short_bio || null, is_active: g.is_active !== false, sectors: sektorleriCoz(g.sector_ids), created_at: z, updated_at: z };
      d.users.push(u);
      d.guru_profiles.push(gp);
      denetim('user.guru_created', 'users', u.id, null, { email: u.email, title: gp.title });
      return { user: kopya(u), guru: kopya(gp), invitation_sent: true };
    });
    rota('POST', '/admin/gurus/{userID}/invitation', function (p) {
      aktor();
      var u = bul(db().users, p[0]);
      if (u.role !== 'guru') hata(404, 'not_found', 'Kayıt bulunamadı.');
      if (u.password_set) hata(409, 'password_already_set', 'Parola zaten belirlenmiş; parola sıfırlama akışını kullanın.');
      denetim('user.invitation_resent', 'users', u.id, null, { email: u.email });
      return { status: 'accepted', message: 'Davet e-postası yeniden gönderildi.' };
    });
    rota('PUT', '/admin/gurus/{guruID}', function (p, q, g) {
      aktor();
      sema(g, ['title', 'expertise_area', 'seniority', 'short_bio', 'is_active', 'sector_ids'], ['title', 'expertise_area', 'is_active']);
      var gp = bul(db().guru_profiles, p[0]);
      var eski = kopya(gp);
      gp.title = g.title.trim(); gp.expertise_area = g.expertise_area.trim(); gp.seniority = g.seniority || null; gp.short_bio = g.short_bio || null;
      gp.is_active = !!g.is_active;
      if (g.sector_ids) gp.sectors = sektorleriCoz(g.sector_ids);
      gp.updated_at = simdi();
      denetim('guru_profile.updated', 'guru_profiles', gp.id, { title: eski.title, is_active: eski.is_active }, { title: gp.title, is_active: gp.is_active });
      return guruCikti(gp);
    });

    // ---- Dinamik profil formu
    var ALAN_IZINLI = ['field_key', 'label', 'help_text', 'field_type', 'maps_to_column', 'allows_free_text', 'is_required', 'sort_order', 'is_active'];
    function alanDogrula(g, id) {
      if (!/^[a-z][a-z0-9_]{1,62}$/.test(g.field_key)) hata(422, 'validation_failed', 'Bazı alanlar geçersiz.', { field_key: 'Küçük harf, rakam ve alt çizgi (ör. target_position).' });
      if (['free_text', 'single_choice', 'multi_choice'].indexOf(g.field_type) === -1) hata(422, 'validation_failed', 'Bazı alanlar geçersiz.', { field_type: 'Geçersiz alan türü.' });
      if (g.maps_to_column != null && ['target_position', 'sector', 'seniority', 'participation_reason', 'free_text'].indexOf(g.maps_to_column) === -1) hata(422, 'validation_failed', 'Bazı alanlar geçersiz.', { maps_to_column: 'Geçersiz eşleme.' });
      if (db().profile_fields.some(function (f) { return f.id !== id && f.field_key === g.field_key; })) hata(409, 'conflict', 'Bu alan anahtarı başka bir alanda kullanılıyor.');
    }
    rota('GET', '/admin/profile-fields', function () { aktor(); return { items: kopya(db().profile_fields.slice().sort(function (a, b) { return a.sort_order - b.sort_order; })) }; });
    rota('POST', '/admin/profile-fields', function (p, q, g) {
      aktor();
      sema(g, ALAN_IZINLI, ['field_key', 'label', 'field_type']);
      alanDogrula(g, null);
      var d = db();
      var f = { id: yeniUuid(), field_key: g.field_key, label: g.label.trim(), help_text: g.help_text || null, field_type: g.field_type, maps_to_column: g.maps_to_column || null,
        allows_free_text: !!g.allows_free_text, is_required: !!g.is_required, sort_order: g.sort_order != null ? g.sort_order : d.profile_fields.reduce(function (m, x) { return Math.max(m, x.sort_order); }, 0) + 10,
        is_active: g.is_active !== false, options: [] };
      d.profile_fields.push(f);
      denetim('profile_form_field.changed', 'profile_form_fields', f.id, null, { op: 'create', field_key: f.field_key });
      return kopya(f);
    });
    rota('PUT', '/admin/profile-fields/{fieldID}', function (p, q, g) {
      aktor();
      sema(g, ALAN_IZINLI, ['field_key', 'label', 'field_type', 'is_active']);
      var f = bul(db().profile_fields, p[0]);
      alanDogrula(g, f.id);
      var eski = kopya(f); delete eski.options;
      ALAN_IZINLI.forEach(function (k) { if (g[k] !== undefined) f[k] = g[k]; });
      f.help_text = g.help_text || null;
      f.maps_to_column = g.maps_to_column || null;
      denetim('profile_form_field.changed', 'profile_form_fields', f.id, eski, { op: 'update', field_key: f.field_key });
      return kopya(f);
    });
    rota('POST', '/admin/profile-fields/{fieldID}/options', function (p, q, g) {
      aktor();
      sema(g, ['value', 'label', 'sort_order', 'is_active'], ['value', 'label']);
      var f = bul(db().profile_fields, p[0]);
      if (f.options.some(function (o) { return o.value === g.value; })) hata(409, 'conflict', 'Bu değer bu alanda zaten var.');
      var o = { id: yeniUuid(), field_id: f.id, value: g.value.trim(), label: g.label.trim(), sort_order: g.sort_order != null ? g.sort_order : f.options.reduce(function (m, x) { return Math.max(m, x.sort_order === 999 ? 0 : x.sort_order); }, 0) + 10, is_active: g.is_active !== false };
      f.options.push(o);
      f.options.sort(function (a, b) { return a.sort_order - b.sort_order; });
      denetim('profile_form_field.changed', 'profile_form_fields', f.id, null, { op: 'create_option', value: o.value });
      return kopya(o);
    });
    rota('PUT', '/admin/profile-field-options/{optionID}', function (p, q, g) {
      aktor();
      sema(g, ['value', 'label', 'sort_order', 'is_active'], ['value', 'label']);
      var f = db().profile_fields.find(function (x) { return x.options.some(function (o) { return o.id === p[0]; }); });
      if (!f) hata(404, 'not_found', 'Kayıt bulunamadı.');
      var o = f.options.find(function (x) { return x.id === p[0]; });
      var eski = kopya(o);
      o.value = g.value.trim(); o.label = g.label.trim();
      if (g.sort_order != null) o.sort_order = g.sort_order;
      if (g.is_active !== undefined) o.is_active = !!g.is_active;
      f.options.sort(function (a, b) { return a.sort_order - b.sort_order; });
      denetim('profile_form_field.changed', 'profile_form_fields', f.id, eski, { op: 'update_option', value: o.value, is_active: o.is_active });
      return kopya(o);
    });

    // ---- Soru setleri (yayınlanan sürüm değişmez; düzenleme = yeni sürüm)
    rota('GET', '/admin/question-sets', function () { aktor(); return { items: kopya(db().question_sets.slice().sort(function (a, b) { return a.name.localeCompare(b.name) || b.version - a.version; })) }; });
    rota('POST', '/admin/question-sets', function (p, q, g) {
      aktor();
      sema(g, ['name', 'language', 'description', 'copy_from'], ['name']);
      var d = db(), z = simdi();
      var kaynak = g.copy_from ? bul(d.question_sets, g.copy_from) : null;
      var set = { id: yeniUuid(), name: g.name.trim(), version: sonrakiSurum(d.question_sets, g.name.trim()), language: g.language || 'tr', description: g.description || null, is_active: false, published_at: null, created_at: z, updated_at: z };
      d.question_sets.push(set);
      if (kaynak) d.questions.filter(function (x) { return x.question_set_id === kaynak.id; }).forEach(function (x) { var c = kopya(x); c.id = yeniUuid(); c.question_set_id = set.id; d.questions.push(c); });
      denetim('question_set.changed', 'question_sets', set.id, null, { op: 'create', name: set.name, version: set.version, copied_from: g.copy_from || null });
      return soruSetiDetay(set);
    });
    rota('GET', '/admin/question-sets/{setID}', function (p) { aktor(); return soruSetiDetay(bul(db().question_sets, p[0])); });
    rota('PATCH', '/admin/question-sets/{setID}', function (p, q, g) {
      aktor();
      sema(g, ['description'], []);
      var set = bul(db().question_sets, p[0]);
      var eski = set.description;
      set.description = g.description || null; set.updated_at = simdi();
      denetim('question_set.changed', 'question_sets', set.id, { description: eski }, { op: 'update_description' });
      return kopya(set);
    });
    var SORU_IZINLI = ['sequence_no', 'focus_key', 'focus_label', 'question_text', 'is_required'];
    function soruDogrula(g, setId, haric) {
      sema(g, SORU_IZINLI, ['sequence_no', 'focus_key', 'focus_label', 'question_text']);
      if (!(Number.isInteger(g.sequence_no) && g.sequence_no >= 1)) hata(422, 'validation_failed', 'Bazı alanlar geçersiz.', { sequence_no: 'En az 1 olmalı.' });
      if (db().questions.some(function (x) { return x.question_set_id === setId && x.id !== haric && x.sequence_no === g.sequence_no; })) hata(409, 'conflict', 'Bu sırada başka bir soru var.');
    }
    rota('POST', '/admin/question-sets/{setID}/questions', function (p, q, g) {
      aktor();
      var set = bul(db().question_sets, p[0]);
      yayinda(set);
      soruDogrula(g, set.id, null);
      var s = { id: yeniUuid(), question_set_id: set.id, sequence_no: g.sequence_no, focus_key: g.focus_key.trim(), focus_label: g.focus_label.trim(), question_text: g.question_text.trim(), is_required: g.is_required !== false };
      db().questions.push(s);
      denetim('question_set.changed', 'question_sets', set.id, null, { op: 'create_question', sequence_no: s.sequence_no, focus_key: s.focus_key });
      return kopya(s);
    });
    rota('PUT', '/admin/questions/{questionID}', function (p, q, g) {
      aktor();
      var s = bul(db().questions, p[0]);
      yayinda(bul(db().question_sets, s.question_set_id));
      soruDogrula(g, s.question_set_id, s.id);
      var eski = kopya(s);
      SORU_IZINLI.forEach(function (k) { if (g[k] !== undefined) s[k] = typeof g[k] === 'string' ? g[k].trim() : g[k]; });
      denetim('question_set.changed', 'question_sets', s.question_set_id, eski, { op: 'update_question', question_id: s.id });
      return kopya(s);
    });
    rota('DELETE', '/admin/questions/{questionID}', function (p) {
      aktor();
      var d = db(), s = bul(d.questions, p[0]);
      yayinda(bul(d.question_sets, s.question_set_id));
      d.questions = d.questions.filter(function (x) { return x.id !== s.id; });
      denetim('question_set.changed', 'question_sets', s.question_set_id, kopya(s), { op: 'delete_question', question_id: s.id });
      return null;
    });
    function yayinla(liste, kayit, aktifEt, eylem, varlik, kontrol) {
      if (kontrol) kontrol(kayit);
      var eski = { is_active: kayit.is_active, published_at: kayit.published_at };
      if (!kayit.published_at) kayit.published_at = simdi();
      if (aktifEt) liste.forEach(function (x) { if (x.name === kayit.name && x.id !== kayit.id && (x.language || 'tr') === (kayit.language || 'tr')) x.is_active = false; });
      if (aktifEt) kayit.is_active = true;
      kayit.updated_at = simdi();
      denetim(eylem, varlik, kayit.id, eski, { op: 'publish', activate: !!aktifEt, version: kayit.version });
      return kopya(kayit);
    }
    rota('POST', '/admin/question-sets/{setID}/publish', function (p, q, g) {
      aktor();
      sema(g, ['activate'], []);
      var d = db();
      return yayinla(d.question_sets, bul(d.question_sets, p[0]), g.activate, 'question_set.changed', 'question_sets', function (set) {
        if (!d.questions.some(function (x) { return x.question_set_id === set.id; })) hata(422, 'validation_failed', 'Sorusu olmayan bir set yayınlanamaz.');
      });
    });
    rota('POST', '/admin/question-sets/{setID}/deactivate', function (p) {
      aktor();
      var set = bul(db().question_sets, p[0]);
      set.is_active = false; set.updated_at = simdi();
      denetim('question_set.changed', 'question_sets', set.id, { is_active: true }, { op: 'deactivate' });
      return kopya(set);
    });

    // ---- Takip kuralları
    var KURAL_IZINLI = ['rule_key', 'name', 'trigger_definition', 'follow_up_template', 'priority', 'is_active'];
    rota('GET', '/admin/follow-up-rules', function () { aktor(); return { items: kopya(db().follow_up_rules.slice().sort(function (a, b) { return a.priority - b.priority; })) }; });
    rota('POST', '/admin/follow-up-rules', function (p, q, g) {
      aktor();
      sema(g, KURAL_IZINLI, ['rule_key', 'name', 'trigger_definition', 'follow_up_template']);
      var d = db();
      if (d.follow_up_rules.some(function (r) { return r.rule_key === g.rule_key; })) hata(409, 'conflict', 'Bu kural anahtarı zaten var.');
      var z = simdi();
      var r = { id: yeniUuid(), rule_key: g.rule_key.trim(), name: g.name.trim(), trigger_definition: g.trigger_definition.trim(), follow_up_template: g.follow_up_template.trim(), priority: g.priority || 100, is_active: g.is_active !== false, created_at: z, updated_at: z };
      d.follow_up_rules.push(r);
      denetim('follow_up_rule.changed', 'follow_up_rules', r.id, null, { op: 'create', rule_key: r.rule_key });
      return kopya(r);
    });
    rota('PUT', '/admin/follow-up-rules/{ruleID}', function (p, q, g) {
      aktor();
      sema(g, KURAL_IZINLI, ['rule_key', 'name', 'trigger_definition', 'follow_up_template']);
      var d = db(), r = bul(d.follow_up_rules, p[0]);
      if (d.follow_up_rules.some(function (x) { return x.id !== r.id && x.rule_key === g.rule_key; })) hata(409, 'conflict', 'Bu kural anahtarı zaten var.');
      var eski = kopya(r);
      KURAL_IZINLI.forEach(function (k) { if (g[k] !== undefined) r[k] = typeof g[k] === 'string' ? g[k].trim() : g[k]; });
      r.updated_at = simdi();
      denetim('follow_up_rule.changed', 'follow_up_rules', r.id, eski, { op: 'update', rule_key: r.rule_key, is_active: r.is_active });
      return kopya(r);
    });

    // ---- YZ istem yapılandırmaları (yayınlanan sürüm değişmez)
    rota('GET', '/admin/prompt-configs', function () { aktor(); return { items: kopya(db().prompt_configs.slice().sort(function (a, b) { return a.name.localeCompare(b.name) || b.version - a.version; })) }; });
    rota('POST', '/admin/prompt-configs', function (p, q, g) {
      aktor();
      sema(g, ['name', 'description', 'rule_set', 'parameters', 'copy_from'], ['name']);
      var d = db(), z = simdi();
      var kaynak = g.copy_from ? bul(d.prompt_configs, g.copy_from) : null;
      var c = { id: yeniUuid(), name: g.name.trim(), version: sonrakiSurum(d.prompt_configs, g.name.trim()), description: g.description !== undefined ? g.description : (kaynak ? kaynak.description : null),
        rule_set: g.rule_set !== undefined ? g.rule_set : (kaynak ? kaynak.rule_set : ''), parameters: g.parameters || (kaynak ? kopya(kaynak.parameters) : {}), is_active: false, published_at: null, steps: [], created_at: z, updated_at: z };
      if (kaynak) c.steps = kaynak.steps.map(function (s) { var k = kopya(s); k.id = yeniUuid(); k.config_id = c.id; return k; });
      d.prompt_configs.push(c);
      denetim('prompt_config.changed', 'ai_prompt_configs', c.id, null, { op: 'create', name: c.name, version: c.version, copied_from: g.copy_from || null });
      return kopya(c);
    });
    rota('GET', '/admin/prompt-configs/{configID}', function (p) { aktor(); return kopya(bul(db().prompt_configs, p[0])); });
    rota('PUT', '/admin/prompt-configs/{configID}', function (p, q, g) {
      aktor();
      sema(g, ['name', 'description', 'rule_set', 'parameters'], ['name']);
      var c = bul(db().prompt_configs, p[0]);
      yayinda(c);
      if (g.parameters !== undefined && (typeof g.parameters !== 'object' || Array.isArray(g.parameters) || g.parameters === null)) hata(422, 'validation_failed', 'Bazı alanlar geçersiz.', { parameters: 'JSON nesnesi olmalı.' });
      var eski = { description: c.description, rule_set: c.rule_set, parameters: c.parameters };
      if (g.description !== undefined) c.description = g.description;
      if (g.rule_set !== undefined) c.rule_set = g.rule_set;
      if (g.parameters !== undefined) c.parameters = g.parameters;
      c.updated_at = simdi();
      denetim('prompt_config.changed', 'ai_prompt_configs', c.id, eski, { op: 'update' });
      return kopya(c);
    });
    var ADIM_IZINLI = ['step_no', 'step_key', 'title', 'prompt_text'];
    function adimDogrula(c, g, haric) {
      sema(g, ADIM_IZINLI, ADIM_IZINLI);
      if (!(Number.isInteger(g.step_no) && g.step_no >= 1)) hata(422, 'validation_failed', 'Bazı alanlar geçersiz.', { step_no: 'En az 1 olmalı.' });
      if (c.steps.some(function (s) { return s.id !== haric && s.step_no === g.step_no; })) hata(409, 'conflict', 'Bu sırada başka bir adım var.');
    }
    rota('POST', '/admin/prompt-configs/{configID}/steps', function (p, q, g) {
      aktor();
      var c = bul(db().prompt_configs, p[0]);
      yayinda(c);
      adimDogrula(c, g, null);
      var s = { id: yeniUuid(), config_id: c.id, step_no: g.step_no, step_key: g.step_key.trim(), title: g.title.trim(), prompt_text: g.prompt_text.trim() };
      c.steps.push(s);
      c.steps.sort(function (a, b) { return a.step_no - b.step_no; });
      denetim('prompt_config.changed', 'ai_prompt_configs', c.id, null, { op: 'create_step', step_no: s.step_no });
      return kopya(s);
    });
    rota('PUT', '/admin/prompt-steps/{stepID}', function (p, q, g) {
      aktor();
      var c = db().prompt_configs.find(function (x) { return x.steps.some(function (s) { return s.id === p[0]; }); });
      if (!c) hata(404, 'not_found', 'Kayıt bulunamadı.');
      yayinda(c);
      adimDogrula(c, g, p[0]);
      var s = c.steps.find(function (x) { return x.id === p[0]; });
      var eski = kopya(s);
      ADIM_IZINLI.forEach(function (k) { s[k] = typeof g[k] === 'string' ? g[k].trim() : g[k]; });
      c.steps.sort(function (a, b) { return a.step_no - b.step_no; });
      denetim('prompt_config.changed', 'ai_prompt_configs', c.id, eski, { op: 'update_step', step_no: s.step_no });
      return kopya(s);
    });
    rota('DELETE', '/admin/prompt-configs/{configID}/steps/{stepID}', function (p) {
      aktor();
      var c = bul(db().prompt_configs, p[0]);
      yayinda(c);
      var s = bul(c.steps, p[1]);
      c.steps = c.steps.filter(function (x) { return x.id !== s.id; });
      denetim('prompt_config.changed', 'ai_prompt_configs', c.id, kopya(s), { op: 'delete_step', step_no: s.step_no });
      return null;
    });
    rota('POST', '/admin/prompt-configs/{configID}/publish', function (p, q, g) {
      aktor();
      sema(g, ['activate'], []);
      var d = db();
      return yayinla(d.prompt_configs, bul(d.prompt_configs, p[0]), g.activate, 'prompt_config.changed', 'ai_prompt_configs', function (c) {
        if (!c.steps.length) hata(422, 'validation_failed', 'Adımı olmayan bir yapılandırma yayınlanamaz.');
      });
    });
    rota('POST', '/admin/prompt-configs/{configID}/deactivate', function (p) {
      aktor();
      var c = bul(db().prompt_configs, p[0]);
      c.is_active = false; c.updated_at = simdi();
      denetim('prompt_config.changed', 'ai_prompt_configs', c.id, { is_active: true }, { op: 'deactivate' });
      return kopya(c);
    });

    // ---- Hizmetler, seans şablonları, fiyatlar
    var HIZMET_IZINLI = ['code', 'name', 'description', 'session_count', 'session_duration_minutes', 'is_active', 'sort_order'];
    function hizmetDogrula(g, id) {
      sema(g, HIZMET_IZINLI, ['code', 'name', 'session_count', 'session_duration_minutes']);
      var f = {};
      if (!/^[a-z][a-z0-9_]{1,62}$/.test(g.code)) f.code = 'Küçük harf, rakam ve alt çizgi (ör. sales_story).';
      if (!(Number.isInteger(g.session_count) && g.session_count >= 1)) f.session_count = 'En az 1 olmalı.';
      if (!(Number.isInteger(g.session_duration_minutes) && g.session_duration_minutes >= 1)) f.session_duration_minutes = 'En az 1 olmalı.';
      if (Object.keys(f).length) hata(422, 'validation_failed', 'Bazı alanlar geçersiz.', f);
      if (db().services.some(function (s) { return s.id !== id && s.code === g.code; })) hata(409, 'conflict', 'Bu hizmet kodu zaten kullanılıyor.');
    }
    rota('GET', '/admin/services', function () { aktor(); return { items: kopya(db().services.slice().sort(function (a, b) { return a.sort_order - b.sort_order; })) }; });
    rota('POST', '/admin/services', function (p, q, g) {
      aktor();
      hizmetDogrula(g, null);
      var z = simdi();
      var s = { id: yeniUuid(), code: g.code, name: g.name.trim(), description: g.description || null, session_count: g.session_count, session_duration_minutes: g.session_duration_minutes, is_active: !!g.is_active, sort_order: g.sort_order || 100, created_at: z, updated_at: z };
      db().services.push(s);
      denetim('service_definition.changed', 'service_definitions', s.id, null, { op: 'create', code: s.code });
      return kopya(s);
    });
    rota('PUT', '/admin/services/{serviceID}', function (p, q, g) {
      aktor();
      var s = bul(db().services, p[0]);
      hizmetDogrula(g, s.id);
      var eski = kopya(s);
      HIZMET_IZINLI.forEach(function (k) { if (g[k] !== undefined) s[k] = g[k]; });
      s.description = g.description || null;
      s.updated_at = simdi();
      denetim('service_definition.changed', 'service_definitions', s.id, eski, { op: 'update', code: s.code, is_active: s.is_active, session_count: s.session_count });
      return kopya(s);
    });
    var SABLON_IZINLI = ['sequence_no', 'title', 'purpose', 'output_definition'];
    rota('GET', '/admin/services/{serviceID}/templates', function (p) {
      aktor(); bul(db().services, p[0]);
      return { items: kopya(db().session_templates.filter(function (t) { return t.service_id === p[0]; }).sort(function (a, b) { return a.sequence_no - b.sequence_no; })) };
    });
    rota('POST', '/admin/services/{serviceID}/templates', function (p, q, g) {
      aktor();
      sema(g, SABLON_IZINLI, SABLON_IZINLI);
      var s = bul(db().services, p[0]);
      if (db().session_templates.some(function (t) { return t.service_id === s.id && t.sequence_no === g.sequence_no; })) hata(409, 'conflict', 'Bu sırada bir seans şablonu zaten var.');
      var t = { id: yeniUuid(), service_id: s.id, sequence_no: g.sequence_no, title: g.title.trim(), purpose: g.purpose.trim(), output_definition: g.output_definition.trim() };
      db().session_templates.push(t);
      denetim('session_template.changed', 'service_session_templates', t.id, null, { op: 'create', service_id: s.id, sequence_no: t.sequence_no });
      return kopya(t);
    });
    rota('PUT', '/admin/session-templates/{templateID}', function (p, q, g) {
      aktor();
      sema(g, SABLON_IZINLI, SABLON_IZINLI);
      var t = bul(db().session_templates, p[0]);
      if (db().session_templates.some(function (x) { return x.id !== t.id && x.service_id === t.service_id && x.sequence_no === g.sequence_no; })) hata(409, 'conflict', 'Bu sırada bir seans şablonu zaten var.');
      var eski = kopya(t);
      SABLON_IZINLI.forEach(function (k) { t[k] = typeof g[k] === 'string' ? g[k].trim() : g[k]; });
      denetim('session_template.changed', 'service_session_templates', t.id, eski, { op: 'update' });
      return kopya(t);
    });
    rota('GET', '/admin/services/{serviceID}/prices', function (p) {
      aktor(); bul(db().services, p[0]);
      return { items: kopya(db().prices.filter(function (x) { return x.service_id === p[0]; }).sort(function (a, b) { return b.valid_from.localeCompare(a.valid_from); })) };
    });
    rota('POST', '/admin/services/{serviceID}/prices', function (p, q, g) {
      aktor();
      sema(g, ['amount_minor', 'currency', 'valid_from', 'valid_until', 'note'], ['amount_minor', 'currency']);
      var s = bul(db().services, p[0]);
      if (!(Number.isInteger(g.amount_minor) && g.amount_minor >= 0)) hata(422, 'validation_failed', 'Bazı alanlar geçersiz.', { amount_minor: '0 veya daha büyük bir tam sayı (kuruş) olmalı.' });
      if (!/^[A-Z]{3}$/.test(g.currency)) hata(422, 'validation_failed', 'Bazı alanlar geçersiz.', { currency: 'ISO 4217 kodu (ör. TRY).' });
      var bas = g.valid_from ? new Date(g.valid_from).toISOString() : simdi();
      if (g.valid_until && new Date(g.valid_until).toISOString() <= bas) hata(400, 'invalid_time_range', 'Zaman aralığı geçersiz.');
      var r = { id: yeniUuid(), service_id: s.id, amount_minor: g.amount_minor, currency: g.currency, valid_from: bas, valid_until: g.valid_until ? new Date(g.valid_until).toISOString() : null, note: g.note || null, created_at: simdi() };
      // Yeni kural öncekinin yerini alır: açık uçlu eski kural yeni başlangıçta kapanır.
      db().prices.forEach(function (x) { if (x.service_id === s.id && x.valid_from < bas && (!x.valid_until || x.valid_until > bas)) x.valid_until = bas; });
      db().prices.push(r);
      denetim('pricing_rule.changed', 'pricing_rules', r.id, null, { op: 'create', service_id: s.id, amount_minor: r.amount_minor, currency: r.currency, valid_from: r.valid_from, valid_until: r.valid_until });
      return kopya(r);
    });

    // ---- Kayıtlar (salt okunur)
    rota('GET', '/admin/payments', function (p, q) {
      aktor();
      return sayfala(db().payments.filter(function (x) { return !q.status || x.status === q.status; }).sort(yeniden), q);
    });
    rota('GET', '/admin/payments/{paymentID}', function (p) {
      aktor();
      var pay = bul(db().payments, p[0]);
      return { payment: kopya(pay), attempts: db().payment_attempts.filter(function (a) { return a.payment_id === pay.id; }).map(function (a) { var c = kopya(a); delete c.payment_id; return c; }) };
    });
    rota('GET', '/admin/ai-requests', function (p, q) {
      aktor();
      var liste = zamanAraligi(db().ai_requests, q, 'created_at').filter(function (r) {
        return (!q.request_type || r.request_type === q.request_type) && (!q.story_session_id || r.story_session_id === q.story_session_id);
      }).sort(yeniden);
      return sayfala(liste, q);
    });
    rota('GET', '/admin/ai-costs', function (p, q) {
      aktor();
      var bit = q.to ? new Date(q.to).toISOString() : simdi();
      var bas = q.from ? new Date(q.from).toISOString() : new Date(Date.parse(bit) - 30 * 86400e3).toISOString();
      var liste = zamanAraligi(db().ai_requests, { from: bas, to: bit }, 'created_at');
      var gruplar = {};
      liste.forEach(function (r) {
        var g = gruplar[r.cost_currency] || (gruplar[r.cost_currency] = { cost_currency: r.cost_currency, request_count: 0, error_count: 0, input_tokens: 0, output_tokens: 0, cost_micro: 0, toplamSure: 0 });
        g.request_count++; if (r.status !== 'success') g.error_count++;
        g.input_tokens += r.input_tokens; g.output_tokens += r.output_tokens; g.cost_micro += r.cost_micro; g.toplamSure += r.duration_ms;
      });
      return { from: bas, to: bit, items: Object.keys(gruplar).map(function (k) { var g = gruplar[k]; g.average_duration_ms = Math.round(g.toplamSure / g.request_count); delete g.toplamSure; return g; }) };
    });
    rota('GET', '/admin/audit-logs', function (p, q) {
      aktor();
      var liste = zamanAraligi(db().audit_logs, q, 'created_at').filter(function (l) {
        return (!q.actor_user_id || l.actor_user_id === q.actor_user_id) && (!q.action || l.action === q.action) &&
          (!q.entity_type || l.entity_type === q.entity_type) && (!q.entity_id || l.entity_id === q.entity_id);
      }).sort(yeniden);
      return sayfala(liste, q);
    });

    function istek(yontem, yol, govde) {
      return new Promise(function (coz, reddet) {
        setTimeout(function () {
          try {
            var parca = yol.split('?');
            var q = {};
            new URLSearchParams(parca[1] || '').forEach(function (v, k) { q[k] = v; });
            for (var i = 0; i < R.length; i++) {
              if (R[i][0] !== yontem) continue;
              var m = parca[0].match(R[i][1]);
              if (m) {
                var sonuc = R[i][2](m.slice(1).map(decodeURIComponent), q, kopya(govde) || {});
                if (yontem !== 'GET') window.YoneticiVeri.kaydet();
                coz(sonuc === undefined ? null : sonuc);
                return;
              }
            }
            hata(404, 'route_not_found', 'İstenen adres bulunamadı.');
          } catch (h) {
            if (!(h instanceof Problem)) console.error(h);
            reddet(h instanceof Problem ? h : new Problem(500, 'internal', 'Beklenmeyen bir hata oluştu.'));
          }
        }, 120);
      });
    }
    return { istek: istek };
  })();

  function istek(yontem, yol, govde) {
    var p = AYAR.MOD === 'api' ? gercekIstek(yontem, yol, govde) : M.istek(yontem, yol, govde);
    return p.catch(function (h) {
      if (AYAR.MOD !== 'api' && h.status === 401 && yol !== '/auth/login') { oturumSil(); girisSayfasinaGit(); }
      throw h;
    });
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
        toplam = toplam.concat(y.items);
        if (y.next_cursor && toplam.length < ust) return sayfa(y.next_cursor);
        return toplam;
      });
    }
    return sayfa(null);
  }

  function girisYap(eposta, parola) {
    return istek('POST', '/auth/login', { email: eposta, password: parola, client_type: 'admin', device_info: 'Yönetici paneli (web)' }).then(function (login) {
      if (!login.user || login.user.role !== 'admin') throw new Problem(403, 'client_not_allowed', 'Bu hesapla bu uygulamaya giriş yapılamaz.');
      oturumKaydet(login);
      return login;
    });
  }

  function cikisYap() {
    return istek('POST', '/auth/logout').catch(function () { /* token zaten geçersiz olabilir */ }).then(function () {
      oturumSil();
      location.href = 'giris-yonetici.html';
    });
  }

  window.YoneticiAPI = {
    AYAR: AYAR,
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
    girisYap: girisYap,
    cikisYap: cikisYap
  };
})();
