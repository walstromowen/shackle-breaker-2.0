// backend/test/mapnames.test.js: `npm test`. The player names their own markers and waypoints on the world map (R, or the Rename button): typed
// into a name box that takes every key, Enter keeps it, Esc leaves it as it was, and an empty name gives the place back its own. Names travel with a
// party's shared waypoints. And a cave spider is not Acidic in the first act.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameState } from '../../shared/core/gameState.js';
import { addMarker, renameMarker, cleanMapName, MAP_NAME_MAX } from '../../shared/world/mapMarkers.js';
import { renameWaypoint, waypointName, allWaypoints, WAYPOINT_SHARING } from '../../shared/world/waypoints.js';
import { WorldMapController } from '../../frontend/src/screens/worldMap/worldMapController.js';
import { EntityFactory } from '../../shared/characters/entityFactory.js';
import { ActSystem } from '../../shared/story/actSystem.js';

const quiet = (fn) => { const l = console.log, w = console.warn; console.log = console.warn = () => {}; try { return fn(); } finally { console.log = l; console.warn = w; } };
const key = (c, k) => c.handleKeyDown(k.length === 1 ? 'Key' + k.toUpperCase() : k, { code: k.length === 1 ? (k === ' ' ? 'Space' : 'Key' + k.toUpperCase()) : k, key: k, preventDefault() {} });
const type = (c, text) => { for (const ch of text) key(c, ch); };

test('names: cleaned, cut to the most a name holds, and empty gives the place back its own', () => {
    assert.equal(cleanMapName('  The   old <castle>!  '), 'The old castle!');
    assert.equal(cleanMapName('x'.repeat(60)).length, MAP_NAME_MAX);
    const world = { mapMarkers: [], waypoints: [{ id: 2, col: 5, row: 5, biome: 'PLAINS' }] };
    const m = addMarker(1, 1, {}, world);
    assert.equal(renameMarker(m.id, 'Castle', world).label, 'Castle');
    assert.equal(renameMarker(m.id, '   ', world).label, 'Marker 1', 'empty: its own name again');
    const wp = renameWaypoint(2, 'Home', world);
    assert.equal(waypointName(wp), 'Home');
    renameWaypoint(2, '', world);
    assert.equal(waypointName(world.waypoints[0]), 'Waypoint 2 · Plains');
});

test('a party member\'s waypoint shows their name for it, cleaned, under whose it is', () => {
    const keep = WAYPOINT_SHARING.others;
    gameState.world.waypoints = [];
    WAYPOINT_SHARING.others = () => [{ owner: 'p2', ownerName: 'Ana', waypoints: [{ id: 1, col: 9, row: 9, biome: 'PLAINS', name: 'Camp<b>' }] }];
    try {
        const theirs = allWaypoints().find(w => w.owner === 'p2');
        assert.equal(waypointName(theirs), "Ana's Campb");
    } finally { WAYPOINT_SHARING.others = keep; }
});

test('the world map: R names the picked pin; the box takes every key (W A S D type, they do not pan); Enter keeps it, Esc does not', () => {
    gameState.world.mapMarkers = [];
    gameState.world.waypoints = [];
    gameState.world.isInterior = false;
    const held = new Set();
    const c = new WorldMapController({ heldKeys: held, isMouseDown: false, mouse: { x: 0, y: 0 } });
    quiet(() => c.init({ x: 100, y: 200 }));
    const m = quiet(() => c.markHere());
    assert.ok(m && c.selectedMarker(), 'a pin, picked');
    assert.ok(c.getState().hitboxes.some(h => h.id === 'btn_rename' && h.label === 'Rename'), 'a Rename button on its panel');
    quiet(() => key(c, 'KeyR'));
    assert.ok(c.naming, 'R opens the name box');
    assert.equal(c.naming.input.value, 'Marker 1', 'filled with its name now');
    for (let i = 0; i < 8; i++) quiet(() => key(c, 'Backspace'));
    const cx = c.cx;
    held.add('KeyD');
    quiet(() => type(c, 'Dead Wood'));
    c.update(0.5);
    held.delete('KeyD');
    assert.equal(c.cx, cx, 'D typed a letter, it did not pan the map');
    assert.equal(c.naming.input.value, 'Dead Wood');
    const st = c.getState();
    assert.equal(st.naming.text, 'Dead Wood');
    assert.ok(st.hitboxes.some(h => h.id === 'name_box'));
    quiet(() => key(c, 'Enter'));
    assert.equal(c.naming, null);
    assert.equal(c.selectedMarker().label, 'Dead Wood');
    // Esc leaves it as it was
    quiet(() => key(c, 'KeyR'));
    quiet(() => type(c, 'xyz'));
    quiet(() => key(c, 'Escape'));
    assert.equal(c.selectedMarker().label, 'Dead Wood');
    assert.ok(c.getState(), 'and the map is still open (Esc closed the box, not the map)');
});

test('the world map: my own waypoint can be renamed, a party member\'s cannot', () => {
    const keep = WAYPOINT_SHARING.others;
    gameState.world.mapMarkers = [];
    gameState.world.waypoints = [{ id: 1, col: 110, row: 200, biome: 'PLAINS', origin: 'ALTERIAN' }];
    WAYPOINT_SHARING.others = () => [{ owner: 'p2', ownerName: 'Ana', waypoints: [{ id: 1, col: 120, row: 210, biome: 'PLAINS' }] }];
    try {
        const c = new WorldMapController({ heldKeys: new Set(), isMouseDown: false, mouse: { x: 0, y: 0 } });
        quiet(() => c.init({ x: 100, y: 200 }));
        quiet(() => c.select(1));
        quiet(() => c.onClick('btn_rename'));
        quiet(() => type(c, 'Home'));
        quiet(() => c.onClick(null));   // a click elsewhere keeps the name
        assert.equal(gameState.world.waypoints[0].name, 'Home');
        assert.equal(c.getState().selectedWaypoint.name, 'Home');
        quiet(() => c.select('p2:1'));
        assert.ok(!c.getState().hitboxes.some(h => h.id === 'btn_rename'), 'no Rename for a party member\'s');
        assert.equal(quiet(() => c.startRename()), false);
    } finally { WAYPOINT_SHARING.others = keep; }
});

test('a cave spider is not Acidic in the first act; from the second it is', () => {
    const keep = JSON.parse(JSON.stringify(gameState.world.milestones || []));
    const traitsOf = (e) => e.traits || e.state.traits || [];
    try {
        gameState.world.milestones = [];
        assert.equal(ActSystem.getAct(), 1);
        assert.ok(!traitsOf(quiet(() => EntityFactory.create('CAVE_SPIDER', 3))).includes('acidic'), 'act 1: no acid');
        ActSystem.grantMilestone('arc_knight_slain');
        assert.equal(ActSystem.getAct(), 2);
        assert.ok(traitsOf(quiet(() => EntityFactory.create('CAVE_SPIDER', 3))).includes('acidic'), 'act 2: acid');
    } finally { gameState.world.milestones = keep; }
});
