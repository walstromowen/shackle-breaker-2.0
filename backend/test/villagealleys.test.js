// backend/test/villagealleys.test.js: `npm test`. A village is built tight: the alleys that fork off the main roads are one tile wide, a yard stands along both sides of them,
// an alley no yard opens on is taken back (it only ate the ground), and the stools round the village fire stand right beside it.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const noop = () => {};
const makeCtx = () => new Proxy({ getTransform: () => ({ a: 1 }), createPattern: () => ({}), createLinearGradient: () => ({ addColorStop: noop }), createRadialGradient: () => ({ addColorStop: noop }), createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), measureText: (s) => ({ width: String(s).length * 10 }) }, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
globalThis.OffscreenCanvas = class { constructor(w, h) { this.width = w; this.height = h; this._ctx = makeCtx(); } getContext() { return this._ctx; } };

const { gameState } = await import('../../shared/core/gameState.js');
const { WorldManager } = await import('../../shared/world/worldManager.js');
const { STRUCTURES } = await import('../../shared/world/structures.js');

const quiet = (fn) => { const log = console.log; console.log = noop; try { return fn(); } finally { console.log = log; } };

const generate = (seed, reach = 4) => quiet(() => {
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
    let placed = 0;
    const place = wm._placeModule.bind(wm);
    wm._placeModule = (...a) => { const ok = place(...a); if (ok) placed++; return ok; };
    for (let cy = -reach; cy <= reach; cy++) for (let cx = -reach; cx <= reach; cx++) wm._ensureStructuresSpawned(cx, cy);
    return { wm, plans, placed };
});

test('the alleys are one tile wide, and every alley left in a village has a yard on it', () => {
    assert.equal(STRUCTURES.ABANDONED_VILLAGE.sideStreets.width, 1);
    let alleys = 0;
    for (const seed of [5, 8]) {
        const { plans } = generate(seed);
        for (const plan of plans) {
            for (const road of plan.roads) {
                if (!road.alley) continue;
                if (road.dead) { assert.equal(road.centres.length, 0); continue; }
                alleys++;
                assert.equal(road.rad, 0, 'an alley is one tile wide');
                assert.ok(road.served > 0 || plan.roads.some((o) => !o.dead && o.parent === road.id), 'an alley with no yard on it and no street growing out of it is taken back');
                for (const c of road.centres) {
                    const o = plan.roadOwner.get(c.c + ',' + c.r);
                    assert.ok(o, 'every centre of an alley is a road cell');
                }
            }
        }
    }
    assert.ok(alleys >= 6, `the villages of these worlds have alleys (${alleys})`);
});

test('houses stand on both sides of the alleys', () => {
    let both = 0;
    for (const seed of [5, 8]) {
        const { plans } = generate(seed);
        for (const plan of plans) {
            for (const road of plan.roads) {
                if (!road.alley || road.dead) continue;
                const sides = new Set();
                const cs = road.centres;
                for (let i = 1; i < cs.length; i++) {
                    const horizontal = cs[i].d === 1 || cs[i].d === 3;
                    // (a yard stands right beside the alley, or a cell or two back where the alley sways away from it: yardSlack)
                    for (const sgn of [-1, 1]) for (let k = 2; k <= 4; k++) {
                        const key = horizontal ? `${cs[i].c},${cs[i].r + sgn * k}` : `${cs[i].c + sgn * k},${cs[i].r}`;
                        if (plan.buildingTiles.has(key)) sides.add(sgn);
                    }
                }
                if (sides.size === 2) both++;
            }
        }
    }
    assert.ok(both >= 3, `at least 3 alleys have a yard along each side (${both})`);
});

test('the roads take little room: a village has a building for every 60 road cells at the most, and at least 8 buildings on average', () => {
    let roads = 0, houses = 0, villages = 0;
    for (const seed of [5, 8]) {
        const { plans, placed } = generate(seed);
        for (const plan of plans) roads += plan.roadOwner.size;
        houses += placed;
        villages += plans.length;
    }
    assert.ok(villages >= 3);
    assert.ok(roads / houses <= 60, `${(roads / houses).toFixed(1)} road cells per building`);
    assert.ok(houses / villages >= 8, `${(houses / villages).toFixed(1)} buildings per village`);
});

test('the campfire stands alone in the middle of the village hub (no stools round it)', () => {
    const center = STRUCTURES.ABANDONED_CENTER;
    const at = (x, y) => center.objects[y][x];
    assert.equal(at(5, 5), 'CAMPFIRE');
    for (const [x, y] of [[4, 4], [6, 4], [4, 6], [6, 6], [3, 3], [7, 3], [3, 7], [7, 7]]) assert.notEqual(at(x, y), 'STOOL', 'no stools round the fire');
});

test('the roads sway: a main road drifts to the side and back along its length instead of running ruler straight between its turns', () => {
    const bp = STRUCTURES.ABANDONED_VILLAGE;
    assert.ok(bp.curves && bp.curves.amplitude.max >= 2, 'the village has curves');
    let swaying = 0, arms = 0;
    for (const seed of [5, 8]) {
        const { plans } = generate(seed);
        for (const plan of plans) for (const road of plan.roads) {
            if (road.kind !== 'arm' || road.centres.length < 20) continue;
            arms++;
            // along one heading, how far the road wanders across it
            const byHeading = new Map();
            for (const ctr of road.centres) {
                const across = ctr.d === 1 || ctr.d === 3 ? ctr.r : ctr.c;
                const run = byHeading.get(ctr.d) || { lo: Infinity, hi: -Infinity };
                run.lo = Math.min(run.lo, across); run.hi = Math.max(run.hi, across);
                byHeading.set(ctr.d, run);
            }
            if ([...byHeading.values()].some(r => r.hi - r.lo >= 2)) swaying++;
        }
    }
    assert.ok(arms > 0 && swaying / arms >= 0.6, `${swaying} of ${arms} main roads sway`);
});
