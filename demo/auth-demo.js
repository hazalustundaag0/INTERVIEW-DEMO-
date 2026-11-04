(function () {
  const page = location.pathname.split('/').pop();
  if (!['giris.html', 'giris-danisman.html'].includes(page)) return;

  const guruLogin = page === 'giris-danisman.html';
  const returnTarget = window.safeReturnPath?.(new URLSearchParams(location.search).get('return')) || (guruLogin ? null : 'danismanlar.html');
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

  if (!guruLogin) {
    document.querySelectorAll('a').forEach(anchor => {
      if (!['Hesap oluştur', 'Kayıt ol'].includes(anchor.textContent.replace(/\s+/g, ' ').trim())) return;
      anchor.href = 'kayit.html?return=' + encodeURIComponent(returnTarget);
    });
  }

  managerContact?.addEventListener('click', () => {
    if (!managerContactMessage) {
      console.error('Yönetici iletişim bildirim alanı bulunamadı.');
      return;
    }
    managerContactMessage.textContent = 'Yöneticiyle iletişim demo ortamında kullanılamıyor.';
    managerContactMessage.hidden = false;
  });

  const alert = document.createElement('p');
  alert.className = 'hidden rounded-[8px] border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[13px] text-[#B42318]';
  alert.setAttribute('role', 'alert');
  alert.setAttribute('aria-live', 'polite');
  const submitButton = Array.from(form.querySelectorAll('button')).find(button =>
    button.textContent.replace(/\s+/g, ' ').trim() === 'Giriş yap'
  );
  form.noValidate = true;
  const submitContainer = submitButton?.parentElement;
  if (submitContainer) submitContainer.insertAdjacentElement('beforebegin', alert);

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

  function clearFieldErrors() {
    clearFieldError(emailInput, emailError);
    clearFieldError(passwordInput, passwordError);
  }

  toggleButton?.addEventListener('click', () => {
    const showPassword = passwordInput.type === 'password';
    passwordInput.type = showPassword ? 'text' : 'password';
    toggleButton.setAttribute('aria-label', showPassword ? 'Şifreyi gizle' : 'Şifreyi göster');
    toggleButton.setAttribute('aria-pressed', String(showPassword));
    if (eyeIcon) eyeIcon.textContent = showPassword ? 'visibility' : 'visibility_off';
  });

  let continuation = null;
  try {
    continuation = localStorage.getItem('demoDevam');
  } catch (error) {
    console.error('Giriş dönüş bilgisi okunamadı.', error);
  }
  if (!guruLogin && continuation === 'siparis.html') {
    try {
      const selection = JSON.parse(localStorage.getItem('demoSecim'));
      if (selection) {
        const banner = document.createElement('div');
        banner.className = 'mb-4 rounded-[8px] border border-[#DEDaf4] bg-[#EEECFF] px-4 py-3';
        const title = document.createElement('p');
        title.className = 'text-[14px] font-semibold text-[#51409D]';
        title.textContent = 'Devam etmek için giriş yap';
        const price = Number(selection.price);
        const amount = Number.isFinite(price)
          ? new Intl.NumberFormat('tr-TR').format(price)
          : String(selection.price || '—');
        const details = document.createElement('p');
        details.className = 'mt-1 text-[12px] text-[#7564C7]';
        details.textContent = 'Seçimin: ' + (selection.service || '—') + ' · ' +
          (selection.guru || '—') + ' · ' + amount + ' ₺';
        banner.append(title, details);
        form.insertAdjacentElement('beforebegin', banner);
      }
    } catch (error) {
      console.error('Hizmet seçimi giriş ekranında okunamadı.', error);
    }
  }

  function showError(message) {
    alert.textContent = message;
    alert.classList.remove('hidden');
  }

  function continueToPage() {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    clearFieldErrors();

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

    const previousSession = window.getSession?.() || { role: null, state: null };
    let hasProgress = false;
    try {
      hasProgress = ['demoOdemeAlindi', 'demoProfilTamamlandi', 'demoKvkkOnaylandi', 'demoCvOnaylandi']
        .some(key => localStorage.getItem(key) === 'true');
      localStorage.setItem('demoEmail', email);
    } catch (error) {
      console.error('Giriş durumu okunamadı veya e-posta kaydedilemedi.', error);
      showError('Giriş yapılamadı. Tarayıcı depolama alanını kontrol et.');
      return;
    }

    const role = guruLogin ? 'danisman' : 'danisan';
    const name = guruLogin ? 'Selin Arslan' : previousSession.role === 'danisan' && previousSession.name
      ? previousSession.name
      : 'Elif Yılmaz';
    const state = guruLogin ? 'active' : hasProgress || (previousSession.role === 'danisan' && previousSession.state === 'registered')
      ? 'registered'
      : previousSession.role === 'danisan' && previousSession.state
        ? previousSession.state
        : 'new';
    if (!window.setSession?.({ role, name, state, email })) {
      showError('Giriş yapılamadı. Tarayıcı depolama alanını kontrol et.');
      return;
    }

    let destination = guruLogin ? 'guru-danisanlar.html' : returnTarget;
    try {
      if (returnTarget) destination = returnTarget;
      localStorage.removeItem('demoDevam');
    } catch (error) {
      console.error('Giriş sonrası dönüş sayfası okunamadı.', error);
    }
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.setAttribute('aria-busy', 'true');
      submitButton.textContent = 'Giriş yapılıyor...';
    }
    window.setTimeout(() => {
      location.href = destination;
    }, 350);
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (button !== submitButton) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    continueToPage();
  }, true);

  form.addEventListener('submit', event => {
    event.preventDefault();
    continueToPage();
  });

  form.addEventListener('input', () => {
    alert.textContent = '';
    alert.classList.add('hidden');
  });
  emailInput.addEventListener('input', () => clearFieldError(emailInput, emailError));
  passwordInput.addEventListener('input', () => clearFieldError(passwordInput, passwordError));

  roleTablist?.addEventListener('keydown', event => {
    const tabs = Array.from(roleTablist.querySelectorAll('[role="tab"]'));
    const currentIndex = tabs.indexOf(event.target);
    if (currentIndex < 0) return;

    let nextIndex;
    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = tabs.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    window.location.href = tabs[nextIndex].href;
  });
})();
