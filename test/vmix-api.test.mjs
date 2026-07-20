import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeVmixApiUrl } from '../dist/vmix-api.js';

test('normalizeVmixApiUrl handles blank values and trailing slashes', () => {
    assert.equal(normalizeVmixApiUrl(''), 'http://localhost:8088');
    assert.equal(normalizeVmixApiUrl('http://localhost:8088'), 'http://localhost:8088');
    assert.equal(normalizeVmixApiUrl('http://localhost:8088/'), 'http://localhost:8088');
});
