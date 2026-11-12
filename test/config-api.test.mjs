import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { getConfigSubfolders, getFolderState } from '../dist/config-api.js';

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
        const duplicateVideoAlerts = state.alerts.filter((alert) => alert.key === '4');
        const multipleVisualAlerts = state.alerts.filter((alert) => alert.key === '5');

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

test('getFolderState reports missing base preset and skips camera and microphone alerts', () => {
    const folderPath = fs.mkdtempSync(path.join(os.tmpdir(), 'folder-player-config-no-base-'));

    try {
        fs.writeFileSync(path.join(folderPath, 'folder-player.txt'), '1 mic\r\n2 cam');
        fs.writeFileSync(path.join(folderPath, '01 Image.jpg'), '');
        fs.writeFileSync(path.join(folderPath, '02 Image.jpg'), '');

        const alerts = getFolderState(folderPath).alerts;

        const baseAlerts = alerts.filter((alert) =>
            alert.msg.includes('Not able to find the base preset'),
        );
        assert.equal(baseAlerts.length, 1);
        assert.equal(baseAlerts[0].type, 'error');
        assert.equal(
            alerts.some((alert) => alert.msg.includes("missing the 'Mic' input")),
            false,
        );
        assert.equal(
            alerts.some((alert) => alert.msg.includes("missing the 'Cam' input")),
            false,
        );
    } finally {
        fs.rmSync(folderPath, { recursive: true, force: true });
    }
});

test('getFolderState reports missing base preset without a config file', () => {
    const folderPath = fs.mkdtempSync(path.join(os.tmpdir(), 'folder-player-config-no-config-'));

    try {
        fs.writeFileSync(path.join(folderPath, '01 Image.jpg'), '');

        const alerts = getFolderState(folderPath).alerts;

        assert.equal(
            alerts.filter((alert) => alert.msg.includes('Not able to find the base preset')).length,
            1,
        );
        assert.equal(
            alerts.some((alert) => alert.msg.includes('missing the')),
            false,
        );
    } finally {
        fs.rmSync(folderPath, { recursive: true, force: true });
    }
});

test('getFolderState reports ambiguous base presets', () => {
    const folderPath = fs.mkdtempSync(
        path.join(os.tmpdir(), 'folder-player-config-ambiguous-base-'),
    );

    try {
        fs.writeFileSync(path.join(folderPath, 'base.vmix'), '<Preset><State /></Preset>');
        fs.writeFileSync(
            path.join(folderPath, 'base alternate.vmix'),
            '<Preset><State /></Preset>',
        );
        fs.writeFileSync(path.join(folderPath, 'folder-player.txt'), '1 Image');
        fs.writeFileSync(path.join(folderPath, '01 Image.jpg'), '');

        const alerts = getFolderState(folderPath).alerts;

        assert.equal(
            alerts.filter((alert) => alert.msg.includes('Multiple base presets')).length,
            1,
        );
        assert.equal(
            alerts.some((alert) => alert.msg.includes('Not able to find the base preset')),
            false,
        );
    } finally {
        fs.rmSync(folderPath, { recursive: true, force: true });
    }
});

test('getFolderState reports each missing base camera or microphone input once', () => {
    const folderPath = fs.mkdtempSync(path.join(os.tmpdir(), 'folder-player-config-base-inputs-'));

    try {
        fs.writeFileSync(path.join(folderPath, 'base.vmix'), '<Preset>\r\n<State />\r\n</Preset>');
        fs.writeFileSync(path.join(folderPath, 'folder-player.txt'), '1 mic\r\n2 cam\r\n3 mic cam');
        fs.writeFileSync(path.join(folderPath, '01 Image.jpg'), '');
        fs.writeFileSync(path.join(folderPath, '02 Image.jpg'), '');
        fs.writeFileSync(path.join(folderPath, '03 Image.jpg'), '');

        const alerts = getFolderState(folderPath).alerts;

        assert.equal(alerts.filter((alert) => alert.msg.includes("'Mic' input")).length, 1);
        assert.equal(alerts.filter((alert) => alert.msg.includes("'Cam' input")).length, 1);
        assert.equal(
            alerts
                .filter(
                    (alert) =>
                        alert.msg.includes("missing the 'Mic' input") ||
                        alert.msg.includes("missing the 'Cam' input"),
                )
                .every((alert) => alert.key === ''),
            true,
        );
    } finally {
        fs.rmSync(folderPath, { recursive: true, force: true });
    }
});

test('getFolderState warns about extra .vmix presets besides base and generated', () => {
    const parentPath = fs.mkdtempSync(path.join(os.tmpdir(), 'folder-player-config-extra-vmix-'));
    const folderPath = path.join(parentPath, 'Session');

    try {
        fs.mkdirSync(folderPath);
        fs.writeFileSync(path.join(folderPath, 'base.vmix'), '<XML><State /></XML>');
        fs.writeFileSync(path.join(folderPath, 'Session.vmix'), '');
        fs.writeFileSync(path.join(folderPath, 'Old copy.vmix'), '');
        fs.writeFileSync(path.join(folderPath, '01 Video.mp4'), '');

        const state = getFolderState(folderPath);
        const extra = state.alerts.filter((alert) =>
            alert.msg.includes('additional .vmix presets'),
        );

        assert.equal(extra.length, 1);
        assert.equal(extra[0].type, 'warning');
        assert.deepEqual(extra[0].files, ['Old copy.vmix']);
    } finally {
        fs.rmSync(parentPath, { recursive: true, force: true });
    }
});

test('getFolderState does not warn when only base and generated presets exist', () => {
    const parentPath = fs.mkdtempSync(path.join(os.tmpdir(), 'folder-player-config-only-vmix-'));
    const folderPath = path.join(parentPath, 'Session');

    try {
        fs.mkdirSync(folderPath);
        fs.writeFileSync(path.join(folderPath, 'Base Studio.vmix'), '<XML><State /></XML>');
        fs.writeFileSync(path.join(folderPath, 'session.VMIX'), '');
        fs.writeFileSync(path.join(folderPath, '01 Video.mp4'), '');

        const state = getFolderState(folderPath);

        assert.equal(
            state.alerts.some((alert) => alert.msg.includes('additional .vmix presets')),
            false,
        );
    } finally {
        fs.rmSync(parentPath, { recursive: true, force: true });
    }
});

test('getConfigSubfolders lists nested folders that have a config file', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'folder-player-subs-'));

    try {
        fs.mkdirSync(path.join(root, 'Day 2'));
        fs.mkdirSync(path.join(root, 'Day 10'));
        fs.mkdirSync(path.join(root, 'Day 2', 'Evening'));
        fs.mkdirSync(path.join(root, 'No config'));
        fs.writeFileSync(path.join(root, 'Day 2', 'folder-player.txt'), '');
        fs.writeFileSync(path.join(root, 'Day 10', 'folder-player.txt'), '');
        fs.writeFileSync(path.join(root, 'Day 2', 'Evening', 'folder-player.txt'), '');

        const subfolders = getConfigSubfolders(root);

        assert.deepEqual(
            subfolders.map((sub) => sub.relative),
            ['Day 2', path.join('Day 2', 'Evening'), 'Day 10'],
        );
        assert.equal(subfolders[0].path, path.join(root, 'Day 2'));
        // No base preset anywhere, so each playlist reports an error
        assert.ok(subfolders.every((sub) => sub.errors > 0));
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

test('getFolderState warns about out-of-range values in the config file', () => {
    const folderPath = fs.mkdtempSync(path.join(os.tmpdir(), 'folder-player-config-range-'));

    try {
        fs.writeFileSync(path.join(folderPath, 'base.vmix'), '<Preset><State /></Preset>');
        fs.writeFileSync(
            path.join(folderPath, 'folder-player.txt'),
            '1 AudioFile Image loop 2000%',
        );
        fs.writeFileSync(path.join(folderPath, '01 Audio.mp3'), '');
        fs.writeFileSync(path.join(folderPath, '01 Slide.png'), '');

        const state = getFolderState(folderPath);

        assert.equal(state.config.get('1').volume, 100);
        assert.deepEqual(
            state.alerts.map((alert) => [alert.key, alert.type]),
            [['1', 'warning']],
        );
        assert.match(state.alerts[0].msg, /Volume 2000% is out of range/);
    } finally {
        fs.rmSync(folderPath, { recursive: true, force: true });
    }
});
