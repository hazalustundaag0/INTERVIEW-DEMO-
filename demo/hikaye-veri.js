(function () {
  const STORAGE_KEY = 'demoHikaye';
  const GAP_TYPES_STORAGE_KEY = 'demoHikayeGapTypes';
  const GAP_TYPE_CONFIG = window.DEMO_HIKAYE_GAP_TYPES;
  const SOURCE_QUOTE = "Hepsiburada'da satış ve iş geliştirme ile başladım, Trendyol Group'ta kıdemli satış uzmanı oldum. Kurumsal müşterilerle uzun soluklu ilişkiler kurmayı seviyorum. B2B SaaS tarafında kıdemli satış yöneticisi olarak müşterilerin büyüme hedeflerine doğrudan katkı sağlamak istiyorum...";
  const STORY = [
    ['s1', 'Satış ve iş geliştirme alanındaki kariyer yolculuğuma Hepsiburada’da başladım.'],
    ['s2', 'Bu başlangıç, bugünkü satış yaklaşımımın ve iş geliştirmeye duyduğum ilginin temelini oluşturdu.'],
    ['s3', 'Ardından Trendyol Group’ta kıdemli satış uzmanı olarak görev aldım.'],
    ['s4', 'Bu rol, satış deneyimimi kurumsal müşterilerle uzun soluklu ilişkiler kurduğum bir çizgide sürdürmemi sağladı.'],
    ['s5', 'Kurumsal müşterilerle çalışırken kısa vadeli bir işlemden çok, devam eden bir iş ilişkisi kurmayı seviyorum.'],
    ['s6', 'Müşterilerin ihtiyaçlarını ve büyüme hedeflerini anlamaya odaklanmak, bu ilişkilerin benim için taşıdığı değeri anlatıyor.'],
    ['s7', 'Bugün B2B SaaS tarafında kıdemli satış yöneticisi olarak ilerlemeyi hedefliyorum.'],
    ['s8', 'Bu hedef, önceki satış ve iş geliştirme deneyimimi yeni bir alanda değerlendirme isteğimi yansıtıyor.'],
    ['s9', 'Müşterilerin büyüme hedeflerine doğrudan katkı sunmak, bu rolde yaratmak istediğim etkinin merkezinde.'],
    ['s10', 'Bunun için kurumsal müşterilerle kurduğum ilişki yaklaşımını B2B SaaS hedefimle bir araya getirmek istiyorum.'],
    ['s11', 'Hepsiburada’daki başlangıcım ile Trendyol Group’taki kıdemli satış deneyimim, hikâyemin iş geçmişini oluşturan iki adım.'],
    ['s12', 'Bu adımların ortak noktasını satış, iş geliştirme ve kurumsal müşterilerle çalışma isteğimde görüyorum.'],
    ['s13', 'Yeni rolümde bu birikimi müşterilerin büyüme hedeflerine destek olmak için kullanmayı amaçlıyorum.'],
    ['s14', 'Büyüme katkımın ilgili dönem oranını henüz paylaşmadım.'],
    ['s15', 'Bu yolculuğun benim için en önemli kişisel anlamı henüz net değil.']
  ];
  const FOLLOWUPS = [
    {
      soru: 'Kurumsal müşterilerle kurduğun ilişkilerde neye önem veriyorsun?',
      cevapNo: 1,
      cevap: 'Kurumsal müşterilerle uzun soluklu ilişkiler kurmayı seviyorum.'
    },
    {
      soru: 'B2B SaaS tarafında nasıl bir rol hedefliyorsun?',
      cevapNo: 1,
      cevap: 'B2B SaaS tarafında kıdemli satış yöneticisi olarak müşterilerin büyüme hedeflerine doğrudan katkı sağlamak istiyorum.'
    }
  ];
  const SUGGESTIONS = [
    { baslik: 'Geri planda kalan noktalar', ozet: 'Kariyer geçişinin kişisel nedeni henüz açıklanmıyor.', maddeler: ['Hepsiburada’dan Trendyol Group’a geçişin nedeni', 'B2B SaaS alanına yönelme motivasyonu'] },
    { baslik: 'Eksik veya yüzeysel alanlar', ozet: 'Büyüme katkısını destekleyecek dönem ve sonuç bilgisi eksik.', maddeler: ['2023 4. çeyrek büyüme oranı', 'Müşteri hedeflerine katkının somut örneği'] },
    { baslik: 'Vurucu cümle örnekleri', ozet: 'Mevcut deneyim ve hedefi tek cümlede birleştir.', maddeler: ['“Kurumsal müşteri ilişkilerindeki deneyimimi B2B SaaS büyüme hedeflerine taşımak istiyorum.”'] },
    { baslik: 'Zayıf kelimeler ve alternatifleri', ozet: 'Genel ifadeleri daha açıklayıcı hale getir.', maddeler: ['“Seviyorum” yerine “önem veriyorum”', '“İlerlemek istiyorum” yerine “hedefliyorum”'] },
    { baslik: 'Güçlü mesaj önerileri', ozet: 'Hikâyenin iki ana temasını belirginleştir.', maddeler: ['Satış ve iş geliştirme geçmişi', 'Kurumsal müşterilerle uzun soluklu ilişki', 'B2B SaaS satış yöneticiliği hedefi'] }
  ];
  const BASE_STORY = STORY.map(([id, metin]) => ({
    id,
    metin,
    kaynak: id === 's14' || id === 's15'
      ? null
      : { cevapNo: 1, soru: 'Kariyer geçmişini ve hedefini anlatır mısın?', alinti: SOURCE_QUOTE },
    bilgiGerekli: id === 's14' ? '2023 4. çeyrek büyüme oranı' : null,
    gapTypeId: id === 's14' ? 'achievement-result-missing' : null
  }));
  const DEFAULT_DATA = {
    surum: 2,
    cumleler: BASE_STORY,
    takipler: FOLLOWUPS,
    ciktilar: {
      ozet: 'Hepsiburada’da satış ve iş geliştirme ile başlayan kariyer, Trendyol Group’ta kıdemli satış uzmanlığıyla devam etti. Hedef, kurumsal müşteri ilişkileri deneyimini B2B SaaS satış yöneticiliğine taşımak.',
      mulakat: [
        { soru: 'Bize kendinden bahseder misin?', cevap: 'Satış ve iş geliştirme alanında Hepsiburada’da başladım, Trendyol Group’ta kıdemli satış uzmanı olarak devam ettim. Kurumsal müşterilerle uzun soluklu ilişkiler kurmayı seviyorum ve B2B SaaS tarafında satış yöneticiliğini hedefliyorum.' },
        { soru: 'Kariyer hedefin nedir?', cevap: 'B2B SaaS tarafında kıdemli satış yöneticisi olarak, kurumsal müşterilerin büyüme hedeflerine doğrudan katkı sağlamak istiyorum.' }
      ],
      cv: 'Hepsiburada’da satış ve iş geliştirme ile başlayan, Trendyol Group’ta kıdemli satış uzmanlığıyla devam eden deneyim. Kurumsal müşterilerle uzun soluklu ilişkiler kurma ve B2B SaaS satış yöneticiliği hedefi.'
    },
    oneriler: SUGGESTIONS
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function splitSentences(text) {
    return text.trim().split(/(?<=[.!?])\s+/u).filter(Boolean);
  }

  function makeManualStory(text) {
    const sentences = splitSentences(text);
    return sentences.map((metin, index) => ({
      id: 'yuklenen-' + (index + 1),
      metin,
      kaynak: { cevapNo: index + 1, soru: 'Adayın yüklediği hikâye', alinti: metin },
      bilgiGerekli: null
    }));
  }

  function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    let data;
    if (saved === null) {
      data = clone(DEFAULT_DATA);
    } else {
      try {
        data = JSON.parse(saved);
        if (!data || !Array.isArray(data.cumleler) || !Array.isArray(data.takipler) ||
            !data.ciktilar || !Array.isArray(data.ciktilar.mulakat) || !Array.isArray(data.oneriler)) {
          throw new TypeError('demoHikaye şeması geçersiz.');
        }
      } catch (error) {
        console.error('demoHikaye verisi okunamadı; başlangıç hikâyesi kullanılacak.', error);
        data = clone(DEFAULT_DATA);
        showStorageError();
      }
    }

    const manualStory = new URLSearchParams(location.search).get('source') === 'manual'
      ? localStorage.getItem('demoHazirHikaye')
      : null;
    if (manualStory) {
      data.cumleler = makeManualStory(manualStory);
      data.surum = Math.max(2, Number(data.surum) || 2);
    }

    const storyDefaults = new Map(BASE_STORY.map(sentence => [sentence.id, sentence]));
    data.cumleler.forEach(sentence => {
      const defaults = storyDefaults.get(sentence.id);
      if (!defaults) return;
      ['gapTypeId'].forEach(key => {
        if (sentence[key] == null && defaults[key] != null) sentence[key] = defaults[key];
      });
    });
    normalizeGapRecords(data);
    addGapsForUnansweredQuestions(data);

    if (saved === null || manualStory || JSON.stringify(data) !== saved) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (error) {
        console.error('demoHikaye tarayıcıya kaydedilemedi.', error);
        showStorageError();
      }
    }
    return data;
  }

  function showStorageError() {
    let message = document.getElementById('hikaye-storage-error');
    if (!message) {
      message = document.createElement('p');
      message.id = 'hikaye-storage-error';
      message.className = 'mb-4 rounded-[8px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[14px] text-[#B42318]';
      message.setAttribute('role', 'alert');
      message.textContent = 'Hikâye verisi okunamadı veya kaydedilemedi. Tarayıcı depolama alanını kontrol et.';
      document.querySelector('main')?.prepend(message);
    }
  }

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('demoHikaye tarayıcıya kaydedilemedi.', error);
      showStorageError();
      return false;
    }
  }

  function wordCount() {
    return data.cumleler.map(sentence => sentence.metin.trim()).filter(Boolean)
      .join(' ').split(/\s+/u).filter(Boolean).length;
  }

  function updateCandidateWordCount() {
    const wordCountBadge = document.querySelector('.story-output-status-badge[data-story-word-count]');
    if (wordCountBadge) wordCountBadge.textContent = wordCount() + ' kelime';
  }

  function showCandidateToast(message) {
    document.getElementById('story-output-toast')?.remove();
    const toast = element('div', 'story-output-toast', message);
    toast.id = 'story-output-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
    window.setTimeout(() => toast.remove(), 2600);
  }

  function setCandidateSidebar() {
    document.title = 'Satış hikâyen · Interview Demo';
    document.body.classList.add('story-output-page');

    const links = Array.from(document.querySelectorAll('aside nav a'));
    const storyLink = links.find(link => link.textContent.includes('Hikâyem'));
    links.forEach(link => {
      link.removeAttribute('aria-current');
      link.classList.remove('story-nav-active');
      link.classList.remove('bg-[#51409D]', 'text-on-primary', 'font-semibold', 'shadow-xs', 'rounded-[8px]');
      link.classList.add('rounded-lg', 'text-on-surface-variant', 'hover:bg-[#7564C7]', 'transition-colors');
      link.querySelectorAll('.text-on-primary').forEach(item => {
        item.classList.remove('text-on-primary');
        if (item.classList.contains('material-symbols-outlined')) item.classList.add('text-outline');
      });
    });
    if (storyLink) {
      storyLink.href = 'ciktilar.html';
      storyLink.setAttribute('aria-current', 'page');
      storyLink.classList.add('story-nav-active');
    }

    const homeworkLink = links.find(link => link.textContent.includes('Ödevlerim'));
    const countBadge = homeworkLink?.querySelector(':scope > span');
    if (countBadge) {
      let unreadCount = 0;
      try {
        const savedTasks = localStorage.getItem('demoOdevler');
        if (savedTasks !== null) {
          const tasks = JSON.parse(savedTasks);
          if (!Array.isArray(tasks)) throw new TypeError('demoOdevler bir JSON dizisi olmalı.');
          unreadCount = tasks.filter(task =>
            task && typeof task === 'object' &&
            (task.okundu === false || (typeof task.okundu !== 'boolean' && task.durum !== 'teslim'))
          ).length;
        }
      } catch (error) {
        console.error('Okunmamış ödev sayısı belirlenemedi.', error);
        countBadge.hidden = true;
        homeworkLink.setAttribute('aria-label', 'Ödevlerim');
      }
      if (countBadge.hidden) {
        // A storage error is surfaced in the console; do not show a stale count.
      } else if (unreadCount > 0) {
        countBadge.textContent = String(unreadCount);
        countBadge.classList.add('story-homework-count');
        homeworkLink.setAttribute('aria-label', 'Ödevlerim, ' + unreadCount + ' okunmamış ödev');
      } else {
        countBadge.hidden = true;
        homeworkLink.setAttribute('aria-label', 'Ödevlerim');
      }
    }

    const avatar = Array.from(document.querySelectorAll('aside .rounded-full'))
      .find(node => node.textContent.trim() === 'EY');
    avatar?.classList.add('story-profile-avatar');
  }

  function makeCandidateAction(label, icon, className, description, onClick) {
    const button = element('button', className);
    button.type = 'button';
    button.append(element('span', 'material-symbols-outlined', icon), element('span', '', label));
    button.setAttribute('aria-describedby', 'story-output-action-help');
    button.title = description;
    button.addEventListener('click', onClick);
    return button;
  }

  function outputText(target) {
    if (target === 'story') {
      return Array.from(document.querySelectorAll('[data-story-sentence]'))
        .map(sentence => sentence.textContent.trim()).filter(Boolean).join(' ');
    }
    if (target === 'cv') return document.getElementById('story-cv-summary')?.textContent.trim() || '';
    const answer = document.querySelector('[data-interview-answer="' + CSS.escape(target) + '"]');
    return answer?.textContent.trim() || '';
  }

  async function copyCandidateOutput(target) {
    const text = outputText(target);
    if (!text) {
      showCandidateToast('Kopyalanacak içerik bulunamadı.');
      return;
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = element('textarea');
        textarea.value = text;
        textarea.setAttribute('aria-hidden', 'true');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand('copy');
        textarea.remove();
        if (!copied) throw new Error('Tarayıcı panoya kopyalamayı desteklemiyor.');
      }
      showCandidateToast('Kopyalandı');
    } catch (error) {
      console.error('Hikâye çıktısı panoya kopyalanamadı.', error);
      showCandidateToast('Kopyalanamadı. Tarayıcı izinlerini kontrol et.');
    }
  }

  function printCandidateOutput(target) {
    document.body.dataset.printTarget = target || 'all';
    window.addEventListener('afterprint', () => {
      delete document.body.dataset.printTarget;
    }, { once: true });
    window.print();
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function isFollowupComplete(sentence) {
    return sentence.gap?.status === 'answered' || sentence.takipCevabi?.durum === 'tamamlandi';
  }

  function getGapStatus(sentence) {
    if (sentence.gap?.status) return sentence.gap.status;
    if (sentence.takipCevabi?.durum === 'tamamlandi') return 'answered';
    if (sentence.takipCevabi?.durum === 'seansta') return 'deferred';
    return 'open';
  }

  function normalizeGapRecords(storyData) {
    const config = readGapTypeConfig();
    storyData.cumleler.forEach(sentence => {
      const gapTypeId = sentence.gapTypeId || sentence.gap?.gapTypeId;
      const gapType = config.gapTypes.find(item => item.id === gapTypeId);
      const legacy = sentence.takipCevabi;
      const isUnresolvedPlaceholder = /henüz paylaşmadım|henüz net değil/i.test(sentence.metin);
      if (!sentence.gap && !gapTypeId && !legacy && !sentence.bilgiGerekli && !isUnresolvedPlaceholder) return;
      const status = sentence.gap?.status ||
        (legacy?.durum === 'tamamlandi' ? 'answered' : legacy?.durum === 'seansta' ? 'deferred' : 'open');
      if (gapTypeId) sentence.gapTypeId = gapTypeId;
      sentence.gap = {
        questionNo: Number(gapType?.mainQuestionNo || sentence.gap?.questionNo || legacy?.soruNo || 1),
        type: gapType?.inputType || sentence.gap?.type || legacy?.tur || 'short',
        status,
        answer: sentence.gap?.answer ?? legacy?.cevap ?? null,
        answeredAt: sentence.gap?.answeredAt ?? legacy?.tarih ?? null,
        gapTypeId: gapTypeId || null
      };
    });
  }

  function readMainQuestionAnswers() {
    try {
      const saved = localStorage.getItem('demoSoruCevaplari');
      if (saved === null) return {};
      const answers = JSON.parse(saved);
      if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
        throw new TypeError('demoSoruCevaplari geçersiz.');
      }
      return answers;
    } catch (error) {
      console.error('Ana soru yanıtları okunamadı; eksik sorular belirlenemedi.', error);
      return {};
    }
  }

  function addGapsForUnansweredQuestions(storyData) {
    const answers = readMainQuestionAnswers();
    const config = readGapTypeConfig();
    const existing = new Set(storyData.cumleler.map(sentence => sentence.id));

    for (let questionNo = 1; questionNo <= 5; questionNo += 1) {
      const answer = String(answers[questionNo] || '').trim();
      let candidates = [];
      if (!answer) {
        candidates = config.gapTypes.filter(type => Number(type.mainQuestionNo) === questionNo);
        if (questionNo === 4) candidates = candidates.filter(type => type.id === 'three-words-empty');
      } else if (questionNo === 4) {
        const words = answer.split(/\s+/u).filter(Boolean);
        if (words.length < 3) {
          candidates = config.gapTypes.filter(type =>
            Number(type.mainQuestionNo) === questionNo && type.id === 'three-words-incomplete'
          );
        } else {
          candidates = config.gapTypes.filter(type =>
            Number(type.mainQuestionNo) === questionNo && type.id === 'three-words-evidence-missing'
          );
        }
      }

      candidates.forEach(type => addGapRecord(storyData, type, answer, existing));
    }
  }

  function addGapRecord(storyData, type, answer, knownIds) {
    const id = 'gap-' + type.id;
    const existing = knownIds || new Set(storyData.cumleler.map(sentence => sentence.id));
    if (existing.has(id)) return;
    const questionNo = Number(type.mainQuestionNo);
    const config = readGapTypeConfig();
    const question = config.mainQuestions[questionNo] || 'Ana soru ' + questionNo;
    storyData.cumleler.push({
      id,
      metin: type.label + ' · yanıt bekleniyor.',
      kaynak: answer ? { cevapNo: questionNo, soru: question, alinti: answer } : null,
      bilgiGerekli: type.label,
      gapTypeId: type.id,
      generatedFromQuestion: true,
      gap: {
        questionNo,
        type: type.inputType,
        status: 'open',
        answer: null,
        answeredAt: null,
        gapTypeId: type.id
      }
    });
    existing.add(id);
  }
  function getFollowupItems() {
    return data.cumleler.filter(sentence =>
      sentence.gap || sentence.takipCevabi || sentence.bilgiGerekli || /henüz paylaşmadım|henüz net değil/i.test(sentence.metin)
    );
  }

  function readGapTypeConfig() {
    const defaults = GAP_TYPE_CONFIG && Array.isArray(GAP_TYPE_CONFIG.gapTypes)
      ? GAP_TYPE_CONFIG
      : { mainQuestions: {}, gapTypes: [] };
    try {
      const saved = localStorage.getItem(GAP_TYPES_STORAGE_KEY);
      if (saved === null) return defaults;
      const config = JSON.parse(saved);
      if (!config || !Array.isArray(config.gapTypes) || !config.mainQuestions) {
        throw new TypeError('Takip sorusu yapılandırması geçersiz.');
      }
      return config;
    } catch (error) {
      console.error('Takip sorusu yapılandırması okunamadı; varsayılanlar kullanılıyor.', error);
      return defaults;
    }
  }

  function saveGapTypeConfig(config) {
    try {
      localStorage.setItem(GAP_TYPES_STORAGE_KEY, JSON.stringify(config));
      return true;
    } catch (error) {
      console.error('Takip sorusu yapılandırması kaydedilemedi.', error);
      showStorageError();
      return false;
    }
  }

  function getFollowupConfig(sentence) {
    const config = readGapTypeConfig();
    const type = config.gapTypes.find(item => item.id === sentence.gapTypeId);
    if (!type) return null;
    const questionNo = Number(type.mainQuestionNo);
    return {
      ...type,
      questionNo,
      type: type.inputType,
      question: type.question,
      info: sentence.bilgiGerekli || type.label,
      mainQuestion: config.mainQuestions[questionNo] || 'Ana soru ' + questionNo
    };
  }

  function renderGapTypeAdminEditor(container) {
    const config = readGapTypeConfig();
    const details = element('details', 'advisor-gap-type-editor');
    const summary = element('summary', 'advisor-gap-type-editor-summary', 'Yönetim · Takip sorusu yapılandırması');
    details.appendChild(summary);
    details.appendChild(element(
      'p',
      'advisor-gap-type-editor-note',
      'Değişiklikler bu tarayıcıda saklanır ve adayın takip formunda kullanılır.'
    ));
    const form = element('form', 'advisor-gap-type-editor-form');
    const list = element('div', 'advisor-gap-type-list');

    function addTypeEditor(type) {
      const fieldset = element('fieldset', 'advisor-gap-type-card');
      fieldset.dataset.gapTypeId = type.id;
      fieldset.appendChild(element('legend', 'advisor-gap-type-id', type.id || 'Yeni eksik türü'));

      const labelInput = element('input', 'advisor-gap-type-input');
      labelInput.name = 'label';
      labelInput.value = type.label || '';
      labelInput.required = true;
      labelInput.setAttribute('aria-label', 'Eksik türü adı');

      const questionSelect = element('select', 'advisor-gap-type-input');
      questionSelect.name = 'mainQuestionNo';
      questionSelect.setAttribute('aria-label', 'Bağlı ana soru');
      Object.entries(config.mainQuestions).forEach(([number, question]) => {
        const option = element('option', '', 'Soru ' + number + ' · ' + question);
        option.value = number;
        questionSelect.appendChild(option);
      });
      questionSelect.value = String(type.mainQuestionNo || 1);

      const kindSelect = element('select', 'advisor-gap-type-input');
      kindSelect.name = 'inputType';
      kindSelect.setAttribute('aria-label', 'Yanıt türü');
      [['choice', 'Seçenekli'], ['multi-choice', 'Çoklu seçim'], ['short', 'Kısa metin'], ['number', 'Sayı/aralık']].forEach(([value, text]) => {
        const option = element('option', '', text);
        option.value = value;
        kindSelect.appendChild(option);
      });
      kindSelect.value = type.inputType || 'short';

      const questionInput = element('textarea', 'advisor-gap-type-input');
      questionInput.name = 'question';
      questionInput.rows = 2;
      questionInput.value = type.question || '';
      questionInput.required = true;
      questionInput.setAttribute('aria-label', 'Takip sorusu');

      const optionsInput = element('textarea', 'advisor-gap-type-input');
      optionsInput.name = 'options';
      optionsInput.rows = 4;
      optionsInput.value = Array.isArray(type.options) ? type.options.join('\n') : '';
      optionsInput.setAttribute('aria-label', 'Seçenekler, her satıra bir seçenek');
      const optionsField = element('label', 'advisor-gap-type-field', 'Seçenekler (satır başına bir tane)');
      optionsField.appendChild(optionsInput);
      optionsField.hidden = !['choice', 'multi-choice'].includes(kindSelect.value);

      const answerTemplate = element('input', 'advisor-gap-type-input');
      answerTemplate.name = 'answerTemplate';
      answerTemplate.value = type.answerTemplate || '';
      answerTemplate.placeholder = '{answer} bölümüne adayın yanıtı eklenir';
      answerTemplate.setAttribute('aria-label', 'Yanıttan kurulacak hikâye cümlesi şablonu');
      const templateField = element('label', 'advisor-gap-type-field', 'Hikâye cümlesi şablonu (isteğe bağlı)');
      templateField.appendChild(answerTemplate);

      const selectionLimit = element('input', 'advisor-gap-type-input');
      selectionLimit.type = 'number';
      selectionLimit.min = '1';
      selectionLimit.max = '9';
      selectionLimit.name = 'selectionLimit';
      selectionLimit.value = String(type.selectionLimit || 3);
      selectionLimit.setAttribute('aria-label', 'En fazla seçilebilecek seçenek sayısı');
      const selectionLimitField = element('label', 'advisor-gap-type-field', 'Çoklu seçim sınırı');
      selectionLimitField.appendChild(selectionLimit);
      selectionLimitField.hidden = kindSelect.value !== 'multi-choice';

      const optional = element('input');
      optional.type = 'checkbox';
      optional.name = 'optional';
      optional.checked = Boolean(type.optional);
      optional.setAttribute('aria-label', 'Yanıt isteğe bağlı');
      const optionalField = element('label', 'advisor-gap-type-field', 'Yanıt isteğe bağlı');
      optionalField.appendChild(optional);

      const maxSentences = element('input', 'advisor-gap-type-input');
      maxSentences.type = 'number';
      maxSentences.min = '1';
      maxSentences.max = '10';
      maxSentences.name = 'maxSentences';
      maxSentences.value = type.maxSentences || '';
      maxSentences.setAttribute('aria-label', 'En fazla cümle sayısı');
      const maxSentencesField = element('label', 'advisor-gap-type-field', 'Maksimum cümle sayısı');
      maxSentencesField.appendChild(maxSentences);

      const targetWordCount = element('input', 'advisor-gap-type-input');
      targetWordCount.type = 'number';
      targetWordCount.min = '1';
      targetWordCount.max = '20';
      targetWordCount.name = 'targetWordCount';
      targetWordCount.value = type.targetWordCount || '';
      targetWordCount.setAttribute('aria-label', 'Hedef toplam kelime sayısı');
      const targetWordCountField = element('label', 'advisor-gap-type-field', 'Hedef toplam kelime sayısı');
      targetWordCountField.appendChild(targetWordCount);

      const helperInput = element('textarea', 'advisor-gap-type-input');
      helperInput.name = 'helperText';
      helperInput.rows = 2;
      helperInput.value = type.helperText || '';
      helperInput.setAttribute('aria-label', 'Yardımcı metin');

      const valuePlaceholder = element('input', 'advisor-gap-type-input');
      valuePlaceholder.name = 'valuePlaceholder';
      valuePlaceholder.value = type.valuePlaceholder || '';
      valuePlaceholder.setAttribute('aria-label', 'Sayı alanı örnek metni');
      const periodPlaceholder = element('input', 'advisor-gap-type-input');
      periodPlaceholder.name = 'periodPlaceholder';
      periodPlaceholder.value = type.periodPlaceholder || '';
      periodPlaceholder.setAttribute('aria-label', 'Dönem alanı örnek metni');
      const deferLabel = element('input', 'advisor-gap-type-input');
      deferLabel.name = 'deferLabel';
      deferLabel.value = type.deferLabel || '';
      deferLabel.setAttribute('aria-label', 'Yanıtlamama seçeneği metni');
      const numberFields = element('div', 'advisor-gap-type-number-fields');
      numberFields.append(valuePlaceholder, periodPlaceholder, deferLabel);
      numberFields.hidden = kindSelect.value !== 'number';

      kindSelect.addEventListener('change', () => {
        optionsField.hidden = !['choice', 'multi-choice'].includes(kindSelect.value);
        numberFields.hidden = kindSelect.value !== 'number';
        selectionLimitField.hidden = kindSelect.value !== 'multi-choice';
      });

      const fields = element('div', 'advisor-gap-type-fields');
      fields.append(
        element('label', 'advisor-gap-type-field', 'Eksik türü adı'),
        element('label', 'advisor-gap-type-field', 'Ana soru'),
        element('label', 'advisor-gap-type-field', 'Yanıt türü'),
        element('label', 'advisor-gap-type-field', 'Takip sorusu'),
        optionsField,
        element('label', 'advisor-gap-type-field', 'Yardımcı metin'),
        templateField,
        selectionLimitField,
        optionalField,
        maxSentencesField,
        targetWordCountField
      );
      fields.children[0].appendChild(labelInput);
      fields.children[1].appendChild(questionSelect);
      fields.children[2].appendChild(kindSelect);
      fields.children[3].appendChild(questionInput);
      fields.children[5].appendChild(helperInput);
      fields.children[6].appendChild(answerTemplate);
      fields.children[7].appendChild(selectionLimit);
      fields.children[8].appendChild(optional);
      fields.children[9].appendChild(maxSentences);
      fields.children[10].appendChild(targetWordCount);
      fieldset.append(fields, numberFields);
      list.appendChild(fieldset);
    }

    config.gapTypes.forEach(addTypeEditor);
    form.appendChild(list);
    const actions = element('div', 'advisor-gap-type-actions');
    const addButton = element('button', 'advisor-gap-type-button advisor-gap-type-button--secondary', 'Yeni eksik türü ekle');
    addButton.type = 'button';
    const saveButton = element('button', 'advisor-gap-type-button', 'Yapılandırmayı kaydet');
    saveButton.type = 'submit';
    const feedback = element('p', 'advisor-gap-type-feedback');
    feedback.setAttribute('role', 'status');
    feedback.setAttribute('aria-live', 'polite');
    actions.append(addButton, saveButton);
    form.append(actions, feedback);
    details.appendChild(form);

    addButton.addEventListener('click', () => {
      const id = 'gap-type-' + Date.now();
      const type = {
        id,
        label: '',
        mainQuestionNo: 1,
        inputType: 'short',
        question: '',
        options: []
      };
      config.gapTypes.push(type);
      addTypeEditor(type);
      list.lastElementChild.querySelector('[name="label"]').focus();
    });

    form.addEventListener('submit', event => {
      event.preventDefault();
      const gapTypes = Array.from(list.children).map(fieldset => {
        const fields = fieldset.querySelectorAll('input, select, textarea');
        const values = Object.fromEntries(Array.from(fields, input => [input.name, input.value.trim()]));
        return {
          id: fieldset.dataset.gapTypeId,
          label: values.label,
          mainQuestionNo: Number(values.mainQuestionNo),
          inputType: values.inputType,
          question: values.question,
          options: values.options.split('\n').map(option => option.trim()).filter(Boolean),
          helperText: values.helperText,
          answerTemplate: values.answerTemplate,
          selectionLimit: Number(values.selectionLimit) || 3,
          optional: fieldset.querySelector('[name="optional"]').checked,
          maxSentences: Number(values.maxSentences) || null,
          targetWordCount: Number(values.targetWordCount) || null,
          valuePlaceholder: values.valuePlaceholder,
          periodPlaceholder: values.periodPlaceholder,
          deferLabel: values.deferLabel
        };
      });
      const ids = gapTypes.map(type => type.id);
      const invalid = gapTypes.find(type =>
        !type.label || !type.question ||
        !Number.isInteger(type.mainQuestionNo) ||
        !config.mainQuestions[type.mainQuestionNo] ||
        !['choice', 'multi-choice', 'short', 'number'].includes(type.inputType) ||
        (type.inputType === 'choice' && (type.options.length < 3 || type.options.length > 4)) ||
        (type.inputType === 'multi-choice' && (type.options.length < 3 || type.options.length > 12))
      );
      if (invalid || new Set(ids).size !== ids.length) {
        feedback.textContent = invalid
          ? 'Her tür için ad, takip sorusu ve geçerli ana soru gerekir; seçenekli türlerde 3–4, çoklu seçimde 3–12 seçenek gir.'
          : 'Eksik tür kimlikleri benzersiz olmalı.';
        return;
      }
      if (!saveGapTypeConfig({ mainQuestions: config.mainQuestions, gapTypes })) {
        feedback.textContent = 'Yapılandırma kaydedilemedi. Tarayıcı depolama alanını kontrol et.';
        return;
      }
      feedback.textContent = 'Takip sorusu yapılandırması kaydedildi.';
      renderAdvisor();
    });
    container.appendChild(details);
  }

  function renderCandidateStoryParagraph(story) {
    story.replaceChildren();
    story.dataset.sharedStory = '';
    const storySentences = data.cumleler.filter(sentence =>
      isFollowupComplete(sentence) ||
      (!sentence.bilgiGerekli && !/henüz paylaşmadım|henüz net değil/i.test(sentence.metin))
    );
    storySentences.forEach((sentence, index) => {
      if (index) story.appendChild(document.createTextNode(' '));
      const editable = element('span', 'rounded-sm outline-none focus:bg-[#EEECFF] focus:ring-1 focus:ring-[#51409D]');
      editable.classList.add('story-output-sentence');
      editable.contentEditable = 'true';
      editable.spellcheck = true;
      editable.dataset.sentenceId = sentence.id;
      editable.dataset.storySentence = '';
      editable.setAttribute('aria-label', 'Hikâye cümlesini düzenle');
      editable.title = 'Düzenlemek için tıkla';
      editable.textContent = sentence.metin;
      editable.addEventListener('blur', () => {
        const updated = editable.textContent.trim();
        const current = data.cumleler.find(item => item.id === sentence.id);
        if (!updated || !current || updated === current.metin) return;
        current.metin = updated;
        data.surum = (Number(data.surum) || 2) + 1;
        saveData();
        updateCandidateWordCount();
      });
      story.appendChild(editable);
    });
  }

  function makeFollowupRow(sentence, allowAnswer) {
    const row = element('div', 'story-output-missing-row');
    row.dataset.followupRow = sentence.id;
    const completed = isFollowupComplete(sentence);
    const deferred = getGapStatus(sentence) === 'deferred';
    const config = getFollowupConfig(sentence);
    const badgeText = completed
      ? 'Tamamlandı'
      : deferred
        ? 'Seansta konuşalım'
        : config?.optional ? 'İsteğe bağlı' : 'Bilgi gerekli';
    const badge = element('span', 'story-output-missing-badge' + (completed ? ' is-complete' : ''), badgeText);
    row.append(badge, element('p', 'story-output-missing-text',
      completed ? (sentence.gap?.answer || sentence.takipCevabi?.cevap) :
        sentence.generatedFromQuestion && config ? config.label + ' · yanıt bekleniyor.' : sentence.metin));
    if (!completed && sentence.bilgiGerekli) {
      row.appendChild(element('p', 'story-output-missing-detail', 'Netleştirilecek bilgi: ' + (config?.label || sentence.bilgiGerekli)));
    }
    if (completed) return row;
    if (deferred || !allowAnswer) return row;

    if (!config) return row;
    const controls = element('div', 'story-output-followup-controls');
    const openButton = element('button', 'story-output-followup-open', 'Şimdi cevapla');
    openButton.type = 'button';
    openButton.setAttribute('aria-expanded', 'false');
    const panel = element('div', 'story-output-followup-panel');
    panel.hidden = true;
    panel.setAttribute('aria-label', 'Takip sorusu');
    panel.append(
      element('span', 'story-output-followup-source', 'Soru ' + config.questionNo + '\'e bağlı'),
      element('p', 'story-output-followup-question', config.question)
    );

    const form = element('form', 'story-output-followup-form');
    form.setAttribute('autocomplete', 'off');
    let responseInput;
    let otherTextInput;
    if (config.type === 'choice' || config.type === 'multi-choice') {
      const group = element('fieldset', 'story-output-followup-options');
      group.appendChild(element('legend', 'story-output-followup-label', 'Bir seçenek belirle'));
      config.options.forEach((option, index) => {
        const label = element('label', 'story-output-followup-option');
        const radio = element('input');
        radio.type = config.type === 'multi-choice' ? 'checkbox' : 'radio';
        radio.name = 'followup-choice';
        radio.value = option;
        if (config.type === 'choice') radio.required = index === 0;
        if (index === 0) responseInput = radio;
        label.append(radio, document.createTextNode(option));
        group.appendChild(label);
      });
      const otherLabel = element('label', 'story-output-followup-option');
      const otherRadio = element('input');
      otherRadio.type = config.type === 'multi-choice' ? 'checkbox' : 'radio';
      otherRadio.name = 'followup-choice';
      otherRadio.value = '__other__';
      otherTextInput = element('input', 'story-output-followup-other');
      otherTextInput.type = 'text';
      otherTextInput.name = 'followup-other';
      otherTextInput.autocomplete = 'off';
      otherTextInput.placeholder = 'Diğer seçeneğini yaz';
      otherTextInput.setAttribute('aria-label', 'Diğer seçeneğini yaz');
      otherTextInput.disabled = true;
      otherLabel.append(otherRadio, document.createTextNode('Diğer'), otherTextInput);
      group.appendChild(otherLabel);
      group.addEventListener('change', event => {
        if (config.type === 'multi-choice') {
          const selected = group.querySelectorAll('input[type="checkbox"]:checked');
          if (selected.length > Number(config.selectionLimit || 3)) {
            event.target.checked = false;
          }
        }
        otherTextInput.disabled = otherRadio.checked === false;
        if (otherRadio.checked) otherTextInput.focus();
      });
      form.appendChild(group);
    } else if (config.type === 'number') {
      const numberLabel = element('label', 'story-output-followup-field');
      numberLabel.appendChild(element('span', 'story-output-followup-label', 'Sayı veya aralık'));
      responseInput = element('input', 'story-output-followup-input');
      responseInput.type = 'text';
      responseInput.inputMode = 'decimal';
      responseInput.autocomplete = 'off';
      responseInput.placeholder = config.valuePlaceholder || 'Örn. %12 veya 10–15 adet';
      responseInput.setAttribute('aria-label', 'Başarı için sayı veya aralık');
      responseInput.required = true;
      numberLabel.appendChild(responseInput);
      const periodLabel = element('label', 'story-output-followup-field');
      periodLabel.appendChild(element('span', 'story-output-followup-label', 'Dönem'));
      const periodInput = element('input', 'story-output-followup-input');
      periodInput.type = 'text';
      periodInput.name = 'followup-period';
      periodInput.autocomplete = 'off';
      periodInput.placeholder = config.periodPlaceholder || 'Dönem';
      periodInput.setAttribute('aria-label', 'Başarının gerçekleştiği dönem');
      periodInput.required = true;
      periodLabel.appendChild(periodInput);
      form.append(numberLabel, periodLabel);
    } else {
      responseInput = element('textarea', 'story-output-followup-input');
      responseInput.rows = config.maxSentences === 2 ? 2 : 3;
      responseInput.maxLength = 500;
      responseInput.autocomplete = 'off';
      responseInput.placeholder = 'Kendi sözlerinle kısaca yaz';
      responseInput.setAttribute('aria-label', config.info + ' hakkında yanıt');
      responseInput.required = true;
      form.appendChild(responseInput);
    }
    let helperText = config.helperText || '';
    if (config.targetWordCount) {
      const currentAnswer = String(readMainQuestionAnswers()[config.questionNo] || '').trim();
      const currentWordCount = currentAnswer.split(/\s+/u).filter(Boolean).length;
      const missingWordCount = Math.max(1, config.targetWordCount - currentWordCount);
      helperText = 'Eksik sayıda kelimeyi gir: ' + missingWordCount + (missingWordCount === 1 ? ' kelime.' : ' kelime.');
    }
    if (helperText) form.appendChild(element('p', 'story-output-followup-helper', helperText));

    const error = element('p', 'story-output-followup-error');
    error.hidden = true;
    error.setAttribute('role', 'alert');
    const actions = element('div', 'story-output-followup-actions');
    const deferButton = element('button', 'story-output-followup-defer', config.deferLabel || 'Seansta konuşalım');
    deferButton.type = 'button';
    const submit = element('button', 'story-output-followup-submit', 'Cevabı kaydet');
    submit.type = 'submit';
    actions.append(deferButton, submit);
    form.append(error, actions);
    panel.appendChild(form);
    controls.append(openButton, panel);
    row.appendChild(controls);

    openButton.addEventListener('click', () => {
      panel.hidden = !panel.hidden;
      openButton.setAttribute('aria-expanded', String(!panel.hidden));
      if (!panel.hidden) {
        form.reset();
        form.querySelectorAll('input[type="text"], textarea').forEach(input => {
          input.defaultValue = '';
          input.value = '';
        });
        if (otherTextInput) otherTextInput.disabled = true;
        error.hidden = true;
        responseInput.focus();
      }
    });
    form.addEventListener('submit', event => {
      event.preventDefault();
      let answer = '';
      if (config.type === 'choice') {
        const choice = new FormData(form).get('followup-choice');
        answer = choice === '__other__' ? otherTextInput.value.trim() : String(choice || '').trim();
      } else if (config.type === 'multi-choice') {
        const selectedChoices = new FormData(form).getAll('followup-choice');
        if (selectedChoices.length !== Number(config.selectionLimit || 3)) {
          error.textContent = 'Devam etmek için tam ' + Number(config.selectionLimit || 3) + ' kelime seç.';
          error.hidden = false;
          responseInput.focus();
          return;
        }
        if (selectedChoices.includes('__other__') && !otherTextInput.value.trim()) {
          error.textContent = 'Diğer kelimeyi yaz.';
          error.hidden = false;
          otherTextInput.focus();
          return;
        }
        const choices = selectedChoices
          .map(choice => choice === '__other__' ? otherTextInput.value.trim() : String(choice).trim())
          .filter(Boolean);
        answer = choices.length > 1
          ? choices.slice(0, -1).join(', ') + ' ve ' + choices[choices.length - 1]
          : choices[0] || '';
      } else {
        answer = responseInput.value.trim();
        if (config.type === 'number') {
          const period = form.elements.namedItem('followup-period').value.trim();
          answer = answer && period ? answer + ' · ' + period : '';
        }
      }
      if (config.targetWordCount) {
        const answerWords = answer.split(/\s+/u).filter(Boolean).length;
        const currentAnswer = String(readMainQuestionAnswers()[config.questionNo] || '').trim();
        const currentWordCount = currentAnswer.split(/\s+/u).filter(Boolean).length;
        const expected = Math.max(1, config.targetWordCount - currentWordCount);
        if (answerWords !== expected) {
          error.textContent = 'Tam ' + expected + (expected === 1 ? ' kelime gir.' : ' kelime gir.');
          error.hidden = false;
          responseInput.focus();
          return;
        }
      }
      if (config.maxSentences && splitSentences(answer).length > config.maxSentences) {
        error.textContent = 'Yanıtını en fazla ' + config.maxSentences + ' cümleyle sınırla.';
        error.hidden = false;
        responseInput.focus();
        return;
      }
      if (!answer) {
        error.textContent = 'Devam etmek için bir yanıt yaz veya seçenek belirle.';
        error.hidden = false;
        (otherTextInput?.disabled === false ? otherTextInput : responseInput).focus();
        return;
      }
      const candidateAnswer = answer;
      const storySentence = config.answerTemplate
        ? config.answerTemplate.replace(/\{answer\}/g, candidateAnswer)
        : candidateAnswer;
      const previous = { ...sentence };
      const previousSentenceCount = data.cumleler.length;
      sentence.gap = {
        ...sentence.gap,
        questionNo: config.questionNo,
        type: config.type,
        status: 'answered',
        answer: candidateAnswer,
        answeredAt: new Date().toISOString(),
        gapTypeId: config.id
      };
      sentence.takipCevabi = {
        durum: 'tamamlandi',
        cevap: candidateAnswer,
        tur: config.type,
        soru: config.question,
        soruNo: config.questionNo,
        tarih: sentence.gap.answeredAt
      };
      sentence.metin = storySentence;
      sentence.kaynak = {
        cevapNo: config.questionNo,
        soru: config.mainQuestion,
        alinti: candidateAnswer
      };
      if (config.questionNo === 4 &&
          ['three-words-incomplete', 'three-words-empty'].includes(config.id)) {
        const evidenceType = readGapTypeConfig().gapTypes.find(type => type.id === 'three-words-evidence-missing');
        if (evidenceType) addGapRecord(data, evidenceType, candidateAnswer);
      }
      data.surum = (Number(data.surum) || 2) + 1;
      if (!saveData()) {
        Object.assign(sentence, previous);
        data.cumleler.length = previousSentenceCount;
        data.surum -= 1;
        return;
      }
      refreshCandidateFollowups();
      showCandidateToast('Cevabın kaydedildi. Hikâyenin ilgili paragrafı güncellendi.');
    });
    deferButton.addEventListener('click', () => {
      const previous = { gap: { ...sentence.gap }, takipCevabi: sentence.takipCevabi };
      sentence.gap = {
        ...sentence.gap,
        questionNo: config.questionNo,
        type: config.type,
        status: 'deferred',
        gapTypeId: config.id
      };
      sentence.takipCevabi = {
        durum: 'seansta',
        tur: config.type,
        soru: config.question,
        soruNo: config.questionNo
      };
      if (!saveData()) {
        sentence.gap = previous.gap;
        if (previous.takipCevabi) sentence.takipCevabi = previous.takipCevabi;
        else delete sentence.takipCevabi;
        return;
      }
      refreshCandidateFollowups();
      showCandidateToast('Bu başlık danışmanınla görüşmek üzere işaretlendi.');
    });
    return row;
  }

  function renderCandidateMissingBox(story) {
    document.querySelector('[data-story-missing]')?.remove();
    const items = getFollowupItems();
    if (!items.length) return null;
    const missingBox = element('section', 'story-output-missing');
    missingBox.dataset.storyMissing = '';
    missingBox.setAttribute('aria-labelledby', 'story-missing-title');
    missingBox.appendChild(element('h3', 'story-output-missing-title', 'Seansta tamamlanacaklar'));
    missingBox.querySelector('h3').id = 'story-missing-title';

    const config = readGapTypeConfig();
    const typeOrder = new Map(config.gapTypes.map((type, index) => [type.id, index]));
    const answers = readMainQuestionAnswers();
    const pendingItems = items.filter(sentence =>
      !isFollowupComplete(sentence) &&
      getFollowupConfig(sentence)
    );
    const orderedItems = pendingItems.sort((left, right) => {
      const leftQuestion = Number(left.gap?.questionNo || 1);
      const rightQuestion = Number(right.gap?.questionNo || 1);
      const leftBlank = !String(answers[leftQuestion] || '').trim();
      const rightBlank = !String(answers[rightQuestion] || '').trim();
      return Number(rightBlank) - Number(leftBlank) ||
        leftQuestion - rightQuestion ||
        (typeOrder.get(left.gapTypeId) ?? Number.MAX_SAFE_INTEGER) -
        (typeOrder.get(right.gapTypeId) ?? Number.MAX_SAFE_INTEGER);
    });
    const firstUnresolvedByQuestion = new Map();
    orderedItems.forEach(sentence => {
      const questionNo = Number(sentence.gap?.questionNo || 1);
      if (!firstUnresolvedByQuestion.has(questionNo)) firstUnresolvedByQuestion.set(questionNo, sentence);
    });
    const eligibleItems = Array.from(firstUnresolvedByQuestion.values()).filter(sentence =>
      getGapStatus(sentence) === 'open'
    );
    const visibleItems = eligibleItems.slice(0, 3);
    const visibleIds = new Set(visibleItems.map(sentence => sentence.id));
    const otherItems = orderedItems.filter(sentence =>
      getGapStatus(sentence) === 'open' && !visibleIds.has(sentence.id)
    );
    const unmappedItems = items.filter(sentence =>
      !getFollowupConfig(sentence) &&
      !isFollowupComplete(sentence) &&
      getGapStatus(sentence) !== 'deferred'
    );
    visibleItems.forEach(sentence => missingBox.appendChild(makeFollowupRow(sentence, true)));
    if (otherItems.length || unmappedItems.length) {
      const other = element('details', 'story-output-followup-other-list');
      const summary = element('summary', '', 'Diğer eksikler (' + (otherItems.length + unmappedItems.length) + ')');
      other.appendChild(summary);
      otherItems.forEach(sentence => {
        const isFirstForQuestion = firstUnresolvedByQuestion.get(Number(sentence.gap?.questionNo || 1))?.id === sentence.id;
        other.appendChild(makeFollowupRow(sentence, isFirstForQuestion && getGapStatus(sentence) === 'open'));
      });
      unmappedItems.forEach(sentence => other.appendChild(makeFollowupRow(sentence, false)));
      missingBox.appendChild(other);
    }
    items.filter(sentence => isFollowupComplete(sentence) || getGapStatus(sentence) === 'deferred')
      .forEach(sentence => missingBox.appendChild(makeFollowupRow(sentence, false)));
    story.insertAdjacentElement('afterend', missingBox);
    return missingBox;
  }

  function refreshCandidateFollowups() {
    const story = document.querySelector('[data-shared-story]');
    if (!story) {
      console.error('Takip yanıtı sonrası hikâye paragrafı bulunamadı.');
      return;
    }
    renderCandidateStoryParagraph(story);
    const missingBox = renderCandidateMissingBox(story);
    const hint = document.getElementById('candidate-edit-hint');
    if (hint) (missingBox || story).insertAdjacentElement('afterend', hint);
    const versionBadge = Array.from(document.querySelectorAll('.story-output-status-badge'))
      .find(badge => badge.textContent.trim().startsWith('Sürüm '));
    if (versionBadge) versionBadge.textContent = 'Sürüm ' + (Number(data.surum) || 2);
    updateCandidateWordCount();
  }

  function renderCandidate() {
    setCandidateSidebar();
    const storyHeading = Array.from(document.querySelectorAll('h2')).find(node => node.textContent.trim() === 'Satış hikâyen');
    const story = storyHeading?.nextElementSibling;
    if (story && story.tagName === 'P') {
      const storyCard = story.parentElement?.parentElement;
      storyCard?.setAttribute('data-story-output', 'story');
      story.classList.add('story-output-story');
      document.querySelector('[data-story-missing]')?.remove();
      document.getElementById('candidate-edit-hint')?.remove();
      renderCandidateStoryParagraph(story);
      const missingBox = renderCandidateMissingBox(story);
      if (!document.getElementById('candidate-edit-hint')) {
        const hint = element('p', 'mt-2 text-[12px] text-[#51409D]', 'Bir cümleyi düzenlemek için tıkla; değişiklikler otomatik kaydedilir.');
        hint.id = 'candidate-edit-hint';
        hint.classList.add('story-edit-hint');
        (missingBox || story).insertAdjacentElement('afterend', hint);
      }
    }

    const interviewHeading = Array.from(document.querySelectorAll('h2')).find(node => node.textContent.trim() === 'Mülakat cevap taslakların');
    const interviewText = interviewHeading?.nextElementSibling;
    if (interviewText && interviewText.tagName === 'P') {
      const interviewCard = interviewText.parentElement?.parentElement;
      interviewCard?.setAttribute('data-story-output', 'interview');
      interviewText.remove();
      const answers = element('div', 'story-interview-answers');
      data.ciktilar.mulakat.forEach((item, index) => {
        const answerId = 'interview-' + index;
        const block = element('article', 'story-interview-answer');
        block.append(
          element('h3', 'story-interview-question', item.soru),
          element('p', 'story-interview-response', item.cevap)
        );
        block.querySelector('p').dataset.interviewAnswer = answerId;
        block.appendChild(makeCandidateAction(
          'Kopyala', 'content_copy', 'story-output-button',
          'Bu mülakat cevabını kopyala',
          () => copyCandidateOutput(answerId)
        ));
        answers.appendChild(block);
      });
      interviewHeading.insertAdjacentElement('afterend', answers);
      interviewCard?.querySelectorAll('.border-t button').forEach(button => {
        if (button.textContent.includes('Kopyala')) button.remove();
      });
    }

    const cvHeading = Array.from(document.querySelectorAll('h2')).find(node => node.textContent.trim() === 'CV özet paragrafın');
    const cvText = cvHeading?.nextElementSibling;
    if (cvText && cvText.tagName === 'P') {
      cvText.textContent = data.ciktilar.cv;
      cvText.id = 'story-cv-summary';
      cvText.classList.add('story-output-cv');
      cvText.parentElement?.parentElement?.setAttribute('data-story-output', 'cv');
    }

    const titleRow = storyHeading?.closest('section')?.querySelector(':scope > div:first-child');
    if (titleRow) {
      titleRow.classList.add('story-output-title-row');
      titleRow.appendChild(makeCandidateAction(
        'Hepsini indir', 'download', 'story-output-button story-output-download-all',
        'Tüm hikâye çıktılarını yazdır veya PDF olarak kaydet',
        () => printCandidateOutput('all')
      ));

      const status = element('div', 'story-output-status');
      status.setAttribute('aria-label', 'Hikâye durumu');
      [
        ['Sürüm ' + (Number(data.surum) || 2), null],
        [wordCount() + ' kelime', 'true'],
        ['YZ ile oluşturuldu', null],
        ['Danışmanın notlarını okudu', null]
      ].forEach(([text, countBadge]) => {
        const badge = element('span', 'story-output-status-badge', text);
        if (countBadge) badge.dataset.storyWordCount = countBadge;
        status.appendChild(badge);
      });
      status.dataset.storyStatus = '';
      titleRow.insertAdjacentElement('afterend', status);
    }

    const contentSection = storyHeading?.closest('section');
    contentSection?.querySelectorAll('[data-story-output]').forEach(card => {
      const output = card.dataset.storyOutput;
      const actions = card.lastElementChild;
      if (!actions) return;
      actions.classList.add('story-output-actions');
      const copyButton = Array.from(actions.querySelectorAll('button'))
        .find(button => button.textContent.includes('Kopyala'));
      if (copyButton && output !== 'interview') {
        copyButton.dataset.storyCopy = output;
        copyButton.setAttribute('aria-describedby', 'story-output-action-help');
        copyButton.title = output === 'story' ? 'Hikâye metnini kopyala' : 'CV özetini kopyala';
        copyButton.addEventListener('click', () => copyCandidateOutput(output));
      }
      const printButton = Array.from(actions.querySelectorAll('button'))
        .find(button => button.textContent.includes('PDF'));
      if (printButton) {
        printButton.classList.add('story-output-button');
        printButton.setAttribute('aria-describedby', 'story-output-action-help');
        printButton.title = 'Bu bölümü yazdır veya PDF olarak kaydet';
        printButton.addEventListener('click', () => printCandidateOutput(output));
      }
    });

    const help = element('span', 'sr-only', 'Düğme açıklaması: içerik panoya kopyalanır veya yazdırma penceresinde PDF olarak kaydedilir.');
    help.id = 'story-output-action-help';
    document.body.appendChild(help);
    const nextStep = element('section', 'story-next-step-card');
    nextStep.appendChild(element('h2', '', 'Sıradaki adım'));
    const nextStepContent = element('div', 'story-next-step-content');
    nextStepContent.append(element('h3', '', '2. seansa hazırlan'));
    let hasAppointment = false;
    try {
      const savedAppointment = localStorage.getItem('demoRandevu');
      if (savedAppointment) {
        const appointment = JSON.parse(savedAppointment);
        if (!appointment || typeof appointment !== 'object' || Array.isArray(appointment)) {
          throw new TypeError('demoRandevu bir nesne olmalı.');
        }
        hasAppointment = Boolean(appointment.tarih || appointment.date || appointment.bas || appointment.time);
      }
    } catch (error) {
      console.error('Randevu durumu okunamadı.', error);
    }
    const nextStepLink = element('a', 'story-output-button story-next-step-link', hasAppointment ? 'Seanslarım' : 'Randevu al');
    nextStepLink.href = hasAppointment ? 'seanslar.html' : 'takvim.html';
    nextStepLink.setAttribute('aria-label', hasAppointment ? 'Seanslarım sayfasını aç' : '2. seans için randevu al');
    nextStepContent.appendChild(nextStepLink);
    nextStep.appendChild(nextStepContent);
    contentSection?.appendChild(nextStep);

    const homeLink = Array.from(contentSection?.querySelectorAll('a') || [])
      .find(link => link.textContent.trim() === 'Ana Ekrana Dön');
    if (homeLink) homeLink.href = 'ana.html';
  }

  function renderAdvisor() {
    const storyTab = Array.from(document.querySelectorAll('button')).find(node => node.textContent.trim() === 'Hikâye');
    const tabBar = storyTab?.parentElement;
    const oldContent = tabBar?.nextElementSibling;
    if (!tabBar || !oldContent) return;

    const tabs = Array.from(tabBar.querySelectorAll(':scope > button'));
    tabBar.setAttribute('role', 'tablist');
    tabBar.setAttribute('aria-label', 'Danışan detay sekmeleri');
    tabs.forEach((tab, index) => {
      const label = tab.textContent.trim();
      const active = label === 'Hikâye';
      tab.id = 'client-tab-' + index;
      tab.dataset.tabLabel = label;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-label', label);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      tab.addEventListener('keydown', event => {
        let nextIndex = tabs.indexOf(tab);
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (nextIndex + 1) % tabs.length;
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (nextIndex - 1 + tabs.length) % tabs.length;
        else if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = tabs.length - 1;
        else return;
        event.preventDefault();
        tabs.forEach((candidate, candidateIndex) => {
          const selected = candidateIndex === nextIndex;
          candidate.tabIndex = selected ? 0 : -1;
          candidate.setAttribute('aria-selected', String(selected));
        });
        tabs[nextIndex].focus();
        tabs[nextIndex].click();
      });
    });

    function storedItemCount(key, label) {
      try {
        const saved = localStorage.getItem(key);
        if (saved === null) return 0;
        const items = JSON.parse(saved);
        if (!Array.isArray(items)) throw new TypeError(key + ' bir JSON dizisi olmalı.');
        return items.length;
      } catch (error) {
        console.error(label + ' sayacı okunamadı.', error);
        return 0;
      }
    }

    [
      ['Notlar', 'demoGuruNotlari', 'Notlar', 1],
      ['Ödevler', 'guruElifTasks', 'Ödevler', 1]
    ].forEach(([label, storageKey, countLabel, initialCount]) => {
      const tab = tabs.find(item => item.dataset.tabLabel === label);
      if (!tab) return;
      const count = initialCount + storedItemCount(storageKey, countLabel);
      const badge = element('span', 'advisor-story-tab-count', String(count));
      badge.setAttribute('aria-hidden', 'true');
      tab.setAttribute('aria-label', label + ', ' + count + ' kayıt');
      tab.appendChild(badge);
    });

    const panel = element('div', 'advisor-story-panel flex flex-col gap-8');
    panel.id = 'client-panel-story';
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', storyTab.id);
    panel.tabIndex = 0;
    storyTab.setAttribute('aria-controls', panel.id);
    const sharedNote = element('p', 'advisor-permission-note', '');
    const permissionIcon = element('span', 'material-symbols-outlined advisor-permission-icon', 'lock');
    permissionIcon.setAttribute('aria-hidden', 'true');
    sharedNote.append(permissionIcon, element('span', '', 'Bu bölümleri adayın izniyle görüyorsun.'));
    document.querySelectorAll('.advisor-permission-note').forEach(note => note.remove());
    tabBar.before(sharedNote);

    const metadata = element('div', 'advisor-story-metadata-row');
    const sharedBadge = element('span', 'advisor-story-shared-badge');
    sharedBadge.append(element('span', 'advisor-story-shared-dot'), document.createTextNode('Aday hikâyeyi seninle paylaştı'));
    metadata.appendChild(sharedBadge);
    const versionLabel = element('div', 'advisor-version-badge');
    const versionButton = element('button', 'advisor-version-button', '');
    versionButton.type = 'button';
    versionButton.setAttribute('aria-label', 'Hikâye sürüm bilgisini göster');
    const versionWordCount = element('span', 'advisor-word-count', '');
    versionLabel.append(versionButton, document.createTextNode(' · '), versionWordCount);
    metadata.appendChild(versionLabel);
    const generatedBadge = element('span', 'advisor-generated-badge');
    const generatedIcon = element('span', 'material-symbols-outlined', 'auto_awesome');
    generatedIcon.setAttribute('aria-hidden', 'true');
    generatedBadge.append(generatedIcon, document.createTextNode('YZ ile oluşturuldu'));
    metadata.appendChild(generatedBadge);
    versionButton.addEventListener('click', () => {
      document.querySelector('.advisor-story-toast')?.remove();
      const toast = element('div', 'advisor-story-toast', versionButton.textContent + ' · ' + wordCount() + ' kelime');
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
      window.setTimeout(() => toast.remove(), 2800);
    });
    function updateVersion() {
      versionButton.textContent = 'Sürüm ' + data.surum;
      versionWordCount.textContent = wordCount() + ' kelime';
    }
    updateVersion();
    panel.appendChild(metadata);

    const columns = element('div', 'advisor-story-columns grid grid-cols-1 items-start gap-5 lg:grid-cols-12');
    const storyColumn = element('div', 'advisor-story-sections flex flex-col gap-8 lg:col-span-8');
    const sourceColumn = element('aside', 'advisor-source-column flex flex-col gap-2 lg:col-span-4');
    const storyBox = element('div', 'advisor-story-copy rounded-[8px] border border-[#7564C7] bg-white p-5');
    storyBox.id = 'advisor-story-copy';
    const sourceCard = element('section', 'advisor-source-card');
    const sourceTitle = element('h3', 'advisor-source-title');
    const sourceTitleIcon = element('span', 'material-symbols-outlined', 'forum');
    sourceTitleIcon.setAttribute('aria-hidden', 'true');
    sourceTitle.append(sourceTitleIcon, element('span', '', 'Kaynak · danışanın cevapları'));
    const sourceBox = element('div', 'advisor-source-list');
    sourceBox.setAttribute('aria-live', 'polite');
    sourceCard.append(sourceTitle, sourceBox);
    sourceColumn.append(sourceCard);

    let selectedId = data.cumleler.find(sentence =>
      !sentence.generatedFromQuestion || getGapStatus(sentence) === 'answered'
    )?.id;
    const sourceEntries = new Map();
    data.cumleler.forEach(sentence => {
      if (!sentence.kaynak) return;
      const source = sentence.kaynak;
      const key = JSON.stringify([source.cevapNo, source.soru, source.alinti]);
      if (sourceEntries.has(key)) return;
      const answer = element('article', 'advisor-source-answer');
      answer.dataset.sourceId = key;
      const question = element('h4', 'advisor-source-question', 'Cevap ' + source.cevapNo + ' · ' + source.soru);
      const quote = element('p', 'advisor-source-quote', '“' + source.alinti + '”');
      answer.append(question, quote);
      sourceEntries.set(key, answer);
      sourceBox.appendChild(answer);
    });

    function updateSource(sentence) {
      const sourceKey = sentence?.kaynak
        ? JSON.stringify([sentence.kaynak.cevapNo, sentence.kaynak.soru, sentence.kaynak.alinti])
        : null;
      sourceEntries.forEach((answer, key) => {
        answer.classList.toggle('is-source-active', key === sourceKey);
        answer.setAttribute('aria-current', String(key === sourceKey));
      });
    }

    data.cumleler.filter(sentence =>
      !sentence.generatedFromQuestion || getGapStatus(sentence) === 'answered'
    ).forEach((sentence, index) => {
      const row = element('div', 'advisor-story-sentence');
      const sentenceButton = element('button', 'advisor-story-sentence-button', sentence.metin);
      sentenceButton.type = 'button';
      sentenceButton.dataset.sentenceId = sentence.id;
      sentenceButton.setAttribute('aria-pressed', String(sentence.id === selectedId));
      sentenceButton.setAttribute('aria-label', sentence.metin);
      sentenceButton.addEventListener('click', () => {
        selectedId = sentence.id;
        storyBox.querySelectorAll('[data-sentence-id]').forEach(node => {
          const selected = node.dataset.sentenceId === selectedId;
          node.setAttribute('aria-pressed', String(selected));
        });
        updateSource(sentence);
      });
      if (sentence.kaynak && sourceEntries.size) {
        sentenceButton.addEventListener('mouseenter', () => updateSource(sentence));
        sentenceButton.addEventListener('focus', () => updateSource(sentence));
        sentenceButton.addEventListener('mouseleave', () => {
          updateSource(data.cumleler.find(item => item.id === selectedId));
        });
        sentenceButton.addEventListener('blur', () => {
          updateSource(data.cumleler.find(item => item.id === selectedId));
        });
      }

      const noteAction = element('button', 'advisor-story-note-action', '');
      noteAction.type = 'button';
      noteAction.title = 'Yorum ekle';
      noteAction.setAttribute('aria-label', 'Yorum ekle');
      noteAction.setAttribute('aria-expanded', 'false');
      noteAction.setAttribute('aria-controls', 'story-comment-' + sentence.id);
      noteAction.appendChild(element('span', 'material-symbols-outlined', 'add_comment'));
      row.append(sentenceButton, noteAction);
      const noteArea = element('div', 'advisor-story-note-area hidden pb-2 pl-2');
      noteArea.id = 'story-comment-' + sentence.id;
      noteArea.setAttribute('role', 'region');
      noteArea.setAttribute('aria-label', sentence.metin);
      const savedNote = loadNotes().find(note => note.cumleId === sentence.id);
      if (savedNote) {
        row.appendChild(element('span', 'rounded-full bg-[#EEECFF] px-2 py-0.5 text-[11px] font-semibold text-[#51409D]', 'Not eklendi'));
      }
      noteAction.addEventListener('click', () => {
        noteArea.classList.toggle('hidden');
        noteAction.setAttribute('aria-expanded', String(!noteArea.classList.contains('hidden')));
        if (noteArea.childElementCount) return;
        const form = element('form', 'flex flex-col gap-2');
        const textarea = element('textarea', 'w-full rounded-[8px] border border-[#DEDaf4] p-2 text-[13px] focus:border-[#51409D] focus:outline-none');
        textarea.rows = 3;
        textarea.placeholder = 'Bu cümleyle ilgili notun...';
        textarea.value = savedNote?.metin || '';
        const feedback = element('p', 'hidden text-[12px] text-[#B42318]');
        const saveButton = element('button', 'self-start rounded-[7px] bg-[#51409D] px-3 py-1.5 text-[13px] font-semibold text-white', 'Kaydet');
        saveButton.type = 'submit';
        form.append(textarea, feedback, saveButton);
        form.addEventListener('submit', event => {
          event.preventDefault();
          const notes = loadNotes();
          const record = { cumleId: sentence.id, metin: textarea.value.trim(), tarih: new Date().toISOString() };
          const existingIndex = notes.findIndex(note => note.cumleId === sentence.id);
          if (existingIndex < 0) notes.push(record);
          else notes[existingIndex] = record;
          try {
            localStorage.setItem('demoGuruNotlari', JSON.stringify(notes));
            noteArea.classList.add('hidden');
            renderAdvisor();
          } catch (error) {
            console.error('Danışman notu kaydedilemedi.', error);
            feedback.textContent = 'Not kaydedilemedi. Tarayıcı depolama alanını kontrol et.';
            feedback.classList.remove('hidden');
          }
        });
        noteArea.appendChild(form);
      });
      const sentenceGroup = element('div', 'advisor-story-group' + (index === 0 ? ' advisor-story-group--lead' : ''));
      sentenceGroup.append(row, noteArea);
      storyBox.appendChild(sentenceGroup);
      storyBox.appendChild(document.createTextNode(' '));
    });
    updateSource(data.cumleler.find(item => item.id === selectedId));
    storyColumn.appendChild(storyBox);

    const followupItems = getFollowupItems();
    const completedItems = followupItems.filter(isFollowupComplete);
    const missing = followupItems.filter(sentence => !isFollowupComplete(sentence));
    const completion = element('section', 'rounded-[8px] border border-[#7564C7] bg-white p-4');
    completion.appendChild(element('h2', 'mb-2 text-[18px] font-semibold text-[#1E1E1C]', 'Seansta tamamlanacaklar'));
    if (missing.length) {
      const list = element('ul', 'flex flex-col gap-2 text-[14px] text-[#1E1E1C]');
      missing.forEach(sentence => {
        const row = element('li', 'flex flex-wrap items-center gap-2');
        const typeConfig = readGapTypeConfig();
        const assignedType = typeConfig.gapTypes.find(type => type.id === sentence.gapTypeId);
        const deferred = getGapStatus(sentence) === 'deferred';
        row.appendChild(element(
          'span',
          'theme-status-badge theme-status-badge--warning',
          deferred ? 'Seansta konuşalım' : 'Bilgi Gerekli'
        ));
        row.appendChild(element('span', '', assignedType?.label || sentence.bilgiGerekli || sentence.metin));
        if (sentence.gap?.questionNo) {
          row.appendChild(element('span', 'text-[12px] text-[#5B5F6B]', 'Soru ' + sentence.gap.questionNo + '\'e bağlı'));
        }
        const gapTypeSelect = element('select', 'advisor-gap-type-assignment');
        gapTypeSelect.setAttribute('aria-label', 'Takip soru türünü ata');
        const noType = element('option', '', 'Takip sorusu seç');
        noType.value = '';
        gapTypeSelect.appendChild(noType);
        typeConfig.gapTypes.forEach(type => {
          const option = element('option', '', type.label);
          option.value = type.id;
          gapTypeSelect.appendChild(option);
        });
        gapTypeSelect.value = sentence.gapTypeId || '';
        gapTypeSelect.addEventListener('change', () => {
          const previous = sentence.gapTypeId;
          if (gapTypeSelect.value) {
            const assignedType = typeConfig.gapTypes.find(type => type.id === gapTypeSelect.value);
            sentence.gapTypeId = gapTypeSelect.value;
            sentence.gap = {
              ...sentence.gap,
              questionNo: Number(assignedType.mainQuestionNo),
              type: assignedType.inputType,
              status: getGapStatus(sentence),
              gapTypeId: assignedType.id
            };
          } else {
            delete sentence.gapTypeId;
            delete sentence.gap.gapTypeId;
          }
          if (!saveData()) {
            if (previous) {
              sentence.gapTypeId = previous;
              const priorType = typeConfig.gapTypes.find(type => type.id === previous);
              sentence.gap.gapTypeId = previous;
              sentence.gap.questionNo = Number(priorType.mainQuestionNo);
              sentence.gap.type = priorType.inputType;
            } else {
              delete sentence.gapTypeId;
              delete sentence.gap.gapTypeId;
            }
            return;
          }
          renderAdvisor();
        });
        row.appendChild(gapTypeSelect);
        list.appendChild(row);
      });
      completion.append(list);
    } else {
      completion.appendChild(element('p', 'text-[14px] text-[#7564C7]', 'Tamamlanacak bilgi yok.'));
    }
    if (completedItems.length) {
      completion.appendChild(element('h3', 'mt-4 mb-2 text-[14px] font-semibold text-[#1E1E1C]', 'Adayın yanıtladıkları'));
      const completedList = element('ul', 'flex flex-col gap-2 text-[14px] text-[#1E1E1C]');
      completedItems.forEach(sentence => {
        const row = element('li', 'flex flex-wrap items-start gap-2');
        row.append(
          element('span', 'theme-status-badge theme-status-badge--success', 'Tamamlandı'),
          element('span', '', sentence.bilgiGerekli || 'Takip bilgisi'),
          element('span', 'text-[12px] text-[#5B5F6B]', 'Soru ' + sentence.gap.questionNo + '\'e bağlı'),
          element('p', 'basis-full pl-1 text-[14px] text-[#1E1E1C]', 'Adayın cevabı: ' + sentence.gap.answer)
        );
        completedList.appendChild(row);
      });
      completion.appendChild(completedList);
    }
    storyColumn.appendChild(completion);
    renderGapTypeAdminEditor(storyColumn);

    const followups = element('section', 'flex flex-col gap-2');
    followups.appendChild(element('h2', 'text-[18px] font-semibold text-[#1E1E1C]', 'YZ takip soruları'));
    data.takipler.forEach(item => {
      const details = element('details', 'rounded-[8px] border border-[#7564C7] bg-white');
      const summary = element('summary', 'advisor-accordion-summary flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-[14px] font-medium text-[#1E1E1C]');
      summary.setAttribute('aria-expanded', 'false');
      details.addEventListener('toggle', () => summary.setAttribute('aria-expanded', String(details.open)));
      summary.append(document.createTextNode(item.soru), element('span', 'material-symbols-outlined text-[18px] text-[#7564C7]', 'chevron_right'));
      const answer = element('div', 'border-t border-[#7564C7] px-4 py-3');
      answer.append(element('p', 'mb-1 text-[12px] font-semibold text-[#7564C7]', 'Elif Yılmaz’ın cevabı:'), element('p', 'text-[14px] leading-6 text-[#1E1E1C]', item.cevap), element('p', 'mt-2 text-[12px] text-[#51409D]', 'Cevap ' + item.cevapNo + '’e bağlı'));
      details.append(summary, answer);
      followups.appendChild(details);
    });
    storyColumn.appendChild(followups);

    columns.append(storyColumn, sourceColumn);
    panel.appendChild(columns);

    const outputs = element('details', 'rounded-[8px] border border-[#7564C7] bg-white');
    const outputsSummary = element('summary', 'cursor-pointer px-4 py-3 text-[15px] font-semibold text-[#1E1E1C]');
    outputsSummary.classList.add('advisor-accordion-summary');
    outputsSummary.setAttribute('aria-expanded', 'false');
    outputs.addEventListener('toggle', () => outputsSummary.setAttribute('aria-expanded', String(outputs.open)));
    const outputsHeading = element('span', '', 'Çıktılar');
    outputsHeading.setAttribute('role', 'heading');
    outputsHeading.setAttribute('aria-level', '2');
    outputsSummary.appendChild(outputsHeading);
    outputs.appendChild(outputsSummary);
    const outputBody = element('div', 'flex flex-col gap-4 border-t border-[#7564C7] p-4');
    outputBody.appendChild(element('h3', 'text-[13px] font-semibold text-[#7564C7]', 'Kısa özet'));
    outputBody.appendChild(element('p', 'text-[14px] leading-6 text-[#1E1E1C]', data.ciktilar.ozet));
    outputBody.appendChild(element('h3', 'text-[13px] font-semibold text-[#7564C7]', 'Mülakat cevapları'));
    data.ciktilar.mulakat.slice(0, 2).forEach(item => {
      const answer = element('div', '');
      answer.append(element('p', 'text-[14px] font-semibold text-[#1E1E1C]', item.soru), element('p', 'mt-1 text-[14px] leading-6 text-[#7564C7]', item.cevap));
      outputBody.appendChild(answer);
    });
    outputBody.append(element('h3', 'text-[13px] font-semibold text-[#7564C7]', 'CV özeti'), element('p', 'text-[14px] leading-6 text-[#1E1E1C]', data.ciktilar.cv));
    outputs.appendChild(outputBody);
    panel.appendChild(outputs);

    const suggestions = element('details', 'advisor-suggestions rounded-[8px] border border-[#7564C7] bg-white');
    suggestions.open = true;
    const suggestionsSummary = element('summary', 'cursor-pointer px-4 py-3 text-[15px] font-semibold text-[#1E1E1C]');
    suggestionsSummary.classList.add('advisor-accordion-summary');
    suggestionsSummary.setAttribute('aria-expanded', 'true');
    suggestions.addEventListener('toggle', () => suggestionsSummary.setAttribute('aria-expanded', String(suggestions.open)));
    const suggestionsHeading = element('span', '', 'Geliştirme önerileri');
    suggestionsHeading.setAttribute('role', 'heading');
    suggestionsHeading.setAttribute('aria-level', '2');
    suggestionsSummary.appendChild(suggestionsHeading);
    suggestions.appendChild(suggestionsSummary);
    const suggestionsGrid = element('div', 'advisor-suggestions-grid grid grid-cols-1 items-stretch gap-3 border-t border-[#7564C7] p-4 md:grid-cols-2 lg:grid-cols-3');
    data.oneriler.slice(0, 5).forEach((item, index) => {
      const card = element('article', 'advisor-suggestion-card flex h-full flex-col rounded-[8px] border border-[#7564C7] bg-white p-4');
      if (index === 4) card.classList.add('md:col-span-2', 'lg:col-span-1');
      card.append(element('h3', 'text-[14px] font-semibold text-[#1E1E1C]', item.baslik), element('p', 'advisor-suggestion-summary mt-1 text-[13px] leading-5', item.ozet));
      const list = element('ul', 'advisor-suggestion-list mt-2 list-disc space-y-1 pl-4 text-[13px] text-[#1E1E1C]');
      item.maddeler.forEach(line => {
        const entry = element('li', '', line);
        if (item.baslik === 'Zayıf kelimeler ve alternatifleri') {
          const reason = line.includes('“Seviyorum”')
            ? '“Önem veriyorum” ifadesi, tercih yerine önceliği daha somut anlatır.'
            : '“Hedefliyorum” ifadesi, kariyer yönünü daha net belirtir.';
          entry.appendChild(element('span', 'advisor-suggestion-reason', reason));
        }
        list.appendChild(entry);
      });
      card.appendChild(list);

      const cardActions = element('div', 'advisor-suggestion-actions mt-auto flex flex-wrap gap-2 pt-4');
      [
        ['Nota ekle', 'Not için demo bildirimi gösterildi.'],
        ['Adaya gönder', 'Öneri adaya demo olarak gönderildi.']
      ].forEach(([label, message]) => {
        const action = element('button', 'advisor-suggestion-action', label);
        action.type = 'button';
        action.addEventListener('click', () => {
          document.querySelector('.advisor-story-toast')?.remove();
          const toast = element('div', 'advisor-story-toast', message);
          toast.setAttribute('role', 'status');
          toast.setAttribute('aria-live', 'polite');
          document.body.appendChild(toast);
          window.setTimeout(() => toast.remove(), 2800);
        });
        cardActions.appendChild(action);
      });
      card.appendChild(cardActions);
      suggestionsGrid.appendChild(card);
    });
    suggestions.appendChild(suggestionsGrid);
    panel.appendChild(suggestions);

    document.querySelector('.advisor-story-action-bar')?.remove();
    const actionBar = element('div', 'advisor-story-action-bar');
    const noteLink = element('a', 'advisor-story-action advisor-story-action--secondary', '');
    noteLink.href = 'guru-notlar.html';
    const noteIcon = element('span', 'material-symbols-outlined', 'edit_note');
    noteIcon.setAttribute('aria-hidden', 'true');
    noteLink.setAttribute('aria-label', 'Danışana not yaz');
    noteLink.append(noteIcon, document.createTextNode('Danışana not yaz'));
    const taskLink = element('a', 'advisor-story-action advisor-story-action--secondary', '');
    taskLink.href = 'guru-odevler.html';
    const taskIcon = element('span', 'material-symbols-outlined', 'assignment_add');
    taskIcon.setAttribute('aria-hidden', 'true');
    taskLink.setAttribute('aria-label', 'Ödev ver');
    taskLink.append(taskIcon, document.createTextNode('Ödev ver'));
    const approveButton = element('button', 'advisor-story-action advisor-story-action--primary', '');
    approveButton.type = 'button';
    approveButton.disabled = true;
    approveButton.title = 'Bu demoda hikâye onaylama adımı bulunmuyor.';
    approveButton.setAttribute('aria-label', 'Hikâyeyi onayla');
    const approveIcon = element('span', 'material-symbols-outlined', 'task_alt');
    approveIcon.setAttribute('aria-hidden', 'true');
    approveButton.append(approveIcon, document.createTextNode('Hikâyeyi onayla'));
    actionBar.append(noteLink, taskLink, approveButton);

    oldContent.replaceWith(panel);
    document.body.appendChild(actionBar);
    setupStoryMobileNav();

    function loadNotes() {
      try {
        const saved = localStorage.getItem('demoGuruNotlari');
        if (!saved) return [];
        const notes = JSON.parse(saved);
        if (!Array.isArray(notes)) throw new TypeError('demoGuruNotlari bir JSON dizisi olmalı.');
        return notes;
      } catch (error) {
        console.error('Danışman notları okunamadı.', error);
        return [];
      }
    }
  }

  function setupStoryMobileNav() {
    const sidebar = document.querySelector('body.guru-story-page .advisor-sidebar');
    const sidebarCard = sidebar?.firstElementChild;
    const content = sidebarCard?.firstElementChild;
    const brandRow = content?.querySelector(':scope > div:first-child');
    const nav = content?.querySelector('nav');
    if (!sidebar || !brandRow || !nav) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupStoryMobileNav, { once: true });
      }
      return;
    }
    if (brandRow.querySelector('.guru-mobile-menu-toggle')) return;

    nav.id = 'guru-story-mobile-menu';
    const toggle = element('button', 'guru-mobile-menu-toggle');
    toggle.type = 'button';
    toggle.setAttribute('aria-controls', nav.id);
    toggle.setAttribute('aria-expanded', 'false');
    const icon = element('span', 'material-symbols-outlined', 'menu');
    icon.setAttribute('aria-hidden', 'true');
    const label = element('span', '', 'Menüyü aç');
    toggle.append(icon, label);
    brandRow.appendChild(toggle);

    function setOpen(open) {
      sidebar.classList.toggle('guru-mobile-menu-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      label.textContent = open ? 'Menüyü kapat' : 'Menüyü aç';
      icon.textContent = open ? 'close' : 'menu';
      if (open) nav.querySelector('a')?.focus();
      else toggle.focus();
    }

    toggle.addEventListener('click', () => {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && sidebar.classList.contains('guru-mobile-menu-open')) {
        setOpen(false);
      }
    });
    document.addEventListener('click', event => {
      if (!sidebar.contains(event.target) && sidebar.classList.contains('guru-mobile-menu-open')) {
        setOpen(false);
      }
    });
  }

  const data = loadData();
  if (location.pathname.endsWith('/guru-hikaye.html')) renderAdvisor();
  if (location.pathname.endsWith('/ciktilar.html')) renderCandidate();

  window.addEventListener('storage', event => {
    if (event.key === 'demoSoruCevaplari' || event.key === GAP_TYPES_STORAGE_KEY) {
      addGapsForUnansweredQuestions(data);
      normalizeGapRecords(data);
      if (!saveData()) return;
      if (location.pathname.endsWith('/guru-hikaye.html')) renderAdvisor();
      else renderCandidate();
      return;
    }
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try {
      const updated = JSON.parse(event.newValue);
      if (!Array.isArray(updated.cumleler)) throw new TypeError('demoHikaye şeması geçersiz.');
      data.surum = updated.surum;
      data.cumleler = updated.cumleler;
      data.takipler = updated.takipler;
      data.ciktilar = updated.ciktilar;
      data.oneriler = updated.oneriler;
      normalizeGapRecords(data);
      if (location.pathname.endsWith('/guru-hikaye.html')) renderAdvisor();
      else renderCandidate();
    } catch (error) {
      console.error('Güncellenen demoHikaye verisi okunamadı.', error);
      showStorageError();
    }
  });
})();
