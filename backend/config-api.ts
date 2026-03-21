import fs from 'fs';
import path from 'path';

export const CONFIG_FILE_NAME = 'folder-player.txt';

export function getFolderConfig(folderPath: string): Map<number, string[]> {
    const filePath = path.join(folderPath, CONFIG_FILE_NAME);

    const map = new Map<number, string[]>();

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

        const match = trimmed.match(/^(\d+)\s+(.*)$/);
        if (!match) continue;

        const key = Number(match[1]);

        const values = match[2].split(/\s+/);

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
