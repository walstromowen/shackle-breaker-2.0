// backend/test/cavein.test.js: `npm test`. The Cave In encounter: its stages, the spider-nest fight, where it can happen, and its art.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { encounterDefinitions } from '../../shared/story/encounterDefinitions.js';
import { SpawnTableDefinitions } from '../../shared/battle/spawnTableDefinitions.js';
import { SpawnTableFactory } from '../../shared/battle/spawnTableFactory.js';
import { BIOME_DEFINITIONS } from '../../shared/world/biomeDefinitions.js';

const mainJs = fs.readFileSync(new URL('../../frontend/src/main.js', import.meta.url), 'utf8');
const enc = encounterDefinitions.cave_in;
const resultsOf = (outcomes) => outcomes.flatMap(o => o.results);
const stageTargets = (outcomes) => resultsOf(outcomes).filter(r => r.type === 'ADVANCE_STAGE').map(r => r.payload.stageId);

test('it is registered, with its art, and every stage it names exists', () => {
    assert.ok(enc);
    assert.equal(enc.title, 'Cave In');
    assert.ok(enc.stages[enc.initialStage]);
    assert.ok(mainJs.includes(`${enc.imageSheet}:`), 'its picture sheet is registered in main.js');
    assert.ok(fs.existsSync(new URL('../../frontend/src/assets/icons/encounters/cave_in.png', import.meta.url)));
    for (const [id, stage] of Object.entries(enc.stages)) {
        assert.ok(stage.image && stage.image.col >= 0 && stage.image.col < 4 && stage.image.row >= 0 && stage.image.row < 4, `${id} has a cell in the 4 x 4 sheet`);
        for (const d of stage.decisions) {
            for (const outcomes of [d.outcomes, d.successOutcomes, d.failureOutcomes].filter(Boolean)) {
                for (const target of stageTargets(outcomes)) assert.ok(enc.stages[target], `${id} -> ${target} exists`);
            }
        }
    }
});

test('digging is one strength check against 12: success finds loot one time in three, failure is exhaustion, falling rocks or a spider nest (1 : 2 : 1)', () => {
    const dig = enc.stages.discovery.decisions.find(d => d.type === 'skill_check');
    assert.equal(dig.attribute, 'strength');
    assert.equal(dig.threshold, 12);
    const weights = (outcomes) => Object.fromEntries(outcomes.map(o => [o.results[0].payload.stageId, o.weight]));
    assert.deepEqual(weights(dig.successOutcomes), { found_something: 1, path_cleared: 2 });
    assert.deepEqual(weights(dig.failureOutcomes), { exhausted: 1, rocks_fall: 2, spider_nest: 1 });
});

test('the rewards and costs are handed out on the buttons after each stage', () => {
    const typesOf = (stageId) => resultsOf(enc.stages[stageId].decisions.flatMap(d => d.outcomes || [])).map(r => r.type);
    assert.deepEqual(typesOf('found_something'), ['ROLL_LOOT_TABLE', 'AWARD_XP', 'END_ENCOUNTER']);
    assert.deepEqual(typesOf('path_cleared'), ['AWARD_XP', 'END_ENCOUNTER']);
    const exhausted = resultsOf(enc.stages.exhausted.decisions.flatMap(d => d.outcomes)).find(r => r.type === 'MODIFY_VITALS').payload;
    assert.equal(exhausted.stamina, -25); assert.equal(exhausted.insight, -25); assert.equal(exhausted.isPercentageOfCurrent, true); assert.equal(exhausted.target, 'entire_party');
    const rocks = resultsOf(enc.stages.rocks_fall.decisions.flatMap(d => d.outcomes));
    assert.equal(rocks.find(r => r.type === 'MODIFY_VITALS').payload.hp, -25);
    assert.deepEqual(stageTargets(enc.stages.rocks_fall.decisions.flatMap(d => d.outcomes)), ['discovery'], 'after the rocks, the dig can be tried again');
});

test('the spider nest fights spiders only, and the rubble is still there afterwards', () => {
    const battle = resultsOf(enc.stages.spider_nest.decisions.flatMap(d => d.outcomes)).find(r => r.type === 'START_BATTLE').payload;
    assert.equal(battle.tableId, 'spider_nest');
    assert.deepEqual(battle.afterVictory, { encounterId: 'cave_in' });
    assert.ok(encounterDefinitions[battle.afterVictory.encounterId], 'the follow-up encounter exists');
    const table = SpawnTableDefinitions.spider_nest;
    assert.ok(table);
    assert.deepEqual(table.pools.flatMap(p => p.members.map(m => m.id)), ['CAVE_SPIDER']);
    assert.deepEqual(table.pools[0].difficultySettings.normal, { minSize: 3, maxSize: 5 });
    for (let i = 0; i < 20; i++) {
        const spawn = SpawnTableFactory.generateBattle('spider_nest', 'normal');
        assert.ok(spawn.hasEnemies());
        assert.ok(spawn.enemies.length >= 3 && spawn.enemies.length <= 5, `${spawn.enemies.length} spiders`);
    }
});

test('it can happen inside caves, at any hour, and nowhere else', () => {
    const cave = BIOME_DEFINITIONS.CAVE_INTERIOR.encounters;
    assert.ok(cave.rate > 0 && cave.rate <= 0.0025, 'Cave In is rare: no more likely than the rarest encounter elsewhere');
    const pool = cave.pools.find(p => p.id === 'cave_in');
    assert.ok(pool, 'the cave lists it');
    assert.deepEqual(pool.allowedTimes.sort(), ['day', 'dusk', 'night']);
    for (const [id, biome] of Object.entries(BIOME_DEFINITIONS)) {
        if (id !== 'CAVE_INTERIOR') assert.ok(!(biome.encounters?.pools || []).some(p => p.id === 'cave_in'), `${id} does not roll it`);
    }
});
