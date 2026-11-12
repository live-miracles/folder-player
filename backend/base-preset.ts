import fs from 'fs';
import path from 'path';

import type { FolderConfig } from './config-file.js';
import type { Alert } from './types.js';

// The base preset (base.vmix) a generated preset starts from: found in the content folder
// or its parent, with optional inputs titled Cam and Mic for layering.

export type BasePreset =
    | { status: 'found'; path: string; xml: string; camKey: string | null; micKey: string | null }
    | { status: 'missing' }
    | { status: 'ambiguous'; files: string[] };

const BASE_NAME = /^base(\s.*)?\.vmix$/i;

// The closest folder with a base preset wins; more than one there is ambiguous
export function findBasePreset(folderPath: string): BasePreset {
    if (!fs.existsSync(folderPath)) return { status: 'missing' };

    let currentPath = folderPath;
    for (let level = 0; level <= 1; level++) {
        const names = fs.readdirSync(currentPath).filter((name) => BASE_NAME.test(name));
        if (names.length > 1) return { status: 'ambiguous', files: names };
        if (names.length === 1) {
            const presetPath = path.join(currentPath, names[0]);
            const xml = fs.readFileSync(presetPath, 'utf-8');
            return {
                status: 'found',
                path: presetPath,
                xml,
                camKey: getInputKey(xml, 'Cam'),
                micKey: getInputKey(xml, 'Mic'),
            };
        }

        const parentPath = path.dirname(currentPath);
        if (parentPath === currentPath) break;
        currentPath = parentPath;
    }

    return { status: 'missing' };
}

function getInputKey(xml: string, title: string) {
    const input = xml.match(new RegExp(`<Input[^>]*?Title="${title}"[^>]*?>`));
    return input?.[0].match(/Key="([^"]+)"/)?.[1] ?? null;
}

// The base preset's XML with the inputs added before its <State> tag
export function addInputs(xml: string, inputs: string[]) {
    const count = xml.match(/<State/g)?.length ?? 0;
    if (count === 0) throw new Error('Error parsing the base file, <State /> tag not found.');
    if (count > 1) throw new Error('Error parsing the base file, multiple <State /> tags found.');

    return xml.replace(/(\s*)<State/, `$1${inputs.join('\r\n')}\r\n$1<State`);
}

export function getBasePresetAlerts(base: BasePreset, config: FolderConfig): Alert[] {
    if (base.status === 'ambiguous') {
        return [
            {
                key: '',
                type: 'error',
                msg: `Multiple base presets found in the same folder (${base.files.join(', ')}). Please keep only one base preset.`,
            },
        ];
    }
    if (base.status === 'missing') {
        return [
            {
                key: '',
                type: 'error',
                msg: `Not able to find the base preset. Please create a 'base.vmix' file in the folder or its parent folder.`,
            },
        ];
    }

    const alerts: Alert[] = [];
    const items = Array.from(config.values());
    if (!base.micKey && items.some((item) => item.mic)) {
        alerts.push({
            key: '',
            type: 'error',
            msg: `Microphone is selected, but the base preset is missing the 'Mic' input.`,
        });
    }
    if (!base.camKey && items.some((item) => item.cam)) {
        alerts.push({
            key: '',
            type: 'error',
            msg: `Camera is selected, but the base preset is missing the 'Cam' input.`,
        });
    }
    return alerts;
}

// .vmix files in the folder that are neither a base preset nor the preset this app generates
export function getExtraPresetNames(folderPath: string) {
    const generatedName = `${path.basename(folderPath)}.vmix`.toLowerCase();

    return fs
        .readdirSync(folderPath, { withFileTypes: true })
        .filter((entry) => entry.isFile() && /\.vmix$/i.test(entry.name))
        .map((entry) => entry.name)
        .filter((name) => !BASE_NAME.test(name) && name.toLowerCase() !== generatedName)
        .sort();
}
