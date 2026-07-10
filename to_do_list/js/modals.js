document.addEventListener('DOMContentLoaded', function() {
    const triggers = [
        { btn: document.getElementById('help-trigger'), modal: document.getElementById('modal-help') },
        { btn: document.getElementById('notif-trigger'), modal: document.getElementById('modal-notif'), isNotif: true },
        { btn: document.getElementById('profile-trigger'), modal: document.getElementById('modal-profile'), checkStats: true }
    ];
 
    const notifBadge = document.getElementById('notif-badge');
    const notifList = document.getElementById('notif-list');

    const notifModalHeader = document.querySelector('#modal-notif .modal-header');
    let clearAllNotifBtn = null;
    if (notifModalHeader) {
        const notifToolbar = document.createElement('div');
        notifToolbar.className = 'notif-toolbar';
        notifToolbar.id = 'notif-toolbar';

        clearAllNotifBtn = document.createElement('button');
        clearAllNotifBtn.type = 'button';
        clearAllNotifBtn.id = 'btn-clear-all-notif';
        clearAllNotifBtn.className = 'btn-clear-all-notif';
        clearAllNotifBtn.textContent = '🗑️ Hapus Semua';

        notifToolbar.appendChild(clearAllNotifBtn);
        notifModalHeader.insertAdjacentElement('afterend', notifToolbar);
    }

    function refreshNotifToolbar() {
        const notifToolbar = document.getElementById('notif-toolbar');
        if (!notifToolbar) return;
        const hasItems = !!(notifList && notifList.querySelector('.notif-item'));
        notifToolbar.style.display = hasItems ? 'flex' : 'none';
    }
 
    let lastFocusedTrigger = null;
 
    const NOTIF_READ_KEY = 'notifRead';
 
    function notifKey(taskId, category) {
        return `${taskId}::${category}`;
    }
 
    function saveReadNotifs(readSet) {
        try {
            localStorage.setItem(NOTIF_READ_KEY, JSON.stringify([...readSet]));
        } catch (err) {
            console.warn('Gagal menyimpan status notifikasi yang sudah dibaca.', err);
        }
    }
 
    function loadReadNotifs() {
        let readSet;
        try {
            const raw = localStorage.getItem(NOTIF_READ_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            readSet = new Set(Array.isArray(parsed) ? parsed : []);
        } catch (err) {
            readSet = new Set();
        }
 
        const store = window.AppStore;
        if (store && Array.isArray(store.tasks)) {
            const validIds = new Set(store.tasks.map(t => t.id));
            let changed = false;
            readSet.forEach(key => {
                const taskId = key.split('::')[0];
                if (!validIds.has(taskId)) {
                    readSet.delete(key);
                    changed = true;
                }
            });
            if (changed) saveReadNotifs(readSet);
        }
        return readSet;
    }
 
    function markNotifRead(taskId, category) {
        if (!category) return;
        const readSet = loadReadNotifs();
        readSet.add(notifKey(taskId, category));
        saveReadNotifs(readSet);
    }

    const NOTIF_DISMISS_KEY = 'notifDismissed';

    function saveDismissedNotifs(dismissSet) {
        try {
            localStorage.setItem(NOTIF_DISMISS_KEY, JSON.stringify([...dismissSet]));
        } catch (err) {
            console.warn('Gagal menyimpan status notifikasi yang disembunyikan.', err);
        }
    }

    function loadDismissedNotifs() {
        let dismissSet;
        try {
            const raw = localStorage.getItem(NOTIF_DISMISS_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            dismissSet = new Set(Array.isArray(parsed) ? parsed : []);
        } catch (err) {
            dismissSet = new Set();
        }

        const store = window.AppStore;
        if (store && Array.isArray(store.tasks)) {
            const validIds = new Set(store.tasks.map(t => t.id));
            let changed = false;
            dismissSet.forEach(key => {
                const taskId = key.split('::')[0];
                if (!validIds.has(taskId)) {
                    dismissSet.delete(key);
                    changed = true;
                }
            });
            if (changed) saveDismissedNotifs(dismissSet);
        }
        return dismissSet;
    }

    function markNotifDismissed(taskId, category) {
        if (!category) return;
        const dismissSet = loadDismissedNotifs();
        dismissSet.add(notifKey(taskId, category));
        saveDismissedNotifs(dismissSet);
    }
 
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
        const readSet = loadReadNotifs();
        const dismissSet = loadDismissedNotifs();

        const hampirHabis = store.tasks.filter(t =>
            t.date === todayStr && !t.completed &&
            !readSet.has(notifKey(t.id, 'hampir-habis')) && !dismissSet.has(notifKey(t.id, 'hampir-habis'))
        ).length;
        const terlewat = store.tasks.filter(t =>
            t.date < todayStr && !t.completed &&
            !readSet.has(notifKey(t.id, 'terlewat')) && !dismissSet.has(notifKey(t.id, 'terlewat'))
        ).length;
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
        const readSet = loadReadNotifs();
        const dismissSet = loadDismissedNotifs();

        const tomorrowStr = getTomorrowString(todayStr);

        const tasksTerlewat = store.tasks
            .filter(t => t.date < todayStr && !t.completed && !dismissSet.has(notifKey(t.id, 'terlewat')))
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        const tasksHampirHabis = store.tasks.filter(t =>
            t.date === todayStr && !t.completed && !dismissSet.has(notifKey(t.id, 'hampir-habis'))
        );

        const tasksBesok = store.tasks.filter(t =>
            t.date === tomorrowStr && !t.completed && !dismissSet.has(notifKey(t.id, 'besok'))
        );

        if (tasksTerlewat.length === 0 && tasksHampirHabis.length === 0 && tasksBesok.length === 0) {
            notifList.innerHTML = '<div class="notif-empty">☕ Semua aman! Tidak ada tugas terlewat atau mendesak.</div>';
            refreshNotifToolbar();
            return;
        }

        function dismissButtonHTML() {
            return `<button type="button" class="notif-dismiss" title="Sembunyikan notifikasi ini" aria-label="Sembunyikan notifikasi ini">&times;</button>`;
        }

        if (tasksTerlewat.length > 0) {
            const label = document.createElement('div');
            label.className = 'notif-group-label';
            label.textContent = `Terlewat (${tasksTerlewat.length})`;
            notifList.appendChild(label);
        }

        tasksTerlewat.forEach(task => {
            const daysLate = Math.floor((new Date(todayStr) - new Date(task.date)) / 86400000);
            const isRead = readSet.has(notifKey(task.id, 'terlewat'));
            const div = document.createElement('div');
            div.className = `notif-item clickable terlewat ${isRead ? 'is-read' : 'unread'}`;
            div.setAttribute('data-id', task.id);
            div.setAttribute('data-category', 'terlewat');
            div.setAttribute('tabindex', '0');
            div.innerHTML = `
                ${dismissButtonHTML()}
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
            const isRead = readSet.has(notifKey(task.id, 'hampir-habis'));
            const div = document.createElement('div');
            div.className = `notif-item clickable hampir-habis ${isRead ? 'is-read' : 'unread'}`;
            div.setAttribute('data-id', task.id);
            div.setAttribute('data-category', 'hampir-habis');
            div.setAttribute('tabindex', '0');
            div.innerHTML = `
                ${dismissButtonHTML()}
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
            const isRead = readSet.has(notifKey(task.id, 'besok'));
            const div = document.createElement('div');
            div.className = `notif-item clickable besok ${isRead ? 'is-read' : 'unread'}`;
            div.setAttribute('data-id', task.id);
            div.setAttribute('data-category', 'besok');
            div.setAttribute('tabindex', '0');
            div.innerHTML = `
                ${dismissButtonHTML()}
                <p><strong>🔜 Besok:</strong> Siap-siap kerjakan "<span>${store.escapeHTML(task.title)}</span>".</p>
                <span class="notif-time">Tenggat: Besok · ${store.escapeHTML(String(task.date))}</span>
            `;
            notifList.appendChild(div);
        });

        refreshNotifToolbar();
    }

    function cleanupEmptyNotifGroups() {
        if (!notifList) return;
        notifList.querySelectorAll('.notif-group-label').forEach(label => {
            const next = label.nextElementSibling;
            if (!next || !next.classList.contains('notif-item')) {
                label.remove();
            }
        });
        if (!notifList.querySelector('.notif-item')) {
            notifList.innerHTML = '<div class="notif-empty">☕ Semua aman! Tidak ada tugas terlewat atau mendesak.</div>';
        }
        refreshNotifToolbar();
    }

    function dismissNotifItem(item) {
        const taskId = item.getAttribute('data-id');
        const category = item.getAttribute('data-category');
        if (category) markNotifDismissed(taskId, category);

        item.classList.add('notif-removing');
        setTimeout(() => {
            item.remove();
            cleanupEmptyNotifGroups();
            window.updateNotificationBadge();
        }, 180);
    }
 
    const NOTIF_CATEGORY_TO_VIEW = {
        'terlewat': 'overdue',
        'hampir-habis': 'today',
        'besok': 'upcoming'
    };

    function goToTask(taskId, category) {
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

        const targetView = NOTIF_CATEGORY_TO_VIEW[category] || 'all';
        const navItem = document.querySelector(`.main-nav li[data-view="${targetView}"]`);
        if (navItem) navItem.click();
 
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
 
    function handleNotifActivate(item) {
        const taskId = item.getAttribute('data-id');
        const category = item.getAttribute('data-category');
        if (category) {
            markNotifRead(taskId, category);
            item.classList.remove('unread');
            item.classList.add('is-read');
            window.updateNotificationBadge();
        }
        goToTask(taskId, category);
    }

    function clearAllNotifs() {
        if (!notifList) return;
        const items = notifList.querySelectorAll('.notif-item[data-id]');
        if (items.length === 0) return;

        const confirmed = window.confirm(
            `Hapus ${items.length} notifikasi ini? Tugasnya tetap ada, cuma pesan notifnya yang disembunyikan.`
        );
        if (!confirmed) return;

        const dismissSet = loadDismissedNotifs();
        items.forEach(item => {
            const taskId = item.getAttribute('data-id');
            const category = item.getAttribute('data-category');
            if (category) dismissSet.add(notifKey(taskId, category));
        });
        saveDismissedNotifs(dismissSet);

        notifList.innerHTML = '<div class="notif-empty">☕ Semua aman! Tidak ada tugas terlewat atau mendesak.</div>';
        refreshNotifToolbar();
        window.updateNotificationBadge();
    }

    if (clearAllNotifBtn) {
        clearAllNotifBtn.addEventListener('click', clearAllNotifs);
    }

    if (notifList) {
        notifList.addEventListener('click', function(e) {
            const dismissBtn = e.target.closest('.notif-dismiss');
            if (dismissBtn) {
                e.stopPropagation();
                const item = dismissBtn.closest('.notif-item[data-id]');
                if (item) dismissNotifItem(item);
                return;
            }
            const item = e.target.closest('.notif-item[data-id]');
            if (!item) return;
            handleNotifActivate(item);
        });

        notifList.addEventListener('keydown', function(e) {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            const dismissBtn = e.target.closest('.notif-dismiss');
            if (dismissBtn) {
                e.preventDefault();
                const item = dismissBtn.closest('.notif-item[data-id]');
                if (item) dismissNotifItem(item);
                return;
            }
            const item = e.target.closest('.notif-item[data-id]');
            if (!item) return;
            e.preventDefault();
            handleNotifActivate(item);
        });
    }
 
    triggers.forEach(item => {
        if (!item.btn) return;
        item.btn.addEventListener('click', function(e) {
            e.preventDefault();
            if (item.isNotif) {
                renderNotifications();
            }
            if (item.checkStats) {
                renderProfileStats();
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
 
    refreshNotifToolbar();
 
    setTimeout(() => {
        if (window.updateSidebarCounters) window.updateSidebarCounters();
        window.updateNotificationBadge();
    }, 100);
}
                         );
