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

export function renderVmixWeb(state: any) {
    if (!state) {
        showErrorAlert('Not able to fetch vMix status.');
        return;
    } else if (state.active === 0) {
        return;
    }

    state.micNumber = getMicNumber(state);
    state.camNumber = getCamNumber(state);

    const activeInput = state.inputs[state.active];

    if (state.fadeToBlack) ftbBtn.classList.add('btn-error');
    else ftbBtn.classList.remove('btn-error');

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
        if (!userSelectedTimeline) {
            activeInputTimeline.value = String(
                Math.round((activeInput.position / activeInput.duration) * 100),
            );

            activeInputTimeline.dataset.index = activeInput.number;
            activeInputTimeline.dataset.duration = activeInput.duration;
        }

        activeInputTimeline.parentElement?.classList.remove('invisible');
    }

    document.getElementById('preset-name')!.innerText = state.preset;
    document.getElementById('program-input-title')!.innerText = activeInput.title;
    renderInputList(state);

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

function getLeadingNumbers(text: string) {
    const match = text.match(/^(\d+)(?:_(\d+))?/);
    if (!match) return [-1, -1];

    const first = Number(match[1]);
    const second = match[2] !== undefined ? Number(match[2]) : -1;

    return [first, second];
}

function renderInputList(state: any) {
    let inputsHtml = '';

    let startIndex = 1;
    for (let i = 1; i < state.inputs.length; i++) {
        const [num1, _] = getLeadingNumbers(state.inputs[i].title);
        if (num1 === -1) continue;
        startIndex = i;
        break;
    }

    // Find first helper element, his leading number will be less than actual number of inputs
    let helperIndex = state.inputs.length;
    let max = -1;
    for (let i = 1; i < state.inputs.length; i++) {
        const [num1, _] = getLeadingNumbers(state.inputs[i].title);
        if (num1 === -1) continue;
        max = Math.max(max, num1);
        if (num1 === max) continue;

        helperIndex = i;
        break;
    }

    const next = state.active + 1 < helperIndex ? state.inputs[state.active + 1] : null;
    if (next && (getLeadingNumbers(next.title)[0] !== -1 || next.title === 'Cam')) {
        nextBtn.dataset.index = state.active + 1;
        nextBtn.classList.add('btn-primary');
    } else {
        nextBtn.dataset.index = state.active;
        nextBtn.classList.remove('btn-primary');
    }

    for (let i = startIndex; i < helperIndex; i++) {
        inputsHtml += getInputHtml(state, state.inputs[i]);
    }

    document.getElementById('input-list')!.innerHTML = inputsHtml;
}

function getInputHtml(state: any, input: any) {
    let color = 'bg-base-300';
    let hover = 'hover:bg-base-content/10';

    if (state.active === input.number) {
        color = 'bg-primary text-primary-content font-semibold';
        hover = 'hover:bg-primary/70';
    }

    const duration = getInputDuration(input);

    return `
        <div class="input-item flex items-center justify-between ${color} rounded-lg px-3 py-2 cursor-pointer 
                ${hover} select-none" data-index="${input.number}">
            <div class="flex gap-3 items-center">
                <i data-lucide="${getFileIcon(input.type)}" class="w-4 h-4 shrink-0"></i>
                ${duration ? `<span class="text-sm opacity-70">${duration}</span>` : ''}
                <span>${input.title}</span>
            </div>
            <div class="flex gap-2">
                ${input.overlays.find((over: any) => over.number === state.camNumber) ? '<i data-lucide="video" class="w-4 h-4"></i>' : ''}
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
            micBtn.innerHTML = '<i data-lucide="mic-off"></i>';
        } else {
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

document.getElementById('input-list')!.addEventListener('dblclick', async (e: Event) => {
    const item = (e.target as HTMLElement).closest('.input-item') as HTMLElement;
    if (!item) {
        console.assert(false, 'Target input not found.');
        return;
    }
    const index = parseInt(item.dataset.index!);
    console.assert(!isNaN(index) && index > -1);

    showLoading();
    await (window as any).api.vMixCall('Stinger1', { Input: index });
});

const nextBtn = document.getElementById('vmix-next-btn') as HTMLButtonElement;
nextBtn.addEventListener('click', async () => {
    let index = parseInt(nextBtn.dataset.index!);
    if (isNaN(index) || index === -1) {
        console.assert(false, 'Invalid next index: ' + index);
        return;
    }
    nextBtn.disabled = true;
    showLoading();
    await (window as any).api.vMixCall('Stinger1', { Input: index });
    setTimeout(() => (nextBtn.disabled = false), 1000);
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

let userSelectedTimeline = false;
activeInputTimeline.addEventListener('change', async () => {
    const value = Number(activeInputTimeline.value);

    const index = parseInt(activeInputTimeline.dataset.index!);
    const duration = parseInt(activeInputTimeline.dataset.duration!);
    const position = Math.round((value / 100) * duration);

    await (window as any).api.vMixCall('SetPosition', { Input: index, Value: position });
});

let timelineInteractionTimeout: ReturnType<typeof setTimeout> | null = null;
activeInputTimeline.addEventListener('pointerdown', () => {
    if (timelineInteractionTimeout) clearTimeout(timelineInteractionTimeout);
    userSelectedTimeline = true;
    timelineInteractionTimeout = setTimeout(() => {
        userSelectedTimeline = false;
        timelineInteractionTimeout = null;
    }, 10000);
});
activeInputTimeline.addEventListener('pointerup', () => (userSelectedTimeline = false));
activeInputTimeline.addEventListener('pointercancel', () => (userSelectedTimeline = false));

function getInputProgress(input: any) {
    if (input.type === 'Photos') return `${input.position + 1} / ${input.duration + 1}`;
    return `${formatTimeMMSS(input.position)} / ${formatTimeMMSS(input.duration)}`;
}

const overlay = document.getElementById('loading-overlay') as HTMLDivElement;
const progressBar = document.getElementById('progress-bar') as HTMLProgressElement;

function showLoading(duration = 2000) {
    overlay.classList.remove('pointer-events-none');
    overlay.classList.remove('opacity-0');

    let start = Date.now();

    const interval = setInterval(() => {
        const elapsed = Date.now() - start;
        const percent = Math.min((elapsed / duration) * 100, 100);

        progressBar.value = percent;

        if (percent >= 100) {
            clearInterval(interval);
            overlay.classList.add('opacity-0');

            setTimeout(() => {
                overlay.classList.add('pointer-events-none');
            }, 300);
        }
    }, 50);
}

renderTime();
