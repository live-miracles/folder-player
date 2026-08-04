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

        assert.deepEqual(audioOnly?.files, ['01 Audio.mp3']);
        assert.deepEqual(videoOverlay?.files, ['02 Slide.png', '02 Video.mp4']);
        assert.deepEqual(duplicateAudio?.files, ['03 Music.wav', '03 Voice.mp3']);
    } finally {
        fs.rmSync(folderPath, { recursive: true, force: true });
    }
});
