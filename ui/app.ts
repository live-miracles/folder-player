// ===== UI Elements =====
const homePage = document.getElementById('home-page')!;
const vmixPage = document.getElementById('vmix-page')!;

const slideshowInput = document.getElementById('slideshow-time') as HTMLInputElement;
const baseFileInput = document.getElementById('base-file-input') as HTMLInputElement;
const playFolderInput = document.getElementById('play-folder-input') as HTMLInputElement;

const selectBaseFileBtn = document.getElementById('select-base-file-btn')!;
const selectPlayFolderBtn = document.getElementById('select-play-folder-btn')!;
const playFolderBtn = document.getElementById('play-folder-btn')!;

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

selectBaseFileBtn.addEventListener('click', async () => {
    const file = await (window as any).api.selectBaseFile();

    if (file) {
        baseFileInput.value = file;
        localStorage.setItem(STORAGE_KEYS.BASE_FILE, file);
    }
});

selectPlayFolderBtn.addEventListener('click', async () => {
    const folder = await (window as any).api.selectPlayFolder();

    if (folder) {
        playFolderInput.value = folder;
        addRecentFolder(folder);
    }
});

function goToVmixPage() {
    homePage.classList.add('hidden');
    vmixPage.classList.remove('hidden');
}

function goToHomePage() {
    vmixPage.classList.add('hidden');
    homePage.classList.remove('hidden');
}

playFolderBtn.addEventListener('click', async () => {
    const baseFile = baseFileInput.value;
    const folderPath = playFolderInput.value;

    if (!folderPath || !baseFile) {
        alert('Select folder and base file first.');
        return;
    }

    const res = await (window as any).api.getVmixState();
    console.log(res);

    if (res.error) {
        alert(
            'Could not connect to vMix on port 8088. Make sure it is running and HTTP API is enabled.\n\n' +
                res.error,
        );
        return;
    }

    addRecentFolder(folderPath);

    try {
        await (window as any).api.playFolder({ folderPath, baseFile });

        goToVmixPage();
    } catch (err) {
        console.error(err);
        alert(err);
    }
});

init();

// setInterval(async () => {
//     if (vmixPage.classList.contains('hidden')) return;

//     const res = await fetchVmixInfo();
//     if (res.error) return;

//     console.log(res.value);
// }, 10000);
