// backend/test/worldstatus.test.js: `npm test`. The status plaque on the overworld (biome, day, clock, weather) and the merchant's walking sheet.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';

const { formatClock, periodOfDay, describeWorld, bodyPosition, skyColors, PLAQUE } = await import('../../frontend/src/screens/overworld/worldStatusPlaque.js');
const { BIOME_DEFINITIONS: BiomeDefinitions } = await import('../../shared/world/biomeDefinitions.js');

test('the clock reads like a clock, and wraps at midnight', () => {
    assert.equal(formatClock(0), '12:00 AM');
    assert.equal(formatClock(10 * 60), '10:00 AM');
    assert.equal(formatClock(12 * 60 + 5), '12:05 PM');
    assert.equal(formatClock(23 * 60 + 59), '11:59 PM');
    assert.equal(formatClock(1440 + 75), '1:15 AM');
});

test('the part of the day follows the sky: dawn, morning, afternoon, dusk, night', () => {
    const at = (h) => periodOfDay(h * 60);
    assert.deepEqual([4.9, 5, 8, 12, 17, 20, 23.9].map(at), ['Night', 'Dawn', 'Morning', 'Afternoon', 'Dusk', 'Night', 'Night']);
});

test('describeWorld words: day number, place, weather, and the blood moon replaces "Night"', () => {
    const d = describeWorld({ biomeName: 'The Plains', day: 14, minutes: 10 * 60 + 24, weatherId: 'RAIN', weatherName: 'Rain' });
    assert.deepEqual(d, { place: 'The Plains', day: 'Day 14', clock: '10:24 AM', period: 'Morning', weather: 'Rain', weatherId: 'rain' });
    assert.equal(describeWorld({ minutes: 22 * 60, bloodMoon: true }).period, 'Blood Moon');
    assert.equal(describeWorld({ minutes: 10 * 60, bloodMoon: true }).period, 'Morning', 'only at night');
    const indoors = describeWorld({ biomeName: 'Indoors', sheltered: true, weatherId: 'rain', weatherName: 'Rain', minutes: 0 });
    assert.equal(indoors.weather, 'Sheltered');
    assert.equal(indoors.weatherId, 'sheltered');
    assert.equal(describeWorld(null).day, 'Day 1');
    assert.equal(describeWorld({ day: 0 }).day, 'Day 1');
});

test('the sun climbs from the left horizon at six to the top at noon; the moon does the same from six in the evening', () => {
    assert.deepEqual([bodyPosition(6).sun, bodyPosition(6).t, bodyPosition(6).up.toFixed(2)], [true, 0, '0.00']);
    assert.equal(bodyPosition(12).up.toFixed(2), '1.00');
    assert.equal(bodyPosition(17.99).sun, true);
    assert.equal(bodyPosition(18).sun, false);
    assert.equal(bodyPosition(0).up.toFixed(2), '1.00', 'the moon is highest at midnight');
    assert.equal(bodyPosition(3).t, 0.75);
});

test('the sky is dark at night, bright at noon, and red under a blood moon', () => {
    const sum = (c) => c[0] + c[1] + c[2];
    assert.ok(sum(skyColors(12).top) > sum(skyColors(0).top) * 3);
    const night = skyColors(23), blood = skyColors(23, true);
    assert.ok(blood.top[0] > night.top[0] + 20 && blood.top[0] > blood.top[2] * 3, 'red');
    assert.deepEqual(skyColors(12, true), skyColors(12), 'a blood moon only matters at night');
});

test('every biome has a name for the plaque, and the plaque fits between the menu button and the quest tracker', () => {
    for (const id of ['PLAINS', 'DESERT', 'SNOWY_MOUNTAINS', 'HOUSE_INTERIOR', 'CAVE_INTERIOR']) {
        assert.ok(BiomeDefinitions[id].name && !/_/.test(BiomeDefinitions[id].name), id);
    }
    const left = 48 + 104, right = 1920 - 24 - 420;     // the menu button's right edge; the tracker's left edge
    const x = (1920 - PLAQUE.w) / 2;
    assert.ok(x > left + 24 && x + PLAQUE.w < right - 24, `plaque ${x}..${x + PLAQUE.w}`);
    const ow = fs.readFileSync(new URL('../../frontend/src/screens/overworld/overworldController.js', import.meta.url), 'utf8');
    assert.match(ow, /worldInfo: this\.getWorldInfo\(\)/);
    const ui = fs.readFileSync(new URL('../../frontend/src/screens/overworld/overworldUIRenderer.js', import.meta.url), 'utf8');
    assert.match(ui, /statusPlaque\.render\(ctx, ui, worldInfo\)/);
});

// --- the merchant's sheet: 8 frames across, rows in sets of four (idle / walk / run), South East North West -------------------------------------------
function readPng(file) {
    const buf = fs.readFileSync(file);
    let pos = 8, w = 0, h = 0, idat = [];
    while (pos < buf.length) {
        const len = buf.readUInt32BE(pos), type = buf.toString('ascii', pos + 4, pos + 8);
        if (type === 'IHDR') { w = buf.readUInt32BE(pos + 8); h = buf.readUInt32BE(pos + 12); assert.equal(buf[pos + 16], 8); assert.equal(buf[pos + 17], 6, 'RGBA'); }
        if (type === 'IDAT') idat.push(buf.subarray(pos + 8, pos + 8 + len));
        pos += 12 + len;
    }
    const raw = zlib.inflateSync(Buffer.concat(idat)), bpp = 4, stride = w * bpp, px = Buffer.alloc(h * stride);
    for (let y = 0; y < h; y++) {
        const f = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
        for (let x = 0; x < stride; x++) {
            const a = x >= bpp ? px[y * stride + x - bpp] : 0, b = y > 0 ? px[(y - 1) * stride + x] : 0, c = x >= bpp && y > 0 ? px[(y - 1) * stride + x - bpp] : 0;
            let v = line[x];
            if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
            else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c); }
            px[y * stride + x] = v & 255;
        }
    }
    return { w, h, px };
}

test('the shady merchant\'s sheet: 512 x 768, 12 rows of 8 frames, every frame drawn, and walking and running really move', () => {
    const { w, h, px } = readPng(new URL('../../frontend/src/assets/sprites/shady_merchant/shady_merchant_spritesheet.png', import.meta.url));
    assert.deepEqual([w, h], [512, 768]);
    const frame = (row, f) => {
        const out = [];
        for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) out.push(px.readUInt32BE(((row * 64 + y) * w + f * 64 + x) * 4));
        return out;
    };
    const opaque = (fr) => fr.filter(v => (v & 255) > 0).length;
    const key = (fr) => fr.join(',');
    for (let row = 0; row < 12; row++) for (let f = 0; f < 8; f++) assert.ok(opaque(frame(row, f)) > 300, `row ${row} frame ${f} is drawn`);
    for (const [name, first] of [['walk', 4], ['run', 8]]) {
        for (let d = 0; d < 4; d++) {
            const kinds = new Set();
            for (let f = 0; f < 8; f++) kinds.add(key(frame(first + d, f)));
            assert.ok(kinds.size >= 6, `${name}, direction ${d}: the frames differ (${kinds.size} different)`);
            assert.notEqual(key(frame(first + d, 0)), key(frame(d, 0)), `${name} is not the idle pose`);
        }
    }
});
