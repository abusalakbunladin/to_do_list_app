document.addEventListener('DOMContentLoaded', function() {
    const taskTitleInput = document.getElementById('task-title');
    const taskDescInput = document.getElementById('task-desc');
    const taskDateInput = document.getElementById('task-date');
    const btnSubmit = document.getElementById('btn-submit');
    const btnCancel = document.getElementById('btn-cancel');
    const taskInputBox = document.getElementById('task-input-box');

    const MAX_TITLE_LENGTH = 100;
    const MAX_DESC_LENGTH = 500;
    let isSubmitting = false;

    const titleMetaRow = document.createElement('div');
    titleMetaRow.className = 'title-meta-row';

    const titleError = document.createElement('span');
    titleError.id = 'title-error';
    titleError.className = 'error-message';

    const charCounter = document.createElement('span');
    charCounter.id = 'title-char-count';
    charCounter.className = 'char-counter';

    titleMetaRow.appendChild(titleError);
    titleMetaRow.appendChild(charCounter);
    taskTitleInput.insertAdjacentElement('afterend', titleMetaRow);

    const descMetaRow = document.createElement('div');
    descMetaRow.className = 'desc-meta-row';

    const descCharCounter = document.createElement('span');
    descCharCounter.id = 'desc-char-count';
    descCharCounter.className = 'char-counter';

    descMetaRow.appendChild(descCharCounter);
    taskDescInput.insertAdjacentElement('afterend', descMetaRow);

    const PRIORITIES = [
        { value: 'tinggi', label: 'Tinggi', className: 'priority-high' },
        { value: 'sedang', label: 'Sedang', className: 'priority-medium' },
        { value: 'rendah', label: 'Rendah', className: 'priority-low' }
    ];
    let selectedPriority = null;

    const priorityRow = document.createElement('div');
    priorityRow.className = 'priority-row';

    const priorityLabel = document.createElement('span');
    priorityLabel.className = 'priority-label';
    priorityLabel.textContent = 'Prioritas:';

    const priorityOptions = document.createElement('div');
    priorityOptions.className = 'priority-options';

    PRIORITIES.forEach(p => {
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = `priority-pill ${p.className}`;
        pill.dataset.priority = p.value;

        const dot = document.createElement('span');
        dot.className = 'priority-dot';

        const label = document.createElement('span');
        label.textContent = p.label;

        pill.appendChild(dot);
        pill.appendChild(label);
        pill.addEventListener('click', () => selectPriority(p.value));
        priorityOptions.appendChild(pill);
    });

    priorityRow.appendChild(priorityLabel);
    priorityRow.appendChild(priorityOptions);

    const priorityErrorRow = document.createElement('div');
    priorityErrorRow.className = 'priority-error-row';

    const priorityError = document.createElement('span');
    priorityError.id = 'priority-error';
    priorityError.className = 'error-message';
    priorityErrorRow.appendChild(priorityError);

    const taskActionsRow = taskInputBox.querySelector('.task-input-actions');
    taskActionsRow.insertAdjacentElement('beforebegin', priorityRow);
    taskActionsRow.insertAdjacentElement('beforebegin', priorityErrorRow);

    function selectPriority(value) {
        selectedPriority = value;
        priorityOptions.querySelectorAll('.priority-pill').forEach(pill => {
            pill.classList.toggle('active', pill.dataset.priority === value);
        });
        clearPriorityError();
        updateContainerPriorityBorder(value);
    }

    function updateContainerPriorityBorder(value) {
        taskInputBox.classList.remove('priority-border-tinggi', 'priority-border-sedang', 'priority-border-rendah');
        if (value) {
            taskInputBox.classList.add(`priority-border-${value}`);
        }
    }

    function showPriorityError(message) {
        priorityError.textContent = message;
        priorityError.classList.add('show');
        priorityOptions.classList.add('shake');
        setTimeout(() => priorityOptions.classList.remove('shake'), 350);
    }

    function clearPriorityError() {
        priorityError.textContent = '';
        priorityError.classList.remove('show');
    }

    const CATEGORIES = ['💼 Kerja', '🎓 Kuliah', '🏠 Pribadi'];

    const categorySelect = document.createElement('select');
    categorySelect.id = 'task-category';
    categorySelect.className = 'task-category-select';

    const categoryPlaceholder = document.createElement('option');
    categoryPlaceholder.value = '';
    categoryPlaceholder.textContent = 'Pilih kategori';
    categoryPlaceholder.disabled = true;
    categoryPlaceholder.selected = true;
    categorySelect.appendChild(categoryPlaceholder);

    CATEGORIES.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        categorySelect.appendChild(opt);
    });

    const leftControls = taskInputBox.querySelector('.left-controls');
    leftControls.appendChild(categorySelect);

    const categoryErrorRow = document.createElement('div');
    categoryErrorRow.className = 'category-error-row';

    const categoryError = document.createElement('span');
    categoryError.id = 'category-error';
    categoryError.className = 'error-message';
    categoryErrorRow.appendChild(categoryError);

    const taskControlsRow = taskInputBox.querySelector('.task-input-controls');
    taskControlsRow.insertAdjacentElement('afterend', categoryErrorRow);

    function showCategoryError(message) {
        categoryError.textContent = message;
        categoryError.classList.add('show');
        categorySelect.classList.add('error', 'shake');
        setTimeout(() => categorySelect.classList.remove('shake'), 350);
    }

    function clearCategoryError() {
        categoryError.textContent = '';
        categoryError.classList.remove('show');
        categorySelect.classList.remove('error');
    }

    categorySelect.addEventListener('change', clearCategoryError);

    taskTitleInput.setAttribute('maxlength', MAX_TITLE_LENGTH);
    taskDescInput.setAttribute('maxlength', MAX_DESC_LENGTH);

    function initDate() {
        const today = window.AppStore.getTodayString();
        taskDateInput.value = today;
        taskDateInput.setAttribute('min', today);
    }

    function sanitizeText(str) {
        return str.replace(/\s+/g, ' ').trim();
    }

    function sanitizeMultiline(str) {
        return str
            .split('\n')
            .map(line => line.replace(/[ \t]+/g, ' ').trim())
            .join('\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    function generateId() {
        return (window.crypto && crypto.randomUUID)
            ? crypto.randomUUID()
            : `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function updateCharCounter() {
        const len = taskTitleInput.value.length;
        charCounter.textContent = `${len}/${MAX_TITLE_LENGTH}`;
        charCounter.classList.toggle('warning', len >= MAX_TITLE_LENGTH - 10);
    }

    function updateDescCharCounter() {
        const len = taskDescInput.value.length;
        descCharCounter.textContent = `${len}/${MAX_DESC_LENGTH}`;
        descCharCounter.classList.toggle('warning', len >= MAX_DESC_LENGTH - 30);
    }

    function showError(message) {
        titleError.textContent = message;
        titleError.classList.add('show');
        taskTitleInput.classList.add('error', 'shake');
        setTimeout(() => taskTitleInput.classList.remove('shake'), 350);
    }

    function clearError() {
        titleError.textContent = '';
        titleError.classList.remove('show');
        taskTitleInput.classList.remove('error');
    }

    function flashSuccess() {
        if (!taskInputBox) return;
        taskInputBox.classList.add('success-flash');
        setTimeout(() => taskInputBox.classList.remove('success-flash'), 500);
    }

    function flashCancel() {
        if (!taskInputBox) return;
        taskInputBox.classList.add('cancel-flash');
        setTimeout(() => taskInputBox.classList.remove('cancel-flash'), 500);
    }

    // --- Urungkan (undo) saat Cancel tidak sengaja terklik ---
    let lastCancelledSnapshot = null;
    let cancelUndoTimeout = null;

    const cancelUndoToast = document.createElement('div');
    cancelUndoToast.className = 'cancel-undo-toast';

    const cancelUndoText = document.createElement('span');
    cancelUndoText.className = 'cancel-undo-text';
    cancelUndoText.textContent = 'Formulir dibatalkan.';

    const cancelUndoBtn = document.createElement('button');
    cancelUndoBtn.type = 'button';
    cancelUndoBtn.className = 'cancel-undo-btn';
    cancelUndoBtn.textContent = 'Urungkan';

    cancelUndoToast.appendChild(cancelUndoText);
    cancelUndoToast.appendChild(cancelUndoBtn);
    document.body.appendChild(cancelUndoToast);

    function captureFormSnapshot() {
        return {
            title: taskTitleInput.value,
            desc: taskDescInput.value,
            date: taskDateInput.value,
            category: categorySelect.value,
            priority: selectedPriority
        };
    }

    function isSnapshotEmpty(snapshot) {
        return !snapshot.title.trim()
            && !snapshot.desc.trim()
            && !snapshot.category
            && !snapshot.priority;
    }

    function restoreFormSnapshot(snapshot) {
        taskTitleInput.value = snapshot.title;
        taskDescInput.value = snapshot.desc;
        taskDateInput.value = snapshot.date;
        if (snapshot.category) categorySelect.value = snapshot.category;
        if (snapshot.priority) selectPriority(snapshot.priority);
        updateCharCounter();
        updateDescCharCounter();
        taskTitleInput.focus();
    }

    function showCancelUndoToast() {
        cancelUndoToast.classList.add('show');
        clearTimeout(cancelUndoTimeout);
        cancelUndoTimeout = setTimeout(hideCancelUndoToast, 6000);
    }

    function hideCancelUndoToast() {
        cancelUndoToast.classList.remove('show');
        lastCancelledSnapshot = null;
    }

    cancelUndoBtn.addEventListener('click', function() {
        if (lastCancelledSnapshot) {
            restoreFormSnapshot(lastCancelledSnapshot);
        }
        clearTimeout(cancelUndoTimeout);
        hideCancelUndoToast();
    });

    function resetForm() {
        taskTitleInput.value = '';
        taskDescInput.value = '';
        clearError();
        clearCategoryError();
        clearPriorityError();
        categorySelect.selectedIndex = 0;
        selectedPriority = null;
        priorityOptions.querySelectorAll('.priority-pill').forEach(pill => pill.classList.remove('active'));
        updateContainerPriorityBorder(null);
        updateCharCounter();
        updateDescCharCounter();
        initDate();
    }

    function handleAddTask() {
        if (isSubmitting) return;

        const title = sanitizeText(taskTitleInput.value);
        const desc = sanitizeMultiline(taskDescInput.value);
        const date = taskDateInput.value;

        if (!title) {
            showError('Nama tugas tidak boleh kosong atau hanya berisi spasi!');
            taskTitleInput.focus();
            return;
        }

        if (title.length > MAX_TITLE_LENGTH) {
            showError(`Nama tugas maksimal ${MAX_TITLE_LENGTH} karakter.`);
            return;
        }

        if (!categorySelect.value) {
            showCategoryError('Pilih kategori tugas terlebih dahulu!');
            categorySelect.focus();
            return;
        }

        if (!selectedPriority) {
            showPriorityError('Pilih prioritas tugas terlebih dahulu!');
            return;
        }

        clearError();
        clearCategoryError();
        clearPriorityError();
        isSubmitting = true;
        btnSubmit.disabled = true;

        window.AppStore.tasks.push({
            id: generateId(),
            title: title,
            desc: desc,
            date: date || window.AppStore.getTodayString(),
            priority: selectedPriority,
            category: categorySelect.value,
            completed: false,
            createdAt: new Date().toISOString()
        });

        resetForm();
        window.AppStore.saveAndSync();
        flashSuccess();

        setTimeout(() => {
            isSubmitting = false;
            btnSubmit.disabled = false;
        }, 300);
    }

    btnSubmit.addEventListener('click', handleAddTask);
    btnCancel.addEventListener('click', function() {
        const snapshot = captureFormSnapshot();
        resetForm();
        flashCancel();
        if (!isSnapshotEmpty(snapshot)) {
            lastCancelledSnapshot = snapshot;
            showCancelUndoToast();
        }
    });

    taskTitleInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTask();
        }
    });

    taskDescInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleAddTask();
        }
    });

    taskTitleInput.addEventListener('input', function() {
        if (taskTitleInput.value.trim()) clearError();
        updateCharCounter();
    });

    taskDescInput.addEventListener('input', updateDescCharCounter);

    initDate();
    updateCharCounter();
    updateDescCharCounter();
});
