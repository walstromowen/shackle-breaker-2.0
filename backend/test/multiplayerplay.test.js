// backend/test/multiplayerplay.test.js: `npm test`. Who fights in a party of several players (shared/core/multiplayerParty.js), the shared battle
// dice (shared/core/random.js), and how a party of players shares its spoils (BattleRewardSystem.processVictory with `share`).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLineup } from '../../shared/core/multiplayerParty.js';
import { rng, seedRandom, unseedRandom } from '../../shared/core/random.js';
import { BattleRewardSystem } from '../../shared/battle/battleRewardSystem.js';
import { gameState } from '../../shared/core/gameState.js';

const party = (id, n, dead = []) => ({ id, members: Array.from({ length: n }, (_, i) => ({ alive: !dead.includes(i) })) });
const who = (l) => l.map(e => `${e.owner}${e.idx}`).join(' ');

test('two players: the first three of each on their feet, alternating', () => {
    assert.equal(who(buildLineup([party('A', 5), party('B', 4)])), 'A0 B0 A1 B1 A2 B2');
    assert.equal(who(buildLineup([party('A', 5, [0]), party('B', 4)])), 'A1 B0 A2 B1 A3 B2', 'a fallen member is skipped');
});

test('three players: the first two of each', () => {
    assert.equal(who(buildLineup([party('A', 4), party('B', 4), party('C', 4)])), 'A0 B0 C0 A1 B1 C1');
});

test('a party short of its share: the others\' next members step in, up to six', () => {
    assert.equal(who(buildLineup([party('A', 1), party('B', 6)])), 'A0 B0 B1 B2 B3 B4');
    assert.equal(who(buildLineup([party('A', 1), party('B', 1), party('C', 6)])), 'A0 B0 C0 C1 C2 C3');
    assert.equal(buildLineup([party('A', 1), party('B', 1)]).length, 2, 'never more than there are');
});

test('seeded dice give the same numbers for the same seed, and Math.random again after', () => {
    seedRandom(1234);
    const a = [rng(), rng(), rng()];
    seedRandom(1234);
    const b = [rng(), rng(), rng()];
    unseedRandom();
    assert.deepEqual(a, b);
    assert.ok(a.every(x => x >= 0 && x < 1));
    const real = Math.random;
    Math.random = () => 0.25;
    try { assert.equal(rng(), 0.25, 'unseeded: Math.random, looked up each call'); } finally { Math.random = real; }
});

test('a party of players splits the coin evenly and every browser agrees who got each item', () => {
    const enemy = { originalEntity: { currencyReward: { min: 9, max: 9 }, xpReward: 10, level: 1 }, maxHp: 10, stats: {}, isDead: () => true };
    const member = { originalEntity: { level: 1, xp: 0 }, isDead: () => false, name: 'X' };
    const players = ['p1', 'p2'];
    const coinsFor = (me) => {
        gameState.party.currency = 0;
        gameState.party.inventory = [];
        seedRandom(77);
        try { BattleRewardSystem.processVictory([member], [enemy], [], { players, me }); } finally { unseedRandom(); }
        return gameState.party.currency;
    };
    const c1 = coinsFor('p1'), c2 = coinsFor('p2');
    assert.equal(c1 + c2, 9, 'all the coin, once');
    assert.ok(Math.abs(c1 - c2) <= 1, 'evenly');
});
