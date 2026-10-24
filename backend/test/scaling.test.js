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
// (the Legionary's is the one change: trained soldiers got +3 on every physical attack, 14 -> 17, when enemies were made hit harder)
test('enemies and recruits hit as hard as they always did', () => {
    const anchors = [['WOLF', 'pierce', 17], ['DOG', 'pierce', 8], ['DUNE_MAW', 'pierce', 20], ['MAD_MAN', 'slash', 10], ['THUNDER_LOCUST', 'lightning', 9],
        ['THUNDER_LOCUST', 'pierce', 6], ['SCORCHED_VAGRANT', 'fire', 20], ['LEGIONARY', 'slash', 17], ['PANZERKAMFER', 'pierce', 24], ['SNOW_LEOPARD', 'slash', 19]];
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
    // the torso gives the most, the limbs a little, the helmet and boots none (the numbers are in itemDefinitions)
    const { ItemDefinitions } = await import('../../shared/items/itemDefinitions.js');
    for (const id of leather) {
        const s = wear([id]);
        assert.equal(s.staminaRecovery - naked.staminaRecovery, ItemDefinitions[id].resources?.staminaRecovery || 0, `${id} adds its stamina recovery`);
        assert.equal(s.insightRecovery, naked.insightRecovery, `${id} adds no insight recovery`);
    }
    for (const id of cloth) {
        const s = wear([id]);
        assert.equal(s.insightRecovery - naked.insightRecovery, ItemDefinitions[id].resources?.insightRecovery || 0, `${id} adds its insight recovery`);
        assert.equal(s.staminaRecovery, naked.staminaRecovery, `${id} adds no stamina recovery`);
    }
    assert.equal(wear(leather).staminaRecovery - naked.staminaRecovery, 4, 'a whole leather set adds up');
    assert.equal(wear(cloth).insightRecovery - naked.insightRecovery, 4, 'a whole cloth set adds up');
});

// ---- enemies keep up with armor: the level edge, the damage floor ----
test('an enemy gains attack with its level in the attribute its best attack scales with, a recruit does not keep it, and an ally never gets it', () => {
    const atk = (e, t) => StatCalculator.calculate(e).attack[t];
    const wolf1 = EntityFactory.create('WOLF', 1), wolf9 = EntityFactory.create('WOLF', 9);
    assert.equal(wolf9.state.levelEdgeAttr.attribute, 'strength');
    assert.equal(wolf9.state.levelEdgeAttr.amount, 12, '8 levels x 1.5');
    assert.ok(atk(wolf9, 'pierce') - atk(wolf1, 'pierce') >= 12, 'at least the edge, plus the one point per level spread over the attributes');
    const addict9 = EntityFactory.create('MAGIC_ADDICT', 9);
    assert.equal(addict9.state.levelEdgeAttr.attribute, 'intelligence', 'a mage grows in the attribute its spells scale with');
    assert.equal(EntityFactory.create('WOLF', 1).state.levelEdgeAttr, undefined, 'level 1 gets nothing');

    const ally = EntityFactory.create('LEGIONARY_COMPANION', 9, { levelEdge: false });
    assert.equal(ally.state.levelEdgeAttr, undefined, 'an ally is built like a player');

    const before = atk(wolf9, 'pierce');
    assert.equal(EntityFactory.removeLevelEdge(wolf9), true);
    assert.equal(atk(wolf9, 'pierce'), before - 12);
    assert.equal(EntityFactory.removeLevelEdge(wolf9), false, 'taking it off twice is harmless');
});

test('armor can blunt a hit but never cancel it: a hit does at least 10% of its damage, and a resisted one 10% of what is left', async () => {
    const { CombatCalculator } = await import('../../shared/battle/combatCalculator.js');
    assert.equal(CombatCalculator.calculateMitigatedDamage(30, 40, 0, false), 3);
    assert.equal(CombatCalculator.calculateMitigatedDamage(30, 40, 0.5, false), 1, '10% of 15 is 1.5: whole numbers only');
    assert.equal(CombatCalculator.calculateMitigatedDamage(5, 99, 0, false), 1);
    assert.equal(CombatCalculator.calculateMitigatedDamage(20, 5, 0, false), 15, 'an ordinary hit is unchanged');
});

// ---- the XP curve: act 2 at about level 20, the last level at 150 ----
test('XP: what an enemy is worth is close to the straight line the curve is built on, at every level', async () => {
    const { BattleRewardSystem } = await import('../../shared/battle/battleRewardSystem.js');
    const { ExperienceSystem } = await import('../../shared/characters/experienceSystem.js');
    for (const id of ['WOLF', 'ROTTER', 'LEGIONARY', 'MAGIC_ADDICT', 'SKELETAL_WARRIOR']) {
        for (const level of [1, 5, 10, 20, 50, 100, 150]) {
            const e = EntityFactory.create(id, level);
            const stats = StatCalculator.calculate(e);
            const real = BattleRewardSystem._calculateEnemyXp({ originalEntity: e, maxHp: stats.maxHp, stats });
            const fit = ExperienceSystem.enemyXp(level);
            assert.ok(Math.abs(real - fit) / fit <= 0.35, `${id} L${level}: worth ${real}, the curve assumes ${fit}`);
        }
    }
});

test('XP: a level takes about 2 fights at the start and 6 at the end; level 20 comes after about 50 fights, level 150 after about 600', async () => {
    const { ExperienceSystem, XP_CURVE, MAX_LEVEL } = await import('../../shared/characters/experienceSystem.js');
    assert.equal(MAX_LEVEL, 150);
    let fights = 0, at20 = 0;
    for (let level = 1; level < MAX_LEVEL; level++) {
        const perFight = ExperienceSystem.enemyXp(level) * XP_CURVE.ENEMIES_PER_FIGHT;
        const need = ExperienceSystem.getMaxXP(level);
        assert.ok(need > (level > 1 ? ExperienceSystem.getMaxXP(level - 1) : 0), `level ${level} takes more XP than the one before`);
        fights += need / perFight;
        if (level === 19) at20 = fights;
    }
    assert.ok(at20 >= 40 && at20 <= 65, `level 20 after ${at20.toFixed(0)} fights`);
    assert.ok(fights >= 450 && fights <= 750, `level 150 after ${fights.toFixed(0)} fights`);
    assert.ok(Math.abs(ExperienceSystem.getMaxXP(1) / (ExperienceSystem.enemyXp(1) * 2) - 2) < 0.05);
});

test('XP: a reward written for the early game grows with the level, an old save adopts the new curve, and nobody passes level 150', async () => {
    const { ExperienceSystem } = await import('../../shared/characters/experienceSystem.js');
    assert.equal(ExperienceSystem.scaleReward(10, 1), 10);
    assert.ok(ExperienceSystem.scaleReward(10, 20) > 60 && ExperienceSystem.scaleReward(10, 20) < 80);
    const old = { level: 5, xp: 0, maxXp: 99999, skillPoints: 0, baseStats: { maxHp: 10 } };
    ExperienceSystem.addXp(old, 1);
    assert.equal(old.maxXp, ExperienceSystem.getMaxXP(5), 'the stale maxXp of an old save is replaced');
    const top = { level: 150, xp: 0, maxXp: 1, skillPoints: 0, baseStats: { maxHp: 10 } };
    ExperienceSystem.addXp(top, 10 ** 9);
    assert.equal(top.level, 150);
});
