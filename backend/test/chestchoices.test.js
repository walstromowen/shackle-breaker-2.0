// backend/test/chestchoices.test.js: `npm test`. Some choices are offered only at some chests (decision.offerChance), rolled once for each chest
// and remembered in the world's changes, so leaving and coming back offers the same choices.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameState } from '../../shared/core/gameState.js';
import { worldSync } from '../../shared/world/worldManager.js';
import { encounterDefinitions } from '../../shared/story/encounterDefinitions.js';
import { EncounterFactory } from '../../shared/story/encounterFactory.js';
import { EncounterController } from '../../frontend/src/screens/encounter/encounterController.js';
import { EntityFactory } from '../../shared/characters/entityFactory.js';

const visit = (col, row) => {
    const c = Object.create(EncounterController.prototype);
    c._encounterId = 'treasure_chest';
    c.model = EncounterFactory.create('treasure_chest', { col, row, objectId: 'CHEST' });
    c.mp = null;
    return c;
};
const offered = (c) => c._getValidDecisions().map(d => d.text);
const withRandom = (seq, fn) => { const r = Math.random; let i = 0; Math.random = () => seq[i++ % seq.length]; try { return fn(); } finally { Math.random = r; } };

test('the treasure chest\'s other ways in are each offered at 20% of chests; the key, switching and leaving always are', () => {
    const ds = encounterDefinitions.treasure_chest.stages.discovery.decisions;
    const chanced = ds.filter(d => d.offerChance !== undefined).map(d => d.text.slice(0, 5));
    assert.deepEqual(chanced, ['[STR]', '[DEX]', '[INT]', '[ATN]']);
    for (const d of ds.filter(d => d.offerChance !== undefined)) assert.equal(d.offerChance, 0.2);
    assert.ok(ds.find(d => d.text.startsWith('[Small Iron Key]')).offerChance === undefined);
});

test('the roll is kept for that chest: leaving and coming back offers the same choices, another chest rolls its own', () => {
    gameState.world.changes = {};
    gameState.world.isInterior = false;
    gameState.party.members = [EntityFactory.create('HUMANOID', { level: 1 })];   // the other ways in need a person (has_tag HUMANOID)
    const sent = [];
    worldSync.onLocalChange = (k, v) => sent.push(k);
    try {
        // STR yes (0.1 < 0.2), DEX no, INT no, ATN yes
        const first = withRandom([0.1, 0.9, 0.5, 0.15], () => offered(visit(5, 7)));
        assert.ok(first.some(t => t.startsWith('[STR]')) && first.some(t => t.startsWith('[ATN]')));
        assert.ok(!first.some(t => t.startsWith('[DEX]')) && !first.some(t => t.startsWith('[INT]')));
        assert.ok(first.some(t => t.startsWith('Leave')), 'leaving is always there');
        // come back later: whatever the dice say now, the same choices
        const again = withRandom([0.99], () => offered(visit(5, 7)));
        assert.deepEqual(again, first);
        assert.ok(gameState.world.changes['choices:treasure_chest:5,7'], 'kept in the world (saved with it)');
        assert.ok(sent.includes('choices:treasure_chest:5,7'), 'and told to the other players');
        // a different chest is a different roll
        const other = withRandom([0.99], () => offered(visit(30, 2)));
        assert.ok(!other.some(t => /^\[(STR|DEX|INT|ATN)\]/.test(t)), 'nothing but the key (when held), switching and leaving');
    } finally {
        worldSync.onLocalChange = null;
    }
});
