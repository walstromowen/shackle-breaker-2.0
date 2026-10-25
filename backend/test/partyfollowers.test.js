// backend/test/partyfollowers.test.js: `npm test`. The first three party members on their feet are on the overworld map: the player, then two who follow in a line behind.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PartyFollowers } from '../../frontend/src/screens/overworld/partyFollowers.js';

const read = (p) => fs.readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const T = 32;
const member = (name, hp = 10, sheet = 'sheet_' + name) => ({ name, hp, spriteOverworld: sheet });

/* A player entity that walks the way OverworldController does: startMove / progress / finish. */
function makePlayer(col, row, direction = 'DOWN') {
    return { x: col * T, y: row * T, direction, isMoving: false, animState: 'idle', animPhase: 0, moveProgress: 0 };
}
function step(p, dir, followers, frames = 4) {
    const d = { UP: [0, -1], DOWN: [0, 1], LEFT: [-1, 0], RIGHT: [1, 0] }[dir];
    p.direction = dir; p.isMoving = true; p.sourceX = p.x; p.sourceY = p.y; p.destX = p.x + d[0] * T; p.destY = p.y + d[1] * T; p.animState = 'walk';
    const seen = [];
    for (let i = 1; i < frames; i++) {
        p.moveProgress = i / frames;
        p.x = p.sourceX + (p.destX - p.sourceX) * p.moveProgress; p.y = p.sourceY + (p.destY - p.sourceY) * p.moveProgress;
        followers.sync(p, 0.05);
        seen.push(followers.entities.map(e => ({ x: e.x, y: e.y, anim: e.animState, dir: e.direction })));
    }
    p.x = p.destX; p.y = p.destY; p.isMoving = false; p.moveProgress = 0; p.animState = 'idle';
    followers.sync(p, 0.05);
    return seen;
}

test('the line-up is the first three party members with more than 0 hp; the first is the player', () => {
    const party = [member('a'), member('b', 0), member('c'), member('d'), member('e')];
    assert.deepEqual(PartyFollowers.lineup(party).map(m => m.name), ['a', 'c', 'd'], 'the fallen member is skipped');
    assert.deepEqual(PartyFollowers.lineup([member('a', 0), member('b'), member('c')]).map(m => m.name), ['b', 'c'], 'a fallen leader hands the lead on');
    assert.deepEqual(PartyFollowers.lineup([member('a'), member('b')]).map(m => m.name), ['a', 'b'], 'a small party has fewer followers');
    assert.deepEqual(PartyFollowers.lineup([member('a', 0), member('b', 0)]).map(m => m.name), ['a'], 'nobody on their feet: the player still stands there');
    assert.deepEqual(PartyFollowers.lineup([]), []);
});

test('a member with no walking sheet is skipped, not left as a gap', () => {
    const party = [member('a'), member('wolf', 10, 'wolfSprite'), member('c'), member('d')];
    const has = (k) => k !== 'wolfSprite';
    assert.deepEqual(PartyFollowers.lineup(party, has).map(m => m.name), ['a', 'c', 'd']);
    assert.deepEqual(PartyFollowers.lineup([{ name: 'x', hp: 5 }, member('b')]).map(m => m.name), ['b'], 'no sheet name at all');
});

test('they start behind the player, on the tiles the player is not facing', () => {
    const f = new PartyFollowers(T);
    const p = makePlayer(10, 10, 'UP');
    f.sync(p, 0);
    assert.deepEqual(f.entities.map(e => [e.x / T, e.y / T]), [[10, 11], [10, 12]], 'one and two tiles south of a player facing north');
    assert.ok(f.entities.every(e => e.direction === 'UP' && e.animState === 'idle'));
});

test('when the tiles behind are blocked they stand on the player\'s tile instead of inside a wall', () => {
    const f = new PartyFollowers(T);
    const p = makePlayer(10, 10, 'UP');
    f.sync(p, 0, (c0, r0, c1, r1) => !(c0 === 10 && r0 === 11));
    assert.deepEqual(f.entities.map(e => [e.x / T, e.y / T]), [[10, 10], [10, 10]]);
});

test('walking: the followers keep to the player\'s trail, one tile apart, and step together', () => {
    const f = new PartyFollowers(T);
    const p = makePlayer(5, 5, 'RIGHT');
    f.sync(p, 0);                                  // behind it to the west: (4,5), (3,5)
    step(p, 'RIGHT', f); step(p, 'RIGHT', f);
    assert.deepEqual(f.entities.map(e => [e.x / T, e.y / T]), [[6, 5], [5, 5]], 'two steps east: the same distance behind');
    const mid = step(p, 'DOWN', f);                 // turning a corner: they walk where the player walked
    assert.deepEqual(f.entities.map(e => [e.x / T, e.y / T]), [[7, 5], [6, 5]], 'the first stands on the corner tile, the second one behind it');
    for (const frame of mid) {
        assert.ok(frame[0].anim === 'walk' && frame[1].anim === 'walk');
    }
    assert.equal(mid[0][0].dir, 'RIGHT', 'the first still walks east towards the corner while the player has turned south');
    step(p, 'DOWN', f);
    assert.deepEqual(f.entities.map(e => [e.x / T, e.y / T]), [[7, 6], [7, 5]]);
    assert.equal(f.entities[0].direction, 'DOWN');
    assert.ok(f.entities.every(e => e.animState === 'idle'), 'they stop when the player stops');
});

test('mid-step they are between tiles, the same fraction of the way as the player', () => {
    const f = new PartyFollowers(T);
    const p = makePlayer(0, 0, 'RIGHT');
    f.sync(p, 0);
    step(p, 'RIGHT', f);
    p.direction = 'RIGHT'; p.isMoving = true; p.sourceX = p.x; p.sourceY = p.y; p.destX = p.x + T; p.destY = p.y; p.moveProgress = 0.5; p.x = p.sourceX + T / 2;
    f.sync(p, 0.05);
    // the player is half way from tile 1 to tile 2; the first follower half way from tile 0 to tile 1, the second from tile -1 to tile 0
    assert.deepEqual(f.entities.map(e => e.x), [T / 2, -T / 2]);
    assert.ok(f.entities.every(e => e.y === 0 && e.animState === 'walk'));
});

test('a jump (a warp, a door, a loaded game) lays the trail out again; nothing slides across the map', () => {
    const f = new PartyFollowers(T);
    const p = makePlayer(0, 0, 'DOWN');
    f.sync(p, 0);
    p.x = 500 * T; p.y = 40 * T; p.direction = 'LEFT';
    f.sync(p, 0);
    assert.deepEqual(f.entities.map(e => [e.x / T, e.y / T]), [[501, 40], [502, 40]]);
    assert.deepEqual(f.entities.map(e => [e.prevX / T, e.prevY / T]), [[501, 40], [502, 40]], 'and they are not interpolated from where they were');
});

test('the overworld hands the followers to the renderer, and the renderer draws each from its own member\'s sheet', () => {
    const ow = read('frontend/src/screens/overworld/overworldController.js');
    assert.match(ow, /import \{ PartyFollowers \} from '\.\/partyFollowers\.js'/);
    assert.match(ow, /entities: \[this\.player, \.\.\.this\.followers\.entities\]/);
    assert.match(ow, /this\.followers\.sync\(this\.player, dt/);
    const mr = read('frontend/src/screens/overworld/mapRenderer.js');
    assert.match(mr, /PartyFollowers\.lineup\(/);
    assert.match(mr, /lineup\[entity\.followerSlot \|\| 0\]/);
});

test('the followers carry no light and no solid body', () => {
    const f = new PartyFollowers(T);
    for (const e of f.entities) {
        assert.equal(e.light, undefined);
        assert.equal(e.isSolid, undefined);
        assert.equal(e.isPlayer, undefined);
    }
});
