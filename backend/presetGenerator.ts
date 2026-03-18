import fs from 'fs';
import path from 'path';
import { exec, spawn } from 'child_process';

export async function setupVmix(folderPath: string, baseFile: string) {
    // const vmixStarted = await isVmixRunning();

    // if (!vmixStarted) {
    //     startVmix();
    //     await waitForVmixReady();
    // }

    const res = await vMixCall();
    if (res.error) {
        throw new Error('Not able to connect to vMix on port 8088');
    }

    const presetPath = createPresetFile(folderPath, baseFile);

    // await vMixCall('OpenPreset', { Value: presetPath });

    // await sleep(1000);
    // await waitForVmixReady();
    // await sleep(1000);

    // await addFolderInputs(folderPath);

    // await vmixCall('SavePreset');

    return presetPath;
}

function sleep(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
}

function isVmixRunning(): Promise<boolean> {
    return new Promise((resolve) => {
        exec('tasklist', (err, stdout) => {
            if (err) return resolve(false);

            resolve(stdout.toLowerCase().includes('vmix.exe'));
        });
    });
}

function startVmix() {
    const vmixPath = 'C:\\Program Files (x86)\\vMix\\vMix64.exe'; // adjust if needed

    spawn(vmixPath, [], {
        detached: true,
        stdio: 'ignore',
    }).unref();
}

function createPresetFile(folderPath: string, baseFile: string) {
    const folderName = path.basename(folderPath);
    const parentName = path.basename(path.dirname(folderPath));

    const outputName = `${parentName} ${folderName}.vmix`;
    const outputPath = path.join(folderPath, outputName);

    fs.copyFileSync(baseFile, outputPath);

    return outputPath;
}

async function waitForVmixReady() {
    for (let i = 0; i < 20; i++) {
        const info = await vMixCall();
        if (info.value !== null) return;
        await sleep(500);
    }

    throw new Error('vMix not ready');
}

const IMAGE_EXT = ['.jpg', '.png', '.jpeg'];
const VIDEO_EXT = ['.mp4', '.mov'];
const AUDIO_EXT = ['.mp3', '.wav'];

function detectType(file: string) {
    const ext = path.extname(file).toLowerCase();

    if (IMAGE_EXT.includes(ext)) return 'Image';
    if (VIDEO_EXT.includes(ext)) return 'Video';
    if (AUDIO_EXT.includes(ext)) return 'AudioFile';

    return null;
}

async function addFolderInputs(folderPath: string) {
    let files = fs.readdirSync(folderPath);

    files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    for (const file of files) {
        const type = detectType(file);
        if (!type) continue;

        const fullPath = path.join(folderPath, file);

        await vMixCall('AddInput', { Value: `${type}|${fullPath}` });
        await sleep(200);
    }
}

// ===== vMix API =====
async function vMixCall(func = '', params: Record<string, any> = {}, host = 'localhost') {
    const fullHost = host.includes(':') ? host : host + ':8088';
    const query = new URLSearchParams({
        Function: func,
        ...params,
    });
    const url = `http:/${fullHost}/api/?${func ? query : ''}`;

    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
        const data = await response.text();
        return {
            status: response.status,
            value: data,
            error: null,
        };
    } catch (error) {
        return {
            status: null,
            value: null,
            error: error,
        };
    }
}
