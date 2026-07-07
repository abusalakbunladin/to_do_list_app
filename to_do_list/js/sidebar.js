document.addEventListener('DOMContentLoaded', function() {
    const navItems = document.querySelectorAll('.main-nav li:not(.help-item)');
    const contentTitle = document.getElementById('content-title');
    const taskInputBox = document.getElementById('task-input-box');

    const sidebarEl = document.getElementById('app-sidebar') || document.querySelector('.sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebarBackdrop = document.getElementById('sidebar-backdrop');

    // ------- Buka / tutup sidebar (khusus mode mobile off-canvas) -------
    function openSidebar() {
        if (!sidebarEl) return;
        sidebarEl.classList.add('open');
        if (sidebarBackdrop) sidebarBackdrop.classList.add('show');
        if (sidebarToggle) sidebarToggle.setAttribute('aria-expanded', 'true');
    }

    function closeSidebar() {
        if (!sidebarEl) return;
        sidebarEl.classList.remove('open');
        if (sidebarBackdrop) sidebarBackdrop.classList.remove('show');
        if (sidebarToggle) sidebarToggle.setAttribute('aria-expanded', 'false');
    }

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            const isOpen = sidebarEl.classList.contains('open');
            if (isOpen) closeSidebar(); else openSidebar();
        });
    }

    if (sidebarBackdrop) {
        sidebarBackdrop.addEventListener('click', closeSidebar);
    }

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeSidebar();
    });

    // ------- Navigasi menu -------
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            // Dulu tidak ada preventDefault, jadi tiap klik nav bikin
            // URL nambah "#" dan halaman bisa ikut ter-scroll ke atas.
            e.preventDefault();

            navItems.forEach(nav => {
                nav.classList.remove('active');
                const link = nav.querySelector('a');
                if (link) link.removeAttribute('aria-current');
            });
            this.classList.add('active');
            const activeLink = this.querySelector('a');
            if (activeLink) activeLink.setAttribute('aria-current', 'page');

            const view = this.getAttribute('data-view');
            window.AppStore.currentView = view;
            contentTitle.textContent = this.querySelector('a').textContent.trim();

            taskInputBox.style.display = (view === 'add-task') ? 'block' : 'none';

            window.AppStore.saveAndSync();

            // Di mobile, sidebar otomatis nutup setelah pilih menu
            closeSidebar();
        });
    });

    window.updateSidebarCounters = function() {
        const store = window.AppStore;
        const todayStr = store.getTodayString();
        const filters = window.TaskFilters;

        document.getElementById('count-add-task').textContent = store.tasks.length;
        document.getElementById('count-today').textContent = filters
            ? filters.getByView(store.tasks, 'today', todayStr).length
            : store.tasks.filter(t => t.date === todayStr && !t.completed).length;
        document.getElementById('count-upcoming').textContent = filters
            ? filters.getByView(store.tasks, 'upcoming', todayStr).length
            : store.tasks.filter(t => t.date > todayStr && !t.completed).length;
        document.getElementById('count-done').textContent = filters
            ? filters.getByView(store.tasks, 'done', todayStr).length
            : store.tasks.filter(t => t.completed).length;
        document.getElementById('count-all').textContent = store.tasks.length;
    };
});
