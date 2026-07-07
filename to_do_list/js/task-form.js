document.addEventListener('DOMContentLoaded', function() {
    const taskTitleInput = document.getElementById('task-title');
    const taskDescInput = document.getElementById('task-desc');
    const taskDateInput = document.getElementById('task-date');
    const btnSubmit = document.getElementById('btn-submit');
    const btnCancel = document.getElementById('btn-cancel');

    function initDate() {
        const today = window.AppStore.getTodayString();
        taskDateInput.value = today;
        taskDateInput.setAttribute('min', today);
    }

    function handleAddTask() {
        const title = taskTitleInput.value.trim();
        const desc = taskDescInput.value.trim();
        const date = taskDateInput.value;

        if (!title) {
            alert('Nama tugas tidak boleh kosong!');
            return;
        }

        window.AppStore.tasks.push({
            title: title,
            desc: desc,
            date: date || window.AppStore.getTodayString(),
            completed: false
        });

        taskTitleInput.value = '';
        taskDescInput.value = '';
        initDate();
        
        window.AppStore.saveAndSync();
    }

    btnSubmit.addEventListener('click', handleAddTask);
    btnCancel.addEventListener('click', () => {
        taskTitleInput.value = '';
        taskDescInput.value = '';
        initDate();
    });

    initDate();
});