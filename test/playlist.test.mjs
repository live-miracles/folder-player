import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultItemOptions } from '../dist/config-file.js';
import { buildPlaylist } from '../dist/playlist.js';

const file = (name, type) => ({ path: `C:\\content\\${name}`, type, id: name });
const files = (entries) => new Map(entries);
const config = (entries) =>
    new Map(entries.map(([key, options]) => [key, { ...defaultItemOptions(), ...options }]));

test('buildPlaylist puts an overlay above audio, after Mic and Cam', () => {
    const audio = file('01 Talk.mp3', 'AudioFile');
    const slide = file('01 Slide.png', 'Image');
    const { items } = buildPlaylist(
        files([['1', [slide, audio]]]),
        config([['1', { cam: true, mic: true }]]),
    );

    assert.equal(items.length, 1);
    assert.deepEqual(items[0].input, { kind: 'file', file: audio });
    assert.equal(items[0].overlay, slide);
    assert.deepEqual(items[0].layers, ['mic', 'cam', 'overlay']);
    assert.deepEqual(items[0].files, [audio, slide]);
    assert.equal(items[0].cameraOnTop, false);
});

test('buildPlaylist puts a camera image on a colour input', () => {
    const image = file('02 Title.jpg', 'Image');
    const { items } = buildPlaylist(files([['2', [image]]]), config([['2', { cam: true }]]));

    assert.deepEqual(items[0].input, { kind: 'colour', title: '02 Title' });
    assert.equal(items[0].overlay, image);
    assert.deepEqual(items[0].layers, ['cam', 'overlay']);
});

test('buildPlaylist keeps an image without the camera as its own input', () => {
    const image = file('02 Title.jpg', 'Image');
    const { items } = buildPlaylist(files([['2', [image]]]), null);

    assert.deepEqual(items[0].input, { kind: 'file', file: image });
    assert.equal(items[0].overlay, null);
    assert.deepEqual(items[0].layers, []);
    assert.equal(items[0].cameraOnTop, false);
});

test('buildPlaylist puts the camera on top of slideshows and video', () => {
    const photos = file('03 Photos', 'Photos');
    const video = file('04 Clip.mp4', 'Video');
    const { items } = buildPlaylist(
        files([
            ['3', [photos]],
            ['4', [video]],
        ]),
        config([['3', { cam: true }]]),
    );

    assert.deepEqual(items[0].input, { kind: 'file', file: photos });
    assert.deepEqual(items[0].layers, ['cam']);
    assert.equal(items[0].cameraOnTop, true);
    assert.equal(items[1].cameraOnTop, true);
});

test('buildPlaylist marks invalid combinations and orders items by key', () => {
    const { items, alerts } = buildPlaylist(
        files([
            ['10', [file('10 A.mp4', 'Video')]],
            ['2', [file('02 A.mp3', 'AudioFile'), file('02 B.mp4', 'Video')]],
        ]),
        config([['2', { mic: true }]]),
    );

    assert.deepEqual(
        items.map((item) => item.key),
        ['2', '10'],
    );
    assert.deepEqual(items[0].input, { kind: 'invalid' });
    assert.deepEqual(items[0].layers, ['mic']);
    assert.deepEqual(
        items[0].files.map((f) => f.type),
        ['AudioFile', 'Video'],
    );
    assert.ok(alerts.some((alert) => alert.key === '2' && /Audio and video/.test(alert.msg)));
});

test('buildPlaylist reports config without files and gaps in the numbering', () => {
    const { alerts } = buildPlaylist(
        files([
            ['1', [file('01 A.mp4', 'Video')]],
            ['3', [file('03 A.mp4', 'Video')]],
        ]),
        config([['7', { cam: true }]]),
    );

    assert.deepEqual(
        alerts.map((alert) => [alert.key, alert.type, alert.msg]),
        [
            ['7', 'error', 'Config exists (cam), but no file with such number.'],
            ['2', 'warning', 'Sequence number is missing.'],
        ],
    );
});
