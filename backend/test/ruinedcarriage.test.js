// backend/test/ruinedcarriage.test.js: `npm test`. The Ruined Carriage on the plains: a 2 x 2 wreck with its own band in the plains' spawn list, an
// encounter that can make the party rich (a large purse, the strongbox, a merchant's goods) or bring a herd of shackled steeds down on it, and the
// Shmindolyn's Draught found in it, which cures a character of their last bad trait.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { gameState } from '../../shared/core/gameState.js';
import { encounterDefinitions } from '../../shared/story/encounterDefinitions.js';
import { MAP_OBJECTS_DEFINITIONS as M } from '../../shared/world/mapObjectDefinitions.js';
import { BIOME_DEFINITIONS } from '../../shared/world/biomeDefinitions.js';
import { ItemDefinitions as I } from '../../shared/items/itemDefinitions.js';
import { LootTableDefinitions as L } from '../../shared/items/lootTableDefinitions.js';
import { AbilityDefinitions as A } from '../../shared/abilities/abilityDefinitions.js';
import { AbilitySystem } from '../../shared/abilities/abilitySystem.js';
import { EntityFactory } from '../../shared/characters/entityFactory.js';
import { SCAR_TRAITS } from '../../shared/abilities/abilityTraits.js';
import { EncounterLogic } from '../../frontend/src/screens/encounter/encounterLogic.js';

const E = encounterDefinitions.ruined_carriage;
const main = fs.readFileSync(new URL('../../frontend/src/main.js', import.meta.url), 'utf8');
const fileOf = (key) => { const m = main.match(new RegExp(`${key}: '([^']+)'`)); return m && new URL(`../../frontend/src/${m[1].replace('./', '')}`, import.meta.url); };
const quiet = (fn) => { const l = console.log, w = console.warn; console.log = console.warn = () => {}; try { return fn(); } finally { console.log = l; console.warn = w; } };
const all = (o, acc = []) => { if (Array.isArray(o)) o.forEach(x => all(x, acc)); else if (o && typeof o === 'object') { if (o.type) acc.push(o); Object.values(o).forEach(v => all(v, acc)); } return acc; };
const decision = (stage, re) => E.stages[stage].decisions.find(d => re.test(d.text));

test('a 2 x 2 wreck with broken wheels: its art, a looted look, and its own band on the plains', () => {
    for (const id of ['RUINED_CARRIAGE', 'RUINED_CARRIAGE_LOOTED']) {
        assert.equal(M[id].width, 2); assert.equal(M[id].height, 2);
        assert.deepEqual(M[id].hitbox, { xOffset: 0, yOffset: -1, w: 2, h: 2 }, `${id}: solid over both tiles of both rows`);
        assert.ok(fs.existsSync(fileOf(M[id].sheet)), `${id}: its picture is a real file`);
    }
    assert.deepEqual(M.RUINED_CARRIAGE.interaction, { type: 'ENCOUNTER', id: 'ruined_carriage' });
    assert.ok(!M.RUINED_CARRIAGE_LOOTED.interaction, 'an emptied wreck has nothing more to give');
    assert.ok(fs.existsSync(fileOf('encounter_ruined_carriage')));
    // its band does not overlap any other band of the same plains list
    const lists = Object.values(BIOME_DEFINITIONS.PLAINS.mapObjects).filter(Array.isArray);
    const list = lists.find(l => l.some(r => r.id === 'RUINED_CARRIAGE'));
    assert.ok(list, 'the plains spawn it');
    const band = (r) => [r.rangeStart ?? 0, r.chance];
    const [a0, a1] = band(list.find(r => r.id === 'RUINED_CARRIAGE'));
    assert.ok(a1 - a0 > 0 && a1 - a0 <= 0.001, 'rare');
    for (const r of list) if (r.id !== 'RUINED_CARRIAGE' && r.rangeStart !== undefined) {
        const [b0, b1] = band(r);
        assert.ok(a1 <= b0 || b1 <= a0, `no overlap with ${r.id || r.pool}`);
    }
});

test('searching or prying can make the party rich: a large purse, the strongbox, a merchant\'s goods; looted, the wreck stays empty', () => {
    const coins = all(E).filter(r => r.type === 'MODIFY_CURRENCY').map(r => r.payload.amount);
    assert.ok(coins.length >= 3 && coins.every(a => a >= 250), `large sums: ${coins}`);
    assert.ok(all(E.stages.found_valuables).some(r => r.type === 'ROLL_LOOT_TABLE' && r.payload.lootTableId === 'ruined_carriage_valuables'));
    for (const it of L.ruined_carriage_valuables.items) assert.ok(I[it.id], `${it.id} is a real item`);
    for (const s of ['found_gold', 'found_valuables', 'strongbox_open']) {
        for (const o of E.stages[s].decisions[0].outcomes) {
            assert.ok(o.results.some(r => r.type === 'REPLACE_OBJECT' && r.payload.objectId === 'RUINED_CARRIAGE_LOOTED'), `${s}: the wreck is left empty`);
        }
    }
});

test('a bad search or a noisy strongbox brings a herd of shackled steeds; reading the hoofprints first lets a failed search slip away', () => {
    const search = decision('discovery', /^\[DEX\] Search the carriage\.$/);
    assert.ok(search.failureOutcomes.some(o => o.results.some(r => r.payload && r.payload.stageId === 'steeds')));
    const pry = decision('discovery', /Pry open the strongbox/);
    assert.equal(pry.attribute, 'strength');
    assert.equal(pry.failureOutcomes[0].results[0].payload.stageId, 'strongbox_noise');
    for (const s of ['steeds', 'strongbox_noise']) {
        const fights = all(E.stages[s]).filter(r => r.type === 'START_BATTLE');
        assert.ok(fights.length >= 2, `${s}: the herd's size varies`);
        for (const f of fights) {
            assert.ok(f.payload.enemies.length >= 2 && f.payload.enemies.every(e => e === 'SHACKLED_STEED'), `${s}: a party of shackled steeds`);
            assert.ok(f.payload.bgm);
        }
    }
    // the quiet search is only offered once the prints have been read, and its failure is no fight
    const quietly = decision('discovery', /quietly/);
    assert.equal(EncounterLogic.checkConditions(quietly, {}), false);
    assert.equal(EncounterLogic.checkConditions(quietly, { knows_steeds: true }), true);
    assert.equal(EncounterLogic.checkConditions(search, { knows_steeds: true }), false, 'the loud search gives way to it');
    assert.ok(!all(quietly.failureOutcomes).some(r => r.type === 'START_BATTLE'));
    assert.ok(all(E.stages.slip_away).every(r => r.type !== 'START_BATTLE'));
});

test('the Shmindolyn\'s Draught: found in the carriage, it cures the last bad trait, leaves the good ones, and is kept when there is nothing to cure', () => {
    const item = I.shmindolyns_draught;
    assert.equal(item.type, 'consumable');
    assert.equal(item.useAbility, 'shmindolyns_draught');
    assert.deepEqual(item.usability, ['overworld']);
    assert.equal(A.shmindolyns_draught.context, 'overworld');
    assert.ok(all(E.stages.strongbox_open).some(r => r.type === 'GIVE_ITEM' && r.payload.itemId === 'shmindolyns_draught'), 'always in the strongbox');
    assert.ok(L.ruined_carriage_valuables.items.some(i => i.id === 'shmindolyns_draught'), 'and among the merchant\'s goods');

    const hero = quiet(() => EntityFactory.create('HUMANOID', { name: 'Aldric', traits: ['quick', 'frail', 'tough', 'myopic'] }));
    const drink = () => quiet(() => AbilitySystem.execute('shmindolyns_draught', hero, hero, { context: 'overworld' }));
    let r = drink();
    assert.ok(r.success);
    assert.match(r.message, /no longer Myopic/, 'the most recent bad trait goes first');
    assert.deepEqual([...hero.traits], ['quick', 'frail', 'tough']);
    r = drink();
    assert.deepEqual([...hero.traits], ['quick', 'tough'], 'then the next');
    r = drink();
    assert.equal(r.success, false, 'nothing left to cure: the draught is not spent');
    assert.deepEqual([...hero.traits], ['quick', 'tough'], 'good traits are never touched');
    assert.ok(SCAR_TRAITS.length >= 7);
});
