import fs from 'fs';
import path from 'path';

export function scanFolder(folderPath: string) {
    const files = fs.readdirSync(folderPath);

    const media = files.filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return ['.mp4', '.mov', '.mkv', '.mp3', '.wav', '.jpg', '.png'].includes(ext);
    });

    return media.sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
    );
}
