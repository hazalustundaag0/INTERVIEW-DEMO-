// randevu-on-demo.js — Randevu öncesi son adımlar (83). GAP-U01 / BR-07 / FR-52 / Kabul D5:
// adımlar artık koşulsuz "tamamlandı" işaretlenmez; durum yalnız API'den gelir:
//   GET /candidate/enrollments/{id}/booking-prerequisites → { ready, missing[payment|profile|consent|cv] }
//   GET /me/consents → kvkk_disclosure + explicit_consent için güncel sürüm (up_to_date, K33)
//   POST /me/consents {consent_text_id} ×2 (aday "Okudum, onaylıyorum" dediğinde) — güncel metin kimlikleriyle
// localStorage yok. "Randevu Al" yalnız ready=true iken etkin; yönlendirme takvim.html.
(function () {
  'use strict';
  const card = document.querySelector('main section > div.bg-\\[\\#FFFFFF\\]') || document.querySelector('main section');
  const rowsHost = card && card.querySelector('.mt-8.flex.flex-col');
  const rows = rowsHost ? Array.from(rowsHost.children) : [];
  const rowByTitle = title => rows.find(row => row.textContent.includes(title));
  const ROW = { profile: rowByTitle('Profil bilgilerin'), consent: rowByTitle('KVKK onayı'), cv: rowByTitle('CV ve CV onayı') };
  const readyBanner = Array.from(card ? card.querySelectorAll('div') : []).find(div => div.textContent.trim().startsWith('check_circleHer şey hazır') || (div.className.includes('bg-[#EEECFF]') && div.textContent.includes('Her şey hazır')));
  const bookButton = Array.from(document.querySelectorAll('button')).find(button => button.textContent.includes('Randevu Al'));
  const progressBar = document.querySelector('main section > div:first-child .flex.items-center.justify-between.w-full');
  const CONSENT_KINDS = ['kvkk_disclosure', 'explicit_consent'];
  const DONE_TEXT = {
    profile: 'Hedef pozisyon, sektör ve katılım nedenin kaydedildi.',
    consent: 'Kişisel verilerinin işlenmesi için güncel metinlere onay verdin.',
    cv: 'CV bilgilerin onaylandı.'
  };
  const TODO_TEXT = {
    profile: 'Hedef pozisyon, sektör ve katılım nedenini henüz kaydetmedin.',
    consent: 'Randevu almadan önce güncel KVKK aydınlatma metnini ve açık rıza metnini onaylaman gerekiyor.',
    cv: 'CV bilgilerini ekleyip onaylaman gerekiyor.'
  };
  const LINKS = { profile: 'profil.html', cv: 'cv.html' };

  if (readyBanner) readyBanner.hidden = true;
  if (bookButton) {
    bookButton.setAttribute('data-action', 'booking-continue');
    setBookEnabled(false);
  }
  Object.values(ROW).forEach(row => { if (row) row.style.visibility = 'hidden'; });

  function setBookEnabled(enabled) {
    if (!bookButton) return;
    bookButton.disabled = !enabled;
    bookButton.setAttribute('aria-disabled', String(!enabled));
    bookButton.classList.toggle('opacity-60', !enabled);
    bookButton.classList.toggle('cursor-not-allowed', !enabled);
    bookButton.classList.toggle('cursor-pointer', enabled);
    bookButton.title = enabled ? '' : 'Önce eksik adımları tamamla';
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function setRow(key, done, consentTexts) {
    const row = ROW[key];
    if (!row) return;
    row.style.visibility = '';
    const iconBox = row.querySelector('.w-9.h-9');
    const desc = row.querySelector('.text-body-md.text-muted');
    const status = row.lastElementChild;
    if (iconBox) {
      iconBox.className = done
        ? 'w-9 h-9 rounded-full bg-[#EEECFF] flex items-center justify-center shrink-0'
        : 'w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center shrink-0';
      iconBox.replaceChildren(el('span', 'material-symbols-outlined text-[20px] ' + (done ? 'text-[#51409D]' : 'text-outline'), done ? 'check_circle' : 'radio_button_unchecked'));
    }
    if (desc) desc.textContent = done ? DONE_TEXT[key] : TODO_TEXT[key];
    row.querySelector('details')?.remove();
    if (done) {
      const badge = el('div', 'flex items-center gap-1.5 text-[#51409D] font-medium text-body-md bg-[#EEECFF]/60 px-3 py-1.5 rounded-full');
      badge.append(el('span', 'material-symbols-outlined text-[18px]', 'check'), el('span', '', 'Tamamlandı'));
      status.replaceWith(badge);
      return;
    }
    if (key === 'consent') {
      const button = el('button', 'bg-[#51409D] text-on-primary hover:bg-[#51409D]/90 cursor-pointer font-medium rounded-lg px-4 py-2 text-body-md flex items-center gap-2 shadow-xs transition-colors', 'Okudum, onaylıyorum');
      button.type = 'button';
      button.setAttribute('data-action', 'consent-grant');
      button.addEventListener('click', () => grantConsents(button, consentTexts));
      status.replaceWith(button);
      // Metinlerin kendisi (güncel sürüm) — onaydan önce okunabilsin.
      if (consentTexts && consentTexts.length && desc) {
        const details = el('details', 'mt-2 text-body-md text-muted');
        details.append(el('summary', 'cursor-pointer text-[#51409D] font-medium', 'Metinleri oku'));
        consentTexts.forEach(text => {
          details.append(el('p', 'mt-2 font-semibold text-tertiary', text.title + ' (sürüm ' + text.version + ')'));
          String(text.body || '').split(/\n{2,}/).forEach(paragraph => details.append(el('p', 'mt-1 whitespace-pre-line', paragraph)));
        });
        desc.insertAdjacentElement('afterend', details);
      }
      return;
    }
    const link = el('a', 'text-[#51409D] font-semibold text-body-md hover:underline whitespace-nowrap', 'Tamamla →');
    link.href = LINKS[key];
    link.setAttribute('data-nav-skip', '');
    status.replaceWith(link);
  }

  function setProgress(state) {
    if (!progressBar) return;
    const steps = Array.from(progressBar.children).filter(node => !node.classList.contains('h-[2px]'));
    const lines = Array.from(progressBar.children).filter(node => node.classList.contains('h-[2px]'));
    const done = [state.profile, state.cvExists || state.cv, state.cv];
    done.forEach((isDone, index) => {
      const step = steps[index];
      if (!step) return;
      const circle = step.firstElementChild;
      const label = step.lastElementChild;
      step.classList.toggle('opacity-60', !isDone);
      circle.className = isDone
        ? 'w-6 h-6 rounded-full bg-[#51409D] text-on-primary flex items-center justify-center text-label-badge font-semibold'
        : 'w-6 h-6 rounded-full bg-surface-container text-outline flex items-center justify-center text-label-badge font-semibold';
      circle.replaceChildren(isDone ? el('span', 'material-symbols-outlined text-[16px]', 'check') : document.createTextNode(String(index + 1)));
      label.className = isDone ? 'font-headline-sm text-body-md text-tertiary font-medium' : 'font-body-md text-body-md text-outline';
      if (lines[index]) lines[index].className = 'h-[2px] flex-1 mx-2 ' + (isDone ? 'bg-[#51409D]' : 'bg-surface-container-low');
    });
  }

  let ctx = null;

  async function currentConsentTexts() {
    const status = await window.Api.get('/me/consents');
    const items = (status && status.items) || [];
    const texts = await Promise.all(CONSENT_KINDS.map(async kind => {
      const item = items.find(entry => entry.kind === kind);
      if (!item || item.up_to_date) return null;
      try {
        return await window.Api.get('/public/consent-texts/' + kind, { auth: false });
      } catch (error) {
        return item.current_text ? Object.assign({ body: '' }, item.current_text) : null;
      }
    }));
    return texts.filter(Boolean);
  }

  async function grantConsents(button, texts) {
    window.Api.ui.clearError(card);
    try {
      await window.Api.ui.withLoading(button, async () => {
        let pending = texts && texts.length ? texts : await currentConsentTexts();
        for (const text of pending) {
          await window.Api.post('/me/consents', { consent_text_id: text.id });
        }
      }, { text: 'Kaydediliyor…' });
      await refresh();
    } catch (error) {
      // 409 consent_text_outdated: metin bu arada güncellendi → güncel sürümle yeniden göster.
      window.Api.ui.showError(card, error);
      await refresh().catch(() => {});
    }
  }

  async function refresh() {
    const [pre, cvState] = await Promise.all([
      window.Journey.prerequisites(ctx),
      window.Api.get('/candidate/cv').then(cv => ({ exists: true, approved: Boolean(cv.approved_at) })).catch(error => {
        if (error.status === 404) return { exists: false, approved: false };
        throw error;
      })
    ]);
    const missing = pre.missing || [];
    const consentTexts = missing.includes('consent') ? await currentConsentTexts() : [];
    setRow('profile', !missing.includes('profile'));
    setRow('consent', !missing.includes('consent'), consentTexts);
    setRow('cv', !missing.includes('cv'));
    setProgress({ profile: !missing.includes('profile'), cv: !missing.includes('cv'), cvExists: cvState.exists });
    if (missing.includes('payment')) {
      window.Api.ui.showError(card, 'Ödemen henüz onaylanmadı; randevu ödeme tamamlandıktan sonra alınabilir.', { tone: 'info' });
    }
    if (readyBanner) readyBanner.hidden = !pre.ready;
    setBookEnabled(Boolean(pre.ready));
    window.Journey.applySidebar(ctx, { prerequisites: pre });
    return pre;
  }

  bookButton?.addEventListener('click', event => {
    event.preventDefault();
    if (bookButton.disabled) return;
    window.Nav ? window.Nav.go('takvim.html') : (location.href = 'takvim.html');
  });

  async function init() {
    try {
      ctx = await window.Journey.load();
      if (!ctx.enrollment) {
        Object.values(ROW).forEach(row => { if (row) row.style.visibility = ''; });
        window.Journey.showNoEnrollment(card);
        return;
      }
      await refresh();
      window.Journey.refreshSidebar(ctx).catch(() => {});
    } catch (error) {
      window.Api.ui.showError(card, error);
    }
  }

  // aday-yolculuk.js bu betikten sonra yüklenir; oturum doğrulanınca başla.
  (window.sessionReady || Promise.resolve()).then(init);
})();
