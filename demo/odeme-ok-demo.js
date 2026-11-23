// odeme-ok-demo.js — Ödeme başarılı / makbuz özeti (/odeme/basarili?enrollment=<uuid>). Sahibi: 82.
// Veri: GET /candidate/enrollments/{id} (enrollment + payments), GET /public/services/{id}, GET /public/gurus/{id}.
// Ödeme PAID değilse doğru durum ekranına yönlendirir (PENDING → odeme-bekle, FAILED → odeme-hata).
// Kaldırılan demo davranışı: demoSecim okuması, sahte sipariş no "#IV-2027-0001", sabit referans
// "IY-48213907", varsayılan fiyat/danışan/danışman (GAP-D06, D10), "E-postana gönderildi"
// notu (ödeme e-postası backend'de yok → gizli). Etap 4: konfeti kaldırıldı (Hazal), makbuz avatarı guru
// adı/fotoğrafıyla (K83).
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
    '.payment-success-next', '.payment-success-receipt', '.payment-success-icon',
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
        location.replace('/hizmet');
        return;
      }
      const detail = await Api.get('/candidate/enrollments/' + encodeURIComponent(enrollmentId));
      const enrollment = detail.enrollment;
      const payment = pickPayment(detail.payments);
      const query = '?enrollment=' + encodeURIComponent(enrollment.id);
      if (!payment || payment.status === 'PENDING') { location.replace('/odeme/bekleniyor' + query); return; }
      if (payment.status === 'FAILED') { location.replace('/odeme/hata' + query); return; }

      const [service, advisor] = await Promise.all([
        Api.get('/public/services/' + encodeURIComponent(enrollment.service_id), { auth: false }).catch(() => null),
        window.Advisors ? window.Advisors.get(enrollment.guru_id).catch(() => null) : null
      ]);
      const advisorName = advisor ? advisor.ad : '';
      setAll('[data-receipt-advisor-name]', advisorName || 'danışmanın');
      const link = document.querySelector('[data-receipt-advisor-link]');
      if (link) link.href = '/danisman?id=' + encodeURIComponent(enrollment.guru_id);
      // K83: danışman fotoğrafı (public katalog ucu) varsa <img>, yoksa baş harfler — avatar.js çizer.
      document.querySelectorAll('[data-advisor-avatar]').forEach(node => {
        node.textContent = Api.format.initials(advisorName);
        if (window.DemoAvatar) window.DemoAvatar.render(node, { name: advisorName, url: advisor ? advisor.avatarUrl : '' });
        else {
          if (advisorName) node.dataset.avatarName = advisorName;
          if (advisor && advisor.avatarUrl) node.dataset.avatarUrl = advisor.avatarUrl;
        }
      });
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
      renderOrderDocument(enrollment, detail.order || null, payment);
      const reference = document.querySelector('[data-receipt-reference]');
      if (reference && payment.provider_reference) {
        reference.textContent = 'Ödeme referansı: ' + payment.provider_reference;
        reference.hidden = false;
      }
      toggleSuccess(true);
      card?.removeAttribute('aria-busy');
    } catch (error) {
      showFailure(card, error);
    }
  }

  // E6-17 (Etap 12, K120): sistem içi "Sipariş belgesi" (fatura DEĞİL). document_no ödeme onaylanınca oluşur;
  // KDV dökümü belgeden (price_breakdown). "Sipariş belgesini görüntüle" → GET /candidate/enrollments/{id}/invoice.
  function renderOrderDocument(enrollment, order, payment) {
    const no = order && order.document_no;
    setAll('[data-receipt-order-number]', no || 'Ödeme onaylanınca oluşur');
    const grid = document.querySelector('.payment-success-receipt-grid');
    const b = order && order.price_breakdown;
    if (grid && b && !grid.querySelector('[data-receipt-vat]')) {
      const add = (label, value, attr) => {
        const div = document.createElement('div');
        if (attr) div.setAttribute(attr, '');
        const dt = document.createElement('dt'); dt.textContent = label;
        const dd = document.createElement('dd'); dd.textContent = value;
        div.append(dt, dd);
        grid.insertBefore(div, grid.querySelector('.payment-success-receipt-total'));
      };
      add('Net tutar', Api.format.money(b.net_minor, b.currency), 'data-receipt-net');
      add('KDV (%' + String(b.vat_rate).replace('.', ',') + ')', Api.format.money(b.vat_minor, b.currency), 'data-receipt-vat');
      const total = document.querySelector('[data-receipt-total]');
      if (total) total.replaceChildren(document.createTextNode(Api.format.money(b.total_minor, b.currency) + ' '),
        Object.assign(document.createElement('span'), { textContent: b.vat_included ? 'KDV dahil' : 'KDV eklendi' }));
    }
    const actions = document.querySelector('.payment-success-card .payment-success-actions') || document.querySelector('.payment-success-receipt-grid');
    if (!actions || document.querySelector('[data-order-document]')) return;
    const wrap = document.createElement('div');
    wrap.setAttribute('data-order-document', '');
    wrap.style.cssText = 'margin:1rem 0 0';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'payment-success-print';
    btn.setAttribute('data-action', 'order-document');
    btn.textContent = 'Sipariş belgesini görüntüle';
    btn.disabled = !no;
    const out = document.createElement('div');
    out.setAttribute('data-order-document-body', '');
    out.hidden = true;
    out.style.cssText = 'margin-top:.75rem;padding:1rem;border:1px solid var(--color-rule,#DDD6FE);border-radius:12px;background:#fff;font-size:.9rem';
    btn.addEventListener('click', async () => {
      try {
        const doc = await Api.ui.withLoading(btn, () => Api.get('/candidate/enrollments/' + encodeURIComponent(enrollment.id) + '/invoice'));
        const pb = doc.price_breakdown || {};
        const lines = [
          ['Belge', 'Sipariş belgesi'], ['Belge no', doc.document_no || '—'], ['Tarih', doc.issued_at ? Api.format.date(doc.issued_at) : '—'],
          ['Hizmet', doc.service_name || '—'], ['Ad / unvan', doc.billing_name || '—'], ['Adres', doc.billing_address || '—'],
          ['Net', Api.format.money(pb.net_minor, pb.currency)], ['KDV (%' + String(pb.vat_rate).replace('.', ',') + ')', Api.format.money(pb.vat_minor, pb.currency)],
          ['Toplam', Api.format.money(pb.total_minor, pb.currency) + (pb.vat_included ? ' (KDV dahil)' : '')]
        ];
        const dl = document.createElement('dl');
        dl.style.cssText = 'display:grid;grid-template-columns:auto 1fr;gap:.25rem 1rem;margin:0';
        lines.forEach(([k, v]) => { const dt = document.createElement('dt'); dt.textContent = k; dt.style.color = 'var(--color-muted,#6b7280)'; const dd = document.createElement('dd'); dd.textContent = v; dd.style.margin = '0'; dl.append(dt, dd); });
        const note = document.createElement('p');
        note.setAttribute('data-order-legal-note', '');
        note.style.cssText = 'margin:.75rem 0 0;font-size:.8rem;color:var(--color-muted,#6b7280)';
        note.textContent = doc.legal_note || 'Bu belge sistem içi sipariş belgesidir; resmî e-fatura veya e-arşiv fatura değildir.';
        out.replaceChildren(dl, note);
        out.hidden = false;
      } catch (error) {
        Api.ui.showError(out, error);
        out.hidden = false;
      }
    });
    const hint = document.createElement('p');
    hint.style.cssText = 'margin:.4rem 0 0;font-size:.8rem;color:var(--color-muted,#6b7280)';
    hint.textContent = no ? 'Resmî e-fatura değildir; sistem içi sipariş belgesidir.' : 'Belge no ödeme onaylanınca oluşur.';
    wrap.append(btn, hint, out);
    actions.insertAdjacentElement('afterend', wrap);
  }

  function start() {
    init().catch(error => console.error('Makbuz yüklenemedi:', error && error.message));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
