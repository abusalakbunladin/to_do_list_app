document.addEventListener('DOMContentLoaded', function() {
    const listContainer = document.getElementById('dynamic-task-list');
    const taskCountDisplay = document.getElementById('task-count');

    window.renderTaskList = function() {
        if (!listContainer) return;
        listContainer.innerHTML = '';
        const store = window.AppStore;
        const todayStr = store.getTodayString();

        const filtered = store.tasks.filter(task => {
            if (store.currentView === 'today') return task.date === todayStr && !task.completed;
            if (store.currentView === 'upcoming') return task.date > todayStr && !task.completed;
            if (store.currentView === 'done') return task.completed;
            return true; 
        });

        filtered.forEach(task => {
            const originalIndex = store.tasks.indexOf(task);
            const li = document.createElement('li');
            li.className = `task-item ${task.completed ? 'completed' : ''}`;
            
            li.innerHTML = `
                <span class="checkbox" data-action="toggle" data-index="${originalIndex}">${task.completed ? '●' : '○'}</span>
                <div class="task-details" data-action="toggle" data-index="${originalIndex}">
                    <span class="task-name">${store.escapeHTML(task.title)}</span>
                    ${task.desc ? `<span class="task-meta">${store.escapeHTML(task.desc)}</span>` : ''}
                    <span class="task-date-badge">📅 ${task.date === todayStr ? 'Today' : task.date}</span>
                </div>
                <button class="delete-btn" data-action="delete" data-index="${originalIndex}">Hapus</button>
            `;
            listContainer.appendChild(li);
        });

        taskCountDisplay.textContent = filtered.length;
    };

    listContainer.addEventListener('click', function(e) {
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