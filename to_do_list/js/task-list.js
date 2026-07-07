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
        <button type="button" id="btn-clear-completed" class="btn-clear-completed">🧹 Hapus yang Selesai</button>
    `;
    listContainer.parentNode.insertBefore(toolbar, listContainer);

    const searchInput = toolbar.querySelector('#task-search');
    const clearCompletedBtn = toolbar.querySelector('#btn-clear-completed');
    let searchQuery = '';

    searchInput.addEventListener('input', function () {
        searchQuery = this.value.trim().toLowerCase();
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


    function createTaskElement(task, todayStr) {
        const store = window.AppStore;
        const overdue = window.TaskFilters.isOverdue(task, todayStr);

        let dateLabel = task.date;
        if (task.date === todayStr) dateLabel = 'Hari ini';
        else if (overdue) dateLabel = `⚠️ Terlambat (${task.date})`;

        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''} ${overdue ? 'overdue' : ''}`.trim();

        li.innerHTML = `
            <span class="checkbox" data-action="toggle" data-id="${task.id}">${task.completed ? '●' : '○'}</span>
            <div class="task-details" data-action="toggle" data-id="${task.id}">
                <span class="task-name">${store.escapeHTML(task.title)}</span>
                ${task.desc ? `<span class="task-meta">${store.escapeHTML(task.desc)}</span>` : ''}
                <span class="task-date-badge">📅 ${dateLabel}</span>
            </div>
            <button class="delete-btn" data-action="delete" data-id="${task.id}">Hapus</button>
        `;
        return li;
    }

    function buildGroups(tasks, todayStr) {
        const buckets = [
            { label: '⚠️ Terlambat', tasks: tasks.filter(t => window.TaskFilters.isOverdue(t, todayStr)) },
            { label: '📅 Hari Ini', tasks: tasks.filter(t => window.TaskFilters.isToday(t, todayStr)) },
            { label: '🗓️ Mendatang', tasks: tasks.filter(t => window.TaskFilters.isUpcoming(t, todayStr)) },
            { label: '👌 Selesai', tasks: tasks.filter(t => window.TaskFilters.isDone(t)) }
        ];
        buckets.forEach(b => { b.tasks = window.TaskFilters.sortByDate(b.tasks); });
        return buckets.filter(b => b.tasks.length > 0);
    }

    window.renderTaskList = function () {
        if (!listContainer) return;
        ensureTaskIds();

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
            buildGroups(base, todayStr).forEach(group => {
                const header = document.createElement('li');
                header.className = 'group-header';
                header.textContent = `${group.label} (${group.tasks.length})`;
                listContainer.appendChild(header);
                group.tasks.forEach(task => listContainer.appendChild(createTaskElement(task, todayStr)));
            });
        } else {
            window.TaskFilters.sortByDate(base).forEach(task => {
                listContainer.appendChild(createTaskElement(task, todayStr));
            });
        }

        taskCountDisplay.textContent = base.length;
    };

    listContainer.addEventListener('click', function (e) {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const action = target.getAttribute('data-action');
        const id = target.getAttribute('data-id');
        const store = window.AppStore;

        if (action === 'toggle') {
            const task = store.tasks.find(t => t.id === id);
            if (task) task.completed = !task.completed;
        } else if (action === 'delete') {
            const idx = store.tasks.findIndex(t => t.id === id);
            if (idx === -1) return;
            const [removed] = store.tasks.splice(idx, 1);
            showUndoToast([{ task: removed, index: idx }], `🗑️ "${store.escapeHTML(removed.title)}" dihapus.`);
        }
        store.saveAndSync();
    });

    window.renderTaskList();
});
