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
                default: return tasks.slice(); // 'add-task' & 'all'
            }
        },

        sortByDate: function (tasks) {
            return [...tasks].sort((a, b) => a.date.localeCompare(b.date));
        },

        applySort: function (tasks, mode) {
            let arr = [...tasks];
            switch (mode) {
                case 'name':
                    arr.sort((a, b) => a.title.localeCompare(b.title, 'id', { sensitivity: 'base' }));
                    break;
                case 'priority':
                case 'date':
                default:
                    arr.sort((a, b) => a.date.localeCompare(b.date));
            }
            arr.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
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
        <select id="task-sort" class="task-sort-select" title="Urutkan tugas">
            <option value="date">📅 Tanggal</option>
            <option value="name">🔤 Nama A-Z</option>
            <option value="priority">📌 Prioritas</option>
        </select>
        <button type="button" id="btn-clear-completed" class="btn-clear-completed">🧹 Hapus yang Selesai</button>
    `;
    listContainer.parentNode.insertBefore(toolbar, listContainer);

    const searchInput = toolbar.querySelector('#task-search');
    const sortSelect = toolbar.querySelector('#task-sort');
    const clearCompletedBtn = toolbar.querySelector('#btn-clear-completed');
    let searchQuery = '';
    let sortMode = 'date';
    let editingTaskId = null;

    searchInput.addEventListener('input', function () {
        searchQuery = this.value.trim().toLowerCase();
        window.renderTaskList();
    });

    sortSelect.addEventListener('change', function () {
        sortMode = this.value;
        window.renderTaskList();
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


    // Menyorot setiap kemunculan kata kunci pencarian di dalam sebuah teks.
    // Hasil akhirnya selalu di-escape HTML; hanya bagian yang cocok yang dibungkus <mark>.
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
        const store = window.AppStore;

        if (editingTaskId === task.id) {
            return createEditRow(task);
        }

        const overdue = window.TaskFilters.isOverdue(task, todayStr);

        let dateLabel = task.date;
        if (task.date === todayStr) dateLabel = 'Hari ini';
        else if (overdue) dateLabel = `⚠️ Terlambat (${task.date})`;

        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''} ${overdue ? 'overdue' : ''} ${task.pinned ? 'pinned' : ''}`.trim();
        li.setAttribute('data-id', task.id);

        li.innerHTML = `
            <span class="checkbox" data-action="toggle" data-id="${task.id}">${task.completed ? '●' : '○'}</span>
            <div class="task-details" data-action="toggle" data-id="${task.id}">
                <span class="task-name" data-action="edit" data-id="${task.id}" title="Klik untuk edit tugas">${highlightMatch(task.title, searchQuery)}</span>
                ${task.desc ? `<span class="task-meta">${highlightMatch(task.desc, searchQuery)}</span>` : ''}
                <span class="task-date-badge">📅 ${dateLabel}</span>
            </div>
            <div class="task-actions">
                <button type="button" class="pin-btn ${task.pinned ? 'active' : ''}" data-action="pin" data-id="${task.id}" title="${task.pinned ? 'Lepas pin' : 'Pin tugas ini'}">📌</button>
                <button type="button" class="delete-btn" data-action="delete" data-id="${task.id}">Hapus</button>
            </div>
        `;
        return li;
    }

    function createEditRow(task) {
        const store = window.AppStore;
        const li = document.createElement('li');
        li.className = 'task-item task-item-editing';
        li.setAttribute('data-id', task.id);
        li.innerHTML = `
            <div class="task-edit-row">
                <input type="text" class="task-edit-input edit-title" value="${store.escapeHTML(task.title)}" placeholder="Judul tugas">
                <input type="text" class="task-edit-input edit-desc" value="${store.escapeHTML(task.desc || '')}" placeholder="Deskripsi (opsional)">
                <input type="date" class="task-edit-input edit-date" value="${task.date}">
                <div class="task-edit-actions">
                    <button type="button" class="btn-edit-cancel" data-action="edit-cancel" data-id="${task.id}">Batal</button>
                    <button type="button" class="btn-edit-save" data-action="edit-save" data-id="${task.id}">Simpan</button>
                </div>
            </div>
        `;
        return li;
    }

    function buildGroups(tasks, todayStr, mode) {
        const buckets = [
            { label: '⚠️ Terlambat', tasks: tasks.filter(t => window.TaskFilters.isOverdue(t, todayStr)) },
            { label: '📅 Hari Ini', tasks: tasks.filter(t => window.TaskFilters.isToday(t, todayStr)) },
            { label: '🗓️ Mendatang', tasks: tasks.filter(t => window.TaskFilters.isUpcoming(t, todayStr)) },
            { label: '👌 Selesai', tasks: tasks.filter(t => window.TaskFilters.isDone(t)) }
        ];
        buckets.forEach(b => { b.tasks = window.TaskFilters.applySort(b.tasks, mode); });
        return buckets.filter(b => b.tasks.length > 0);
    }

    // Mengecek apakah `task` (setelah statusnya berubah) masih akan tampil
    // di view yang sedang aktif. Dipakai untuk memutuskan apakah toggle selesai
    // perlu animasi "keluar" dulu sebelum datanya benar-benar diubah.
    function willRemainInView(task, todayStr) {
        const view = window.AppStore.currentView;
        let stays;
        switch (view) {
            case 'today': stays = window.TaskFilters.isToday(task, todayStr); break;
            case 'upcoming': stays = window.TaskFilters.isUpcoming(task, todayStr); break;
            case 'done': stays = window.TaskFilters.isDone(task); break;
            default: stays = true; // 'add-task' & 'all' selalu menampilkan semua tugas
        }
        if (stays && searchQuery) {
            stays = task.title.toLowerCase().includes(searchQuery);
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

        const label = viewLabels[store.currentView] || viewLabels['all'];
        if (sectionIcon) sectionIcon.textContent = label.icon;
        if (sectionText) sectionText.textContent = label.text;

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
            buildGroups(base, todayStr, sortMode).forEach(group => {
                const header = document.createElement('li');
                header.className = 'group-header';
                header.textContent = `${group.label} (${group.tasks.length})`;
                listContainer.appendChild(header);
                group.tasks.forEach(task => listContainer.appendChild(createTaskElement(task, todayStr)));
            });
        } else {
            window.TaskFilters.applySort(base, sortMode).forEach(task => {
                listContainer.appendChild(createTaskElement(task, todayStr));
            });
        }

        taskCountDisplay.textContent = base.length;
    }

    function performRender() {
        if (!listContainer) return;

        const oldRects = new Map();
        listContainer.querySelectorAll('.task-item[data-id]').forEach(el => {
            oldRects.set(el.getAttribute('data-id'), el.getBoundingClientRect());
        });

        buildList();

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
    }

    window.renderTaskList = function () {
        ensureTaskIds();
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

        if (action === 'toggle') {
            const task = store.tasks.find(t => t.id === id);
            if (!task) return;
            const wouldStay = willRemainInView({ ...task, completed: !task.completed }, todayStr);

            const applyToggle = () => {
                task.completed = !task.completed;
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

        } else if (action === 'pin') {
            const task = store.tasks.find(t => t.id === id);
            if (task) task.pinned = !task.pinned;
            store.saveAndSync();

        } else if (action === 'edit') {
            editingTaskId = id;
            window.renderTaskList();
            requestAnimationFrame(() => {
                const input = listContainer.querySelector(`.task-item[data-id="${id}"] .edit-title`);
                if (input) { input.focus(); input.select(); }
            });

        } else if (action === 'edit-cancel') {
            editingTaskId = null;
            window.renderTaskList();

        } else if (action === 'edit-save') {
            const task = store.tasks.find(t => t.id === id);
            if (!task || !li) return;
            const newTitle = li.querySelector('.edit-title').value.trim();
            const newDesc = li.querySelector('.edit-desc').value.trim();
            const newDate = li.querySelector('.edit-date').value || todayStr;

            if (!newTitle) {
                alert('Judul tugas tidak boleh kosong!');
                return;
            }

            task.title = newTitle;
            task.desc = newDesc;
            task.date = newDate;
            editingTaskId = null;
            store.saveAndSync();
        }
    });

    listContainer.addEventListener('keydown', function (e) {
        if (!e.target.classList.contains('task-edit-input')) return;
        const li = e.target.closest('.task-item');
        if (!li) return;

        if (e.key === 'Enter') {
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
