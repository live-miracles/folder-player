import fs from 'fs';
import path from 'path';

export const FILE_TYPES = { IMAGE: 'Image', VIDEO: 'Video', AUDIO: 'AudioFile', FOLDER: 'Photos' };

function getLeadingNumbers(text: string) {
    const match = text.match(/^(\d+)(?:_(\d+))?/);
    if (!match) return [-1, -1];

    const first = Number(match[1]);
    const second = match[2] !== undefined ? Number(match[2]) : -1;

    return [first, second];
}

export function getLeadingKey(text: string) {
    const [first, second] = getLeadingNumbers(text);

    if (first === -1) return '';

    return `${String(first)}${second !== -1 ? `_${String(second)}` : ''}`;
}

export function compareFiles(a: string, b: string) {
    const [a1, a2] = getLeadingNumbers(a);
    const [b1, b2] = getLeadingNumbers(b);
    if (a1 !== b1) return a1 - b1;
    if (a2 !== b2) return a2 - b2;
    return a.localeCompare(b);
}

export function getBaseFile(folderPath: string) {
    const regex = /^base(\s.*)?\.vmix$/i;

    if (!fs.existsSync(folderPath)) return null;

    const files = fs.readdirSync(folderPath);

    for (const file of files) {
        if (regex.test(file)) return path.join(folderPath, file);
    }

    const parent = path.dirname(folderPath);
    if (parent && parent !== folderPath) {
        const files = fs.readdirSync(parent);

        for (const file of files) {
            if (regex.test(file)) return path.join(parent, file);
        }
    }
    return null;
}

function getFileType(filePath: string) {
    const IMAGE_EXT = ['.jpg', '.png', '.jpeg'];
    const VIDEO_EXT = ['.mp4', '.mov', '.m4a'];
    const AUDIO_EXT = ['.mp3', '.wav'];

    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) return FILE_TYPES.FOLDER;
    const ext = path.extname(filePath).toLowerCase();

    if (IMAGE_EXT.includes(ext)) return FILE_TYPES.IMAGE;
    if (VIDEO_EXT.includes(ext)) return FILE_TYPES.VIDEO;
    if (AUDIO_EXT.includes(ext)) return FILE_TYPES.AUDIO;

    return null;
}

export function getFolderFiles(folderPath: string) {
    let fileNames = fs.readdirSync(folderPath, 'utf8');

    fileNames.sort(compareFiles);

    const fileMap = new Map<string, { path: string; type: string; id: string }[]>();
    for (const name of fileNames) {
        const key = getLeadingKey(name);
        const fullPath = path.join(folderPath, name);
        const type = getFileType(fullPath);

        if (!type) continue;

        if (!fileMap.get(key)) fileMap.set(key, []);
        fileMap.get(key)?.push({ path: fullPath, type: type, id: crypto.randomUUID() });
    }

    return fileMap;
}
