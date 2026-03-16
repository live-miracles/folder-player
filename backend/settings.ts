import fs from 'fs';
import path from 'path';
import { app } from 'electron';

const settingsPath = path.join(app.getPath('userData'), 'settings.json');

export function loadSettings() {
    if (!fs.existsSync(settingsPath)) {
        return { recentFolders: [] };
    }

    return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
}

export function saveSettings(data: any) {
    fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2));
}
