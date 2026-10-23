// backend/test/balance.test.js: `npm test`. Whole-number stats, recovery from Dexterity / Attunement, status damage scaling, bleed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENTITY_DEFINITIONS } from '../../shared/characters/entityDefinitions.js';
import { EntityFactory } from '../../shared/characters/entityFactory.js';
import { StatCalculator } from '../../shared/characters/statCalculator.js';
import { StatusEffectFactory } from '../../shared/abilities/statusEffectFactory.js';

const whole = (n) => Number.isInteger(n);
const hundredths = (n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-9;
function assertTidy(s, label) {
    for (const k of ['vigor', 'strength', 'dexterity', 'intelligence', 'attunement', 'speed', 'accuracy', 'evasion', 'corruption', 'maxHp', 'maxStamina', 'maxInsight', 'hpRecovery', 'staminaRecovery', 'insightRecovery']) assert.ok(whole(s[k]), `${label}: ${k} = ${s[k]}`);
    for (const g of ['attack', 'defense']) for (const [t, v] of Object.entries(s[g])) assert.ok(whole(v), `${label}: ${g}.${t} = ${v}`);
    for (const [t, v] of Object.entries(s.resistance)) assert.ok(hundredths(v), `${label}: resistance.${t} = ${v}`);
    assert.ok(hundredths(s.critChance) && hundredths(s.critMultiplier), `${label}: crit`);
}

test('every entity, at several levels and under percent-based statuses, has whole-number stats and hundredths for rates', () => {
    for (const id of Object.keys(ENTITY_DEFINITIONS)) {
        for (const level of [1, 4, 9]) {
            const e = EntityFactory.create(id, level);
            if (!e) continue;
            assertTidy(StatCalculator.calculate(e), `${id}@${level}`);
            for (const status of ['bleed', 'bound', 'enlightened', 'fortified']) {
                const e2 = EntityFactory.create(id, level);
                const st = StatusEffectFactory.createEffect(status); st.stacks = st.maxStacks;
                e2.applyStatusEffect(st);
                assertTidy(StatCalculator.calculate(e2), `${id}@${level}+${status}`);
            }
        }
    }
});

test('resources stay whole numbers however they are changed', () => {
    const e = EntityFactory.create('HUMANOID', 1);
    e.hp = 20.6; assert.equal(e.hp, 21);
    e.stamina = 7.4; assert.equal(e.stamina, 7);
    e.modifyResource('insight', -2.5); assert.ok(whole(e.insight));
});

test('Dexterity and Attunement raise recovery, and the whole sum steps up smoothly', () => {
    const rec = (dex, att) => { const e = EntityFactory.create('HUMANOID', 1); e.state.attributes.dexterity = dex; e.state.attributes.attunement = att; const s = StatCalculator.calculate(e); return [s.staminaRecovery, s.insightRecovery]; };
    const [s10, i10] = rec(10, 10), [s20, i20] = rec(20, 20), [s30, i30] = rec(30, 30);
    assert.ok(s20 >= s10 + 3 && s30 >= s20 + 3, `stamina ${s10} ${s20} ${s30}`);
    assert.ok(i20 >= i10 + 3 && i30 >= i20 + 3, `insight ${i10} ${i20} ${i30}`);
    let last = -1;
    for (let d = 8; d <= 40; d++) { const [s] = rec(d, 10); assert.ok(s >= last, 'never goes down as Dex goes up'); last = s; }
    assert.ok(s10 >= 4 && s10 <= 6, `a fresh character recovers ${s10} stamina a round`);
});

const holder = (hp = 40, stamina = 20, level = 1) => ({ name: 'T', level, maxHp: 100, hp, stamina, calls: [], modifyResource(r, a) { this.calls.push([r, a]); this[r] = Math.max(0, this[r] + a); return a; } });

test('damage over time grows with the level of whoever inflicted it, in whole numbers', () => {
    const run = (inflictor, on) => { const st = StatusEffectFactory.createEffect('poison', null, inflictor); st.onEvent('ON_TURN_END', on); return on.calls[0][1]; };
    assert.equal(run(null, holder()), -5, 'level 1: the status value as written');
    assert.equal(run({ level: 11 }, holder()), -10, 'a level-11 inflictor doubles it');
    assert.equal(run(null, holder(40, 20, 11)), -10, 'with no inflictor it scales with the holder');
    for (const lv of [2, 3, 5, 7, 13]) assert.ok(whole(run({ level: lv }, holder())), `level ${lv}`);
});

test('bleed takes half of the current HP and half of the current stamina each turn, more per stack, never below 1', () => {
    const tick = (stacks, h) => { const st = StatusEffectFactory.createEffect('bleed'); st.stacks = stacks; st.onEvent('ON_TURN_END', h); return Object.fromEntries(h.calls.map(([r, a]) => [r, a])); };
    assert.deepEqual(tick(1, holder(40, 20)), { hp: -20, stamina: -10 });
    assert.deepEqual(tick(2, holder(40, 20)), { hp: -30, stamina: -15 });
    assert.deepEqual(tick(3, holder(40, 20)), { hp: -35, stamina: -17 });
    assert.deepEqual(tick(1, holder(1, 1)), { hp: -1, stamina: -1 });
    const h = holder(0, 0); const st = StatusEffectFactory.createEffect('bleed'); st.onEvent('ON_TURN_END', h);
    assert.equal(h.calls.length, 0, 'nothing left to take');
});
