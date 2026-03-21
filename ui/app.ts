import { renderTableBody } from './config.js';

// ===== UI Elements =====
const homePage = document.getElementById('home-page')!;
const vmixPage = document.getElementById('vmix-page')!;
const configPage = document.getElementById('config-page')!;

const baseFileInput = document.getElementById('base-file-input') as HTMLInputElement;
const selectBaseFileBtn = document.getElementById('select-base-file-btn')!;
const playFolderInput = document.getElementById('play-folder-input') as HTMLInputElement;
const selectPlayFolderBtn = document.getElementById('select-play-folder-btn')!;
const recentTable = document.getElementById('recent-folders-table')!;
const playFolderBtn = document.getElementById('play-folder-btn')!;

const editConfigBtn = document.getElementById('edit-config-btn')!;
const cancelConfigBtn = document.getElementById('cancel-config-btn')!;
const saveConfigBtn = document.getElementById('cancel-config-btn')!;

const programCamInput = document.getElementById('program-cam-input') as HTMLInputElement;
const previewCamInput = document.getElementById('preview-cam-input') as HTMLInputElement;
const enableBusInput = document.getElementById('enable-bus-input') as HTMLInputElement;
const bellTimeInput = document.getElementById('bell-time-input') as HTMLInputElement;
const closeVmixWebBtn = document.getElementById('close-vmix-web-btn')!;

// ---- Storage Keys ----
const STORAGE_KEYS = {
    PROGRAM_CAM: 'programCam',
    PREVIEW_CAM: 'previewCam',
    ENABLE_BUS: 'enableBus',
    BELL_TIME: 'bellTime',
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
    programCamInput.value = localStorage.getItem(STORAGE_KEYS.PROGRAM_CAM) ?? '';
    previewCamInput.value = localStorage.getItem(STORAGE_KEYS.PREVIEW_CAM) ?? '';
    enableBusInput.value = localStorage.getItem(STORAGE_KEYS.ENABLE_BUS) ?? '';
    bellTimeInput.value = localStorage.getItem(STORAGE_KEYS.BELL_TIME) ?? '';

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

programCamInput.addEventListener('input', () => {
    localStorage.setItem(STORAGE_KEYS.PROGRAM_CAM, programCamInput.value);
});
previewCamInput.addEventListener('input', () => {
    localStorage.setItem(STORAGE_KEYS.PREVIEW_CAM, previewCamInput.value);
});
enableBusInput.addEventListener('input', () => {
    localStorage.setItem(STORAGE_KEYS.ENABLE_BUS, enableBusInput.value);
});
bellTimeInput.addEventListener('input', () => {
    localStorage.setItem(STORAGE_KEYS.BELL_TIME, bellTimeInput.value);
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

function goToHomePage() {
    vmixPage.classList.add('hidden');
    configPage.classList.add('hidden');
    homePage.classList.remove('hidden');
}

function goToConfigPage() {
    vmixPage.classList.add('hidden');
    homePage.classList.add('hidden');
    configPage.classList.remove('hidden');
}

function goToVmixPage() {
    homePage.classList.add('hidden');
    configPage.classList.add('hidden');
    vmixPage.classList.remove('hidden');
}

playFolderBtn.addEventListener('click', async () => {
    const baseFile = baseFileInput.value;
    const folderPath = playFolderInput.value;

    if (!folderPath || !baseFile) {
        alert('Select folder and base file first.');
        return;
    }

    const res = await (window as any).api.getVmixState();

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

editConfigBtn.addEventListener('click', async () => {
    const folderPath = playFolderInput.value;

    if (!folderPath) {
        alert('Select folder and base file first.');
        return;
    }

    try {
        const folderFiles = (await (window as any).api.getFolderFiles(folderPath)) as [
            number,
            { path: string; type: string }[],
        ][];
        folderFiles.sort((a, b) => {
            if (a[0] === -1) return 1;
            if (b[0] === -1) return -1;
            return a[0] - b[0];
        });

        const config = await (window as any).api.getFolderConfig(folderPath);
        renderTableBody(folderFiles, new Map(config));

        console.log(JSON.stringify(folderFiles, null, 2), JSON.stringify(config, null, 2));

        addRecentFolder(folderPath);

        goToConfigPage();
    } catch (err) {
        console.log(err);
        alert(err);
    }
});

cancelConfigBtn.addEventListener('click', goToHomePage);

closeVmixWebBtn.addEventListener('click', () => {
    const res = confirm('Are you sure you want to close vMix Web?');
    if (res) goToHomePage();
});

async function loadDevices() {
    //await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

    const devices = await navigator.mediaDevices.enumerateDevices();

    for (const device of devices) {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.text = device.label || `${device.kind}`;

        if (device.kind === 'videoinput') {
            programCamInput.appendChild(option);

            const option2 = document.createElement('option');
            option2.value = device.deviceId;
            option2.text = device.label || `${device.kind}`;
            previewCamInput.appendChild(option2);
        }
    }
}

(async () => {
    await loadDevices();

    init();
})();

// setInterval(async () => {
//     if (vmixPage.classList.contains('hidden')) return;

//     const res = await fetchVmixInfo();
//     if (res.error) return;

//     console.log(res.value);
// }, 10000);
