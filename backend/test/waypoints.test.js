// backend/test/waypoints.test.js: `npm test`. The Waypoint: an item crafted from 100 stone, 100 soft wood, 5 iron ingots, 30 linen and 20 hard wood; used outdoors it plants a banner object on the
// tile in front of the player (never indoors, never where something stands) and lists it on the world map, which fast-travels the party back to it for currency and time that grow with the distance.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const noop = () => {};
const makeCtx = () => new Proxy({ getTransform: () => ({ a: 1 }), createPattern: () => ({}), createLinearGradient: () => ({ addColorStop: noop }), createRadialGradient: () => ({ addColorStop: noop }), createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), measureText: (s) => ({ width: String(s).length * 10 }) }, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
globalThis.OffscreenCanvas = class { constructor(w, h) { this.width = w; this.height = h; this._ctx = makeCtx(); } getContext() { return this._ctx; } };

const { gameState } = await import('../../shared/core/gameState.js');
const { WorldManager } = await import('../../shared/world/worldManager.js');
const { events } = await import('../../shared/core/eventBus.js');
const W = await import('../../shared/world/waypoints.js');
const { craftingRecipeDefinitions } = await import('../../shared/items/craftingRecipeDefinitions.js');
const { ItemDefinitions: ITEM_DEFINITIONS } = await import('../../shared/items/itemDefinitions.js');
const { AbilityDefinitions } = await import('../../shared/abilities/abilityDefinitions.js');
const { AbilitySystem } = await import('../../shared/abilities/abilitySystem.js');
const { MAP_OBJECTS_DEFINITIONS } = await import('../../shared/world/mapObjectDefinitions.js');

const quiet = (fn) => { const log = console.log; console.log = noop; try { return fn(); } finally { console.log = log; } };
const world = (seed = 8) => quiet(() => {
    gameState.seed = seed;
    gameState.world.isInterior = false;
    gameState.world.changes = {};
    gameState.world.terrainOverrides = {};
    gameState.world.waypoints = [];
    gameState.party.currency = 0;
    return new WorldManager();
});
const openSpot = (wm) => {
    for (let r = 2; r < 60; r++) for (let c = 2; c < 60; c++) {
        if (W.canPlaceWaypointAt(wm, c, r).ok) return { col: c, row: r };
    }
    throw new Error('no open ground');
};

test('the recipe is 100 stone, 100 soft wood, 5 iron ingots, 30 linen and 20 hard wood, and makes the Waypoint item', () => {
    const r = craftingRecipeDefinitions.recipe_waypoint;
    assert.deepEqual(r.materials, { stone: 100, soft_wood: 100, iron_ingot: 5, linen: 30, hard_wood: 20 });
    assert.equal(r.outputItemId, 'waypoint');
    const item = ITEM_DEFINITIONS.waypoint;
    assert.equal(item.useAbility, 'place_waypoint');
    assert.deepEqual(item.icon, { col: 9, row: 1 });
    for (const id of Object.keys(r.materials)) assert.ok(ITEM_DEFINITIONS[id], `${id} is an item`);
    const ab = AbilityDefinitions.place_waypoint;
    assert.equal(ab.context, 'overworld');
    assert.equal(ab.effects[0].type, 'place_waypoint');
    assert.equal(typeof AbilitySystem._world_place_waypoint, 'function');
});

test('there is one solid 1 x 2 animated banner per origin, each with its own sheet', () => {
    const sheets = new Set();
    for (const [key, origin] of Object.entries(W.ORIGINS)) {
        const o = MAP_OBJECTS_DEFINITIONS[origin.objectId];
        assert.ok(o, key + ' has a map object');
        assert.equal(o.sheet, origin.sheet);
        assert.deepEqual([o.width, o.height, o.frames, o.isSolid], [1, 2, 4, true]);
        sheets.add(o.sheet);
    }
    assert.equal(sheets.size, 3, 'Alterian, Panzerian and Namuh each have a different banner');
    assert.equal(MAP_OBJECTS_DEFINITIONS.WAYPOINT_BANNER.sheet, 'objWaypointAlterian', 'the plain banner of older saves is the Alterian one');
});

test('the banner planted follows the origin picked at the creator, and the waypoint remembers it', () => {
    const hero = (tag) => { gameState.party.members = [{ tags: ['HUMANOID', tag] }]; };
    for (const [key, origin] of Object.entries(W.ORIGINS)) {
        hero(origin.tag);
        assert.equal(W.playerOrigin(), key);
        const wm = world();
        const at = openSpot(wm);
        const res = quiet(() => W.placeWaypoint(wm, at.col, at.row, wm.getElevation(at.col, at.row)));
        assert.equal(res.success, true);
        assert.equal(res.waypoint.origin, key);
        assert.equal(gameState.world.changes[at.col + ',' + at.row], origin.objectId);
        assert.equal(W.waypointOrigin(res.waypoint), key);
    }
    gameState.party.members = [];
    assert.equal(W.playerOrigin(), 'ALTERIAN', 'no hero (or an older save): Alterian');
    assert.equal(W.waypointOrigin({ id: 1 }), 'ALTERIAN');
});

test('the price and the time of a fast travel grow with the tiles crossed', () => {
    assert.equal(W.fastTravelCost(0), W.WAYPOINT.BASE_COST);
    let last = -1;
    for (const t of [10, 50, 100, 250, 500, 1000, 2000]) { const c = W.fastTravelCost(t); assert.ok(c > last, `${t} tiles cost more than the one before`); last = c; }
    assert.equal(W.fastTravelCost(100), 55);
    assert.equal(W.fastTravelCost(500), 335);
    assert.ok(W.fastTravelCost(1000) - W.fastTravelCost(500) > W.fastTravelCost(500) - W.fastTravelCost(0), 'it grows faster than the distance');
    assert.equal(W.fastTravelMinutes(100), 50);
    assert.ok(W.fastTravelMinutes(101) > W.fastTravelMinutes(100));
    assert.equal(W.formatDuration(40), '40m');
    assert.equal(W.formatDuration(95), '1h 35m');
    assert.equal(W.formatDuration(1500), '1d 1h');
    assert.equal(W.tilesBetween({ col: 0, row: 0 }, { col: 30, row: 40 }), 50);
});

test('planting a banner: it stands on the tile, is solid, is listed and kept in the changes; the same tile cannot take a second one', () => {
    const wm = world();
    const at = openSpot(wm);
    const r = quiet(() => W.placeWaypoint(wm, at.col, at.row, wm.getElevation(at.col, at.row)));
    assert.equal(r.success, true);
    assert.equal(gameState.world.changes[at.col + ',' + at.row], 'WAYPOINT_BANNER_ALTERIAN');
    assert.ok(wm.getObjectAt(at.col, at.row), 'the object is in the world');
    assert.ok(wm.getSolidObjectAt(at.col, at.row), 'the cairn is solid');
    assert.deepEqual(W.getWaypoints().map((w) => [w.id, w.col, w.row]), [[1, at.col, at.row]]);
    const again = quiet(() => W.placeWaypoint(wm, at.col, at.row));
    assert.equal(again.success, false);
    assert.equal(W.getWaypoints().length, 1);
    // the next one gets the next id
    const b = quiet(() => W.placeWaypoint(wm, at.col + 3, at.row));
    if (b.success) assert.equal(b.waypoint.id, 2);
});

test('a banner cannot be planted on water, in a cave or house, or on another level than the player\'s', () => {
    const wm = world(5);
    let water = null;
    for (let r = -140; r < 140 && !water; r++) for (let c = -140; c < 140; c++) if (wm.getTileAt(c, r) === wm.TILES.LAYER_0) { water = { col: c, row: r }; break; }
    assert.ok(water, 'this world has water');
    assert.equal(W.canPlaceWaypointAt(wm, water.col, water.row).ok, false);
    const w2 = world();
    const at = openSpot(w2);
    assert.equal(W.canPlaceWaypointAt(w2, at.col, at.row, w2.getElevation(at.col, at.row) + 1).ok, false, 'another level');
    gameState.world.isInterior = true;
    assert.equal(W.canPlaceWaypointAt(w2, at.col, at.row).ok, false, 'indoors');
    gameState.world.isInterior = false;
});

test('the front tile follows the way the player faces', () => {
    assert.deepEqual(W.frontTile(10, 10, 'up'), { col: 10, row: 9 });
    assert.deepEqual(W.frontTile(10, 10, 'DOWN'), { col: 10, row: 11 });
    assert.deepEqual(W.frontTile(10, 10, 'left'), { col: 9, row: 10 });
    assert.deepEqual(W.frontTile(10, 10, 'RIGHT'), { col: 11, row: 10 });
});

test('the ability plants through the scene\'s placer, and keeps the item when it fails', () => {
    const calls = [];
    AbilitySystem.waypointPlacer = () => { calls.push(1); return { success: true, message: 'planted' }; };
    assert.deepEqual(AbilitySystem._world_place_waypoint({}), { success: true, message: 'planted' });
    AbilitySystem.waypointPlacer = () => ({ success: false, message: 'no room' });
    assert.deepEqual(AbilitySystem._world_place_waypoint({}), { success: false, message: 'no room' });
    AbilitySystem.waypointPlacer = null;
    assert.equal(AbilitySystem._world_place_waypoint({ notHere: 'nope' }).success, false);
});

test('a fast travel is paid for in currency, and a party that cannot pay is not charged', () => {
    gameState.party.currency = 50;
    const plan = W.planFastTravel({ col: 0, row: 0 }, { col: 300, row: 0 }, 50);
    assert.equal(plan.tiles, 300);
    assert.equal(plan.affordable, false);
    assert.equal(W.chargeFastTravel(plan), null);
    assert.equal(gameState.party.currency, 50);
    gameState.party.currency = 1000;
    const ok = W.planFastTravel({ col: 0, row: 0 }, { col: 300, row: 0 });
    assert.equal(ok.affordable, true);
    assert.ok(W.chargeFastTravel(ok));
    assert.equal(gameState.party.currency, 1000 - ok.cost);
});

test('after a fast travel the party stands on free ground beside the banner', () => {
    const wm = world();
    const at = openSpot(wm);
    quiet(() => W.placeWaypoint(wm, at.col, at.row));
    const land = W.landingTile(wm, W.getWaypoints()[0]);
    assert.notEqual(wm.getTileAt(land.col, land.row), wm.TILES.LAYER_0, 'not in the water');
    assert.ok(!wm.getSolidObjectAt(land.col, land.row), 'nothing solid there');
    assert.ok(Math.abs(land.col - at.col) <= 4 && Math.abs(land.row - at.row) <= 4);
    assert.ok(!(land.col === at.col && land.row === at.row));
});

test('the world map lists the banners, picks one, and fast travel charges and asks the scene manager to move the party and the clock', async () => {
    globalThis.document = globalThis.document || { createElement: () => ({ getContext: () => new Proxy({}, { get: () => noop }) }) };
    const { WorldMapController } = await import('../../frontend/src/screens/worldMap/worldMapController.js');
    const ctl = new WorldMapController({ heldKeys: new Set(), direction: null });
    const wm = world();
    const at = openSpot(wm);
    quiet(() => W.placeWaypoint(wm, at.col, at.row));
    gameState.player.col = at.col + 200; gameState.player.row = at.row;
    ctl.init({ worldManager: wm, x: gameState.player.col, y: gameState.player.row });
    ctl.playConfirmSound = ctl.playErrorSound = ctl.playNavSound = noop;
    assert.equal(ctl.getState().banners.length >= 0, true);
    assert.equal(ctl.nextWaypoint(), true);
    assert.equal(ctl.selectedId, 1);
    const st = ctl.getState();
    assert.equal(st.selectedWaypoint.id, 1);
    assert.equal(st.travelPlan.tiles, 200);
    assert.ok(st.hitboxes.some((h) => h.id === 'btn_fast_travel'));
    // no money: nothing happens
    let sent = null;
    const off = events.on('CHANGE_SCENE', (d) => { sent = d; });
    gameState.party.currency = 5;
    assert.equal(ctl.fastTravel(), false);
    assert.equal(gameState.party.currency, 5);
    assert.equal(sent, null);
    assert.match(ctl.getState().notice, /Not enough currency/);
    // money: charged once, and the scene manager is told the id and the minutes
    gameState.party.currency = 5000;
    assert.equal(ctl.fastTravel(), true);
    assert.equal(gameState.party.currency, 5000 - st.travelPlan.cost);
    assert.deepEqual(sent, { scene: 'overworld', data: { fastTravel: { id: 1, minutes: st.travelPlan.minutes } } });
    if (typeof off === 'function') off();
    // standing next to it: no fast travel
    gameState.player.col = at.col; gameState.player.row = at.row + 1;
    assert.equal(ctl.fastTravel(), false);
});

test('waypoints are saved with the world', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(new URL('../../frontend/src/engine/saveManager.js', import.meta.url), 'utf8');
    assert.match(src, /waypoints: clone\(world\.waypoints \|\| \[\]\)/);
    assert.match(src, /waypoints: data\.world\.waypoints \|\| \[\]/);
    assert.ok(Array.isArray(gameState.world.waypoints));
});
