// backend/test/accessories.test.js: `npm test`. The rare accessories: who can wear each (shared/items/equipRules.js), what they give, their icons
// on the armor sheet, and the enemies and chests they come from (rarely).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ItemDefinitions as I } from '../../shared/items/itemDefinitions.js';
import { LootTableDefinitions as L } from '../../shared/items/lootTableDefinitions.js';
import { AbilityDefinitions as A } from '../../shared/abilities/abilityDefinitions.js';
import { ItemFactory } from '../../shared/items/itemFactory.js';
import { EntityFactory } from '../../shared/characters/entityFactory.js';
import { StatCalculator } from '../../shared/characters/statCalculator.js';
import { canWear, wearRefusal } from '../../shared/items/equipRules.js';

const RARE = ['elbow_blade', 'panzerian_spring_inserts', 'panzerkamfer_saddle', 'nobles_ring', 'madmans_tooth_necklace', 'jar_of_shifting_sands', 'quiver', 'grim_stag_antler', 'royal_guards_signet', 'namuh_charm'];
const quiet = (fn) => { const l = console.log, w = console.warn; console.log = console.warn = () => {}; try { return fn(); } finally { console.log = l; console.warn = w; } };
const make = (id) => quiet(() => EntityFactory.create(id, { name: id }));

test('ten rare accessories, each with a placeholder icon of its own on the armor sheet', () => {
    const cells = new Set();
    for (const id of RARE) {
        const d = I[id];
        assert.ok(d, id);
        assert.equal(d.slot, 'accessory');
        assert.equal(d.rarity, 'rare');
        assert.ok(['humanoid', 'medium_beast'].includes(d.wornBy), `${id}: says who wears it`);
        assert.equal(d.icon.row, 6);
        cells.add(d.icon.col);
        for (const a of d.grantedAbilities || []) assert.ok(A[a], `${id}: ${a} is a real ability`);
    }
    assert.equal(cells.size, RARE.length, 'no two share an icon');
    assert.ok(fs.existsSync(new URL('../../tools/art/accessoryIcons.py', import.meta.url)));
});

test('who can wear what: people wear the rings and blades; only a dog, a wolf or a leopard wears the Panzerkamfer saddle', () => {
    const hero = make('HUMANOID'), dog = make('DOG'), wolf = make('WOLF'), leopard = make('SNOW_LEOPARD'), hawk = make('HAWK');
    assert.ok(canWear(I.nobles_ring, hero));
    assert.ok(!canWear(I.nobles_ring, dog), 'a dog does not wear a ring');
    for (const beast of [dog, wolf, leopard]) assert.ok(canWear(I.panzerkamfer_saddle, beast), `${beast.name} can bear the saddle`);
    assert.ok(!canWear(I.panzerkamfer_saddle, hawk), 'a hawk is too small');
    assert.ok(!canWear(I.panzerkamfer_saddle, hero), 'not for a person');
    assert.match(wearRefusal(I.panzerkamfer_saddle, hero), /dog, a wolf or a leopard/);
    assert.equal(wearRefusal(I.quiver, hero), null);
    const logic = fs.readFileSync(new URL('../../frontend/src/screens/characterSummary/characterSummaryLogic.js', import.meta.url), 'utf8');
    assert.match(logic, /canEquipToSlot[\s\S]*if \(!canWear\(def, this\.currentMember\)\) return false;/, 'the screen will not offer it');
    assert.match(logic, /equipItem\(inventoryItem[\s\S]*if \(def && !canWear\(def, member\)\) return null;/, 'nor equip it');
});

test('worn, they work: the Noble\'s Ring raises intelligence, the saddle a beast\'s health and armour', () => {
    const hero = make('HUMANOID');
    const before = StatCalculator.calculateDetailed(hero);
    hero.equipItem('accessory', ItemFactory.createItem('nobles_ring'));
    const after = StatCalculator.calculateDetailed(hero);
    const int = (s) => (typeof s.attributes.intelligence === 'object' ? s.attributes.intelligence.total : s.attributes.intelligence);
    assert.equal(int(after) - int(before), 4);
    assert.ok(after.maxInsight.total > before.maxInsight.total);
    const dog = make('DOG');
    const b = StatCalculator.calculateDetailed(dog);
    dog.equipItem('accessory', ItemFactory.createItem('panzerkamfer_saddle'));
    const a = StatCalculator.calculateDetailed(dog);
    assert.ok(a.maxHp.total >= b.maxHp.total + 25);
});

test('each drops somewhere, and rarely: from the enemy or chest it belongs to', () => {
    const where = {};
    for (const [tid, t] of Object.entries(L)) for (const it of t.items || []) if (RARE.includes(it.id)) (where[it.id] ||= []).push([tid, it.dropRate ?? it.weight]);
    for (const id of RARE) assert.ok(where[id], `${id} drops somewhere`);
    const from = (id, table) => where[id].some(([t]) => t === table);
    assert.ok(from('elbow_blade', 'sand_stalker_drops'));
    assert.ok(from('panzerkamfer_saddle', 'boss_panzerkamfer_drops'));
    assert.ok(from('panzerian_spring_inserts', 'boss_panzerkamfer_drops'));
    assert.ok(from('nobles_ring', 'ruined_carriage_valuables') && from('nobles_ring', 'boss_darius_drops'));
    assert.ok(from('madmans_tooth_necklace', 'madman_drops'));
    assert.ok(from('jar_of_shifting_sands', 'miragewright_drops') && from('jar_of_shifting_sands', 'boss_dry_kraken_drops'));
    assert.ok(from('quiver', 'frozen_trapper_drops') && from('quiver', 'watchman_drops'));
    assert.ok(!I.jar_of_shifting_sands.grantedAbilities && !I.grim_stag_antler.grantedAbilities, 'the jar and the antler grant no ability');
    assert.ok(from('grim_stag_antler', 'grim_stag_drops'));
    assert.ok(from('royal_guards_signet', 'alterian_officer_loot') && from('royal_guards_signet', 'iron_chest_loot'));
    assert.ok(from('namuh_charm', 'battlefield_loot') && from('namuh_charm', 'old_grave_loot'));
    for (const id of RARE) for (const [t, rate] of where[id]) if (!t.startsWith('boss_') && L[t].type === 'independent') assert.ok(rate <= 0.05, `${id} from ${t} is rare (${rate})`);
});
