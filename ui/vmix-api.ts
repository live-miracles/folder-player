import { ensureArray, fetchUrl, xml2json } from './utils.js';

async function vMixCall(func = '', params: Record<string, any> = {}, host = 'localhost') {
    const fullHost = host.includes(':') ? host : host + ':8088';
    const query = new URLSearchParams({
        Function: func,
        ...params,
    });
    const url = `http:/${fullHost}/api/?${func ? query : ''}`;

    const res = await fetchUrl(url);

    const timestamp = new Date().toLocaleTimeString();
    console.log(timestamp, res);
    return res;
}

function previewInput(inputNum: string | number) {
    vMixCall('PreviewInput', { Input: inputNum });
}

function transition(type: string, input: string | number | null) {
    const params = input && type !== 'FadeToBlack' ? { Input: input } : {};
    vMixCall(type, params);
}

// ===== vMix Info =====

type VMixInput = {
    '@attributes': { key: string; number: string };
    overlays: { index: number; number: number }[];
    gainDb?: string;
};

class VmixInfo {
    public preset: string;
    public preview: number;
    public active: number;
    public recording: boolean;
    public external: boolean;
    public streaming: boolean;
    public fadeToBlack: boolean;

    public inputs: VMixInput[];
    public overlays: any[];
    public audio: any;

    constructor(jsonData: any) {
        this.preset = jsonData.vmix.preset
            ? jsonData.vmix.preset['#text'].split('\\').pop().slice(0, -5)
            : '';
        this.preview = Number(jsonData.vmix.preview['#text']);
        this.active = Number(jsonData.vmix.active['#text']);
        this.recording = jsonData.vmix.recording['#text'] === 'True';
        this.external = jsonData.vmix.external['#text'] === 'True';
        this.streaming = jsonData.vmix.streaming['#text'] === 'True';
        this.fadeToBlack = jsonData.vmix.fadeToBlack['#text'] === 'True';

        const keyMap = {} as any;
        jsonData.vmix.inputs.input.forEach(
            (i: VMixInput) => (keyMap[i['@attributes'].key] = Number(i['@attributes'].number)),
        );

        this.inputs = [];
        jsonData.vmix.inputs.input.forEach((i: any) => {
            const number = Number(i['@attributes'].number);
            this.inputs[number] = i['@attributes'];
            this.inputs[number].overlays = [];
            ensureArray(i.overlay).forEach((overlay) => {
                const overlayNumber = keyMap[overlay['@attributes'].key];
                this.inputs[number].overlays.push({
                    index: parseInt(overlay['@attributes'].index),
                    number: overlayNumber,
                });
            });
        });
        this.overlays = [];
        jsonData.vmix.overlays.overlay
            .filter((o: any) => o['#text'] !== undefined)
            .forEach(
                (o: any) => (this.overlays[Number(o['@attributes'].number)] = Number(o['#text'])),
            );

        this.audio = {};
        Object.entries(jsonData.vmix.audio).forEach(
            ([k, v]: any[]) => (this.audio[k] = v['@attributes']),
        );
    }
}

const parser = new DOMParser();
async function fetchVmixInfo() {
    const res = await vMixCall();

    if (res.status === 200) {
        const xmlData = parser.parseFromString(res.value, 'text/xml');
        const jsonData = xml2json(xmlData);
        return {
            value: new VmixInfo(jsonData),
            error: null,
        };
    } else {
        return {
            value: null,
            error: res.error,
        };
    }
}

function getBusName(bus: string, capital = false) {
    const name = { M: 'master', A: 'busA', B: 'busB' }[bus]!;
    console.assert(name !== undefined, bus);
    return capital ? name.charAt(0).toUpperCase() + name.slice(1) : name;
}

// function getShortInputProgress(input) {
//     if (input.duration === '0') return '';

//     console.assert(['Video', 'AudioFile', 'Photos'].includes(input.type), input.type);
//     const duration = parseInt(input.duration);
//     const position = parseInt(input.position);
//     const remaining = duration - position;

//     if (input.type === 'Photos') {
//         return `${position} / ${duration} / ${remaining}`;
//     }
//     return `${formatTimeMMSS(duration)} | ${formatTimeMMSS(remaining)}`;
// }

// function getInputDuration(input) {
//     if (input.duration === '0') return '';

//     console.assert(['Video', 'AudioFile', 'Photos'].includes(input.type), input.type);
//     const duration = parseInt(input.duration);
//     if (input.type === 'Photos') {
//         return duration;
//     }

//     return formatTimeMMSS(duration);
// }

// function getVolumeInfo(input: VMixInput) {
//     let gain = '';
//     if (input.gainDb !== undefined && input.gainDb !== '0') {
//         gain = ' | ' + Math.round(parseInt(input.gainDb) * 100) / 100 + 'dB';
//     }
//     return Math.round(input.volume) + '%' + gain;
// }
