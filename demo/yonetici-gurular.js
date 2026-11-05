// yonetici-gurular.js: Guru hesapları (POST /admin/gurus, PUT /admin/gurus/{guruID}, POST /admin/gurus/{userID}/invitation)
// Liste için backend'e eklenmesi beklenen GET /admin/gurus kullanılır; yoksa yalnız hesap listesi gösterilir.
(function () {
  var Y = window.Yonetici, e = Y.e, api = window.YoneticiAPI;
  var y, gurular = [], hesaplar = [], sektorler = [], listeYok = false;

  function hesap(userId) { return hesaplar.find(function (u) { return u.id === userId; }); }

  function ciz() {
    var govde = y.icerik.querySelector('[data-tablo]');
    var satirlar = listeYok
      ? hesaplar.map(function (u) { return { yalnizHesap: true, user: u }; })
      : gurular.map(function (g) { return { guru: g, user: hesap(g.user_id) }; });
    y.icerik.querySelector('[data-sayi]').textContent = satirlar.length + ' guru';
    if (!satirlar.length) { govde.innerHTML = Y.bos('Henüz guru yok. "Yeni guru" ile ilk guruyu ekle.'); return; }
    govde.innerHTML = '<table class="adm-table"><thead><tr><th>Guru</th><th>Unvan ve uzmanlık</th><th>Sektörler</th><th>Listede</th><th>Hesap</th><th><span class="adm-sr">İşlemler</span></th></tr></thead><tbody>' +
      satirlar.map(function (s) {
        var u = s.user, g = s.guru;
        var davet = u && !u.password_set;
        return '<tr>' +
          '<td><div class="adm-cell-main">' + e(g ? Y.adSoyad(g) : Y.adSoyad(u)) + '</div><div class="adm-cell-sub">' + e(u ? u.email : '—') + '</div></td>' +
          '<td>' + (g ? '<div>' + e(g.title) + '</div><div class="adm-cell-sub">' + e(g.expertise_area) + (g.seniority ? ' · ' + e(g.seniority) : '') + '</div>' : '<span class="adm-cell-sub">Profil bilgisi alınamadı</span>') + '</td>' +
          '<td>' + (g ? (g.sectors.length ? g.sectors.map(function (x) { return '<span class="adm-chip">' + e(x.name) + '</span>'; }).join('') : '<span class="adm-cell-sub">—</span>') : '—') + '</td>' +
          '<td>' + (g ? Y.aktifRozet(g.is_active, 'Yayında', 'Gizli') : '—') + '</td>' +
          '<td>' + (u ? (u.status !== 'active' ? Y.aktifRozet(false) : davet ? Y.rozet('Davet bekliyor', 'warning') : Y.aktifRozet(true)) : '—') + '</td>' +
          '<td class="adm-actions-cell">' +
            (davet ? '<button type="button" class="adm-btn adm-btn--ghost adm-btn--sm" data-davet="' + e(u.id) + '">Daveti yeniden gönder</button>' : '') +
            (g ? '<button type="button" class="adm-icon-btn" data-duzenle="' + e(g.id) + '" aria-label="' + e(Y.adSoyad(g)) + ' profilini düzenle" title="Profili düzenle"><span class="material-symbols-outlined" aria-hidden="true">edit</span></button>' : '') +
          '</td></tr>';
      }).join('') + '</tbody></table>';
  }

  function yukle() {
    return Promise.all([
      api.get('/admin/gurus').then(function (r) { listeYok = false; return r.items; }).catch(function (h) {
        if (h.status === 404 || h.status === 405) { listeYok = true; return []; }
        throw h;
      }),
      api.hepsi('/admin/users', { role: 'guru' }),
      sektorler.length ? Promise.resolve({ items: sektorler }) : api.get('/public/sectors')
    ]).then(function (r) {
      gurular = r[0]; hesaplar = r[1]; sektorler = r[2].items;
      y.icerik.querySelector('[data-uyari]').hidden = !listeYok;
      ciz();
    });
  }

  function sektorSecimi(secili) {
    return '<div class="adm-field"><span class="adm-label">Sektörler</span><div style="display:flex;flex-wrap:wrap;gap:.4rem 1rem">' +
      sektorler.map(function (s) {
        return '<label class="adm-check"><input type="checkbox" name="sector_ids" data-coklu value="' + e(s.id) + '"' + (secili.indexOf(s.id) > -1 ? ' checked' : '') + '>' + e(s.name) + '</label>';
      }).join('') + '</div><span class="adm-hint">Adaylar guruyu bu sektörlere göre filtreler.</span></div>';
  }

  function profilAlanlari(g) {
    return Y.alan('Unvan', '<input class="adm-input" id="g-title" name="title" value="' + e(g ? g.title : '') + '" required>', null, 'g-title') +
      '<div class="adm-row">' +
        Y.alan('Uzmanlık alanı', '<input class="adm-input" id="g-exp" name="expertise_area" value="' + e(g ? g.expertise_area : '') + '" required>', null, 'g-exp') +
        Y.alan('Kıdem', '<input class="adm-input" id="g-sen" name="seniority" value="' + e(g && g.seniority ? g.seniority : '') + '" placeholder="Ör. 10 yıl">', null, 'g-sen') +
      '</div>' +
      Y.alan('Kısa biyografi', '<textarea class="adm-input" id="g-bio" name="short_bio">' + e(g && g.short_bio ? g.short_bio : '') + '</textarea>', null, 'g-bio') +
      sektorSecimi(g ? g.sectors.map(function (s) { return s.id; }) : []) +
      '<div class="adm-field">' + Y.anahtar('is_active', g ? g.is_active : true, 'Aday listesinde yayında') + '</div>';
  }

  function govdeTemizle(v) {
    return {
      title: v.title.trim(), expertise_area: v.expertise_area.trim(),
      seniority: v.seniority.trim() || null, short_bio: v.short_bio.trim() || null,
      is_active: v.is_active, sector_ids: v.sector_ids || []
    };
  }

  var ETIKET = { first_name: 'Ad', last_name: 'Soyad', email: 'E-posta', title: 'Unvan', expertise_area: 'Uzmanlık alanı', sector_ids: 'Sektörler' };

  function yeniGuru() {
    Y.modal({
      baslik: 'Yeni guru',
      kaydetMetni: 'Oluştur ve davet gönder',
      alanEtiketleri: ETIKET,
      govde:
        '<p class="adm-hint" style="margin-top:0">Guruya parolasını belirleyeceği bir davet e-postası gönderilir. Demoda gurular yalnızca buradan tanımlanır.</p>' +
        '<div class="adm-row">' +
          Y.alan('Ad', '<input class="adm-input" id="g-ad" name="first_name" required>', null, 'g-ad') +
          Y.alan('Soyad', '<input class="adm-input" id="g-soyad" name="last_name" required>', null, 'g-soyad') +
        '</div>' +
        Y.alan('E-posta', '<input class="adm-input" id="g-eposta" name="email" type="email" required>', null, 'g-eposta') +
        profilAlanlari(null),
      kaydet: function (kutu) {
        var v = Y.formVerisi(kutu);
        var g = govdeTemizle(v);
        g.first_name = v.first_name.trim(); g.last_name = v.last_name.trim(); g.email = v.email.trim(); g.language = 'tr';
        return api.post('/admin/gurus', g).then(function (r) {
          Y.bildirim(r.invitation_sent ? 'Guru oluşturuldu, davet e-postası gönderildi.' : 'Guru oluşturuldu ancak davet gönderilemedi; yeniden gönderin.', !r.invitation_sent);
          return yukle();
        });
      }
    });
  }

  function duzenle(id) {
    var g = gurular.find(function (x) { return x.id === id; });
    Y.modal({
      baslik: Y.adSoyad(g) + ' · profil',
      alanEtiketleri: ETIKET,
      govde: profilAlanlari(g) + '<p class="adm-hint" style="margin:1rem 0 0">Ad, soyad ve e-posta guru hesabına aittir. Hesabı pasife almak için Kullanıcılar sayfasını kullan.</p>',
      kaydet: function (kutu) {
        return api.put('/admin/gurus/' + encodeURIComponent(g.id), govdeTemizle(Y.formVerisi(kutu))).then(function () {
          Y.bildirim('Guru profili güncellendi.');
          return yukle();
        });
      }
    });
  }

  function davetGonder(userId) {
    api.post('/admin/gurus/' + encodeURIComponent(userId) + '/invitation').then(function (r) { Y.bildirim(r.message || 'Davet yeniden gönderildi.'); }).catch(Y.hataGoster);
  }

  Y.sayfa({
    sayfa: 'gurular',
    baslik: 'Gurular',
    aciklama: 'Guru hesaplarını oluştur, profillerini ve sektörlerini düzenle.',
    ciz: function (yer) {
      y = yer;
      y.eylemler.innerHTML = '<button type="button" class="adm-btn adm-btn--primary" data-yeni><span class="material-symbols-outlined" aria-hidden="true">person_add</span>Yeni guru</button>';
      y.eylemler.querySelector('[data-yeni]').addEventListener('click', yeniGuru);
      y.icerik.innerHTML =
        '<div class="adm-note adm-note--warning" data-uyari hidden><span class="material-symbols-outlined" aria-hidden="true">warning</span><span>Backend henüz <span class="adm-mono">GET /admin/gurus</span> uç noktasını sunmuyor; yalnız guru hesapları listeleniyor ve profil düzenleme kapalı.</span></div>' +
        '<div class="adm-card"><div class="adm-toolbar"><span class="adm-count" data-sayi></span></div><div class="adm-table-wrap" data-tablo></div></div>';
      y.icerik.addEventListener('click', function (o) {
        var d = o.target.closest('[data-duzenle]');
        if (d) return duzenle(d.dataset.duzenle);
        var v = o.target.closest('[data-davet]');
        if (v) davetGonder(v.dataset.davet);
      });
      return yukle().then(function () {
        if (new URLSearchParams(location.search).get('yeni') === '1') yeniGuru();
      });
    }
  });
})();
