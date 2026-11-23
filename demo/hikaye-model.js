// hikaye-model.js — Hikâye ortak modeli (API → görünüm modeli) + ortak DOM yardımcıları.
// Sahibi: 81 Frontend Platform. Eski hikaye-veri.js'in (örnek veri + localStorage; temizlik turunda
// SİLİNDİ, GAP-D13/U17) bölünmesinin ortak parçasıdır:
//   hikaye-model.js (81, bu dosya) · hikaye-aday.js (83, ciktilar) · hikaye-guru.js (84, guru-hikaye).
//
// Veri kaynakları (yalnız API):
//   aday: GET /candidate/stories/{id} (StoryState), …/drafts/{draftID} (DraftView), …/outputs (OutputsView)
//   guru: GET /guru/stories/{id} (GuruStory: draft{draft, info_needed}, outputs), …/raw (RawStory, K45)
//
// API:
//   StoryModel.fromDraftView(draftView)   → StoryVM
//   StoryModel.fromGuruStory(guruStory)   → { session, story: StoryVM|null, outputs: OutputsVM, rawAccess }
//   StoryModel.fromOutputs(outputsView|outputs[]) → OutputsVM
//   StoryModel.answerIndex(storyState|rawStory)  → Map<answerId, { questionNo, questionId, questionText, focusLabel, text, isInfoNeeded }>
//   StoryModel.sourceLabel(sentence, answerIndex) → 'Cevap 2' | 'Takip cevabı' | 'CV' | 'Senin düzenlemen' | 'Yüklenen hikâye' | 'Kaynak yok'
//   StoryModel.joinSentences(sentences)   → story_text (POST …/drafts gövdesi için)
//   StoryModel.splitSentences(text)       → string[]
//   StoryModel.hasInfoNeeded(text)        → boolean ('[bilgi gerekli]' işareti)
//   StoryModel.dom.element(tag, className, text) · dom.copyText(text) → Promise<boolean> · dom.print(target)
//
// StoryVM: { draftId, versionNo, createdBy, basedOnDraftId, skeleton{character,goal,challenge,solution},
//            text, wordCount, hasExternalFile, createdAt, infoNeeded: string[], issues: TextIssue[],
//            sentences: [{ no, text, sourceType, answerId, followUpId, cvFileId, unsourced, infoNeeded }] }
// OutputsVM: { skeleton, story, shortSummary, interviewAnswers: [{ itemNo, content }], cvSummary, issues, isEmpty }
(function () {
  'use strict';
  const INFO_NEEDED = '[bilgi gerekli]';

  function splitSentences(text) {
    return String(text || '').trim().split(/(?<=[.!?…])\s+/u).map(s => s.trim()).filter(Boolean);
  }

  function hasInfoNeeded(text) {
    return String(text || '').includes(INFO_NEEDED);
  }

  function fromDraftView(view) {
    if (!view || !view.draft) return null;
    const d = view.draft;
    const sources = Array.isArray(view.sources) ? view.sources.slice().sort((a, b) => a.sentence_no - b.sentence_no) : [];
    const sentences = sources.length
      ? sources.map(source => ({
        no: source.sentence_no,
        text: source.sentence_text,
        sourceType: source.source_type,
        answerId: source.answer_id,
        followUpId: source.follow_up_id,
        cvFileId: source.cv_file_id,
        unsourced: Boolean(source.is_unsourced),
        infoNeeded: hasInfoNeeded(source.sentence_text)
      }))
      : splitSentences(d.story_text).map((text, index) => ({
        no: index + 1, text, sourceType: null, answerId: null, followUpId: null, cvFileId: null,
        unsourced: true, infoNeeded: hasInfoNeeded(text)
      }));
    return {
      draftId: d.id,
      versionNo: d.version_no,
      createdBy: d.created_by,
      basedOnDraftId: d.based_on_draft_id,
      skeleton: d.skeleton || {},
      text: d.story_text || '',
      wordCount: d.word_count,
      hasExternalFile: Boolean(d.has_external_file),
      createdAt: d.created_at,
      infoNeeded: Array.isArray(view.info_needed) ? view.info_needed : [],
      issues: Array.isArray(view.issues) ? view.issues : [],
      sentences
    };
  }

  function fromOutputs(input) {
    const outputs = Array.isArray(input) ? input : (input && input.outputs) || [];
    const issues = Array.isArray(input) ? [] : (input && input.issues) || [];
    const latest = new Map();
    // Aynı tür + item_no için en yüksek version_no kazanır.
    outputs.forEach(output => {
      const key = output.output_type + ':' + output.item_no;
      const prev = latest.get(key);
      if (!prev || output.version_no > prev.version_no) latest.set(key, output);
    });
    const byType = type => Array.from(latest.values()).filter(o => o.output_type === type).sort((a, b) => a.item_no - b.item_no);
    const first = type => (byType(type)[0] || {}).content || '';
    const vm = {
      skeleton: first('skeleton'),
      story: first('story'),
      shortSummary: first('short_summary'),
      interviewAnswers: byType('interview_answer').map(o => ({ itemNo: o.item_no, content: o.content })),
      cvSummary: first('cv_summary'),
      issues
    };
    vm.isEmpty = !vm.story && !vm.shortSummary && !vm.interviewAnswers.length && !vm.cvSummary;
    return vm;
  }

  function fromGuruStory(gs) {
    if (!gs) return null;
    const story = gs.draft ? fromDraftView({ draft: gs.draft.draft, sources: [], info_needed: gs.draft.info_needed, issues: [] }) : null;
    return { session: gs.session, story, outputs: fromOutputs(gs.outputs || []), rawAccess: Boolean(gs.raw_access), raw: gs.raw || null };
  }

  // StoryState (aday) ve RawStory (guru) aynı questions/answers/follow_ups alanlarını taşır.
  function answerIndex(state) {
    const index = new Map();
    if (!state) return index;
    const questions = new Map((state.questions || []).map(q => [q.id, q]));
    (state.answers || []).forEach(answer => {
      const q = questions.get(answer.question_id) || {};
      index.set(answer.id, {
        questionNo: q.sequence_no || null,
        questionId: answer.question_id,
        questionText: q.question_text || '',
        focusLabel: q.focus_label || '',
        text: answer.answer_text || '',
        isInfoNeeded: Boolean(answer.is_info_needed)
      });
    });
    return index;
  }

  function sourceLabel(sentence, index) {
    switch (sentence && sentence.sourceType) {
      case 'answer': {
        const ref = index && sentence.answerId ? index.get(sentence.answerId) : null;
        return ref && ref.questionNo ? 'Cevap ' + ref.questionNo : 'Cevap';
      }
      case 'follow_up': return 'Takip cevabı';
      case 'cv': return 'CV';
      case 'candidate_edit': return 'Senin düzenlemen';
      case 'external': return 'Yüklenen hikâye';
      default: return 'Kaynak yok';
    }
  }

  function joinSentences(sentences) {
    return (sentences || []).map(s => (typeof s === 'string' ? s : s.text || '').trim()).filter(Boolean).join(' ');
  }

  // ─── Ortak DOM yardımcıları (eski hikaye-veri.js'ten) ──────────────────────
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  async function copyText(text) {
    if (!text) return false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      const textarea = element('textarea');
      textarea.value = text;
      textarea.setAttribute('aria-hidden', 'true');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      textarea.remove();
      return copied;
    } catch (error) {
      return false;
    }
  }

  function print(target) {
    document.body.dataset.printTarget = target || 'all';
    window.addEventListener('afterprint', () => { delete document.body.dataset.printTarget; }, { once: true });
    window.print();
  }

  window.StoryModel = Object.freeze({
    INFO_NEEDED,
    splitSentences, hasInfoNeeded, fromDraftView, fromOutputs, fromGuruStory, answerIndex, sourceLabel, joinSentences,
    dom: Object.freeze({ element, copyText, print })
  });
})();
