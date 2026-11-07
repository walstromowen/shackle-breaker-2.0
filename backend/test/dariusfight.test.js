// backend/test/dariusfight.test.js: `npm test`. Darius the Groveler's fight: a tough boss who shrugs off big hits, blesses himself, cleanses what you put on him,
// and pools acid under the party.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENTITY_DEFINITIONS } from '../../shared/characters/entityDefinitions.js';
import { AbilityDefinitions } from '../../shared/abilities/abilityDefinitions.js';
import { StatusEffectDefinitions } from '../../shared/abilities/statusEffectDefinitions.js';
import { StatusEffectFactory } from '../../shared/abilities/statusEffectFactory.js';
import { AbilityFactory } from '../../shared/abilities/abilityFactory.js';
import { BattleAnimationDefinitions } from '../../shared/battle/animation/battleAnimationDefinition.js';
import { worthUsing } from '../../shared/battle/enemyAI.js';

const D = ENTITY_DEFINITIONS.DARIUS_THE_GROVELER;

test('Darius resists every kind of attack, so no single blow takes a big bite (light is still his weakness)', () => {
    const r = D.baseStats.baseResistance;
    for (const t of ['blunt', 'slash', 'pierce']) assert.ok(r[t] >= 0.3, `${t}: ${r[t]}`);
    for (const t of ['fire', 'ice', 'lightning', 'earth', 'wind', 'water']) assert.ok(r[t] >= 0.25, `${t}: ${r[t]}`);
    assert.ok(r.arcane >= 0.5 && r.dark >= 0.4);
    assert.ok(r.light < 0, 'light still hurts him more');
    for (const t of ['blunt', 'slash', 'pierce']) assert.ok(D.baseStats.baseDefense[t] >= 4);
    assert.ok(D.baseStats.maxHp >= 80);
});

test('he can Bless, Cleanse and pool acid', () => {
    for (const id of ['bless', 'cleanse', 'acid_pool']) {
        assert.ok(D.abilities.includes(id), `Darius knows ${id}`);
        assert.ok(AbilityDefinitions[id], `${id} exists`);
        assert.ok(BattleAnimationDefinitions[AbilityDefinitions[id].animationId], `${id} has its animation`);
    }
});

test('Bless gives Blessed for 5 turns, and Blessed really heals a share of max HP at the end of each turn', () => {
    const bless = AbilityDefinitions.bless;
    assert.deepEqual(bless.statusEffects, [{ id: 'blessed', chance: 1.0, duration: 5 }]);
    assert.equal(StatusEffectDefinitions.blessed.defaultCharges, 5);
    const target = { name: 'Darius', hp: 50, maxHp: 100, level: 10, modifyResource(r, n) { this[r] = Math.min(this['max' + r[0].toUpperCase() + r.slice(1)] ?? Infinity, this[r] + n); } };
    const status = StatusEffectFactory.createEffect('blessed', 5, target);
    status.onEvent('ON_TURN_END', target);
    assert.equal(target.hp, 56, '6% of max HP');
    status.onEvent('ON_TURN_END', target);
    assert.equal(target.hp, 62);
});

test('Cleanse throws off every harmful status the game has, and nothing helpful', () => {
    const tags = AbilityDefinitions.cleanse.effects[0].tags;
    assert.equal(AbilityDefinitions.cleanse.effects[0].type, 'dispel');
    for (const bad of ['poison', 'bleed', 'burn', 'frozen', 'wet', 'slowed', 'knocked_down', 'bound', 'paralyzed', 'dimmed', 'weakened', 'suppressed', 'vulnerable', 'exposed']) {
        assert.ok(StatusEffectDefinitions[bad], `${bad} is a status`);
        assert.ok(tags.includes(bad), `cleanses ${bad}`);
    }
    for (const good of ['blessed', 'enraged', 'fortified', 'evasive', 'enlightened', 'attuned']) assert.ok(!tags.includes(good), `keeps ${good}`);
});

test('the enemy AI does not waste a turn: no Bless while blessed, no Cleanse with nothing to cleanse', () => {
    const [bless, cleanse, acid] = AbilityFactory.createAbilities(['bless', 'cleanse', 'acid_pool']);
    const caster = (ids) => ({ statusEffects: ids.map(id => ({ id })) });
    assert.equal(worthUsing(bless, caster([])), true);
    assert.equal(worthUsing(bless, caster(['blessed'])), false);
    assert.equal(worthUsing(cleanse, caster([])), false);
    assert.equal(worthUsing(cleanse, caster(['poison'])), true);
    assert.equal(worthUsing(acid, caster(['blessed', 'poison'])), true, 'attacks are always worth it');
});
