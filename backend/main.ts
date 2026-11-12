import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { createPresetFileRecursively } from './preset-generator.js';
import { getFolderFiles, getFolderPreviewImages } from './file-manager.js';
import { ALERT, getConfigSubfolders, getFolderState } from './config-api.js';
import { getItemOptions, writeConfig, type ItemOptions } from './config-file.js';

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
        backgroundColor: '#08090a',
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

ipcMain.handle('select-play-folder', async (_, currentFolder?: string) => {
    const options: Electron.OpenDialogOptions = { properties: ['openDirectory'] };

    try {
        if (
            currentFolder &&
            fs.existsSync(currentFolder) &&
            fs.statSync(currentFolder).isDirectory()
        ) {
            options.defaultPath = currentFolder;
        }
    } catch {
        // If a network path is unavailable, fall back to the system default folder.
    }

    const result = dialog.showOpenDialogSync(mainWindow, options);
    return result?.[0] ?? null;
});

ipcMain.handle('create-preset', (_, { folderPath, enableBus, collapse, customParentFolder }) => {
    return createPresetFileRecursively(folderPath, enableBus, collapse, customParentFolder);
});

ipcMain.handle('get-folder-files', async (_, folderPath) => Array.from(getFolderFiles(folderPath)));
ipcMain.handle('get-folder-preview-images', async (_, folderPath) =>
    getFolderPreviewImages(folderPath),
);
ipcMain.handle('get-folder-state', async (_, folderPath) => {
    const state = getFolderState(folderPath);
    if (state === null) {
        return null;
    }
    const hasConfig = state.config !== null;
    const subfolders = hasConfig ? [] : getConfigSubfolders(folderPath);
    // A folder with no config and no media that only groups playlists in its subfolders
    const isContainer = !hasConfig && state.files.size === 0 && subfolders.length > 0;

    let alerts = state.alerts;
    if (isContainer) {
        alerts = []; // base preset and config checks don't apply to a grouping folder
    } else if (!hasConfig) {
        alerts.push({
            key: '',
            type: ALERT.WARNING,
            msg: 'No config file in the folder.',
        });
    }
    return {
        folder: state.folder,
        baseFile: state.baseFile,
        files: Array.from(state.files.entries()),
        // Every key with files or config, defaults filled in, so the page never needs its own
        config: Array.from(new Set([...state.files.keys(), ...(state.config?.keys() ?? [])]))
            .filter((key) => key !== '')
            .map((key) => [key, getItemOptions(state.config, key)]),
        alerts,
        hasConfig,
        isContainer,
        subfolders,
    };
});
ipcMain.handle(
    'save-folder-config',
    async (_, { folderPath, config }: { folderPath: string; config: [string, ItemOptions][] }) =>
        writeConfig(folderPath, new Map(config)),
);

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
