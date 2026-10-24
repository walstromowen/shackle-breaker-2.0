// backend/test/arcaneblast.test.js: `npm test`. The Arcane Blast ability: a heavy arcane beam, streamed out like Flamethrower.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { AbilityDefinitions as A } from '../../shared/abilities/abilityDefinitions.js';
import { BattleAnimationDefinitions as B } from '../../shared/battle/animation/battleAnimationDefinition.js';
import { ItemDefinitions as I } from '../../shared/items/itemDefinitions.js';

test('Arcane Blast hits harder than Arcane Dart and Magic Missile, costs more insight, and is slower', () => {
    const a = A.arcane_blast, dart = A.arcane_dart;
    assert.equal(a.effects[0].damageType, 'arcane');
    assert.ok(a.effects[0].power >= 2.25, `power ${a.effects[0].power}`);
    assert.ok(a.cost.insight > dart.cost.insight);
    assert.ok(a.speedModifier < 1);
    assert.equal(a.targeting.scope, 'enemy');
    assert.equal(a.targeting.select, 'single');
    assert.equal(a.animationId, 'arcane_blast');
    assert.deepEqual(a.selfStatusEffects.map(e => e.id), ['recharging'], 'the user must recharge next turn');
    assert.equal(a.selfStatusEffects[0].chance, 1.0);
    assert.equal(A.hyper_beam, undefined, 'Hyper Beam is gone; Arcane Blast replaces it');
    assert.equal(B.hyper_beam, undefined);
    const sameIcon = Object.values(A).filter(x => x.icon && x.icon.col === a.icon.col && x.icon.row === a.icon.row);
    assert.equal(sameIcon.length, 1, 'the icon cell is its own');
});

test('Arcane Blast streams the arcane_blast.png swirl to the target, with no impact effect on the target', () => {
    const d = B.arcane_blast;
    const beam = d.vfx.filter(v => v.type === 'travel' && v.config.sheetKey === 'arcaneBlastAnimation');
    assert.ok(beam.length >= 30, `${beam.length} swirls`);
    const first = Math.min(...beam.map(v => v.start)), last = Math.max(...beam.map(v => v.start));
    assert.ok((last - first) * d.duration >= 0.9, 'the beam lasts a second or so');
    assert.ok(first * d.duration >= 0.5, 'there is a charge-up before it');
    assert.ok(d.vfx.some(v => v.config.movement === 'spiral'), 'sparks circle in while it charges');
    assert.ok(!d.vfx.some(v => v.config.sheetKey === 'impactAnimation'), 'no impact sprite');
    assert.ok(!d.vfx.some(v => v.type === 'burst'), 'no impact sparks');
    assert.ok(d.vfx.filter(v => v.origin === 'target').length === 0, 'nothing is drawn on the target');
    assert.ok(d.target.shake && d.target.flash);
    for (const t of [...d.audio, ...d.vfx].map(c => c.start)) assert.ok(t >= 0 && t <= 1);
});

test('the Arcane Blast sprite is the repo asset, and the Insight of Arcane staff unlocks the ability at level 3', () => {
    const main = fs.readFileSync(new URL('../../frontend/src/main.js', import.meta.url), 'utf8');
    assert.match(main, /arcaneBlastAnimation:\s*'\.\/assets\/abilityAnimations\/arcane_blast\.png'/);
    assert.ok(fs.existsSync(new URL('../../frontend/src/assets/abilityAnimations/arcane_blast.png', import.meta.url)));
    assert.deepEqual(I.insight_of_arcane.abilityUnlocks[3], ['arcane_blast']);
    assert.ok(I.insight_of_arcane.abilityUnlocks[2].includes('magic_missile'));
});

test('the Arcane Blast orbs fly in one straight, dense line: no sideways scatter, orbs overlapping', () => {
    const d = B.arcane_blast;
    const beam = d.vfx.filter(v => v.type === 'travel' && v.config.sheetKey === 'arcaneBlastAnimation');
    assert.ok(beam.every(v => !v.config.offsetY && !v.config.offsetX && !v.config.arc), 'no offsets, no arc');
    const core = beam.filter(v => !v.config.alpha || v.config.alpha >= 1);
    const times = core.map(v => v.start * d.duration).sort((a, b) => a - b);
    const gaps = times.slice(1).map((t, i) => t - times[i]);
    assert.ok(core.length >= 60, `${core.length} core orbs`);
    assert.ok(Math.max(...gaps) <= 0.02, 'a new orb every 20ms or less');
});

test('thrown daggers and arrows are drawn small (scale below 1) in flight and on impact', async () => {
    for (const id of ['loose_arrow', 'quick_draw', 'poisoned_arrow', 'throw_dagger', 'throw_poison_dagger']) {
        for (const v of B[id].vfx.filter(v => v.config.sheetKey && v.config.sheetKey !== 'poisonAnimation')) {
            assert.ok(v.config.scale < 1, `${id} ${v.config.sheetKey} scale ${v.config.scale}`);
        }
    }
});
