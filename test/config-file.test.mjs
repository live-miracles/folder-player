import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
    defaultItemOptions,
    parseConfig,
    readConfig,
    serializeConfig,
    writeConfig,
} from '../dist/config-file.js';

const roundTrip = (text) => serializeConfig(parseConfig(text).config);

test('parseConfig reads typed item options with defaults filled in', () => {
    const { config, alerts } = parseConfig('03 AudioFile Image cam mic loop 150%\r\n5 Photos 5s');

    assert.deepEqual(config.get('3'), {
        ...defaultItemOptions(),
        types: ['AudioFile', 'Image'],
        cam: true,
        mic: true,
        loop: true,
        volume: 150,
    });
    assert.equal(config.get('5').seconds, 5);
    assert.equal(config.get('5').volume, 100);
    assert.deepEqual(alerts, []);
});

test('parseConfig does not read the Photos type as a seconds value', () => {
    const { config } = parseConfig('5 Photos');

    assert.equal(config.get('5').seconds, 10);
    assert.deepEqual(config.get('5').types, ['Photos']);
    assert.deepEqual(config.get('5').extra, []);
});

test('serializeConfig leaves default values out', () => {
    assert.equal(roundTrip('1 Video loop 100% 10s'), '1 Video loop');
});

test('serializeConfig writes types in a fixed order, audio or video first', () => {
    assert.equal(roundTrip('2 Image Video cam'), '2 Video Image cam');
});

test('serializeConfig keeps words it does not recognise', () => {
    assert.equal(roundTrip('4 cam future-option'), '4 cam future-option');
});

test('serializeConfig splits a shared + line into one line per key', () => {
    assert.equal(roundTrip('03+08 cam'), '3 cam\r\n8 cam');
});

test('serializeConfig keeps sub-keys in playlist order', () => {
    assert.equal(roundTrip('3_2 cam\r\n10 mic\r\n3_1 loop'), '3_1 loop\r\n3_2 cam\r\n10 mic');
});

test('serializeConfig leaves out keys that only have types', () => {
    assert.equal(roundTrip('1 Video\r\n2 Image cam'), '2 Image cam');
});

test('parseConfig warns about out-of-range values and keeps them in the file', () => {
    const { config, alerts } = parseConfig('3 2000% 0s');

    assert.equal(config.get('3').volume, 100);
    assert.equal(config.get('3').seconds, 10);
    assert.deepEqual(config.get('3').extra, ['2000%', '0s']);
    assert.equal(alerts.length, 2);
    assert.equal(alerts[0].key, '3');
    assert.equal(alerts[0].type, 'warning');
    assert.match(alerts[0].msg, /Volume 2000% is out of range \(0–1000%\), using 100%/);
    assert.match(alerts[1].msg, /Seconds 0s is out of range \(1–1000s\), using 10s/);
    assert.equal(roundTrip('3 2000% 0s'), '3 2000% 0s');
});

test('serializeConfig rejects out-of-range values', () => {
    const config = new Map([['1', { ...defaultItemOptions(), volume: 1001 }]]);
    assert.throws(() => serializeConfig(config), /Volume for 1 must be .* between 0 and 1000/);

    config.set('1', { ...defaultItemOptions(), seconds: NaN });
    assert.throws(() => serializeConfig(config), /Seconds per slide for 1 must be/);
});

test('writeConfig and readConfig round-trip through the config file', () => {
    const folderPath = fs.mkdtempSync(path.join(os.tmpdir(), 'folder-player-config-file-'));

    try {
        assert.equal(readConfig(folderPath), null);

        const config = new Map([
            ['1', { ...defaultItemOptions(), types: ['Video'], cam: true, volume: 80 }],
            ['7', { ...defaultItemOptions(), mic: true }],
        ]);
        writeConfig(folderPath, config);

        assert.equal(
            fs.readFileSync(path.join(folderPath, 'folder-player.txt'), 'utf-8'),
            '1 Video cam 80%\r\n7 mic',
        );
        assert.deepEqual(readConfig(folderPath).config, config);
    } finally {
        fs.rmSync(folderPath, { recursive: true, force: true });
    }
});
