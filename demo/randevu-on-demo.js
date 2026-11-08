// randevu-on-demo.js: Randevu öncesi adımlar ekranı demo davranışı
(function () {
  var bookingSteps = {
    profile: 'demoProfilTamamlandi',
    kvkk: 'demoKvkkOnaylandi',
    cv: 'demoCvOnaylandi'
  };

  function isBookingReady() {
    try {
      return Object.keys(bookingSteps).every(function (step) {
        return localStorage.getItem(bookingSteps[step]) === 'true';
      });
    } catch (error) {
      console.error('Randevu ön koşulları okunamadı.', error);
      return false;
    }
  }

  function markBookingStepsComplete() {
    try {
      Object.keys(bookingSteps).forEach(function (step) {
        localStorage.setItem(bookingSteps[step], 'true');
      });
    } catch (error) {
      console.error('Randevu ön koşulları kaydedilemedi.', error);
    }
  }

  if (isBookingReady()) {
    window.location.replace('takvim.html');
    return;
  }

  function toast(msg) {
    var t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#51409D;color:#fff;padding:12px 22px;border-radius:10px;font-size:14px;font-weight:500;z-index:99999;font-family:IBM Plex Sans, sans-serif;';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2500);
  }

  function activateRandevuButton() {
    var btns = document.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      if (btns[i].textContent.indexOf('Randevu Al') > -1) {
        var b = btns[i];
        b.disabled = false;
        b.removeAttribute('disabled');
        b.style.backgroundColor = '#51409D';
        b.style.color = '#FFFFFF';
        b.style.cursor = 'pointer';
        b.classList.remove('bg-[#7564C7]', 'text-[#7564C7]', 'cursor-not-allowed');
        b.classList.add('bg-[#51409D]', 'text-on-primary', 'hover:bg-[#51409D]/90');
      }
    }
  }

  function completeSteps() {
    markBookingStepsComplete();

    // KVKK checkbox'ı işaretle ve satırını yeşile çevir
    var cb = document.querySelector('input[type="checkbox"]');
    if (cb) cb.checked = true;

    // Turuncu ikonları yeşil check_circle yap
    document.querySelectorAll('.bg-\\[\\#EEECFF\\]').forEach(function (iconContainer) {
      iconContainer.className = 'w-9 h-9 rounded-full bg-[#EEECFF] flex items-center justify-center shrink-0';
      iconContainer.innerHTML = '<span class="material-symbols-outlined text-[20px] text-[#51409D]">check_circle</span>';
    });

    // Üst hazırlık çubuğundaki (CV, CV Onayı) adımlarını yeşil yap
    document.querySelectorAll('.border-\\[\\#7564C7\\]').forEach(function (stepCircle) {
      stepCircle.className = 'w-6 h-6 rounded-full bg-[#51409D] text-on-primary flex items-center justify-center text-label-badge font-semibold';
      stepCircle.innerHTML = '<span class="material-symbols-outlined text-[16px]">check</span>';
    });
    document.querySelectorAll('.text-\\[\\#7564C7\\]').forEach(function (txt) {
      if (txt.textContent.trim() === 'CV' || txt.textContent.trim() === 'CV Onayı') {
        txt.className = 'font-headline-sm text-body-md text-tertiary font-medium';
      }
    });

    // Tamamla butonunu "Tamamlandı" rozetine dönüştür
    var tamamlaBtn = Array.from(document.querySelectorAll('button')).find(function (b) {
      return b.textContent.trim() === 'Tamamla';
    });
    if (tamamlaBtn) {
      var badge = document.createElement('div');
      badge.className = 'flex items-center gap-1.5 text-[#51409D] font-medium text-body-md bg-[#EEECFF]/60 px-3 py-1.5 rounded-full';
      badge.innerHTML = '<span class="material-symbols-outlined text-[18px]">check</span><span>Tamamlandı</span>';
      tamamlaBtn.parentElement.replaceChild(badge, tamamlaBtn);
    }

    // Randevu al butonunu aktif et
    activateRandevuButton();
  }

  // Checkbox değiştiğinde Randevu Al butonunu aktifleştir
  document.addEventListener('change', function (e) {
    if (e.target.matches('input[type="checkbox"]')) {
      if (e.target.checked) {
        try {
          localStorage.setItem(bookingSteps.kvkk, 'true');
        } catch (error) {
          console.error('KVKK onayı kaydedilemedi.', error);
        }
      } else {
        try {
          localStorage.setItem(bookingSteps.kvkk, 'false');
        } catch (error) {
          console.error('KVKK onayı kaldırılamadı.', error);
        }
      }
      if (isBookingReady()) activateRandevuButton();
    }
  });

  // "Tamamla" tıklandığında adımları tamamla ve takvime yönlendir
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('button, a, [role="button"]');
    if (!btn) return;
    var txt = (btn.textContent || '').replace(/\s+/g, ' ').trim();

    if (txt === 'Tamamla' || txt.indexOf('Tamamla') > -1) {
      e.preventDefault();
      e.stopPropagation();
      completeSteps();
      toast('Adımlar tamamlandı. Takvime yönlendiriliyorsunuz...');
      setTimeout(function () {
        window.location.href = 'takvim.html';
      }, 700);
      return;
    }

    if (txt.indexOf('Randevu Al') > -1) {
      e.preventDefault();
      e.stopPropagation();
      markBookingStepsComplete();
      window.location.href = 'takvim.html';
      return;
    }
  }, true);

})();
