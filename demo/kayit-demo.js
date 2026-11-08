// kayit-demo.js — Aday kaydı (kayit.html). Sahibi: 82 Aday Onboarding UI Agent.
// POST /auth/register { first_name, last_name, email, language } → daima 202 (kullanıcı numaralandırması yok).
// K50: tek "Ad soyad" alanı SON boşluktan ad / soyad'a bölünür; şifre alanı kaldırıldı — parola
// e-postadaki bağlantıyla (davet.html?mode=verify) belirlenir (K12).
// Kaldırılan demo davranışı: demoEmail/demoDevam localStorage yazımı, setSession ile sahte oturum,
// window.alert hata mesajları (GAP-U03, D16).
// Geçici UI durumu (yalnız bu sekme, sessionStorage): onboarding.pendingEmail (eposta.html'de adresi
// göstermek ve "tekrar gönder" için), onboarding.return (doğrulamadan sonra dönülecek sayfa).
(function () {
  'use strict';
  const Api = window.Api;
  const form = document.getElementById('registerForm');
  const nameInput = document.getElementById('fullName');
  const emailInput = document.getElementById('email');
  const submitButton = form && form.querySelector('button[type="submit"]');
  if (!Api || !form || !nameInput || !emailInput || !submitButton) {
    console.error('Kayıt formu başlatılamadı.');
    return;
  }

  const params = new URLSearchParams(location.search);
  const returnTarget = Api.safeReturnPath(params.get('return'));

  function remember(key, value) {
    try {
      if (value) window.sessionStorage.setItem(key, value);
      else window.sessionStorage.removeItem(key);
    } catch (error) { /* depolama kapalıysa eposta sayfası adressiz çalışır */ }
  }

  // "Giriş yap" bağlantısı dönüş hedefini taşır (nav.js metin yönlendirmesi data-nav-skip ile atlanır).
  document.querySelectorAll('a').forEach(anchor => {
    if (anchor.textContent.replace(/\s+/g, ' ').trim() !== 'Giriş yap' || anchor.closest('#site-header')) return;
    anchor.href = returnTarget ? 'giris.html?return=' + encodeURIComponent(returnTarget) : 'giris.html';
    anchor.setAttribute('data-nav-skip', '');
  });

  // Zorunlu alan işareti (mevcut görsel dil).
  [nameInput, emailInput].forEach(input => {
    const label = document.querySelector(`label[for="${input.id}"]`);
    if (label && !label.textContent.includes('*')) label.insertAdjacentHTML('beforeend', ' <span style="color:#B3261E">*</span>');
  });

  // K50: son boşluktan böl → "Ayşe Nur Yılmaz" = { first: "Ayşe Nur", last: "Yılmaz" }.
  function splitFullName(value) {
    const clean = String(value || '').replace(/\s+/g, ' ').trim();
    const index = clean.lastIndexOf(' ');
    if (index <= 0) return { firstName: clean, lastName: '' };
    return { firstName: clean.slice(0, index), lastName: clean.slice(index + 1) };
  }

  function validate() {
    const errors = {};
    const parts = splitFullName(nameInput.value);
    if (!parts.firstName) errors.fullName = 'Bu alan zorunlu.';
    else if (!parts.lastName) errors.fullName = 'Adını ve soyadını aralarında boşluk bırakarak yaz.';
    else if (parts.firstName.length < 2 || parts.lastName.length < 2) errors.fullName = 'Ad ve soyad en az 2 harf olmalı.';
    const email = emailInput.value.trim();
    if (!email) errors.email = 'Bu alan zorunlu.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = 'Geçerli bir e-posta adresi gir (örn. ad@ornek.com).';
    return { errors, parts, email };
  }

  let busy = false;
  async function submit() {
    if (busy) return;
    Api.ui.clearError(form);
    const { errors, parts, email } = validate();
    if (Object.keys(errors).length) {
      Api.ui.applyFieldErrors(form, errors);
      return;
    }
    Api.ui.clearFieldErrors(form);
    busy = true;
    try {
      await Api.ui.withLoading(submitButton, () => Api.auth.register({
        firstName: parts.firstName,
        lastName: parts.lastName,
        email,
        language: 'tr'
      }), { text: 'Hesap oluşturuluyor...' });
      remember('onboarding.pendingEmail', email);
      remember('onboarding.return', returnTarget);
      location.href = 'eposta.html' + (returnTarget ? '?return=' + encodeURIComponent(returnTarget) : '');
    } catch (error) {
      busy = false;
      if (error instanceof Api.ApiError && error.isValidation) {
        const unmatched = Api.ui.applyFieldErrors(form, error, {
          map: { first_name: '#fullName', last_name: '#fullName', email: '#email' }
        });
        if (!Object.keys(error.fields).length || unmatched.length) Api.ui.showError(form, error);
        return;
      }
      Api.ui.showError(form, error, { fallback: 'Kayıt tamamlanamadı. Lütfen tekrar dene.' });
    }
  }

  form.noValidate = true;
  form.addEventListener('submit', event => {
    event.preventDefault();
    submit();
  });
  [nameInput, emailInput].forEach(input => input.addEventListener('input', () => {
    input.removeAttribute('aria-invalid');
    const holder = input.parentElement && input.parentElement.querySelector('[data-api-field-error]');
    if (holder) holder.remove();
  }));
})();
