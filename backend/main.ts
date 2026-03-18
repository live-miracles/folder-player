import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

import { setupVmix } from './presetGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow(): void {
    console.log(__dirname, path.join(__dirname, 'preload.js'));
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: path.join(__dirname, '../ui/icon.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    win.loadFile(path.join(__dirname, '../ui/index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// ===== File System API =====

ipcMain.handle('select-base-file', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'vMix preset', extensions: ['vmix'] }],
    });
    if (result.canceled) return null;
    return result.filePaths[0];
});

ipcMain.handle('select-play-folder', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    if (result.canceled) return null;
    return result.filePaths[0];
});

ipcMain.handle('play-folder', async (_, { folderPath, baseFile }) => {
    const presetPath = await setupVmix(folderPath, baseFile);
    return { success: true, presetPath };
});
