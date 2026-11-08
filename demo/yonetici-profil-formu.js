// yonetici-profil-formu.js: Dinamik profil formu (GET/POST/PUT /admin/profile-fields, seçenekler)
(function () {
  var Y = window.Yonetici, e = Y.e, api = window.YoneticiAPI;
  var TUR = { free_text: 'Serbest metin', single_choice: 'Tek seçim', multi_choice: 'Çoklu seçim' };
  var ESLEME = { target_position: 'Hedef pozisyon', sector: 'Sektör', seniority: 'Kıdem', participation_reason: 'Katılım nedeni', free_text: 'Serbest metin' };
  var ETIKET = { field_key: 'Anahtar', label: 'Etiket', field_type: 'Tür', maps_to_column: 'Eşleme', value: 'Değer', label_: 'Etiket' };
  var y, alanlar = [], acik = null;

  function slug(metin) {
    var harita = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };
    return String(metin || '').toLocaleLowerCase('tr-TR').replace(/[çğıöşüâîû]/g, function (h) { return harita[h]; })
      .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/^(\d)/, 'f_$1').slice(0, 60);
  }

  // PUT tam gövde ister; yalnız sözleşmedeki alanlar gönderilir.
  function alanGovdesi(f, degisen) {
    var g = { field_key: f.field_key, label: f.label, help_text: f.help_text, field_type: f.field_type, maps_to_column: f.maps_to_column,
      allows_free_text: f.allows_free_text, is_required: f.is_required, sort_order: f.sort_order, is_active: f.is_active };
    return Object.assign(g, degisen || {});
  }
  function secenekGovdesi(o, degisen) {
    return Object.assign({ value: o.value, label: o.label, sort_order: o.sort_order, is_active: o.is_active }, degisen || {});
  }

  function onizleme() {
    var aktif = alanlar.filter(function (f) { return f.is_active; });
    if (!aktif.length) return Y.bos('Aktif alan yok; aday profil formu boş görünür.');
    return '<div class="adm-card-body" aria-label="Aday profil formu önizlemesi">' + aktif.map(function (f) {
      var id = 'on-' + f.id;
      var etiket = e(f.label) + (f.is_required ? ' <span style="color:#b91c1c" aria-hidden="true">*</span>' : '');
      var ops = f.options.filter(function (o) { return o.is_active; });
      var girdi;
      if (f.field_type === 'free_text') girdi = '<textarea class="adm-input" id="' + id + '" disabled placeholder="Aday buraya yazar"></textarea>';
      else if (f.field_type === 'single_choice') girdi = '<select class="adm-input" id="' + id + '" disabled><option>Seç…</option>' + ops.map(function (o) { return '<option>' + e(o.label) + '</option>'; }).join('') + '</select>';
      else girdi = '<div style="display:flex;flex-wrap:wrap;gap:.3rem .9rem">' + ops.map(function (o) { return '<label class="adm-check"><input type="checkbox" disabled>' + e(o.label) + '</label>'; }).join('') + '</div>';
      if (f.field_type !== 'free_text' && f.allows_free_text) girdi += '<input class="adm-input" disabled placeholder="Listede yoksa kendin yaz" style="margin-top:.4rem">';
      return '<div class="adm-field"><label for="' + id + '">' + etiket + '</label>' + girdi + (f.help_text ? '<span class="adm-hint">' + e(f.help_text) + '</span>' : '') + '</div>';
    }).join('') + '</div>';
  }

  function secenekler(f) {
    var liste = f.options.map(function (o, i) {
      return '<li style="padding:.55rem 1.25rem .55rem 3.4rem;align-items:center">' +
        '<div class="adm-list-body"><span class="' + (o.is_active ? '' : 'adm-cell-sub') + '">' + e(o.label) + '</span> <span class="adm-mono adm-cell-sub">' + e(o.value) + '</span></div>' +
        Y.anahtar('is_active', o.is_active, o.is_active ? 'Aktif' : 'Pasif', ' data-secenek-aktif="' + e(o.id) + '" data-alan="' + e(f.id) + '"') +
        '<div class="adm-list-actions">' +
          '<button type="button" class="adm-icon-btn" data-secenek-tasi="-1" data-secenek="' + e(o.id) + '" data-alan="' + e(f.id) + '" aria-label="' + e(o.label) + ' yukarı taşı"' + (i === 0 ? ' disabled' : '') + '><span class="material-symbols-outlined" aria-hidden="true">arrow_upward</span></button>' +
          '<button type="button" class="adm-icon-btn" data-secenek-tasi="1" data-secenek="' + e(o.id) + '" data-alan="' + e(f.id) + '" aria-label="' + e(o.label) + ' aşağı taşı"' + (i === f.options.length - 1 ? ' disabled' : '') + '><span class="material-symbols-outlined" aria-hidden="true">arrow_downward</span></button>' +
          '<button type="button" class="adm-icon-btn" data-secenek-duzenle="' + e(o.id) + '" data-alan="' + e(f.id) + '" aria-label="' + e(o.label) + ' düzenle"><span class="material-symbols-outlined" aria-hidden="true">edit</span></button>' +
        '</div></li>';
    }).join('');
    return '<ul class="adm-list" style="background:var(--theme-card-subtle)">' + liste +
      '<li style="padding:.7rem 1.25rem .7rem 3.4rem"><form data-secenek-ekle="' + e(f.id) + '" style="display:flex;gap:.5rem;flex-wrap:wrap;width:100%">' +
        '<label class="adm-sr" for="yeni-' + e(f.id) + '">Yeni seçenek</label><input class="adm-input" id="yeni-' + e(f.id) + '" name="label" placeholder="Yeni seçenek etiketi" style="flex:1 1 220px">' +
        '<button type="submit" class="adm-btn adm-btn--sm">Ekle</button></form></li></ul>';
  }

  function ciz() {
    var liste = alanlar.map(function (f, i) {
      var secimli = f.field_type !== 'free_text';
      return '<li style="flex-direction:column;gap:0;padding:0"><div style="display:flex;gap:.9rem;align-items:flex-start;padding:.9rem 1.25rem;width:100%;box-sizing:border-box">' +
        '<span class="adm-list-index">' + (i + 1) + '</span>' +
        '<div class="adm-list-body"><div class="adm-list-title">' + e(f.label) + '</div>' +
          '<div class="adm-list-meta"><span class="adm-mono adm-cell-sub">' + e(f.field_key) + '</span>' + Y.rozet(TUR[f.field_type], 'info', true) +
            (f.is_required ? Y.rozet('Zorunlu', 'warning', true) : Y.rozet('Opsiyonel', 'neutral', true)) +
            (f.maps_to_column ? Y.rozet('→ ' + ESLEME[f.maps_to_column], 'neutral', true) : '') +
            (secimli && f.allows_free_text ? Y.rozet('Serbest yanıt açık', 'neutral', true) : '') +
            (f.is_active ? '' : Y.rozet('Pasif', 'neutral')) + '</div>' +
          (secimli ? '<button type="button" class="adm-btn adm-btn--ghost adm-btn--sm" style="margin-top:.35rem;margin-left:-.6rem" data-ac="' + e(f.id) + '" aria-expanded="' + (acik === f.id) + '">' +
            '<span class="material-symbols-outlined" aria-hidden="true">' + (acik === f.id ? 'expand_less' : 'expand_more') + '</span>' + f.options.filter(function (o) { return o.is_active; }).length + ' / ' + f.options.length + ' seçenek</button>' : '') +
        '</div>' +
        '<div class="adm-list-actions">' +
          '<button type="button" class="adm-icon-btn" data-tasi="-1" data-id="' + e(f.id) + '" aria-label="' + e(f.label) + ' yukarı taşı"' + (i === 0 ? ' disabled' : '') + '><span class="material-symbols-outlined" aria-hidden="true">arrow_upward</span></button>' +
          '<button type="button" class="adm-icon-btn" data-tasi="1" data-id="' + e(f.id) + '" aria-label="' + e(f.label) + ' aşağı taşı"' + (i === alanlar.length - 1 ? ' disabled' : '') + '><span class="material-symbols-outlined" aria-hidden="true">arrow_downward</span></button>' +
          '<button type="button" class="adm-icon-btn" data-duzenle="' + e(f.id) + '" aria-label="' + e(f.label) + ' düzenle"><span class="material-symbols-outlined" aria-hidden="true">edit</span></button>' +
        '</div></div>' + (acik === f.id && secimli ? secenekler(f) : '') + '</li>';
    }).join('');
    y.icerik.querySelector('[data-alanlar]').innerHTML = alanlar.length ? '<ul class="adm-list">' + liste + '</ul>' : Y.bos('Henüz alan yok.');
    y.icerik.querySelector('[data-onizleme]').innerHTML = onizleme();
  }

  function yukle() {
    return api.get('/admin/profile-fields').then(function (r) {
      alanlar = r.items.sort(function (a, b) { return a.sort_order - b.sort_order; });
      alanlar.forEach(function (f) { f.options.sort(function (a, b) { return a.sort_order - b.sort_order; }); });
      ciz();
    });
  }

  function alanFormu(f) {
    var yeni = !f;
    var tur = f ? f.field_type : 'single_choice';
    Y.modal({
      baslik: yeni ? 'Yeni alan' : 'Alanı düzenle',
      kaydetMetni: yeni ? 'Ekle' : 'Kaydet',
      alanEtiketleri: ETIKET,
      govde:
        Y.alan('Etiket (adayın gördüğü soru)', '<input class="adm-input" id="pf-label" name="label" required value="' + e(f ? f.label : '') + '">', null, 'pf-label') +
        Y.alan('Anahtar', '<input class="adm-input adm-mono" id="pf-key" name="field_key" required value="' + e(f ? f.field_key : '') + '" pattern="[a-z][a-z0-9_]+">', 'Küçük harf, rakam ve alt çizgi. Kayıtlı cevaplar bu anahtarla saklanır; sonradan değiştirmemek en iyisi.', 'pf-key') +
        Y.alan('Yardım metni', '<input class="adm-input" id="pf-help" name="help_text" value="' + e(f && f.help_text ? f.help_text : '') + '">', null, 'pf-help') +
        '<div class="adm-row">' +
          Y.alan('Tür', '<select class="adm-input" id="pf-type" name="field_type">' + Object.keys(TUR).map(function (k) { return '<option value="' + k + '"' + (k === tur ? ' selected' : '') + '>' + TUR[k] + '</option>'; }).join('') + '</select>', null, 'pf-type') +
          Y.alan('Profil eşlemesi', '<select class="adm-input" id="pf-map" name="maps_to_column"><option value="">Eşleme yok</option>' + Object.keys(ESLEME).map(function (k) { return '<option value="' + k + '"' + (f && f.maps_to_column === k ? ' selected' : '') + '>' + ESLEME[k] + '</option>'; }).join('') + '</select>', 'Cevabın adayın hedef/bağlam kaydında hangi sütuna yazılacağı.', 'pf-map') +
        '</div>' +
        '<div class="adm-field" style="gap:.6rem">' +
          Y.anahtar('is_required', f ? f.is_required : false, 'Zorunlu (randevu öncesi doldurulmalı)') +
          '<span data-serbest>' + Y.anahtar('allows_free_text', f ? f.allows_free_text : false, 'Listede yoksa aday kendisi yazabilsin') + '</span>' +
          Y.anahtar('is_active', f ? f.is_active : true, 'Aktif (formda görünür)') +
        '</div>' +
        (yeni ? '<p class="adm-hint" style="margin:1rem 0 0">Seçimli alanların seçeneklerini kaydettikten sonra listeden eklersin.</p>' : ''),
      acildi: function (kutu) {
        var label = kutu.querySelector('#pf-label'), key = kutu.querySelector('#pf-key'), type = kutu.querySelector('#pf-type'), serbest = kutu.querySelector('[data-serbest]');
        var elle = !yeni;
        key.addEventListener('input', function () { elle = true; });
        label.addEventListener('input', function () { if (!elle) key.value = slug(label.value); });
        function turDegisti() { serbest.hidden = type.value === 'free_text'; }
        type.addEventListener('change', turDegisti);
        turDegisti();
      },
      kaydet: function (kutu) {
        var v = Y.formVerisi(kutu);
        var g = {
          field_key: v.field_key.trim(), label: v.label.trim(), help_text: v.help_text.trim() || null, field_type: v.field_type,
          maps_to_column: v.maps_to_column || null, allows_free_text: v.field_type !== 'free_text' && v.allows_free_text,
          is_required: v.is_required, is_active: v.is_active
        };
        var istek;
        // GAP-Y11: aktif bir alanı pasife alma kısa onay ister.
        if (!yeni && f.is_active && !g.is_active) {
          return Y.onay('Alanı pasife al', [Y.vurgu(f.label), ' alanı adayların profil formundan kalkacak.'], 'Pasife al', true).then(function (tamam) {
            if (!tamam) return false;
            g.sort_order = f.sort_order;
            return api.put('/admin/profile-fields/' + encodeURIComponent(f.id), g).then(function () { Y.bildirim('Alan güncellendi.'); return yukle(); });
          });
        }
        if (yeni) {
          g.sort_order = alanlar.reduce(function (m, x) { return Math.max(m, x.sort_order); }, 0) + 10;
          istek = api.post('/admin/profile-fields', g);
        } else {
          g.sort_order = f.sort_order;
          istek = api.put('/admin/profile-fields/' + encodeURIComponent(f.id), g);
        }
        return istek.then(function (r) {
          Y.bildirim(yeni ? 'Alan eklendi.' : 'Alan güncellendi.');
          if (yeni && r.field_type !== 'free_text') acik = r.id;
          return yukle();
        });
      }
    });
  }

  function alanTasi(id, yon) {
    var i = alanlar.findIndex(function (f) { return f.id === id; });
    var a = alanlar[i], b = alanlar[i + yon];
    if (!a || !b) return;
    // Sıra numaraları eşitse çakışmayı önlemek için yeni değerler üret.
    var sa = b.sort_order, sb = a.sort_order;
    if (sa === sb) { sa = sb + yon; }
    Promise.all([
      api.put('/admin/profile-fields/' + encodeURIComponent(a.id), alanGovdesi(a, { sort_order: sa })),
      api.put('/admin/profile-fields/' + encodeURIComponent(b.id), alanGovdesi(b, { sort_order: sb }))
    ]).then(yukle).catch(Y.hataGoster);
  }

  function secenekTasi(alanId, id, yon) {
    var f = alanlar.find(function (x) { return x.id === alanId; });
    var i = f.options.findIndex(function (o) { return o.id === id; });
    var a = f.options[i], b = f.options[i + yon];
    if (!a || !b) return;
    var sa = b.sort_order, sb = a.sort_order;
    if (sa === sb) sa = sb + yon;
    Promise.all([
      api.put('/admin/profile-field-options/' + encodeURIComponent(a.id), secenekGovdesi(a, { sort_order: sa })),
      api.put('/admin/profile-field-options/' + encodeURIComponent(b.id), secenekGovdesi(b, { sort_order: sb }))
    ]).then(yukle).catch(Y.hataGoster);
  }

  function secenekDuzenle(alanId, id) {
    var f = alanlar.find(function (x) { return x.id === alanId; });
    var o = f.options.find(function (x) { return x.id === id; });
    Y.modal({
      baslik: 'Seçeneği düzenle',
      kucuk: true,
      alanEtiketleri: { value: 'Değer', label: 'Etiket' },
      govde: Y.alan('Etiket', '<input class="adm-input" id="op-label" name="label" required value="' + e(o.label) + '">', null, 'op-label') +
        Y.alan('Değer', '<input class="adm-input adm-mono" id="op-value" name="value" required value="' + e(o.value) + '">', 'Kayıtlı cevaplar bu değerle saklanır; mevcut seçenekte değiştirmemek en iyisi.', 'op-value'),
      kaydet: function (kutu) {
        var v = Y.formVerisi(kutu);
        return api.put('/admin/profile-field-options/' + encodeURIComponent(o.id), secenekGovdesi(o, { label: v.label.trim(), value: v.value.trim() })).then(function () {
          Y.bildirim('Seçenek güncellendi.');
          return yukle();
        });
      }
    });
  }

  Y.sayfa({
    sayfa: 'profil-formu',
    baslik: 'Profil formu',
    aciklama: 'Adayın ödeme sonrası doldurduğu profil formunun alanları ve seçenekleri. Değişiklikler kod gerektirmeden yayına girer.',
    ciz: function (yer) {
      y = yer;
      y.eylemler.innerHTML = '<button type="button" class="adm-btn adm-btn--primary" data-yeni><span class="material-symbols-outlined" aria-hidden="true">add</span>Yeni alan</button>';
      y.eylemler.querySelector('[data-yeni]').addEventListener('click', function () { alanFormu(null); });
      y.icerik.innerHTML =
        '<div class="adm-grid adm-grid--side">' +
          '<div class="adm-card"><div class="adm-card-head"><div><h2>Alanlar</h2><p>Sıra, adayın formda gördüğü sıradır. Alanlar silinmez; kullanılmayacaksa pasife alınır.</p></div></div><div data-alanlar></div></div>' +
          '<div class="adm-card" style="position:sticky;top:1rem"><div class="adm-card-head"><div><h2>Önizleme</h2><p>Adayın göreceği form.</p></div></div><div data-onizleme></div></div>' +
        '</div>';
      y.icerik.addEventListener('click', function (o) {
        var t = o.target.closest('button');
        if (!t) return;
        if (t.dataset.ac) { acik = acik === t.dataset.ac ? null : t.dataset.ac; ciz(); return; }
        if (t.dataset.duzenle) return alanFormu(alanlar.find(function (f) { return f.id === t.dataset.duzenle; }));
        if (t.dataset.tasi) return alanTasi(t.dataset.id, Number(t.dataset.tasi));
        if (t.dataset.secenekTasi) return secenekTasi(t.dataset.alan, t.dataset.secenek, Number(t.dataset.secenekTasi));
        if (t.dataset.secenekDuzenle) return secenekDuzenle(t.dataset.alan, t.dataset.secenekDuzenle);
      });
      y.icerik.addEventListener('change', function (o) {
        var g = o.target;
        if (!g.dataset.secenekAktif) return;
        var f = alanlar.find(function (x) { return x.id === g.dataset.alan; });
        var op = f.options.find(function (x) { return x.id === g.dataset.secenekAktif; });
        var yeniDurum = g.checked;
        // GAP-Y11: seçeneği pasife alma kısa onay ister.
        var soru = yeniDurum ? Promise.resolve(true) : Y.onay('Seçeneği pasife al', [Y.vurgu(op.label), ' seçeneği adayların formunda artık görünmeyecek.'], 'Pasife al', true);
        soru.then(function (tamam) {
          if (!tamam) { g.checked = !yeniDurum; return; }
          return api.put('/admin/profile-field-options/' + encodeURIComponent(op.id), secenekGovdesi(op, { is_active: yeniDurum }))
            .then(function () { Y.bildirim(op.label + (yeniDurum ? ' aktif.' : ' pasife alındı.')); return yukle(); });
        }).catch(function (h) { g.checked = !yeniDurum; Y.hataGoster(h); });
      });
      y.icerik.addEventListener('submit', function (o) {
        var form = o.target.closest('[data-secenek-ekle]');
        if (!form) return;
        o.preventDefault();
        var etiket = form.label.value.trim();
        if (!etiket) return;
        var f = alanlar.find(function (x) { return x.id === form.dataset.secenekEkle; });
        var normal = f.options.filter(function (x) { return x.sort_order < 900; });
        api.post('/admin/profile-fields/' + encodeURIComponent(f.id) + '/options', {
          value: slug(etiket) || 'secenek', label: etiket,
          sort_order: normal.reduce(function (m, x) { return Math.max(m, x.sort_order); }, 0) + 10, is_active: true
        }).then(function () { Y.bildirim('Seçenek eklendi.'); return yukle(); }).then(function () {
          var g = document.getElementById('yeni-' + f.id); if (g) g.focus();
        }).catch(function (h) { Y.hataGoster(Y.alanHatalari(h, { value: 'Değer', label: 'Etiket' })); });
      });
      return yukle();
    }
  });
})();
