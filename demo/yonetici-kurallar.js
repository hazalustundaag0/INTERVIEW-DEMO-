// yonetici-kurallar.js: Takip sorusu kuralları (/admin/follow-up-rules) ve YZ istem zinciri (/admin/prompt-configs)
// GAP-Y02 (K75): liste ucu adımları döndürmez (steps: []); seçili sürümün adımları GET /admin/prompt-configs/{id} ile alınır.
// GAP-Y03 (K74): "yeni sürüm" isteği kaynağın description, rule_set ve parameters alanlarını da gönderir; copy_from
// sunucuda yalnız adımları kopyalayabilir, uydurmayı önleme kuralları sessizce kaybolmamalı.
(function () {
  var Y = window.Yonetici, e = Y.e, api = window.YoneticiAPI;
  var y, sekme = new URLSearchParams(location.search).get('sekme') === 'istem' ? 'istem' : 'takip';
  var kurallar = [], configler = [], seciliConfig = null, detay = null;

  // Bilinen istem parametreleri (backend seed: ai_prompt_configs.parameters)
  var PARAMETRE = [
    ['max_consecutive_follow_ups', 'Ardışık en fazla takip sorusu', 'number', 0, 2],
    ['info_needed_marker', 'Eksik bilgi etiketi', 'text'],
    ['story_word_min', 'Hikâye en az kelime', 'number', 1, 2000],
    ['story_word_max', 'Hikâye en çok kelime', 'number', 1, 2000],
    ['timeout_seconds', 'YZ zaman aşımı (sn)', 'number', 5, 300],
    ['max_retries', 'Otomatik yeniden deneme', 'number', 0, 5]
  ];
  function aralikMetni(v) { return v && typeof v === 'object' && 'min' in v ? v.min + '–' + v.max : (v === null || v === undefined ? '—' : String(v)); }

  // ---------------- Takip kuralları ----------------
  function kuralGovdesi(r, degisen) {
    return Object.assign({ rule_key: r.rule_key, name: r.name, trigger_definition: r.trigger_definition, follow_up_template: r.follow_up_template, priority: r.priority, is_active: r.is_active }, degisen || {});
  }

  function takipCiz(kok) {
    var etkin = configler.find(function (c) { return c.is_active; });
    var maks = etkin && etkin.parameters ? etkin.parameters.max_consecutive_follow_ups : null;
    kok.innerHTML =
      '<div class="adm-note"><span class="material-symbols-outlined" aria-hidden="true">info</span><span>YZ her cevabı okur ve aşağıdaki durumlardan biri varsa tek bir takip sorusu sorar. Öncelik numarası küçük olan kural önce değerlendirilir. ' +
        'Ardışık en fazla <b>' + (maks === null || maks === undefined ? '—' : e(maks)) + '</b> takip sorusu sorulur (etkin istem yapılandırmasından); aday “bilmiyorum” derse ısrar edilmez.</span></div>' +
      '<div class="adm-card">' + (kurallar.length ? '<div class="adm-table-wrap"><table class="adm-table"><thead><tr><th class="adm-num">Öncelik</th><th>Durum</th><th>Tetikleyici</th><th>Takip sorusu</th><th>Aktif</th><th><span class="adm-sr">İşlemler</span></th></tr></thead><tbody>' +
        kurallar.map(function (r) {
          return '<tr><td class="adm-num">' + r.priority + '</td>' +
            '<td><div class="adm-cell-main">' + e(r.name) + '</div><div class="adm-mono adm-cell-sub">' + e(r.rule_key) + '</div></td>' +
            '<td style="min-width:220px;max-width:340px">' + e(r.trigger_definition) + '</td>' +
            '<td style="min-width:200px;max-width:300px"><i>“' + e(r.follow_up_template) + '”</i></td>' +
            '<td>' + Y.anahtar('is_active', r.is_active, r.is_active ? 'Aktif' : 'Pasif', ' data-kural-aktif="' + e(r.id) + '"') + '</td>' +
            '<td class="adm-actions-cell"><button type="button" class="adm-icon-btn" data-kural="' + e(r.id) + '" aria-label="' + e(r.name) + ' düzenle"><span class="material-symbols-outlined" aria-hidden="true">edit</span></button></td></tr>';
        }).join('') + '</tbody></table></div>' : Y.bos('Henüz kural yok.')) + '</div>';
  }

  function kuralFormu(r) {
    var yeni = !r;
    Y.modal({
      baslik: yeni ? 'Yeni takip kuralı' : 'Kuralı düzenle',
      alanEtiketleri: { rule_key: 'Anahtar', name: 'Durum adı', trigger_definition: 'Tetikleyici', follow_up_template: 'Takip sorusu', priority: 'Öncelik' },
      govde:
        '<div class="adm-row">' +
          Y.alan('Durum adı', '<input class="adm-input" id="r-name" name="name" required value="' + e(r ? r.name : '') + '" placeholder="Ör. Belirsiz sonuç">', null, 'r-name') +
          Y.alan('Anahtar', '<input class="adm-input adm-mono" id="r-key" name="rule_key" required value="' + e(r ? r.rule_key : '') + '" placeholder="vague_result">', null, 'r-key') +
        '</div>' +
        Y.alan('Tetikleyici tanımı', '<textarea class="adm-input" id="r-trg" name="trigger_definition" required>' + e(r ? r.trigger_definition : '') + '</textarea>', 'YZ\'nin cevapta neyi arayacağını sade bir dille yaz.', 'r-trg') +
        Y.alan('Takip sorusu şablonu', '<input class="adm-input" id="r-tpl" name="follow_up_template" required value="' + e(r ? r.follow_up_template : '') + '">', 'Değişkenler süslü parantezle yazılır, ör. {cv_value}.', 'r-tpl') +
        '<div class="adm-row">' +
          Y.alan('Öncelik', '<input class="adm-input" id="r-pri" name="priority" type="number" value="' + (r ? r.priority : (kurallar.reduce(function (m, x) { return Math.max(m, x.priority); }, 0) + 10)) + '">', 'Küçük sayı önce değerlendirilir.', 'r-pri') +
          '<div class="adm-field" style="justify-content:flex-end">' + Y.anahtar('is_active', r ? r.is_active : true, 'Aktif') + '</div>' +
        '</div>',
      kaydet: function (kutu) {
        var v = Y.formVerisi(kutu);
        var g = { rule_key: v.rule_key.trim(), name: v.name.trim(), trigger_definition: v.trigger_definition.trim(), follow_up_template: v.follow_up_template.trim(), priority: parseInt(v.priority, 10) || 0, is_active: v.is_active };
        var istek = yeni ? api.post('/admin/follow-up-rules', g) : api.put('/admin/follow-up-rules/' + encodeURIComponent(r.id), g);
        return istek.then(function () { Y.bildirim(yeni ? 'Kural eklendi.' : 'Kural güncellendi.'); return yukle(); });
      }
    });
  }

  // ---------------- İstem zinciri ----------------
  function durumRozet(c) {
    if (c.is_active) return Y.rozet('Etkin', 'success');
    if (c.published_at) return Y.rozet('Yayında', 'info');
    return Y.rozet('Taslak', 'warning');
  }

  // Seçili sürüm kimliği: önce kullanıcı seçimi, yoksa etkin sürüm, yoksa ilk sürüm.
  function seciliKimlik() {
    var c = configler.find(function (x) { return x.id === seciliConfig; }) || configler.find(function (x) { return x.is_active; }) || configler[0];
    return c ? c.id : null;
  }

  function istemCiz(kok) {
    var c = seciliC();
    var surumler = configler.slice().sort(function (a, b) { return a.name.localeCompare(b.name) || b.version - a.version; }).map(function (x) {
      return '<li><button type="button" data-config="' + e(x.id) + '"' + (c && x.id === c.id ? ' aria-current="true"' : '') + '><span>' + e(x.name) + ' v' + x.version + '</span>' + durumRozet(x) + '</button></li>';
    }).join('');
    var detayHtml = Y.bos('Henüz istem yapılandırması yok.');
    if (c) {
      var taslak = !c.published_at;
      var p = c.parameters || {};
      var bilinen = PARAMETRE.map(function (x) { return x[0]; });
      var diger = Object.keys(p).filter(function (k) { return bilinen.indexOf(k) === -1; });
      detayHtml =
        '<div class="adm-card-head"><div><h2>' + e(c.name) + ' · v' + c.version + ' ' + durumRozet(c) + '</h2><p>' + e(c.description || 'Açıklama yok') + '</p>' +
          '<p>' + (c.published_at ? 'Yayın: ' + Y.tarih(c.published_at) : 'Oluşturma: ' + Y.tarih(c.created_at)) + (c.steps ? ' · ' + c.steps.length + ' adım' : '') + '</p></div>' +
          '<div class="adm-page-actions">' +
            (taslak
              ? '<button type="button" class="adm-btn adm-btn--sm" data-istem="duzenle"><span class="material-symbols-outlined" aria-hidden="true">tune</span>Kurallar ve parametreler</button>' +
                '<button type="button" class="adm-btn adm-btn--sm" data-istem="yayinla">Yayınla</button>' +
                '<button type="button" class="adm-btn adm-btn--primary adm-btn--sm" data-istem="etkinlestir">Yayınla ve etkinleştir</button>'
              : '<button type="button" class="adm-btn adm-btn--sm" data-istem="yeni-surum"><span class="material-symbols-outlined" aria-hidden="true">content_copy</span>Düzenlemek için yeni sürüm</button>' +
                (c.is_active ? '<button type="button" class="adm-btn adm-btn--danger adm-btn--sm" data-istem="devre-disi">Devre dışı bırak</button>' : '<button type="button" class="adm-btn adm-btn--primary adm-btn--sm" data-istem="etkinlestir">Etkinleştir</button>')) +
          '</div></div>' +
        (taslak ? '' : '<div class="adm-note" style="margin:1rem 1.25rem 0"><span class="material-symbols-outlined" aria-hidden="true">lock</span><span>Yayınlanan yapılandırma değiştirilemez. Değişiklik için yeni sürüm aç.</span></div>') +
        '<div class="adm-card-body"><div class="adm-grid adm-grid--2">' +
          '<div><div class="adm-label" style="margin-bottom:.4rem">Uydurmayı önleme kuralları</div><div class="adm-list-text" style="background:var(--theme-card-subtle);border-radius:10px;padding:.8rem 1rem;color:var(--text-primary)">' + e(c.rule_set || '—') + '</div></div>' +
          '<div><div class="adm-label" style="margin-bottom:.4rem">Parametreler</div><dl class="adm-dl" style="grid-template-columns:minmax(0,1fr) auto">' +
            PARAMETRE.map(function (x) { return '<dt>' + e(x[1]) + '</dt><dd class="adm-mono">' + e(aralikMetni(p[x[0]])) + '</dd>'; }).join('') +
            diger.map(function (k) { return '<dt class="adm-mono">' + e(k) + '</dt><dd class="adm-mono">' + e(aralikMetni(p[k])) + '</dd>'; }).join('') +
          '</dl></div>' +
        '</div></div>' +
        '<div class="adm-card-head" style="border-top:1px solid var(--theme-border)"><div><h2>İstem adımları</h2><p>YZ bu adımları sırayla çalıştırır.</p></div>' +
          (taslak ? '<button type="button" class="adm-btn adm-btn--sm" data-istem="adim-ekle"><span class="material-symbols-outlined" aria-hidden="true">add</span>Adım ekle</button>' : '') + '</div>' +
        (!c.steps ? Y.bos('Adımlar yüklenemedi.') : c.steps.length ? '<ul class="adm-list">' + c.steps.slice().sort(function (a, b) { return a.step_no - b.step_no; }).map(function (s) {
          return '<li><span class="adm-list-index">' + s.step_no + '</span><div class="adm-list-body"><div class="adm-list-title">' + e(s.title) + ' <span class="adm-mono adm-cell-sub">' + e(s.step_key) + '</span></div><div class="adm-list-text">' + e(s.prompt_text) + '</div></div>' +
            (taslak ? '<div class="adm-list-actions"><button type="button" class="adm-icon-btn" data-adim="' + e(s.id) + '" aria-label="' + s.step_no + '. adımı düzenle"><span class="material-symbols-outlined" aria-hidden="true">edit</span></button>' +
              '<button type="button" class="adm-icon-btn" data-adim-sil="' + e(s.id) + '" aria-label="' + s.step_no + '. adımı sil"><span class="material-symbols-outlined" aria-hidden="true">delete</span></button></div>' : '') + '</li>';
        }).join('') + '</ul>' : Y.bos('Adım yok.'));
    }
    kok.innerHTML = '<div class="adm-grid" style="grid-template-columns:minmax(220px,280px) minmax(0,1fr);align-items:start" data-izgara>' +
      '<div class="adm-card"><div class="adm-card-head"><div><h2>Sürümler</h2></div></div><ul class="adm-select-list">' + surumler + '</ul></div>' +
      '<div class="adm-card">' + detayHtml + '</div></div>';
    if (window.matchMedia('(max-width: 860px)').matches) kok.querySelector('[data-izgara]').style.gridTemplateColumns = 'minmax(0,1fr)';
  }

  // Detay (adımlarıyla) yüklendiyse onu, yoksa liste kaydını (steps: null → "yüklenemedi") döner.
  function seciliC() {
    if (detay && detay.id === seciliConfig) return detay;
    var c = configler.find(function (x) { return x.id === seciliConfig; });
    return c ? Object.assign({}, c, { steps: null }) : null;
  }

  function detayYukle() {
    seciliConfig = seciliKimlik();
    if (!seciliConfig) { detay = null; return Promise.resolve(); }
    var id = seciliConfig;
    return api.get('/admin/prompt-configs/' + encodeURIComponent(id)).then(function (d) {
      if (seciliConfig === id) detay = d;
    });
  }

  // Parametre nesnelerini anahtar sırasından bağımsız karşılaştırır (GAP-Y03 kopya doğrulaması).
  function ayni(a, b) {
    if (a === b) return true;
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
    var ka = Object.keys(a), kb = Object.keys(b);
    return ka.length === kb.length && ka.every(function (k) { return ayni(a[k], b[k]); });
  }

  var KONFIG_ETIKET = { rule_set: 'Uydurmayı önleme kuralları', parameters: 'Parametreler', description: 'Açıklama', name: 'Ad' };
  function istemHatasi(h) { Y.hataGoster(Y.alanHatalari(h, KONFIG_ETIKET)); }

  function configDuzenle(c) {
    var p = c.parameters || {};
    Y.modal({
      baslik: c.name + ' v' + c.version + ' · kurallar ve parametreler',
      govde:
        Y.alan('Açıklama', '<input class="adm-input" id="c-desc" name="description" value="' + e(c.description || '') + '">', null, 'c-desc') +
        Y.alan('Uydurmayı önleme kuralları', '<textarea class="adm-input" id="c-rules" name="rule_set" style="min-height:200px">' + e(c.rule_set || '') + '</textarea>', 'Her satır bir kural. YZ\'ye her çağrıda bu kurallar verilir.', 'c-rules') +
        '<div class="adm-row">' + PARAMETRE.map(function (x) {
          var id = 'c-' + x[0];
          return Y.alan(x[1], '<input class="adm-input" id="' + id + '" name="p_' + x[0] + '" type="' + x[2] + '"' + (x[2] === 'number' ? ' min="' + x[3] + '" max="' + x[4] + '"' : '') + ' value="' + e(p[x[0]] === undefined ? '' : p[x[0]]) + '">', null, id);
        }).join('') + '</div>' +
        '<p class="adm-hint" style="margin:1rem 0 0">Diğer parametreler (özet cümle sayısı, mülakat cevabı adedi vb.) olduğu gibi korunur.</p>',
      kaydet: function (kutu) {
        var v = Y.formVerisi(kutu);
        var yeniP = JSON.parse(JSON.stringify(p));
        var hata = null;
        PARAMETRE.forEach(function (x) {
          var ham = v['p_' + x[0]];
          if (ham === '' || ham === undefined) { delete yeniP[x[0]]; return; }
          if (x[2] === 'number') {
            var n = Number(ham);
            if (!Number.isInteger(n) || n < x[3] || n > x[4]) hata = x[1] + ' ' + x[3] + ' ile ' + x[4] + ' arasında bir tam sayı olmalı.';
            yeniP[x[0]] = n;
          } else {
            yeniP[x[0]] = ham.trim();
          }
        });
        if (!hata && yeniP.story_word_min && yeniP.story_word_max && yeniP.story_word_min >= yeniP.story_word_max) hata = 'Hikâye en az kelime, en çok kelimeden küçük olmalı.';
        if (hata) return Promise.reject(new Error(hata));
        return api.put('/admin/prompt-configs/' + encodeURIComponent(c.id), { name: c.name, description: v.description.trim() || null, rule_set: v.rule_set.trim(), parameters: yeniP })
          .then(function () { Y.bildirim('Yapılandırma kaydedildi.'); return yukle(); });
      }
    });
  }

  function adimFormu(c, s) {
    var yeni = !s;
    Y.modal({
      baslik: yeni ? 'Adım ekle' : s.step_no + '. adımı düzenle',
      alanEtiketleri: { step_no: 'Sıra', step_key: 'Anahtar', title: 'Başlık', prompt_text: 'İstem metni' },
      govde:
        '<div class="adm-row">' +
          Y.alan('Başlık', '<input class="adm-input" id="s-title" name="title" required value="' + e(s ? s.title : '') + '">', null, 's-title') +
          Y.alan('Anahtar', '<input class="adm-input adm-mono" id="s-key" name="step_key" required value="' + e(s ? s.step_key : '') + '">', null, 's-key') +
        '</div>' +
        Y.alan('İstem metni', '<textarea class="adm-input" id="s-text" name="prompt_text" required style="min-height:160px">' + e(s ? s.prompt_text : '') + '</textarea>', null, 's-text') +
        Y.alan('Sıra', '<input class="adm-input" id="s-no" name="step_no" type="number" min="1" required value="' + (s ? s.step_no : c.steps.reduce(function (m, x) { return Math.max(m, x.step_no); }, 0) + 1) + '" style="max-width:120px">', null, 's-no'),
      kaydet: function (kutu) {
        var v = Y.formVerisi(kutu);
        var g = { step_no: parseInt(v.step_no, 10), step_key: v.step_key.trim(), title: v.title.trim(), prompt_text: v.prompt_text.trim() };
        var istek = yeni ? api.post('/admin/prompt-configs/' + encodeURIComponent(c.id) + '/steps', g) : api.put('/admin/prompt-steps/' + encodeURIComponent(s.id), g);
        return istek.then(function () { Y.bildirim(yeni ? 'Adım eklendi.' : 'Adım güncellendi.'); return yukle(); });
      }
    });
  }

  function istemEylem(ad) {
    var c = seciliC();
    var yol = '/admin/prompt-configs/' + encodeURIComponent(c.id);
    if (ad === 'duzenle') return configDuzenle(c);
    if (ad === 'adim-ekle') { if (!c.steps) return; return adimFormu(c, null); }
    if (ad === 'yeni-surum') {
      return Y.onay('Yeni sürüm oluştur', [Y.vurgu(c.name + ' v' + c.version), ' kuralları, parametreleri ve adımları kopyalanarak yeni bir taslak açılacak. Etkinleştirene kadar hikâye motoru mevcut sürümle çalışır.'], 'Taslak oluştur').then(function (tamam) {
        if (!tamam) return;
        var govde = { name: c.name, copy_from: c.id, description: c.description || null, rule_set: c.rule_set || '', parameters: c.parameters || {} };
        return api.post('/admin/prompt-configs', govde).then(function (r) {
          seciliConfig = r.id;
          if ((r.rule_set || '') !== govde.rule_set || !ayni(r.parameters || {}, govde.parameters)) {
            Y.bildirim('v' + r.version + ' taslağı oluşturuldu ancak kurallar/parametreler kaynakla aynı değil. Yayınlamadan önce "Kurallar ve parametreler"i kontrol et.', true);
          } else {
            Y.bildirim('v' + r.version + ' taslağı oluşturuldu; kurallar, parametreler ve adımlar kopyalandı.');
          }
          return yukle();
        });
      }).catch(istemHatasi);
    }
    if (ad === 'yayinla' || ad === 'etkinlestir') {
      var aktif = ad === 'etkinlestir';
      var mevcut = configler.find(function (x) { return x.name === c.name && x.is_active && x.id !== c.id; });
      // BR-01: uydurmayı önleme kuralları boş bir yapılandırma yayınlanmaz (sunucu da 422 ile reddedebilir).
      if (!/\p{L}/u.test(String(c.rule_set || ''))) return Y.bildirim('Uydurmayı önleme kuralları boş. Önce "Kurallar ve parametreler" bölümünden kuralları gir.', true);
      return Y.onay(aktif ? 'Yapılandırmayı etkinleştir' : 'Yapılandırmayı yayınla',
        [c.published_at ? '' : 'Yayınlanan sürüm bir daha değiştirilemez. '].concat(aktif ? ['Bundan sonraki hikâye üretimleri ', Y.vurgu('v' + c.version), ' ile yapılır'].concat(mevcut ? ['; ', Y.vurgu('v' + mevcut.version), ' devre dışı kalır.'] : ['.']) : ['Sürüm yayınlanır ama etkin olmaz.']),
        aktif ? 'Etkinleştir' : 'Yayınla').then(function (tamam) {
        if (!tamam) return;
        return api.post(yol + '/publish', { activate: aktif }).then(function () { Y.bildirim('v' + c.version + (aktif ? ' etkin.' : ' yayınlandı.')); return yukle(); });
      }).catch(istemHatasi);
    }
    if (ad === 'devre-disi') {
      return Y.onay('Devre dışı bırak', ['Etkin istem yapılandırması kalmazsa hikâye üretimi ', Y.vurgu('no_prompt_config'), ' hatasıyla durur. Emin misin?'], 'Devre dışı bırak', true).then(function (tamam) {
        if (!tamam) return;
        return api.post(yol + '/deactivate').then(function () { Y.bildirim('Yapılandırma devre dışı.'); return yukle(); });
      }).catch(istemHatasi);
    }
  }

  // ---------------- Sayfa ----------------
  function ciz() {
    y.icerik.querySelectorAll('[role=tab]').forEach(function (t) {
      var secim = t.dataset.sekme === sekme;
      t.setAttribute('aria-selected', String(secim));
      t.tabIndex = secim ? 0 : -1;
    });
    y.eylemler.innerHTML = sekme === 'takip' ? '<button type="button" class="adm-btn adm-btn--primary" data-yeni-kural><span class="material-symbols-outlined" aria-hidden="true">add</span>Yeni kural</button>' : '';
    var kok = y.icerik.querySelector('[data-panel]');
    if (sekme === 'takip') takipCiz(kok); else istemCiz(kok);
  }

  function yukle() {
    return Promise.all([api.get('/admin/follow-up-rules'), api.get('/admin/prompt-configs')]).then(function (r) {
      kurallar = r[0].items.sort(function (a, b) { return a.priority - b.priority; });
      configler = r[1].items;
      return detayYukle().catch(function (h) { detay = null; Y.hataGoster(h); });
    }).then(ciz);
  }

  Y.sayfa({
    sayfa: 'kurallar',
    baslik: 'Kurallar ve istemler',
    aciklama: 'Hikâye motorunun takip sorusu kuralları ile YZ istem zinciri ve uydurmayı önleme kuralları.',
    ciz: function (yer) {
      y = yer;
      y.icerik.innerHTML =
        '<div class="adm-tabs" role="tablist" aria-label="Kural türü" style="padding:0;margin-bottom:1.25rem">' +
          '<button type="button" role="tab" data-sekme="takip" aria-controls="kural-panel">Takip soruları</button>' +
          '<button type="button" role="tab" data-sekme="istem" aria-controls="kural-panel">İstem zinciri</button>' +
        '</div><div id="kural-panel" role="tabpanel" data-panel style="margin-top:0"></div>';
      y.icerik.querySelector('[role=tablist]').addEventListener('keydown', function (o) {
        if (o.key !== 'ArrowRight' && o.key !== 'ArrowLeft') return;
        sekme = sekme === 'takip' ? 'istem' : 'takip';
        ciz();
        y.icerik.querySelector('[data-sekme="' + sekme + '"]').focus();
      });
      y.eylemler.addEventListener('click', function (o) { if (o.target.closest('[data-yeni-kural]')) kuralFormu(null); });
      y.icerik.addEventListener('click', function (o) {
        var t = o.target.closest('button');
        if (!t) return;
        if (t.dataset.sekme) { sekme = t.dataset.sekme; history.replaceState(null, '', sekme === 'istem' ? '?sekme=istem' : location.pathname); return ciz(); }
        if (t.dataset.kural) return kuralFormu(kurallar.find(function (r) { return r.id === t.dataset.kural; }));
        if (t.dataset.config) {
          seciliConfig = t.dataset.config;
          return detayYukle().catch(function (h) { detay = null; Y.hataGoster(h); }).then(ciz);
        }
        if (t.dataset.istem) return istemEylem(t.dataset.istem);
        if (t.dataset.adim) { var c = seciliC(); var adim = c && c.steps && c.steps.find(function (s) { return s.id === t.dataset.adim; }); return adim ? adimFormu(c, adim) : undefined; }
        if (t.dataset.adimSil) {
          var cc = seciliC(), s = cc && cc.steps && cc.steps.find(function (x) { return x.id === t.dataset.adimSil; });
          if (!s) return;
          Y.onay('Adımı sil', [Y.vurgu(s.step_no + '. adım (' + s.title + ')'), ' bu taslaktan silinecek.'], 'Sil', true).then(function (tamam) {
            if (!tamam) return;
            return api.del('/admin/prompt-configs/' + encodeURIComponent(cc.id) + '/steps/' + encodeURIComponent(s.id)).then(function () { Y.bildirim('Adım silindi.'); return yukle(); });
          }).catch(Y.hataGoster);
        }
      });
      y.icerik.addEventListener('change', function (o) {
        var g = o.target;
        if (!g.dataset.kuralAktif) return;
        var r = kurallar.find(function (x) { return x.id === g.dataset.kuralAktif; });
        var yeniDurum = g.checked;
        // GAP-Y11: pasife alma kısa onay ister (YZ bu durumu artık takip etmez).
        var soru = yeniDurum ? Promise.resolve(true) : Y.onay('Kuralı pasife al', [Y.vurgu(r.name), ' kuralı pasife alınacak; YZ bu durum için artık takip sorusu sormaz.'], 'Pasife al', true);
        soru.then(function (tamam) {
          if (!tamam) { g.checked = !yeniDurum; return; }
          return api.put('/admin/follow-up-rules/' + encodeURIComponent(r.id), kuralGovdesi(r, { is_active: yeniDurum }))
            .then(function () { Y.bildirim(r.name + (yeniDurum ? ' aktif.' : ' pasife alındı.')); return yukle(); });
        }).catch(function (h) { g.checked = !yeniDurum; Y.hataGoster(h); });
      });
      return yukle();
    }
  });
})();
