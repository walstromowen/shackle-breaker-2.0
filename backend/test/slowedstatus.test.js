// backend/test/slowedstatus.test.js: `npm test`. The blizzard slows everyone in a fight: status 'slowed' (was 'chilled') takes a share of speed and does nothing else (no effect each
// turn, no text). The madman stands facing north, and the world map draws the buildings of the land the party has seen.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { StatusEffectDefinitions } = await import('../../shared/abilities/statusEffectDefinitions.js');
const { WEATHER } = await import('../../shared/world/weatherDefinitions.js').then((m) => ({ WEATHER: m.WeatherDefinitions || m.WEATHER_DEFINITIONS || Object.values(m).find((v) => v && v.BLIZZARD) }));
const { MAP_OBJECTS_DEFINITIONS } = await import('../../shared/world/mapObjectDefinitions.js');

test('slowed only lowers speed', () => {
    assert.equal(StatusEffectDefinitions.chilled, undefined, 'chilled is gone');
    const s = StatusEffectDefinitions.slowed;
    assert.ok(s);
    assert.equal(s.name, 'Slowed');
    assert.deepEqual(s.icon, { col: 3, row: 1 });
    assert.equal(s.effects, undefined, 'nothing happens on a turn');
    assert.equal(s.immunities, undefined);
    assert.equal(s.modifiers.length, 1);
    assert.equal(s.modifiers[0].target, 'speed');
    assert.equal(s.modifiers[0].type, 'percent');
    assert.ok(s.modifiers[0].value < 0 && s.modifiers[0].value > -1);
});

test('the blizzard puts slowed on everyone', () => {
    assert.ok(WEATHER && WEATHER.BLIZZARD, 'the weather definitions have the blizzard');
    assert.equal(WEATHER.BLIZZARD.appliedStatusId, 'slowed');
    for (const w of Object.values(WEATHER)) if (w.appliedStatusId) assert.ok(StatusEffectDefinitions[w.appliedStatusId], `${w.id} applies a status that exists`);
});

test('the madman faces north', () => {
    const m = MAP_OBJECTS_DEFINITIONS.MADMAN_NPC;
    assert.equal(m.character.facing, 'UP');
    assert.equal(m.character.row, 2);
});

test('the world map draws the buildings the world has placed, (the explored-land check is in render)', async () => {
    const noop = () => {};
    globalThis.document = globalThis.document || { createElement: () => ({ getContext: () => new Proxy({}, { get: () => noop }) }) };
    const { gameState } = await import('../../shared/core/gameState.js');
    const { WorldMapRenderer } = await import('../../frontend/src/screens/worldMap/worldMapRenderer.js');
    gameState.world.changes = { '10,10': 'ABANDONED_HOUSE_1', '30,30': 'ABANDONED_STONE_HOUSE', '5,5': 'TREE_STUMP', '6,6': 'WOODEN_FENCE_H', '7,7': null };
    const r = new WorldMapRenderer({ MINIMAP: {} }, { get: noop });
    const list = r._buildings();
    assert.equal(list.length, 2, 'the two houses, not the stump or the fence');
    const def = MAP_OBJECTS_DEFINITIONS.ABANDONED_HOUSE_1;
    const h = list.find((b) => b.x === 10);
    assert.deepEqual([h.w, h.h, h.y], [def.width, def.height, 10 - (def.height - 1)], 'a house rises above the row it stands on');
});
