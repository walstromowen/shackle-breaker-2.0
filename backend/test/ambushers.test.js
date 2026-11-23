// backend/test/ambushers.test.js: `npm test`. Quick, bloody ambushes: madmen grab a weapon (armedWith), every enemy's weapon grows with its level
// (battle/enemyArms.js, the same curve as a player's), an unarmed humanoid's nails and teeth harden instead; and the loot: copper and small keys
// common in crates and barrels, no common crafting materials from any encounter or chest.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EntityFactory } from '../../shared/characters/entityFactory.js';
import { ENTITY_DEFINITIONS as E } from '../../shared/characters/entityDefinitions.js';
import { CombatantModel } from '../../shared/battle/combatantModel.js';
import { AbilitySystem } from '../../shared/abilities/abilitySystem.js';
import { ItemFactory } from '../../shared/items/itemFactory.js';
import { ItemDefinitions } from '../../shared/items/itemDefinitions.js';
import { LootTableDefinitions as L, LootExclusionSets } from '../../shared/items/lootTableDefinitions.js';
import { LootTableFactory } from '../../shared/items/lootTableFactory.js';
import { forgeEnemyWeapons, weaponLevelFor, WEAPON_DUE } from '../../shared/battle/enemyArms.js';
import fs from 'node:fs';
import { seedRandom, unseedRandom } from '../../shared/core/random.js';
import { StatusEffectFactory } from '../../shared/abilities/statusEffectFactory.js';

const quiet = (fn) => { const l = console.log, w = console.warn, e = console.error; console.log = console.warn = console.error = () => {}; try { return fn(); } finally { console.log = l; console.warn = w; console.error = e; } };
const makeItem = (id, level) => ItemFactory.createItem(id, { level: Math.min(ItemDefinitions[id].maxLevel || 1, level) });
const weaponOf = (e) => { const m = e.state.equipment.mainHand; return m && (typeof m === 'string' ? m : m.defId); };

test('a madman grabs one of his weapons (different madmen, different weapons), and no longer bites for 1', () => {
    assert.deepEqual(E.MAD_MAN.armedWith.sort(), ['dagger', 'handaxe', 'scythe', 'wooden_club']);
    assert.ok(!E.MAD_MAN.abilities.includes('bite') && !E.MAD_MAN.abilities.includes('claw'));
    const seen = new Set();
    for (let i = 0; i < 80; i++) seen.add(weaponOf(quiet(() => EntityFactory.create('MAD_MAN', 3))));
    assert.deepEqual([...seen].sort(), ['dagger', 'handaxe', 'scythe', 'wooden_club']);
    assert.equal(weaponOf(quiet(() => EntityFactory.create('MAD_MAN', { level: 3, equipment: { mainHand: 'spear' } }))), 'spear', 'a weapon handed to him is kept');
});

test('an enemy\'s weapon grows with it on the players\' curve; armour stays; a boss is left as made', () => {
    assert.deepEqual(WEAPON_DUE, [1, 4, 9, 15, 22]);
    assert.deepEqual([1, 3, 4, 8, 9, 14, 15, 22, 40].map(weaponLevelFor), [1, 1, 2, 2, 3, 3, 4, 5, 5]);
    const leg = quiet(() => EntityFactory.create('LEGIONARY', 10));
    const armour = Object.entries(leg.state.equipment).filter(([, v]) => v && !ItemDefinitions[typeof v === 'string' ? v : v.defId].attack);
    forgeEnemyWeapons(leg, makeItem, ItemDefinitions);
    const w = leg.state.equipment.mainHand;
    assert.equal(w.level, 3, 'a level 10 legionary carries a level 3 weapon');
    for (const [slot, v] of armour) assert.equal(leg.state.equipment[slot], v, `${slot} as made`);
    const darius = quiet(() => EntityFactory.create('DARIUS_THE_GROVELER', 15));
    assert.equal(forgeEnemyWeapons(darius, makeItem, ItemDefinitions), 0);
    // the battle builds them so (SceneManager), before the acts and Dolos have their say
    const sm = fs.readFileSync(new URL('../../frontend/src/engine/sceneManager.js', import.meta.url), 'utf8');
    assert.ok(sm.indexOf('forgeEnemyWeapons(enemyEntity') > 0 && sm.indexOf('forgeEnemyWeapons(enemyEntity') < sm.indexOf('ActSystem.boostEnemy(enemyEntity'));
});

test('natural weapons: a fighter with no weapon slot grows as if it carried one upgraded on the curve, from its level, for enemy and recruit alike', async () => {
    const { naturalAttackBonus, naturalUpgradesAt, fightsNaturally } = await import('../../shared/battle/enemyArms.js');
    const { ATTACK_PER_UPGRADE: NATURAL_PER_WEAPON_LEVEL } = await import('../../shared/characters/naturalPackages.js');
    const { StatCalculator } = await import('../../shared/characters/statCalculator.js');
    assert.deepEqual([1, 4, 9, 15, 22, 40].map(naturalUpgradesAt), [0, 1, 2, 3, 4, 4], 'the weapon levels a character of that level would have');
    assert.ok(naturalUpgradesAt(6) > 1 && naturalUpgradesAt(6) < 2, 'smooth between them');
    assert.equal(naturalAttackBonus(22), 4 * NATURAL_PER_WEAPON_LEVEL);
    const hawk = quiet(() => EntityFactory.create('HAWK', 16)), rotter = quiet(() => EntityFactory.create('ROTTER', 16));
    const madman = quiet(() => EntityFactory.create('MAD_MAN', 16)), hero = quiet(() => EntityFactory.create('HUMANOID', { level: 16 }));
    assert.ok(fightsNaturally(hawk) && fightsNaturally(rotter), 'a beast, and the rotter: each has a natural package');
    assert.ok(!fightsNaturally(madman) && !fightsNaturally(hero), 'one who can hold a weapon grows by it instead');
    assert.ok(!fightsNaturally(quiet(() => EntityFactory.create('DRY_KRAKEN_TENTACLE', 20))) && !fightsNaturally(quiet(() => EntityFactory.create('DRY_KRAKEN', 20))), 'a boss and its limbs as tuned');
    // nothing stored: worked out from the level each time, so a recruit keeps pace as it levels and recruiting has nothing to undo
    const at = (lvl) => StatCalculator.calculate(quiet(() => EntityFactory.create('HAWK', { level: lvl, levelEdge: false }))).attack.pierce;
    assert.ok(at(22) - at(1) >= 4 * NATURAL_PER_WEAPON_LEVEL, 'a hawk of 22 bites far harder than one of 1');
    const recruit = quiet(() => EntityFactory.create('HAWK', 16)); EntityFactory.removeLevelEdge(recruit);
    assert.equal(JSON.stringify(recruit.state.baseStats.baseAttack), JSON.stringify(E.HAWK.baseStats.baseAttack), 'its base attack is untouched');
    assert.equal(forgeEnemyWeapons(rotter, makeItem, ItemDefinitions), 0, 'no weapon to forge, nothing stored');
});

test('a recruited hawk or dog keeps up with a player of its level (their plain attacks, against the same foe)', () => {
    seedRandom(20240611);   // the same dice every run: a comparison, not a gamble
    try {
    const avg = (who, ab, lvl) => {
        let d = 0;
        for (let i = 0; i < 60; i++) {
            const t = quiet(() => new CombatantModel(EntityFactory.create('LEGIONARY', lvl), 'enemy')); const h0 = t.hp;
            who.state.statusEffects = [];
            quiet(() => AbilitySystem.execute(ab, quiet(() => new CombatantModel(who, 'party')), t)); d += h0 - t.hp;
        }
        return d / 60;
    };
    for (const lvl of [6, 16, 22]) {
        const pts = lvl - 1;
        const player = quiet(() => EntityFactory.create('HUMANOID', { level: lvl, levelEdge: false, attributes: { vigor: 11 + Math.floor(pts * 0.3), strength: 11 + Math.ceil(pts * 0.5), dexterity: 10 + Math.floor(pts * 0.2), intelligence: 9, attunement: 9 }, equipment: { mainHand: makeItem('shortsword', weaponLevelFor(lvl)) } }));
        const hawk = quiet(() => EntityFactory.create('HAWK', lvl)); EntityFactory.removeLevelEdge(hawk);
        const dog = quiet(() => EntityFactory.create('DOG', lvl)); EntityFactory.removeLevelEdge(dog);
        const p = avg(player, 'thrust', lvl), h = avg(hawk, 'talon_strike', lvl), g = avg(dog, 'bite', lvl);
        assert.ok(h >= p * 0.85 && g >= p * 0.85, `L${lvl}: hawk ${h.toFixed(0)}, dog ${g.toFixed(0)} against the player's thrust ${p.toFixed(0)}`);
        assert.ok(h <= p * 1.8 && g <= p * 1.8, `L${lvl}: not far beyond it either (hawk ${h.toFixed(0)}, dog ${g.toFixed(0)}, player ${p.toFixed(0)})`);
    }
    } finally { unseedRandom(); }
});

test('ambushes hurt both ways: madmen and rotters land real blows on a fair player at every stage, and fall in a few', () => {
    for (const [lvl, gear] of [[3, 1], [6, 2], [10, 3], [16, 4]]) {
        const hero = quiet(() => EntityFactory.create('HUMANOID', { level: lvl, levelEdge: false, attributes: { vigor: 10 + lvl, strength: 10 + (lvl >> 1), dexterity: 10 + (lvl >> 1), intelligence: 10, attunement: 10 },
            equipment: { mainHand: makeItem('shortsword', gear), torso: makeItem('leather_armor', gear), head: makeItem('leather_helmet', gear), legs: makeItem('leather_leggings', gear) } }));
        for (const id of ['MAD_MAN', 'ROTTER']) {
            let dealt = 0, hits = 0, slashes = 0;
            for (let i = 0; i < 40; i++) {
                const e = quiet(() => EntityFactory.create(id, lvl));
                forgeEnemyWeapons(e, makeItem, ItemDefinitions);
                const ec = quiet(() => new CombatantModel(e, 'enemy'));
                const best = ec.abilities.map(a => a.id).filter(a => a !== 'rest');
                for (const ab of best) {
                    hero.hp = hero.maxHp; hero.state.statusEffects = [];   // each blow on a fresh player (a Bite's Weakened must not pile up across the samples)
                    const hc = quiet(() => new CombatantModel(hero, 'party'));
                    const res = quiet(() => AbilitySystem.execute(ab, ec, hc));
                    if (hero.hp < hero.maxHp) { dealt += hero.maxHp - hero.hp; hits++; }
                }
                hero.hp = hero.maxHp; hero.state.statusEffects = [];
                const hc = quiet(() => new CombatantModel(hero, 'party'));
                const t = quiet(() => new CombatantModel(e, 'enemy'));
                let n = 0; while (!t.isDead() && n < 20) { quiet(() => AbilitySystem.execute('slash', hc, t)); n++; }
                slashes += n;
            }
            const avg = dealt / Math.max(1, hits);
            assert.ok(avg >= hero.maxHp * 0.07, `L${lvl} ${id}: a landed blow takes ${avg.toFixed(1)} of ${hero.maxHp} (not the old 1 or 2)`);
            assert.ok(slashes / 40 <= (id === 'ROTTER' ? 5 : 4.5), `L${lvl} ${id}: down in ${(slashes / 40).toFixed(1)} slashes (a rotter is the slow, tough one)`);
        }
    }
});

test('crates and barrels: copper and small keys are common finds', () => {
    const share = (table, id) => { const t = L[table]; const all = t.items.reduce((n, i) => n + i.weight, 0); return t.items.filter(i => i.id === id).reduce((n, i) => n + i.weight, 0) / all; };
    for (const t of ['container_crate', 'container_barrel', 'container_ancient_barrel', 'container_ruined_barrel', 'container_crate_sack']) {
        assert.ok(share(t, 'small_iron_key') >= 0.06, `${t}: small keys ${(share(t, 'small_iron_key') * 100).toFixed(0)}%`);
        assert.ok(share(t, 'copper_ore') + share(t, 'copper_ingot') >= 0.07, `${t}: copper`);
    }
    assert.ok(share('container_crate', 'copper_ore') + share('container_crate', 'copper_ingot') >= 0.2, 'a crate: copper often');
});

test('no encounter or chest hands out the common materials: stone, sand, fibres, bones, wood and the like', async () => {
    const common = LootExclusionSets.common_materials;
    for (const id of ['stone', 'sand', 'plant_fibers', 'bone', 'soft_wood', 'hard_wood', 'flint', 'wheat', 'cotton', 'salt', 'coal', 'fur']) assert.ok(common.includes(id), id);
    for (const id of ['copper_ore', 'copper_ingot', 'iron_ingot', 'leather']) assert.ok(!common.includes(id), `${id} is still a reward`);
    // the encounter roll always leaves them out (a chest is an encounter: treasure_chest, iron_chest)
    const logic = fs.readFileSync(new URL('../../frontend/src/screens/encounter/encounterLogic.js', import.meta.url), 'utf8');
    assert.match(logic, /'common_materials'\];\s*\n\s*const lootModel = LootTableFactory\.generateLoot\(actualTableId, computedRolls, payload\.baseCurrency \|\| 0, exclude\)/);
    // a roll of the plains table, as an encounter does it: never one of them
    for (let i = 0; i < 300; i++) {
        const m = LootTableFactory.generateLoot('plains', 3, 0, ['common_materials']);
        for (const it of m.items) assert.ok(!common.includes(it.id), it.id);
    }
    // and nothing gives them outright
    const { encounterDefinitions } = await import('../../shared/story/encounterDefinitions.js');
    for (const [id, enc] of Object.entries(encounterDefinitions)) {
        const given = JSON.stringify(enc).match(/"type":"GIVE_ITEM","payload":\{[^}]*\}/g) || [];
        for (const g of given) for (const c of common) assert.ok(!g.includes(`"${c}"`), `${id} gives ${c}`);
    }
});

test('a madman who joins the party carries his own weapon at its own level again: his level forged it up, recruiting puts it back', () => {
    const m = quiet(() => EntityFactory.create('MAD_MAN', { level: 16, equipment: { mainHand: 'scythe' } }));
    forgeEnemyWeapons(m, makeItem, ItemDefinitions);
    assert.equal(m.state.equipment.mainHand.level, 4, 'in the fight: forged to his level');
    EntityFactory.removeLevelEdge(m);   // what every recruit goes through (PartyManager.recruit, CHARACTER_RECRUITED)
    assert.equal(m.state.equipment.mainHand.defId, 'scythe', 'his own scythe');
    assert.equal(m.state.equipment.mainHand.level, 1, 'at the level he was made with: no free upgrade');
    assert.equal(m.state.forgedWeapons, undefined);
    EntityFactory.removeLevelEdge(m);
    assert.equal(m.state.equipment.mainHand.level, 1, 'safe to call twice');
});

test('natural packages: every unarmed creature has one (not an item: nothing in its equipment), and learns a move every 5 levels, enemy or recruit', async () => {
    const { NATURAL_PACKAGES, packageOf, packageAbilitiesAt } = await import('../../shared/characters/naturalPackages.js');
    const { AbilityDefinitions } = await import('../../shared/abilities/abilityDefinitions.js');
    const want = { DOG: 'canine', WOLF: 'canine', SNOW_LEOPARD: 'feline', HAWK: 'avian', CAVE_SPIDER: 'arachnid', SHACKLED_STEED: 'hoofed', GRIM_STAG: 'hoofed', DUNE_MAW: 'burrower', ICECOIL: 'burrower', THUNDER_LOCUST: 'swarm', ROTTER: 'rotter' };
    for (const [id, pkg] of Object.entries(want)) assert.equal(E[id].naturalPackage, pkg, id);
    for (const [id, d] of Object.entries(E)) if ((d.tags || []).includes('BOSS') || d.fallsWith) assert.equal(packageOf(quiet(() => EntityFactory.create(id, 10))), null, `${id}: a boss is tuned as it is`);
    for (const [k, p] of Object.entries(NATURAL_PACKAGES)) {
        assert.deepEqual(Object.keys(p.abilities).map(Number), [5, 10, 15, 20], `${k}: one every 5 levels`);
        for (const a of Object.values(p.abilities)) {
            assert.ok(AbilityDefinitions[a], `${k}: ${a} exists`);
            for (const st of AbilityDefinitions[a].statusEffects || []) assert.ok(quiet(() => StatusEffectFactory.createEffect(st.id, st.duration || 2, null)), `${k}: ${a} applies ${st.id}, which exists`);
        }
    }
    assert.deepEqual(packageAbilitiesAt(NATURAL_PACKAGES.canine, 9), ['pounce']);
    assert.deepEqual(packageAbilitiesAt(NATURAL_PACKAGES.canine, 20), ['pounce', 'intimidate', 'hit_and_run', 'rampage']);
    const ids = (e) => e.abilities.map(a => a.id);
    const pup = quiet(() => EntityFactory.create('WOLF', 4)), wolf = quiet(() => EntityFactory.create('WOLF', 15));
    assert.ok(!ids(pup).includes('pounce'), 'not before level 5');
    for (const a of ['pounce', 'intimidate', 'hit_and_run']) assert.ok(ids(wolf).includes(a), `a level 15 wolf knows ${a}`);
    assert.ok(!ids(wolf).includes('rampage'));
    assert.equal(wolf.abilities.find(a => a.id === 'hit_and_run').source, 'Innate', 'shown as built in');
    assert.ok(Object.values(wolf.state.equipment || {}).every(v => !v), 'no item anywhere: a stat package');
    // a recruit learns them as it levels
    const dog = quiet(() => EntityFactory.create('DOG', 9)); EntityFactory.removeLevelEdge(dog);
    assert.ok(!ids(dog).includes('intimidate'));
    dog.state.level = 10;
    assert.ok(ids(dog).includes('intimidate'), 'reaching level 10, the recruit has it');
    // the rotter too, though it is a humanoid
    assert.ok(ids(quiet(() => EntityFactory.create('ROTTER', 10))).includes('intimidate'));
});

test('a recruited creature also gets the armour its package stands in for; an enemy one does not (an enemy\'s armour is never forged)', async () => {
    const { StatCalculator } = await import('../../shared/characters/statCalculator.js');
    const { naturalDefenseBonus } = await import('../../shared/battle/enemyArms.js');
    const foe = quiet(() => EntityFactory.create('DOG', { level: 15, levelEdge: false }));
    const pet = quiet(() => EntityFactory.create('DOG', { level: 15, levelEdge: false })); EntityFactory.removeLevelEdge(pet);
    const a = StatCalculator.calculate(foe), b = StatCalculator.calculate(pet);
    for (const t of ['blunt', 'slash', 'pierce']) assert.equal(b.defense[t] - a.defense[t], naturalDefenseBonus(15), t);
    assert.equal(naturalDefenseBonus(15), 9, 'about what a full leather set gains by then');
    assert.equal(b.attack.pierce, a.attack.pierce, 'the same bite');
});

test('animals fight like animals: no blade moves, no Mass Fear yet, Pounce for dogs and wolves, Eviscerate only for snow leopards and hawks', async () => {
    const { NATURAL_PACKAGES, packageAbilitiesAt } = await import('../../shared/characters/naturalPackages.js');
    const { AbilityDefinitions } = await import('../../shared/abilities/abilityDefinitions.js');
    const { ACT_DEFINITIONS } = await import('../../shared/story/actDefinitions.js');
    const animals = Object.entries(E).filter(([, d]) => d.naturalPackage);   // the rotter too: no blade moves for the dead
    for (const [id, d] of animals) {
        const every = new Set([...(d.abilities || []), ...packageAbilitiesAt(NATURAL_PACKAGES[d.naturalPackage], 99),
            ...Object.values(ACT_DEFINITIONS).flatMap(a => ((a.enemies || {})[id] || {}).abilities || [])]);
        assert.ok(!every.has('mass_fear'), `${id}: no Mass Fear`);
        for (const a of every) {
            const blade = (AbilityDefinitions[a].tags || []).includes('blade');
            if (a === 'eviscerate') assert.ok(['SNOW_LEOPARD', 'HAWK'].includes(id), `${id}: Eviscerate is the leopard's and the hawk's only`);
            else assert.ok(!blade, `${id}: ${a} is a blade's move`);
        }
    }
    for (const id of ['DOG', 'WOLF']) assert.ok(quiet(() => EntityFactory.create(id, 5)).abilities.some(a => a.id === 'pounce'), `${id} pounces`);
    for (const id of ['SNOW_LEOPARD', 'HAWK']) assert.ok(quiet(() => EntityFactory.create(id, 10)).abilities.some(a => a.id === 'eviscerate'), `${id} eviscerates`);
});

test('Slash, Claw, Bite and Talon Strike each have a job of their own, not one move four times', async () => {
    const { AbilityDefinitions: A } = await import('../../shared/abilities/abilityDefinitions.js');
    const [s, c, b, t] = ['slash', 'claw', 'bite', 'talon_strike'].map(id => A[id]);
    const pow = (x) => x.effects[0].power, spd = (x) => x.speedModifier ?? 1, cost = (x) => x.cost.stamina;
    const chance = (x, st) => (x.statusEffects.find(e => e.id === st) || { chance: 0 }).chance;
    // Claw: fastest, cheapest, lightest, bleeds most
    assert.ok(spd(c) > Math.max(spd(s), spd(b), spd(t)) && cost(c) < Math.min(cost(s), cost(b), cost(t)) && pow(c) < Math.min(pow(s), pow(b), pow(t)));
    assert.ok(chance(c, 'bleed') > Math.max(chance(s, 'bleed'), chance(b, 'bleed'), chance(t, 'bleed')));
    // Bite: a beast's Thrust: on par with Slash and Thrust, a little harder and a little less accurate, and nothing else of its own
    const th = A.thrust;
    assert.ok(pow(b) > pow(s) && pow(b) > pow(th) && b.accuracy < s.accuracy && b.accuracy < th.accuracy);
    assert.equal(spd(b), spd(th)); assert.equal(cost(b), cost(th));
    assert.ok(Math.abs(pow(b) * b.accuracy - pow(th) * th.accuracy) < 0.06, 'on average level with them');
    assert.ok(!b.statusEffects.some(e => e.id === 'weakened'), 'no Weakened');
    assert.ok([s, c, t].every(x => chance(x, 'weakened') === 0));
    // Talon Strike: the sure one, never misses, a lighter blow
    assert.equal(t.sureHit, true);
    assert.ok([s, c, b].every(x => !x.sureHit) && pow(t) < pow(b));   // the sure dive is lighter than the bite
    // Slash: the weapon's baseline
    assert.equal(pow(s), 1.25); assert.equal(spd(s), 1);
    // the rotter grabs and holds
    const { NATURAL_PACKAGES } = await import('../../shared/characters/naturalPackages.js');
    assert.equal(NATURAL_PACKAGES.rotter.abilities[5], 'wrap');
});

test('a sure hit never misses, even against an evasive target, and its card says so', async () => {
    const { CombatCalculator } = await import('../../shared/battle/combatCalculator.js');
    const { AbilityPreview } = await import('../../frontend/src/ui/abilityPreview.js');
    const { AbilityDefinitions: A } = await import('../../shared/abilities/abilityDefinitions.js');
    const att = { stats: { accuracy: 100, attack: { pierce: 20 }, critChance: 0 } }, def = { stats: { evasion: 400, defense: {}, resistance: {} } };
    let sure = 0, plain = 0;
    quiet(() => { for (let i = 0; i < 400; i++) { if (CombatCalculator.calculateDamage(att, def, 1, 'pierce', Infinity).hit) sure++; if (CombatCalculator.calculateDamage(att, def, 1, 'pierce', 1).hit) plain++; } });
    assert.equal(sure, 400, 'every one lands');
    assert.ok(plain < 150, 'an ordinary blow mostly misses so nimble a target');
    assert.equal(AbilityPreview.getHitChance(A.talon_strike, null).text, 'Sure hit');
    // and in play: a hawk's Talon Strike against a target that has taken to the air with Hide stacked
    const hawk = quiet(() => new CombatantModel(EntityFactory.create('HAWK', 8), 'party'));
    let landed = 0;
    for (let i = 0; i < 60; i++) {
        const foe = quiet(() => new CombatantModel(EntityFactory.create('SAND_STALKER', 8), 'enemy'));
        foe.originalEntity.state.baseStats.evasion = 300;
        const r = quiet(() => AbilitySystem.execute('talon_strike', hawk, foe));
        if (r.outcome === 'HIT' || r.outcome === 'CRIT') landed++;
    }
    assert.equal(landed, 60);
});
