import fs from 'fs';
import path from 'path';

import { getFolderFiles, compareFiles } from './file-manager.js';
import { CONFIG_FILE_NAME, getItemOptions, readConfig } from './config-file.js';
import { findBasePreset, getBasePresetAlerts, getExtraPresetNames } from './base-preset.js';
import { buildPlaylist } from './playlist.js';
import type { Alert } from './types.js';
export const ALERT = { ERROR: 'error', WARNING: 'warning' };

export function getFolderState(folderPath: string) {
    const configFile = readConfig(folderPath);
    let files: ReturnType<typeof getFolderFiles>;
    try {
        files = getFolderFiles(folderPath);
    } catch (err) {
        if (isFolderReadError(err)) {
            throw new Error(`Content folder is not found or cannot be opened: ${folderPath}`);
        }
        throw err;
    }
    const config = configFile?.config ?? null;
    const basePreset = findBasePreset(folderPath);
    const playlist = buildPlaylist(files, config);

    const alerts: Alert[] = [
        ...getBasePresetAlerts(basePreset, config ?? new Map()),
        ...getExtraPresetAlerts(folderPath),
        ...playlist.alerts,
        ...(configFile?.alerts ?? []),
    ].sort((a, b) => compareFiles(a.key, b.key));

    return {
        folder: folderPath,
        config,
        files,
        items: playlist.items,
        alerts,
        basePreset,
        baseFile: basePreset.status === 'found' ? basePreset.path : null,
    };
}

// What the config page shows for a folder, as plain data for IPC
export function getFolderView(folderPath: string) {
    const state = getFolderState(folderPath);
    const hasConfig = state.config !== null;
    const subfolders = hasConfig ? [] : getConfigSubfolders(folderPath);
    // A folder with no config and no media that only groups playlists in its subfolders
    const isContainer = !hasConfig && state.items.length === 0 && subfolders.length > 0;

    let alerts = state.alerts;
    if (isContainer) {
        alerts = []; // base preset and config checks don't apply to a grouping folder
    } else if (!hasConfig) {
        alerts = [
            ...alerts,
            { key: '', type: ALERT.WARNING, msg: 'No config file in the folder.' },
        ];
    }

    // Every key with files or config, defaults filled in, so the page never needs its own
    const keys = new Set([...state.items.map((item) => item.key), ...(state.config?.keys() ?? [])]);

    return {
        folder: state.folder,
        baseFile: state.baseFile,
        items: state.items,
        config: Array.from(keys).map((key) => [key, getItemOptions(state.config, key)]),
        alerts,
        hasConfig,
        isContainer,
        subfolders,
    };
}

function getExtraPresetAlerts(folderPath: string): Alert[] {
    const extraPresets = getExtraPresetNames(folderPath);
    if (extraPresets.length === 0) return [];
    return [
        {
            key: '',
            type: ALERT.WARNING,
            msg: `Folder has additional .vmix presets besides the base and the generated one. This can be confusing for operators.`,
            files: extraPresets,
        },
    ];
}

function isFolderReadError(error: unknown) {
    const code = (error as NodeJS.ErrnoException)?.code;
    return ['ENOENT', 'ENOTDIR', 'EACCES', 'EPERM', 'UNKNOWN'].includes(code ?? '');
}

const MAX_SUBFOLDER_SCAN = 1000;

export type ConfigSubfolder = {
    path: string;
    relative: string;
    errors: number;
    warnings: number;
};

// Descendant folders that have their own config file, so a folder without one can link to them
export function getConfigSubfolders(folderPath: string) {
    const result: ConfigSubfolder[] = [];
    let scanned = 0;

    function visit(currentPath: string) {
        let entries: fs.Dirent[];
        try {
            entries = fs.readdirSync(currentPath, { withFileTypes: true });
        } catch {
            return; // unreadable folder: skip it
        }

        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            if (++scanned > MAX_SUBFOLDER_SCAN) return;

            const subPath = path.join(currentPath, entry.name);
            if (fs.existsSync(path.join(subPath, CONFIG_FILE_NAME))) {
                let errors = 0;
                let warnings = 0;
                try {
                    const alerts = getFolderState(subPath).alerts;
                    errors = alerts.filter((a) => a.type === ALERT.ERROR).length;
                    warnings = alerts.filter((a) => a.type === ALERT.WARNING).length;
                } catch {
                    errors = 1;
                }
                result.push({
                    path: subPath,
                    relative: path.relative(folderPath, subPath),
                    errors,
                    warnings,
                });
            }
            visit(subPath);
        }
    }

    visit(folderPath);
    return result.sort((a, b) =>
        a.relative.localeCompare(b.relative, undefined, { numeric: true, sensitivity: 'base' }),
    );
}
