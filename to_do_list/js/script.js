window.AppStore = {
    tasks: (function loadTasks() {
        try {
            const raw = localStorage.getItem('tasks');
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (err) {
            console.warn('Data tugas di localStorage rusak/tidak valid, mereset ke daftar kosong.', err);
            return [];
        }
    })(),
    currentView: 'add-task',

    escapeHTML: function(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    },
    
    getTodayString: function() {
        return new Date().toISOString().split('T')[0];
    },
    
    saveAndSync: function() {
        try {
            localStorage.setItem('tasks', JSON.stringify(this.tasks));
        } catch (err) {
            console.error('Gagal menyimpan tugas ke localStorage.', err);
        }
        if (window.renderTaskList) window.renderTaskList();
        if (window.updateSidebarCounters) window.updateSidebarCounters();
        if (window.updateNotificationBadge) window.updateNotificationBadge();
    }
};

document.addEventListener('DOMContentLoaded', function() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIcon = themeToggleBtn ? themeToggleBtn.querySelector('.theme-icon') : null;

    function syncThemeUI() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (themeIcon) themeIcon.textContent = isDark ? '☀️' : '🌙';
        if (themeToggleBtn) {
            themeToggleBtn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
            themeToggleBtn.setAttribute('aria-label', isDark ? 'Ganti ke mode terang' : 'Ganti ke mode gelap');
        }
    }

    syncThemeUI(); 
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', function() {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            if (isDark) {
                document.documentElement.removeAttribute('data-theme');
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
            }
            try {
                localStorage.setItem('theme', isDark ? 'light' : 'dark');
            } catch (err) {
                console.warn('Gagal menyimpan preferensi tema.', err);
            }
            syncThemeUI();
        });
    }
});
