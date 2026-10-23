// backend/test/rest.test.js: `npm test`. Rest recovers stamina AND insight, and its card says so.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AbilityDefinitions } from '../../shared/abilities/abilityDefinitions.js';
import { AbilitySystem } from '../../shared/abilities/abilitySystem.js';
import { EntityFactory } from '../../shared/characters/entityFactory.js';
import { AbilityPreview } from '../../frontend/src/ui/abilityPreview.js';

const rest = () => AbilityDefinitions.rest;

test('the Rest card lists both recoveries, stamina and insight', () => {
    const chips = AbilityPreview.getStatChips(rest(), null);
    const heals = chips.filter(c => c.label === 'Heal:').map(c => c.value);
    assert.deepEqual(heals, ['25% Max stamina', '25% Max insight']);
});

test('the Rest description matches what it does (no health)', () => {
    const d = rest().description.toLowerCase();
    assert.ok(d.includes('stamina') && d.includes('insight'));
    assert.ok(!d.includes('health'));
    assert.ok(!rest().effects.some(e => e.resource === 'hp'));
});

test('an ability with one recovery still shows one Heal chip', () => {
    const one = { effects: [{ type: 'recover', resource: 'hp', calculation: 'flat', power: 10 }], targeting: { scope: 'ally', select: 'single' } };
    assert.equal(AbilityPreview.getStatChips(one, null).filter(c => c.label === 'Heal:').length, 1);
});

test('using Rest really refills both stamina and insight, and leaves health alone', () => {
    const hero = EntityFactory.create('HUMANOID', 1);
    hero.hp = 5;
    hero.stamina = 0;
    hero.insight = 0;
    const r = AbilitySystem.execute('rest', hero, hero, { context: 'battle' });
    assert.equal(r.success, true);
    assert.equal(hero.stamina, Math.floor(hero.maxStamina * 0.25));
    assert.equal(hero.insight, Math.floor(hero.maxInsight * 0.25));
    assert.equal(hero.hp, 5);
});
