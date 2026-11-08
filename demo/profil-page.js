// profil-page.js — Profil formu (83). Alanlar yönetici yapılandırmasından gelir (FR-30/31, GAP-U11):
//   GET /candidate/profile/form  → alan tanımı (sıra, tür, zorunluluk, seçenekler)
//   GET /candidate/profile       → answers (formu gönderildiği biçimde geri doldurma, GAP-B04 / Kabul G2)
//   PUT /candidate/profile {answers:{field_key:{options[],text}}, complete}
// Görünüm mevcut tasarım bileşenlerinin klonudur: arama girişi (hedef pozisyon), seçim girişi (sektör),
// çip grubu (katılım nedeni), metin alanı (eklemek istediklerin). Yeni bileşen yok.
(function () {
  'use strict';
  const form = document.querySelector('main form');
  if (!form) return;
  const card = form.closest('div.bg-\\[\\#FFFFFF\\]') || form.parentElement;
  const templates = {
    search: document.getElementById('target-position')?.closest('.flex.flex-col'),
    select: document.getElementById('sector')?.closest('.flex.flex-col'),
    chips: document.getElementById('reasons-chips')?.closest('.flex.flex-col'),
    text: document.getElementById('additional-notes')?.closest('.flex.flex-col')
  };
  const saveButton = Array.from(form.querySelectorAll('button')).find(b => b.textContent.includes('Kaydet ve Devam Et'));
  let footer = saveButton;
  while (footer && footer.parentElement !== form) footer = footer.parentElement;
  const laterLink = footer && Array.from(footer.querySelectorAll('a')).find(a => a.textContent.includes('Daha sonra'));
  if (!templates.search || !templates.select || !templates.chips || !templates.text || !saveButton) {
    console.error('Profil formu şablon alanları bulunamadı.');
    return;
  }
  Object.values(templates).forEach(node => node.remove());
  saveButton.setAttribute('data-action', 'profile-save');
  if (laterLink) laterLink.setAttribute('data-action', 'profile-later');
  form.setAttribute('novalidate', '');
  form.addEventListener('submit', event => event.preventDefault());

  const LONG_LIST = 7;
  let fields = [];
  const controls = new Map(); // field_key → { field, read(), write(answer) }

  function requiredMark(field, label) {
    label.querySelectorAll('.text-error').forEach(node => node.remove());
    if (field.is_required) {
      const star = document.createElement('span');
      star.className = 'text-error';
      star.textContent = '*';
      label.append(' ', star);
    }
  }

  function setLabel(block, field, forId) {
    const label = block.querySelector('label');
    if (!label) return;
    if (forId) label.setAttribute('for', forId); else label.removeAttribute('for');
    label.textContent = field.label;
    requiredMark(field, label);
    // "(İsteğe bağlı)" ibaresi yalnız metin alanı şablonunda var; zorunluluğa göre göster/gizle.
    const optional = Array.from(block.querySelectorAll('span')).find(span => span.textContent.includes('İsteğe bağlı'));
    if (optional) optional.hidden = field.is_required;
  }

  function setHelp(block, field, after) {
    let help = Array.from(block.querySelectorAll(':scope > p')).find(p => p.classList.contains('text-[13px]'));
    if (!field.help_text) { if (help) help.remove(); return; }
    if (!help) {
      help = document.createElement('p');
      help.className = 'text-[13px] text-muted';
      (after || block.lastElementChild).insertAdjacentElement('afterend', help);
    }
    help.textContent = field.help_text;
  }

  function activeOptions(field) {
    return (field.options || []).filter(option => option.is_active !== false).sort((a, b) => a.sort_order - b.sort_order);
  }

  function buildList(field, kind) {
    const block = templates[kind].cloneNode(true);
    const id = 'pf-' + field.field_key;
    setLabel(block, field, id);
    const input = block.querySelector('input');
    input.id = id;
    input.name = field.field_key;
    input.value = '';
    input.removeAttribute('required');
    input.setAttribute('aria-required', String(field.is_required));
    input.setAttribute('autocomplete', 'off');
    input.placeholder = kind === 'search' ? 'Ara veya seç' : 'Seç';
    if (field.allows_free_text) input.placeholder += ' ya da yaz';
    const list = document.createElement('datalist');
    list.id = id + '-list';
    activeOptions(field).forEach(option => {
      const node = document.createElement('option');
      node.value = option.label;
      list.appendChild(node);
    });
    input.setAttribute('list', list.id);
    input.closest('.relative').appendChild(list);
    setHelp(block, field, input.closest('.relative'));
    controls.set(field.field_key, {
      field, focus: input,
      read() {
        const value = input.value.trim();
        if (!value) return { options: [], text: '' };
        const match = activeOptions(field).find(option => option.label.toLocaleLowerCase('tr-TR') === value.toLocaleLowerCase('tr-TR'));
        if (match) return { options: [match.value], text: '' };
        return { options: [], text: value };
      },
      write(answer) {
        const code = answer && answer.options && answer.options[0];
        const option = code && (field.options || []).find(item => item.value === code);
        input.value = option ? option.label : (answer && answer.text) || '';
      }
    });
    return block;
  }

  function buildChips(field) {
    const block = templates.chips.cloneNode(true);
    setLabel(block, field, null);
    const group = block.querySelector('#reasons-chips') || block.querySelector('.flex-wrap');
    group.id = 'pf-' + field.field_key;
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', field.label);
    group.replaceChildren();
    const multi = field.field_type === 'multi_choice';
    activeOptions(field).forEach(option => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'theme-choice-chip';
      chip.dataset.value = option.value;
      chip.setAttribute('aria-pressed', 'false');
      chip.textContent = option.label;
      chip.addEventListener('click', () => {
        const selected = chip.getAttribute('aria-pressed') === 'true';
        if (!multi) group.querySelectorAll('.theme-choice-chip').forEach(other => select(other, false));
        select(chip, !selected);
      });
      group.appendChild(chip);
    });
    function select(chip, on) {
      chip.setAttribute('aria-pressed', String(on));
      if (on) chip.setAttribute('data-selected', 'true'); else chip.removeAttribute('data-selected');
    }
    setHelp(block, field, group);
    controls.set(field.field_key, {
      field, focus: group.querySelector('button'),
      read() {
        return { options: Array.from(group.querySelectorAll('[aria-pressed="true"]')).map(chip => chip.dataset.value), text: '' };
      },
      write(answer) {
        const chosen = new Set((answer && answer.options) || []);
        group.querySelectorAll('.theme-choice-chip').forEach(chip => select(chip, chosen.has(chip.dataset.value)));
      }
    });
    return block;
  }

  function buildText(field) {
    const block = templates.text.cloneNode(true);
    const id = 'pf-' + field.field_key;
    setLabel(block, field, id);
    const textarea = block.querySelector('textarea');
    textarea.id = id;
    textarea.name = field.field_key;
    textarea.value = '';
    textarea.setAttribute('aria-required', String(field.is_required));
    textarea.maxLength = 2000;
    setHelp(block, field, textarea);
    controls.set(field.field_key, {
      field, focus: textarea,
      read() { return { options: [], text: textarea.value.trim() }; },
      write(answer) { textarea.value = (answer && answer.text) || ''; }
    });
    return block;
  }

  function render() {
    let searchUsed = false;
    fields.forEach(field => {
      let block;
      if (field.field_type === 'free_text') block = buildText(field);
      else if (activeOptions(field).length >= LONG_LIST) {
        const kind = !searchUsed && (field.maps_to_column === 'target_position' || field.allows_free_text) ? 'search' : 'select';
        if (kind === 'search') searchUsed = true;
        block = buildList(field, kind);
      } else block = buildChips(field);
      block.dataset.field = field.field_key;
      footer.insertAdjacentElement('beforebegin', block);
    });
  }

  function collect() {
    const answers = {};
    controls.forEach((control, key) => {
      const value = control.read();
      if (value.options.length || value.text) answers[key] = value;
    });
    return answers;
  }

  function localRequiredErrors(answers) {
    const errors = {};
    fields.forEach(field => {
      if (field.is_required && !answers[field.field_key]) errors[field.field_key] = 'required';
      const value = answers[field.field_key];
      if (value && value.text && !field.allows_free_text && field.field_type !== 'free_text') errors[field.field_key] = 'Listeden bir seçenek seç.';
    });
    return errors;
  }

  function fieldMap() {
    const map = {};
    controls.forEach((control, key) => { map[key] = '#pf-' + CSS.escape(key); });
    return map;
  }

  async function save(complete, button, target) {
    window.Api.ui.clearError(card);
    window.Api.ui.clearFieldErrors(form);
    const answers = collect();
    if (complete) {
      const errors = localRequiredErrors(answers);
      if (Object.keys(errors).length) {
        window.Api.ui.applyFieldErrors(form, errors, { map: fieldMap() });
        window.Api.ui.showError(card, 'Zorunlu alanları doldurman gerekiyor.');
        return;
      }
    } else if (!Object.keys(answers).length) {
      window.Nav ? window.Nav.go(target) : (location.href = target);
      return;
    }
    try {
      await window.Api.ui.withLoading(button, () => window.Api.put('/candidate/profile', { answers, complete }), { text: 'Kaydediliyor…' });
      window.Nav ? window.Nav.go(target) : (location.href = target);
    } catch (error) {
      if (error.isValidation || Object.keys(error.fields || {}).length) window.Api.ui.applyFieldErrors(form, error, { map: fieldMap() });
      window.Api.ui.showError(card, error);
    }
  }

  saveButton.addEventListener('click', event => {
    event.preventDefault();
    save(true, saveButton, 'cv.html');
  });
  laterLink?.addEventListener('click', event => {
    event.preventDefault();
    save(false, laterLink, 'ana.html');
  });

  async function init() {
    saveButton.disabled = true;
    try {
      await window.Journey.ready();
      const [definition, profile] = await Promise.all([
        window.Api.get('/candidate/profile/form'),
        window.Api.get('/candidate/profile')
      ]);
      fields = ((definition && definition.items) || []).filter(field => field.is_active !== false).sort((a, b) => a.sort_order - b.sort_order);
      render();
      const answers = (profile && profile.answers) || {};
      controls.forEach((control, key) => control.write(answers[key]));
      saveButton.disabled = false;
      window.Journey.load().then(ctx => window.Journey.refreshSidebar(ctx)).catch(() => {});
    } catch (error) {
      window.Api.ui.showError(card, error);
    }
  }

  init();
})();
