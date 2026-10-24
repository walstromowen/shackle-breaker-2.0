// backend/test/inputbuffer.test.js: `npm test`. Overworld input is snappy: a quick tap is never lost, and one tap is one step.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

globalThis.window = { addEventListener() {}, removeEventListener() {} };
const { Input } = await import('../../frontend/src/engine/input.js');

const down = (input, code, repeat = false) => input._onKeyDown({ code, repeat, preventDefault() {} });
const up = (input, code) => input._onKeyUp({ code });
const wait = (ms) => new Promise(r => setTimeout(r, ms));

test('a tap that is over before the next update still gives its direction, once', () => {
    const input = new Input(null);
    down(input, 'KeyD'); up(input, 'KeyD');
    assert.equal(input.direction, null, 'nothing is held any more');
    assert.equal(input.wantsToMove(), true);
    assert.equal(input.consumeDirection(), 'RIGHT');
    assert.equal(input.consumeDirection(), null, 'one tap, one step');
    assert.equal(input.wantsToMove(), false);
});

test('a tap made early in a step is still there when the step ends; the newest press wins over what is held', () => {
    const input = new Input(null);
    down(input, 'KeyD');                       // holding right
    assert.equal(input.consumeDirection(), 'RIGHT');
    down(input, 'KeyW'); up(input, 'KeyW');    // tap up while still walking right
    assert.equal(input.consumeDirection(), 'UP');
    assert.equal(input.consumeDirection(), 'RIGHT', 'then back to the held key');
});

test('holding a key is unchanged, and a key repeating does not queue extra steps', () => {
    const input = new Input(null);
    down(input, 'ArrowLeft');
    assert.equal(input.consumeDirection(), 'LEFT');
    down(input, 'ArrowLeft', true); down(input, 'ArrowLeft', true);   // the OS repeating the held key
    up(input, 'ArrowLeft');
    assert.equal(input.consumeDirection(), null, 'released: no phantom step');
});

test('an old tap expires, and a scene change or lost focus clears it', async () => {
    const input = new Input(null);
    down(input, 'KeyS'); up(input, 'KeyS');
    await wait(15);
    assert.equal(input.consumeDirection(5), null, 'older than the allowance');
    down(input, 'KeyA'); up(input, 'KeyA'); input.reset();
    assert.equal(input.wantsToMove(), false);
    down(input, 'KeyA'); up(input, 'KeyA'); input._onBlur();
    assert.equal(input.wantsToMove(), false);
});

test('non-direction keys never queue a step', () => {
    const input = new Input(null);
    down(input, 'Space'); down(input, 'KeyM'); down(input, 'ShiftLeft');
    assert.equal(input.queuedDirection, null);
});

test('the overworld asks for its next step through the buffer, at the start and at the end of a step', () => {
    const src = fs.readFileSync(new URL('../../frontend/src/screens/overworld/overworldController.js', import.meta.url), 'utf8');
    assert.match(src, /const dir = this\.input\.consumeDirection\(\)/);
    assert.match(src, /if \(this\.input\.wantsToMove\(\)\)/);
});
