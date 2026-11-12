// Example scenario (vMix Folder Player README demo). Copy it to the scratchpad and adapt.
// Run: <electron> record.mjs --app <repo>/dist/main.js --scenario this.mjs --out <dir>

const DEMO = 'L:\\Film Night'; // demo folder mapped to a short drive letter with `subst`

import fs from 'fs';
import path from 'path';

// Runs before the app loads: reset files earlier runs wrote, and stub native
// dialogs so the demo never blocks on them
export function setup({ dialog }) {
    for (const f of ['folder-player.txt', 'Film Night.vmix']) {
        fs.rmSync(path.join(DEMO, f), { force: true });
    }
    dialog.showOpenDialogSync = () => [DEMO];
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [DEMO] });
}

export default async function run(d) {
    d.record.start();
    await d.sleep(700); // a beat on the empty start screen

    await d.click('#select-play-folder-btn', { wait: 1200 });
    await d.click('#edit-config-btn', { wait: 1800 });
    await d.shot('config-list');

    await d.click('#config-preview-view-btn', { wait: 300 });
    await d.waitFor('#config-preview-view input[type=checkbox]'); // async render
    await d.sleep(1200);

    // Hidden checkbox inputs ignore a visible click: tag and click their <label>
    const card = `[...document.querySelectorAll('#config-preview-view section')].find(s => s.textContent.includes('03 Host'))`;
    const cam = await d.tag(
        `${card}.querySelectorAll('input[type=checkbox]')[0].closest('label')`,
        'demo-cam',
    );
    const mic = await d.tag(
        `${card}.querySelectorAll('input[type=checkbox]')[1].closest('label')`,
        'demo-mic',
    );
    await d.click(cam, { wait: 1100 });
    await d.click(mic, { wait: 1100 });
    await d.shot('config-preview');

    await d.click('#save-config-btn', { wait: 1200 });
    await d.click('#cancel-config-btn', { wait: 1200 });
    await d.click('#create-preset-btn', { wait: 2200 });
    await d.shot('report');
    await d.record.stop();

    // Prove the demo's actions took effect: the config should say `3 Image cam mic`
    d.log('saved config:\n' + fs.readFileSync(path.join(DEMO, 'folder-player.txt'), 'utf8'));
    d.log('preset written: ' + fs.existsSync(path.join(DEMO, 'Film Night.vmix')));
}
