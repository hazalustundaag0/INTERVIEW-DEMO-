// yonetici-hizmetler.js: Hizmet kataloğu, seans şablonları ve fiyat kuralları (/admin/services…)
(function () {
  var Y = window.Yonetici, e = Y.e, api = window.YoneticiAPI;
  var y, hizmetler = [], secili = null, sablonlar = [], fiyatlar = [];

  function hizmetGovdesi(s, degisen) {
    return Object.assign({ code: s.code, name: s.name, description: s.description, session_count: s.session_count, session_duration_minutes: s.session_duration_minutes, is_active: s.is_active, sort_order: s.sort_order }, degisen || {});
  }
  function gecerliFiyat(liste) {
    var simdi = new Date().toISOString();
    return liste.filter(function (p) { return p.valid_from <= simdi && (!p.valid_until || p.valid_until > simdi); })
      .sort(function (a, b) { return b.valid_from.localeCompare(a.valid_from); })[0] || null;
  }
  function fiyatDurumu(p) {
    var simdi = new Date().toISOString();
    if (p.valid_from > simdi) return Y.rozet('Planlandı', 'info');
    if (p.valid_until && p.valid_until <= simdi) return Y.rozet('Sona erdi', 'neutral');
    return Y.rozet('Geçerli', 'success');
  }
  function yerelTarihSaat(d) {
    var z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return z.toISOString().slice(0, 16);
  }

  function listeCiz() {
    y.icerik.querySelector('[data-liste]').innerHTML = '<ul class="adm-select-list">' + hizmetler.map(function (s) {
      return '<li><button type="button" data-hizmet="' + e(s.id) + '"' + (s.id === secili ? ' aria-current="true"' : '') + '>' +
        '<span><span style="display:block">' + e(s.name) + '</span><span class="adm-cell-sub">' + s.session_count + ' seans × ' + s.session_duration_minutes + ' dk</span></span>' +
        Y.aktifRozet(s.is_active, 'Satışta', 'Kapalı') + '</button></li>';
    }).join('') + '</ul>';
  }

  function detayCiz() {
    var kok = y.icerik.querySelector('[data-detay]');
    var s = hizmetler.find(function (x) { return x.id === secili; });
    if (!s) { kok.innerHTML = Y.bos('Soldan bir hizmet seç.'); return; }
    var guncel = gecerliFiyat(fiyatlar);
    var sablonUyari = sablonlar.length !== s.session_count
      ? '<div class="adm-note adm-note--warning" style="margin:1rem 1.25rem 0"><span class="material-symbols-outlined" aria-hidden="true">warning</span><span>Hizmet ' + s.session_count + ' seans olarak tanımlı ama ' + sablonlar.length + ' seans şablonu var. Her seansın amacı ve çıktısı tanımlı olmalı.</span></div>' : '';
    kok.innerHTML =
      '<div class="adm-card"><div class="adm-card-head"><div><h2>' + e(s.name) + ' ' + Y.aktifRozet(s.is_active, 'Satışta', 'Kapalı') + '</h2><p class="adm-mono">' + e(s.code) + '</p></div>' +
        '<div class="adm-page-actions">' + Y.anahtar('is_active', s.is_active, 'Satışa açık', ' data-hizmet-aktif="' + e(s.id) + '"') +
        '<button type="button" class="adm-btn adm-btn--sm" data-duzenle><span class="material-symbols-outlined" aria-hidden="true">edit</span>Düzenle</button></div></div>' +
        '<div class="adm-card-body"><dl class="adm-dl">' +
          '<dt>Açıklama</dt><dd>' + e(s.description || '—') + '</dd>' +
          '<dt>Seans</dt><dd><b>' + s.session_count + '</b> seans × <b>' + s.session_duration_minutes + '</b> dk <span class="adm-cell-sub">(adaylar seçmez, üründen gelir)</span></dd>' +
          '<dt>Güncel fiyat</dt><dd><b>' + (guncel ? Y.para(guncel.amount_minor, guncel.currency) : 'Tanımsız') + '</b>' + (guncel ? ' <span class="adm-cell-sub">' + Y.tarih(guncel.valid_from) + ' itibarıyla</span>' : '') + '</dd>' +
          '<dt>Liste sırası</dt><dd>' + s.sort_order + '</dd>' +
        '</dl></div></div>' +

      '<div class="adm-card"><div class="adm-card-head"><div><h2>Seans şablonları</h2><p>Her seansın amacı ve beklenen çıktısı. Guru ve aday ekranlarında gösterilir.</p></div>' +
        '<button type="button" class="adm-btn adm-btn--sm" data-sablon-ekle><span class="material-symbols-outlined" aria-hidden="true">add</span>Seans ekle</button></div>' + sablonUyari +
        (sablonlar.length ? '<ul class="adm-list">' + sablonlar.map(function (t) {
          return '<li><span class="adm-list-index">' + t.sequence_no + '</span><div class="adm-list-body"><div class="adm-list-title">' + e(t.title) + '</div>' +
            '<div class="adm-list-text">' + e(t.purpose) + '</div><div class="adm-cell-sub" style="margin-top:.3rem"><b>Çıktı:</b> ' + e(t.output_definition) + '</div></div>' +
            '<div class="adm-list-actions"><button type="button" class="adm-icon-btn" data-sablon="' + e(t.id) + '" aria-label="' + t.sequence_no + '. seansı düzenle"><span class="material-symbols-outlined" aria-hidden="true">edit</span></button></div></li>';
        }).join('') + '</ul>' : Y.bos('Seans şablonu yok.')) + '</div>' +

      '<div class="adm-card"><div class="adm-card-head"><div><h2>Fiyat geçmişi</h2><p>Fiyatlar düzenlenmez; yeni kural eklenir ve önceki kuralın yerini alır.</p></div>' +
        '<button type="button" class="adm-btn adm-btn--primary adm-btn--sm" data-fiyat-ekle><span class="material-symbols-outlined" aria-hidden="true">add</span>Yeni fiyat</button></div>' +
        (fiyatlar.length ? '<div class="adm-table-wrap"><table class="adm-table"><thead><tr><th class="adm-num">Tutar</th><th>Başlangıç</th><th>Bitiş</th><th>Durum</th><th>Not</th></tr></thead><tbody>' +
          fiyatlar.map(function (p) {
            return '<tr><td class="adm-num adm-cell-main">' + Y.para(p.amount_minor, p.currency) + '</td><td style="white-space:nowrap">' + Y.tarih(p.valid_from) + '</td><td style="white-space:nowrap">' + (p.valid_until ? Y.tarih(p.valid_until) : '<span class="adm-cell-sub">Açık uçlu</span>') + '</td>' +
              '<td>' + fiyatDurumu(p) + '</td><td class="adm-cell-sub">' + e(p.note || '') + '</td></tr>';
          }).join('') + '</tbody></table></div>' : Y.bos('Fiyat tanımlı değil; bu hizmet satın alınamaz.')) + '</div>';
  }

  function hizmetYukle(id) {
    secili = id;
    listeCiz();
    return Promise.all([api.get('/admin/services/' + encodeURIComponent(id) + '/templates'), api.get('/admin/services/' + encodeURIComponent(id) + '/prices')]).then(function (r) {
      sablonlar = r[0].items.sort(function (a, b) { return a.sequence_no - b.sequence_no; });
      fiyatlar = r[1].items.sort(function (a, b) { return b.valid_from.localeCompare(a.valid_from); });
      detayCiz();
    });
  }

  function yukle(id) {
    return api.get('/admin/services').then(function (r) {
      hizmetler = r.items.sort(function (a, b) { return a.sort_order - b.sort_order; });
      var hedef = id || secili || new URLSearchParams(location.search).get('hizmet') || (hizmetler[0] || {}).id;
      if (!hizmetler.some(function (s) { return s.id === hedef; })) hedef = (hizmetler[0] || {}).id;
      if (!hedef) { listeCiz(); detayCiz(); return; }
      return hizmetYukle(hedef);
    });
  }

  var HIZMET_ETIKET = { code: 'Kod', name: 'Ad', session_count: 'Seans sayısı', session_duration_minutes: 'Seans süresi' };

  function hizmetFormu(s) {
    var yeni = !s;
    Y.modal({
      baslik: yeni ? 'Yeni hizmet' : 'Hizmeti düzenle',
      kaydetMetni: yeni ? 'Oluştur' : 'Kaydet',
      alanEtiketleri: HIZMET_ETIKET,
      govde:
        Y.alan('Hizmet adı', '<input class="adm-input" id="h-name" name="name" required value="' + e(s ? s.name : '') + '">', null, 'h-name') +
        Y.alan('Kod', '<input class="adm-input adm-mono" id="h-code" name="code" required value="' + e(s ? s.code : '') + '" placeholder="sales_story">', 'Sistemdeki kalıcı kimlik; küçük harf ve alt çizgi.', 'h-code') +
        Y.alan('Açıklama', '<textarea class="adm-input" id="h-desc" name="description">' + e(s && s.description ? s.description : '') + '</textarea>', null, 'h-desc') +
        '<div class="adm-row">' +
          Y.alan('Seans sayısı', '<input class="adm-input" id="h-cnt" name="session_count" type="number" min="1" required value="' + (s ? s.session_count : 1) + '">', null, 'h-cnt') +
          Y.alan('Seans süresi (dk)', '<input class="adm-input" id="h-dur" name="session_duration_minutes" type="number" min="1" required value="' + (s ? s.session_duration_minutes : 50) + '">', null, 'h-dur') +
        '</div>' +
        '<div class="adm-row">' +
          Y.alan('Liste sırası', '<input class="adm-input" id="h-ord" name="sort_order" type="number" value="' + (s ? s.sort_order : (hizmetler.reduce(function (m, x) { return Math.max(m, x.sort_order); }, 0) + 10)) + '">', null, 'h-ord') +
          '<div class="adm-field" style="justify-content:flex-end">' + Y.anahtar('is_active', s ? s.is_active : false, 'Satışa açık') + '</div>' +
        '</div>' +
        (s ? '<p class="adm-hint" style="margin:1rem 0 0">Seans sayısı değişikliği yalnızca yeni satın almaları etkiler; mevcut kayıtlar satın alındıkları tanımla devam eder.</p>' : ''),
      kaydet: function (kutu) {
        var v = Y.formVerisi(kutu);
        var g = { code: v.code.trim(), name: v.name.trim(), description: v.description.trim() || null, session_count: parseInt(v.session_count, 10), session_duration_minutes: parseInt(v.session_duration_minutes, 10), is_active: v.is_active, sort_order: parseInt(v.sort_order, 10) || 0 };
        var istek = yeni ? api.post('/admin/services', g) : api.put('/admin/services/' + encodeURIComponent(s.id), g);
        return istek.then(function (r) { Y.bildirim(yeni ? 'Hizmet oluşturuldu.' : 'Hizmet güncellendi.'); return yukle(r.id); });
      }
    });
  }

  function sablonFormu(t) {
    var yeni = !t;
    Y.modal({
      baslik: yeni ? 'Seans ekle' : t.sequence_no + '. seansı düzenle',
      alanEtiketleri: { sequence_no: 'Sıra', title: 'Başlık', purpose: 'Amaç', output_definition: 'Çıktı' },
      govde:
        Y.alan('Başlık', '<input class="adm-input" id="t-title" name="title" required value="' + e(t ? t.title : '') + '">', null, 't-title') +
        Y.alan('Amaç', '<textarea class="adm-input" id="t-purpose" name="purpose" required>' + e(t ? t.purpose : '') + '</textarea>', null, 't-purpose') +
        Y.alan('Beklenen çıktı', '<textarea class="adm-input" id="t-out" name="output_definition" required>' + e(t ? t.output_definition : '') + '</textarea>', null, 't-out') +
        Y.alan('Sıra', '<input class="adm-input" id="t-seq" name="sequence_no" type="number" min="1" required style="max-width:120px" value="' + (t ? t.sequence_no : sablonlar.reduce(function (m, x) { return Math.max(m, x.sequence_no); }, 0) + 1) + '">', null, 't-seq'),
      kaydet: function (kutu) {
        var v = Y.formVerisi(kutu);
        var g = { sequence_no: parseInt(v.sequence_no, 10), title: v.title.trim(), purpose: v.purpose.trim(), output_definition: v.output_definition.trim() };
        var istek = yeni ? api.post('/admin/services/' + encodeURIComponent(secili) + '/templates', g) : api.put('/admin/session-templates/' + encodeURIComponent(t.id), g);
        return istek.then(function () { Y.bildirim(yeni ? 'Seans şablonu eklendi.' : 'Seans şablonu güncellendi.'); return hizmetYukle(secili); });
      }
    });
  }

  function fiyatFormu() {
    var s = hizmetler.find(function (x) { return x.id === secili; });
    var guncel = gecerliFiyat(fiyatlar);
    Y.modal({
      baslik: s.name + ' · yeni fiyat',
      kaydetMetni: 'Fiyatı kaydet',
      alanEtiketleri: { amount_minor: 'Tutar', currency: 'Para birimi', valid_from: 'Başlangıç', valid_until: 'Bitiş' },
      govde:
        (guncel ? '<p class="adm-hint" style="margin-top:0">Güncel fiyat: <b>' + Y.para(guncel.amount_minor, guncel.currency) + '</b>. Yeni kural başladığında önceki kuralın yerini alır.</p>' : '') +
        '<div class="adm-row">' +
          Y.alan('Tutar (₺)', '<input class="adm-input" id="p-amt" name="tutar" type="number" min="0" step="0.01" required inputmode="decimal" placeholder="1500">', 'Demo için 0 girilebilir.', 'p-amt') +
          Y.alan('Para birimi', '<select class="adm-input" id="p-cur" name="currency"><option value="TRY">TRY</option></select>', null, 'p-cur') +
        '</div>' +
        '<div class="adm-row">' +
          Y.alan('Geçerlilik başlangıcı', '<input class="adm-input" id="p-from" name="valid_from" type="datetime-local" required value="' + yerelTarihSaat(new Date()) + '">', null, 'p-from') +
          Y.alan('Geçerlilik bitişi', '<input class="adm-input" id="p-until" name="valid_until" type="datetime-local">', 'Boş bırakılırsa açık uçlu.', 'p-until') +
        '</div>' +
        Y.alan('Not', '<input class="adm-input" id="p-note" name="note" placeholder="Ör. Pilot fiyatı">', null, 'p-note') +
        '<p class="adm-hint" style="margin:1rem 0 0">Fiyat kuralları kaydedildikten sonra düzenlenemez; değişiklik için yeni kural eklenir.</p>',
      kaydet: function (kutu) {
        var v = Y.formVerisi(kutu);
        var tutar = Number(String(v.tutar).replace(',', '.'));
        if (v.tutar === '' || !(tutar >= 0)) return Promise.reject(new Error('Geçerli bir tutar girin.'));
        if (!v.valid_from) return Promise.reject(new Error('Başlangıç tarihi gerekli.'));
        var g = { amount_minor: Math.round(tutar * 100), currency: v.currency, valid_from: new Date(v.valid_from).toISOString(), valid_until: v.valid_until ? new Date(v.valid_until).toISOString() : null, note: v.note.trim() || null };
        if (g.valid_until && g.valid_until <= g.valid_from) return Promise.reject(new Error('Bitiş, başlangıçtan sonra olmalı.'));
        return api.post('/admin/services/' + encodeURIComponent(s.id) + '/prices', g).then(function () { Y.bildirim('Fiyat kuralı eklendi.'); return hizmetYukle(s.id); });
      }
    });
  }

  Y.sayfa({
    sayfa: 'hizmetler',
    baslik: 'Hizmetler ve fiyatlar',
    aciklama: 'Ürün tanımları: seans sayısı ve süresi, seans amaçları ve geçerlilik tarihli fiyatlar.',
    ciz: function (yer) {
      y = yer;
      y.eylemler.innerHTML = '<button type="button" class="adm-btn" data-yeni><span class="material-symbols-outlined" aria-hidden="true">add</span>Yeni hizmet</button>';
      y.eylemler.querySelector('[data-yeni]').addEventListener('click', function () { hizmetFormu(null); });
      y.icerik.innerHTML = '<div class="adm-grid" style="grid-template-columns:minmax(240px,300px) minmax(0,1fr);align-items:start" data-izgara>' +
        '<div class="adm-card"><div class="adm-card-head"><div><h2>Hizmetler</h2></div></div><div data-liste></div></div>' +
        '<div data-detay style="display:flex;flex-direction:column;gap:1.25rem;min-width:0"></div></div>';
      if (window.matchMedia('(max-width: 860px)').matches) y.icerik.querySelector('[data-izgara]').style.gridTemplateColumns = 'minmax(0,1fr)';
      y.icerik.addEventListener('click', function (o) {
        var t = o.target.closest('button');
        if (!t) return;
        if (t.dataset.hizmet) return hizmetYukle(t.dataset.hizmet).catch(Y.hataGoster);
        if (t.hasAttribute('data-duzenle')) return hizmetFormu(hizmetler.find(function (s) { return s.id === secili; }));
        if (t.hasAttribute('data-sablon-ekle')) return sablonFormu(null);
        if (t.dataset.sablon) return sablonFormu(sablonlar.find(function (x) { return x.id === t.dataset.sablon; }));
        if (t.hasAttribute('data-fiyat-ekle')) return fiyatFormu();
      });
      y.icerik.addEventListener('change', function (o) {
        var g = o.target;
        if (!g.dataset.hizmetAktif) return;
        var s = hizmetler.find(function (x) { return x.id === g.dataset.hizmetAktif; });
        var yeniDurum = g.checked;
        g.checked = !yeniDurum;
        var soru = yeniDurum && !gecerliFiyat(fiyatlar)
          ? Y.onay('Fiyatsız hizmet', 'Bu hizmetin geçerli bir fiyatı yok; satışa açılsa da adaylar satın alamaz. Yine de açılsın mı?', 'Satışa aç')
          : Promise.resolve(true);
        soru.then(function (tamam) {
          if (!tamam) return;
          return api.put('/admin/services/' + encodeURIComponent(s.id), hizmetGovdesi(s, { is_active: yeniDurum })).then(function () {
            Y.bildirim(s.name + (yeniDurum ? ' satışa açıldı.' : ' satışa kapatıldı.'));
            return yukle(s.id);
          });
        }).catch(Y.hataGoster);
      });
      return yukle();
    }
  });
})();
