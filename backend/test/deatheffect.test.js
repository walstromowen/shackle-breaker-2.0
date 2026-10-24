// backend/test/deatheffect.test.js: `npm test`. A combatant that dies comes apart like fog and ash in the wind (the 'faint' animation + the drifting particles).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Particle } from '../../frontend/src/screens/battle/particle.js';
import * as defs from '../../shared/battle/animation/battleAnimationDefinition.js';

const faint = Object.values(defs).map(v => v && v.faint).find(Boolean);

test('the faint animation is fog and ash, not the placeholder sprites', () => {
    assert.ok(faint, 'there is a faint animation');
    const cues = faint.vfx;
    assert.ok(cues.every(c => c.type === 'burst'), 'every cue is a burst of drifting particles (no sprite sheet art)');
    const shapes = new Set(cues.map(c => c.config.shape));
    assert.deepEqual([...shapes].sort(), ['fleck', 'puff'], 'soft fog clouds and flakes of ash');
    // the death turn is one second long (battleQueue.js): a cue that starts later would never play
    assert.ok(cues.every(c => c.start >= 0 && c.start <= 1), 'every cue starts inside the turn');
    for (const c of cues) {
        assert.ok(c.config.windX > 0, 'the wind blows them the same way');
        assert.ok(c.config.windPull > 0 && c.config.sway > 0, 'and they wander on it');
        assert.ok(c.config.envelope, 'and fade in and thin away smoothly');
    }
    assert.ok(cues.filter(c => c.config.shape === 'puff').length >= 4 && cues.filter(c => c.config.shape === 'fleck').length >= 4);
});

test('wind pulls a particle toward the wind speed, sway makes it wander, and the envelope fades it in and out', () => {
    const still = new Particle({ x: 0, y: 0, life: 2, vx: 0, vy: 0 });
    const blown = new Particle({ x: 0, y: 0, life: 2, vx: 0, vy: 0, windX: 200, windY: -40, windPull: 2, swayPhase: 0 });
    for (let i = 0; i < 60; i++) { still.update(1 / 60); blown.update(1 / 60); }
    assert.equal(still.x, 0);
    assert.ok(blown.x > 50 && blown.vx > 100 && blown.vx <= 200, `blown right (x ${blown.x.toFixed(1)}, vx ${blown.vx.toFixed(1)})`);
    assert.ok(blown.y < 0, 'and lifted');

    const swayed = new Particle({ x: 0, y: 0, life: 2, sway: 100, swayPhase: 0.5 });
    for (let i = 0; i < 60; i++) swayed.update(1 / 60);
    assert.ok(Math.abs(swayed.y) > 1, 'a swaying particle wanders even with no wind');

    const p = new Particle({ x: 0, y: 0, life: 1, envelope: true, alpha: 0.8 });
    const seen = [];
    for (let i = 0; i < 20; i++) { p.update(0.05); seen.push(p.alpha); }
    assert.ok(seen[0] < 0.8 && Math.max(...seen) > 0.5 && seen[seen.length - 1] < seen[8], 'rises, then thins away');
    assert.ok(seen.every(a => a <= 0.8 + 1e-9));
});
