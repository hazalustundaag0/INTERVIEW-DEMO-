// hikaye-hazir.js — 3. adım: "Hikâyem hazır" (/hikaye/hazir). Sekmeler: Hikâyem · Çıktılarım · Prova.
// ÖRNEK VERİ: Çıktılar ve prova, adayın son hikâye metnindeki cümlelerden seçilerek oluşturulur (hikâyede olmayan
// bilgi eklenmez; eksik alan [bilgi gerekli] olarak kalır). Yapay zekâ servisi bağlanınca bu üretim API'ye taşınır.
// "Sen anlat" ölçümü tarayıcının konuşma tanımasıyla yapılır; ses kaydı tutulmaz. Vurgu (ses tonu) ölçümü servisle gelecek.
(function () {
  'use strict';
  const F = window.StoryFlow;
  const S = window.StoryFlowSample;
  const el = F.el;
  const root = document.querySelector('.sf-root');
  const $ = sel => root.querySelector(sel);

  const A = window.StoryFlowApi || null;   // K103: gerçek oturumda API (önizlemede null)
  let state = F.store.load();
  let api = null;                          // gerçek oturum: { storyId, status, draft, outputs, outputsStale }
  let subs = null;                         // gerçek oturum: GET …/submissions (E6-9)
  F.stepper($('[data-stepper]'), 3);

  if (A) initReal(); else main();

  // K103: gerçek oturumda metin, sürüm, çıktılar ve onay durumu API'den (eski hikaye-aday.js işlevleri).
  async function initReal() {
    try {
      api = await A.load();
      window.Journey.refreshSidebar?.(api.ctx).catch(() => {});
      if (!api.storyId || !api.draft) { state = Object.assign(F.store.load(), { paragraphs: [] }); main(); return; }
      subs = await A.submissions().catch(() => null);
      const text = A.textOf(api.draft);
      state = Object.assign(F.store.load(), {
        storyId: api.storyId, draftId: api.draft.draftId, draftText: text, paragraphs: A.paragraphs(text, api.draft),
        version: api.draft.versionNo || 1
      });
      // E6-10: açık konular sunucudan (kalıcı); kaynak bilgisi kaldırma için saklanır.
      const issues = await A.getOpenIssues().catch(() => null);
      if (issues) { state.openIssues = issues.map(i => i.text); state.openIssueItems = issues; }
      if (!Array.isArray(state.openIssues)) state.openIssues = [];
      F.store.save(state);
    } catch (error) {
      window.Api.ui.showError(root, error);
      return;
    }
    main();
  }

  function main() {
  if (!state.paragraphs || !state.paragraphs.length) {
    $('[data-empty]').hidden = false;
    $('.sf-topline .sf-home-link').href = '/hikaye/yaz';
    $('.sf-topline .sf-home-link').lastChild.textContent = 'Hikâyeni yaz';
    return;
  }
  $('[data-ready]').hidden = false;

  const sentences = state.paragraphs.flat().map(s => s.text);
  const storyText = () => state.paragraphs.map(p => p.map(s => s.text).join(' ')).join('\n\n');
  const wordCount = F.words(storyText());

  // ─── Sekmeler ───────────────────────────────────────────────────────────────
  const tabs = Array.from(root.querySelectorAll('[role="tab"]'));
  function selectTab(name, focus) {
    tabs.forEach(tab => {
      const on = tab.dataset.tab === name;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden = !on;
      if (on && focus) tab.focus();
    });
    history.replaceState(null, '', '#' + name);
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(tab.dataset.tab));
    tab.addEventListener('keydown', e => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      selectTab(tabs[(i + d + tabs.length) % tabs.length].dataset.tab, true);
    });
  });
  const initial = location.hash.replace('#', '');
  selectTab(tabs.some(t => t.dataset.tab === initial) ? initial : 'hikaye');

  async function copy(text, button) {
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (error) { ok = false; }
    const label = button.querySelector('.sf-btn-label') || button;
    const prev = label.textContent;
    label.textContent = ok ? 'Kopyalandı' : 'Kopyalanamadı';
    setTimeout(() => { label.textContent = prev; }, 1600);
  }

  // ─── Hikâyem ────────────────────────────────────────────────────────────────
  $('[data-version]').textContent = '· sürüm ' + state.version;
  const finalHost = $('[data-final-story]');
  state.paragraphs.forEach(p => finalHost.appendChild(el('p', '', p.map(s => s.text).join(' '))));
  $('[data-prova-note]').textContent = 'Prova notu: Metin ' + wordCount + ' kelime. Dakikada 120–140 kelimelik varsayımsal tempoda yaklaşık ' +
    F.speakRange(wordCount) + ' sürer; süre sesli provayla doğrulanmalıdır.';
  $('[data-action="copy-story"]').addEventListener('click', e => copy(storyText(), e.currentTarget));

  // E6-10: açık konular; gerçek oturumda "Tamamlandı" ile listeden çıkarılır (PUT …/open-issues).
  function renderOpenIssues() {
    const list = state.openIssues || [];
    $('[data-open-issues]').hidden = !list.length;
    $('[data-open-list]').replaceChildren(...list.map((t, i) => {
      const li = el('li', '', t);
      if (A && !isCompleted()) {
        const done = el('button', 'sf-link-btn', 'Tamamlandı');
        done.type = 'button';
        done.setAttribute('data-nav-skip', '');
        done.setAttribute('data-action', 'open-issue-done');
        done.style.marginLeft = '.5rem';
        done.addEventListener('click', async () => {
          const items = (state.openIssueItems || list.map(text => ({ text, source: 'cv' }))).filter((_, k) => k !== i);
          try {
            const saved = await window.Api.ui.withLoading(done, () => A.saveOpenIssues(items));
            state.openIssueItems = saved;
            state.openIssues = saved.map(x => x.text);
            F.store.save(state);
            renderOpenIssues();
          } catch (error) {
            window.Api.ui.showError($('[data-open-issues]'), error);
          }
        });
        li.append(done);
      }
      return li;
    }));
  }

  const consent = $('[data-consent]');
  const sendBtn = $('[data-action="send"]');
  const isCompleted = () => Boolean(A && api && A.completed(api.status));
  renderOpenIssues();
  if (isCompleted()) root.querySelectorAll('a[href="/hikaye/oneriler"]').forEach(a => { a.hidden = true; });
  // E6-9: "Danışmanıma gönder" = POST …/submissions (oturumu kilitlemez). Nihai onay (POST …/finalize → COMPLETED)
  // ayrı adımdır ve yalnız 2. seans tamamlandıktan sonra görünür.
  const secondDone = () => Boolean(api && api.ctx && (api.ctx.sessions || []).some(x => x.sequence_no >= 2 && x.status === 'completed'));
  let finalBox = null;
  function ensureFinalBox() {
    if (finalBox) return finalBox;
    finalBox = el('div', 'sf-box sf-box--soft');
    finalBox.setAttribute('data-final-box', '');
    finalBox.append(el('h3', '', 'Hikâyeni onayla'),
      el('p', '', 'İkinci seansın tamamlandı. Hikâyeni onayladığında son hâli danışmanınla paylaşılır ve metin artık değiştirilemez.'));
    const actions = el('div', 'sf-actions');
    const btn = el('button', 'sf-btn btn-primary', 'Hikâyemi onayla');
    btn.type = 'button';
    btn.setAttribute('data-action', 'finalize');
    btn.addEventListener('click', () => finalizeReal(btn));
    actions.append(btn);
    finalBox.append(actions, el('p', 'sf-status'));
    $('[data-sent-box]').insertAdjacentElement('afterend', finalBox);
    return finalBox;
  }
  function renderSend() {
    if (A) {
      const done = isCompleted();
      const status = $('[data-send-status]');
      status.textContent = '';
      status.classList.remove('is-error');
      if (done) {
        $('[data-send-box]').hidden = true;
        $('[data-sent-box]').hidden = false;
        $('[data-sent-text]').textContent = 'Sürüm ' + state.version + ' onaylandı ve danışmanınla paylaşıldı. Onaylanan hikâye değiştirilemez.';
        if (finalBox) finalBox.hidden = true;
        return;
      }
      const items = ((subs && subs.items) || []).slice().sort((a, b) => b.submission_no - a.submission_no);
      const latest = items[0] || null;
      const sentCurrent = Boolean(latest && latest.draft_id === api.draft.draftId && !(subs && subs.needs_resubmit));
      $('[data-send-box]').hidden = sentCurrent;
      $('[data-sent-box]').hidden = !sentCurrent;
      if (sentCurrent) {
        const when = new Date(latest.submitted_at).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
        $('[data-sent-text]').textContent = 'Sürüm ' + (latest.version_no || state.version) + ' danışmanına gönderildi · ' + when;
      } else if (latest) {
        status.textContent = 'Daha önce sürüm ' + (latest.version_no || '?') + ' gönderilmişti. Hikâyeni değiştirdiğin için yeni sürümü yeniden göndermelisin.';
        status.classList.add('is-error');
      }
      if (secondDone()) ensureFinalBox().hidden = false;
      return;
    }
    const sent = state.sent && state.sent.version === state.version;
    $('[data-send-box]').hidden = sent;
    $('[data-sent-box]').hidden = !sent;
    if (sent) {
      const when = new Date(state.sent.at).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
      $('[data-sent-text]').textContent = 'Sürüm ' + state.sent.version + ' danışmanına gönderildi · ' + when;
    } else if (state.sent) {
      $('[data-send-status]').textContent = 'Daha önce sürüm ' + state.sent.version + ' gönderilmişti. Hikâyeni değiştirdiğin için yeni sürümü yeniden onaylayıp göndermelisin.';
    }
  }
  consent.addEventListener('change', () => { sendBtn.disabled = !consent.checked; });
  async function sendReal() {
    // QA-018: tasarımın onay diyaloğu; E6-9 gönderim kilitlemez.
    const ok = await A.askConfirm({
      title: 'Bu sürümü danışmanına gönderelim mi?',
      text: 'Danışmanın ikinci seanstan önce yalnızca gönderdiğin sürümü (sürüm ' + state.version + ') okur. Gönderdikten sonra da hikâyeni düzenleyebilirsin; değişiklikleri yeniden göndermen gerekir.',
      okLabel: 'Evet, gönder'
    });
    sendBtn.focus();
    if (!ok) return;
    window.Api.ui.clearError($('[data-send-box]'));
    try {
      await window.Api.ui.withLoading(sendBtn, async () => {
        await A.submit(api.draft.draftId);
        subs = await A.submissions();
      }, { text: 'Gönderiliyor…' });
      $('[data-autosave]').textContent = 'Danışmanına gönderildi';
      renderSend();
    } catch (error) {
      window.Api.ui.showError($('[data-send-box]'), A.explain(error));
    }
  }

  async function finalizeReal(btn) {
    const ok = await A.askConfirm({
      title: 'Hikâyeni onaylıyor musun?',
      text: 'Onayladığında hikâyen tamamlanır ve danışmanınla son hâli paylaşılır. Onaydan sonra hikâye metni değiştirilemez.',
      okLabel: 'Evet, onayla'
    });
    btn.focus();
    if (!ok) return;
    const status = finalBox.querySelector('.sf-status');
    window.Api.ui.clearError(finalBox);
    try {
      await window.Api.ui.withLoading(btn, async () => {
        // Onay SUMMARY_READY ister: bu taslağın çıktıları yoksa önce üretilir (YZ ≤ 70 sn).
        if (api.status !== 'SUMMARY_READY' || !api.outputs || api.outputsStale) {
          status.textContent = 'Çıktıların hazırlanıyor… (1 dakikayı bulabilir)';
          api = await A.generateOutputs();
        }
        await A.finalize(api.draft.draftId);
        api = await A.load(lang);
      }, { text: 'Onaylanıyor…' });
      status.textContent = '';
      $('[data-autosave]').textContent = 'Hikâyen onaylandı';
      renderSend();
      makeBtn.hidden = true;
    } catch (error) {
      status.textContent = '';
      window.Api.ui.showError(finalBox, A.explain(error));
    }
  }

  sendBtn.addEventListener('click', () => {
    if (!consent.checked) return;
    if (A) { sendReal(); return; }
    state.sent = { version: state.version, at: Date.now() };
    F.store.save(state);
    $('[data-autosave]').textContent = 'Danışmanına gönderildi';
    renderSend();
  });
  renderSend();

  // ─── Çıktılarım ─────────────────────────────────────────────────────────────
  const idx = (re, not) => sentences.findIndex((t, i) => re.test(t) && !(not || []).includes(i));
  const pick = list => Array.from(new Set(list.filter(i => i >= 0))).sort((a, b) => a - b);
  const textOf = list => list.map(i => sentences[i]).join(' ');
  const GAP = '[bilgi gerekli]';

  function buildOutputs() {
    const goal = idx(/(hedef|amacım|istiyorum)/i);
    const work = idx(/(proje|toplantı|müşteri|analiz|ekip)/i, [0]);
    const skill = idx(/(edindim|öğrendim|çalışıyorum|pratik|geliştirdim)/i, [0, work]);
    const trait = idx(/(seven|biriyim|seviyorum)/i);
    const growth = idx(/gelişim/i);
    const challenge = idx(/(zor|sorun|gelişim)/i);
    const result = idx(/(sayesinde|sonucunda|hızlandı|arttı|azaldı|kazandır)/i);
    const learn = idx(/(öğrendim|kazandırdı|sebep oldu|anlamama)/i);
    const removed = [];
    const out = [];

    const summary = pick([0, work, trait, goal]);
    if (summary.length >= 3) out.push({ title: 'Kısa özet (kısa tanışma)', paras: [textOf(summary)], src: summary });
    else removed.push('Kısa özet yazılamadı: hikâyedeki bilgiyle 3–4 cümlelik bir metin çıkmadı.');

    const cv = pick([0, work, skill, goal]).slice(0, 4);
    out.push({ title: 'CV özet paragrafı', paras: [textOf(cv)], src: cv });

    const qa = [];
    const intro = pick([0, work, trait, goal]);
    qa.push({ q: 'Kendini tanıtır mısın?', a: textOf(intro), src: intro });
    if (goal >= 0) { const s = pick([goal, trait]); qa.push({ q: 'Neden bu rolü hedefliyorsun?', a: textOf(s), src: s }); }
    else removed.push('“Neden bu rolü hedefliyorsun?” cevabı çıkarıldı: hikâyede bir hedef cümlesi yok.');
    if (growth >= 0) { const s = pick([growth, skill]); qa.push({ q: 'Gelişim alanın nedir?', a: textOf(s), src: s }); }
    else removed.push('“Gelişim alanın nedir?” cevabı çıkarıldı: hikâyede gelişim alanı geçmiyor.');
    out.push({ title: 'Mülakat cevap taslakları', qa, wide: true, src: pick(qa.flatMap(x => x.src)) });

    let roleName = '';
    if (goal >= 0 && / olmak/i.test(sentences[goal])) {
      const before = sentences[goal].split(/ olmak/i)[0].split(/ bir /i);
      roleName = before.length > 1 ? before[before.length - 1].split(' ').slice(-6).join(' ') : '';
    }
    const roleSrc = pick(sentences.map((t, i) => (/(proje|analiz|müşteri|developer|kod|ekip)/i.test(t) ? i : -1)).concat([goal]));
    out.push({ title: 'Rol sürümü' + (roleName ? ' · ' + roleName : ''), paras: [textOf(roleSrc)], src: roleSrc });

    const row = (label, i) => [label, i >= 0 ? sentences[i] : GAP];
    out.push({ title: 'Hikâye iskeleti', dl: [row('Karakter', 0), row('Hedef', goal), row('Zorluk', challenge), row('Çözüm', skill)], src: pick([0, goal, challenge, skill]) });
    out.push({ title: 'Etki analizi', dl: [row('Olay', work), row('Katkı', skill), row('Sonuç', result), row('Öğrenme', learn)], src: pick([work, skill, result, learn]) });

    const gaps = [goal, challenge, skill, work, result, learn].filter(i => i < 0).length;
    if (gaps) removed.push('İskelet ve etki analizinde ' + gaps + ' alan hikâyede karşılığı olmadığı için [bilgi gerekli] olarak bırakıldı.');
    return { out, removed };
  }

  function gapNode(text) {
    if (text !== GAP) return document.createTextNode(text);
    return el('span', 'sf-gap', GAP);
  }

  function outputCard(o) {
    const card = el('div', 'sf-output' + (o.wide ? ' sf-output--wide' : ''));
    const head = el('div', 'sf-output-head');
    const btn = el('button', 'sf-btn sf-btn--small sf-icon-btn');
    btn.type = 'button';
    btn.append(F.icon('content_copy'), el('span', 'sf-btn-label', 'Kopyala'));
    head.append(el('h3', '', o.title), btn);
    card.append(head);
    let plain = '';
    if (o.paras) o.paras.forEach(t => { card.append(el('p', '', t)); plain += t + '\n'; });
    if (o.qa) {
      const box = el('div', 'sf-qa');
      o.qa.forEach(x => { box.append(el('h4', '', x.q), el('p', '', x.a)); plain += x.q + '\n' + x.a + '\n\n'; });
      card.append(box);
    }
    if (o.dl) {
      const dl = el('dl');
      o.dl.forEach(([k, v]) => { const dd = el('dd'); dd.append(gapNode(v)); dl.append(el('dt', '', k), dd); plain += k + ': ' + v + '\n'; });
      card.append(dl);
    }
    const src = el('p', 'sf-source', 'Kaynak: hikâyenin ' + (o.src.length ? o.src.map(i => i + 1).join('., ') + '. cümlesi' : '—'));
    src.hidden = !showSources;
    card.append(src);
    btn.addEventListener('click', () => copy(plain.trim(), btn));
    return card;
  }

  let lang = 'tr';
  let showSources = false;
  const outHost = $('[data-outputs]');
  const outStatus = $('[data-outputs-status]');
  const srcBtn = $('[data-action="toggle-sources"]');
  const printBtn = $('[data-action="print"]');

  // E6-5/E6-6 (Etap 6): çıktılar TR/EN (GET …/outputs?language=), rol sürümü ve etki analizi türleri, her çıktının
  // dayandığı taslak cümle numaraları (source_sentence_nos, 1 tabanlı → kartta 0 tabanlı indeks).
  const paras = text => String(text || '').split(/\n+/).map(t => t.trim()).filter(Boolean);
  const srcOf = o => (o && Array.isArray(o.source_sentence_nos) ? o.source_sentence_nos.map(n => n - 1) : []);
  function apiOutputCards(vm) {
    const out = [];
    // Etap 14 (TC-ADAY-12-008): 30 ve 60 saniyelik tanıtımlar ayrı kartlar (pitch_30s / pitch_60s).
    const en = vm.language === 'en';
    if (vm.shortSummary) out.push({ title: en ? 'Short summary (intro)' : 'Kısa özet (kısa tanışma)', paras: paras(vm.shortSummary.content), src: srcOf(vm.shortSummary) });
    if (vm.pitch30) out.push({ title: en ? '30-second pitch' : '30 saniyelik özet', paras: paras(vm.pitch30.content), src: srcOf(vm.pitch30) });
    if (vm.pitch60) out.push({ title: en ? '60-second pitch' : '60 saniyelik özet', paras: paras(vm.pitch60.content), src: srcOf(vm.pitch60) });
    if (vm.cvSummary) out.push({ title: en ? 'CV summary paragraph' : 'CV özet paragrafı', paras: paras(vm.cvSummary.content), src: srcOf(vm.cvSummary) });
    if (vm.interviewAnswers.length) {
      // GAP-B07: Output soruyu taşımıyor → "Mülakat cevabı N".
      out.push({ title: en ? 'Interview answer drafts' : 'Mülakat cevap taslakları', wide: true,
        src: pick(vm.interviewAnswers.flatMap(srcOf)),
        qa: vm.interviewAnswers.map(a => ({ q: (vm.language === 'en' ? 'Interview answer ' : 'Mülakat cevabı ') + a.item_no, a: a.content })) });
    }
    if (vm.roleVersion) out.push({ title: en ? 'Role version' : 'Rol sürümü', paras: paras(vm.roleVersion.content), src: srcOf(vm.roleVersion) });
    if (vm.skeleton) out.push({ title: en ? 'Story skeleton' : 'Hikâye iskeleti', paras: paras(vm.skeleton.content), src: srcOf(vm.skeleton) });
    if (vm.impactAnalysis) out.push({ title: en ? 'Impact analysis' : 'Etki analizi', paras: paras(vm.impactAnalysis.content), src: srcOf(vm.impactAnalysis) });
    return out;
  }

  function renderApiOutputs() {
    const vm = api && !api.outputsStale ? api.outputs : null;
    if (!vm || vm.isEmpty) {
      outHost.replaceChildren();
      srcBtn.hidden = printBtn.hidden = true;
      outStatus.textContent = api && api.outputsStale
        ? 'Hikâyeni değiştirdin; çıktılarını güncellemek için yeniden hazırla.'
        : (lang === 'en' ? 'İngilizce çıktıların henüz hazırlanmadı.' : '');
      return false;
    }
    const grid = el('div', 'sf-outputs');
    apiOutputCards(vm).forEach(o => grid.append(outputCard(o)));
    const notes = (vm.issues || []).map(A.issueText).filter(Boolean);
    // Etap 14 (TC-ADAY-12-001/009): EN istenip metin Türkçe kaldıysa açık uyarı (gerçek çeviri gerçek YZ ile, K117).
    if (vm.untranslated) notes.unshift('İngilizce çıktıların bir kısmı henüz çevrilemedi ve Türkçe gösteriliyor. Bu ortamda yapay zekâ çevirisi kapalı; başlıklar İngilizce, metinler hikâyendeki cümlelerdir.');
    const frag = document.createDocumentFragment();
    if (notes.length) {
      const box = el('div', 'sf-box sf-box--warn');
      box.style.marginTop = '1rem';
      box.append(el('h3', '', 'Metin önerileri'));
      const ul = el('ul');
      notes.forEach(t => ul.append(el('li', '', t)));
      box.append(ul);
      frag.append(box);
    }
    frag.append(grid);
    outHost.replaceChildren(frag);
    outStatus.textContent = '';
    printBtn.hidden = false;
    srcBtn.hidden = false;   // E6-6
    return true;
  }

  root.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', async () => {
    lang = b.dataset.lang;
    root.querySelectorAll('[data-lang]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    if (!A || !api || !api.draft) return;
    // E6-5: seçilen dildeki mevcut çıktılar.
    window.Api.ui.clearError(outHost.parentElement);
    try {
      const res = await A.outputsFor(api.storyId, api.draft.draftId, lang);
      api.outputs = res.vm;
      api.outputsStale = res.stale;
      makeBtn.textContent = renderApiOutputs() ? 'Yeniden hazırla' : 'Çıktıları hazırla';
    } catch (error) {
      window.Api.ui.showError(outHost.parentElement, error);
    }
  }));

  const makeBtn = $('[data-action="make-outputs"]');
  if (A) {
    if (renderApiOutputs()) makeBtn.textContent = 'Yeniden hazırla';
    if (isCompleted()) makeBtn.hidden = true;   // onaylanan hikâyenin çıktıları sabittir
  }

  makeBtn.addEventListener('click', async e => {
    const btn = e.currentTarget;
    outStatus.classList.remove('is-error');
    if (A) {
      // K103: POST …/outputs/generate (YZ ≤ 70 sn) → GET …/outputs.
      window.Api.ui.clearError(outHost.parentElement);
      outStatus.replaceChildren(el('span', 'sf-spinner'), document.createTextNode(' Çıktıların hazırlanıyor… (1 dakikayı bulabilir)'));
      try {
        api = await window.Api.ui.withLoading(btn, () => A.generateOutputs(lang), { text: 'Hazırlanıyor…' });
        if (renderApiOutputs()) btn.textContent = 'Yeniden hazırla';
      } catch (error) {
        outStatus.textContent = '';
        window.Api.ui.showError(outHost.parentElement, A.explain(error));
      }
      return;
    }
    if (lang === 'en') {
      outHost.replaceChildren();
      srcBtn.hidden = printBtn.hidden = true;
      outStatus.textContent = 'İngilizce çıktılar yapay zekâ servisi bağlanınca hazırlanacak; örnek veride yalnızca Türkçe var.';
      return;
    }
    btn.disabled = true;
    outStatus.replaceChildren(el('span', 'sf-spinner'), document.createTextNode(' Çıktıların hazırlanıyor…'));
    outStatus.style.display = 'flex'; outStatus.style.alignItems = 'center'; outStatus.style.gap = '.5rem';
    setTimeout(() => {
      const { out, removed } = buildOutputs();
      const frag = document.createDocumentFragment();
      if (removed.length) {
        const box = el('div', 'sf-box sf-box--warn');
        box.style.marginTop = '1rem';
        box.append(el('h3', '', 'Çıkarılanlar'));
        const ul = el('ul');
        removed.forEach(t => ul.append(el('li', '', t)));
        box.append(ul);
        frag.append(box);
      }
      const grid = el('div', 'sf-outputs');
      out.forEach(o => grid.append(outputCard(o)));
      frag.append(grid);
      outHost.replaceChildren(frag);
      outStatus.textContent = '';
      outStatus.style.display = '';
      srcBtn.hidden = printBtn.hidden = false;
      btn.disabled = false;
      btn.textContent = 'Yeniden hazırla';
      state.outputsAt = Date.now();
      F.store.save(state);
    }, 900);
  });

  srcBtn.addEventListener('click', () => {
    showSources = !showSources;
    srcBtn.setAttribute('aria-pressed', String(showSources));
    srcBtn.textContent = showSources ? 'Cümle kaynaklarını gizle' : 'Cümle kaynaklarını göster';
    outHost.querySelectorAll('.sf-source').forEach(p => { p.hidden = !showSources; });
  });
  printBtn.addEventListener('click', () => window.print());
  // E6-16 (Etap 12): sunucu PDF'i — seçili dilde (Bearer ile blob indirme). Tarayıcı yazdırması da kalır.
  let pdfBtn = null;
  if (A) {
    pdfBtn = el('button', 'sf-btn sf-btn--small');
    pdfBtn.type = 'button';
    pdfBtn.setAttribute('data-action', 'download-pdf');
    pdfBtn.setAttribute('data-nav-skip', '');
    pdfBtn.append(F.icon('picture_as_pdf'), el('span', 'sf-btn-label', 'PDF indir'));
    pdfBtn.hidden = printBtn.hidden;
    printBtn.insertAdjacentElement('afterend', pdfBtn);
    new MutationObserver(() => { pdfBtn.hidden = printBtn.hidden; }).observe(printBtn, { attributes: true, attributeFilter: ['hidden'] });
    pdfBtn.addEventListener('click', async () => {
      window.Api.ui.clearError(outHost.parentElement);
      try {
        await window.Api.ui.withLoading(pdfBtn, () => A.outputsPdf(lang), { text: 'Hazırlanıyor…' });
      } catch (error) {
        window.Api.ui.showError(outHost.parentElement, A.explain(error));
      }
    });
  }

  // ─── Prova metni ────────────────────────────────────────────────────────────
  const TONES = ['sıcak', 'kendinden emin', 'içten', 'kararlı', 'sakin'];
  function emphasize(sentence) {
    const words = sentence.split(' ');
    const marks = new Set();
    words.forEach((w, i) => { if (/\d/.test(w)) { marks.add(i); if (words[i + 1]) marks.add(i + 1); } });
    let best = -1, bestLen = 0;
    for (let i = 0; i < words.length - 1; i++) {
      const len = words[i].replace(/[^\p{L}]/gu, '').length + words[i + 1].replace(/[^\p{L}]/gu, '').length;
      if (len > bestLen) { best = i; bestLen = len; }
    }
    if (best >= 0) { marks.add(best); marks.add(best + 1); }
    const frag = document.createDocumentFragment();
    let run = [];
    let bold = null;
    const flush = () => { if (!run.length) return; frag.append(bold ? el('strong', '', run.join(' ')) : document.createTextNode(run.join(' '))); run = []; };
    words.forEach((w, i) => {
      const b = marks.has(i);
      if (bold !== null && b !== bold) { flush(); frag.append(' '); }
      bold = b;
      run.push(w);
    });
    flush();
    return frag;
  }

  // E6-7 (Etap 12): gerçek oturumda prova metni sunucudan (GET …/rehearsal-script): vurgu aralıkları cümle içi
  // karakter konumu, durak short|long, ton. Taslakta olmayan bilgi eklenmez (BR-01).
  const TONE_TR = { neutral: 'sakin', confident: 'kendinden emin', serious: 'ciddi', warm: 'sıcak' };
  function scriptLine(line) {
    const frag = document.createDocumentFragment();
    const text = String(line.text || '');
    const ranges = (line.emphasis || []).filter(r => r.end > r.start).sort((a, b) => a.start - b.start);
    let pos = 0;
    ranges.forEach(r => {
      if (r.start < pos) return;
      if (r.start > pos) frag.append(document.createTextNode(text.slice(pos, r.start)));
      frag.append(el('strong', '', text.slice(r.start, r.end)));
      pos = r.end;
    });
    if (pos < text.length) frag.append(document.createTextNode(text.slice(pos)));
    frag.append(' ');
    if (line.pause === 'short' || line.pause === 'long') frag.append(el('span', 'sf-pause', line.pause === 'long' ? '||||' : '||'));
    if (line.tone && TONE_TR[line.tone]) frag.append(el('span', 'sf-tone', TONE_TR[line.tone]));
    frag.append(' ');
    return frag;
  }
  async function makeProvaReal(button) {
    const host = $('[data-prova-text]');
    const status = $('[data-listen-status]');
    status.textContent = '';
    try {
      const script = await window.Api.ui.withLoading(button, () => A.rehearsalScript(lang), { text: 'Hazırlanıyor…' });
      const para = el('p');
      (script.lines || []).forEach(line => para.append(scriptLine(line)));
      host.replaceChildren(para);
      if (script.version_no) host.append(el('p', 'sf-muted', 'Sürüm ' + script.version_no + ' üzerinden hazırlandı.'));
      $('[data-prova]').hidden = false;
      $('[data-action="listen"]').hidden = false;
      button.textContent = 'Prova metnini yenile';
    } catch (error) {
      window.Api.ui.showError(status, A.explain(error));
    }
  }

  $('[data-action="make-prova"]').addEventListener('click', e => {
    if (A) { makeProvaReal(e.currentTarget); return; }
    const host = $('[data-prova-text]');
    host.replaceChildren();
    let t = 0;
    state.paragraphs.forEach(p => {
      const para = el('p');
      p.forEach((s, i) => {
        // GAP-E6-8: vurgu ve ton önerisi YZ servisinden gelecek; gerçek oturumda yalnız cümle durakları
        // (rastgele ton etiketi/kalın vurgu üretilmez, K79). Önizlemede tasarım örneği gösterilir.
        if (A) para.append(document.createTextNode(s.text), ' ', el('span', 'sf-pause', i === p.length - 1 ? '||||' : '||'), ' ');
        else para.append(emphasize(s.text), ' ', el('span', 'sf-pause', i === p.length - 1 ? '||||' : '||'), el('span', 'sf-tone', TONES[t++ % TONES.length]), ' ');
      });
      host.append(para);
    });
    $('[data-prova]').hidden = false;
    $('[data-action="listen"]').hidden = false;
    e.currentTarget.textContent = 'Prova metnini yenile';
  });

  const listenBtn = $('[data-action="listen"]');
  const listenStatus = $('[data-listen-status]');
  listenBtn.addEventListener('click', () => {
    if (!('speechSynthesis' in window)) { listenStatus.textContent = 'Tarayıcın sesli okumayı desteklemiyor.'; return; }
    const label = listenBtn.querySelector('.sf-btn-label');
    if (speechSynthesis.speaking) { speechSynthesis.cancel(); label.textContent = 'Sesli dinle'; return; }
    const u = new SpeechSynthesisUtterance(storyText().replace(/\n+/g, ' '));
    u.lang = 'tr-TR';
    u.rate = 0.95;
    u.onend = () => { label.textContent = 'Sesli dinle'; };
    label.textContent = 'Durdur';
    speechSynthesis.speak(u);
  });

  // ─── Sen anlat ──────────────────────────────────────────────────────────────
  const recBtn = $('[data-action="record"]');
  const recLabel = recBtn.querySelector('.sf-btn-label');
  const recStatus = $('[data-record-status]');
  const recBadge = $('[data-recording]');
  const timerEl = $('[data-timer]');
  const resultHost = $('[data-result]');
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null, started = 0, tick = null, transcript = [];
  const mmss = s => Math.floor(s / 60) + ':' + String(Math.round(s % 60)).padStart(2, '0');
  const lower = t => t.toLocaleLowerCase('tr-TR');

  function metric(value, caption) {
    const box = el('div', 'sf-metric');
    box.append(el('strong', '', String(value)), el('span', '', caption));
    return box;
  }

  function renderResult(r, isSample) {
    const frag = document.createDocumentFragment();
    if (isSample) frag.append(el('span', 'sf-sample-tag', 'Örnek sonuç · kurgusal ölçüm'));
    const metrics = el('div', 'sf-metrics');
    metrics.append(
      metric(mmss(r.seconds), 'süre (ayrılan 10:00)'),
      metric(r.wpm, 'kelime/dk (betimleyici)'),
      metric(r.fillers, 'dolgu sözcüğü'),
      metric(r.missed, 'anlatılmayan cümle'),
      metric(r.emphasized, 'vurgulanan ifade')
    );
    frag.append(metrics);
    if (r.good) {
      const good = el('div', 'sf-box sf-box--ok');
      good.style.marginTop = '1rem';
      good.append(el('h3', '', 'İyi giden'), el('p', '', r.good));
      frag.append(good);
    }
    const list = el('div', 'sf-stack');
    list.style.marginTop = '1rem';
    r.feedback.slice(0, 3).forEach((f, i) => {
      const card = el('div', 'sf-fb');
      const dl = el('dl');
      [['Duyduğumuz', f.heard], ['Etkisi', f.effect], ['Küçük öneri', f.tip], ['Tekrar', f.retry]].forEach(([k, v]) => dl.append(el('dt', '', k), el('dd', '', v)));
      card.append(el('span', 'sf-fb-no', String(i + 1)), dl);
      list.append(card);
    });
    frag.append(list);
    const details = el('details', 'sf-details');
    details.style.marginTop = '1rem';
    details.append(el('summary', '', 'Vurgu ayrıntısı'));
    const body = el('div', 'sf-details-body');
    if (r.emphasis && r.emphasis.length) {
      const ul = el('ul');
      ul.style.cssText = 'margin:0;padding-left:1.1rem;list-style:disc;color:var(--color-ink-2);font-size:.9rem;line-height:1.7';
      r.emphasis.forEach(x => ul.append(el('li', '', '“' + x.phrase + '” · ' + (x.heard ? 'vurgulandı' : 'vurgulanmadı'))));
      body.append(ul);
    } else {
      body.append(el('p', 'sf-muted', 'Ses tonu ve vurgu ölçümü yapay zekâ servisi bağlanınca eklenecek.'));
    }
    details.append(body);
    frag.append(details);
    resultHost.replaceChildren(frag);
    resultHost.hidden = false;
    recLabel.textContent = 'Tekrar anlat';
  }

  function analyze(text, seconds) {
    const tokens = lower(text).replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
    const fillers = tokens.filter(t => F.FILLERS.includes(t)).length;
    const stems = new Set(tokens.map(t => t.slice(0, 5)));
    const missedList = sentences.filter(s => {
      const content = lower(s).replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(w => w.length >= 4);
      if (!content.length) return false;
      const hit = content.filter(w => stems.has(w.slice(0, 5))).length;
      return hit / content.length < 0.5;
    });
    const wpm = seconds > 0 ? Math.round(tokens.length / (seconds / 60)) : 0;
    const feedback = [];
    if (missedList.length) {
      const first = missedList[0];
      feedback.push({ heard: '“' + first.split(' ').slice(0, 8).join(' ') + '…” cümlesini anlatmadın (toplam ' + missedList.length + ' cümle anlatılmadı).',
        effect: 'Bu cümledeki bilgi dinleyiciye ulaşmadı.',
        tip: 'Bu cümleyi kendi sözlerinle anlatıma ekle ya da gerekli değilse hikâyeden birlikte çıkaralım.', retry: 'Bu bölümü tekrar anlat.' });
    }
    if (fillers > 3) feedback.push({ heard: 'Anlatımında ' + fillers + ' dolgu sözcüğü duyduk (ör. “yani”, “şey”).', effect: 'Dolgu sözcükleri anlatımı kararsız gösterebilir.',
      tip: 'Dolgu sözcüğü gelecekken kısa bir sessizlik bırak.', retry: 'İlk paragrafı bir kez daha anlat.' });
    if (seconds > 15 && wpm > 165) feedback.push({ heard: 'Dakikada yaklaşık ' + wpm + ' kelimeyle anlattın.', effect: 'Hızlı tempoda önemli bilgiler kaçabilir.',
      tip: 'Cümle sonlarındaki duraklara uy, biraz yavaşla.', retry: 'Hikâyeyi bir kez daha, daha yavaş anlat.' });
    else if (seconds > 15 && wpm < 95) feedback.push({ heard: 'Dakikada yaklaşık ' + wpm + ' kelimeyle anlattın.', effect: 'Yavaş tempo dinleyicinin ilgisini düşürebilir.',
      tip: 'Metni birkaç kez sesli okuyup akıcılığını artır.', retry: 'Hikâyeyi bir kez daha anlat.' });
    const good = fillers <= 1 ? 'Anlatımında neredeyse hiç dolgu sözcüğü yoktu.'
      : (wpm >= 110 && wpm <= 150 ? 'Tempon dinlemesi rahat bir aralıktaydı.' : 'Hikâyeni baştan sona anlattın.');
    const flatNos = state.paragraphs.flat().map((s, i) => s.no || i + 1);
    const missedNos = sentences.map((s, i) => (missedList.includes(s) ? flatNos[i] : null)).filter(n => n != null);
    return { seconds, wpm, fillers, missed: missedList.length, missedNos, emphasized: '—', good, feedback, emphasis: [] };
  }

  function stopRecording() {
    clearInterval(tick);
    const seconds = (Date.now() - started) / 1000;
    const r = rec; rec = null;
    if (r) r.stop();
    recBtn.classList.remove('is-recording');
    recBadge.hidden = true;
    const text = transcript.join(' ').trim();
    if (!text) { recStatus.textContent = 'Ses alınamadı. Mikrofonu kontrol edip tekrar dene.'; recStatus.classList.add('is-error'); recLabel.textContent = 'Anlatmaya başla'; return; }
    recStatus.textContent = '';
    const local = analyze(text, seconds);
    if (!A) { renderResult(local, false); return; }
    sendRehearsal(text, local);
  }

  // E6-8 (Etap 12): yalnız transkript + metrikler POST …/rehearsals; geri bildirim (≤ 3) sunucudan.
  const FEEDBACK_TITLE = { pace: 'Tempo', fillers: 'Dolgu sözcükleri', skipped: 'Atlanan cümleler', duration: 'Süre', good: 'İyi giden', emphasis: 'Vurgu' };
  async function sendRehearsal(text, local) {
    recStatus.replaceChildren(el('span', 'sf-spinner'), document.createTextNode(' Geri bildirim hazırlanıyor…'));
    try {
      const r = await A.postRehearsal({
        transcript: text.slice(0, 20000), duration_seconds: Math.max(1, Math.round(local.seconds)),
        filler_count: local.fillers, skipped_sentence_nos: local.missedNos || [], language: lang
      });
      recStatus.textContent = '';
      renderServerResult(r);
      loadRehearsals();
    } catch (error) {
      recStatus.textContent = '';
      window.Api.ui.showError(recStatus, A.explain(error));
      renderResult(local, false);
    }
  }
  function renderServerResult(r) {
    const frag = document.createDocumentFragment();
    const metrics = el('div', 'sf-metrics');
    const said = (r.emphasis || []).filter(x => x.said).length;
    metrics.append(
      metric(mmss(r.duration_seconds || 0), 'süre (ayrılan 10:00)'),
      metric(r.words_per_minute || 0, 'kelime/dk'),
      metric(r.filler_count || 0, 'dolgu sözcüğü'),
      metric((r.skipped_sentence_nos || []).length, 'anlatılmayan cümle'),
      metric((r.emphasis || []).length ? said + '/' + r.emphasis.length : '—', 'vurgulanan ifade')
    );
    frag.append(metrics);
    const list = el('div', 'sf-stack');
    list.style.marginTop = '1rem';
    (r.feedback || []).slice(0, 3).forEach((f, i) => {
      const card = el('div', f.kind === 'good' ? 'sf-box sf-box--ok' : 'sf-fb');
      if (f.kind === 'good') card.append(el('h3', '', FEEDBACK_TITLE.good), el('p', '', f.text));
      else card.append(el('span', 'sf-fb-no', String(i + 1)), el('div', '', '')), card.lastChild.append(el('strong', '', FEEDBACK_TITLE[f.kind] || 'Öneri'), el('p', '', f.text));
      list.append(card);
    });
    frag.append(list);
    if ((r.emphasis || []).length) {
      const details = el('details', 'sf-details');
      details.style.marginTop = '1rem';
      details.append(el('summary', '', 'Vurgu ayrıntısı'));
      const ul = el('ul');
      ul.style.cssText = 'margin:0;padding:.5rem 1.1rem;list-style:disc;color:var(--color-ink-2);font-size:.9rem;line-height:1.7';
      r.emphasis.forEach(x => ul.append(el('li', '', '“' + x.phrase + '” · ' + (x.said ? 'söyledin' : 'söylenmedi'))));
      details.append(ul);
      frag.append(details);
    }
    frag.append(el('p', 'sf-muted', 'Ses kaydı alınmadı ve saklanmadı; yalnız metne çevrilen anlatımın ölçüldü.'));
    resultHost.replaceChildren(frag);
    resultHost.hidden = false;
    recLabel.textContent = 'Tekrar anlat';
  }
  // Önceki provalar (yalnız metrik + geri bildirim; transkript saklanmaz).
  let historyHost = null;
  async function loadRehearsals() {
    if (!A) return;
    if (!historyHost) {
      historyHost = el('div', 'sf-rehearsal-history');
      historyHost.setAttribute('data-rehearsal-history', '');
      historyHost.style.marginTop = '1.25rem';
      resultHost.insertAdjacentElement('afterend', historyHost);
    }
    try {
      const items = await A.rehearsals();
      if (!items.length) { historyHost.replaceChildren(); return; }
      const ul = el('ul');
      ul.style.cssText = 'margin:.5rem 0 0;padding-left:1.1rem;list-style:disc;font-size:.9rem;line-height:1.7';
      items.slice(0, 10).forEach(x => ul.append(el('li', '', window.Api.format.dateTime(x.created_at) + ' · ' + mmss(x.duration_seconds || 0) +
        ' · ' + (x.words_per_minute || 0) + ' kelime/dk · ' + (x.filler_count || 0) + ' dolgu · ' + (x.skipped_sentence_nos || []).length + ' atlanan cümle')));
      historyHost.replaceChildren(el('h3', 'sf-section-title', 'Önceki provalar'), ul);
    } catch (error) {
      historyHost.replaceChildren();
    }
  }
  loadRehearsals();

  recBtn.addEventListener('click', () => {
    recStatus.classList.remove('is-error');
    if (rec) { stopRecording(); return; }
    if (!Recognition) {
      recStatus.textContent = 'Tarayıcın sesli anlatımı dinleyemiyor. Chrome ya da Edge ile deneyebilir veya örnek sonuca bakabilirsin.';
      recStatus.classList.add('is-error');
      return;
    }
    transcript = [];
    rec = new Recognition();
    rec.lang = 'tr-TR';
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = e => { for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) transcript.push(e.results[i][0].transcript); };
    rec.onerror = e => { recStatus.textContent = e.error === 'not-allowed' ? 'Mikrofon izni verilmedi.' : 'Dinleme kesildi.'; recStatus.classList.add('is-error'); };
    rec.onend = () => { if (rec) { try { rec.start(); } catch (error) { stopRecording(); } } };
    try { rec.start(); } catch (error) { rec = null; recStatus.textContent = 'Dinleme başlatılamadı.'; recStatus.classList.add('is-error'); return; }
    started = Date.now();
    recBtn.classList.add('is-recording');
    recLabel.textContent = 'Bitirdim';
    recBadge.hidden = false;
    timerEl.textContent = '0:00';
    tick = setInterval(() => {
      const s = (Date.now() - started) / 1000;
      timerEl.textContent = mmss(s);
      if (s >= 600) stopRecording();
    }, 500);
  });

  // E6-7 (Etap 12): gerçek oturumda ölçüm sunucuda; "Örnek sonuç" yalnız önizlemede.
  const sampleResultBtn = $('[data-action="sample-result"]');
  if (!S) sampleResultBtn.hidden = true;
  sampleResultBtn.addEventListener('click', () => {
    if (!S) return;
    if (rec) stopRecording();
    renderResult(S.rehearsal, true);
  });
  }
})();
