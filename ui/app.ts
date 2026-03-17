console.log('UI loaded');

// ===== UI Elements =====

const slideshowInput = document.getElementById('slideshow-time') as HTMLInputElement;
const baseFileInput = document.getElementById('base-file-input') as HTMLInputElement;
const playFolderInput = document.getElementById('play-folder-input') as HTMLInputElement;

const playFolderBtn = document.getElementById('play-folder-btn')!;
const baseFileBtn = document.getElementById('base-file-btn')!;

const recentTable = document.getElementById('recent-folders-table')!;

// ---- Storage Keys ----
const STORAGE_KEYS = {
    SLIDESHOW_TIME: 'slideshowTime',
    BASE_FILE: 'baseFile',
    RECENT_FOLDERS: 'recentFolders',
};

function getRecentFolders(): string[] {
    const data = localStorage.getItem(STORAGE_KEYS.RECENT_FOLDERS);
    return data ? JSON.parse(data) : [];
}

function addRecentFolder(folder: string) {
    const folders = getRecentFolders();

    const updated = [folder, ...folders.filter((f) => f !== folder)].slice(0, 5);

    localStorage.setItem(STORAGE_KEYS.RECENT_FOLDERS, JSON.stringify(updated));
    renderRecentFolders();
}

function init() {
    slideshowInput.value = localStorage.getItem(STORAGE_KEYS.SLIDESHOW_TIME) ?? '10';
    baseFileInput.value = localStorage.getItem(STORAGE_KEYS.BASE_FILE) ?? '';
    renderRecentFolders();
}

function renderRecentFolders() {
    const folders = getRecentFolders();

    recentTable.innerHTML = '';

    folders.forEach((folder) => {
        const tr = document.createElement('tr');

        const td = document.createElement('td');
        td.textContent = folder;
        td.className = 'hover:bg-base-300/50 rounded-box cursor-pointer';

        // Click to reuse folder
        td.addEventListener('click', () => {
            playFolderInput.value = folder;
        });

        tr.appendChild(td);
        recentTable.appendChild(tr);
    });
}

slideshowInput.addEventListener('input', () => {
    localStorage.setItem(STORAGE_KEYS.SLIDESHOW_TIME, slideshowInput.value);
});

baseFileBtn.addEventListener('click', async () => {
    const file = await (window as any).api.selectBaseFile();

    if (file) {
        baseFileInput.value = file;
        localStorage.setItem(STORAGE_KEYS.BASE_FILE, file);
    }
});

playFolderBtn.addEventListener('click', async () => {
    const folder = await (window as any).api.selectPlayFolder();

    if (folder) {
        playFolderInput.value = folder;
        addRecentFolder(folder);
    }
});

init();
