// yonetici-gurular.js: Guru hesapları (GET/POST /admin/gurus, PUT /admin/gurus/{guruID}, POST /admin/gurus/{userID}/invitation)
// Liste: GET /admin/gurus (sayfalı; pasif profiller ve pasif hesaplar dahil). Hesap bilgisi her satırda g.account içinde gelir
// ({email, status, email_verified_at, password_set, last_login_at}); ayrı kullanıcı listesi çağrısı gerekmez.
// Etap 12 (E6-21): profil alanları (ülke, seans dilleri, TR/EN biyografi, hedef kitleler, kariyer) ve belgeler
// (GET /admin/guru-documents, PATCH /admin/guru-documents/{id} {status, note}, GET …/{id}/file).
// Fotoğraf: g.avatar_url (GET /admin/users/{userID}/avatar, Bearer) → Y.kisiAvatar + Y.avatarlariYukle; yoksa baş harfler.
(function () {
  var Y = window.Yonetici, e = Y.e, api = window.YoneticiAPI;
  var y, gurular = [], sektorler = [];

  function ciz() {
    var govde = y.icerik.querySelector('[data-tablo]');
    y.icerik.querySelector('[data-sayi]').textContent = gurular.length + ' guru';
    if (!gurular.length) { govde.innerHTML = Y.bos('Henüz guru yok. "Yeni guru" ile ilk guruyu ekle.'); return; }
    govde.innerHTML = '<table class="adm-table"><thead><tr><th>Guru</th><th>Unvan ve uzmanlık</th><th>Sektörler</th><th>Belgeler</th><th>Listede</th><th>Hesap</th><th><span class="adm-sr">İşlemler</span></th></tr></thead><tbody>' +
      gurular.map(function (g) {
        var u = g.account || null;
        var davet = u && !u.password_set;
        var sektorlerG = g.sectors || [];
        return '<tr>' +
          '<td><div class="adm-person">' + Y.kisiAvatar(Y.adSoyad(g), g.avatar_url) + '<div><div class="adm-cell-main">' + e(Y.adSoyad(g)) + '</div><div class="adm-cell-sub">' + e(u ? u.email : '—') + '</div></div></div></td>' +
          '<td><div>' + e(g.title) + '</div><div class="adm-cell-sub">' + e(g.expertise_area) + (g.seniority ? ' · ' + e(g.seniority) : '') + '</div></td>' +
          '<td>' + (sektorlerG.length ? sektorlerG.map(function (x) { return '<span class="adm-chip">' + e(x.name) + '</span>'; }).join('') : '<span class="adm-cell-sub">—</span>') + '</td>' +
          '<td>' + belgeOzeti(g) + '</td>' +
          '<td>' + Y.aktifRozet(g.is_active, 'Yayında', 'Gizli') + '</td>' +
          '<td>' + (u ? (u.status !== 'active' ? Y.aktifRozet(false) : davet ? Y.rozet('Davet bekliyor', 'warning') : Y.aktifRozet(true)) : '—') + '</td>' +
          '<td class="adm-actions-cell">' +
            (davet ? '<button type="button" class="adm-btn adm-btn--ghost adm-btn--sm" data-davet="' + e(g.user_id) + '">Daveti yeniden gönder</button>' : '') +
            '<button type="button" class="adm-icon-btn" data-duzenle="' + e(g.id) + '" aria-label="' + e(Y.adSoyad(g)) + ' profilini düzenle" title="Profili düzenle"><span class="material-symbols-outlined" aria-hidden="true">edit</span></button>' +
          '</td></tr>';
      }).join('') + '</tbody></table>';
    Y.avatarlariYukle(govde);
  }

  var BELGE_DURUM = { pending: ['Bekliyor', 'warning'], verified: ['Doğrulandı', 'success'], rejected: ['Reddedildi', 'danger'] };
  function belgeRozet(st) { var d = BELGE_DURUM[st] || [st, 'neutral']; return Y.rozet(d[0], d[1]); }
  var bekleyenler = [];
  function belgeOzeti(g) {
    var b = g.documents || [];
    if (!b.length) return '<span class="adm-cell-sub">—</span>';
    var bek = b.filter(function (x) { return x.status === 'pending'; }).length;
    return '<button type="button" class="adm-btn adm-btn--ghost adm-btn--sm" data-belgeler="' + e(g.id) + '">' + b.length + ' belge</button>' +
      (bek ? ' ' + Y.rozet(bek + ' bekliyor', 'warning') : '');
  }

  function cizBekleyen() {
    var kutu = y.icerik.querySelector('[data-bekleyen]');
    if (!kutu) return;
    if (!bekleyenler.length) { kutu.hidden = true; return; }
    kutu.hidden = false;
    kutu.innerHTML = '<div class="adm-card-head"><div><h2>İnceleme bekleyen belgeler</h2><p>Doğrulanan belgeler danışmanın herkese açık profilinde görünür (dosya görünmez).</p></div></div>' +
      '<ul class="adm-list">' + bekleyenler.map(function (d) {
        var g = gurular.find(function (x) { return x.id === d.guru_id; });
        return '<li><div class="adm-list-body"><div class="adm-list-title">' + e(d.title) + '</div><div class="adm-list-text">' + e(d.issuer) + (d.year ? ' · ' + d.year : '') +
          (g ? ' · ' + e(Y.adSoyad(g)) : '') + '</div></div><div class="adm-list-actions">' + belgeEylemleri(d) + '</div></li>';
      }).join('') + '</ul>';
  }

  function belgeEylemleri(d) {
    return '<button type="button" class="adm-btn adm-btn--ghost adm-btn--sm" data-belge-ac="' + e(d.id) + '">Dosyayı görüntüle</button>' +
      (d.status !== 'verified' ? '<button type="button" class="adm-btn adm-btn--sm" data-belge-dogrula="' + e(d.id) + '">Doğrula</button>' : '') +
      (d.status !== 'rejected' ? '<button type="button" class="adm-btn adm-btn--ghost adm-btn--sm" data-belge-reddet="' + e(d.id) + '">Reddet</button>' : '');
  }

  function belgeAc(id) {
    // Açılır pencere engeline takılmamak için sekme tıklama anında açılır, dosya gelince içine yüklenir.
    var sekme = window.open('', '_blank');
    api.dosya('/admin/guru-documents/' + encodeURIComponent(id) + '/file').then(function (r) {
      var url = URL.createObjectURL(r.blob);
      if (/^(application\/pdf|image\/)/.test(r.blob.type) && sekme) {
        sekme.location.href = url;
      } else {
        if (sekme) sekme.close();
        var l = document.createElement('a'); l.href = url; l.download = r.ad; document.body.appendChild(l); l.click(); l.remove();
      }
      setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
    }).catch(function (h) { if (sekme) sekme.close(); Y.hataGoster(h); });
  }

  function belgeIncele(id, durum) {
    var reddet = durum === 'rejected';
    Y.modal({
      baslik: reddet ? 'Belgeyi reddet' : 'Belgeyi doğrula',
      kaydetMetni: reddet ? 'Reddet' : 'Doğrula',
      alanEtiketleri: { status: 'Durum', note: 'Not' },
      govde: Y.alan('Not', '<textarea class="adm-input" id="b-note" name="note" maxlength="500" placeholder="' + (reddet ? 'Ret nedeni (danışman görür)' : 'İsteğe bağlı') + '"></textarea>', null, 'b-note'),
      kaydet: function (kutu) {
        var v = Y.formVerisi(kutu);
        return api.patch('/admin/guru-documents/' + encodeURIComponent(id), { status: durum, note: v.note.trim() || null }).then(function () {
          Y.bildirim(reddet ? 'Belge reddedildi.' : 'Belge doğrulandı.');
          return yukle();
        });
      }
    });
  }

  function belgeListesi(id) {
    var g = gurular.find(function (x) { return x.id === id; });
    if (!g) return;
    Y.modal({
      baslik: Y.adSoyad(g) + ' · belgeler',
      kaydetMetni: 'Kapat',
      iptalMetni: false,
      govde: (g.documents || []).length ? '<ul class="adm-list">' + g.documents.map(function (d) {
        return '<li><div class="adm-list-body"><div class="adm-list-title">' + e(d.title) + ' ' + belgeRozet(d.status) + '</div><div class="adm-list-text">' + e(d.issuer) + (d.year ? ' · ' + d.year : '') + '</div></div>' +
          '<div class="adm-list-actions">' + belgeEylemleri(d) + '</div></li>';
      }).join('') + '</ul>' : Y.bos('Belge yok.'),
      kaydet: function () { return Promise.resolve(); }
    });
  }

  function yukle() {
    return Promise.all([
      api.hepsi('/admin/gurus'),
      sektorler.length ? Promise.resolve({ items: sektorler }) : api.get('/public/sectors'),
      api.get('/admin/guru-documents', { status: 'pending' }).catch(function () { return { items: [] }; })
    ]).then(function (r) {
      gurular = r[0]; sektorler = r[1].items; bekleyenler = (r[2] && r[2].items) || [];
      ciz();
      cizBekleyen();
    });
  }

  function sektorSecimi(secili, mevcut) {
    // /public/sectors yalnız aktif sektörleri döner; guruya bağlı pasif bir sektör seçimden sessizce düşmesin.
    var liste = sektorler.concat((mevcut || []).filter(function (m) { return !sektorler.some(function (s) { return s.id === m.id; }); }));
    return '<div class="adm-field"><span class="adm-label">Sektörler</span><div style="display:flex;flex-wrap:wrap;gap:.4rem 1rem">' +
      liste.map(function (s) {
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
      sektorSecimi(g ? (g.sectors || []).map(function (s) { return s.id; }) : [], g ? g.sectors : []) +
      '<div class="adm-field">' + Y.anahtar('is_active', g ? g.is_active : true, 'Aday listesinde yayında') + '</div>' +
      ayrintiAlanlari(g);
  }

  // E6-21: herkese açık profil ayrıntıları (danışman "Profil ayrıntıları" sekmesiyle aynı alanlar).
  function ayrintiAlanlari(g) {
    var diller = g && g.languages ? g.languages : [];
    var kariyer = g && g.career ? g.career : [];
    return '<h3 class="adm-subtitle" style="margin:1.25rem 0 .5rem">Profil ayrıntıları</h3>' +
      '<div class="adm-row">' +
        Y.alan('Ülke kodu', '<input class="adm-input" id="g-country" name="country" maxlength="2" placeholder="TR" style="max-width:120px;text-transform:uppercase" value="' + e(g && g.country ? g.country : '') + '">', 'ISO iki harf (ör. TR).', 'g-country') +
        '<div class="adm-field"><span class="adm-label">Seans dilleri</span><div style="display:flex;gap:1rem">' +
          [['tr', 'Türkçe'], ['en', 'English']].map(function (d) {
            return '<label class="adm-check"><input type="checkbox" name="languages" data-coklu value="' + d[0] + '"' + (diller.indexOf(d[0]) > -1 ? ' checked' : '') + '>' + d[1] + '</label>';
          }).join('') + '</div></div>' +
      '</div>' +
      Y.alan('Biyografi (Türkçe)', '<textarea class="adm-input" id="g-biotr" name="bio_tr" maxlength="2000">' + e(g && g.bio_tr ? g.bio_tr : '') + '</textarea>', null, 'g-biotr') +
      Y.alan('Biyografi (English)', '<textarea class="adm-input" id="g-bioen" name="bio_en" maxlength="2000">' + e(g && g.bio_en ? g.bio_en : '') + '</textarea>', null, 'g-bioen') +
      Y.alan('Hedef kitleler', '<input class="adm-input" id="g-aud" name="audiences" value="' + e((g && g.audiences ? g.audiences : []).join(', ')) + '">', 'Virgülle ayırın (en çok 8).', 'g-aud') +
      Y.alan('Kariyer', '<textarea class="adm-input adm-mono" id="g-career" name="career" rows="4" placeholder="Unvan | Kurum | 2018 | 2022">' +
        e(kariyer.map(function (c) { return [c.title, c.org, c.start_year || '', c.end_year || ''].join(' | '); }).join('\n')) + '</textarea>',
        'Her satır bir görev: Unvan | Kurum | başlangıç yılı | bitiş yılı (boş = devam ediyor).', 'g-career');
  }

  function kariyerOku(metin) {
    return Y.satirlar(metin).map(function (satir) {
      var p = satir.split('|').map(function (x) { return x.trim(); });
      return { title: p[0] || '', org: p[1] || '', start_year: p[2] ? parseInt(p[2], 10) : null, end_year: p[3] ? parseInt(p[3], 10) : null };
    });
  }

  function govdeTemizle(v) {
    return {
      title: v.title.trim(), expertise_area: v.expertise_area.trim(),
      seniority: v.seniority.trim() || null, short_bio: v.short_bio.trim() || null,
      is_active: v.is_active, sector_ids: v.sector_ids || [],
      country: (v.country || '').trim().toUpperCase() || null,
      languages: v.languages || [],
      bio_tr: (v.bio_tr || '').trim() || null,
      bio_en: (v.bio_en || '').trim() || null,
      audiences: String(v.audiences || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean),
      career: kariyerOku(v.career)
    };
  }

  var ETIKET = { first_name: 'Ad', last_name: 'Soyad', email: 'E-posta', title: 'Unvan', expertise_area: 'Uzmanlık alanı', sector_ids: 'Sektörler',
    country: 'Ülke kodu', languages: 'Seans dilleri', bio_tr: 'Biyografi (Türkçe)', bio_en: 'Biyografi (English)', audiences: 'Hedef kitleler', career: 'Kariyer' };

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
    if (!g) return;
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
        '<div class="adm-card" data-bekleyen hidden></div>' +
        '<div class="adm-card"><div class="adm-toolbar"><span class="adm-count" data-sayi></span></div><div class="adm-table-wrap" data-tablo></div></div>';
      document.addEventListener('click', function (o) {
        var t = o.target.closest('[data-belge-ac],[data-belge-dogrula],[data-belge-reddet]');
        if (!t) return;
        if (t.dataset.belgeAc) return belgeAc(t.dataset.belgeAc);
        var acikModal = document.querySelector('.adm-modal-backdrop, dialog[open]');
        if (acikModal && acikModal.contains(t)) { var kapat = acikModal.querySelector('[data-kapat], .adm-modal-close'); if (kapat) kapat.click(); }
        if (t.dataset.belgeDogrula) return belgeIncele(t.dataset.belgeDogrula, 'verified');
        if (t.dataset.belgeReddet) return belgeIncele(t.dataset.belgeReddet, 'rejected');
      });
      y.icerik.addEventListener('click', function (o) {
        var b = o.target.closest('[data-belgeler]');
        if (b) return belgeListesi(b.dataset.belgeler);
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
