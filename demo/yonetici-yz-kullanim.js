// yonetici-yz-kullanim.js: YZ çağrı sayısı, maliyeti ve süresi (GET /admin/ai-costs, GET /admin/ai-requests)
(function () {
  var Y = window.Yonetici, e = Y.e, api = window.YoneticiAPI;
  var TUR = {
    question: 'Soru', follow_up_decision: 'Takip kararı', follow_up_question: 'Takip sorusu', prompt_chain_step: 'İstem zinciri adımı',
    story_generation: 'Hikâye üretimi', output_generation: 'Çıktı üretimi', cv_parse: 'CV okuma'
  };
  var DURUM = { success: ['Başarılı', 'success'], error: ['Hata', 'danger'], timeout: ['Zaman aşımı', 'warning'] };
  var filtre = { gun: '30', tur: '' };
  var y, kisiler = {}, kayitlar = [], gosterilen = 50;

  function aralik() {
    var bit = new Date();
    var bas = filtre.gun === 'tum' ? new Date('2026-01-01T00:00:00Z') : new Date(bit.getTime() - Number(filtre.gun) * 86400e3);
    return { from: bas.toISOString(), to: bit.toISOString() };
  }

  function grupla(liste, anahtar) {
    var g = {};
    liste.forEach(function (r) {
      var k = anahtar(r);
      var x = g[k] || (g[k] = { anahtar: k, adet: 0, hata: 0, maliyet: 0, sure: 0, giris: 0, cikis: 0, para: r.cost_currency });
      x.adet++; if (r.status !== 'success') x.hata++;
      x.maliyet += r.cost_micro; x.sure += r.duration_ms; x.giris += r.input_tokens; x.cikis += r.output_tokens;
    });
    return Object.keys(g).map(function (k) { return g[k]; });
  }

  function gunlukGrafik(liste) {
    var gunler = {};
    liste.forEach(function (r) { var k = r.created_at.slice(0, 10); gunler[k] = (gunler[k] || 0) + r.cost_micro; });
    var anahtarlar = Object.keys(gunler).sort();
    if (!anahtarlar.length) return Y.bos('Bu aralıkta çağrı yok.');
    // Boş günleri de göster (en fazla 31 gün)
    var bas = new Date(anahtarlar[0] + 'T00:00:00Z'), bit = new Date(anahtarlar[anahtarlar.length - 1] + 'T00:00:00Z');
    var tum = [];
    for (var d = bas; d <= bit && tum.length < 62; d = new Date(d.getTime() + 86400e3)) tum.push(d.toISOString().slice(0, 10));
    var maks = Math.max.apply(Math, tum.map(function (k) { return gunler[k] || 0; })) || 1;
    var para = liste[0].cost_currency;
    return '<div class="adm-bars" role="img" aria-label="Günlük YZ maliyeti grafiği">' + tum.map(function (k) {
      var v = gunler[k] || 0;
      var etiket = new Date(k + 'T12:00:00Z').toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
      return '<div class="adm-bar-col" title="' + e(etiket + ': ' + Y.maliyet(v, para)) + '"><div class="adm-bar" style="height:' + Math.max(1, Math.round(v / maks * 100)) + '%"></div>' +
        '<span class="adm-bar-label">' + (tum.length > 14 ? etiket.split(' ')[0] : e(etiket)) + '</span></div>';
    }).join('') + '</div>';
  }

  function ciz(ozet) {
    var tp = ozet.items.find(function (x) { return x.cost_currency === 'USD'; }) || ozet.items[0] || { request_count: 0, error_count: 0, input_tokens: 0, output_tokens: 0, cost_micro: 0, cost_currency: 'USD', average_duration_ms: 0 };
    var adaylar = grupla(kayitlar.filter(function (r) { return r.user_id; }), function (r) { return r.user_id; }).sort(function (a, b) { return b.maliyet - a.maliyet; });
    var adayBasi = adaylar.length ? adaylar.reduce(function (t, x) { return t + x.maliyet; }, 0) / adaylar.length : 0;
    var turler = grupla(kayitlar, function (r) { return r.request_type; }).sort(function (a, b) { return b.maliyet - a.maliyet; });
    var toplamMaliyet = turler.reduce(function (t, x) { return t + x.maliyet; }, 0) || 1;
    var yavas = kayitlar.filter(function (r) {
      var uzun = r.request_type === 'story_generation' || r.request_type === 'output_generation' || r.request_type === 'cv_parse';
      return r.duration_ms > (uzun ? 30000 : 5000);
    }).length;

    y.icerik.querySelector('[data-icerik-alan]').innerHTML =
      '<div class="adm-stats">' +
        '<div class="adm-card adm-stat"><div class="adm-stat-label">Toplam maliyet</div><div class="adm-stat-value">' + Y.maliyet(tp.cost_micro, tp.cost_currency, 2) + '</div><div class="adm-stat-sub">' + Y.sayi(tp.input_tokens) + ' giriş · ' + Y.sayi(tp.output_tokens) + ' çıkış token</div></div>' +
        '<div class="adm-card adm-stat"><div class="adm-stat-label">Çağrı</div><div class="adm-stat-value">' + Y.sayi(tp.request_count) + '</div><div class="adm-stat-sub">' + tp.error_count + ' hata / zaman aşımı</div></div>' +
        '<div class="adm-card adm-stat"><div class="adm-stat-label">Ortalama süre</div><div class="adm-stat-value">' + Y.sure(tp.average_duration_ms) + '</div><div class="adm-stat-sub">' + yavas + ' çağrı hedef sürenin üstünde</div></div>' +
        '<div class="adm-card adm-stat"><div class="adm-stat-label">Aday başı maliyet</div><div class="adm-stat-value">' + Y.maliyet(adayBasi, tp.cost_currency, 2) + '</div><div class="adm-stat-sub">' + adaylar.length + ' aday</div></div>' +
      '</div>' +
      '<div class="adm-card"><div class="adm-card-head"><div><h2>Günlük maliyet</h2><p>' + (filtre.tur ? e(TUR[filtre.tur]) + ' çağrıları' : 'Tüm çağrılar') + '</p></div></div><div class="adm-card-body">' + (kayitlar.length ? gunlukGrafik(kayitlar) : Y.bos('Bu aralıkta çağrı yok.')) + '</div></div>' +
      '<div class="adm-grid adm-grid--2">' +
        '<div class="adm-card"><div class="adm-card-head"><div><h2>Çağrı türüne göre</h2></div></div><div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>Tür</th><th class="adm-num">Çağrı</th><th class="adm-num">Ort. süre</th><th class="adm-num">Maliyet</th><th><span class="adm-sr">Pay</span></th></tr></thead><tbody>' +
          (turler.length ? turler.map(function (t) {
            return '<tr><td>' + e(TUR[t.anahtar] || t.anahtar) + (t.hata ? ' <span class="adm-cell-sub">(' + t.hata + ' hata)</span>' : '') + '</td><td class="adm-num">' + t.adet + '</td><td class="adm-num">' + Y.sure(Math.round(t.sure / t.adet)) + '</td><td class="adm-num">' + Y.maliyet(t.maliyet, t.para) + '</td>' +
              '<td style="width:22%"><div class="adm-meter"><span style="width:' + Math.round(t.maliyet / toplamMaliyet * 100) + '%"></span></div></td></tr>';
          }).join('') : '<tr><td colspan="5" class="adm-empty">Kayıt yok.</td></tr>') + '</tbody></table></div></div>' +
        '<div class="adm-card"><div class="adm-card-head"><div><h2>Aday başına</h2><p>Pilotta aday başı maliyetin ölçümü için.</p></div></div><div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>Aday</th><th class="adm-num">Çağrı</th><th class="adm-num">Token</th><th class="adm-num">Maliyet</th></tr></thead><tbody>' +
          (adaylar.length ? adaylar.map(function (a) {
            var u = kisiler[a.anahtar];
            return '<tr><td class="adm-cell-main">' + e(u ? Y.adSoyad(u) : 'Bilinmeyen') + '</td><td class="adm-num">' + a.adet + '</td><td class="adm-num">' + Y.sayi(a.giris + a.cikis) + '</td><td class="adm-num">' + Y.maliyet(a.maliyet, a.para) + '</td></tr>';
          }).join('') : '<tr><td colspan="4" class="adm-empty">Kayıt yok.</td></tr>') + '</tbody></table></div></div>' +
      '</div>' +
      '<div class="adm-card"><div class="adm-card-head"><div><h2>Çağrı kayıtları</h2><p>Her YZ çağrısı istek türü, model, token, maliyet ve süreyle kaydedilir.</p></div><span class="adm-count">' + kayitlar.length + ' kayıt</span></div>' +
        '<div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>Zaman</th><th>Aday</th><th>Tür</th><th>Model</th><th class="adm-num">Token (giriş/çıkış)</th><th class="adm-num">Süre</th><th class="adm-num">Maliyet</th><th>Durum</th></tr></thead><tbody>' +
          (kayitlar.length ? kayitlar.slice(0, gosterilen).map(function (r) {
            var u = kisiler[r.user_id], d = DURUM[r.status] || [r.status, 'neutral'];
            return '<tr><td style="white-space:nowrap">' + Y.tarih(r.created_at) + '</td><td>' + e(u ? Y.adSoyad(u) : '—') + '</td><td>' + e(TUR[r.request_type] || r.request_type) + (r.retry_no ? ' <span class="adm-cell-sub">(deneme ' + (r.retry_no + 1) + ')</span>' : '') + '</td>' +
              '<td class="adm-mono">' + e(r.provider + ' / ' + r.model) + '</td><td class="adm-num">' + Y.sayi(r.input_tokens) + ' / ' + Y.sayi(r.output_tokens) + '</td><td class="adm-num">' + Y.sure(r.duration_ms) + '</td><td class="adm-num">' + Y.maliyet(r.cost_micro, r.cost_currency) + '</td>' +
              '<td>' + Y.rozet(d[0], d[1]) + (r.error_code ? '<div class="adm-cell-sub adm-mono">' + e(r.error_code) + '</div>' : '') + '</td></tr>';
          }).join('') : '<tr><td colspan="8" class="adm-empty">Kayıt yok.</td></tr>') + '</tbody></table></div>' +
        (kayitlar.length > gosterilen ? '<div class="adm-card-body" style="text-align:center"><button type="button" class="adm-btn adm-btn--sm" data-daha>' + Math.min(50, kayitlar.length - gosterilen) + ' kayıt daha göster</button></div>' : '') +
      '</div>';
  }

  var sonOzet = null;
  function yukle() {
    var a = aralik();
    y.icerik.querySelector('[data-icerik-alan]').innerHTML = '<div class="adm-card">' + Y.bos('Yükleniyor…') + '</div>';
    return Promise.all([api.get('/admin/ai-costs', a), api.hepsi('/admin/ai-requests', { from: a.from, to: a.to, request_type: filtre.tur }, 2000)]).then(function (r) {
      sonOzet = r[0];
      kayitlar = r[1];
      gosterilen = 50;
      if (filtre.tur) {
        // ai-costs türe göre filtrelenmez; seçili türün özeti kayıtlardan hesaplanır.
        var g = grupla(kayitlar, function () { return 'x'; })[0];
        sonOzet = { items: g ? [{ cost_currency: g.para, request_count: g.adet, error_count: g.hata, input_tokens: g.giris, output_tokens: g.cikis, cost_micro: g.maliyet, average_duration_ms: Math.round(g.sure / g.adet) }] : [] };
      }
      ciz(sonOzet);
    });
  }

  Y.sayfa({
    sayfa: 'yz-kullanim',
    baslik: 'YZ kullanımı',
    aciklama: 'Dış YZ servisine yapılan çağrıların sayısı, maliyeti ve süresi.',
    ciz: function (yer) {
      y = yer;
      y.icerik.innerHTML =
        '<div class="adm-card"><div class="adm-toolbar" style="border-bottom:0">' +
          '<label class="adm-label" for="yz-gun">Aralık</label><select class="adm-input" id="yz-gun" style="max-width:170px"><option value="7">Son 7 gün</option><option value="30" selected>Son 30 gün</option><option value="90">Son 90 gün</option><option value="tum">Tümü</option></select>' +
          '<label class="adm-label" for="yz-tur">Tür</label><select class="adm-input" id="yz-tur" style="max-width:220px"><option value="">Tüm türler</option>' + Object.keys(TUR).map(function (k) { return '<option value="' + k + '">' + TUR[k] + '</option>'; }).join('') + '</select>' +
          '<span class="adm-spacer"></span><span class="adm-hint">Hedef: soru/takip ≤ 5 sn, hikâye ve çıktı ≤ 30 sn</span>' +
        '</div></div><div data-icerik-alan style="display:flex;flex-direction:column;gap:1.25rem"></div>';
      y.icerik.querySelector('#yz-gun').addEventListener('change', function (o) { filtre.gun = o.target.value; yukle().catch(Y.hataGoster); });
      y.icerik.querySelector('#yz-tur').addEventListener('change', function (o) { filtre.tur = o.target.value; yukle().catch(Y.hataGoster); });
      y.icerik.addEventListener('click', function (o) { if (o.target.closest('[data-daha]')) { gosterilen += 50; ciz(sonOzet); } });
      return api.hepsi('/admin/users', { role: 'candidate' }).then(function (u) {
        u.forEach(function (x) { kisiler[x.id] = x; });
        return yukle();
      });
    }
  });
})();
