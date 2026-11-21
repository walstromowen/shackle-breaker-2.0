// backend/test/artificer.test.js: `npm test`. The Artificers' armor: a tier 3 set that leans magical, drawn in the armor sheet's column 4, found
// rarely in encounter loot, and carried by no one but Darius.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENTITY_DEFINITIONS as E } from '../../shared/characters/entityDefinitions.js';
import { LootTableDefinitions as T } from '../../shared/items/lootTableDefinitions.js';
import { ItemDefinitions as I } from '../../shared/items/itemDefinitions.js';

const SET = { artificers_hood: 'head', artificers_robe: 'torso', artificers_wraps: 'arms', artificers_leggings: 'legs', artificers_boots: 'feet' };
const ROW = { head: 0, torso: 1, arms: 2, legs: 3, feet: 4 };
const sum = (f) => Object.keys(SET).reduce((a, id) => a + (f(I[id]) || 0), 0);
const setOf = (prefix) => Object.values(I).filter(it => it.type === 'armor' && it.id.startsWith(prefix));
const total = (items, f) => items.reduce((a, it) => a + (f(it) || 0), 0);

test('the Artificers\' armor: tier 3, column 4, a hybrid that leans magical', () => {
    for (const [id, slot] of Object.entries(SET)) {
        const it = I[id];
        assert.ok(it, id);
        assert.equal(it.type, 'armor'); assert.equal(it.slot, slot); assert.equal(it.tier, 3);
        assert.deepEqual(it.icon, { col: 4, row: ROW[slot] }, `${id}: its own cell in column 4`);
        assert.equal(it.resources.insightRecovery, 1, `${id}: feeds insight`);
        assert.ok((it.combat?.speed || 0) >= 0, `${id}: no cost to speed`);
    }
    // no other armor shares column 4
    for (const it of Object.values(I)) if (it.type === 'armor' && it.icon?.col === 4) assert.ok(SET[it.id], `${it.id} is drawn in the Artificers' column`);
    // physical: some, a little short of leather
    const leather = setOf('leather_');
    for (const t of ['blunt', 'slash', 'pierce']) {
        assert.ok(sum(x => x.defense[t]) > 0, `${t}: some protection`);
        assert.ok(sum(x => x.defense[t]) < total(leather, x => x.defense[t]), `${t}: less than leather`);
    }
    // magical: more than cloth against every element, and more than its own physical
    const cloth = setOf('cloth_');
    for (const t of ['fire', 'ice', 'lightning', 'water', 'earth', 'wind', 'light', 'dark', 'arcane']) {
        assert.ok(sum(x => x.defense[t]) > total(cloth, x => x.defense[t]), `${t}: above cloth`);
        assert.ok(sum(x => x.resistance[t]) > total(cloth, x => x.resistance[t]), `${t}: resists above cloth`);
        assert.ok(sum(x => x.defense[t]) > sum(x => x.defense.slash), `${t}: leans magical`);
    }
});

test('the Artificers\' armor drops rarely from encounter loot, and of the creatures only Darius carries it', () => {
    const where = Object.entries(T).filter(([, t]) => (t.items || []).some(i => SET[i.id])).map(([k]) => k).sort();
    assert.deepEqual(where, ['alterian_officer_loot', 'battlefield_loot', 'boss_darius_drops', 'iron_chest_loot', 'ruined_carriage_valuables']);
    for (const k of where) {
        const t = T[k];
        const pieces = t.items.filter(i => SET[i.id]);
        assert.equal(pieces.length, 5, `${k}: the whole set`);
        if (t.type === 'weighted') {
            const all = t.items.reduce((a, i) => a + i.weight, 0);
            for (const p of pieces) assert.ok(p.weight / all < 0.02, `${k}: ${p.id} is rare`);
        } else {
            for (const p of pieces) assert.ok(p.dropRate <= 0.05, `${k}: ${p.id} is rare`);
        }
    }
    const carriers = Object.entries(E).filter(([, e]) => e.lootTableId && where.includes(e.lootTableId)).map(([k]) => k);
    assert.ok(carriers.length >= 1 && carriers.every(k => E[k].lootTableId === 'boss_darius_drops'), `only Darius: ${carriers}`);
});
