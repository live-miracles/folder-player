import { escapeHtml, getAlertItemHtml, getReportSummaryHtml } from './utils.js';
import type { Alert, ItemOptions } from './types.js';
export const FILE_TYPES = {
    IMAGE: 'Image',
    VIDEO: 'Video',
    AUDIO: 'AudioFile',
    FOLDER: 'Photos',
    POWERPOINT: 'PowerPoint',
};
const TYPE_MAP = { Video: 1, AudioFile: 2, Image: 3, Photos: 4, PowerPoint: 5 };
const ALERT = { ERROR: 'error', WARNING: 'warning' };
const VIDEO_PREVIEW_FIRST_FALLBACK_SECONDS = 2;
const VIDEO_PREVIEW_SECOND_FALLBACK_SECONDS = 5;
const BLACK_FRAME_LUMA_THRESHOLD = 18;
const BLACK_FRAME_RATIO_THRESHOLD = 0.96;
const TYPE_META: Record<string, { tag: string; label: string }> = {
    Video: { tag: 'tag-video', label: 'Video' },
    AudioFile: { tag: 'tag-audio', label: 'Audio' },
    Image: { tag: 'tag-image', label: 'Image' },
    Photos: { tag: 'tag-photos', label: 'Photos' },
    PowerPoint: { tag: 'tag-ppt', label: 'PowerPoint' },
};
const OPTION_META: Record<string, { icon: string; label: string }> = {
    cam: { icon: 'video', label: 'Camera' },
    mic: { icon: 'mic', label: 'Microphone' },
    loop: { icon: 'repeat', label: 'Loop' },
};

type ConfigFile = { path: string; type: string };
type ConfigEntry = [string, ConfigFile[]];
type FolderPreview = { paths: string[]; total: number };
type ConfigAlert = Alert & { key: string };
type ConfigState = {
    folder: string;
    baseFile: string | null;
    files: ConfigEntry[];
    config: [string, ItemOptions][]; // every key, defaults filled in by the backend
    alerts: ConfigAlert[];
    hasConfig?: boolean;
    isContainer?: boolean;
    subfolders?: ConfigSubfolder[];
};
type ConfigSubfolder = { path: string; relative: string; errors: number; warnings: number };
type ConfigViewMode = 'list' | 'preview';
const CONFIG_VIEW_STORAGE_KEY = 'configViewMode';

const configListView = document.getElementById('config-list-view')!;
const configPreviewScroll = document.getElementById('config-preview-scroll')!;
const configPreviewView = document.getElementById('config-preview-view')!;
const configListViewBtn = document.getElementById('config-list-view-btn') as HTMLButtonElement;
const configPreviewViewBtn = document.getElementById(
    'config-preview-view-btn',
) as HTMLButtonElement;
const configViewToggle = document.getElementById('config-view-toggle')!;
const configTable = document.getElementById('config-table') as HTMLTableSectionElement;
const saveConfigBtn = document.getElementById('save-config-btn') as HTMLButtonElement;

// The edited config as first rendered after loading; Save is only enabled when the page differs.
// Kept across list/preview switches so unsaved edits still count as changes.
let savedConfigJson: string | undefined;
let isRendering = false;

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
    if (a1 === -1 && b1 === -1) return 0;
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
    savedConfigJson = undefined;
    renderConfigTitle(state.folder, state.baseFile);
    document.getElementById('config-base')!.classList.toggle('hidden', !!state.isContainer);

    renderFolderAlerts(state.alerts);
    renderSubfolders(state);

    renderConfigContent();
}

function renderSubfolders(state: ConfigState) {
    const panel = document.getElementById('config-subfolders')!;
    const list = document.getElementById('config-subfolders-list')!;
    const subfolders = state.subfolders ?? [];

    panel.classList.toggle('hidden', subfolders.length === 0);
    list.innerHTML = '';
    if (subfolders.length === 0) return;

    document.getElementById('config-subfolders-count')!.textContent = String(subfolders.length);
    document.getElementById('config-subfolders-note')!.textContent = state.isContainer
        ? 'This folder has no config of its own. Open one of the playlists below.'
        : 'This folder has no config yet, but these subfolders do.';

    for (const sub of subfolders) {
        const li = document.createElement('li');
        li.className =
            'group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-surface-3';
        li.title = sub.path;
        li.tabIndex = 0;
        li.setAttribute('role', 'button');

        const chips = [];
        if (sub.errors)
            chips.push(
                `<span class="chip chip-danger">${sub.errors} ${sub.errors === 1 ? 'error' : 'errors'}</span>`,
            );
        if (sub.warnings)
            chips.push(
                `<span class="chip chip-warning">${sub.warnings} ${sub.warnings === 1 ? 'warning' : 'warnings'}</span>`,
            );
        const status = chips.length
            ? chips.join('')
            : '<span class="chip chip-success">No issues</span>';
        const name = sub.relative
            .split(/[\\/]/)
            .map(escapeHtml)
            .join('<span class="mx-1.5 text-ink-faint">›</span>');
        li.innerHTML = `
            <i data-lucide="folder" class="h-4 w-4 shrink-0 text-ink-faint"></i>
            <span class="min-w-0 flex-1 truncate text-[13px] text-ink">${name}</span>
            <span class="flex shrink-0 items-center gap-1.5">${status}</span>
            <i data-lucide="chevron-right" class="h-4 w-4 shrink-0 text-ink-faint group-hover:text-ink"></i>`;

        const open = () =>
            document.dispatchEvent(new CustomEvent('open-config-folder', { detail: sub.path }));
        li.addEventListener('click', open);
        li.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                open();
            }
        });
        list.appendChild(li);
    }
}

function renderConfigContent() {
    if (!currentConfigState) return;

    configTable.innerHTML = '';
    configPreviewView.innerHTML = '';

    currentConfigState.files.sort((a, b) => compareFiles(a[0], b[0]));
    const configMap = new Map(currentConfigState.config);

    updateConfigViewButtons();
    // A grouping folder has no media of its own, so only the subfolder list is shown
    const isContainer = !!currentConfigState.isContainer;
    configViewToggle.classList.toggle('hidden', isContainer);
    configListView.classList.toggle('hidden', isContainer || configViewMode !== 'list');
    configPreviewScroll.classList.toggle('hidden', isContainer || configViewMode !== 'preview');
    configPreviewScroll.classList.toggle('block', !isContainer && configViewMode === 'preview');
    // List view keeps a readable max width; the block grid uses the full width
    const configAlerts = document.getElementById('config-alerts')!;
    for (const cls of ['mx-auto', 'w-full', 'max-w-300']) {
        configAlerts.classList.toggle(cls, configViewMode === 'list');
    }

    isRendering = true;
    updateSaveButton();
    if (configViewMode === 'preview') renderPreviewConfig(configMap).then(finishRendering);
    else {
        renderListConfig(configMap);
        finishRendering();
    }

    setupCamMicLogic();
    setupVideoPreviewFrames();
    renderDynamicIcons();
}

function renderListConfig(configMap: Map<string, ItemOptions>) {
    let html = '';

    let i = 0;
    for (const [key, files] of currentConfigState!.files) {
        files.sort((a: any, b: any) => (TYPE_MAP as any)[a.type] - (TYPE_MAP as any)[b.type]);
        const types = files.map((f) => f.type);
        const optionsHtml = getOptionsHtml(key, types, configMap.get(key)!);

        const rowClass = i++ > 0 ? 'group-start' : '';

        const tab = '<span class="mr-2 ml-1 text-ink-faint">↳</span>';
        const applyTab =
            types.filter((t) => t === FILE_TYPES.AUDIO).length +
                types.filter((t) => t === FILE_TYPES.VIDEO).length ===
            1;
        files.forEach((file, i) => {
            html += `<tr class="${i === 0 ? rowClass : ''} hover:bg-white/[0.015]">`;
            if (i === 0) {
                html += `<td rowspan="${files.length}" class="font-mono text-[13px] font-medium text-ink-subtle">${escapeHtml(key)}</td>`;
            }
            const subType = file.type !== FILE_TYPES.AUDIO && file.type !== FILE_TYPES.VIDEO;
            html += `<td class="break-all text-ink">${applyTab && subType ? tab : ''}${escapeHtml(getFileName(file.path))}</td>`;
            html += `<td>${getFileTypeHtml(file.type, key)}</td>`;
            if (i === 0)
                html += `<td rowspan="${files.length}"><div class="flex flex-wrap items-center gap-1.5">${optionsHtml}</div></td>`;
            html += `</tr>`;
        });
    }

    configTable.innerHTML = html;
}

async function renderPreviewConfig(configMap: Map<string, ItemOptions>) {
    const sections = await Promise.all(
        currentConfigState!.files.map(async ([key, files]) => {
            files.sort((a: any, b: any) => (TYPE_MAP as any)[a.type] - (TYPE_MAP as any)[b.type]);
            const types = files.map((f) => f.type);
            const item = configMap.get(key)!;
            const optionsHtml = getOptionsHtml(key, types, item);
            const previewFiles = getPreviewFiles(files);
            const hasCameraBackground = item.cam;
            const hasBaseMedia = types.some(
                (type) => type === FILE_TYPES.AUDIO || type === FILE_TYPES.VIDEO,
            );
            const hasVisualOverlay = types.some(
                (type) =>
                    type === FILE_TYPES.IMAGE ||
                    type === FILE_TYPES.FOLDER ||
                    type === FILE_TYPES.POWERPOINT,
            );
            const cameraOnTop =
                !(files.length === 1 && files[0].type === FILE_TYPES.IMAGE) &&
                !(hasBaseMedia && hasVisualOverlay);

            const folderPreviews = await Promise.all(
                files.map(async (file) => {
                    if (file.type !== FILE_TYPES.FOLDER) return null;
                    try {
                        return (await (window as any).api.getFolderPreviewImages(
                            file.path,
                        )) as FolderPreview;
                    } catch {
                        return null;
                    }
                }),
            );

            return `<section data-camera-on-top="${cameraOnTop}" class="panel flex flex-col overflow-hidden text-left">
                <div class="flex items-center gap-2 border-b border-line px-3 py-2">
                    <div class="ml-auto flex min-h-7 flex-nowrap items-center gap-1.5 overflow-x-auto">${optionsHtml}</div>
                </div>
                <div class="space-y-1.5 px-3 py-2.5">
                    ${files.map((file) => getPreviewFileHeaderHtml(file, key)).join('')}
                </div>
                <div class="mt-auto grid ${previewFiles.length > 1 ? 'grid-cols-2 gap-px' : 'grid-cols-1'} border-t border-line bg-line">
                    ${previewFiles
                        .map((file) =>
                            getPreviewPaneHtml(
                                file,
                                hasCameraBackground,
                                cameraOnTop,
                                folderPreviews[files.indexOf(file)],
                            ),
                        )
                        .join('')}
                </div>
            </section>`;
        }),
    );

    configPreviewView.innerHTML = sections.join('');
    setupCamMicLogic();
    setupVideoPreviewFrames();
    renderDynamicIcons();
}

function getOptionsHtml(key: string, types: string[], item: ItemOptions) {
    let optionsHtml = '';

    optionsHtml += getBoolOptionHtml('cam', String(item.cam), key);
    optionsHtml += getBoolOptionHtml('mic', String(item.mic), key);

    if (types.includes(FILE_TYPES.AUDIO) || types.includes(FILE_TYPES.VIDEO)) {
        optionsHtml += getBoolOptionHtml('loop', String(item.loop), key);
        optionsHtml += getNumberOptionHtml('%', numberText(item.volume), key, 0, 1000);
    }
    if (types.includes(FILE_TYPES.FOLDER) || types.includes(FILE_TYPES.POWERPOINT)) {
        optionsHtml += getNumberOptionHtml('s', numberText(item.seconds), key, 1, 1000);
    }

    return optionsHtml;
}

// An emptied number field is kept as NaN until saved, so it renders empty again
function numberText(value: number) {
    return Number.isNaN(value) ? '' : String(value);
}

function renderFolderAlerts(alerts: ConfigAlert[]) {
    const errorNum = alerts.filter((a) => a.type === ALERT.ERROR).length;
    const warningNum = alerts.filter((a) => a.type === ALERT.WARNING).length;

    const configReportSummary = document.getElementById('config-report-summary')!;
    const alertsListElement = document.getElementById('config-alerts-list')!;
    const configAlertsElement = document.getElementById('config-alerts')!;

    if (errorNum === 0 && warningNum === 0) {
        configAlertsElement.classList.add('hidden');
        configReportSummary.innerHTML = '';
        alertsListElement.innerHTML = ''; // Clear any previous alerts
    } else {
        configAlertsElement.classList.remove('hidden');
        configReportSummary.innerHTML = getReportSummaryHtml(errorNum, warningNum);
        alertsListElement.innerHTML = alerts.map(getAlertItemHtml).join('');
    }
}

function getFileName(path: string) {
    const parts = path.replace(/\\/g, '/').split('/').filter(Boolean);
    return parts.slice(-1)[0];
}

function renderConfigTitle(folder: string, baseFile: string | null) {
    const title = document.getElementById('config-title')!;
    const base = document.getElementById('config-base')!;
    const normalized = folder.replace(/\\/g, '/');
    const lastSlashIndex = normalized.lastIndexOf('/');
    const start = lastSlashIndex >= 0 ? folder.slice(0, lastSlashIndex + 1) : '';
    const end = lastSlashIndex >= 0 ? folder.slice(lastSlashIndex + 1) : folder;

    title.title = folder;
    title.innerHTML = `<span class="flex min-w-0 max-w-full items-baseline" title="${escapeHtml(folder)}">
        <span class="min-w-0 overflow-hidden font-normal text-ellipsis whitespace-nowrap text-ink-subtle">${escapeHtml(start)}</span>
        <span class="shrink-0 whitespace-nowrap">${escapeHtml(end)}</span>
    </span>`;
    base.title = baseFile ?? 'Base preset not found';
    base.textContent = `Base: ${baseFile ?? 'Not found'}`;
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

    return `<div class="flex min-w-0 items-center gap-2 text-[13px]">
        ${getFileTypeIconHtml(file.type, key)}
        <span class="truncate text-ink-muted" title="${escapeHtml(name)}">${escapeHtml(name)}</span>
    </div>`;
}

function getFileTypeIconHtml(type: string, key: string) {
    const meta = TYPE_META[type];

    return `<span class="${key ? 'config-type' : ''} tag tag-icon ${meta?.tag ?? ''} shrink-0" data-key="${key}" data-type="${type}" title="${meta?.label ?? type}" aria-label="${meta?.label ?? type}">
        <i data-lucide="${getPreviewIcon(type)}"></i>
    </span>`;
}

function getPreviewPaneHtml(
    file: ConfigFile,
    hasCameraBackground: boolean,
    cameraOnTop: boolean,
    folderPreview?: FolderPreview | null,
) {
    const src = escapeHtml(getFileUrl(file.path));
    const name = escapeHtml(getFileName(file.path));
    const previewBackgroundClass = hasCameraBackground
        ? cameraOnTop
            ? 'config-camera-preview-overlay'
            : 'config-camera-preview-bg'
        : 'bg-black';

    if (file.type === FILE_TYPES.IMAGE) {
        return `<div class="config-preview-media-pane aspect-video flex items-center justify-center overflow-hidden ${previewBackgroundClass}">
            <img src="${src}" alt="${name}" class="max-h-full max-w-full object-contain" loading="lazy" />
        </div>`;
    }

    if (file.type === FILE_TYPES.VIDEO) {
        return `<div class="config-preview-media-pane aspect-video flex items-center justify-center overflow-hidden ${previewBackgroundClass}">
            <video src="${src}" class="config-preview-video max-h-full max-w-full object-contain" muted preload="metadata" playsinline></video>
        </div>`;
    }

    if (file.type === FILE_TYPES.FOLDER && folderPreview?.paths.length) {
        const remaining = folderPreview.total - folderPreview.paths.length;
        return `<div class="grid aspect-video grid-cols-2 grid-rows-2 ${previewBackgroundClass}">
            ${Array.from({ length: 4 }, (_, index) => {
                const imagePath = folderPreview.paths[index];
                if (!imagePath) return '<div></div>';

                return `<div class="relative min-h-0 overflow-hidden">
                    <img src="${escapeHtml(getFileUrl(imagePath))}" alt="" class="h-full w-full object-cover" loading="lazy" />
                    ${index === 3 && remaining > 0 ? `<div class="absolute inset-0 flex items-center justify-center bg-black/60 text-2xl font-semibold text-white">+${remaining}</div>` : ''}
                </div>`;
            }).join('')}
        </div>`;
    }

    return `<div class="aspect-video flex flex-col items-center justify-center gap-2 bg-surface-2 p-3 text-ink-faint">
        <i data-lucide="${getPreviewIcon(file.type)}" class="h-10 w-10 stroke-[1.5]"></i>
        <span class="max-w-full truncate text-xs">${name}</span>
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

        if (
            !Number.isFinite(video.duration) ||
            video.duration <= VIDEO_PREVIEW_FIRST_FALLBACK_SECONDS
        ) {
            return;
        }

        const firstFrameTime = video.currentTime;
        const firstFallbackTime = Math.min(
            VIDEO_PREVIEW_FIRST_FALLBACK_SECONDS,
            Math.max(video.duration - 0.1, 0),
        );

        await seekVideo(video, firstFallbackTime);
        if (!isVideoFrameBlack(video)) return;

        if (video.duration <= VIDEO_PREVIEW_SECOND_FALLBACK_SECONDS) {
            await seekVideo(video, firstFrameTime);
            return;
        }

        const secondFallbackTime = Math.min(
            VIDEO_PREVIEW_SECOND_FALLBACK_SECONDS,
            Math.max(video.duration - 0.1, 0),
        );
        await seekVideo(video, secondFallbackTime);
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

    return `<label class="opt-toggle" title="${meta.label}" aria-label="${meta.label}">
            <input data-key="${key}" data-name="${name}" class="config-option" type="checkbox" ${value === 'true' ? 'checked="checked"' : ''} />
            <span><i data-lucide="${meta.icon}"></i></span>
        </label>`;
}

function getNumberOptionHtml(name: string, value: string, key: string, min: number, max: number) {
    if (key === '') return '';

    return `<label class="input-affix ml-1 w-18" title="${name === '%' ? 'Volume' : 'Seconds per slide'}">
        <input data-key="${key}" data-name="${name}" type="number" min="${min}" max="${max}"
         class="config-option text-right tabular-nums" value="${value}" />
        <span class="input-affix-unit">${name}</span>
    </label>`;
}

function getFileTypeHtml(type: string, key: string) {
    const meta = TYPE_META[type];

    return `<span class="${key ? 'config-type' : ''} tag tag-labeled-icon ${meta?.tag ?? ''}" data-key="${key}" data-type="${type}"><i data-lucide="${getPreviewIcon(type)}"></i>${meta?.label ?? type}</span>`;
}

function finishRendering() {
    isRendering = false;
    // The first render after loading is the baseline; list/preview switches keep it
    savedConfigJson ??= JSON.stringify(getEditedConfig());
    updateSaveButton();
}

function updateSaveButton() {
    saveConfigBtn.disabled = isRendering || JSON.stringify(getEditedConfig()) === savedConfigJson;
}

document.getElementById('config-page')!.addEventListener('input', updateSaveButton);
document.getElementById('config-page')!.addEventListener('change', updateSaveButton);

// The loaded item options with the page's inputs applied. The backend checks the values
// and writes the config file, so this knows nothing about the file format.
export function getEditedConfig(): [string, ItemOptions][] {
    const config = new Map(
        (currentConfigState?.config ?? []).map(([key, item]): [string, ItemOptions] => [
            key,
            { ...item, types: [...item.types], extra: [...item.extra] },
        ]),
    );

    const typesByKey = new Map<string, string[]>();
    document.querySelectorAll<HTMLElement>('.config-type').forEach((elem) => {
        const { key, type } = elem.dataset;
        if (!key || !type) return;
        if (!typesByKey.has(key)) typesByKey.set(key, []);
        typesByKey.get(key)!.push(type);
    });
    for (const [key, types] of typesByKey) {
        const item = config.get(key);
        if (item) item.types = types; // the folder's current types, as before
    }

    document.querySelectorAll<HTMLInputElement>('.config-option').forEach((input) => {
        const item = config.get(input.dataset.key ?? '');
        const name = input.dataset.name;
        if (!item || !name) return;

        if (name === 'cam' || name === 'mic' || name === 'loop') item[name] = input.checked;
        else if (name === '%') item.volume = parseInt(input.value);
        else if (name === 's') item.seconds = parseInt(input.value);
    });

    return Array.from(config);
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
    const cameraOnTop = section.dataset.cameraOnTop === 'true';

    section.querySelectorAll<HTMLElement>('.config-preview-media-pane').forEach((pane) => {
        pane.classList.toggle('config-camera-preview-bg', cam.checked && !cameraOnTop);
        pane.classList.toggle('config-camera-preview-overlay', cam.checked && cameraOnTop);
        pane.classList.toggle('bg-black', !cam.checked);
    });
}

configListViewBtn.addEventListener('click', () => setConfigViewMode('list'));
configPreviewViewBtn.addEventListener('click', () => setConfigViewMode('preview'));
function setConfigViewMode(mode: ConfigViewMode) {
    if (configViewMode === mode) return;

    if (currentConfigState) currentConfigState.config = getEditedConfig();
    configViewMode = mode;
    localStorage.setItem(CONFIG_VIEW_STORAGE_KEY, mode);
    renderConfigContent();
}

function updateConfigViewButtons() {
    configListViewBtn.classList.toggle('is-active', configViewMode === 'list');
    configPreviewViewBtn.classList.toggle('is-active', configViewMode === 'preview');
}

function renderDynamicIcons() {
    (window as any).lucide?.createIcons();
}
