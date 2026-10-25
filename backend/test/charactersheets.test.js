// backend/test/charactersheets.test.js: `npm test`. Every character is the same height off the ground and has the same shadow: one standard shadow in every cell of
// every overworld character sheet, nothing drawn under it, and one feet line for all of them (CONFIG.CHARACTER_FRAME.feetPad).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { CONFIG } from '../../shared/core/constants.js';

const read = (p) => fs.readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const SHEETS = {
    legionaryHeroSprite: 'legionary_hero/legionary_hero_sprite.png',
    legionaryCompanionSprite: 'legionary_companion/legionary_companion_sprite.png',
    warlordHeroSprite: 'warlord_hero/warlord_hero_sprite.png',
    nightbladeHeroSprite: 'nightblade_hero/nightblade_hero_sprite.png',
    madmanSprite: 'madman/madman_sprite.png',
    shadyMerchantSprite: 'shady_merchant/shady_merchant_spritesheet.png',
    snowLeopardSprite: 'snow_leopard/snow_leopard_sprite.png',
    germanSheepherdSprite: 'dogs/german_sheepherd_sprite.png',
};
const SHADOW_RGB = [62, 59, 56];
const SHADOW_ROWS = [51, 56];     // the standard shadow: rows 51..56 of the 64 x 64 frame
const LOWEST_ROW = 56;

function readPng(rel) {
    const b = fs.readFileSync(new URL('../../frontend/src/assets/sprites/' + rel, import.meta.url));
    const w = b.readUInt32BE(16), h = b.readUInt32BE(20);
    assert.equal(b[24], 8); assert.equal(b[25], 6, `${rel} is 8-bit RGBA`);
    const idat = []; let p = 8;
    while (p < b.length) { const len = b.readUInt32BE(p), type = b.toString('ascii', p + 4, p + 8); if (type === 'IDAT') idat.push(b.subarray(p + 8, p + 8 + len)); p += 12 + len; }
    const raw = zlib.inflateSync(Buffer.concat(idat)), stride = w * 4, px = Buffer.alloc(h * stride);
    for (let y = 0; y < h; y++) {
        const f = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
        for (let x = 0; x < stride; x++) {
            const a = x >= 4 ? px[y * stride + x - 4] : 0, up = y ? px[(y - 1) * stride + x] : 0, c = x >= 4 && y ? px[(y - 1) * stride + x - 4] : 0;
            let v = line[x];
            if (f === 1) v += a; else if (f === 2) v += up; else if (f === 3) v += (a + up) >> 1;
            else if (f === 4) { const pa = Math.abs(up - c), pb = Math.abs(a - c), pc = Math.abs(a + up - 2 * c); v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? up : c); }
            px[y * stride + x] = v & 255;
        }
    }
    return { w, h, at: (x, y) => px.subarray(y * stride + x * 4, y * stride + x * 4 + 4) };
}
const isShadow = (p) => p[3] === 255 && p[0] === SHADOW_RGB[0] && p[1] === SHADOW_RGB[1] && p[2] === SHADOW_RGB[2];

/* The cells of a sheet that hold a figure, as { col, row }. */
function cells(img) {
    const out = [];
    for (let row = 0; row < img.h / 64; row++) for (let col = 0; col < img.w / 64; col++) {
        let any = false;
        for (let y = 0; y < 64 && !any; y++) for (let x = 0; x < 64; x++) if (img.at(col * 64 + x, row * 64 + y)[3] > 0) { any = true; break; }
        if (any) out.push({ col, row });
    }
    return out;
}

// The shadow: a perfect oval, symmetric left-right and top-bottom, 20 px wide and 6 rows tall, centred on the middle line of the 64 px frame (between columns 31 and 32).
const OVAL = [12, 18, 20, 20, 18, 12];     // widths of rows 51..56
const ovalCells = () => OVAL.flatMap((w, i) => Array.from({ length: w }, (_, k) => [32 - w / 2 + k, SHADOW_ROWS[0] + i]));

test('the shadow is a perfect oval: the same widths from the middle outwards, top and bottom', () => {
    assert.equal(OVAL.length, SHADOW_ROWS[1] - SHADOW_ROWS[0] + 1);
    assert.deepEqual(OVAL, [...OVAL].reverse(), 'the same above and below its middle');
    assert.ok(OVAL.every(w => w % 2 === 0), 'even widths centre exactly on the frame\'s middle line');
    assert.ok(OVAL.every((w, i) => i === 0 || w >= OVAL[i - 1] || i >= OVAL.length / 2), 'widening to the middle, narrowing after it');
});

test('every character sheet is 8 frames across and has that oval, whole and alone, in every frame', () => {
    const oval = new Set(ovalCells().map(([x, y]) => x + ',' + y));
    for (const [key, rel] of Object.entries(SHEETS)) {
        const img = readPng(rel);
        assert.equal(img.w, 512, `${key} is 8 frames of 64 px`);
        const list = cells(img);
        assert.ok(list.length >= 96, `${key} has its 12 rows of figures`);
        for (const c of list) {
            for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
                const p = img.at(c.col * 64 + x, c.row * 64 + y);
                if (oval.has(x + ',' + y)) assert.ok(p[3] > 0, `${key} frame ${c.col},${c.row}: the oval is whole at ${x},${y}`);   // a foot may stand on it
                else if (y >= SHADOW_ROWS[0]) assert.ok(!isShadow(p), `${key} frame ${c.col},${c.row}: no shadow colour outside the oval at ${x},${y}`);
            }
        }
    }
});

test('nothing is drawn below the shadow, in any frame of any sheet: every character stands on the same line', () => {
    for (const [key, rel] of Object.entries(SHEETS)) {
        const img = readPng(rel);
        let lowest = -1;
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) if (img.at(x, y)[3] > 0) lowest = Math.max(lowest, y % 64);
        assert.equal(lowest, LOWEST_ROW, `${key}: the lowest drawn pixel in a frame is row ${LOWEST_ROW}`);
    }
    assert.equal(CONFIG.CHARACTER_FRAME.feetPad, 63 - LOWEST_ROW, 'and the map puts that row on the tile\'s bottom edge for all of them');
});

test('the figures of every sheet stand with their feet on the same row (51)', () => {
    for (const [key, rel] of Object.entries(SHEETS)) {
        const img = readPng(rel);
        const feet = [];
        for (const c of cells(img).filter(c => c.row < 4)) {          // the idle rows
            let low = -1;
            for (let y = 0; y < 57; y++) for (let x = 0; x < 64; x++) { const p = img.at(c.col * 64 + x, c.row * 64 + y); if (p[3] > 0 && !isShadow(p)) low = Math.max(low, y); }
            feet.push(low);
        }
        feet.sort((a, b) => a - b);
        assert.equal(feet[Math.floor((feet.length - 1) / 2)], 51, `${key}: idle feet row`);   // the lower median: an idle bob may lift a frame by a pixel
    }
});

test('the map no longer reads the standing line from each sheet\'s pixels', () => {
    assert.equal(typeof CONFIG.CHARACTER_FRAME.feetPad, 'number');
    assert.ok(/feetPad: 7/.test(read('shared/core/constants.js')));
});
