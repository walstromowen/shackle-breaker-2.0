// backend/test/villagelevels.test.js: `npm test`. Villages over several levels of terrain: a street that meets a cliff gets a stair cut into it (the same four pieces as the
// natural stairs, kept in gameState.world.villageStairs) and goes on up or down the next level. What is checked: the stairs are registered and drawn/walked like natural
// ones, nothing in the village breaks the cliff they are cut into, a street on a cliff level is only drawn as dirt (never a dirt tile, which would be a pit), the whole
// street network can be walked from the hub, and the stairs and level paths are saved with the world.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const noop = () => {};
const makeCtx = () => new Proxy({ getTransform: () => ({ a: 1 }), createPattern: () => ({}), createLinearGradient: () => ({ addColorStop: noop }), createRadialGradient: () => ({ addColorStop: noop }), createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), measureText: (s) => ({ width: String(s).length * 10 }) }, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
globalThis.OffscreenCanvas = class { constructor(w, h) { this.width = w; this.height = h; this._ctx = makeCtx(); } getContext() { return this._ctx; } };

const { gameState } = await import('../../shared/core/gameState.js');
const { WorldManager } = await import('../../shared/world/worldManager.js');
const { STRUCTURES } = await import('../../shared/world/structures.js');
const { isPlateau } = await import('../../shared/world/biomeDefinitions.js');

const quiet = async (fn) => { const log = console.log; console.log = noop; try { return await fn(); } finally { console.log = log; } };

/* the villages of a seed near the origin: { wm, plans } (a plan keeps its roads, with `elev`, and the stairs the village cut) */
const generate = (seed, reach = 3) => {
    gameState.seed = seed;
    gameState.world.isInterior = false;
    gameState.world.changes = {};
    gameState.world.terrainOverrides = {};
    gameState.world.villageStairs = [];
    gameState.world.levelPaths = {};
    const wm = new WorldManager();
    const plans = [];
    const pave = wm._paveRoads.bind(wm);
    wm._paveRoads = (plan) => { pave(plan); plans.push(plan); };
    for (let cy = -reach; cy <= reach; cy++) for (let cx = -reach; cx <= reach; cx++) wm._ensureStructuresSpawned(cx, cy);
    return { wm, plans };
};
const DIRS = [['UP', 0, -1], ['RIGHT', 1, 0], ['DOWN', 0, 1], ['LEFT', -1, 0]];
/* every cell that can be walked to from (c0, r0) inside the box, by the game's own movement rules */
const walk = (wm, c0, r0, box) => {
    const seen = new Set([c0 + ',' + r0]);
    const queue = [[c0, r0]];
    while (queue.length) {
        const [c, r] = queue.shift();
        for (const [d, dc, dr] of DIRS) {
            const nc = c + dc, nr = r + dr, key = nc + ',' + nr;
            if (nc < box[0] || nc > box[2] || nr < box[1] || nr > box[3] || seen.has(key)) continue;
            if (wm.canMove(c, r, nc, nr, d)) { seen.add(key); queue.push([nc, nr]); }
        }
    }
    return seen;
};
const boxOf = (plan, pad = 12) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const k of plan.roadOwner.keys()) { const [c, r] = k.split(',').map(Number); x0 = Math.min(x0, c); x1 = Math.max(x1, c); y0 = Math.min(y0, r); y1 = Math.max(y1, r); }
    return [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
};

// one world for most tests: seed 16 has a village over four levels close to the origin, and a few more
const world = await quiet(() => generate(16));
const climbing = world.plans.filter(p => p.stairs.length > 0);

test('the blueprint of every village asks for stairs, and the terrain keeps village stairs in a saved list of its own', () => {
    for (const id of ['ABANDONED_VILLAGE', 'ABANDONED_VILLAGE_DESERT', 'ABANDONED_VILLAGE_SNOWY']) {
        const lv = STRUCTURES[id].levels;
        assert.ok(lv && lv.max >= 3 && lv.depth >= 2, `${id} has levels`);
    }
    assert.ok(Array.isArray(gameState.world.villageStairs) && typeof gameState.world.levelPaths === 'object');
    assert.ok(gameState.world.villageStairs.length > 0, 'the village of seed 16 cut stairs');
    const saver = fs.readFileSync(new URL('../../frontend/src/engine/saveManager.js', import.meta.url), 'utf8');
    assert.ok(/villageStairs: clone\(/.test(saver) && /levelPaths: clone\(/.test(saver), 'both are saved');
    assert.ok(/villageStairs: data\.world\.villageStairs/.test(saver) && /levelPaths: data\.world\.levelPaths/.test(saver), 'and loaded');
});

test('a village stair is a stair like the natural ones: getStairAt finds it, it knows its walkway, and no natural stair overlaps it', () => {
    const { wm } = world;
    assert.ok(gameState.world.villageStairs.length > 0);
    for (const st of gameState.world.villageStairs) {
        assert.ok(st.village && ['S', 'N', 'E', 'W'].includes(st.kind));
        assert.equal(st.mask.length, st.h);
        assert.ok(['S', 'N'].includes(st.kind) ? st.dirs.includes('UP') : st.dirs.includes('LEFT'));
        let walkable = 0;
        for (let r = st.oy; r < st.oy + st.h; r++) for (let c = st.ox; c < st.ox + st.w; c++) {
            const at = wm.terrain.getStairAt(c, r);
            assert.equal(at && at.id, st.id, `${st.id}: the cell ${c},${r} is in the stair`);
            if (wm._stairAt(c, r)) walkable++;
        }
        assert.ok(walkable >= 3, `${st.id} has a walkway`);
        const natural = wm.terrain._computeStairBlock(Math.floor(st.ox / 32), Math.floor(st.oy / 32));
        for (const n of natural) assert.ok(!(n.ox < st.ox + st.w + 2 && st.ox < n.ox + n.w + 2 && n.oy < st.oy + st.h + 2 && st.oy < n.oy + n.h + 2), 'no natural stair beside it');
    }
});

test('the cliff a village stair is cut into keeps its shape: the village never lowers it (dirt next to a cliff pulls it down) or builds on it', () => {
    const { wm } = world;
    for (const st of gameState.world.villageStairs) {
        const anchor = st.kind === 'S' ? [st.ox + 1, st.oy + 1] : st.kind === 'N' ? [st.ox + 1, st.oy] : st.kind === 'E' ? [st.ox + 2, st.oy + 2] : [st.ox, st.oy + 2];
        const shape = wm.terrain._stairShapesAt(anchor[0], anchor[1], [], st.kind)[0];
        assert.ok(shape && shape.ox === st.ox && shape.oy === st.oy, `${st.id}: the terrain still has the shape of a ${st.kind} stair`);
        assert.ok(isPlateau(wm.getTileAt(anchor[0], anchor[1])));
        for (let r = st.oy; r < st.oy + st.h; r++) for (let c = st.ox; c < st.ox + st.w; c++) {
            assert.equal(wm.getObjectAt(c, r), null, `no object inside the stair at ${c},${r}`);
            assert.equal(gameState.world.terrainOverrides[c + ',' + r], undefined, 'no dirt tile in it');
        }
    }
});

test('a street on a cliff level is dirt only to the eye: never a dirt tile there (a pit), but a level path', () => {
    const { wm, plans } = world;
    let onCliff = 0;
    for (const plan of plans) {
        for (const [key, owner] of plan.roadOwner) {
            const [c, r] = key.split(',').map(Number);
            if (plan.hubTiles.has(key) || plan.buildingTiles.has(key) || !isPlateau(wm.getTileAt(c, r))) continue;
            onCliff++;
            assert.equal(gameState.world.terrainOverrides[key], undefined, `${key}: no dirt tile on a cliff level`);
        }
    }
    assert.ok(onCliff > 50, 'there are streets up there');
    const paths = Object.keys(gameState.world.levelPaths);
    assert.ok(paths.length > 50);
    for (const key of paths) { const [c, r] = key.split(',').map(Number); assert.ok(isPlateau(wm.getTileAt(c, r)), `${key} is on a cliff level`); assert.ok(wm.isLevelPath(c, r)); }
});

test('the streets go over several levels, and every street cell of a village is reached on foot from the hub through its stairs', () => {
    const { wm } = world;
    assert.ok(climbing.length >= 1, 'a village with stairs');
    let deepest = 0;
    for (const plan of climbing) {
        const levels = new Set(plan.roads.map(r => (r.elev !== undefined ? r.elev : plan.baseElev)));
        deepest = Math.max(deepest, levels.size);
        const start = plan.roads[0].centres[0];
        const seen = walk(wm, start.c, start.r, boxOf(plan));
        let missed = 0, total = 0;
        for (const road of plan.roads) for (const ctr of road.centres) { total++; if (!seen.has(ctr.c + ',' + ctr.r)) missed++; }
        assert.ok(missed <= total * 0.01, `${missed} of ${total} street cells are cut off from the hub`);
        for (const road of plan.roads) assert.ok(road.depth === undefined || road.depth <= STRUCTURES.ABANDONED_VILLAGE.levels.depth);
    }
    assert.ok(deepest >= 3, 'one village climbs at least three levels');
});

test('yards on the upper levels have a door that can be reached, and a street never starts or ends inside a stair', () => {
    const { wm } = world;
    let doors = 0, reached = 0;
    for (const plan of climbing) {
        const start = plan.roads[0].centres[0];
        const box = boxOf(plan);
        const seen = walk(wm, start.c, start.r, box);
        for (const [k, id] of Object.entries(gameState.world.changes)) {
            if (!id || !/DOOR/.test(id)) continue;
            const [c, r] = k.split(',').map(Number);
            if (c < box[0] || c > box[2] || r < box[1] || r > box[3]) continue;
            doors++;
            if (seen.has(c + ',' + (r + 1)) || seen.has(c + ',' + (r + 2))) reached++;
        }
        for (const road of plan.roads) for (const ctr of road.centres) assert.equal(wm.terrain.getStairAt(ctr.c, ctr.r), null, 'no street centre inside a stair');
    }
    assert.ok(doors > 5 && reached >= doors * 0.9, `${reached} of ${doors} doors can be reached`);
});

test('a world that generates the same villages twice gets the same stairs (the planner is deterministic)', async () => {
    const list = () => JSON.stringify(gameState.world.villageStairs.map(s => [s.kind, s.ox, s.oy]));
    await quiet(() => generate(16, 2));
    const first = list();
    assert.ok(gameState.world.villageStairs.length > 0);
    await quiet(() => generate(16, 2));
    assert.equal(list(), first);
});
