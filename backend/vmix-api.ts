import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });

async function fetchUrl(url: string) {
    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
        const data = await response.text();
        return { status: response.status, data: data, error: null };
    } catch (err) {
        return { status: null, data: null, error: err };
    }
}

export async function vMixCall(func = '', params: Record<string, any> = {}, host = 'localhost') {
    const fullHost = host.includes(':') ? host : host + ':8088';
    const query = new URLSearchParams({ Function: func, ...params });
    const url = `http:/${fullHost}/api/?${func ? query : ''}`;

    return await fetchUrl(url);
}

export async function getVmixState() {
    const res = await vMixCall();

    if (res.status === 200) {
        try {
            const data = parser.parse(res.data);
            return { data: new VmixInfo(data.vmix), error: null };
        } catch (err) {
            console.error(err);
            return { data: null, error: 'XML parse error' };
        }
    } else {
        console.error(res.error);
        return { data: null, error: res.error };
    }
}

function transition(type: string, input: string | number | null) {
    const params = input && type !== 'FadeToBlack' ? { Input: input } : {};
    vMixCall(type, params);
}

// ===== vMix Info =====

type VMixInput = {
    '@attributes': { key: string; number: string };
    overlays: { index: number; number: number; key: string }[];
    gainDb?: string;
    loop: boolean;
    number: number;
    title: string;
};

function ensureArray(item: any) {
    if (item === undefined) return [];
    if (Array.isArray(item)) return item;
    else return [item];
}

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

    constructor(data: any) {
        this.preset = data.preset ? data.preset.split('\\').pop().slice(0, -5) : '';
        this.preview = Number(data.preview);
        this.active = Number(data.active);
        this.recording = data.recording === 'True';
        this.external = data.external === 'True';
        this.streaming = data.streaming === 'True';
        this.fadeToBlack = data.fadeToBlack === 'True';

        const keyMap = {} as any;
        data.inputs.input.forEach((i: any) => (keyMap[i.key] = Number(i.number)));

        this.inputs = [];
        data.inputs.input.forEach((input: any) => {
            const number = Number(input.number);
            this.inputs[number] = input;
            this.inputs[number].number = number;
            this.inputs[number].loop = input.loop === 'True';
            this.inputs[number].overlays = [];
            ensureArray(input.overlay).forEach((overlay) => {
                this.inputs[number].overlays.push({
                    index: parseInt(overlay.index),
                    number: keyMap[overlay.key],
                    key: overlay.key,
                });
            });
        });
        this.overlays = []; // TODO
        // data.overlays.overlay
        //     .filter((o: any) => o['#text'] !== undefined)
        //     .forEach(
        //         (o: any) => (this.overlays[Number(o['@attributes'].number)] = Number(o['#text'])),
        //     );

        this.audio = {}; // TODO parse audios
        Object.entries(data.audio).forEach(([k, v]: any[]) => (this.audio[k] = v));
    }
}

// export async function fetchVmixInfo() {
//     const res = await vMixCall();

//     if (res.status === 200) {
//         const xmlData = parser.parseFromString(res.value, 'text/xml');
//         const jsonData = xml2json(xmlData);
//         return {
//             value: new VmixInfo(jsonData),
//             error: null,
//         };
//     } else {
//         return {
//             value: null,
//             error: res.error,
//         };
//     }
// }

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

// function getVolumeInfo(input: VMixInput) {
//     let gain = '';
//     if (input.gainDb !== undefined && input.gainDb !== '0') {
//         gain = ' | ' + Math.round(parseInt(input.gainDb) * 100) / 100 + 'dB';
//     }
//     return Math.round(input.volume) + '%' + gain;
// }
