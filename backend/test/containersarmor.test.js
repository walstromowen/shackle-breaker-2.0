// backend/test/containersarmor.test.js: `npm test`. Bleed vs poison, the cloth / leather / iron armor roles, searchable containers, house chests and chest loot.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StatusEffectDefinitions } from '../../shared/abilities/statusEffectDefinitions.js';
import { StatusEffectModel } from '../../shared/abilities/statusEffectModel.js';
import { ItemDefinitions as I } from '../../shared/items/itemDefinitions.js';
import { LootTableDefinitions as T, LootExclusionSets } from '../../shared/items/lootTableDefinitions.js';
import { LootTableFactory } from '../../shared/items/lootTableFactory.js';
import { MAP_OBJECTS_DEFINITIONS } from '../../shared/world/mapObjectDefinitions.js';
import { HouseGenerator } from '../../shared/world/generators/houseGenerator.js';
import { INTERIOR_DEFINITIONS } from '../../shared/world/interiorDefinitions.js';

// ---------- bleed ----------
const fakeTarget = () => ({ name: 'T', level: 1, hp: 100, stamina: 100, modifyResource(k, n) { this[k] += n; } });
const tickHp = (id, stacks) => {
    const m = new StatusEffectModel(StatusEffectDefinitions[id]);
    m.stacks = stacks;
    const t = fakeTarget();
    m.onEvent('ON_TURN_END', t);
    return 100 - t.hp;
};

test('bleed hurts less per turn than poison, even fully stacked', () => {
    const poison = tickHp('poison', 1);
    assert.equal(poison, 5);
    for (let s = 1; s <= (StatusEffectDefinitions.bleed.maxStacks || 1); s++) assert.ok(tickHp('bleed', s) < poison, `bleed x${s} < poison`);
    assert.ok(tickHp('bleed', 1) >= 1);
});

// ---------- armor ----------
const MAGIC = ['fire', 'ice', 'lightning', 'water', 'earth', 'wind', 'light', 'dark', 'arcane'];
const sum = (o = {}, keys) => keys.reduce((a, k) => a + (o[k] || 0), 0);
const PHYS = ['blunt', 'slash', 'pierce'];
const totals = (ids) => ids.reduce((a, id) => {
    const d = I[id];
    a.phys += sum(d.defense, PHYS); a.magic += sum(d.defense, MAGIC);
    a.physRes += sum(d.resistance, PHYS); a.magicRes += sum(d.resistance, MAGIC);
    a.ins += d.resources?.insightRecovery || 0; a.stm += d.resources?.staminaRecovery || 0;
    return a;
}, { phys: 0, magic: 0, physRes: 0, magicRes: 0, ins: 0, stm: 0 });
const TATTERED = ['tattered_hood', 'tattered_shirt', 'tattered_gloves', 'tattered_pants', 'tattered_boots'];
const CLOTH = ['cloth_hood', 'cloth_robe', 'cloth_gloves', 'cloth_pants', 'cloth_shoes'];
const LEATHER = ['leather_helmet', 'leather_armor', 'leather_bracers', 'leather_leggings', 'leather_boots'];
const IRON = ['iron_helmet', 'iron_armor', 'iron_gauntlets', 'iron_greaves', 'iron_boots'];

test('tattered armor is tier 0; cloth, leather and iron are all tier 1', () => {
    for (const id of TATTERED) assert.equal(I[id].tier, 0, id);
    for (const id of [...CLOTH, ...LEATHER, ...IRON]) assert.equal(I[id].tier, 1, id);
});

test('each cloth piece beats the tattered piece in its slot', () => {
    CLOTH.forEach((id, i) => {
        const c = totals([id]), t = totals([TATTERED[i]]);
        assert.ok(c.phys + c.magic + c.physRes + c.magicRes > t.phys + t.magic + t.physRes + t.magicRes, `${id} > ${TATTERED[i]}`);
    });
});

test('cloth excels at magic, leather at physical, iron at physical most', () => {
    const cloth = totals(CLOTH), leather = totals(LEATHER), iron = totals(IRON);
    assert.ok(cloth.magic > leather.magic * 3 && cloth.magic > iron.magic * 3, 'cloth: magic defense');
    assert.ok(cloth.magicRes > leather.magicRes && cloth.magicRes > iron.magicRes, 'cloth: magic resistance');
    assert.ok(leather.phys > cloth.phys && iron.phys > leather.phys, 'physical: iron > leather > cloth');
    assert.ok(leather.phys >= iron.phys * 0.5 && leather.phys <= iron.phys * 0.9, 'leather is a comparable (not equal) physical set');
    assert.ok(iron.magic <= leather.magic, 'iron does not help against magic');
});

test('every armor set grants some resistance: iron high physical / low magic, leather medium both, cloth low physical / high magic', () => {
    const near = (a, b) => Math.abs(a - b) < 1e-9;
    const cloth = totals(CLOTH), leather = totals(LEATHER), iron = totals(IRON);
    // totals() sums over the three physical or nine magic types, so divide to get the set's resistance per type
    const per = (t) => ({ phys: t.physRes / 3, magic: t.magicRes / 9 });
    const c = per(cloth), l = per(leather), i = per(iron);
    assert.ok(near(c.phys, 0.03) && near(c.magic, 0.15), 'cloth 3% physical / 15% magic');
    assert.ok(near(l.phys, 0.09) && near(l.magic, 0.08), 'leather 9% physical / 8% magic');
    assert.ok(near(i.phys, 0.15) && near(i.magic, 0.03), 'iron 15% physical / 3% magic');
    assert.ok(i.phys > l.phys && l.phys > c.phys, 'physical: iron > leather > cloth');
    assert.ok(c.magic > l.magic && l.magic > i.magic, 'magic: cloth > leather > iron');
    for (const id of [...CLOTH, ...LEATHER, ...IRON]) {
        const r = I[id].resistance || {};
        assert.ok(Object.values(r).some(v => v > 0), `${id} grants some resistance`);
    }
});

test('cloth boosts insight recovery, leather boosts stamina recovery, and not the other way round', () => {
    const cloth = totals(CLOTH), leather = totals(LEATHER), iron = totals(IRON);
    assert.ok(cloth.ins > 0 && leather.ins === 0 && iron.ins === 0);
    assert.ok(leather.stm > 0 && cloth.stm === 0);
});

// ---------- searchable containers ----------
const CONTAINERS = { CRATE: 'container_crate', CRATE_SACK: 'container_crate_sack', SACKS: 'container_sacks', WARDROBE: 'container_wardrobe' };

test('crates, sacks and wardrobes are searched (no encounter) and each has its own table', () => {
    for (const [obj, table] of Object.entries(CONTAINERS)) {
        const it = MAP_OBJECTS_DEFINITIONS[obj].interaction;
        assert.equal(it.type, 'SEARCH', obj);
        assert.equal(it.lootTableId, table);
        assert.ok(T[table]?.items.length >= 8, `${table} has a spread of items`);
        for (const e of T[table].items) assert.ok(I[e.id], `${table}: ${e.id} exists`);
    }
});

test('what a container holds fits it', () => {
    const ids = (t) => T[t].items.map(e => e.id);
    for (const id of ids('container_wardrobe')) assert.ok(/^(tattered|cloth)_|cotton|linen|fur|bedroll/.test(id), `wardrobe: ${id}`);
    assert.ok(!ids('container_wardrobe').some(id => /ore|ingot|wheat|torch/.test(id)));
    assert.ok(!ids('container_crate').some(id => /^(tattered|cloth|leather)_/.test(id)), 'no clothes in a crate');
    assert.ok(ids('container_sacks').includes('wheat') && ids('container_crate_sack').includes('wheat'));
});

test('searching gives items from the table, can come up empty, and is deterministic under a stubbed random', () => {
    const real = Math.random;
    try {
        for (const table of Object.values(CONTAINERS)) {
            const allowed = new Set(T[table].items.map(e => e.id));
            let empty = 0, full = 0;
            for (let i = 0; i < 400; i++) {
                const got = LootTableFactory.searchContainer(table);
                if (!got.length) empty++; else full++;
                assert.ok(got.length <= 2);
                for (const g of got) { assert.ok(allowed.has(g.id), `${table}: ${g.id}`); assert.ok(g.qty >= 1); }
            }
            assert.ok(empty > 0 && full > empty, `${table}: sometimes empty, usually not (${empty}/${full})`);
        }
        Math.random = () => 0;   // below EMPTY_CHANCE: always empty
        assert.deepEqual(LootTableFactory.searchContainer('container_crate'), []);
    } finally { Math.random = real; }
});

// ---------- houses ----------
test('a house always has one chest, and a quarter or so have a second', () => {
    let two = 0; const N = 300;
    for (let i = 0; i < N; i++) {
        const g = new HouseGenerator(12345 + i * 7, 'HOUSE', INTERIOR_DEFINITIONS.HOUSE_INTERIOR, `h_${i}`);
        const chests = [...g.furniture.items.values()].filter(id => id === 'WOODEN_CHEST').length;
        assert.ok(chests === 1 || chests === 2, `house ${i} has ${chests} chests`);
        if (chests === 2) two++;
    }
    assert.ok(two > N * 0.12 && two < N * 0.4, `${two} of ${N} houses have two chests`);
});

// ---------- chest loot ----------
test('chest loot never holds low-tier items', () => {
    const low = new Set(LootExclusionSets.low_tier);
    for (const table of ['plains', 'desert', 'cave', 'house_interior', 'house']) {
        for (let i = 0; i < 300; i++) {
            for (const { id } of LootTableFactory.generateLoot(table, 2, 0, 'low_tier').items) {
                assert.ok(!low.has(id), `${table}: ${id}`);
                assert.notEqual(I[id].tier, 0, `${table}: ${id} is tier 0`);
                assert.ok((I[id].value ?? 100) >= 25, `${table}: ${id} is worth ${I[id].value}`);
            }
        }
    }
});
