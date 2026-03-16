import { exec } from 'child_process';

export function launchVMix(presetPath: string) {
    const vmixPath = `"C:\\Program Files (x86)\\vMix\\vMix64.exe"`;

    exec(`${vmixPath} "${presetPath}"`);
}
