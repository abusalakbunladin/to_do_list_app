const taskTitleInput = document.getElementById('task-title');
const taskDescInput = document.getElementById('task-desc');
const taskDateInput = document.getElementById('task-date');
const taskInputBox = document.getElementById('task-input-box');
const btnSubmit = document.getElementById('btn-submit');
const btnCancel = document.getElementById('btn-cancel');
const taskListContainer = document.getElementById('dynamic-task-list');
const taskCountDisplay = document.getElementById('task-count');
const contentTitle = document.getElementById('content-title');
const navItems = document.querySelectorAll('.main-nav li');
const countAddTask = document.getElementById('count-add-task');
const countToday = document.getElementById('count-today');
const countUpcoming = document.getElementById('count-upcoming');
const countDone = document.getElementById('count-done');
const countAll = document.getElementById('count-all');

let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let currentView = 'add-task';

function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    
    taskDateInput.value = today;
    
    taskDateInput.setAttribute('min', today);
}

function getTodayString() {
    return new Date().toISOString().split('T')[0];
}

function renderTasks() {
    taskListContainer.innerHTML = '';
    const todayStr = getTodayString();

    if (currentView === 'add-task') {
        taskInputBox.style.display = 'block';
    } else {
        taskInputBox.style.display = 'none';
    }

    const filteredTasks = tasks.filter(task => {
        if (currentView === 'today') {
            return task.date === todayStr && !task.completed;
        } else if (currentView === 'upcoming') {
            return task.date > todayStr && !task.completed;
        } else if (currentView === 'done') {
            return task.completed;
        }
        return true; 
    });

    filteredTasks.forEach((task) => {
        const originalIndex = tasks.indexOf(task);
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''}`;
        
        const dateLabel = task.date === todayStr ? 'Today' : task.date;

        li.innerHTML = `
            <span class="checkbox" data-action="toggle" data-index="${originalIndex}">
                ${task.completed ? '●' : '○'}
            </span>
            <div class="task-details" data-action="toggle" data-index="${originalIndex}">
                <span class="task-name">${escapeHTML(task.title)}</span>
                ${task.desc.trim() ? `<span class="task-meta">${escapeHTML(task.desc)}</span>` : ''}
                <span class="task-date-badge">📅 ${dateLabel}</span>
            </div>
            <button class="delete-btn" data-action="delete" data-index="${originalIndex}">Hapus</button>
        `;
        
        taskListContainer.appendChild(li);
    });

    taskCountDisplay.textContent = filteredTasks.length;

    countAddTask.textContent = tasks.length;
    countToday.textContent = tasks.filter(t => t.date === todayStr && !t.completed).length;
    countUpcoming.textContent = tasks.filter(t => t.date > todayStr && !t.completed).length;
    countDone.textContent = tasks.filter(t => t.completed).length;
    countAll.textContent = tasks.length;
    
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

function addTask() {
    const title = taskTitleInput.value.trim();
    const desc = taskDescInput.value.trim();
    const date = taskDateInput.value;

    function addTask() {
    const title = taskTitleInput.value.trim();
    const desc = taskDescInput.value.trim();
    const date = taskDateInput.value;
    const today = getTodayString();

    if (title === '') {
        alert('Nama tugas tidak boleh kosong!');
        return;
    }

    if (date < today) {
        alert('Tidak bisa memilih tanggal yang sudah lewat!');
        return;
    }

    tasks.push({
        title: title,
        desc: desc,
        date: date || today,
        completed: false 
    });

    clearInput();
    renderTasks();
}
function clearInput() {
    taskTitleInput.value = '';
    taskDescInput.value = '';
    setDefaultDate();
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

taskListContainer.addEventListener('click', function(e) {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const action = target.getAttribute('data-action');
    const index = parseInt(target.getAttribute('data-index'), 10);

    if (action === 'toggle') {
        tasks[index].completed = !tasks[index].completed;
        renderTasks();
    } else if (action === 'delete') {
        if (confirm('Yakin ingin menghapus tugas ini?')) {
            tasks.splice(index, 1);
            renderTasks();
        }
    }
});

navItems.forEach(item => {
    item.addEventListener('click', function() {
        navItems.forEach(nav => nav.classList.remove('active'));
        this.classList.add('active');
        
        currentView = this.getAttribute('data-view');

        contentTitle.textContent = this.querySelector('a').textContent.trim();
        
        renderTasks();
    });
});

btnSubmit.addEventListener('click', addTask);
btnCancel.addEventListener('click', clearInput);
taskTitleInput.addEventListener('keypress', e => { if (e.key === 'Enter') addTask(); });
taskDescInput.addEventListener('keypress', e => { if (e.key === 'Enter') addTask(); });

setDefaultDate();
renderTasks();
}
