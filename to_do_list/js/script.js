window.AppStore = {
    tasks: (function loadTasks() {
        // Dulu: JSON.parse(localStorage.getItem('tasks')) || []
        // Masalahnya: kalau data di localStorage rusak/bukan JSON valid,
        // JSON.parse() lempar error dan seluruh app langsung crash blank.
        // Sekarang dibungkus try/catch, fallback ke array kosong.
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
            // Contoh kasus nyata: kuota localStorage penuh. Render tetap
            // dijalankan supaya UI tidak macet, tapi kita kasih tahu di console.
            console.error('Gagal menyimpan tugas ke localStorage.', err);
        }
        if (window.renderTaskList) window.renderTaskList();
        if (window.updateSidebarCounters) window.updateSidebarCounters();
        if (window.updateNotificationBadge) window.updateNotificationBadge();
    }
};
