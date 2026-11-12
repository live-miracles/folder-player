import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { addInputs, findBasePreset } from '../dist/base-preset.js';

test('findBasePreset searches the current and parent folders without crossing the filesystem root', () => {
    const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'folder-player-base-search-'));
    const folderPath = path.join(rootPath, 'child');

    try {
        fs.mkdirSync(folderPath, { recursive: true });
        const basePath = path.join(rootPath, 'base.vmix');
        fs.writeFileSync(
            basePath,
            '<Preset><Input Title="Cam" Key="cam-key" /><Input Title="Mic" /><State /></Preset>',
        );

        const base = findBasePreset(folderPath);
        assert.equal(base.status, 'found');
        assert.equal(base.path, basePath);
        assert.equal(base.camKey, 'cam-key');
        assert.equal(base.micKey, null); // an input without a key can't be layered
        assert.deepEqual(findBasePreset(path.parse(rootPath).root), { status: 'missing' });
    } finally {
        fs.rmSync(rootPath, { recursive: true, force: true });
    }
});

test('findBasePreset reports every base preset when the closest folder has several', () => {
    const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'folder-player-base-ambiguous-'));
    const folderPath = path.join(rootPath, 'child');

    try {
        fs.mkdirSync(folderPath);
        fs.writeFileSync(path.join(rootPath, 'base.vmix'), '');
        fs.writeFileSync(path.join(folderPath, 'base.vmix'), '');
        fs.writeFileSync(path.join(folderPath, 'base alternate.vmix'), '');

        const base = findBasePreset(folderPath);
        assert.equal(base.status, 'ambiguous');
        assert.deepEqual([...base.files].sort(), ['base alternate.vmix', 'base.vmix']);
    } finally {
        fs.rmSync(rootPath, { recursive: true, force: true });
    }
});

test('addInputs inserts inputs before the State tag', () => {
    assert.equal(
        addInputs('<Preset>\r\n  <State />\r\n</Preset>', ['<Input A />', '<Input B />']),
        '<Preset>\r\n  <Input A />\r\n<Input B />\r\n\r\n  <State />\r\n</Preset>',
    );
    assert.throws(() => addInputs('<Preset />', []), /<State \/> tag not found/);
});
