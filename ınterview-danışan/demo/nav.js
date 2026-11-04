// nav.js — Buton/link metnine göre sayfa yönlendirmesi
// Her sayfada bu script </body>'den önce yüklenir.
// Stitch'in kendi navigasyon scriptini geçersiz kılar.

const PAGE = location.pathname.split('/').pop() || 'giris.html';

// ─── ANA ROTA HARİTASI ────────────────────────────────────────────────────────
// Format: "buton/link metni (veya içerdiği kısım)" → "hedef dosya"
// Büyük/küçük harf duyarsız eşleşme yapılır.
const ROUTES = {

  // ── Giriş Yap ────────────────────────────────────────────────────────────────
  "giris.html": {
    "Giriş yap":      "ana.html",        // submit butonu
    "Hesap oluştur":  "kayit.html",       // header linki
    "Kayıt ol":       "kayit.html",       // alt link
    "Şifremi unuttum":"giris.html",       // aynı sayfada kal (demo)
  },

  // ── Kayıt Ekranı ─────────────────────────────────────────────────────────────
  "kayit.html": {
    "Devam et":       "eposta.html",
    "Giriş yap":      "giris.html",
  },

  // ── E-posta Doğrulama ─────────────────────────────────────────────────────────
  "eposta.html": {
    "Kodu tekrar gönder": "eposta.html",  // aynı sayfada kal
    "Önceki adıma dön":   "kayit.html",
    // Doğrulandığında "Sonraki" butonuna basılır → otomatik ilerleme
    // Stitch Sonraki butonu hizmet.html'e gider (nav.js altındaki blokla)
    "Sonraki":         "hizmet.html",
    "Doğrula":         "hizmet.html",
  },

  // ── Hizmet ve Danışman Seçimi ─────────────────────────────────────────────────
  "hizmet.html": {
    "Ödemeye geç":             "siparis.html",
    "Ödemeye geçarrow_forward":"siparis.html",
    "Ödemeye geç→":            "siparis.html",
  },

  // ── Siparişini Onayla ─────────────────────────────────────────────────────────
  "siparis.html": {
    "Ödemeyi tamamla":                    "odeme-ok.html",
    "lockÖdemeyi tamamla":                "odeme-ok.html",
    "Danışman seçimine geri dön":         "hizmet.html",
    "arrow_backDanışman seçimine geri dön":"hizmet.html",
  },

  // ── Ödeme Alındı (Başarılı) ───────────────────────────────────────────────────
  "odeme-ok.html": {
    "Profilimi doldur":      "profil.html",
    "Daha sonra":            "ana.html",
    "Ana Ekrana Dön":        "ana.html",
  },

  // ── Ödeme Hata ────────────────────────────────────────────────────────────────
  "odeme-hata.html": {
    "Tekrar dene":       "siparis.html",
    "Siparişe geri dön": "siparis.html",
  },

  // ── Ödeme Kontrol Ediliyor ────────────────────────────────────────────────────
  "odeme-bekle.html": {
    "Ana ekrana git": "ana.html",
  },

  // ── Profil Tamamlama ─────────────────────────────────────────────────────────
  "profil.html": {
    "Kaydet ve Devam Et":          "cv.html",
    "Kaydet ve Devam Et arrow_forward":"cv.html",
    "Daha sonra tamamla":          "ana.html",
    "Ana Ekran":                   "ana.html",
    "CV'm":                        "cv.html",
    "Seanslarım":                  "randevu-on.html",
  },

  // ── CV Ekleme ve Doğrulama ────────────────────────────────────────────────────
  "cv.html": {
    "Onayla ve Randevuya Geç":             "randevu-on.html",
    "Onayla ve Randevuya Geç arrow_forward":"randevu-on.html",
    "Ana Ekran":                           "ana.html",
    "Profilim":                            "profil.html",
    "Seanslarım":                          "randevu-on.html",
  },

  // ── Randevu Öncesi Adımlar ────────────────────────────────────────────────────
  "randevu-on.html": {
    "Randevu Al":    "takvim.html",
    "Randevu Al→":  "takvim.html",
    "Geri":          "cv.html",
    "←Geri":         "cv.html",
    "Ana Ekran":     "ana.html",
    "Profilim":      "profil.html",
    "CV'm":          "cv.html",
    "Seanslarım":    "randevu-on.html",
  },

  // ── Seans Zamanı Seçimi (Takvim) ─────────────────────────────────────────────
  "takvim.html": {
    "Seans Zamanını Onayla":             "randevu-ok.html",
    "Seans Zamanını Onayla arrow_forward":"randevu-ok.html",
    "Daha sonra planla":                 "ana.html",
    "Ana Ekran":                         "ana.html",
    "Profilim":                          "profil.html",
    "CV'm":                              "cv.html",
    "Seanslarım":                        "randevu-on.html",
  },

  // ── Seans Planlandı ───────────────────────────────────────────────────────────
  "randevu-ok.html": {
    "Ana Ekrana Dön": "ana.html",
    "Seanslarıma Git":"ana.html",
    "Ana Ekran":      "ana.html",
    "Profilim":       "profil.html",
    "CV'm":           "cv.html",
    "Seanslarım":     "randevu-on.html",
  },

  // ── Ana Ekran ─────────────────────────────────────────────────────────────────
  "ana.html": {
    "Hikâyeni Oluştur":    "hikaye-giris.html",
    "Hikâyeni Oluştur →":  "hikaye-giris.html",
    "Randevu al":          "takvim.html",
    "Profilim":            "profil.html",
    "CV'm":                "cv.html",
    "Seanslarım":          "randevu-on.html",
    "Hikâyem":             "hikaye-giris.html",
  },

  // ── Hikâye Giriş ──────────────────────────────────────────────────────────────
  "hikaye-giris.html": {
    "Sorulara Başla":   "soru1.html",
    "Sorulara Başla →": "soru1.html",
    "Hikâyemi Yükle":   "soru1.html",
    "Ana Ekran":        "ana.html",
    "Profilim":         "profil.html",
    "CV'm":             "cv.html",
    "Seanslarım":       "randevu-on.html",
    "Hikâyem":          "hikaye-giris.html",
  },

  // ── Soru 1 ────────────────────────────────────────────────────────────────────
  "soru1.html": {
    "Cevabı Kaydet ve İlerle":    "soru2.html",
    "Cevabı Kaydet ve İlerle →":  "soru2.html",
    "Hatırlamıyorum / Atla":      "soru2.html",
    "Kaydet ve Daha Sonra Devam Et":"ana.html",
    "← Önceki Soru":              "hikaye-giris.html",
    "Ana Ekran":                  "ana.html",
    "Hikâyem":                    "hikaye-giris.html",
  },

  // ── Soru 2 ────────────────────────────────────────────────────────────────────
  "soru2.html": {
    "Cevabı Kaydet ve İlerle":    "soru3.html",
    "Cevabı Kaydet ve İlerle →":  "soru3.html",
    "Hatırlamıyorum / Atla":      "soru3.html",
    "Kaydet ve Daha Sonra Devam Et":"ana.html",
    "← Önceki Soru":              "soru1.html",
    "Ana Ekran":                  "ana.html",
    "Hikâyem":                    "hikaye-giris.html",
  },

  // ── Soru 3 ────────────────────────────────────────────────────────────────────
  "soru3.html": {
    "Cevabı Kaydet ve İlerle":    "soru4.html",
    "Cevabı Kaydet ve İlerle →":  "soru4.html",
    "Hatırlamıyorum / Atla":      "soru4.html",
    "Kaydet ve Daha Sonra Devam Et":"ana.html",
    "← Önceki Soru":              "soru2.html",
    "Ana Ekran":                  "ana.html",
    "Hikâyem":                    "hikaye-giris.html",
  },

  // ── Soru 4 ────────────────────────────────────────────────────────────────────
  "soru4.html": {
    "Cevabı Kaydet ve İlerle":    "soru5.html",
    "Cevabı Kaydet ve İlerle →":  "soru5.html",
    "Hatırlamıyorum / Atla":      "soru5.html",
    "Kaydet ve Daha Sonra Devam Et":"ana.html",
    "← Geri":                     "soru3.html",
    "Ana Ekran":                   "ana.html",
    "Hikâyem":                     "hikaye-giris.html",
  },

  // ── Soru 5 (Son Soru) ─────────────────────────────────────────────────────────
  "soru5.html": {
    "Cevabı Kaydet ve Hikâyemi Oluştur": "ciktilar.html",
    "Cevabı Kaydet ve Hikâyemi Oluştur →":"ciktilar.html",
    "Hatırlamıyorum / Atla":             "ciktilar.html",
    "Kaydet ve Daha Sonra Devam Et":     "ana.html",
    "← Önceki Soru":                     "soru4.html",
    "Ana Ekran":                         "ana.html",
    "Hikâyem":                           "hikaye-giris.html",
  },

  // ── Çıktılar / Hikâye Hazır ───────────────────────────────────────────────────
  "ciktilar.html": {
    "Ana Ekrana Dön": "ana.html",
    "Ana Ekran":      "ana.html",
    "Profilim":       "profil.html",
    "CV'm":           "cv.html",
    "Seanslarım":     "randevu-on.html",
    "Hikâyem":        "hikaye-giris.html",
    "Ödevlerim":      "ana.html",
  },
};

// ─── YÖNLENDIRME MOTORU ───────────────────────────────────────────────────────
(function () {
  // Stitch'in kendi navigasyon butonlarını ("Önceki"/"Sonraki") gizle
  function hideStitchNav() {
    const nav = document.querySelector('nav[style*="position: fixed"][style*="bottom"]');
    if (nav) nav.style.display = 'none';
    // Stitch'in fixed bottom bar'ını da kapat
    document.querySelectorAll('div[style*="position: fixed"][style*="bottom: 0"]').forEach(el => {
      if (el.textContent.includes('Önceki') || el.textContent.includes('Sonraki')) {
        el.style.display = 'none';
      }
    });
  }

  function navigate(text) {
    const map = ROUTES[PAGE] || {};
    const normalizedText = text.replace(/\s+/g, ' ').trim();
    // Önce tam eşleşme
    for (const [label, target] of Object.entries(map)) {
      if (normalizedText === label.replace(/\s+/g, ' ').trim()) {
        location.href = target;
        return true;
      }
    }
    // Sonra "içeriyor mu" eşleşmesi (büyük/küçük harf duyarsız)
    const lowerText = normalizedText.toLowerCase();
    for (const [label, target] of Object.entries(map)) {
      if (lowerText.includes(label.toLowerCase().replace(/\s+/g, ' ').trim())) {
        location.href = target;
        return true;
      }
    }
    return false;
  }

  document.addEventListener('DOMContentLoaded', () => {
    hideStitchNav();

    // Demo menüsü: sağ alt köşeye mini float menü ekle
    addDemoMenu();
  });

  document.addEventListener('click', (e) => {
    const el = e.target.closest('button, a, [role="button"]');
    if (!el) return;
    // Disabled butonları atla
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') return;
    // form submit'leri de yakala
    const text = (el.textContent || el.innerText || '').replace(/\s+/g, ' ').trim();
    if (navigate(text)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true); // capture phase — Stitch handler'larından önce çalış

  // ─── DEMO HIZLI ERİŞİM MENÜSÜ ─────────────────────────────────────────────
  function addDemoMenu() {
    const pages = [
      { label: '🔐 Giriş Yap',          file: 'giris.html' },
      { label: '📝 Kayıt',              file: 'kayit.html' },
      { label: '📧 E-posta Doğrulama',  file: 'eposta.html' },
      { label: '🤝 Hizmet Seç',         file: 'hizmet.html' },
      { label: '🛒 Siparişi Onayla',    file: 'siparis.html' },
      { label: '✅ Ödeme Alındı',        file: 'odeme-ok.html' },
      { label: '❌ Ödeme Hatası',        file: 'odeme-hata.html' },
      { label: '⏳ Ödeme Bekliyor',      file: 'odeme-bekle.html' },
      { label: '👤 Profil Tamamla',     file: 'profil.html' },
      { label: '📄 CV Ekle',            file: 'cv.html' },
      { label: '📋 Randevu Öncesi',     file: 'randevu-on.html' },
      { label: '📅 Takvim',             file: 'takvim.html' },
      { label: '🗓 Randevu Onaylandı',   file: 'randevu-ok.html' },
      { label: '🏠 Ana Ekran',          file: 'ana.html' },
      { label: '📖 Hikâye Giriş',       file: 'hikaye-giris.html' },
      { label: '❓ Soru 1',             file: 'soru1.html' },
      { label: '❓ Soru 2',             file: 'soru2.html' },
      { label: '❓ Soru 3',             file: 'soru3.html' },
      { label: '❓ Soru 4',             file: 'soru4.html' },
      { label: '❓ Soru 5',             file: 'soru5.html' },
      { label: '🏆 Çıktılar',           file: 'ciktilar.html' },
    ];

    const btn = document.createElement('button');
    btn.textContent = '☰ Demo';
    btn.style.cssText = `
      position: fixed; bottom: 16px; right: 16px; z-index: 99999;
      background: #013434; color: #fff; border: none; border-radius: 8px;
      padding: 8px 14px; font-size: 13px; font-weight: 600;
      cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      font-family: 'IBM Plex Sans', sans-serif;
    `;

    const menu = document.createElement('div');
    menu.style.cssText = `
      position: fixed; bottom: 56px; right: 16px; z-index: 99999;
      background: #fff; border-radius: 10px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.18);
      overflow-y: auto; max-height: 70vh; min-width: 220px;
      display: none;
    `;

    pages.forEach(p => {
      const item = document.createElement('a');
      item.href = p.file;
      item.textContent = p.label;
      item.style.cssText = `
        display: block; padding: 9px 16px; font-size: 13px; color: #1c1c1a;
        text-decoration: none; font-family: 'IBM Plex Sans', sans-serif;
        border-bottom: 1px solid #f0edea;
        ${p.file === PAGE ? 'background:#e8f4f4; font-weight:600; color:#013434;' : ''}
      `;
      item.addEventListener('mouseenter', () => { if (p.file !== PAGE) item.style.background = '#f6f3ef'; });
      item.addEventListener('mouseleave', () => { if (p.file !== PAGE) item.style.background = ''; });
      menu.appendChild(item);
    });

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    });
    document.addEventListener('click', () => { menu.style.display = 'none'; });

    document.body.appendChild(menu);
    document.body.appendChild(btn);
  }
})();
