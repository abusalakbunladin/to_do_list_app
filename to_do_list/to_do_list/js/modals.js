document.addEventListener('DOMContentLoaded', function() {
    const triggers = [
        { btn: document.getElementById('help-trigger'), modal: document.getElementById('modal-help') },
        { btn: document.getElementById('notif-trigger'), modal: document.getElementById('modal-notif'), isNotif: true },
        { btn: document.getElementById('profile-trigger'), modal: document.getElementById('modal-profile'), checkStats: true }
    ];

    const notifBadge = document.getElementById('notif-badge');
    const notifList = document.getElementById('notif-list');

    window.updateNotificationBadge = function() {
        const store = window.AppStore;
        if (!store || !notifBadge) return;

        const todayStr = store.getTodayString();
        const hampirHabis = store.tasks.filter(t => t.date === todayStr && !t.completed).length;
        const terlewat = store.tasks.filter(t => t.date < todayStr && !t.completed).length;
        const totalAlerts = hampirHabis + terlewat;

        if (totalAlerts > 0) {
            notifBadge.textContent = totalAlerts;
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

        const tasksTerlewat = store.tasks.filter(t => t.date < todayStr && !t.completed);
        const tasksHampirHabis = store.tasks.filter(t => t.date === todayStr && !t.completed);

        if (tasksTerlewat.length === 0 && tasksHampirHabis.length === 0) {
            notifList.innerHTML = '<div class="notif-empty">☕ Semua aman! Tidak ada tugas terlewat atau mendesak.</div>';
            return;
        }

        tasksTerlewat.forEach(task => {
            const div = document.createElement('div');
            div.className = 'notif-item unread terlewat';
            div.innerHTML = `
                <p><strong>⚠️ Terlewat:</strong> Tugas "<span>${store.escapeHTML(task.title)}</span>" terlewat!</p>
                <span class="notif-time">Tenggat seharusnya: ${task.date}</span>
            `;
            notifList.appendChild(div);
        });

        tasksHampirHabis.forEach(task => {
            const div = document.createElement('div');
            div.className = 'notif-item unread hampir-habis';
            div.innerHTML = `
                <p><strong>⏳ Hari Ini:</strong> Jangan lupa kerjakan "<span>${store.escapeHTML(task.title)}</span>".</p>
                <span class="notif-time">Tenggat: Hari ini</span>
            `;
            notifList.appendChild(div);
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
                const tasks = window.AppStore.tasks;
                document.getElementById('stat-total').textContent = tasks.length;
                document.getElementById('stat-done').textContent = tasks.filter(t => t.completed).length;
            }
            item.modal.classList.add('show');
        });
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function(e) {
            if (e.target === this || e.target.classList.contains('close-modal')) {
                this.classList.remove('show');
                window.updateNotificationBadge();
            }
        });
    });

    setTimeout(() => {
        if (window.updateSidebarCounters) window.updateSidebarCounters();
        window.updateNotificationBadge();
    }, 100);
});