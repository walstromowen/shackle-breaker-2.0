// backend/test/rollanimation.test.js: `npm test`. Pressing Roll always flashes through numbers, slows down and lands on the real roll, even when a
// skip was left over from holding through the stage's words (which, in a shared encounter, is what made the dice land at once).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameState } from '../../shared/core/gameState.js';
import { EntityFactory } from '../../shared/characters/entityFactory.js';
import { BIOME_DEFINITIONS } from '../../shared/world/biomeDefinitions.js';
import { BiomeModel } from '../../shared/world/biomeModel.js';

test('a roll plays out from the throw to the landing, whatever was skipped before it', async () => {
    const { EncounterController } = await import('../../frontend/src/screens/encounter/encounterController.js');
    const quiet = console.log; console.log = () => {};
    try {
        gameState.party.members = [EntityFactory.create('LEGIONARY', 5)];
        const world = { getBiomeAt: () => new BiomeModel(BIOME_DEFINITIONS.PLAINS) };
        const c = new EncounterController({ heldKeys: new Set(), isMouseDown: false, mouse: { x: 0, y: 0 } }, {}, world);
        c.worldManager = world;
        c.start('arrow_trap', {});
        c.pendingDecision = c.model.getAvailableDecisions().find(d => d.type === 'skill_check');
        c.rollData = c._takeRoll(c.pendingDecision);
        c.actionPhase = 'wait_for_roll';
        c.skipMessageAnimation = true;   // left over from holding through the words
        c.triggerRoll();
        const seen = new Set();
        let t = 0;
        while (c.actionPhase === 'rolling' && t < 10) { c.update(0.016); t += 0.016; seen.add(c.rollData.displayVal); }
        assert.ok(t > 1, `the numbers flashed for a while (${t.toFixed(2)} s), not landing at once`);
        assert.ok(seen.size >= 6, `many numbers went by (${seen.size})`);
        assert.equal(c.actionPhase, 'hold_base');
        assert.equal(c.rollData.displayVal, c.rollData.d20, 'it lands on the real roll');
    } finally { console.log = quiet; }
});
