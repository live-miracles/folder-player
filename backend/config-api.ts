import fs from 'fs';
import path from 'path';

import { getFolderFiles, getLeadingKey, FILE_TYPES } from './file-manager.js';
export const ALERT = { ERROR: 'error', WARNING: 'warning' };

export const CONFIG_FILE_NAME = 'folder-player.txt';

export function getFolderState(folderPath: string) {
    const configMap = getFolderConfig(folderPath);
    const fileMap = getFolderFiles(folderPath);
    const alerts = getAlerts(configMap ?? new Map(), fileMap);

    return { folder: folderPath, config: configMap, files: fileMap, alerts: alerts };
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
        const trimmed = line.trim().toLocaleLowerCase();
        if (!trimmed) continue;
        const key = getLeadingKey(trimmed);
        if (key === '') continue;
        const values = trimmed.split(/\s+/).slice(1);

        if (!map.has(key)) map.set(key, []);

        map.get(key)!.push(...values);
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

function getAlerts(
    configMap: Map<string, string[]>,
    fileMap: Map<string, { path: string; type: string; id: string }[]>,
) {
    const alerts: { key: string; type: string; msg: string }[] = [];

    // Check for config keys that don't have corresponding files
    for (const key of configMap.keys()) {
        if (!fileMap.has(key)) {
            alerts.push({
                key,
                type: ALERT.ERROR,
                msg: `Config for "${key}" exists, but no file with such number.`,
            });
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
            });
        } else if (hasAudio && files.length === 1) {
            alerts.push({
                key,
                type: ALERT.WARNING,
                msg: `Audio file without an image or slideshow.`,
            });
        } else if (hasVideo && files.length === 2) {
            alerts.push({
                key,
                type: ALERT.WARNING,
                msg: `Video file overlayed by an image or slideshow.`,
            });
        }
    }

    return alerts;
}
