export type Alert = {
    key: string; // '' for alerts about the whole folder
    type: string;
    msg: string;
    files?: string[];
};

// The parts of PlaylistItem (backend/playlist.ts) the config page uses
export type PlaylistItem = {
    key: string;
    files: { path: string; type: string; id: string }[]; // main file first, then its overlay
    overlay: { id: string } | null;
    cameraOnTop: boolean; // where Cam sits when the camera option is on
};

// Mirrors ItemOptions in backend/config-file.ts, which owns the config file format
export type ItemOptions = {
    types: string[];
    cam: boolean;
    mic: boolean;
    loop: boolean;
    volume: number;
    seconds: number;
    extra: string[];
};

export type ConfigSubfolder = { path: string; relative: string; errors: number; warnings: number };

// What get-folder-state returns: getFolderView in backend/config-api.ts
export type FolderView = {
    folder: string;
    baseFile: string | null;
    items: PlaylistItem[]; // in playlist order
    config: [string, ItemOptions][]; // every key, defaults filled in by the backend
    alerts: Alert[];
    hasConfig: boolean;
    isContainer: boolean;
    subfolders: ConfigSubfolder[];
};

export type PresetReport = { folder: string; baseFile: string | null; alerts: Alert[] };

// Mirrors preload/preload.ts. The preload, backend and ui are compiled separately, so this is
// kept in step by hand; keep the channel list there and here the same.
export interface FolderPlayerApi {
    onUpdateAvailable(cb: () => void): void;
    onUpdateProgress(cb: (progress: number) => void): void;
    onUpdateReady(cb: () => void): void;
    downloadUpdate(): void;
    installUpdate(): void;
    selectPlayFolder(currentFolder?: string): Promise<string | null>;
    createPreset(
        folderPath: string,
        enableBus: string,
        collapse: boolean,
        customParentFolder: string,
    ): Promise<PresetReport[]>;
    getFolderPreviewImages(folderPath: string): Promise<{ paths: string[]; total: number }>;
    getFolderState(folderPath: string): Promise<FolderView>;
    saveFolderConfig(data: { folderPath: string; config: [string, ItemOptions][] }): Promise<void>;
    zoomIn(): void;
    zoomOut(): void;
    zoomReset(): void;
    onChange(cb: (zoom: number) => void): void;
}

declare global {
    interface Window {
        api: FolderPlayerApi;
    }
}
