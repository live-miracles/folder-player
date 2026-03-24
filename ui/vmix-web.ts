import { FILE_TYPES } from './config.js';
import { showErrorAlert } from './utils.js';

function getLeadingNumber(text: string) {
    const match = text.match(/^\s*(\d+)/);
    return match ? Number(match[1]) : -1;
}

function getTimeString(date: Date) {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');

    return `${h}:${m}:${s}`;
}

function renderTime() {
    setInterval(() => {
        document.getElementById('current-time')!.innerText = getTimeString(new Date());
    }, 300);
}

function getMicId(state: any) {
    const micTitleInput = state.inputs
        .filter(Boolean)
        .find((input: any) => input.title.trim().split(/\s+/).includes('Mic'));
    if (micTitleInput) return micTitleInput.key;

    const micTypeInput = state.inputs.filter(Boolean).find((input: any) => input.type === 'Audio');
    if (micTypeInput) return micTypeInput.key;

    return null;
}

let liveStartTime: number | null = null;
function getLiveTimeString() {
    return formatTimeMMSS(Date.now() - liveStartTime!);
}

function getEndTimeString(input: any) {
    const remaining = input.duration - input.position;
    if (remaining < 1000) return 'Ended';

    return 'Ends @ ' + getTimeString(new Date(Date.now() + remaining));
}

const endTimeElement = document.getElementById('live-time')!;
const activeInputDuration = document.getElementById('active-input-duration')!;
const activeInputTimeline = document.getElementById('active-input-timeline') as HTMLInputElement;
export function renderVmixWeb(state: any) {
    if (!state) {
        showErrorAlert('Not able to feth vMix status.');
        return;
    } else if (state.active === 0) {
        return;
    }
    state.micId = getMicId(state);

    const activeInput = state.inputs[state.active];

    if (activeInput.duration === 0 || activeInput.type === 'Photos') {
        if (liveStartTime === null) liveStartTime = Date.now();
        endTimeElement.classList.add('hidden');
    } else {
        liveStartTime = null;
        endTimeElement.classList.remove('hidden');
        endTimeElement.innerHTML = getEndTimeString(activeInput);
    }

    if (activeInput.duration === 0) {
        activeInputDuration.innerText = getLiveTimeString();
        activeInputTimeline.parentElement?.classList.add('invisible');
    } else {
        activeInputDuration.innerText = getInputProgress(activeInput);
        activeInputTimeline.value = String(
            Math.round((activeInput.position / activeInput.duration) * 100),
        );
        activeInputTimeline.parentElement?.classList.remove('invisible');
    }

    document.getElementById('preset-name')!.innerText = state.preset;
    document.getElementById('program-input-title')!.innerText = activeInput.title;
    renderInputList(state);

    (window as any).lucide.createIcons();
}

function getInputStatus(input: any, state: any) {
    if (input.number === state.active) return 0;
    if (input.number === state.preview) return 1;
    return 2;
}

function getFileIcon(type: string) {
    if (type === FILE_TYPES.AUDIO) return 'audio-lines';
    else if (type === FILE_TYPES.VIDEO) return 'clapperboard';
    else if (type === FILE_TYPES.IMAGE) return 'image';
    else if (type === FILE_TYPES.FOLDER) return 'presentation';
    else if (type === 'Capture') return 'camera';
    else if (type === 'Audio') return 'mic-vocal';
    else if (type === 'Colour') return 'palette';
    return '';
}

function renderInputList(state: any) {
    let pinnedHtml = '';
    let normalHtml = '';
    state.inputs.filter(Boolean).forEach((input: any) => {
        const color = [
            'bg-primary text-primary-content font-semibold',
            'bg-warning text-warning-content font-semibold',
            'bg-base-300',
        ][getInputStatus(input, state)];
        const hover = ['hover:bg-primary/70', 'hover:bg-warning/70', 'hover:bg-base-content/10'][
            getInputStatus(input, state)
        ];

        const html = `
            <div class="input-item flex items-center justify-between ${color} 
                    rounded-lg px-3 py-2 cursor-pointer ${hover} select-none" data-index="${input.number}">
                <div class="flex gap-3 items-center">
                    <i data-lucide="${getFileIcon(input.type)}" class="w-4 h-4 shrink-0"></i>
                    ${getInputDuration(input) ? `<span class="text-sm opacity-70">${getInputDuration(input)}</span>` : ''}
                    <span>${input.title}</span>
                </div>
                <div class="flex gap-2">
                    ${input.overlays.find((over: any) => over.key === state.micId) ? '<i data-lucide="mic" class="w-4 h-4"></i>' : ''}
                    ${input.loop ? '<i data-lucide="repeat" class="w-4 h-4"></i>' : ''}
                </div>
            </div>`;
        if (getLeadingNumber(input.title) === 0) pinnedHtml += html;
        else normalHtml += html;
    });
    document.getElementById('pinned-inputs')!.innerHTML = pinnedHtml;
    document.getElementById('input-list')!.innerHTML = normalHtml;
}

function getInputDuration(input: any) {
    if (input.duration === 0) return '';

    console.assert(['Video', 'AudioFile', 'Photos'].includes(input.type), input);
    const duration = parseInt(input.duration);
    if (input.type === 'Photos') {
        return duration + 1;
    }

    return formatTimeMMSS(duration);
}

function formatTimeMMSS(ms: number) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (num: number) => String(num).padStart(2, '0');
    return `${hours === 0 ? '' : hours + ':'}${pad(minutes)}:${pad(seconds)}`;
}

document.getElementById('input-list')!.addEventListener('click', inputClick);
document.getElementById('input-list')!.addEventListener('dblclick', inputDbClick);

document.getElementById('pinned-inputs')!.addEventListener('click', inputClick);
document.getElementById('pinned-inputs')!.addEventListener('dblclick', inputDbClick);

let clickTimeout: any = null;
function inputClick(e: Event) {
    const item = (e.target as HTMLElement).closest('.input-item') as HTMLElement;
    if (!item) return;

    const index = item.dataset.index;

    // delay click to detect double click
    if (clickTimeout) clearTimeout(clickTimeout);

    clickTimeout = setTimeout(() => (window as any).api.setVmixPreview(index), 200);
}

function inputDbClick(e: Event) {
    const item = (e.target as HTMLElement).closest('.input-item') as HTMLElement;
    if (!item) return;

    const index = item.dataset.index;
    if (clickTimeout) clearTimeout(clickTimeout);

    (window as any).api.setVmixActive(index);
}

function getInputProgress(input: any) {
    if (input.type === 'Photos') return `${input.position + 1} / ${input.duration + 1}`;

    const remaining = input.duration - input.position;
    return `${formatTimeMMSS(input.position)} / ${formatTimeMMSS(input.duration)} / ${formatTimeMMSS(remaining)}`;
}

renderTime();
