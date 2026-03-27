import { getTableConfig, renderConfigTable } from './config.js';
import { renderVmixWeb } from './vmix-web.js';
import { showErrorAlert, showSuccessAlert } from './utils.js';

// ===== Updates =====
const updateText = document.getElementById('update-text')!;
const updateBtn = document.getElementById('update-btn')!;
const updateProgress = document.getElementById('update-progress') as HTMLProgressElement;

function showToast() {
    document.getElementById('update-toast')!.classList.remove('hidden');
}

(window as any).api.onUpdateAvailable(() => {
    showToast();
    updateText.innerText = 'Downloading update...';
    updateProgress.classList.remove('hidden');
    updateBtn.classList.add('hidden');
});

(window as any).api.onUpdateProgress((p: number) => {
    updateProgress.value = p;
    updateText.innerText = 'Downloading: ' + p.toFixed(1) + '%';
});

(window as any).api.onUpdateReady(() => {
    updateText.innerText = 'Update ready to install';
    updateProgress.classList.add('hidden');
    updateBtn.classList.remove('hidden');
});

updateBtn.onclick = () => (window as any).api.installUpdate();

// ===== UI Elements =====
const baseFileInput = document.getElementById('base-file-input') as HTMLInputElement;
const playFolderInput = document.getElementById('play-folder-input') as HTMLInputElement;

const programCamInput = document.getElementById('program-cam-input') as HTMLInputElement;
const previewCamInput = document.getElementById('preview-cam-input') as HTMLInputElement;
const enableBusInput = document.getElementById('enable-bus-input') as HTMLInputElement;
const closeVmixWebBtn = document.getElementById('close-vmix-web-btn')!;

// ===== Navigation =====

let programStream: MediaStream | null = null;
let previewStream: MediaStream | null = null;
const programVideo = document.getElementById('program-video') as HTMLVideoElement;
const previewVideo = document.getElementById('preview-video') as HTMLVideoElement;

const loadingPage = document.getElementById('loading-page')!;
const homePage = document.getElementById('home-page')!;
const configPage = document.getElementById('config-page')!;
const vmixPage = document.getElementById('vmix-page')!;

function goToLoadingPage() {
    configPage.classList.add('hidden');
    vmixPage.classList.add('hidden');
    homePage.classList.add('hidden');
    loadingPage.classList.remove('hidden');
}

function goToHomePage() {
    loadingPage.classList.add('hidden');
    configPage.classList.add('hidden');
    vmixPage.classList.add('hidden');
    homePage.classList.remove('hidden');
}

function goToConfigPage() {
    loadingPage.classList.add('hidden');
    homePage.classList.add('hidden');
    vmixPage.classList.add('hidden');
    configPage.classList.remove('hidden');
}

async function goToVmixPage() {
    const res = await (window as any).api.getVmixState();

    if (res.error) {
        alert(
            'Could not connect to vMix on port 8088. Make sure it is running and HTTP API is enabled.\n\n' +
                res.error,
        );
        return;
    }

    try {
        if (programStream) programStream.getTracks().forEach((track) => track.stop());
        if (previewStream) previewStream.getTracks().forEach((track) => track.stop());

        if (programCamInput.value) {
            programStream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: programCamInput.value } },
                audio: false,
            });
            programVideo.srcObject = programStream;
            programVideo.play();
        }

        if (previewCamInput.value) {
            previewStream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: previewCamInput.value } },
                audio: false,
            });
            previewVideo.srcObject = previewStream;
            previewVideo.play();
        }
    } catch (err) {
        console.log(err);
        showErrorAlert(err);
    }

    homePage.classList.add('hidden');
    configPage.classList.add('hidden');
    vmixPage.classList.remove('hidden');
}

// ===== Local Storage =====
const STORAGE_KEYS = {
    PROGRAM_CAM: 'programCam',
    PREVIEW_CAM: 'previewCam',
    ENABLE_BUS: 'enableBus',
    BASE_FILE: 'baseFile',
    RECENT_FOLDERS: 'recentFolders',
};

function getRecentFolders(): string[] {
    const data = localStorage.getItem(STORAGE_KEYS.RECENT_FOLDERS);
    return data ? JSON.parse(data) : [];
}

function addRecentFolder(folder: string) {
    const folders = getRecentFolders();

    const updated = [folder, ...folders.filter((f) => f !== folder)].slice(0, 7);

    localStorage.setItem(STORAGE_KEYS.RECENT_FOLDERS, JSON.stringify(updated));
    renderRecentFolders();
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

function init() {
    programCamInput.value = localStorage.getItem(STORAGE_KEYS.PROGRAM_CAM) ?? '';
    previewCamInput.value = localStorage.getItem(STORAGE_KEYS.PREVIEW_CAM) ?? '';
    enableBusInput.value = localStorage.getItem(STORAGE_KEYS.ENABLE_BUS) ?? '';

    baseFileInput.value = localStorage.getItem(STORAGE_KEYS.BASE_FILE) ?? '';
    playFolderInput.value = getRecentFolders()[0] ?? '';
    renderRecentFolders();
}

// ===== Home Page =====
async function loadDevices() {
    const devices = await navigator.mediaDevices.enumerateDevices();

    devices.sort((a, b) =>
        (a.label || '').localeCompare(b.label || '', undefined, {
            numeric: true,
            sensitivity: 'base',
        }),
    );

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

function renderRecentFolders() {
    const folders = getRecentFolders();

    const tBody = document.getElementById('recent-folders-table')!;
    tBody.innerHTML = '';

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
        tBody.appendChild(tr);
    });
}

const editConfigBtn = document.getElementById('edit-config-btn') as HTMLButtonElement;
editConfigBtn.addEventListener('click', async () => {
    const folderPath = playFolderInput.value;

    if (!folderPath) {
        alert('Select folder and base file first.');
        return;
    }

    editConfigBtn.disabled = true;
    try {
        const folderFiles = await (window as any).api.getFolderFiles(folderPath);
        const config = await (window as any).api.getFolderConfig(folderPath);
        renderConfigTable(folderFiles, config, folderPath);
        addRecentFolder(folderPath);
        goToConfigPage();
    } catch (err) {
        console.error(err);
    }
    editConfigBtn.disabled = false;
});

document.getElementById('select-base-file-btn')!.addEventListener('click', async () => {
    const file = await (window as any).api.selectBaseFile();

    if (file) {
        baseFileInput.value = file;
        localStorage.setItem(STORAGE_KEYS.BASE_FILE, file);
    }
});

document.getElementById('select-play-folder-btn')!.addEventListener('click', async () => {
    const folder = await (window as any).api.selectPlayFolder();

    if (folder) {
        playFolderInput.value = folder;
        addRecentFolder(folder);
    }
});

function sleep(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
}

document.getElementById('create-preset-btn')!.addEventListener('click', async () => {
    const baseFile = baseFileInput.value;
    const folderPath = playFolderInput.value;

    if (!folderPath || !baseFile) {
        alert('Select folder and base file first.');
        return;
    }

    addRecentFolder(folderPath);

    try {
        await (window as any).api.createPreset({ folderPath, baseFile });
        showSuccessAlert();
    } catch (err) {
        showErrorAlert(err);
    }
});

document.getElementById('play-folder-btn')!.addEventListener('click', async () => {
    const baseFile = baseFileInput.value;
    const folderPath = playFolderInput.value;

    if (!folderPath || !baseFile) {
        alert('Select folder and base file first.');
        return;
    }

    const res = await (window as any).api.getVmixState();

    if (res.error) {
        showErrorAlert(
            'Could not connect to vMix on port 8088. Make sure it is running and HTTP API is enabled.\n\n' +
                res.error,
        );
        return;
    }

    addRecentFolder(folderPath);

    try {
        goToLoadingPage();
        await (window as any).api.playFolder({ folderPath, baseFile });
        await sleep(5000);
        goToVmixPage();
    } catch (err) {
        goToHomePage();
        showErrorAlert(err);
    }
});

// ===== Config Page =====

document.getElementById('cancel-config-btn')!.addEventListener('click', goToHomePage);

const saveConfigBtn = document.getElementById('save-config-btn') as HTMLButtonElement;
saveConfigBtn.addEventListener('click', async () => {
    const folderPath = playFolderInput.value;

    if (!folderPath) {
        alert('Select folder and base file first.');
        return;
    }
    saveConfigBtn.disabled = true;
    try {
        const config = getTableConfig();
        await (window as any).api.saveFolderConfig({ folderPath: folderPath, text: config });
        alert('Config Saved');
    } catch (err) {
        showErrorAlert(err);
    }
    saveConfigBtn.disabled = false;
});

// ===== vMix Page =====
document.getElementById('open-vmix-btn')?.addEventListener('click', goToVmixPage);

closeVmixWebBtn.addEventListener('click', () => {
    const res = confirm('Are you sure you want to close vMix Web?');
    if (res) goToHomePage();
});

async function fetchVmixState() {
    return await (window as any).api.getVmixState();
}

(async () => {
    await loadDevices();
    init();

    setInterval(async () => {
        if (vmixPage.classList.contains('hidden')) return;

        const res = await fetchVmixState();
        renderVmixWeb(res.data);
    }, 1000);
})();
