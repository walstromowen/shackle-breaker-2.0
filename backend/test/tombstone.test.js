// backend/test/tombstone.test.js: `npm test`. The tombstone pair: one sprite for two map objects, the rare one that can be dug up (the Old Gravestone encounter),
// what comes out of the ground. Where they stand (villages, graveyards) is in graveyard.test.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { MAP_OBJECTS_DEFINITIONS } from '../../shared/world/mapObjectDefinitions.js';
import { encounterDefinitions } from '../../shared/story/encounterDefinitions.js';
import { SpawnTableFactory } from '../../shared/battle/spawnTableFactory.js';
import { SpawnTableDefinitions } from '../../shared/battle/spawnTableDefinitions.js';
import { LootTableDefinitions } from '../../shared/items/lootTableDefinitions.js';
import { ItemDefinitions } from '../../shared/items/itemDefinitions.js';

const mainJs = fs.readFileSync(new URL('../../frontend/src/main.js', import.meta.url), 'utf8');
const enc = encounterDefinitions.old_gravestone;
const plain = MAP_OBJECTS_DEFINITIONS.TOMBSTONE;
const rare = MAP_OBJECTS_DEFINITIONS.OLD_GRAVESTONE;

test('the two gravestones are exactly the same object to look at and to walk into; only the rare one can be used', () => {
    assert.ok(plain && rare);
    const body = ({ interaction, ...rest }) => rest;
    assert.deepEqual(body(plain), body(rare), 'same sheet, sprite, size, hitbox and flags');
    assert.equal(plain.interaction, undefined, 'the common one is scenery');
    assert.equal(rare.interaction.type, 'ENCOUNTER');
    assert.equal(rare.interaction.id, 'old_gravestone');
    assert.ok(plain.isSolid && plain.hitbox.w === 1 && plain.hitbox.h === 1);
    assert.ok(fs.existsSync(new URL(`../../frontend/src/assets/mapObjects/${plain.sheet}.png`, import.meta.url)));
    assert.ok(mainJs.includes(`${plain.sheet}:`), 'its sheet is registered in main.js');
});

test('the encounter is registered and its picture sheet exists and is registered', () => {
    assert.ok(enc);
    assert.equal(enc.title, 'Old Gravestone');
    assert.ok(mainJs.includes(`${enc.imageSheet}:`));
    assert.ok(fs.existsSync(new URL('../../frontend/src/assets/icons/encounters/old_gravestone.png', import.meta.url)));
});

test('every stage the encounter points at exists, and every picture is inside the 4 x 4 sheet', () => {
    const ids = new Set(Object.keys(enc.stages));
    assert.ok(ids.has(enc.initialStage));
    for (const [id, stage] of Object.entries(enc.stages)) {
        assert.ok(stage.image.col >= 0 && stage.image.col < 4 && stage.image.row >= 0 && stage.image.row < 4, `${id} picture`);
        for (const d of stage.decisions) {
            for (const o of (d.outcomes || [])) for (const r of o.results) {
                if (r.type === 'ADVANCE_STAGE') assert.ok(ids.has(r.payload.stageId), `${id} -> ${r.payload.stageId}`);
            }
        }
    }
});

test('digging is one roll: half loot, a quarter skeletons, a quarter a shackled spirit', () => {
    const keep = enc.stages.dig.decisions.find(d => d.text === 'Keep digging.');
    const odds = Object.fromEntries(keep.outcomes.map(o => [o.results[0].payload.stageId, o.weight]));
    assert.deepEqual(odds, { buried_things: 50, bones_rise: 25, spirit_rises: 25 });
});

test('the grave is spent when loot is taken or a fight starts, never when you walk away', () => {
    const results = (stage) => enc.stages[stage].decisions.flatMap(d => d.outcomes || []).flatMap(o => o.results).map(r => r.type);
    assert.deepEqual(results('buried_things'), ['ROLL_LOOT_TABLE', 'AWARD_XP', 'DESTROY_OBJECT', 'END_ENCOUNTER']);
    assert.deepEqual(results('bones_rise'), ['START_BATTLE', 'DESTROY_OBJECT']);
    assert.deepEqual(results('spirit_rises'), ['START_BATTLE', 'DESTROY_OBJECT']);
    assert.ok(!results('approach').includes('DESTROY_OBJECT'));
    assert.ok(!results('dig').includes('DESTROY_OBJECT'));
    assert.equal(JSON.stringify(enc).match(/DESTROY_OBJECT/g).length, 3);
});

test('the fights use real spawn tables that produce undead at every difficulty', () => {
    const tableOf = (stage) => enc.stages[stage].decisions[0].outcomes[0].results.find(r => r.type === 'START_BATTLE').payload.tableId;
    assert.equal(tableOf('bones_rise'), 'grave_skeletons');
    assert.equal(tableOf('spirit_rises'), 'shackled_spirit');
    for (const id of ['grave_skeletons', 'shackled_spirit']) assert.ok(SpawnTableDefinitions[id], id);
    for (const difficulty of ['easy', 'normal', 'hard', 'nightmare']) {
        for (const id of ['grave_skeletons', 'shackled_spirit']) {
            const model = SpawnTableFactory.generateBattle(id, difficulty);
            assert.ok(model.hasEnemies(), `${id} on ${difficulty}`);
        }
    }
});

test('the grave loot table rolls only real items', () => {
    const table = LootTableDefinitions.old_grave_loot;
    assert.ok(table && table.items.length > 5);
    for (const it of table.items) {
        assert.ok(ItemDefinitions[it.id], `${it.id} is an item`);
        assert.ok(it.weight > 0 && it.min >= 1 && it.max >= it.min);
    }
    const rolled = encounterDefinitions.old_gravestone.stages.buried_things.decisions[0].outcomes[0].results[0].payload;
    assert.equal(rolled.lootTableId, 'old_grave_loot');
});

test('the gravestones are no longer scattered over the plains: they stand in villages and graveyards only', async () => {
    const { BIOME_DEFINITIONS } = await import('../../shared/world/biomeDefinitions.js');
    for (const biome of Object.values(BIOME_DEFINITIONS)) {
        for (const rules of Object.values(biome.mapObjects || {})) {
            for (const r of rules) assert.ok(r.id !== 'TOMBSTONE' && r.id !== 'OLD_GRAVESTONE', `${biome.id} scatters a gravestone`);
        }
    }
});
