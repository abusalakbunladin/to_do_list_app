const taskTitleInput = document.getElementById('task-title');
const taskDescInput = document.getElementById('task-desc');
const btnSubmit = document.getElementById('btn-submit');
const btnCancel = document.getElementById('btn-cancel');
const taskListContainer = document.getElementById('dynamic-task-list');
const taskCountDisplay = document.getElementById('task-count');
const sidebarCountDisplay = document.getElementById('sidebar-count');
const sidebarAddBtn = document.getElementById('sidebar-add-btn');

// Mengambil data dari LocalStorage
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

// Fungsi Render Menggunakan template data-index (Lebih aman dibanding onclick inline)
function renderTasks() {
    taskListContainer.innerHTML = '';
    
    tasks.forEach((task, index) => {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''}`;
        
        li.innerHTML = `
            <span class="checkbox" data-action="toggle" data-index="${index}">
                ${task.completed ? '●' : '○'}
            </span>
            <div class="task-details" data-action="toggle" data-index="${index}">
                <span class="task-name">${escapeHTML(task.title)}</span>
                ${task.desc.trim() ? `<span class="task-meta">${escapeHTML(task.desc)}</span>` : ''}
            </div>
            <button class="delete-btn" data-action="delete" data-index="${index}" title="Hapus tugas">Hapus</button>
        `;
        
        taskListContainer.appendChild(li);
    });

    // Update Angka Counter
    taskCountDisplay.textContent = tasks.length;
    
    // Counter Sidebar khusus menghitung tugas yang BELUM selesai
    const activeTasks = tasks.filter(t => !t.completed).length;
    sidebarCountDisplay.textContent = activeTasks;
    
    // Simpan ke LocalStorage
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

// Fungsi Tambah Tugas
function addTask() {
    const title = taskTitleInput.value.trim();
    const desc = taskDescInput.value.trim();

    if (title === '') {
        alert('Nama tugas tidak boleh kosong!');
        taskTitleInput.focus();
        return;
    }

    tasks.push({
        title: title,
        desc: desc,
        completed: false 
    });

    // Reset Form
    clearInput();
    renderTasks();
}

function clearInput() {
    taskTitleInput.value = '';
    taskDescInput.value = '';
}

// Security fix: Mencegah XSS injection dari input user
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

// Event Delegation (Menangani klik di dalam list secara terpusat)
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

// Event Listeners
btnSubmit.addEventListener('click', addTask);
btnCancel.addEventListener('click', clearInput);

taskTitleInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        addTask();
    }
});

taskDescInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        addTask();
    }
});

// Fokus ke input saat tombol "+ Add Task" di sidebar diklik
sidebarAddBtn.addEventListener('click', () => {
    taskTitleInput.focus();
});

// Jalankan render pertama kali aplikasi dibuka
renderTasks();