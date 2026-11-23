// hikaye-yaz.js — 1. adım: "Hikâyeni yaz" (/hikaye/yaz).
// Aday hikâyesini yazar ya da konuşarak yazdırır, isteğe bağlı CV ekler, "Okumaya ver" ile 2. adıma geçer.
// Gerçek oturum (K103, Etap 6 GAP-E6): metin PUT …/working-text ile otomatik kaydedilir (E6-11); "Okumaya ver"
// POST …/external ile taslak oluşturur; CV kutusu onaylı CV'yi gösterir (E6-1, karşılaştırma okumada yapılır).
// Önizlemede örnek veri hikaye-akis-ornek.js'ten gelir.
(function () {
  'use strict';
  const F = window.StoryFlow;
  const S = window.StoryFlowSample;
  // Etap 14 (TC-ADAY-11-005/016): "Okumaya ver" en az 80 kelimede açılır (öncesinde pasif + sayaç uyarısı).
  const MIN_WORDS = 80;

  const root = document.querySelector('.sf-root');
  const textarea = document.getElementById('story-text');
  const readBtn = root.querySelector('[data-action="read"]');
  const sampleBtn = root.querySelector('[data-action="sample"]');
  const statusEl = root.querySelector('[data-status]');
  const autosaveEl = root.querySelector('[data-autosave]');
  const countEl = root.querySelector('[data-word-count]');
  const speakEl = root.querySelector('[data-speak]');
  const hintEl = root.querySelector('[data-word-hint]');
  const cvHelp = root.querySelector('[data-cv-help]');
  const cvPickLabel = root.querySelector('[data-cv-pick-label]');
  const cvRemove = root.querySelector('[data-action="cv-remove"]');

  const A = window.StoryFlowApi || null;   // K103: gerçek oturumda API (önizlemede null)
  let state = F.store.load();
  let locked = false;
  let busy = false;
  let saveTimer = null;
  let apiDraft = null;                     // son taslak (StoryVM), gerçek oturumda

  let cvState = null;                      // gerçek oturum: { cv_id, items } (E6-2) — onaylı CV var mı

  F.stepper(root.querySelector('[data-stepper]'), 1);
  F.renderAdvisorNote(root.querySelector('[data-advisor-note]'));

  function renderMeter() {
    const n = F.words(textarea.value);
    countEl.textContent = n + ' kelime';
    speakEl.textContent = F.speakRange(n);
    hintEl.classList.remove('is-good');
    if (n < MIN_WORDS) hintEl.textContent = 'Okumaya vermek için en az ' + MIN_WORDS + ' kelime yaz (' + (MIN_WORDS - n) + ' kelime kaldı)';
    else if (n < 150) hintEl.textContent = 'Önerilen uzunluk 150–250 kelime';
    else if (n <= 250) { hintEl.textContent = 'Uzunluk iyi görünüyor'; hintEl.classList.add('is-good'); }
    else hintEl.textContent = 'Biraz uzun; önerilerde kısaltmayı birlikte düşünürüz';
    readBtn.disabled = locked || busy || n < MIN_WORDS;
    readBtn.title = n < MIN_WORDS ? 'En az ' + MIN_WORDS + ' kelime gerekli' : '';
    sampleBtn.hidden = !S || n > 0;   // K103: örnek metin düğmesi yalnız önizlemede
  }

  function renderCv() {
    if (A) {
      // E6-1: karşılaştırma onaylı CV ile okumada yapılır; CV yükleme / değiştirme CV'm sayfasında (/candidate/cv).
      const pick = root.querySelector('[data-action="cv-pick"]');
      cvRemove.hidden = true;
      if (cvState && cvState.cv_id) {
        cvHelp.textContent = 'Onaylı CV’n var · hikâyen her okumada CV’nle karşılaştırılır.';
        cvPickLabel.textContent = 'CV’yi değiştir';
      } else {
        cvHelp.textContent = 'CV’ni yükleyip onaylarsan hikâyende CV’nle uyuşmayan yerleri gösteririz (isteğe bağlı).';
        cvPickLabel.textContent = 'CV yükle';
      }
      if (pick) pick.dataset.href = '/cv';
      return;
    }
    if (state.cv) {
      cvHelp.replaceChildren(
        Object.assign(F.el('span', 'sf-cv-file'), { textContent: state.cv.fileName }),
        document.createTextNode(' · Hikâyen her okumada CV’nle karşılaştırılır.')
      );
      cvPickLabel.textContent = 'CV’yi değiştir';
      cvRemove.hidden = false;
    } else {
      cvHelp.textContent = 'PDF ya da Word olarak yüklersen, hikâyende CV’nle uyuşmayan yerleri gösteririz.';
      cvPickLabel.textContent = 'CV yükle';
      cvRemove.hidden = true;
    }
  }

  function persist() {
    state.draftText = textarea.value;
    if (!A) {
      if (F.store.save(state)) autosaveEl.textContent = 'Taslak kaydedildi';
      return;
    }
    // E6-11: sunucuda otomatik kayıt (sürüm oluşturmaz); sekme durumu da güncel kalır.
    F.store.save(state);
    if (locked) return;
    A.saveWorkingText(textarea.value)
      .then(() => { autosaveEl.textContent = 'Taslak kaydedildi'; })
      .catch(() => { autosaveEl.textContent = 'Taslak kaydedilemedi; bağlantını kontrol et'; });
  }

  textarea.value = state.draftText || '';
  renderMeter();
  renderCv();

  textarea.addEventListener('input', () => {
    renderMeter();
    autosaveEl.textContent = 'Kaydediliyor…';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, A ? 1500 : 600);
  });

  F.dictation(root.querySelector('[data-action="dictate"]'), text => {
    const sep = textarea.value && !/\s$/.test(textarea.value) ? ' ' : '';
    textarea.value += sep + text;
    renderMeter();
    persist();
  }, statusEl);

  sampleBtn.addEventListener('click', () => {
    if (!S) return;   // K103: örnek metin yalnız önizlemede
    textarea.value = S.story;
    renderMeter();
    persist();
    statusEl.textContent = 'Örnek metin eklendi (kurgusal bir aday). İstediğin gibi değiştirebilirsin.';
    textarea.focus();
  });

  root.querySelector('[data-action="cv-pick"]').addEventListener('click', () => {
    if (A) { F.go('/cv'); return; }
    F.pickCv(file => {
      state.cv = file;
      F.store.save(state);
      renderCv();
    }, statusEl);
  });
  cvRemove.addEventListener('click', () => {
    state.cv = null;
    F.store.save(state);
    renderCv();
  });

  // K103: gerçek oturumda "Okumaya ver" metni API'ye yazar (POST …/external; metin aynıysa mevcut taslak).
  async function submitReal(text) {
    busy = true;
    renderMeter();
    window.Api.ui.clearError(root);
    try {
      const same = apiDraft && A.textOf(apiDraft).replace(/\s+/g, ' ') === text.replace(/\s+/g, ' ');
      const vm = same ? apiDraft : await window.Api.ui.withLoading(readBtn, () => A.submitText(text), { text: 'Kaydediliyor…' });
      const saved = A.textOf(vm) || text;
      state = Object.assign(state, {
        storyId: state.storyId, draftId: vm.draftId, draftText: saved, paragraphs: A.paragraphs(saved),
        seq: A.paragraphs(saved).flat().length, version: vm.versionNo || 1, reading: 0, queue: [], done: [],
        built: false, openIssues: [], ready: false, pendingRead: true
      });
      F.store.save(state);
      F.go('/hikaye/oneriler');
    } catch (error) {
      window.Api.ui.showError(statusEl.parentElement || root, error);
    } finally {
      busy = false;
      renderMeter();
    }
  }

  readBtn.addEventListener('click', () => {
    if (readBtn.disabled || F.words(textarea.value) < MIN_WORDS) return;
    const text = textarea.value.trim();
    if (A) { submitReal(text); return; }
    let seq = 0;
    const paragraphs = text.split(/\n\s*\n/).map(block =>
      F.split(block).map(sentence => ({ id: 's' + (++seq), text: sentence, origin: 'candidate', recent: false }))
    ).filter(p => p.length);
    state = Object.assign(state, {
      draftText: text,
      paragraphs,
      seq,
      version: 1,
      reading: 0,
      queue: [],
      done: [],
      built: false,
      openIssues: [],
      ready: false,
      pendingRead: true
    });
    F.store.save(state);
    F.go('/hikaye/oneriler');
  });

  // K103: gerçek oturum — son taslak API'den; tamamlanan hikâye salt okunur; ilk seans koşulu.
  async function initReal() {
    try {
      const st = await A.load();
      window.Journey.refreshSidebar?.(st.ctx).catch(() => {});
      if (!st.storyId) {
        locked = true;
        window.Journey.showNoEnrollment?.(root);
        renderMeter();
        return;
      }
      if (state.storyId !== st.storyId) {
        // Başka bir hikâye oturumunun (ya da önizlemenin) sekme durumu taşınmaz.
        F.store.reset();
        state = Object.assign(F.store.load(), { storyId: st.storyId });
        F.store.save(state);
      }
      if (!A.atLeastFirstSession(st.ctx)) {
        locked = true;
        statusEl.textContent = 'Hikâye adımı, ilk seansın danışmanın tarafından tamamlandıktan sonra açılır.';
      }
      apiDraft = st.draft;
      // E6-11: sunucudaki çalışma metni (kaydedildiyse) son taslaktan önceliklidir; yoksa son taslak metni.
      const [working, facts] = await Promise.all([
        A.getWorkingText().catch(() => null),
        A.cvFacts().catch(() => null)
      ]);
      cvState = facts;
      renderCv();
      if (working && working.saved_at && working.text) {
        textarea.value = working.text;
        autosaveEl.textContent = 'Taslak kaydedildi';
      } else if (apiDraft && !state.draftText) {
        textarea.value = A.textOf(apiDraft);
      }
      state.draftText = textarea.value;
      F.store.save(state);
      if (A.completed(st.status)) {
        locked = true;
        textarea.readOnly = true;
        statusEl.textContent = 'Hikâyeni onayladın; metin artık değiştirilemez. Son hâli “Hikâyem hazır” adımında.';
        const link = F.el('a', '', ' Hikâyeme git →');
        link.href = '/hikaye/hazir';
        link.setAttribute('data-nav-skip', '');
        statusEl.appendChild(link);
      }
    } catch (error) {
      locked = true;
      window.Api.ui.showError(statusEl.parentElement || root, error);
    }
    renderMeter();
  }

  // İlk seans tamamlanmadan hikâye adımı açılmaz (API'ye ulaşılabiliyorsa denetlenir).
  if (A) { initReal(); return; }
  (async function gate() {
    try {
      if (!window.Journey) return;
      await window.sessionReady;
      const ctx = await window.Journey.load();
      window.Journey.refreshSidebar?.(ctx).catch(() => {});
      if (ctx && ctx.story && !window.Journey.atLeast(ctx.story, 'FIRST_SESSION_DONE')) {
        locked = true;
        statusEl.textContent = 'Hikâye adımı, ilk seansın danışmanın tarafından tamamlandıktan sonra açılır.';
        renderMeter();
      }
    } catch (error) { /* API yoksa örnek akış açık kalır */ }
  })();
})();
