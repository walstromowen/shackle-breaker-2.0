// backend/test/abilityanimations.test.js: `npm test`. Every ability plays an animation of its own, and the ones that were stuck on the generic lunge now use real ones.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { AbilityDefinitions as A } from '../../shared/abilities/abilityDefinitions.js';
import { BattleAnimationDefinitions as B } from '../../shared/battle/animation/battleAnimationDefinition.js';

const main = fs.readFileSync(new URL('../../frontend/src/main.js', import.meta.url), 'utf8');
const loaded = new Set([...main.matchAll(/^\s*(\w+):\s*'\.\//gm)].map(m => m[1]));

// the animations that replaced the generic "melee_lunge" placeholder
const REWORKED = ['hit_and_run', 'item_throw_net', 'solar_beam', 'gravity', 'drain_life', 'healing_rain', 'rest', 'brew_of_madness', 'minor_heal', 'minor_recover', 'minor_channel',
    'moderate_heal', 'moderate_recover', 'moderate_channel', 'osmose', 'raise_skeleton', 'bear_form', 'baton_pass', 'counter_stance', 'switch_combatant', 'item_bear_trap', 'item_smoke_bomb'];

test('every ability that has an animation named after it plays that one, not the generic lunge', () => {
    for (const id of REWORKED) assert.equal(A[id].animationId, id, `${id} plays its own animation`);
    for (const [id, def] of Object.entries(A)) {
        if (B[id]) assert.ok(def.animationId && def.animationId !== 'melee_lunge', `${id} has an animation of its own but uses ${def.animationId}`);
        if (def.animationId) assert.ok(B[def.animationId], `${id}: the animation ${def.animationId} exists`);
    }
});

test('the reworked animations use only sounds and sprites the game loads, and no cue runs past the end', () => {
    for (const id of REWORKED) {
        const d = B[id];
        assert.ok(d.duration > 0 && d.audio.length >= 1, `${id} has sound`);
        for (const c of d.audio) assert.ok(loaded.has(c.key), `${id}: sound ${c.key} is loaded in main.js`);
        for (const c of d.vfx) {
            const sheet = c.config && c.config.sheetKey;
            if (sheet) assert.ok(loaded.has(sheet), `${id}: sprite ${sheet} is loaded in main.js`);
        }
        if (d.background) assert.ok(loaded.has(d.background.key), `${id}: background ${d.background.key} is loaded`);
        for (const c of [...d.audio, ...d.vfx]) assert.ok(c.start >= 0 && c.start <= 1, `${id}: a cue starts at ${c.start} of the animation`);
    }
});

test('the heals, recovers and channels come in a small and a large size, in the colour of what they restore', () => {
    for (const [kind, hue] of [['heal', 95], ['recover', 40], ['channel', 195]]) {
        const small = B[`minor_${kind}`], big = B[`moderate_${kind}`];
        assert.ok(big.duration > small.duration, `${kind}: the larger one lasts longer`);
        assert.ok(big.vfx.length > small.vfx.length, `${kind}: and has more going on`);
        for (const d of [small, big]) assert.match(d.target.flash.filter, new RegExp(`hue-rotate\\(${hue}deg\\)`), `${kind} is tinted`);
    }
});

test('Solar Beam charges, fires, and lands inside its own length', () => {
    const d = B.solar_beam;
    const beam = d.vfx.filter(v => v.type === 'travel');
    assert.ok(beam.length >= 40);
    const last = Math.max(...beam.map(v => v.start));
    assert.ok(last * d.duration + 0.5 <= d.duration + 0.01, 'the beam is over before the animation ends');
    assert.ok(Math.min(...beam.map(v => v.start)) * d.duration >= 0.8, 'after a charge-up');
});

test('every sound, sprite sheet and background any battle animation names is loaded by main.js', () => {
    for (const [id, d] of Object.entries(B)) {
        for (const c of d.audio || []) assert.ok(loaded.has(c.key), `${id}: sound ${c.key}`);
        for (const c of d.vfx || []) if (c.config && c.config.sheetKey) assert.ok(loaded.has(c.config.sheetKey), `${id}: sprite ${c.config.sheetKey}`);
        if (d.background && d.background.key !== 'current') assert.ok(loaded.has(d.background.key), `${id}: background ${d.background.key}`);
    }
});

test('every asset file main.js loads exists, except the one boss track that has not been made yet', () => {
    const missing = [...main.matchAll(/^\s*(\w+):\s*'\.\/([^']+)'/gm)]
        .filter(m => !fs.existsSync(new URL(`../../frontend/src/${m[2]}`, import.meta.url)))
        .map(m => m[1]);
    assert.deepEqual(missing, ['bossBattleBgm']);
});

test('the old catch-all "particles" sheet is gone: no animation draws it any more', () => {
    assert.ok(!loaded.has('particles'));
    for (const [id, d] of Object.entries(B)) for (const c of d.vfx || []) assert.notEqual(c.config && c.config.sheetKey, 'particles', id);
});

test('the shared particle code lives in ui/particles and the battle uses it from there', () => {
    const dir = new URL('../../frontend/src/ui/particles/', import.meta.url);
    for (const f of ['index.js', 'particle.js', 'particleSystem.js', 'embers.js', 'smoke.js']) assert.ok(fs.existsSync(new URL(f, dir)), f);
    const battle = fs.readFileSync(new URL('../../frontend/src/screens/battle/battleRenderer.js', import.meta.url), 'utf8');
    assert.match(battle, /ui\/particles\/particleSystem\.js/);
});
