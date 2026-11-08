// cv-demo.js — CV yükleme / elle giriş / gözden geçirme / onay (83). Veri yalnız API:
//   GET  /candidate/cv                    → son CV (404 = henüz yok)
//   POST /candidate/cv (multipart file)   → şifreli depolanır; ayrıştırıcı stub'ı boş döner (K62) → elle giriş
//   POST /candidate/cv/manual             → dosyasız elle giriş
//   PUT  /candidate/cv/{id}               → deneyim/eğitim/yetkinlik (onaylıysa 409 immutable)
//   POST /candidate/cv/{id}/approve {confirm:true} → aktif onay; üçü de boşsa 422 (K46)
// Öğe şeması (GAP-B11): deneyim {title, company, start, end}, eğitim {school, degree, start, end}, yetkinlik {name}.
// Sahte örnek kayıtlar ve "Başarıyla ayrıştırıldı" metni kaldırıldı (GAP-D12). localStorage yok.
(function () {
  'use strict';
  const uploadEmpty = document.querySelector('[data-upload-empty]');
  const uploadCompact = document.querySelector('[data-upload-compact]');
  const uploadedFile = document.querySelector('[data-uploaded-file]');
  const parsedCard = document.querySelector('.cv-parsed-card');
  const tabs = Array.from(document.querySelectorAll('#cv-tabs [role="tab"]'));
  const reviewChecks = Array.from(document.querySelectorAll('[data-review-check]'));
  const confirmButton = document.querySelector('[data-cv-confirm]');
  const reviewStatus = document.querySelector('[data-review-status]');
  const saveToast = document.querySelector('[data-save-toast]');
  const bottomPanel = document.querySelector('.cv-bottom-actions');
  const workCard = document.querySelector('main section > div');
  const sections = {
    experience: document.querySelector('.cv-section[data-section="experience"]'),
    education: document.querySelector('.cv-section[data-section="education"]'),
    skills: document.querySelector('.cv-section[data-section="skills"]')
  };
  const skillsList = document.getElementById('skills-list');
  const skillEntry = document.querySelector('[data-skill-entry]');
  const skillInput = document.getElementById('cv-skill-input');
  const addSkillButton = skillsList && Array.from(skillsList.querySelectorAll(':scope > button')).find(b => b.textContent.includes('Yetkinlik ekle'));
  const heading = document.querySelector('main h1');
  const intro = heading && heading.nextElementSibling;
  const guidanceTitle = parsedCard && parsedCard.querySelector('h2');
  const guidanceText = guidanceTitle && guidanceTitle.closest('.mb-space-lg')?.querySelector('p');

  // Örnek (başkasına ait) kayıtlar hemen kaldırılır; gerçek veri yüklenene kadar kart gizli.
  document.querySelectorAll('[data-cv-record]').forEach(node => node.remove());
  skillsList?.querySelectorAll(':scope > span').forEach(node => node.remove());
  if (uploadedFile) uploadedFile.hidden = true;
  if (parsedCard) parsedCard.hidden = true;
  if (heading && intro) intro.textContent = 'CV\'ni yükle ya da bilgilerini elle gir; onaylamadan önce kontrol et.';

  const LABELS = {
    experience: { add: 'İş deneyimi', edit: 'İş deneyimini düzenle', del: 'İş deneyimini sil', fields: [['title', 'Pozisyon'], ['company', 'Şirket'], ['start', 'Başlangıç yılı'], ['end', 'Bitiş yılı (devam ediyorsa boş)']] },
    education: { add: 'Eğitim', edit: 'Eğitim bilgisini düzenle', del: 'Eğitim bilgisini sil', fields: [['school', 'Üniversite / Kurum'], ['degree', 'Bölüm ve derece'], ['start', 'Başlangıç yılı'], ['end', 'Bitiş yılı']] }
  };

  let cv = null;            // API CV nesnesi
  let model = { experience: [], education: [], skills: [] };
  let lastFile = null;      // bu oturumda yüklenen dosya (ad/boyut gösterimi için)
  let busy = false;

  // ─── Model ──────────────────────────────────────────────────────────────────
  function str(value) { return value == null ? '' : String(value).trim(); }

  function normalize(content) {
    const exp = (content.experience || []).map(item => typeof item === 'string' ? { title: item, company: '', start: '', end: '' } : {
      title: str(item.title || item.position || item.role), company: str(item.company || item.organization),
      start: str(item.start || item.start_year), end: str(item.end || item.end_year), description: str(item.description) || undefined
    });
    const edu = (content.education || []).map(item => typeof item === 'string' ? { school: item, degree: '', start: '', end: '' } : {
      school: str(item.school || item.institution), degree: str(item.degree || item.department),
      start: str(item.start || item.start_year), end: str(item.end || item.end_year)
    });
    const skills = (content.skills || []).map(item => ({ name: typeof item === 'string' ? str(item) : str(item.name) })).filter(item => item.name);
    return { experience: exp, education: edu, skills };
  }

  function payload() {
    const clean = obj => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
    return {
      experience: model.experience.map(clean),
      education: model.education.map(clean),
      skills: model.skills.map(clean)
    };
  }

  function isEmpty() {
    return !model.experience.length && !model.education.length && !model.skills.length;
  }

  function approved() { return Boolean(cv && cv.approved_at); }

  // ─── Görünüm ────────────────────────────────────────────────────────────────
  function toast(message, isError) {
    if (!saveToast) return;
    saveToast.textContent = message;
    saveToast.hidden = false;
    saveToast.classList.toggle('cv-save-toast--error', Boolean(isError));
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { saveToast.hidden = true; }, 3500);
  }

  function formatSize(bytes) {
    return bytes < 1024 * 1024 ? Math.max(1, Math.round(bytes / 1024)) + ' KB' : (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function span(className, text) {
    const node = document.createElement('span');
    node.className = className;
    node.textContent = text;
    return node;
  }

  function iconButton(kind, action, index) {
    const label = LABELS[kind][action === 'edit' ? 'edit' : 'del'];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = action === 'edit'
      ? 'text-outline hover:text-tertiary p-1 transition-colors cv-edit-record'
      : 'text-outline hover:text-error p-1 transition-colors cv-delete-record';
    button.setAttribute('aria-label', label);
    button.title = label;
    button.dataset.index = String(index);
    const icon = span('material-symbols-outlined text-[18px]', action === 'edit' ? 'edit' : 'delete');
    icon.setAttribute('aria-hidden', 'true');
    button.appendChild(icon);
    return button;
  }

  function dateRange(item) {
    if (!item.start && !item.end) return '';
    return (item.start || '—') + ' — ' + (item.end || 'Günümüz');
  }

  function recordNode(kind, item, index, last) {
    const row = document.createElement('div');
    row.className = (last ? 'pt-space-sm ' : 'py-space-sm border-b border-outline-variant ') + 'flex items-start justify-between gap-space-md cv-record';
    row.dataset.cvRecord = '';
    row.dataset.index = String(index);
    const text = document.createElement('div');
    text.className = 'flex flex-col';
    const first = kind === 'experience' ? item.title : item.school;
    const second = kind === 'experience' ? item.company : item.degree;
    text.append(
      span('font-headline-sm text-body-md text-[#1E1E1C]', first || '—'),
      span('font-body-md text-body-md text-on-surface-variant font-medium', second || '')
    );
    const range = dateRange(item);
    if (range) text.append(span('font-body-md-secondary text-label-step text-outline mt-0.5', range));
    row.appendChild(text);
    if (!approved()) {
      const actions = document.createElement('div');
      actions.className = 'flex items-center gap-1';
      actions.append(iconButton(kind, 'edit', index), iconButton(kind, 'delete', index));
      row.appendChild(actions);
    }
    return row;
  }

  function emptyNote(text) {
    const note = document.createElement('p');
    note.className = 'font-body-md-secondary text-label-step text-outline py-space-sm';
    note.dataset.cvEmpty = '';
    note.textContent = text;
    return note;
  }

  function renderSection(kind) {
    const section = sections[kind];
    if (!section) return;
    section.querySelectorAll('[data-cv-record], [data-cv-empty], .cv-inline-editor').forEach(node => node.remove());
    const addButton = section.querySelector('[data-add-record]');
    const items = model[kind];
    if (!items.length) addButton.before(emptyNote('Henüz kayıt yok. "+ ' + LABELS[kind].add + ' ekle" ile ekleyebilirsin.'));
    items.forEach((item, index) => addButton.before(recordNode(kind, item, index, index === items.length - 1)));
    addButton.hidden = approved();
    const count = section.querySelector('[data-record-count]');
    if (count) count.textContent = items.length + ' Kayıt';
  }

  function renderSkills() {
    if (!skillsList) return;
    skillsList.querySelectorAll(':scope > span, [data-cv-empty]').forEach(node => node.remove());
    if (!model.skills.length) skillsList.prepend(emptyNote('Henüz yetkinlik eklenmedi.'));
    model.skills.forEach((skill, index) => {
      const chip = span('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-[#EEECFF] text-tertiary font-body-md text-label-step', skill.name + ' ');
      if (!approved()) {
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'cv-remove-skill text-outline hover:text-error transition-colors leading-none';
        remove.setAttribute('aria-label', skill.name + ' yetkinliğini kaldır');
        remove.dataset.index = String(index);
        remove.innerHTML = '<span aria-hidden="true" class="material-symbols-outlined text-[14px]">close</span>';
        chip.appendChild(remove);
      }
      skillEntry ? skillsList.insertBefore(chip, skillEntry) : skillsList.appendChild(chip);
    });
    if (addSkillButton) addSkillButton.hidden = approved();
    const count = sections.skills?.querySelector('[data-record-count]');
    if (count) count.textContent = model.skills.length + ' Tanımlı';
  }

  function renderUploadState() {
    const hasFile = Boolean(cv && cv.has_file);
    if (uploadEmpty) uploadEmpty.hidden = hasFile || approved();
    if (uploadCompact) uploadCompact.hidden = !hasFile || approved();
    if (uploadedFile) {
      uploadedFile.hidden = !hasFile;
      const name = uploadedFile.querySelector('.truncate > span:first-child');
      const details = uploadedFile.querySelector('.truncate > span:last-child');
      const typeLabel = cv && cv.file_type ? cv.file_type.toUpperCase() : 'Dosya';
      if (name) name.textContent = lastFile ? lastFile.name : 'CV dosyan (' + typeLabel + ')';
      const extraction = cv && cv.extraction_status === 'failed' ? 'Okunamadı' : 'Yüklendi';
      if (details) details.textContent = (lastFile ? formatSize(lastFile.size) + ' · ' : '') + extraction + (isEmpty() ? ' · bilgileri aşağıya ekle' : '');
      const change = uploadedFile.querySelector('button');
      if (change) change.hidden = approved();
      const icon = uploadedFile.querySelector('.material-symbols-outlined');
      if (icon) icon.textContent = cv && cv.file_type === 'docx' ? 'description' : 'picture_as_pdf';
    }
    if (guidanceTitle) guidanceTitle.textContent = hasFile ? 'CV bilgilerin' : 'Elle girdiğin bilgiler';
    if (guidanceText) {
      guidanceText.textContent = approved()
        ? 'CV bilgilerin onaylandı; onaydan sonra değiştirilemez.'
        : hasFile && isEmpty()
          ? 'CV dosyan güvenle saklandı. Otomatik ayrıştırma bu sürümde yok; deneyim, eğitim ve yetkinliklerini aşağıya ekle.'
          : 'Lütfen kontrol et, yanlış olanı düzelt.';
    }
    if (parsedCard) parsedCard.hidden = !cv && isEmpty();
    tabs.forEach(tab => { tab.disabled = approved(); });
  }

  function updateReviewState() {
    const remaining = reviewChecks.filter(check => !check.checked).length;
    reviewChecks.forEach(check => {
      const section = check.closest('.cv-section');
      section?.classList.toggle('cv-section--reviewed', check.checked);
      const done = section?.querySelector('[data-review-complete]');
      if (done) done.hidden = !check.checked;
      check.disabled = approved();
    });
    if (reviewStatus) {
      reviewStatus.textContent = approved() ? 'CV onaylandı' : !cv ? 'Önce CV yükle ya da bilgilerini gir' : remaining ? remaining + ' bölüm kaldı' : 'Tüm bölümler kontrol edildi';
    }
    if (confirmButton) {
      const blocked = !approved() && (!cv || remaining > 0 || busy);
      confirmButton.disabled = blocked;
      confirmButton.setAttribute('aria-disabled', String(blocked));
      confirmButton.title = blocked ? (!cv ? 'Önce CV ekle' : 'Önce tüm bölümleri kontrol et') : '';
      const label = confirmButton.querySelector('span');
      if (label) label.textContent = approved() ? 'Randevu adımına geç' : 'Onayla ve Randevuya Geç';
    }
  }

  function renderAll() {
    renderSection('experience');
    renderSection('education');
    renderSkills();
    renderUploadState();
    if (approved()) reviewChecks.forEach(check => { check.checked = true; });
    updateReviewState();
  }

  function markUnreviewed(kind) {
    const check = sections[kind]?.querySelector('[data-review-check]');
    if (check) check.checked = false;
  }

  // ─── Kaydetme ───────────────────────────────────────────────────────────────
  async function persist(kind, successText) {
    busy = true;
    updateReviewState();
    try {
      cv = cv
        ? await window.Api.put('/candidate/cv/' + encodeURIComponent(cv.id), payload())
        : await window.Api.post('/candidate/cv/manual', payload());
      model = normalize(cv);
      if (kind) markUnreviewed(kind);
      toast(successText || 'CV bilgilerin kaydedildi.');
      window.Api.ui.clearError(workCard);
      return true;
    } catch (error) {
      if (error.is && error.is('immutable')) toast('Onaylanmış CV değiştirilemez.', true);
      window.Api.ui.showError(workCard, error);
      await reload().catch(() => {});
      return false;
    } finally {
      busy = false;
      renderAll();
    }
  }

  async function reload() {
    try {
      cv = await window.Api.get('/candidate/cv');
      model = normalize(cv);
    } catch (error) {
      if (error.status !== 404) throw error;
      cv = null;
      model = { experience: [], education: [], skills: [] };
    }
  }

  // ─── Satır içi düzenleyici ─────────────────────────────────────────────────
  function openEditor(kind, index) {
    const section = sections[kind];
    if (!section || approved() || section.querySelector('.cv-inline-editor')) return;
    const isNew = index == null;
    const item = isNew ? {} : model[kind][index];
    const editor = document.createElement('form');
    editor.className = 'cv-inline-editor';
    LABELS[kind].fields.forEach(([key, label]) => {
      const wrap = document.createElement('label');
      wrap.textContent = label;
      const input = document.createElement('input');
      input.type = 'text';
      input.name = key;
      input.value = item[key] || '';
      if (key === 'start' || key === 'end') { input.inputMode = 'numeric'; input.maxLength = 7; }
      wrap.appendChild(input);
      editor.appendChild(wrap);
    });
    const actions = document.createElement('div');
    actions.className = 'cv-inline-actions';
    actions.innerHTML = '<button type="submit" data-action="cv-record-save">Kaydet</button><button type="button" data-cancel-edit>İptal</button>';
    editor.appendChild(actions);
    const anchor = isNew ? section.querySelector('[data-add-record]') : section.querySelector('[data-cv-record][data-index="' + index + '"]');
    if (isNew) anchor.before(editor); else anchor.replaceWith(editor);
    editor.querySelector('input').focus();
    editor.addEventListener('submit', async event => {
      event.preventDefault();
      const values = Object.fromEntries(Array.from(editor.querySelectorAll('input')).map(input => [input.name, input.value.trim()]));
      const required = kind === 'experience' ? values.title || values.company : values.school || values.degree;
      if (!required) {
        window.Api.ui.showError(editor, kind === 'experience' ? 'Pozisyon veya şirket adı gir.' : 'Kurum veya bölüm adı gir.');
        return;
      }
      if (isNew) model[kind].push(values); else model[kind][index] = Object.assign({}, model[kind][index], values);
      const button = editor.querySelector('[type="submit"]');
      await window.Api.ui.withLoading(button, () => persist(kind), { text: 'Kaydediliyor…' });
    });
    editor.querySelector('[data-cancel-edit]').addEventListener('click', () => renderSection(kind));
  }

  document.addEventListener('click', async event => {
    const edit = event.target.closest('.cv-edit-record');
    if (edit) {
      openEditor(edit.closest('.cv-section').dataset.section, Number(edit.dataset.index));
      return;
    }
    const remove = event.target.closest('.cv-delete-record');
    if (remove) {
      const kind = remove.closest('.cv-section').dataset.section;
      if (!window.confirm('Bu kaydı silmek istediğine emin misin?')) return;
      model[kind].splice(Number(remove.dataset.index), 1);
      await persist(kind, 'Kayıt silindi.');
      return;
    }
    const add = event.target.closest('[data-add-record]');
    if (add) {
      openEditor(add.dataset.addRecord, null);
      return;
    }
    const removeSkill = event.target.closest('.cv-remove-skill');
    if (removeSkill) {
      model.skills.splice(Number(removeSkill.dataset.index), 1);
      await persist('skills', 'Yetkinlik kaldırıldı.');
    }
  });

  function showSkillEntry() {
    if (!skillEntry || approved()) return;
    skillEntry.hidden = false;
    skillInput.focus();
  }

  async function addSkill() {
    const names = skillInput.value.split(',').map(s => s.trim()).filter(Boolean);
    if (!names.length) { skillInput.focus(); return; }
    names.forEach(name => {
      if (!model.skills.some(skill => skill.name.toLocaleLowerCase('tr-TR') === name.toLocaleLowerCase('tr-TR'))) model.skills.push({ name });
    });
    skillInput.value = '';
    skillEntry.hidden = true;
    await persist('skills', 'Yetkinlik eklendi.');
  }

  addSkillButton?.addEventListener('click', showSkillEntry);
  const skillSubmit = document.querySelector('[data-add-skill]');
  skillSubmit?.setAttribute('data-action', 'cv-skill-add');
  skillSubmit?.addEventListener('click', addSkill);
  skillInput?.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); addSkill(); }
    if (event.key === 'Escape') { skillEntry.hidden = true; addSkillButton?.focus(); }
  });

  // ─── Sekmeler ───────────────────────────────────────────────────────────────
  function selectTab(tab, moveFocus) {
    const selected = tab === 'manual' ? tabs[1] : tabs[0];
    tabs.forEach(item => {
      const active = item === selected;
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
      item.className = active
        ? 'px-space-md py-space-sm font-headline-sm text-body-md text-tertiary border-b-2 border-primary-container bg-[#EEECFF] rounded-t-[6px] transition-colors flex items-center gap-space-xs'
        : 'px-space-md py-space-sm font-body-md text-body-md text-outline hover:text-tertiary transition-colors flex items-center gap-space-xs';
    });
    const upload = document.getElementById('view-upload');
    const manual = document.getElementById('view-manual');
    upload.hidden = selected === tabs[1];
    manual.hidden = selected === tabs[0];
    upload.classList.toggle('hidden', selected === tabs[1]);
    manual.classList.toggle('hidden', selected === tabs[0]);
    upload.classList.toggle('flex', selected === tabs[0]);
    manual.classList.toggle('flex', selected === tabs[1]);
    if (moveFocus) selected.focus();
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(index === 1 ? 'manual' : 'upload'));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
        : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      selectTab(next === 0 ? 'upload' : 'manual', true);
    });
  });

  // ─── Elle giriş sekmesi ("Kayıt ekle") ─────────────────────────────────────
  const manualView = document.getElementById('view-manual');
  const manualBlocks = manualView ? Array.from(manualView.querySelectorAll(':scope > .border')).filter(block => block.querySelector('input')) : [];
  function manualInputs(block) { return Array.from(block.querySelectorAll('input')); }
  const manualConfig = [
    { kind: 'experience', keys: ['company', 'title', 'start', 'end'] },
    { kind: 'education', keys: ['school', 'degree'] },
    { kind: 'skills', keys: ['names'] }
  ];
  manualBlocks.forEach((block, i) => {
    const config = manualConfig[i];
    const button = block.querySelector(':scope > button');
    if (!config || !button) return;
    button.setAttribute('data-action', 'cv-manual-add');
    button.addEventListener('click', async () => {
      if (approved()) return;
      const inputs = manualInputs(block);
      const values = Object.fromEntries(config.keys.map((key, index) => [key, (inputs[index]?.value || '').trim()]));
      window.Api.ui.clearError(block);
      if (config.kind === 'skills') {
        const names = values.names.split(',').map(s => s.trim()).filter(Boolean);
        if (!names.length) { window.Api.ui.showError(block, 'En az bir yetkinlik yaz.'); return; }
        names.forEach(name => { if (!model.skills.some(s => s.name === name)) model.skills.push({ name }); });
      } else {
        const ok = config.kind === 'experience' ? values.title || values.company : values.school || values.degree;
        if (!ok) { window.Api.ui.showError(block, config.kind === 'experience' ? 'Şirket adı veya pozisyon gir.' : 'Kurum veya bölüm gir.'); return; }
        model[config.kind].push(Object.assign({ start: '', end: '' }, values));
      }
      const saved = await window.Api.ui.withLoading(button, () => persist(config.kind, 'Kayıt eklendi. Onaylamadan önce "CV yükle" sekmesinde kontrol et.'), { text: 'Kaydediliyor…' });
      if (saved) inputs.forEach(input => { input.value = ''; });
    });
  });

  // ─── Dosya yükleme ──────────────────────────────────────────────────────────
  async function uploadFile(file) {
    const message = window.Api.validateFile(file, ['pdf', 'docx']);
    if (message) { window.Api.ui.showError(workCard, message); return; }
    window.Api.ui.clearError(workCard);
    const carry = isEmpty() ? null : payload();
    busy = true;
    updateReviewState();
    const target = uploadEmpty && !uploadEmpty.hidden ? uploadEmpty : uploadCompact;
    target?.setAttribute('aria-busy', 'true');
    toast('CV yükleniyor…');
    try {
      cv = await window.Api.upload('/candidate/cv', { file });
      lastFile = { name: file.name, size: file.size };
      // Yeni dosya yeni bir CV kaydıdır; daha önce elle girilenler korunur (ayrıştırıcı boş döner, K62).
      if (carry && isEmptyContent(cv)) cv = await window.Api.put('/candidate/cv/' + encodeURIComponent(cv.id), carry);
      model = normalize(cv);
      reviewChecks.forEach(check => { check.checked = false; });
      toast('CV dosyan yüklendi.');
    } catch (error) {
      window.Api.ui.showError(workCard, error);
    } finally {
      busy = false;
      target?.removeAttribute('aria-busy');
      renderAll();
    }
  }

  function isEmptyContent(item) {
    return !(item.experience || []).length && !(item.education || []).length && !(item.skills || []).length;
  }

  function chooseFile() {
    if (busy || approved()) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    input.addEventListener('change', () => { if (input.files && input.files[0]) uploadFile(input.files[0]); });
    input.click();
  }

  [uploadEmpty, uploadCompact, uploadedFile?.querySelector('button')].forEach(node => {
    if (!node) return;
    node.setAttribute('data-action', 'cv-upload');
    node.addEventListener('click', chooseFile);
  });
  uploadEmpty?.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); chooseFile(); }
  });
  uploadEmpty?.addEventListener('dragover', event => event.preventDefault());
  uploadEmpty?.addEventListener('drop', event => {
    event.preventDefault();
    const file = event.dataTransfer && event.dataTransfer.files[0];
    if (file) uploadFile(file);
  });

  // ─── Onay ───────────────────────────────────────────────────────────────────
  reviewChecks.forEach(check => check.addEventListener('change', updateReviewState));

  confirmButton?.setAttribute('data-action', 'cv-approve');
  confirmButton?.addEventListener('click', async () => {
    if (approved()) { window.Nav ? window.Nav.go('randevu-on.html') : (location.href = 'randevu-on.html'); return; }
    if (!cv) return;
    if (reviewChecks.some(check => !check.checked)) {
      updateReviewState();
      reviewChecks.find(check => !check.checked)?.focus();
      return;
    }
    window.Api.ui.clearError(bottomPanel);
    try {
      cv = await window.Api.ui.withLoading(confirmButton, () => window.Api.confirm('POST', '/candidate/cv/' + encodeURIComponent(cv.id) + '/approve'), { text: 'Onaylanıyor…' });
      toast('CV bilgilerin onaylandı.');
      window.Nav ? window.Nav.go('randevu-on.html') : (location.href = 'randevu-on.html');
    } catch (error) {
      // K46: deneyim, eğitim ve yetkinliklerin tamamı boşsa 422.
      window.Api.ui.showError(bottomPanel, error.isValidation
        ? 'Onaylamadan önce en az bir deneyim, eğitim ya da yetkinlik eklemelisin.'
        : error, { position: 'prepend' });
      updateReviewState();
    }
  });

  async function init() {
    selectTab('upload', false);
    updateReviewState();
    try {
      if (window.sessionReady) await window.sessionReady; // cv-demo.js, aday-yolculuk.js'ten önce yüklenir
      await reload();
      renderAll();
      if (!cv) selectTab('upload', false);
      window.Journey.load().then(ctx => window.Journey.refreshSidebar(ctx)).catch(() => {});
    } catch (error) {
      window.Api.ui.showError(workCard, error);
    }
  }

  init();
})();
