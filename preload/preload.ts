import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
    selectPlayFolder: () => ipcRenderer.invoke('select-play-folder'),
    selectBaseFile: () => ipcRenderer.invoke('select-base-file'),
    createPreset: (data: { folderPath: string; baseFile: string }) =>
        ipcRenderer.invoke('create-preset', data),
    playFolder: (data: { folderPath: string; baseFile: string }) =>
        ipcRenderer.invoke('play-folder', data),
    getVmixState: () => ipcRenderer.invoke('get-vmix-state'),
    setVmixActive: (index: number) => ipcRenderer.invoke('set-vmix-active', index),
    setVmixPreview: (index: number) => ipcRenderer.invoke('set-vmix-preview', index),
    getFolderFiles: (folderPath: string) => ipcRenderer.invoke('get-folder-files', folderPath),
    getFolderConfig: (folderPath: string) => ipcRenderer.invoke('get-folder-config', folderPath),
    saveFolderConfig: (data: { folderPath: string; text: string }) =>
        ipcRenderer.invoke('save-folder-config', data),
});
