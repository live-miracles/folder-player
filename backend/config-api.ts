import fs from 'fs';
import path from 'path';

import {
    getFolderFiles,
    getLeadingKeys,
    FILE_TYPES,
    compareFiles,
    getLeadingNumbers,
} from './file-manager.js';
export const ALERT = { ERROR: 'error', WARNING: 'warning' };

export const CONFIG_FILE_NAME = 'folder-player.txt';

type FolderFile = { path: string; type: string; id: string };
type Alert = { key: string; type: string; msg: string; files?: string[] };

export function getFolderState(folderPath: string) {
    const configMap = getFolderConfig(folderPath);
    let fileMap: Map<string, { path: string; type: string; id: string }[]>;
    try {
        fileMap = getFolderFiles(folderPath);
    } catch (err) {
        if (isFolderReadError(err)) {
            throw new Error(`Content folder is not found or cannot be opened: ${folderPath}`);
        }
        throw err;
    }
    const alerts = getAlerts(configMap ?? new Map(), fileMap);

    return { folder: folderPath, config: configMap, files: fileMap, alerts: alerts };
}

function isFolderReadError(error: unknown) {
    const code = (error as NodeJS.ErrnoException)?.code;
    return ['ENOENT', 'ENOTDIR', 'EACCES', 'EPERM', 'UNKNOWN'].includes(code ?? '');
}

function getFolderConfig(folderPath: string) {
    const filePath = path.join(folderPath, CONFIG_FILE_NAME);

    const map = new Map<string, string[]>();

    let content: string;
    try {
        content = fs.readFileSync(filePath, 'utf-8');
    } catch {
        return null; // file doesn't exist or can't be read
    }
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const values = trimmed.split(/\s+/).slice(1);

        for (const key of getLeadingKeys(trimmed)) {
            if (key === '') continue;

            if (!map.has(key)) map.set(key, []);

            map.get(key)!.push(...values);
        }
    }

    return map;
}

export function saveFolderConfig(folderPath: string, text: string) {
    if (!fs.existsSync(folderPath)) {
        throw new Error('Folder does not exist');
    }
    const filePath = path.join(folderPath, CONFIG_FILE_NAME);
    fs.writeFileSync(filePath, text, 'utf-8');
}

function getAlerts(configMap: Map<string, string[]>, fileMap: Map<string, FolderFile[]>) {
    const alerts: Alert[] = [];

    // Check for config keys that don't have corresponding files
    for (const [key, options] of configMap.entries()) {
        if (!fileMap.has(key)) {
            alerts.push({
                key,
                type: ALERT.ERROR,
                msg: `Config exists (${options.join(' ')}), but no file with such number.`,
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
            continue;
        }

        const hasAudio = types.includes(FILE_TYPES.AUDIO);
        const hasVideo = types.includes(FILE_TYPES.VIDEO);

        if (hasAudio && hasVideo) {
            alerts.push({
                key,
                type: ALERT.ERROR,
                msg: `Audio and video files have the same number.`,
                files: getFileNames(files),
            });
            continue;
        }

        if (hasAudio && files.length === 1) {
            alerts.push({
                key,
                type: ALERT.WARNING,
                msg: `Audio file without an image or slideshow.`,
                files: getFileNames(files),
            });
        } else if (hasVideo && files.length === 2) {
            alerts.push({
                key,
                type: ALERT.WARNING,
                msg: `Video file overlaid by an image or slideshow.`,
                files: getFileNames(files),
            });
        }

        const options = configMap.get(key) ?? [];

        const allTypes = [
            FILE_TYPES.AUDIO,
            FILE_TYPES.VIDEO,
            FILE_TYPES.IMAGE,
            FILE_TYPES.FOLDER,
            FILE_TYPES.POWERPOINT,
        ];
        const configTypes = allTypes.filter((type) => options.includes(type)).join('+');
        const folderTypes = allTypes.filter((type) => types.includes(type)).join('+');

        if (options.length > 0 && configTypes !== folderTypes) {
            alerts.push({
                key,
                type: ALERT.ERROR,
                msg: `Config type "${configTypes}" do not match the actual type "${folderTypes}".`,
                files: getFileNames(files),
            });
        }
    }

    return alerts.sort((a, b) => compareFiles(a.key, b.key));
}

function getFileNames(files: FolderFile[]) {
    return files.map((file) => path.basename(file.path));
}
