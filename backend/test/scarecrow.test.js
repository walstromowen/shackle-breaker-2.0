// backend/test/scarecrow.test.js: `npm test`. The Peculiar Scarecrow: the map object, its line of sight, its encounter, the fight, and where it stands (abandoned villages only).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { MAP_OBJECTS_DEFINITIONS } from '../../shared/data/mapObjectDefinitions.js';
import { encounterDefinitions } from '../../shared/data/encounterDefinitions.js';
import { SpawnTableDefinitions } from '../../shared/data/spawnTableDefinitions.js';
import { SpawnTableFactory } from '../../shared/systems/factories/spawnTableFactory.js';
import { BIOME_DEFINITIONS } from '../../shared/data/biomeDefinitions.js';
import { ENTITY_DEFINITIONS } from '../../shared/data/entityDefinitions.js';
import { STRUCTURES } from '../../shared/data/structures.js';
import { WorldManager } from '../../shared/systems/worldManager.js';
import { gameState } from '../../shared/state/gameState.js';

const mainJs = fs.readFileSync(new URL('../../frontend/src/main.js', import.meta.url), 'utf8');
const enc = encounterDefinitions.peculiar_scarecrow;

test('the scarecrow is a two by two object that sees 5 rows straight beneath it', () => {
    const def = MAP_OBJECTS_DEFINITIONS.PECULIAR_SCARECROW;
    assert.ok(def);
    assert.equal(def.width, 2);
    assert.equal(def.height, 2);
    assert.equal(def.interaction.type, 'ENCOUNTER');
    assert.equal(def.interaction.id, 'peculiar_scarecrow');
    assert.deepEqual(def.interaction.triggerLine, { direction: 'down', length: 5 });
    assert.ok(def.isSolid, 'the post is solid');
    assert.equal(def.hitbox.h, 1, 'only the base of the post blocks the way');
    assert.equal(def.hitbox.w, 2);
    assert.ok(fs.existsSync(new URL('../../frontend/src/assets/mapObjects/objScarecrow.png', import.meta.url)));
    assert.ok(mainJs.includes(`${def.sheet}:`), 'its sheet is registered in main.js');
});

test('the encounter is registered, and the old Midnight Harvest is gone', () => {
    assert.ok(enc);
    assert.equal(enc.title, 'Peculiar Scarecrow');
    assert.equal(encounterDefinitions.midnight_harvest, undefined);
    assert.ok(mainJs.includes(`${enc.imageSheet}:`), 'its picture sheet is registered in main.js');
});

test('walking past is one dexterity check against 12: pass and nothing happens, fail and the harvesters come', () => {
    const open = enc.stages[enc.initialStage];
    const check = open.decisions.find(d => d.type === 'skill_check');
    assert.equal(check.attribute, 'dexterity');
    assert.equal(check.threshold, 12);
    const advance = (outcomes) => outcomes.flatMap(o => o.results).find(r => r.type === 'ADVANCE_STAGE').payload.stageId;
    const pass = enc.stages[advance(check.successOutcomes)];
    const fail = enc.stages[advance(check.failureOutcomes)];
    const kinds = (stage) => stage.decisions.flatMap(d => d.outcomes).flatMap(o => o.results).map(r => r.type);
    assert.deepEqual(kinds(pass), ['END_ENCOUNTER'], 'passing ends the encounter with no battle, loot or damage');
    assert.deepEqual(kinds(fail), ['DESTROY_OBJECT', 'START_BATTLE'], 'the scarecrow is removed as the battle starts');
    const battle = fail.decisions[0].outcomes[0].results.find(r => r.type === 'START_BATTLE').payload;
    assert.equal(battle.tableId, 'scarecrow_harvesters');
    // walking past must not remove it: only the stage that starts the fight does
    assert.equal((JSON.stringify(enc).match(/DESTROY_OBJECT/g) || []).length, 1);
    assert.ok(!kinds(pass).includes('DESTROY_OBJECT'));
});

test('every stage the encounter points at exists, and every picture is inside the sheet', () => {
    const ids = new Set(Object.keys(enc.stages));
    assert.ok(ids.has(enc.initialStage));
    JSON.stringify(enc, (k, v) => { if (v && v.type === 'ADVANCE_STAGE') assert.ok(ids.has(v.payload.stageId), v.payload.stageId); return v; });
    for (const st of Object.values(enc.stages)) if (st.image) assert.ok(st.image.col >= 0 && st.image.col < 4 && st.image.row >= 0 && st.image.row < 4);
});

test('the fight is one or more Hollow Harvesters, never none, on every difficulty', () => {
    assert.ok(SpawnTableDefinitions.scarecrow_harvesters);
    const seen = new Set();
    for (const difficulty of ['easy', 'normal', 'hard', 'nightmare']) {
        for (let i = 0; i < 60; i++) {
            const model = SpawnTableFactory.generateBattle('scarecrow_harvesters', difficulty);
            assert.ok(model.hasEnemies(), difficulty);
            for (const e of model.enemies) assert.equal(e.id || e.entityId || e.typeId || e.type, 'HOLLOW_HARVESTER');
            if (difficulty === 'normal') seen.add(model.enemies.length);
        }
    }
    assert.ok(ENTITY_DEFINITIONS.HOLLOW_HARVESTER);
    assert.ok(seen.has(1) && Math.max(...seen) > 1, `normal gives between one and three harvesters (saw ${[...seen].sort()})`);
});

test('no biome grows scarecrows by itself: the villages are the only place', () => {
    for (const [id, biome] of Object.entries(BIOME_DEFINITIONS)) {
        assert.ok(!JSON.stringify(biome.mapObjects || {}).includes('PECULIAR_SCARECROW'), `${id} lists the scarecrow`);
    }
    const cfg = STRUCTURES.ABANDONED_VILLAGE.scarecrows;
    assert.equal(cfg.id, 'PECULIAR_SCARECROW');
    assert.ok(cfg.chance > 0 && cfg.max >= 1);
});

test('in a generated world every scarecrow stands north of a road, with road in the line it sees', () => {
    gameState.seed = 14; gameState.world.changes = {}; gameState.world.terrainOverrides = {};
    const wm = new WorldManager();
    for (let r = -120; r < 120; r += 8) for (let c = -120; c < 120; c += 8) wm.ensureChunkLoaded(c, r);
    const found = [...wm.objects.values()].filter(o => o.id === 'PECULIAR_SCARECROW');
    assert.ok(found.length > 0, 'this world has villages with scarecrows');
    for (const o of found) {
        let road = 0;
        for (let k = 1; k <= 5; k++) if (wm.getTileAt(o.col, o.row + k) === 1) road++;
        assert.equal(o.w, 2);
        assert.ok(wm.getSolidObjectAt(o.col + 1, o.row) === o, 'both base tiles are solid');
        assert.ok(road >= 2, `scarecrow at ${o.col},${o.row} sees ${road} road tiles`);
    }
});

test('the line of sight is the two columns straight beneath the scarecrow, 5 rows long, and no wider', async () => {
    const { OverworldController } = await import('../../frontend/src/controllers/overworld/overworldController.js');
    const scarecrow = { col: 10, row: 20, w: 2, interaction: MAP_OBJECTS_DEFINITIONS.PECULIAR_SCARECROW.interaction };
    const world = { getObject: (c, r) => (c === 10 && r === 20 ? scarecrow : null), ensureChunkLoaded() {} };
    const sees = (col, row) => OverworldController.prototype.findEncounterZones.call({ worldManager: world }, col, row).size === 1;
    for (let k = 1; k <= 5; k++) assert.ok(sees(10, 20 + k) && sees(11, 20 + k), `${k} below, under either column`);
    assert.ok(!sees(10, 26) && !sees(11, 26), '6 below');
    assert.ok(!sees(10, 20) && !sees(11, 20), 'the base itself');
    assert.ok(!sees(10, 19) && !sees(11, 19), 'above it');
    assert.ok(!sees(9, 23) && !sees(12, 23), 'beside the line');
    assert.ok(!sees(5, 20) && !sees(15, 20), 'level with it');
});

test('Spirit Reap shows the dark hand for a good while: drawn solid, fully visible for most of its life', async () => {
    const { BattleAnimationDefinitions } = await import('../../shared/data/battleAnimationDefinition.js');
    const { Particle } = await import('../../frontend/src/renderers/battle/particle.js');
    const anim = BattleAnimationDefinitions.spirit_reap;
    const hand = anim.vfx.find(v => v.config && v.config.sheetKey === 'spiritReapAnimation');
    assert.ok(hand, 'the hand is a sprite cue');
    assert.equal(hand.config.movement, 'rise_and_hold');
    assert.equal(hand.config.blendMode, 'normal', 'solid, not the glowing screen blend a dark sprite vanishes on');
    assert.ok(hand.config.life >= 3, `the hand lives ${hand.config.life}s`);
    assert.ok(hand.start + hand.config.life <= anim.duration, 'the cue ends before the animation does');
    // the particle: full strength from 18% to 70% of its life (about 1.9 seconds at 3.6s), and gone at the end
    const alphaAt = (p) => { const part = new Particle({ life: 1, movement: 'rise_and_hold', startX: 0, startY: 0, scale: 1 }); part.update(p); return part.alpha; };
    for (const p of [0.2, 0.35, 0.5, 0.65]) assert.equal(alphaAt(p), 1, `alpha at ${p}`);
    assert.ok(alphaAt(0.05) < 0.4, 'fades in');
    assert.ok(alphaAt(0.95) < 0.2, 'fades out');
});
