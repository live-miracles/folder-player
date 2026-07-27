import { getTableConfig, renderConfigPage } from './config.js';
import { renderVmixWeb } from './vmix-web.js';
import { showErrorAlert, showSuccessAlert, capitalize } from './utils.js';
import { getRandomQuote } from './quotes.js';

const RECENT_FOLDERS_LIMIT = 50;

// ===== Updates =====
const updateText = document.getElementById('update-text')!;
const updateBtn = document.getElementById('update-btn')!;
const updateDownloadBtn = document.getElementById('update-download-btn')!;
const updateDismissBtn = document.getElementById('update-dismiss-btn')!;
const updateProgress = document.getElementById('update-progress') as HTMLProgressElement;
const updateToast = document.getElementById('update-toast')!;

function showToast() {
    updateToast.classList.remove('hidden');
}

(window as any).api.onUpdateAvailable(() => {
    showToast();
    updateText.innerText = '';
    updateProgress.classList.add('hidden');
    updateBtn.classList.add('hidden');
    updateDownloadBtn.classList.remove('hidden');
    updateDismissBtn.classList.remove('hidden');
});

(window as any).api.onUpdateProgress((p: number) => {
    updateProgress.value = p;
    updateText.innerText = 'Downloading: ' + p.toFixed(1) + '%';
});

(window as any).api.onUpdateReady(() => {
    updateText.innerText = 'Downloaded';
    updateProgress.classList.add('hidden');
    updateBtn.classList.remove('hidden');
    updateDownloadBtn.classList.add('hidden');
    updateDismissBtn.classList.add('hidden');
});

updateDownloadBtn.onclick = () => {
    updateText.innerText = 'Downloading...';
    updateProgress.value = 0;
    updateProgress.classList.remove('hidden');
    updateDownloadBtn.classList.add('hidden');
    updateDismissBtn.classList.add('hidden');
    (window as any).api.downloadUpdate();
};
updateDismissBtn.onclick = () => updateToast.classList.add('hidden');
updateBtn.onclick = () => (window as any).api.installUpdate();

// ===== UI Elements =====
const baseFileInput = document.getElementById('base-file-input') as HTMLTextAreaElement;
const playFolderInput = document.getElementById('play-folder-input') as HTMLTextAreaElement;
const vmixApiUrlInput = document.getElementById('vmix-api-url-input') as HTMLInputElement;
const customParentFolderInput = document.getElementById(
    'custom-parent-folder-input',
) as HTMLInputElement;

const enableBusInput = document.getElementById('enable-bus-input') as HTMLInputElement;
const collapseInputsInput = document.getElementById('collapse-inputs-input') as HTMLInputElement;
const programCamInput = document.getElementById('program-cam-input') as HTMLInputElement;
const previewCamInput = document.getElementById('preview-cam-input') as HTMLInputElement;
const transitionTypeInput = document.getElementById('transition-type-input') as HTMLInputElement;
const closeVmixWebBtn = document.getElementById('close-vmix-web-btn')!;
const documentationModal = document.getElementById('documentation-modal') as HTMLDialogElement;
const homeConfigModeInput = document.getElementById('home-config-mode-input') as HTMLInputElement;
const homeVmixModeInput = document.getElementById('home-vmix-mode-input') as HTMLInputElement;
const configModeFields = document.getElementById('config-mode-fields')!;
const vmixModeFields = document.getElementById('vmix-mode-fields')!;
const customParentFolderRow = document.getElementById('custom-parent-folder-row')!;
const defaultBasePresetRow = document.getElementById('default-base-preset-row')!;
const editConfigBtn = document.getElementById('edit-config-btn') as HTMLButtonElement;
const createPresetBtn = document.getElementById('create-preset-btn') as HTMLButtonElement;
const playFolderBtn = document.getElementById('play-folder-btn') as HTMLButtonElement;
const openVmixBtn = document.getElementById('open-vmix-btn') as HTMLButtonElement;
const selectBaseFileBtn = document.getElementById('select-base-file-btn') as HTMLButtonElement;
const selectPlayFolderBtn = document.getElementById('select-play-folder-btn') as HTMLButtonElement;

// ===== Navigation =====

let programStream: MediaStream | null = null;
let previewStream: MediaStream | null = null;
const programVideo = document.getElementById('program-video') as HTMLVideoElement;
const previewVideo = document.getElementById('preview-video') as HTMLVideoElement;

const loadingPage = document.getElementById('loading-page')!;
const homePage = document.getElementById('home-page')!;
const configPage = document.getElementById('config-page')!;
const vmixPage = document.getElementById('vmix-page')!;

function goToLoadingPage(seconds: number) {
    configPage.classList.add('hidden');
    vmixPage.classList.add('hidden');
    homePage.classList.add('hidden');
    loadingPage.classList.remove('hidden');

    const quoteEl = document.getElementById('loading-quote')!;
    const progressEl = document.getElementById('loading-progress') as HTMLProgressElement;
    quoteEl.textContent = `“${getRandomQuote()}”`;
    progressEl.value = 0;
    const totalMs = seconds * 1000;
    const start = Date.now();

    const interval = setInterval(() => {
        const elapsed = Date.now() - start;
        const percent = Math.min((elapsed / totalMs) * 100, 100);
        progressEl.value = percent;
        if (elapsed >= totalMs) clearInterval(interval);
    }, 100);
}

function goToHomePage() {
    loadingPage.classList.add('hidden');
    configPage.classList.add('hidden');
    vmixPage.classList.add('hidden');
    homePage.classList.remove('hidden');
    requestAnimationFrame(resizePathInputs);
}

function goToConfigPage() {
    loadingPage.classList.add('hidden');
    homePage.classList.add('hidden');
    vmixPage.classList.add('hidden');
    configPage.classList.remove('hidden');
}

async function goToVmixPage() {
    const res = await (window as any).api.getVmixState(getVmixApiUrl());

    if (res.error) {
        showErrorAlert(
            'Could not connect to vMix. Make sure it is running and HTTP API is enabled.\n\n' +
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
    ENABLE_BUS: 'enableBus',
    COLLAPSE_INPUTS: 'collapseInputs',
    TRANSITION_TYPE: 'transitionType',
    PROGRAM_CAM: 'programCam',
    PREVIEW_CAM: 'previewCam',
    BASE_FILE: 'baseFile',
    CUSTOM_PARENT_FOLDER: 'customParentFolder',
    VMIX_API_URL: 'vmixApiUrl',
    RECENT_FOLDERS: 'recentFolders',
};

function getRecentFolders(): string[] {
    const data = localStorage.getItem(STORAGE_KEYS.RECENT_FOLDERS);
    return data ? JSON.parse(data) : [];
}

function addRecentFolder(folder: string) {
    const folders = getRecentFolders();

    const updated = [folder, ...folders.filter((f) => f !== folder)].slice(0, RECENT_FOLDERS_LIMIT);

    localStorage.setItem(STORAGE_KEYS.RECENT_FOLDERS, JSON.stringify(updated));
    renderRecentFolders();
}

function setPlayFolder(folder: string) {
    playFolderInput.value = folder;
    resizeTextArea(playFolderInput);
}

function setBaseFile(file: string) {
    baseFileInput.value = file;
    resizeTextArea(baseFileInput);
}

function resizeTextArea(textArea: HTMLTextAreaElement) {
    if (textArea.offsetParent === null) return;

    textArea.style.height = 'auto';
    textArea.style.height = `${textArea.scrollHeight}px`;
}

function resizePathInputs() {
    resizeTextArea(baseFileInput);
    resizeTextArea(playFolderInput);
}

baseFileInput.addEventListener('input', () => resizeTextArea(baseFileInput));
playFolderInput.addEventListener('input', () => resizeTextArea(playFolderInput));
window.addEventListener('resize', resizePathInputs);
enableBusInput.addEventListener('input', () => {
    localStorage.setItem(STORAGE_KEYS.ENABLE_BUS, enableBusInput.value);
});
collapseInputsInput.addEventListener('input', () => {
    localStorage.setItem(STORAGE_KEYS.COLLAPSE_INPUTS, collapseInputsInput.value);
});
programCamInput.addEventListener('input', () => {
    localStorage.setItem(STORAGE_KEYS.PROGRAM_CAM, programCamInput.value);
});
previewCamInput.addEventListener('input', () => {
    localStorage.setItem(STORAGE_KEYS.PREVIEW_CAM, previewCamInput.value);
});
transitionTypeInput.addEventListener('input', () => {
    localStorage.setItem(STORAGE_KEYS.TRANSITION_TYPE, transitionTypeInput.value);
});
vmixApiUrlInput.addEventListener('input', () => {
    localStorage.setItem(STORAGE_KEYS.VMIX_API_URL, vmixApiUrlInput.value);
});
customParentFolderInput.addEventListener('input', () => {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_PARENT_FOLDER, customParentFolderInput.value);
});

function updateHomeMode() {
    const isVmixMode = homeVmixModeInput.checked;

    configModeFields.classList.toggle('hidden', isVmixMode);
    configModeFields.classList.toggle('flex', !isVmixMode);
    vmixModeFields.classList.toggle('hidden', !isVmixMode);
    vmixModeFields.classList.toggle('flex', isVmixMode);
    customParentFolderRow.classList.toggle('hidden', isVmixMode);
    defaultBasePresetRow.classList.toggle('hidden', isVmixMode);
    editConfigBtn.classList.toggle('hidden', isVmixMode);
    createPresetBtn.classList.toggle('hidden', isVmixMode);
    playFolderBtn.classList.toggle('hidden', !isVmixMode);
    openVmixBtn.classList.toggle('hidden', !isVmixMode);
}

homeConfigModeInput.addEventListener('change', updateHomeMode);
homeVmixModeInput.addEventListener('change', updateHomeMode);

function init() {
    homeConfigModeInput.checked = true;
    homeVmixModeInput.checked = false;
    enableBusInput.value = localStorage.getItem(STORAGE_KEYS.ENABLE_BUS) ?? 'A';
    collapseInputsInput.value = localStorage.getItem(STORAGE_KEYS.COLLAPSE_INPUTS) ?? '0';
    transitionTypeInput.value = localStorage.getItem(STORAGE_KEYS.TRANSITION_TYPE) ?? 'Stinger1';
    programCamInput.value = localStorage.getItem(STORAGE_KEYS.PROGRAM_CAM) ?? '';
    previewCamInput.value = localStorage.getItem(STORAGE_KEYS.PREVIEW_CAM) ?? '';
    vmixApiUrlInput.value = localStorage.getItem(STORAGE_KEYS.VMIX_API_URL) ?? '';
    customParentFolderInput.value = localStorage.getItem(STORAGE_KEYS.CUSTOM_PARENT_FOLDER) ?? '';

    setBaseFile(localStorage.getItem(STORAGE_KEYS.BASE_FILE) ?? '');
    setPlayFolder(getRecentFolders()[0] ?? '');
    updateHomeMode();
    renderRecentFolders();
}

function getVmixApiUrl() {
    return vmixApiUrlInput.value.trim();
}

// ===== Page Zooming like in Chrome =====
const container = document.getElementById('zoom-ui') as HTMLDivElement;
const zoomLabel = document.getElementById('zoom-level') as HTMLSpanElement;
const btnIn = document.getElementById('zoom-in') as HTMLButtonElement;
const btnOut = document.getElementById('zoom-out') as HTMLButtonElement;

let hideTimer: number | null = null;

function show() {
    container.classList.remove('hidden');

    requestAnimationFrame(() => {
        container.classList.remove('opacity-0', 'scale-90');
        container.classList.add('opacity-100', 'scale-100');
    });

    if (hideTimer) clearTimeout(hideTimer);

    hideTimer = window.setTimeout(() => {
        container.classList.add('opacity-0');

        setTimeout(() => {
            container.classList.add('hidden');
        }, 200);
    }, 3000);
}

// Button handlers
btnIn.onclick = () => (window as any).api.zoomIn();
btnOut.onclick = () => (window as any).api.zoomOut();

// Listen to zoom updates
(window as any).api.onChange((z: number) => {
    zoomLabel.textContent = `${Math.round(z * 100)}%`;
    show();
});

// Detect zoom key presses
window.addEventListener('keydown', (e) => {
    if (!e.ctrlKey && !e.metaKey) return;

    // Normalize keys
    const key = e.key;

    if (key === '=' || key === '+') {
        e.preventDefault();
        (window as any).api.zoomIn();
    }

    if (key === '-') {
        e.preventDefault();
        (window as any).api.zoomOut();
    }

    if (e.code === 'Digit0' || e.code === 'Numpad0') {
        e.preventDefault();
        (window as any).api.zoomReset();
    }
});

// ===== Home Page =====
async function loadDevices() {
    const devices = (await navigator.mediaDevices.enumerateDevices()).filter((d) =>
        d.label.includes('vMix'),
    );

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
            setPlayFolder(folder);
        });

        tr.appendChild(td);

        // Add delete button
        const deleteTd = document.createElement('td');
        deleteTd.className = 'w-5';

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '✕';
        deleteBtn.className = 'btn btn-error btn-soft btn-xs'; // Basic styling for delete button
        deleteBtn.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent triggering the folder click event
            removeRecentFolder(folder);
        });
        deleteTd.appendChild(deleteBtn);
        tr.appendChild(deleteTd);

        tBody.appendChild(tr);
    });
}

function removeRecentFolder(folderPath: string) {
    const folders = getRecentFolders();
    const updatedFolders = folders.filter((folder) => folder !== folderPath);
    localStorage.setItem(STORAGE_KEYS.RECENT_FOLDERS, JSON.stringify(updatedFolders));
    renderRecentFolders(); // Re-render the list after deletion
}

document
    .getElementById('documentation-btn')!
    .addEventListener('click', () => documentationModal.showModal());

editConfigBtn.addEventListener('click', async () => {
    const folderPath = playFolderInput.value;

    if (!folderPath) {
        alert('Please select the content folder.');
        return;
    }

    editConfigBtn.disabled = true;
    try {
        const state = await (window as any).api.getFolderState(folderPath);
        renderConfigPage(state);
        addRecentFolder(folderPath);
        goToConfigPage();
    } catch (err) {
        console.error(err);
    }
    editConfigBtn.disabled = false;
});

selectBaseFileBtn.addEventListener('click', async () => {
    selectBaseFileBtn.disabled = true;

    try {
        const file = await (window as any).api.selectBaseFile();

        if (file) {
            setBaseFile(file);
            localStorage.setItem(STORAGE_KEYS.BASE_FILE, file);
        }
    } catch (err) {
        showErrorAlert(err);
    } finally {
        selectBaseFileBtn.disabled = false;
    }
});

document.getElementById('clear-base-file-btn')!.addEventListener('click', () => {
    setBaseFile('');
    localStorage.setItem(STORAGE_KEYS.BASE_FILE, '');
});

selectPlayFolderBtn.addEventListener('click', async () => {
    selectPlayFolderBtn.disabled = true;

    try {
        const folder = await (window as any).api.selectPlayFolder(playFolderInput.value.trim());

        if (folder) {
            setPlayFolder(folder);
            addRecentFolder(folder);
        }
    } catch (err) {
        showErrorAlert(err);
    } finally {
        selectPlayFolderBtn.disabled = false;
    }
});

document
    .getElementById('clear-play-folder-btn')!
    .addEventListener('click', () => setPlayFolder(''));

function sleep(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
}

createPresetBtn.addEventListener('click', async () => {
    const baseFile = baseFileInput.value;
    const folderPath = playFolderInput.value;

    if (!folderPath) {
        alert('Please select the content folder.');
        return;
    }

    addRecentFolder(folderPath);
    createPresetBtn.disabled = true;

    const enableBus = enableBusInput.value;
    const collapse = collapseInputsInput.value === '1';
    const customParentFolder = customParentFolderInput.value.trim();
    try {
        const reports: { folder: string; alerts: any[] }[] = await (window as any).api.createPreset(
            folderPath,
            baseFile,
            enableBus,
            collapse,
            customParentFolder,
        );

        const alertsList = document.getElementById('home-alerts-list')!;
        alertsList.innerHTML = ''; // Clear previous alerts

        if (!reports || reports.length === 0) {
            showErrorAlert('No folders with `folder-player.txt` config file found.');
            return;
        }

        const folderText = reports.length === 1 ? 'folder' : 'folders';
        document.getElementById('preset-creation-summary')!.textContent =
            `Created presets for ${reports.length} ${folderText}`;

        const allAlerts = reports.flatMap((r) => r.alerts);
        const totalErrors = allAlerts.filter((a) => a.type === 'error').length;
        const totalWarnings = allAlerts.filter((a) => a.type === 'warning').length;
        const summaryContainer = document.getElementById('preset-report-summary')!;

        if (totalErrors === 0 && totalWarnings === 0) {
            summaryContainer.innerHTML = '<p class="text-success">No issues found.</p>';
        } else {
            summaryContainer.innerHTML = `
                <div class="flex justify-start items-center space-x-4">
                    <p class="text-error font-semibold">Errors: <span>${totalErrors}</span></p>
                    <p class="text-warning font-semibold">Warnings: <span>${totalWarnings}</span></p>
                </div>
            `;
        }

        reports.forEach((report) => {
            const folderReportDiv = document.createElement('div');
            folderReportDiv.className = 'mb-4 p-3 bg-base-200 rounded-box';

            let html = `
                <div class="flex justify-between items-center mb-2">
                    <h3 class="text-md font-bold">Folder: <span class="font-normal">${report.folder}</span></h3>
                    ${report.alerts && report.alerts.length > 0 ? '' : '<p class="text-success">No issues found.</p>'}
                </div>
            `;
            if (report.alerts && report.alerts.length > 0) {
                html += '<ul class="space-y-2">';
                html += report.alerts
                    .map(
                        (alert) => `
                        <li class="flex items-start">
                            <span class="${alert.type === 'error' ? 'text-error' : 'text-warning'} mr-2">${alert.type === 'error' ? '❌' : '⚠️'}</span>
                            <p><strong>${capitalize(alert.type)}</strong>${alert.key ? ` in <strong>${alert.key}</strong>` : ''}: ${alert.msg}</p>
                        </li>`,
                    )
                    .join('');
                html += '</ul>';
            }

            folderReportDiv.innerHTML = html;
            alertsList.appendChild(folderReportDiv);
        });

        (document.getElementById('create-preset-alerts') as any).showModal();
    } catch (err) {
        showErrorAlert(err);
    } finally {
        createPresetBtn.disabled = false;
    }
});

playFolderBtn.addEventListener('click', async () => {
    const baseFile = baseFileInput.value;
    const folderPath = playFolderInput.value;
    const collapse = collapseInputsInput.value === '1';

    if (!folderPath) {
        alert('Please select the content folder.');
        return;
    }

    const res = await (window as any).api.getVmixState(getVmixApiUrl());

    if (res.error) {
        showErrorAlert(
            'Could not connect to vMix. Make sure it is running and HTTP API is enabled.\n\n' +
                res.error,
        );
        return;
    }

    addRecentFolder(folderPath);

    const enableBus = enableBusInput.value;
    try {
        goToLoadingPage(10);
        await (window as any).api.playFolder(
            folderPath,
            baseFile,
            enableBus,
            collapse,
            getVmixApiUrl(),
        );
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
        showErrorAlert('Content folder is not found.');
        return;
    }
    saveConfigBtn.disabled = true;
    try {
        const config = getTableConfig();
        await (window as any).api.saveFolderConfig({ folderPath: folderPath, text: config });
        showSuccessAlert('Config Saved');
    } catch (err) {
        showErrorAlert(err);
    }
    saveConfigBtn.disabled = false;
});

// ===== vMix Page =====
openVmixBtn.addEventListener('click', goToVmixPage);

closeVmixWebBtn.addEventListener('click', () => {
    const res = confirm('Are you sure you want to close vMix Web?');
    if (res) goToHomePage();
});

async function fetchVmixState() {
    return await (window as any).api.getVmixState(getVmixApiUrl());
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
