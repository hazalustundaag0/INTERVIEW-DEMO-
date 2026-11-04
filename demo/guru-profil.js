(function () {
  const STORAGE_KEY = 'guruProfile';
  const advisor = window.getAdvisor?.('selin-arslan');
  const defaults = advisor ? {
    name: advisor.ad,
    title: advisor.unvan,
    experience: advisor.deneyimYili,
    sectors: [...advisor.sektorler],
    about: advisor.hakkinda,
    expertise: [...advisor.uzmanlik],
    experienceList: advisor.deneyim.map(item => ({ ...item })),
    education: advisor.egitim.map(item => ({ ...item })),
    certificates: [...advisor.sertifikalar],
    approach: [...advisor.yaklasim],
    clients: [...advisor.kimlerleCalisirim],
    faqs: advisor.sss.map(item => ({ ...item })),
    price: advisor.ucret,
    published: advisor.yayinda
  } : {
    name: 'Selin Arslan', title: 'Kıdemli Satış Direktörü & Mentor', experience: 12,
    sectors: ['Teknoloji', 'SaaS', 'Liderlik'],
    about: 'Teknoloji ve ölçeklenen şirketlerde satış ekipleri kurma, büyütme ve liderlik etme deneyimimi kariyer danışmanlığına taşıyorum.',
    expertise: ['Satış liderliği', 'Mülakat hikâyeleştirme', 'Kariyer geçişi'],
    experienceList: [], education: [], certificates: [], approach: ['', '', ''], clients: [], faqs: [],
    price: 1500, published: true
  };
  const sectionKeys = {
    basics: ['name', 'title', 'experience', 'sectors'],
    about: ['about'],
    expertise: ['expertise'],
    experience: ['experienceList'],
    education: ['education'],
    certificates: ['certificates'],
    approach: ['approach'],
    clients: ['clients'],
    faqs: ['faqs'],
    price: ['price']
  };
  const sectionLabels = {
    basics: 'Temel bilgiler', about: 'Hakkında', expertise: 'Uzmanlık',
    experience: 'Deneyim', education: 'Eğitim', certificates: 'Sertifikalar',
    approach: 'Çalışma yaklaşımı', clients: 'Kimlerle çalışırım?',
    faqs: 'Sık sorulan sorular', price: 'Seans ücreti'
  };
  const tabGroups = [
    { id: 'basics', label: 'Temel bilgiler', sections: ['basics'] },
    { id: 'about', label: 'Hakkında', sections: ['about'] },
    { id: 'expertise', label: 'Uzmanlık', sections: ['expertise'] },
    { id: 'experience-education', label: 'Deneyim ve eğitim', sections: ['experience', 'education'] },
    { id: 'certificates-faq', label: 'Sertifikalar ve SSS', sections: ['certificates', 'approach', 'clients', 'faqs'] },
    { id: 'price', label: 'Fiyat', sections: ['price'] }
  ];
  const sectionTab = Object.fromEntries(tabGroups.flatMap(group =>
    group.sections.map(key => [key, group.id])
  ));
  const root = document.getElementById('guru-profile-sections');
  const toast = document.getElementById('guru-profile-toast');
  const publishSwitch = document.getElementById('guru-profile-published');
  let savedProfile = clone(defaults);
  let draft = clone(defaults);
  let toastTimer;
  let pendingHref = '';
  let returnFocus = null;
  let activeTab = tabGroups[0].id;
  let incompleteSections = [];
  const tabButtons = new Map();
  const tabPanels = new Map();

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeProfile(profile) {
    const result = { ...clone(defaults), ...profile };
    result.name = typeof result.name === 'string' ? result.name : defaults.name;
    result.title = typeof result.title === 'string' ? result.title : defaults.title;
    result.about = typeof result.about === 'string' ? result.about : defaults.about;
    ['sectors', 'expertise', 'certificates', 'approach', 'clients'].forEach(key => {
      result[key] = Array.isArray(result[key]) ? result[key].filter(value => typeof value === 'string') : clone(defaults[key]);
    });
    ['experienceList', 'education', 'faqs'].forEach(key => {
      result[key] = Array.isArray(result[key]) ? result[key].filter(value => value && typeof value === 'object').map(value => ({ ...value })) : clone(defaults[key]);
    });
    result.experience = Number.isFinite(Number(result.experience)) ? Number(result.experience) : defaults.experience;
    result.price = Number.isFinite(Number(result.price)) ? Number(result.price) : defaults.price;
    result.published = typeof result.published === 'boolean' ? result.published
      : typeof result.yayinda === 'boolean' ? result.yayinda : defaults.published;
    result.sectors = result.sectors.slice(0, 6);
    result.approach = result.approach.slice(0, 3);
    while (result.approach.length < 3) result.approach.push('');
    return result;
  }

  function initials(name) {
    return name.trim().split(/\s+/).slice(0, 2)
      .map(part => part.charAt(0).toLocaleUpperCase('tr-TR')).join('');
  }

  function setPath(object, path, value) {
    const keys = path.split('.');
    let target = object;
    keys.slice(0, -1).forEach(key => { target = target[key]; });
    target[keys[keys.length - 1]] = value;
  }

  function readProfile() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return clone(defaults);
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new TypeError('Danışman profili biçimi geçersiz.');
    }
    return normalizeProfile(value);
  }

  window.saveGuruProfile = function (profile) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  };

  function same(first, second) {
    return JSON.stringify(first) === JSON.stringify(second);
  }

  function countChanges(previous, current) {
    if (same(previous, current)) return 0;
    if (Array.isArray(previous) && Array.isArray(current)) {
      const sharedLength = Math.min(previous.length, current.length);
      let changes = Math.abs(previous.length - current.length);
      for (let index = 0; index < sharedLength; index += 1) {
        changes += countChanges(previous[index], current[index]);
      }
      return changes || 1;
    }
    if (previous && current && typeof previous === 'object' && typeof current === 'object' &&
        !Array.isArray(previous) && !Array.isArray(current)) {
      const keys = new Set([...Object.keys(previous), ...Object.keys(current)]);
      let changes = 0;
      keys.forEach(key => {
        if (!(key in previous) || !(key in current)) changes += 1;
        else changes += countChanges(previous[key], current[key]);
      });
      return changes || 1;
    }
    return 1;
  }

  function field(labelText, value, path, type) {
    const wrapper = document.createElement('div');
    wrapper.className = 'guru-profile-field';
    const id = 'guru-field-' + path.replace(/[^a-z0-9]+/gi, '-');
    const label = document.createElement('label');
    label.htmlFor = id;
    label.textContent = labelText;
    const input = type === 'textarea' ? document.createElement('textarea') : document.createElement('input');
    input.id = id;
    input.dataset.profilePath = path;
    if (type !== 'textarea') input.type = type || 'text';
    if (type === 'textarea') input.maxLength = path === 'about' ? 500 : 300;
    if (type === 'number') {
      input.min = '0';
      input.step = '1';
      input.inputMode = 'numeric';
    }
    input.value = value ?? '';
    const error = document.createElement('span');
    error.className = 'guru-profile-error';
    error.dataset.errorFor = path;
    error.setAttribute('aria-live', 'polite');
    input.setAttribute('aria-describedby', id + '-error');
    error.id = id + '-error';
    wrapper.append(label, input, error);
    return wrapper;
  }

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
    input.placeholder = "Yazıp Enter'a bas";
    input.setAttribute('aria-label', title + ' ekle');
    input.dataset.tagInput = key;
    const tagBox = document.createElement('div');
    tagBox.className = 'guru-profile-tag-input-box';
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        const value = input.value.trim();
        if (!value || draft[key].length >= maxCount ||
            draft[key].some(item => item.toLocaleLowerCase('tr-TR') === value.toLocaleLowerCase('tr-TR'))) return;
        draft[key].push(value);
        input.value = '';
        renderSection(fieldset.closest('[data-section]'));
        refresh();
      } else if (event.key === 'Backspace' && !input.value && draft[key].length) {
        draft[key].pop();
        renderSection(fieldset.closest('[data-section]'));
        refresh();
      }
    });
    tagBox.append(list, input);
    fieldset.append(legend, tagBox);
    renderTags(key, list);
    return fieldset;
  }

  function renderTags(key, list) {
    list.replaceChildren();
    draft[key].forEach((tag, index) => {
      const item = document.createElement('li');
      const text = document.createElement('span');
      text.textContent = tag;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = '×';
      remove.setAttribute('aria-label', tag + ' etiketini kaldır');
      remove.addEventListener('click', () => {
        draft[key].splice(index, 1);
        renderSection(list.closest('[data-section]'));
        refresh();
      });
      item.append(text, remove);
      list.appendChild(item);
    });
  }

  function primitiveListEditor(key, labelText) {
    const wrapper = document.createElement('div');
    wrapper.className = 'guru-profile-repeater';
    const heading = document.createElement('h3');
    heading.textContent = labelText;
    const list = document.createElement('div');
    list.className = 'guru-profile-repeater-list';
    list.dataset.primitiveList = key;
    wrapper.append(heading, list);
    if (key !== 'approach') {
      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'guru-profile-add-row';
      add.textContent = '+ ' + labelText + ' ekle';
      add.addEventListener('click', () => {
        draft[key].push('');
        renderSection(wrapper.closest('[data-section]'));
        refresh();
        wrapper.closest('[data-section]')?.querySelector(`[data-profile-path="${key}.${draft[key].length - 1}"]`)?.focus();
      });
      wrapper.appendChild(add);
    }
    renderPrimitiveRows(key, list);
    return wrapper;
  }

  function renderPrimitiveRows(key, list) {
    list.replaceChildren();
    draft[key].forEach((value, index) => {
      const row = document.createElement('div');
      row.className = 'guru-profile-repeater-row';
      const input = document.createElement(key === 'approach' ? 'textarea' : 'input');
      input.value = value;
      input.dataset.profilePath = key + '.' + index;
      input.setAttribute('aria-label', sectionLabels[key] + ' ' + (index + 1));
      if (key === 'approach') input.maxLength = 300;
      row.appendChild(input);
      if (key !== 'approach') {
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'guru-profile-remove-row';
        remove.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">delete</span><span>Sil</span>';
        remove.setAttribute('aria-label', sectionLabels[key] + ' ' + (index + 1) + ' satırını sil');
        remove.addEventListener('click', () => {
          if (key === 'certificates' && !window.confirm('Bu sertifika kaydını silmek istiyor musun?')) return;
          draft[key].splice(index, 1);
          renderSection(list.closest('[data-section]'));
          refresh();
        });
        row.appendChild(remove);
      }
      list.appendChild(row);
    });
  }

  function objectListEditor(key, title, fieldSpecs) {
    const wrapper = document.createElement('div');
    wrapper.className = 'guru-profile-repeater';
    const heading = document.createElement('h3');
    heading.textContent = title;
    const list = document.createElement('div');
    list.className = 'guru-profile-repeater-list';
    list.dataset.objectList = key;
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'guru-profile-add-row';
    add.textContent = '+ ' + title + ' ekle';
    add.addEventListener('click', () => {
      draft[key].push(Object.fromEntries(fieldSpecs.map(spec => [spec[0], ''])));
      renderSection(wrapper.closest('[data-section]'));
      refresh();
    });
    wrapper.append(heading, list, add);
    draft[key].forEach((record, index) => {
      const row = document.createElement('fieldset');
      row.className = 'guru-profile-repeater-card guru-profile-repeater-card--' + key;
      row.dataset.objectRecord = key;
      const legend = document.createElement('legend');
      legend.textContent = title + ' ' + (index + 1);
      row.appendChild(legend);
      fieldSpecs.forEach(spec => {
        const input = field(spec[1], record[spec[0]], key + '.' + index + '.' + spec[0], spec[2]);
        row.appendChild(input);
      });
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'guru-profile-remove-row';
      remove.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">delete</span><span>Sil</span>';
      remove.setAttribute('aria-label', title + ' ' + (index + 1) + ' kaydını sil');
      remove.addEventListener('click', () => {
        if (!window.confirm('Bu ' + title.toLocaleLowerCase('tr-TR') + ' kaydını silmek istiyor musun?')) return;
        draft[key].splice(index, 1);
        renderSection(list.closest('[data-section]'));
        refresh();
      });
      row.appendChild(remove);
      list.appendChild(row);
    });
    return wrapper;
  }

  function renderSection(section) {
    if (!section) return;
    const key = section.dataset.section;
    const body = section.querySelector('.guru-profile-section-body');
    body.replaceChildren();
    if (key === 'basics') {
      body.append(field('Ad soyad', draft.name, 'name'), field('Unvan', draft.title, 'title'),
        field('Deneyim yılı', draft.experience, 'experience', 'number'), tagEditor('Sektör etiketleri', 'sectors', 6));
    } else if (key === 'about') {
      body.append(field('Hakkında', draft.about, 'about', 'textarea'));
      const counter = document.createElement('span');
      counter.className = 'guru-profile-counter';
      counter.dataset.aboutCount = '';
      counter.textContent = draft.about.length + ' / 500';
      body.appendChild(counter);
    } else if (key === 'expertise') {
      body.appendChild(tagEditor('Uzmanlık alanları', 'expertise', Number.POSITIVE_INFINITY));
    } else if (key === 'experience') {
      body.appendChild(objectListEditor('experienceList', 'Deneyim', [
        ['rol', 'Görev / unvan'], ['kurum', 'Kurum'], ['baslangic', 'Başlangıç'], ['bitis', 'Bitiş']
      ]));
    } else if (key === 'education') {
      body.appendChild(objectListEditor('education', 'Eğitim', [
        ['okul', 'Okul'], ['bolum', 'Bölüm'], ['yil', 'Yıl']
      ]));
    } else if (key === 'certificates') {
      body.appendChild(primitiveListEditor('certificates', 'Sertifika'));
    } else if (key === 'approach') {
      body.appendChild(primitiveListEditor('approach', 'Adım'));
    } else if (key === 'clients') {
      body.appendChild(primitiveListEditor('clients', 'Danışan grubu'));
    } else if (key === 'faqs') {
      body.appendChild(objectListEditor('faqs', 'Soru-cevap', [
        ['soru', 'Soru'], ['cevap', 'Cevap', 'textarea']
      ]));
    } else if (key === 'price') {
      const priceField = field('Seans ücreti', draft.price, 'price', 'number');
      const priceInput = priceField.querySelector('input');
      const priceControl = document.createElement('div');
      priceControl.className = 'guru-profile-price';
      const prefix = document.createElement('span');
      prefix.setAttribute('aria-hidden', 'true');
      prefix.textContent = '₺';
      priceInput.replaceWith(priceControl);
      priceControl.append(prefix, priceInput);
      body.appendChild(priceField);
      body.append(field('Seans süresi', '50 dk', 'sessionLength'));
      body.lastElementChild.querySelector('input').readOnly = true;
      body.lastElementChild.querySelector('input').setAttribute('aria-describedby', 'guru-profile-duration-hint');
      const hint = body.lastElementChild.querySelector('.guru-profile-error');
      hint.id = 'guru-profile-duration-hint';
      hint.className = 'guru-profile-hint';
      hint.removeAttribute('data-error-for');
      hint.textContent = 'Seans süresi sabittir.';
      body.lastElementChild.querySelector('input').value = '50 dk';
    }
    section.querySelectorAll('[data-profile-path]').forEach(input => {
      input.addEventListener('input', () => {
        if (input.dataset.profilePath !== 'sessionLength') {
          setPath(draft, input.dataset.profilePath, input.type === 'number'
            ? input.value === '' ? '' : Number(input.value)
            : input.value);
        }
        if (key === 'about') {
          const count = section.querySelector('[data-about-count]');
          if (count) count.textContent = input.value.length + ' / 500';
        }
        refresh();
      });
    });
    section.querySelectorAll('[data-tag-list]').forEach(list => renderTags(list.dataset.tagList, list));
  }

  function sectionChanged(key) {
    return sectionKeys[key].some(property => !same(draft[property], savedProfile[property]));
  }

  function sectionErrors(key) {
    const errors = {};
    if (key === 'basics') {
      if (!draft.name.trim()) errors.name = 'Ad soyad alanı zorunludur.';
      if (!draft.title.trim()) errors.title = 'Unvan alanı zorunludur.';
      if (!Number.isFinite(Number(draft.experience)) || Number(draft.experience) < 0 || Number(draft.experience) > 60) {
        errors.experience = 'Deneyim yılı 0 ile 60 arasında olmalıdır.';
      }
      if (draft.sectors.length > 6) errors.sectors = 'En fazla 6 sektör ekleyebilirsin.';
    }
    if (key === 'about' && !draft.about.trim()) errors.about = 'Hakkında alanı zorunludur.';
    if (key === 'price' && (!Number.isFinite(Number(draft.price)) || Number(draft.price) < 0)) {
      errors.price = 'Seans ücreti negatif olamaz.';
    }
    return errors;
  }

  function validateSections() {
    root.querySelectorAll('[data-section]').forEach(section => {
      const key = section.dataset.section;
      const errors = sectionErrors(key);
      section.querySelectorAll('[data-error-for]').forEach(error => {
        const message = errors[error.dataset.errorFor] || '';
        error.textContent = message;
        const input = section.querySelector(`[data-profile-path="${error.dataset.errorFor}"]`);
        if (input) {
          if (message) input.setAttribute('aria-invalid', 'true');
          else input.removeAttribute('aria-invalid');
        }
      });
    });
  }

  function completeness() {
    const checks = [
      ['basics', draft.name.trim() && draft.title.trim() && draft.sectors.length > 0],
      ['about', Boolean(draft.about.trim())],
      ['expertise', draft.expertise.length > 0],
      ['experience', draft.experienceList.length > 0],
      ['education', draft.education.length > 0],
      ['certificates', draft.certificates.length > 0],
      ['approach', draft.approach.length === 3 && draft.approach.every(item => item.trim())],
      ['clients', draft.clients.length > 0],
      ['faqs', draft.faqs.length > 0 && draft.faqs.every(item => item.soru?.trim() && item.cevap?.trim())],
      ['price', Number.isFinite(Number(draft.price)) && Number(draft.price) >= 0]
    ];
    incompleteSections = checks.filter(item => !item[1]).map(item => item[0]);
    const percent = Math.round(((checks.length - incompleteSections.length) / checks.length) * 100);
    const value = document.getElementById('guru-profile-completion-value');
    const track = document.querySelector('.guru-profile-completion-track');
    const fill = document.getElementById('guru-profile-completion-fill');
    const missingText = document.getElementById('guru-profile-missing');
    value.textContent = percent + '%';
    fill.style.width = percent + '%';
    track.setAttribute('aria-valuenow', String(percent));
    tabGroups.forEach(group => {
      const dot = tabButtons.get(group.id)?.querySelector('.guru-profile-tab-dot');
      if (dot) dot.hidden = !group.sections.some(key => incompleteSections.includes(key));
    });
    missingText.replaceChildren();
    if (!incompleteSections.length) {
      missingText.textContent = 'Profilindeki tüm bölümler tamam.';
      return;
    }
    missingText.appendChild(document.createTextNode('Eksik bölümler: '));
    const missingGroups = tabGroups.filter(group => group.sections.some(key => incompleteSections.includes(key)));
    missingGroups.forEach((group, index) => {
      const link = document.createElement('a');
      link.href = '#guru-tab-panel-' + group.id;
      link.dataset.jumpTo = group.id;
      link.textContent = group.label;
      missingText.append(link);
      if (index < missingGroups.length - 1) missingText.appendChild(document.createTextNode(', '));
    });
  }

  function renderPreview() {
    document.getElementById('preview-avatar').textContent = initials(draft.name) || 'SA';
    document.getElementById('preview-name').textContent = draft.name || 'Ad soyad';
    document.getElementById('preview-title').textContent = draft.title || 'Unvan';
    document.getElementById('preview-experience').textContent = draft.experience + '+ yıl deneyim';
    document.getElementById('preview-about').textContent = draft.about || 'Hakkında bilgisi eklenmedi.';
    document.getElementById('preview-price').textContent = new Intl.NumberFormat('tr-TR').format(Number(draft.price) || 0) + ' ₺';
    const tags = document.getElementById('preview-tags');
    tags.replaceChildren(...draft.expertise.map(tag => {
      const item = document.createElement('li');
      item.textContent = tag;
      return item;
    }));
    const sectors = document.getElementById('preview-sectors');
    sectors.replaceChildren(...draft.sectors.map(tag => {
      const item = document.createElement('li');
      item.textContent = tag;
      return item;
    }));
    document.getElementById('guru-profile-visitor-preview').href = 'danisman.html?id=selin-arslan&onizleme=1';
  }

  function refresh() {
    validateSections();
    completeness();
    renderPreview();
    document.body.dataset.profileDirty = String(Array.from(root.querySelectorAll('[data-section]'))
      .some(section => sectionChanged(section.dataset.section)));
    updateActionButtons();
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
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', 'guru-tab-panel-' + group.id);
      tab.setAttribute('aria-selected', String(group.id === activeTab));
      tab.tabIndex = group.id === activeTab ? 0 : -1;
      tab.dataset.profileTab = group.id;
      const label = document.createElement('span');
      label.textContent = group.label;
      const dot = document.createElement('span');
      dot.className = 'guru-profile-tab-dot';
      dot.setAttribute('aria-hidden', 'true');
      tab.append(label, dot);
      tab.addEventListener('click', () => setActiveTab(group.id));
      tab.addEventListener('keydown', event => {
        const index = tabGroups.findIndex(item => item.id === group.id);
        let nextIndex;
        if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabGroups.length;
        else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabGroups.length) % tabGroups.length;
        else if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = tabGroups.length - 1;
        else return;
        event.preventDefault();
        const nextTab = tabGroups[nextIndex];
        setActiveTab(nextTab.id, true);
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
    save.textContent = 'Kaydet';
    save.addEventListener('click', saveProfile);
    const buttons = document.createElement('div');
    buttons.className = 'guru-profile-action-buttons';
    buttons.append(cancel, save);
    actions.append(changeStatus, buttons);

    tabShell.appendChild(tabList);
    root.append(tabShell, panels, actions);
    updateActionButtons();
  }

  function setActiveTab(tabId, focusTab) {
    if (!tabPanels.has(tabId)) return;
    activeTab = tabId;
    tabGroups.forEach(group => {
      const selected = group.id === tabId;
      const tab = tabButtons.get(group.id);
      const panel = tabPanels.get(group.id);
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      panel.hidden = !selected;
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

  function updateActionButtons() {
    const status = root.querySelector('.guru-profile-change-status');
    const save = root.querySelector('.guru-profile-action-bar .guru-profile-save');
    const changes = [...new Set(Object.values(sectionKeys).flat())]
      .reduce((count, key) => count + countChanges(savedProfile[key], draft[key]), 0);
    if (status) status.textContent = changes ? changes + ' değişiklik kaydedilmedi' : 'Değişiklik yok';
    if (save) save.disabled = changes === 0;
  }

  function cancelChanges() {
    draft = clone(savedProfile);
    root.querySelectorAll('[data-section]').forEach(renderSection);
    refresh();
  }

  function saveProfile() {
    const errors = {};
    Object.keys(sectionKeys).forEach(key => Object.assign(errors, sectionErrors(key)));
    validateSections();
    const firstError = Object.keys(errors)[0];
    if (firstError) {
      const section = root.querySelector(`[data-profile-path="${firstError}"]`)?.closest('[data-section]');
      if (section) setActiveTab(sectionTab[section.dataset.section]);
      root.querySelector(`[data-profile-path="${firstError}"]`)?.focus();
      return;
    }
    persist(clone(draft));
  }

  function updateUser(profile) {
    document.querySelectorAll('.advisor-sidebar').forEach(sidebar => {
      const name = sidebar.querySelector('.border-t .truncate');
      const avatar = sidebar.querySelector('.border-t .rounded-full');
      if (name) name.textContent = profile.name;
      if (avatar) avatar.textContent = initials(profile.name);
    });
    const session = window.getSession?.();
    if (session?.role === 'danisman') window.setSession?.({ ...session, name: profile.name });
  }

  function persist(profile) {
    try {
      window.saveGuruProfile(profile);
      savedProfile = normalizeProfile(profile);
      draft = normalizeProfile(draft);
      updateUser(savedProfile);
      refresh();
      showToast('Profil güncellendi');
    } catch (error) {
      console.error('Danışman profili kaydedilemedi.', error);
      showToast('Profil kaydedilemedi. Tekrar deneyebilir veya tarayıcı depolama alanını kontrol edebilirsin.', true);
    }
  }

  function showToast(message, isError) {
    toast.textContent = message;
    toast.classList.toggle('is-error', Boolean(isError));
    toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 3200);
  }

  function openDialog(dialog, focusElement) {
    returnFocus = focusElement;
    dialog.hidden = false;
    dialog.querySelector('button')?.focus();
  }

  function closeDialog(dialog) {
    dialog.hidden = true;
    returnFocus?.focus();
    returnFocus = null;
  }

  try {
    savedProfile = normalizeProfile(readProfile());
    draft = clone(savedProfile);
  } catch (error) {
    console.error('Danışman profili okunamadı.', error);
    showToast('Profil bilgileri okunamadı. Sayfayı yenileyip tekrar dene.', true);
  }

  makeTabs();
  tabGroups.forEach(group => {
    group.sections.forEach(key => tabPanels.get(group.id).appendChild(makeSection(key)));
  });
  const reviews = document.createElement('section');
  reviews.className = 'guru-profile-editor-section guru-profile-readonly-reviews';
  reviews.innerHTML = '<h2>Danışan yorumları</h2>';
  (advisor?.yorumlar || []).forEach(review => {
    const item = document.createElement('blockquote');
    const name = document.createElement('strong');
    name.textContent = review.ad + ' · ' + '★'.repeat(review.puan);
    const text = document.createElement('p');
    text.textContent = review.metin;
    const date = document.createElement('cite');
    date.textContent = review.tarih;
    item.append(name, text, date);
    reviews.appendChild(item);
  });
  tabPanels.get('certificates-faq').appendChild(reviews);
  publishSwitch.checked = savedProfile.published;
  refresh();

  root.addEventListener('input', event => {
    if (event.target.matches('[data-profile-path]')) refresh();
  });
  document.getElementById('guru-profile-missing').addEventListener('click', event => {
    const link = event.target.closest('[data-jump-to]');
    if (!link) return;
    event.preventDefault();
    const group = tabGroups.find(item => item.id === link.dataset.jumpTo);
    if (!group) return;
    setActiveTab(group.id);
    const targetSection = group.sections.find(key => incompleteSections.includes(key)) || group.sections[0];
    root.querySelector(`#guru-section-${targetSection} [data-profile-path]`)?.focus();
  });

  publishSwitch.addEventListener('change', () => {
    if (!publishSwitch.checked) {
      publishSwitch.checked = true;
      openDialog(document.getElementById('guru-profile-publish-dialog'), publishSwitch);
      return;
    }
    const updated = clone(savedProfile);
    updated.published = true;
    persist(updated);
    draft.published = true;
  });
  const publishDialog = document.getElementById('guru-profile-publish-dialog');
  document.getElementById('guru-profile-publish-confirm').addEventListener('click', () => {
    const updated = clone(savedProfile);
    updated.published = false;
    persist(updated);
    draft.published = false;
    publishSwitch.checked = false;
    closeDialog(publishDialog);
  });
  document.getElementById('guru-profile-publish-cancel').addEventListener('click', () => closeDialog(publishDialog));

  const leaveDialog = document.getElementById('guru-profile-dialog');
  function closeLeaveDialog() {
    leaveDialog.hidden = true;
    pendingHref = '';
    returnFocus?.focus();
    returnFocus = null;
  }
  document.querySelector('.advisor-sidebar nav')?.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
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
    if (href) location.href = href;
  });
  document.getElementById('guru-profile-stay').addEventListener('click', closeLeaveDialog);

  [leaveDialog, publishDialog].forEach(dialog => dialog.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (dialog === leaveDialog) closeLeaveDialog();
      else closeDialog(dialog);
    } else if (event.key === 'Tab') {
      const buttons = Array.from(dialog.querySelectorAll('button'));
      if (event.shiftKey && document.activeElement === buttons[0]) {
        event.preventDefault();
        buttons[buttons.length - 1].focus();
      } else if (!event.shiftKey && document.activeElement === buttons[buttons.length - 1]) {
        event.preventDefault();
        buttons[0].focus();
      }
    }
  }));
  [leaveDialog, publishDialog].forEach(dialog => dialog.addEventListener('click', event => {
    if (event.target === dialog) {
      if (dialog === leaveDialog) closeLeaveDialog();
      else closeDialog(dialog);
    }
  }));

  window.addEventListener('beforeunload', event => {
    if (document.body.dataset.profileDirty === 'true') {
      event.preventDefault();
      event.returnValue = '';
    }
  });
})();
