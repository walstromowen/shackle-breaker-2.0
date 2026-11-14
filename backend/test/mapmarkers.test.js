// backend/test/mapmarkers.test.js: `npm test`. The player's own pins on the map (shared/world/mapMarkers.js, the world map screen).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameState } from '../../shared/core/gameState.js';
import { addMarker, removeMarker, cycleMarkerColor, markersOn, getMarkers, MARKER_MAX, MARKER_COLORS } from '../../shared/world/mapMarkers.js';
import { playerPart, worldPart, mergeParts } from '../../shared/core/multiplayerSave.js';
import { WorldMapController, VIEW } from '../../frontend/src/screens/worldMap/worldMapController.js';

const quiet = (fn) => { const l = console.log, w = console.warn; console.log = console.warn = () => {}; try { return fn(); } finally { console.log = l; console.warn = w; } };

test('markers: one per tile and map, colours in turn, removable, at most MARKER_MAX', () => {
    const world = { mapMarkers: [] };
    const a = addMarker(10.7, 20.2, {}, world);
    assert.deepEqual([a.col, a.row, a.label, a.map, a.color], [10, 20, 'Marker 1', null, MARKER_COLORS[0].id]);
    assert.equal(addMarker(10, 20, {}, world), null, 'one pin a tile');
    const b = addMarker(10, 20, { mapId: 'INT_cave_1' }, world);
    assert.ok(b && b.color === MARKER_COLORS[1].id, 'the same tile of a cave\'s map is another place; the next colour');
    assert.equal(markersOn(null, world).length, 1);
    assert.equal(markersOn('INT_cave_1', world).length, 1);
    assert.equal(cycleMarkerColor(a.id, world).color, MARKER_COLORS[1].id);
    assert.ok(removeMarker(a.id, world));
    assert.equal(markersOn(null, world).length, 0);
    for (let i = 0; getMarkers(world).length < MARKER_MAX; i++) addMarker(i, 0, {}, world);
    assert.equal(addMarker(999, 999, {}, world), null, 'a full map takes no more');
});

test('markers stay with the player, not the shared world', () => {
    const data = { seed: 1, player: {}, party: {}, world: { waypoints: [], mapMarkers: [{ id: 1, col: 3, row: 4, color: 'gold', label: 'Marker 1', map: null }], changes: {} } };
    const mine = playerPart(data), world = worldPart(data);
    assert.equal(mine.world.mapMarkers.length, 1);
    assert.equal(world.world.mapMarkers, undefined);
    assert.equal(mergeParts(world, mine).world.mapMarkers[0].col, 3);
});

test('the world map: Add Marker then a click pins the tile under the pointer; a pin is picked, recoloured and removed', () => {
    gameState.world.mapMarkers = [];
    gameState.world.isInterior = false;
    const c = new WorldMapController({ heldKeys: new Set(), isMouseDown: false, mouse: { x: 0, y: 0 } });
    quiet(() => c.init({ x: 100, y: 200 }));
    c.mouse.x = VIEW.x + VIEW.w / 2 + 40; c.mouse.y = VIEW.y + VIEW.h / 2;   // 40 px right of the middle: 10 tiles at zoom 4
    c.onClick(null);
    assert.equal(getMarkers().length, 0, 'a plain click on the map pins nothing');
    c.onClick('btn_marker');
    assert.ok(c.placing);
    c.onClick(null);
    assert.equal(getMarkers().length, 1);
    assert.deepEqual([getMarkers()[0].col, getMarkers()[0].row], [110, 200]);
    assert.ok(!c.placing && c.selectedMarker(), 'placed and picked');
    const st = c.getState();
    assert.ok(st.pins.length === 1 && st.hitboxes.some(h => h.id === 'mk_1') && st.hitboxes.some(h => h.id === 'btn_marker_remove'));
    const before = getMarkers()[0].color;
    c.onClick('btn_marker_color');
    assert.notEqual(getMarkers()[0].color, before);
    c.handleKeyDown('Delete', { code: 'Delete', key: 'Delete', preventDefault() {} });
    assert.equal(getMarkers().length, 0, 'Delete removes the picked pin');
    c.inputMode = 'keyboard';
    c.handleKeyDown('KeyK', { code: 'KeyK', key: 'k', preventDefault() {} });
    assert.deepEqual([getMarkers()[0].col, getMarkers()[0].row], [100, 200], 'K with the keys: the middle of the map');
    c.onClick('btn_marker');
    c.handleKeyDown('Escape', { code: 'Escape', key: 'Escape', preventDefault() {} });
    assert.ok(!c.placing, 'Esc stops placing first');
});
