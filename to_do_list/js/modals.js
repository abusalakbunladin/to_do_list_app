document.addEventListener('DOMContentLoaded', function() {
    const triggers = [
        { btn: document.getElementById('help-trigger'), modal: document.getElementById('modal-help') },
        { btn: document.getElementById('notif-trigger'), modal: document.getElementById('modal-notif'), badge: document.getElementById('notif-badge') },
        { btn: document.getElementById('profile-trigger'), modal: document.getElementById('modal-profile'), checkStats: true }
    ];

    triggers.forEach(item => {
        if(!item.btn) return;
        item.btn.addEventListener('click', function(e) {
            e.preventDefault();
            if (item.badge) item.badge.style.display = 'none';
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
            }
        });
    });

    // Inisialisasi awal counter load pertama
    setTimeout(() => { if(window.updateSidebarCounters) window.updateSidebarCounters(); }, 100);
});