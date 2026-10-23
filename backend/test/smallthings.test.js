// backend/test/smallthings.test.js: `npm test`. The house's left wall, sticks, house music, the buckler's icon, the starting hour, the wooden club.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { MAP_OBJECTS_DEFINITIONS } from '../../shared/world/mapObjectDefinitions.js';
import { LootTableDefinitions } from '../../shared/items/lootTableDefinitions.js';
import { LootTableFactory } from '../../shared/items/lootTableFactory.js';
import { BIOME_DEFINITIONS } from '../../shared/world/biomeDefinitions.js';
import { biomeFactory } from '../../shared/world/biomeFactory.js';
import { ItemDefinitions } from '../../shared/items/itemDefinitions.js';
import { ItemFactory } from '../../shared/items/itemFactory.js';
import { AbilityDefinitions } from '../../shared/abilities/abilityDefinitions.js';
import { CONFIG } from '../../shared/core/constants.js';
import { gameState } from '../../shared/core/gameState.js';
import { WorldManager } from '../../shared/world/worldManager.js';

const cells = (def) => def.hitboxes.flatMap(h => Array.from({ length: h.w * h.h }, (_, i) => `${h.xOffset + (i % h.w)},${h.yOffset + Math.floor(i / h.w)}`));

test('a house blocks its wall (the two rows ending at its door row) and nothing in front of it', () => {
    for (const id of ['ABANDONED_HOUSE_1', 'ABANDONED_HOUSE_2']) {
        const blocked = cells(MAP_OBJECTS_DEFINITIONS[id]);
        assert.ok(!blocked.some(c => Number(c.split(',')[1]) > 0), `${id} blocks no cell below its door row`);
        for (const c of ['0,-1', '0,0', '2,-1', '3,-1', '2,0', '3,0', '1,-1']) assert.ok(blocked.includes(c), `${id} blocks ${c}`);
        assert.ok(!blocked.includes('1,0'), 'the door cell itself is not blocked');
    }
});

test('in a generated village the cell in front of a house\'s left wall can be walked on', () => {
    gameState.seed = 12; gameState.world.changes = {}; gameState.world.terrainOverrides = {};
    const wm = new WorldManager();
    for (let r = -300; r < 300; r += 8) for (let c = -300; c < 300; c += 8) wm.ensureChunkLoaded(c, r);
    const houses = [...wm.objects.values()].filter(o => o.id === 'ABANDONED_HOUSE_1' || o.id === 'ABANDONED_HOUSE_2');
    assert.ok(houses.length > 5);
    let walked = 0;
    for (const o of houses) {
        // the yard: nothing else stands in front of the left wall except possibly a prop, so test only the plain cells
        if (wm.getObjectAt(o.col, o.row + 1) || wm.getObjectAt(o.col, o.row + 2)) continue;
        assert.ok(wm.canMove(o.col, o.row + 2, o.col, o.row + 1, 'UP'), `cell in front of the wall at ${o.col},${o.row + 1}`);
        assert.ok(!wm.canMove(o.col, o.row + 1, o.col, o.row, 'UP'), 'the wall itself is still solid');
        walked++;
    }
    assert.ok(walked > 3);
});

test('a stick is soft wood three times in four and hard wood one time in four, through a loot table', () => {
    assert.equal(MAP_OBJECTS_DEFINITIONS.STICK.interaction.lootTableId, 'stick_wood');
    const table = LootTableDefinitions.stick_wood;
    assert.equal(table.type, 'weighted');
    const w = Object.fromEntries(table.items.map(i => [i.id, i.weight]));
    assert.deepEqual(w, { soft_wood: 3, hard_wood: 1 });
    const N = 8000; let hard = 0, soft = 0;
    for (let i = 0; i < N; i++) {
        const items = LootTableFactory.generateLoot('stick_wood', 1).items;
        assert.equal(items.length, 1);
        assert.equal(items[0].qty, 1);
        if (items[0].id === 'hard_wood') hard++; else if (items[0].id === 'soft_wood') soft++;
    }
    assert.equal(hard + soft, N);
    assert.ok(Math.abs(hard / N - 0.25) < 0.03, `hard wood share ${(hard / N).toFixed(3)}`);
    assert.ok(ItemDefinitions.soft_wood && ItemDefinitions.hard_wood);
});

test('the pickup code rolls the loot table of a pickup that has one', () => {
    const src = fs.readFileSync(new URL('../../frontend/src/screens/overworld/overworldController.js', import.meta.url), 'utf8');
    assert.match(src, /interaction\.lootTableId/);
    assert.match(src, /LootTableFactory\.generateLoot\(targetObj\.interaction\.lootTableId/);
});

test('inside a house the plains\' music plays, day and night', () => {
    const house = biomeFactory.getBiome('HOUSE_INTERIOR');
    for (const hour of [3, 7, 10, 13, 17, 19, 22]) assert.equal(house.getMusic(hour, false), biomeFactory.getBiome('PLAINS').getMusic(hour, false), `hour ${hour}`);
    assert.equal(BIOME_DEFINITIONS.HOUSE_INTERIOR.music.battle, 'houseInteriorBattleBgm');
});

test('the wooden buckler uses column 0 row 2 of the weapon sheet', () => {
    assert.deepEqual(ItemDefinitions.wooden_buckler.icon, { col: 0, row: 2 });
});

test('a new game starts at 10:00, two hours before noon, and the creator resets the clock', () => {
    assert.equal(CONFIG.START_TIME_MINUTES, 10 * 60);
    const creator = fs.readFileSync(new URL('../../frontend/src/screens/characterCreator/characterCreatorLogic.js', import.meta.url), 'utf8');
    assert.match(creator, /gameState\.world\.time = CONFIG\.START_TIME_MINUTES/);
    const time = fs.readFileSync(new URL('../../shared/world/timeSystem.js', import.meta.url), 'utf8');
    assert.match(time, /gameState\.world\.time = CONFIG\.START_TIME_MINUTES/);
});

test('the wooden club is a one-handed blunt weapon that learns rally, reckless charge and wild swing as it is upgraded', () => {
    const def = ItemDefinitions.wooden_club;
    assert.ok(def);
    assert.equal(def.type, 'weapon');
    assert.equal(def.slot, 'oneHand');
    assert.deepEqual(def.icon, { col: 11, row: 0 });
    assert.ok(def.attack.blunt > ItemDefinitions.wooden_stick.attack.blunt);
    assert.deepEqual(def.grantedAbilities, ['strike']);
    assert.deepEqual(def.abilityUnlocks, { 2: ['rally'], 3: ['reckless_charge'], 4: ['wild_swing'] });
    for (const id of ['strike', 'rally', 'reckless_charge', 'wild_swing']) assert.ok(AbilityDefinitions[id], id + ' exists');
    for (let lvl = 2; lvl <= def.maxLevel; lvl++) assert.ok(def.upgradeCosts[lvl], `upgrade to ${lvl} has a cost`);

    const at = (level) => ItemFactory.createItem('wooden_club', { level }).grantedAbilities;
    assert.deepEqual(at(1), ['strike']);
    assert.deepEqual(at(2), ['strike', 'rally']);
    assert.deepEqual(at(3), ['strike', 'rally', 'reckless_charge']);
    assert.deepEqual(at(4), ['strike', 'rally', 'reckless_charge', 'wild_swing']);
    assert.deepEqual(at(5), at(4));
});
