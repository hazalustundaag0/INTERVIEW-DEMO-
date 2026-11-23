// hikaye-oneriler.js — 2. adım: "Önerileri incele" (/hikaye/oneriler).
// Solda adayın hikâyesi (cümleye tıklayıp düzeltir), sağda okuma sonucu öneriler.
// Öneri türleri: rewrite (önerilen metin) · add (ekleyin) · cv (CV ile uyuşmuyor) · flow (akış ipucu) · build (hikâyemi kur).
// ÖRNEK VERİ: 1. okuma örnek metinle yazıldıysa hikaye-akis-ornek.js'teki öneriler kullanılır; diğer
// durumlarda öneriler basit metin kontrolleriyle üretilir. Yapay zekâ servisi bağlanınca okuma sonucu API'den gelecek.
(function () {
  'use strict';
  const F = window.StoryFlow;
  const S = window.StoryFlowSample;
  const el = F.el;

  const root = document.querySelector('.sf-root');
  const storyHost = root.querySelector('[data-story]');
  const metaEl = root.querySelector('[data-story-meta]');
  const versionEl = root.querySelector('[data-version]');
  const readingEl = root.querySelector('[data-reading]');
  const sideBody = root.querySelector('[data-side-body]');
  const progress = root.querySelector('[data-progress]');
  const progressBar = progress.querySelector('.sf-progress-bar span');
  const progressText = root.querySelector('[data-progress-text]');
  const doneBox = root.querySelector('[data-done]');
  const doneTitle = root.querySelector('[data-done-title]');
  const doneList = root.querySelector('[data-done-list]');
  const autosaveEl = root.querySelector('[data-autosave]');

  const A = window.StoryFlowApi || null;   // K103: gerçek oturumda API (önizlemede null)
  let state = F.store.load();
  let editing = null;          // { id, onSave }
  let readingBusy = false;
  let confirmReady = false;
  let apiDraft = null;         // gerçek oturum: son kaydedilen taslak (StoryVM)
  let lastReview = null;       // gerçek oturum: son YZ okuması (E6-3) — build_checklist (E6-4) dahil

  if (!A && (!state.paragraphs || !state.paragraphs.length)) { F.go('/hikaye/yaz'); return; }
  F.stepper(root.querySelector('[data-stepper]'), 2);

  // ─── Model yardımcıları ─────────────────────────────────────────────────────
  const flat = () => state.paragraphs.flatMap((p, pi) => p.map((s, si) => ({ s, pi, si })));
  const find = id => flat().find(x => x.s.id === id);
  const storyText = () => state.paragraphs.map(p => p.map(s => s.text).join(' ')).join('\n\n');
  const newId = () => 's' + (++state.seq);
  const norm = t => String(t || '').replace(/\s+/g, ' ').trim();

  function clearRecent() { flat().forEach(x => { x.s.recent = false; }); }

  function save(message) {
    F.store.save(state);
    autosaveEl.textContent = message || 'Değişiklikler kaydedildi';
  }

  function replaceSentences(ids, text, origin) {
    const first = find(ids[0]);
    if (!first) return;
    clearRecent();
    const parts = F.split(text).map(t => ({ id: newId(), text: t, origin, recent: true }));
    state.paragraphs[first.pi].splice(first.si, 1, ...parts);
    ids.slice(1).forEach(id => {
      const hit = find(id);
      if (hit) state.paragraphs[hit.pi].splice(hit.si, 1);
    });
    // Bekleyen öneriler değişen cümlelere bağlıysa yeni cümleye taşınır.
    if (parts.length) {
      state.queue.forEach(item => {
        if (item.status !== 'pending' || !item.targets) return;
        item.targets = Array.from(new Set(item.targets.map(id => (ids.includes(id) ? parts[0].id : id))));
      });
    }
    state.paragraphs = state.paragraphs.filter(p => p.length);
    state.version += 1;
  }

  function insertAfter(id, text, origin) {
    const hit = find(id) || flat()[flat().length - 1];
    clearRecent();
    const parts = F.split(text).map(t => ({ id: newId(), text: t, origin, recent: true }));
    state.paragraphs[hit.pi].splice(hit.si + 1, 0, ...parts);
    state.version += 1;
  }

  // ─── Okuma (örnek / basit kontroller) ───────────────────────────────────────
  function sampleSuggestions() {
    const initial = flat();
    return S.firstReading
      .filter(item => item.kind !== 'cv' || state.cv)
      .map(item => Object.assign({}, item, { targets: item.targets.map(i => initial[i] && initial[i].s.id).filter(Boolean), status: 'pending' }))
      .filter(item => item.targets.length);
  }

  function checkSuggestions() {
    const out = [];
    const all = flat();
    all.forEach(({ s }) => {
      const n = F.words(s.text);
      if (n > 30) out.push({ id: 'flow-' + s.id, kind: 'flow', badge: 'Akış ipucu', title: 'Uzun cümle', targets: [s.id],
        text: 'Bu cümle çok uzun (' + n + ' kelime); sesli anlatımda bölmek kolaylaştırır.', quote: s.text });
    });
    const we = all.find(({ s }) => /\b(biz|bizim|ekip olarak|ekibimizle)\b/i.test(s.text));
    if (we) out.push({ id: 'we-' + we.s.id, kind: 'add', badge: 'Ekleyin', title: 'Senin payın', targets: [we.s.id],
      question: 'Bu işte senin payın neydi?', example: 'Bu işte ben [hangi kısmı] üstlendim.', why: '“Biz” dili, görüşmecinin senin katkını ayırt etmesini zorlaştırır.' });
    const vague = all.find(({ s }) => /\b(iyi|güzel|başarılı|harika|verimli)\b/i.test(s.text));
    if (vague) out.push({ id: 'vague-' + vague.s.id, kind: 'add', badge: 'Ekleyin', title: 'Belirsiz sonuç', targets: [vague.s.id],
      question: 'Bunu bir sayıyla ya da örnekle anlatabilir misin?', example: 'Bunun sonucunda [ne] [ne kadar] değişti.', why: 'Somut bir örnek, sözünü görüşmecinin gözünde canlandırır.' });
    const hasGoal = all.some(({ s }) => /(hedef|istiyorum|olmak|amacım)/i.test(s.text));
    if (!hasGoal && all.length) out.push({ id: 'goal', kind: 'add', badge: 'Ekleyin', title: 'Hedef', targets: [all[all.length - 1].s.id],
      question: 'Bir sonraki adımda nereye gitmek istiyorsun?', example: 'Hedefim [hangi rolde] [ne yapmak].', why: 'Hikâye, gitmek istediğin yerle bağlandığında anlam kazanır.' });
    return out.slice(0, 4).map(item => Object.assign(item, { status: 'pending' }));
  }

  // E6-3 (Etap 6): YZ okumasının önerileri → kart modeli. target_sentence_nos taslağın cümle numaralarıdır;
  // yerel cümlelerde `no` alanıyla eşlenir (A.paragraphs(text, vm)). Kararlar: accepted | own_words | skipped.
  const BADGES = { rewrite: 'Önerilen metin', add: 'Ekleyin', flow: 'Akış ipucu', cv: 'CV ile uyuşmuyor' };
  function fromReview(review) {
    const all = flat();
    const byNo = no => (all.find(x => x.s.no === no) || {}).s;
    return (review.suggestions || []).map(sg => {
      const targets = (sg.target_sentence_nos || []).map(byNo).filter(Boolean).map(t => t.id);
      if (!targets.length && all.length) targets.push(all[all.length - 1].s.id);
      const item = {
        id: 'sg-' + sg.id, sid: sg.id, kind: sg.kind, badge: BADGES[sg.kind] || 'Öneri', title: sg.title || BADGES[sg.kind] || 'Öneri',
        targets, why: sg.why || '', status: sg.decision ? 'done' : 'pending', decision: sg.decision || null
      };
      if (sg.kind === 'rewrite') item.proposal = sg.proposal || '';
      if (sg.kind === 'add') { item.question = sg.question || sg.title; item.example = sg.example || ''; }
      if (sg.kind === 'flow') { item.text = sg.why || sg.title; item.quote = sg.proposal || ''; }
      if (sg.kind === 'cv') {
        item.storySays = sg.story_says || ''; item.cvSays = sg.cv_says || '';
        item.openIssue = 'CV’ni güncelle: hikâyende “' + (sg.story_says || '') + '”, CV’nde “' + (sg.cv_says || '') + '” yazıyor.';
      }
      if (sg.kind === 'rewrite' && !item.proposal) item.kind = 'flow', item.text = item.why;
      return item;
    });
  }

  function applyReview(review) {
    lastReview = review;
    state.reading = review.reading_no || state.reading;
    state.queue = fromReview(review);
    state.done = state.queue.filter(item => item.status === 'done').map(item => ({ title: item.title, result: DECISION_TEXT[item.decision] || 'Sonuçlandı' }));
  }
  const DECISION_TEXT = { accepted: 'Hikâyene alındı', own_words: 'Kendi sözlerinle düzelttin', skipped: 'Geçildi' };

  // Yedek (YZ okuması kullanılamazsa, ör. stub 501): taslağın [bilgi gerekli] cümleleri + BR-09 + yerel kontroller.
  function apiSuggestions(vm) {
    const out = [];
    const all = flat();
    (vm ? vm.sentences : []).filter(s => s.infoNeeded).forEach((s, i) => {
      const hit = all.find(x => norm(x.s.text) === norm(s.text)) || all[all.length - 1];
      if (!hit) return;
      out.push({ id: 'info-' + vm.versionNo + '-' + i, kind: 'add', badge: 'Bilgi gerekli', title: 'Eksik bilgi', targets: [hit.s.id],
        question: 'Bu cümlede eksik kalan bilgiyi kendi cümlenle tamamla.', example: s.text, why: 'Hikâyede olmayan bilgi uydurulmaz; yalnız senin yazdığın girer.', status: 'pending' });
    });
    (vm ? vm.issues : []).map(A.issueText).filter(Boolean).forEach((text, i) => {
      out.push({ id: 'issue-' + vm.versionNo + '-' + i, kind: 'flow', badge: 'Metin ipucu', title: 'Metin kuralı', targets: all.length ? [all[all.length - 1].s.id] : [],
        text, quote: '', status: 'pending' });
    });
    return out.concat(checkSuggestions()).slice(0, 6);
  }

  async function startReadingReal() {
    readingBusy = true;
    confirmReady = false;
    state.pendingRead = false;
    state.reading += 1;
    state.done = [];
    clearRecent();
    sideBody.replaceChildren(el('div', 'sf-reading'));
    sideBody.firstChild.append(el('span', 'sf-spinner'), el('span', '', 'Hikâyen okunuyor…'));
    progress.hidden = true;
    doneBox.hidden = true;
    readingEl.textContent = '· ' + state.reading + '. okuma';
    try {
      apiDraft = await A.saveText(apiDraft, storyText());
      state.draftId = apiDraft.draftId;
      state.version = apiDraft.versionNo || state.version;
      // Cümle numaraları kaydedilen taslağa göre yeniden eşlenir (öneri hedefleri için).
      state.paragraphs = A.paragraphs(A.textOf(apiDraft), apiDraft);
      state.seq = state.paragraphs.flat().length;
      let fallbackError = null;
      try {
        applyReview(await A.review(apiDraft.draftId));
      } catch (error) {
        // YZ okuması yapılamadı (stub 501 / 502 / zaman aşımı): taslak işaretleri ve yerel kontrollerle devam.
        fallbackError = error;
        lastReview = null;
        state.queue = apiSuggestions(apiDraft).filter(item => item.targets && item.targets.length);
      }
      readingBusy = false;
      save('Okuma tamamlandı');
      render();
      if (fallbackError) window.Api.ui.showError(sideBody, A.explain(fallbackError), { tone: 'info', position: 'before' });
      return;
    } catch (error) {
      readingBusy = false;
      state.queue = [];
      window.Api.ui.showError(sideBody, A.explain(error));
      return;
    }
  }

  function startReading() {
    if (readingBusy) return;
    if (A) { startReadingReal(); return; }
    readingBusy = true;
    confirmReady = false;
    state.pendingRead = false;
    state.reading += 1;
    state.done = [];
    clearRecent();
    sideBody.replaceChildren(Object.assign(el('div', 'sf-reading'), {}),);
    sideBody.firstChild.append(el('span', 'sf-spinner'), el('span', '', 'Hikâyen okunuyor…'));
    progress.hidden = true;
    doneBox.hidden = true;
    readingEl.textContent = '· ' + state.reading + '. okuma';
    setTimeout(() => {
      const isSample = state.reading === 1 && norm(state.draftText) === norm(S.story);
      state.queue = isSample ? sampleSuggestions() : checkSuggestions();
      readingBusy = false;
      save('Okuma tamamlandı');
      render();
    }, 1100);
  }

  // ─── Öneri sonuçlandırma ────────────────────────────────────────────────────
  function active() { return state.queue.find(item => item.status === 'pending'); }

  function complete(item, result) {
    item.status = 'done';
    state.done.push({ title: item.title, result });
    save();
    render();
    // E6-3: YZ önerisinin kararı sunucuya (accepted | own_words | skipped); metin değişikliği bir sonraki
    // okumada / "Hikâyem hazır"da yeni taslak sürümü olarak kaydedilir.
    if (A && item.sid) {
      const action = /^Geçildi$|^Değişiklik yapılmadı$/.test(result) ? 'skipped'
        : /alındı|Eklendi|kuruldu|güncelleyeceksin/i.test(result) ? 'accepted' : 'own_words';
      A.decide(item.sid, action).catch(error => window.Api.ui.showError(sideBody, error, { position: 'before' }));
    }
  }

  function buildStory() {
    const sentences = flat().map(x => x.s);
    const groups = [];
    for (let i = 0; i < sentences.length; i += 2) groups.push(sentences.slice(i, i + 2));
    if (groups.length > 1 && groups[groups.length - 1].length === 1) groups[groups.length - 2].push(groups.pop()[0]);
    return groups.map(g => g.map(s => Object.assign({}, s)));
  }

  function offerBuild() {
    if (readingBusy) return;
    state.queue = state.queue.filter(item => item.status !== 'pending' || item.kind === 'build');
    if (!state.queue.some(item => item.kind === 'build' && item.status === 'pending')) {
      // E6-4: kurulum kontrol listesi son YZ okumasından (build_checklist, tamamlanmamış maddeler); önizlemede örnek.
      const checklist = lastReview && Array.isArray(lastReview.build_checklist)
        ? lastReview.build_checklist.filter(c => !c.done).map(c => c.label + (c.hint ? ': ' + c.hint : ''))
        : (S ? S.buildChecklist : null);
      state.queue.push({ id: 'build-' + state.version, kind: 'build', badge: 'Hikâyemi kur', title: 'Kurulan hikâye', status: 'pending', checklist });
    }
    save();
    render();
  }

  // ─── Görünüm: hikâye ────────────────────────────────────────────────────────
  function sentenceNode(s, targets) {
    const span = el('span', 'sf-sentence');
    if (s.origin === 'suggestion') span.classList.add('is-suggested');
    if (s.recent) span.classList.add('is-recent');
    if (targets.includes(s.id)) span.classList.add('is-target');
    span.tabIndex = 0;
    span.title = (s.origin === 'suggestion' ? 'Öneriden geldi' : 'Senin cümlen') + ' · düzeltmek için tıkla';
    span.textContent = s.text;
    const open = () => openEditor(s.id);
    span.addEventListener('click', open);
    span.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    return span;
  }

  function editorNode(s) {
    const box = el('div', 'sf-inline-edit');
    const area = el('textarea', 'sf-textarea sf-textarea--small');
    area.value = editing.prefill != null ? editing.prefill : s.text;
    area.setAttribute('aria-label', 'Cümleyi düzelt');
    const actions = el('div', 'sf-actions');
    const ok = el('button', 'sf-btn sf-btn--small btn-primary', 'Kaydet');
    const del = el('button', 'sf-btn sf-btn--small', 'Cümleyi sil');
    const cancel = el('button', 'sf-btn sf-btn--small sf-btn--ghost', 'Vazgeç');
    [ok, del, cancel].forEach(b => { b.type = 'button'; });
    ok.addEventListener('click', () => {
      const value = area.value.trim();
      const cb = editing.onSave;
      const ids = editing.ids || [s.id];
      editing = null;
      if (value && norm(value) !== norm(ids.map(id => (find(id) || {}).s?.text).join(' '))) {
        replaceSentences(ids, value, 'candidate');
        if (cb) cb('changed'); else { save(); render(); }
      } else { if (cb) cb('same'); else render(); }
    });
    del.addEventListener('click', () => {
      const hit = find(s.id);
      editing = null;
      if (hit) { state.paragraphs[hit.pi].splice(hit.si, 1); state.paragraphs = state.paragraphs.filter(p => p.length); state.version += 1; }
      save('Cümle silindi');
      render();
    });
    cancel.addEventListener('click', () => { editing = null; render(); });
    actions.append(ok, del, cancel);
    box.append(area, actions);
    setTimeout(() => { area.focus(); area.setSelectionRange(area.value.length, area.value.length); }, 0);
    return box;
  }

  function openEditor(id, options) {
    editing = Object.assign({ id }, options || {});
    render();
  }

  function renderStory() {
    const current = active();
    const targets = current ? current.targets || [] : [];
    const frag = document.createDocumentFragment();
    state.paragraphs.forEach(paragraph => {
      const p = el('p');
      let editorAfter = null;
      paragraph.forEach((s, i) => {
        if (i) p.append(' ');
        p.appendChild(sentenceNode(s, targets));
        if (editing && editing.id === s.id) editorAfter = s;
      });
      frag.appendChild(p);
      if (editorAfter) frag.appendChild(editorNode(editorAfter));
    });
    storyHost.replaceChildren(frag);
    const n = F.words(storyText());
    versionEl.textContent = '· sürüm ' + state.version;
    metaEl.textContent = n + ' kelime · sesli anlatımda yaklaşık ' + F.speakRange(n) + '.';
  }

  // ─── Görünüm: öneri kartları ────────────────────────────────────────────────
  function button(label, cls, onClick, iconName) {
    const b = el('button', 'sf-btn sf-btn--small ' + (cls || ''));
    b.type = 'button';
    if (iconName) b.appendChild(F.icon(iconName));
    b.appendChild(el('span', 'sf-btn-label', label));
    b.addEventListener('click', onClick);
    return b;
  }

  function cardShell(item, variant) {
    const card = el('div', 'sf-sugg' + (variant ? ' sf-sugg--' + variant : ''));
    card.setAttribute('role', 'group');
    card.setAttribute('aria-label', item.badge + ': ' + item.title);
    const head = el('div', 'sf-sugg-head');
    head.append(el('span', 'sf-badge', item.badge), el('h3', 'sf-sugg-title', item.title));
    card.appendChild(head);
    return card;
  }

  function quoteTargets(item) {
    return (item.targets || []).map(id => (find(id) || {}).s?.text).filter(Boolean).join(' ');
  }

  function renderRewrite(item) {
    const card = cardShell(item);
    card.append(el('p', 'sf-sugg-proposal', item.proposal));
    if (item.why) card.append(el('p', 'sf-sugg-why', item.why));
    const actions = el('div', 'sf-actions');
    actions.append(
      button('Bu metni hikâyeme al', 'btn-primary', () => { replaceSentences(item.targets, item.proposal, 'suggestion'); complete(item, 'Hikâyene alındı'); }),
      button('Kendi sözlerimle düzelt', '', () => openEditor(item.targets[0], { ids: item.targets, prefill: quoteTargets(item), onSave: r => complete(item, r === 'changed' ? 'Kendi sözlerinle düzelttin' : 'Değişiklik yapılmadı') })),
      button('Geç', 'sf-btn--ghost', () => complete(item, 'Geçildi'))
    );
    card.append(actions);
    return card;
  }

  function renderAdd(item) {
    const card = cardShell(item, 'add');
    card.append(el('p', 'sf-sugg-question', item.question));
    if (item.example) {
      const ex = el('p', 'sf-sugg-text');
      ex.append(el('strong', '', 'Örneğin: '), document.createTextNode('“' + item.example + '”'));
      card.append(ex);
    }
    if (item.why) card.append(el('p', 'sf-sugg-why', item.why));
    const area = el('textarea', 'sf-textarea sf-textarea--small');
    area.placeholder = 'Kendi cümlelerinle yaz';
    area.setAttribute('aria-label', item.question);
    const status = el('p', 'sf-status');
    status.setAttribute('aria-live', 'polite');
    const add = button('Hikâyeme ekle', 'btn-primary', () => {
      const value = area.value.trim();
      if (!value) { status.textContent = 'Önce eklemek istediğin cümleyi yaz.'; status.classList.add('is-error'); return; }
      if (/\[[^\]]*\]/.test(value)) { status.textContent = 'Köşeli parantez içindeki yerleri kendi bilginle doldur.'; status.classList.add('is-error'); return; }
      insertAfter(item.targets[0], value, 'candidate');
      complete(item, 'Eklendi');
    });
    const dictate = button('Konuşarak yaz', '', () => {}, 'mic');
    F.dictation(dictate, text => { area.value += (area.value && !/\s$/.test(area.value) ? ' ' : '') + text; }, status);
    const actions = el('div', 'sf-actions');
    actions.append(add, dictate);
    if (item.example) actions.append(button('Örnekten başla', '', () => { area.value = item.example; area.focus(); status.textContent = 'Köşeli parantezli yerleri kendi bilginle değiştir.'; status.classList.remove('is-error'); }));
    actions.append(button('Geç', 'sf-btn--ghost', () => complete(item, 'Geçildi')));
    card.append(area, actions, status);
    return card;
  }

  function renderCvCard(item) {
    const card = cardShell(item, 'risk');
    card.append(el('p', 'sf-sugg-question', 'Hikâyende başka, CV’nde başka bir kurum yazıyor.'));
    const dl = el('dl', 'sf-compare');
    dl.append(el('dt', '', 'Hikâyen'), el('dd', '', quoteTargets(item) || item.storySays), el('dt', '', 'CV’n'), el('dd', '', '“' + item.cvSays + '”'));
    card.append(dl);
    if (item.why) card.append(el('p', 'sf-sugg-why', item.why));
    const actions = el('div', 'sf-actions');
    actions.append(
      button('Cümleyi düzelt', 'btn-primary', () => openEditor(item.targets[0], { onSave: r => complete(item, r === 'changed' ? 'Cümleyi düzelttin' : 'Değişiklik yapılmadı') })),
      button('Hikâye doğru, CV’mi güncelleyeceğim', '', () => {
        if (!state.openIssues.includes(item.openIssue)) state.openIssues.push(item.openIssue);
        complete(item, 'CV’ni güncelleyeceksin (açık konu olarak eklendi)');
        // E6-10: açık konu sunucuda kalıcı (3. adım ve danışman görür).
        if (A) A.saveOpenIssues(state.openIssues.map(text => ({ text, source: 'cv' })))
          .catch(error => window.Api.ui.showError(sideBody, error, { position: 'before' }));
      }),
      button('Geç', 'sf-btn--ghost', () => complete(item, 'Geçildi'))
    );
    card.append(actions);
    return card;
  }

  function renderFlow(item) {
    const card = cardShell(item, 'ok');
    card.append(el('p', 'sf-sugg-text', item.text));
    card.append(el('p', 'sf-sugg-proposal', '“' + (quoteTargets(item) || item.quote) + '”'));
    const actions = el('div', 'sf-actions');
    actions.append(
      button('Kendi sözlerimle böl', 'btn-primary', () => openEditor(item.targets[0], { onSave: r => complete(item, r === 'changed' ? 'Cümleyi böldün' : 'Değişiklik yapılmadı') })),
      button('Geç', 'sf-btn--ghost', () => complete(item, 'Geçildi'))
    );
    card.append(actions);
    return card;
  }

  function renderBuild(item) {
    const card = cardShell(item);
    card.append(el('p', 'sf-sugg-why', 'Yazdıklarının tamamını sırasını koruyarak paragraflara böldük. Yeni bilgi eklenmedi.'));
    const proposal = el('div', 'sf-sugg-proposal');
    buildStory().forEach(group => proposal.appendChild(Object.assign(el('p'), { textContent: group.map(s => s.text).join(' ') })));
    proposal.querySelectorAll('p').forEach(p => { p.style.margin = '0 0 .6rem'; });
    card.append(proposal);
    if (item.checklist && item.checklist.length) {
      const check = el('div', 'sf-checklist');
      check.append(el('strong', '', 'Kontrol et ve tamamla'));
      const ul = el('ul');
      item.checklist.forEach(text => ul.append(el('li', '', text)));
      check.append(ul);
      card.append(check);
    }
    const actions = el('div', 'sf-actions');
    actions.append(
      button('Bu metni hikâyem yap', 'btn-primary', () => {
        const groups = buildStory();
        groups.forEach(g => g.forEach(s => { s.recent = false; }));
        state.paragraphs = groups;
        state.version += 1;
        state.built = true;
        complete(item, 'Hikâyen paragraflara kuruldu');
      }),
      button('Kendi sözlerimle düzelt', '', () => { state.built = true; complete(item, 'Kendin düzenleyeceksin'); }),
      button('Geç', 'sf-btn--ghost', () => complete(item, 'Geçildi'))
    );
    card.append(actions);
    return card;
  }

  function renderSide() {
    if (readingBusy) return;
    const current = active();
    const total = state.queue.length;
    const doneCount = state.queue.filter(i => i.status === 'done').length;
    readingEl.textContent = state.reading ? '· ' + state.reading + '. okuma' : '';

    if (confirmReady) {
      const box = el('div', 'sf-info');
      const pending = state.queue.filter(i => i.status === 'pending').length;
      box.append(el('p', '', pending ? 'Bu okumada bekleyen ' + pending + ' öneri var. Yine de hikâyeni hazır saymak istiyor musun?' : 'Hikâyeni hazır sayıyoruz. Sonraki adımda çıktılarını hazırlayıp prova yapabilirsin.'));
      const actions = el('div', 'sf-actions');
      actions.append(button('Evet, hazır', 'btn-primary', finishReady), button('Önerilere dön', '', () => { confirmReady = false; render(); }));
      box.append(actions);
      sideBody.replaceChildren(box);
    } else if (current) {
      const renderers = { rewrite: renderRewrite, add: renderAdd, cv: renderCvCard, flow: renderFlow, build: renderBuild };
      sideBody.replaceChildren(renderers[current.kind](current));
    } else {
      const box = el('div', 'sf-info');
      if (!total) {
        box.textContent = state.reading > 1
          ? 'Bu okumada yeni öneri çıkmadı. Metnini son kez okuyup hazır sayabilirsin.'
          : 'Bu okumada öneri çıkmadı. İstersen hikâyeni paragraflara kurabilir ya da hazır sayabilirsin.';
      } else if (!state.built) {
        box.append(el('p', '', 'Bu okumadaki öneriler bitti. “Hikâyem hazır” demeden önce, yazdıklarının tamamından hikâyeni bir kez kurmanı öneririz.'));
        const actions = el('div', 'sf-actions');
        actions.append(button('Hikâyemi kur', 'btn-primary', offerBuild));
        box.append(actions);
      } else {
        box.textContent = 'Kurulan hikâyeyi değerlendirdin. Metnini son kez okuyup hazır sayabilirsin; istersen yeniden okutup yeni öneriler alabilirsin.';
      }
      sideBody.replaceChildren(box);
    }

    progress.hidden = !total;
    if (total) {
      progressBar.style.width = Math.round((doneCount / total) * 100) + '%';
      progressText.textContent = 'Tamamlanan öneri: ' + doneCount + ' / ' + total;
    }
    doneBox.hidden = !state.done.length;
    doneTitle.textContent = 'Bu okumada tamamlananlar (' + state.done.length + ')';
    doneList.replaceChildren(...state.done.map(d => el('li', '', d.title + ' — ' + d.result)));
  }

  // ─── CV bölümü ──────────────────────────────────────────────────────────────
  const cvHelp = root.querySelector('[data-cv-help]');
  const cvPickLabel = root.querySelector('[data-cv-pick-label]');
  const cvRemove = root.querySelector('[data-action="cv-remove"]');
  const factsWrap = root.querySelector('[data-cv-facts-wrap]');
  const factsHost = root.querySelector('[data-cv-facts]');

  function renderCv() {
    if (A) {
      // E6-1: karşılaştırma onaylı CV ile YZ okumasında yapılır (kind:'cv' önerileri).
      cvHelp.textContent = 'Onaylı CV’n varsa hikâyen her okumada CV’nle karşılaştırılır. CV’ni CV’m sayfasından yükleyip onaylayabilirsin.';
      cvPickLabel.textContent = 'CV’me git';
      cvRemove.hidden = true;
      factsWrap.hidden = false;
      return;
    }
    if (state.cv) {
      cvHelp.replaceChildren(Object.assign(el('span', 'sf-cv-file'), { textContent: state.cv.fileName }), document.createTextNode(' · Hikâyen her okumada CV’nle karşılaştırılır.'));
      cvPickLabel.textContent = 'CV’yi değiştir';
      cvRemove.hidden = false;
      factsWrap.hidden = false;
    } else {
      cvHelp.textContent = 'CV yüklersen hikâyeni CV’nle karşılaştırır, uyuşmayan yerleri gösteririz.';
      cvPickLabel.textContent = 'CV yükle';
      cvRemove.hidden = true;
      factsWrap.hidden = true;
    }
  }

  root.querySelector('[data-action="cv-pick"]').addEventListener('click', () => {
    if (A) { F.go('/cv'); return; }   // E6-1: CV yükleme / değiştirme CV'm sayfasında (/candidate/cv)
    F.pickCv(file => { state.cv = file; save(); renderCv(); }, cvHelp);
  });
  cvRemove.addEventListener('click', () => { state.cv = null; save(); renderCv(); });
  root.querySelector('[data-action="cv-suggest"]').addEventListener('click', async () => {
    // E6-2: gerçek oturumda onaylı CV'nin bilgileri (GET …/cv-facts); önizlemede örnek.
    let facts = S ? S.cv.facts : [];
    if (A) {
      try {
        const res = await A.cvFacts();
        if (!res || !res.cv_id) {
          factsHost.replaceChildren(el('p', 'sf-status', 'Önce CV’ni yükleyip onayla; ardından CV’ndeki bilgileri burada seçebilirsin.'));
          const link = el('a', '', 'CV’me git →');
          link.href = '/cv';
          link.setAttribute('data-nav-skip', '');
          factsHost.firstChild.append(' ', link);
          factsHost.hidden = false;
          return;
        }
        facts = (res.items || []).map(f => ({ id: f.id, text: f.text + (f.cv_section ? ' (CV › ' + f.cv_section + ')' : '') }));
      } catch (error) {
        window.Api.ui.showError(factsHost, error);
        factsHost.hidden = false;
        return;
      }
    }
    if (!facts.length) { factsHost.replaceChildren(el('p', 'sf-status', 'CV’nde öneri olarak kullanılabilecek bilgi bulunamadı.')); factsHost.hidden = false; return; }
    const list = el('ul', 'sf-facts');
    facts.forEach(f => {
      const li = el('li');
      const label = el('label');
      const box = el('input');
      box.type = 'checkbox';
      box.value = f.id;
      label.append(box, document.createTextNode(f.text));
      li.append(label);
      list.append(li);
    });
    const go = button('Seçtiklerim için öneri al', 'btn-primary', () => {
      const picked = Array.from(list.querySelectorAll('input:checked')).map(i => facts.find(f => f.id === i.value));
      if (!picked.length) return;
      const last = flat()[flat().length - 1].s.id;
      const cards = picked.map(f => ({ id: 'cvf-' + f.id + '-' + state.version, kind: 'add', badge: 'CV’nden', title: 'CV bilgisi', targets: [last],
        question: 'CV’nde “' + f.text.replace(/\s*\(CV.*\)$/, '') + '” var. Hikâyende kullanmak istersen kendi cümlenle yaz.', why: 'Bu bilgi yalnızca sen yazarsan hikâyeye girer.', status: 'pending' }));
      state.queue = cards.concat(state.queue);
      factsHost.hidden = true;
      save();
      render();
    });
    go.style.marginTop = '.75rem';
    factsHost.replaceChildren(list, go);
    factsHost.hidden = false;
  });

  // ─── Kendi eklemesi ─────────────────────────────────────────────────────────
  const ownText = root.querySelector('[data-own-text]');
  const ownStatus = root.querySelector('[data-own-status]');
  root.querySelector('[data-action="own-add"]').addEventListener('click', () => {
    const value = ownText.value.trim();
    if (!value) { ownStatus.textContent = 'Önce eklemek istediğin metni yaz.'; ownStatus.classList.add('is-error'); return; }
    const last = flat()[flat().length - 1];
    insertAfter(last.s.id, value, 'candidate');
    ownText.value = '';
    ownStatus.textContent = 'Hikâyenin sonuna eklendi.';
    ownStatus.classList.remove('is-error');
    save();
    render();
  });
  F.dictation(root.querySelector('[data-action="own-dictate"]'), text => { ownText.value += (ownText.value && !/\s$/.test(ownText.value) ? ' ' : '') + text; }, ownStatus);

  // ─── Alt düğmeler ───────────────────────────────────────────────────────────
  root.querySelector('[data-action="reread"]').addEventListener('click', () => { editing = null; startReading(); });
  root.querySelector('[data-action="build"]').addEventListener('click', offerBuild);
  root.querySelector('[data-action="ready"]').addEventListener('click', () => { confirmReady = true; render(); sideBody.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });

  async function finishReady() {
    if (A) {
      // K103: son metin yeni taslak sürümü olarak kaydedilir (değişmediyse istek yok), sonra 3. adım.
      try {
        apiDraft = await A.saveText(apiDraft, storyText());
        state.draftId = apiDraft.draftId;
        state.version = apiDraft.versionNo || state.version;
      } catch (error) {
        window.Api.ui.showError(sideBody, error);
        return;
      }
    }
    state.ready = true;
    state.draftText = storyText();
    save('Hikâyen hazır olarak kaydedildi');
    F.go('/hikaye/hazir');
  }

  function render() {
    renderStory();
    renderSide();
  }

  // K103: gerçek oturumda çalışma metni son API taslağından kurulur; onaylanmış hikâye 3. adımda salt okunur.
  async function initReal() {
    try {
      const st = await A.load();
      window.Journey.refreshSidebar?.(st.ctx).catch(() => {});
      if (!st.storyId || !st.draft) { F.go('/hikaye/yaz'); return; }
      if (A.completed(st.status)) { F.go('/hikaye/hazir'); return; }
      apiDraft = st.draft;
      const apiText = A.textOf(apiDraft);
      const sameStory = state.storyId === st.storyId && state.draftId === apiDraft.draftId && state.paragraphs && state.paragraphs.length;
      if (!sameStory) {
        const paragraphs = A.paragraphs(apiText, apiDraft);
        state = Object.assign(F.store.load(), {
          storyId: st.storyId, draftId: apiDraft.draftId, draftText: apiText, paragraphs, seq: paragraphs.flat().length,
          version: apiDraft.versionNo || 1, reading: 0, queue: [], done: [], built: false, openIssues: [], ready: false,
          pendingRead: true
        });
        F.store.save(state);
      }
      // E6-10: kalıcı açık konular (başka cihazda / yenilemede kaybolmaz).
      const issues = await A.getOpenIssues().catch(() => null);
      if (issues) { state.openIssues = issues.map(i => i.text); F.store.save(state); }
      // Sayfa yenilendiyse: bu taslağın son okuması (kararlarıyla) geri yüklenir; yoksa yeni okuma yapılır.
      if (!state.pendingRead) {
        const previous = await A.latestReview(apiDraft.draftId).catch(() => null);
        if (previous) {
          if (!sameStory || !state.queue || !state.queue.length) {
            state.paragraphs = A.paragraphs(apiText, apiDraft);
            state.seq = state.paragraphs.flat().length;
          }
          applyReview(previous);
          F.store.save(state);
        } else if (!state.queue || !state.queue.length) {
          state.pendingRead = true;
        }
      }
    } catch (error) {
      window.Api.ui.showError(sideBody, error);
      return;
    }
    renderCv();
    render();
    if (state.pendingRead) startReading();
  }

  if (A) { initReal(); return; }
  renderCv();
  render();
  if (state.pendingRead) startReading();
})();
