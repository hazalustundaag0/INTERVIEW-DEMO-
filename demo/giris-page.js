// giris-page.js — Aday giriş ekranlarının sayfa mantığı. Sahibi: 82 Aday Onboarding UI Agent.
// /giris: giriş formunun kendisi 81'in ortak auth-demo.js'idir; bu betik yalnız
//   "Şifremi unuttum" → POST /auth/password-reset/request (daima 202; bağlantı → /parola?mode=reset)
//   ve "Kayıt ol" bağlantısının ?return= taşımasını ekler.
// K113 (Etap 8): ayrı rol hata sayfası (giris-hata-rol) kaldırıldı; yanlış rolde giriş genel hata mesajı alır.
(function () {
  'use strict';
  const Api = window.Api;
  const page = Api ? Api.pageName() : '';
  if (!Api || page !== '/giris') return;

  const params = new URLSearchParams(location.search);
  const returnTarget = Api.safeReturnPath(params.get('return'));
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function init() {
    const form = document.querySelector('main form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    if (!form || !emailInput || !passwordInput) {
      console.error('Giriş formu bulunamadı.');
      return;
    }

    // Kayıt bağlantıları (site başlığı dahil) dönüş hedefini taşır.
    const registerHref = '/kayit' + (returnTarget ? '?return=' + encodeURIComponent(returnTarget) : '');
    document.querySelectorAll('a').forEach(anchor => {
      const text = anchor.textContent.replace(/\s+/g, ' ').trim();
      if (text !== 'Kayıt ol' && text !== 'Hesap oluştur') return;
      anchor.href = registerHref;
      anchor.setAttribute('data-nav-skip', '');
    });

    // Bilgi/hata kutusu: formun en üstünde (.api-alert, giriş ekranının mevcut uyarı stili).
    function notify(message, tone) {
      Api.ui.showError(form, message, { tone, position: 'prepend' });
    }
    function clearNotice() {
      const alert = form.querySelector(':scope > .api-alert');
      if (alert) Api.ui.clearError(alert);
    }
    form.addEventListener('input', clearNotice);

    // ── Şifremi unuttum ──────────────────────────────────────────────────────
    const forgotLink = Array.from(form.querySelectorAll('a'))
      .find(anchor => anchor.textContent.replace(/\s+/g, ' ').trim() === 'Şifremi unuttum');
    if (forgotLink) {
      forgotLink.setAttribute('data-action', 'password-reset-request');
      // Etap 4: role=button verilmez — Ultraviolet theme.css [role=button]'u dolu düğme gibi çizer (48 px kutu);
      // tasarımda bu bir metin bağlantısı. Davranış aynı (click + data-action).
      let sending = false;
      forgotLink.addEventListener('click', async event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (sending) return;
        clearNotice();
        const email = emailInput.value.trim();
        if (!EMAIL_RE.test(email)) {
          Api.ui.applyFieldErrors(form, { email: 'Şifre sıfırlama bağlantısı için e-posta adresini yaz.' }, {
            messages: { email: 'Şifre sıfırlama bağlantısı için e-posta adresini yaz.' }
          });
          return;
        }
        sending = true;
        forgotLink.setAttribute('aria-busy', 'true');
        try {
          await Api.auth.requestPasswordReset(email);
          notify('Bu e-posta adresiyle kayıtlı bir hesap varsa şifre sıfırlama bağlantısı gönderdik. Gelen kutunu kontrol et.', 'info');
        } catch (error) {
          if (error instanceof Api.ApiError && error.isValidation) {
            Api.ui.applyFieldErrors(form, error, { map: { email: '#email' } });
          } else {
            notify(Api.ui.message(error, 'Bağlantı gönderilemedi. Lütfen tekrar dene.'));
          }
        } finally {
          sending = false;
          forgotLink.removeAttribute('aria-busy');
        }
      }, true);
    }

  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
