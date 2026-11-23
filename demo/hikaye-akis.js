// hikaye-akis.js — Satış hikâyesi akışının ortak parçaları (1., 2. ve 3. adım sayfaları kullanır).
//   StoryFlow.store        → oturum (sekme) içinde demo durumu: load() · save(state) · reset()
//   StoryFlow.words(text)  → kelime sayısı · StoryFlow.speakRange(words) → '1.4–1.6 dk'
//   StoryFlow.split(text)  → cümleler
//   StoryFlow.stepper(host, activeStep)          → adım çubuğu (1 Hikâyeni yaz · 2 Önerileri incele · 3 Hikâyem hazır)
//   StoryFlow.dictation(button, onText, statusEl) → "Konuşarak yaz" (tarayıcının konuşma tanıma özelliği; ses saklanmaz)
//   StoryFlow.pickCv(onPicked, statusEl)          → PDF/DOCX seçimi (en fazla 10 MB)
//   StoryFlow.renderAdvisorNote(host)             → ilk seans notu (API; yoksa kutu gizli kalır)
//   StoryFlow.el(tag, className, text)
// ÖRNEK VERİ: Yapay zekâ servisi bağlanana kadar okuma/öneri sonuçları hikaye-akis-ornek.js'ten gelir.
// Durum yalnız sessionStorage'da (sekme kapanınca silinir) tutulur; kalıcı kayıt API ile gelecek.
(function () {
  'use strict';
  const KEY = 'storyFlow.demo.v1';

  function blank() {
    return {
      draftText: '',
      cv: null,                 // { fileName, words }
      version: 0,
      paragraphs: [],           // [[{ id, text, origin: 'candidate'|'suggestion', recent: bool }]]
      reading: 0,
      queue: [],                // aktif okumadaki öneriler
      done: [],                 // { title, result }
      built: false,
      openIssues: [],
      ready: false,
      seq: 0
    };
  }

  const store = {
    load() {
      try { return Object.assign(blank(), JSON.parse(sessionStorage.getItem(KEY) || '{}')); }
      catch (error) { return blank(); }
    },
    save(state) {
      try { sessionStorage.setItem(KEY, JSON.stringify(state)); return true; }
      catch (error) { return false; }
    },
    reset() { try { sessionStorage.removeItem(KEY); } catch (error) { /* yoksay */ } }
  };

  function words(text) {
    const m = String(text || '').trim().match(/[^\s]+/g);
    return m ? m.length : 0;
  }

  // Dakikada 120–140 kelimelik varsayımsal tempo (yapay zekâ ekranındaki prova notuyla aynı).
  function speakRange(count) {
    if (!count) return '0 dk';
    const fmt = n => n.toFixed(1).replace('.', ',');
    return fmt(count / 140) + '–' + fmt(count / 120) + ' dk';
  }

  function split(text) {
    return String(text || '').replace(/\s+/g, ' ').trim()
      .split(/(?<=[.!?…])\s+(?=[A-ZÇĞİÖŞÜ0-9"“'(])/u).map(s => s.trim()).filter(Boolean);
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function icon(name) {
    const span = el('span', 'material-symbols-outlined', name);
    span.setAttribute('aria-hidden', 'true');
    return span;
  }

  const STEPS = ['Hikâyeni yaz', 'Önerileri incele', 'Hikâyem hazır'];
  const STEP_PAGES = ['/hikaye/yaz', '/hikaye/oneriler', '/hikaye/hazir'];

  function stepper(host, active) {
    if (!host) return;
    const list = el('ol', 'sf-stepper');
    list.setAttribute('aria-label', 'Hikâye adımları');
    STEPS.forEach((label, index) => {
      const no = index + 1;
      if (index) list.appendChild(el('li', 'sf-step-line' + (no <= active ? ' is-done' : ''))).setAttribute('aria-hidden', 'true');
      const item = el('li', 'sf-step' + (no === active ? ' is-active' : no < active ? ' is-done' : ''));
      const dot = el('span', 'sf-step-dot');
      if (no < active) dot.appendChild(icon('check')); else dot.textContent = String(no);
      item.append(dot, el('span', 'sf-step-label', label));
      if (no === active) item.setAttribute('aria-current', 'step');
      list.appendChild(item);
    });
    host.replaceChildren(list);
  }

  // "Konuşarak yaz": Web Speech API (Chrome/Edge). Ses dosyası oluşturulmaz, saklanmaz.
  function dictation(button, onText, statusEl) {
    if (!button) return;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const idleLabel = button.querySelector('.sf-btn-label')?.textContent || 'Konuşarak yaz';
    let recognizer = null;
    const setStatus = (text, isError) => {
      if (!statusEl) return;
      statusEl.textContent = text || '';
      statusEl.classList.toggle('is-error', Boolean(isError));
    };
    const setLabel = text => { const label = button.querySelector('.sf-btn-label'); if (label) label.textContent = text; };
    const stop = () => {
      if (recognizer) recognizer.stop();
      recognizer = null;
      button.classList.remove('is-recording');
      button.setAttribute('aria-pressed', 'false');
      setLabel(idleLabel);
    };
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      if (!Recognition) {
        setStatus('Tarayıcın sesle yazmayı desteklemiyor. Chrome ya da Edge ile deneyebilirsin.', true);
        return;
      }
      if (recognizer) { stop(); setStatus('Dinleme durdu.'); return; }
      recognizer = new Recognition();
      recognizer.lang = 'tr-TR';
      recognizer.continuous = true;
      recognizer.interimResults = false;
      recognizer.onresult = event => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) onText(event.results[i][0].transcript.trim());
        }
      };
      recognizer.onerror = event => {
        setStatus(event.error === 'not-allowed' ? 'Mikrofon izni verilmedi.' : 'Ses alınamadı; tekrar deneyebilirsin.', true);
        stop();
      };
      recognizer.onend = () => { if (recognizer) stop(); };
      try {
        recognizer.start();
        button.classList.add('is-recording');
        button.setAttribute('aria-pressed', 'true');
        setLabel('Dinliyorum… durdur');
        setStatus('Konuşmaya başlayabilirsin. Ses kaydı saklanmaz.');
      } catch (error) {
        setStatus('Dinleme başlatılamadı.', true);
        stop();
      }
    });
  }

  function pickCv(onPicked, statusEl) {
    const input = el('input');
    input.type = 'file';
    input.accept = '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const okType = /\.(pdf|docx)$/i.test(file.name);
      if (!okType || file.size > 10 * 1024 * 1024) {
        if (statusEl) { statusEl.textContent = 'CV PDF ya da Word (DOCX) olmalı ve 10 MB’ı geçmemeli.'; statusEl.classList.add('is-error'); }
        return;
      }
      if (statusEl) { statusEl.textContent = ''; statusEl.classList.remove('is-error'); }
      onPicked({ fileName: file.name, words: null });
    });
    input.click();
  }

  // İlk seans notu: aday-yolculuk.js (Journey) + API. Ulaşılamazsa kutu gizli kalır.
  async function renderAdvisorNote(host) {
    if (!host) return;
    host.hidden = true;
    try {
      if (!window.Journey || !window.Api) return;
      const ctx = await window.Journey.load();
      if (!ctx || !ctx.story) return;
      const [notes, guru] = await Promise.all([
        window.Api.listAll('/candidate/stories/' + encodeURIComponent(ctx.story.id) + '/notes').catch(() => []),
        window.Journey.guru(ctx).catch(() => null)
      ]);
      const latest = notes.filter(n => n.note_kind === 'first_session_note')
        .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
      if (!latest) return;
      host.querySelector('[data-note-title]').textContent = (guru ? guru.ad : 'Danışmanın') + ' · ilk seans notu';
      host.querySelector('[data-note-text]').textContent = latest.note_text;
      host.hidden = false;
    } catch (error) {
      host.hidden = true;
    }
  }

  function go(href) { window.location.href = href; }

  // Dolgu sözcükleri ("Sen anlat" ölçümü; tarayıcıda, ses saklanmaz). Örnek veri değil.
  const FILLERS = Object.freeze(['ee', 'eee', 'ıı', 'ııı', 'hmm', 'şey', 'yani', 'hani', 'işte', 'aslında', 'falan']);

  // K103 (Etap 6): önizleme (örnek veri) mi gerçek oturum mu? Gerçek oturumda akış API'ye bağlıdır
  // (hikaye-akis-api.js, window.StoryFlowApi); örnek veri yalnız APP_PREVIEW'de (K102).
  const preview = window.APP_PREVIEW === true;

  // Gerçek oturumda backend karşılığı henüz olmayan öğeleri gizler (kaldırmaz). GAP-E6-x işaretleri:
  // 81 notu "Etap 6 — Backend GAP listesi". Backend ucu gelince bu çağrı kaldırılıp öğe bağlanır.
  function gapHide(node, gapId) {
    if (!node || preview) return;
    node.hidden = true;
    node.dataset.gap = gapId;
  }

  window.StoryFlow = Object.freeze({ store, words, speakRange, split, el, icon, stepper, dictation, pickCv, renderAdvisorNote, go, STEP_PAGES, FILLERS, preview, gapHide });
})();
