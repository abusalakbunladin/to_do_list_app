document.addEventListener('DOMContentLoaded', function() {
    const triggers = [
        { btn: document.getElementById('help-trigger'), modal: document.getElementById('modal-help') },
        { btn: document.getElementById('notif-trigger'), modal: document.getElementById('modal-notif'), isNotif: true },
        { btn: document.getElementById('profile-trigger'), modal: document.getElementById('modal-profile'), checkStats: true }
    ];
 
    const notifBadge = document.getElementById('notif-badge');
    const notifList = document.getElementById('notif-list');
 
    let lastFocusedTrigger = null;
 
    function getTomorrowString(todayStr) {
        const [year, month, day] = todayStr.split('-').map(Number);
        const utcDate = new Date(Date.UTC(year, month - 1, day));
        utcDate.setUTCDate(utcDate.getUTCDate() + 1);
 
        const yyyy = utcDate.getUTCFullYear();
        const mm = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(utcDate.getUTCDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }
 
    window.updateNotificationBadge = function() {
        const store = window.AppStore;
        if (!store || !notifBadge) return;
 
        const todayStr = store.getTodayString();
        const hampirHabis = store.tasks.filter(t => t.date === todayStr && !t.completed).length;
        const terlewat = store.tasks.filter(t => t.date < todayStr && !t.completed).length;
        const totalAlerts = hampirHabis + terlewat;
 
        if (totalAlerts > 0) {
            notifBadge.textContent = totalAlerts > 9 ? '9+' : totalAlerts;
            notifBadge.style.display = 'flex';
        } else {
            notifBadge.style.display = 'none';
        }
    };
 
    function renderNotifications() {
        if (!notifList) return;
        notifList.innerHTML = '';
        const store = window.AppStore;
        const todayStr = store.getTodayString();
 
        const tomorrowStr = getTomorrowString(todayStr);
 
        const tasksTerlewat = store.tasks
            .filter(t => t.date < todayStr && !t.completed)
            .sort((a, b) => new Date(a.date) - new Date(b.date));
 
        const tasksHampirHabis = store.tasks.filter(t => t.date === todayStr && !t.completed);
 
        const tasksBesok = store.tasks.filter(t => t.date === tomorrowStr && !t.completed);
 
        if (tasksTerlewat.length === 0 && tasksHampirHabis.length === 0 && tasksBesok.length === 0) {
            notifList.innerHTML = '<div class="notif-empty">☕ Semua aman! Tidak ada tugas terlewat atau mendesak.</div>';
            return;
        }
 
        if (tasksTerlewat.length > 0) {
            const label = document.createElement('div');
            label.className = 'notif-group-label';
            label.textContent = `Terlewat (${tasksTerlewat.length})`;
            notifList.appendChild(label);
        }
 
        tasksTerlewat.forEach(task => {
            const daysLate = Math.floor((new Date(todayStr) - new Date(task.date)) / 86400000);
            const div = document.createElement('div');
            div.className = 'notif-item unread clickable terlewat';
            div.setAttribute('data-id', task.id);
            div.setAttribute('tabindex', '0');
            div.innerHTML = `
                <p><strong>⚠️ Terlewat:</strong> Tugas "<span>${store.escapeHTML(task.title)}</span>" terlewat!</p>
                <span class="notif-time">Tenggat seharusnya: ${store.escapeHTML(String(task.date))} · ${daysLate} hari lalu</span>
            `;
            notifList.appendChild(div);
        });
 
        if (tasksHampirHabis.length > 0) {
            const label = document.createElement('div');
            label.className = 'notif-group-label';
            label.textContent = `Hari Ini (${tasksHampirHabis.length})`;
            notifList.appendChild(label);
        }
 
        tasksHampirHabis.forEach(task => {
            const div = document.createElement('div');
            div.className = 'notif-item unread clickable hampir-habis';
            div.setAttribute('data-id', task.id);
            div.setAttribute('tabindex', '0');
            div.innerHTML = `
                <p><strong>⏳ Hari Ini:</strong> Jangan lupa kerjakan "<span>${store.escapeHTML(task.title)}</span>".</p>
                <span class="notif-time">Tenggat: Hari ini</span>
            `;
            notifList.appendChild(div);
        });
 
        if (tasksBesok.length > 0) {
            const label = document.createElement('div');
            label.className = 'notif-group-label';
            label.textContent = `Besok (${tasksBesok.length})`;
            notifList.appendChild(label);
        }
 
        tasksBesok.forEach(task => {
            const div = document.createElement('div');
            div.className = 'notif-item clickable besok';
            div.setAttribute('data-id', task.id);
            div.setAttribute('tabindex', '0');
            div.innerHTML = `
                <p><strong>🔜 Besok:</strong> Siap-siap kerjakan "<span>${store.escapeHTML(task.title)}</span>".</p>
                <span class="notif-time">Tenggat: Besok · ${store.escapeHTML(String(task.date))}</span>
            `;
            notifList.appendChild(div);
        });
    }
 
    function goToTask(taskId) {
        const modalNotif = document.getElementById('modal-notif');
        if (modalNotif && modalNotif.classList.contains('show')) closeModal(modalNotif);
 
        const searchInput = document.getElementById('task-search');
        if (searchInput && searchInput.value) {
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        const categoryFilterSelect = document.getElementById('task-category-filter');
        if (categoryFilterSelect && categoryFilterSelect.value) {
            categoryFilterSelect.value = '';
            categoryFilterSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
 
        const allNavItem = document.querySelector('.main-nav li[data-view="all"]');
        if (allNavItem) allNavItem.click();
 
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const taskEl = document.querySelector(`.task-item[data-id="${taskId}"]`);
                if (!taskEl) return;
                taskEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                taskEl.classList.add('task-highlight');
                setTimeout(() => taskEl.classList.remove('task-highlight'), 1200);
            });
        });
    }
 
    function renderProfileStats() {
        const store = window.AppStore;
        if (!store) return;
        const tasks = store.tasks;
        const total = tasks.length;
        const done = tasks.filter(t => t.completed).length;
        const active = total - done;
        const percent = total > 0 ? Math.round((done / total) * 100) : 0;
 
        const statTotal = document.getElementById('stat-total');
        const statDone = document.getElementById('stat-done');
        const statActive = document.getElementById('stat-active');
        const progressBar = document.getElementById('profile-progress-bar');
        const progressLabel = document.getElementById('profile-progress-label');
 
        if (statTotal) statTotal.textContent = total;
        if (statDone) statDone.textContent = done;
        if (statActive) statActive.textContent = active;
        if (progressBar) progressBar.style.width = percent + '%';
        if (progressLabel) progressLabel.textContent = `${percent}% selesai`;
    }
 
    let currentHistoryFilter = 'all';
 
    function renderHistoryList() {
        const historyList = document.getElementById('history-list');
        const store = window.AppStore;
        if (!historyList || !store) return;
 
        historyList.innerHTML = '';
 
        let tasks = [...store.tasks].sort((a, b) => new Date(b.date) - new Date(a.date));
 
        if (currentHistoryFilter === 'done') {
            tasks = tasks.filter(t => t.completed);
        } else if (currentHistoryFilter === 'pending') {
            tasks = tasks.filter(t => !t.completed);
        }
 
        if (tasks.length === 0) {
            historyList.innerHTML = '<li class="history-empty">Belum ada tugas di kategori ini.</li>';
            return;
        }
 
        tasks.forEach(task => {
            const li = document.createElement('li');
            li.className = 'history-item' + (task.completed ? ' is-done' : ' is-pending');
            li.innerHTML = `
                <span class="history-icon">${task.completed ? '✅' : '⏳'}</span>
                <span class="history-text">
                    <span class="history-title">${store.escapeHTML(task.title)}</span>
                    <span class="history-date">${task.date || 'Tanpa tanggal'}</span>
                </span>
            `;
            historyList.appendChild(li);
        });
    }
 
    function setupHistoryFilters() {
        const filterBtns = document.querySelectorAll('.history-filter .filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                filterBtns.forEach(b => {
                    b.classList.remove('active');
                    b.setAttribute('aria-selected', 'false');
                });
                this.classList.add('active');
                this.setAttribute('aria-selected', 'true');
                currentHistoryFilter = this.dataset.filter;
                renderHistoryList();
            });
        });
    }
 
    function openModal(modal, triggerEl) {
        lastFocusedTrigger = triggerEl || document.activeElement;
        modal.classList.add('show');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
 
        const closeBtn = modal.querySelector('.close-modal');
        if (closeBtn) closeBtn.focus();
    }
 
    function closeModal(modal) {
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
 
        const anyOpen = document.querySelector('.modal-overlay.show');
        if (!anyOpen) document.body.classList.remove('modal-open');
 
        if (lastFocusedTrigger && typeof lastFocusedTrigger.focus === 'function') {
            lastFocusedTrigger.focus();
        }
        window.updateNotificationBadge();
    }
 
    if (notifList) {
        notifList.addEventListener('click', function(e) {
            const item = e.target.closest('.notif-item[data-id]');
            if (!item) return;
            goToTask(item.getAttribute('data-id'));
        });
 
        notifList.addEventListener('keydown', function(e) {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            const item = e.target.closest('.notif-item[data-id]');
            if (!item) return;
            e.preventDefault();
            goToTask(item.getAttribute('data-id'));
        });
    }
 
    triggers.forEach(item => {
        if (!item.btn) return;
        item.btn.addEventListener('click', function(e) {
            e.preventDefault();
            if (item.isNotif) {
                renderNotifications();
                if (notifBadge) notifBadge.style.display = 'none';
            }
            if (item.checkStats) {
                renderProfileStats();
                renderHistoryList();
            }
            openModal(item.modal, item.btn);
        });
    });
 
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.setAttribute('aria-hidden', 'true');
        overlay.addEventListener('click', function(e) {
            if (e.target === this || e.target.classList.contains('close-modal')) {
                closeModal(this);
            }
        });
    });
 
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const openModalEl = document.querySelector('.modal-overlay.show');
            if (openModalEl) closeModal(openModalEl);
        }
    });
 
    setupHistoryFilters();
 
    setTimeout(() => {
        if (window.updateSidebarCounters) window.updateSidebarCounters();
        window.updateNotificationBadge();
    }, 100);
});
