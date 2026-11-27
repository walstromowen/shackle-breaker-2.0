// backend/test/snowtrio.test.js: `npm test`. The snowy mountains' trio of the shackled, as the desert has its Sand Stalker, Calcified Crusader and
// Miragewright and the plains their Madman, Magic Addict and Rotter: the Frozen Trapper, the Frostbitten Warrior (the heavy) and the Rime Hermit (the caster).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ENTITY_DEFINITIONS as E } from '../../shared/characters/entityDefinitions.js';
import { LootTableDefinitions as L } from '../../shared/items/lootTableDefinitions.js';
import { ItemDefinitions as I } from '../../shared/items/itemDefinitions.js';
import { SpawnTableDefinitions as T } from '../../shared/battle/spawnTableDefinitions.js';
import { ACT_DEFINITIONS } from '../../shared/story/actDefinitions.js';

const main = fs.readFileSync(new URL('../../frontend/src/main.js', import.meta.url), 'utf8');
const asset = (key) => { const m = main.match(new RegExp(`${key}:\\s*'([^']+)'`)); return m && new URL(`../../frontend/src/${m[1].replace('./', '')}`, import.meta.url); };
const pngSize = (url) => { const b = fs.readFileSync(url); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };
const members = (table) => T[table].pools.flatMap(p => p.members.map(m => m.id));

test('the two new ones are the desert elites\' snow counterparts: a slow heavy that shatters, and a frail ice caster', () => {
    const P = E.FROSTBITTEN_WARRIOR, H = E.RIME_HERMIT;
    assert.equal(P.name, 'Frostbitten Warrior'); assert.equal(H.name, 'Rime Hermit');
    for (const d of [P, H]) assert.ok(d.tags.includes('SNOW') && d.tags.includes('ELITE') && d.tags.includes('HUMANOID'));
    assert.ok(P.baseStats.speed <= E.CALCIFIED_CRUSADER.baseStats.speed && P.baseStats.baseResistance.blunt < 0 && P.baseStats.baseResistance.fire < 0, 'slow; the ice shatters and melts');
    assert.ok(P.baseStats.baseResistance.slash > 0 && P.baseStats.baseResistance.pierce > 0, 'hard to cut or pierce');
    assert.deepEqual(H.insights, { ice: 1 }, 'a caster of ice');
    for (const a of ['ice_shard', 'frigid_gale', 'glacial_spike']) assert.ok(H.abilities.includes(a), `the hermit casts ${a}`);
    assert.ok(E.FROZEN_TRAPPER.tags.includes('SNOW'), 'the trio\'s third');
});

test('each has a 32-frame battle portrait, a cry and its own loot', () => {
    for (const [d, sheet, cry] of [[E.FROSTBITTEN_WARRIOR, 'frostbittenWarriorPortrait', 'frostbittenWarriorCry'], [E.RIME_HERMIT, 'rimeHermitPortrait', 'rimeHermitCry']]) {
        assert.equal(d.spritePortrait, sheet); assert.equal(d.crySound, cry); assert.equal(d.deathSound, cry);
        const url = asset(sheet); assert.ok(url && fs.existsSync(url), `${sheet} exists`);
        assert.deepEqual(pngSize(url), { w: 2048, h: 1024 }, 'the desert trio\'s sheet size: 16 frames of 128 a row, the front idle on rows 0-1');
        assert.ok(fs.existsSync(asset(cry)), `${cry} exists`);
        const loot = L[d.lootTableId]; assert.ok(loot, `${d.lootTableId}`);
        for (const it of loot.items) assert.ok(I[it.id], `${d.lootTableId}: ${it.id} is an item`);
    }
});

test('they fight beside the trappers in the snowy mountains: the warrior from the start, the hermit by day only from act 3; both at night and under the blood moon', () => {
    const day = T.snowy_mountains_battles_day.pools.flatMap(p => p.members);
    assert.ok(day.find(m => m.id === 'FROSTBITTEN_WARRIOR'));
    assert.equal(day.find(m => m.id === 'RIME_HERMIT').minAct, 3);
    for (const t of ['snowy_mountains_battles_night', 'snowy_mountains_battles_blood_moon']) {
        const ids = members(t);
        for (const id of ['FROZEN_TRAPPER', 'FROSTBITTEN_WARRIOR', 'RIME_HERMIT']) assert.ok(ids.includes(id), `${t}: ${id}`);
    }
    const ups = ACT_DEFINITIONS[3].enemies;
    assert.ok(ups.FROSTBITTEN_WARRIOR && ups.RIME_HERMIT, 'the acts make them stronger too');
});

test('the trapper fights with his spear alone (no frost magic); the hermit has the basic water attack as well as the ice', () => {
    const T = E.FROZEN_TRAPPER;
    for (const a of ['ice_shard', 'frigid_gale', 'glacial_spike']) assert.ok(!T.abilities.includes(a), `no ${a}`);
    assert.equal(T.equipment.mainHand, 'spear', 'the spear\'s moves are his');
    assert.ok(!T.tags.includes('MAGICAL'));
    assert.ok(E.RIME_HERMIT.abilities.includes('water_blast'));
});

test('frozen trappers walk their traplines in the snowy mountains: a patrol with eyes, a sneak-up encounter with its own pictures, and the fight when seen', async () => {
    const { MAP_OBJECTS_DEFINITIONS: M } = await import('../../shared/world/mapObjectDefinitions.js');
    const { encounterDefinitions: ED } = await import('../../shared/story/encounterDefinitions.js');
    const { isPatrol } = await import('../../shared/world/patrols.js');
    const { BIOME_DEFINITIONS } = await import('../../shared/world/biomeDefinitions.js');
    const p = M.FROZEN_TRAPPER_PATROL;
    assert.ok(p && p.character.entity === 'FROZEN_TRAPPER' && p.wander && p.interaction.sight === 5);
    assert.equal(p.interaction.id, 'frozen_trapper_patrol'); assert.equal(p.interaction.seenId, 'frozen_trapper_spots_you');
    assert.ok(isPatrol('FROZEN_TRAPPER_PATROL'), 'back with each new act like every patrol');
    const snow = Object.values(BIOME_DEFINITIONS).find(b => b.id === 'SNOWY_MOUNTAINS');
    assert.ok(Object.values(snow.mapObjects).flat().some(r => r.id === 'FROZEN_TRAPPER_PATROL'), 'found in the snowy mountains');
    const enc = ED.frozen_trapper_patrol, seen = ED.frozen_trapper_spots_you;
    assert.ok(enc && seen);
    const pics = Object.values(enc.stages).map(s => `${s.image.col},${s.image.row}`);
    assert.equal(new Set(pics).size, pics.length, 'every stage its own picture');
    assert.ok(fs.existsSync(asset('encounter_frozen_trapper_patrol')), 'the pictures exist');
    assert.deepEqual(pngSize(asset('frozenTrapperSprite')), { w: 512, h: 768 }, 'a walking map sheet: idle, walk, run in four directions');
});
