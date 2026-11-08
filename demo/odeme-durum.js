// odeme-durum.js — Ödeme bekleniyor / başarısız ekranları (odeme-bekle.html, odeme-hata.html ?enrollment=<uuid>).
// Sahibi: 82 Aday Onboarding UI Agent.
// odeme-bekle: GET /candidate/enrollments/{id}/payments kısa aralıklarla yoklanır (en çok ~3 dk);
//              PAID → odeme-ok, FAILED → odeme-hata (yalnız yanıta göre yönlendirme).
// odeme-hata:  "Tekrar dene" (data-action="payment-retry") → POST /candidate/enrollments/{id}/payments/retry
//              {confirm:true} + Idempotency-Key → sonuç durumuna göre yönlendirme; "Siparişe geri dön" →
//              siparis.html?service=&guru= (kayıttaki seçim).
// Not: devpay her ödemeyi anında PAID yapar (GAP-B12); bu ekranlar gerçek sağlayıcıda (Faz 4) anlam kazanır.
// Kaldırılan demo davranışı: sabit "Elif Yılmaz" başlığı ve "IY-48213907" referansı (GAP-D06/D10).
(function () {
  'use strict';
  const Api = window.Api;
  const page = Api ? Api.pageName() : '';
  if (!Api || !['odeme-bekle.html', 'odeme-hata.html'].includes(page)) return;

  const POLL_MS = 3000;
  const POLL_LIMIT = 60;

  function latest(payments) {
    return (payments || []).slice().sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0] || null;
  }
  function destination(status, enrollmentId) {
    const query = '?enrollment=' + encodeURIComponent(enrollmentId);
    if (status === 'PAID') return 'odeme-ok.html' + query;
    if (status === 'FAILED') return 'odeme-hata.html' + query;
    return 'odeme-bekle.html' + query;
  }

  async function init() {
    const card = document.querySelector('main .shadow-card, main .bg-white.rounded-lg') || document.querySelector('main');
    const reference = document.querySelector('[data-payment-reference]');
    const session = await window.sessionReady;
    document.querySelectorAll('.site-header-user-name').forEach(node => { node.textContent = (session && session.name) || ''; });

    let enrollmentId = new URLSearchParams(location.search).get('enrollment');
    if (!enrollmentId || !/^[0-9a-f-]{36}$/i.test(enrollmentId)) {
      try {
        const result = await Api.page('/candidate/enrollments', { limit: 1 });
        enrollmentId = result.items[0] ? result.items[0].id : null;
      } catch (error) {
        Api.ui.showError(card, error);
        return;
      }
    }
    if (!enrollmentId) {
      location.replace('hizmet.html');
      return;
    }

    function showReference(payment) {
      if (!reference) return;
      reference.hidden = !(payment && payment.provider_reference);
      reference.textContent = payment && payment.provider_reference ? 'Ödeme referansı: ' + payment.provider_reference : '';
    }

    async function loadPayment() {
      const data = await Api.get('/candidate/enrollments/' + encodeURIComponent(enrollmentId) + '/payments');
      return latest(data && data.items);
    }

    if (page === 'odeme-bekle.html') {
      let attempts = 0;
      const poll = async () => {
        attempts += 1;
        try {
          const payment = await loadPayment();
          showReference(payment);
          if (payment && (payment.status === 'PAID' || payment.status === 'FAILED')) {
            location.replace(destination(payment.status, enrollmentId));
            return;
          }
        } catch (error) {
          if (error instanceof Api.ApiError && (error.status === 404 || error.status === 403)) {
            Api.ui.showError(card, error);
            return;
          }
          // Geçici ağ hatası: yoklamaya devam.
        }
        if (attempts < POLL_LIMIT && !document.hidden) window.setTimeout(poll, POLL_MS);
        else if (attempts >= POLL_LIMIT) {
          Api.ui.showError(card, 'Ödeme sonucu henüz gelmedi. Sonucu daha sonra ana ekranından kontrol edebilirsin.', { tone: 'info', position: 'append' });
        }
      };
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && attempts < POLL_LIMIT) poll();
      });
      poll();
      return;
    }

    // ── odeme-hata ──────────────────────────────────────────────────────────
    const retryButton = document.querySelector('[data-action="payment-retry"]');
    const backLink = Array.from(document.querySelectorAll('a')).find(anchor => anchor.textContent.trim() === 'Siparişe geri dön');
    let retryKey = null; // aynı denemenin anahtarı (ağ hatasında yeniden kullanılır)
    try {
      const detail = await Api.get('/candidate/enrollments/' + encodeURIComponent(enrollmentId));
      const payment = latest(detail.payments);
      showReference(payment);
      if (payment && payment.status === 'PAID') { location.replace(destination('PAID', enrollmentId)); return; }
      if (backLink && window.Selection) {
        backLink.href = window.Selection.href('siparis.html', { serviceId: detail.enrollment.service_id, guruId: detail.enrollment.guru_id });
      }
      if (payment && payment.failure_message) {
        Api.ui.showError(card, payment.failure_message, { position: 'append' });
      }
    } catch (error) {
      Api.ui.showError(card, error, { position: 'append' });
    }

    retryButton?.addEventListener('click', async event => {
      event.preventDefault();
      if (retryButton.disabled) return;
      if (!retryKey) retryKey = Api.newIdempotencyKey();
      try {
        const purchase = await Api.ui.withLoading(retryButton, () =>
          Api.confirm('POST', '/candidate/enrollments/' + encodeURIComponent(enrollmentId) + '/payments/retry', undefined, { idempotencyKey: retryKey }),
        { text: 'Deneniyor...' });
        if (purchase && purchase.redirect_url && /^https:\/\//i.test(purchase.redirect_url)) {
          location.href = purchase.redirect_url;
          return;
        }
        const status = purchase && purchase.payment && purchase.payment.status;
        if (status === 'FAILED') {
          retryKey = null; // yeni deneme yeni anahtar
          showReference(purchase.payment);
          Api.ui.showError(card, (purchase.payment && purchase.payment.failure_message) || 'Ödeme yine tamamlanamadı. Kart bilgilerini kontrol edip tekrar dene.', { position: 'append' });
          return;
        }
        location.href = destination(status, enrollmentId);
      } catch (error) {
        if (error instanceof Api.ApiError && error.is('enrollment_not_payable')) {
          // Kayıt artık ödeme beklemiyor (ör. ödeme başka sekmede tamamlandı) → güncel duruma git.
          try {
            const payment = await loadPayment();
            if (payment && payment.status === 'PAID') { location.href = destination('PAID', enrollmentId); return; }
          } catch (lookupError) { /* aşağıda mesaj */ }
        }
        if (error instanceof Api.ApiError && !error.isNetwork && !error.isTimeout) retryKey = null;
        Api.ui.showError(card, error, { position: 'append', fallback: 'Ödeme yeniden başlatılamadı.' });
      }
    });
  }

  function start() {
    init().catch(error => console.error('Ödeme durumu yüklenemedi:', error && error.message));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
