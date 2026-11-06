// nav.js — Buton/link metnine göre sayfa yönlendirmesi
// Her sayfada bu script </body>'den önce yüklenir.
// Stitch'in kendi navigasyon scriptini geçersiz kılar.

const PAGE = location.pathname.split('/').pop() || 'giris.html';
const GURU_NAV_ITEMS = [
  { label: 'Danışanlarım', icon: 'group', href: 'guru-danisanlar.html', pages: ['guru-danisanlar.html', 'guru-danisan-detay.html', 'guru-hikaye.html', 'guru-notlar.html', 'guru-odevler.html'] },
  { label: 'Müsaitlik', icon: 'event_available', href: 'guru-musaitlik.html', pages: ['guru-musaitlik.html', 'guru-musaitlik-ekle.html'] },
  { label: 'Seanslarım', icon: 'calendar_month', href: 'guru-seanslar.html', pages: ['guru-seanslar.html'] },
  { label: 'Profilim', icon: 'person', href: 'guru-profil.html', pages: ['guru-profil.html'] }
];
const BOOKING_STEPS = {
  profile: 'demoProfilTamamlandi',
  kvkk: 'demoKvkkOnaylandi',
  cv: 'demoCvOnaylandi',
};

function markBookingStepComplete(step) {
  try {
    localStorage.setItem(BOOKING_STEPS[step], 'true');
    if (step === 'profile') {
      const session = window.getSession?.();
      if (session?.role === 'danisan') {
        window.setSession({ ...session, role: 'danisan', state: 'registered' });
      }
    }
  } catch (error) {
    console.error('Randevu ön koşulu kaydedilemedi.', error);
  }
}

function areBookingStepsComplete() {
  try {
    return Object.values(BOOKING_STEPS).every(key => localStorage.getItem(key) === 'true');
  } catch (error) {
    console.error('Randevu ön koşulları okunamadı.', error);
    return false;
  }
}

// ─── ANA ROTA HARİTASI ────────────────────────────────────────────────────────
// Format: "buton/link metni (veya içerdiği kısım)" → "hedef dosya"
// Büyük/küçük harf duyarsız eşleşme yapılır.
const ROUTES = {

  // ── Giriş Yap ────────────────────────────────────────────────────────────────
  "giris.html": {
    "Danışman girişi": "giris-danisman.html",
    "Hesap oluştur":  "kayit.html",       // header linki
    "Kayıt ol":       "kayit.html",       // alt link
    "Şifremi unuttum":"giris.html",       // aynı sayfada kal (demo)
  },

  "giris-danisman.html": {
    "Danışan girişi": "giris.html",
    "Giriş yap":      "guru-danisanlar.html",
  },

  "davet.html": {
    "Hesabı Etkinleştir": "giris-danisman.html",
  },

  // ── Kayıt Ekranı ─────────────────────────────────────────────────────────────
  "kayit.html": {
    "Giriş yap":      "giris.html",
    "Danışman girişi": "giris-danisman.html",
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
    "Seanslarım":                  "seanslar.html",
    "Ödevlerim":                   "odevler.html",
  },

  // ── CV Ekleme ve Doğrulama ────────────────────────────────────────────────────
  "cv.html": {
    "Onayla ve Randevuya Geç":             "randevu-on.html",
    "Onayla ve Randevuya Geç arrow_forward":"randevu-on.html",
    "Geri":                                "profil.html",
    "Daha sonra tamamla":                  "ana.html",
    "Ana Ekran":                           "ana.html",
    "Profilim":                            "profil.html",
    "Seanslarım":                          "seanslar.html",
    "Ödevlerim":                           "odevler.html",
  },

  // ── Randevu Öncesi Adımlar ────────────────────────────────────────────────────
  "randevu-on.html": {
    "Tamamla":       "takvim.html",
    "Randevu Al":    "takvim.html",
    "Randevu Al→":  "takvim.html",
    "Randevu Al →": "takvim.html",
    "Geri":          "cv.html",
    "←Geri":         "cv.html",
    "Ana Ekran":     "ana.html",
    "Profilim":      "profil.html",
    "CV'm":          "cv.html",
    "Seanslarım":    "seanslar.html",
    "Ödevlerim":      "odevler.html",
  },

  // ── Seans Zamanı Seçimi (Takvim) ─────────────────────────────────────────────
  "takvim.html": {
    "Seans Zamanını Onayla":             "randevu-ok.html",
    "Seans Zamanını Onayla arrow_forward":"randevu-ok.html",
    "Daha sonra planla":                 "ana.html",
    "Ana Ekran":                         "ana.html",
    "Profilim":                          "profil.html",
    "CV'm":                              "cv.html",
    "Seanslarım":                        "seanslar.html",
    "Ödevlerim":                         "odevler.html",
  },

  // ── Seans Planlandı ───────────────────────────────────────────────────────────
  "randevu-ok.html": {
    "Ana Ekrana Dön": "ana.html",
    "Seanslarıma Git":"seanslar.html",
    "Ana Ekran":      "ana.html",
    "Profilim":       "profil.html",
    "CV'm":           "cv.html",
    "Seanslarım":     "seanslar.html",
    "Ödevlerim":      "odevler.html",
  },

  // ── Seanslarım (Seans Listesi) ───────────────────────────────────────────────
  "seanslar.html": {
    "Ana Ekran":      "ana.html",
    "Profilim":       "profil.html",
    "CV'm":           "cv.html",
    "Seanslarım":     "seanslar.html",
    "Hikâyem":        "hikaye-giris.html",
    "Ödevlerim":      "odevler.html",
    "Notları oku":    "seans-notlari.html",
  },

  "seans-notlari.html": {
    "← Seanslarım":   "seanslar.html",
    "Ana Ekran":      "ana.html",
    "Profilim":       "profil.html",
    "CV'm":           "cv.html",
    "Seanslarım":     "seanslar.html",
    "Hikâyem":        "hikaye-giris.html",
    "Ödevlerim":      "odevler.html",
    "Hikâyeni Oluştur →": "hikaye-giris.html",
  },

  // ── 2. Seans Planlandı ───────────────────────────────────────────────────────
  "seans2-ok.html": {
    "Ana Ekrana Dön": "ana.html",
    "Seanslarıma Git":"seanslar.html",
    "Ana Ekran":      "ana.html",
    "Seanslarım":     "seanslar.html",
    "Ödevlerim":      "odevler.html",
  },

  // ── Ana Ekran ─────────────────────────────────────────────────────────────────
  "ana.html": {
    "Hikâyeni Oluştur":    "hikaye-giris.html",
    "Hikâyeni Oluştur →":  "hikaye-giris.html",
    "Randevu al":          "takvim.html",
    "Danışmanı gör":       "danisman.html?id=selin-arslan",
    "Profilim":            "profil.html",
    "CV'm":                "cv.html",
    "Seanslarım":          "seanslar.html",
    "Hikâyem":             "hikaye-giris.html",
    "Ödevlerim":           "odevler.html",
    "Danışman notlarını oku": "hikaye-giris.html",
  },

  "danisman.html": {
    "Danışmanlar": "danismanlar.html",
    "Randevu al": "takvim.html",
  },

  // ── Hikâye Giriş ──────────────────────────────────────────────────────────────
  "hikaye-giris.html": {
    "Sorulara Başla":   "soru1.html",
    "Sorulara Başla →": "soru1.html",
    "Hikâyemi Yükle":   "hikaye-yukle.html",
    "Ana Ekran":        "ana.html",
    "Profilim":         "profil.html",
    "CV'm":             "cv.html",
    "Seanslarım":       "seanslar.html",
    "Hikâyem":          "hikaye-giris.html",
    "Ödevlerim":        "odevler.html",
  },

  // ── Hazır hikâye yükleme ─────────────────────────────────────────────────────
  "hikaye-yukle.html": {
    "← Geri":                         "hikaye-giris.html",
    "Yükle ve Çıktıları Oluştur":     "ciktilar.html",
    "Ana Ekran":                      "ana.html",
    "Profilim":                       "profil.html",
    "CV'm":                           "cv.html",
    "Seanslarım":                     "seanslar.html",
    "Hikâyem":                        "hikaye-giris.html",
  },

  // ── Soru 1 ────────────────────────────────────────────────────────────────────
  "soru1.html": {
    "Cevabı Kaydet ve İlerle":    "soru2.html",
    "Cevabı Kaydet ve İlerle →":  "soru2.html",
    "Hatırlamıyorum / Atla":      "soru2.html",
    "Atla ve İlerle":             "soru2.html",
    "Atla ve İlerle →":           "soru2.html",
    "Kaydet ve Daha Sonra Devam Et":"ana.html",
    "← Geri":                     "hikaye-giris.html",
    "← Önceki Soru":              "hikaye-giris.html",
    "Ana Ekran":                  "ana.html",
    "Hikâyem":                    "hikaye-giris.html",
  },

  // ── Soru 2 ────────────────────────────────────────────────────────────────────
  "soru2.html": {
    "Cevabı Kaydet ve İlerle":    "soru3.html",
    "Cevabı Kaydet ve İlerle →":  "soru3.html",
    "Hatırlamıyorum / Atla":      "soru3.html",
    "Atla ve İlerle":             "soru3.html",
    "Atla ve İlerle →":           "soru3.html",
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
    "Atla ve İlerle":             "soru4.html",
    "Atla ve İlerle →":           "soru4.html",
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
    "Atla ve İlerle":             "soru5.html",
    "Atla ve İlerle →":           "soru5.html",
    "Kaydet ve Daha Sonra Devam Et":"ana.html",
    "← Önceki Soru":              "soru3.html",
    "Ana Ekran":                   "ana.html",
    "Hikâyem":                     "hikaye-giris.html",
  },

  // ── Soru 5 (Son Soru) ─────────────────────────────────────────────────────────
  "soru5.html": {
    "Hikâyeyi oluştur":                   "ciktilar.html",
    "Cevabı Kaydet ve Hikâyemi Oluştur": "ciktilar.html",
    "Cevabı Kaydet ve Hikâyemi Oluştur →":"ciktilar.html",
    "Hatırlamıyorum / Atla":             "ciktilar.html",
    "Atla ve İlerle":                    "ciktilar.html",
    "Atla ve İlerle →":                  "ciktilar.html",
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
    "Seanslarım":     "seanslar.html",
    "Hikâyem":        "ciktilar.html",
    "Ödevlerim":      "odevler.html",
  },

  // ── Ödevlerim (Ödev Listesi) ─────────────────────────────────────────────────
  "odevler.html": {
    "Ana Ekran":      "ana.html",
    "Profilim":       "profil.html",
    "CV'm":           "cv.html",
    "Seanslarım":     "seanslar.html",
    "Hikâyem":        "hikaye-giris.html",
    "Ödevlerim":      "odevler.html",
  },
  // ── Ödev Teslimi ─────────────────────────────────────────────────────────────
  "odev-teslim.html": {
    "Geri":           "odevler.html",
    "Ödevlerim":      "odevler.html",
    "Ana Ekran":      "ana.html",
    "Profilim":       "profil.html",
    "CV'm":           "cv.html",
    "Seanslarım":     "seanslar.html",
    "Hikâyem":        "hikaye-giris.html",
  },

  "odev-goruntule.html": {
    "← Ödevlerim":       "odevler.html",
    "Ödevlerim'e dön":   "odevler.html",
    "Ödevlerim":         "odevler.html",
    "Ana Ekran":         "ana.html",
    "Profilim":          "profil.html",
    "CV'm":              "cv.html",
    "Seanslarım":        "seanslar.html",
    "Hikâyem":           "hikaye-giris.html",
  },

  // ── GURU: Danışanlarım ────────────────────────────────────────────────────────
  "guru-danisanlar.html": {
    "Aç →":             "guru-danisan-detay.html",
    "Elif Yılmaz":      "guru-danisan-detay.html",
    "Danışanlarım":     "guru-danisanlar.html",
    "Müsaitlik":        "guru-musaitlik.html",
    "Seanslarım":       "guru-seanslar.html",
  },

  // ── GURU: Danışan Detay ──────────────────────────────────────────────────────
  "guru-danisan-detay.html": {
    "Danışanlarım":     "guru-danisanlar.html",
    "Müsaitlik":        "guru-musaitlik.html",
    "Seanslarım":       "guru-seanslar.html",
    "Notlar":           "guru-notlar.html",
    "Hikâye":           "guru-hikaye.html",
    "Ödevler":          "guru-odevler.html",
    "Genel":            "guru-danisan-detay.html",
  },

  // ── GURU: Seans Notları ──────────────────────────────────────────────────────
  "guru-notlar.html": {
    "Danışanlarım":     "guru-danisanlar.html",
    "Müsaitlik":        "guru-musaitlik.html",
    "Seanslarım":       "guru-seanslar.html",
    "Genel":            "guru-danisan-detay.html",
    "Detay":            "guru-danisan-detay.html",
    "Hikâye":           "guru-hikaye.html",
    "Ödevler":          "guru-odevler.html",
    "Notlar":           "guru-notlar.html",
  },

  // ── GURU: Hikâye Sekmesi ─────────────────────────────────────────────────────
  "guru-hikaye.html": {
    "Danışanlarım":     "guru-danisanlar.html",
    "Müsaitlik":        "guru-musaitlik.html",
    "Seanslarım":       "guru-seanslar.html",
    "Genel":            "guru-danisan-detay.html",
    "Detay":            "guru-danisan-detay.html",
    "Not Yaz":          "guru-notlar.html",
    "Ödev Ver":         "guru-odevler.html",
    "Notlar":           "guru-notlar.html",
    "Ödevler":          "guru-odevler.html",
    "Hikâye":           "guru-hikaye.html",
  },

  // ── GURU: Ödevler Sekmesi ────────────────────────────────────────────────────
  "guru-odevler.html": {
    "Danışanlarım":     "guru-danisanlar.html",
    "Müsaitlik":        "guru-musaitlik.html",
    "Seanslarım":       "guru-seanslar.html",
    "Genel":            "guru-danisan-detay.html",
    "Detay":            "guru-danisan-detay.html",
    "Notlar":           "guru-notlar.html",
    "Hikâye":           "guru-hikaye.html",
    "Ödevler":          "guru-odevler.html",
  },

  // ── GURU: Müsaitlik & Fiyat ──────────────────────────────────────────────────
  "guru-musaitlik.html": {
    "Müsaitlik Ekle":   "guru-musaitlik-ekle.html",
    "Danışanlarım":     "guru-danisanlar.html",
    "Müsaitlik":        "guru-musaitlik.html",
    "Seanslarım":       "guru-seanslar.html",
  },

  "guru-musaitlik-ekle.html": {
    "← Vazgeç":         "guru-musaitlik.html",
    "Vazgeç":           "guru-musaitlik.html",
    "Müsaitlik":        "guru-musaitlik.html",
    "Danışanlarım":     "guru-danisanlar.html",
    "Seanslarım":       "guru-seanslar.html",
  },

  // ── GURU: Seanslarım ─────────────────────────────────────────────────────────
  "guru-seanslar.html": {
    "Danışanlarım":     "guru-danisanlar.html",
    "Müsaitlik":        "guru-musaitlik.html",
    "Seanslarım":       "guru-seanslar.html",
    "Profilim":         "guru-profil.html",
    "Elif Yılmaz":      "guru-danisan-detay.html",
  },

  "guru-profil.html": {
    "Danışanlarım": "guru-danisanlar.html",
    "Müsaitlik":    "guru-musaitlik.html",
    "Seanslarım":   "guru-seanslar.html",
    "Profilim":     "guru-profil.html",
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
    const flowNav = document.getElementById('demo-flow-nav');
    if (flowNav) {
      flowNav.classList.add('demo-only');
      if (['hizmet.html', 'siparis.html'].includes(PAGE)) {
        flowNav.style.display = 'none';
        return;
      }
      flowNav.style.position = 'static';
      flowNav.style.left = 'auto';
      flowNav.style.bottom = 'auto';
      flowNav.style.transform = 'none';
      flowNav.style.zIndex = 'auto';
      flowNav.style.margin = '24px auto';
    }
  }

  function navigate(text) {
    const map = ROUTES[PAGE] || {};
    const normalizedText = text.replace(/\s+/g, ' ').trim();
    const lowerText = normalizedText.toLowerCase();
    if (PAGE === 'profil.html' && lowerText.includes('kaydet ve devam et')) {
      markBookingStepComplete('profile');
    }
    if (PAGE === 'cv.html' && lowerText.includes('onayla ve randevuya geç')) {
      markBookingStepComplete('cv');
    }
    function destinationFor(label, target) {
      if (PAGE === 'cv.html' && label.toLowerCase().includes('onayla ve randevuya geç')) {
        return areBookingStepsComplete() ? 'takvim.html' : 'randevu-on.html';
      }
      return target;
    }

    // Önce tam eşleşme
    for (const [label, target] of Object.entries(map)) {
      if (normalizedText === label.replace(/\s+/g, ' ').trim()) {
        location.href = destinationFor(label, target);
        return true;
      }
    }
    // Sonra "içeriyor mu" eşleşmesi (büyük/küçük harf duyarsız)
    for (const [label, target] of Object.entries(map)) {
      if (lowerText.includes(label.toLowerCase().replace(/\s+/g, ' ').trim())) {
        location.href = destinationFor(label, target);
        return true;
      }
    }
    return false;
  }

  function addGuruProfileActions() {
    if (!['guru-danisan-detay.html', 'guru-hikaye.html', 'guru-notlar.html', 'guru-odevler.html'].includes(PAGE)) return;
    document.body.classList.add('guru-client-profile');
    if (PAGE === 'guru-hikaye.html') document.body.classList.add('guru-story-page');
  }

  function applyDemoUiFlag() {
    if (window.DEMO_UI_VISIBLE === false || new URLSearchParams(location.search).get('demo') === '0') {
      document.documentElement.dataset.demoUi = 'hidden';
    }
  }

  function updateGuruSidebar() {
    if (!PAGE.startsWith('guru-')) return;
    document.body.classList.add('guru-panel-page');
    const sidebar = document.querySelector('.advisor-sidebar');
    const nav = sidebar?.querySelector('nav');
    if (!sidebar || !nav) return;

    GURU_NAV_ITEMS.forEach(item => {
      let link = Array.from(nav.querySelectorAll('a')).find(anchor => anchor.textContent.includes(item.label));
      if (!link) {
        link = document.createElement('a');
        link.className = 'flex items-center justify-between px-space-md py-space-sm rounded-lg text-on-surface-variant hover:bg-[#7564C7] transition-colors';
        link.innerHTML = `<div class="flex items-center gap-space-sm"><span class="material-symbols-outlined text-[20px] text-outline">${item.icon}</span><span class="font-headline-sm text-body-md text-[#1E1E1C]"></span></div>`;
        nav.appendChild(link);
      }

      link.href = item.href;
      const label = link.querySelector('div > span:last-child');
      if (label) label.textContent = item.label;
      const current = item.pages.includes(PAGE);
      if (current) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');

      let arrow = link.querySelector(':scope > .advisor-sidebar-active-arrow');
      if (current && !arrow) {
        arrow = Array.from(link.querySelectorAll(':scope > .material-symbols-outlined'))
          .find(icon => icon.textContent.trim() === 'chevron_right');
        arrow?.classList.add('advisor-sidebar-active-arrow');
      }
      if (current && !arrow) {
        arrow = document.createElement('span');
        arrow.className = 'material-symbols-outlined text-[18px] text-on-primary advisor-sidebar-active-arrow';
        arrow.textContent = 'chevron_right';
        link.appendChild(arrow);
      } else if (!current) {
        arrow?.remove();
      }

      link.classList.remove('bg-[#51409D]', 'text-on-primary', 'font-semibold', 'shadow-xs', 'rounded-[8px]');
      link.classList.add('rounded-lg');
      link.querySelectorAll('.material-symbols-outlined').forEach(icon => {
        icon.classList.remove('text-on-primary');
        icon.classList.add('text-outline');
      });
      if (label) {
        label.classList.remove('text-on-primary');
        label.classList.add('text-[#1E1E1C]');
      }
    });

    let displayName = window.getSession?.().name || 'Selin Arslan';
    try {
      const rawProfile = localStorage.getItem('guruProfile');
      const profile = rawProfile ? JSON.parse(rawProfile) : null;
      if (typeof profile?.name === 'string' && profile.name.trim()) displayName = profile.name.trim();
    } catch (error) {
      console.error('Danışman profili menüde gösterilemedi.', error);
    }
    const nameNode = sidebar.querySelector('.border-t .truncate');
    const avatar = sidebar.querySelector('.border-t .rounded-full');
    if (nameNode) nameNode.textContent = displayName;
    if (avatar) {
      avatar.textContent = displayName.split(/\s+/).slice(0, 2).map(part => part.charAt(0).toLocaleUpperCase('tr-TR')).join('');
    }
  }

  function setupPanelLayout() {
    if (document.getElementById('sidebar')?.dataset.shared === 'true') return;

    const main = document.querySelector('main');
    let sidebar = main?.querySelector('.advisor-sidebar');
    if (document.body.classList.contains('guru-panel-page') && main) {
      const content = main.querySelector('.guru-profile-content') ||
        Array.from(main.querySelectorAll('section')).find(section =>
          section.classList.contains('lg:col-span-8')
        ) ||
        Array.from(main.querySelectorAll('section')).find(section => section.querySelector('h1'));
      if (content) {
        let name = sidebar?.querySelector('.guru-profile-user .truncate, .border-t .truncate')
          ?.textContent.trim();
        if (!name) {
          name = window.getSession?.().name || 'Selin Arslan';
          try {
            const rawProfile = localStorage.getItem('guruProfile');
            const profile = rawProfile ? JSON.parse(rawProfile) : null;
            if (typeof profile?.name === 'string' && profile.name.trim()) name = profile.name.trim();
          } catch (error) {
            console.error('Danışman profili menüde gösterilemedi.', error);
          }
        }
        const sharedSidebar = document.createElement('aside');
        sharedSidebar.className = 'advisor-sidebar';
        sharedSidebar.setAttribute('aria-label', 'Danışman menüsü');
        const card = document.createElement('div');
        card.className = 'guru-profile-sidebar-card';
        const menu = document.createElement('div');
        menu.className = 'guru-profile-sidebar-menu';
        const brand = document.createElement('div');
        brand.className = 'guru-profile-brand';
        brand.textContent = 'Interview Demo';
        const nav = document.createElement('nav');
        nav.className = 'guru-profile-menu';
        nav.setAttribute('aria-label', 'Ana menü');
        GURU_NAV_ITEMS.forEach(item => {
          const link = document.createElement('a');
          link.className = 'guru-profile-menu-link';
          link.href = item.href;
          if (item.pages.includes(PAGE)) link.setAttribute('aria-current', 'page');
          const labelGroup = document.createElement('div');
          labelGroup.className = 'guru-profile-menu-label-group';
          const icon = document.createElement('span');
          icon.className = 'material-symbols-outlined guru-profile-menu-icon';
          icon.setAttribute('aria-hidden', 'true');
          icon.textContent = item.icon;
          const label = document.createElement('span');
          label.className = 'guru-profile-menu-label';
          label.textContent = item.label;
          labelGroup.append(icon, label);
          link.appendChild(labelGroup);
          if (item.pages.includes(PAGE)) {
            const arrow = document.createElement('span');
            arrow.className = 'material-symbols-outlined guru-profile-menu-current';
            arrow.setAttribute('aria-hidden', 'true');
            arrow.textContent = 'chevron_right';
            link.appendChild(arrow);
          }
          nav.appendChild(link);
        });
        menu.append(brand, nav);
        const user = document.createElement('div');
        user.className = 'guru-profile-user panel-sidebar-user border-t';
        const avatar = document.createElement('div');
        avatar.className = 'rounded-full panel-sidebar-avatar guru-profile-avatar';
        avatar.textContent = name.split(/\s+/).slice(0, 2)
          .map(part => part.charAt(0).toLocaleUpperCase('tr-TR')).join('');
        const details = document.createElement('div');
        details.className = 'panel-sidebar-user-details';
        const userName = document.createElement('span');
        userName.className = 'truncate';
        userName.textContent = name;
        const role = document.createElement('small');
        role.textContent = 'Danışman';
        details.append(userName, role);
        user.append(avatar, details);
        card.append(menu, user);
        sharedSidebar.appendChild(card);
        main.replaceChildren(sharedSidebar, content);
        main.classList.remove('guru-profile-layout');
        sidebar = sharedSidebar;
      }
    }
    const nav = sidebar?.querySelector('nav');
    const grid = sidebar?.parentElement;
    const content = grid && Array.from(grid.children).find(element =>
      element !== sidebar && /^(SECTION|DIV)$/.test(element.tagName)
    );
    if (!main || !sidebar || !nav || !content) return;

    const menuItems = Array.from(nav.children);
    const menuText = menuItems.map(item => item.textContent.replace(/\s+/g, ' ').trim())
      .join(' ').toLocaleLowerCase('tr-TR');
    if (!/ana ekran|profilim|cv'm|seanslarım|danışanlarım|müsaitlik/.test(menuText)) return;

    document.body.classList.add('panel-dashboard');
    main.classList.add('panel-dashboard-main');
    grid.classList.add('panel-dashboard-grid');
    sidebar.classList.add('panel-sidebar');
    sidebar.firstElementChild?.classList.add('panel-sidebar-card');
    content.classList.add('panel-main-content');

    if (grid !== main) {
      let shell = grid;
      while (shell.parentElement && shell.parentElement !== main) shell = shell.parentElement;
      if (shell.parentElement === main) shell.classList.add('panel-page-shell');
    }

    const shortLabels = [
      [/ana ekran/i, 'Ana'],
      [/profilim/i, 'Profil'],
      [/cv/i, 'CV'],
      [/seanslarım/i, 'Seans'],
      [/hikâyem|hikayem/i, 'Hikâye'],
      [/danışanlarım/i, 'Danışan'],
      [/müsaitlik/i, 'Saat'],
      [/notlarım|notlar/i, 'Notlar'],
      [/ödevlerim|ödevler/i, 'Ödev']
    ];
    menuItems.forEach(item => {
      if (!item.querySelector('span:not(.material-symbols-outlined)')) {
        const textNodes = Array.from(item.childNodes).filter(node =>
          node.nodeType === Node.TEXT_NODE && node.textContent.trim()
        );
        if (textNodes.length) {
          const label = document.createElement('span');
          label.textContent = textNodes.map(node => node.textContent.trim()).join(' ');
          textNodes[0].replaceWith(label);
          textNodes.slice(1).forEach(node => node.remove());
        }
      }
      const label = Array.from(item.querySelectorAll('span'))
        .filter(span => !span.classList.contains('material-symbols-outlined'))
        .map(span => span.textContent.trim())
        .join(' ').trim();
      const shortLabel = shortLabels.find(([pattern]) => pattern.test(label))?.[1];
      if (shortLabel) item.dataset.panelShort = shortLabel;
      item.querySelectorAll('span').forEach(span => {
        if (span.classList.contains('material-symbols-outlined')) {
          span.classList.add('panel-nav-icon');
        } else {
          span.classList.add('panel-nav-label');
        }
      });
    });

    const brand = sidebar.querySelector('.guru-profile-brand') ||
      sidebar.querySelector('.panel-sidebar-card > div:first-child > div:first-child');
    if (brand) {
      brand.classList.add('panel-sidebar-brand');
      brand.dataset.panelShort = 'ID';
    }
    const user = sidebar.querySelector('.guru-profile-user') ||
      sidebar.querySelector('.panel-sidebar-card > div:last-child');
    if (user) {
      user.classList.add('panel-sidebar-user');
      const avatar = user.querySelector('.rounded-full');
      avatar?.classList.add('panel-sidebar-avatar');
      const details = avatar?.nextElementSibling;
      details?.classList.add('panel-sidebar-user-details');
    }

    if (!sidebar.id) sidebar.id = 'panel-sidebar';
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'panel-sidebar-toggle';
    toggle.setAttribute('aria-controls', sidebar.id);
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Menüyü aç');
    toggle.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">menu</span>';
    document.body.appendChild(toggle);

    function setMenuOpen(open) {
      document.body.classList.toggle('panel-menu-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
      const icon = toggle.querySelector('.material-symbols-outlined');
      if (icon) icon.textContent = open ? 'close' : 'menu';
      if (open) sidebar.querySelector('a')?.focus();
      else toggle.focus();
    }

    toggle.addEventListener('click', () => {
      setMenuOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('click', event => {
      if (document.body.classList.contains('panel-menu-open') &&
          !sidebar.contains(event.target) && !toggle.contains(event.target)) {
        setMenuOpen(false);
      }
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && document.body.classList.contains('panel-menu-open')) {
        setMenuOpen(false);
      }
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768 && document.body.classList.contains('panel-menu-open')) {
        setMenuOpen(false);
      }
    });
  }

  function wireClientAdvisorProfile() {
    if (PAGE !== 'ana.html') return;
    const advisor = window.getAdvisor?.('selin-arslan');
    if (!advisor) return;
    const heading = Array.from(document.querySelectorAll('h2, h3'))
      .find(element => element.textContent.trim() === 'Danışmanın');
    const card = heading?.parentElement?.parentElement;
    const identity = card?.querySelector('.flex.items-center.gap-3');
    if (!identity || identity.closest('a')) return;
    const link = document.createElement('a');
    link.className = 'client-advisor-profile-link';
    link.href = 'danisman.html?id=' + encodeURIComponent(advisor.id);
    link.setAttribute('aria-label', advisor.ad + ' danışman profilini gör');
    const avatar = identity.querySelector('.rounded-full');
    const name = identity.querySelector('.flex.flex-col > span:first-child');
    const title = identity.querySelector('.flex.flex-col > span:last-child');
    if (avatar) avatar.textContent = advisor.ad.split(/\s+/).slice(0, 2)
      .map(part => part.charAt(0).toLocaleUpperCase('tr-TR')).join('');
    if (name) name.textContent = advisor.ad;
    if (title) title.textContent = advisor.unvan;
    identity.replaceWith(link);
    link.appendChild(identity);
  }

  applyDemoUiFlag();
  document.addEventListener('DOMContentLoaded', () => {
    applyDemoUiFlag();
    hideStitchNav();
    fixLocalDemoFlowNav();
    addGuruProfileActions();
    updateGuruSidebar();
    setupPanelLayout();
    wireClientAdvisorProfile();

    // Demo menüsü: sağ alt köşeye mini float menü ekle
    addDemoMenu();
  });

  document.addEventListener('click', (e) => {
    const el = e.target.closest('button, a, [role="button"]');
    if (!el) return;
    if (el.closest('.site-header')) return;
    if (el.matches('#resend-button')) return;
    if (el.closest('.public-advisor-booking, .public-advisor-slot, .public-advisor-similar-card, .client-advisor-profile-link') ||
        el.matches('#confirmation-advisor-profile, .candidate-session-advisor-link')) return;
    if (document.body.classList.contains('guru-profile-editor') &&
        el.closest('.advisor-sidebar nav') &&
        document.body.dataset.profileDirty === 'true') return;
    if (el.hasAttribute('data-availability-add')) return;
    if (el.hasAttribute('data-confirm-booking')) return;
    if (el.hasAttribute('data-cv-confirm')) return;
    if (el.matches('#submit-order-btn')) return;
    const text = (el.textContent || el.innerText || '').replace(/\s+/g, ' ').trim();
    // Disabled buton olsa dahi demoda haritada eşleşiyorsa yönlendir
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') {
      if (navigate(text)) {
        e.preventDefault();
        e.stopPropagation();
      }
      return;
    }
    // form submit'leri de yakala
    if (navigate(text)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true); // capture phase — Stitch handler'larından önce çalış

  // ─── DEMO HIZLI ERİŞİM MENÜSÜ ─────────────────────────────────────────────
  function addDemoMenu() {
    if (window.DEMO_UI_VISIBLE === false || document.documentElement.dataset.demoUi === 'hidden') return;

    const pages = [
      { label: '🔐 Giriş Yap',          file: 'giris.html' },
      { label: '🧑‍🏫 Danışman Girişi',  file: 'giris-danisman.html' },
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
      { label: '📅 Seanslarım',         file: 'seanslar.html' },
      { label: '🏠 Ana Ekran',          file: 'ana.html' },
      { label: '📖 Hikâye Giriş',       file: 'hikaye-giris.html' },
      { label: '❓ Soru 1',             file: 'soru1.html' },
      { label: '❓ Soru 2',             file: 'soru2.html' },
      { label: '❓ Soru 3',             file: 'soru3.html' },
      { label: '❓ Soru 4',             file: 'soru4.html' },
      { label: '❓ Soru 5',             file: 'soru5.html' },
      { label: '🏆 Çıktılar',           file: 'ciktilar.html' },
      { label: '📚 Ödevlerim',          file: 'odevler.html' },
      { label: '📤 Ödev Teslimi',       file: 'odev-teslim.html' },
      { label: '── 🧑‍🏫 GURU PANELLERİ ──', file: 'guru-danisanlar.html', isHeader: true },
      { label: '👥 Danışanlarım',       file: 'guru-danisanlar.html' },
      { label: '👤 Danışan Detay (Elif)',file: 'guru-danisan-detay.html' },
      { label: '📝 Seans Notları (Guru)',file: 'guru-notlar.html' },
      { label: '📖 Hikâye İnceleme',     file: 'guru-hikaye.html' },
      { label: '📚 Danışan Ödevleri',    file: 'guru-odevler.html' },
      { label: '⚙️ Müsaitlik & Fiyatım', file: 'guru-musaitlik.html' },
      { label: '🗓 Seanslarım (Danışman)',file: 'guru-seanslar.html' },
      { label: '👤 Profilim (Danışman)', file: 'guru-profil.html' },
    ];

    const btn = document.createElement('button');
    btn.className = 'demo-only';
    btn.textContent = '☰ Demo';
    btn.style.cssText = `
      position: fixed; bottom: 16px; right: 16px; z-index: 99999;
      background: #51409D; color: #fff; border: none; border-radius: 8px;
      padding: 8px 14px; font-size: 13px; font-weight: 600;
      cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      font-family: 'IBM Plex Sans', sans-serif;
    `;

    const menu = document.createElement('div');
    menu.className = 'demo-only';
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
        border-bottom: 1px solid #7564C7;
        ${p.file === PAGE ? 'background:#51409D; font-weight:600; color:#fff;' : ''}
      `;
      item.addEventListener('mouseenter', () => { if (p.file !== PAGE) item.style.background = '#7564C7'; });
      item.addEventListener('mouseleave', () => { if (p.file !== PAGE) item.style.background = ''; });
      menu.appendChild(item);
    });

    [
      { label: 'İzleyici olarak başla', viewer: true },
      { label: 'Danışan olarak devam et', role: 'danisan' },
      { label: 'Danışman olarak devam et', role: 'danisman' },
      { label: 'Demo: oturumu kapat', logout: true },
    ].forEach(option => {
      const item = document.createElement('a');
      item.href = option.viewer ? 'index.html?izleyici=1' :
        option.role === 'danisman' ? 'guru-danisanlar.html' :
          option.role === 'danisan' ? 'hizmet.html' : 'index.html';
      item.textContent = option.label;
      item.style.cssText = 'display:block;padding:9px 16px;font-size:13px;color:#7564C7;text-decoration:none;font-family:"IBM Plex Sans",sans-serif;border-top:1px solid #7564C7';
      item.addEventListener('click', event => {
        event.preventDefault();
        if (option.logout) {
          window.logout?.();
          return;
        }
        if (option.viewer) {
          try {
            localStorage.removeItem('demoOturum');
          } catch (error) {
            console.error('İzleyici modu oturumu temizlenemedi.', error);
          }
          location.href = item.href;
          return;
        }
        const existing = window.getSession?.() || {};
        let candidateState = existing.role === 'danisan' ? existing.state : 'new';
        try {
          if (localStorage.getItem('demoProfilTamamlandi') === 'true' ||
              localStorage.getItem('demoCvOnaylandi') === 'true') candidateState = 'registered';
        } catch (error) {
          console.error('Danışan ilerleme durumu okunamadı.', error);
        }
        const role = option.role;
        const name = role === 'danisman' ? 'Selin Arslan' :
          existing.role === 'danisan' && existing.name ? existing.name : 'Elif Yılmaz';
        if (!window.setSession?.({
          role,
          name,
          state: role === 'danisman' ? 'active' : candidateState || 'new',
          email: existing.email || ''
        })) return;
        location.href = role === 'danisman'
          ? 'guru-danisanlar.html'
          : candidateState === 'registered'
            ? 'ana.html'
            : 'hizmet.html';
      });
      menu.appendChild(item);
    });

    if (PAGE === 'seanslar.html') {
      const stateGroup = document.createElement('div');
      stateGroup.style.cssText = 'padding:10px 12px 12px;border-top:1px solid #7564C7;font-family:"IBM Plex Sans",sans-serif';
      stateGroup.innerHTML = `
        <div style="font-size:12px;font-weight:600;color:#7564C7;margin-bottom:8px">Görüşme linki durumu</div>
        <div style="display:grid;gap:6px">
          <button type="button" data-link-state="yok" style="padding:7px 9px;border:1px solid #7564C7;border-radius:6px;background:#fff;color:#1c1c1a;text-align:left;font:inherit;font-size:12px;cursor:pointer">Link yok</button>
          <button type="button" data-link-state="beklemede" style="padding:7px 9px;border:1px solid #7564C7;border-radius:6px;background:#fff;color:#1c1c1a;text-align:left;font:inherit;font-size:12px;cursor:pointer">Link var, 15 dk'dan fazla</button>
          <button type="button" data-link-state="acik" style="padding:7px 9px;border:1px solid #7564C7;border-radius:6px;background:#fff;color:#1c1c1a;text-align:left;font:inherit;font-size:12px;cursor:pointer">15 dk içinde</button>
        </div>`;
      stateGroup.querySelectorAll('[data-link-state]').forEach(option => {
        option.addEventListener('click', () => {
          localStorage.setItem('demoLinkDurumu', option.dataset.linkState);
          location.reload();
        });
      });
      menu.appendChild(stateGroup);
    }

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    });
    document.addEventListener('click', () => { menu.style.display = 'none'; });

    document.body.appendChild(menu);
    document.body.appendChild(btn);
  }

  function fixLocalDemoFlowNav() {
    const guruPages = ['guru-danisanlar.html', 'guru-musaitlik.html', 'guru-seanslar.html'];
    const currentIndex = guruPages.indexOf(PAGE);
    const nav = document.getElementById('demo-flow-nav');
    if (currentIndex < 0 || !nav) return;

    const links = Array.from(nav.querySelectorAll('a'));
    if (links.length < 3) return;
    links[0].href = guruPages[(currentIndex - 1 + guruPages.length) % guruPages.length];
    links[1].href = 'guru-danisanlar.html';
    links[2].href = guruPages[(currentIndex + 1) % guruPages.length];
  }

  function addAvailabilityEditor() {
    if (PAGE !== 'guru-musaitlik.html') return;

    const addButton = Array.from(document.querySelectorAll('button'))
      .find(button => button.textContent.replace(/\s+/g, ' ').trim().endsWith('Müsaitlik Ekle'));
    const pageSection = Array.from(document.querySelectorAll('main section'))
      .find(section => section.querySelector('h1')?.textContent.trim() === 'Müsaitlik');
    if (!addButton || !pageSection) return;
    addButton.setAttribute('data-availability-add', '');

    const modal = document.createElement('div');
    modal.innerHTML = `
      <div data-availability-overlay style="position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.45);display:none;align-items:center;justify-content:center;padding:16px">
        <form aria-label="Müsaitlik ekle" style="width:100%;max-width:440px;background:#fff;border-radius:12px;padding:24px;color:#1e1e1c;box-shadow:0 12px 40px rgba(0,0,0,.2);font-family:'IBM Plex Sans',sans-serif">
          <h2 style="margin:0 0 6px;font-size:20px">Müsaitlik ekle</h2>
          <p style="margin:0 0 20px;color:#7564C7;font-size:14px">Adayların randevu alabileceği tarih ve saati seç.</p>
          <label style="display:block;margin-bottom:12px;font-size:14px">Tarih
            <input name="date" type="date" required style="display:block;width:100%;margin-top:6px;padding:10px;border:1px solid #7564C7;border-radius:8px;font:inherit">
          </label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <label style="font-size:14px">Başlangıç
              <input name="start" type="time" required style="display:block;width:100%;margin-top:6px;padding:10px;border:1px solid #7564C7;border-radius:8px;font:inherit">
            </label>
            <label style="font-size:14px">Bitiş
              <input name="end" type="time" required style="display:block;width:100%;margin-top:6px;padding:10px;border:1px solid #7564C7;border-radius:8px;font:inherit">
            </label>
          </div>
          <p data-availability-feedback role="status" aria-live="polite" style="min-height:20px;margin:12px 0;color:#a33;font-size:13px"></p>
          <div style="display:flex;justify-content:flex-end;gap:8px">
            <button type="button" data-availability-close style="padding:9px 14px;border:1px solid #7564C7;border-radius:8px;background:#fff;color:#1e1e1c;cursor:pointer">Vazgeç</button>
            <button type="submit" style="padding:9px 14px;border:0;border-radius:8px;background:#51409D;color:#fff;cursor:pointer">Kaydet</button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(modal.firstElementChild);
    const overlay = document.querySelector('[data-availability-overlay]');
    const form = overlay.querySelector('form');
    const dateInput = form.elements.namedItem('date');
    const startInput = form.elements.namedItem('start');
    const endInput = form.elements.namedItem('end');
    const feedback = overlay.querySelector('[data-availability-feedback]');
    const list = document.createElement('div');
    list.style.cssText = 'background:#fff;border:1px solid #7564C7;border-radius:8px;padding:16px 20px;margin-top:16px;font-family:"IBM Plex Sans",sans-serif';
    list.innerHTML = '<h2 style="margin:0 0 12px;font-size:16px;color:#1e1e1c">Eklenen müsaitlikler</h2><p data-availability-empty style="margin:0;color:#7564C7;font-size:14px">Henüz eklenmiş müsaitlik yok.</p><ul data-availability-list style="display:grid;gap:8px;margin:0;padding:0;list-style:none"></ul>';
    const priceCard = pageSection.querySelector('[data-guru-service-price]');
    pageSection.insertBefore(list, priceCard || null);
    const slotsList = list.querySelector('[data-availability-list]');
    const storageKey = 'guruAvailabilitySlots';
    const periodLabel = Array.from(pageSection.querySelectorAll('div'))
      .find(element => /^\d{1,2}\s*-\s*\d{1,2}\s+\S+\s+\d{4}$/.test(element.textContent.trim()));
    const calendar = periodLabel?.parentElement?.parentElement;
    const calendarGrid = calendar?.querySelector('[class~="min-w-[700px]"]');
    const calendarHeader = calendarGrid?.children[0];
    const calendarBody = calendarGrid?.children[1];
    const toolbarButtons = Array.from(calendar?.querySelectorAll('button') || []);
    const todayButton = toolbarButtons.find(button => button.textContent.trim() === 'Bugün');
    const previousButton = toolbarButtons.find(button => button.textContent.trim() === 'chevron_left');
    const nextButton = toolbarButtons.find(button => button.textContent.trim() === 'chevron_right');
    const initialCells = calendarBody
      ? Array.from(calendarBody.children, row => Array.from(row.children).slice(1, 8).map(cell => cell.innerHTML))
      : [];
    const initialWeekMatch = periodLabel?.textContent.trim().match(/^(\d{1,2})\s*-\s*\d{1,2}\s+(\S+)\s+(\d{4})$/);
    const monthNumbers = { Oca: 0, Ocak: 0, Şub: 1, Şubat: 1, Mar: 2, Mart: 2, Nis: 3, Nisan: 3, May: 4, Mayıs: 4, Haz: 5, Haziran: 5, Tem: 6, Temmuz: 6, Ağu: 7, Ağustos: 7, Eyl: 8, Eylül: 8, Eki: 9, Ekim: 9, Kas: 10, Kasım: 10, Ara: 11, Aralık: 11 };
    let weekStart = initialWeekMatch && monthNumbers[initialWeekMatch[2]] !== undefined
      ? new Date(Number(initialWeekMatch[3]), monthNumbers[initialWeekMatch[2]], Number(initialWeekMatch[1]))
      : new Date();
    const weekdayNames = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
    let slots = [];

    function showFeedback(message, isError) {
      feedback.textContent = message;
      feedback.style.color = isError ? '#a33' : '#51409D';
    }

    function renderSlots() {
      slotsList.replaceChildren();
      list.querySelector('[data-availability-empty]').hidden = slots.length > 0;
      slots.forEach(slot => {
        const row = document.createElement('li');
        const date = new Date(`${slot.date}T12:00:00`);
        row.textContent = `${date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} · ${slot.start} - ${slot.end}`;
        row.style.cssText = 'padding:10px 12px;border-radius:8px;background:#EEECFF;color:#EEECFF;font-size:14px';
        slotsList.appendChild(row);
      });
    }

    function renderCalendar() {
      if (!periodLabel || !calendarHeader || !calendarBody) return;
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const startMonth = weekStart.toLocaleDateString('tr-TR', { month: 'short' });
      const endMonth = weekEnd.toLocaleDateString('tr-TR', { month: 'short' });
      const title = weekStart.getMonth() === weekEnd.getMonth()
        ? `${weekStart.getDate()} - ${weekEnd.getDate()} ${weekStart.toLocaleDateString('tr-TR', { month: 'long' })} ${weekEnd.getFullYear()}`
        : `${weekStart.getDate()} ${startMonth} - ${weekEnd.getDate()} ${endMonth} ${weekEnd.getFullYear()}`;
      periodLabel.textContent = title;

      Array.from(calendarHeader.children).slice(1).forEach((cell, index) => {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + index);
        cell.children[0].textContent = weekdayNames[index];
        cell.children[1].textContent = date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
        const isWeekend = index > 4;
        cell.classList.toggle('bg-[#7564C7]/70', isWeekend);
        cell.children[0].classList.toggle('text-[#7564C7]', isWeekend);
        cell.children[0].classList.toggle('text-[#1E1E1C]', !isWeekend);
      });

      Array.from(calendarBody.children).forEach((row, rowIndex) => {
        const hour = row.children[0].textContent.trim().slice(0, 2);
        Array.from(row.children).slice(1).forEach((cell, dayIndex) => {
          cell.replaceChildren();
          const date = new Date(weekStart);
          date.setDate(date.getDate() + dayIndex);
          if (weekStart.getTime() === initialWeekStart.getTime() && initialCells[rowIndex]?.[dayIndex]) {
            cell.innerHTML = initialCells[rowIndex][dayIndex];
          }

          const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          slots.filter(slot => slot.date === dateKey && slot.start.slice(0, 2) === hour).forEach(slot => {
            const appointment = document.createElement('div');
            appointment.className = 'h-full rounded-[6px] bg-[#EEECFF] border border-[#BCB7F5] p-1.5 text-left flex flex-col justify-center';
            const time = document.createElement('div');
            time.className = 'flex items-center gap-1 text-[11px] font-semibold text-[#51409D]';
            time.textContent = `${slot.start} - ${slot.end}`;
            const label = document.createElement('div');
            label.className = 'text-[11px] text-[#51409D] pl-2.5 font-medium';
            label.textContent = 'Müsait';
            appointment.append(time, label);
            cell.appendChild(appointment);
          });
        });
      });
    }

    const initialWeekStart = new Date(weekStart);

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed) || parsed.some(slot => !slot || typeof slot.date !== 'string' || typeof slot.start !== 'string' || typeof slot.end !== 'string')) {
          throw new Error('Kayıtlı müsaitlik verisi geçersiz.');
        }
        slots = parsed;
      }
      renderSlots();
      renderCalendar();
    } catch (error) {
      list.querySelector('[data-availability-empty]').textContent = 'Kayıtlı müsaitlikler okunamadı. Tarayıcı depolama alanını kontrol et.';
      console.error('Müsaitlik kayıtları yüklenemedi:', error);
    }

    function changeWeek(amount) {
      weekStart = new Date(weekStart);
      weekStart.setDate(weekStart.getDate() + amount * 7);
      renderCalendar();
    }

    todayButton?.addEventListener('click', () => {
      const today = new Date();
      weekStart = new Date(today);
      weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
      weekStart.setHours(12, 0, 0, 0);
      renderCalendar();
    });
    previousButton?.addEventListener('click', () => changeWeek(-1));
    nextButton?.addEventListener('click', () => changeWeek(1));

    function closeModal() {
      overlay.style.display = 'none';
      showFeedback('', false);
    }

    addButton.addEventListener('click', () => {
      form.reset();
      showFeedback('', false);
      overlay.style.display = 'flex';
      dateInput.focus();
    });
    overlay.querySelector('[data-availability-close]').addEventListener('click', closeModal);
    overlay.addEventListener('click', event => {
      if (event.target === overlay) closeModal();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && overlay.style.display === 'flex') closeModal();
    });
    form.addEventListener('submit', event => {
      event.preventDefault();
      const date = dateInput.value;
      const start = startInput.value;
      const end = endInput.value;
      if (!date || !start || !end || end <= start) {
        showFeedback('Bitiş saati başlangıç saatinden sonra olmalı.', true);
        return;
      }
      if (slots.some(slot => slot.date === date && start < slot.end && end > slot.start)) {
        showFeedback('Bu saat aralığı mevcut bir müsaitlikle çakışıyor.', true);
        return;
      }

      const updatedSlots = [...slots, { date, start, end }].sort((a, b) =>
        `${a.date}T${a.start}`.localeCompare(`${b.date}T${b.start}`)
      );
      try {
        localStorage.setItem(storageKey, JSON.stringify(updatedSlots));
      } catch (error) {
        showFeedback('Müsaitlik kaydedilemedi. Tarayıcı depolama alanını kontrol et.', true);
        console.error('Müsaitlik kaydedilemedi:', error);
        return;
      }
      slots = updatedSlots;
      renderSlots();
      renderCalendar();
      closeModal();
    });
  }
})();
