// yonetici-icerik.js: Site içeriği (E6-13, Etap 12) — ana sayfa SSS / Kimler için / Nasıl çalışır / yol haritası.
// GET /admin/content (tüm kayıtlar) · PUT /admin/content/{key}?locale=tr (gövde = bölüm JSON'u; şema denetimi:
// bilinmeyen alan 422 fields.content, bozuk JSON 400). Biçim frontend/docs/landing-content.tr.json ile birebir.
// Yol haritası öğeleri "Yakında" hizmetlerden üretilir (Hizmetler ekranı); burada yalnız başlık düzenlenir.
(function () {
  var Y = window.Yonetici, e = Y.e, api = window.YoneticiAPI;
  var y, kayitlar = {}, secili = 'faq', veri = null, kirli = false;

  // Alan: [ad, etiket, tür('input'|'textarea'|'csv')]
  var SEMA = {
    faq: {
      ad: 'SSS', aciklama: 'Ana sayfadaki "Sıkça sorulan sorular" bölümü.',
      alanlar: [['title', 'Başlık', 'input'], ['lead', 'Giriş metni', 'textarea']],
      listeler: [{ yol: 'items', ad: 'Sorular', tekil: 'Soru', alanlar: [['question', 'Soru', 'input'], ['answer', 'Cevap', 'textarea']] }]
    },
    audiences: {
      ad: 'Kimler için?', aciklama: 'Hedef kitle kartları.',
      alanlar: [['eyebrow', 'Üst etiket', 'input'], ['title', 'Başlık', 'input'], ['note', 'Alt not', 'textarea']],
      listeler: [{ yol: 'items', ad: 'Kitleler', tekil: 'Kitle', alanlar: [['title', 'Başlık', 'input'], ['text', 'Metin', 'textarea'], ['tags', 'Etiketler (virgülle)', 'csv']] }]
    },
    howto: {
      ad: 'Nasıl çalışır?', aciklama: 'Süreç adımları ve Hikâye Aracı adımları.',
      gruplar: [
        { yol: 'process', ad: 'Süreç', alanlar: [['eyebrow', 'Üst etiket', 'input'], ['title', 'Başlık', 'input'], ['lead', 'Giriş', 'textarea']],
          listeler: [{ yol: 'steps', ad: 'Adımlar', tekil: 'Adım', alanlar: [['label', 'Etiket', 'input'], ['text', 'Metin', 'textarea']] }] },
        { yol: 'story_tool', ad: 'Hikâye Aracı', alanlar: [['title', 'Başlık', 'input']],
          listeler: [{ yol: 'steps', ad: 'Adımlar', tekil: 'Adım', alanlar: [['title', 'Başlık', 'input'], ['text', 'Metin', 'textarea']] }] }
      ]
    },
    roadmap: {
      ad: 'Yol haritası', aciklama: 'Öğeler "Yakında" işaretli hizmetlerden otomatik gelir; burada yalnız başlık düzenlenir.',
      alanlar: [['title', 'Başlık', 'input']], salt: ['items']
    }
  };

  function kopya(o) { return JSON.parse(JSON.stringify(o || {})); }

  function alanHtml(onEk, alan, deger) {
    var ad = onEk + alan[0], id = 'ic-' + ad.replace(/[^a-z0-9]+/gi, '-');
    var v = alan[2] === 'csv' ? (Array.isArray(deger) ? deger.join(', ') : '') : (deger == null ? '' : deger);
    var girdi = alan[2] === 'textarea'
      ? '<textarea class="adm-input" id="' + id + '" data-yol="' + e(ad) + '" data-tur="' + alan[2] + '" rows="3">' + e(v) + '</textarea>'
      : '<input class="adm-input" id="' + id + '" data-yol="' + e(ad) + '" data-tur="' + alan[2] + '" value="' + e(v) + '">';
    return Y.alan(alan[1], girdi, null, id);
  }

  function listeHtml(onEk, liste, dizi) {
    dizi = Array.isArray(dizi) ? dizi : [];
    return '<div class="adm-field"><span class="adm-label">' + e(liste.ad) + ' (' + dizi.length + ')</span>' +
      dizi.map(function (o, i) {
        var yol = onEk + liste.yol + '.' + i + '.';
        return '<div class="adm-card" style="margin:.5rem 0;padding:.75rem 1rem" data-oge="' + e(onEk + liste.yol) + '" data-sira="' + i + '">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;gap:.5rem"><b>' + e(liste.tekil) + ' ' + (i + 1) + '</b><span>' +
            '<button type="button" class="adm-icon-btn" data-yukari aria-label="Yukarı taşı"' + (i === 0 ? ' disabled' : '') + '><span class="material-symbols-outlined" aria-hidden="true">arrow_upward</span></button>' +
            '<button type="button" class="adm-icon-btn" data-asagi aria-label="Aşağı taşı"' + (i === dizi.length - 1 ? ' disabled' : '') + '><span class="material-symbols-outlined" aria-hidden="true">arrow_downward</span></button>' +
            '<button type="button" class="adm-icon-btn" data-sil aria-label="' + e(liste.tekil) + ' ' + (i + 1) + ' sil"><span class="material-symbols-outlined" aria-hidden="true">delete</span></button>' +
          '</span></div>' +
          liste.alanlar.map(function (a) { return alanHtml(yol, a, o[a[0]]); }).join('') + '</div>';
      }).join('') +
      '<button type="button" class="adm-btn adm-btn--sm" data-ekle="' + e(onEk + liste.yol) + '" data-alanlar="' + e(liste.alanlar.map(function (a) { return a[0] + ':' + a[2]; }).join(',')) + '">' +
        '<span class="material-symbols-outlined" aria-hidden="true">add</span>' + e(liste.tekil) + ' ekle</button></div>';
  }

  function bolumHtml(onEk, tanim, nesne) {
    nesne = nesne || {};
    return (tanim.alanlar || []).map(function (a) { return alanHtml(onEk, a, nesne[a[0]]); }).join('') +
      (tanim.listeler || []).map(function (l) { return listeHtml(onEk, l, nesne[l.yol]); }).join('');
  }

  function al(yol) { return yol.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, veri); }
  function koy(yol, deger) {
    var p = yol.split('.'), o = veri;
    for (var i = 0; i < p.length - 1; i++) { if (o[p[i]] == null) o[p[i]] = /^\d+$/.test(p[i + 1]) ? [] : {}; o = o[p[i]]; }
    o[p[p.length - 1]] = deger;
  }

  function ciz() {
    var s = SEMA[secili], kok = y.icerik.querySelector('[data-duzenleyici]');
    var k = kayitlar[secili];
    var form = s.gruplar
      ? s.gruplar.map(function (g) { return '<h3 class="adm-subtitle" style="margin:1rem 0 .5rem">' + e(g.ad) + '</h3>' + bolumHtml(g.yol + '.', g, veri[g.yol]); }).join('')
      : bolumHtml('', s, veri);
    var salt = secili === 'roadmap' && Array.isArray(veri.items)
      ? '<div class="adm-field"><span class="adm-label">Öğeler (Hizmetler ekranından)</span><ul class="adm-list">' + veri.items.map(function (o) {
          return '<li><div class="adm-list-body"><div class="adm-list-title">' + e(o.title) + '</div>' + (o.description ? '<div class="adm-list-text">' + e(o.description) + '</div>' : '') + '</div></li>';
        }).join('') + '</ul><a class="adm-link" href="/yonetici/hizmetler">Hizmetler ve fiyatlar →</a></div>' : '';
    kok.innerHTML = '<div class="adm-card-head"><div><h2>' + e(s.ad) + '</h2><p>' + e(s.aciklama) + (k && k.updated_at ? ' · Son güncelleme ' + Y.tarih(k.updated_at) : '') + '</p></div>' +
      '<button type="button" class="adm-btn adm-btn--primary" data-kaydet-icerik>Kaydet</button></div>' +
      '<div class="adm-card-body"><p class="adm-error" data-icerik-hata hidden></p>' + form + salt + '</div>';
  }

  function sekmeCiz() {
    y.icerik.querySelector('[data-sekmeler]').innerHTML = Object.keys(SEMA).map(function (k) {
      return '<button type="button" class="adm-btn adm-btn--sm' + (k === secili ? ' adm-btn--primary' : '') + '" role="tab" data-anahtar="' + k + '" aria-selected="' + (k === secili) + '">' + e(SEMA[k].ad) + '</button>';
    }).join('');
  }

  function sec(k) {
    if (kirli && !window.confirm('Kaydedilmemiş değişiklikler var. Yine de geçilsin mi?')) return;
    secili = k; kirli = false;
    veri = kopya(kayitlar[k] ? kayitlar[k].content : {});
    sekmeCiz(); ciz();
  }

  // Gövde: yalnız şemadaki alanlar; liste öğelerine 1'den sıralı "order" yazılır; roadmap.items gönderilmez.
  function govde() {
    var s = SEMA[secili];
    function bolum(t, n) {
      n = n || {};
      var o = {};
      (t.alanlar || []).forEach(function (a) {
        var v = n[a[0]];
        if (a[2] === 'csv') o[a[0]] = Array.isArray(v) ? v : String(v || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
        else if (v != null) o[a[0]] = String(v);
      });
      (t.listeler || []).forEach(function (l) {
        o[l.yol] = (n[l.yol] || []).map(function (it, i) {
          var r = { order: i + 1 };
          l.alanlar.forEach(function (a) {
            var v = it[a[0]];
            r[a[0]] = a[2] === 'csv' ? (Array.isArray(v) ? v : String(v || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean)) : String(v == null ? '' : v);
          });
          return r;
        });
      });
      return o;
    }
    if (s.gruplar) { var g = {}; s.gruplar.forEach(function (t) { g[t.yol] = bolum(t, veri[t.yol]); }); return g; }
    return bolum(s, veri);
  }

  function kaydet(btn) {
    var hata = y.icerik.querySelector('[data-icerik-hata]');
    hata.hidden = true;
    btn.disabled = true;
    api.put('/admin/content/' + encodeURIComponent(secili) + '?locale=tr', govde()).then(function (r) {
      kayitlar[secili] = r; veri = kopya(r.content); kirli = false;
      Y.bildirim(SEMA[secili].ad + ' kaydedildi. Ana sayfada hemen görünür.');
      ciz();
    }).catch(function (h) {
      var alanlar = h && h.fields ? Object.keys(h.fields).map(function (k) { return h.fields[k]; }).join(' · ') : '';
      hata.textContent = (h && h.message ? h.message : 'Kaydedilemedi.') + (alanlar ? ' ' + alanlar : '');
      hata.hidden = false;
      hata.scrollIntoView({ block: 'nearest' });
    }).then(function () { btn.disabled = false; });
  }

  Y.sayfa({
    sayfa: 'icerik',
    baslik: 'Site içeriği',
    aciklama: 'Ana sayfadaki SSS, hedef kitleler, süreç adımları ve yol haritası başlığı.',
    ciz: function (yer) {
      y = yer;
      y.icerik.innerHTML = '<div class="adm-tabs" role="tablist" data-sekmeler style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:1rem"></div>' +
        '<div class="adm-card" data-duzenleyici></div>';
      y.icerik.addEventListener('click', function (o) {
        var t = o.target.closest('[data-anahtar]');
        if (t) return sec(t.dataset.anahtar);
        if (o.target.closest('[data-kaydet-icerik]')) return kaydet(o.target.closest('[data-kaydet-icerik]'));
        var ekle = o.target.closest('[data-ekle]');
        if (ekle) {
          var yeni = {};
          ekle.dataset.alanlar.split(',').forEach(function (p) { var q = p.split(':'); yeni[q[0]] = q[1] === 'csv' ? [] : ''; });
          var d = al(ekle.dataset.ekle) || [];
          d.push(yeni); koy(ekle.dataset.ekle, d); kirli = true; ciz();
          return;
        }
        var oge = o.target.closest('[data-oge]');
        if (!oge) return;
        var dizi = al(oge.dataset.oge) || [], i = Number(oge.dataset.sira);
        if (o.target.closest('[data-sil]')) dizi.splice(i, 1);
        else if (o.target.closest('[data-yukari]') && i > 0) dizi.splice(i - 1, 0, dizi.splice(i, 1)[0]);
        else if (o.target.closest('[data-asagi]') && i < dizi.length - 1) dizi.splice(i + 1, 0, dizi.splice(i, 1)[0]);
        else return;
        kirli = true; ciz();
      });
      y.icerik.addEventListener('input', function (o) {
        var t = o.target.closest('[data-yol]');
        if (!t) return;
        koy(t.dataset.yol, t.dataset.tur === 'csv' ? t.value.split(',').map(function (x) { return x.trim(); }).filter(Boolean) : t.value);
        kirli = true;
      });
      return api.get('/admin/content').then(function (r) {
        (r.items || []).filter(function (k) { return k.locale === 'tr'; }).forEach(function (k) { kayitlar[k.key] = k; });
        sec('faq');
      });
    }
  });
})();
