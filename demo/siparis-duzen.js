// siparis-duzen.js — Ödeme (/siparis) düzeni, rezervasyon onay sayfası akışında:
//   üstte başlık bandı; solda hizmet kartı (seanslar), tutar, rızalar, ödeme yöntemi ve "ödemeden sonra";
//   sağda sipariş detayları, "Ödemeyi tamamla", seçime dönüş ve yardım kartı.
// siparis-page.js'ten ÖNCE yüklenir. Öğe kimlikleri, onay kutuları ve data-order-* alanları korunur;
// siparis-page.js bunları aynen doldurur/denetler. Görünüm: siparis-akis.css.
(function () {
  'use strict';
  const submit = document.getElementById('submit-order-btn');
  const bar = submit && submit.parentElement && submit.parentElement.parentElement;
  const summaryHeading = Array.from(document.querySelectorAll('h2')).find(h => h.textContent.trim() === 'Sipariş özeti');
  const column = summaryHeading && summaryHeading.closest('.flex.flex-col.gap-6');
  const summaryCard = summaryHeading && summaryHeading.parentElement && summaryHeading.parentElement.parentElement;
  const titleBlock = document.querySelector('main h1') && document.querySelector('main h1').closest('.mb-8');
  if (!submit || !bar || !column || !summaryCard) return;
  document.body.classList.add('order-has-side');

  const make = (tag, className, html) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (html != null) node.innerHTML = html;
    return node;
  };
  const sparkle = (cls) => '<svg class="oc-spark ' + cls + '" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0c.6 6.6 5.4 11.4 12 12-6.6.6-11.4 5.4-12 12-.6-6.6-5.4-11.4-12-12C6.6 11.4 11.4 6.6 12 0z"/></svg>';

  // 1) Başlık bandı (mevcut başlık bloğu bandın içine alınır; geri bağlantısı korunur)
  const hero = make('section', 'oc-hero');
  hero.innerHTML = '<div class="oc-sparks oc-sparks--left" aria-hidden="true">' + sparkle('s1') + sparkle('s2') + sparkle('s3') + sparkle('s4') + '</div>' +
    '<div class="oc-sparks oc-sparks--right" aria-hidden="true">' + sparkle('s1') + sparkle('s2') + sparkle('s3') + sparkle('s4') + '</div>';
  const heroHead = make('div', 'oc-hero-head');
  heroHead.innerHTML = '<span class="oc-hero-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 10V7a5 5 0 0 1 10 0v3"/><rect x="4.5" y="10" width="15" height="11" rx="2.5"/><path d="M12 14.5v3"/></svg></span>';
  const heroText = make('div', 'oc-hero-text');
  if (titleBlock) {
    const h1 = titleBlock.querySelector('h1');
    const lead = titleBlock.querySelector('p');
    const back = titleBlock.querySelector('a');
    if (back) hero.appendChild(back.parentElement);
    if (h1) heroText.appendChild(h1);
    if (lead) heroText.appendChild(lead);
    titleBlock.remove();
  }
  heroHead.appendChild(heroText);
  hero.appendChild(heroHead);

  // 2) Hizmet kartı: eski üç sütunlu özetin yerine (onay kutusu aynı kartta kalır)
  const oldGrid = summaryCard.querySelector('.grid');
  if (oldGrid) oldGrid.classList.add('oc-legacy-grid');
  summaryHeading.parentElement.classList.add('oc-legacy-heading');
  const item = make('div', 'oc-item',
    '<div class="oc-thumb" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5A2.5 2.5 0 0 1 4 20.5z"/><path d="M8 7.5h8M8 11h6"/></svg></div>' +
    '<div class="oc-item-body">' +
      '<p class="oc-title" data-order-service>—</p>' +
      '<p class="oc-sub"><span class="oc-advisor-chip"><span class="oc-advisor-av" data-order-advisor-avatar></span><span data-order-advisor>—</span></span><span class="oc-sub-sep">·</span><span data-order-advisor-title></span></p>' +
      '<ul class="oc-feats"><li>Birebir online görüşme</li><li>Hikâye Aracı</li><li>Danışman notları</li><li>Türkçe / İngilizce çıktı</li></ul>' +
    '</div>');
  const sessions = make('div', 'oc-sessions',
    '<div class="oc-session"><span class="oc-k">1. seans</span><strong data-oc-template="1">Keşif seansı</strong><span data-order-duration>—</span></div>' +
    '<span class="oc-between">Arada Hikâye Aracı</span>' +
    '<div class="oc-session"><span class="oc-k">2. seans</span><strong data-oc-template="2">Prova seansı</strong><span data-order-duration>—</span></div>' +
    '<div class="oc-session-count"><strong data-order-sessions>—</strong><span>Birebir</span></div>');
  summaryCard.insertBefore(sessions, summaryCard.firstChild);
  summaryCard.insertBefore(item, summaryCard.firstChild);
  summaryCard.classList.add('oc-card', 'oc-summary');

  // 3) Tutar kartı
  const amount = make('section', 'oc-card oc-amount',
    '<div class="oc-amount-row oc-amount-row--total"><h2>Ödenecek tutar</h2><p><strong data-order-total>—</strong><span>KDV dahil</span></p></div>' +
    '<div class="oc-amount-row"><span>Ödeme yöntemi</span><span>Kart · güvenli ödeme sağlayıcısı</span></div>' +
    '<p class="oc-amount-note"><span aria-hidden="true">✓</span>Ödeme tamamlanınca danışmanının takviminden 1. seans saatini seçebilirsin.</p>');
  summaryCard.insertAdjacentElement('afterend', amount);

  // 4) Kartlara ortak sınıf: rızalar, ödeme yöntemi, ödemeden sonra
  Array.from(column.children).forEach(child => { if (child !== summaryCard && child !== amount) child.classList.add('oc-card'); });

  // 5) Sağ sütun
  const layout = make('div', 'order-layout');
  column.parentElement.insertBefore(layout, column);
  column.parentElement.insertBefore(hero, layout);
  const side = make('aside', 'order-side');
  side.setAttribute('aria-label', 'Sipariş detayları');
  side.appendChild(make('section', 'oc-card oc-details',
    '<h2>Sipariş detayları</h2>' +
    '<dl>' +
      '<div><dt>Hizmet</dt><dd data-order-service>—</dd></div>' +
      '<div><dt>Danışman</dt><dd data-order-advisor>—</dd></div>' +
      '<div><dt>Seans</dt><dd data-order-sessions>—</dd></div>' +
      '<div><dt>Süre</dt><dd data-order-duration>—</dd></div>' +
      '<div class="oc-details-total"><dt>Toplam</dt><dd data-order-total>—</dd></div>' +
    '</dl>'));
  side.appendChild(bar);
  const backSecondary = make('a', 'oc-secondary', 'Seçimi değiştir');
  backSecondary.href = '/hizmet' + location.search;
  backSecondary.setAttribute('data-nav-skip', '');
  side.appendChild(backSecondary);
  side.appendChild(make('section', 'oc-card oc-help',
    '<div><h2>Sorun mu var?</h2><p>Ödeme, seanslar ve danışman seçimiyle ilgili sık sorulan soruların cevapları burada.</p>' +
    '<a href="/#sss" data-nav-skip>Sık sorulan sorular <span aria-hidden="true">›</span></a></div>' +
    '<span class="oc-help-art" aria-hidden="true"><svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="22"/><path d="M18.5 19a5.5 5.5 0 1 1 7.6 5.1c-1.3.5-2.1 1.6-2.1 3v1.4"/><circle cx="24" cy="34.5" r="1.6"/></svg></span>'));
  side.appendChild(make('p', 'order-side-secure', 'Kart bilgilerini ödeme sağlayıcısının güvenli sayfasında girersin; bizde saklanmaz.'));
  layout.append(column, side);

  // Seans başlıkları: hizmet şablonlarından (yoksa varsayılan adlar kalır)
  const params = new URLSearchParams(location.search);
  const serviceId = (window.Selection && window.Selection.current().serviceId) || params.get('service');
  if (window.Api && serviceId) {
    window.Api.get('/public/services/' + encodeURIComponent(serviceId), { auth: false }).then(service => {
      (service && service.templates || []).forEach(tpl => {
        const node = document.querySelector('[data-oc-template="' + tpl.sequence_no + '"]');
        if (node && tpl.title) node.textContent = tpl.title;
      });
    }).catch(() => {});
  }
})();
