// hikaye-akis-api.js — Yeni hikâye akışının (Etap 6, Hazal) gerçek oturumdaki API bağlantısı (K103). Sahibi: 81.
// Önizleme modunda (APP_PREVIEW, K102) kullanılmaz; ekranlar örnek veriyle (hikaye-akis-ornek.js / onizleme-veri.js) çalışır.
//
// Uçlar (backend/api/openapi.yaml; GAP-E6 uçları 60, 2026-11-16):
//   GET  /candidate/stories/{id}/drafts (+/{draftID})            → DraftView (cümle kaynakları, [bilgi gerekli], issues)
//   POST /candidate/stories/{id}/resume                           → PAUSED ise devam
//   POST /candidate/stories/{id}/external {text}                  → 1. adım "Okumaya ver": adayın metni yeni taslak
//   POST /candidate/stories/{id}/drafts {based_on_draft_id, story_text[, skeleton]} → 2. adım düzenleme (yeni sürüm)
//   GET/PUT /candidate/stories/{id}/working-text {text}           → E6-11 otomatik kayıt (sürüm oluşturmaz)
//   POST /candidate/stories/{id}/drafts/{draftID}/review [{language}] → E6-3/4/1 YZ okuması (≤70 sn)
//   GET  /candidate/stories/{id}/reviews?draft_id=                → son okuma (yeniden yükleme)
//   POST /candidate/stories/{id}/suggestions/{sid}/decision {action} → accepted | own_words | skipped
//   GET  /candidate/stories/{id}/cv-facts                         → E6-2 onaylı CV bilgileri ({cv_id:null} → CV yok)
//   POST /candidate/stories/{id}/submissions {draft_id, confirm}  → E6-9 "Danışmanıma gönder" (kilitlemez)
//   GET  /candidate/stories/{id}/submissions                      → {items, latest_draft_id, needs_resubmit}
//   GET/PUT /candidate/stories/{id}/open-issues {items:[{text, source}]} → E6-10 açık konular (kalıcı)
//   POST /candidate/stories/{id}/outputs/generate [{language}] · GET …/outputs?language= → E6-5/6
//   POST /candidate/stories/{id}/finalize {draft_id, confirm:true} → 2. seans sonrası nihai onay (COMPLETED)
(function () {
  'use strict';
  if (window.APP_PREVIEW === true) return;
  const Api = window.Api;
  const M = window.StoryModel;
  const enc = encodeURIComponent;
  const base = id => '/candidate/stories/' + enc(id);
  const AI = () => ({ timeoutMs: Api.config.aiTimeoutMs });

  function completed(status) { return status === 'COMPLETED'; }
  function editable(status) { return Boolean(status) && !completed(status) && status !== 'CANCELLED'; }

  async function ready() {
    await new Promise(resolve => (document.readyState === 'loading'
      ? document.addEventListener('DOMContentLoaded', resolve, { once: true }) : resolve()));
    await window.sessionReady;
  }

  let ctxPromise = null;
  async function context(fresh) {
    if (!ctxPromise || fresh) ctxPromise = ready().then(() => window.Journey.load());
    return ctxPromise;
  }
  async function storyIdOrThrow() {
    const ctx = await context();
    if (!ctx || !ctx.story) throw new Error('Aktif bir hikâye oturumun yok.');
    return ctx.story.id;
  }

  // Çıktılar: (tür, dil) başına son sürüm; yeni türler role_version / impact_analysis; cümle kaynakları.
  function outputsVM(items, draftId, language) {
    const list = (items || []).filter(o => o.draft_id === draftId && (!language || (o.language || 'tr') === language));
    if (!list.length) return null;
    const latest = new Map();
    list.forEach(o => {
      const key = o.output_type + ':' + o.item_no;
      if (!latest.has(key) || latest.get(key).version_no < o.version_no) latest.set(key, o);
    });
    const byType = type => Array.from(latest.values()).filter(o => o.output_type === type).sort((a, b) => a.item_no - b.item_no);
    const one = type => byType(type)[0] || null;
    const vm = {
      language: language || 'tr',
      skeleton: one('skeleton'), shortSummary: one('short_summary'), cvSummary: one('cv_summary'),
      roleVersion: one('role_version'), impactAnalysis: one('impact_analysis'), story: one('story'),
      interviewAnswers: byType('interview_answer'),
      // Etap 14 (60 sözleşmesi): 30 / 60 saniyelik tanıtım ayrı türler
      pitch30: one('pitch_30s'), pitch60: one('pitch_60s')
    };
    // EN istenip içerik Türkçe kaldıysa (dev motoru, K117) uyarı için
    vm.untranslated = Array.from(latest.values()).some(o => o.untranslated === true);
    vm.isEmpty = !vm.pitch30 && !vm.pitch60 && !vm.shortSummary && !vm.cvSummary && !vm.interviewAnswers.length && !vm.roleVersion && !vm.impactAnalysis && !vm.skeleton;
    return vm;
  }

  async function outputsFor(storyId, draftId, language) {
    const outs = await Api.get(base(storyId) + '/outputs', { query: { language: language || 'tr' } }).catch(() => null);
    const items = (outs && (outs.items || outs.outputs)) || [];
    const vm = outputsVM(items, draftId, language || 'tr');
    if (vm) vm.issues = (outs && outs.issues) || [];
    return { vm, stale: Boolean(draftId) && items.length > 0 && !items.some(o => o.draft_id === draftId) };
  }

  async function load(language) {
    const ctx = await context(true);
    if (!ctx || !ctx.enrollment || !ctx.story) return { ctx, storyId: null, status: null, draft: null, outputs: null, outputsStale: false };
    const storyId = ctx.story.id;
    const drafts = await Api.listAll(base(storyId) + '/drafts');
    const latest = drafts.slice().sort((a, b) => b.version_no - a.version_no)[0] || null;
    const draft = latest ? M.fromDraftView(await Api.get(base(storyId) + '/drafts/' + enc(latest.id))) : null;
    const out = draft ? await outputsFor(storyId, draft.draftId, language) : { vm: null, stale: false };
    return { ctx, storyId, status: ctx.story.status, draft, outputs: out.vm, outputsStale: out.stale };
  }

  function textOf(vm) {
    if (!vm) return '';
    if (vm.text && vm.text.trim()) return vm.text.trim();
    return M.joinSentences(vm.sentences.map(s => s.text));
  }

  // Yerel paragraf/cümle modeli; vm verilirse her cümleye taslağın cümle numarası (sources[].sentence_no) eşlenir
  // (öneri hedefleri target_sentence_nos bu numaralarla gelir).
  function paragraphs(text, vm) {
    let seq = 0;
    const F = window.StoryFlow;
    const norm = t => String(t || '').replace(/\s+/g, ' ').trim();
    const sources = vm ? vm.sentences.slice() : [];
    let cursor = 0;
    return String(text || '').trim().split(/\n\s*\n/)
      .map(block => F.split(block).map(sentence => {
        const item = { id: 's' + (++seq), text: sentence, origin: 'candidate', recent: false };
        if (sources.length) {
          const hit = sources.findIndex((s, i) => i >= cursor && norm(s.text) === norm(sentence));
          if (hit >= 0) { item.no = sources[hit].no; cursor = hit + 1; } else item.no = seq;
        }
        return item;
      }))
      .filter(p => p.length);
  }

  async function resumeIfPaused(storyId, status) {
    if (status !== 'PAUSED') return;
    await Api.post(base(storyId) + '/resume');
  }

  async function submitText(text) {
    const ctx = await context(true);
    if (!ctx || !ctx.story) throw new Error('Aktif bir hikâye oturumun yok.');
    await resumeIfPaused(ctx.story.id, ctx.story.status);
    const view = await Api.post(base(ctx.story.id) + '/external', { text: String(text || '').trim() });
    return M.fromDraftView(view);
  }

  async function saveText(vm, text) {
    const value = String(text || '').trim();
    if (!vm || !value) return vm;
    if (value.replace(/\s+/g, ' ') === textOf(vm).replace(/\s+/g, ' ')) return vm;
    const ctx = await context(true);
    await resumeIfPaused(ctx.story.id, ctx.story.status);
    const body = { based_on_draft_id: vm.draftId, story_text: value };
    if (vm.skeleton && Object.keys(vm.skeleton).length) body.skeleton = vm.skeleton;
    const view = await Api.post(base(ctx.story.id) + '/drafts', body);
    return M.fromDraftView(view);
  }

  // E6-11
  async function getWorkingText() {
    return Api.get(base(await storyIdOrThrow()) + '/working-text');
  }
  async function saveWorkingText(text) {
    return Api.put(base(await storyIdOrThrow()) + '/working-text', { text: String(text || '').slice(0, 20000) });
  }

  // E6-3 / E6-4 / E6-1
  async function review(draftId, language) {
    return Api.post(base(await storyIdOrThrow()) + '/drafts/' + enc(draftId) + '/review', language ? { language } : undefined, AI());
  }
  async function latestReview(draftId) {
    const res = await Api.get(base(await storyIdOrThrow()) + '/reviews', { query: { draft_id: draftId } });
    return ((res && res.items) || [])[0] || null;
  }
  async function decide(suggestionId, action) {
    return Api.post(base(await storyIdOrThrow()) + '/suggestions/' + enc(suggestionId) + '/decision', { action });
  }

  // E6-2
  async function cvFacts() {
    return Api.get(base(await storyIdOrThrow()) + '/cv-facts');
  }

  // E6-10 (Etap 12): açık konular — kalıcı liste (PUT tüm listeyi değiştirir; ≤20 öğe, 1–500 karakter)
  async function getOpenIssues() {
    const res = await Api.get(base(await storyIdOrThrow()) + '/open-issues');
    return (res && res.items) || [];
  }
  async function saveOpenIssues(items) {
    const clean = (items || []).map(i => ({ text: String(i.text || '').trim().slice(0, 500), source: i.source === 'suggestion' ? 'suggestion' : 'cv' }))
      .filter(i => i.text).slice(0, 20);
    const res = await Api.put(base(await storyIdOrThrow()) + '/open-issues', { items: clean });
    return (res && res.items) || clean;
  }

  // E6-7 / E6-8 (Etap 12): prova metni (vurgu/durak/ton) ve prova geri bildirimi. Ses ASLA gönderilmez:
  // yalnız tarayıcıda metne çevrilen transkript + metrikler. Sunucu transkripti saklamaz.
  async function rehearsalScript(language) {
    return Api.get(base(await storyIdOrThrow()) + '/rehearsal-script', Object.assign({ query: { language: language || 'tr' } }, AI()));
  }
  async function postRehearsal(body) {
    return Api.post(base(await storyIdOrThrow()) + '/rehearsals', body, AI());
  }
  async function rehearsals() {
    const res = await Api.get(base(await storyIdOrThrow()) + '/rehearsals');
    return (res && res.items) || [];
  }
  // E6-16: sunucu PDF'i (Bearer ile blob indirme; çıktı yoksa 409 no_outputs)
  async function outputsPdf(language) {
    const lang = language === 'en' ? 'en' : 'tr';
    return Api.download(base(await storyIdOrThrow()) + '/outputs.pdf?language=' + lang, { filename: 'hikaye-ciktilari-' + lang + '.pdf' });
  }

  // E6-9
  async function submit(draftId) {
    return Api.confirm('POST', base(await storyIdOrThrow()) + '/submissions', { draft_id: draftId });
  }
  async function submissions() {
    return Api.get(base(await storyIdOrThrow()) + '/submissions');
  }

  // E6-5 / E6-6
  async function generateOutputs(language) {
    const storyId = await storyIdOrThrow();
    await Api.post(base(storyId) + '/outputs/generate', { language: language || 'tr' }, AI());
    return load(language);
  }

  async function finalize(draftId) {
    return Api.confirm('POST', base(await storyIdOrThrow()) + '/finalize', { draft_id: draftId });
  }

  // YZ uçlarının ortama özgü hataları → anlaşılır mesaj (stub 501, doğrulanamayan YZ yanıtı 502, zaman aşımı).
  function explain(error) {
    if (!error) return error;
    if (error.status === 501 || (error.is && error.is('not_implemented'))) {
      return 'Yapay zekâ servisi bu ortamda kapalı; okuma ve çıktı üretimi şu an yapılamıyor. Hikâyeni kaydedip danışmanına gönderebilirsin.';
    }
    if (error.is && error.is('ai_output_rejected')) return 'Yapay zekâ yanıtı doğrulamadan geçmedi; hiçbir şey kaydedilmedi. Biraz sonra yeniden dene.';
    if (error.status === 504 || (error.is && error.is('timeout'))) return 'Yapay zekâ yanıtı zamanında gelmedi. Biraz sonra yeniden dene.';
    if (error.is && error.is('story_too_short')) return 'Hikâyen okumaya verilmek için en az 80 kelime olmalı. Biraz daha ayrıntı ekleyip yeniden dene.';
    if (error.is && error.is('no_outputs')) return 'Önce çıktılarını hazırla; PDF hazırlanan çıktılardan oluşturulur.';
    return error;
  }

  // BR-09 metin kuralları (TextIssue) → Türkçe ipucu (hikaye-aday.js ile aynı eşleme).
  function issueText(issue) {
    const detail = String((issue && issue.detail) || '');
    switch (issue && issue.code) {
      case 'word_count': return 'Hikâyen ' + detail + ' kelime; önerilen uzunluk 150–250 kelime.';
      case 'praise_word': return '“' + detail + '” gibi övgü ifadeleri yerine somut bir örnek kullan.';
      default: return '';
    }
  }

  // QA-018: onay için tasarımın <dialog> bileşeni (native confirm değil).
  function askConfirm({ title, text, okLabel }) {
    const dialog = document.createElement('dialog');
    dialog.className = 'appointment-success-dialog';
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'story-flow-confirm-title');
    dialog.setAttribute('aria-describedby', 'story-flow-confirm-text');
    const h = document.createElement('h2'); h.id = 'story-flow-confirm-title'; h.textContent = title;
    const p = document.createElement('p'); p.id = 'story-flow-confirm-text'; p.textContent = text;
    const actions = document.createElement('div'); actions.className = 'appointment-success-actions';
    const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = 'Vazgeç'; cancel.setAttribute('data-nav-skip', '');
    const ok = document.createElement('button'); ok.type = 'button'; ok.textContent = okLabel || 'Evet, onayla'; ok.setAttribute('data-nav-skip', '');
    ok.setAttribute('data-action', 'story-finalize-confirm');
    actions.append(cancel, ok);
    dialog.append(h, p, actions);
    document.body.appendChild(dialog);
    return new Promise(resolve => {
      const finish = value => {
        if (typeof dialog.close === 'function' && dialog.open) dialog.close();
        dialog.remove();
        resolve(value);
      };
      dialog.addEventListener('cancel', event => { event.preventDefault(); finish(false); });
      cancel.addEventListener('click', () => finish(false));
      ok.addEventListener('click', () => finish(true));
      if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
      cancel.focus();
    });
  }

  function atLeastFirstSession(ctx) {
    return Boolean(ctx && ctx.story && window.Journey.atLeast(ctx.story, 'FIRST_SESSION_DONE'));
  }

  window.StoryFlowApi = Object.freeze({
    load, textOf, paragraphs, submitText, saveText, generateOutputs, outputsFor, finalize,
    getWorkingText, saveWorkingText, review, latestReview, decide, cvFacts, submit, submissions, getOpenIssues, saveOpenIssues, rehearsalScript, postRehearsal, rehearsals, outputsPdf,
    explain, issueText, askConfirm, editable, completed, atLeastFirstSession
  });
})();
