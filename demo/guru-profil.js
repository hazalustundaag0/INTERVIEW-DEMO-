// guru-profil.js — Guru · Profilim (guru-profil.html). Sahibi: 84 Guru Panel UI.
// Veri: GET /guru/profile → GuruProfile{first_name, last_name, title, expertise_area, seniority, short_bio, is_active, sectors[]}
//       PUT /guru/profile {title, expertise_area, seniority, short_bio, sector_codes[]} (GAP-B01)
//       GET /public/sectors (sektör kodları) · GET /public/services (önizlemedeki seans bilgisi + ücret, salt okunur)
// K52: yalnız backend'deki alanlar düzenlenir; Deneyim/Eğitim/Sertifika/SSS/yorumlar sekmeleri gizlendi (GAP-B02).
// K53: "Fiyat" sekmesi kaldırıldı; ücret yalnız önizlemede, hizmetin fiyat kuralından (yönetici) salt okunur.
// Yayın durumu (is_active) yöneticiye ait → anahtar salt okunur. Ad soyad hesap bilgisidir → salt okunur.
// "Uzmanlık alanları" etiketleri expertise_area metnine ", " ile birleştirilir (≤300 karakter).
(function () {
  'use strict';
  if (!window.Api) return;
  const Api = window.Api;

  const EMPTY = { name: '', title: '', experience: '', sectors: [], about: '', expertise: [] };
  const sectionKeys = { basics: ['title', 'experience', 'sectors'], about: ['about'], expertise: ['expertise'] };
  const sectionLabels = { basics: 'Temel bilgiler', about: 'Hakkında', expertise: 'Uzmanlık' };
  const tabGroups = [
    { id: 'basics', label: 'Temel bilgiler', sections: ['basics'] },
    { id: 'about', label: 'Hakkında', sections: ['about'] },
    { id: 'expertise', label: 'Uzmanlık', sections: ['expertise'] }
  ];
  const FIELD_PATH = { title: 'title', seniority: 'experience', short_bio: 'about', expertise_area: 'expertise', sector_codes: 'sectors' };
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
      expertise: String(p.expertise_area || '').split(',').map(s => s.trim()).filter(Boolean)
    };
  }
  function toApi(d) {
    return {
      title: d.title.trim(),
      expertise_area: d.expertise.join(', '),
      seniority: d.experience.trim() || null,
      short_bio: d.about.trim() || null,
      sector_codes: d.sectors.slice()
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
    document.getElementById('preview-avatar').textContent = initials(draft.name);
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
      visitor.href = 'danisman.html?' + new URLSearchParams({ id: profile.id, onizleme: '1' }).toString();
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
          const path = FIELD_PATH[name];
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
  refresh();

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
    const link = event.target.closest('.advisor-sidebar nav a[href]');
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
