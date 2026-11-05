// backend/test/abilitytraits.test.js: `npm test`. The traits a character picks up, now and then, from the abilities they fight with.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AbilityDefinitions } from '../../shared/abilities/abilityDefinitions.js';
import { AbilityFactory } from '../../shared/abilities/abilityFactory.js';
import { TRAIT_DEFINITIONS as TraitDefinitions } from '../../shared/abilities/traitDefinitions.js';
import { traitsForAbility, ABILITY_TRAIT_CHANCE } from '../../shared/abilities/abilityTraits.js';
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
