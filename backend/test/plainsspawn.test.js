// backend/test/plainsspawn.test.js: `npm test`. Every new game starts in the plains, well inside them (WorldManager._plainsHeart): the world's
// generation is untouched, only where the party is put down.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameState } from '../../shared/core/gameState.js';
import { WorldManager } from '../../shared/world/worldManager.js';

test('every world starts in the plains, with plains all round for a good way', () => {
    const log = console.log; console.log = () => {};
    try {
        for (const seed of [1000, 8919, 16838, 24757, 32676]) {
            gameState.seed = seed; gameState.world.changes = {}; gameState.world.isInterior = false;
            const wm = new WorldManager();
            const sp = wm.findSpawnPoint();
            assert.equal(wm.getBiomeAt(sp.col, sp.row).id, 'PLAINS', `seed ${seed}: starts in the plains`);
            for (let a = 0; a < 16; a++) {
                const ang = a * Math.PI / 8;
                assert.equal(wm.getBiomeAt(sp.col + Math.round(Math.cos(ang) * 60), sp.row + Math.round(Math.sin(ang) * 60)).id, 'PLAINS', `seed ${seed}: plains 60 tiles out`);
            }
            assert.ok(wm.isTileFree(sp.col, sp.row), 'on a free tile');
        }
    } finally { console.log = log; }
});
