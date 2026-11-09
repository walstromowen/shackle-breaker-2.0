// backend/test/tapturn.test.js: `npm test`. Standing still, tapping a direction the character does not face turns it on the spot without a step;
// holding it on walks that way; a press the way it already faces walks at once; and a key held as a step ends keeps walking, turning included.
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('a tap turns, a hold walks, and walking on never pauses', async () => {
    const { OverworldController } = await import('../../frontend/src/screens/overworld/overworldController.js');
    const step = OverworldController.prototype.checkForNewMove;
    const make = (facing) => {
        const o = { input: { direction: null }, player: { direction: facing, x: 0, y: 0 }, config: { TILE_SIZE: 16 }, moves: [],
            isSpaceFree: () => true, startMove(x, y) { this.moves.push([x, y]); } };
        o.step = (dt, chained = false) => step.call(o, dt, chained);
        return o;
    };

    // a tap towards a new direction: turned, not moved
    let o = make('DOWN');
    o.input.direction = 'LEFT'; o.step(0.016); o.step(0.016);
    o.input.direction = null; o.step(0.016);
    assert.equal(o.player.direction, 'LEFT');
    assert.deepEqual(o.moves, [], 'a tap does not walk');

    // held on: after a moment it walks that way
    o = make('DOWN');
    o.input.direction = 'RIGHT';
    for (let t = 0; t < 0.2 && !o.moves.length; t += 0.016) o.step(0.016);
    assert.deepEqual(o.moves, [[16, 0]], 'a hold walks');

    // already facing it: walks at once (whatever the case it was stored in)
    o = make('down');
    o.input.direction = 'DOWN'; o.step(0.016);
    assert.deepEqual(o.moves, [[0, 16]], "a new character faces 'down': DOWN walks at once");
    o = make('UP');
    o.input.direction = 'UP'; o.step(0.016);
    assert.deepEqual(o.moves, [[0, -16]]);

    // a key held as a step ends: the next step starts at once, even round a corner
    o = make('UP');
    o.input.direction = 'LEFT'; o.step(0, true);
    assert.deepEqual(o.moves, [[-16, 0]]);
    assert.equal(o.player.direction, 'LEFT');
});
