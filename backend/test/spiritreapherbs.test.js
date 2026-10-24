// backend/test/spiritreapherbs.test.js: `npm test`. Spirit Reap is a long, slow cast; herbs on the ground give 1 or 2.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { BattleAnimationDefinitions as A } from '../../shared/battle/animation/battleAnimationDefinition.js';
import { AbilityDefinitions } from '../../shared/abilities/abilityDefinitions.js';
import { MAP_OBJECTS_DEFINITIONS as M } from '../../shared/world/mapObjectDefinitions.js';

test('Spirit Reap runs long, the hand swells slowly, and its sound lasts about as long', () => {
    const a = A.spirit_reap;
    assert.ok(a.duration >= 6, `lasts ${a.duration}s`);
    const hand = a.vfx.find(v => v.config.sheetKey === 'spiritReapAnimation' || v.config.sheet === 'spiritReapAnimation' || JSON.stringify(v).includes('spiritReapAnimation'));
    assert.ok(hand, 'the hand is drawn');
    const cfg = hand.config;
    assert.equal(cfg.movement ?? cfg.move, 'loom_over');
    const life = cfg.life ?? cfg.lifetime ?? cfg.duration;
    assert.ok(life >= 5, `the hand lives ${life}s`);
    assert.ok(hand.start * a.duration + life <= a.duration + 0.01, 'the hand does not outlive the cast');
    const snd = a.audio[0];
    assert.ok((snd.pitch ?? snd.config?.pitch) <= 0.7, 'the sound is slowed so it spans the cast');
    const particle = fs.readFileSync(new URL('../../frontend/src/ui/particles/particle.js', import.meta.url), 'utf8');
    assert.ok(particle.includes("case 'loom_over'") && /customAlphas = \[[^\]]*'loom_over'/.test(particle), 'the particle knows loom_over');
});

test('the Spirit Reap ability actually plays that long animation (not the half-second default)', () => {
    assert.equal(AbilityDefinitions.spirit_reap.animationId, 'spirit_reap');
    assert.ok(A[AbilityDefinitions.spirit_reap.animationId].duration >= 6);
});

test('an ability with an animation of its own id always names an animation (never the half-second default)', () => {
    for (const [id, def] of Object.entries(AbilityDefinitions)) {
        if (A[id]) assert.ok(def.animationId, `${id} has an animation but the ability does not name one`);
    }
});

test('herbs give 1 or 2 each', () => {
    for (const id of ['HEALING_HERB', 'INVIGORATING_HERB', 'ILLUMINATING_HERB', 'ALOE_PLANT']) {
        const it = M[id].interaction;
        assert.equal(it.type, 'PICKUP');
        assert.equal(it.amount, 1, id);
        assert.equal(it.maxAmount, 2, id);
    }
});
