// yonetici-panel.js: Genel bakış (mevcut admin uç noktalarından derlenir)
(function () {
  var Y = window.Yonetici, e = Y.e, api = window.YoneticiAPI;

  function stat(ikon, etiket, deger, alt, href) {
    return '<a class="adm-card adm-stat" href="' + href + '" style="text-decoration:none;color:inherit;display:block">' +
      '<div class="adm-stat-label"><span class="material-symbols-outlined" aria-hidden="true">' + ikon + '</span>' + e(etiket) + '</div>' +
      '<div class="adm-stat-value">' + deger + '</div><div class="adm-stat-sub">' + alt + '</div></a>';
  }

  Y.sayfa({
    sayfa: 'panel',
    baslik: 'Genel bakış',
    aciklama: 'Hesaplar, ödemeler ve YZ kullanımının özeti.',
    ciz: function (y) {
      var otuzGun = new Date(Date.now() - 30 * 86400e3).toISOString();
      return Promise.all([
        api.hepsi('/admin/users'),
        api.hepsi('/admin/payments'),
        api.get('/admin/ai-costs', { from: otuzGun, to: new Date().toISOString() }),
        api.get('/admin/audit-logs', { limit: 6 })
      ]).then(function (r) {
        var users = r[0], odemeler = r[1], maliyet = r[2], loglar = r[3].items;
        var adaylar = users.filter(function (u) { return u.role === 'candidate'; });
        var gurular = users.filter(function (u) { return u.role === 'guru'; });
        var odenen = odemeler.filter(function (p) { return p.status === 'PAID'; });
        var tahsilat = odenen.reduce(function (t, p) { return t + (p.currency === 'TRY' ? p.amount_minor : 0); }, 0);
        var yz = maliyet.items.find(function (x) { return x.cost_currency === 'USD'; }) || maliyet.items[0] || { request_count: 0, error_count: 0, cost_micro: 0, cost_currency: 'USD', average_duration_ms: 0 };
        var adSoyad = {};
        users.forEach(function (u) { adSoyad[u.id] = Y.adSoyad(u); });

        var durumSay = { PAID: 0, PENDING: 0, FAILED: 0, REFUNDED: 0 };
        odemeler.forEach(function (p) { durumSay[p.status] = (durumSay[p.status] || 0) + 1; });
        var toplam = odemeler.length || 1;
        var odemeSatir = Object.keys(durumSay).map(function (d) {
          return '<tr><td>' + Y.odemeRozet(d) + '</td><td class="adm-num">' + durumSay[d] + '</td><td style="width:45%"><div class="adm-meter"><span style="width:' + Math.round(durumSay[d] / toplam * 100) + '%"></span></div></td></tr>';
        }).join('');

        var bekleyen = odemeler.filter(function (p) { return p.status === 'PENDING'; });
        var dogrulanmamis = adaylar.filter(function (u) { return !u.email_verified_at; });
        var davetBekleyen = gurular.filter(function (u) { return !u.password_set; });
        var dikkat = [];
        bekleyen.forEach(function (p) { dikkat.push(['schedule', 'Beklemede ödeme: ' + (adSoyad[p.user_id] || 'Aday'), 'Sağlayıcı son sorgu: ' + Y.tarih(p.last_checked_at), 'yonetici-odemeler.html?status=PENDING']); });
        davetBekleyen.forEach(function (u) { dikkat.push(['mail', 'Guru daveti tamamlanmadı: ' + Y.adSoyad(u), 'Parola henüz belirlenmedi', 'yonetici-gurular.html']); });
        dogrulanmamis.forEach(function (u) { dikkat.push(['mark_email_unread', 'E-posta doğrulanmadı: ' + Y.adSoyad(u), 'Kayıt: ' + Y.tarih(u.created_at, false), 'yonetici-kullanicilar.html?role=candidate']); });
        if (yz.error_count) dikkat.push(['error', yz.error_count + ' YZ çağrısı hata/zaman aşımı ile sonuçlandı', 'Son 30 gün', 'yonetici-yz-kullanim.html']);

        y.icerik.innerHTML =
          '<div class="adm-stats">' +
            stat('group', 'Adaylar', Y.sayi(adaylar.length), Y.sayi(adaylar.filter(function (u) { return u.status === 'active'; }).length) + ' aktif · ' + dogrulanmamis.length + ' doğrulama bekliyor', 'yonetici-kullanicilar.html?role=candidate') +
            stat('school', 'Gurular', Y.sayi(gurular.length), Y.sayi(gurular.filter(function (u) { return u.status === 'active'; }).length) + ' aktif hesap', 'yonetici-gurular.html') +
            stat('payments', 'Tahsil edilen', Y.para(tahsilat), odenen.length + ' başarılı ödeme · ' + bekleyen.length + ' beklemede', 'yonetici-odemeler.html') +
            stat('neurology', 'YZ maliyeti (30 gün)', Y.maliyet(yz.cost_micro, yz.cost_currency, 2), Y.sayi(yz.request_count) + ' çağrı · ort. ' + Y.sure(yz.average_duration_ms), 'yonetici-yz-kullanim.html') +
          '</div>' +
          '<div class="adm-grid adm-grid--2">' +
            '<div class="adm-card"><div class="adm-card-head"><div><h2>Ödeme durumları</h2><p>Tüm ödeme kayıtlarının dağılımı.</p></div><a class="adm-btn adm-btn--sm" href="yonetici-odemeler.html">Ödemeler</a></div>' +
              '<div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>Durum</th><th class="adm-num">Adet</th><th><span class="adm-sr">Oran</span></th></tr></thead><tbody>' + odemeSatir + '</tbody></table></div></div>' +
            '<div class="adm-card"><div class="adm-card-head"><div><h2>Dikkat gerektirenler</h2><p>Takip edilmesi gereken açık durumlar.</p></div></div>' +
              (dikkat.length ? '<ul class="adm-list">' + dikkat.slice(0, 6).map(function (d) {
                return '<li><span class="material-symbols-outlined" aria-hidden="true" style="color:var(--primary);font-size:20px">' + d[0] + '</span><div class="adm-list-body"><a class="adm-list-title" href="' + d[3] + '">' + e(d[1]) + '</a><div class="adm-cell-sub">' + e(d[2]) + '</div></div></li>';
              }).join('') + '</ul>' : Y.bos('Şu an dikkat gerektiren bir durum yok.')) +
            '</div>' +
          '</div>' +
          '<div class="adm-card" style="margin-top:1.25rem"><div class="adm-card-head"><div><h2>Son işlemler</h2><p>Denetim kaydına düşen son kritik işlemler.</p></div>' +
            '<a class="adm-btn adm-btn--sm" href="yonetici-denetim.html">Tümünü gör</a></div>' +
            (loglar.length ? '<ul class="adm-list">' + loglar.map(function (l) {
              return '<li><div class="adm-list-body"><div class="adm-list-title">' + e(Y.eylemAdi(l.action)) + '</div>' +
                '<div class="adm-cell-sub">' + e(l.actor_user_id ? (adSoyad[l.actor_user_id] || 'Bilinmeyen kullanıcı') : 'Sistem') + ' · ' + e(Y.VARLIK[l.entity_type] || l.entity_type || '—') + ' · ' + Y.tarih(l.created_at) + '</div></div></li>';
            }).join('') + '</ul>' : Y.bos('Henüz kayıt yok.')) + '</div>';
      });
    }
  });
})();
