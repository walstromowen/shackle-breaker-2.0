// backend/test/fence.test.js: `npm test`. The wooden fence joins up: one post piece, the picture chosen from the neighbouring fences.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fenceConnections, fenceFrame, fenceHasTuft, FENCE_BITS, FENCE_FRAMES } from '../../shared/world/fenceConnections.js';
import { MAP_OBJECTS_DEFINITIONS } from '../../shared/world/mapObjectDefinitions.js';
import { STRUCTURES } from '../../shared/world/structures.js';

/** A little map from rows of text: # is a fence. */
const mapOf = (rows) => (c, r) => rows[r]?.[c] === '#';
const at = (rows, c, r) => fenceConnections(c, r, mapOf(rows));

test('connections add up N=1 E=2 S=4 W=8 from the neighbouring fences only', () => {
    const rows = [
        '.#.',
        '###',
        '.#.'
    ];
    assert.equal(at(rows, 1, 1), 15, 'a crossing joins all four ways');
    assert.equal(at(rows, 1, 0), FENCE_BITS.S, 'the top of a plus joins only down');
    assert.equal(at(rows, 0, 1), FENCE_BITS.E);
    assert.equal(at(rows, 2, 1), FENCE_BITS.W);
    assert.equal(at(rows, 1, 2), FENCE_BITS.N);
    assert.equal(fenceConnections(5, 5, () => false), 0, 'a lone post joins nothing');
});

test('a yard: the four corners, the straight runs and the ends beside a gap each get the right joins', () => {
    const yard = [
        '#####',
        '#...#',
        '#...#',
        '##.##'
    ];
    assert.equal(at(yard, 0, 0), FENCE_BITS.E | FENCE_BITS.S, 'top left');
    assert.equal(at(yard, 4, 0), FENCE_BITS.W | FENCE_BITS.S, 'top right');
    assert.equal(at(yard, 2, 0), FENCE_BITS.W | FENCE_BITS.E, 'along the top');
    assert.equal(at(yard, 0, 1), FENCE_BITS.N | FENCE_BITS.S, 'down the left');
    assert.equal(at(yard, 0, 3), FENCE_BITS.N | FENCE_BITS.E, 'bottom left');
    assert.equal(at(yard, 1, 3), FENCE_BITS.W, 'the end of the wall beside the gate');
    assert.equal(at(yard, 3, 3), FENCE_BITS.E, 'the other end');
    assert.equal(at(yard, 4, 3), FENCE_BITS.N | FENCE_BITS.W, 'bottom right');
});

test('a piece knocked out of a run leaves two clean ends', () => {
    const run = ['##.##'];
    assert.equal(at(run, 1, 0), FENCE_BITS.W);
    assert.equal(at(run, 3, 0), FENCE_BITS.E);
});

test('the frame is the connections plus 16 for a plain post; about a third keep their weeds; it never changes for a position', () => {
    let tufts = 0;
    for (let c = 0; c < 60; c++) for (let r = 0; r < 60; r++) {
        const f = fenceFrame(c, r, () => true);
        assert.ok(f === 15 || f === 31, `a crossing is frame 15 or 31, got ${f}`);
        assert.equal(f === 15, fenceHasTuft(c, r));
        assert.equal(fenceFrame(c, r, () => true), f, 'stable');
        if (fenceHasTuft(c, r)) tufts++;
    }
    const share = tufts / 3600;
    assert.ok(share > 0.25 && share < 0.42, `about a third have weeds, got ${share}`);
    for (let m = 0; m < 16; m++) {
        const pick = (c, r) => ((m & 1 && c === 0 && r === -1) || (m & 2 && c === 1 && r === 0) || (m & 4 && c === 0 && r === 1) || (m & 8 && c === -1 && r === 0));
        const f = fenceFrame(0, 0, pick);
        assert.ok(f % 16 === m && f < FENCE_FRAMES, `connections ${m} -> frame ${f}`);
    }
});

test('all six fence names are the one connecting piece, and the sheet really has that many frames', () => {
    const names = ['WOODEN_FENCE_H', 'WOODEN_FENCE_V', 'WOODEN_FENCE_TL_CORNER', 'WOODEN_FENCE_TR_CORNER', 'WOODEN_FENCE_BL_CORNER', 'WOODEN_FENCE_BR_CORNER'];
    for (const n of names) {
        const d = MAP_OBJECTS_DEFINITIONS[n];
        assert.equal(d.sheet, 'objWoodenFence', n);
        assert.equal(d.frames, FENCE_FRAMES, n);
        assert.equal(d.connects, 'fence', n);
        assert.equal(d.isSolid, true, n);
    }
    assert.equal(MAP_OBJECTS_DEFINITIONS.WOODEN_FENCE_FALLEN.connects, undefined, 'a fallen fence joins nothing');
    // a PNG's size is in its header: width at bytes 16..19, height at 20..23
    const png = readFileSync(new URL('../../frontend/src/assets/mapObjects/objWoodenFence.png', import.meta.url));
    assert.equal(png.readUInt32BE(16), 32 * FENCE_FRAMES);
    assert.equal(png.readUInt32BE(20), 32);
    const main = readFileSync(new URL('../../frontend/src/main.js', import.meta.url), 'utf8');
    assert.ok(main.includes("objWoodenFence: './assets/mapObjects/objWoodenFence.png'"));
    assert.ok(main.includes("objWoodenFenceFallen: './assets/mapObjects/objWoodenFenceFallen.png'"));
});

test('the yards in the village plans still have a closed fence ring with the gate as the only gap, and the fallen fence replaces the loose pieces', () => {
    const src = readFileSync(new URL('../../shared/world/structures.js', import.meta.url), 'utf8');
    assert.ok(!/put\(\d+, \d+, 'WOODEN_FENCE_H'\)/.test(src), 'no loose straight piece is left standing in the corners');
    assert.ok(src.includes("'WOODEN_FENCE_FALLEN'"));
    assert.ok(STRUCTURES, 'structures load');
});
