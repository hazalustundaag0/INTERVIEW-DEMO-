// yonetici-kullanicilar.js: Kullanıcı hesapları (GET /admin/users, PATCH /admin/users/{id}/status, POST /admin/users/{id}/logout-all)
(function () {
  var Y = window.Yonetici, e = Y.e, api = window.YoneticiAPI;
  var params = new URLSearchParams(location.search);
  var filtre = { arama: '', rol: Y.ROL[params.get('role')] ? params.get('role') : '', durum: '' };
  var kullanicilar = [];
  var benimId = (api.oturumGetir() || { user: {} }).user.id;
  var y;

  function liste() {
    var q = filtre.arama.trim().toLocaleLowerCase('tr-TR');
    return kullanicilar.filter(function (u) {
      if (filtre.rol && u.role !== filtre.rol) return false;
      if (filtre.durum === 'active' && u.status !== 'active') return false;
      if (filtre.durum === 'passive' && u.status !== 'passive') return false;
      if (filtre.durum === 'unverified' && u.email_verified_at) return false;
      if (q && (Y.adSoyad(u) + ' ' + u.email).toLocaleLowerCase('tr-TR').indexOf(q) === -1) return false;
      return true;
    });
  }

  function tabloCiz() {
    var satirlar = liste();
    var govde = y.icerik.querySelector('[data-tablo]');
    y.icerik.querySelector('[data-sayi]').textContent = satirlar.length + ' kullanıcı';
    if (!satirlar.length) { govde.innerHTML = Y.bos('Filtreye uyan kullanıcı yok.'); return; }
    govde.innerHTML = '<table class="adm-table"><thead><tr><th>Kullanıcı</th><th>Rol</th><th>E-posta</th><th>Son giriş</th><th>Kayıt</th><th>Hesap</th><th><span class="adm-sr">İşlemler</span></th></tr></thead><tbody>' +
      satirlar.map(function (u) {
        var ben = u.id === benimId;
        return '<tr>' +
          '<td><div class="adm-cell-main">' + e(Y.adSoyad(u)) + (ben ? ' <span class="adm-cell-sub">(sen)</span>' : '') + '</div><div class="adm-cell-sub">' + e(u.email) + '</div></td>' +
          '<td>' + Y.rozet(Y.ROL[u.role] || u.role, u.role === 'admin' ? 'info' : 'neutral', true) + '</td>' +
          '<td>' + (u.email_verified_at ? Y.rozet('Doğrulandı', 'success') : Y.rozet(u.role === 'guru' ? 'Davet bekliyor' : 'Bekliyor', 'warning')) + '</td>' +
          '<td class="adm-cell-sub" style="white-space:nowrap">' + (u.last_login_at ? Y.tarih(u.last_login_at) : '—') + '</td>' +
          '<td class="adm-cell-sub" style="white-space:nowrap">' + Y.tarih(u.created_at, false) + '</td>' +
          '<td>' + Y.anahtar('status', u.status === 'active', u.status === 'active' ? 'Aktif' : 'Pasif', ' data-durum="' + e(u.id) + '"' + (ben ? ' disabled title="Kendi hesabını pasife alamazsın"' : '')) + '</td>' +
          '<td class="adm-actions-cell">' +
            '<button type="button" class="adm-icon-btn" data-detay="' + e(u.id) + '" aria-label="' + e(Y.adSoyad(u)) + ' detayı" title="Detay"><span class="material-symbols-outlined" aria-hidden="true">visibility</span></button>' +
            '<button type="button" class="adm-icon-btn" data-oturum="' + e(u.id) + '" aria-label="' + e(Y.adSoyad(u)) + ' oturumlarını kapat" title="Tüm oturumları kapat"' + (ben ? ' disabled' : '') + '><span class="material-symbols-outlined" aria-hidden="true">logout</span></button>' +
          '</td></tr>';
      }).join('') + '</tbody></table>';
  }

  function yenile() {
    return api.hepsi('/admin/users').then(function (v) { kullanicilar = v; tabloCiz(); });
  }

  function durumDegistir(girdi) {
    var u = kullanicilar.find(function (x) { return x.id === girdi.dataset.durum; });
    var yeni = girdi.checked ? 'active' : 'passive';
    girdi.checked = !girdi.checked; // onaydan sonra tablo yenilenir
    var soru = yeni === 'active'
      ? Promise.resolve(true)
      : Y.onay('Hesabı pasife al', [Y.vurgu(Y.adSoyad(u)), ' hesabı pasife alınacak. Kullanıcının tüm oturumları anında kapanır ve tekrar giriş yapamaz.'], 'Pasife al', true);
    soru.then(function (tamam) {
      if (!tamam) return;
      return api.patch('/admin/users/' + encodeURIComponent(u.id) + '/status', { status: yeni }).then(function () {
        Y.bildirim(Y.adSoyad(u) + (yeni === 'active' ? ' aktif edildi.' : ' pasife alındı.'));
        return yenile();
      });
    }).catch(Y.hataGoster);
  }

  function oturumlariKapat(id) {
    var u = kullanicilar.find(function (x) { return x.id === id; });
    Y.onay('Tüm oturumları kapat', [Y.vurgu(Y.adSoyad(u)), ' tüm cihazlardan çıkış yaptırılacak. Hesap aktif kalır; kullanıcı tekrar giriş yapabilir.'], 'Oturumları kapat', true).then(function (tamam) {
      if (!tamam) return;
      return api.post('/admin/users/' + encodeURIComponent(id) + '/logout-all').then(function (r) {
        Y.bildirim(r.revoked_tokens ? r.revoked_tokens + ' oturum kapatıldı.' : 'Açık oturum yoktu.');
      });
    }).catch(Y.hataGoster);
  }

  function detay(id) {
    var u = kullanicilar.find(function (x) { return x.id === id; });
    var s = function (a, b) { return '<dt>' + e(a) + '</dt><dd>' + b + '</dd>'; };
    Y.modal({
      baslik: Y.adSoyad(u),
      iptalMetni: 'Kapat',
      govde: '<dl class="adm-dl">' +
        s('E-posta', e(u.email)) + s('Rol', e(Y.ROL[u.role] || u.role)) + s('Hesap', Y.aktifRozet(u.status === 'active')) +
        s('E-posta doğrulama', u.email_verified_at ? Y.tarih(u.email_verified_at) : 'Bekliyor') +
        s('Parola belirlendi', u.password_set ? 'Evet' : 'Hayır') + s('Dil', u.preferred_language === 'en' ? 'İngilizce' : 'Türkçe') +
        s('Son giriş', u.last_login_at ? Y.tarih(u.last_login_at) : '—') + s('Kayıt', Y.tarih(u.created_at)) + s('Son güncelleme', Y.tarih(u.updated_at)) +
        s('Kimlik', '<span class="adm-mono">' + e(u.id) + '</span>') +
        '</dl>' +
        '<p class="adm-hint" style="margin:1rem 0 0">Bu kullanıcının işlemleri için <a href="yonetici-denetim.html?actor_user_id=' + encodeURIComponent(u.id) + '">denetim kayıtlarına</a> bakabilirsin. CV, cevap ve hikâye içerikleri kişisel veri olduğundan yönetici panelinde gösterilmez.</p>'
    });
  }

  Y.sayfa({
    sayfa: 'kullanicilar',
    baslik: 'Kullanıcılar',
    aciklama: 'Aday, guru ve yönetici hesaplarını görüntüle; hesabı aktif/pasif yap veya oturumlarını kapat.',
    ciz: function (yer) {
      y = yer;
      y.eylemler.innerHTML = '<a class="adm-btn adm-btn--primary" href="yonetici-gurular.html?yeni=1"><span class="material-symbols-outlined" aria-hidden="true">person_add</span>Yeni guru</a>';
      y.icerik.innerHTML =
        '<div class="adm-note"><span class="material-symbols-outlined" aria-hidden="true">info</span><span>Adaylar kendi kayıt olur; gurular yönetici tarafından davetle açılır. Yönetici hesapları sunucuda <span class="adm-mono">cmd/admin</span> komutuyla oluşturulur.</span></div>' +
        '<div class="adm-card">' +
          '<div class="adm-toolbar">' +
            '<label class="adm-sr" for="k-ara">Ara</label><input class="adm-input" id="k-ara" type="search" placeholder="Ad veya e-posta ara">' +
            '<label class="adm-sr" for="k-rol">Rol</label><select class="adm-input" id="k-rol" style="max-width:160px"><option value="">Tüm roller</option><option value="candidate">Aday</option><option value="guru">Guru</option><option value="admin">Yönetici</option></select>' +
            '<label class="adm-sr" for="k-durum">Durum</label><select class="adm-input" id="k-durum" style="max-width:210px"><option value="">Tüm durumlar</option><option value="active">Aktif</option><option value="passive">Pasif</option><option value="unverified">E-posta doğrulanmamış</option></select>' +
            '<span class="adm-spacer"></span><span class="adm-count" data-sayi></span>' +
          '</div>' +
          '<div class="adm-table-wrap" data-tablo></div>' +
        '</div>';
      var rolSec = y.icerik.querySelector('#k-rol');
      rolSec.value = filtre.rol;
      y.icerik.querySelector('#k-ara').addEventListener('input', function (o) { filtre.arama = o.target.value; tabloCiz(); });
      rolSec.addEventListener('change', function (o) { filtre.rol = o.target.value; tabloCiz(); });
      y.icerik.querySelector('#k-durum').addEventListener('change', function (o) { filtre.durum = o.target.value; tabloCiz(); });
      y.icerik.addEventListener('change', function (o) { if (o.target.dataset.durum) durumDegistir(o.target); });
      y.icerik.addEventListener('click', function (o) {
        var d = o.target.closest('[data-detay]');
        if (d) return detay(d.dataset.detay);
        var k = o.target.closest('[data-oturum]');
        if (k) oturumlariKapat(k.dataset.oturum);
      });
      return yenile();
    }
  });
})();
