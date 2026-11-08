// auth-demo.js — Ortak giriş formu (giris.html → aday, giris-danisman.html → guru).
// Sahibi: 81 Frontend Platform (82 ve 84 aynı betiği kullanır).
// POST /auth/login { email, password, client_type } — client_type sayfaya göre sabittir.
// Token yalnız api-client.js'te (sessionStorage, rol başına anahtar) saklanır.
(function () {
  'use strict';
  const page = location.pathname.split('/').pop();
  if (!['giris.html', 'giris-danisman.html'].includes(page)) return;
  if (!window.Api) {
    console.error('auth-demo.js: api-client.js yüklenmemiş.');
    return;
  }
  const Api = window.Api;

  const guruLogin = page === 'giris-danisman.html';
  const clientType = guruLogin ? Api.ROLES.GURU : Api.ROLES.CANDIDATE;
  const returnTarget = Api.safeReturnPath(new URLSearchParams(location.search).get('return'));
  const form = document.querySelector('form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const emailError = document.getElementById('email-error');
  const passwordError = document.getElementById('password-error');
  const toggleButton = document.getElementById('toggle-password');
  const eyeIcon = document.getElementById('eye-icon');
  const roleTablist = document.querySelector('.login-role-tabs[role="tablist"]');
  const managerContact = document.getElementById('manager-contact');
  const managerContactMessage = document.getElementById('manager-contact-message');
  if (!form || !emailInput || !passwordInput || !emailError || !passwordError) {
    console.error('Giriş formu alanları bulunamadı.');
    return;
  }

  // Kayıt bağlantıları dönüş hedefini taşır (ör. hizmet.html?guru=<uuid>).
  if (!guruLogin && returnTarget) {
    document.querySelectorAll('a').forEach(anchor => {
      if (!['Hesap oluştur', 'Kayıt ol'].includes(anchor.textContent.replace(/\s+/g, ' ').trim())) return;
      anchor.href = 'kayit.html?return=' + encodeURIComponent(returnTarget);
    });
  }

  managerContact?.addEventListener('click', () => {
    if (!managerContactMessage) return;
    // Yönetici iletişimi için backend ucu yok; metin 84'ün kararına bırakıldı (GAP-D16).
    managerContactMessage.textContent = 'Danışman hesapları yönetici tarafından davetle açılır. Davet e-postanı kontrol et.';
    managerContactMessage.hidden = false;
  });

  // Mevcut giriş uyarı kutusu (theme.css .api-alert = eski kırmızı uyarı stili).
  const alert = document.createElement('p');
  alert.className = 'api-alert';
  alert.hidden = true;
  alert.setAttribute('role', 'alert');
  alert.setAttribute('aria-live', 'polite');
  const submitButton = form.querySelector('button[type="submit"]') || Array.from(form.querySelectorAll('button')).find(button =>
    button.textContent.replace(/\s+/g, ' ').trim() === 'Giriş yap'
  );
  if (submitButton) submitButton.setAttribute('data-action', 'login');
  form.noValidate = true;
  submitButton?.parentElement?.insertAdjacentElement('beforebegin', alert);

  function clearFieldError(input, error) {
    error.textContent = '';
    error.classList.add('hidden');
    input.removeAttribute('aria-invalid');
  }

  function showFieldError(input, error, message) {
    error.textContent = message;
    error.classList.remove('hidden');
    input.setAttribute('aria-invalid', 'true');
  }

  function clearErrors() {
    clearFieldError(emailInput, emailError);
    clearFieldError(passwordInput, passwordError);
    Api.ui.clearError(alert);
  }

  toggleButton?.addEventListener('click', () => {
    const showPassword = passwordInput.type === 'password';
    passwordInput.type = showPassword ? 'text' : 'password';
    toggleButton.setAttribute('aria-label', showPassword ? 'Şifreyi gizle' : 'Şifreyi göster');
    toggleButton.setAttribute('aria-pressed', String(showPassword));
    if (eyeIcon) eyeIcon.textContent = showPassword ? 'visibility' : 'visibility_off';
  });

  async function destinationAfterLogin() {
    if (returnTarget) return returnTarget;
    if (guruLogin) return Api.HOME_PAGES.guru;
    // Kaydı (satın alma) olan aday ana ekrana, olmayan danışman seçimine.
    try {
      const result = await Api.page('/candidate/enrollments', { limit: 1, role: clientType });
      return result.items.length ? Api.HOME_PAGES.candidate : 'danismanlar.html';
    } catch (error) {
      return Api.HOME_PAGES.candidate;
    }
  }

  let busy = false;
  async function submit() {
    if (busy) return;
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    clearErrors();

    if (!email) {
      showFieldError(emailInput, emailError, 'E-posta ve şifre alanlarını doldur.');
      emailInput.focus();
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      showFieldError(emailInput, emailError, 'Geçerli bir e-posta adresi gir.');
      emailInput.focus();
      return;
    }
    if (!password) {
      showFieldError(passwordInput, passwordError, 'E-posta ve şifre alanlarını doldur.');
      passwordInput.focus();
      return;
    }

    busy = true;
    Api.ui.setLoading(submitButton, true, { text: 'Giriş yapılıyor...' });
    try {
      await Api.auth.login({ email, password, clientType });
      passwordInput.value = '';
      location.href = await destinationAfterLogin();
    } catch (error) {
      Api.ui.setLoading(submitButton, false);
      busy = false;
      if (!(error instanceof Api.ApiError)) {
        console.error('Giriş başarısız:', error);
        Api.ui.showError(alert, 'Giriş yapılamadı. Lütfen tekrar dene.');
        return;
      }
      if (error.is('client_not_allowed')) {
        if (!guruLogin) {
          // Aday girişinden guru hesabı denendi → mevcut "yanlış rol" ekranı.
          location.href = 'giris-hata-rol.html';
          return;
        }
        Api.ui.showError(alert, 'Bu hesap danışman paneline giriş yapamaz. Danışan girişini kullan.');
        return;
      }
      if (error.isValidation) {
        const unmatched = Api.ui.applyFieldErrors(form, error, { map: { email: '#email', password: '#password' } });
        if (unmatched.length || !Object.keys(error.fields).length) Api.ui.showError(alert, error);
        return;
      }
      Api.ui.showError(alert, error);
      if (error.is('invalid_credentials')) passwordInput.focus();
    }
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    submit();
  });
  // Stitch kalıntısı click yakalayıcılarından önce davran.
  submitButton?.addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    submit();
  });

  form.addEventListener('input', () => Api.ui.clearError(alert));
  emailInput.addEventListener('input', () => clearFieldError(emailInput, emailError));
  passwordInput.addEventListener('input', () => clearFieldError(passwordInput, passwordError));

  roleTablist?.addEventListener('keydown', event => {
    const tabs = Array.from(roleTablist.querySelectorAll('[role="tab"]'));
    const currentIndex = tabs.indexOf(event.target);
    if (currentIndex < 0) return;
    let nextIndex;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = tabs.length - 1;
    else return;
    event.preventDefault();
    window.location.href = tabs[nextIndex].href;
  });
})();
