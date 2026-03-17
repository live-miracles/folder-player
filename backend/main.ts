import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const configPath = path.join(app.getPath('userData'), 'config.json');
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

ipcMain.handle('select-vmix-file', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'vMix Preset', extensions: ['vmix'] }],
    });

    if (result.canceled) return null;

    const vmixPath = result.filePaths[0];

    // save to config
    fs.writeFileSync(configPath, JSON.stringify({ vmixPath }));
    console.log(configPath);

    return vmixPath;
});
