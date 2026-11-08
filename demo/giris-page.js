// giris-page.js — Aday giriş ekranlarının sayfa mantığı. Sahibi: 82 Aday Onboarding UI Agent.
// giris.html: giriş formunun kendisi 81'in ortak auth-demo.js'idir; bu betik yalnız
//   "Şifremi unuttum" → POST /auth/password-reset/request (daima 202; bağlantı → davet.html?mode=reset)
//   ve "Kayıt ol" bağlantısının ?return= taşımasını ekler.
// giris-hata-rol.html: "Bu e-posta bir danışman hesabına ait" uyarılı aday giriş formu (statik tasarım);
//   formu POST /auth/login (client_type=candidate) ile çalıştırır.
(function () {
  'use strict';
  const Api = window.Api;
  const page = Api ? Api.pageName() : '';
  if (!Api || !['giris.html', 'giris-hata-rol.html'].includes(page)) return;

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
    const registerHref = 'kayit.html' + (returnTarget ? '?return=' + encodeURIComponent(returnTarget) : '');
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
      forgotLink.setAttribute('role', 'button');
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

    if (page !== 'giris-hata-rol.html') return;

    // ── giris-hata-rol: aday girişi ──────────────────────────────────────────
    const submitButton = form.querySelector('button[type="submit"]');
    if (!submitButton) return;
    submitButton.setAttribute('data-action', 'login');
    form.noValidate = true;

    async function destinationAfterLogin() {
      if (returnTarget) return returnTarget;
      try {
        const result = await Api.page('/candidate/enrollments', { limit: 1, role: Api.ROLES.CANDIDATE });
        return result.items.length ? Api.HOME_PAGES.candidate : 'danismanlar.html';
      } catch (error) {
        return Api.HOME_PAGES.candidate;
      }
    }

    let busy = false;
    async function submit() {
      if (busy) return;
      clearNotice();
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      const errors = {};
      if (!EMAIL_RE.test(email)) errors.email = 'Geçerli bir e-posta adresi gir.';
      if (!password) errors.password = 'E-posta ve şifre alanlarını doldur.';
      if (Object.keys(errors).length) {
        Api.ui.applyFieldErrors(form, errors);
        return;
      }
      Api.ui.clearFieldErrors(form);
      busy = true;
      Api.ui.setLoading(submitButton, true, { text: 'Giriş yapılıyor...' });
      try {
        await Api.auth.login({ email, password, clientType: Api.ROLES.CANDIDATE });
        passwordInput.value = '';
        location.href = await destinationAfterLogin();
      } catch (error) {
        busy = false;
        Api.ui.setLoading(submitButton, false);
        if (error instanceof Api.ApiError && error.is('client_not_allowed')) {
          // Tasarımdaki kırmızı uyarı zaten görünür; yalnız odak.
          emailInput.focus();
          return;
        }
        if (error instanceof Api.ApiError && error.isValidation) {
          const unmatched = Api.ui.applyFieldErrors(form, error, { map: { email: '#email', password: '#password' } });
          if (!Object.keys(error.fields).length || unmatched.length) notify(Api.ui.message(error));
          return;
        }
        notify(Api.ui.message(error, 'Giriş yapılamadı. Lütfen tekrar dene.'));
      }
    }

    form.addEventListener('submit', event => {
      event.preventDefault();
      submit();
    });
    submitButton.addEventListener('click', event => {
      event.preventDefault();
      submit();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
