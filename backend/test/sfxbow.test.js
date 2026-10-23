// backend/test/sfxbow.test.js: `npm test`. The aftermath cue, the creaking-chest sounds, herb prices and the four bow animations.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';
import { encounterDefinitions } from '../../shared/story/encounterDefinitions.js';
import { ItemDefinitions } from '../../shared/items/itemDefinitions.js';
import { AbilityDefinitions } from '../../shared/abilities/abilityDefinitions.js';
import { BattleAnimationDefinitions } from '../../shared/battle/animation/battleAnimationDefinition.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => fs.readFileSync(path.join(root, p));

function pngSize(p) { const b = read(p); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; }
// Minimal decoder: 8-bit RGBA, non-interlaced (what these sheets are). Returns { width, height, data }.
function decodePng(p) {
    const b = read(p); let o = 8, idat = [], width = 0, height = 0;
    while (o < b.length) {
        const len = b.readUInt32BE(o), type = b.toString('ascii', o + 4, o + 8);
        if (type === 'IHDR') { width = b.readUInt32BE(o + 8); height = b.readUInt32BE(o + 12); assert.equal(b[o + 16], 8); assert.equal(b[o + 17], 6, `${p} is RGBA`); assert.equal(b[o + 20], 0); }
        if (type === 'IDAT') idat.push(b.subarray(o + 8, o + 8 + len));
        o += 12 + len;
    }
    const raw = zlib.inflateSync(Buffer.concat(idat)), stride = width * 4, data = Buffer.alloc(stride * height);
    for (let y = 0; y < height; y++) {
        const f = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
        for (let x = 0; x < stride; x++) {
            const a = x >= 4 ? data[y * stride + x - 4] : 0, up = y ? data[(y - 1) * stride + x] : 0, c = x >= 4 && y ? data[(y - 1) * stride + x - 4] : 0;
            let v = line[x];
            if (f === 1) v += a; else if (f === 2) v += up; else if (f === 3) v += (a + up) >> 1;
            else if (f === 4) { const pp = a + up - c, pa = Math.abs(pp - a), pb = Math.abs(pp - up), pc = Math.abs(pp - c); v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? up : c); }
            data[y * stride + x] = v & 255;
        }
    }
    return { width, height, data };
}

function wavInfo(p) {
    const b = read(p);
    assert.equal(b.toString('ascii', 0, 4), 'RIFF');
    const rate = b.readUInt32LE(24), ch = b.readUInt16LE(22), bits = b.readUInt16LE(34);
    let o = 12, frames = 0, peak = 0;
    while (o < b.length - 8) {
        const id = b.toString('ascii', o, o + 4), len = b.readUInt32LE(o + 4);
        if (id === 'data') { frames = len / 2; for (let i = 0; i < frames; i++) peak = Math.max(peak, Math.abs(b.readInt16LE(o + 8 + i * 2))); break; }
        o += 8 + len;
    }
    return { rate, ch, bits, frames, peak };
}

test('the warrior\'s betrayal ambush no longer plays the unsheathing sound', () => {
    const stage = encounterDefinitions.aftermath.stages.warrior_betrayal_ambush;
    assert.ok(stage, 'stage exists');
    assert.equal(stage.sfx, undefined);
    assert.equal(stage.effect, 'blood');
});

test('the chest and chime sounds keep their format and length', () => {
    const want = { chest_open: 52920, chest_creak: 22050, gem_chime: 39690, glyph_chime: 66150, glow_swell: 66150 };
    for (const [name, frames] of Object.entries(want)) {
        const info = wavInfo(`frontend/src/assets/audio/sfx/encounters/${name}.wav`);
        assert.deepEqual([info.rate, info.ch, info.bits, info.frames], [22050, 1, 16, frames], name);
        assert.ok(info.peak > 8000 && info.peak < 32000, `${name} is audible and does not clip (${info.peak})`);
    }
});

test('herbs are worth twice the plant fibers', () => {
    const fibers = ItemDefinitions.plant_fibers.value;
    for (const id of ['healing_herb', 'invigorating_herb', 'illuminating_herb']) assert.equal(ItemDefinitions[id].value, fibers * 2, id);
    const herbs = Object.values(ItemDefinitions).filter(i => /herb/i.test(i.id));
    assert.equal(herbs.length, 3, 'no other herb item slipped through');
});

const BOW = { loose_arrow: 'looseArrow', quick_draw: 'quickDraw', poisoned_arrow: 'poisonedArrow', triple_shot: 'tripleShot' };
const main = fs.readFileSync(path.join(root, 'frontend/src/main.js'), 'utf8');

test('each bow ability has its own animation, whose projectile is a straight copy of its icon and which ends in an impact sprite', () => {
    for (const [id, key] of Object.entries(BOW)) {
        const ability = AbilityDefinitions[id];
        assert.equal(ability.animationId, id, `${id} uses its own animation`);
        const def = BattleAnimationDefinitions[id];
        assert.ok(def, `${id} animation exists`);
        const travel = def.vfx.find(v => v.type === 'travel');
        const impact = def.vfx.find(v => v.type === 'spawn' && v.config.sheetKey === `${key}Impact` + 'Animation');
        assert.equal(travel.config.sheetKey, `${key}Animation`);
        assert.ok(impact, `${id} spawns its impact sprite`);
        assert.equal(impact.config.frameCount, 4);
        assert.equal(travel.config.rotation, 'auto', 'the arrow turns to face where it flies');
        // cue times are fractions of the duration (the renderer compares them with timer / duration)
        const arrives = travel.start * def.duration + travel.config.life, lands = impact.start * def.duration;
        assert.ok(Math.abs(lands - arrives) < 0.03, `${id}: impact lands when the arrow arrives (${lands.toFixed(3)}s vs ${arrives.toFixed(3)}s)`);
        // assets are registered and exist, with the right shape
        for (const [sheet, w] of [[`${key}Animation`, 64], [`${key}ImpactAnimation`, 256]]) {
            const m = main.match(new RegExp(`${sheet}: '\\./(assets/abilityAnimations/[a-z_]+\\.png)'`));
            assert.ok(m, `${sheet} registered in main.js`);
            assert.deepEqual(pngSize('frontend/src/' + m[1]), { w, h: 64 }, sheet);
        }
        {
            // the projectile sheet is pixel-identical to the ability's icon cell
            const icons = decodePng('frontend/src/assets/icons/abilities.png');
            const copy = decodePng(`frontend/src/assets/abilityAnimations/${id}.png`);
            const { col, row } = ability.icon;
            for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
                const a = ((row * 64 + y) * icons.width + col * 64 + x) * 4, b = (y * 64 + x) * 4;
                for (let k = 0; k < 4; k++) assert.equal(copy.data[b + k], icons.data[a + k], `${id} pixel ${x},${y}`);
            }
        }
    }
});
