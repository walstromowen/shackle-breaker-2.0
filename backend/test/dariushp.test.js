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

test('a status someone else puts on a boss lasts half as long; its own buffs, endless ones and other enemies are untouched', async () => {
    const { StatusEffectModel } = await import('../../shared/abilities/statusEffectModel.js');
    const { StatusEffectDefinitions: S } = await import('../../shared/abilities/statusEffectDefinitions.js');
    const darius = new CombatantModel(EntityFactory.create('DARIUS_THE_GROVELER', 10));
    const hero = new CombatantModel(EntityFactory.create('LEGIONARY', 10));
    const put = (target, id, by) => { const e = new StatusEffectModel(S[id], null, by); target.applyStatusEffect(e); return target.originalEntity.statusEffects.find(x => x.id === id).charges; };
    assert.equal(S.bleed.defaultCharges, 4);
    assert.equal(put(darius, 'bleed', hero), 2, 'bleed: 4 turns -> 2');
    assert.equal(put(darius, 'poison', hero), 2, 'poison: 3 turns -> 2 (rounded up)');
    assert.equal(put(darius, 'knocked_down', hero), 1, 'a single turn stays a turn');
    assert.equal(put(darius, 'blessed', darius), 5, 'his own Bless lasts its full time');
    assert.equal(put(darius, 'wet', hero), 99, 'the weather lasts the whole fight');
    const madman = new CombatantModel(EntityFactory.create('MAD_MAN', 10));
    assert.equal(put(madman, 'bleed', hero), 4, 'not a boss: the full time');
    // put on again while it is still there: the refreshed time is halved too
    assert.equal(put(darius, 'bleed', hero), 2);
});

test('bosses are tuned for three players: with two they have three quarters of their health, alone half (Darius solo is as before the doubling)', async () => {
    const { bossHpFactor, PARTY_SCALING } = await import('../../shared/battle/spawnTableFactory.js');
    assert.deepEqual([1, 2, 3, 4].map(n => bossHpFactor(n)), [0.5, 0.75, 1, 1]);
    assert.equal(PARTY_SCALING.BOSS_HP_BY_PLAYERS.length, 3);
    // built the way SceneManager builds a boss for a fight: its own maxHpMultiplier times the share for the players in it
    const def = EntityDefinitions.DARIUS_THE_GROVELER;
    const build = (players) => EntityFactory.create('DARIUS_THE_GROVELER', { level: 15, baseStats: { ...def.baseStats, maxHpMultiplier: def.baseStats.maxHpMultiplier * bossHpFactor(players) } });
    const three = build(3).maxHp, two = build(2).maxHp, one = build(1).maxHp;
    assert.equal(three, EntityFactory.create('DARIUS_THE_GROVELER', 15).maxHp, 'three players: as tuned');
    assert.ok(Math.abs(two - three * 0.75) <= 1, `two players: ${two} of ${three}`);
    assert.ok(Math.abs(one - three * 0.5) <= 1, `alone: ${one} of ${three}`);
    const undoubled = EntityFactory.create('DARIUS_THE_GROVELER', { level: 15, baseStats: { ...def.baseStats, maxHpMultiplier: 1 } }).maxHp;
    assert.ok(Math.abs(one - undoubled) <= 1, 'alone he has the health he had before it was doubled');
    assert.equal(build(1).hp, one, 'full health at the start');
});
