// backend/test/gearabilities.test.js: `npm test`. Armor abilities, the handaxe as a tool, two-handed weapons, bow animations and the cures.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ItemDefinitions as I } from '../../shared/items/itemDefinitions.js';
import { AbilityDefinitions as A } from '../../shared/abilities/abilityDefinitions.js';
import { BattleAnimationDefinitions as B } from '../../shared/battle/animation/battleAnimationDefinition.js';
import { StatusEffectDefinitions as S } from '../../shared/abilities/statusEffectDefinitions.js';
import { ItemModel } from '../../shared/items/itemModel.js';
import { StatusEffectModel } from '../../shared/abilities/statusEffectModel.js';
import { craftingRecipeDefinitions as R } from '../../shared/items/craftingRecipeDefinitions.js';

const sumAttack = (o = {}) => Object.values(o).reduce((a, b) => a + b, 0);

test('body armor abilities by level: cloth Draw Insight at 1, leather Recuperate at 1 and Hide at 2, iron Bolster at 2', () => {
    const at = (id, level) => new ItemModel(id, { level }).grantedAbilities;
    assert.deepEqual(at('cloth_robe', 1), ['draw_insight']);
    assert.deepEqual(at('leather_armor', 1), ['recuperate']);
    assert.deepEqual(at('leather_armor', 2), ['recuperate', 'hide']);
    assert.deepEqual(at('iron_armor', 1), []);
    assert.deepEqual(at('iron_armor', 2), ['bolster']);
    assert.deepEqual(at('iron_armor', 3), ['bolster']);
    for (const id of ['draw_insight', 'recuperate', 'bolster', 'hide']) assert.ok(A[id], id);
});

test('Recuperate and Draw Insight give a 5 turn status that restores stamina / insight each turn', () => {
    for (const [ability, status, resource] of [['recuperate', 'second_wind', 'stamina'], ['draw_insight', 'drawing_insight', 'insight']]) {
        const ab = A[ability];
        assert.equal(ab.targeting.scope, 'self');
        assert.deepEqual(ab.statusEffects.map(s => s.id), [status]);
        assert.equal(ab.statusEffects[0].duration, 5);
        assert.ok(B[ab.animationId], `${ability} has its own animation`);
        const def = S[status];
        assert.equal(def.defaultCharges, 5);
        const tick = def.effects.find(e => e.trigger === 'ON_TURN_END' && e.modify === resource);
        assert.ok(tick && tick.recovery === true, `${status} restores ${resource} equal to the holder's own ${resource} recovery`);
    }
});

test('the status ticks give back as much as the holder\'s own recovery value', () => {
    const holder = (rec) => ({ name: 'T', level: 1, stamina: 0, insight: 0, ...rec, modifyResource(k, n) { this[k] += n; } });
    const tick = (status, h) => { new StatusEffectModel(S[status]).onEvent('ON_TURN_END', h); return h; };
    assert.equal(tick('second_wind', holder({ staminaRecovery: 6, insightRecovery: 2 })).stamina, 6);
    assert.equal(tick('second_wind', holder({ staminaRecovery: 6, insightRecovery: 2 })).insight, 0, 'only stamina');
    assert.equal(tick('drawing_insight', holder({ staminaRecovery: 6, insightRecovery: 2 })).insight, 2);
    assert.equal(tick('drawing_insight', holder({ staminaRecovery: 6, insightRecovery: 2 })).stamina, 0, 'only insight');
    assert.equal(tick('second_wind', holder({ staminaRecovery: 11 })).stamina, 11, 'a stronger recovery gives back more');
    assert.equal(tick('drawing_insight', holder({ insightRecovery: 0 })).insight, 1, 'never less than 1');
    assert.equal(tick('second_wind', holder({ staminaRecovery: 4.6 })).stamina, 5, 'rounded, like the round-end recovery');
});

test('the handaxe costs no iron anywhere, and is weaker than the shortsword', () => {
    const recipe = Object.values(R).find(r => r.outputItemId === 'handaxe');
    assert.ok(recipe && !Object.keys(recipe.materials).some(m => /iron|steel/.test(m)), 'recipe');
    for (const [lvl, cost] of Object.entries(I.handaxe.upgradeCosts)) assert.ok(!Object.keys(cost.materials).some(m => /iron|steel/.test(m)), `upgrade ${lvl}`);
    assert.ok(sumAttack(I.handaxe.attack) < sumAttack(I.shortsword.attack));
    assert.ok(sumAttack(I.handaxe.statGrowth.attack) < sumAttack(I.shortsword.statGrowth.attack));
    assert.deepEqual(I.handaxe.harvestTool, ['axe']);
});

test('two-handed weapons got a small bump over what they were', () => {
    const was = { warhammer: 5, shortbow: 6, crossbow: 6, scythe: 6, glaive: 7 };
    for (const [id, total] of Object.entries(was)) {
        const now = sumAttack(I[id].attack);
        assert.equal(I[id].slot, 'twoHand');
        assert.equal(now, total + 1, `${id} +1 attack`);
    }
});

test('every bow animation lets the arrow land and stay in the target for a while', () => {
    for (const id of ['loose_arrow', 'quick_draw', 'poisoned_arrow']) {
        const a = B[id];
        const arrow = a.vfx.find(v => v.type === 'travel');
        const c = arrow.config;
        assert.ok(c.flight >= 0.3, `${id}: the arrow is seen flying (${c.flight}s)`);
        assert.ok(c.life - c.flight >= 1.0, `${id}: it stays in the target for ${(c.life - c.flight).toFixed(2)}s`);
        assert.ok(arrow.start + c.life <= a.duration + 1e-6, `${id}: the cast lasts as long as the arrow`);
    }
});

test('cures heal half of what a healing herb heals, and still cure', () => {
    const herb = A[I.healing_herb.useAbility].effects.find(e => e.type === 'recover').power;
    for (const [item, tag] of [['bandage', 'bleed'], ['antidote', 'poison'], ['aloe', 'burn']]) {
        const ab = A[I[item].useAbility];
        assert.equal(ab.effects.find(e => e.type === 'recover').power, herb / 2, `${item} heals half`);
        assert.deepEqual(ab.effects.find(e => e.type === 'dispel').tags, [tag]);
    }
});

test('Draw Insight shows three small arcane orbs spiralling round the user; Recuperate shows concentration lines falling over them', () => {
    const di = B.draw_insight;
    const orbs = di.vfx.filter(v => v.config.movement === 'spiral' && (v.config.alpha ?? 1) === 1);   // the faint copies behind each orb are not counted
    assert.equal(orbs.length, 3, 'three main orbs');
    assert.equal(new Set(orbs.map(o => o.config.phase)).size, 3, 'spread round the ring');
    for (const o of orbs) { assert.equal(o.origin, 'source'); assert.ok(o.config.scale <= 0.6, 'small'); assert.ok(o.config.turns >= 1, 'goes round'); assert.ok(o.start + o.config.life <= di.duration); }

    const rc = B.recuperate;
    const lines = rc.vfx.filter(v => v.type === 'burst' && v.config.shape === 'streak');
    assert.ok(lines.length >= 10, 'wave after wave of lines');
    for (const l of lines) {
        assert.equal(l.config.angle, 90, 'falls straight down');
        assert.ok(l.config.cone <= 5);
        assert.equal(l.origin, 'source');
        assert.ok(l.start + l.config.maxLife <= rc.duration + 1e-6);
    }
});

test('Triple Shot reuses the Loose Arrow animation and fires at up to three different enemies at once', async () => {
    const { AbilityModel } = await import('../../shared/abilities/abilityModel.js');
    const t = A.triple_shot;
    assert.equal(t.animationId, 'loose_arrow');
    assert.equal(t.targeting.select, 'multiple');
    assert.equal(t.targeting.count, 3);
    assert.ok(!t.targeting.allowRepeats, 'distinct targets, one shared animation');
    assert.ok(!t.multihit, 'one arrow per target, not three on one');
    assert.ok(B.loose_arrow && !B.triple_shot, 'no animation of its own any more');
    assert.equal(new AbilityModel('triple_shot').isSplash, true);
});

test('the Artifact of the Developer grants every ability there is', () => {
    const granted = new Set(I.artifact_of_the_dev.grantedAbilities);
    const missing = Object.keys(A).filter(id => !granted.has(id));
    assert.deepEqual(missing, []);
    assert.equal(granted.size, Object.keys(A).length);
});
