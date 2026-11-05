// yonetici-soru-setleri.js: YZ soru setleri ve sürümleri (/admin/question-sets, /admin/questions)
// Yayınlanan sürüm değişmez; düzenlemek için kopyalanarak yeni taslak sürüm açılır.
(function () {
  var Y = window.Yonetici, e = Y.e, api = window.YoneticiAPI;
  var y, setler = [], secili = null, detay = null;

  function durumRozet(s) {
    if (s.is_active) return Y.rozet('Etkin', 'success');
    if (s.published_at) return Y.rozet('Yayında', 'info');
    return Y.rozet('Taslak', 'warning');
  }

  function listeCiz() {
    var kok = y.icerik.querySelector('[data-setler]');
    if (!setler.length) { kok.innerHTML = Y.bos('Henüz soru seti yok.'); return; }
    var gruplar = {};
    setler.forEach(function (s) { (gruplar[s.name] = gruplar[s.name] || []).push(s); });
    kok.innerHTML = Object.keys(gruplar).map(function (ad) {
      return '<div class="adm-nav-group adm-mono" style="color:var(--text-muted);padding:.75rem 1rem .25rem;text-transform:none;letter-spacing:0">' + e(ad) + '</div><ul class="adm-select-list" style="padding-top:0">' +
        gruplar[ad].sort(function (a, b) { return b.version - a.version; }).map(function (s) {
          return '<li><button type="button" data-set="' + e(s.id) + '"' + (s.id === secili ? ' aria-current="true"' : '') + '><span>v' + s.version + ' <span class="adm-cell-sub">· ' + Y.tarih(s.created_at, false) + '</span></span>' + durumRozet(s) + '</button></li>';
        }).join('') + '</ul>';
    }).join('');
  }

  function detayCiz() {
    var kok = y.icerik.querySelector('[data-detay]');
    if (!detay) { kok.innerHTML = Y.bos('Soldan bir sürüm seç.'); return; }
    var s = detay.question_set, taslak = !s.published_at;
    var sorular = detay.questions.slice().sort(function (a, b) { return a.sequence_no - b.sequence_no; });
    var eylemler = taslak
      ? '<button type="button" class="adm-btn adm-btn--sm" data-eylem="soru-ekle"><span class="material-symbols-outlined" aria-hidden="true">add</span>Soru ekle</button>' +
        '<button type="button" class="adm-btn adm-btn--sm" data-eylem="yayinla">Yayınla</button>' +
        '<button type="button" class="adm-btn adm-btn--primary adm-btn--sm" data-eylem="etkinlestir">Yayınla ve etkinleştir</button>'
      : '<button type="button" class="adm-btn adm-btn--sm" data-eylem="yeni-surum"><span class="material-symbols-outlined" aria-hidden="true">content_copy</span>Düzenlemek için yeni sürüm</button>' +
        (s.is_active ? '<button type="button" class="adm-btn adm-btn--danger adm-btn--sm" data-eylem="devre-disi">Devre dışı bırak</button>'
          : '<button type="button" class="adm-btn adm-btn--primary adm-btn--sm" data-eylem="etkinlestir">Etkinleştir</button>');
    kok.innerHTML =
      '<div class="adm-card-head"><div><h2>' + e(s.name) + ' · v' + s.version + ' ' + durumRozet(s) + '</h2>' +
        '<p>' + (s.description ? e(s.description) : '<span class="adm-cell-sub">Açıklama yok</span>') +
        ' <button type="button" class="adm-icon-btn" data-eylem="aciklama" aria-label="Açıklamayı düzenle" style="width:26px;height:26px;vertical-align:middle"><span class="material-symbols-outlined" aria-hidden="true" style="font-size:16px">edit</span></button></p>' +
        '<p>' + (s.published_at ? 'Yayın: ' + Y.tarih(s.published_at) : 'Oluşturma: ' + Y.tarih(s.created_at)) + ' · Dil: ' + (s.language === 'en' ? 'İngilizce' : 'Türkçe') + ' · ' + sorular.length + ' soru</p></div>' +
        '<div class="adm-page-actions">' + eylemler + '</div></div>' +
      (taslak ? '' : '<div class="adm-note" style="margin:1rem 1.25rem 0"><span class="material-symbols-outlined" aria-hidden="true">lock</span><span>Yayınlanan sürüm değiştirilemez; hangi oturumun hangi sürümle çalıştığı kayıtlıdır. Değişiklik için yeni sürüm aç, düzenle ve etkinleştir.</span></div>') +
      (sorular.length ? '<ul class="adm-list">' + sorular.map(function (q) {
        return '<li><span class="adm-list-index">' + q.sequence_no + '</span><div class="adm-list-body"><div class="adm-list-title">' + e(q.focus_label) + ' <span class="adm-mono adm-cell-sub">' + e(q.focus_key) + '</span>' + (q.is_required ? '' : ' ' + Y.rozet('Opsiyonel', 'neutral', true)) + '</div>' +
          '<div class="adm-list-text">' + e(q.question_text) + '</div></div>' +
          (taslak ? '<div class="adm-list-actions"><button type="button" class="adm-icon-btn" data-soru-duzenle="' + e(q.id) + '" aria-label="' + q.sequence_no + '. soruyu düzenle"><span class="material-symbols-outlined" aria-hidden="true">edit</span></button>' +
            '<button type="button" class="adm-icon-btn" data-soru-sil="' + e(q.id) + '" aria-label="' + q.sequence_no + '. soruyu sil"><span class="material-symbols-outlined" aria-hidden="true">delete</span></button></div>' : '') +
          '</li>';
      }).join('') + '</ul>' : Y.bos('Bu sürümde soru yok.'));
  }

  function yukle(seciliId) {
    return api.get('/admin/question-sets').then(function (r) {
      setler = r.items;
      secili = seciliId || secili || (setler.find(function (s) { return s.is_active; }) || setler[0] || {}).id || null;
      listeCiz();
      return secili ? api.get('/admin/question-sets/' + encodeURIComponent(secili)) : null;
    }).then(function (d) { detay = d; detayCiz(); });
  }

  var SORU_ETIKET = { sequence_no: 'Sıra', focus_key: 'Odak anahtarı', focus_label: 'Odak', question_text: 'Soru metni' };

  function soruFormu(q) {
    var yeni = !q;
    var sonraki = detay.questions.reduce(function (m, x) { return Math.max(m, x.sequence_no); }, 0) + 1;
    Y.modal({
      baslik: yeni ? 'Soru ekle' : q.sequence_no + '. soruyu düzenle',
      alanEtiketleri: SORU_ETIKET,
      govde:
        '<div class="adm-row">' +
          Y.alan('Odak', '<input class="adm-input" id="q-fl" name="focus_label" required value="' + e(q ? q.focus_label : '') + '" placeholder="Ör. Başarı">', null, 'q-fl') +
          Y.alan('Odak anahtarı', '<input class="adm-input adm-mono" id="q-fk" name="focus_key" required value="' + e(q ? q.focus_key : '') + '" placeholder="achievement">', null, 'q-fk') +
        '</div>' +
        Y.alan('Soru metni', '<textarea class="adm-input" id="q-txt" name="question_text" required>' + e(q ? q.question_text : '') + '</textarea>', 'YZ bu soruyu adaya aynen sorar; duygu ön planda ve tek konulu tut.', 'q-txt') +
        '<div class="adm-row">' +
          Y.alan('Sıra', '<input class="adm-input" id="q-seq" name="sequence_no" type="number" min="1" required value="' + (q ? q.sequence_no : sonraki) + '">', null, 'q-seq') +
          '<div class="adm-field" style="justify-content:flex-end">' + Y.anahtar('is_required', q ? q.is_required : true, 'Zorunlu soru') + '</div>' +
        '</div>',
      kaydet: function (kutu) {
        var v = Y.formVerisi(kutu);
        var g = { sequence_no: parseInt(v.sequence_no, 10), focus_key: v.focus_key.trim(), focus_label: v.focus_label.trim(), question_text: v.question_text.trim(), is_required: v.is_required };
        var istek = yeni ? api.post('/admin/question-sets/' + encodeURIComponent(detay.question_set.id) + '/questions', g) : api.put('/admin/questions/' + encodeURIComponent(q.id), g);
        return istek.then(function () { Y.bildirim(yeni ? 'Soru eklendi.' : 'Soru güncellendi.'); return yukle(); });
      }
    });
  }

  function eylem(ad) {
    var s = detay.question_set;
    var yol = '/admin/question-sets/' + encodeURIComponent(s.id);
    if (ad === 'soru-ekle') return soruFormu(null);
    if (ad === 'aciklama') {
      return Y.modal({
        baslik: 'Açıklama', kucuk: true,
        govde: Y.alan('Açıklama', '<textarea class="adm-input" id="qs-desc" name="description">' + e(s.description || '') + '</textarea>', 'Bu sürümde neyin değiştiğini kısaca yaz.', 'qs-desc'),
        kaydet: function (kutu) { return api.patch(yol, { description: Y.formVerisi(kutu).description.trim() || null }).then(function () { Y.bildirim('Açıklama kaydedildi.'); return yukle(); }); }
      });
    }
    if (ad === 'yeni-surum') {
      return Y.onay('Yeni sürüm oluştur', '<b>' + e(s.name) + ' v' + s.version + '</b> soruları kopyalanarak yeni bir taslak sürüm açılacak. Taslağı düzenleyip etkinleştirene kadar adaylar mevcut sürümle devam eder.', 'Taslak oluştur').then(function (tamam) {
        if (!tamam) return;
        return api.post('/admin/question-sets', { name: s.name, language: s.language, description: null, copy_from: s.id }).then(function (r) {
          Y.bildirim('v' + r.question_set.version + ' taslağı oluşturuldu.');
          return yukle(r.question_set.id);
        });
      }).catch(Y.hataGoster);
    }
    if (ad === 'yayinla' || ad === 'etkinlestir') {
      var aktif = ad === 'etkinlestir';
      var mevcut = setler.find(function (x) { return x.name === s.name && x.is_active && x.id !== s.id; });
      var mesaj = (s.published_at ? '' : 'Yayınlanan sürüm bir daha değiştirilemez. ') +
        (aktif ? 'Bundan sonra başlayan soru-cevap akışları <b>v' + s.version + '</b> ile çalışır' + (mevcut ? '; <b>v' + mevcut.version + '</b> devre dışı kalır.' : '.') : 'Sürüm yayınlanır ama etkin olmaz.');
      if (!detay.questions.length) return Y.bildirim('Sorusu olmayan bir sürüm yayınlanamaz.', true);
      return Y.onay(aktif ? 'Sürümü etkinleştir' : 'Sürümü yayınla', mesaj, aktif ? 'Etkinleştir' : 'Yayınla').then(function (tamam) {
        if (!tamam) return;
        return api.post(yol + '/publish', { activate: aktif }).then(function () { Y.bildirim(aktif ? 'v' + s.version + ' etkin.' : 'v' + s.version + ' yayınlandı.'); return yukle(); });
      }).catch(Y.hataGoster);
    }
    if (ad === 'devre-disi') {
      return Y.onay('Devre dışı bırak', '<b>v' + s.version + '</b> devre dışı kalırsa etkin soru seti olmaz ve yeni soru-cevap akışları başlatılamaz. Emin misin?', 'Devre dışı bırak', true).then(function (tamam) {
        if (!tamam) return;
        return api.post(yol + '/deactivate').then(function () { Y.bildirim('Sürüm devre dışı.'); return yukle(); });
      }).catch(Y.hataGoster);
    }
  }

  Y.sayfa({
    sayfa: 'soru-setleri',
    baslik: 'Soru setleri',
    aciklama: 'Hikâye motorunun adaya sorduğu sorular. Her değişiklik yeni bir sürümdür; aynı anda bir sürüm etkindir.',
    ciz: function (yer) {
      y = yer;
      y.eylemler.innerHTML = '<button type="button" class="adm-btn" data-yeni><span class="material-symbols-outlined" aria-hidden="true">add</span>Boş set</button>';
      y.eylemler.querySelector('[data-yeni]').addEventListener('click', function () {
        Y.modal({
          baslik: 'Yeni soru seti', kucuk: true, kaydetMetni: 'Oluştur',
          govde: Y.alan('Set adı', '<input class="adm-input adm-mono" id="ns-ad" name="name" required placeholder="sales_story_emotion_first">', 'Var olan bir adı yazarsan o setin boş yeni sürümü açılır.', 'ns-ad') +
            Y.alan('Açıklama', '<textarea class="adm-input" id="ns-desc" name="description"></textarea>', null, 'ns-desc'),
          kaydet: function (kutu) {
            var v = Y.formVerisi(kutu);
            return api.post('/admin/question-sets', { name: v.name.trim(), language: 'tr', description: v.description.trim() || null }).then(function (r) { Y.bildirim('Taslak oluşturuldu.'); return yukle(r.question_set.id); });
          }
        });
      });
      y.icerik.innerHTML = '<div class="adm-grid" style="grid-template-columns:minmax(220px,280px) minmax(0,1fr);align-items:start" data-izgara>' +
        '<div class="adm-card"><div class="adm-card-head"><div><h2>Sürümler</h2></div></div><div data-setler></div></div>' +
        '<div class="adm-card" data-detay></div></div>';
      if (window.matchMedia('(max-width: 860px)').matches) y.icerik.querySelector('[data-izgara]').style.gridTemplateColumns = 'minmax(0,1fr)';
      y.icerik.addEventListener('click', function (o) {
        var t = o.target.closest('button');
        if (!t) return;
        if (t.dataset.set) { secili = t.dataset.set; return yukle(secili).catch(Y.hataGoster); }
        if (t.dataset.eylem) return eylem(t.dataset.eylem);
        if (t.dataset.soruDuzenle) return soruFormu(detay.questions.find(function (q) { return q.id === t.dataset.soruDuzenle; }));
        if (t.dataset.soruSil) {
          var q = detay.questions.find(function (x) { return x.id === t.dataset.soruSil; });
          Y.onay('Soruyu sil', '<b>' + q.sequence_no + '. soru</b> bu taslaktan silinecek.', 'Sil', true).then(function (tamam) {
            if (!tamam) return;
            return api.del('/admin/questions/' + encodeURIComponent(q.id)).then(function () { Y.bildirim('Soru silindi.'); return yukle(); });
          }).catch(Y.hataGoster);
        }
      });
      return yukle();
    }
  });
})();
