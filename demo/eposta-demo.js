// eposta-demo.js — "E-postanı doğrula" ekranı (eposta.html). Sahibi: 82 Aday Onboarding UI Agent.
// Bağlantı modeli (GAP-U03, K50/K12): kayıttan sonra e-postaya doğrulama bağlantısı gider
// (yerelde backend/data/mail/*.txt) → davet.html?mode=verify#token=… → parola belirleme → giriş.
// Bu sayfa yalnız adresi gösterir ve "Bağlantıyı tekrar gönder" → POST /auth/resend-verification (daima 202).
// Kaldırılan demo davranışı: 6 haneli OTP (her kod kabul), setSession ile sahte oturum, demoEmail/
// demoDevam localStorage okuması, "demo: herhangi 6 haneli kod gir" bildirimi (GAP-D11).
(function () {
  'use strict';
  const Api = window.Api;
  if (!Api) {
    console.error('eposta-demo.js: api-client.js yüklenmemiş.');
    return;
  }

  function read(key) {
    try { return window.sessionStorage.getItem(key) || ''; } catch (error) { return ''; }
  }

  const email = read('onboarding.pendingEmail');
  const returnTarget = Api.safeReturnPath(new URLSearchParams(location.search).get('return')) ||
    Api.safeReturnPath(read('onboarding.return'));

  const emailNode = document.querySelector('[data-pending-email]');
  if (emailNode && email) emailNode.textContent = email;

  // Kayıt ekranına dönüş bağlantıları dönüş hedefini korur.
  const backHref = 'kayit.html' + (returnTarget ? '?return=' + encodeURIComponent(returnTarget) : '');
  document.querySelectorAll('a[href="kayit.html"]').forEach(link => { link.href = backHref; });
  document.querySelectorAll('header a').forEach(link => {
    if (link.textContent.replace(/\s+/g, ' ').trim() !== 'Giriş yap') return;
    link.href = 'giris.html' + (returnTarget ? '?return=' + encodeURIComponent(returnTarget) : '');
    link.setAttribute('data-nav-skip', '');
  });

  // OTP alanı kullanılmıyor (bağlantı modeli); eski bloğu DOM'dan da çıkar.
  document.querySelector('[data-otp-legacy]')?.remove();

  const banner = document.getElementById('error-banner');
  const bannerTitle = banner?.querySelector('.font-semibold');
  const bannerText = banner?.querySelector('.email-verification-copy');
  function showBanner(title, text) {
    if (!banner) return;
    Api.ui.clearError(banner);
    if (bannerTitle) bannerTitle.textContent = title;
    if (bannerText) bannerText.textContent = text;
    banner.hidden = false;
    banner.classList.remove('hidden');
    banner.classList.add('flex');
  }
  // Başarı bildirimi: mevcut bilgi kutusu stili (.api-alert--info), hata kutusunun hemen altında.
  function showInfo(text) {
    if (!banner) return;
    Api.ui.showError(banner, text, { tone: 'info', position: 'after' });
  }
  function hideBanner() {
    if (!banner) return;
    Api.ui.clearError(banner);
    banner.hidden = true;
    banner.classList.add('hidden');
    banner.classList.remove('flex');
  }

  // Yeniden gönderme bekleme sayacı (eski satır içi betikten taşındı; 30 sn).
  const countdownEl = document.getElementById('countdown');
  const timerBox = document.getElementById('resend-timer-box');
  const resendButton = document.getElementById('resend-button');
  let interval = null;
  function startCooldown(seconds) {
    if (!countdownEl || !timerBox || !resendButton) return;
    window.clearInterval(interval);
    let left = Math.max(1, Math.round(seconds || 30));
    countdownEl.textContent = String(left);
    timerBox.hidden = false;
    resendButton.hidden = true;
    resendButton.disabled = true;
    interval = window.setInterval(() => {
      left -= 1;
      countdownEl.textContent = String(left);
      if (left <= 0) {
        window.clearInterval(interval);
        timerBox.hidden = true;
        resendButton.hidden = false;
        resendButton.disabled = false;
      }
    }, 1000);
  }
  startCooldown(30);

  resendButton?.addEventListener('click', async () => {
    hideBanner();
    if (!email) {
      showBanner('E-posta adresi bulunamadı', 'Doğrulama bağlantısını yeniden almak için kayıt ekranında e-posta adresini tekrar gir.');
      return;
    }
    try {
      await Api.ui.withLoading(resendButton, () => Api.auth.resendVerification(email), { text: 'Gönderiliyor...' });
      showInfo('Bağlantı yeniden gönderildi. Gelen kutunu ve spam klasörünü kontrol et; en son gelen bağlantıyı kullan.');
      startCooldown(30);
    } catch (error) {
      const message = Api.ui.message(error, 'Bağlantı gönderilemedi. Lütfen tekrar dene.');
      showBanner('Bağlantı gönderilemedi', message);
      if (error instanceof Api.ApiError && error.status === 429 && error.retryAfter) startCooldown(error.retryAfter);
    }
  });
})();
