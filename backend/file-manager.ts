import fs from 'fs';
import path from 'path';

export const FILE_TYPES = { IMAGE: 'Image', VIDEO: 'Video', AUDIO: 'AudioFile', FOLDER: 'Photos' };

function getLeadingNumber(text: string) {
    const match = text.match(/^\s*(\d+)/);
    return match ? Number(match[1]) : -1;
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

    fileNames.sort((a, b) => {
        const numA = getLeadingNumber(a);
        const numB = getLeadingNumber(b);
        if (numA !== numB) return numA - numB;
        return a.localeCompare(b);
    });

    const fileMap = new Map<number, { path: string; type: string; id: string }[]>();
    for (const name of fileNames) {
        const number = getLeadingNumber(name);
        const fullPath = path.join(folderPath, name);
        const type = getFileType(fullPath);

        if (!type) continue;

        if (!fileMap.get(number)) fileMap.set(number, []);
        fileMap.get(number)?.push({ path: fullPath, type: type, id: crypto.randomUUID() });
    }

    return fileMap;
}
