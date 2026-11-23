// guru-belgeler.js — Danışman Profilim · Belgeler ve sertifikalar (E6-21, Etap 12). Sahibi: 81 (84 ekranı).
// GET /guru/profile/documents · POST /guru/profile/documents (multipart: title, issuer, year?, file — PDF/DOCX/
// JPEG/PNG ≤ 10 MB) · DELETE /guru/profile/documents/{id} · GET /guru/profile/documents/{id}/file (Bearer → blob).
// Durum: pending (bekliyor) · verified (doğrulandı; herkese açık profilde yalnız başlık/kurum/yıl) · rejected.
(function () {
  'use strict';
  const Api = window.Api;
  const host = document.getElementById('guru-profile-sections');
  if (!Api || !host) return;
  const STATUS = { pending: ['Bekliyor', 'is-pending'], verified: ['Doğrulandı', 'is-verified'], rejected: ['Reddedildi', 'is-rejected'] };
  const ACCEPT = '.pdf,.docx,.jpg,.jpeg,.png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png';
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

  const card = el('section', 'guru-profile-form-card guru-docs-card');
  card.id = 'guru-documents';
  card.setAttribute('aria-labelledby', 'guru-docs-title');
  card.style.marginTop = '1.5rem';
  const head = el('div', 'guru-profile-editor-section');
  const title = el('h2', '', 'Belgeler ve sertifikalar');
  title.id = 'guru-docs-title';
  const intro = el('p', 'guru-profile-hint', 'Yüklediğin belgeler yönetici tarafından doğrulanır. Doğrulananlar herkese açık profilinde başlık, kurum ve yılıyla görünür; dosyanın kendisi yalnız sana ve yöneticiye açıktır.');
  const list = el('ul', 'guru-docs-list');
  list.setAttribute('aria-live', 'polite');
  const form = el('form', 'guru-docs-form');
  form.noValidate = true;
  form.innerHTML =
    '<div class="guru-profile-field"><label for="doc-title">Belge adı</label><input id="doc-title" name="title" maxlength="200" required placeholder="Örn. Satış Koçluğu Sertifikası"></div>' +
    '<div class="guru-profile-field"><label for="doc-issuer">Veren kurum</label><input id="doc-issuer" name="issuer" maxlength="200" required placeholder="Örn. Akademi"></div>' +
    '<div class="guru-profile-field"><label for="doc-year">Yıl (isteğe bağlı)</label><input id="doc-year" name="year" type="number" min="1950" max="2100" inputmode="numeric"></div>' +
    '<div class="guru-profile-field"><label for="doc-file">Dosya (PDF, DOCX, JPEG, PNG · en çok 10 MB)</label><input id="doc-file" name="file" type="file" required accept="' + ACCEPT + '"></div>' +
    '<div class="guru-profile-photo-actions"><button type="submit" data-action="document-upload">Belgeyi yükle</button></div>' +
    '<p class="guru-profile-error" data-doc-error aria-live="polite"></p>';
  head.append(title, intro, list, form);
  card.appendChild(head);
  host.insertAdjacentElement('afterend', card);
  const errorBox = form.querySelector('[data-doc-error]');

  function render(items) {
    if (!items.length) {
      list.replaceChildren(el('li', 'guru-profile-hint', 'Henüz belge yüklemedin.'));
      return;
    }
    list.replaceChildren(...items.map(doc => {
      const li = el('li', 'guru-docs-item');
      li.dataset.documentId = doc.id;
      const st = STATUS[doc.status] || [doc.status, ''];
      const text = el('div', 'guru-docs-text');
      text.append(el('strong', '', doc.title), el('span', '', [doc.issuer, doc.year].filter(Boolean).join(' · ')));
      if (doc.status === 'rejected' && doc.review_note) text.append(el('span', 'guru-docs-note', 'Yönetici notu: ' + doc.review_note));
      const badge = el('span', 'guru-docs-badge ' + st[1], st[0]);
      const actions = el('span', 'guru-docs-actions');
      const view = el('button', 'guru-docs-btn', 'Dosyayı aç');
      view.type = 'button';
      view.setAttribute('data-nav-skip', '');
      view.addEventListener('click', () => Api.ui.withLoading(view, () => Api.download('/guru/profile/documents/' + encodeURIComponent(doc.id) + '/file'))
        .catch(error => Api.ui.showError(errorBox, error)));
      const del = el('button', 'guru-docs-btn guru-docs-btn--danger', 'Sil');
      del.type = 'button';
      del.setAttribute('data-nav-skip', '');
      del.setAttribute('aria-label', doc.title + ' belgesini sil');
      del.addEventListener('click', async () => {
        if (!window.confirm('“' + doc.title + '” belgesi silinsin mi?')) return;
        try {
          await Api.ui.withLoading(del, () => Api.del('/guru/profile/documents/' + encodeURIComponent(doc.id)));
          load();
        } catch (error) { Api.ui.showError(errorBox, error); }
      });
      actions.append(view, del);
      li.append(text, badge, actions);
      return li;
    }));
  }

  async function load() {
    try {
      const res = await Api.get('/guru/profile/documents');
      render((res && res.items) || []);
    } catch (error) {
      Api.ui.showError(list, error);
    }
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    errorBox.textContent = '';
    const fd = new FormData(form);
    const file = form.querySelector('#doc-file').files[0];
    const titleV = String(fd.get('title') || '').trim();
    const issuer = String(fd.get('issuer') || '').trim();
    const year = String(fd.get('year') || '').trim();
    if (!titleV || !issuer || !file) { errorBox.textContent = 'Belge adı, veren kurum ve dosya zorunlu.'; return; }
    if (file.size > 10 * 1024 * 1024) { errorBox.textContent = 'Dosya en çok 10 MB olabilir.'; return; }
    const button = form.querySelector('button[type=submit]');
    try {
      await Api.ui.withLoading(button, () => Api.upload('/guru/profile/documents', { file, fields: { title: titleV, issuer, year: year || undefined } }), { text: 'Yükleniyor…' });
      form.reset();
      load();
    } catch (error) {
      errorBox.textContent = Api.ui.message(error, 'Belge yüklenemedi.');
    }
  });

  new Promise(resolve => (document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', resolve, { once: true }) : resolve()))
    .then(() => window.sessionReady).then(load);
})();
