// odeme-ok-demo.js — Ödeme başarılı / makbuz özeti (odeme-ok.html?enrollment=<uuid>). Sahibi: 82.
// Veri: GET /candidate/enrollments/{id} (enrollment + payments), GET /public/services/{id}, GET /public/gurus/{id}.
// Ödeme PAID değilse doğru durum ekranına yönlendirir (PENDING → odeme-bekle, FAILED → odeme-hata).
// Kaldırılan demo davranışı: demoSecim okuması, sahte sipariş no "#IV-2027-0001", sabit referans
// "IY-48213907", varsayılan 1.500 ₺ / "Selin Arslan" / "Elif" (GAP-D06, D10), "E-postana gönderildi"
// notu (ödeme e-postası backend'de yok → gizli).
(function () {
  'use strict';
  const Api = window.Api;
  if (!Api) {
    console.error('odeme-ok-demo.js: api-client.js yüklenmemiş.');
    return;
  }

  function setAll(selector, value) {
    document.querySelectorAll(selector).forEach(node => { node.textContent = value; });
  }

  function addConfetti() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const layer = document.querySelector('.payment-success-confetti');
    if (!layer) return;
    const colors = ['#51409d', '#35a66b', '#e7aa55', '#df7c73', '#9381df'];
    for (let index = 0; index < 28; index += 1) {
      const piece = document.createElement('span');
      piece.className = 'payment-success-confetti-piece';
      piece.style.setProperty('--confetti-x', (Math.random() * 100).toFixed(2) + '%');
      piece.style.setProperty('--confetti-delay', (Math.random() * 0.2).toFixed(2) + 's');
      piece.style.setProperty('--confetti-duration', '1.25s');
      piece.style.setProperty('--confetti-color', colors[index % colors.length]);
      piece.style.setProperty('--confetti-rotation', Math.round(Math.random() * 540 - 270) + 'deg');
      layer.appendChild(piece);
    }
  }

  // Ödemeler: önce PAID olan, yoksa en yeni deneme.
  function pickPayment(payments) {
    const list = (payments || []).slice().sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
    return list.find(payment => payment.status === 'PAID') || list[0] || null;
  }

  async function resolveEnrollmentId() {
    const fromUrl = new URLSearchParams(location.search).get('enrollment');
    if (fromUrl && /^[0-9a-f-]{36}$/i.test(fromUrl)) return fromUrl;
    const page = await Api.page('/candidate/enrollments', { limit: 1 });
    return page.items[0] ? page.items[0].id : null;
  }

  // QA-016: başarı metinleri (yol haritası "Tamamlandı", "Ödemen alındı", makbuz …) yalnız PAID ödeme
  // doğrulandıktan sonra görünür. Yükleme sırasında gizli; hata/404'te gizli kalır ve kart hata durumuna geçer.
  const SUCCESS_ONLY = [
    '.payment-success-next', '.payment-success-receipt', '.payment-success-confetti', '.payment-success-icon',
    '#payment-success-thanks', '#payment-success-title', '.payment-success-intro', '.payment-success-advisor',
    '.payment-success-note', '.payment-success-primary'
  ];
  function toggleSuccess(visible) {
    SUCCESS_ONLY.forEach(selector => document.querySelectorAll(selector).forEach(node => {
      if (visible) node.style.removeProperty('display');
      else node.style.display = 'none';
    }));
  }
  toggleSuccess(false);

  function showFailure(card, error) {
    toggleSuccess(false);
    const title = document.getElementById('payment-success-title');
    if (title) {
      title.textContent = error instanceof Api.ApiError && error.status === 404 ? 'Ödeme bilgisi bulunamadı' : 'Ödeme bilgileri yüklenemedi';
      title.style.removeProperty('display');
    }
    document.title = 'Ödeme bilgisi · Interview Demo';
    const secondary = document.querySelector('.payment-success-secondary');
    if (secondary) secondary.textContent = 'Ana ekrana dön';
    const host = card?.querySelector('.payment-success-actions') || card || document.querySelector('main');
    Api.ui.showError(host, error, { fallback: 'Ödeme bilgileri yüklenemedi.' });
    card?.removeAttribute('aria-busy');
  }

  async function init() {
    const card = document.querySelector('.payment-success-card');
    card?.setAttribute('aria-busy', 'true');
    document.querySelector('[data-print-receipt]')?.addEventListener('click', () => window.print());
    const session = await window.sessionReady;
    const firstName = (session && session.first_name) || '';
    const thanks = document.getElementById('payment-success-thanks');
    if (thanks) thanks.textContent = firstName ? 'Teşekkürler, ' + firstName : 'Teşekkürler';

    try {
      const enrollmentId = await resolveEnrollmentId();
      if (!enrollmentId) {
        location.replace('hizmet.html');
        return;
      }
      const detail = await Api.get('/candidate/enrollments/' + encodeURIComponent(enrollmentId));
      const enrollment = detail.enrollment;
      const payment = pickPayment(detail.payments);
      const query = '?enrollment=' + encodeURIComponent(enrollment.id);
      if (!payment || payment.status === 'PENDING') { location.replace('odeme-bekle.html' + query); return; }
      if (payment.status === 'FAILED') { location.replace('odeme-hata.html' + query); return; }

      const [service, advisor] = await Promise.all([
        Api.get('/public/services/' + encodeURIComponent(enrollment.service_id), { auth: false }).catch(() => null),
        window.Advisors ? window.Advisors.get(enrollment.guru_id).catch(() => null) : null
      ]);
      const advisorName = advisor ? advisor.ad : '';
      setAll('[data-receipt-advisor-name]', advisorName || 'danışmanın');
      const link = document.querySelector('[data-receipt-advisor-link]');
      if (link) link.href = 'danisman.html?id=' + encodeURIComponent(enrollment.guru_id);
      setAll('[data-advisor-avatar]', Api.format.initials(advisorName));
      setAll('[data-receipt-advisor-title]', advisor ? advisor.unvan : '');
      setAll('[data-receipt-duration]', enrollment.session_duration_minutes + ' dk');
      setAll('[data-receipt-sessions]', enrollment.session_count + ' seans');
      setAll('[data-receipt-order-number]', '#' + String(enrollment.id).replace(/-/g, '').slice(-10).toUpperCase());
      setAll('[data-receipt-date]', Api.format.date(payment.paid_at || enrollment.activated_at || enrollment.purchase_confirmed_at));
      setAll('[data-receipt-service]', (service && service.name) || '—');
      setAll('[data-receipt-advisor]', advisorName || '—');
      const total = document.querySelector('[data-receipt-total]');
      if (total) {
        const amount = Number(payment.amount_minor) === 0 ? 'Ücretsiz' : Api.format.money(payment.amount_minor, payment.currency);
        total.replaceChildren(document.createTextNode(amount + ' '),
          Object.assign(document.createElement('span'), { textContent: 'KDV dahil' }));
      }
      const reference = document.querySelector('[data-receipt-reference]');
      if (reference && payment.provider_reference) {
        reference.textContent = 'Ödeme referansı: ' + payment.provider_reference;
        reference.hidden = false;
      }
      toggleSuccess(true);
      card?.removeAttribute('aria-busy');
      addConfetti();
    } catch (error) {
      showFailure(card, error);
    }
  }

  function start() {
    init().catch(error => console.error('Makbuz yüklenemedi:', error && error.message));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
