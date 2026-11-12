import fs from 'fs';
import path from 'path';

import { FILE_TYPES, compareFiles, getLeadingKeys } from './file-manager.js';
import type { Alert } from './types.js';

// The config file (folder-player.txt): one line per key, e.g. `3 AudioFile Image cam 150%`.
// This module is the only place that knows the text format.

export const CONFIG_FILE_NAME = 'folder-player.txt';

export type ItemOptions = {
    types: string[];
    cam: boolean;
    mic: boolean;
    loop: boolean;
    volume: number; // percent
    seconds: number; // per slide
    extra: string[]; // words this version doesn't recognise, kept so a save doesn't lose them
};

export type FolderConfig = Map<string, ItemOptions>;

const VOLUME = { default: 100, min: 0, max: 1000 };
const SECONDS = { default: 10, min: 1, max: 1000 };

// Audio and video come first: the visual on the same key is their overlay
const TYPE_ORDER = [
    FILE_TYPES.AUDIO,
    FILE_TYPES.VIDEO,
    FILE_TYPES.IMAGE,
    FILE_TYPES.FOLDER,
    FILE_TYPES.POWERPOINT,
];

export function defaultItemOptions(): ItemOptions {
    return {
        types: [],
        cam: false,
        mic: false,
        loop: false,
        volume: VOLUME.default,
        seconds: SECONDS.default,
        extra: [],
    };
}

export function getItemOptions(config: FolderConfig | null, key: string): ItemOptions {
    return config?.get(key) ?? defaultItemOptions();
}

export function parseConfig(text: string): { config: FolderConfig; alerts: Alert[] } {
    const config: FolderConfig = new Map();
    const alerts: Alert[] = [];

    for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const words = trimmed.split(/\s+/).slice(1);

        for (const key of getLeadingKeys(trimmed)) {
            if (key === '') continue;
            if (!config.has(key)) config.set(key, defaultItemOptions());
            const item = config.get(key)!;
            for (const word of words) applyWord(item, key, word, alerts);
        }
    }

    return { config, alerts };
}

function applyWord(item: ItemOptions, key: string, word: string, alerts: Alert[]) {
    if (TYPE_ORDER.includes(word)) {
        if (!item.types.includes(word)) item.types.push(word);
        return;
    }
    if (word === 'cam' || word === 'mic' || word === 'loop') {
        item[word] = true;
        return;
    }

    const volume = word.match(/^(\d+)%$/);
    if (volume) {
        const value = Number(volume[1]);
        if (inRange(value, VOLUME)) item.volume = value;
        else keepOutOfRange(item, key, word, alerts, 'Volume', VOLUME, '%');
        return;
    }

    const seconds = word.match(/^(\d+)s$/);
    if (seconds) {
        const value = Number(seconds[1]);
        if (inRange(value, SECONDS)) item.seconds = value;
        else keepOutOfRange(item, key, word, alerts, 'Seconds', SECONDS, 's');
        return;
    }

    if (!item.extra.includes(word)) item.extra.push(word);
}

function inRange(value: number, range: { min: number; max: number }) {
    return Number.isInteger(value) && value >= range.min && value <= range.max;
}

function keepOutOfRange(
    item: ItemOptions,
    key: string,
    word: string,
    alerts: Alert[],
    label: string,
    range: { default: number; min: number; max: number },
    unit: string,
) {
    if (!item.extra.includes(word)) item.extra.push(word);
    alerts.push({
        key,
        type: 'warning',
        msg: `${label} ${word} is out of range (${range.min}–${range.max}${unit}), using ${range.default}${unit}.`,
    });
}

// The options part of a key's line, without the key: `AudioFile Image cam 150%`
export function formatItemOptions(item: ItemOptions) {
    const words = [...TYPE_ORDER.filter((type) => item.types.includes(type))];
    if (item.cam) words.push('cam');
    if (item.mic) words.push('mic');
    if (item.loop) words.push('loop');
    if (item.volume !== VOLUME.default) words.push(`${item.volume}%`);
    if (item.seconds !== SECONDS.default) words.push(`${item.seconds}s`);
    words.push(...item.extra);
    return words.join(' ');
}

// Throws when an option is out of range, so a bad value never reaches the file
export function serializeConfig(config: FolderConfig): string {
    const lines: string[] = [];
    const keys = Array.from(config.keys()).sort(compareFiles);

    for (const key of keys) {
        const item = { ...defaultItemOptions(), ...config.get(key)! };
        if (!inRange(item.volume, VOLUME)) {
            throw new Error(
                `Volume for ${key} must be a whole number between ${VOLUME.min} and ${VOLUME.max} %.`,
            );
        }
        if (!inRange(item.seconds, SECONDS)) {
            throw new Error(
                `Seconds per slide for ${key} must be a whole number between ${SECONDS.min} and ${SECONDS.max}.`,
            );
        }

        // Types alone don't make a line: they only record what the options were set for
        const hasOptions =
            item.cam ||
            item.mic ||
            item.loop ||
            item.volume !== VOLUME.default ||
            item.seconds !== SECONDS.default ||
            item.extra.length > 0;
        if (hasOptions) lines.push(`${key} ${formatItemOptions(item)}`);
    }

    return lines.join('\r\n');
}

// null when the folder has no config file (or it can't be read)
export function readConfig(folderPath: string): { config: FolderConfig; alerts: Alert[] } | null {
    let text: string;
    try {
        text = fs.readFileSync(path.join(folderPath, CONFIG_FILE_NAME), 'utf-8');
    } catch {
        return null;
    }
    return parseConfig(text);
}

export function writeConfig(folderPath: string, config: FolderConfig) {
    if (!fs.existsSync(folderPath)) {
        throw new Error('Folder does not exist');
    }
    const text = serializeConfig(config);
    fs.writeFileSync(path.join(folderPath, CONFIG_FILE_NAME), text, 'utf-8');
}
