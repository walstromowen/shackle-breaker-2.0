// backend/test/hawk.test.js: `npm test`. The hunting hawk is a starting companion again: offered in the character creator, built like the other
// beast companions, with a battle sheet that faces the enemy from the party's side and a map sheet to follow the leader with.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ENTITY_DEFINITIONS } from '../../shared/characters/entityDefinitions.js';
import { AbilityDefinitions } from '../../shared/abilities/abilityDefinitions.js';
import { StatCalculator } from '../../shared/characters/statCalculator.js';
import { EntityFactory } from '../../shared/characters/entityFactory.js';
import { CREATION_DATA } from '../../frontend/src/screens/characterCreator/characterCreatorLogic.js';

const main = fs.readFileSync(new URL('../../frontend/src/main.js', import.meta.url), 'utf8');
const fileOf = (key) => { const m = main.match(new RegExp(`\\b${key}:\\s*'\\./([^']+)'`)); return m && new URL(`../../frontend/src/${m[1]}`, import.meta.url); };
const pngSize = (url) => { const b = fs.readFileSync(url); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

test('the hawk is offered as a starting companion and joins as a beast with its own abilities', () => {
    const offer = CREATION_DATA.COMPANIONS.find(c => c.speciesId === 'HAWK');
    assert.ok(offer, 'Hunting Hawk is in the character creator');
    const H = ENTITY_DEFINITIONS.HAWK;
    for (const id of H.abilities) assert.ok(AbilityDefinitions[id], `${id} exists`);
    assert.ok(['slash', 'take_flight', 'hit_and_run'].every(a => H.abilities.includes(a)), 'slash, take flight and hit and run');
    assert.deepEqual(H.traits, ['airborne'], 'it starts every fight in the air');
    const hawk = EntityFactory.create('HAWK', { name: offer.label, attributes: { ...offer.attributes } });
    assert.equal(StatCalculator.usesEnemyScaling(hawk), true, 'beast rules, like the dog and the snow leopard');
    const s = StatCalculator.calculate(hawk);
    const dog = StatCalculator.calculate(EntityFactory.create('DOG', {}));
    assert.ok(s.speed > dog.speed && s.evasion > dog.evasion, 'faster and harder to hit than the dog');
    assert.ok(s.maxHp < dog.maxHp, 'and more fragile');
});

test("the hawk's sheets are registered, on disk and laid out like the others", () => {
    const H = ENTITY_DEFINITIONS.HAWK;
    assert.deepEqual(pngSize(fileOf(H.spritePortrait)), [2048, 1024], 'battle sheet: 16 frames of 128 to a row, rows 0-1 and 4-5 used');
    assert.deepEqual(pngSize(fileOf(H.spriteOverworld)), [512, 960], 'map sheet: like the heroes');
    assert.ok(fileOf(H.crySound) && fs.existsSync(fileOf(H.crySound)), 'its cry');
});

test('the hawk starts every fight in the air: Airborne casts Take Flight for free, and it flies for 2 turns, then lands', async () => {
    const { createBattleState } = await import('../../shared/battle/battleState.js');
    const { queuePreBattleTraits } = await import('../../shared/battle/battleQueue.js');
    const { StatusEffectDefinitions } = await import('../../shared/abilities/statusEffectDefinitions.js');
    const { StatusEffectModel } = await import('../../shared/abilities/statusEffectModel.js');
    const { gameState } = await import('../../shared/core/gameState.js');
    const flight = AbilityDefinitions.take_flight;
    assert.deepEqual(flight.statusEffects, [{ id: 'flying', chance: 1.0, duration: 2 }], '2 turns, not until knocked down');
    assert.ok(flight.cost.stamina > 0, 'taking off again mid-fight costs stamina');
    const flying = new StatusEffectModel(StatusEffectDefinitions.flying, 2);
    assert.equal(flying.isInfinite, false, 'it runs out');
    gameState.party.members = [EntityFactory.create('HAWK', 5)];
    const state = createBattleState([EntityFactory.create('DOG', 5)], { maxActive: 3 });
    assert.equal(queuePreBattleTraits(state), true);
    const take = state.turnQueue.find(t => t.action && t.action.id === 'take_flight');
    assert.ok(take && take.ignoreCost && take.actor === state.activeParty[0], 'the opening flight is free');
});

test('dogs a little sturdier, snow leopards a little softer', () => {
    const D = ENTITY_DEFINITIONS.DOG, L = ENTITY_DEFINITIONS.SNOW_LEOPARD;
    assert.equal(D.baseStats.maxHp, 7); assert.equal(D.baseStats.baseAttack.slash, 5); assert.equal(D.attributes.vigor, 7);
    assert.equal(L.baseStats.maxHp, 14); assert.equal(L.baseStats.critical, 0.15); assert.equal(L.baseStats.baseAttack.slash, 6);
});
