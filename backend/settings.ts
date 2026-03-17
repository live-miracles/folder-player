import Store, { Schema } from 'electron-store';

type Settings = {
    baseFile: string;
    slideshowTime: number;
    recentFolders: string[];
};

const schema: Schema<Settings> = {
    baseFile: {
        type: 'string',
        default: '',
    },
    slideshowTime: {
        type: 'number',
        default: 0,
    },
    recentFolders: {
        type: 'array',
        default: [],
    },
};

const store = new Store<Settings>({ schema, clearInvalidConfig: true });

export function getBaseFile() {
    return store.get('baseFile');
}

export function setBaseFile(file: string) {
    store.set('baseFile', file);
}

export function getSlideshowTime() {
    return store.get('slideshowTime');
}

export function setSlideshowTime(seconds: number) {
    store.set('slideshowTime', seconds);
}

export function getRecentFolders() {
    return store.get('recentFolders');
}

export function addRecentFolder(folder: string) {
    const folders = store.get('recentFolders');

    const updated = [folder, ...folders.filter((f) => f !== folder)].slice(0, 5);

    store.set('recentFolders', updated);
}
