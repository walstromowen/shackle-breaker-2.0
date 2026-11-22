// backend/test/enchantments.test.js: `npm test`. Weapon enchantments (shared/items/enchantments.js), made at the Enchanter's Table for one Insight, and
// gear upgraded only at the station of its trade (shared/items/workstations.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as En from '../../shared/items/enchantments.js';
import { upgradeStationOf, canUpgradeAt, ENCHANTERS_TABLE } from '../../shared/items/workstations.js';
import { ItemFactory } from '../../shared/items/itemFactory.js';
import { ItemDefinitions as I } from '../../shared/items/itemDefinitions.js';
import { EntityFactory } from '../../shared/characters/entityFactory.js';
import { StatCalculator } from '../../shared/characters/statCalculator.js';
import { CombatantModel } from '../../shared/battle/combatantModel.js';
import { AbilitySystem } from '../../shared/abilities/abilitySystem.js';
import { MAP_OBJECTS_DEFINITIONS as M } from '../../shared/world/mapObjectDefinitions.js';
import { gameState } from '../../shared/core/gameState.js';
import { INSIGHT_ELEMENTS } from '../../shared/abilities/insights.js';

const quiet = (fn) => { const l = console.log, w = console.warn, e = console.error; console.log = console.warn = console.error = () => {}; try { return fn(); } finally { console.log = l; console.warn = w; console.error = e; } };

test('four status enchantments (burn, freeze, paralyze, poison at 10%) and a conversion for every magical element', () => {
    const status = Object.values(En.ENCHANTMENTS).filter(e => e.kind === 'status');
    assert.deepEqual(status.map(e => [e.element, e.status, e.chance]).sort(), [
        ['earth', 'poison', 0.1], ['fire', 'burn', 0.1], ['ice', 'frozen', 0.1], ['lightning', 'paralyzed', 0.1]
    ]);
    const convert = Object.values(En.ENCHANTMENTS).filter(e => e.kind === 'convert').map(e => e.element).sort();
    assert.deepEqual(convert, [...INSIGHT_ELEMENTS].sort(), 'one per Insight element');
});

test('the table\'s roll: an element with a status enchantment gives it half the time, else its conversion at 25-50% of the physical attack', () => {
    assert.deepEqual(En.rollEnchantment('fire', () => 0.2), { id: 'searing' });
    const conv = En.rollEnchantment('fire', (() => { const r = [0.9, 0.99]; return () => r.shift(); })());
    assert.equal(conv.id, 'fire_wrought');
    assert.equal(conv.share, 0.5);
    assert.equal(En.rollEnchantment('wind', () => 0).share, 0.25, 'wind has no status enchantment: always its conversion');
    for (let i = 0; i < 200; i++) {
        const r = En.rollEnchantment('arcane');
        assert.ok(r.share >= 0.25 && r.share <= 0.5 && Math.abs(r.share * 20 - Math.round(r.share * 20)) < 1e-9, `${r.share} in 5% steps`);
    }
});

test('a conversion moves part of the weapon\'s physical attack into the element, travels with the weapon, and feeds the wielder\'s spells', () => {
    const plain = ItemFactory.createItem('shortsword', { level: 3 });
    const gale = ItemFactory.createItem('shortsword', { level: 3, enchantment: { id: 'wind_wrought', share: 0.4 } });
    const sum = (a) => Object.values(a).reduce((n, v) => n + v, 0);
    assert.equal(sum(gale.attack), sum(plain.attack), 'nothing is lost, only moved');
    assert.ok(gale.attack.wind > 0 && gale.attack.slash < plain.attack.slash);
    const copy = ItemFactory.createItem('shortsword', JSON.parse(JSON.stringify(gale)));
    assert.deepEqual(copy.enchantment, { id: 'wind_wrought', share: 0.4 }, 'saved and loaded with the item');
    assert.equal(En.enchantedName(copy), 'Gale-Wrought Shortsword');
    const make = (sword) => quiet(() => EntityFactory.create('HUMANOID', { level: 6, attributes: { strength: 20, dexterity: 20 }, equipment: { mainHand: sword }, levelEdge: false }));
    const a = StatCalculator.calculate(make(plain)).attack, b = StatCalculator.calculate(make(gale)).attack;
    assert.equal(b.wind - a.wind, gale.attack.wind, 'the wind attack the wielder\'s wind spells use');
    assert.ok(b.slash < a.slash);
});

test('a status enchantment: a damaging hit on an enemy rolls 10% more, added to the ability\'s own chance, never lowering it, never on allies', () => {
    const sword = ItemFactory.createItem('shortsword', { enchantment: { id: 'stormstruck' } });
    const hero = quiet(() => new CombatantModel(EntityFactory.create('HUMANOID', { level: 10, equipment: { mainHand: sword }, levelEdge: false }), 'party'));
    const foe = quiet(() => new CombatantModel(EntityFactory.create('MAD_MAN', 3), 'enemy'));
    const ally = quiet(() => new CombatantModel(EntityFactory.create('HUMANOID', { level: 3 }), 'party'));
    const merged = (list, target = foe, hit = true) => AbilitySystem._withEnchantmentStatuses(list, hero, target, hit);
    assert.deepEqual(merged([]), [{ id: 'paralyzed', chance: 0.1, duration: 2 }], 'a plain slash: a roll of its own');
    assert.equal(merged([{ id: 'paralyzed', chance: 0.35, duration: 2 }])[0].chance, 0.45, 'Lightning Strike\'s 35% + 10%: one roll');
    assert.equal(merged([{ id: 'paralyzed', chance: 1.0, duration: 2 }])[0].chance, 1.0, 'the cap never lowers the ability\'s own chance');
    assert.deepEqual(merged([], ally), [], 'not on a friend');
    assert.deepEqual(merged([], foe, false), [], 'not without damage');
    // in play: about one slash in ten burns
    const searing = ItemFactory.createItem('shortsword', { enchantment: { id: 'searing' } });
    const burner = quiet(() => new CombatantModel(EntityFactory.create('HUMANOID', { level: 10, equipment: { mainHand: searing }, levelEdge: false }), 'party'));
    let hits = 0, burned = 0;
    quiet(() => {
        for (let i = 0; i < 1500; i++) {
            const t = new CombatantModel(EntityFactory.create('MAD_MAN', 30), 'enemy');
            const r = AbilitySystem.execute('slash', burner, t);
            if (r.outcome === 'HIT' || r.outcome === 'CRIT') hits++;
            if ((t.statusEffects || []).some(s => s.id === 'burn')) burned++;
        }
    });
    const rate = burned / hits;
    assert.ok(rate > 0.06 && rate < 0.14, `burn on ${(rate * 100).toFixed(1)}% of hits`);
});

test('gear is upgraded only at the station of its trade', () => {
    const want = {
        shortsword: 'anvil', warhammer: 'anvil', amputators_saw: 'anvil', shortbow: 'carpenters_bench', crossbow: 'carpenters_bench', wooden_club: 'carpenters_bench',
        wooden_buckler: 'carpenters_bench', iron_armor: 'anvil', arc_knight_helm: 'anvil', leather_armor: 'tailors_bench', cloth_robe: 'tailors_bench',
        amputators_apron: 'tailors_bench', artificers_robe: 'tailors_bench'
    };
    for (const [id, at] of Object.entries(want)) assert.equal(upgradeStationOf(id), at, id);
    for (const d of Object.values(I)) if (d.upgradeCosts) assert.ok(['anvil', 'carpenters_bench', 'tailors_bench'].includes(upgradeStationOf(d)), `${d.id} has a station`);
    assert.equal(upgradeStationOf('tattered_shirt'), null, 'not upgraded anywhere');
    assert.ok(canUpgradeAt('shortsword', 'anvil') && !canUpgradeAt('shortsword', 'tailors_bench') && !canUpgradeAt('shortsword', ENCHANTERS_TABLE));
});

test('the Enchanter\'s Table stands in the workshop house with the other stations, with its own art', async () => {
    assert.equal(M.ENCHANTERS_TABLE.interaction.station, ENCHANTERS_TABLE);
    const { INTERIOR_DEFINITIONS } = await import('../../shared/world/interiorDefinitions.js').then(m => ({ INTERIOR_DEFINITIONS: Object.values(m).find(v => v && v.ABANDONED_WORKSHOP) }));
    assert.ok(INTERIOR_DEFINITIONS.ABANDONED_WORKSHOP.craftingStations.includes('ENCHANTERS_TABLE'));
    const main = fs.readFileSync(new URL('../../frontend/src/main.js', import.meta.url), 'utf8');
    assert.match(main, /objEnchantersTable: '\.\/assets\/mapObjects\/objEnchantersTable\.png'/);
    assert.ok(fs.existsSync(new URL('../../frontend/src/assets/mapObjects/objEnchantersTable.png', import.meta.url)));
});

test('at the table: only weapons and Insights are shown; enchanting spends one Insight and rolls the weapon an enchantment of its element', async () => {
    const { WorkshopController } = await import('../../frontend/src/screens/workshop/workshopController.js');
    const keep = { inventory: gameState.party.inventory, members: gameState.party.members };
    const sword = ItemFactory.createItem('shortsword');
    const bow = ItemFactory.createItem('shortbow');
    gameState.party.members = [];
    gameState.party.inventory = [sword, bow, ItemFactory.createItem('leather_armor'), ItemFactory.createItem('insight_of_fire', { qty: 2 }), ItemFactory.createItem('healing_herb', { qty: 3 })];
    try {
        const c = quiet(() => new WorkshopController({}));
        c.playConfirmSound = c.playErrorSound = c.playSfx = () => {};
        quiet(() => c.init({ station: ENCHANTERS_TABLE, title: "Enchanter's Table" }));
        const shown = () => c._getFormattedInventory().map(i => i.defId).sort();
        assert.deepEqual(shown(), ['insight_of_fire', 'shortbow', 'shortsword'], 'weapons and Insights only');
        const idx = (id) => c._getFormattedInventory().findIndex(i => i.defId === id);
        c.onClick(`PARTY_ITEM_${idx('shortsword')}`);
        assert.equal(c.canEnchantSelected, false, 'no Insight chosen yet');
        c.onClick(`PARTY_ITEM_${idx('insight_of_fire')}`);
        assert.equal(c.selectedUpgradeItem, sword, 'the weapon stays chosen');
        assert.ok(c.canEnchantSelected);
        quiet(() => c.onClick('BTN_ENCHANT'));
        assert.ok(['searing', 'fire_wrought'].includes(sword.enchantment.id), sword.enchantment.id);
        assert.equal(gameState.party.inventory.find(i => i.defId === 'insight_of_fire').qty, 1, 'one Insight spent');
        assert.match(c.getState().enchantInfo.message, /becomes the (Searing|Flame-Wrought) Shortsword/);

        quiet(() => c.init({ station: 'anvil', title: 'Anvil' }));
        assert.ok(shown().includes('shortsword') && !shown().includes('shortbow') && !shown().includes('leather_armor'), 'the anvil: metal weapons');
        quiet(() => c.init({ station: 'tailors_bench', title: "Tailor's Bench" }));
        assert.ok(shown().includes('leather_armor') && !shown().includes('shortsword'), 'the tailor: leather');
        quiet(() => c.init({ station: 'carpenters_bench', title: "Carpenter's Bench" }));
        assert.ok(shown().includes('shortbow') && !shown().includes('shortsword'), 'the carpenter: bows');
    } finally { gameState.party.inventory = keep.inventory; gameState.party.members = keep.members; }
});
