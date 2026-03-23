import { FILE_TYPES } from './config.js';

function getLeadingNumber(text: string) {
    const match = text.match(/^\s*(\d+)/);
    return match ? Number(match[1]) : -1;
}

function getMicId(state: any) {
    const micTitleInput = state.inputs
        .filter(Boolean)
        .find((input: any) => input.title.trim().split(/\s+/).includes('Mic'));
    if (micTitleInput) return micTitleInput.key;

    const micTypeInput = state.inputs.find((input: any) => input.type === 'Audio');
    if (micTypeInput) return micTypeInput.key;

    return null;
}

export function renderVmixWeb(state: any) {
    state.micId = getMicId(state);

    document.getElementById('preset-name')!.innerText = state.preset;
    document.getElementById('program-input-title')!.innerText = state.inputs[state.active].title;
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
        <div class="flex items-center justify-between ${color} rounded-lg px-3 py-2 cursor-pointer ${hover}">
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
    if (input.duration === '0') return '';

    console.assert(['Video', 'AudioFile', 'Photos'].includes(input.type), input.type);
    const duration = parseInt(input.duration);
    if (input.type === 'Photos') {
        return duration;
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
