// giris-danisman.js — Danışman girişi sayfa betiği. Sahibi: 84 Guru Panel UI.
// Giriş (POST /auth/login, client_type=guru) ve "Yöneticiyle iletişime geç" ortak auth-demo.js'te (81).
// Burada yalnız "Şifremi unuttum": POST /auth/password-reset/request {email} → her zaman 202
// (kullanıcı numaralandırması yok). Bağlantı e-postayla gelir (APP_PUBLIC_URL/reset-password → davet.html?mode=reset).
(function () {
  'use strict';
  if (!window.Api) return;
  const Api = window.Api;
  const link = document.querySelector('.login-password-link');
  const emailInput = document.getElementById('email');
  const emailError = document.getElementById('email-error');
  const form = document.querySelector('form');
  if (!link || !emailInput || !form) return;
  link.dataset.action = 'password-reset-request';
  link.setAttribute('role', 'button');

  let busy = false;
  link.addEventListener('click', async event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (busy) return;
    const email = emailInput.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      if (emailError) {
        emailError.textContent = 'Şifre sıfırlama bağlantısı için e-posta adresini yaz.';
        emailError.classList.remove('hidden');
      }
      emailInput.setAttribute('aria-invalid', 'true');
      emailInput.focus();
      return;
    }
    busy = true;
    link.setAttribute('aria-busy', 'true');
    try {
      await Api.auth.requestPasswordReset(email);
      Api.ui.showError(form, 'Bu e-posta adresine kayıtlı bir hesap varsa şifre sıfırlama bağlantısı gönderildi.', { tone: 'info', position: 'append' });
    } catch (error) {
      Api.ui.showError(form, error, { position: 'append' });
    } finally {
      busy = false;
      link.removeAttribute('aria-busy');
    }
  }, true);
})();
