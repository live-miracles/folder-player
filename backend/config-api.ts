import fs from 'fs';
import path from 'path';

import { getLeadingKey } from './file-manager.js';

export const CONFIG_FILE_NAME = 'folder-player.txt';

export function getFolderConfig(folderPath: string) {
    const filePath = path.join(folderPath, CONFIG_FILE_NAME);

    const map = new Map<string, string[]>();

    let content: string;
    try {
        content = fs.readFileSync(filePath, 'utf-8');
    } catch {
        return map; // file doesn't exist or can't be read
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
