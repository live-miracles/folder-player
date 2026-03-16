import { app, BrowserWindow } from 'electron';
import { ipcMain, dialog } from 'electron';
import path from 'path';

function createWindow(): void {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: path.join(__dirname, '../../ui/icon.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    win.loadFile(path.join(__dirname, '../../ui/index.html'));
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
        filters: [{ name: 'vMix Presets', extensions: ['vmix'] }],
    });

    if (result.canceled) return null;

    return result.filePaths[0];
});
