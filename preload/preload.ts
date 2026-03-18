import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
    selectPlayFolder: () => ipcRenderer.invoke('select-play-folder'),
    selectBaseFile: () => ipcRenderer.invoke('select-base-file'),
    playFolder: (data: { folderPath: string; baseFile: string }) =>
        ipcRenderer.invoke('play-folder', data),
    getVmixState: () => ipcRenderer.invoke('get-vmix-state'),
});
