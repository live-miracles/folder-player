import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
    selectPlayFolder: () => ipcRenderer.invoke('select-play-folder'),
    selectBaseFile: () => ipcRenderer.invoke('select-base-file'),
});
