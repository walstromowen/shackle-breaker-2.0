// backend/test/aftermathobject.test.js: `npm test`. The Aftermath is a helmet with a sword through it standing on the plains, not a random encounter; and every random encounter but the cave-in is gone.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const noop = () => {};
const makeCtx = () => new Proxy({ getTransform: () => ({ a: 1 }), createPattern: () => ({}), createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }), createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    measureText: (s) => ({ width: String(s).length * 10 }) },
    { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
globalThis.OffscreenCanvas = class { constructor(w, h) { this.width = w; this.height = h; this._ctx = makeCtx(); } getContext() { return this._ctx; } };

import fs from 'node:fs';
const { BIOME_DEFINITIONS } = await import('../../shared/world/biomeDefinitions.js');
const { MAP_OBJECTS_DEFINITIONS } = await import('../../shared/world/mapObjectDefinitions.js');
const { encounterDefinitions } = await import('../../shared/story/encounterDefinitions.js');
const { gameState } = await import('../../shared/core/gameState.js');
const { WorldManager } = await import('../../shared/world/worldManager.js');
const { CONFIG } = await import('../../shared/core/constants.js');
const root = new URL('../../', import.meta.url);

test('AFTERMATH_REMAINS is a solid object that starts the Aftermath encounter, drawn from a registered 32 x 32 picture', () => {
    const o = MAP_OBJECTS_DEFINITIONS.AFTERMATH_REMAINS;
    assert.ok(o);
    assert.deepEqual(o.interaction, { type: 'ENCOUNTER', id: 'aftermath' });
    assert.ok(encounterDefinitions.aftermath, 'the encounter exists');
    assert.equal(o.isSolid, true, 'you face it and interact, like the other encounters');
    const main = fs.readFileSync(new URL('frontend/src/main.js', root), 'utf8');
    assert.match(main, /objAftermath: '\.\/assets\/mapObjects\/objAftermath\.png'/);
    const png = fs.readFileSync(new URL('frontend/src/assets/mapObjects/objAftermath.png', root));
    assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [32, 32]);
});

test('the plains give it a band of its own among the ground rules, as common as one in a thousand cells', () => {
    const rules = BIOME_DEFINITIONS.PLAINS.mapObjects[CONFIG.TILE_TYPES.LAYER_2];
    const mine = rules.find(r => r.id === 'AFTERMATH_REMAINS');
    assert.ok(mine, 'it is on the plains ground');
    const lo = mine.rangeStart, hi = mine.chance;
    assert.ok(Math.abs((hi - lo) - 0.001) < 1e-9);
    for (const r of rules) {
        if (r === mine || r.id === 'CAVE_ENTRANCE') continue;
        const a = r.rangeStart ?? 0, b = r.chance;
        assert.ok(b <= lo || a >= hi, `${r.id || (r.pool || []).join('/')} [${a}, ${b}) overlaps the aftermath's band [${lo}, ${hi})`);
    }
});

test('in a generated world it turns up on the plains, and only there', () => {
    gameState.seed = 4242;
    gameState.world.isInterior = false;
    gameState.world.changes = {};
    const wm = new WorldManager();
    let plainsGround = 0, found = 0, elsewhere = 0;
    for (let r = -300; r < 300; r++) for (let c = -300; c < 300; c += 2) {
        const b = wm.getBiomeAt(c, r);
        const id = wm._getRawProceduralId(c, r);
        if (id === 'AFTERMATH_REMAINS') { if (b.id === 'PLAINS') found++; else elsewhere++; }
        if (b.id === 'PLAINS') plainsGround++;
    }
    assert.ok(plainsGround > 5000, `plains sampled (${plainsGround})`);
    assert.ok(found > 0, `some aftermath remains (${found})`);
    assert.equal(elsewhere, 0);
});

test('only the caves still roll a random encounter (the cave-in); the plains keep their rate for the Shackling alone', () => {
    for (const [id, def] of Object.entries(BIOME_DEFINITIONS)) {
        const ids = ((def.encounters && def.encounters.pools) || []).map(p => p.id);
        assert.deepEqual(ids, id === 'CAVE_INTERIOR' ? ['cave_in'] : [], id);
    }
    assert.ok(BIOME_DEFINITIONS.PLAINS.encounters.rate > 0, 'the Shackling needs the rate');
});
