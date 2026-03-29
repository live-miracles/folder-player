import { FILE_TYPES } from './config.js';
import { showErrorAlert, drawAudioLevels } from './utils.js';

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

function getMicNumber(state: any) {
    const titleInput = state.inputs
        .filter(Boolean)
        .find((input: any) => input.title.trim().split(/\s+/).includes('Mic'));
    if (titleInput) return titleInput.number;

    const micTypeInput = state.inputs.filter(Boolean).find((input: any) => input.type === 'Audio');
    if (micTypeInput) return micTypeInput.number;

    return null;
}

function getCamNumber(state: any) {
    const titleInput = state.inputs
        .filter(Boolean)
        .find((input: any) => input.title.trim().split(/\s+/).includes('Cam'));
    if (titleInput) return titleInput.number;

    const typeInput = state.inputs.filter(Boolean).find((input: any) => input.type === 'Capture');
    if (typeInput) return typeInput.number;

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

let lastTitleNumber = -1;
export function renderVmixWeb(state: any) {
    if (!state) {
        showErrorAlert('Not able to fetch vMix status.');
        return;
    } else if (state.active === 0) {
        return;
    }

    let config = null;
    if ((window as any).presetName === state.preset) {
        config = (window as any).config;
    }

    state.micNumber = getMicNumber(state);
    state.camNumber = getCamNumber(state);

    const activeInput = state.inputs[state.active];

    if (activeInput.titleNumber !== -1) lastTitleNumber = activeInput.titleNumber;

    if (state.fadeToBlack) ftbBtn.classList.remove('btn-soft');
    else ftbBtn.classList.add('btn-soft');

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
    renderInputList(state, config);

    renderAudioMixer(state);

    (window as any).lucide.createIcons();
}

function getFileIcon(type: string) {
    if (type === FILE_TYPES.AUDIO) return 'audio-lines';
    else if (type === FILE_TYPES.VIDEO) return 'clapperboard';
    else if (type === FILE_TYPES.IMAGE) return 'image';
    else if (type === FILE_TYPES.FOLDER) return 'presentation';
    else if (type === 'Capture') return 'camera';
    else if (type === 'Audio') return 'mic-vocal';
    else if (type === 'Colour') return 'palette';
    else if (type === 'Virtual') return 'layers-2';
    return '';
}

function renderInputList(state: any, config: Map<number, string[]> | null) {
    let pinnedHtml = '';
    let normalHtml = '';

    let startIndex = 0;
    for (let i = 1; i < state.inputs.length; i++) {
        const num = state.inputs[i].titleNumber;
        if (num === -1) continue;
        startIndex = i;
        break;
    }

    // Find first helper element, his leading number will be less than actual number of inputs
    let helperIndex = state.inputs.length;
    let max = -1;
    for (let i = 1; i < state.inputs.length; i++) {
        const num = state.inputs[i].titleNumber;
        if (num === -1) continue;
        max = Math.max(max, num);
        if (num === max) continue;

        helperIndex = i;
        break;
    }

    const inputs = state.inputs.slice(startIndex, helperIndex).filter(Boolean);
    for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i];

        const nextInput =
            i + 1 < inputs.length && inputs[i + 1].titleNumber !== -1 ? inputs[i + 1] : null;
        let nextCam = null;

        if (state.camNumber && input.number !== state.camNumber && input.titleNumber !== -1) {
            if (config && !config.get(input.titleNumber)?.includes('skip')) {
                if (nextInput && input.titleNumber !== inputs[i + 1].titleNumber) {
                    nextCam = state.inputs[state.camNumber];
                }
            }
        }

        if (state.camNumber === state.active && input.titleNumber === lastTitleNumber) {
            nextBtn.dataset.index = nextInput?.number ?? -1;
            nextBtn.disabled = !Boolean(nextInput);
        }

        if (input.number === state.active && input.number !== state.camNumber) {
            const next = nextCam ? nextCam : nextInput;
            nextBtn.dataset.index = next?.number ?? -1;
            nextBtn.disabled = !Boolean(next);
        }

        if (config && state.camNumber !== input.number) {
            const html = getInputHtml(state, input, null);
            if (input.titleNumber === 0) pinnedHtml += html;
            else normalHtml += html;
        }

        if (nextCam) {
            normalHtml += getInputHtml(state, state.inputs[state.camNumber], input);
        }
    }

    document.getElementById('pinned-inputs')!.innerHTML = pinnedHtml;
    document.getElementById('input-list')!.innerHTML = normalHtml;
}

function getInputHtml(state: any, input: any, previous: any | null) {
    let color = 'bg-base-300';
    let hover = 'hover:bg-base-content/10';

    if (previous) {
        if (state.active === state.camNumber && previous.titleNumber === lastTitleNumber) {
            color = 'bg-primary text-primary-content font-semibold';
            hover = 'hover:bg-primary/70';
        }
    } else if (state.active === input.number) {
        color = 'bg-primary text-primary-content font-semibold';
        hover = 'hover:bg-primary/70';
    }

    return `
        <div class="input-item flex items-center justify-between ${color} 
                rounded-lg px-3 py-2 cursor-pointer ${hover} select-none" data-index="${input.number}">
            <div class="flex gap-3 items-center">
                <i data-lucide="${getFileIcon(input.type)}" class="w-4 h-4 shrink-0"></i>
                ${getInputDuration(input) ? `<span class="text-sm opacity-70">${getInputDuration(input)}</span>` : ''}
                <span>${input.title}</span>
            </div>
            <div class="flex gap-2">
                ${input.overlays.find((over: any) => over.number === state.micNumber) ? '<i data-lucide="mic" class="w-4 h-4"></i>' : ''}
                ${input.loop ? '<i data-lucide="repeat" class="w-4 h-4"></i>' : ''}
            </div>
        </div>`;
}

function getVolumeString(input: any) {
    const vol = parseFloat(input.volume);
    const gain = parseFloat(input.gainDb);

    // Convert dB to linear multiplier
    const multiplier = Math.pow(10, gain / 20);
    return `${Math.round(vol * multiplier)}%`;
}

function renderAudioMixer(state: any) {
    drawAudioLevels(
        document.getElementById('master-meter') as HTMLCanvasElement,
        state.audio.master,
    );

    const mixer1 = document.getElementById('mixer-1')!;
    if (state.micNumber !== null) {
        micBtn.dataset.index = state.micNumber;

        if (state.inputs[state.micNumber].muted === 'True') {
            micBtn.classList.remove('btn-primary');
            micBtn.classList.add('btn-soft');
            micBtn.classList.add('btn-error');
            micBtn.innerHTML = '<i data-lucide="mic-off"></i>';
        } else {
            micBtn.classList.remove('btn-error');
            micBtn.classList.remove('btn-soft');
            micBtn.classList.add('btn-primary');
            micBtn.innerHTML = '<i data-lucide="mic"></i>';
        }

        const input = state.inputs[state.micNumber];

        drawAudioLevels(mixer1.querySelector('.mixer-meter') as HTMLCanvasElement, input);

        const mixerTitle = mixer1.querySelector('.mixer-title')!;
        if (input.muted === 'True') {
            mixerTitle.classList.add('badge-soft');
        } else {
            mixerTitle.classList.remove('badge-soft');
        }
        mixerTitle.innerHTML = input.title.slice(0, 10);
        mixer1.querySelector('.mixer-volume')!.innerHTML = getVolumeString(input);
        mixer1.classList.remove('hidden');
    } else {
        micBtn.disabled = true;
        mixer1.classList.add('hidden');
    }

    const activeInput = state.inputs[state.active];
    const mixer2 = document.getElementById('mixer-2')!;
    if (activeInput.volume !== undefined) {
        const input = activeInput;
        drawAudioLevels(mixer2.querySelector('.mixer-meter') as HTMLCanvasElement, input);

        const mixerTitle = mixer2.querySelector('.mixer-title')!;
        if (input.muted === 'True') {
            mixerTitle.classList.add('badge-soft');
        } else {
            mixerTitle.classList.remove('badge-soft');
        }
        mixerTitle.innerHTML = input.title.slice(0, 10);
        mixer2.querySelector('.mixer-volume')!.innerHTML = getVolumeString(input);
        mixer2.classList.remove('hidden');
    } else {
        mixer2.classList.add('hidden');
    }
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

document.getElementById('input-list')!.addEventListener('dblclick', inputDbClick);
document.getElementById('pinned-inputs')!.addEventListener('dblclick', inputDbClick);

const nextBtn = document.getElementById('vmix-next-btn') as HTMLButtonElement;
nextBtn.addEventListener('click', async () => {
    let index = parseInt(nextBtn.dataset.index!);
    if (isNaN(index) || index === -1) {
        console.assert(false, 'Invalid next index: ' + index);
        return;
    }
    nextBtn.disabled = true;
    (window as any).api.vMixCall('Stinger1', { Input: index });
});

const micBtn = document.getElementById('vmix-mic-btn') as HTMLButtonElement;
micBtn.addEventListener('click', async () => {
    const index = parseInt(micBtn.dataset.index!);
    console.assert(!isNaN(index) && index >= 0);
    micBtn.disabled = true;
    await (window as any).api.vMixCall('Audio', { Input: index });
    setTimeout(() => (micBtn.disabled = false), 1000);
});

const ftbBtn = document.getElementById('vmix-ftb-btn') as HTMLButtonElement;
ftbBtn.addEventListener('click', async () => {
    ftbBtn.disabled = true;
    await (window as any).api.vMixCall('FadeToBlack');
    setTimeout(() => (ftbBtn.disabled = false), 1000);
});

function inputDbClick(e: Event) {
    const item = (e.target as HTMLElement).closest('.input-item') as HTMLElement;
    if (!item) return;
    const index = parseInt(item.dataset.index!);
    console.assert(!isNaN(index) && index > -1);
    (window as any).api.vMixCall('Stinger1', { Input: index });
}

function getInputProgress(input: any) {
    if (input.type === 'Photos') return `${input.position + 1} / ${input.duration + 1}`;
    return `${formatTimeMMSS(input.position)} / ${formatTimeMMSS(input.duration)}`;
}

renderTime();
