// backend/test/altarcatacombs.test.js: `npm test`. There is a catacomb under every mysterious altar: whatever spends the altar (touching the skull,
// whichever light it gives, or waking Darius) uncovers the stair down, and nothing removes the altar without leaving the stair.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encounterDefinitions } from '../../shared/story/encounterDefinitions.js';
import { MAP_OBJECTS_DEFINITIONS } from '../../shared/world/mapObjectDefinitions.js';

const altar = encounterDefinitions.mysterious_altar;
const resultsOf = (stage) => (stage.decisions || []).flatMap(d => [...(d.outcomes || []), ...(d.successOutcomes || []), ...(d.failureOutcomes || [])]).flatMap(o => o.results || []);
const uncovers = (stage) => resultsOf(stage).some(r => r.type === 'REPLACE_OBJECT' && r.payload && r.payload.objectId === 'CATACOMBS_STAIRS');

test('touching the skull uncovers the catacombs, whichever light it gives, and so does waking Darius', () => {
    for (const id of ['blue_glow', 'green_glow', 'red_glow', 'darius_wrath']) assert.ok(uncovers(altar.stages[id]), `${id} leaves the stair down`);
    assert.equal(MAP_OBJECTS_DEFINITIONS.CATACOMBS_STAIRS.interaction.roomType, 'CATACOMBS');
});

test('nothing takes the altar away without leaving the stair', () => {
    for (const [id, stage] of Object.entries(altar.stages)) assert.ok(!resultsOf(stage).some(r => r.type === 'DESTROY_OBJECT'), `${id} does not just remove it`);
});
