import fs from 'fs';
import path from 'path';

export const FILE_TYPES = {
    IMAGE: 'Image',
    VIDEO: 'Video',
    AUDIO: 'AudioFile',
    FOLDER: 'Photos',
    POWERPOINT: 'PowerPoint',
};

export function getLeadingNumbers(text: string) {
    const match = text.match(/^(\d+)(?:_(\d+))?/);
    if (!match) return [-1, -1];

    const first = Number(match[1]);
    const second = match[2] !== undefined ? Number(match[2]) : -1;

    return [first, second];
}

export function getLeadingKeys(text: string) {
    if (text.startsWith('__options__ ')) return ['__options__'];

    const match = text.match(/^[\d_+]+/);
    if (!match) return [''];

    const keys = match[0]
        .split('+')
        .map((key) => getLeadingNumbers(key))
        .filter(([first]) => first !== -1)
        .map(([first, second]) => `${String(first)}${second !== -1 ? `_${String(second)}` : ''}`);

    return keys.length > 0 ? keys : [''];
}

export function compareFiles(a: string, b: string) {
    const [a1, a2] = getLeadingNumbers(a);
    const [b1, b2] = getLeadingNumbers(b);
    if (a1 === -1 && b1 === -1) return 0;
    if (a1 === -1) return 1;
    if (b1 === -1) return -1;
    if (a1 !== b1) return a1 - b1;
    if (a2 !== b2) return a2 - b2;
    return a.localeCompare(b);
}

export function getBaseFile(folderPath: string) {
    const regex = /^base(\s.*)?\.vmix$/i;

    if (!fs.existsSync(folderPath)) return null;

    let currentPath = folderPath;
    for (let level = 0; level <= 1; level++) {
        const files = fs.readdirSync(currentPath);
        const baseFiles = files.filter((file) => regex.test(file));
        if (baseFiles.length === 1) return path.join(currentPath, baseFiles[0]);
        if (baseFiles.length > 1) return null;

        const parentPath = path.dirname(currentPath);
        if (parentPath === currentPath) break;
        currentPath = parentPath;
    }

    return null;
}

function getFileType(filePath: string) {
    const IMAGE_EXT = ['.jpg', '.png', '.jpeg'];
    const POWERPOINT_EXT = ['.pptx'];
    const VIDEO_EXT = [
        '.mp4',
        '.mov',
        '.m4p',
        '.m4v',
        '.mkv',
        '.avi',
        '.wmv',
        '.mpg',
        '.mpeg',
        '.ts',
        '.m2ts',
        '.mts',
    ];
    const AUDIO_EXT = ['.mp3', '.wav', '.m4a', '.aac', '.wma', '.flac', '.ogg'];

    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) return FILE_TYPES.FOLDER;
    const ext = path.extname(filePath).toLowerCase();

    if (IMAGE_EXT.includes(ext)) return FILE_TYPES.IMAGE;
    if (POWERPOINT_EXT.includes(ext)) return FILE_TYPES.POWERPOINT;
    if (VIDEO_EXT.includes(ext)) return FILE_TYPES.VIDEO;
    if (AUDIO_EXT.includes(ext)) return FILE_TYPES.AUDIO;

    return null;
}

function addFile(
    fileMap: Map<string, { path: string; type: string; id: string }[]>,
    key: string,
    file: { path: string; type: string; id: string },
) {
    if (!fileMap.has(key)) fileMap.set(key, []);
    fileMap.get(key)!.push(file);
}

export function getFolderFiles(folderPath: string) {
    const fileNames = fs.readdirSync(folderPath, 'utf8');

    fileNames.sort(compareFiles);

    const fileMap = new Map<string, { path: string; type: string; id: string }[]>();
    for (const name of fileNames) {
        const fullPath = path.join(folderPath, name);
        const type = getFileType(fullPath);

        if (!type) continue;

        for (const key of getLeadingKeys(name)) {
            if (key === '') continue;
            addFile(fileMap, key, { path: fullPath, type: type, id: crypto.randomUUID() });
        }
    }

    return fileMap;
}

export function getFolderPreviewImages(folderPath: string) {
    const fileNames = fs.readdirSync(folderPath, 'utf8').sort(compareFiles);
    const imagePaths = fileNames
        .map((name) => path.join(folderPath, name))
        .filter((filePath) => getFileType(filePath) === FILE_TYPES.IMAGE);

    return {
        paths: imagePaths.slice(0, 4),
        total: imagePaths.length,
    };
}
