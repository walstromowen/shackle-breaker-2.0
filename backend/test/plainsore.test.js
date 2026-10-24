// backend/test/plainsore.test.js: `npm test`. Coal and (very rarely) copper lie bare on the higher terraces of the plains, like the iron of the snowy mountains.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const noop = () => {};
const makeCtx = () => new Proxy({ getTransform: () => ({ a: 1 }), createPattern: () => ({}), createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }), createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    measureText: (s) => ({ width: String(s).length * 10 }) },
    { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
globalThis.OffscreenCanvas = class { constructor(w, h) { this.width = w; this.height = h; this._ctx = makeCtx(); } getContext() { return this._ctx; } };

const { BIOME_DEFINITIONS, layerIndex } = await import('../../shared/world/biomeDefinitions.js');
const { MAP_OBJECTS_DEFINITIONS } = await import('../../shared/world/mapObjectDefinitions.js');
const { gameState } = await import('../../shared/core/gameState.js');
const { WorldManager } = await import('../../shared/world/worldManager.js');

test('the plains list coal and copper as altitude rules, copper far rarer, and only on the upper terraces', () => {
    const rules = BIOME_DEFINITIONS.PLAINS.mapObjects._ALTITUDE;
    const coal = rules.find(r => r.id === 'COAL_DEPOSIT'), copper = rules.find(r => r.id === 'COPPER_ORE_DEPOSIT');
    assert.ok(coal && copper);
    assert.ok(MAP_OBJECTS_DEFINITIONS.COAL_DEPOSIT && MAP_OBJECTS_DEFINITIONS.COPPER_ORE_DEPOSIT);
    assert.ok(copper.chance * 3 <= coal.chance, 'copper is much rarer than coal');
    assert.ok(copper.chance <= 0.005, 'and rare in itself');
    assert.ok(coal.minLevel >= 4 && copper.minLevel >= 4, 'not on the first cliff level or the ground');
});

test('in a generated world the upper plains terraces hold some coal and a little copper, and the ground holds none', () => {
    gameState.seed = 4242;
    gameState.world.isInterior = false;
    gameState.world.changes = {};
    const wm = new WorldManager();
    let high = 0, coal = 0, copper = 0, groundOre = 0, ground = 0;
    for (let r = -400; r < 400; r += 1) {
        for (let c = -400; c < 400; c += 2) {
            const biome = wm.getBiomeAt(c, r);
            if (!biome || biome.id !== 'PLAINS') continue;
            const lvl = layerIndex(wm.getTileAt(c, r));
            const id = wm._getRawProceduralId(c, r);
            if (lvl >= 4) { high++; if (id === 'COAL_DEPOSIT') coal++; if (id === 'COPPER_ORE_DEPOSIT') copper++; }
            else if (lvl >= 0) { ground++; if (id === 'COAL_DEPOSIT' || id === 'COPPER_ORE_DEPOSIT') groundOre++; }
        }
    }
    assert.ok(high > 500, `some high plains were sampled (${high})`);
    assert.ok(coal > 0, `coal turns up (${coal} of ${high})`);
    assert.ok(copper <= coal, 'copper is no commoner than coal');
    assert.equal(groundOre, 0, 'none on the low ground or the first terrace');
    console.log(`plains terraces sampled: ${high}, coal ${coal}, copper ${copper}`);
});
