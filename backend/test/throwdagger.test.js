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

test('the thrown knife is the item icon (consumables sheet cells 7,0 and 8,0), aimed, and stays in the target for a moment', () => {
    for (const [id, col] of [['throw_dagger', 7], ['throw_poison_dagger', 8]]) {
        const main = travels(B[id]).find(v => v.config.flight);
        assert.ok(main, `${id} has a travel sprite that holds`);
        assert.equal(main.config.sheetKey, 'consumables');
        assert.equal(main.config.cellCol, col);
        assert.equal(main.config.cellRow, 0);
        assert.equal(main.config.frameSize, 64);
        assert.equal(main.config.rotation, 'auto');
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
    const ids = ['recuperate', 'draw_insight', 'throw_dagger', 'throw_poison_dagger', 'loose_arrow', 'poisoned_arrow', 'quick_draw', 'triple_shot', 'spirit_reap'];
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
