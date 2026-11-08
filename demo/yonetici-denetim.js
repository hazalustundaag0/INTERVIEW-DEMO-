// yonetici-denetim.js: Denetim kayıtları (GET /admin/audit-logs) — salt okunur, sayfalı
(function () {
  var Y = window.Yonetici, e = Y.e, api = window.YoneticiAPI;
  var params = new URLSearchParams(location.search);
  var filtre = { action: params.get('action') || '', entity_type: params.get('entity_type') || '', actor_user_id: params.get('actor_user_id') || '', from: '', to: '' };
  var y, kisiler = {}, kayitlar = [], imlec = null;

  function ozetle(v) {
    if (v === null || v === undefined) return '';
    if (typeof v !== 'object') return String(v);
    return Object.keys(v).slice(0, 4).map(function (k) {
      var d = v[k];
      return k + ': ' + (d !== null && typeof d === 'object' ? JSON.stringify(d) : String(d));
    }).join(', ') + (Object.keys(v).length > 4 ? ' …' : '');
  }

  function aktorAdi(l) {
    if (!l.actor_user_id) return 'Sistem';
    var u = kisiler[l.actor_user_id];
    return u ? Y.adSoyad(u) : 'Bilinmeyen kullanıcı';
  }

  function satirCiz(l) {
    var degisim = ozetle(l.new_value) || ozetle(l.old_value);
    return '<tr><td style="white-space:nowrap">' + Y.tarih(l.created_at) + '</td>' +
      '<td style="white-space:nowrap"><div class="adm-cell-main">' + e(aktorAdi(l)) + '</div><div class="adm-cell-sub">' + e(l.actor_role ? (Y.ROL[l.actor_role] || l.actor_role) : '—') + '</div></td>' +
      '<td><div>' + e(Y.eylemAdi(l.action)) + '</div><div class="adm-mono adm-cell-sub">' + e(l.action) + '</div></td>' +
      '<td>' + e(Y.VARLIK[l.entity_type] || l.entity_type || '—') + '</td>' +
      '<td class="adm-cell-sub" style="max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + e(degisim) + '">' + e(degisim || '—') + '</td>' +
      '<td class="adm-actions-cell"><button type="button" class="adm-icon-btn" data-detay="' + l.id + '" aria-label="Kayıt detayı"><span class="material-symbols-outlined" aria-hidden="true">data_object</span></button></td></tr>';
  }

  function ciz() {
    var kok = y.icerik.querySelector('[data-tablo]');
    y.icerik.querySelector('[data-sayi]').textContent = kayitlar.length + (imlec ? '+' : '') + ' kayıt';
    y.icerik.querySelector('[data-daha]').hidden = !imlec;
    if (!kayitlar.length) { kok.innerHTML = Y.bos('Filtreye uyan kayıt yok.'); return; }
    kok.innerHTML = '<table class="adm-table"><thead><tr><th>Zaman</th><th>Kullanıcı</th><th>İşlem</th><th>Varlık</th><th>Değişiklik</th><th><span class="adm-sr">Detay</span></th></tr></thead><tbody>' + kayitlar.map(satirCiz).join('') + '</tbody></table>';
  }

  function sorgu() {
    return {
      action: filtre.action, entity_type: filtre.entity_type, actor_user_id: filtre.actor_user_id,
      from: filtre.from ? new Date(filtre.from + 'T00:00:00').toISOString() : '',
      to: filtre.to ? new Date(new Date(filtre.to + 'T00:00:00').getTime() + 86400e3).toISOString() : '',
      limit: 50
    };
  }

  function yukle(devam) {
    var q = sorgu();
    if (devam) q.cursor = imlec;
    return api.get('/admin/audit-logs', q).then(function (r) {
      kayitlar = devam ? kayitlar.concat(r.items) : r.items;
      imlec = r.next_cursor;
      ciz();
    });
  }

  function detay(id) {
    var l = kayitlar.find(function (x) { return String(x.id) === String(id); });
    var json = function (v) { return v === null || v === undefined ? '<span class="adm-cell-sub">—</span>' : '<pre class="adm-mono" style="margin:0;white-space:pre-wrap;overflow-wrap:anywhere;background:var(--theme-card-subtle);padding:.6rem .8rem;border-radius:8px">' + e(JSON.stringify(v, null, 2)) + '</pre>'; };
    var s = function (a, b) { return '<dt>' + e(a) + '</dt><dd>' + b + '</dd>'; };
    Y.modal({
      baslik: Y.eylemAdi(l.action),
      iptalMetni: 'Kapat',
      govde: '<dl class="adm-dl">' +
        s('Zaman', Y.tarih(l.created_at)) + s('Kullanıcı', e(aktorAdi(l)) + (l.actor_role ? ' · ' + e(Y.ROL[l.actor_role] || l.actor_role) : '')) +
        s('İşlem kodu', '<span class="adm-mono">' + e(l.action) + '</span>') +
        s('Varlık', e(Y.VARLIK[l.entity_type] || l.entity_type || '—') + (l.entity_id ? '<div class="adm-mono adm-cell-sub">' + e(l.entity_id) + '</div>' : '')) +
        s('Eski değer', json(l.old_value)) + s('Yeni değer', json(l.new_value)) +
        s('IP', '<span class="adm-mono">' + e(l.ip || '—') + '</span>') + s('İstek kimliği', '<span class="adm-mono">' + e(l.request_id || '—') + '</span>') +
        '</dl>'
    });
  }

  Y.sayfa({
    sayfa: 'denetim',
    baslik: 'Denetim kayıtları',
    aciklama: 'Giriş, rıza, ödeme, hikâye ve yönetici değişiklikleri gibi kritik işlemlerin değiştirilemez kaydı.',
    ciz: function (yer) {
      y = yer;
      var eylemler = Object.keys(Y.EYLEM).sort(function (a, b) { return Y.EYLEM[a].localeCompare(Y.EYLEM[b], 'tr'); });
      var varliklar = Object.keys(Y.VARLIK).sort(function (a, b) { return Y.VARLIK[a].localeCompare(Y.VARLIK[b], 'tr'); });
      y.icerik.innerHTML =
        '<div class="adm-note" data-aktor-not hidden><span class="material-symbols-outlined" aria-hidden="true">filter_alt</span><span data-aktor-metin></span></div>' +
        '<div class="adm-card"><div class="adm-toolbar">' +
          '<label class="adm-sr" for="d-eylem">İşlem</label><select class="adm-input" id="d-eylem" style="max-width:260px"><option value="">Tüm işlemler</option>' + eylemler.map(function (k) { return '<option value="' + e(k) + '">' + e(Y.EYLEM[k]) + '</option>'; }).join('') + '</select>' +
          '<label class="adm-sr" for="d-varlik">Varlık</label><select class="adm-input" id="d-varlik" style="max-width:220px"><option value="">Tüm varlıklar</option>' + varliklar.map(function (k) { return '<option value="' + e(k) + '">' + e(Y.VARLIK[k]) + '</option>'; }).join('') + '</select>' +
          '<label class="adm-sr" for="d-bas">Başlangıç</label><input class="adm-input" id="d-bas" type="date" style="max-width:170px" title="Başlangıç tarihi">' +
          '<label class="adm-sr" for="d-bit">Bitiş</label><input class="adm-input" id="d-bit" type="date" style="max-width:170px" title="Bitiş tarihi">' +
          '<span class="adm-spacer"></span><span class="adm-count" data-sayi></span>' +
        '</div><div class="adm-table-wrap" data-tablo></div>' +
        '<div class="adm-card-body" style="text-align:center" data-daha hidden><button type="button" class="adm-btn adm-btn--sm" data-daha-yukle>Daha fazla yükle</button></div></div>';
      var sec = { action: '#d-eylem', entity_type: '#d-varlik', from: '#d-bas', to: '#d-bit' };
      Object.keys(sec).forEach(function (k) {
        var el = y.icerik.querySelector(sec[k]);
        el.value = filtre[k];
        el.addEventListener('change', function () { filtre[k] = el.value; yukle().catch(Y.hataGoster); });
      });
      y.icerik.addEventListener('click', function (o) {
        if (o.target.closest('[data-daha-yukle]')) return yukle(true).catch(Y.hataGoster);
        var t = o.target.closest('[data-detay]');
        if (t) detay(t.dataset.detay);
        var temizle = o.target.closest('[data-aktor-temizle]');
        if (temizle) {
          filtre.actor_user_id = '';
          y.icerik.querySelector('[data-aktor-not]').hidden = true;
          history.replaceState(null, '', location.pathname);
          yukle().catch(Y.hataGoster);
        }
      });
      return api.hepsi('/admin/users').then(function (u) {
        u.forEach(function (x) { kisiler[x.id] = x; });
        if (filtre.actor_user_id) {
          var k = kisiler[filtre.actor_user_id];
          y.icerik.querySelector('[data-aktor-not]').hidden = false;
          y.icerik.querySelector('[data-aktor-metin]').innerHTML = 'Yalnız <b>' + e(k ? Y.adSoyad(k) : filtre.actor_user_id) + '</b> tarafından yapılan işlemler. <button type="button" class="adm-btn adm-btn--ghost adm-btn--sm" data-aktor-temizle>Filtreyi kaldır</button>';
        }
        return yukle();
      });
    }
  });
})();
