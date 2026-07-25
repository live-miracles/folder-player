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

        createPresetFileRecursively(contentPath, '', '', false, customParentPath);

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

test('createPresetFileRecursively uses content folder parent for custom paths with default base preset', () => {
    const parentPath = fs.mkdtempSync(path.join(os.tmpdir(), 'folder-player-parent-'));
    const defaultBaseParentPath = fs.mkdtempSync(
        path.join(os.tmpdir(), 'folder-player-default-base-'),
    );
    const contentPath = path.join(parentPath, 'content');
    const defaultBasePath = path.join(defaultBaseParentPath, 'default base.vmix');
    const customParentPath = path.join(os.tmpdir(), 'folder-player-custom-parent');

    try {
        fs.mkdirSync(contentPath);
        fs.writeFileSync(defaultBasePath, '<Preset>\r\n  <State />\r\n</Preset>');
        fs.writeFileSync(path.join(contentPath, 'folder-player.txt'), '1');
        fs.writeFileSync(path.join(contentPath, '01 Video.mp4'), '');

        createPresetFileRecursively(contentPath, defaultBasePath, '', false, customParentPath);

        const outputPath = path.join(contentPath, 'content.vmix');
        const output = fs.readFileSync(outputPath, 'utf-8');
        const rewrittenMediaPath = path.join(customParentPath, 'content', '01 Video.mp4');

        assert.match(output, new RegExp(escapeRegExp(rewrittenMediaPath)));
        assert.doesNotMatch(
            output,
            new RegExp(escapeRegExp(path.join(contentPath, '01 Video.mp4'))),
        );
    } finally {
        fs.rmSync(parentPath, { recursive: true, force: true });
        fs.rmSync(defaultBaseParentPath, { recursive: true, force: true });
    }
});

function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
