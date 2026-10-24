// backend/test/dangermusic.test.js: `npm test`. When danger is imminent in an encounter (the skeletons rise at the altar), the battle music of the biome plays at once,
// and the fight that follows keeps that same track. And a party carrying the meteorite can walk up to the altar without the roll.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameState } from '../../shared/core/gameState.js';
import { events } from '../../shared/core/eventBus.js';
import { BIOME_DEFINITIONS } from '../../shared/world/biomeDefinitions.js';
import { BiomeModel } from '../../shared/world/biomeModel.js';
import { encounterDefinitions } from '../../shared/story/encounterDefinitions.js';
import { mysteriousAltar } from '../../shared/story/encounters/story/mysteriousAltar.js';
import { EncounterLogic } from '../../frontend/src/screens/encounter/encounterLogic.js';

const world = (biomeId) => ({ getBiomeAt: () => new BiomeModel(BIOME_DEFINITIONS[biomeId]) });
gameState.player = { col: 3, row: 4 };
gameState.party = { members: [], currency: 0 };
gameState.difficulty = 'normal';

const stages = mysteriousAltar.stages;
const results = (d) => [...(d.outcomes || []), ...(d.successOutcomes || []), ...(d.failureOutcomes || [])].flatMap(o => o.results);
const nextOf = (id) => stages[id].decisions.flatMap(results).filter(r => r.type === 'ADVANCE_STAGE').map(r => r.payload.stageId);

/** Press the (first) fight button of `stageId` on a model showing that stage, and return what START_BATTLE carried. */
function battleFrom(enc, stageId, biomeId) {
    const stage = enc.stages[stageId];
    const model = { context: {}, getBgm: () => stage.bgm || null, getCurrentStage: () => stage };
    const fight = stage.decisions.flatMap(results).find(r => r.type === 'START_BATTLE');
    let seen = null;
    const off = events.on('START_BATTLE', (d) => { seen = d; });
    try { EncounterLogic.resolveResults([fight], model, world(biomeId)); } finally { if (typeof off === 'function') off(); }
    return seen;
}

test('the stages where the skeletons rise name the battle music, so it starts before the player chooses to fight', () => {
    assert.equal(stages.bones_stir.bgm, 'plainsBattleBgm');
    assert.equal(stages.red_glow.bgm, 'plainsBattleBgm');
    // a stage that names the generic battle track plays the biome's: the cave's in a cave
    assert.equal(EncounterLogic.resolveBattleBgm(stages.bones_stir.bgm, world('CAVE_INTERIOR')), 'caveBattleBgm');
    assert.equal(EncounterLogic.resolveBattleBgm(stages.red_glow.bgm, world('CAVE_INTERIOR')), 'caveBattleBgm');
});

test('the fight keeps the track that was already playing, in a cave and elsewhere', () => {
    for (const stageId of ['bones_stir', 'red_glow']) {
        const cave = battleFrom(mysteriousAltar, stageId, 'CAVE_INTERIOR');
        assert.ok(cave, `${stageId}: START_BATTLE was emitted`);
        assert.equal(cave.bgm, 'caveBattleBgm', `${stageId}: the battle plays the cave music the stage began`);
        assert.equal(battleFrom(mysteriousAltar, stageId, 'DESERT').bgm, 'desertBattleBgm');
    }
});

test('a stage that asks for silence does not hand "none" to the battle', () => {
    assert.equal(EncounterLogic.stageBattleBgm({ getBgm: () => 'none' }), null);
    assert.equal(EncounterLogic.stageBattleBgm({ getBgm: () => 'caveBattleBgm' }), 'caveBattleBgm');
    assert.equal(EncounterLogic.stageBattleBgm(null), null);
});

test('every stage that starts a fight without naming a track has music of its own, or is an ordinary fight', () => {
    const quiet = [];
    for (const [id, enc] of Object.entries(encounterDefinitions)) for (const [sid, s] of Object.entries(enc.stages || {})) {
        if (s.bgm || !JSON.stringify(s.decisions || []).includes('START_BATTLE')) continue;
        // a fight with its own track in the payload is fine; so is the boss stage
        const named = (s.decisions || []).flatMap(results).filter(r => r.type === 'START_BATTLE').every(r => r.payload && r.payload.bgm);
        if (!named) quiet.push(`${id}.${sid}`);
    }
    assert.deepEqual(quiet.sort(), []);
});

test('the meteorite lets the party walk up to the altar without rolling, and is not spent doing it', () => {
    const roll = stages.approach.decisions.find(d => d.type === 'skill_check');
    const shortcut = stages.approach.decisions.find(d => /meteorite/i.test(d.text));
    assert.ok(roll && shortcut);
    assert.notEqual(shortcut.type, 'skill_check', 'no roll');
    assert.ok(shortcut.conditions.some(c => c.type === 'has_item' && c.itemId === 'meteorite'), 'only while the party carries one');
    assert.ok(shortcut.conditions.some(c => c.type === 'context_flag_not_set' && c.flagId === 'altar_approached'));
    const r = results(shortcut);
    assert.ok(r.some(x => x.type === 'ADVANCE_STAGE' && x.payload.stageId === 'at_the_altar'));
    assert.ok(r.some(x => x.type === 'SET_CONTEXT_FLAG' && x.payload.flagId === 'altar_approached'));
    assert.ok(!r.some(x => x.type === 'REMOVE_ITEM' || x.type === 'START_BATTLE'), 'nothing is spent or fought');
    assert.ok(shortcut.customActionText);
});

test('the stages it walks to exist', () => {
    for (const id of Object.keys(stages)) for (const n of nextOf(id)) assert.ok(stages[n], `${id} -> ${n}`);
});
