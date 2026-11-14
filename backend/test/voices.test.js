// backend/test/voices.test.js: `npm test`. The voices (shared/story/voices.js, frontend/src/engine/voicesPlayer.js): whispers of madness, as loud
// as Dolos makes them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameState } from '../../shared/core/gameState.js';
import { worldSync } from '../../shared/core/worldSync.js';
import { Dolos } from '../../shared/story/dolos.js';
import { Voices, TIERS, NAMED_LINES, SILENT } from '../../shared/story/voices.js';
import { EntityFactory } from '../../shared/characters/entityFactory.js';
import { CorruptionSystem } from '../../shared/characters/corruptionSystem.js';
import { VoicesPlayer } from '../../frontend/src/engine/voicesPlayer.js';

const quiet = (fn) => { const l = console.log, w = console.warn; console.log = console.warn = () => {}; try { return fn(); } finally { console.log = l; console.warn = w; } };
const reset = (level = 10) => {
    gameState.world.changes = {};
    gameState.world.time = 8 * 60;
    gameState.difficulty = 'normal';
    worldSync.ownsWorld = true;
    gameState.party.members = [quiet(() => EntityFactory.create('HUMANOID', { level, levelEdge: false }))];
    Dolos.state();
};
const phase = (p, tension = 0) => { Dolos._enter(gameState, p); Dolos.state().tension = tension; };

test('as loud as Dolos makes them: silent in his respite, a murmur while calm, plain as he stirs, loud in his gaze', () => {
    reset();
    phase('respite');
    assert.equal(Voices.level(), 0);
    phase('calm', 0);
    const calm = Voices.level();
    phase('calm', 45);
    const calmTense = Voices.level();
    phase('stirring', 60);
    const stirring = Voices.level();
    phase('gaze');
    const gaze = Voices.level();
    assert.ok(calm > 0 && calm < calmTense && calmTense < stirring && stirring < gaze, `${calm} ${calmTense} ${stirring} ${gaze}`);
    assert.ok(gaze >= 0.8);
});

test('a blood moon and a corrupted party make them louder; a party he has not noticed hears nothing', () => {
    reset();
    phase('stirring', 60);
    const plain = Voices.level();
    assert.ok(Voices.level(gameState, true) > plain, 'under a blood moon');
    CorruptionSystem.change(gameState.party.members[0], 80);
    assert.ok(Voices.level() > plain, 'the corrupted hear them better');
    reset(3);
    phase('gaze');
    assert.equal(Voices.level(), 0, 'below level 5 he has not noticed them, and nothing whispers');
});

test('the louder, the sooner and the plainer: lines by tier, and his name only once the story names him', () => {
    const rand = () => 0.5;
    assert.ok(Voices.nextWhisper(1, rand) < Voices.nextWhisper(0.1, rand) / 3);
    assert.equal(Voices.line(SILENT / 2), null, 'silence says nothing');
    const at = (level) => new Set(Array.from({ length: 200 }, (_, i) => Voices.line(level, () => ((i * 0.6180339) % 1), false)));
    assert.ok([...at(0.2)].every(l => TIERS[0].lines.includes(l)), 'faint: only murmurs');
    assert.ok([...at(0.9)].some(l => TIERS[2].lines.includes(l)), 'loud: the cruellest');
    assert.ok(![...at(0.9)].some(l => NAMED_LINES.includes(l)), 'never his name while he is hidden');
    const named = new Set(Array.from({ length: 400 }, (_, i) => Voices.line(0.95, () => ((i * 0.7548776) % 1), true)));
    assert.ok([...named].some(l => NAMED_LINES.includes(l)), 'once named, they say it');
    assert.ok(TIERS.every(t => t.lines.every(l => !/Dolos/.test(l))));
});

test('the player: whispers from one side or the other, louder as they grow, words now and then; nothing in his respite', () => {
    reset();
    const heard = [];
    const p = new VoicesPlayer({ rand: () => 0.3, play: (v, r, pan) => heard.push({ v, r, pan }) });
    phase('gaze');
    for (let s = 0; s < 120; s++) p.update(1, s * 1000);
    assert.ok(heard.length >= 4, `${heard.length} whispers in two minutes of his gaze`);
    assert.ok(heard.every(h => Math.abs(h.pan) >= 0.35 && h.v > 0.5), 'from the sides, and loud');
    assert.ok(p.heard > 0);
    const q = new VoicesPlayer({ rand: () => 0.1, play: () => {} });
    q.whisper(0.9, 0);
    assert.ok(q.shown(100) && q.shown(100).text, 'words, with the whisper');
    phase('respite');
    q.update(0.1, 10000);   // past WHISPER_SHOWN_MS: the words have faded
    assert.equal(q.shown(10000), null);
    const quietPlayer = new VoicesPlayer({ rand: () => 0.3, play: (v) => heard.push(v) });
    const before = heard.length;
    for (let s = 0; s < 300; s++) quietPlayer.update(1, s * 1000);
    assert.equal(heard.length, before, 'silence while he looks away');
});
