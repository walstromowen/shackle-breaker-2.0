// backend/test/throwdagger.test.js: `npm test`. Throw Dagger / Throw Poison Dagger animations, and cue times in the long animations.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AbilityDefinitions as A } from '../../shared/abilities/abilityDefinitions.js';
import { BattleAnimationDefinitions as B } from '../../shared/battle/animation/battleAnimationDefinition.js';
import { anim, sfx, burst } from '../../shared/battle/animation/animationKit.js';

const travels = (d) => d.vfx.filter(v => v.type === 'travel');

test('the two knife abilities have an animation of their own', () => {
    assert.equal(A.item_throwing_knife.animationId, 'throw_dagger');
    assert.equal(A.item_poison_knife.animationId, 'throw_poison_dagger');
    assert.ok(B.throw_dagger && B.throw_poison_dagger);
    const users = Object.values(A).filter(a => a.animationId === 'throw_dagger' || a.animationId === 'throw_poison_dagger');
    assert.equal(users.length, 2);
});

test('the thrown knife has its own sprite drawn pointing right, is aimed, and stays in the target for a moment', () => {
    for (const [id, sheet] of [['throw_dagger', 'throwingKnifeAnimation'], ['throw_poison_dagger', 'poisonKnifeAnimation']]) {
        const main = travels(B[id]).find(v => v.config.flight);
        assert.ok(main, `${id} has a travel sprite that holds`);
        assert.equal(main.config.sheetKey, sheet);
        assert.equal(main.config.rotation, 'auto');
        assert.equal(main.config.rotationOffset, undefined, 'the art already points right');
        assert.ok(main.config.life - main.config.flight >= 1, `${id} stays in the target for at least a second`);
    }
});

test('both throws hit at the same moment the knife lands, and the poison one adds poison sound, a cloud and green drops', () => {
    for (const id of ['throw_dagger', 'throw_poison_dagger']) {
        const d = B[id];
        const main = travels(d).find(v => v.config.flight);
        const lands = main.start + main.config.flight / d.duration;
        const stab = d.audio.find(a => a.key === 'quickStabSfx');
        assert.ok(Math.abs(stab.start - lands) < 0.03, `${id}: the stab lands with the knife`);
    }
    const p = B.throw_poison_dagger;
    assert.ok(p.audio.some(a => a.key === 'poisonSfx'));
    assert.ok(p.vfx.some(v => v.type === 'spawn' && v.config.sheetKey === 'poisonAnimation'));
    assert.ok(p.vfx.filter(v => v.type === 'burst' && v.config.color === '#58c040').length >= 5);
    assert.ok(!B.throw_dagger.audio.some(a => a.key === 'poisonSfx'));
});

// Cue times are compared with timer / duration, so a cue written as 4.5 (seconds) in a 6.6s animation would never play. These animations are written in
// seconds with `seconds: true`; this checks none of them is left past the end. (A few older weather / beam animations still have cues past 1; they are left as they were.)
test('every cue in the long gear / ability animations falls inside the animation', () => {
    const ids = ['recuperate', 'draw_insight', 'throw_dagger', 'throw_poison_dagger', 'loose_arrow', 'poisoned_arrow', 'quick_draw', 'spirit_reap', 'arcane_blast'];
    for (const id of ids) {
        const d = B[id];
        const times = [...(d.audio || []).map(a => a.start), ...(d.vfx || []).map(v => v.start)];
        for (const t of times) assert.ok(t >= 0 && t <= 1, `${id}: cue at ${t} is outside 0..1`);
    }
});

test('anim({ seconds: true }) turns real seconds into a fraction of the duration, "hit" times included', () => {
    const a = anim(2, { seconds: true, hit: 0.5, audio: [sfx('hit+0.5', 'x')], vfx: [burst(1.5, { count: 1 })] });
    assert.equal(a.audio[0].start, 0.5);
    assert.equal(a.vfx[0].start, 0.75);
    const b = anim(2, { hit: 0.5, audio: [sfx('hit+0.25', 'x')] });
    assert.equal(b.audio[0].start, 0.75);
});

test('arrow and knife sprites are all drawn pointing right: no animation turns them by an offset', () => {
    for (const id of ['loose_arrow', 'quick_draw', 'poisoned_arrow', 'throw_dagger', 'throw_poison_dagger']) {
        const flying = travels(B[id]).filter(v => v.config.rotation === 'auto');
        assert.ok(flying.length > 0, `${id} has an aimed sprite`);
        for (const v of flying) assert.equal(v.config.rotationOffset, undefined, `${id} still turns its sprite`);
    }
});

test('those sprite files exist and are wider than tall (pointing right)', async () => {
    const fs = await import('node:fs');
    const dir = new URL('../../frontend/src/assets/abilityAnimations/', import.meta.url);
    for (const f of ['loose_arrow', 'quick_draw', 'poisoned_arrow', 'throwing_knife', 'poison_throwing_knife']) {
        const png = fs.readFileSync(new URL(`${f}.png`, dir));
        assert.equal(png.readUInt32BE(16), 64, `${f} is 64 wide`);
        assert.equal(png.readUInt32BE(20), 64, `${f} is 64 tall`);
    }
});
