// backend/test/charactersheets.test.js: `npm test`. Every character is the same height off the ground and has the same shadow: one standard shadow in every cell of
// every overworld character sheet, nothing drawn under it, and one feet line for all of them (CONFIG.CHARACTER_FRAME.feetPad).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { decodePng } from './pngDecode.js';
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
const OLD_SHADOW_RGB = [62, 59, 56];   // the old opaque oval painted under the feet: gone
const INK = [8, 6, 10];                // the new shadow's colour, see-through
const SHADOW_ROWS = [49, 54];          // rows 49..54 of the 64 x 64 frame; the feet stand on row 51, inside it
const LOWEST_SHADOW_ROW = 54;

function readPng(rel) {
    const { w, h, px } = decodePng(new URL('../../frontend/src/assets/sprites/' + rel, import.meta.url));
    const stride = w * 4;
    return { w, h, at: (x, y) => px.subarray(y * stride + x * 4, y * stride + x * 4 + 4) };
}
const isShadow = (p) => p[3] > 0 && p[3] < 128 && p[0] === INK[0] && p[1] === INK[1] && p[2] === INK[2];
// the old shadow's oval (rows 51..56, widths 12 18 20 20 18 12 round the middle line): only there was its grey a shadow; the same grey elsewhere is the figure's own
const OLD_OVAL = [12, 18, 20, 20, 18, 12];
const inOldOval = (x, y) => y >= 51 && y <= 56 && Math.abs(x + 0.5 - 32) <= OLD_OVAL[y - 51] / 2;
const isOldShadow = (p) => p[3] === 255 && p[0] === OLD_SHADOW_RGB[0] && p[1] === OLD_SHADOW_RGB[1] && p[2] === OLD_SHADOW_RGB[2];

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

test('every character sheet is 8 frames across, and every frame has a soft shadow under the feet: see-through, centred, rows 49..54, nothing of the old oval left', () => {
    for (const [key, rel] of Object.entries(SHEETS)) {
        const img = readPng(rel);
        assert.equal(img.w, 512, `${key} is 8 frames of 64 px`);
        const list = cells(img);
        assert.ok(list.length >= 96, `${key} has its 12 rows of figures`);
        for (const c of list) {
            let shadow = 0, lo = 99, hi = -1, left = 0, right = 0;
            for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
                const p = img.at(c.col * 64 + x, c.row * 64 + y);
                if (inOldOval(x, y)) assert.ok(!isOldShadow(p), `${key} frame ${c.col},${c.row}: the old opaque shadow is gone (${x},${y})`);
                if (isShadow(p)) { shadow++; lo = Math.min(lo, y); hi = Math.max(hi, y); if (x < 32) left++; else right++; }
            }
            assert.ok(shadow > 20, `${key} frame ${c.col},${c.row}: has its shadow`);
            assert.ok(lo >= SHADOW_ROWS[0] && hi <= SHADOW_ROWS[1], `${key} frame ${c.col},${c.row}: the shadow lies in rows ${SHADOW_ROWS.join('..')} (${lo}..${hi})`);
            const mid = img.at(c.col * 64 + 31, c.row * 64 + 51);
            assert.ok(mid[3] > 0, `${key} frame ${c.col},${c.row}: the middle of the shadow is covered (by the shadow or a foot)`);
        }
    }
});

test('the map puts the bottom of the shadow on the tile\'s bottom edge, so the feet stand just above it, inside the shadow', () => {
    assert.equal(CONFIG.CHARACTER_FRAME.feetPad, 63 - LOWEST_SHADOW_ROW);
    for (const [key, rel] of Object.entries(SHEETS)) {
        const img = readPng(rel);
        let lowest = -1;
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) { const p = img.at(x, y); if (p[3] > 0) lowest = Math.max(lowest, y % 64); }
        assert.ok(lowest <= LOWEST_SHADOW_ROW + 2, `${key}: nothing hangs more than 2 px below the shadow (lowest row ${lowest})`);
    }
});

test('the figures of every sheet stand with their feet on the same row (51), in the shadow', () => {
    for (const [key, rel] of Object.entries(SHEETS)) {
        const img = readPng(rel);
        const feet = [];
        for (const c of cells(img).filter(c => c.row < 4)) {          // the idle rows
            let low = -1;
            for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const p = img.at(c.col * 64 + x, c.row * 64 + y); if (p[3] >= 128 && !isShadow(p)) low = Math.max(low, y); }
            feet.push(low);
        }
        feet.sort((a, b) => a - b);
        const f = feet[Math.floor((feet.length - 1) / 2)];   // the lower median: an idle bob may lift a frame by a pixel
        assert.equal(f, 51, `${key}: idle feet row`);
        assert.ok(f >= SHADOW_ROWS[0] && f <= SHADOW_ROWS[1], 'the feet are inside the shadow, not above it');
    }
});

test('the map no longer reads the standing line from each sheet\'s pixels', () => {
    assert.equal(typeof CONFIG.CHARACTER_FRAME.feetPad, 'number');
    assert.ok(/feetPad: 9/.test(read('shared/core/constants.js')));
});

test('the figures keep every pixel of their own, including the ones that share the old shadow\'s grey (armour, boots): no holes to see the floor through', () => {
    for (const key of ['legionaryHeroSprite', 'legionaryCompanionSprite', 'warlordHeroSprite', 'nightbladeHeroSprite']) {
        const img = readPng(SHEETS[key]);
        let kept = 0;
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) if (!inOldOval(x % 64, y % 64) && isOldShadow(img.at(x, y))) kept++;
        assert.ok(kept > 100, `${key}: ${kept} pixels of that grey are still in the figures`);
    }
});
