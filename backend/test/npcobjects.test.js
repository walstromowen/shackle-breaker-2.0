// backend/test/npcobjects.test.js: `npm test`. People and animals standing in the world as map objects (the shady merchant, the wounded dog, the madman):
// drawn from a character sheet's idle row, placed by the biomes, started by stepping close (the madman) or by talking, and taken off the map when they leave.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { MAP_OBJECTS_DEFINITIONS } from '../../shared/world/mapObjectDefinitions.js';
import { mapObjectFactory } from '../../shared/world/mapObjectsFactory.js';
import { BIOME_DEFINITIONS } from '../../shared/world/biomeDefinitions.js';
import { BiomeModel } from '../../shared/world/biomeModel.js';
import { encounterDefinitions } from '../../shared/story/encounterDefinitions.js';
import { ENTITY_DEFINITIONS } from '../../shared/characters/entityDefinitions.js';
import { CONFIG } from '../../shared/core/constants.js';
import { OverworldController } from '../../frontend/src/screens/overworld/overworldController.js';

const mainJs = fs.readFileSync(new URL('../../frontend/src/main.js', import.meta.url), 'utf8');

/* A tiny PNG reader (8-bit RGBA, not interlaced: what the sprite sheets are) so the sheets' pixels can be checked. */
function readPng(rel) {
    const b = fs.readFileSync(new URL('../../frontend/src/assets/' + rel, import.meta.url));
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
    return { w, h, alpha: (x, y) => px[y * stride + x * 4 + 3] };
}
/* How many opaque pixels each of the rows 48..58 of one 64 x 64 frame has (the feet and the shadow they stand on). */
const footprint = (img, frameCol, frameRow) => {
    const out = [];
    for (let y = 48; y < 59; y++) { let n = 0; for (let x = 0; x < 64; x++) if (img.alpha(frameCol * 64 + x, frameRow * 64 + y) > 0) n++; out.push(n); }
    return out;
};

test('the merchant sheet is 8 frames across and 12 rows of 64 px, and its shadow lies where the madman\'s lies in every frame', () => {
    const merchant = readPng('sprites/shady_merchant/shady_merchant.png'), madman = readPng('sprites/madman/madman_sprite.png');
    assert.deepEqual([merchant.w, merchant.h], [512, 768]);
    assert.ok(mainJs.includes("shadyMerchantSprite: './assets/sprites/shady_merchant/shady_merchant.png'"));
    assert.equal(ENTITY_DEFINITIONS.SHADY_MERCHANT.spriteOverworld, 'shadyMerchantSprite');
    const ref = footprint(madman, 0, 0).slice(5, 9); // rows 53..56: the shadow ellipse below the feet (it is the only thing down there)
    assert.deepEqual(ref, [18, 16, 14, 6]);
    for (let row = 0; row < 12; row++) {
        for (let col = 0; col < 8; col++) {
            const f = footprint(merchant, col, row);
            assert.deepEqual(f.slice(5, 9), ref, `frame ${col},${row}: the same shadow rows as the madman`);
            assert.equal(f[9], 0, `frame ${col},${row}: nothing below the shadow`);
        }
    }
});

test('the NPC objects draw a character sheet\'s idle row: the sheet is registered, the model carries it, nothing else is needed', () => {
    for (const [type, sheet, encounterId] of [['SHADY_MERCHANT_NPC', 'shadyMerchantSprite', 'suspicious_merchant'], ['DOG_NPC', 'germanSheepherdSprite', 'wounded_mutt'], ['MADMAN_NPC', 'madmanSprite', 'a_disturbing_sight']]) {
        const def = MAP_OBJECTS_DEFINITIONS[type];
        assert.equal(def.character.sheet, sheet);
        assert.ok(['DOWN', 'RIGHT', 'UP', 'LEFT'].includes(def.character.facing));
        assert.ok(mainJs.includes(`${sheet}: './assets/`), `${sheet} is in the asset manifest`);
        assert.equal(def.isSolid, true);
        assert.equal(def.interaction.type, 'ENCOUNTER');
        assert.equal(def.interaction.id, encounterId);
        assert.ok(encounterDefinitions[encounterId], `${encounterId} exists`);
        const obj = mapObjectFactory.create(type, 4, 5, BIOME_DEFINITIONS.PLAINS);
        assert.equal(obj.sheet, sheet);
        assert.deepEqual(obj.character, def.character);
        assert.equal(obj.frames, 1);
    }
    assert.ok(!mainJs.includes('objShadyMerchant'), 'the separate object picture is gone');
});

test('each one is placed in the plains, 5 rolls in 10000, and takes nothing from the other objects', () => {
    for (const [id, types] of [['PLAINS', ['SHADY_MERCHANT_NPC', 'DOG_NPC', 'MADMAN_NPC']], ['DESERT', ['SHADY_MERCHANT_NPC']], ['SNOWY_MOUNTAINS', ['SHADY_MERCHANT_NPC']]]) {
        const biome = new BiomeModel(BIOME_DEFINITIONS[id]);
        const without = new BiomeModel({ ...BIOME_DEFINITIONS[id], mapObjects: Object.fromEntries(Object.entries(BIOME_DEFINITIONS[id].mapObjects)
            .map(([tile, rules]) => [tile, rules.filter(r => !types.includes(r.id))])) });
        const found = Object.fromEntries(types.map(t => [t, 0]));
        for (let i = 0; i < 10000; i++) {
            const roll = i / 10000;
            const a = biome.getSpawnId(CONFIG.TILE_TYPES.LAYER_2, roll), b = without.getSpawnId(CONFIG.TILE_TYPES.LAYER_2, roll);
            if (a && types.includes(a.id)) { found[a.id]++; assert.equal(b, null, `${id}: ${a.id}'s band was free at ${roll}`); }
            else assert.deepEqual(a, b, `${id}: roll ${roll} gives the same as without them`);
        }
        for (const t of types) assert.equal(found[t], 5, `${id}: ${t}'s share`);
    }
});

test('they are no longer random encounters, and every way they leave the scene takes them off the map', () => {
    for (const [id, biome] of Object.entries(BIOME_DEFINITIONS)) {
        const pool = ((biome.encounters && biome.encounters.pools) || []).map(p => p.id);
        for (const gone of ['suspicious_merchant', 'wounded_mutt', 'a_disturbing_sight']) assert.ok(!pool.includes(gone), `${id} no longer rolls ${gone}`);
    }
    const resultsOf = (stage) => stage.decisions.flatMap(d => [...(d.outcomes || []), ...(d.successOutcomes || []), ...(d.failureOutcomes || [])]).flatMap(o => o.results);
    const all = (encId) => Object.entries(encounterDefinitions[encId].stages).map(([id, st]) => [id, resultsOf(st)]);
    // a battle with the creature or a recruit, or a kill, never leaves it standing in the world
    for (const [stage, results] of all('a_disturbing_sight')) {
        const types = results.map(r => r.type);
        const fights = results.some(r => r.type === 'START_BATTLE' && JSON.stringify(r.payload).includes('MAD_MAN'));
        const ends = results.some(r => r.type === 'END_ENCOUNTER') && (types.includes('AWARD_XP') || types.includes('RECRUIT_CHARACTER'));
        if (fights || ends) assert.ok(types.includes('DESTROY_OBJECT'), `a_disturbing_sight/${stage} removes the madman`);
    }
    for (const [stage, results] of all('wounded_mutt')) {
        const types = results.map(r => r.type);
        if (types.includes('RECRUIT_CHARACTER') || types.includes('START_BATTLE')) assert.ok(types.includes('DESTROY_OBJECT'), `wounded_mutt/${stage} removes the dog`);
    }
    // walking away leaves the dog lying there for the next visit
    assert.ok(!all('wounded_mutt').find(([s]) => s === 'walk_away')[1].some(r => r.type === 'DESTROY_OBJECT'));
});

test('the madman starts his encounter from 2 tiles away in every direction, once each time you come into range', () => {
    const madman = mapObjectFactory.create('MADMAN_NPC', 10, 10, BIOME_DEFINITIONS.PLAINS);
    const dog = mapObjectFactory.create('DOG_NPC', 20, 20, BIOME_DEFINITIONS.PLAINS);
    const objects = new Map([[madman, 0], [dog, 0]].map(([o]) => [`${o.col},${o.row}`, o]));
    const wm = { getObject: (c, r) => objects.get(`${c},${r}`) || null, ensureChunkLoaded() {} };
    const zones = (c, r) => OverworldController.prototype.findEncounterZones.call({ worldManager: wm }, c, r);
    assert.equal(madman.interaction.triggerRadius, 2);
    for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
            if (!dx && !dy) continue; // his own tile
            const inRange = Math.max(Math.abs(dx), Math.abs(dy)) <= 2;
            assert.equal(zones(10 + dx, 10 + dy).has('10,10'), inRange, `player at ${dx},${dy} from him`);
        }
    }
    // the dog has no radius: you have to talk to it
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) assert.equal(zones(20 + dx, 20 + dy).size, 0);
    // fires once on entering, quiet while you stay, armed again after you leave
    const fired = [];
    const ctrl = { findEncounterZones: (c, r) => zones(c, r), setAnimIdle() {}, isLocked: false, encounterZones: null };
    const step = (c, r) => { const now = zones(c, r), before = ctrl.encounterZones || new Map(); ctrl.encounterZones = now; return [...now.keys()].filter(k => !before.has(k)); };
    for (const [c, r] of [[14, 10], [13, 10], [12, 10], [11, 10], [12, 10], [13, 10], [12, 10]]) fired.push(step(c, r).length);
    assert.deepEqual(fired, [0, 0, 1, 0, 0, 0, 1]);
    // a vanished madman (isFading) no longer sees you
    madman.isFading = true;
    assert.equal(zones(11, 10).size, 0);
});
