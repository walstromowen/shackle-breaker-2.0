// backend/test/battlemusic.test.js: `npm test`. A fight an encounter starts plays the battle music of the place it happens in (the cave's in a cave).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameState } from '../../shared/core/gameState.js';
import { BIOME_DEFINITIONS } from '../../shared/world/biomeDefinitions.js';
import { BiomeModel } from '../../shared/world/biomeModel.js';
import { encounterDefinitions } from '../../shared/story/encounterDefinitions.js';
import { EncounterLogic } from '../../frontend/src/screens/encounter/encounterLogic.js';

const world = (biomeId) => ({ getBiomeAt: () => new BiomeModel(BIOME_DEFINITIONS[biomeId]) });
gameState.player = { col: 3, row: 4 };

test('the generic battle track an encounter names becomes the music of the biome the party stands in', () => {
    assert.equal(EncounterLogic.resolveBattleBgm('plainsBattleBgm', world('CAVE_INTERIOR')), 'caveBattleBgm');
    assert.equal(EncounterLogic.resolveBattleBgm('plainsBattleBgm', world('DESERT')), 'desertBattleBgm');
    assert.equal(EncounterLogic.resolveBattleBgm('plainsBattleBgm', world('PLAINS')), 'plainsBattleBgm');
});

test('a track made for one scene is played as named, in a cave too', () => {
    for (const id of ['bossBattleBgm', 'apexPredatorBgm', 'poachersNightmareBgm', 'caveBattleBgm', null]) {
        assert.equal(EncounterLogic.resolveBattleBgm(id, world('CAVE_INTERIOR')), id);
    }
});

test('with no world to ask, nothing changes', () => {
    assert.equal(EncounterLogic.resolveBattleBgm('plainsBattleBgm', null), 'plainsBattleBgm');
});

test('every fight an encounter starts either names its own track, or sits in a stage that does, or gets the biome\'s', () => {
    // (the rule lives in EncounterLogic START_BATTLE: payload.bgm, else the stage's bgm, else the generic track that resolveBattleBgm swaps)
    const special = new Set();
    for (const enc of Object.values(encounterDefinitions)) for (const s of Object.values(enc.stages || {})) {
        if (s.bgm && s.bgm !== 'plainsBattleBgm') special.add(s.bgm);
    }
    assert.ok(special.has('dariusEncounterBgm'), 'the Darius scene keeps its own music into the fight');
});

test('a choice with its own music carries it into the fight it starts (Charge the stranger plays the battle music, not the stage theme)', async () => {
    const { EncounterController } = await import('../../frontend/src/screens/encounter/encounterController.js');
    const { events } = await import('../../shared/core/eventBus.js');
    const { EntityFactory } = await import('../../shared/characters/entityFactory.js');
    gameState.party.members = [EntityFactory.create('LEGIONARY', 5)];
    const c = new EncounterController({ heldKeys: new Set(), isMouseDown: false, mouse: { x: 0, y: 0 } }, {}, { getBiomeAt: () => new BiomeModel(BIOME_DEFINITIONS.PLAINS) });
    c.worldManager = { getBiomeAt: () => new BiomeModel(BIOME_DEFINITIONS.PLAINS) };
    c.start('a_disturbing_sight', {});
    const charge = c._getValidDecisions().findIndex(d => d.text === 'Charge the stranger.');
    assert.ok(charge >= 0, 'the charge is offered');
    const started = [];
    const on = (d) => started.push(d);
    events.on('START_BATTLE', on);
    try {
        c.selectedIndex = charge;
        c.pendingDecision = c._getValidDecisions()[charge];
        c.executeLogic();
    } finally { events.off('START_BATTLE', on); }
    assert.equal(started.length, 1, 'the fight starts');
    const plains = new BiomeModel(BIOME_DEFINITIONS.PLAINS).getMusic(0, true);
    assert.equal(started[0].bgm, plains, `the battle music (${plains}), not the stage's theme`);
    assert.notEqual(started[0].bgm, 'aDisturbingSightBgm');
});
