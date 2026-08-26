import { capitalize } from './utils.js';
import type { Alert } from './types.js';
export const FILE_TYPES = {
    IMAGE: 'Image',
    VIDEO: 'Video',
    AUDIO: 'AudioFile',
    FOLDER: 'Photos',
    POWERPOINT: 'PowerPoint',
};
const TYPE_MAP = { Video: 1, AudioFile: 2, Image: 3, Photos: 4, PowerPoint: 5 };
const ALERT = { ERROR: 'error', WARNING: 'warning' };
const VIDEO_PREVIEW_FALLBACK_SECONDS = 5;
const BLACK_FRAME_LUMA_THRESHOLD = 18;
const BLACK_FRAME_RATIO_THRESHOLD = 0.96;
const OPTION_META: Record<string, { icon: string; label: string }> = {
    cam: { icon: 'video', label: 'Camera' },
    mic: { icon: 'mic', label: 'Microphone' },
    loop: { icon: 'repeat', label: 'Loop' },
};

type ConfigFile = { path: string; type: string };
type ConfigEntry = [string, ConfigFile[]];
type ConfigAlert = Alert & { key: string };
type ConfigState = {
    folder: string;
    files: ConfigEntry[];
    config: [string, string[]][] | null;
    alerts: ConfigAlert[];
};
type ConfigViewMode = 'list' | 'preview';
const CONFIG_VIEW_STORAGE_KEY = 'configViewMode';

const configCard = document.getElementById('config-card')!;
const configCardBody = document.getElementById('config-card-body')!;
const configListView = document.getElementById('config-list-view')!;
const configPreviewScroll = document.getElementById('config-preview-scroll')!;
const configPreviewView = document.getElementById('config-preview-view')!;
const configListViewBtn = document.getElementById('config-list-view-btn') as HTMLButtonElement;
const configPreviewViewBtn = document.getElementById(
    'config-preview-view-btn',
) as HTMLButtonElement;
const configTable = document.getElementById('config-table') as HTMLTableSectionElement;

let currentConfigState: ConfigState | null = null;
let configViewMode: ConfigViewMode = getStoredConfigViewMode();

function getLeadingNumbers(text: string) {
    const match = text.match(/^(\d+)(?:_(\d+))?/);
    if (!match) return [-1, -1];

    const first = Number(match[1]);
    const second = match[2] !== undefined ? Number(match[2]) : -1;

    return [first, second];
}

function compareFiles(a: string, b: string) {
    const [a1, a2] = getLeadingNumbers(a);
    const [b1, b2] = getLeadingNumbers(b);
    if (a1 === -1 && a2 === -1) return 0;
    if (a1 === -1) return 1;
    if (b1 === -1) return -1;
    if (a1 !== b1) return a1 - b1;
    if (a2 !== b2) return a2 - b2;
    return a.localeCompare(b);
}

function getStoredConfigViewMode(): ConfigViewMode {
    return localStorage.getItem(CONFIG_VIEW_STORAGE_KEY) === 'preview' ? 'preview' : 'list';
}

export function renderConfigPage(state: ConfigState) {
    currentConfigState = state;
    renderConfigTitle(state.folder);

    renderFolderAlerts(state.alerts);

    renderConfigContent();
}

function renderConfigContent() {
    if (!currentConfigState) return;

    configTable.innerHTML = '';
    configPreviewView.innerHTML = '';

    currentConfigState.files.sort((a, b) => compareFiles(a[0], b[0]));
    const configMap = new Map(currentConfigState.config);

    updateConfigViewButtons();
    updateConfigPageLayout();
    configListView.classList.toggle('hidden', configViewMode !== 'list');
    configPreviewScroll.classList.toggle('hidden', configViewMode !== 'preview');
    configPreviewScroll.classList.toggle('block', configViewMode === 'preview');
    configPreviewView.classList.toggle('hidden', configViewMode !== 'preview');
    configPreviewView.classList.toggle('grid', configViewMode === 'preview');

    if (configViewMode === 'preview') renderPreviewConfig(configMap);
    else renderListConfig(configMap);

    setupCamMicLogic();
    setupVideoPreviewFrames();
    renderDynamicIcons();
}

function renderListConfig(configMap: Map<string, string[]>) {
    let html = '';

    let i = 0;
    for (const [key, files] of currentConfigState!.files) {
        files.sort((a: any, b: any) => (TYPE_MAP as any)[a.type] - (TYPE_MAP as any)[b.type]);
        const types = files.map((f) => f.type);
        const optionsHtml = getOptionsHtml(key, types, configMap.get(key) ?? []);

        let rowColor = i++ % 2 === 0 ? 'bg-base-300/30' : '';

        const tab = '&nbsp;&nbsp;&nbsp⤷&nbsp;&nbsp;&nbsp;';
        const applyTab =
            types.filter((t) => t === FILE_TYPES.AUDIO).length +
                types.filter((t) => t === FILE_TYPES.VIDEO).length ===
            1;
        files.forEach((file, i) => {
            html += `<tr class="${rowColor}">`;
            if (i === 0) {
                html += `<td rowspan="${files.length}" class="align-middle font-semibold">${key}</td>`;
            }
            const subType = file.type !== FILE_TYPES.AUDIO && file.type !== FILE_TYPES.VIDEO;
            html += `<td class="break-all">${applyTab && subType ? tab : ''}${getFileName(file.path)}</td>`;
            html += `<td class="break-all w-30">${getFileTypeHtml(file.type, key)}</td>`;
            if (i === 0) html += `<td class="w-120" rowspan="${files.length}">${optionsHtml}</td>`;
            html += `</tr>`;
        });
    }

    configTable.innerHTML = html;
}

function renderPreviewConfig(configMap: Map<string, string[]>) {
    configPreviewView.innerHTML = currentConfigState!.files
        .map(([key, files]) => {
            files.sort((a: any, b: any) => (TYPE_MAP as any)[a.type] - (TYPE_MAP as any)[b.type]);
            const types = files.map((f) => f.type);
            const selectedOptions = configMap.get(key) ?? [];
            const optionsHtml = getOptionsHtml(key, types, selectedOptions);
            const previewFiles = getPreviewFiles(files);
            const hasCameraBackground = selectedOptions.includes('cam');

            return `<section class="flex flex-col overflow-hidden rounded-lg border border-base-content/15 bg-base-100/80 shadow-sm">
                <div class="space-y-1 border-b border-base-content/10 p-2">
                    <div class="flex min-h-8 flex-wrap items-center justify-end gap-1">${optionsHtml}</div>
                    ${files.map((file) => getPreviewFileHeaderHtml(file, key)).join('')}
                </div>
                <div class="grid ${previewFiles.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} bg-base-300/30">
                    ${previewFiles.map((file) => getPreviewPaneHtml(file, hasCameraBackground)).join('')}
                </div>
            </section>`;
        })
        .join('');
}

function getOptionsHtml(key: string, types: string[], selectedOptions: string[]) {
    let optionsHtml = '';

    const isCam = selectedOptions.includes('cam') ? 'true' : 'false';
    optionsHtml += getBoolOptionHtml('cam', isCam, key);

    const isMic = selectedOptions.includes('mic') ? 'true' : 'false';
    optionsHtml += getBoolOptionHtml('mic', isMic, key);

    if (types.includes(FILE_TYPES.AUDIO) || types.includes(FILE_TYPES.VIDEO)) {
        const isLoop = selectedOptions.includes('loop') ? 'true' : 'false';
        optionsHtml += getBoolOptionHtml('loop', isLoop, key);

        const opt = selectedOptions.find((opt) => opt.endsWith('%')) ?? '100';
        const parsed = parseInt(opt);
        optionsHtml += getNumberOptionHtml(
            '%',
            isNaN(parsed) ? '100' : String(parsed),
            key,
            0,
            1000,
        );
    }
    if (types.includes(FILE_TYPES.FOLDER) || types.includes(FILE_TYPES.POWERPOINT)) {
        const opt = selectedOptions.find((opt) => opt.endsWith('s')) ?? '10';
        const parsed = parseInt(opt);
        optionsHtml += getNumberOptionHtml(
            's',
            isNaN(parsed) ? '10' : String(parsed),
            key,
            1,
            1000,
        );
    }

    return optionsHtml;
}

function renderFolderAlerts(alerts: ConfigAlert[]) {
    const errorNum = alerts.filter((a) => a.type === ALERT.ERROR).length;
    const warningNum = alerts.filter((a) => a.type === ALERT.WARNING).length;

    const configReportSummary = document.getElementById('config-report-summary')!;
    const alertsListElement = document.getElementById('config-alerts-list')!;
    const configAlertsElement = document.getElementById('config-alerts')!;
    const configListViewElement = document.getElementById('config-list-view')!;

    if (errorNum === 0 && warningNum === 0) {
        configAlertsElement.classList.add('hidden');
        configListViewElement.classList.remove('mt-3');
        configReportSummary.innerHTML = '';
        alertsListElement.innerHTML = ''; // Clear any previous alerts
    } else {
        configAlertsElement.classList.remove('hidden');
        configListViewElement.classList.add('mt-3');
        configReportSummary.innerHTML = `
            <div class="flex justify-start items-center space-x-4">
                <p class="text-error font-semibold">Errors: <span id="config-error-cnt">${errorNum}</span></p>
                <p class="text-warning font-semibold">Warnings: <span id="config-warning-cnt">${warningNum}</span></p>
            </div>
        `;
        alertsListElement.innerHTML = alerts
            .map(
                (alert) => `
                    <li class="flex items-start">
                        <span class="text-error mr-2">${alert.type === ALERT.ERROR ? '❌' : '⚠️'}</span>
                        <div>
                            <p><strong>${capitalize(alert.type)}</strong>${alert.key ? ` in <strong>${alert.key}</strong>` : ''}: ${escapeHtml(alert.msg)}</p>
                            ${getAlertFilesHtml(alert)}
                        </div>
                    </li>`,
            )
            .join('');
    }
}

function getFileName(path: string) {
    const parts = path.replace(/\\/g, '/').split('/').filter(Boolean);
    return parts.slice(-1)[0];
}

function escapeHtml(text: string) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getAlertFilesHtml(alert: ConfigAlert) {
    if (!alert.files || alert.files.length === 0) return '';

    const files = alert.files
        .map((file) => `<span class="badge badge-soft">${escapeHtml(file)}</span>`)
        .join('');

    return `<div class="mt-1 flex flex-wrap gap-1">${files}</div>`;
}

function renderConfigTitle(folder: string) {
    const title = document.getElementById('config-title')!;
    const normalized = folder.replace(/\\/g, '/');
    const lastSlashIndex = normalized.lastIndexOf('/');
    const start = lastSlashIndex >= 0 ? folder.slice(0, lastSlashIndex + 1) : '';
    const end = lastSlashIndex >= 0 ? folder.slice(lastSlashIndex + 1) : folder;

    title.title = folder;
    title.innerHTML = `<span class="flex min-w-0 max-w-full items-baseline" title="${escapeHtml(folder)}">
        <span class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">${escapeHtml(start)}</span>
        <span class="shrink-0 whitespace-nowrap">${escapeHtml(end)}</span>
    </span>`;
}

function getFileUrl(path: string) {
    const encodedPath = path
        .replace(/\\/g, '/')
        .split('/')
        .map(encodeURIComponent)
        .join('/')
        .replace(/^([A-Za-z])%3A/, '$1:');

    return `file:///${encodedPath}`;
}

function getPreviewFileHeaderHtml(file: ConfigFile, key: string) {
    const name = getFileName(file.path);

    return `<div class="flex min-w-0 items-center gap-2 text-sm">
        ${getFileTypeIconHtml(file.type, key)}
        <span class="truncate" title="${escapeHtml(name)}">${escapeHtml(name)}</span>
    </div>`;
}

function getFileTypeIconHtml(type: string, key: string) {
    let color = '';
    if (type === FILE_TYPES.AUDIO) color = 'badge-primary';
    if (type === FILE_TYPES.VIDEO) color = 'badge-secondary';
    if (type === FILE_TYPES.IMAGE) color = 'badge-accent';
    if (type === FILE_TYPES.FOLDER) color = 'badge-warning';
    if (type === FILE_TYPES.POWERPOINT) color = 'badge-info';

    return `<span class="${key ? 'config-type' : ''} badge badge-soft h-6 w-6 shrink-0 p-0 ${color}" data-key="${key}" data-type="${type}" title="${type}" aria-label="${type}">
        <i data-lucide="${getPreviewIcon(type)}" class="h-3.5 w-3.5"></i>
    </span>`;
}

function getPreviewPaneHtml(file: ConfigFile, hasCameraBackground: boolean) {
    const src = escapeHtml(getFileUrl(file.path));
    const name = escapeHtml(getFileName(file.path));
    const previewBackgroundClass = hasCameraBackground ? 'config-camera-preview-bg' : 'bg-black';

    if (file.type === FILE_TYPES.IMAGE) {
        return `<div class="config-preview-media-pane aspect-video flex items-center justify-center overflow-hidden border-base-content/10 ${previewBackgroundClass}">
            <img src="${src}" alt="${name}" class="max-h-full max-w-full object-contain" loading="lazy" />
        </div>`;
    }

    if (file.type === FILE_TYPES.VIDEO) {
        return `<div class="config-preview-media-pane aspect-video flex items-center justify-center overflow-hidden border-base-content/10 ${previewBackgroundClass}">
            <video src="${src}" class="config-preview-video max-h-full max-w-full object-contain" muted preload="metadata" playsinline></video>
        </div>`;
    }

    return `<div class="aspect-video flex flex-col items-center justify-center gap-2 border-base-content/10 p-3 text-base-content/70">
        <i data-lucide="${getPreviewIcon(file.type)}" class="h-12 w-12"></i>
        <span class="max-w-full truncate text-sm">${name}</span>
    </div>`;
}

function getPreviewFiles(files: ConfigFile[]) {
    const hasVisual = files.some(
        (file) =>
            file.type === FILE_TYPES.IMAGE ||
            file.type === FILE_TYPES.FOLDER ||
            file.type === FILE_TYPES.POWERPOINT,
    );

    if (!hasVisual) return files;
    return files.filter((file) => file.type !== FILE_TYPES.AUDIO);
}

function setupVideoPreviewFrames() {
    const videos = configPreviewView.querySelectorAll<HTMLVideoElement>('.config-preview-video');

    videos.forEach((video) => {
        video.addEventListener('loadeddata', () => updateVideoPreviewFrame(video), { once: true });
    });
}

async function updateVideoPreviewFrame(video: HTMLVideoElement) {
    try {
        video.pause();
        if (!isVideoFrameBlack(video)) return;

        if (!Number.isFinite(video.duration) || video.duration <= VIDEO_PREVIEW_FALLBACK_SECONDS) {
            return;
        }

        const firstFrameTime = video.currentTime;
        const fallbackTime = Math.min(
            VIDEO_PREVIEW_FALLBACK_SECONDS,
            Math.max(video.duration - 0.1, 0),
        );

        await seekVideo(video, fallbackTime);
        if (!isVideoFrameBlack(video)) return;

        await seekVideo(video, firstFrameTime);
    } catch {
        // Keep the browser-selected first frame if frame inspection is unavailable.
    }
}

function seekVideo(video: HTMLVideoElement, time: number) {
    return new Promise<void>((resolve, reject) => {
        const onSeeked = () => {
            cleanup();
            resolve();
        };
        const onError = () => {
            cleanup();
            reject();
        };
        const cleanup = () => {
            video.removeEventListener('seeked', onSeeked);
            video.removeEventListener('error', onError);
        };

        video.addEventListener('seeked', onSeeked, { once: true });
        video.addEventListener('error', onError, { once: true });
        video.currentTime = time;
    });
}

function isVideoFrameBlack(video: HTMLVideoElement) {
    if (video.videoWidth === 0 || video.videoHeight === 0) return false;

    const canvas = document.createElement('canvas');
    const width = 32;
    const height = Math.max(1, Math.round((video.videoHeight / video.videoWidth) * width));
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return false;

    ctx.drawImage(video, 0, 0, width, height);
    const { data } = ctx.getImageData(0, 0, width, height);
    let blackPixels = 0;

    for (let i = 0; i < data.length; i += 4) {
        const luma = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
        if (luma <= BLACK_FRAME_LUMA_THRESHOLD) blackPixels++;
    }

    return blackPixels / (data.length / 4) >= BLACK_FRAME_RATIO_THRESHOLD;
}

function getPreviewIcon(type: string) {
    if (type === FILE_TYPES.IMAGE) return 'image';
    if (type === FILE_TYPES.VIDEO) return 'film';
    if (type === FILE_TYPES.AUDIO) return 'music';
    if (type === FILE_TYPES.FOLDER) return 'images';
    if (type === FILE_TYPES.POWERPOINT) return 'presentation';
    return 'file';
}

function getBoolOptionHtml(name: string, value: string, key: string) {
    if (key === '') return '';

    const meta = OPTION_META[name] ?? { icon: 'circle', label: name };

    return `<label class="swap ml-2">
            <input data-key="${key}" data-name="${name}" class="config-option" type="checkbox" ${value === 'true' ? 'checked="checked"' : ''} />
            <div class="swap-on" title="${meta.label}" aria-label="${meta.label}">
                <span class="badge badge-primary h-7 w-7 p-0"><i data-lucide="${meta.icon}" class="h-4 w-4"></i></span>
            </div>
            <div class="swap-off" title="${meta.label}" aria-label="${meta.label}">
                <span class="badge h-7 w-7 p-0"><i data-lucide="${meta.icon}" class="h-4 w-4"></i></span>
            </div>
        </label>`;
}

function getNumberOptionHtml(name: string, value: string, key: string, min: number, max: number) {
    if (key === '') return '';

    return `<input data-key="${key}" data-name="${name}" type="number" min="${min}" max="${max}"
         class="config-option input input-sm w-14 ml-2" value="${value}" />&nbsp;${name}`;
}

function getFileTypeHtml(type: string, key: string) {
    let color = '';
    if (type === FILE_TYPES.AUDIO) color = 'badge-primary';
    if (type === FILE_TYPES.VIDEO) color = 'badge-secondary';
    if (type === FILE_TYPES.IMAGE) color = 'badge-accent';
    if (type === FILE_TYPES.FOLDER) color = 'badge-warning';
    if (type === FILE_TYPES.POWERPOINT) color = 'badge-info';

    return `<span class="${key ? 'config-type' : ''} badge badge-soft ${color}" data-key="${key}">${type}</span>`;
}

export function getTableConfig() {
    const types = document.querySelectorAll('.config-type') as NodeListOf<HTMLInputElement>;
    const typeMap = new Map<string, string[]>();

    types.forEach((elem) => {
        const key = elem.dataset.key;
        if (!key) {
            throw new Error('Type key is not defined. ' + JSON.stringify(elem.dataset));
        }
        const type = elem.dataset.type ?? elem.innerText;
        if (!typeMap.get(key)) typeMap.set(key, []);
        typeMap.get(key)!.push(type);
    });

    for (const [key, types] of typeMap.entries()) {
        if (types.length > 2) {
            typeMap.delete(key);
            continue;
        }

        if (types.length === 2) {
            if (types[0] === types[1]) {
                typeMap.delete(key);
                continue;
            }

            if (types.includes(FILE_TYPES.VIDEO) && types.includes(FILE_TYPES.AUDIO)) {
                typeMap.delete(key);
                continue;
            }

            if (types[1] === FILE_TYPES.AUDIO || types[1] === FILE_TYPES.VIDEO) {
                typeMap.set(key, [types[1], types[0]]);
            }
        }
    }

    const options = document.querySelectorAll('.config-option') as NodeListOf<HTMLInputElement>;
    const configMap = new Map<string, string[]>();
    options.forEach((opt) => {
        const key = opt.dataset.key;
        if (!key) {
            throw new Error('Option key is not defined. ' + opt);
        }

        const name = opt.dataset.name;
        if (!name) {
            throw new Error('Option name is not defined. ' + opt);
        }

        if (opt.type === 'checkbox') {
            if (opt.checked) {
                if (!configMap.get(key)) configMap.set(key, []);
                configMap.get(key)!.push(name);
            }
        } else {
            const value = parseInt(opt.value);
            if (isNaN(value)) {
                throw new Error('Option value is NaN. ' + opt);
            }
            if (name === 's' && value !== 10) {
                if (1 > value || value > 1000)
                    throw new Error('Slideshow time must be between 1 and 1000 sec');
                if (!configMap.get(key)) configMap.set(key, []);
                configMap.get(key)!.push(value + name);
            } else if (name === '%' && value !== 100) {
                if (0 > value || value > 1000)
                    throw new Error('Volume value must be between 0 and 10000 %');
                if (!configMap.get(key)) configMap.set(key, []);
                configMap.get(key)!.push(value + name);
            }
        }
    });

    const list = Array.from(configMap).sort((a, b) => compareFiles(a[0], b[0]));
    const text = list
        .map((elem) => {
            const types = typeMap.get(elem[0]) ?? [];
            return (
                elem[0] + ' ' + types.join(' ') + (types.length > 0 ? ' ' : '') + elem[1].join(' ')
            );
        })
        .join('\r\n');
    return text;
}

function setupCamMicLogic() {
    document
        .querySelectorAll<HTMLInputElement>('.config-option[data-name="cam"]')
        .forEach((cam) => {
            updatePreviewCameraBackground(cam);
            cam.addEventListener('change', () => updatePreviewCameraBackground(cam));
        });
}

function updatePreviewCameraBackground(cam: HTMLInputElement) {
    const section = cam.closest('section');
    if (!section) return;

    section.querySelectorAll<HTMLElement>('.config-preview-media-pane').forEach((pane) => {
        pane.classList.toggle('config-camera-preview-bg', cam.checked);
        pane.classList.toggle('bg-black', !cam.checked);
    });
}

configListViewBtn.addEventListener('click', () => setConfigViewMode('list'));
configPreviewViewBtn.addEventListener('click', () => setConfigViewMode('preview'));
function setConfigViewMode(mode: ConfigViewMode) {
    if (configViewMode === mode) return;

    syncCurrentConfigFromDom();
    configViewMode = mode;
    localStorage.setItem(CONFIG_VIEW_STORAGE_KEY, mode);
    renderConfigContent();
}

function syncCurrentConfigFromDom() {
    if (!currentConfigState) return;

    const options = document.querySelectorAll('.config-option') as NodeListOf<HTMLInputElement>;
    const configMap = new Map<string, string[]>();

    options.forEach((opt) => {
        const key = opt.dataset.key;
        const name = opt.dataset.name;
        if (!key || !name) return;

        if (opt.type === 'checkbox') {
            if (!opt.checked) return;
        } else if (!opt.value.trim()) {
            return;
        }

        if (!configMap.get(key)) configMap.set(key, []);
        configMap.get(key)!.push(opt.type === 'checkbox' ? name : opt.value + name);
    });

    currentConfigState.config = Array.from(configMap);
}

function updateConfigViewButtons() {
    configListViewBtn.classList.toggle('btn-primary', configViewMode === 'list');
    configPreviewViewBtn.classList.toggle('btn-primary', configViewMode === 'preview');
}

function updateConfigPageLayout() {
    const isPreview = configViewMode === 'preview';

    configCard.classList.toggle('flex-1', !isPreview);
    configCard.classList.toggle('shrink-0', isPreview);
    configCardBody.classList.toggle('flex-1', !isPreview);
}

function renderDynamicIcons() {
    (window as any).lucide?.createIcons();
}
