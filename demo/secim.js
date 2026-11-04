// secim.js: hizmet sayfasındaki seçimi diğer sayfalara taşır
(function () {
  document.querySelectorAll('span').forEach(function (el) {
    if (el.textContent.trim() !== 'Kıdemli Satış Direktörü & Mentor') return;
    el.style.removeProperty('font-family');
    el.style.removeProperty('font-size');
  });

  var s; try { s = JSON.parse(localStorage.getItem('demoSecim')); } catch (e) {}
  if (!s) return;
  var fmt = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
  var guruName = s.guru;
  if (location.pathname.endsWith('/siparis.html') &&
      (typeof guruName !== 'string' || !guruName.trim())) guruName = 'Selin Arslan';
  var chosenTarih = localStorage.getItem('demoTarih') || '11 Ocak Pazartesi';
  var chosenSaat = localStorage.getItem('demoSaat') || '14:00 - 14:50';

  var pairs = [
    ['Satış hikâyesi oluşturma', s.service],
    ['1.500', fmt(s.price || 1500)],
    ['Selin Arslan', guruName],
    ['2 seans', s.sessions + ' seans'],
    ['11 Aralık Pazartesi', chosenTarih],
    ['11 Ocak Pazartesi', chosenTarih],
    ['14:00 - 14:50', chosenSaat]
  ];
  var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), n;
  while ((n = w.nextNode())) {
    pairs.forEach(function (p) { if (n.nodeValue.indexOf(p[0]) > -1) n.nodeValue = n.nodeValue.split(p[0]).join(p[1]); });
  }

  if (location.pathname.endsWith('/siparis.html')) {
    var serviceTitle = Array.prototype.find.call(document.querySelectorAll('span'), function (el) {
      return el.textContent.trim() === s.service && el.classList.contains('font-bold');
    });
    if (serviceTitle && !serviceTitle.parentElement.querySelector('[data-order-advisor]')) {
      var advisor = document.createElement('span');
      advisor.dataset.orderAdvisor = 'true';
      advisor.className = 'text-[13px] text-muted-text mt-1 leading-relaxed';
      advisor.textContent = 'Danışman: ' + guruName;
      serviceTitle.insertAdjacentElement('afterend', advisor);
    }

    var totalLabel = Array.prototype.find.call(document.querySelectorAll('span'), function (el) {
      return el.textContent.trim() === 'Toplam';
    });
    if (totalLabel) {
      totalLabel.textContent = 'Danışman ücreti (KDV dahil)';
      var taxLabel = Array.prototype.find.call(totalLabel.parentElement.children, function (el) {
        return el.textContent.trim() === 'KDV dahil';
      });
      if (taxLabel) taxLabel.remove();
    }
  }
})();
