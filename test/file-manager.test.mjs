import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
    compareFiles,
    FILE_TYPES,
    getBaseFile,
    getFolderFiles,
    getLeadingKeys,
    getLeadingNumbers,
} from '../dist/file-manager.js';

test('getBaseFile searches the current and parent folders without crossing the filesystem root', () => {
    const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'folder-player-base-search-'));
    const folderPath = path.join(rootPath, 'child');

    try {
        fs.mkdirSync(folderPath, { recursive: true });
        const basePath = path.join(rootPath, 'base.vmix');
        fs.writeFileSync(basePath, '');

        assert.equal(getBaseFile(folderPath), basePath);
        assert.equal(getBaseFile(path.parse(rootPath).root), null);
    } finally {
        fs.rmSync(rootPath, { recursive: true, force: true });
    }
});

test('getBaseFile returns no preset when multiple bases exist in the closest folder', () => {
    const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'folder-player-base-ambiguous-'));
    const folderPath = path.join(rootPath, 'child');

    try {
        fs.mkdirSync(folderPath);
        fs.writeFileSync(path.join(folderPath, 'base.vmix'), '');
        fs.writeFileSync(path.join(folderPath, 'base alternate.vmix'), '');

        assert.equal(getBaseFile(folderPath), null);
    } finally {
        fs.rmSync(rootPath, { recursive: true, force: true });
    }
});

test('getLeadingNumbers parses primary and secondary numeric prefixes', () => {
    assert.deepEqual(getLeadingNumbers('04_Sadhguru_IECO and Possiblities.mp4'), [4, -1]);
    assert.deepEqual(getLeadingNumbers('06_1 Slide.png'), [6, 1]);
    assert.deepEqual(getLeadingNumbers('No number.mp3'), [-1, -1]);
});

test('getLeadingKeys expands reusable overlay prefixes', () => {
    assert.deepEqual(getLeadingKeys('03+08 Photos'), ['3', '8']);
    assert.deepEqual(getLeadingKeys('03+08_Photos'), ['3', '8']);
    assert.deepEqual(getLeadingKeys('03_1+08_2 Photos'), ['3_1', '8_2']);
    assert.deepEqual(getLeadingKeys('Unnumbered.mp3'), ['']);
});

test('compareFiles orders numeric prefixes before sub-items and unnumbered files', () => {
    const names = ['intro.mp3', '06_2 Slide.png', '06_1 Slide.png', '04 Video.mp4'];

    assert.deepEqual(names.sort(compareFiles), [
        '04 Video.mp4',
        '06_1 Slide.png',
        '06_2 Slide.png',
        'intro.mp3',
    ]);
});

test('getFolderFiles maps numbered files and ignores unnumbered files', () => {
    const folderPath = fs.mkdtempSync(path.join(os.tmpdir(), 'folder-player-'));

    try {
        fs.writeFileSync(path.join(folderPath, '03 Audio.mp3'), '');
        fs.writeFileSync(path.join(folderPath, '08 Audio.mp3'), '');
        fs.mkdirSync(path.join(folderPath, '03+08 Photos'));
        fs.writeFileSync(path.join(folderPath, '04_Sadhguru_IECO and Possiblities.mp4'), '');
        fs.writeFileSync(path.join(folderPath, '06 Audio.m4a'), '');
        fs.writeFileSync(path.join(folderPath, '07 Video.mkv'), '');
        fs.writeFileSync(path.join(folderPath, '10 Deck.pptx'), '');
        fs.writeFileSync(path.join(folderPath, '09 Protected Video.m4p'), '');
        fs.writeFileSync(path.join(folderPath, '__05 Hidden.mp3'), '');
        fs.writeFileSync(path.join(folderPath, 'Intro.mp3'), '');

        const fileMap = getFolderFiles(folderPath);

        assert.equal(fileMap.get('3')?.length, 2);
        assert.equal(fileMap.get('8')?.length, 2);
        assert.equal(fileMap.get('4')?.[0].type, FILE_TYPES.VIDEO);
        assert.equal(fileMap.get('6')?.[0].type, FILE_TYPES.AUDIO);
        assert.equal(fileMap.get('7')?.[0].type, FILE_TYPES.VIDEO);
        assert.equal(fileMap.get('10')?.[0].type, FILE_TYPES.POWERPOINT);
        assert.equal(fileMap.get('9')?.[0].type, FILE_TYPES.VIDEO);
        assert.equal(fileMap.has('5'), false);
        assert.equal(fileMap.has(''), false);
        assert.equal(
            fileMap.get('3')?.some((file) => path.basename(file.path) === '03+08 Photos'),
            true,
        );
        assert.equal(
            fileMap.get('8')?.some((file) => path.basename(file.path) === '03+08 Photos'),
            true,
        );
    } finally {
        fs.rmSync(folderPath, { recursive: true, force: true });
    }
});
