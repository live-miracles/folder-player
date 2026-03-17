import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    getBaseFile,
    setBaseFile,
    getSlideshowTime,
    setSlideshowTime,
    getRecentFolders,
    addRecentFolder,
} from './settings.js';

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

// ===== Settings Storage =====

ipcMain.handle('set-slideshow-time', (_, seconds: number) => {
    setSlideshowTime(seconds);
});

ipcMain.handle('select-base-file', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'vMix preset', extensions: ['vmix'] }],
    });

    if (result.canceled) return null;

    const file = result.filePaths[0];

    setBaseFile(file ? file : '');

    return file;
});

ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
    });

    if (result.canceled) return null;

    const folder = result.filePaths[0];

    addRecentFolder(folder);

    return folder;
});

ipcMain.handle('get-slideshow-time', () => getSlideshowTime());
ipcMain.handle('get-base-file', () => getBaseFile());
ipcMain.handle('get-recent-folders', () => getRecentFolders());
