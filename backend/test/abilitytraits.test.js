// backend/test/abilitytraits.test.js: `npm test`. The traits a character picks up, now and then, from the abilities they fight with.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AbilityDefinitions } from '../../shared/abilities/abilityDefinitions.js';
import { AbilityFactory } from '../../shared/abilities/abilityFactory.js';
import { TRAIT_DEFINITIONS as TraitDefinitions } from '../../shared/abilities/traitDefinitions.js';
import { traitsForAbility, ABILITY_TRAIT_CHANCE, scarForAbility, SCAR_TRAITS } from '../../shared/abilities/abilityTraits.js';
import { BattleRewardSystem } from '../../shared/battle/battleRewardSystem.js';

test('every fighting ability fits a trait that exists; items, retreats and world actions teach nothing', () => {
    let fitted = 0;
    for (const [id, def] of Object.entries(AbilityDefinitions)) {
        const traits = traitsForAbility(def);
        for (const t of traits) assert.ok(TraitDefinitions[t], `${id}: ${t} is a trait`);
        if (traits.length) fitted++;
    }
    assert.ok(fitted >= 65, `${fitted} abilities teach a trait`);
    assert.deepEqual(traitsForAbility(AbilityDefinitions.fireball), ['pyromaniac']);
    assert.ok(traitsForAbility(AbilityDefinitions.loose_arrow).includes('deadeye'));
    assert.ok(traitsForAbility(AbilityDefinitions.reckless_charge).includes('brawler'));
    for (const id of ['retreat', 'switch_combatant', 'torchlight', 'minor_heal', 'item_bandage']) assert.deepEqual(traitsForAbility(AbilityDefinitions[id]), [], id);
    assert.ok(ABILITY_TRAIT_CHANCE.use_ability < 0.01 && ABILITY_TRAIT_CHANCE.kill < 0.05, 'rare');
});

test('after a fight: using an ability, finishing a foe with it and living through one can each teach its trait (on a lucky roll only)', () => {
    const member = (name, team) => {
        const ent = { traits: [], addTrait(t) { this.traits.push(t); } };
        return { name, team, originalEntity: ent, isDead: () => false };
    };
    const hero = member('Hero', 'party'), foe = member('Wolf', 'enemy');
    const [fireball] = AbilityFactory.createAbilities(['fireball']);
    const [bite] = AbilityFactory.createAbilities(['bite']);
    const ledger = [
        { type: 'ABILITY_USED', action: fireball, actor: hero, target: foe },
        { type: 'ABILITY_USED', action: bite, actor: foe, target: hero },
        { type: 'DEATH', killer: hero, killed: foe },
    ];
    const real = Math.random;
    try {
        Math.random = () => 0.99;   // unlucky: nothing
        BattleRewardSystem._processTraitRewards(ledger, [hero], [foe]);
        assert.deepEqual(hero.originalEntity.traits, []);
        Math.random = () => 0;      // lucky: the fire it used and killed with, and the hide toughened by the bite
        const msgs = BattleRewardSystem._processTraitRewards(ledger, [hero], [foe]);
        assert.ok(hero.originalEntity.traits.includes('pyromaniac'));
        assert.ok(hero.originalEntity.traits.includes('ironhide'), 'a physical blow lived through');
        assert.ok(msgs.some(m => /Pyromaniac/.test(m)));
        assert.equal(new Set(hero.originalEntity.traits).size, hero.originalEntity.traits.length, 'never the same trait twice');
    } finally { Math.random = real; }
});

test('struck down by an enemy: a fair chance of a scar that fits the blow, another bad trait when that one is already carried, never from a duel', async () => {
    assert.equal(ABILITY_TRAIT_CHANCE.killed_by_ability, 0.25);
    for (const t of SCAR_TRAITS) assert.ok(TraitDefinitions[t], `${t} is a trait`);
    assert.equal(scarForAbility(AbilityDefinitions.fireball), 'superstitious');
    assert.equal(scarForAbility(AbilityDefinitions.loose_arrow), 'myopic');
    assert.equal(scarForAbility(AbilityDefinitions.reckless_charge), 'frail');
    assert.equal(scarForAbility(AbilityDefinitions.claw), 'clumsy');
    const member = (name, team) => ({ name, team, originalEntity: { traits: [], addTrait(t) { this.traits.push(t); } }, isDead: () => true });
    const hero = member('Hero', 'party'), wolf = member('Wolf', 'enemy');
    const [arrow] = AbilityFactory.createAbilities(['loose_arrow']);
    const ledger = [{ type: 'ABILITY_USED', action: arrow, actor: wolf, target: hero }, { type: 'DEATH', killer: wolf, killed: hero }];
    const real = Math.random;
    try {
        Math.random = () => 0.9;
        assert.deepEqual(BattleRewardSystem.processDeathScars(ledger), [], 'mostly they get back up whole');
        Math.random = () => 0.1;
        const lines = BattleRewardSystem.processDeathScars(ledger);
        assert.deepEqual(hero.originalEntity.traits, ['myopic'], 'shot down: Myopic');
        assert.ok(/scar/.test(lines[0]));
        BattleRewardSystem.processDeathScars(ledger);
        assert.equal(hero.originalEntity.traits.length, 2, 'already myopic: another bad trait');
        assert.ok(SCAR_TRAITS.includes(hero.originalEntity.traits[1]) && hero.originalEntity.traits[1] !== 'myopic');
    } finally { Math.random = real; }
    const { queueDefeat } = await import('../../shared/battle/battleQueue.js');
    const duel = { mp: { kind: 'duel', opponentName: 'Rival' }, battleLedger: ledger, turnQueue: [] };
    Math.random = () => 0; try { queueDefeat(duel); } finally { Math.random = real; }
    assert.equal(duel.turnQueue.filter(t => /scar/.test(t.message || '')).length, 0, 'a duel leaves no scars');
});
