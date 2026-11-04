// kayit-demo.js: kayıt formu doğrulaması (demo)
(function () {
  const NEXT = 'eposta.html';
  const returnTarget = window.safeReturnPath?.(new URLSearchParams(location.search).get('return')) || 'danismanlar.html';
  const fields = [...document.querySelectorAll('input')]
    .filter(i => !['checkbox', 'radio', 'hidden', 'submit', 'button'].includes(i.type));

  if (returnTarget) {
    document.querySelectorAll('a').forEach(anchor => {
      if (anchor.textContent.replace(/\s+/g, ' ').trim() === 'Giriş yap') {
        anchor.href = 'giris.html?return=' + encodeURIComponent(returnTarget);
      }
    });
  }

  const textOf = (inp) => {
    const l = (inp.id && document.querySelector(`label[for="${inp.id}"]`)) ||
              inp.closest('div')?.querySelector('label');
    return ((l && l.textContent) || inp.placeholder || inp.name || '').toLowerCase().trim();
  };
  const kindOf = (inp) => {
    const t = textOf(inp);
    if (inp.type === 'email' || /e-?posta|email/.test(t)) return 'email';
    if (inp.type === 'password' || t.includes('şifre')) return 'password';
    if (t.startsWith('ad soyad')) return 'name';
    if (t.includes('soyad')) return 'surname';
    if (t.startsWith('ad')) return 'name';
    return null;
  };

  const RULES = {
    name:     { label: 'Ad',     test: v => v.trim().length >= 2, msg: 'Adını yaz (en az 2 harf).' },
    surname:  { label: 'Soyad',  test: v => v.trim().length >= 2, msg: 'Soyadını yaz (en az 2 harf).' },
    email:    { label: 'E-posta', test: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()), msg: 'Geçerli bir e-posta adresi gir (örn. ad@ornek.com).' },
    password: { label: 'Şifre',  test: v => v.length >= 8, msg: 'Şifren en az 8 karakter olmalı.' }
  };

  const items = fields.map(inp => ({ inp, kind: kindOf(inp) })).filter(x => x.kind);

  // Zorunlu işareti (*)
  items.forEach(({ inp }) => {
    const l = (inp.id && document.querySelector(`label[for="${inp.id}"]`)) ||
              inp.closest('div')?.querySelector('label');
    if (l && !l.textContent.includes('*')) l.insertAdjacentHTML('beforeend', ' <span style="color:#B3261E">*</span>');
  });

  const showError = (inp, msg) => {
    clearError(inp);
    inp.style.borderColor = '#B3261E';
    const m = document.createElement('div');
    m.className = 'demo-err';
    m.textContent = msg;
    m.style.cssText = 'color:#B3261E;font-size:13px;margin-top:6px';
    (inp.closest('div') || inp.parentElement).appendChild(m);
  };
  const clearError = (inp) => {
    inp.style.borderColor = '';
    const w = inp.closest('div') || inp.parentElement;
    w.querySelectorAll('.demo-err').forEach(e => e.remove());
  };

  items.forEach(({ inp, kind }) => {
    inp.addEventListener('blur', () => { RULES[kind].test(inp.value) ? clearError(inp) : showError(inp, RULES[kind].msg); });
    inp.addEventListener('input', () => { if (RULES[kind].test(inp.value)) clearError(inp); });
  });

  const validateAll = () => {
    let ok = true, first = null;
    items.forEach(({ inp, kind }) => {
      if (!RULES[kind].test(inp.value)) { showError(inp, inp.value ? RULES[kind].msg : 'Bu alan zorunlu.'); ok = false; first = first || inp; }
    });
    if (first) first.focus();
    return ok;
  };

  const submit = () => {
    if (!validateAll()) return;
    const em = items.find(x => x.kind === 'email');
    const nameInput = items.find(x => x.kind === 'name');
    const name = nameInput?.inp.value.trim() || 'Elif Yılmaz';
    try {
      ['demoOdemeAlindi', 'demoProfilTamamlandi', 'demoKvkkOnaylandi', 'demoCvOnaylandi'].forEach(key => {
        localStorage.removeItem(key);
      });
      localStorage.setItem('demoEmail', em.inp.value.trim());
      localStorage.setItem('demoDevam', returnTarget || 'hizmet.html');
    } catch (error) {
      console.error('Yeni kayıt durumu hazırlanamadı.', error);
      window.alert('Kayıt tamamlanamadı. Tarayıcı depolama alanını kontrol et.');
      return;
    }
    if (!window.setSession?.({ role: 'danisan', name, state: 'new', email: em.inp.value.trim() })) {
      window.alert('Kayıt tamamlanamadı. Tarayıcı depolama alanını kontrol et.');
      return;
    }
    location.href = NEXT;
  };

  // Yakalama aşamasında dinle: geçersizse nav.js'e hiç ulaşmasın
  document.addEventListener('click', (e) => {
    const el = e.target.closest('button, a, [role="button"]');
    if (el && /Hesap Oluştur|Devam et/i.test(el.textContent)) { e.preventDefault(); e.stopPropagation(); submit(); }
  }, true);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && items.some(x => x.inp === document.activeElement)) { e.preventDefault(); submit(); }
  });
})();
