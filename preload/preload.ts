import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
    onUpdateAvailable: (cb: () => void) => ipcRenderer.on('update-available', cb),
    onUpdateProgress: (cb: (progress: number) => void) =>
        ipcRenderer.on('update-progress', (_, p) => cb(p)),
    onUpdateReady: (cb: () => void) => ipcRenderer.on('update-ready', cb),
    downloadUpdate: () => ipcRenderer.send('download-update'),
    installUpdate: () => ipcRenderer.send('install-update'),

    selectPlayFolder: () => ipcRenderer.invoke('select-play-folder'),
    selectBaseFile: () => ipcRenderer.invoke('select-base-file'),
    createPreset: (folderPath: string, baseFile: string, enableBus: string, collapse: boolean) =>
        ipcRenderer.invoke('create-preset', { folderPath, baseFile, enableBus, collapse }),
    playFolder: (
        folderPath: string,
        baseFile: string,
        enableBus: string,
        collapse: boolean,
        vmixApiUrl: string,
    ) =>
        ipcRenderer.invoke('play-folder', {
            folderPath,
            baseFile,
            enableBus,
            collapse,
            vmixApiUrl,
        }),
    getVmixState: (vmixApiUrl: string) => ipcRenderer.invoke('get-vmix-state', vmixApiUrl),
    vMixCall: (func: string, params: any = {}, vmixApiUrl: string) =>
        ipcRenderer.invoke('vmix-call', { func, params, vmixApiUrl }),
    getFolderFiles: (folderPath: string) => ipcRenderer.invoke('get-folder-files', folderPath),
    getFolderState: (folderPath: string) => ipcRenderer.invoke('get-folder-state', folderPath),
    saveFolderConfig: (data: { folderPath: string; text: string }) =>
        ipcRenderer.invoke('save-folder-config', data),
    zoomIn: () => ipcRenderer.send('zoom-in'),
    zoomOut: () => ipcRenderer.send('zoom-out'),
    zoomReset: () => ipcRenderer.send('zoom-reset'),
    onChange: (cb: (z: number) => void) => ipcRenderer.on('zoom-changed', (_, z) => cb(z)),
});
