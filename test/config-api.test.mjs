import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { getFolderState } from '../dist/config-api.js';

test('getFolderState includes issue file names in file-specific alerts', () => {
    const folderPath = fs.mkdtempSync(path.join(os.tmpdir(), 'folder-player-config-'));

    try {
        fs.writeFileSync(path.join(folderPath, '01 Audio.mp3'), '');
        fs.writeFileSync(path.join(folderPath, '02 Video.mp4'), '');
        fs.writeFileSync(path.join(folderPath, '02 Slide.png'), '');
        fs.writeFileSync(path.join(folderPath, '03 Voice.mp3'), '');
        fs.writeFileSync(path.join(folderPath, '03 Music.wav'), '');
        fs.writeFileSync(path.join(folderPath, '04 First.mp4'), '');
        fs.writeFileSync(path.join(folderPath, '04 Second.mp4'), '');
        fs.writeFileSync(path.join(folderPath, '05 Image.png'), '');
        fs.mkdirSync(path.join(folderPath, '05 Photos'));

        const state = getFolderState(folderPath);
        const audioOnly = state.alerts.find((alert) =>
            alert.msg.includes('Audio file without an image or slideshow.'),
        );
        const videoOverlay = state.alerts.find((alert) =>
            alert.msg.includes('Video file overlaid by an image or slideshow.'),
        );
        const duplicateAudio = state.alerts.find((alert) =>
            alert.msg.includes("Two files of type 'AudioFile'."),
        );
        const duplicateVideoAlerts = state.alerts.filter((alert) => alert.key === '04');
        const multipleVisualAlerts = state.alerts.filter((alert) => alert.key === '05');

        assert.deepEqual(audioOnly?.files, ['01 Audio.mp3']);
        assert.deepEqual(videoOverlay?.files, ['02 Slide.png', '02 Video.mp4']);
        assert.deepEqual(duplicateAudio?.files, ['03 Music.wav', '03 Voice.mp3']);
        assert.equal(duplicateVideoAlerts.length, 1);
        assert.match(duplicateVideoAlerts[0].msg, /Two files of type 'Video'/);
        assert.equal(multipleVisualAlerts.length, 1);
        assert.match(multipleVisualAlerts[0].msg, /Multiple visual files/);
    } finally {
        fs.rmSync(folderPath, { recursive: true, force: true });
    }
});

test('getFolderState does not warn about an audio-only camera entry', () => {
    const folderPath = fs.mkdtempSync(path.join(os.tmpdir(), 'folder-player-config-camera-audio-'));

    try {
        fs.writeFileSync(path.join(folderPath, 'folder-player.txt'), '01 cam');
        fs.writeFileSync(path.join(folderPath, '01 Audio.mp3'), '');

        const state = getFolderState(folderPath);

        assert.equal(
            state.alerts.some((alert) =>
                alert.msg.includes('Audio file without an image or slideshow.'),
            ),
            false,
        );
    } finally {
        fs.rmSync(folderPath, { recursive: true, force: true });
    }
});

test('getFolderState ignores the global cams option when checking file keys', () => {
    const folderPath = fs.mkdtempSync(path.join(os.tmpdir(), 'folder-player-config-options-'));

    try {
        fs.writeFileSync(
            path.join(folderPath, 'folder-player.txt'),
            '__options__ cams\r\n01 AudioFile',
        );
        fs.writeFileSync(path.join(folderPath, '01 Audio.mp3'), '');

        const state = getFolderState(folderPath);

        assert.equal(
            state.alerts.some((alert) => alert.msg.includes('no file with such number')),
            false,
        );
    } finally {
        fs.rmSync(folderPath, { recursive: true, force: true });
    }
});
