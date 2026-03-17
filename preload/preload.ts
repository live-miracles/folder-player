import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
    openFolder: () => ipcRenderer.invoke('open-folder'),
    getRecents: () => ipcRenderer.invoke('get-recents'),
    selectVmixFile: () => ipcRenderer.invoke('select-vmix-file'),
});
