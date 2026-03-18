import { exec, spawn } from 'child_process';

export function isVmixRunning(): Promise<boolean> {
    return new Promise((resolve) => {
        exec('tasklist', (err, stdout) => {
            if (err) return resolve(false);

            resolve(stdout.toLowerCase().includes('vmix.exe'));
        });
    });
}

export function startVmix() {
    const vmixPath = 'C:\\Program Files (x86)\\vMix\\vMix64.exe'; // adjust if needed

    spawn(vmixPath, [], {
        detached: true,
        stdio: 'ignore',
    }).unref();
}
