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
        assert.ok(tick && tick.rate > 0 && tick.attackAverage === (resource === 'stamina' ? 'physical' : 'magical'), `${status} restores ${resource} from the average ${resource === 'stamina' ? 'physical' : 'magical'} attack`);
    }
});

test('the status ticks follow the holder\'s average physical / magical attack', () => {
    const holder = (attack) => ({ name: 'T', level: 1, stamina: 0, insight: 0, getAttack: (t) => attack[t] || 0, modifyResource(k, n) { this[k] += n; } });
    const tick = (status, h) => { new StatusEffectModel(S[status]).onEvent('ON_TURN_END', h); return h; };
    const phys = { blunt: 10, slash: 20, pierce: 15 };                 // average 15
    const magic = Object.fromEntries(['fire', 'ice', 'lightning', 'water', 'earth', 'wind', 'light', 'dark', 'arcane'].map(t => [t, 10]));
    const weak = tick('second_wind', holder({ blunt: 6, slash: 6, pierce: 6 })).stamina;
    const strong = tick('second_wind', holder({ ...phys })).stamina;
    assert.equal(strong, Math.round(15 * S.second_wind.effects[0].rate));
    assert.ok(strong > weak, 'a stronger build regains more');
    assert.equal(tick('second_wind', holder({ ...magic })).stamina, 1, 'magic attack does not feed Second Wind (no physical attack: the minimum of 1)');
    assert.equal(tick('drawing_insight', holder({ ...magic, fire: 40 })).insight, Math.round(((40 + 80) / 9) * S.drawing_insight.effects[0].rate));
    assert.equal(tick('drawing_insight', holder({ blunt: 50, slash: 50, pierce: 50 })).insight, 1, 'physical attack does not feed Drawing Insight');
    // a real entity (no getAttack): the stats come from calculatedStats
    const entity = { name: 'E', level: 1, stamina: 0, calculatedStats: { attack: phys }, modifyResource(k, n) { this[k] += n; } };
    assert.equal(tick('second_wind', entity).stamina, strong);
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
