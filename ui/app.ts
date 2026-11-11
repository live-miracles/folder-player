import { getTableConfig, renderConfigPage } from './config.js';
import {
    showErrorAlert,
    showSuccessAlert,
    escapeHtml,
    getAlertItemHtml,
    getReportSummaryHtml,
} from './utils.js';
import type { Alert } from './types.js';

const RECENT_FOLDERS_LIMIT = 50;
type ReportAlert = Alert;

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
    updateText.innerText = 'A new version is ready to download.';
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
const playFolderInput = document.getElementById('play-folder-input') as HTMLTextAreaElement;
const customParentFolderInput = document.getElementById(
    'custom-parent-folder-input',
) as HTMLInputElement;

const enableBusInput = document.getElementById('enable-bus-input') as HTMLInputElement;
const collapseInputsInput = document.getElementById('collapse-inputs-input') as HTMLInputElement;
const editConfigBtn = document.getElementById('edit-config-btn') as HTMLButtonElement;
const createPresetBtn = document.getElementById('create-preset-btn') as HTMLButtonElement;
const selectPlayFolderBtn = document.getElementById('select-play-folder-btn') as HTMLButtonElement;

// ===== Navigation =====

const homePage = document.getElementById('home-page')!;
const configPage = document.getElementById('config-page')!;

function goToHomePage() {
    configPage.classList.add('hidden');
    homePage.classList.remove('hidden');
    requestAnimationFrame(resizePathInputs);
}

function goToConfigPage() {
    homePage.classList.add('hidden');
    configPage.classList.remove('hidden');
}

// ===== Local Storage =====
const STORAGE_KEYS = {
    ENABLE_BUS: 'enableBus',
    COLLAPSE_INPUTS: 'collapseInputs',
    PLAY_FOLDER: 'playFolder',
    CUSTOM_PARENT_FOLDER: 'customParentFolder',
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
    localStorage.setItem(STORAGE_KEYS.PLAY_FOLDER, folder);
    resizeTextArea(playFolderInput);
    renderRecentFolders();
}

function resizeTextArea(textArea: HTMLTextAreaElement) {
    if (textArea.offsetParent === null) return;

    textArea.style.height = 'auto';
    textArea.style.height = `${textArea.scrollHeight}px`;
}

function resizePathInputs() {
    resizeTextArea(playFolderInput);
}

playFolderInput.addEventListener('input', () => {
    localStorage.setItem(STORAGE_KEYS.PLAY_FOLDER, playFolderInput.value);
    resizeTextArea(playFolderInput);
});
window.addEventListener('resize', resizePathInputs);
enableBusInput.addEventListener('input', () => {
    localStorage.setItem(STORAGE_KEYS.ENABLE_BUS, enableBusInput.value);
});
collapseInputsInput.addEventListener('input', () => {
    localStorage.setItem(STORAGE_KEYS.COLLAPSE_INPUTS, collapseInputsInput.value);
});
customParentFolderInput.addEventListener('input', () => {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_PARENT_FOLDER, customParentFolderInput.value);
});

function init() {
    enableBusInput.value = localStorage.getItem(STORAGE_KEYS.ENABLE_BUS) ?? 'A';
    collapseInputsInput.value = localStorage.getItem(STORAGE_KEYS.COLLAPSE_INPUTS) ?? '0';
    customParentFolderInput.value = localStorage.getItem(STORAGE_KEYS.CUSTOM_PARENT_FOLDER) ?? '';

    setPlayFolder(localStorage.getItem(STORAGE_KEYS.PLAY_FOLDER) ?? getRecentFolders()[0] ?? '');
    renderRecentFolders();
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
function renderRecentFolders() {
    const folders = getRecentFolders();
    const current = playFolderInput.value.trim();

    const list = document.getElementById('recent-folders-table')!;
    list.innerHTML = '';
    document.getElementById('recent-folders-count')!.textContent = folders.length
        ? String(folders.length)
        : '';

    if (folders.length === 0) {
        const empty = document.createElement('li');
        empty.className = 'px-3 py-6 text-center text-[13px] text-ink-faint';
        empty.textContent = 'Folders you open will show up here.';
        list.appendChild(empty);
        return;
    }

    folders.forEach((folder) => {
        const isCurrent = folder === current;
        const li = document.createElement('li');
        li.className = `group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-1.5 transition-colors hover:bg-surface-3 ${isCurrent ? 'bg-surface-2' : ''}`;
        li.title = folder;
        li.innerHTML = `
            <i data-lucide="${isCurrent ? 'folder-open' : 'folder'}" class="h-4 w-4 shrink-0 ${isCurrent ? 'text-accent-ink' : 'text-ink-faint'}"></i>
            <span class="min-w-0 flex-1 truncate text-[13px] ${isCurrent ? 'text-ink' : 'text-ink-muted'}"></span>`;
        li.querySelector('span')!.textContent = folder;

        // Click to reuse folder
        li.addEventListener('click', () => setPlayFolder(folder));

        const deleteBtn = document.createElement('button');
        deleteBtn.className =
            'btn btn-sm btn-ghost btn-icon opacity-0 group-hover:opacity-100 hover:text-danger';
        deleteBtn.title = 'Remove from recent';
        deleteBtn.setAttribute('aria-label', 'Remove from recent');
        deleteBtn.innerHTML = '<i data-lucide="x"></i>';
        deleteBtn.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent triggering the folder click event
            removeRecentFolder(folder);
        });
        li.appendChild(deleteBtn);

        list.appendChild(li);
    });

    (window as any).lucide?.createIcons();
}

function removeRecentFolder(folderPath: string) {
    const folders = getRecentFolders();
    const updatedFolders = folders.filter((folder) => folder !== folderPath);
    localStorage.setItem(STORAGE_KEYS.RECENT_FOLDERS, JSON.stringify(updatedFolders));
    renderRecentFolders(); // Re-render the list after deletion
}

editConfigBtn.addEventListener('click', async () => {
    const folderPath = playFolderInput.value;

    if (!folderPath) {
        alert('Please select the content folder.');
        return;
    }

    editConfigBtn.disabled = true;
    try {
        const state = await (window as any).api.getFolderState(folderPath);
        configFolderStack = [folderPath];
        updateConfigBackButton();
        renderConfigPage(state);
        addRecentFolder(folderPath);
        goToConfigPage();
    } catch (err) {
        const message =
            err instanceof Error
                ? err.message.replace(
                      /^Error invoking remote method 'get-folder-state': Error: /,
                      '',
                  )
                : String(err);
        showErrorAlert(`Could not open config for this folder.\n\n${message}`);
    } finally {
        editConfigBtn.disabled = false;
    }
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

createPresetBtn.addEventListener('click', async () => {
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
        const reports: { folder: string; baseFile: string | null; alerts: ReportAlert[] }[] =
            await (window as any).api.createPreset(
                folderPath,
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
            summaryContainer.innerHTML = '<span class="chip chip-success">No issues</span>';
        } else {
            summaryContainer.innerHTML = getReportSummaryHtml(totalErrors, totalWarnings);
        }

        reports.forEach((report) => {
            const folderReportDiv = document.createElement('div');
            folderReportDiv.className = 'rounded-xl border border-line bg-surface-2 p-4';

            let html = `
                <div class="flex items-start justify-between gap-4">
                    <div class="min-w-0">
                      <h3 class="flex items-center gap-2 font-semibold"><i data-lucide="folder" class="h-4 w-4 shrink-0 text-ink-faint"></i><span class="truncate" title="${escapeHtml(report.folder)}">${escapeHtml(report.folder)}</span></h3>
                      <p class="mt-0.5 truncate pl-6 text-xs text-ink-subtle" title="${escapeHtml(report.baseFile ?? 'Base preset not found')}">Base: ${escapeHtml(report.baseFile ?? 'Not found')}</p>
                    </div>
                    ${report.alerts && report.alerts.length > 0 ? '' : '<span class="chip chip-success shrink-0">No issues</span>'}
                </div>
            `;
            if (report.alerts && report.alerts.length > 0) {
                html += `<ul class="mt-3 space-y-2.5 border-t border-line pt-3">${report.alerts.map(getAlertItemHtml).join('')}</ul>`;
            }

            folderReportDiv.innerHTML = html;
            alertsList.appendChild(folderReportDiv);
        });

        (window as any).lucide?.createIcons();

        (document.getElementById('create-preset-alerts') as any).showModal();
    } catch (err) {
        showErrorAlert(err);
    } finally {
        createPresetBtn.disabled = false;
    }
});

// ===== Config Page =====

// Folders opened on the config page; the last one is shown. Subfolder playlists push onto it.
let configFolderStack: string[] = [];
const cancelConfigBtn = document.getElementById('cancel-config-btn') as HTMLButtonElement;

function getConfigFolder() {
    return configFolderStack[configFolderStack.length - 1] ?? playFolderInput.value;
}

function updateConfigBackButton() {
    const label = configFolderStack.length > 1 ? 'Back to parent folder' : 'Back';
    cancelConfigBtn.title = label;
    cancelConfigBtn.setAttribute('aria-label', label);
}

async function showConfigFolder(folderPath: string) {
    const state = await (window as any).api.getFolderState(folderPath);
    renderConfigPage(state);
    updateConfigBackButton();
}

cancelConfigBtn.addEventListener('click', async () => {
    if (configFolderStack.length <= 1) {
        configFolderStack = [];
        goToHomePage();
        return;
    }
    configFolderStack.pop();
    try {
        await showConfigFolder(getConfigFolder());
    } catch (err) {
        showErrorAlert(err);
    }
});

document.addEventListener('open-config-folder', async (event) => {
    const folderPath = (event as CustomEvent<string>).detail;
    configFolderStack.push(folderPath);
    try {
        await showConfigFolder(folderPath);
        document.querySelector('#config-page .overflow-y-auto')?.scrollTo(0, 0);
    } catch (err) {
        configFolderStack.pop();
        showErrorAlert(err);
    }
});

const saveConfigBtn = document.getElementById('save-config-btn') as HTMLButtonElement;
const refreshConfigBtn = document.getElementById('refresh-config-btn') as HTMLButtonElement;
refreshConfigBtn.addEventListener('click', async () => {
    const folderPath = getConfigFolder();

    if (!folderPath) {
        showErrorAlert('Content folder is not found.');
        return;
    }

    refreshConfigBtn.disabled = true;
    try {
        const state = await (window as any).api.getFolderState(folderPath);
        renderConfigPage(state);
    } catch (err) {
        showErrorAlert(err);
    } finally {
        refreshConfigBtn.disabled = false;
    }
});

saveConfigBtn.addEventListener('click', async () => {
    const folderPath = getConfigFolder();

    if (!folderPath) {
        showErrorAlert('Content folder is not found.');
        return;
    }
    saveConfigBtn.disabled = true;
    try {
        const config = getTableConfig();
        await (window as any).api.saveFolderConfig({ folderPath: folderPath, text: config });
        showSuccessAlert('Config Saved');
        // Reload so the saved options, alerts and Save button state all reflect the file
        renderConfigPage(await (window as any).api.getFolderState(folderPath));
    } catch (err) {
        showErrorAlert(err);
        saveConfigBtn.disabled = false;
    }
});

init();
