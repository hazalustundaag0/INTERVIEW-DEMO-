// eposta-demo.js v3
(function () {
  // DİKKAT: Bu iki ad klasördeki dosya adlarıyla birebir aynı olmalı
  var NEXT = 'danismanlar.html';
  var BACK = 'kayit.html';

  function toast(msg) {
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#51409D;color:#fff;padding:12px 20px;border-radius:10px;font-size:14px;z-index:99999';
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }
  // E-posta adı: kayıtta girilen, yoksa Elif
  var email = 'elif.yilmaz@ornek.com';
  try { email = localStorage.getItem('demoEmail') || email; } catch (e) {}
  var currentSession = window.getSession ? window.getSession() : { role: null, name: '' };
  var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) {
    var n = w.currentNode;
    if (n.nodeValue.indexOf('ayse.yilmaz@ornek.com') > -1)
      n.nodeValue = n.nodeValue.replace('ayse.yilmaz@ornek.com', email);
  }

  // Hata kutusunu gizle
  var leaf = Array.from(document.querySelectorAll('*')).find(function (el) {
    return el.children.length === 0 && el.textContent.indexOf('Kod geçersiz') > -1;
  });
  if (leaf) {
    var b = leaf;
    while (b.parentElement && b.parentElement.textContent.length < 160) b = b.parentElement;
    b.style.display = 'none';
  }

  var row = document.getElementById('otp-container');
  if (!row) {
    console.error('E-posta doğrulama kodu alanı bulunamadı.');
    return;
  }

  row.setAttribute('role', 'group');
  row.setAttribute('aria-label', '6 haneli doğrulama kodu');
  row.replaceChildren();

  var boxes = [];
  for (var j = 0; j < 6; j++) {
    var inp = document.createElement('input');
    inp.type = 'text';
    inp.inputMode = 'numeric';
    inp.maxLength = 1;
    inp.autocomplete = 'one-time-code';
    inp.setAttribute('aria-label', 'Kod hanesi ' + (j + 1));
    inp.dataset.index = String(j);
    inp.className = 'otp-digit';
    inp.value = '';
    row.appendChild(inp);
    boxes.push(inp);
  }

  function code() { return boxes.map(function (x) { return x.value; }).join(''); }
  var isVerifying = false;
  var loader = document.getElementById('loading-indicator');
  function proceed() {
    if (isVerifying) return;
    isVerifying = true;
    if (loader) {
      loader.classList.remove('hidden');
      loader.classList.add('flex');
    }
    var destination = NEXT;
    var verifiedEmail = email;
    try {
      if (!window.setSession?.({
        role: 'danisan',
        name: currentSession.role === 'danisan' && currentSession.name ? currentSession.name : 'Elif Yılmaz',
        state: currentSession.role === 'danisan' && currentSession.state ? currentSession.state : 'new',
        email: verifiedEmail
      })) {
        isVerifying = false;
        throw new Error('Danışan oturumu oluşturulamadı.');
      }
      var savedDestination = window.safeReturnPath?.(localStorage.getItem('demoDevam'));
      if (savedDestination && !savedDestination.split(/[?#]/)[0].startsWith('guru-')) {
        destination = savedDestination;
      }
      localStorage.removeItem('demoDevam');
    } catch (error) {
      isVerifying = false;
      if (loader) {
        loader.classList.add('hidden');
        loader.classList.remove('flex');
      }
      console.error('E-posta doğrulamasından sonra oturum kaydedilemedi.', error);
      toast('Oturum açılamadı. Tarayıcı depolama alanını kontrol et.');
      return;
    }
    toast('Doğrulandı. Açılıyor: ' + destination);
    setTimeout(function () {
      if (loader) {
        loader.classList.add('hidden');
        loader.classList.remove('flex');
      }
      window.location.href = destination;
    }, 900);
  }

  boxes.forEach(function (bx, idx) {
    bx.addEventListener('input', function () {
      var digits = bx.value.replace(/\D/g, '');
      if (digits.length > 1) {
        fillCode(digits);
        return;
      }
      bx.value = digits.slice(0, 1);
      if (bx.value && idx < 5) boxes[idx + 1].focus();
      if (code().length === 6) proceed();
    });
    bx.addEventListener('keydown', function (e) {
      if (e.key !== 'Backspace') return;
      if (bx.value) {
        bx.value = '';
        e.preventDefault();
        return;
      }
      if (idx > 0) {
        boxes[idx - 1].value = '';
        boxes[idx - 1].focus();
        e.preventDefault();
      }
    });
    bx.addEventListener('paste', function (e) {
      var d = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
      if (!d) return;
      e.preventDefault();
      fillCode(d);
    });
  });

  function fillCode(value) {
    var digits = value.replace(/\D/g, '').slice(0, 6);
    boxes.forEach(function (box, index) {
      box.value = digits.charAt(index) || '';
    });
    if (digits.length === 6) {
      boxes[5].focus();
      proceed();
    } else {
      boxes[Math.min(digits.length, 5)].focus();
    }
  }

  boxes[0].focus();

  // Butonlar: tıklanan öğenin üstündeki 4 kademeye bakar
  function hit(e, label) {
    var el = e.target;
    for (var s = 0; s < 4 && el; s++, el = el.parentElement) {
      var t = el.textContent.replace(/\s+/g, ' ').trim();
      if (t.indexOf(label) > -1 && t.length < label.length + 25) return true;
    }
    return false;
  }
  document.addEventListener('click', function (e) {
    if (hit(e, 'E-postayı değiştir')) { e.preventDefault(); window.location.href = BACK; }
    else if (hit(e, 'Kodu tekrar gönder')) { e.preventDefault(); toast('Yeni kod gönderildi (demo: herhangi 6 haneli kod gir)'); }
    else if (hit(e, 'Doğrula') || hit(e, 'Devam')) {
      e.preventDefault();
      if (code().length === 6) proceed(); else toast('6 haneli kodu eksiksiz gir');
    }
  });
})();
