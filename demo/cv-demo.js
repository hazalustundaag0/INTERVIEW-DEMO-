(function () {
  const uploadArea = document.getElementById('cv-upload-area');
  const uploadEmpty = document.querySelector('[data-upload-empty]');
  const uploadCompact = document.querySelector('[data-upload-compact]');
  const uploadedFile = document.querySelector('[data-uploaded-file]');
  const tabs = Array.from(document.querySelectorAll('#cv-tabs [role="tab"]'));
  const reviewChecks = Array.from(document.querySelectorAll('[data-review-check]'));
  const confirmButton = document.querySelector('[data-cv-confirm]');
  const reviewStatus = document.querySelector('[data-review-status]');
  const reviewWarning = document.querySelector('[data-review-warning]');
  const saveToast = document.querySelector('[data-save-toast]');

  function updateReviewState() {
    const remaining = reviewChecks.filter(check => !check.checked).length;
    if (reviewStatus) reviewStatus.textContent = remaining ? remaining + ' bölüm kaldı' : 'Tüm bölümler kontrol edildi';
    reviewChecks.forEach(check => {
      const section = check.closest('.cv-section');
      section?.classList.toggle('cv-section--reviewed', check.checked);
      const completedStatus = section?.querySelector('[data-review-complete]');
      if (completedStatus) completedStatus.hidden = !check.checked;
    });
    if (confirmButton) {
      confirmButton.disabled = remaining > 0;
      confirmButton.setAttribute('aria-disabled', String(remaining > 0));
      confirmButton.title = remaining ? 'Önce tüm bölümleri kontrol et' : '';
    }
    if (reviewWarning) {
      const needsReview = Array.from(document.querySelectorAll('.cv-section:not(.cv-section--reviewed) .cv-record-needs-review .cv-review-badge'));
      reviewWarning.hidden = needsReview.length === 0;
      if (needsReview.length) {
        reviewWarning.textContent = 'Bazı kayıtlar kontrol gerekli olarak işaretlendi.';
      }
    }
  }

  function markSectionNeedsReview(section) {
    const check = section?.querySelector('[data-review-check]');
    if (check) check.checked = false;
    updateReviewState();
  }

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
    document.getElementById('view-upload').hidden = selected === tabs[1];
    document.getElementById('view-manual').hidden = selected === tabs[0];
    document.getElementById('view-upload').classList.toggle('hidden', selected === tabs[1]);
    document.getElementById('view-manual').classList.toggle('hidden', selected === tabs[0]);
    document.getElementById('view-upload').classList.toggle('flex', selected === tabs[0]);
    document.getElementById('view-manual').classList.toggle('flex', selected === tabs[1]);
    if (moveFocus) selected.focus();
  }

  window.switchTab = selectTab;

  tabs.forEach((tab, index) => {
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
        : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      selectTab(next === 0 ? 'upload' : 'manual', true);
    });
  });

  function formatFileSize(bytes) {
    return bytes < 1024 * 1024 ? Math.max(1, Math.round(bytes / 1024)) + ' KB' : (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  window.simulateUpload = function () {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.docx';
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        window.alert('Dosya boyutu 10 MB sınırını aşamaz.');
        return;
      }
      const name = uploadedFile.querySelector('.truncate > span:first-child');
      const details = uploadedFile.querySelector('.truncate > span:last-child');
      if (name) name.textContent = file.name;
      if (details) details.textContent = formatFileSize(file.size) + ' · Başarıyla ayrıştırıldı';
      uploadArea.dataset.uploaded = 'true';
      uploadEmpty.hidden = true;
      uploadCompact.hidden = false;
      uploadedFile.hidden = false;
    });
    input.click();
  };

  uploadEmpty?.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      window.simulateUpload();
    }
  });

  function safeText(value) {
    return String(value || '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  function recordType(record) {
    return record.closest('.cv-section')?.dataset.section || 'experience';
  }

  function updateRecordCount(section) {
    if (!section) return;
    const records = section.dataset.section === 'skills'
      ? section.querySelectorAll('#skills-list > span').length
      : section.querySelectorAll('[data-cv-record]').length;
    const count = section.querySelector('[data-record-count]');
    if (count) count.textContent = section.dataset.section === 'skills' ? records + ' Tanımlı' : records + ' Kayıt';
  }

  function durationFromStart(element) {
    const [year, month, day] = element.dataset.startDate.split('-').map(Number);
    const start = new Date(year, month - 1, day);
    const now = new Date();
    let months = Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth());
    if (now.getDate() < start.getDate()) months -= 1;
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    const duration = [years ? years + ' yıl' : '', remainingMonths ? remainingMonths + ' ay' : '']
      .filter(Boolean).join(' ');
    element.textContent = '2021 — Günümüz' + (duration ? ' (' + duration + ')' : '');
  }

  document.querySelectorAll('[data-start-date]').forEach(durationFromStart);

  function closeInlineEditor(record, originalContent) {
    record.innerHTML = originalContent;
  }

  function editRecord(record) {
    if (!record || record.querySelector('.cv-inline-editor')) return;
    const kind = recordType(record);
    const fields = Array.from(record.querySelectorAll('.flex.flex-col > span'))
      .filter(span => !span.classList.contains('cv-review-badge'));
    const originalContent = record.innerHTML;
    const values = fields.map(field => field.textContent.trim());
    const labels = kind === 'education'
      ? ['Üniversite / Kurum', 'Bölüm ve derece', 'Tarih']
      : ['Pozisyon', 'Şirket', 'Başlangıç ve süre'];
    const editor = document.createElement('form');
    editor.className = 'cv-inline-editor';
    editor.innerHTML = values.map((value, index) =>
      '<label>' + labels[index] + '<input type="text" value="' + safeText(value) + '"></label>'
    ).join('') + '<div class="cv-inline-actions"><button type="submit">Kaydet</button><button type="button" data-cancel-edit>İptal</button></div>';
    record.replaceChildren(editor);
    editor.querySelector('input')?.focus();
    editor.addEventListener('submit', event => {
      event.preventDefault();
      const newValues = Array.from(editor.querySelectorAll('input')).map(input => input.value.trim());
      const firstText = kind === 'education' ? 'font-headline-sm text-body-md text-[#1E1E1C]' : 'font-headline-sm text-body-md text-[#1E1E1C]';
      const secondText = 'font-body-md text-body-md text-on-surface-variant font-medium';
      record.innerHTML = '<div class="flex flex-col">' +
        newValues.map((value, index) => '<span class="' + (index === 0 ? firstText : index === 1 ? secondText : 'font-body-md-secondary text-label-step text-outline mt-0.5') + '">' + safeText(value) + '</span>').join('') +
        '</div><div class="flex items-center gap-1"><button aria-label="' + (kind === 'education' ? 'Eğitim bilgisini düzenle' : 'İş deneyimini düzenle') + '" class="text-outline hover:text-tertiary p-1 transition-colors cv-edit-record" title="Düzenle" type="button"><span aria-hidden="true" class="material-symbols-outlined text-[18px]">edit</span></button><button aria-label="' + (kind === 'education' ? 'Eğitim bilgisini sil' : 'İş deneyimini sil') + '" class="text-outline hover:text-error p-1 transition-colors cv-delete-record" title="Sil" type="button"><span aria-hidden="true" class="material-symbols-outlined text-[18px]">delete</span></button></div>';
      record.classList.remove('cv-record-needs-review');
      record.querySelector('.cv-review-badge')?.remove();
      const section = record.closest('.cv-section');
      updateRecordCount(section);
      markSectionNeedsReview(section);
      record.closest('.cv-section')?.querySelector('[data-review-check]')?.focus();
    });
    editor.querySelector('[data-cancel-edit]').addEventListener('click', () => closeInlineEditor(record, originalContent));
  }

  document.addEventListener('click', event => {
    const edit = event.target.closest('.cv-edit-record');
    if (edit) {
      editRecord(edit.closest('[data-cv-record]'));
      return;
    }
    const remove = event.target.closest('.cv-delete-record');
    if (remove) {
      const record = remove.closest('[data-cv-record]');
      if (window.confirm('Bu kaydı silmek istediğine emin misin?')) {
        const section = record.closest('.cv-section');
        record.remove();
        updateRecordCount(section);
        markSectionNeedsReview(section);
      }
      return;
    }
    const addRecord = event.target.closest('[data-add-record]');
    if (addRecord) {
      const section = addRecord.closest('.cv-section');
      const education = addRecord.dataset.addRecord === 'education';
      const record = document.createElement('div');
      record.className = 'cv-record flex items-start justify-between gap-space-md py-space-sm';
      record.dataset.cvRecord = '';
      record.innerHTML = '<div class="flex flex-col"><span class="font-headline-sm text-body-md text-[#1E1E1C]">' +
        (education ? 'Yeni eğitim kaydı' : 'Yeni iş deneyimi') +
        '</span><span class="font-body-md text-body-md text-on-surface-variant">Kurum / şirket</span><span class="font-body-md-secondary text-label-step text-outline mt-0.5">Tarih / süre</span></div>' +
        '<div class="flex items-center gap-1"><button aria-label="' + (education ? 'Eğitim bilgisini düzenle' : 'İş deneyimini düzenle') + '" class="cv-edit-record" title="Düzenle" type="button">edit</button><button aria-label="Kaydı sil" class="cv-delete-record" title="Sil" type="button">delete</button></div>';
      addRecord.before(record);
      updateRecordCount(section);
      markSectionNeedsReview(section);
      editRecord(record);
      return;
    }
    const removeSkill = event.target.closest('.cv-remove-skill');
    if (removeSkill) {
      const section = removeSkill.closest('.cv-section');
      removeSkill.closest('span').remove();
      updateRecordCount(section);
      markSectionNeedsReview(section);
    }
  });

  function addSkill() {
    const entry = document.querySelector('[data-skill-entry]');
    const input = document.getElementById('cv-skill-input');
    const value = input.value.trim();
    if (!value) {
      input.focus();
      return;
    }
    const chip = document.createElement('span');
    chip.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-[#EEECFF] text-tertiary font-body-md text-label-step';
    const name = document.createTextNode(value + ' ');
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'cv-remove-skill text-outline hover:text-error transition-colors leading-none';
    remove.setAttribute('aria-label', value + ' yetkinliğini kaldır');
    remove.innerHTML = '<span aria-hidden="true" class="material-symbols-outlined text-[14px]">close</span>';
    chip.append(name, remove);
    document.getElementById('skills-list').insertBefore(chip, entry);
    input.value = '';
    entry.hidden = true;
    updateRecordCount(entry.closest('.cv-section'));
    markSectionNeedsReview(entry.closest('.cv-section'));
    document.querySelector('[onclick="addSkillPrompt()"]')?.focus();
  }

  window.addSkillPrompt = function () {
    const entry = document.querySelector('[data-skill-entry]');
    entry.hidden = false;
    document.getElementById('cv-skill-input').focus();
  };

  document.querySelector('[data-add-skill]')?.addEventListener('click', addSkill);
  document.getElementById('cv-skill-input')?.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addSkill();
    }
    if (event.key === 'Escape') {
      event.currentTarget.closest('[data-skill-entry]').hidden = true;
      document.querySelector('[onclick="addSkillPrompt()"]')?.focus();
    }
  });

  reviewChecks.forEach(check => check.addEventListener('change', updateReviewState));
  updateReviewState();

  window.commitConfirmation = function () {
    if (reviewChecks.some(check => !check.checked)) {
      updateReviewState();
      reviewChecks.find(check => !check.checked)?.focus();
      return;
    }
    try {
      localStorage.setItem('demoCvOnaylandi', 'true');
    } catch (error) {
      console.error('CV onay durumu kaydedilemedi.', error);
      if (saveToast) {
        saveToast.textContent = 'CV bilgileri kaydedilemedi. Lütfen yeniden dene.';
        saveToast.hidden = false;
        saveToast.classList.add('cv-save-toast--error');
      }
      return;
    }
    if (saveToast) {
      saveToast.textContent = 'CV bilgileri kaydedildi.';
      saveToast.hidden = false;
      window.setTimeout(() => {
        window.location.href = new URL('takvim.html', window.location.href).href;
      }, 1000);
    } else {
      window.location.href = new URL('takvim.html', window.location.href).href;
    }
  };

  confirmButton?.addEventListener('click', window.commitConfirmation);

  selectTab('upload', false);
  const hasUploadedFile = uploadArea?.dataset.uploaded === 'true';
  uploadEmpty.hidden = hasUploadedFile;
  uploadCompact.hidden = !hasUploadedFile;
  uploadedFile.hidden = !hasUploadedFile;
})();
