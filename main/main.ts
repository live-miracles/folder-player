import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { scanFolder } from './folderScanner';
import { generatePreset } from './presetGenerator';
import { launchVMix } from './vmixLauncher';
import { loadSettings, saveSettings } from './settings';

let mainWindow: BrowserWindow | null = null;

const isDev = !app.isPackaged;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 900,
        height: 650,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
        },
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }
}

app.whenReady().then(createWindow);

ipcMain.handle('open-folder', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
    });

    if (result.canceled) return null;

    const folder = result.filePaths[0];

    const files = scanFolder(folder);

    const tempPreset = path.join(app.getPath('temp'), 'folder-player.vmix');

    generatePreset(folder, tempPreset, files);

    launchVMix(tempPreset);

    const settings = loadSettings();

    settings.recentFolders = [
        folder,
        ...(settings.recentFolders || []).filter((f: string) => f !== folder),
    ].slice(0, 10);

    saveSettings(settings);

    return { folder, files };
});

ipcMain.handle('get-recents', () => {
    return loadSettings().recentFolders || [];
});
