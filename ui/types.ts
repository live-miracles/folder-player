export type Alert = {
    key?: string;
    type: string;
    msg: string;
    files?: string[];
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
