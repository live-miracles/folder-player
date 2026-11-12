import path from 'path';

import { FILE_TYPES, compareFiles, getLeadingNumbers } from './file-manager.js';
import {
    formatItemOptions,
    getItemOptions,
    type FolderConfig,
    type ItemOptions,
} from './config-file.js';
import type { Alert } from './types.js';

// How the files sharing one key combine into a playlist item: the vMix input, its overlay,
// and the order of its layers. The preset generator renders items; the config page shows them.

export type FolderFile = { path: string; type: string; id: string };

// Stacked on a playlist item's input in this order. The preset generator resolves each role
// to an input key; the base preset decides whether Mic and Cam exist.
export type Layer = 'mic' | 'cam' | 'overlay';

export type PlaylistItem = {
    key: string;
    files: FolderFile[]; // main file first, then its overlay; folder order when invalid
    options: ItemOptions;
    input:
        | { kind: 'file'; file: FolderFile }
        // An image with the camera on: a colour input carries Cam with the image above it
        | { kind: 'colour'; title: string }
        // A combination the report flags as an error: every file becomes its own input
        | { kind: 'invalid' };
    overlay: FolderFile | null;
    layers: Layer[];
    // Whether Cam is above the content when the camera option is on. It depends only on the
    // files, so the config page can preview the camera while the option is being toggled.
    cameraOnTop: boolean;
};

const MEDIA_TYPES = [FILE_TYPES.VIDEO, FILE_TYPES.AUDIO];
const VISUAL_TYPES = [FILE_TYPES.IMAGE, FILE_TYPES.FOLDER, FILE_TYPES.POWERPOINT];
const DISPLAY_ORDER = [...MEDIA_TYPES, ...VISUAL_TYPES];
const ALERT = { ERROR: 'error', WARNING: 'warning' };

export function buildPlaylist(
    files: Map<string, FolderFile[]>,
    config: FolderConfig | null,
): { items: PlaylistItem[]; alerts: Alert[] } {
    const keys = Array.from(files.keys())
        .filter((key) => key !== '')
        .sort(compareFiles);
    const items = keys.map((key) => buildItem(key, files.get(key)!, getItemOptions(config, key)));

    return { items, alerts: getPlaylistAlerts(files, config ?? new Map()) };
}

function buildItem(key: string, folderFiles: FolderFile[], options: ItemOptions): PlaylistItem {
    const files = [...folderFiles].sort(
        (a, b) => DISPLAY_ORDER.indexOf(a.type) - DISPLAY_ORDER.indexOf(b.type),
    );
    const media = files.filter((file) => MEDIA_TYPES.includes(file.type));
    const visuals = files.filter((file) => VISUAL_TYPES.includes(file.type));
    const isSingleImage = files.length === 1 && files[0].type === FILE_TYPES.IMAGE;
    const cameraOnTop = !isSingleImage && !(media.length > 0 && visuals.length > 0);

    const layers: Layer[] = [];
    if (options.mic) layers.push('mic');
    if (options.cam) layers.push('cam');

    const item = { key, files, options, layers, cameraOnTop, overlay: null };

    if (media.length > 1 || visuals.length > 1) {
        // No main file to put first: keep the folder's order, which the preset has always used
        return { ...item, files: folderFiles, input: { kind: 'invalid' } };
    }

    if (media.length === 1) {
        const overlay = visuals[0] ?? null;
        if (overlay) layers.push('overlay');
        return { ...item, input: { kind: 'file', file: media[0] }, overlay };
    }

    // Slideshow folders and PowerPoint inputs take the camera layer directly
    if (isSingleImage && options.cam) {
        layers.push('overlay');
        const title = path.parse(files[0].path).name;
        return { ...item, input: { kind: 'colour', title }, overlay: files[0] };
    }

    return { ...item, input: { kind: 'file', file: files[0] } };
}

function getPlaylistAlerts(fileMap: Map<string, FolderFile[]>, configMap: FolderConfig) {
    const alerts: Alert[] = [];

    // Check for config keys that don't have corresponding files
    for (const [key, item] of configMap.entries()) {
        if (!fileMap.has(key)) {
            alerts.push({
                key,
                type: ALERT.ERROR,
                msg: `Config exists (${formatItemOptions(item)}), but no file with such number.`,
            });
        }
    }

    // Check for gaps between keys
    const keys = Array.from(fileMap.keys()).sort(compareFiles);
    for (let i = 1; i < keys.length; i++) {
        const prevKey = keys[i - 1];
        const currKey = keys[i];
        const [p1, p2] = getLeadingNumbers(prevKey);
        const [c1, c2] = getLeadingNumbers(currKey);

        if (p1 === -1 || c1 === -1) continue;

        if (c1 > p1) {
            if (c1 > p1 + 1) {
                alerts.push({
                    key: `${p1 + 1}`,
                    type: ALERT.WARNING,
                    msg: `Sequence number is missing.`,
                });
            }
        } else {
            console.assert(p1 === c1, `Key mismatch: ${prevKey} vs ${currKey}`);
            if (p2 === -1) continue;
            if (c2 > p2 + 1) {
                alerts.push({
                    key: `${p1}_${p2 + 1}`,
                    type: ALERT.WARNING,
                    msg: `Sequence number is missing.`,
                });
            }
        }
    }

    // Check file combinations for each key
    for (const [key, files] of fileMap.entries()) {
        if (key === '') continue;

        const types = files.map((f) => f.type);
        const typeCounts = types.reduce(
            (acc, type) => {
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            },
            {} as Record<string, number>,
        );

        // Max one layer
        if (files.length > 2) {
            alerts.push({
                key,
                type: ALERT.ERROR,
                msg: `${files.length} files with the same number.`,
                files: getFileNames(files),
            });
            continue;
        }

        // Check for duplicate file types
        for (const type in typeCounts) {
            if (typeCounts[type] > 1) {
                alerts.push({
                    key,
                    type: ALERT.ERROR,
                    msg: `Two files of type '${type}'.`,
                    files: getFileNames(files.filter((file) => file.type === type)),
                });
            }
        }

        const hasAudio = types.includes(FILE_TYPES.AUDIO);
        const hasVideo = types.includes(FILE_TYPES.VIDEO);
        const visualFiles = files.filter((file) => VISUAL_TYPES.includes(file.type));
        const options = getItemOptions(configMap, key);

        if (hasAudio && hasVideo) {
            alerts.push({
                key,
                type: ALERT.ERROR,
                msg: `Audio and video files have the same number.`,
                files: getFileNames(files),
            });
            continue;
        }

        const hasDuplicateVisualType = visualFiles.some((file) => typeCounts[file.type] > 1);
        if (visualFiles.length > 1 && !hasDuplicateVisualType) {
            alerts.push({
                key,
                type: ALERT.ERROR,
                msg: `Multiple visual files have the same number.`,
                files: getFileNames(visualFiles),
            });
        }

        if (hasAudio && files.length === 1 && !options.cam) {
            alerts.push({
                key,
                type: ALERT.WARNING,
                msg: `Audio file without an image or slideshow.`,
                files: getFileNames(files),
            });
        } else if (hasVideo && files.length === 2 && typeCounts[FILE_TYPES.VIDEO] === 1) {
            alerts.push({
                key,
                type: ALERT.WARNING,
                msg: `Video file overlaid by an image or slideshow.`,
                files: getFileNames(files),
            });
        }

        const allTypes = [FILE_TYPES.AUDIO, FILE_TYPES.VIDEO, ...VISUAL_TYPES];
        const configTypes = allTypes.filter((type) => options.types.includes(type)).join('+');
        const folderTypes = allTypes.filter((type) => types.includes(type)).join('+');

        if (configTypes && configTypes !== folderTypes) {
            alerts.push({
                key,
                type: ALERT.ERROR,
                msg: `Config type "${configTypes}" do not match the actual type "${folderTypes}".`,
                files: getFileNames(files),
            });
        }
    }

    return alerts;
}

function getFileNames(files: FolderFile[]) {
    return files.map((file) => path.basename(file.path));
}
