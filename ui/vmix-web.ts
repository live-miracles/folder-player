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
    if (titleInput && titleInput.title.startsWith('Offline - ')) return null;
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
const vmixDuration = document.getElementById('vmix-duration')!;
const vmixTimeline = document.getElementById('vmix-timeline') as HTMLInputElement;

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
        vmixDuration.innerText = getLiveTimeString();
        vmixTimeline.parentElement?.classList.add('invisible');
    } else {
        vmixDuration.innerText = getInputProgress(activeInput);
        if (!userSelectedTimeline) {
            const progress = activeInput.position / activeInput.duration;
            vmixTimeline.value = String(Math.round(progress * Number(vmixTimeline.max)));

            const remaining = Math.round((activeInput.duration - activeInput.position) / 1000);
            if (0 < remaining && remaining < 10) vmixDuration.classList.add('text-error');
            else vmixDuration.classList.remove('text-error');

            vmixTimeline.dataset.index = activeInput.number;
            vmixTimeline.dataset.duration = activeInput.duration;
        }

        vmixTimeline.parentElement?.classList.remove('invisible');

        restartBtn.dataset.index = activeInput.number;
        playBtn.dataset.index = activeInput.number;
        if (activeInput.state === 'Paused') {
            playBtn.innerHTML = '<i data-lucide="play"></i>';
        } else {
            playBtn.innerHTML = '<i data-lucide="pause"></i>';
        }

        loopBtn.dataset.index = activeInput.number;
        if (activeInput.loop) {
            loopBtn.classList.add('btn-primary');
        } else {
            loopBtn.classList.remove('btn-primary');
        }
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

function getIncreasedVolume(volume: number) {
    const dB = Math.round(20 * Math.log10(volume / 100));

    if (volume < 100) {
        return ['+=3', '0'];
    } else {
        return ['100', String(Math.min(dB + 1, 24))];
    }
}

function getDecreasedVolume(volume: number) {
    const dB = Math.round(20 * Math.log10(volume / 100));

    if (volume <= 100 || dB === 0) {
        return ['-=3', '0'];
    } else {
        return ['100', String(Math.max(dB - 1, 0))];
    }
}

function renderAudioMixer(state: any) {
    drawAudioLevels(
        document.getElementById('master-meter') as HTMLCanvasElement,
        state.audio.master,
    );

    if (state.micNumber !== null) {
        mixer1.dataset.index = state.micNumber;

        if (state.inputs[state.micNumber].muted === 'True') {
            micBtn.classList.remove('btn-primary');
            micBtn.innerHTML = '<i data-lucide="mic-off"></i>';
        } else {
            micBtn.classList.add('btn-primary');
            micBtn.innerHTML = '<i data-lucide="mic"></i>';
        }
    } else {
        mixer1.dataset.index = '-1';
        micBtn.disabled = true;
    }

    const activeInput = state.inputs[state.active];
    if (activeInput.volume !== undefined) {
        mixer2.dataset.index = activeInput.number;
    } else {
        mixer2.dataset.index = '-1';
    }

    [mixer1, mixer2].forEach((mixer) => {
        const index = parseInt(mixer.dataset.index!);
        if (index === -1) {
            mixer.classList.add('hidden');
            return;
        }
        mixer.classList.remove('hidden');

        const input = state.inputs[index];
        const mixerTitle = mixer.querySelector('.mixer-title')!;
        const muteBtn = mixer.querySelector('.vol-mute')!;
        if (input.muted === 'True') {
            mixerTitle.classList.add('badge-soft');
            muteBtn.classList.remove('btn-primary');
        } else {
            mixerTitle.classList.remove('badge-soft');
            muteBtn.classList.add('btn-primary');
        }
        mixerTitle.innerHTML = input.title.slice(0, 12);
        mixer.querySelector('.mixer-volume')!.innerHTML = getVolumeString(input);
        drawAudioLevels(mixer.querySelector('.mixer-meter') as HTMLCanvasElement, input);

        const soloBtn = mixer.querySelector('.solo')!;
        if (input.solo === 'True') {
            soloBtn.classList.add('btn-accent');
        } else {
            soloBtn.classList.remove('btn-accent');
        }
    });
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

function getTransitionType() {
    return (document.getElementById('transition-type-input') as HTMLInputElement).value;
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
    await (window as any).api.vMixCall(getTransitionType(), { Input: index });
});

const playBtn = document.getElementById('vmix-play-btn') as HTMLButtonElement;
playBtn.addEventListener('click', async () => {
    const index = parseInt(playBtn.dataset.index!);
    playBtn.disabled = true;
    await (window as any).api.vMixCall('PlayPause', { Input: index });
    setTimeout(() => (playBtn.disabled = false), 1000);
});

const restartBtn = document.getElementById('vmix-restart-btn') as HTMLButtonElement;
restartBtn.addEventListener('click', async () => {
    const index = parseInt(restartBtn.dataset.index!);
    restartBtn.disabled = true;
    await (window as any).api.vMixCall('Restart', { Input: index });
    setTimeout(() => (restartBtn.disabled = false), 1000);
});

const loopBtn = document.getElementById('vmix-loop-btn') as HTMLButtonElement;
loopBtn.addEventListener('click', async () => {
    const index = parseInt(loopBtn.dataset.index!);

    loopBtn.disabled = true;
    await (window as any).api.vMixCall('Loop', { Input: index });
    setTimeout(() => (loopBtn.disabled = false), 1000);
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
    await (window as any).api.vMixCall(getTransitionType(), { Input: index });
    setTimeout(() => (nextBtn.disabled = false), 1000);
});

const micBtn = document.getElementById('vmix-mic-btn') as HTMLButtonElement;
micBtn.addEventListener('click', async () => {
    const index = parseInt(mixer1.dataset.index!);
    if (index === -1) return;
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
vmixTimeline.addEventListener('change', async () => {
    const value = Number(vmixTimeline.value);

    const index = parseInt(vmixTimeline.dataset.index!);
    const duration = parseInt(vmixTimeline.dataset.duration!);
    const position = Math.round((value / Number(vmixTimeline.max)) * duration);

    await (window as any).api.vMixCall('SetPosition', { Input: index, Value: position });
});

let timelineInteractionTimeout: ReturnType<typeof setTimeout> | null = null;
vmixTimeline.addEventListener('pointerdown', () => {
    if (timelineInteractionTimeout) clearTimeout(timelineInteractionTimeout);
    userSelectedTimeline = true;
    timelineInteractionTimeout = setTimeout(() => {
        userSelectedTimeline = false;
        timelineInteractionTimeout = null;
    }, 10000);
});
vmixTimeline.addEventListener('pointerup', () => (userSelectedTimeline = false));
vmixTimeline.addEventListener('pointercancel', () => (userSelectedTimeline = false));

function getInputProgress(input: any) {
    if (input.type === 'Photos') return `${input.position + 1} / ${input.duration + 1}`;
    return `${formatTimeMMSS(input.position)} / ${formatTimeMMSS(input.duration)}`;
}

const mixer1 = document.getElementById('mixer-1') as HTMLDivElement;
const mixer2 = document.getElementById('mixer-2') as HTMLDivElement;

function getMixerVolume(mixer: HTMLDivElement) {
    return parseInt(mixer.querySelector('.mixer-volume')!.innerHTML);
}
[mixer1, mixer2].forEach((mixer) => {
    const volPlus = mixer.querySelector('.vol-plus') as HTMLButtonElement;
    const volMinus = mixer.querySelector('.vol-minus') as HTMLButtonElement;
    const volMute = mixer.querySelector('.vol-mute') as HTMLButtonElement;
    const solo = mixer.querySelector('.solo') as HTMLButtonElement;

    volPlus.addEventListener('click', async () => {
        const index = parseInt(mixer.dataset.index!);
        if (index === -1) return;
        volPlus.disabled = true;

        const newVolume = getIncreasedVolume(getMixerVolume(mixer));
        await (window as any).api.vMixCall('SetVolume', { Input: index, Value: newVolume[0] });
        setTimeout(
            () => (window as any).api.vMixCall('SetGain', { Input: index, Value: newVolume[1] }),
            200,
        );
        setTimeout(() => (volPlus.disabled = false), 1000);
    });

    volMinus.addEventListener('click', async () => {
        const index = parseInt(mixer.dataset.index!);
        if (index === -1) return;
        volMinus.disabled = true;

        const newVolume = getDecreasedVolume(getMixerVolume(mixer));
        await (window as any).api.vMixCall('SetVolume', { Input: index, Value: newVolume[0] });
        setTimeout(
            () => (window as any).api.vMixCall('SetGain', { Input: index, Value: newVolume[1] }),
            200,
        );
        setTimeout(() => (volMinus.disabled = false), 1000);
    });

    volMute.addEventListener('click', async () => {
        const index = parseInt(mixer.dataset.index!);
        if (index === -1) return;
        volMute.disabled = true;

        await (window as any).api.vMixCall('Audio', { Input: index });
        setTimeout(() => (volMute.disabled = false), 1000);
    });

    solo.addEventListener('click', async () => {
        const index = parseInt(mixer.dataset.index!);
        if (index === -1) return;
        solo.disabled = true;

        await (window as any).api.vMixCall('Solo', { Input: index });
        setTimeout(() => (solo.disabled = false), 1000);
    });
});

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
            progressBar.value = 0;

            setTimeout(() => {
                overlay.classList.add('pointer-events-none');
            }, 300);
        }
    }, 50);
}

renderTime();
