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
        for (const t of DAMAGE_TYPES) {
            const feeds = types.includes(t);
            assert.equal(s.attack[t], feeds ? 20 : 0, `${attr} -> ${t} attack`);
            assert.equal(s.defense[t] - base.defense[t], feeds ? 10 : 0, `${attr} -> ${t} defense (Vigor gives none: it is health)`);
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

test('pools and recovery: Dexterity and Strength feed stamina, Attunement and Intelligence feed insight', () => {
    const base = statsOf({});
    for (const attr of ['dexterity', 'strength']) {
        const s = statsOf({ [attr]: 20 });
        assert.equal(s.maxStamina - base.maxStamina, 40, `+2 max stamina per ${attr}`);
        assert.equal(s.staminaRecovery - base.staminaRecovery, 5, `+0.25 stamina recovery per ${attr}`);
        assert.equal(s.maxInsight, base.maxInsight); assert.equal(s.insightRecovery, base.insightRecovery);
    }
    for (const attr of ['attunement', 'intelligence']) {
        const s = statsOf({ [attr]: 20 });
        assert.equal(s.maxInsight - base.maxInsight, 40, `+2 max insight per ${attr}`);
        assert.equal(s.insightRecovery - base.insightRecovery, 5, `+0.25 insight recovery per ${attr}`);
        assert.equal(s.maxStamina, base.maxStamina); assert.equal(s.staminaRecovery, base.staminaRecovery);
    }
    assert.equal(statsOf({ dexterity: 10, strength: 10 }).maxStamina - base.maxStamina, 40, 'both add up');
    assert.equal(statsOf({ vigor: 20 }).maxStamina, base.maxStamina, 'Vigor feeds no pool');
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

// Enemies play by the enemy rules (Strength for physical, Intelligence for magic: ENEMY_DAMAGE_SCALING), so they keep the attack they were balanced
// with: anchors recorded from them, level 1 (the Legionary's is the one change: trained soldiers got +3 on every physical attack, 14 -> 17, when enemies
// were made hit harder). Under the player's hybrid rules the agile ones would hit far harder (a Thunder Locust's lightning 9 -> 21).
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
    assert.equal(wolf9.state.levelEdgeAttr.attribute, 'strength', 'under the enemy rules a bite (pierce) scales with Strength');
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

// ---- weapon attribute requirements ----
test('weapon requirements rise with the upgrade level, and every starting background meets its own weapon', async () => {
    const { requirementsAt, unmetRequirements } = await import('../../shared/items/weaponRequirements.js');
    const { ItemDefinitions } = await import('../../shared/items/itemDefinitions.js');
    assert.deepEqual(requirementsAt('shortsword', 1), { strength: 8, dexterity: 8 });
    assert.deepEqual(requirementsAt('shortsword', 3), { strength: 12, dexterity: 12 });
    assert.deepEqual(requirementsAt('shortsword', 99), requirementsAt('shortsword', 5), 'never past the max level');
    for (const [id, def] of Object.entries(ItemDefinitions)) {
        if (def.type !== 'weapon') continue;
        assert.ok(def.requirements && Object.keys(def.requirements).length > 0, `${id} has requirements`);
        if ((def.maxLevel || 1) > 1) assert.ok(Object.keys(def.requirementGrowth || {}).length >= 2, `${id} asks for two attributes as it grows`);
    }
    // characterCreatorLogic.js: [vigor, strength, dexterity, intelligence, attunement] and the weapon each starts with
    const STARTS = { Traveler: [[11, 11, 10, 9, 9], 'shortsword'], Blacksmith: [[15, 13, 8, 7, 7], 'shortsword'], Ranger: [[10, 9, 15, 8, 8], 'shortbow'],
        Scholar: [[8, 7, 9, 14, 12], 'insight_of_arcane'], Warrior: [[13, 15, 9, 7, 6], 'handaxe'], Thief: [[9, 8, 16, 9, 8], 'dagger'],
        Hermit: [[10, 7, 9, 13, 11], 'insight_of_earth'], Farmer: [[15, 12, 9, 7, 7], 'scythe'], BountyHunter: [[12, 11, 14, 7, 6], 'shortsword'] };
    for (const [name, [[vigor, strength, dexterity, intelligence, attunement], weapon]] of Object.entries(STARTS)) {
        const unmet = unmetRequirements(requirementsAt(weapon, 1), { vigor, strength, dexterity, intelligence, attunement });
        assert.deepEqual(unmet, [], `${name} can use the ${weapon} they start with`);
        assert.deepEqual(unmetRequirements(requirementsAt('pickaxe', 1), { vigor, strength }), [], `${name} can use the miner's pickaxe`);
    }
});

test('a weapon whose requirements are not met hits for less in its own damage types only', async () => {
    const { ItemFactory } = await import('../../shared/items/itemFactory.js');
    const { UNMET_REQUIREMENT_DAMAGE_SCALE } = await import('../../shared/items/weaponRequirements.js');
    const sword = (level) => { const s = ItemFactory.createItem('shortsword'); s.level = level; return s; };
    const wield = (attributes, item) => StatCalculator.calculateDetailed({ level: 1, attributes: { ...ZERO, ...attributes }, equipment: { mainHand: item }, baseStats: { maxHp: 10, baseAttack: {} } });
    const ok = wield({ strength: 12, dexterity: 12 }, sword(3));
    assert.equal(ok.unmetRequirements.length, 0);
    assert.equal(ok.attack.slash, 12 + 3 + 2 * 2, 'attribute + the sword at level 3');
    const weak = wield({ strength: 12, dexterity: 11 }, sword(3));
    assert.equal(weak.unmetRequirements.length, 1);
    assert.deepEqual(weak.unmetRequirements[0].unmet, [{ attr: 'dexterity', need: 12, have: 11 }]);
    assert.equal(weak.attack.slash, Math.round((12 + 7) * UNMET_REQUIREMENT_DAMAGE_SCALE));
    assert.equal(weak.attack.blunt, 12, 'blunt is not one of the sword\'s types, so it is untouched');
    assert.equal(weak.attack.fire, 0);
});

test('a level 1 Traveler kills a level 1 Madman in 2 to 3 Slashes', async () => {
    const { ItemFactory } = await import('../../shared/items/itemFactory.js');
    const { CombatCalculator } = await import('../../shared/battle/combatCalculator.js');
    const gear = { mainHand: 'shortsword', head: 'tattered_hood', arms: 'tattered_gloves', torso: 'tattered_shirt', legs: 'tattered_pants', feet: 'tattered_boots' };
    const equipment = {};
    for (const [slot, id] of Object.entries(gear)) equipment[slot] = ItemFactory.createItem(id);
    const traveler = EntityFactory.create('HUMANOID', { attributes: { vigor: 11, strength: 11, dexterity: 10, intelligence: 9, attunement: 9 }, equipment, level: 1, traits: [] });
    const madman = EntityFactory.create('MAD_MAN', 1);
    const att = { stats: StatCalculator.calculate(traveler) }, def = { stats: StatCalculator.calculate(madman) };
    const quiet = console.log; console.log = () => {};
    const real = Math.random;
    let seed = 7; Math.random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const counts = [];
    try {
        for (let fight = 0; fight < 400; fight++) {
            let hp = def.stats.maxHp, landed = 0;
            for (let swing = 0; hp > 0 && swing < 50; swing++) {   // misses do not count: only Slashes that land
                const r = CombatCalculator.calculateDamage(att, def, 1.25, 'slash', 1.0);
                if (r.hit) { hp -= r.damage; landed++; }
            }
            counts.push(landed);
        }
    } finally { Math.random = real; console.log = quiet; }
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
    assert.ok(avg >= 2 && avg <= 3, `average ${avg.toFixed(2)} Slashes`);
    assert.ok(counts.every(n => n >= 2 && n <= 3), `always 2 or 3 landed Slashes (${Math.min(...counts)}-${Math.max(...counts)})`);
});

test('enemies use the enemy rules, the player the hybrid ones', () => {
    const wolf = EntityFactory.create('WOLF', 1);
    assert.equal(StatCalculator.usesEnemyScaling(wolf), true);
    const hero = EntityFactory.create('HUMANOID', { attributes: { vigor: 10, strength: 10, dexterity: 10, intelligence: 10, attunement: 10 }, level: 1 });
    assert.equal(StatCalculator.usesEnemyScaling(hero), false, 'the player is a HUMANOID');
    assert.equal(StatCalculator.usesEnemyScaling({ attributes: {} }), false, 'a plain stat object uses the player rules');
    // the same attributes, both rule sets
    const attrs = { vigor: 10, strength: 4, dexterity: 20, intelligence: 6, attunement: 16 };
    const asEnemy = StatCalculator.calculate({ templateId: 'WOLF', level: 1, attributes: attrs, baseStats: { maxHp: 10, baseAttack: {} } });
    const asPlayer = StatCalculator.calculate({ templateId: 'HUMANOID', level: 1, attributes: attrs, baseStats: { maxHp: 10, baseAttack: {} } });
    assert.equal(asEnemy.attack.pierce, 4, 'enemy pierce follows Strength');
    assert.equal(asPlayer.attack.pierce, 20, 'player pierce follows Dexterity');
    assert.equal(asEnemy.attack.fire, 6, 'enemy fire follows Intelligence');
    assert.equal(asPlayer.attack.fire, 16, 'player fire follows Attunement');
    assert.equal(asEnemy.defense.blunt, 5, 'enemy defense: +1 per 2 Vigor');
});

test('enemies deal ENEMY_DAMAGE_SCALE of the damage; the party is not scaled by it', async () => {
    const { CombatCalculator, ENEMY_DAMAGE_SCALE } = await import('../../shared/battle/combatCalculator.js');
    assert.ok(ENEMY_DAMAGE_SCALE > 0 && ENEMY_DAMAGE_SCALE < 1);
    const stats = { attack: { blunt: 100 }, defense: { blunt: 0 }, resistance: { blunt: 0 }, accuracy: 1000, evasion: 1, critChance: 0 };
    const hit = (team) => {
        const real = Math.random, log = console.log;
        Math.random = () => 0.5; console.log = () => {};
        try { return CombatCalculator.calculateDamage({ team, stats }, { stats }, 1, 'blunt', 1).damage; } finally { Math.random = real; console.log = log; }
    };
    const party = hit('party'), enemy = hit('enemy');
    assert.ok(Math.abs(enemy / party - ENEMY_DAMAGE_SCALE) < 0.02, `enemy ${enemy} vs party ${party}`);
});
