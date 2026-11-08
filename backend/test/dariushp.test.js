// backend/test/dariushp.test.js: `npm test`. Darius the Groveler has twice the health his level and vigor give (baseStats.maxHpMultiplier 2),
// at every level, in battle too, and starts the fight at full health. Nobody else is touched.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EntityFactory } from '../../shared/characters/entityFactory.js';
import { ENTITY_DEFINITIONS as EntityDefinitions } from '../../shared/characters/entityDefinitions.js';
import { CombatantModel } from '../../shared/battle/combatantModel.js';

test('Darius has double health at every level, full at the start of the fight, in battle too', () => {
    assert.equal(EntityDefinitions.DARIUS_THE_GROVELER.baseStats.maxHpMultiplier, 2);
    for (const level of [5, 15, 25]) {
        const darius = EntityFactory.create('DARIUS_THE_GROVELER', level);
        const plain = EntityFactory.create('DARIUS_THE_GROVELER', { level, baseStats: { ...EntityDefinitions.DARIUS_THE_GROVELER.baseStats, maxHpMultiplier: 1 } });
        assert.ok(Math.abs(darius.maxHp - plain.maxHp * 2) <= 1, `level ${level}: ${darius.maxHp} is twice ${plain.maxHp}`);
        assert.equal(darius.hp, darius.maxHp, 'full health');
        const inFight = new CombatantModel(darius).stats.maxHp;
        assert.equal(typeof inFight === 'object' ? inFight.total : inFight, darius.maxHp, 'the same in a fight');
    }
    const madman = EntityFactory.create('MAD_MAN', 15);
    assert.ok(!madman.baseStats || !madman.baseStats.maxHpMultiplier, 'other enemies keep their health');
});
