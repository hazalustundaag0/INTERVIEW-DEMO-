(function () {
  const taskTypeButtons = Array.from(document.querySelectorAll('button')).filter((button) =>
    ['Ödev', 'Belge', 'Soru'].includes(button.textContent.trim())
  );
  const cardTitle = Array.from(document.querySelectorAll('h2')).find((heading) =>
    heading.textContent.trim() === 'Yeni talep'
  );
  const card = cardTitle && cardTitle.parentElement;
  const sendButton = Array.from(document.querySelectorAll('button')).find((button) =>
    button.textContent.trim() === 'Adaya Gönder'
  );
  const actionRow = sendButton && sendButton.parentElement;
  const formWrapper = actionRow && actionRow.parentElement;
  const fieldContainer = document.createElement('div');
  fieldContainer.className = 'flex flex-col gap-4';
  const deadlineInput = actionRow && actionRow.querySelector('input[type="text"]');
  const givenHeading = Array.from(document.querySelectorAll('h3')).find((heading) =>
    heading.textContent.trim() === 'Verilenler'
  );
  const givenList = givenHeading && givenHeading.nextElementSibling;

  if (taskTypeButtons.length !== 3 || !formWrapper || !deadlineInput || !sendButton || !givenList) {
    console.error('Danışan ödev formunun gerekli alanları bulunamadı.');
    return;
  }
  givenList.classList.add('advisor-given-list');

  const initialTitle = formWrapper.querySelector('input[type="text"]');
  const initialQuestions = Array.from(formWrapper.querySelectorAll('input[type="text"]'))
    .slice(1, -1)
    .map((input) => input.value);
  const initialDeadline = deadlineInput.value || '15 Ocak';
  formWrapper.insertBefore(fieldContainer, actionRow);
  Array.from(formWrapper.children).forEach((child) => {
    if (child !== fieldContainer && child !== actionRow) child.remove();
  });
  const feedback = document.createElement('p');
  feedback.className = 'text-[13px] mt-2';
  feedback.setAttribute('role', 'status');
  feedback.setAttribute('aria-live', 'polite');
  card.appendChild(feedback);

  let selectedType = taskTypeButtons.find((button) => button.classList.contains('bg-[#51409D]'))?.textContent.trim() || 'Soru';
  const drafts = {
    Ödev: {
      title: 'Seni en çok zorlayan dönemi üç cümleyle yaz',
      details: 'Seansta konuştuğumuz geçiş hikâyendeki en büyük zorluğu, senin aldığın aksiyonu ve ölçülebilir sonucu 3-4 cümleyle özetle.',
      deadline: initialDeadline,
    },
    Belge: {
      title: 'Daha önce hazırlanmış bir sunum veya rapor',
      details: 'Seansta hikâyendeki sonucu somut bir örnekle güçlendirelim. PDF veya DOCX formatında yükleyebilirsin.',
      deadline: initialDeadline,
    },
    Soru: {
      title: initialTitle ? initialTitle.value : 'Hikâyeni güçlendirecek 3 soru',
      questions: initialQuestions.length ? initialQuestions : [
        'Zorluk döneminin sonucunu bir sayıyla anlatabilir misin?',
        'Bu dönemde ekibinden aldığın bir geri bildirim neydi?',
        'Hedef rolde ilk 90 günde ne yapmak istersin?',
      ],
      deadline: initialDeadline,
    },
  };

  function makeInput(value, placeholder) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value || '';
    input.placeholder = placeholder;
    input.className = 'w-full border border-[#7564C7] rounded-[6px] px-3 py-2 text-[14px] text-[#1E1E1C] bg-white focus:outline-none focus:border-[#51409D]';
    return input;
  }

  function makeTextarea(placeholder) {
    const textarea = document.createElement('textarea');
    textarea.rows = 3;
    textarea.placeholder = placeholder;
    textarea.className = 'w-full border border-[#7564C7] rounded-[6px] px-3 py-2 text-[14px] text-[#1E1E1C] bg-white focus:outline-none focus:border-[#51409D]';
    return textarea;
  }

  function makeField(labelText, control) {
    const wrapper = document.createElement('div');
    wrapper.className = 'flex flex-col gap-1.5';
    const label = document.createElement('label');
    label.className = 'text-[11px] font-semibold text-[#7564C7] uppercase tracking-wider';
    label.textContent = labelText;
    wrapper.append(label, control);
    return wrapper;
  }

  function makeQuestionField() {
    const wrapper = document.createElement('div');
    wrapper.className = 'flex flex-col gap-2';
    const label = document.createElement('label');
    label.className = 'text-[11px] font-semibold text-[#7564C7] uppercase tracking-wider';
    label.textContent = 'Sorular';
    const rows = document.createElement('div');
    rows.className = 'flex flex-col gap-2.5';

    drafts.Soru.questions.forEach((question, index) => {
      const row = document.createElement('div');
      row.className = 'flex items-center gap-2';
      const number = document.createElement('span');
      number.className = 'w-6 h-6 rounded-full bg-[#7564C7] text-[#7564C7] text-[12px] font-semibold flex items-center justify-center shrink-0';
      number.textContent = String(index + 1);
      const input = makeInput(question, 'Soruyu yazın');
      input.className += ' flex-1';
      input.dataset.questionInput = 'true';
      input.addEventListener('input', () => { drafts.Soru.questions[index] = input.value; });
      row.append(number, input);
      rows.appendChild(row);
    });

    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.className = 'text-[13px] font-medium text-[#51409D] hover:underline flex items-center gap-1 mt-1 cursor-pointer w-fit';
    addButton.innerHTML = '<span class="material-symbols-outlined text-[16px]">add</span><span>Soru ekle</span>';
    addButton.addEventListener('click', () => {
      drafts.Soru.questions.push('');
      renderForm();
      const inputs = fieldContainer.querySelectorAll('[data-question-input]');
      const lastInput = inputs[inputs.length - 1];
      if (lastInput) lastInput.focus();
    });

    wrapper.append(label, rows, addButton);
    return wrapper;
  }

  function renderForm() {
    const draft = drafts[selectedType];
    const title = document.createElement('input');
    title.type = 'text';
    title.value = draft.title;
    title.placeholder = selectedType === 'Soru' ? 'Hikâyeni güçlendirecek 3 soru' : selectedType + ' başlığı';
    title.className = 'w-full border border-[#7564C7] rounded-[6px] px-3 py-2 text-[14px] text-[#1E1E1C] bg-white focus:outline-none focus:border-[#51409D]';
    title.dataset.taskTitle = 'true';
    title.addEventListener('input', () => { draft.title = title.value; });

    const newFields = document.createElement('div');
    newFields.className = 'flex flex-col gap-4';
    newFields.appendChild(makeField('Başlık', title));

    if (selectedType === 'Soru') {
      newFields.appendChild(makeQuestionField());
    } else {
      const details = makeTextarea(
        selectedType === 'Belge'
          ? 'İstenen belgeyi ve yükleme biçimini açıklayın...'
          : 'Ödevin içeriğini ve nasıl tamamlanacağını açıklayın...'
      );
      details.value = draft.details;
      details.dataset.taskDetails = 'true';
      details.addEventListener('input', () => { draft.details = details.value; });
      newFields.appendChild(makeField(selectedType === 'Belge' ? 'Belge açıklaması' : 'Ödev açıklaması', details));
    }

    fieldContainer.replaceChildren(...newFields.children);
    feedback.textContent = '';
  }

  function selectType(type) {
    const currentTitle = fieldContainer.querySelector('[data-task-title]');
    if (currentTitle) drafts[selectedType].title = currentTitle.value;
    drafts[selectedType].deadline = deadlineInput.value;
    const currentDetails = fieldContainer.querySelector('[data-task-details]');
    if (currentDetails) drafts[selectedType].details = currentDetails.value;
    selectedType = type;
    deadlineInput.value = drafts[selectedType].deadline || initialDeadline;
    taskTypeButtons.forEach((button) => {
      const isSelected = button.textContent.trim() === type;
      button.className = 'theme-choice-chip cursor-pointer';
      button.setAttribute('aria-pressed', String(isSelected));
    });
    renderForm();
  }

  // Detay görüntüleme modalı (Verilenler listesindeki öğelere tıklanınca açılır)
  const detailOverlay = document.createElement('div');
  detailOverlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:100000;display:none;align-items:center;justify-content:center;padding:16px;';
  document.body.appendChild(detailOverlay);

  function openTaskModal(task) {
    const isQuestions = task.type === 'Soru';
    const isDoc = task.type === 'Belge';
    let bodyHtml = '';

    if (isQuestions) {
      const qs = (task.questions && task.questions.length) ? task.questions : [
        'Zorluk döneminin sonucunu bir sayıyla anlatabilir misin?',
        'Bu dönemde ekibinden aldığın bir geri bildirim neydi?',
        'Hedef rolde ilk 90 günde ne yapmak istersin?',
      ];
      const sampleAnswers = [
        'Kriz döneminde müşteri kaybını %18 seviyesinden %4\'e düşürdük ve 6 ay içinde ek 1.2 milyon TL gelir sağladık.',
        'Belirsizlik anlarında sakin kalıp ekibi ortak hedef etrafında toplamam ve net görev dağılımı yapmam özellikle takdir edildi.',
        'İlk 30 günde mevcut ürün süreçlerini ve ekip dinamiklerini analiz edip, 60. günde yeni satış hunisi stratejisini devreye almayı hedefliyorum.',
      ];
      bodyHtml = `
        <div style="display:flex;flex-direction:column;gap:14px;margin-top:12px;">
          ${qs.map((q, idx) => `
            <div style="background:#7564C7;border:1px solid #7564C7;border-radius:8px;padding:12px 14px;">
              <div style="font-size:13px;font-weight:600;color:#1E1E1C;margin-bottom:6px;">${idx + 1}. ${q}</div>
              <div style="font-size:13px;color:#7564C7;line-height:1.5;">${sampleAnswers[idx] || 'Adayın yanıtı bekleniyor...'}</div>
            </div>
          `).join('')}
        </div>
      `;
    } else if (isDoc) {
      bodyHtml = `
        <div style="background:#7564C7;border:1px solid #7564C7;border-radius:8px;padding:14px;margin-top:12px;">
          <div style="font-size:12px;font-weight:600;color:#7564C7;text-transform:uppercase;margin-bottom:4px;">İstenen Belge Açıklaması</div>
          <div style="font-size:14px;color:#1E1E1C;line-height:1.5;">${task.details || 'Seansta hikâyendeki sonucu somut bir örnekle güçlendirelim. PDF veya DOCX formatında yükleyebilirsin.'}</div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;background:#FFFFFF;border:1px dashed #7564C7;border-radius:8px;padding:12px 14px;margin-top:12px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span class="material-symbols-outlined" style="color:#51409D;font-size:22px;">description</span>
            <div>
              <div style="font-size:13px;font-weight:600;color:#1E1E1C;">Q4_Kurumsal_Satis_Sunumu_ElifYilmaz.pdf</div>
              <div style="font-size:12px;color:#7564C7;">2.4 MB · PDF Belgesi</div>
            </div>
          </div>
          <a href="odev-teslim.html" style="font-size:13px;font-weight:600;color:#51409D;text-decoration:none;">Aday Teslim Ekranını Gör →</a>
        </div>
      `;
    } else {
      bodyHtml = `
        <div style="background:#7564C7;border:1px solid #7564C7;border-radius:8px;padding:14px;margin-top:12px;">
          <div style="font-size:12px;font-weight:600;color:#7564C7;text-transform:uppercase;margin-bottom:4px;">Ödev Yönergesi</div>
          <div style="font-size:14px;color:#1E1E1C;line-height:1.5;">${task.details || 'Seansta konuştuğumuz geçiş hikâyendeki en büyük zorluğu, senin aldığın aksiyonu ve ölçülebilir sonucu 3-4 cümleyle özetle.'}</div>
        </div>
      `;
    }

    detailOverlay.innerHTML = `
      <div style="background:#FFFFFF;border-radius:14px;padding:24px;width:100%;max-width:540px;max-height:85vh;overflow-y:auto;font-family:'IBM Plex Sans',sans-serif;color:#1E1E1C;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
          <div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
              <span style="padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600;background:rgba(81, 64, 157, 0.1);color:#51409D;">${task.type}</span>
              <span style="font-size:13px;color:#7564C7;">Son tarih: ${task.deadline || '15 Ocak'}</span>
            </div>
            <h3 style="margin:0;font-size:18px;font-weight:600;color:#1E1E1C;">${task.title}</h3>
          </div>
          <button type="button" data-close-modal style="background:transparent;border:0;cursor:pointer;color:#7564C7;padding:4px;">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        ${bodyHtml}
        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;padding-top:14px;border-top:1px solid #7564C7;">
          <button type="button" data-close-modal style="padding:9px 18px;border-radius:8px;border:0;background:#51409D;color:#FFFFFF;font-size:14px;font-weight:500;cursor:pointer;">Kapat</button>
        </div>
      </div>
    `;
    detailOverlay.style.display = 'flex';
    detailOverlay.querySelectorAll('[data-close-modal]').forEach((btn) => {
      btn.addEventListener('click', () => { detailOverlay.style.display = 'none'; });
    });
  }

  detailOverlay.addEventListener('click', (e) => {
    if (e.target === detailOverlay) detailOverlay.style.display = 'none';
  });

  function bindRowClick(row, task) {
    row.classList.add('cursor-pointer', 'hover:border-[#51409D]', 'transition-colors');
    row.title = 'Detayları görmek için tıklayın';
    row.addEventListener('click', () => openTaskModal(task));
  }

  // Mevcut "Verilenler" satırlarını da tıklanabilir yap
  Array.from(givenList.children).forEach((row) => {
    const titleEl = row.querySelector('span.font-medium');
    const pills = row.querySelectorAll('span.rounded-full');
    const titleText = titleEl ? titleEl.textContent.trim() : 'Talep detayı';
    const typeText = pills[0] ? pills[0].textContent.trim() : 'Belge';
    if (pills[0]) pills[0].classList.add('advisor-task-type-badge');
    if (pills[1]) pills[1].classList.add('advisor-task-status-badge');
    bindRowClick(row, {
      title: titleText,
      type: typeText,
      deadline: '15 Ocak',
    });
  });

  function addGivenTask(task) {
    const row = document.createElement('div');
    row.className = 'bg-[#FFFFFF] border border-[#7564C7] rounded-[8px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3';
    const title = document.createElement('span');
    title.className = 'text-[14px] font-medium text-[#1E1E1C]';
    title.textContent = task.title;
    const deadline = document.createElement('span');
    deadline.className = 'text-[13px] text-[#7564C7]';
    deadline.textContent = task.deadline ? '· Son tarih ' + task.deadline : '· Son tarih belirtilmedi';
    const details = document.createElement('div');
    details.className = 'flex items-center gap-2 shrink-0';
    const type = document.createElement('span');
    type.className = 'advisor-task-type-badge px-2.5 py-0.5 rounded-full text-[12px] font-medium';
    type.textContent = task.type;
    const status = document.createElement('span');
    status.className = 'advisor-task-status-badge px-2.5 py-0.5 rounded-full text-[12px] font-medium';
    status.textContent = 'Bekliyor';
    details.append(type, status);
    const textGroup = document.createElement('div');
    textGroup.className = 'flex items-center gap-2';
    textGroup.append(title, deadline);
    row.append(textGroup, details);
    bindRowClick(row, task);
    givenList.prepend(row);
  }

  taskTypeButtons.forEach((button) => {
    const type = button.textContent.trim();
    button.setAttribute('aria-pressed', String(type === selectedType));
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      selectType(type);
    });
  });

  sendButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const title = fieldContainer.querySelector('[data-task-title]')?.value.trim();
    const deadline = deadlineInput.value.trim();
    const task = { type: selectedType, title, deadline };
    if (selectedType === 'Soru') {
      task.questions = Array.from(fieldContainer.querySelectorAll('[data-question-input]'))
        .map((input) => input.value.trim())
        .filter(Boolean);
      if (!task.questions.length) {
        feedback.className = 'text-[13px] mt-2 text-[#B42318]';
        feedback.textContent = 'Göndermek için en az bir soru yazın.';
        return;
      }
    } else {
      task.details = fieldContainer.querySelector('[data-task-details]')?.value.trim() || '';
      if (!task.details) {
        feedback.className = 'text-[13px] mt-2 text-[#B42318]';
        feedback.textContent = selectedType === 'Belge'
          ? 'İstenen belge için kısa bir açıklama ekleyin.'
          : 'Ödevin nasıl yapılacağını açıklayın.';
        return;
      }
    }

    if (!title) {
      feedback.className = 'text-[13px] mt-2 text-[#B42318]';
      feedback.textContent = 'Lütfen talep için bir başlık yazın.';
      return;
    }

    try {
      const savedTasks = JSON.parse(localStorage.getItem('guruElifTasks') || '[]');
      if (!Array.isArray(savedTasks)) throw new Error('Kayıtlı talepler beklenen biçimde değil.');
      savedTasks.push(task);
      localStorage.setItem('guruElifTasks', JSON.stringify(savedTasks));
    } catch (error) {
      console.error('Talep kaydedilemedi.', error);
    }

    addGivenTask(task);
    feedback.className = 'text-[13px] mt-2 text-[#51409D] font-medium';
    feedback.textContent = '✓ ' + selectedType + ' talebi Elif Yılmaz’a gönderildi ve aşağıdaki "Verilenler" listesine eklendi.';
  });

  renderForm();

  try {
    const savedTasks = JSON.parse(localStorage.getItem('guruElifTasks') || '[]');
    if (Array.isArray(savedTasks)) {
      savedTasks.forEach(addGivenTask);
    }
  } catch (error) {
    console.error('Kayıtlı talepler yüklenemedi.', error);
  }
})();
