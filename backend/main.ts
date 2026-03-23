import { app, BrowserWindow, ipcMain, dialog, session } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

import { createPresetFile } from './preset-generator.js';
import { vMixCall, getVmixState } from './vmix-api.js';
import { getFolderFiles } from './file-manager.js';
import { getFolderConfig, saveFolderConfig } from './config-api.js';

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

    // For Camera / Mic permissions
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
        if (permission === 'media') {
            callback(true);
        } else {
            callback(false);
        }
    });
}

app.whenReady().then(createWindow);

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

ipcMain.handle('play-folder', async (_, { folderPath, baseFile }) => {
    const presetPath = await setupVmix(folderPath, baseFile);
    return { success: true, presetPath };
});

ipcMain.handle('get-vmix-state', async () => await getVmixState());
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

    const presetPath = createPresetFile(folderPath, baseFile);

    await vMixCall('StopExternal');
    await sleep(500);
    await vMixCall('StopStreaming');
    await sleep(500);
    await vMixCall('StopRecording');
    await sleep(500);
    await vMixCall('OpenPreset', { Value: presetPath });
    await sleep(5000);
    await vMixCall('StartExternal');

    // await sleep(1000);
    // await waitForVmixReady();
    // await sleep(1000);

    // await addFolderInputs(folderPath);

    // await vmixCall('SavePreset');
}

function sleep(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
}
