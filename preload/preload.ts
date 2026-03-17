import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    selectBaseFile: () => ipcRenderer.invoke('select-base-file'),

    getRecentFolders: () => ipcRenderer.invoke('get-recent-folders'),

    getBaseFile: () => ipcRenderer.invoke('get-base-file'),

    getSlideshowTime: () => ipcRenderer.invoke('get-slideshow-time'),
    setSlideshowTime: (seconds: number) => ipcRenderer.invoke('set-slideshow-time', seconds),
});
