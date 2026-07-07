document.addEventListener('DOMContentLoaded', function() {
    const navItems = document.querySelectorAll('.main-nav li:not(.help-item)');
    const contentTitle = document.getElementById('content-title');
    const taskInputBox = document.getElementById('task-input-box');

    navItems.forEach(item => {
        item.addEventListener('click', function() {
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            
            const view = this.getAttribute('data-view');
            window.AppStore.currentView = view;
            contentTitle.textContent = this.querySelector('a').textContent.trim();
            
            taskInputBox.style.display = (view === 'add-task') ? 'block' : 'none';
            
            window.AppStore.saveAndSync();
        });
    });

    window.updateSidebarCounters = function() {
        const store = window.AppStore;
        const todayStr = store.getTodayString();

        document.getElementById('count-add-task').textContent = store.tasks.length;
        document.getElementById('count-today').textContent = store.tasks.filter(t => t.date === todayStr && !t.completed).length;
        document.getElementById('count-upcoming').textContent = store.tasks.filter(t => t.date > todayStr && !t.completed).length;
        document.getElementById('count-done').textContent = store.tasks.filter(t => t.completed).length;
        document.getElementById('count-all').textContent = store.tasks.length;
    };
});