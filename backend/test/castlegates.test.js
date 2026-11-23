// backend/test/castlegates.test.js: `npm test`. Every way into a ruined castle is a gate with its gatehouse, and the inner ward has its own: all open for
// now (act 4 is not in the game yet); shut, a gatehouse shows its portcullis down and the way through it is barred.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { gameState } = await import('../../shared/core/gameState.js');
const { WorldManager } = await import('../../shared/world/worldManager.js');
const { CASTLE_SITES } = await import('../../shared/world/castleSites.js');
const { MAP_OBJECTS_DEFINITIONS } = await import('../../shared/world/mapObjectDefinitions.js');

test('every castle gate is open for now; shut, a gate shows its closed frame and bars the way (outer: before act 5, inner: until opened)', () => {
    assert.equal(CASTLE_SITES.GATES_SHUT, false, 'the outer gates open (act 4 is not in the game yet)');
    assert.equal(CASTLE_SITES.INNER_SHUT, false, 'the inner gates open');
    assert.equal(CASTLE_SITES.OPEN_ACT, 5);
    for (const id of ['CASTLE_GATEHOUSE', 'CASTLE_GATEHOUSE_INNER']) assert.equal(MAP_OBJECTS_DEFINITIONS[id].frames, 2, `${id}: open and closed`);
    assert.equal(MAP_OBJECTS_DEFINITIONS.CASTLE_GATEHOUSE.castleGate, 'outer');
    assert.equal(MAP_OBJECTS_DEFINITIONS.CASTLE_GATEHOUSE_INNER.castleGate, 'inner');
    gameState.seed = 1;
    const wm = new WorldManager();
    let site = null;
    for (let d = 0; d < 4 && !site; d++) for (let ry = -d; ry <= d && !site; ry++) for (let rx = -d; rx <= d && !site; rx++) site = wm.terrain.castles._site(rx, ry);
    assert.ok(site, 'seed 1 has a castle near the start');
    const data = wm.terrain.castles._data(site), g = data.plan.gate, ig = data.plan.inner.gatehouse;
    assert.ok(data.plan.gates.length >= 2 && data.plan.gates[0] === g, 'the main gate and at least one postern');
    const col = data.ox + g.col + 2, row = data.oy + g.row;              // the way through the main gate, from the approach outside it
    const icol = data.ox + ig.col + 1, irow = data.oy + ig.row;          // and through the inner gate, from the head of its flight
    for (const [c0, r0] of [[col, row], [icol, irow]]) for (let r = r0 - 4; r <= r0 + 4; r += 8) for (let c = c0 - 8; c <= c0 + 8; c += 8) wm.ensureChunkLoaded(c, r);
    assert.equal(wm.terrain.castles.gateKindAt(col, row), 'outer');
    assert.equal(wm.terrain.castles.gateKindAt(icol, irow), 'inner');
    assert.equal(wm.castleGatesShut('outer', col, row), false);
    assert.equal(wm.castleGatesShut('inner', icol, irow), false);
    assert.equal(wm.canMove(col, row + 1, col, row, 'UP'), true, 'through the main gate');
    try {
        CASTLE_SITES.GATES_SHUT = true; CASTLE_SITES.INNER_SHUT = true;
        assert.equal(wm.castleGatesShut('outer', col, row), true, 'shut in act 1');
        assert.equal(wm.canMove(col, row + 1, col, row, 'UP'), false, 'barred');
        assert.equal(wm.castleGatesShut('inner', icol, irow), true, 'the inner gate shut');
        assert.equal(wm.openInnerGate(icol, irow), true);
        assert.equal(wm.castleGatesShut('inner', icol, irow), false, 'opened for good');
        assert.equal(gameState.world.castleGatesOpened[site.id], true, 'remembered in the world (saved with it)');
    } finally {
        CASTLE_SITES.GATES_SHUT = false; CASTLE_SITES.INNER_SHUT = false;
        delete gameState.world.castleGatesOpened[site.id];
    }
});

test('the inner ward has one way in, its own smaller gatehouse over the flight up through its south wall', async () => {
    const { planCastle } = await import('../../shared/world/castleLayout.js');
    assert.ok(MAP_OBJECTS_DEFINITIONS.CASTLE_GATEHOUSE_INNER, 'the inner gatehouse');
    for (const seed of [11, 4242, 90001]) {
        const plan = planCastle(seed), I = plan.inner, g = I.gatehouse;
        assert.ok(g && g.w === 4, `${seed}: a gatehouse four cells wide`);
        // every flight on or at the inner ward: the gate's, the keep's two, the two up onto the inner wall from the terrace
        const at = plan.stairs.filter(st => st.ox + st.w >= I.x - 1 && st.ox <= I.x + I.w && st.oy + st.h >= I.y - 1 && st.oy <= I.y + I.h);
        assert.deepEqual([...new Set(at.map(st => st.id[0]))].sort(), ['g', 'i', 'k', 's'].filter(k => at.some(st => st.id[0] === k)).sort());
        assert.equal(at.filter(st => st.id[0] === 'g').length, 1, `${seed}: one gate flight`);
        assert.ok(at.every(st => 'gkis'.includes(st.id[0])), `${seed}: no other way up into the inner ward (${at.map(st => st.id).join(' ')})`);
        // the gate's flight runs up between the gatehouse's piers, which are wall
        const fl = at.find(st => st.id[0] === 'g');
        assert.equal(fl.ox, g.col + 1);
        for (let y = g.row - 2; y <= g.row; y++) for (const x of [g.col, g.col + 3]) assert.ok(plan.tiles[y][x] > 3, `${seed}: pier at ${x},${y}`);
        assert.equal(fl.oy, g.row + 1, `${seed}: the flight starts under the gatehouse's foot, ending at its arch`);
    }
});
