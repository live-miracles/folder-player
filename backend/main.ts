import { app, BrowserWindow, ipcMain, dialog, session, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { createPresetFileRecursively } from './preset-generator.js';
import { vMixCall, getVmixState } from './vmix-api.js';
import { getFolderFiles } from './file-manager.js';
import { ALERT, getFolderState, saveFolderConfig } from './config-api.js';

import updater from 'electron-updater';
const { autoUpdater } = updater;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow;

function createWindow(): void {
    console.log(__dirname, path.join(__dirname, 'preload.js'));
    mainWindow = new BrowserWindow({
        title: `vMix Folder Player ${app.getVersion()}`,
        width: 1200,
        height: 800,
        icon: path.join(__dirname, '../ui/icon-256.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        },
    });
    mainWindow.setMenuBarVisibility(false);

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    mainWindow.loadFile(path.join(__dirname, '../ui/index.html'));

    setupZoom(mainWindow);

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

    autoUpdater.autoDownload = false;
    autoUpdater.checkForUpdates();

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

ipcMain.on('download-update', () => autoUpdater.downloadUpdate());
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

ipcMain.handle('create-preset', (_, { folderPath, baseFile, enableBus, collapse }) => {
    return createPresetFileRecursively(folderPath, baseFile, enableBus, collapse);
});
ipcMain.handle(
    'play-folder',
    async (_, { folderPath, baseFile, enableBus, collapse, vmixApiUrl }) => {
        await setupVmix(folderPath, baseFile, enableBus, collapse, vmixApiUrl);
    },
);

ipcMain.handle('get-vmix-state', async (_, vmixApiUrl) => await getVmixState(vmixApiUrl));
ipcMain.handle('vmix-call', async (_, { func, params, vmixApiUrl }) =>
    vMixCall(func, params, vmixApiUrl),
);

ipcMain.handle('get-folder-files', async (_, folderPath) => Array.from(getFolderFiles(folderPath)));
ipcMain.handle('get-folder-state', async (_, folderPath) => {
    const state = getFolderState(folderPath);
    if (state === null) {
        return null;
    }
    if (state.config === null) {
        state.config = new Map();
        state.alerts.push({
            key: '',
            type: ALERT.WARNING,
            msg: 'No config file in the folder.',
        });
    }
    return {
        folder: state.folder,
        files: Array.from(state.files.entries()),
        config: Array.from(state.config.entries()),
        alerts: state.alerts,
    };
});
ipcMain.handle('save-folder-config', async (_, { folderPath, text }) =>
    saveFolderConfig(folderPath, text),
);

// ===== vMix =====

async function setupVmix(
    folderPath: string,
    baseFile: string,
    enableBus: string,
    collapse: boolean,
    vmixApiUrl: string,
) {
    const res = await vMixCall('', {}, vmixApiUrl);
    if (res.error) {
        throw new Error('Failed connecting to vMix');
    }

    // Build preset path
    const folderName = path.basename(folderPath);
    const presetPath = path.join(folderPath, `${folderName}.vmix`);

    if (!fs.existsSync(presetPath)) {
        throw new Error('Please generate vMix preset first.');
    }

    await vMixCall('StopExternal', {}, vmixApiUrl);
    await sleep(500);
    await vMixCall('StopStreaming', {}, vmixApiUrl);
    await sleep(500);
    await vMixCall('StopRecording', {}, vmixApiUrl);
    await sleep(500);
    await vMixCall('OpenPreset', { Value: presetPath }, vmixApiUrl);
    await sleep(5000);
    await vMixCall('StartExternal', {}, vmixApiUrl);
}

function sleep(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
}

// ===== Zooming =====

export function setupZoom(win: BrowserWindow) {
    const zoom = (delta: number) => {
        const wc = win.webContents;
        let z = wc.getZoomFactor();

        z = Math.round(Math.max(0.3, Math.min(3, z + delta)) * 10) / 10;
        wc.setZoomFactor(z);

        win.webContents.send('zoom-changed', z);
    };

    const setZoom = (z: number) => {
        win.webContents.setZoomFactor(z);
        win.webContents.send('zoom-changed', z);
    };

    ipcMain.on('zoom-in', () => zoom(0.1));
    ipcMain.on('zoom-out', () => zoom(-0.1));
    ipcMain.on('zoom-reset', () => setZoom(1));
}
