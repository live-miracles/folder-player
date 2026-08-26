import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { createPresetFileRecursively, getRewrittenFilePath } from '../dist/preset-generator.js';

test('getRewrittenFilePath maps files under the rewrite source parent', () => {
    const baseParent = path.join(os.tmpdir(), 'folder-player-base-parent');
    const customParent = path.join(os.tmpdir(), 'folder-player-custom-parent');
    const mediaFile = path.join(baseParent, 'content', 'video.mp4');

    assert.equal(
        getRewrittenFilePath(mediaFile, baseParent, customParent),
        path.join(customParent, 'content', 'video.mp4'),
    );
});

test('getRewrittenFilePath handles custom parent paths with or without trailing slash', () => {
    const baseParent = path.join(os.tmpdir(), 'folder-player-base-parent');
    const customParent = path.join(os.tmpdir(), 'folder-player-custom-parent');
    const mediaFile = path.join(baseParent, 'content', 'video.mp4');
    const expectedPath = path.join(customParent, 'content', 'video.mp4');

    assert.equal(getRewrittenFilePath(mediaFile, baseParent, customParent), expectedPath);
    assert.equal(
        getRewrittenFilePath(mediaFile, baseParent, customParent + path.sep),
        expectedPath,
    );
});

test('getRewrittenFilePath maps UNC network paths with a local custom parent', () => {
    const sourceParent = String.raw`\\192.168.99.125\Share\Live Stream\July 24-28 \EU English v001`;
    const mediaFile = path.join(sourceParent, 'Day 1', '01 Video.mp4');
    const customParent = String.raw`D:\Livestream`;

    assert.equal(
        getRewrittenFilePath(mediaFile, sourceParent, customParent),
        path.join(customParent, 'Day 1', '01 Video.mp4'),
    );
});

test('getRewrittenFilePath maps UNC network paths with a UNC custom parent', () => {
    const sourceParent = String.raw`\\192.168.99.123\Share\Live Stream\July 24-28`;
    const mediaFile = path.join(sourceParent, 'EU English v001', 'Day 1', '01 Video.mp4');
    const customParent = String.raw`\\192.168.99.126\Live_Output`;

    assert.equal(
        getRewrittenFilePath(mediaFile, sourceParent, customParent),
        path.join(customParent, 'EU English v001', 'Day 1', '01 Video.mp4'),
    );
});

test('getRewrittenFilePath does not rewrite files outside the UNC source parent', () => {
    const sourceParent = String.raw`\\192.168.99.123\Share\Live Stream\July 24-28\EU English v001`;
    const mediaFile = String.raw`\\192.168.99.126\Other_Share\Day 1\01 Video.mp4`;
    const customParent = String.raw`D:\Livestream`;

    assert.equal(getRewrittenFilePath(mediaFile, sourceParent, customParent), mediaFile);
});

test('createPresetFileRecursively preserves nearby base preset parent folder in custom parent paths', () => {
    const parentPath = fs.mkdtempSync(path.join(os.tmpdir(), 'folder-player-parent-'));
    const contentPath = path.join(parentPath, 'content');
    const customParentPath = path.join(os.tmpdir(), 'folder-player-custom-parent');

    try {
        fs.mkdirSync(contentPath);
        fs.writeFileSync(
            path.join(parentPath, 'base file.vmix'),
            '<Preset>\r\n  <State />\r\n</Preset>',
        );
        fs.writeFileSync(path.join(contentPath, 'folder-player.txt'), '1');
        fs.writeFileSync(path.join(contentPath, '01 Video.mp4'), '');

        createPresetFileRecursively(contentPath, '', false, customParentPath);

        const outputPath = path.join(contentPath, 'content.vmix');
        const output = fs.readFileSync(outputPath, 'utf-8');
        const rewrittenMediaPath = path.join(
            customParentPath,
            path.basename(parentPath),
            'content',
            '01 Video.mp4',
        );

        assert.match(output, new RegExp(escapeRegExp(rewrittenMediaPath)));
        assert.doesNotMatch(
            output,
            new RegExp(escapeRegExp(path.join(contentPath, '01 Video.mp4'))),
        );
    } finally {
        fs.rmSync(parentPath, { recursive: true, force: true });
    }
});

test('createPresetFileRecursively reports missing bases per folder and continues recursively', () => {
    const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'folder-player-recursive-'));
    const successPath = path.join(rootPath, 'success');
    const failurePath = path.join(rootPath, 'branch', 'failure');

    try {
        fs.mkdirSync(successPath);
        fs.mkdirSync(failurePath, { recursive: true });

        fs.writeFileSync(path.join(successPath, 'base.vmix'), '<Preset>\r\n<State />\r\n</Preset>');
        fs.writeFileSync(path.join(successPath, 'folder-player.txt'), '1');
        fs.writeFileSync(path.join(successPath, '01 Video.mp4'), '');
        fs.writeFileSync(path.join(failurePath, 'folder-player.txt'), '1');
        fs.writeFileSync(path.join(failurePath, '01 Video.mp4'), '');

        const report = createPresetFileRecursively(rootPath, '', false);
        const successReport = report.find(({ folder }) => folder === successPath);
        const failureReport = report.find(({ folder }) => folder === failurePath);

        assert.equal(report.length, 2);
        assert.equal(successReport?.alerts.length, 0);
        assert.equal(fs.existsSync(path.join(successPath, 'success.vmix')), true);
        assert.match(failureReport?.alerts[0]?.msg ?? '', /Not able to find the base preset/);
        assert.equal(fs.existsSync(path.join(failurePath, 'failure.vmix')), false);
    } finally {
        fs.rmSync(rootPath, { recursive: true, force: true });
    }
});

test('createPresetFileRecursively rejects filesystem roots', () => {
    const filesystemRoot = path.parse(process.cwd()).root;

    assert.throws(
        () => createPresetFileRecursively(filesystemRoot, '', false),
        /Please select a content folder instead of a filesystem root/,
    );
});

test('createPresetFileRecursively puts Mic before Cam when both are selected', () => {
    const folderPath = fs.mkdtempSync(path.join(os.tmpdir(), 'folder-player-camera-mic-'));
    const basePath = path.join(folderPath, 'base.vmix');

    try {
        fs.writeFileSync(
            basePath,
            '<Preset>\r\n' +
                '<Input Title="Cam" Key="cam-key" />\r\n' +
                '<Input Title="Mic" Key="mic-key" />\r\n' +
                '<State />\r\n</Preset>',
        );
        fs.writeFileSync(path.join(folderPath, 'folder-player.txt'), '1 cam mic');
        fs.writeFileSync(path.join(folderPath, '01 Image.jpg'), '');

        const report = createPresetFileRecursively(folderPath, '', false);
        const output = fs.readFileSync(
            path.join(folderPath, `${path.basename(folderPath)}.vmix`),
            'utf-8',
        );

        assert.equal(report[0].alerts.length, 0);
        assert.match(output, /Overlay0="mic-key" Overlay1="cam-key"/);
    } finally {
        fs.rmSync(folderPath, { recursive: true, force: true });
    }
});

test('createPresetFileRecursively uses only Cam for a camera-only image', () => {
    const folderPath = fs.mkdtempSync(path.join(os.tmpdir(), 'folder-player-image-camera-'));
    const basePath = path.join(folderPath, 'base.vmix');

    try {
        fs.writeFileSync(
            basePath,
            '<Preset>\r\n<Input Title="Cam" Key="cam-key" />\r\n<Input Title="Mic" Key="mic-key" />\r\n<State />\r\n</Preset>',
        );
        fs.writeFileSync(path.join(folderPath, 'folder-player.txt'), '1 cam');
        fs.writeFileSync(path.join(folderPath, '01 Image.jpg'), '');

        createPresetFileRecursively(folderPath, '', false);
        const output = fs.readFileSync(
            path.join(folderPath, `${path.basename(folderPath)}.vmix`),
            'utf-8',
        );

        assert.match(output, /Overlay0="cam-key" Overlay1="[^"]+"/);
        assert.doesNotMatch(output, /Overlay0="mic-key"/);
    } finally {
        fs.rmSync(folderPath, { recursive: true, force: true });
    }
});

test('createPresetFileRecursively emits multiple visuals individually', () => {
    const folderPath = fs.mkdtempSync(path.join(os.tmpdir(), 'folder-player-multiple-visuals-'));
    const basePath = path.join(folderPath, 'base.vmix');

    try {
        fs.writeFileSync(basePath, '<Preset>\r\n<State />\r\n</Preset>');
        fs.writeFileSync(path.join(folderPath, 'folder-player.txt'), '1');
        fs.writeFileSync(path.join(folderPath, '01 Image.png'), '');
        fs.mkdirSync(path.join(folderPath, '01 Photos'));

        createPresetFileRecursively(folderPath, '', false);
        const output = fs.readFileSync(
            path.join(folderPath, `${path.basename(folderPath)}.vmix`),
            'utf-8',
        );

        assert.equal((output.match(/<Input/g) ?? []).length, 2);
    } finally {
        fs.rmSync(folderPath, { recursive: true, force: true });
    }
});

test('createPresetFileRecursively reports missing camera base inputs', () => {
    const folderPath = fs.mkdtempSync(path.join(os.tmpdir(), 'folder-player-camera-errors-'));
    const basePath = path.join(folderPath, 'base.vmix');

    try {
        fs.writeFileSync(basePath, '<Preset>\r\n<State />\r\n</Preset>');
        fs.writeFileSync(path.join(folderPath, 'folder-player.txt'), '1 mic\r\n2 cam');
        fs.writeFileSync(path.join(folderPath, '01 Image.jpg'), '');
        fs.writeFileSync(path.join(folderPath, '02 Image.jpg'), '');

        const report = createPresetFileRecursively(folderPath, '', false);
        const alerts = report[0].alerts;

        assert.equal(alerts.length, 2);
        assert.deepEqual(
            alerts.map((alert) => [alert.key, alert.type]),
            [
                ['1', 'error'],
                ['2', 'error'],
            ],
        );
        assert.match(alerts[0].msg, /missing the 'Mic' input/);
        assert.match(alerts[1].msg, /missing the 'Cam' input/);
    } finally {
        fs.rmSync(folderPath, { recursive: true, force: true });
    }
});

test('createPresetFileRecursively puts camera directly on PowerPoint inputs', () => {
    const folderPath = fs.mkdtempSync(path.join(os.tmpdir(), 'folder-player-pptx-camera-'));
    const basePath = path.join(folderPath, 'base.vmix');

    try {
        fs.writeFileSync(
            basePath,
            '<Preset>\r\n<Input Title="Cam" Key="cam-key" />\r\n<State />\r\n</Preset>',
        );
        fs.writeFileSync(path.join(folderPath, 'folder-player.txt'), '1 cam');
        fs.writeFileSync(path.join(folderPath, '01 Deck.pptx'), '');

        createPresetFileRecursively(folderPath, '', false);
        const output = fs.readFileSync(
            path.join(folderPath, `${path.basename(folderPath)}.vmix`),
            'utf-8',
        );

        assert.match(output, /Type="3"[^>]*Overlay0="cam-key"/s);
        assert.doesNotMatch(output, /Type="12"/);
    } finally {
        fs.rmSync(folderPath, { recursive: true, force: true });
    }
});

function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
