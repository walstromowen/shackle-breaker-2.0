// backend/test/scaling.test.js: `npm test`. Strength drives all physical damage, Intelligence all magical damage; Dexterity and Attunement feed the pools (DAMAGE_SCALING in core/constants.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StatCalculator } from '../../shared/characters/statCalculator.js';
import { EntityFactory } from '../../shared/characters/entityFactory.js';
import { DAMAGE_SCALING, DAMAGE_TYPES } from '../../shared/core/constants.js';

const PHYSICAL = ['blunt', 'slash', 'pierce'];
const MAGIC = ['fire', 'ice', 'lightning', 'water', 'earth', 'wind', 'light', 'dark', 'arcane'];
const ZERO = { vigor: 0, strength: 0, dexterity: 0, intelligence: 0, attunement: 0 };
const statsOf = (attributes) => StatCalculator.calculate({ level: 1, attributes: { ...ZERO, ...attributes }, baseStats: { maxHp: 10, maxStamina: 10, maxInsight: 10, baseAttack: {} } });
const attackOf = (attributes) => statsOf(attributes).attack;

test('every damage type has a scaling entry, and only Strength and Intelligence raise attack', () => {
    for (const t of DAMAGE_TYPES) assert.ok(DAMAGE_SCALING[t], `${t} has no scaling`);
    const str = attackOf({ strength: 20 }), int = attackOf({ intelligence: 20 });
    for (const t of PHYSICAL) { assert.equal(str[t], 20, `Strength raises ${t}`); assert.equal(int[t], 0, `Intelligence does not raise ${t}`); }
    for (const t of MAGIC) { assert.equal(int[t], 20, `Intelligence raises ${t}`); assert.equal(str[t], 0, `Strength does not raise ${t}`); }
    for (const attr of ['vigor', 'dexterity', 'attunement']) {
        const a = attackOf({ [attr]: 20 });
        for (const t of DAMAGE_TYPES) assert.equal(a[t], 0, `${attr} raises no attack (${t})`);
    }
});

test('Dexterity and Attunement feed the pools: max, and recovery per round', () => {
    const base = statsOf({}), dex = statsOf({ dexterity: 20 }), att = statsOf({ attunement: 20 });
    assert.equal(dex.maxStamina - base.maxStamina, 40, '+2 max stamina per Dexterity');
    assert.equal(dex.staminaRecovery - base.staminaRecovery, 10, '+0.5 stamina recovery per Dexterity');
    assert.equal(att.maxInsight - base.maxInsight, 40, '+2 max insight per Attunement');
    assert.equal(att.insightRecovery - base.insightRecovery, 10, '+0.5 insight recovery per Attunement');
    for (const stat of [statsOf({ strength: 20 }), statsOf({ intelligence: 20 })]) {
        assert.equal(stat.maxStamina, base.maxStamina); assert.equal(stat.maxInsight, base.maxInsight);
        assert.equal(stat.staminaRecovery, base.staminaRecovery); assert.equal(stat.insightRecovery, base.insightRecovery);
    }
});

// the starting backgrounds (characterCreatorLogic.js): [vigor, strength, dexterity, intelligence, attunement]
const BACKGROUNDS = { Warrior: [13, 15, 9, 7, 6], Thief: [9, 8, 16, 9, 8], Ranger: [10, 9, 15, 8, 8], Scholar: [8, 7, 9, 14, 12], Hermit: [10, 7, 9, 13, 11], Traveler: [11, 11, 10, 9, 9] };
const at = ([vigor, strength, dexterity, intelligence, attunement]) => attackOf({ vigor, strength, dexterity, intelligence, attunement });

test('every physical type hits with Strength alone, and every magic type with Intelligence alone', () => {
    const warrior = at(BACKGROUNDS.Warrior), scholar = at(BACKGROUNDS.Scholar);
    for (const t of PHYSICAL) assert.equal(warrior[t], 15, `Warrior ${t}`);
    for (const t of MAGIC) assert.equal(scholar[t], 14, `Scholar ${t}`);
    assert.ok(warrior.blunt > scholar.blunt && scholar.arcane > warrior.arcane);
});

// Entities keep the attack they had before the 5da4655 experiment (baseAttack is back to the original numbers): anchors recorded from them, level 1
test('enemies and recruits hit as hard as they always did', () => {
    const anchors = [['WOLF', 'pierce', 17], ['DOG', 'pierce', 8], ['DUNE_MAW', 'pierce', 20], ['MAD_MAN', 'slash', 10], ['THUNDER_LOCUST', 'lightning', 9],
        ['THUNDER_LOCUST', 'pierce', 6], ['SCORCHED_VAGRANT', 'fire', 20], ['LEGIONARY', 'slash', 14], ['PANZERKAMFER', 'pierce', 24], ['SNOW_LEOPARD', 'slash', 19]];
    for (const [id, type, old] of anchors) {
        const e = EntityFactory.create(id, 1);
        assert.ok(Math.abs(StatCalculator.calculate(e).attack[type] - old) <= 1, `${id} ${type}: ${StatCalculator.calculate(e).attack[type]} (was ${old})`);
    }
});

test('leather armor gives a little stamina recovery, cloth armor a little insight recovery', async () => {
    const { ItemFactory } = await import('../../shared/items/itemFactory.js');
    const wear = (ids) => {
        const equipment = {};
        for (const id of ids) { const item = ItemFactory.createItem(id); equipment[item.slot] = item; }
        return StatCalculator.calculate({ level: 1, attributes: { ...ZERO }, equipment, baseStats: { maxHp: 10, maxStamina: 10, maxInsight: 10, baseAttack: {} } });
    };
    const naked = wear([]);
    const leather = ['leather_helmet', 'leather_armor', 'leather_bracers', 'leather_leggings', 'leather_boots'];
    const cloth = ['cloth_hood', 'cloth_robe', 'cloth_gloves', 'cloth_pants', 'cloth_shoes'];
    for (const id of leather) {
        const s = wear([id]);
        assert.equal(s.staminaRecovery - naked.staminaRecovery, 1, `${id} adds 1 stamina recovery`);
        assert.equal(s.insightRecovery, naked.insightRecovery, `${id} adds no insight recovery`);
    }
    for (const id of cloth) {
        const s = wear([id]);
        assert.equal(s.insightRecovery - naked.insightRecovery, 1, `${id} adds 1 insight recovery`);
        assert.equal(s.staminaRecovery, naked.staminaRecovery, `${id} adds no stamina recovery`);
    }
    assert.equal(wear(leather).staminaRecovery - naked.staminaRecovery, 5, 'a whole leather set adds up');
    assert.equal(wear(cloth).insightRecovery - naked.insightRecovery, 5, 'a whole cloth set adds up');
});
