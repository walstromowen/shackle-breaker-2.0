// backend/test/multiplayersave.test.js: `npm test`. A save cut into the shared world and one player's own part, and put back (shared/core/multiplayerSave.js),
// and a map change from another player landing in this player's world (WorldManager worldSync / applyRemoteChange).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { worldPart, playerPart, mergeParts, placeOnOverworld, overworldSeed } from '../../shared/core/multiplayerSave.js';
import { gameState } from '../../shared/core/gameState.js';
import { WorldManager, worldSync } from '../../shared/world/worldManager.js';

const hostData = () => ({
    seed: 4242, difficulty: 'hard', cheats: false, milestones: ['act2'],
    quests: { active: { q1: {} }, completed: ['q0'], trackedIds: ['q1'] },
    player: { col: 10, row: 12, direction: 'LEFT', hotbar: [], buffs: {} },
    world: { time: 600, day: 9, currentBiome: 'plains', changes: { '1,2': null, 'searched:3,4': true }, terrainOverrides: { '5,5': 2 }, villageStairs: [], levelPaths: {},
        waypoints: [{ id: 'w1' }], discoveredChunks: ['0,0'], structureChunks: { '0,0': true }, weather: { id: 'rain' }, interior: null },
    party: { members: [{ name: 'Host' }], inventory: [{ defId: 'dagger' }], currency: 55, unlockedCraftingRecipes: [] },
    shops: { s1: { stock: 3 } },
});

test('the world part is what everyone shares; the player part is what is one player\'s own', () => {
    const d = hostData();
    const w = worldPart(d), p = playerPart(d);
    assert.equal(w.seed, 4242);
    assert.deepEqual(w.world.changes, d.world.changes);
    assert.equal(w.world.day, 9);
    assert.equal(w.shops.s1.stock, 3);
    assert.equal(w.party, undefined, 'no party in the world part');
    assert.equal(p.party.currency, 55);
    assert.deepEqual(p.milestones, ['act2']);
    assert.equal(p.world.changes, undefined, 'no map changes in the player part');
});

test('a guest\'s party put into the host\'s world loads the host\'s map with the guest\'s characters', () => {
    const host = hostData();
    const guest = { ...hostData(), seed: 1, milestones: [], party: { members: [{ name: 'Guest' }], inventory: [], currency: 7, unlockedCraftingRecipes: [] },
        world: { ...hostData().world, changes: { 'x': 1 }, day: 1 } };
    const merged = mergeParts(worldPart(host), placeOnOverworld(playerPart(guest), 10, 13));
    assert.equal(merged.seed, 4242, 'the host\'s world');
    assert.deepEqual(merged.world.changes, host.world.changes, 'the host\'s map changes');
    assert.equal(merged.world.day, 9, 'the host\'s clock');
    assert.equal(merged.party.members[0].name, 'Guest');
    assert.equal(merged.party.currency, 7);
    assert.deepEqual([merged.player.col, merged.player.row], [10, 13], 'placed beside the host');
    assert.equal(merged.world.interior, null);
});

test('a player saved inside a house keeps the house, in the host\'s world', () => {
    const d = { ...hostData(), seed: 999, world: { ...hostData().world, interior: { type: 'house', id: 'h1', savedOverworld: { seed: 4242, returnCol: 3, returnRow: 4 } } } };
    assert.equal(overworldSeed(d), 4242);
    assert.equal(worldPart(d).seed, 4242, 'the shared world is the overworld, not the house');
    const merged = mergeParts(worldPart(hostData()), playerPart(d));
    assert.equal(merged.seed, 999, 'the house\'s seed while inside it');
    assert.equal(merged.world.interior.savedOverworld.seed, 4242);
});

test('a change made on the map is reported to the other players; one that arrives from them is not reported back', () => {
    const wm = Object.create(WorldManager.prototype);
    wm.CHUNK_SIZE = 16;
    wm.objects = new Map(); wm._collisionMap = new Map();
    const unloaded = [];
    wm._unloadChunk = (k) => unloaded.push(k);
    gameState.world.changes = {};
    gameState.world.isInterior = false;
    const sent = [];
    worldSync.onLocalChange = (key, value) => sent.push([key, value]);
    try {
        wm.modifyWorld(20, 5, null);
        wm.markSearched(1, 1);
        assert.deepEqual(sent, [['20,5', null], ['searched:1,1', true]]);
        sent.length = 0;
        wm.applyRemoteChange('40,-3', null);
        assert.equal(gameState.world.changes['40,-3'], null);
        assert.deepEqual(unloaded, ['2,-1'], 'the chunk holding the cell is built again');
        wm.applyRemoteChange('INT_h9_2,2', true);
        assert.equal(unloaded.length, 1, 'a house this player is not in is only written down');
        wm.applyRemoteChange('40,-3', '__deleted__');
        assert.equal('40,-3' in gameState.world.changes, false);
        assert.deepEqual(sent, [], 'nothing echoed back');
    } finally {
        worldSync.onLocalChange = null;
    }
});

test("a guest gets the host world's Cheats setting, so the developer console works for everyone in a world made with Cheats on", async () => {
    const { worldPart, playerPart, mergeParts } = await import('../../shared/core/multiplayerSave.js');
    const host = { seed: 7, difficulty: 'normal', cheats: true, world: { changes: {} }, party: { members: [] }, player: { col: 0, row: 0 } };
    const guestOwn = { seed: 9, cheats: false, world: {}, party: { members: [] }, player: { col: 1, row: 1 } };   // the guest's creator said Off
    assert.equal(mergeParts(worldPart(host), playerPart(guestOwn)).cheats, true, 'the world decides');
    assert.equal(mergeParts(worldPart({ ...host, cheats: false }), playerPart({ ...guestOwn, cheats: true })).cheats, false, 'a guest cannot turn it on in a world without it');
});
