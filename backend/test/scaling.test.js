// backend/test/scaling.test.js: `npm test`. Each damage type scales with its own attribute (DAMAGE_SCALING in data/constants.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StatCalculator } from '../../shared/systems/statCalculator.js';
import { EntityFactory } from '../../shared/systems/factories/entityFactory.js';
import { DAMAGE_SCALING, DAMAGE_SCALING_MODE, DAMAGE_TYPES } from '../../shared/data/constants.js';

const ELEMENTS = ['fire', 'ice', 'lightning', 'water', 'earth', 'wind'];
const ARCANE = ['light', 'dark', 'arcane'];
const ZERO = { vigor: 0, strength: 0, dexterity: 0, intelligence: 0, attunement: 0 };
const attackOf = (attributes) => StatCalculator.calculate({ level: 1, attributes: { ...ZERO, ...attributes }, baseStats: { maxHp: 10, maxStamina: 10, maxInsight: 10, baseAttack: {} } }).attack;

test('every damage type has a scaling entry, and each point of a stat raises exactly the types it should', () => {
    for (const t of DAMAGE_TYPES) assert.ok(DAMAGE_SCALING[t], `${t} has no scaling`);
    const str = attackOf({ strength: 20 }), dex = attackOf({ dexterity: 20 }), int = attackOf({ intelligence: 20 }), att = attackOf({ attunement: 20 }), vig = attackOf({ vigor: 20 });
    assert.equal(str.blunt, 20);
    assert.equal(dex.pierce, 20);
    assert.equal(str.slash, 20, 'a Strength build slashes as hard as it bludgeons');
    assert.equal(dex.slash, 20, 'a Dexterity build slashes as hard as it pierces');
    for (const t of ELEMENTS) { assert.equal(att[t], 20, `Attunement raises ${t}`); assert.equal(int[t], 0, `Intelligence does not raise ${t}`); assert.equal(str[t] + dex[t], 0); }
    for (const t of ARCANE) { assert.equal(int[t], 20, `Intelligence raises ${t}`); assert.equal(att[t], 0, `Attunement does not raise ${t}`); assert.equal(str[t] + dex[t], 0); }
    for (const t of ['blunt', 'pierce', ...ELEMENTS, ...ARCANE]) assert.equal(vig[t], 0, `Vigor raises no attack (${t})`);
    assert.equal(str.pierce + int.blunt + att.blunt + att.pierce, 0, 'Strength does not raise pierce; nothing else raises blunt');
    assert.equal(dex.blunt, 0);
});

test('slash follows the higher of Strength and Dexterity: never behind the specialist types, never ahead of them', () => {
    assert.equal(DAMAGE_SCALING_MODE.slash, 'highest');
    for (let strength = 0; strength <= 40; strength += 4) {
        for (let dexterity = 0; dexterity <= 40; dexterity += 4) {
            const a = attackOf({ strength, dexterity });
            assert.equal(a.slash, Math.max(a.blunt, a.pierce), `Str ${strength} / Dex ${dexterity}: slash ${a.slash} vs blunt ${a.blunt}, pierce ${a.pierce}`);
        }
    }
});

test('a split build is behind a specialist with the same points (it has to pick a side)', () => {
    for (const points of [10, 20, 40]) {
        const specialist = attackOf({ strength: points });
        const split = attackOf({ strength: points / 2, dexterity: points / 2 });
        assert.equal(specialist.slash, specialist.blunt);
        assert.ok(split.slash < specialist.slash && split.blunt < specialist.blunt && split.pierce < specialist.blunt, `${points} points`);
    }
});

// the starting backgrounds (characterCreatorLogic.js): specialists out-hit everyone else with their own weapon type, and slash starts level with it
const BACKGROUNDS = { Warrior: [13, 15, 9, 7, 6], Thief: [9, 8, 16, 9, 8], Ranger: [10, 9, 15, 8, 8], Scholar: [8, 7, 9, 14, 12], Hermit: [10, 7, 9, 13, 11], Traveler: [11, 11, 10, 9, 9] };
const at = ([vigor, strength, dexterity, intelligence, attunement]) => attackOf({ vigor, strength, dexterity, intelligence, attunement });

test('a Thief or Ranger now hits as hard with a dagger or bow as a Warrior does with a club', () => {
    const warrior = at(BACKGROUNDS.Warrior), thief = at(BACKGROUNDS.Thief), ranger = at(BACKGROUNDS.Ranger);
    assert.ok(thief.pierce >= warrior.blunt - 1, `thief ${thief.pierce} vs warrior ${warrior.blunt}`);
    assert.ok(ranger.pierce >= warrior.blunt - 1, `ranger ${ranger.pierce} vs warrior ${warrior.blunt}`);
    assert.ok(warrior.pierce < thief.pierce && thief.blunt < warrior.blunt, 'each is best with its own weapons');
    for (const [name, a] of [['Warrior', warrior], ['Thief', thief], ['Ranger', ranger]]) {
        const best = Math.max(a.blunt, a.pierce);
        assert.ok(Math.abs(a.slash - best) <= 2, `${name}: slash ${a.slash} starts level with ${best}`);
    }
});

test('a Scholar or Hermit casts with Intelligence for arcane, light and dark, and Attunement for the elements', () => {
    for (const name of ['Scholar', 'Hermit']) {
        const a = at(BACKGROUNDS[name]);
        assert.ok(a.arcane > a.fire, `${name}: arcane ${a.arcane} vs fire ${a.fire}`);
        assert.ok(a.arcane > a.blunt && a.fire > a.blunt, `${name} out-casts out-hits`);
    }
});

// Entities keep the attack they had before the type-based scaling (baseAttack was adjusted per entity): anchors recorded from the old numbers, level 1
test('enemies and recruits hit as hard as they did before the scaling changed', () => {
    const anchors = [['WOLF', 'pierce', 17], ['DOG', 'pierce', 8], ['DUNE_MAW', 'pierce', 20], ['MAD_MAN', 'slash', 10], ['THUNDER_LOCUST', 'lightning', 9],
        ['THUNDER_LOCUST', 'pierce', 6], ['SCORCHED_VAGRANT', 'fire', 20], ['LEGIONARY', 'slash', 14], ['PANZERKAMFER', 'pierce', 24], ['SNOW_LEOPARD', 'slash', 19]];
    for (const [id, type, old] of anchors) {
        const e = EntityFactory.create(id, 1);
        assert.ok(Math.abs(StatCalculator.calculate(e).attack[type] - old) <= 1, `${id} ${type}: ${StatCalculator.calculate(e).attack[type]} (was ${old})`);
    }
});
