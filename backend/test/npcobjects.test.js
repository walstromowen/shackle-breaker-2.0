// backend/test/npcobjects.test.js: `npm test`. People and animals standing in the world as map objects (the shady merchant, the wounded dog, the madman):
// drawn from a character sheet's idle row, placed by the biomes, started by stepping close (the madman) or by talking, and taken off the map when they leave.
import { gameState } from '../../shared/core/gameState.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { decodePng } from './pngDecode.js';
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
    const { w, h, px } = decodePng(new URL('../../frontend/src/assets/' + rel, import.meta.url));
    const stride = w * 4;
    return { w, h, alpha: (x, y) => px[y * stride + x * 4 + 3], at: (x, y) => px.subarray(y * stride + x * 4, y * stride + x * 4 + 4) };
}
/* How many opaque pixels each of the rows 48..58 of one 64 x 64 frame has (the feet and the shadow they stand on). */
const footprint = (img, frameCol, frameRow) => {
    const out = [];
    for (let y = 48; y < 59; y++) { let n = 0; for (let x = 0; x < 64; x++) if (img.alpha(frameCol * 64 + x, frameRow * 64 + y) > 0) n++; out.push(n); }
    return out;
};

test('the merchant sheet is 8 frames across and 12 rows of 64 px, and every frame has the soft shadow under the feet, as the madman\'s does', () => {
    const merchant = readPng('sprites/shady_merchant/shady_merchant_spritesheet.png'), madman = readPng('sprites/madman/madman_sprite.png');
    assert.deepEqual([merchant.w, merchant.h], [512, 768]);
    assert.ok(mainJs.includes("shadyMerchantSprite: './assets/sprites/shady_merchant/shady_merchant_spritesheet.png'"));
    assert.equal(ENTITY_DEFINITIONS.SHADY_MERCHANT.spriteOverworld, 'shadyMerchantSprite');
    // the shadow (rows 49..54) is see-through dark ink, the same in both sheets; nothing is drawn more than 2 px below it
    const shadowRows = (img, col, row) => {
        const rows = new Set(); let lowest = -1;
        for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
            const p = img.at(col * 64 + x, row * 64 + y);
            if (p[3] > 0) lowest = Math.max(lowest, y);
            if (p[3] > 0 && p[3] < 128 && p[0] === 8 && p[1] === 6 && p[2] === 10) rows.add(y);
        }
        return { min: Math.min(...rows), max: Math.max(...rows), lowest };
    };
    const ref = shadowRows(madman, 0, 0);
    assert.deepEqual([ref.min, ref.max], [49, 54]);
    for (let row = 0; row < 12; row++) for (let col = 0; col < 8; col++) {
        const f = shadowRows(merchant, col, row);
        assert.deepEqual([f.min, f.max], [ref.min, ref.max], `frame ${col},${row}: the same shadow rows as the madman`);
        assert.ok(f.lowest <= 56, `frame ${col},${row}: nothing far below the shadow`);
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

test('each one is placed in the plains: the madmen 35 rolls in 100000, the dogs and the shady merchant 12 (a third of what they were), taking nothing from the other objects', () => {
    for (const [id, types] of [['PLAINS', ['SHADY_MERCHANT_NPC', 'DOG_NPC', 'MADMAN_NPC']], ['DESERT', ['SHADY_MERCHANT_NPC']], ['SNOWY_MOUNTAINS', ['SHADY_MERCHANT_NPC']]]) {
        const biome = new BiomeModel(BIOME_DEFINITIONS[id]);
        const without = new BiomeModel({ ...BIOME_DEFINITIONS[id], mapObjects: Object.fromEntries(Object.entries(BIOME_DEFINITIONS[id].mapObjects)
            .map(([tile, rules]) => [tile, rules.filter(r => !types.includes(r.id))])) });
        const found = Object.fromEntries(types.map(t => [t, 0]));
        for (let i = 0; i < 100000; i++) {
            const roll = i / 100000;
            const a = biome.getSpawnId(CONFIG.TILE_TYPES.LAYER_2, roll), b = without.getSpawnId(CONFIG.TILE_TYPES.LAYER_2, roll);
            if (a && types.includes(a.id)) { found[a.id]++; assert.equal(b, null, `${id}: ${a.id}'s band was free at ${roll}`); }
            else assert.deepEqual(a, b, `${id}: roll ${roll} gives the same as without them`);
        }
        const SHARE = { MADMAN_NPC: 35, DOG_NPC: 12, SHADY_MERCHANT_NPC: 12 };
        for (const t of types) assert.ok(Math.abs(found[t] - SHARE[t]) <= 1, `${id}: ${t}'s share (${found[t]})`);
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
        const ends = results.some(r => r.type === 'END_ENCOUNTER') && !types.includes('ADVANCE_STAGE');
        if (fights || ends) assert.ok(types.includes('DESTROY_OBJECT'), `a_disturbing_sight/${stage} removes the madman`);
    }
    for (const [stage, results] of all('wounded_mutt')) {
        const types = results.map(r => r.type);
        if (types.includes('RECRUIT_CHARACTER') || types.includes('START_BATTLE')) assert.ok(types.includes('DESTROY_OBJECT'), `wounded_mutt/${stage} removes the dog`);
    }
    // walking away leaves the dog lying there for the next visit
    assert.ok(!all('wounded_mutt').find(([s]) => s === 'walk_away')[1].some(r => r.type === 'DESTROY_OBJECT'));
});

test('the madman sees 5 tiles ahead, in a half circle the way he faces, and nothing behind; the zone fires once each time you come into it', () => {
    const madman = mapObjectFactory.create('MADMAN_NPC', 10, 10, BIOME_DEFINITIONS.PLAINS);
    const dog = mapObjectFactory.create('DOG_NPC', 20, 20, BIOME_DEFINITIONS.PLAINS);
    const objects = new Map([[madman, 0], [dog, 0]].map(([o]) => [`${o.col},${o.row}`, o]));
    const wm = { getObject: (c, r) => objects.get(`${c},${r}`) || null, ensureChunkLoaded() {} };
    const player = { col: 0, row: 0 };
    const keep = { ...gameState.player };
    const zones = (c, r) => { gameState.player.col = c; gameState.player.row = r; return OverworldController.prototype.findEncounterZones.call({ worldManager: wm, seesPlayer: OverworldController.prototype.seesPlayer, sightClear: OverworldController.prototype.sightClear }, c, r); };
    try {
        assert.equal(madman.interaction.sight, 5);
        assert.equal(madman.interaction.triggerRadius, undefined, 'no circle all round him any more');
        madman._facing = 'UP';   // he looks north
        for (let dy = -12; dy <= 12; dy++) {
            for (let dx = -12; dx <= 12; dx++) {
                if (!dx && !dy) continue; // his own tile
                const sees = -dy >= 0 && Math.hypot(dx, dy) <= 5;   // ahead of him (north, or level with him) and within 5
                assert.equal(zones(10 + dx, 10 + dy).has('10,10'), sees, `player at ${dx},${dy} from him`);
            }
        }
        assert.ok(!zones(10, 11).has('10,10'), 'right behind him: unseen (walk up and interact for A Disturbing Sight)');
        assert.ok(zones(10, 5).has('10,10') && !zones(10, 4).has('10,10'), '5 tiles ahead seen, 6 not');
        // the dog has no eyes for you: you have to talk to it
        for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) assert.equal(zones(20 + dx, 20 + dy).size, 0);
        // fires once on entering, quiet while you stay, armed again after you leave
        const ctrl = { encounterZones: null };
        const step = (c, r) => { const now = zones(c, r), before = ctrl.encounterZones || new Map(); ctrl.encounterZones = now; return [...now.keys()].filter(k => !before.has(k)); };
        const fired = [];
        for (const [c, r] of [[10, 3], [10, 4], [10, 5], [10, 6], [10, 5], [10, 4], [10, 5]]) fired.push(step(c, r).length);
        assert.deepEqual(fired, [0, 0, 1, 0, 0, 0, 1]);
        // a vanished madman (isFading) no longer sees you
        madman.isFading = true;
        assert.equal(zones(10, 5).size, 0);
    } finally { Object.assign(gameState.player, keep); }
});

test('walls and solid things block their sight: a tree, a boulder or a cliff between the madman and you, and he does not see you', () => {
    const madman = mapObjectFactory.create('MADMAN_NPC', 10, 10, BIOME_DEFINITIONS.PLAINS);
    madman._facing = 'UP';
    const tree = { isSolid: true, isGround: false };
    const flowers = { isSolid: false, isGround: true };
    const solid = new Map(), heights = new Map(), faces = new Set();
    const wm = {
        getObject: (c, r) => (c === 10 && r === 10 ? madman : null), ensureChunkLoaded() {},
        getObjectAt: (c, r) => (c === 10 && r === 10 ? madman : solid.get(`${c},${r}`) || null),
        getElevation: (c, r) => heights.get(`${c},${r}`) || 2,
        isCliffFace: (c, r) => faces.has(`${c},${r}`), isBlockedByFace: () => false
    };
    const keep = { ...gameState.player };
    const sees = (c, r) => { gameState.player.col = c; gameState.player.row = r; return OverworldController.prototype.findEncounterZones.call({ worldManager: wm, seesPlayer: OverworldController.prototype.seesPlayer, sightClear: OverworldController.prototype.sightClear }, c, r).has('10,10'); };
    try {
        assert.ok(sees(10, 6), 'open ground: seen 4 tiles ahead');
        assert.ok(!sees(10, 4), 'beyond his 5 tiles: unseen');
        solid.set('10,8', tree);
        assert.ok(!sees(10, 6), 'a tree between: unseen');
        assert.ok(sees(13, 8), 'off to the side of the tree: seen');
        solid.set('10,8', flowers);
        assert.ok(sees(10, 6), 'flowers (walked over) block nothing');
        heights.set('10,8', 4);
        assert.ok(!sees(10, 6), 'a rise of ground higher than both of you: unseen');
        heights.delete('10,8'); faces.add('10,7');
        assert.ok(!sees(10, 6), 'a cliff face between: unseen');
        faces.clear();
        solid.set('10,8', mapObjectFactory.create('DOG_NPC', 10, 8, BIOME_DEFINITIONS.PLAINS));
        assert.ok(sees(10, 6), 'another creature does not hide you');
    } finally { Object.assign(gameState.player, keep); }
});

test('an NPC is its character entity: it takes the entity\'s own overworld sheet and shows an idle row (rows 0-3 of that sheet)', () => {
    const NPCS = { SHADY_MERCHANT_NPC: 'SHADY_MERCHANT', DOG_NPC: 'DOG', MADMAN_NPC: 'MAD_MAN' };
    for (const [obj, entity] of Object.entries(NPCS)) {
        const c = MAP_OBJECTS_DEFINITIONS[obj].character;
        assert.equal(c.entity, entity, `${obj} stands for ${entity}`);
        assert.equal(c.sheet, ENTITY_DEFINITIONS[entity].spriteOverworld, `${obj} uses the sheet ${entity} walks from`);
        assert.ok(c.row >= 0 && c.row <= 3, 'an idle row: the top four rows of the sheet are the idle animations');
        assert.equal(['DOWN', 'RIGHT', 'UP', 'LEFT'][c.row], c.facing, 'the row is the one for the way it faces');
        assert.equal(mapObjectFactory.create(obj, 1, 1, null).sheet, c.sheet, 'and the placed object hands that sheet to the renderer');
        assert.ok(mainJs.includes(`${c.sheet}: './assets/`), 'the sheet is registered');
    }
});
