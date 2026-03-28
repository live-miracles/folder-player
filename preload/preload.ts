import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
    onUpdateAvailable: (cb: () => void) => ipcRenderer.on('update-available', cb),
    onUpdateProgress: (cb: (progress: number) => void) =>
        ipcRenderer.on('update-progress', (_, p) => cb(p)),
    onUpdateReady: (cb: () => void) => ipcRenderer.on('update-ready', cb),
    installUpdate: () => ipcRenderer.send('install-update'),

    selectPlayFolder: () => ipcRenderer.invoke('select-play-folder'),
    selectBaseFile: () => ipcRenderer.invoke('select-base-file'),
    createPreset: (data: { folderPath: string; baseFile: string; enableBus: string }) =>
        ipcRenderer.invoke('create-preset', data),
    playFolder: (data: { folderPath: string; baseFile: string; enableBus: string }) =>
        ipcRenderer.invoke('play-folder', data),
    getVmixState: () => ipcRenderer.invoke('get-vmix-state'),
    setVmixActive: (index: number) => ipcRenderer.invoke('set-vmix-active', index),
    setVmixPreview: (index: number) => ipcRenderer.invoke('set-vmix-preview', index),
    getFolderFiles: (folderPath: string) => ipcRenderer.invoke('get-folder-files', folderPath),
    getFolderConfig: (folderPath: string) => ipcRenderer.invoke('get-folder-config', folderPath),
    saveFolderConfig: (data: { folderPath: string; text: string }) =>
        ipcRenderer.invoke('save-folder-config', data),
});
