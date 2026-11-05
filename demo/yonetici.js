// yonetici.js: Yönetici paneli ortak yerleşim (yan menü, başlık) ve yardımcılar.
(function () {
  var MENU = [
    { grup: null, ogeler: [{ sayfa: 'panel', href: 'yonetici-panel.html', ikon: 'dashboard', ad: 'Genel bakış' }] },
    { grup: 'Hesaplar', ogeler: [
      { sayfa: 'kullanicilar', href: 'yonetici-kullanicilar.html', ikon: 'group', ad: 'Kullanıcılar' },
      { sayfa: 'gurular', href: 'yonetici-gurular.html', ikon: 'school', ad: 'Gurular' }
    ] },
    { grup: 'Yapılandırma', ogeler: [
      { sayfa: 'profil-formu', href: 'yonetici-profil-formu.html', ikon: 'dynamic_form', ad: 'Profil formu' },
      { sayfa: 'soru-setleri', href: 'yonetici-soru-setleri.html', ikon: 'quiz', ad: 'Soru setleri' },
      { sayfa: 'kurallar', href: 'yonetici-kurallar.html', ikon: 'rule', ad: 'Kurallar ve istemler' },
      { sayfa: 'hizmetler', href: 'yonetici-hizmetler.html', ikon: 'sell', ad: 'Hizmetler ve fiyatlar' }
    ] },
    { grup: 'Kayıtlar', ogeler: [
      { sayfa: 'odemeler', href: 'yonetici-odemeler.html', ikon: 'payments', ad: 'Ödemeler' },
      { sayfa: 'yz-kullanim', href: 'yonetici-yz-kullanim.html', ikon: 'neurology', ad: 'YZ kullanımı' },
      { sayfa: 'denetim', href: 'yonetici-denetim.html', ikon: 'history', ad: 'Denetim kayıtları' }
    ] }
  ];

  // ---------------- Biçimlendirme ----------------
  function e(deger) {
    return String(deger === undefined || deger === null ? '' : deger)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Para: backend kuruş (amount_minor) döner; YZ maliyeti cost_micro (1e-6) döner.
  function para(minor, birim) {
    if (minor === null || minor === undefined) return '—';
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: birim || 'TRY', minimumFractionDigits: minor % 100 ? 2 : 0, maximumFractionDigits: 2 }).format(minor / 100);
  }
  function maliyet(micro, birim, basamak) {
    var b = basamak === undefined ? 4 : basamak;
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: birim || 'USD', minimumFractionDigits: b, maximumFractionDigits: b }).format((micro || 0) / 1e6);
  }
  function sayi(n) { return Number(n || 0).toLocaleString('tr-TR'); }

  function tarih(iso, saatli) {
    if (!iso) return '—';
    var d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
    if (isNaN(d)) return e(iso);
    var opt = { day: 'numeric', month: 'short', year: 'numeric' };
    if (saatli !== false && iso.length > 10) { opt.hour = '2-digit'; opt.minute = '2-digit'; }
    return d.toLocaleString('tr-TR', opt);
  }

  function sure(ms) {
    if (ms === null || ms === undefined) return '—';
    return ms < 1000 ? ms + ' ms' : (ms / 1000).toLocaleString('tr-TR', { maximumFractionDigits: 1 }) + ' sn';
  }

  function basHarf(ad) {
    return String(ad || '').split(/\s+/).filter(Boolean).slice(0, 2).map(function (p) { return p[0].toLocaleUpperCase('tr-TR'); }).join('');
  }

  function rozet(metin, tur, duz) {
    return '<span class="adm-badge adm-badge--' + (tur || 'neutral') + (duz ? ' adm-badge--plain' : '') + '">' + e(metin) + '</span>';
  }

  var ODEME_DURUM = {
    PAID: ['Ödendi', 'success'], PENDING: ['Beklemede', 'warning'],
    FAILED: ['Başarısız', 'danger'], REFUNDED: ['İade edildi', 'neutral']
  };
  var ROL = { candidate: 'Aday', guru: 'Guru', admin: 'Yönetici' };
  var ODEME_YONTEM = { card: 'Kart', bank_transfer: 'Havale/EFT', free: 'Ücretsiz' };
  function odemeRozet(d) { var x = ODEME_DURUM[d] || [d, 'neutral']; return rozet(x[0], x[1]); }
  function aktifRozet(aktif, evet, hayir) { return aktif ? rozet(evet || 'Aktif', 'success') : rozet(hayir || 'Pasif', 'neutral'); }
  function adSoyad(u) { return u ? ((u.first_name || '') + ' ' + (u.last_name || '')).trim() : '—'; }

  // Denetim eylemleri (backend service/audit_service.go sabitleri)
  var EYLEM = {
    'auth.login': 'Giriş', 'auth.login_failed': 'Başarısız giriş', 'auth.login_locked': 'Giriş kilitlendi', 'auth.logout': 'Çıkış', 'auth.logout_all': 'Tüm oturumlardan çıkış',
    'user.registered': 'Kayıt', 'user.email_verified': 'E-posta doğrulandı', 'user.admin_created': 'Yönetici oluşturuldu', 'user.guru_created': 'Guru oluşturuldu',
    'user.invitation_resent': 'Davet yeniden gönderildi', 'user.password_reset': 'Parola sıfırlandı', 'user.status_changed': 'Hesap durumu değişti', 'user.tokens_revoked': 'Oturumlar kapatıldı',
    'consent.granted': 'Rıza verildi', 'consent.revoked': 'Rıza geri çekildi', 'profile.saved': 'Profil kaydedildi', 'profile.completed': 'Profil tamamlandı',
    'cv.uploaded': 'CV yüklendi', 'cv.updated': 'CV güncellendi', 'cv.approved': 'CV onaylandı', 'cv.deleted': 'CV silindi', 'file.downloaded': 'Dosya indirildi',
    'story.qa_started': 'Soru-cevap başladı', 'story.qa_restarted': 'Soru-cevap yeniden başladı', 'story.generated': 'Hikâye üretildi', 'story.external_uploaded': 'Harici hikâye yüklendi',
    'story.candidate_edited': 'Aday hikâyeyi düzenledi', 'story.outputs_generated': 'Çıktılar üretildi', 'story.final_approved': 'Nihai hikâye onaylandı',
    'assignment.created': 'Ödev/belge talebi', 'assignment.submitted': 'Ödev teslim edildi', 'assignment.status_changed': 'Ödev durumu değişti', 'guru_profile.updated': 'Guru profili güncellendi',
    'payment.initiated': 'Ödeme başlatıldı', 'payment.confirmed': 'Ödeme onaylandı', 'payment.failed': 'Ödeme başarısız', 'payment.refunded': 'Ödeme iade edildi',
    'enrollment.cancellation_requested': 'İptal talebi', 'enrollment_session.scheduled': 'Seans planlandı', 'enrollment_session.completed': 'Seans tamamlandı',
    'data_deletion.requested': 'Veri silme talebi', 'question_set.changed': 'Soru seti değişikliği', 'follow_up_rule.changed': 'Takip kuralı değişikliği',
    'prompt_config.changed': 'İstem yapılandırması değişikliği', 'profile_form_field.changed': 'Profil formu değişikliği', 'service_definition.changed': 'Hizmet değişikliği',
    'session_template.changed': 'Seans şablonu değişikliği', 'pricing_rule.changed': 'Fiyat kuralı değişikliği', 'maintenance.auth_cleanup': 'Bakım: oturum temizliği'
  };
  function eylemAdi(kod) { return EYLEM[kod] || kod; }
  var VARLIK = {
    users: 'Kullanıcı', auth_tokens: 'Oturum', consent_records: 'Rıza', guru_profiles: 'Guru profili', candidates: 'Aday', cv_files: 'CV', stored_files: 'Dosya',
    story_sessions: 'Hikâye oturumu', story_drafts: 'Hikâye taslağı', assignments: 'Ödev', payments: 'Ödeme', service_enrollments: 'Kayıt', enrollment_sessions: 'Seans',
    cancellations: 'İptal', target_contexts: 'Profil', question_sets: 'Soru seti', follow_up_rules: 'Takip kuralı', ai_prompt_configs: 'İstem yapılandırması',
    profile_form_fields: 'Profil formu alanı', service_definitions: 'Hizmet', service_session_templates: 'Seans şablonu', pricing_rules: 'Fiyat kuralı', guru_notes: 'Guru notu'
  };

  // 422 yanıtındaki alan hatalarını tek mesaja çevirir.
  function alanHatalari(hata, etiketler) {
    if (!hata || !hata.fields) return hata;
    var ek = Object.keys(hata.fields).map(function (k) { return (etiketler && etiketler[k] ? etiketler[k] : k) + ': ' + hata.fields[k]; }).join(' · ');
    var yeni = new Error(hata.message + (ek ? ' (' + ek + ')' : ''));
    yeni.status = hata.status; yeni.code = hata.code; yeni.fields = hata.fields;
    return yeni;
  }

  // ---------------- Bildirim ----------------
  function bildirim(mesaj, hata) {
    var kap = document.querySelector('.adm-toasts');
    if (!kap) {
      kap = document.createElement('div');
      kap.className = 'adm-toasts';
      kap.setAttribute('role', 'status');
      kap.setAttribute('aria-live', 'polite');
      document.body.appendChild(kap);
    }
    var t = document.createElement('div');
    t.className = 'adm-toast' + (hata ? ' adm-toast--error' : '');
    t.textContent = mesaj;
    kap.appendChild(t);
    setTimeout(function () { t.remove(); }, hata ? 5000 : 3000);
  }

  function hataGoster(hata) {
    console.error(hata);
    bildirim(hata && hata.message ? hata.message : 'Bir hata oluştu.', true);
  }

  // ---------------- Modal ----------------
  // secenekler: { baslik, govde (HTML), kaydetMetni, iptalMetni, kucuk, tehlikeli, kaydet: async (kutu) => bool|void, acildi: (kutu) => void }
  function modal(secenekler) {
    var onceOdak = document.activeElement;
    var arka = document.createElement('div');
    arka.className = 'adm-modal-backdrop';
    var id = 'adm-modal-' + Date.now();
    arka.innerHTML =
      '<div class="adm-modal' + (secenekler.kucuk ? ' adm-modal--sm' : '') + '" role="dialog" aria-modal="true" aria-labelledby="' + id + '">' +
        '<form novalidate>' +
          '<div class="adm-modal-head"><h2 id="' + id + '">' + e(secenekler.baslik) + '</h2>' +
            '<button type="button" class="adm-icon-btn" data-kapat aria-label="Kapat"><span class="material-symbols-outlined" aria-hidden="true">close</span></button></div>' +
          '<div class="adm-modal-body">' + (secenekler.govde || '') + '<p class="adm-error" data-modal-hata hidden></p></div>' +
          '<div class="adm-modal-foot">' +
            (secenekler.iptalMetni === false ? '' : '<button type="button" class="adm-btn" data-kapat>' + e(secenekler.iptalMetni || 'Vazgeç') + '</button>') +
            (secenekler.kaydet ? '<button type="submit" class="adm-btn ' + (secenekler.tehlikeli ? 'adm-btn--danger' : 'adm-btn--primary') + '" data-kaydet>' + e(secenekler.kaydetMetni || 'Kaydet') + '</button>' : '') +
          '</div>' +
        '</form>' +
      '</div>';
    document.body.appendChild(arka);
    var kutu = arka.querySelector('.adm-modal');
    var form = arka.querySelector('form');
    var hataAlan = arka.querySelector('[data-modal-hata]');

    function kapat() {
      document.removeEventListener('keydown', tus);
      arka.remove();
      if (onceOdak && onceOdak.focus) onceOdak.focus();
    }
    function tus(olay) {
      if (olay.key === 'Escape') kapat();
      if (olay.key === 'Tab') {
        var odaklar = kutu.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        var gorunur = Array.prototype.filter.call(odaklar, function (x) { return !x.disabled && x.offsetParent !== null; });
        if (!gorunur.length) return;
        var ilk = gorunur[0], son = gorunur[gorunur.length - 1];
        if (olay.shiftKey && document.activeElement === ilk) { olay.preventDefault(); son.focus(); }
        else if (!olay.shiftKey && document.activeElement === son) { olay.preventDefault(); ilk.focus(); }
      }
    }
    document.addEventListener('keydown', tus);
    arka.addEventListener('mousedown', function (olay) { if (olay.target === arka) kapat(); });
    arka.querySelectorAll('[data-kapat]').forEach(function (b) { b.addEventListener('click', kapat); });

    form.addEventListener('submit', function (olay) {
      olay.preventDefault();
      if (!secenekler.kaydet) return kapat();
      var dugme = form.querySelector('[data-kaydet]');
      dugme.disabled = true;
      hataAlan.hidden = true;
      Promise.resolve().then(function () { return secenekler.kaydet(kutu); }).then(function (sonuc) {
        if (sonuc !== false) kapat();
        else dugme.disabled = false;
      }).catch(function (hata) {
        dugme.disabled = false;
        kutu.querySelectorAll('[aria-invalid]').forEach(function (el) { el.removeAttribute('aria-invalid'); });
        var mesaj = hata && hata.message ? hata.message : 'Kaydedilemedi.';
        if (hata && hata.fields) {
          var etiketler = secenekler.alanEtiketleri || {};
          mesaj += ' ' + Object.keys(hata.fields).map(function (k) {
            var el = kutu.querySelector('[name="' + k + '"]');
            if (el) el.setAttribute('aria-invalid', 'true');
            return (etiketler[k] || k) + ': ' + hata.fields[k];
          }).join(' · ');
        }
        hataAlan.textContent = mesaj;
        hataAlan.hidden = false;
      });
    });

    if (secenekler.acildi) secenekler.acildi(kutu);
    var ilkAlan = kutu.querySelector('.adm-modal-body input:not([type=hidden]):not([type=checkbox]), .adm-modal-body textarea, .adm-modal-body select');
    (ilkAlan || kutu.querySelector('[data-kaydet]') || kutu.querySelector('[data-kapat]')).focus();
    return { kapat: kapat, kutu: kutu };
  }

  // Önemli işlemler için aktif onay (Bölüm 11)
  function onay(baslik, mesaj, eylemMetni, tehlikeli) {
    return new Promise(function (coz) {
      var onaylandi = false;
      var m = modal({
        baslik: baslik,
        govde: '<p>' + mesaj + '</p>',
        kaydetMetni: eylemMetni || 'Onayla',
        tehlikeli: tehlikeli,
        kucuk: true,
        kaydet: function () { onaylandi = true; }
      });
      var gozlemci = new MutationObserver(function () {
        if (!document.body.contains(m.kutu)) { gozlemci.disconnect(); coz(onaylandi); }
      });
      gozlemci.observe(document.body, { childList: true });
    });
  }

  // ---------------- Form yardımcıları ----------------
  function alan(etiket, icerik, ipucu, id) {
    return '<div class="adm-field">' + (etiket ? '<label' + (id ? ' for="' + e(id) + '"' : '') + '>' + e(etiket) + '</label>' : '') + icerik +
      (ipucu ? '<span class="adm-hint">' + e(ipucu) + '</span>' : '') + '</div>';
  }
  function anahtar(ad, isaretli, etiket, ekAttr) {
    return '<label class="adm-switch"><input type="checkbox" name="' + e(ad) + '"' + (isaretli ? ' checked' : '') + (ekAttr || '') + '><span class="adm-switch-track" aria-hidden="true"></span><span>' + e(etiket) + '</span></label>';
  }
  function formVerisi(kok) {
    var veri = {};
    kok.querySelectorAll('[name]').forEach(function (el) {
      if (el.type === 'checkbox') {
        if (el.dataset.coklu !== undefined) {
          veri[el.name] = veri[el.name] || [];
          if (el.checked) veri[el.name].push(el.value);
        } else {
          veri[el.name] = el.checked;
        }
      } else {
        veri[el.name] = el.value;
      }
    });
    return veri;
  }
  function satirlar(metin) {
    return String(metin || '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function bos(mesaj) { return '<div class="adm-empty">' + e(mesaj) + '</div>'; }

  // ---------------- Yerleşim ----------------
  function yerlesim(aktifSayfa, oturum) {
    var nav = MENU.map(function (grup) {
      return (grup.grup ? '<div class="adm-nav-group">' + e(grup.grup) + '</div>' : '') + grup.ogeler.map(function (o) {
        return '<a class="adm-nav-link" href="' + o.href + '"' + (o.sayfa === aktifSayfa ? ' aria-current="page"' : '') + '>' +
          '<span class="material-symbols-outlined" aria-hidden="true">' + o.ikon + '</span>' + e(o.ad) + '</a>';
      }).join('');
    }).join('');

    var kabuk = document.createElement('div');
    kabuk.className = 'adm-shell';
    kabuk.innerHTML =
      '<div class="adm-topbar"><strong>Interview Demo · Yönetici</strong>' +
        '<button type="button" aria-label="Menüyü aç" aria-controls="adm-sidebar" aria-expanded="false" data-menu-ac><span class="material-symbols-outlined" aria-hidden="true">menu</span></button></div>' +
      '<aside class="adm-sidebar" id="adm-sidebar">' +
        '<div class="adm-brand"><strong>Interview Demo</strong><span>Yönetici paneli</span></div>' +
        '<nav class="adm-nav" aria-label="Yönetici menüsü">' + nav + '</nav>' +
        '<div class="adm-user"><div class="adm-avatar" aria-hidden="true">' + e(basHarf(adSoyad(oturum.user))) + '</div>' +
          '<div class="adm-user-info"><b>' + e(adSoyad(oturum.user)) + '</b><span>' + e(oturum.user.email) + '</span></div>' +
          '<button type="button" class="adm-logout" aria-label="Çıkış yap" title="Çıkış yap" data-cikis><span class="material-symbols-outlined" aria-hidden="true">logout</span></button></div>' +
      '</aside>' +
      '<main class="adm-main" id="adm-main"><div class="adm-page-head"><div><h1 data-baslik></h1><p data-aciklama></p></div><div class="adm-page-actions" data-eylemler></div></div><div data-icerik></div></main>';
    document.body.prepend(kabuk);

    var menuDugme = kabuk.querySelector('[data-menu-ac]');
    function menu(acik) {
      kabuk.classList.toggle('is-menu-open', acik);
      menuDugme.setAttribute('aria-expanded', String(acik));
      menuDugme.setAttribute('aria-label', acik ? 'Menüyü kapat' : 'Menüyü aç');
    }
    menuDugme.addEventListener('click', function () { menu(!kabuk.classList.contains('is-menu-open')); });
    document.addEventListener('click', function (olay) {
      if (kabuk.classList.contains('is-menu-open') && !kabuk.querySelector('.adm-sidebar').contains(olay.target) && !menuDugme.contains(olay.target)) menu(false);
    });
    document.addEventListener('keydown', function (olay) { if (olay.key === 'Escape' && kabuk.classList.contains('is-menu-open')) menu(false); });

    kabuk.querySelector('[data-cikis]').addEventListener('click', function () { window.YoneticiAPI.cikisYap(); });

    return {
      baslik: kabuk.querySelector('[data-baslik]'),
      aciklama: kabuk.querySelector('[data-aciklama]'),
      eylemler: kabuk.querySelector('[data-eylemler]'),
      icerik: kabuk.querySelector('[data-icerik]')
    };
  }

  // Sayfa girişi: oturum kontrolü + yerleşim + sayfa çizimi
  function sayfa(secenekler) {
    var oturum = window.YoneticiAPI.oturumGetir();
    if (!oturum) {
      location.replace('giris-yonetici.html?return=' + encodeURIComponent(location.pathname.split('/').pop()));
      return;
    }
    document.title = secenekler.baslik + ' · Yönetici · Interview Demo';
    var y = yerlesim(secenekler.sayfa, oturum);
    y.baslik.textContent = secenekler.baslik;
    y.aciklama.textContent = secenekler.aciklama || '';
    y.icerik.innerHTML = '<div class="adm-card"><div class="adm-empty">Yükleniyor…</div></div>';
    Promise.resolve().then(function () { return secenekler.ciz(y, oturum); }).catch(function (hata) {
      y.icerik.innerHTML = '<div class="adm-card"><div class="adm-empty">Veriler yüklenemedi: ' + e(hata.message || hata) + '</div></div>';
      console.error(hata);
    });
  }

  window.Yonetici = {
    e: e, para: para, maliyet: maliyet, sayi: sayi, tarih: tarih, sure: sure, basHarf: basHarf, adSoyad: adSoyad,
    rozet: rozet, odemeRozet: odemeRozet, aktifRozet: aktifRozet,
    ODEME_DURUM: ODEME_DURUM, ROL: ROL, ODEME_YONTEM: ODEME_YONTEM, EYLEM: EYLEM, eylemAdi: eylemAdi, VARLIK: VARLIK,
    alanHatalari: alanHatalari,
    bildirim: bildirim, hataGoster: hataGoster, modal: modal, onay: onay,
    alan: alan, anahtar: anahtar, formVerisi: formVerisi, satirlar: satirlar, bos: bos,
    sayfa: sayfa
  };
})();
