document.addEventListener('DOMContentLoaded', function () {
    const listContainer = document.getElementById('dynamic-task-list');
    const taskCountDisplay = document.getElementById('task-count');
    const sectionIcon = document.getElementById('section-icon');
    const sectionText = document.getElementById('section-text');


    window.TaskFilters = {
        isOverdue: (task, todayStr) => task.date < todayStr && !task.completed,
        isToday: (task, todayStr) => task.date === todayStr && !task.completed,
        isUpcoming: (task, todayStr) => task.date > todayStr && !task.completed,
        isDone: (task) => task.completed,

        getByView: function (tasks, view, todayStr) {
            switch (view) {
                case 'today': return tasks.filter(t => this.isToday(t, todayStr));
                case 'upcoming': return tasks.filter(t => this.isUpcoming(t, todayStr));
                case 'done': return tasks.filter(t => this.isDone(t));
                default: return tasks.slice();
            }
        },

        sortByDate: function (tasks) {
            return [...tasks].sort((a, b) => a.date.localeCompare(b.date));
        },

        PRIORITY_LEVEL: { rendah: 0, sedang: 1, tinggi: 2 },

        applySort: function (tasks, mode, direction) {
            let arr = [...tasks];
            const dir = direction === 'desc' ? -1 : 1;

            switch (mode) {
                case 'name':
                    arr.sort((a, b) => dir * a.title.localeCompare(b.title, 'id', { sensitivity: 'base' }));
                    break;
                case 'priority':
                    arr.sort((a, b) => {
                        const pa = this.PRIORITY_LEVEL[a.priority] ?? -1;
                        const pb = this.PRIORITY_LEVEL[b.priority] ?? -1;
                        return dir * (pa - pb);
                    });
                    break;
                case 'date':
                default:
                    arr.sort((a, b) => dir * a.date.localeCompare(b.date));
            }
            return arr;
        }
    };

    const viewLabels = {
        'add-task': { icon: '📋', text: 'Daftar Utama Tugas' },
        'today': { icon: '📅', text: 'Tugas Hari Ini' },
        'upcoming': { icon: '🗓️', text: 'Tugas Mendatang' },
        'done': { icon: '👌', text: 'Tugas Selesai' },
        'all': { icon: '📂', text: 'Semua Tugas' }
    };

    const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    const PRIORITY_META = {
        tinggi: { label: 'Tinggi', className: 'priority-high' },
        sedang: { label: 'Sedang', className: 'priority-medium' },
        rendah: { label: 'Rendah', className: 'priority-low' }
    };

    const CATEGORIES = ['💼 Kerja', '🎓 Kuliah', '🏠 Pribadi'];

    // Disamakan dengan batas di form "+ Add Task" (task-form.js)
    const EDIT_MAX_TITLE_LENGTH = 100;
    const EDIT_MAX_DESC_LENGTH = 500;

    const SORT_DIRECTION_LABELS = {
        date: { asc: '⬆️ Terlama → Terbaru', desc: '⬇️ Terbaru → Terlama' },
        name: { asc: '⬆️ A → Z', desc: '⬇️ Z → A' },
        priority: { asc: '⬆️ Rendah → Tinggi', desc: '⬇️ Tinggi → Rendah' }
    };

    function formatIndoDate(dateStr) {
        const d = new Date(dateStr + 'T00:00:00');
        if (isNaN(d.getTime())) return dateStr;
        return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
    }

    function daysBetween(dateStr, todayStr) {
        const d1 = new Date(dateStr + 'T00:00:00');
        const d2 = new Date(todayStr + 'T00:00:00');
        return Math.round((d1 - d2) / 86400000);
    }

    function getDateInfo(task, todayStr) {
        const diff = daysBetween(task.date, todayStr);
        const formatted = formatIndoDate(task.date);
        let label;
        if (diff === 0) label = `Hari ini • ${formatted}`;
        else if (diff === 1) label = `Besok • ${formatted}`;
        else if (diff === -1) label = `Kemarin • ${formatted}`;
        else if (diff > 1) label = `${diff} hari lagi • ${formatted}`;
        else label = `Terlambat ${Math.abs(diff)} hari • ${formatted}`;
        return { diff, label, formatted };
    }

    function generateTaskId() {
        return 't_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    }

    function ensureTaskIds() {
        const store = window.AppStore;
        let changed = false;
        store.tasks.forEach(task => {
            if (!task.id) {
                task.id = generateTaskId();
                changed = true;
            }
        });
        if (changed) localStorage.setItem('tasks', JSON.stringify(store.tasks));
    }

    const toolbar = document.createElement('div');
    toolbar.className = 'task-toolbar';
    toolbar.innerHTML = `
        <input type="text" id="task-search" class="task-search-input" placeholder="🔍 Cari tugas...">
        <select id="task-category-filter" class="task-category-filter-select" title="Filter berdasarkan kategori">
            <option value="">🗂️ Semua Kategori</option>
            ${CATEGORIES.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
        </select>
        <select id="task-sort" class="task-sort-select" title="Urutkan tugas">
            <option value="date">📅 Tanggal</option>
            <option value="name">🔤 Nama</option>
            <option value="priority">🚩 Prioritas</option>
        </select>
        <button type="button" id="btn-sort-direction" class="btn-sort-direction" title="Klik untuk membalik arah urutan"></button>
        <button type="button" id="btn-select-mode" class="btn-select-mode" title="Pilih beberapa tugas sekaligus">☑️ Pilih</button>
        <button type="button" id="btn-clear-completed" class="btn-clear-completed">🧹 Hapus yang Selesai</button>
    `;
    listContainer.parentNode.insertBefore(toolbar, listContainer);

    const bulkBar = document.createElement('div');
    bulkBar.className = 'bulk-bar';
    bulkBar.id = 'bulk-bar';
    bulkBar.innerHTML = `
        <span class="bulk-bar-count" id="bulk-bar-count">0 dipilih</span>
        <div class="bulk-bar-actions">
            <button type="button" id="btn-bulk-complete" class="bulk-bar-btn bulk-complete">✅ Selesaikan</button>
            <button type="button" id="btn-bulk-delete" class="bulk-bar-btn bulk-delete">🗑️ Hapus</button>
            <button type="button" id="btn-bulk-cancel" class="bulk-bar-btn bulk-cancel">✖ Batal</button>
        </div>
    `;
    listContainer.parentNode.insertBefore(bulkBar, listContainer);

    const searchInput = toolbar.querySelector('#task-search');
    const categoryFilterSelect = toolbar.querySelector('#task-category-filter');
    const sortSelect = toolbar.querySelector('#task-sort');
    const sortDirectionBtn = toolbar.querySelector('#btn-sort-direction');
    const selectModeBtn = toolbar.querySelector('#btn-select-mode');
    const clearCompletedBtn = toolbar.querySelector('#btn-clear-completed');

    let searchQuery = '';
    let categoryFilter = '';
    let sortMode = 'date';
    let sortDirection = 'asc';
    let editingTaskId = null;

    let selectionMode = false;
    let selectedIds = new Set();
    let expandedDescIds = new Set();
    let scrollTargetId = null;
    let pulseId = null;
    let lastKnownIds = new Set();

    searchInput.addEventListener('input', function () {
        searchQuery = this.value.trim().toLowerCase();
        window.renderTaskList();
    });

    categoryFilterSelect.addEventListener('change', function () {
        categoryFilter = this.value;
        window.renderTaskList();
    });

    function updateSortDirectionLabel() {
        const meta = SORT_DIRECTION_LABELS[sortMode] || SORT_DIRECTION_LABELS.date;
        sortDirectionBtn.textContent = meta[sortDirection];
    }
    updateSortDirectionLabel();

    sortSelect.addEventListener('change', function () {
        sortMode = this.value;
        updateSortDirectionLabel();
        window.renderTaskList();
    });

    sortDirectionBtn.addEventListener('click', function () {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        updateSortDirectionLabel();
        window.renderTaskList();
    });

    selectModeBtn.addEventListener('click', function () {
        selectionMode = !selectionMode;
        selectedIds.clear();
        this.classList.toggle('active', selectionMode);
        this.textContent = selectionMode ? '✖️ Batal Pilih' : '☑️ Pilih';
        window.renderTaskList();
    });

    function updateBulkBar() {
        const countEl = document.getElementById('bulk-bar-count');
        if (countEl) countEl.textContent = `${selectedIds.size} dipilih`;
        bulkBar.classList.toggle('show', selectionMode && selectedIds.size > 0);
    }

    bulkBar.querySelector('#btn-bulk-cancel').addEventListener('click', function () {
        selectedIds.clear();
        window.renderTaskList();
    });

    bulkBar.querySelector('#btn-bulk-complete').addEventListener('click', function () {
        if (selectedIds.size === 0) return;
        const store = window.AppStore;
        store.tasks.forEach(t => { if (selectedIds.has(t.id)) t.completed = true; });
        selectedIds.clear();
        store.saveAndSync();
    });

    bulkBar.querySelector('#btn-bulk-delete').addEventListener('click', function () {
        const count = selectedIds.size;
        if (count === 0) return;
        showConfirmDialog(
            `Yakin ingin menghapus ${count} tugas terpilih? Kamu masih bisa membatalkannya lewat tombol Undo sesudahnya.`,
            function () {
                const store = window.AppStore;
                const removed = [];
                store.tasks.forEach((t, idx) => { if (selectedIds.has(t.id)) removed.push({ task: t, index: idx }); });
                store.tasks = store.tasks.filter(t => !selectedIds.has(t.id));
                selectedIds.clear();
                showUndoToast(removed, `🗑️ ${removed.length} tugas dihapus.`);
                store.saveAndSync();
            }
        );
    });


    let pendingDelete = null;

    function showUndoToast(items, message) {
        const existing = document.getElementById('undo-toast');
        if (existing) existing.remove();
        if (pendingDelete && pendingDelete.timeoutId) clearTimeout(pendingDelete.timeoutId);

        const toast = document.createElement('div');
        toast.id = 'undo-toast';
        toast.className = 'undo-toast';
        toast.innerHTML = `<span>${message}</span><button type="button" class="undo-btn">Undo</button>`;
        document.body.appendChild(toast);

        const timeoutId = setTimeout(() => {
            toast.remove();
            pendingDelete = null;
        }, 5000);

        toast.querySelector('.undo-btn').addEventListener('click', () => {
            clearTimeout(timeoutId);
            if (pendingDelete) {
                const sorted = [...pendingDelete.items].sort((a, b) => a.index - b.index);
                sorted.forEach(item => window.AppStore.tasks.splice(item.index, 0, item.task));
                pendingDelete = null;
                window.AppStore.saveAndSync();
            }
            toast.remove();
        });

        pendingDelete = { items, timeoutId };
    }

    clearCompletedBtn.addEventListener('click', function () {
        const store = window.AppStore;
        const removed = [];
        store.tasks.forEach((t, idx) => { if (t.completed) removed.push({ task: t, index: idx }); });
        if (removed.length === 0) return;

        store.tasks = store.tasks.filter(t => !t.completed);
        showUndoToast(removed, `🧹 ${removed.length} tugas selesai dihapus.`);
        store.saveAndSync();
    });


    function showConfirmDialog(message, onConfirm) {
        const overlay = document.createElement('div');
        overlay.className = 'tl-dialog-overlay';
        overlay.innerHTML = `
            <div class="tl-dialog-box">
                <p class="tl-dialog-message">${window.AppStore.escapeHTML(message)}</p>
                <div class="tl-dialog-actions">
                    <button type="button" class="tl-dialog-btn tl-dialog-cancel">Batal</button>
                    <button type="button" class="tl-dialog-btn tl-dialog-confirm">Ya, Lanjutkan</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('show'));

        function close() {
            overlay.classList.remove('show');
            setTimeout(() => overlay.remove(), 180);
        }

        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
        overlay.querySelector('.tl-dialog-cancel').addEventListener('click', close);
        overlay.querySelector('.tl-dialog-confirm').addEventListener('click', () => {
            close();
            onConfirm();
        });
    }

    function showAlertDialog(message) {
        const overlay = document.createElement('div');
        overlay.className = 'tl-dialog-overlay';
        overlay.innerHTML = `
            <div class="tl-dialog-box">
                <p class="tl-dialog-message">${window.AppStore.escapeHTML(message)}</p>
                <div class="tl-dialog-actions">
                    <button type="button" class="tl-dialog-btn tl-dialog-confirm">Oke</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('show'));

        function close() {
            overlay.classList.remove('show');
            setTimeout(() => overlay.remove(), 180);
        }

        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
        overlay.querySelector('.tl-dialog-confirm').addEventListener('click', close);
    }

    function highlightMatch(text, query) {
        const store = window.AppStore;
        const safeText = text || '';
        if (!query) return store.escapeHTML(safeText);

        const lower = safeText.toLowerCase();
        let result = '';
        let i = 0;
        let idx;
        while ((idx = lower.indexOf(query, i)) !== -1) {
            result += store.escapeHTML(safeText.slice(i, idx));
            result += `<mark class="search-highlight">${store.escapeHTML(safeText.slice(idx, idx + query.length))}</mark>`;
            i = idx + query.length;
        }
        result += store.escapeHTML(safeText.slice(i));
        return result;
    }

    function createTaskElement(task, todayStr) {
        if (editingTaskId === task.id) {
            return createEditRow(task);
        }

        const overdue = window.TaskFilters.isOverdue(task, todayStr);
        const dateInfo = getDateInfo(task, todayStr);
        let dateLabel = dateInfo.label;
        if (overdue) dateLabel = `⚠️ ${dateLabel}`;

        let badgeClass = 'task-date-badge';
        if (dateInfo.diff === 1 && !task.completed) badgeClass += ' due-tomorrow';

        const isSelected = selectedIds.has(task.id);
        const priorityMeta = PRIORITY_META[task.priority] || null;
        const store = window.AppStore;
        const isDescExpanded = expandedDescIds.has(task.id);

        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''} ${overdue ? 'overdue' : ''} ${isDescExpanded ? 'desc-expanded' : ''}`.trim();
        li.setAttribute('data-id', task.id);

        li.innerHTML = `
            ${selectionMode ? `<span class="bulk-select-box" data-action="bulk-select" data-id="${task.id}">${isSelected ? '☑' : '☐'}</span>` : ''}
            <span class="checkbox" data-action="toggle" data-id="${task.id}">${task.completed ? '●' : '○'}</span>
            <div class="task-details" data-action="toggle" data-id="${task.id}">
                <span class="task-name" data-action="edit" data-id="${task.id}" title="Klik untuk edit tugas">${highlightMatch(task.title, searchQuery)}</span>
                ${task.desc ? `
                <span class="task-meta${isDescExpanded ? '' : ' desc-clamped'}" data-desc-id="${task.id}">${highlightMatch(task.desc, searchQuery)}</span>
                <button type="button" class="task-desc-toggle" data-action="toggle-desc" data-id="${task.id}">${isDescExpanded ? '▲ Sembunyikan' : '▼ Selengkapnya'}</button>
                ` : ''}
                <div class="task-tags">
                    ${priorityMeta ? `<span class="task-priority-tag ${priorityMeta.className}"><span class="priority-dot"></span>${priorityMeta.label}</span>` : ''}
                    ${task.category ? `<span class="task-category-tag">${store.escapeHTML(task.category)}</span>` : ''}
                </div>
                <span class="${badgeClass}">📅 ${dateLabel}</span>
            </div>
            ${selectionMode ? '' : `
            <div class="task-actions">
                <button type="button" class="edit-btn" data-action="edit" data-id="${task.id}" title="Edit tugas ini">✏️ Edit</button>
                <button type="button" class="delete-btn" data-action="delete" data-id="${task.id}">Hapus</button>
            </div>`}
        `;
        return li;
    }

    function createEditRow(task) {
        const store = window.AppStore;
        const li = document.createElement('li');
        li.className = 'task-item task-item-editing';
        li.setAttribute('data-id', task.id);

        const categoryOptions = CATEGORIES.map(cat =>
            `<option value="${cat}" ${task.category === cat ? 'selected' : ''}>${cat}</option>`
        ).join('');

        const priorityPills = Object.entries(PRIORITY_META).map(([value, meta]) => `
            <button type="button" class="priority-pill ${meta.className} ${task.priority === value ? 'active' : ''}" data-action="edit-select-priority" data-id="${task.id}" data-priority="${value}">
                <span class="priority-dot"></span>${meta.label}
            </button>
        `).join('');

        li.innerHTML = `
            <div class="task-edit-row">
                <input type="text" class="task-edit-input edit-title" value="${store.escapeHTML(task.title)}" placeholder="Judul tugas" maxlength="${EDIT_MAX_TITLE_LENGTH}">
                <textarea class="task-edit-input edit-desc" rows="1" placeholder="Deskripsi (opsional)" maxlength="${EDIT_MAX_DESC_LENGTH}">${store.escapeHTML(task.desc || '')}</textarea>
                <div class="edit-meta-row">
                    <input type="date" class="task-edit-input edit-date" value="${task.date}">
                    <select class="edit-category task-category-select">${categoryOptions}</select>
                </div>
                <div class="priority-row">
                    <span class="priority-label">Prioritas:</span>
                    <div class="priority-options">${priorityPills}</div>
                </div>
                <div class="task-edit-actions">
                    <button type="button" class="btn-edit-cancel" data-action="edit-cancel" data-id="${task.id}">Batal</button>
                    <button type="button" class="btn-edit-save" data-action="edit-save" data-id="${task.id}">Simpan</button>
                </div>
            </div>
        `;

        const descTextarea = li.querySelector('.edit-desc');
        if (descTextarea) {
            const autoGrow = () => {
                descTextarea.style.height = 'auto';
                descTextarea.style.height = descTextarea.scrollHeight + 'px';
            };
            descTextarea.addEventListener('input', autoGrow);
            requestAnimationFrame(autoGrow);
        }

        return li;
    }

    function buildGroups(tasks, todayStr, mode, direction) {
        const buckets = [
            { label: '⚠️ Terlambat', tasks: tasks.filter(t => window.TaskFilters.isOverdue(t, todayStr)) },
            { label: `📅 Hari Ini • ${formatIndoDate(todayStr)}`, tasks: tasks.filter(t => window.TaskFilters.isToday(t, todayStr)) },
            { label: '🗓️ Mendatang', tasks: tasks.filter(t => window.TaskFilters.isUpcoming(t, todayStr)) },
            { label: '👌 Selesai', tasks: tasks.filter(t => window.TaskFilters.isDone(t)) }
        ];
        buckets.forEach(b => { b.tasks = window.TaskFilters.applySort(b.tasks, mode, direction); });
        return buckets.filter(b => b.tasks.length > 0);
    }

    function willRemainInView(task, todayStr) {
        const view = window.AppStore.currentView;
        let stays;
        switch (view) {
            case 'today': stays = window.TaskFilters.isToday(task, todayStr); break;
            case 'upcoming': stays = window.TaskFilters.isUpcoming(task, todayStr); break;
            case 'done': stays = window.TaskFilters.isDone(task); break;
            default: stays = true;
        }
        if (stays && searchQuery) {
            stays = task.title.toLowerCase().includes(searchQuery);
        }
        if (stays && categoryFilter) {
            stays = task.category === categoryFilter;
        }
        return stays;
    }

    function buildList() {
        const store = window.AppStore;
        const todayStr = store.getTodayString();

        const hasCompleted = store.tasks.some(t => t.completed);
        clearCompletedBtn.style.display = (store.currentView === 'done' && hasCompleted) ? 'inline-block' : 'none';

        let base = window.TaskFilters.getByView(store.tasks, store.currentView, todayStr);
        if (searchQuery) base = base.filter(t => t.title.toLowerCase().includes(searchQuery));
        if (categoryFilter) base = base.filter(t => t.category === categoryFilter);

        const label = viewLabels[store.currentView] || viewLabels['all'];
        if (sectionIcon) sectionIcon.textContent = label.icon;
        if (sectionText) {
            sectionText.textContent = (store.currentView === 'today')
                ? `${label.text} • ${formatIndoDate(todayStr)}`
                : label.text;
        }

        listContainer.innerHTML = '';

        if (base.length === 0) {
            const emptyMsg = searchQuery
                ? '🔍 Nggak ada tugas yang cocok dengan pencarianmu.'
                : '✨ Tidak ada tugas di kategori ini.';
            listContainer.innerHTML = `<li class="task-empty">${emptyMsg}</li>`;
            taskCountDisplay.textContent = 0;
            return;
        }

        const isGroupedView = (store.currentView === 'add-task' || store.currentView === 'all');

        if (isGroupedView) {
            buildGroups(base, todayStr, sortMode, sortDirection).forEach(group => {
                const header = document.createElement('li');
                header.className = 'group-header';
                header.textContent = `${group.label} (${group.tasks.length})`;
                listContainer.appendChild(header);
                group.tasks.forEach(task => listContainer.appendChild(createTaskElement(task, todayStr)));
            });
        } else {
            window.TaskFilters.applySort(base, sortMode, sortDirection).forEach(task => {
                listContainer.appendChild(createTaskElement(task, todayStr));
            });
        }

        taskCountDisplay.textContent = base.length;
    }

    function updateDescToggles() {
        listContainer.querySelectorAll('.task-meta[data-desc-id]').forEach(el => {
            const id = el.getAttribute('data-desc-id');
            const btn = listContainer.querySelector(`.task-desc-toggle[data-id="${id}"]`);
            if (!btn) return;

            if (expandedDescIds.has(id)) {
                btn.style.display = 'inline-block';
                return;
            }

            const isOverflowing = el.scrollHeight > el.clientHeight + 1;
            btn.style.display = isOverflowing ? 'inline-block' : 'none';
        });
    }

    function performRender() {
        if (!listContainer) return;

        const oldRects = new Map();
        listContainer.querySelectorAll('.task-item[data-id]').forEach(el => {
            oldRects.set(el.getAttribute('data-id'), el.getBoundingClientRect());
        });

        buildList();
        updateDescToggles();

        listContainer.querySelectorAll('.task-item[data-id]').forEach(el => {
            if (el.classList.contains('task-item-editing')) return;
            const id = el.getAttribute('data-id');
            const oldRect = oldRects.get(id);

            if (oldRect) {
                const newRect = el.getBoundingClientRect();
                const dx = oldRect.left - newRect.left;
                const dy = oldRect.top - newRect.top;
                if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
                    el.style.transition = 'none';
                    el.style.transform = `translate(${dx}px, ${dy}px)`;
                    requestAnimationFrame(() => {
                        el.style.transition = 'transform 240ms ease';
                        el.style.transform = '';
                    });
                }
            } else {
                el.classList.add('task-enter');
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => el.classList.remove('task-enter'));
                });
            }
        });

        if (pulseId) {
            const cb = listContainer.querySelector(`.task-item[data-id="${pulseId}"] .checkbox`);
            if (cb) {
                cb.classList.add('checkbox-pop');
                cb.addEventListener('animationend', () => cb.classList.remove('checkbox-pop'), { once: true });
            }
            pulseId = null;
        }

        if (scrollTargetId) {
            const targetEl = listContainer.querySelector(`.task-item[data-id="${scrollTargetId}"]`);
            if (targetEl) {
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                targetEl.classList.add('task-highlight');
                setTimeout(() => targetEl.classList.remove('task-highlight'), 1200);
            }
            scrollTargetId = null;
        }

        updateBulkBar();
    }

    window.renderTaskList = function () {
        ensureTaskIds();

        const store = window.AppStore;
        const currentIds = store.tasks.map(t => t.id);
        if (lastKnownIds.size > 0) {
            const newlyAdded = currentIds.filter(id => !lastKnownIds.has(id));
            if (newlyAdded.length >= 1) {
                scrollTargetId = newlyAdded[newlyAdded.length - 1];
            }
        }
        lastKnownIds = new Set(currentIds);

        performRender();
    };

    listContainer.addEventListener('click', function (e) {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const action = target.getAttribute('data-action');
        const id = target.getAttribute('data-id');
        const store = window.AppStore;
        const li = target.closest('.task-item');
        const todayStr = store.getTodayString();

        if (selectionMode && (action === 'toggle' || action === 'edit')) {
            if (selectedIds.has(id)) selectedIds.delete(id); else selectedIds.add(id);
            window.renderTaskList();
            return;
        }

        if (action === 'bulk-select') {
            if (selectedIds.has(id)) selectedIds.delete(id); else selectedIds.add(id);
            window.renderTaskList();

        } else if (action === 'toggle-desc') {
            if (expandedDescIds.has(id)) expandedDescIds.delete(id); else expandedDescIds.add(id);
            window.renderTaskList();

        } else if (action === 'toggle') {
            const task = store.tasks.find(t => t.id === id);
            if (!task) return;
            const willBeCompleted = !task.completed;
            const wouldStay = willRemainInView({ ...task, completed: willBeCompleted }, todayStr);

            const applyToggle = () => {
                task.completed = willBeCompleted;
                if (willBeCompleted) {
                    pulseId = task.id;
                }
                store.saveAndSync();
            };

            if (li && !wouldStay) {
                li.classList.add('task-leaving');
                setTimeout(applyToggle, 200);
            } else {
                applyToggle();
            }

        } else if (action === 'delete') {
            const doDelete = () => {
                const idx = store.tasks.findIndex(t => t.id === id);
                if (idx === -1) return;
                const [removed] = store.tasks.splice(idx, 1);
                showUndoToast([{ task: removed, index: idx }], `🗑️ "${store.escapeHTML(removed.title)}" dihapus.`);
                store.saveAndSync();
            };

            if (li) {
                li.classList.add('task-leaving');
                setTimeout(doDelete, 200);
            } else {
                doDelete();
            }

        } else if (action === 'edit') {
            editingTaskId = id;
            window.renderTaskList();
            requestAnimationFrame(() => {
                const input = listContainer.querySelector(`.task-item[data-id="${id}"] .edit-title`);
                if (input) { input.focus(); input.select(); }
            });

        } else if (action === 'edit-select-priority') {
            if (!li) return;
            li.querySelectorAll('.priority-options .priority-pill').forEach(p => p.classList.remove('active'));
            target.classList.add('active');

        } else if (action === 'edit-cancel') {
            editingTaskId = null;
            window.renderTaskList();

        } else if (action === 'edit-save') {
            const task = store.tasks.find(t => t.id === id);
            if (!task || !li) return;
            const newTitle = li.querySelector('.edit-title').value.trim().slice(0, EDIT_MAX_TITLE_LENGTH);
            const newDesc = li.querySelector('.edit-desc').value.trim().slice(0, EDIT_MAX_DESC_LENGTH);
            const newDate = li.querySelector('.edit-date').value || todayStr;
            const newCategory = li.querySelector('.edit-category').value;
            const activePriorityPill = li.querySelector('.priority-options .priority-pill.active');
            const newPriority = activePriorityPill ? activePriorityPill.getAttribute('data-priority') : task.priority;

            if (!newTitle) {
                showAlertDialog('Judul tugas tidak boleh kosong!');
                return;
            }

            task.title = newTitle;
            task.desc = newDesc;
            task.date = newDate;
            task.category = newCategory;
            task.priority = newPriority;
            editingTaskId = null;
            scrollTargetId = task.id;
            store.saveAndSync();
        }
    });

    listContainer.addEventListener('keydown', function (e) {
        const li = e.target.closest('.task-item-editing');
        if (!li) return;

        const isDescTextarea = e.target.classList.contains('edit-desc');

        if (e.key === 'Enter' && e.target.classList.contains('task-edit-input')) {
            if (isDescTextarea && !(e.ctrlKey || e.metaKey)) return; // Enter di deskripsi = baris baru, bukan simpan
            e.preventDefault();
            const saveBtn = li.querySelector('[data-action="edit-save"]');
            if (saveBtn) saveBtn.click();
        } else if (e.key === 'Escape') {
            editingTaskId = null;
            window.renderTaskList();
        }
    });

    window.renderTaskList();
});
