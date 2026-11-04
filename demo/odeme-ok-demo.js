(function () {
  function initials(name) {
    return String(name || '').trim().split(/\s+/).slice(0, 2).map(function (part) {
      return part.charAt(0).toLocaleUpperCase('tr-TR');
    }).join('');
  }

  function readSelection() {
    try {
      var value = localStorage.getItem('demoSecim');
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Makbuz için sipariş seçimi okunamadı.', error);
      return null;
    }
  }

  function addConfetti() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var layer = document.querySelector('.payment-success-confetti');
    if (!layer) return;

    var colors = ['#51409d', '#35a66b', '#e7aa55', '#df7c73', '#9381df'];
    for (var index = 0; index < 28; index += 1) {
      var piece = document.createElement('span');
      piece.className = 'payment-success-confetti-piece';
      piece.style.setProperty('--confetti-x', (Math.random() * 100).toFixed(2) + '%');
      piece.style.setProperty('--confetti-delay', (Math.random() * 0.2).toFixed(2) + 's');
      piece.style.setProperty('--confetti-duration', '1.25s');
      piece.style.setProperty('--confetti-color', colors[index % colors.length]);
      piece.style.setProperty('--confetti-rotation', Math.round(Math.random() * 540 - 270) + 'deg');
      layer.appendChild(piece);
    }
  }

  function initializeReceipt() {
    var session = typeof window.getSession === 'function' ? window.getSession() : null;
    var selection = readSelection() || {};
    var advisors = typeof window.listAdvisors === 'function'
      ? window.listAdvisors({ yayindaOlanlar: true })
      : [];
    var advisor = advisors.find(function (item) { return item.ad === selection.guru; }) ||
      advisors.find(function (item) { return item.id === 'selin-arslan'; });
    var advisorName = advisor?.ad || selection.guru || 'Selin Arslan';
    var advisorInitials = initials(advisorName);
    var sessionCount = Number(selection.sessions) || 2;
    var firstName = String(session?.name || session?.ad || 'Elif').trim().split(/\s+/)[0] || 'Elif';
    var service = typeof selection.service === 'string' && selection.service.trim()
      ? selection.service.trim()
      : 'Satış hikâyesi oluşturma';
    var price = Number(selection.price);
    if (!Number.isFinite(price) || price <= 0) price = Number(advisor?.ucret) || 1500;
    var duration = Number(selection.minutes) || Number(advisor?.sure) || 50;
    var formattedPrice = new Intl.NumberFormat('tr-TR').format(price);
    var formattedDate = new Intl.DateTimeFormat('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date());

    document.querySelector('#payment-success-thanks').textContent = 'Teşekkürler, ' + firstName;
    document.querySelectorAll('[data-receipt-advisor-name]').forEach(function (element) {
      element.textContent = advisorName;
    });
    document.querySelector('[data-receipt-advisor-link]').href =
      'danisman.html?id=' + encodeURIComponent(advisor?.id || 'selin-arslan');
    document.querySelector('[data-advisor-avatar]').textContent = advisorInitials;
    document.querySelector('[data-receipt-advisor-title]').textContent =
      advisor?.unvan || 'Kariyer danışmanı';
    document.querySelector('[data-receipt-duration]').textContent = duration + ' dk';
    document.querySelector('[data-receipt-sessions]').textContent = sessionCount + ' seans';
    document.querySelector('[data-receipt-order-number]').textContent = '#IV-2027-0001';
    document.querySelector('[data-receipt-date]').textContent = formattedDate;
    document.querySelector('[data-receipt-service]').textContent = service;
    document.querySelector('[data-receipt-advisor]').textContent = advisorName;
    document.querySelector('[data-receipt-total]').replaceChildren(
      document.createTextNode(formattedPrice + ' ₺ '),
      Object.assign(document.createElement('span'), { textContent: 'KDV dahil' })
    );

    document.querySelector('[data-print-receipt]')?.addEventListener('click', function () {
      window.print();
    });

    addConfetti();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeReceipt, { once: true });
  } else {
    initializeReceipt();
  }
})();
