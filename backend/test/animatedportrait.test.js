// backend/test/animatedportrait.test.js: `npm test`. The portraits on the character creator, party and character summary screens loop the battle idle
// animation (frontend/src/ui/animatedPortrait.js): front-facing rows 0 and 1, a frame every 100 ms, only the frames the sheet really has.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { portraitFrame, PORTRAIT_FRAME_MS } from '../../frontend/src/ui/animatedPortrait.js';

const sheet = (w, h) => ({ width: w, height: h });

test('a full sheet loops 32 frames across rows 0 and 1, never the back-facing rows', () => {
    const img = sheet(2048, 1024);   // 16 x 8 frames of 128 px
    const seen = new Set();
    for (let t = 0; t < 40; t++) {
        const f = portraitFrame(img, { key: 'hero' }, t * PORTRAIT_FRAME_MS);
        assert.equal(f.size, 128);
        assert.ok(f.sy === 0 || f.sy === 128, `row ${f.sy / 128}`);
        seen.add(`${f.sx},${f.sy}`);
    }
    assert.equal(seen.size, 32);
});

test('a small sheet loops only the frames it has; a 192 px sheet uses 192 px frames', () => {
    for (let t = 0; t < 20; t++) {
        const f = portraitFrame(sheet(512, 256), { key: 'small' }, t * PORTRAIT_FRAME_MS);
        assert.ok(f.sx < 512 && f.sy < 256);
    }
    const one = portraitFrame(sheet(128, 128), {}, 12345);
    assert.deepEqual([one.sx, one.sy], [0, 0], 'a single picture stays still');
    const big = portraitFrame(sheet(3072, 384), { frameSize: 192, key: 'boss' }, 777);
    assert.equal(big.size, 192);
    assert.ok(big.sx % 192 === 0 && big.sy <= 192);
});

test('two characters do not move in step, and each screen draws through it', () => {
    const a = portraitFrame(sheet(2048, 1024), { name: 'Aldric' }, 0), b = portraitFrame(sheet(2048, 1024), { name: 'Brenna' }, 0);
    assert.notDeepEqual([a.sx, a.sy], [b.sx, b.sy]);
    for (const f of ['frontend/src/screens/characterCreator/characterCreatorRenderer.js', 'frontend/src/screens/party/partyRenderer.js',
        'frontend/src/screens/characterSummary/components/equipmentPanel.js']) {
        assert.ok(fs.readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8').includes('portraitFrame('), `${f} animates its portrait`);
    }
});
