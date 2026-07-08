window.AppStore = {
    tasks: (function loadTasks() {
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
            console.error('Gagal menyimpan tugas ke localStorage.', err);
        }
        if (window.renderTaskList) window.renderTaskList();
        if (window.updateSidebarCounters) window.updateSidebarCounters();
        if (window.updateNotificationBadge) window.updateNotificationBadge();
    }
};

function normalizeImportedTask(raw) {
    const VALID_PRIORITIES = ['tinggi', 'sedang', 'rendah'];
    return {
        id: (typeof raw.id === 'string' && raw.id.trim())
            ? raw.id
            : `task-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title: String(raw.title).slice(0, 100),
        desc: typeof raw.desc === 'string' ? raw.desc.slice(0, 500) : '',
        date: (typeof raw.date === 'string' && raw.date) ? raw.date : window.AppStore.getTodayString(),
        priority: VALID_PRIORITIES.includes(raw.priority) ? raw.priority : 'sedang',
        category: typeof raw.category === 'string' ? raw.category : '',
        completed: !!raw.completed,
        createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString()
    };
}

function exportBackup() {
    try {
        const dataStr = JSON.stringify(window.AppStore.tasks, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `todolist-backup-${window.AppStore.getTodayString()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return true;
    } catch (err) {
        console.error('Gagal membuat file backup.', err);
        return false;
    }
}

function importBackup(file, onDone) {
    if (!file) { onDone(false, 'Tidak ada file yang dipilih.'); return; }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const parsed = JSON.parse(e.target.result);
            if (!Array.isArray(parsed)) {
                throw new Error('Bukan format daftar tugas yang valid.');
            }
            const isPlausibleTask = t => t && typeof t === 'object' && typeof t.title === 'string' && t.title.trim();
            if (parsed.length > 0 && !parsed.some(isPlausibleTask)) {
                throw new Error('Tidak ada data tugas yang valid di file ini.');
            }

            const normalized = parsed.filter(isPlausibleTask).map(normalizeImportedTask);
            window.AppStore.tasks = normalized;
            window.AppStore.saveAndSync();
            onDone(true, `${normalized.length} tugas berhasil dipulihkan.`);
        } catch (err) {
            console.error('Gagal memulihkan backup.', err);
            onDone(false, 'Gagal memulihkan: file rusak atau formatnya tidak sesuai.');
        }
    };
    reader.onerror = function() {
        onDone(false, 'Gagal membaca file.');
    };
    reader.readAsText(file);
}

document.addEventListener('DOMContentLoaded', function() {
    const btnExport = document.getElementById('btn-export-data');
    const btnImport = document.getElementById('btn-import-data');
    const importFileInput = document.getElementById('import-file-input');
    const backupStatus = document.getElementById('backup-status');

    function showBackupStatus(message, isError) {
        if (!backupStatus) return;
        backupStatus.textContent = message;
        backupStatus.classList.toggle('is-error', !!isError);
        backupStatus.classList.toggle('is-success', !isError);
    }

    if (btnExport) {
        btnExport.addEventListener('click', function() {
            const total = window.AppStore.tasks.length;
            if (total === 0) {
                showBackupStatus('Belum ada tugas untuk di-backup.', true);
                return;
            }
            const ok = exportBackup();
            showBackupStatus(
                ok ? `Backup ${total} tugas berhasil diunduh.` : 'Gagal membuat file backup.',
                !ok
            );
        });
    }

    if (btnImport && importFileInput) {
        btnImport.addEventListener('click', function() {
            importFileInput.click();
        });

        importFileInput.addEventListener('change', function() {
            const file = importFileInput.files && importFileInput.files[0];
            if (!file) return;

            const currentCount = window.AppStore.tasks.length;
            if (currentCount > 0) {
                const confirmReplace = window.confirm(
                    `Kamu punya ${currentCount} tugas saat ini. Memulihkan backup akan MENGGANTI semua data tersebut. Lanjutkan?`
                );
                if (!confirmReplace) {
                    importFileInput.value = '';
                    return;
                }
            }

            importBackup(file, function(success, message) {
                showBackupStatus(message, !success);
                importFileInput.value = '';
            });
        });
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIcon = themeToggleBtn ? themeToggleBtn.querySelector('.theme-icon') : null;

    function syncThemeUI() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (themeIcon) themeIcon.textContent = isDark ? '☀️' : '🌙';
        if (themeToggleBtn) {
            themeToggleBtn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
            themeToggleBtn.setAttribute('aria-label', isDark ? 'Ganti ke mode terang' : 'Ganti ke mode gelap');
        }
    }

    syncThemeUI(); 

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', function() {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            if (isDark) {
                document.documentElement.removeAttribute('data-theme');
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
            }
            try {
                localStorage.setItem('theme', isDark ? 'light' : 'dark');
            } catch (err) {
                console.warn('Gagal menyimpan preferensi tema.', err);
            }
            syncThemeUI();
        });
    }
});
