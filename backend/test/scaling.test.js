// backend/test/scaling.test.js: `npm test`. Strength: blunt and slash; Dexterity: slash and pierce (slash takes the higher of the two); Attunement: the six
// elements; Intelligence: light, dark and arcane. The same attributes raise the matching defenses. Stamina recovery follows Dexterity and Strength, insight
// recovery Intelligence and Attunement (DAMAGE_SCALING in core/constants.js, StatCalculator).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StatCalculator } from '../../shared/characters/statCalculator.js';
import { EntityFactory } from '../../shared/characters/entityFactory.js';
import { DAMAGE_SCALING, DAMAGE_TYPES } from '../../shared/core/constants.js';

const ELEMENTS = ['fire', 'ice', 'lightning', 'water', 'earth', 'wind'];
const ARCANE = ['light', 'dark', 'arcane'];
const FEEDS = { strength: ['blunt', 'slash'], dexterity: ['slash', 'pierce'], attunement: ELEMENTS, intelligence: ARCANE, vigor: [] };
const ZERO = { vigor: 0, strength: 0, dexterity: 0, intelligence: 0, attunement: 0 };
const statsOf = (attributes) => StatCalculator.calculate({ level: 1, attributes: { ...ZERO, ...attributes }, baseStats: { maxHp: 10, maxStamina: 10, maxInsight: 10, baseAttack: {} } });
const attackOf = (attributes) => statsOf(attributes).attack;

test('every damage type has a scaling entry, and each attribute raises exactly its own attack and defense types', () => {
    for (const t of DAMAGE_TYPES) assert.ok(DAMAGE_SCALING[t], `${t} has no scaling`);
    const base = statsOf({});
    for (const [attr, types] of Object.entries(FEEDS)) {
        const s = statsOf({ [attr]: 20 });
        const vigorDef = attr === 'vigor' ? 10 : 0;   // Vigor still gives +1 defense per 2 points against everything
        for (const t of DAMAGE_TYPES) {
            const feeds = types.includes(t);
            assert.equal(s.attack[t], feeds ? 20 : 0, `${attr} -> ${t} attack`);
            assert.equal(s.defense[t] - base.defense[t], (feeds ? 10 : 0) + vigorDef, `${attr} -> ${t} defense`);
        }
    }
});

test('slash scales with the higher of Strength or Dexterity, never both', () => {
    assert.equal(attackOf({ strength: 12, dexterity: 7 }).slash, 12);
    assert.equal(attackOf({ strength: 7, dexterity: 12 }).slash, 12);
    assert.equal(attackOf({ strength: 10, dexterity: 10 }).slash, 10);
    const base = statsOf({});
    assert.equal(statsOf({ strength: 10, dexterity: 20 }).defense.slash - base.defense.slash, 10, 'slash defense also takes the higher one');
});

test('Vigor gives +3 max HP per point to a new character', () => {
    assert.equal(statsOf({ vigor: 20 }).maxHp - statsOf({}).maxHp, 60);
});

test('pools and recovery: Dexterity feeds max stamina, Attunement max insight; recovery follows two attributes each', () => {
    const base = statsOf({}), dex = statsOf({ dexterity: 20 }), str = statsOf({ strength: 20 }), att = statsOf({ attunement: 20 }), int = statsOf({ intelligence: 20 });
    assert.equal(dex.maxStamina - base.maxStamina, 40, '+2 max stamina per Dexterity');
    assert.equal(att.maxInsight - base.maxInsight, 40, '+2 max insight per Attunement');
    assert.equal(str.maxStamina, base.maxStamina, 'Strength adds no max stamina');
    assert.equal(int.maxInsight, base.maxInsight, 'Intelligence adds no max insight');
    for (const s of [dex, str]) { assert.equal(s.staminaRecovery - base.staminaRecovery, 10, '+0.5 stamina recovery per Dexterity / Strength'); assert.equal(s.insightRecovery, base.insightRecovery); }
    for (const s of [att, int]) { assert.equal(s.insightRecovery - base.insightRecovery, 10, '+0.5 insight recovery per Attunement / Intelligence'); assert.equal(s.staminaRecovery, base.staminaRecovery); }
    assert.equal(statsOf({ dexterity: 10, strength: 10 }).staminaRecovery - base.staminaRecovery, 10, 'both add up');
});

// the starting backgrounds (characterCreatorLogic.js): [vigor, strength, dexterity, intelligence, attunement]
const BACKGROUNDS = { Warrior: [13, 15, 9, 7, 6], Thief: [9, 8, 16, 9, 8], Ranger: [10, 9, 15, 8, 8], Scholar: [8, 7, 9, 14, 12], Hermit: [10, 7, 9, 13, 11], Traveler: [11, 11, 10, 9, 9] };
const at = ([vigor, strength, dexterity, intelligence, attunement]) => attackOf({ vigor, strength, dexterity, intelligence, attunement });

test('the backgrounds hit hardest with the types their best attributes feed', () => {
    const warrior = at(BACKGROUNDS.Warrior), thief = at(BACKGROUNDS.Thief), scholar = at(BACKGROUNDS.Scholar);
    assert.equal(warrior.blunt, 15); assert.equal(warrior.slash, 15); assert.equal(warrior.pierce, 9);
    assert.equal(thief.pierce, 16); assert.equal(thief.slash, 16); assert.equal(thief.blunt, 8);
    for (const t of ARCANE) assert.equal(scholar[t], 14, `Scholar ${t}`);
    for (const t of ELEMENTS) assert.equal(scholar[t], 12, `Scholar ${t}`);
});

// Anchors recorded at level 1 after the stat rework (pierce follows Dexterity, the elements Attunement, slash the higher of Strength or Dexterity).
// Before it: WOLF pierce 17, DOG 8, DUNE_MAW 20, THUNDER_LOCUST lightning 9 / pierce 6, SCORCHED_VAGRANT fire 20, PANZERKAMFER pierce 24, SNOW_LEOPARD slash 19.
test('enemies and recruits hit as hard as the balance expects', () => {
    const anchors = [['WOLF', 'pierce', 23], ['DOG', 'pierce', 14], ['DUNE_MAW', 'pierce', 10], ['MAD_MAN', 'slash', 10], ['THUNDER_LOCUST', 'lightning', 21],
        ['THUNDER_LOCUST', 'pierce', 20], ['SCORCHED_VAGRANT', 'fire', 18], ['LEGIONARY', 'slash', 17], ['PANZERKAMFER', 'pierce', 14], ['SNOW_LEOPARD', 'slash', 23]];
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
    assert.equal(wolf9.state.levelEdgeAttr.attribute, 'dexterity', 'a wolf bites (pierce), so it grows in Dexterity');
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
