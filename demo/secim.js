// secim.js — Seçilen hizmet + danışman (guru). Sahibi: 81 Frontend Platform.
// Eski davranış (demoSecim/demoTarih/demoSaat ile sayfa metnini bul-değiştir) kaldırıldı (GAP-D15, D10).
// Seçim artık URL'de UUID olarak taşınır: ?service=<uuid>&guru=<uuid> (GAP-U14).
//
//   Selection.current()                 → { serviceId, guruId } (URL'den; eski ?danisman= de okunur)
//   Selection.toQuery({serviceId, guruId}) → "service=…&guru=…"
//   Selection.href('siparis.html', sel)  → "siparis.html?service=…&guru=…"
//   await Selection.preview(sel)         → GET /candidate/checkout/preview (Preview nesnesi)
//   await Selection.defaultService()     → GET /public/services ilk aktif hizmet (MVP'de tek hizmet)
(function () {
  'use strict';

  // Tasarım düzeltmesi (veriden bağımsız, eski secim.js'ten korunur).
  document.querySelectorAll('span').forEach(function (el) {
    if (el.textContent.trim() !== 'Kıdemli Satış Direktörü & Mentor') return;
    el.style.removeProperty('font-family');
    el.style.removeProperty('font-size');
  });

  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  function clean(value) {
    return typeof value === 'string' && UUID.test(value.trim()) ? value.trim() : null;
  }

  function current() {
    const params = new URLSearchParams(location.search);
    return {
      serviceId: clean(params.get('service')),
      guruId: clean(params.get('guru')) || clean(params.get('danisman'))
    };
  }

  function toQuery(selection) {
    const sel = selection || current();
    const params = new URLSearchParams();
    if (clean(sel.serviceId)) params.set('service', sel.serviceId);
    if (clean(sel.guruId)) params.set('guru', sel.guruId);
    return params.toString();
  }

  function href(page, selection) {
    const query = toQuery(selection);
    return page + (query ? '?' + query : '');
  }

  function preview(selection) {
    const sel = selection || current();
    return window.Api.get('/candidate/checkout/preview', {
      query: { service_id: sel.serviceId, guru_id: sel.guruId }
    });
  }

  async function defaultService() {
    const data = await window.Api.get('/public/services', { auth: false });
    return (data && data.items && data.items[0]) || null;
  }

  window.Selection = Object.freeze({ current, toQuery, href, preview, defaultService });
})();
