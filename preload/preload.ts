import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
    onUpdateAvailable: (cb: () => void) => ipcRenderer.on('update-available', cb),
    onUpdateProgress: (cb: (progress: number) => void) =>
        ipcRenderer.on('update-progress', (_, p) => cb(p)),
    onUpdateReady: (cb: () => void) => ipcRenderer.on('update-ready', cb),
    installUpdate: () => ipcRenderer.send('install-update'),

    selectPlayFolder: () => ipcRenderer.invoke('select-play-folder'),
    selectBaseFile: () => ipcRenderer.invoke('select-base-file'),
    createPreset: (folderPath: string, baseFile: string, enableBus: string, collapse: boolean) =>
        ipcRenderer.invoke('create-preset', { folderPath, baseFile, enableBus, collapse }),
    playFolder: (folderPath: string, baseFile: string, enableBus: string, collapse: boolean) =>
        ipcRenderer.invoke('play-folder', { folderPath, baseFile, enableBus, collapse }),
    getVmixState: () => ipcRenderer.invoke('get-vmix-state'),
    vMixCall: (func: string, params: any = {}) => ipcRenderer.invoke('vmix-call', { func, params }),
    getFolderFiles: (folderPath: string) => ipcRenderer.invoke('get-folder-files', folderPath),
    getFolderConfig: (folderPath: string) => ipcRenderer.invoke('get-folder-config', folderPath),
    saveFolderConfig: (data: { folderPath: string; text: string }) =>
        ipcRenderer.invoke('save-folder-config', data),
});
