document.addEventListener('DOMContentLoaded', function () {
    const listContainer = document.getElementById('dynamic-task-list');
    const taskCountDisplay = document.getElementById('task-count');
    const sectionIcon = document.getElementById('section-icon');
    const sectionText = document.getElementById('section-text');

    // ============================================================
    // TaskFilters — satu-satunya "sumber kebenaran" untuk kategori
    // tugas (Today / Upcoming / Done / Overdue). Ini inti tanggung
    // jawab Orang 3 (Data Filtering & List Manager). File lain
    // (sidebar.js utk counter, modals.js utk notifikasi) tinggal
    // PAKAI fungsi ini, bukan nulis ulang syarat tanggal sendiri2.
    // ============================================================
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
                default: return tasks.slice(); // 'add-task' & 'all' -> semua tugas
            }
        },

        sortByDate: function (tasks) {
            return [...tasks].sort((a, b) => a.date.localeCompare(b.date));
        }
    };

    // Judul & ikon section ikut berubah sesuai kategori yang lagi dibuka
    const viewLabels = {
        'add-task': { icon: '📋', text: 'Daftar Utama Tugas' },
        'today': { icon: '📅', text: 'Tugas Hari Ini' },
        'upcoming': { icon: '🗓️', text: 'Tugas Mendatang' },
        'done': { icon: '👌', text: 'Tugas Selesai' },
        'all': { icon: '📂', text: 'Semua Tugas' }
    };

    window.renderTaskList = function () {
        if (!listContainer) return;
        const store = window.AppStore;
        const todayStr = store.getTodayString();

        let filtered = window.TaskFilters.getByView(store.tasks, store.currentView, todayStr);
        filtered = window.TaskFilters.sortByDate(filtered);

        const label = viewLabels[store.currentView] || viewLabels['all'];
        if (sectionIcon) sectionIcon.textContent = label.icon;
        if (sectionText) sectionText.textContent = label.text;

        listContainer.innerHTML = '';

        if (filtered.length === 0) {
            listContainer.innerHTML = '<li class="task-empty">✨ Tidak ada tugas di kategori ini.</li>';
            if (taskCountDisplay) taskCountDisplay.textContent = 0;
            return;
        }

        filtered.forEach(task => {
            const originalIndex = store.tasks.indexOf(task);
            const overdue = window.TaskFilters.isOverdue(task, todayStr);

            let dateLabel = task.date;
            if (task.date === todayStr) dateLabel = 'Hari ini';
            else if (overdue) dateLabel = `⚠️ Terlambat (${task.date})`;

            const li = document.createElement('li');
            li.className = `task-item ${task.completed ? 'completed' : ''} ${overdue ? 'overdue' : ''}`.trim();

            li.innerHTML = `
                <span class="checkbox" data-action="toggle" data-index="${originalIndex}">${task.completed ? '●' : '○'}</span>
                <div class="task-details" data-action="toggle" data-index="${originalIndex}">
                    <span class="task-name">${store.escapeHTML(task.title)}</span>
                    ${task.desc ? `<span class="task-meta">${store.escapeHTML(task.desc)}</span>` : ''}
                    <span class="task-date-badge">📅 ${dateLabel}</span>
                </div>
                <button class="delete-btn" data-action="delete" data-index="${originalIndex}">Hapus</button>
            `;
            listContainer.appendChild(li);
        });

        taskCountDisplay.textContent = filtered.length;
    };

    listContainer.addEventListener('click', function (e) {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const action = target.getAttribute('data-action');
        const index = parseInt(target.getAttribute('data-index'), 10);

        if (action === 'toggle') {
            window.AppStore.tasks[index].completed = !window.AppStore.tasks[index].completed;
        } else if (action === 'delete' && confirm('Hapus tugas ini?')) {
            window.AppStore.tasks.splice(index, 1);
        }
        window.AppStore.saveAndSync();
    });

    window.renderTaskList();
});
