// backend/test/castlegrounds.test.js: `npm test`. The castle grounds (biome CASTLE_GROUNDS: a ruined castle's wards and courtyards) have foes of their own:
// what is left of the garrison (legionaries, watchmen, the executioner) and the cursed townsfolk (madmen, magic addicts, rotters, the abductor).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const { BIOME_DEFINITIONS } = await import('../../shared/world/biomeDefinitions.js');
const { SpawnTableDefinitions } = await import('../../shared/battle/spawnTableDefinitions.js');
const { SpawnTableFactory } = await import('../../shared/battle/spawnTableFactory.js');
const { ENTITY_DEFINITIONS } = await import('../../shared/characters/entityDefinitions.js');
const { EntityFactory } = await import('../../shared/characters/entityFactory.js');
const { AbilityDefinitions } = await import('../../shared/abilities/abilityDefinitions.js').then(m => ({ AbilityDefinitions: m.AbilityDefinitions || m.ABILITY_DEFINITIONS || m.default }));
const { ItemDefinitions } = await import('../../shared/items/itemDefinitions.js');
const { LootTableDefinitions } = await import('../../shared/items/lootTableDefinitions.js').then(m => ({ LootTableDefinitions: m.LootTableDefinitions || m.LOOT_TABLE_DEFINITIONS || m.default }));
const main = fs.readFileSync(new URL('../../frontend/src/main.js', import.meta.url), 'utf8');
const asset = (key) => { const m = new RegExp(`\\b${key}:\\s*'\\./(assets/[^']+)'`).exec(main); return m && new URL('../../frontend/src/' + m[1], import.meta.url); };

const FOES = ['LEGIONARY', 'WATCHMAN', 'MAD_MAN', 'MAGIC_ADDICT', 'ROTTER', 'EXECUTIONER', 'ABDUCTOR'];

test('the castle grounds are their own biome, fighting from their own tables', () => {
    const b = BIOME_DEFINITIONS.CASTLE_GROUNDS;
    assert.ok(b && b.castleOnly, "a biome laid only on a castle's cells");
    assert.equal(BIOME_DEFINITIONS.CASTLE_RUINS, undefined, 'renamed from CASTLE_RUINS');
    const t = b.battles.tables;
    assert.deepEqual([t.day, t.dusk, t.night, t.bloodMoon], ['castle_grounds_battles_day', 'castle_grounds_battles_day', 'castle_grounds_battles_night', 'castle_grounds_battles_blood_moon']);
    for (const id of new Set(Object.values(t))) {
        const members = new Set(SpawnTableDefinitions[id].pools.flatMap(p => p.members.map(m => m.id)));
        assert.deepEqual([...members].sort(), [...FOES].sort(), `${id}: exactly the castle's foes`);
    }
});

test("a castle battle draws its foes from the castle's own list, the executioner and abductor among them", () => {
    const seen = new Set();
    for (let i = 0; i < 400; i++) for (const e of SpawnTableFactory.generateBattle('castle_grounds_battles_night', 'normal').enemies || []) seen.add(e.id || e.entityId || e.definitionId || e);
    for (const id of seen) assert.ok(FOES.includes(id), `only castle foes (${id})`);
    assert.ok(seen.has('EXECUTIONER') && seen.has('ABDUCTOR'), `both new foes turn up (${[...seen].join(', ')})`);
});

test('the executioner and the abductor are whole: stats, weapon, abilities, loot, cry and battle sheet', () => {
    const ex = ENTITY_DEFINITIONS.EXECUTIONER, ab = ENTITY_DEFINITIONS.ABDUCTOR;
    assert.ok(ex.abilities.includes('execute'));
    assert.ok(ab.abilities.includes('sack_snatch'));
    assert.equal(ex.equipment.mainHand, 'executioners_axe');
    assert.ok(ItemDefinitions.executioners_axe && ItemDefinitions.executioners_axe.slot === 'twoHand');
    const snatch = AbilityDefinitions.sack_snatch;
    assert.ok(snatch.statusEffects.some(s => s.id === 'bound'), 'Snatch can bind');
    assert.ok(ex.baseStats.speed < ENTITY_DEFINITIONS.LEGIONARY.baseStats.speed || ex.baseStats.speed <= 3, 'the executioner is slow');
    for (const d of [ex, ab]) {
        assert.ok(LootTableDefinitions[d.lootTableId], `${d.name}: its loot table`);
        for (const it of LootTableDefinitions[d.lootTableId].items) assert.ok(ItemDefinitions[it.id], `${d.name} drops a real item (${it.id})`);
        for (const key of [d.spritePortrait, d.crySound]) { const u = asset(key); assert.ok(u && fs.existsSync(u), `${d.name}: ${key} registered and on disk`); }
        const e = EntityFactory.create(Object.keys(ENTITY_DEFINITIONS).find(k => ENTITY_DEFINITIONS[k] === d), 5);
        assert.ok(e && e.name === d.name, `${d.name}: made at level 5`);
    }
});

test('the castle grounds and the house interiors fight in front of their own backgrounds, registered and on disk', () => {
    const want = { CASTLE_GROUNDS: ['castleGroundsBattleDayBg', 'castleGroundsBattleDuskBg', 'castleGroundsBattleNightBg'] };
    assert.deepEqual(Object.values(BIOME_DEFINITIONS.CASTLE_GROUNDS.battleBackgrounds), want.CASTLE_GROUNDS);
    const house = Object.values(BIOME_DEFINITIONS).find(b => Object.values(b.battleBackgrounds || {}).includes('houseInteriorBg'));
    assert.ok(house, 'the house interiors use houseInteriorBg');
    for (const key of [...want.CASTLE_GROUNDS, 'houseInteriorBg']) { const u = asset(key); assert.ok(u && fs.existsSync(u), `${key} registered and on disk`); }
});
