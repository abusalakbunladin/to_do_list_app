window.AppStore = {
    tasks: JSON.parse(localStorage.getItem('tasks')) || [],
    currentView: 'add-task',

    escapeHTML: function(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    },
    
    getTodayString: function() {
        return new Date().toISOString().split('T')[0];
    },
    
    // Fungsi sinkronisasi data ke LocalStorage & Update seluruh UI
    saveAndSync: function() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
        if (window.renderTaskList) window.renderTaskList();
        if (window.updateSidebarCounters) window.updateSidebarCounters();
    }
};