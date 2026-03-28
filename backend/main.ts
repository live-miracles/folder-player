import { app, BrowserWindow, ipcMain, dialog, session } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { createPresetFile } from './preset-generator.js';
import { vMixCall, getVmixState } from './vmix-api.js';
import { getFolderFiles } from './file-manager.js';
import { getFolderConfig, saveFolderConfig } from './config-api.js';

import updater from 'electron-updater';
const { autoUpdater } = updater;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow;

function createWindow(): void {
    console.log(__dirname, path.join(__dirname, 'preload.js'));
    mainWindow = new BrowserWindow({
        title: `Folder Player ${app.getVersion()}`,
        width: 1200,
        height: 800,
        icon: path.join(__dirname, '../ui/icon-256.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        },
    });
    mainWindow.setMenuBarVisibility(false);

    mainWindow.loadFile(path.join(__dirname, '../ui/index.html'));

    // For Camera / Mic permissions
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
        if (permission === 'media') {
            callback(true);
        } else {
            callback(false);
        }
    });
}

app.whenReady().then(() => {
    createWindow();

    autoUpdater.checkForUpdatesAndNotify();

    autoUpdater.on('update-available', () => {
        mainWindow.webContents.send('update-available');
    });

    autoUpdater.on('download-progress', (p) => {
        mainWindow.webContents.send('update-progress', p.percent);
    });

    autoUpdater.on('update-downloaded', () => {
        mainWindow.webContents.send('update-ready');
    });
});

ipcMain.on('install-update', () => autoUpdater.quitAndInstall());

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// ===== Frontend API =====

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

ipcMain.handle('create-preset', (_, { folderPath, baseFile }) => {
    createPresetFile(folderPath, baseFile);
});
ipcMain.handle('play-folder', async (_, { folderPath, baseFile }) => {
    await setupVmix(folderPath, baseFile);
});

ipcMain.handle('get-vmix-state', async () => await getVmixState());
ipcMain.handle('set-vmix-active', async (_, index) => vMixCall('Stinger1', { Input: index }));
ipcMain.handle('set-vmix-preview', async (_, index) => vMixCall('PreviewInput', { Input: index }));
ipcMain.handle('get-folder-files', async (_, folderPath) => Array.from(getFolderFiles(folderPath)));
ipcMain.handle('get-folder-config', async (_, folderPath) =>
    Array.from(getFolderConfig(folderPath)),
);
ipcMain.handle('save-folder-config', async (_, { folderPath, text }) =>
    saveFolderConfig(folderPath, text),
);

// ===== vMix =====

async function setupVmix(folderPath: string, baseFile: string) {
    const res = await vMixCall();
    if (res.error) {
        throw new Error('Failed connecting to vMix');
    }

    // Build preset path
    const folderName = path.basename(folderPath);
    const parentName = path.basename(path.dirname(folderPath));
    const outputName = `${parentName} ${folderName}.vmix`;
    const presetPath = path.join(folderPath, outputName);

    // Create only if it doesn't exist
    if (!fs.existsSync(presetPath)) {
        createPresetFile(folderPath, baseFile);
    }

    await vMixCall('StopExternal');
    await sleep(500);
    await vMixCall('StopStreaming');
    await sleep(500);
    await vMixCall('StopRecording');
    await sleep(500);
    await vMixCall('OpenPreset', { Value: presetPath });
    await sleep(5000);
    await vMixCall('StartExternal');
}

function sleep(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
}
