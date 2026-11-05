// yonetici-odemeler.js: Ödeme kayıtları (GET /admin/payments, GET /admin/payments/{id}) — salt okunur
(function () {
  var Y = window.Yonetici, e = Y.e, api = window.YoneticiAPI;
  var DENEME = { initiate: 'Başlatma', webhook: 'Sağlayıcı bildirimi', status_query: 'Durum sorgusu', refund: 'İade' };
  var SONUC = { success: ['Başarılı', 'success'], failure: ['Başarısız', 'danger'], pending: ['Beklemede', 'warning'], error: ['Hata', 'danger'], duplicate: ['Tekrar', 'neutral'] };
  var params = new URLSearchParams(location.search);
  var filtre = { status: Y.ODEME_DURUM[params.get('status')] ? params.get('status') : '', arama: '' };
  var y, odemeler = [], kisiler = {};

  function satirlar() {
    var q = filtre.arama.trim().toLocaleLowerCase('tr-TR');
    return odemeler.filter(function (p) {
      if (!q) return true;
      var u = kisiler[p.user_id];
      return ((u ? Y.adSoyad(u) + ' ' + u.email : '') + ' ' + (p.provider_reference || '')).toLocaleLowerCase('tr-TR').indexOf(q) > -1;
    });
  }

  function ciz() {
    var liste = satirlar();
    var odenen = liste.filter(function (p) { return p.status === 'PAID'; });
    var toplam = odenen.reduce(function (t, p) { return t + p.amount_minor; }, 0);
    var iade = liste.filter(function (p) { return p.status === 'REFUNDED'; }).reduce(function (t, p) { return t + p.amount_minor; }, 0);
    y.icerik.querySelector('[data-ozet]').innerHTML =
      '<div class="adm-card adm-stat"><div class="adm-stat-label">Tahsil edilen</div><div class="adm-stat-value">' + Y.para(toplam) + '</div><div class="adm-stat-sub">' + odenen.length + ' ödeme</div></div>' +
      '<div class="adm-card adm-stat"><div class="adm-stat-label">İade edilen</div><div class="adm-stat-value">' + Y.para(iade) + '</div><div class="adm-stat-sub">' + liste.filter(function (p) { return p.status === 'REFUNDED'; }).length + ' ödeme</div></div>' +
      '<div class="adm-card adm-stat"><div class="adm-stat-label">Beklemede</div><div class="adm-stat-value">' + liste.filter(function (p) { return p.status === 'PENDING'; }).length + '</div><div class="adm-stat-sub">Sağlayıcı yanıtı bekleniyor</div></div>' +
      '<div class="adm-card adm-stat"><div class="adm-stat-label">Başarısız</div><div class="adm-stat-value">' + liste.filter(function (p) { return p.status === 'FAILED'; }).length + '</div><div class="adm-stat-sub">Aday yeniden deneyebilir</div></div>';
    y.icerik.querySelector('[data-sayi]').textContent = liste.length + ' kayıt';
    var kok = y.icerik.querySelector('[data-tablo]');
    if (!liste.length) { kok.innerHTML = Y.bos('Filtreye uyan ödeme yok.'); return; }
    kok.innerHTML = '<table class="adm-table"><thead><tr><th>Tarih</th><th>Aday</th><th class="adm-num">Tutar</th><th>Yöntem</th><th>Sağlayıcı referansı</th><th>Durum</th><th><span class="adm-sr">Detay</span></th></tr></thead><tbody>' +
      liste.map(function (p) {
        var u = kisiler[p.user_id];
        return '<tr><td style="white-space:nowrap">' + Y.tarih(p.created_at) + '</td>' +
          '<td><div class="adm-cell-main">' + e(u ? Y.adSoyad(u) : 'Bilinmeyen kullanıcı') + '</div><div class="adm-cell-sub">' + e(u ? u.email : p.user_id) + '</div></td>' +
          '<td class="adm-num adm-cell-main">' + Y.para(p.amount_minor, p.currency) + '</td>' +
          '<td>' + e(Y.ODEME_YONTEM[p.payment_method] || p.payment_method) + '</td>' +
          '<td><span class="adm-mono">' + e(p.provider_reference || '—') + '</span><div class="adm-cell-sub">' + e(p.provider) + '</div></td>' +
          '<td>' + Y.odemeRozet(p.status) + (p.failure_message ? '<div class="adm-cell-sub">' + e(p.failure_message) + '</div>' : '') + '</td>' +
          '<td class="adm-actions-cell"><button type="button" class="adm-icon-btn" data-detay="' + e(p.id) + '" aria-label="Ödeme detayı"><span class="material-symbols-outlined" aria-hidden="true">receipt_long</span></button></td></tr>';
      }).join('') + '</tbody></table>';
  }

  function yukle() {
    y.icerik.querySelector('[data-tablo]').innerHTML = Y.bos('Yükleniyor…');
    return api.hepsi('/admin/payments', { status: filtre.status }).then(function (liste) { odemeler = liste; ciz(); });
  }

  function detay(id) {
    api.get('/admin/payments/' + encodeURIComponent(id)).then(function (d) {
      var p = d.payment, u = kisiler[p.user_id];
      var s = function (a, b) { return '<dt>' + e(a) + '</dt><dd>' + b + '</dd>'; };
      Y.modal({
        baslik: 'Ödeme detayı',
        iptalMetni: 'Kapat',
        govde: '<dl class="adm-dl">' +
          s('Aday', e(u ? Y.adSoyad(u) + ' · ' + u.email : p.user_id)) + s('Tutar', '<b>' + Y.para(p.amount_minor, p.currency) + '</b>') +
          s('Durum', Y.odemeRozet(p.status)) + s('Yöntem', e(Y.ODEME_YONTEM[p.payment_method] || p.payment_method)) +
          s('Sağlayıcı', e(p.provider) + ' · <span class="adm-mono">' + e(p.provider_reference || '—') + '</span>') +
          (p.failure_code ? s('Hata', e(p.failure_code) + ' — ' + e(p.failure_message || '')) : '') +
          s('Oluşturma', Y.tarih(p.created_at)) + (p.paid_at ? s('Ödeme', Y.tarih(p.paid_at)) : '') + (p.failed_at ? s('Başarısız', Y.tarih(p.failed_at)) : '') +
          (p.refunded_at ? s('İade', Y.tarih(p.refunded_at)) : '') + (p.last_checked_at ? s('Son sağlayıcı kontrolü', Y.tarih(p.last_checked_at)) : '') +
          s('Kayıt (enrollment)', '<span class="adm-mono">' + e(p.enrollment_id) + '</span>') +
          '</dl>' +
          '<div class="adm-label" style="margin:1.25rem 0 .5rem">İşlem geçmişi</div>' +
          (d.attempts.length ? '<ul class="adm-list" style="border:1px solid var(--theme-border);border-radius:10px">' + d.attempts.map(function (a) {
            var sn = SONUC[a.outcome] || [a.outcome, 'neutral'];
            return '<li style="padding:.7rem 1rem"><div class="adm-list-body"><div class="adm-list-title">' + e(DENEME[a.attempt_type] || a.attempt_type) + ' ' + Y.rozet(sn[0], sn[1]) + '</div>' +
              '<div class="adm-cell-sub">' + Y.tarih(a.created_at) + (a.status_before || a.status_after ? ' · ' + e(a.status_before || '—') + ' → ' + e(a.status_after || '—') : '') + (a.duration_ms !== null ? ' · ' + Y.sure(a.duration_ms) : '') + '</div>' +
              (a.error_message ? '<div class="adm-cell-sub" style="color:#b91c1c">' + e(a.error_code || '') + ' ' + e(a.error_message) + '</div>' : '') + '</div></li>';
          }).join('') + '</ul>' : Y.bos('İşlem kaydı yok.')) +
          '<p class="adm-hint" style="margin:1rem 0 0">Kart bilgisi sistemde tutulmaz; yalnızca sağlayıcı referansı, tutar ve durum saklanır.</p>'
      });
    }).catch(Y.hataGoster);
  }

  Y.sayfa({
    sayfa: 'odemeler',
    baslik: 'Ödemeler',
    aciklama: 'Ödeme sağlayıcısından gelen ödeme kayıtları ve durumları.',
    ciz: function (yer) {
      y = yer;
      y.icerik.innerHTML =
        '<div class="adm-stats" data-ozet></div>' +
        '<div class="adm-card"><div class="adm-toolbar">' +
          '<label class="adm-sr" for="o-ara">Ara</label><input class="adm-input" id="o-ara" type="search" placeholder="Aday, e-posta veya referans ara">' +
          '<label class="adm-sr" for="o-durum">Durum</label><select class="adm-input" id="o-durum" style="max-width:180px"><option value="">Tüm durumlar</option>' +
            Object.keys(Y.ODEME_DURUM).map(function (k) { return '<option value="' + k + '">' + Y.ODEME_DURUM[k][0] + '</option>'; }).join('') + '</select>' +
          '<span class="adm-spacer"></span><span class="adm-count" data-sayi></span>' +
        '</div><div class="adm-table-wrap" data-tablo></div></div>';
      var durum = y.icerik.querySelector('#o-durum');
      durum.value = filtre.status;
      durum.addEventListener('change', function () { filtre.status = durum.value; yukle().catch(Y.hataGoster); });
      y.icerik.querySelector('#o-ara').addEventListener('input', function (o) { filtre.arama = o.target.value; ciz(); });
      y.icerik.addEventListener('click', function (o) { var t = o.target.closest('[data-detay]'); if (t) detay(t.dataset.detay); });
      return api.hepsi('/admin/users', { role: 'candidate' }).then(function (u) {
        u.forEach(function (x) { kisiler[x.id] = x; });
        return yukle();
      });
    }
  });
})();
