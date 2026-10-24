// backend/test/gearabilities.test.js: `npm test`. Armor abilities, the handaxe as a tool, two-handed weapons, bow animations and the cures.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ItemDefinitions as I } from '../../shared/items/itemDefinitions.js';
import { AbilityDefinitions as A } from '../../shared/abilities/abilityDefinitions.js';
import { BattleAnimationDefinitions as B } from '../../shared/battle/animation/battleAnimationDefinition.js';
import { StatusEffectDefinitions as S } from '../../shared/abilities/statusEffectDefinitions.js';
import { StatusEffectModel } from '../../shared/abilities/statusEffectModel.js';
import { craftingRecipeDefinitions as R } from '../../shared/items/craftingRecipeDefinitions.js';

const sumAttack = (o = {}) => Object.values(o).reduce((a, b) => a + b, 0);

test('the tier 1 body armors each grant an ability: cloth Draw Insight, leather Recuperate, iron Bolster', () => {
    assert.deepEqual(I.cloth_robe.grantedAbilities, ['draw_insight']);
    assert.deepEqual(I.leather_armor.grantedAbilities, ['recuperate']);
    assert.deepEqual(I.iron_armor.grantedAbilities, ['bolster']);
    for (const id of ['draw_insight', 'recuperate', 'bolster']) assert.ok(A[id], id);
});

test('Recuperate and Draw Insight give a 5 turn status that restores stamina / insight each turn', () => {
    for (const [ability, status, resource] of [['recuperate', 'second_wind', 'stamina'], ['draw_insight', 'clear_mind', 'insight']]) {
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
    assert.equal(tick('clear_mind', holder({ ...magic, fire: 40 })).insight, Math.round(((40 + 80) / 9) * S.clear_mind.effects[0].rate));
    assert.equal(tick('clear_mind', holder({ blunt: 50, slash: 50, pierce: 50 })).insight, 1, 'physical attack does not feed Clear Mind');
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
    for (const id of ['loose_arrow', 'quick_draw', 'poisoned_arrow', 'triple_shot']) {
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
