// Mengambil elemen dari HTML
const taskInput = document.getElementById('taskInput');
const addBtn = document.getElementById('addBtn');
const taskList = document.getElementById('taskList');

// Fungsi untuk menambah tugas
function addTask() {
    const taskText = taskInput.value.trim();

    if (taskText === '') {
        alert('Tolong isi tugasnya terlebih dahulu!');
        return;
    }

    // Membuat elemen li baru
    const li = document.createElement('li');
    
    // Membuat teks di dalam li
    const textNode = document.createTextNode(taskText);
    li.appendChild(textNode);

    // Fitur klik untuk menandai tugas selesai (Coret)
    li.addEventListener('click', function() {
        li.classList.toggle('completed');
    });

    // Membuat tombol hapus
    const deleteBtn = document.createElement('button');
    deleteBtn.innerText = 'Hapus';
    deleteBtn.className = 'delete-btn';
    
    // Fungsi tombol hapus
    deleteBtn.addEventListener('click', function(e) {
        e.stopPropagation(); // Mencegah efek coret saat tombol hapus diklik
        taskList.removeChild(li);
    });

    li.appendChild(deleteBtn);
    taskList.appendChild(li);

    // Kosongkan kembali kolom input setelah menambah tugas
    taskInput.value = '';
}

// Menjalankan fungsi saat tombol "Tambah" diklik
addBtn.addEventListener('click', addTask);

// Menjalankan fungsi saat menekan tombol "Enter" di keyboard
taskInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        addTask();
    }
});