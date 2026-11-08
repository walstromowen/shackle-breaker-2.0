// backend/test/altarcatacombs.test.js: `npm test`. There is a catacomb under every mysterious altar: whatever spends the altar (touching the skull,
// whichever light it gives, or waking Darius) uncovers the stair down, and nothing removes the altar without leaving the stair.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encounterDefinitions } from '../../shared/story/encounterDefinitions.js';
import { MAP_OBJECTS_DEFINITIONS } from '../../shared/world/mapObjectDefinitions.js';

const altar = encounterDefinitions.mysterious_altar;
const resultsOf = (stage) => (stage.decisions || []).flatMap(d => [...(d.outcomes || []), ...(d.successOutcomes || []), ...(d.failureOutcomes || [])]).flatMap(o => o.results || []);
const uncovers = (stage) => resultsOf(stage).some(r => r.type === 'REPLACE_OBJECT' && r.payload && r.payload.objectId === 'CATACOMBS_STAIRS');

test('touching the skull uncovers the catacombs, whichever light it gives, and so does beating Darius (A Dark Truth)', () => {
    for (const id of ['blue_glow', 'green_glow', 'red_glow']) assert.ok(uncovers(altar.stages[id]), `${id} leaves the stair down`);
    assert.ok(Object.values(encounterDefinitions.act_two.stages).some(uncovers), 'beating Darius uncovers it');
    assert.equal(MAP_OBJECTS_DEFINITIONS.CATACOMBS_STAIRS.interaction.roomType, 'CATACOMBS');
});

test('the meteorite is spent once, at the approach: the altar remembers it and opens on Darius again after a lost fight', () => {
    const approach = altar.stages.approach.decisions.find(d => JSON.stringify(d.conditions || []).includes('meteorite'));
    const results = approach.outcomes[0].results;
    assert.ok(results.some(r => r.type === 'REMOVE_ITEM' && r.payload.itemId === 'meteorite'), 'the stone is spent');
    assert.ok(results.some(r => r.type === 'REPLACE_OBJECT' && r.payload.objectId === 'MYSTERIOUS_ALTAR_AWAKENED'), 'the altar is awakened');
    const awake = MAP_OBJECTS_DEFINITIONS.MYSTERIOUS_ALTAR_AWAKENED;
    assert.ok(awake && awake.interaction.id === 'mysterious_altar' && awake.sheet === MAP_OBJECTS_DEFINITIONS.MYSTERIOUS_ALTAR.sheet, 'the same altar to look at');
    assert.equal(altar.initialStage({ objectId: 'MYSTERIOUS_ALTAR_AWAKENED' }), 'awakened');
    assert.equal(altar.initialStage({ objectId: 'MYSTERIOUS_ALTAR' }), 'approach');
    const face = altar.stages.awakened.decisions.find(d => d.text === 'Face Darius.');
    assert.ok(face && !JSON.stringify(face.conditions).includes('meteorite'), 'no second stone needed');
    assert.ok(JSON.stringify(face.outcomes).includes('darius_rises'));
    // the fight itself leaves the altar standing: losing it costs nothing more
    assert.ok(!resultsOf(altar.stages.darius_wrath).some(r => r.type === 'REPLACE_OBJECT' || r.type === 'DESTROY_OBJECT'), 'the altar stays through the fight');
});

test('nothing takes the altar away without leaving the stair', () => {
    for (const [id, stage] of Object.entries(altar.stages)) assert.ok(!resultsOf(stage).some(r => r.type === 'DESTROY_OBJECT'), `${id} does not just remove it`);
});

test('the Fallen Meteorite is drawn from the consumables sheet (the cratered stone at 3, 1), and stays a material', async () => {
    const { ItemDefinitions } = await import('../../shared/items/itemDefinitions.js');
    const { iconSheetFor } = await import('../../frontend/src/ui/toasts.js');
    const m = ItemDefinitions.meteorite;
    assert.equal(m.type, 'material', 'still a material (crafting, quests)');
    assert.equal(m.iconSheet, 'consumables');
    assert.deepEqual(m.icon, { col: 3, row: 1 });
    assert.equal(iconSheetFor(m), 'consumables', 'toasts and the hotbar use the same sheet');
});
