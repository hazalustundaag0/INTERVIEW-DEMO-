// guru-profil.js — Guru · Profilim (/guru/profil). Sahibi: 84 Guru Panel UI.
// Veri: GET /guru/profile → GuruProfile{first_name, last_name, title, expertise_area, seniority, short_bio, is_active, sectors[]}
//       PUT /guru/profile {title, expertise_area, seniority, short_bio, sector_codes[]} (GAP-B01)
//       GET /public/sectors (sektör kodları) · GET /public/services (önizlemedeki seans bilgisi + ücret, salt okunur)
// K52: yalnız backend'deki alanlar düzenlenir; Deneyim/Eğitim/Sertifika/SSS/yorumlar sekmeleri gizlendi (GAP-B02).
// K53: "Fiyat" sekmesi kaldırıldı; ücret yalnız önizlemede, hizmetin fiyat kuralından (yönetici) salt okunur.
// Yayın durumu (is_active) yöneticiye ait → anahtar salt okunur. Ad soyad hesap bilgisidir → salt okunur.
// "Uzmanlık alanları" etiketleri expertise_area metnine ", " ile birleştirilir (≤300 karakter).
// Etap 4 (K83/K91, GAP-B23) profil fotoğrafı: "Temel bilgiler" sekmesinin başında yükle / değiştir / kaldır.
//   PUT /me/avatar (multipart `file`) → { avatar_url } · DELETE /me/avatar → 204 · GET /me/avatar (Bearer → blob:).
//   Yüklemeden önce tarayıcıda en uzun kenar ≤ 1024 px'e küçültülür (canvas, K91); sunucu ≤ 2 MB / 32–4096 px.
//   Guru fotoğrafı HERKESE AÇIKTIR (katalog + danışman profil sayfası, /public/gurus/{id}/avatar); arayüzde yazılı.
//   Fotoğraf işlemi anında kaydedilir; profil "Kaydet" düğmesinden bağımsızdır.
// Kaydedilmemiş değişiklik uyarısı yeni paylaşımlı menüde (#sidebar, sidebar.js) çalışır.
(function () {
  'use strict';
  if (!window.Api) return;
  const Api = window.Api;
  const G = window.GuruPanel || null;

  // GAP-E6-21 (Etap 6): country, languages[], bio_tr, bio_en, audiences[], career[] ("Profil ayrıntıları" sekmesi).
  const EMPTY = { name: '', title: '', experience: '', sectors: [], about: '', expertise: [],
    country: '', languages: [], bioTr: '', bioEn: '', audiences: [], career: [] };
  const sectionKeys = { basics: ['title', 'experience', 'sectors'], about: ['about'], expertise: ['expertise'],
    details: ['country', 'languages', 'bioTr', 'bioEn', 'audiences', 'career'] };
  const sectionLabels = { basics: 'Temel bilgiler', about: 'Hakkında', expertise: 'Uzmanlık', details: 'Profil ayrıntıları' };
  const LANGUAGES = [['tr', 'Türkçe'], ['en', 'English']];
  const tabGroups = [
    { id: 'basics', label: 'Temel bilgiler', sections: ['basics'] },
    { id: 'about', label: 'Hakkında', sections: ['about'] },
    { id: 'expertise', label: 'Uzmanlık', sections: ['expertise'] },
    { id: 'details', label: 'Profil ayrıntıları', sections: ['details'] }
  ];
  const FIELD_PATH = { title: 'title', seniority: 'experience', short_bio: 'about', expertise_area: 'expertise', sector_codes: 'sectors',
    country: 'country', languages: 'languages', bio_tr: 'bioTr', bio_en: 'bioEn', audiences: 'audiences', career: 'career' };
  const sectionTab = Object.fromEntries(tabGroups.flatMap(group => group.sections.map(key => [key, group.id])));
  const root = document.getElementById('guru-profile-sections');
  const toastNode = document.getElementById('guru-profile-toast');
  const publishSwitch = document.getElementById('guru-profile-published');
  if (!root || !toastNode || !publishSwitch) return;

  let sectorCatalog = [];       // [{code, name}]
  let profile = null;           // GuruProfile
  let savedProfile = clone(EMPTY);
  let draft = clone(EMPTY);
  let serverErrors = {};
  let toastTimer;
  let pendingHref = '';
  let returnFocus = null;
  let activeTab = tabGroups[0].id;
  let incompleteSections = [];
  let saving = false;
  const tabButtons = new Map();
  const tabPanels = new Map();

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function initials(name) {
    return String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part.charAt(0).toLocaleUpperCase('tr-TR')).join('');
  }
  function sectorName(code) { return (sectorCatalog.find(s => s.code === code) || {}).name || code; }
  function sectorCodeByName(name) {
    const lower = name.toLocaleLowerCase('tr-TR');
    return (sectorCatalog.find(s => s.name.toLocaleLowerCase('tr-TR') === lower || s.code === name) || {}).code || null;
  }

  function fromApi(p) {
    return {
      name: [p.first_name, p.last_name].filter(Boolean).join(' '),
      title: p.title || '',
      experience: p.seniority || '',
      sectors: (p.sectors || []).map(s => s.code),
      about: p.short_bio || '',
      expertise: String(p.expertise_area || '').split(',').map(s => s.trim()).filter(Boolean),
      country: p.country || '',
      languages: Array.isArray(p.languages) ? p.languages.slice() : [],
      bioTr: p.bio_tr || '',
      bioEn: p.bio_en || '',
      audiences: Array.isArray(p.audiences) ? p.audiences.slice() : [],
      career: (Array.isArray(p.career) ? p.career : []).map(c => ({
        title: c.title || '', org: c.org || '', start: c.start_year ? String(c.start_year) : '', end: c.end_year ? String(c.end_year) : ''
      }))
    };
  }
  function toApi(d) {
    return {
      title: d.title.trim(),
      expertise_area: d.expertise.join(', '),
      seniority: d.experience.trim() || null,
      short_bio: d.about.trim() || null,
      sector_codes: d.sectors.slice(),
      country: d.country.trim().toUpperCase() || null,   // ISO 3166-1 alpha-2 (ör. TR)
      languages: d.languages.slice(),
      bio_tr: d.bioTr.trim() || null,
      bio_en: d.bioEn.trim() || null,
      audiences: d.audiences.slice(),
      career: d.career.filter(c => c.title.trim() || c.org.trim()).map(c => ({
        title: c.title.trim(), org: c.org.trim(),
        start_year: c.start ? Number(c.start) : null, end_year: c.end ? Number(c.end) : null
      }))
    };
  }

  function countChanges(previous, current) {
    if (same(previous, current)) return 0;
    if (Array.isArray(previous) && Array.isArray(current)) {
      let changes = Math.abs(previous.length - current.length);
      for (let i = 0; i < Math.min(previous.length, current.length); i += 1) changes += countChanges(previous[i], current[i]);
      return changes || 1;
    }
    return 1;
  }

  function field(labelText, value, path, type, options) {
    const o = options || {};
    const wrapper = document.createElement('div');
    wrapper.className = 'guru-profile-field';
    const id = 'guru-field-' + path.replace(/[^a-z0-9]+/gi, '-');
    const label = document.createElement('label');
    label.htmlFor = id;
    label.textContent = labelText;
    const input = type === 'textarea' ? document.createElement('textarea') : document.createElement('input');
    input.id = id;
    if (!o.readOnly) input.dataset.profilePath = path;
    if (type !== 'textarea') input.type = 'text';
    if (o.maxLength) input.maxLength = o.maxLength;
    if (o.placeholder) input.placeholder = o.placeholder;
    if (o.readOnly) { input.readOnly = true; input.setAttribute('aria-readonly', 'true'); }
    input.value = value ?? '';
    const error = document.createElement('span');
    error.className = o.hint ? 'guru-profile-hint' : 'guru-profile-error';
    if (!o.hint) error.dataset.errorFor = path;
    error.id = id + '-error';
    error.setAttribute('aria-live', 'polite');
    if (o.hint) error.textContent = o.hint;
    input.setAttribute('aria-describedby', error.id);
    wrapper.append(label, input, error);
    return wrapper;
  }

  // Etiket editörü. Sektörler: yalnız katalogdaki sektörler (datalist önerisi), değer = kod.
  function tagEditor(title, key, maxCount) {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'guru-profile-field guru-profile-editor-tags-field';
    const legend = document.createElement('legend');
    legend.textContent = title;
    const list = document.createElement('ul');
    list.className = 'guru-profile-edit-tags';
    list.dataset.tagList = key;
    list.setAttribute('aria-label', 'Eklenen ' + title.toLocaleLowerCase('tr-TR'));
    const input = document.createElement('input');
    input.id = 'guru-tags-' + key;
    input.autocomplete = 'off';
    input.placeholder = key === 'sectors' ? 'Sektör yazıp listeden seç, Enter' : "Yazıp Enter'a bas";
    input.setAttribute('aria-label', title + ' ekle');
    input.dataset.tagInput = key;
    if (key === 'sectors') {
      const datalist = document.createElement('datalist');
      datalist.id = 'guru-sector-options';
      sectorCatalog.forEach(sector => {
        const option = document.createElement('option');
        option.value = sector.name;
        datalist.appendChild(option);
      });
      input.setAttribute('list', datalist.id);
      fieldset.appendChild(datalist);
    }
    const error = document.createElement('span');
    error.className = 'guru-profile-error';
    error.dataset.errorFor = key;
    error.id = input.id + '-error';
    error.setAttribute('aria-live', 'polite');
    input.setAttribute('aria-describedby', error.id);
    function addValue() {
      const raw = input.value.trim().replace(/,+$/, '');
      if (!raw) return;
      let value = raw;
      if (key === 'sectors') {
        value = sectorCodeByName(raw);
        if (!value) { error.textContent = 'Listeden bir sektör seç.'; input.setAttribute('aria-invalid', 'true'); return; }
      }
      if (draft[key].length >= maxCount ||
          draft[key].some(item => item.toLocaleLowerCase('tr-TR') === value.toLocaleLowerCase('tr-TR'))) { input.value = ''; return; }
      draft[key].push(value);
      input.value = '';
      renderSection(fieldset.closest('[data-section]'));
      refresh();
      root.querySelector('#guru-tags-' + key)?.focus();
    }
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter' || (event.key === ',' && key !== 'sectors')) {
        event.preventDefault();
        addValue();
      } else if (event.key === 'Backspace' && !input.value && draft[key].length) {
        draft[key].pop();
        renderSection(fieldset.closest('[data-section]'));
        refresh();
        root.querySelector('#guru-tags-' + key)?.focus();
      }
    });
    if (key === 'sectors') input.addEventListener('change', () => { if (sectorCodeByName(input.value.trim())) addValue(); });
    const tagBox = document.createElement('div');
    tagBox.className = 'guru-profile-tag-input-box';
    tagBox.append(list, input);
    fieldset.append(legend, tagBox, error);
    renderTags(key, list);
    return fieldset;
  }

  function renderTags(key, list) {
    list.replaceChildren();
    draft[key].forEach((tag, index) => {
      const label = key === 'sectors' ? sectorName(tag) : tag;
      const item = document.createElement('li');
      const text = document.createElement('span');
      text.textContent = label;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = '×';
      remove.setAttribute('aria-label', label + ' etiketini kaldır');
      remove.addEventListener('click', () => {
        draft[key].splice(index, 1);
        renderSection(list.closest('[data-section]'));
        refresh();
      });
      item.append(text, remove);
      list.appendChild(item);
    });
  }

  function renderSection(section) {
    if (!section) return;
    const key = section.dataset.section;
    const body = section.querySelector('.guru-profile-section-body');
    body.replaceChildren();
    if (key === 'basics') {
      body.append(
        field('Ad soyad', draft.name, 'name', 'text', { readOnly: true, hint: 'Ad soyad hesap bilgisidir; değişiklik için yöneticiyle iletişime geç.' }),
        field('Unvan', draft.title, 'title', 'text', { maxLength: 200 }),
        field('Deneyim', draft.experience, 'experience', 'text', { maxLength: 100, placeholder: 'Örn. 12 yıl' }),
        tagEditor('Sektör etiketleri', 'sectors', 6)
      );
    } else if (key === 'about') {
      body.append(field('Hakkında', draft.about, 'about', 'textarea', { maxLength: 500 }));
      const counter = document.createElement('span');
      counter.className = 'guru-profile-counter';
      counter.dataset.aboutCount = '';
      counter.textContent = draft.about.length + ' / 500';
      body.appendChild(counter);
    } else if (key === 'expertise') {
      body.appendChild(tagEditor('Uzmanlık alanları', 'expertise', 12));
    } else if (key === 'details') {
      body.append(
        field('Ülke kodu', draft.country, 'country', 'text', { maxLength: 2, placeholder: 'Örn. TR' }),
        languageField(),
        field('Biyografi (Türkçe)', draft.bioTr, 'bioTr', 'textarea', { maxLength: 2000 }),
        field('Biyografi (English)', draft.bioEn, 'bioEn', 'textarea', { maxLength: 2000 }),
        tagEditor('Hedef kitleler', 'audiences', 8),
        careerEditor()
      );
    }
    section.querySelectorAll('[data-profile-path]').forEach(input => {
      input.addEventListener('input', () => {
        draft[input.dataset.profilePath] = input.value;
        delete serverErrors[input.dataset.profilePath];
        if (key === 'about') {
          const count = section.querySelector('[data-about-count]');
          if (count) count.textContent = input.value.length + ' / 500';
        }
        refresh();
      });
    });
  }

  // Seans dilleri (GAP-E6-15/21): yalnız tr / en.
  function languageField() {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'guru-profile-field';
    const legend = document.createElement('legend');
    legend.textContent = 'Seans dilleri';
    fieldset.appendChild(legend);
    LANGUAGES.forEach(([code, label]) => {
      const wrap = document.createElement('label');
      wrap.className = 'guru-profile-check';
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.value = code;
      box.checked = draft.languages.includes(code);
      box.addEventListener('change', () => {
        draft.languages = LANGUAGES.map(([c]) => c).filter(c => (c === code ? box.checked : draft.languages.includes(c)));
        delete serverErrors.languages;
        refresh();
      });
      wrap.append(box, document.createTextNode(' ' + label));
      fieldset.appendChild(wrap);
    });
    const error = document.createElement('span');
    error.className = 'guru-profile-error';
    error.dataset.errorFor = 'languages';
    error.setAttribute('aria-live', 'polite');
    fieldset.appendChild(error);
    return fieldset;
  }

  // Kariyer geçmişi: satır başına unvan, kurum, başlangıç / bitiş yılı (bitiş boş = devam ediyor).
  function careerEditor() {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'guru-profile-field guru-profile-career';
    const legend = document.createElement('legend');
    legend.textContent = 'Kariyer geçmişi';
    fieldset.appendChild(legend);
    const rerender = () => { renderSection(fieldset.closest('[data-section]')); refresh(); };
    draft.career.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'guru-profile-career-row';
      [['title', 'Unvan', 120], ['org', 'Kurum', 120], ['start', 'Başlangıç yılı', 4], ['end', 'Bitiş yılı (boş: devam)', 4]].forEach(([prop, label, max]) => {
        const input = document.createElement('input');
        input.type = prop === 'start' || prop === 'end' ? 'number' : 'text';
        if (input.type === 'number') { input.min = '1950'; input.max = '2100'; } else input.maxLength = max;
        input.placeholder = label;
        input.setAttribute('aria-label', label + ' (' + (index + 1) + '. satır)');
        input.value = item[prop] || '';
        input.addEventListener('input', () => { item[prop] = input.value; delete serverErrors.career; refresh(); });
        row.appendChild(input);
      });
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'guru-profile-cancel';
      remove.textContent = 'Kaldır';
      remove.setAttribute('aria-label', (index + 1) + '. kariyer satırını kaldır');
      remove.addEventListener('click', () => { draft.career.splice(index, 1); rerender(); });
      row.appendChild(remove);
      fieldset.appendChild(row);
    });
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'guru-profile-cancel';
    add.textContent = '+ Kariyer satırı ekle';
    add.disabled = draft.career.length >= 20;
    add.addEventListener('click', () => { draft.career.push({ title: '', org: '', start: '', end: '' }); rerender(); });
    const error = document.createElement('span');
    error.className = 'guru-profile-error';
    error.dataset.errorFor = 'career';
    error.setAttribute('aria-live', 'polite');
    fieldset.append(add, error);
    return fieldset;
  }

  function sectionErrors(key) {
    const errors = {};
    if (key === 'basics') {
      if (!draft.title.trim()) errors.title = 'Unvan alanı zorunludur.';
      if (draft.sectors.length > 6) errors.sectors = 'En fazla 6 sektör ekleyebilirsin.';
    }
    if (key === 'expertise') {
      if (!draft.expertise.length) errors.expertise = 'En az bir uzmanlık alanı ekle.';
      else if (draft.expertise.join(', ').length > 300) errors.expertise = 'Uzmanlık alanları toplam 300 karakteri geçemez.';
    }
    Object.entries(serverErrors).forEach(([path, message]) => {
      if (sectionKeys[key].includes(path) && !errors[path]) errors[path] = message;
    });
    return errors;
  }

  function validateSections() {
    root.querySelectorAll('[data-section]').forEach(section => {
      const errors = sectionErrors(section.dataset.section);
      section.querySelectorAll('[data-error-for]').forEach(error => {
        const message = errors[error.dataset.errorFor] || '';
        error.textContent = message;
        const input = section.querySelector(`[data-profile-path="${error.dataset.errorFor}"], [data-tag-input="${error.dataset.errorFor}"]`);
        if (input) {
          if (message) input.setAttribute('aria-invalid', 'true');
          else input.removeAttribute('aria-invalid');
        }
      });
    });
  }

  function completeness() {
    const checks = [
      ['basics', draft.title.trim() && draft.sectors.length > 0 && draft.experience.trim()],
      ['about', Boolean(draft.about.trim())],
      ['expertise', draft.expertise.length > 0]
    ];
    incompleteSections = checks.filter(item => !item[1]).map(item => item[0]);
    const percent = Math.round(((checks.length - incompleteSections.length) / checks.length) * 100);
    document.getElementById('guru-profile-completion-value').textContent = percent + '%';
    document.getElementById('guru-profile-completion-fill').style.width = percent + '%';
    document.querySelector('.guru-profile-completion-track').setAttribute('aria-valuenow', String(percent));
    tabGroups.forEach(group => {
      const dot = tabButtons.get(group.id)?.querySelector('.guru-profile-tab-dot');
      if (dot) dot.hidden = !group.sections.some(key => incompleteSections.includes(key));
    });
    const missingText = document.getElementById('guru-profile-missing');
    missingText.replaceChildren();
    if (!incompleteSections.length) { missingText.textContent = 'Profilindeki tüm bölümler tamam.'; return; }
    missingText.appendChild(document.createTextNode('Eksik bölümler: '));
    const groups = tabGroups.filter(group => group.sections.some(key => incompleteSections.includes(key)));
    groups.forEach((group, index) => {
      const link = document.createElement('a');
      link.href = '#guru-tab-panel-' + group.id;
      link.dataset.jumpTo = group.id;
      link.textContent = group.label;
      missingText.append(link);
      if (index < groups.length - 1) missingText.appendChild(document.createTextNode(', '));
    });
  }

  function renderPreview() {
    paintSelfAvatar(document.getElementById('preview-avatar'), draft.name, photoBlobUrl);
    document.getElementById('preview-name').textContent = draft.name || 'Ad soyad';
    document.getElementById('preview-title').textContent = draft.title || 'Unvan';
    const experience = document.getElementById('preview-experience');
    experience.textContent = draft.experience.trim() ? draft.experience.trim() + ' deneyim' : '';
    experience.hidden = !draft.experience.trim();
    document.getElementById('preview-about').textContent = draft.about || 'Hakkında bilgisi eklenmedi.';
    document.getElementById('preview-tags').replaceChildren(...draft.expertise.map(tag => {
      const item = document.createElement('li');
      item.textContent = tag;
      return item;
    }));
    document.getElementById('preview-sectors').replaceChildren(...draft.sectors.map(code => {
      const item = document.createElement('li');
      item.textContent = sectorName(code);
      return item;
    }));
    const visitor = document.getElementById('guru-profile-visitor-preview');
    if (profile) {
      visitor.href = '/danisman?' + new URLSearchParams({ id: profile.id, onizleme: '1' }).toString();
      visitor.removeAttribute('aria-disabled');
      visitor.title = profile.is_active ? '' : 'Profil yayında olmadığı için danışanlar göremez.';
    }
  }

  function refresh() {
    validateSections();
    completeness();
    renderPreview();
    document.body.dataset.profileDirty = String(Object.keys(sectionKeys).some(key =>
      sectionKeys[key].some(prop => !same(draft[prop], savedProfile[prop]))));
    updateActionButtons();
  }

  function updateActionButtons() {
    const status = root.querySelector('.guru-profile-change-status');
    const save = root.querySelector('.guru-profile-action-bar .guru-profile-save');
    const changes = Object.values(sectionKeys).flat().reduce((count, key) => count + countChanges(savedProfile[key], draft[key]), 0);
    if (status) status.textContent = saving ? 'Kaydediliyor…' : changes ? changes + ' değişiklik kaydedilmedi' : 'Değişiklik yok';
    if (save) save.disabled = saving || changes === 0 || !profile;
  }

  function makeTabs() {
    const tabShell = document.createElement('div');
    tabShell.className = 'guru-profile-tabs-shell';
    const tabList = document.createElement('div');
    tabList.className = 'guru-profile-tabs';
    tabList.setAttribute('role', 'tablist');
    tabList.setAttribute('aria-label', 'Profil bölümleri');
    const panels = document.createElement('div');
    panels.className = 'guru-profile-tab-panels';
    tabGroups.forEach(group => {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'guru-profile-tab';
      tab.id = 'guru-tab-' + group.id;
      tab.dataset.navSkip = '';
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', 'guru-tab-panel-' + group.id);
      tab.setAttribute('aria-selected', String(group.id === activeTab));
      tab.tabIndex = group.id === activeTab ? 0 : -1;
      const label = document.createElement('span');
      label.textContent = group.label;
      const dot = document.createElement('span');
      dot.className = 'guru-profile-tab-dot';
      dot.setAttribute('aria-hidden', 'true');
      tab.append(label, dot);
      tab.addEventListener('click', () => setActiveTab(group.id));
      tab.addEventListener('keydown', event => {
        const index = tabGroups.findIndex(item => item.id === group.id);
        let next;
        if (event.key === 'ArrowRight') next = (index + 1) % tabGroups.length;
        else if (event.key === 'ArrowLeft') next = (index - 1 + tabGroups.length) % tabGroups.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabGroups.length - 1;
        else return;
        event.preventDefault();
        setActiveTab(tabGroups[next].id, true);
      });
      tabButtons.set(group.id, tab);
      tabList.appendChild(tab);
      const panel = document.createElement('div');
      panel.className = 'guru-profile-tab-panel';
      panel.id = 'guru-tab-panel-' + group.id;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tab.id);
      panel.tabIndex = 0;
      panel.hidden = group.id !== activeTab;
      tabPanels.set(group.id, panel);
      panels.appendChild(panel);
    });
    const actions = document.createElement('div');
    actions.className = 'guru-profile-action-bar';
    const changeStatus = document.createElement('p');
    changeStatus.className = 'guru-profile-change-status';
    changeStatus.setAttribute('role', 'status');
    changeStatus.setAttribute('aria-live', 'polite');
    changeStatus.setAttribute('aria-atomic', 'true');
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'guru-profile-cancel';
    cancel.textContent = 'Vazgeç';
    cancel.addEventListener('click', cancelChanges);
    const save = document.createElement('button');
    save.type = 'button';
    save.className = 'guru-profile-save';
    save.dataset.action = 'guru-profile-save';
    save.textContent = 'Kaydet';
    save.addEventListener('click', saveProfile);
    const buttons = document.createElement('div');
    buttons.className = 'guru-profile-action-buttons';
    buttons.append(cancel, save);
    actions.append(changeStatus, buttons);
    tabShell.appendChild(tabList);
    root.append(tabShell, panels, actions);
  }

  function setActiveTab(tabId, focusTab) {
    if (!tabPanels.has(tabId)) return;
    activeTab = tabId;
    tabGroups.forEach(group => {
      const selected = group.id === tabId;
      tabButtons.get(group.id).setAttribute('aria-selected', String(selected));
      tabButtons.get(group.id).tabIndex = selected ? 0 : -1;
      tabPanels.get(group.id).hidden = !selected;
    });
    if (focusTab) tabButtons.get(tabId).focus();
  }

  function makeSection(key) {
    const section = document.createElement('section');
    section.className = 'guru-profile-editor-section';
    section.id = 'guru-section-' + key;
    section.dataset.section = key;
    section.setAttribute('aria-labelledby', 'guru-section-heading-' + key);
    const heading = document.createElement('h2');
    heading.id = 'guru-section-heading-' + key;
    heading.textContent = sectionLabels[key];
    const body = document.createElement('div');
    body.className = 'guru-profile-section-body';
    section.append(heading, body);
    renderSection(section);
    return section;
  }

  function renderAllSections() {
    root.querySelectorAll('[data-section]').forEach(renderSection);
  }

  function cancelChanges() {
    draft = clone(savedProfile);
    serverErrors = {};
    renderAllSections();
    refresh();
  }

  function focusFirstError(errors) {
    const first = Object.keys(errors)[0];
    if (!first) return;
    const input = root.querySelector(`[data-profile-path="${first}"], [data-tag-input="${first}"]`);
    const section = input?.closest('[data-section]');
    if (section) setActiveTab(sectionTab[section.dataset.section]);
    input?.focus();
  }

  async function saveProfile() {
    const errors = {};
    Object.keys(sectionKeys).forEach(key => Object.assign(errors, sectionErrors(key)));
    validateSections();
    if (Object.keys(errors).length) { focusFirstError(errors); return; }
    const save = root.querySelector('.guru-profile-save');
    saving = true;
    updateActionButtons();
    try {
      const updated = await Api.ui.withLoading(save, () => Api.put('/guru/profile', toApi(draft)), { text: 'Kaydediliyor…' });
      applyProfile(updated);
      showToast('Profil güncellendi');
    } catch (error) {
      if (error.isValidation && error.fields) {
        serverErrors = {};
        Object.entries(error.fields).forEach(([name, value]) => {
          const path = FIELD_PATH[name] || FIELD_PATH[String(name).split(/[.[]/)[0]];
          if (path) serverErrors[path] = name === 'sector_codes' ? 'Geçersiz sektör seçimi.' : Api.ui.fieldMessage(value);
        });
        validateSections();
        focusFirstError(serverErrors);
      }
      showToast(Api.ui.message(error), true);
    } finally {
      saving = false;
      updateActionButtons();
    }
  }

  function applyProfile(p) {
    profile = p;
    savedProfile = fromApi(p);
    draft = clone(savedProfile);
    serverErrors = {};
    publishSwitch.checked = Boolean(p.is_active);
    renderAllSections();
    refresh();
    setPhoto(p.avatar_url || null);
  }

  // ─── Profil fotoğrafı (GAP-B23, K83/K91) ───────────────────────────────────
  const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const PHOTO_MAX_BYTES = 2 * 1024 * 1024;
  const PHOTO_MAX_SIDE = 1024;
  let photoUrl = null;          // GuruProfile.avatar_url (/me/avatar?v=…) — null: fotoğraf yok
  let photoBlobUrl = '';        // gösterim için blob: URL
  let photoBusy = false;
  const photo = {};

  // Avatar çizimi: avatar.js yüklüyse DemoAvatar (foto → <img>, yoksa baş harf), değilse baş harfler.
  function paintSelfAvatar(element, name, url) {
    if (!element) return;
    if (window.DemoAvatar && window.DemoAvatar.render) {
      window.DemoAvatar.render(element, { name: name || '', url: url || '' });
      return;
    }
    if (name) element.dataset.avatarName = name; else delete element.dataset.avatarName;
    if (url) element.dataset.avatarUrl = url; else delete element.dataset.avatarUrl;
    element.textContent = url ? '' : initials(name);
  }

  function makePhotoField() {
    const box = document.createElement('section');
    box.className = 'guru-profile-photo';
    box.setAttribute('aria-labelledby', 'guru-profile-photo-title');
    const avatar = document.createElement('span');
    avatar.className = 'guru-profile-photo-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    const body = document.createElement('div');
    body.className = 'guru-profile-photo-body';
    const title = document.createElement('h2');
    title.id = 'guru-profile-photo-title';
    title.textContent = 'Profil fotoğrafı';
    const notice = document.createElement('p');
    notice.className = 'guru-profile-photo-notice';
    notice.id = 'guru-profile-photo-notice';
    notice.textContent = 'Fotoğrafın herkese açıktır: danışman listesinde ve profil sayfanda giriş yapmamış ziyaretçiler dahil herkes görür. '
      + 'İstediğin zaman kaldırabilirsin.';
    const hint = document.createElement('p');
    hint.className = 'guru-profile-photo-hint';
    hint.textContent = 'JPEG, PNG veya WebP · en fazla 2 MB. Büyük fotoğraflar yüklemeden önce 1024 piksele küçültülür; konum ve cihaz bilgileri silinir.';
    const input = document.createElement('input');
    input.type = 'file';
    input.id = 'guru-profile-photo-input';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.className = 'guru-profile-photo-input';
    input.setAttribute('aria-describedby', 'guru-profile-photo-notice');
    const actions = document.createElement('div');
    actions.className = 'guru-profile-photo-actions';
    const upload = document.createElement('button');
    upload.type = 'button';
    upload.className = 'guru-profile-photo-upload';
    upload.dataset.action = 'guru-photo-upload';
    upload.dataset.navSkip = '';
    upload.setAttribute('aria-describedby', 'guru-profile-photo-notice');
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'guru-profile-photo-remove';
    remove.dataset.action = 'guru-photo-remove';
    remove.dataset.navSkip = '';
    remove.textContent = 'Fotoğrafı kaldır';
    actions.append(upload, remove);
    const status = document.createElement('p');
    status.className = 'guru-profile-photo-status';
    status.id = 'guru-profile-photo-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    body.append(title, notice, actions, hint, status, input);
    box.append(avatar, body);
    upload.addEventListener('click', () => { if (!photoBusy) input.click(); });
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      input.value = '';
      if (file) uploadPhoto(file);
    });
    remove.addEventListener('click', removePhoto);
    Object.assign(photo, { box, avatar, upload, remove, status, input });
    return box;
  }

  function renderPhoto() {
    if (!photo.box) return;
    paintSelfAvatar(photo.avatar, draft.name || savedProfile.name, photoBlobUrl);
    photo.upload.textContent = photoUrl ? 'Fotoğrafı değiştir' : 'Fotoğraf yükle';
    photo.remove.hidden = !photoUrl;
    photo.upload.disabled = photoBusy || !profile;
    photo.remove.disabled = photoBusy;
    photo.box.setAttribute('aria-busy', String(photoBusy));
    photo.box.dataset.photoState = photoUrl ? 'photo' : 'initials';
    paintSelfAvatar(document.getElementById('preview-avatar'), draft.name, photoBlobUrl);
    // Kendi menü avatarı (sidebar.js + avatar.js): öznitelik URL'si oturumdakinden önce gelir.
    const sidebarAvatar = document.querySelector('#sidebar .sidebar-avatar');
    if (sidebarAvatar) {
      if (photoBlobUrl) sidebarAvatar.dataset.avatarUrl = photoBlobUrl;
      else delete sidebarAvatar.dataset.avatarUrl;
      if (window.DemoAvatar && window.DemoAvatar.sync) window.DemoAvatar.sync(sidebarAvatar);
    }
  }

  function photoStatus(message, isError) {
    if (!photo.status) return;
    photo.status.textContent = message || '';
    photo.status.classList.toggle('is-error', Boolean(isError));
    if (isError) photo.status.setAttribute('role', 'alert'); else photo.status.setAttribute('role', 'status');
  }

  async function setPhoto(url) {
    photoUrl = url || null;
    let blobUrl = '';
    if (photoUrl) {
      blobUrl = G ? await G.avatarBlobUrl(photoUrl) : '';
      // Fotoğraf indirilemezse (404/ağ) baş harfler; kayıt yine "var" sayılır, kullanıcı değiştirebilir/kaldırabilir.
    }
    photoBlobUrl = blobUrl;
    renderPhoto();
  }

  function photoErrorMessage(error) {
    const code = error && error.code;
    switch (error && error.status) {
      case 413: return 'Fotoğraf en fazla 2 MB olabilir. Daha küçük bir fotoğraf seç.';
      case 415: return 'Bu dosya türü desteklenmiyor. JPEG, PNG veya WebP bir fotoğraf seç.';
      case 422:
        if (code === 'invalid_image_dimensions') return 'Fotoğrafın her kenarı 32 ile 4096 piksel arasında olmalı.';
        return 'Bir fotoğraf dosyası seç.';
      case 400:
        if (code === 'empty_file') return 'Seçilen dosya boş. Başka bir fotoğraf seç.';
        return 'Fotoğraf gönderilemedi. Tekrar dene.';
      case 403: return 'Bu hesapla profil fotoğrafı yüklenemez.';
      default: return Api.ui.message(error);
    }
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode')); };
      img.src = url;
    });
  }

  function canvasBlob(canvas, type, quality) {
    return new Promise(resolve => canvas.toBlob(resolve, type, quality));
  }

  // K91: en uzun kenar > 1024 px ya da dosya > 2 MB ise canvas ile küçültülür (EXIF yönü tarayıcıda uygulanır).
  async function preparePhoto(file) {
    const img = await loadImage(file);
    const width = img.naturalWidth;
    const height = img.naturalHeight;
    const longest = Math.max(width, height);
    if (longest <= PHOTO_MAX_SIDE && file.size <= PHOTO_MAX_BYTES) return file;
    const scale = Math.min(1, PHOTO_MAX_SIDE / longest);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext('2d');
    const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    if (type === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    let blob = await canvasBlob(canvas, type, 0.9);
    if (blob && blob.size > PHOTO_MAX_BYTES) blob = await canvasBlob(canvas, 'image/jpeg', 0.82);
    if (!blob) return file;
    const ext = blob.type === 'image/png' ? 'png' : 'jpg';
    return new File([blob], 'avatar.' + ext, { type: blob.type });
  }

  async function uploadPhoto(file) {
    if (photoBusy) return;
    if (!PHOTO_TYPES.includes(file.type)) {
      photoStatus('Bu dosya türü desteklenmiyor. JPEG, PNG veya WebP bir fotoğraf seç.', true);
      return;
    }
    if (!file.size) { photoStatus('Seçilen dosya boş. Başka bir fotoğraf seç.', true); return; }
    // Etap 14: aday profiliyle aynı kural — özgün dosya en fazla 5 MB (sonra ≤ 1024 px'e küçültülür).
    if (file.size > 5 * 1024 * 1024) { photoStatus('Fotoğraf en fazla 5 MB olabilir. Daha küçük bir fotoğraf seç.', true); return; }
    photoBusy = true;
    renderPhoto();
    photoStatus('Fotoğraf hazırlanıyor…');
    try {
      let prepared;
      try {
        prepared = await preparePhoto(file);
      } catch (decodeError) {
        throw Object.assign(new Error('decode'), { status: 415, code: 'unsupported_image_type' });
      }
      photoStatus('Fotoğraf yükleniyor…');
      const result = await Api.upload('/me/avatar', { file: prepared, method: 'PUT' });
      await setPhoto(result && result.avatar_url);
      photoStatus('Fotoğrafın güncellendi. Profilin yayındaysa ziyaretçiler de görür.');
      showToast('Profil fotoğrafı güncellendi');
    } catch (error) {
      photoStatus(photoErrorMessage(error), true);
    } finally {
      photoBusy = false;
      renderPhoto();
    }
  }

  async function removePhoto() {
    if (photoBusy || !photoUrl) return;
    photoBusy = true;
    renderPhoto();
    photoStatus('Fotoğraf kaldırılıyor…');
    try {
      await Api.del('/me/avatar');
      await setPhoto(null);
      photoStatus('Fotoğrafın kaldırıldı; yerine baş harflerin görünür.');
      showToast('Profil fotoğrafı kaldırıldı');
      photo.upload.focus();
    } catch (error) {
      photoStatus(photoErrorMessage(error), true);
    } finally {
      photoBusy = false;
      renderPhoto();
    }
  }

  function showToast(message, isError) {
    toastNode.textContent = message;
    toastNode.classList.toggle('is-error', Boolean(isError));
    toastNode.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toastNode.classList.remove('is-visible'), 3600);
  }

  function openDialog(dialog, focusElement) {
    returnFocus = focusElement;
    dialog.hidden = false;
    dialog.querySelector('button')?.focus();
  }

  // ─── Yayın anahtarı: salt okunur (is_active yöneticiye ait) ───────────────
  publishSwitch.disabled = true;
  publishSwitch.setAttribute('aria-disabled', 'true');
  publishSwitch.closest('label')?.setAttribute('title', 'Yayın durumu yönetici tarafından belirlenir.');
  document.getElementById('guru-profile-publish-dialog')?.remove();

  // ─── Önizleme: seans bilgileri hizmetten (salt okunur, K53) ───────────────
  async function loadServicePreview() {
    const price = document.getElementById('preview-price');
    const duration = document.getElementById('preview-duration');
    const sessions = document.getElementById('preview-sessions');
    try {
      const services = await Api.get('/public/services', { auth: false });
      const service = (services.items || [])[0];
      if (!service) throw new Error('no service');
      if (duration) duration.textContent = service.session_duration_minutes + ' dakika';
      if (sessions) sessions.textContent = service.session_count + ' seans';
      if (price) {
        price.textContent = service.price ? Api.format.money(service.price.amount_minor, service.price.currency) : '—';
        price.title = 'Ücret hizmet fiyat kuralından gelir (yönetici).';
      }
    } catch (error) {
      [price, duration, sessions].forEach(node => { if (node) node.textContent = '—'; });
    }
  }

  makeTabs();
  tabGroups.forEach(group => group.sections.forEach(key => tabPanels.get(group.id).appendChild(makeSection(key))));
  tabPanels.get('basics').prepend(makePhotoField());
  refresh();
  renderPhoto();

  document.getElementById('guru-profile-missing').addEventListener('click', event => {
    const link = event.target.closest('[data-jump-to]');
    if (!link) return;
    event.preventDefault();
    const group = tabGroups.find(item => item.id === link.dataset.jumpTo);
    if (!group) return;
    setActiveTab(group.id);
    const target = group.sections.find(key => incompleteSections.includes(key)) || group.sections[0];
    root.querySelector(`#guru-section-${target} [data-profile-path], #guru-section-${target} [data-tag-input]`)?.focus();
  });

  const leaveDialog = document.getElementById('guru-profile-dialog');
  function closeLeaveDialog() {
    leaveDialog.hidden = true;
    pendingHref = '';
    returnFocus?.focus();
    returnFocus = null;
  }
  document.addEventListener('click', event => {
    // Etap 4: paylaşımlı menü (sidebar.js) → menü bağlantıları + marka bağlantısı (H4).
    const link = event.target.closest('#sidebar nav a[href], #sidebar a.sidebar-brand[href]');
    if (!link || document.body.dataset.profileDirty !== 'true') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    pendingHref = link.href;
    openDialog(leaveDialog, link);
  }, true);
  document.getElementById('guru-profile-leave').addEventListener('click', () => {
    const href = pendingHref;
    leaveDialog.hidden = true;
    pendingHref = '';
    document.body.dataset.profileDirty = 'false';
    if (href) location.href = href;
  });
  document.getElementById('guru-profile-stay').addEventListener('click', closeLeaveDialog);
  leaveDialog.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); closeLeaveDialog(); }
  });
  leaveDialog.addEventListener('click', event => { if (event.target === leaveDialog) closeLeaveDialog(); });
  window.addEventListener('beforeunload', event => {
    if (document.body.dataset.profileDirty === 'true') { event.preventDefault(); event.returnValue = ''; }
  });

  (async () => {
    loadServicePreview();
    try {
      await window.sessionReady;
      const [sectors, me] = await Promise.all([
        Api.get('/public/sectors', { auth: false }).then(data => data.items || []),
        Api.get('/guru/profile')
      ]);
      sectorCatalog = sectors.slice().sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      applyProfile(me);
    } catch (error) {
      showToast(Api.ui.message(error), true);
      Api.ui.showError(root, error);
    }
  })();
})();
