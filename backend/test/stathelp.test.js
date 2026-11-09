// backend/test/stathelp.test.js: `npm test`. The attribute help cards and the level-up screen's numbers say what the game really does: every
// "+N per point" a card shows is what the StatCalculator gives for that attribute (for a person and for a beast, which plays by other rules), and
// the encounter roll each attribute is shown to give is the modifier an encounter really rolls with, on every difficulty.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EntityFactory } from '../../shared/characters/entityFactory.js';
import { StatCalculator } from '../../shared/characters/statCalculator.js';
import { getStatDescription, helpOptionsFor, ATTRIBUTE_KEYS } from '../../shared/characters/statDescriptions.js';
import { rollModifier } from '../../shared/story/encounterRolls.js';
import { gameState } from '../../shared/core/gameState.js';

const quiet = (fn) => { const l = console.log, w = console.warn; console.log = console.warn = () => {}; try { return fn(); } finally { console.log = l; console.warn = w; } };

/* "+2 per point" -> 2, "+1 per 2 points" -> 0.5, "+0.25 per point" -> 0.25 */
const rate = (v) => { const m = /^\+([\d.]+) per (\d+ )?points?$/.exec(v); assert.ok(m, `a rate: "${v}"`); return Number(m[1]) / (m[2] ? Number(m[2]) : 1); };

/* What N more points of `attr` really change, per point */
function realRates(entity, attr, n = 8) {
    const a = StatCalculator.calculate(entity), b = StatCalculator.calculate(entity, { [attr]: n });
    const per = (x, y) => (y - x) / n;
    const out = { maxHp: per(a.maxHp, b.maxHp), maxStamina: per(a.maxStamina, b.maxStamina), maxInsight: per(a.maxInsight, b.maxInsight),
        staminaRecovery: per(a.staminaRecovery, b.staminaRecovery), insightRecovery: per(a.insightRecovery, b.insightRecovery), attack: {}, defense: {} };
    for (const t of Object.keys(a.attack)) { out.attack[t] = per(a.attack[t], b.attack[t]); out.defense[t] = per(a.defense[t], b.defense[t]); }
    return out;
}

/* The card's rows against the real rates (attack / defense rows name their types) */
function checkCard(entity, label) {
    const opts = helpOptionsFor(entity, 'normal');
    for (const attr of ATTRIBUTE_KEYS) {
        // give the attribute a high value first, so slash's "higher of Strength or Dexterity" is this attribute
        const base = { ...entity.attributes }; for (const k of ATTRIBUTE_KEYS) base[k] = k === attr ? 30 : 8;
        entity.state.attributes = base;
        const real = realRates(entity, attr);
        const card = getStatDescription(attr, opts);
        const claimed = { attack: new Set(), defense: new Set() };
        for (const row of card.rows) {
            const L = row.label.toLowerCase();
            if (row.kind === 'check') continue;
            const r = rate(row.value);
            if (L === 'max hp') assert.equal(real.maxHp, r, `${label} ${attr}: max HP`);
            else if (L === 'max stamina') assert.equal(real.maxStamina, r, `${label} ${attr}: max stamina`);
            else if (L === 'max insight') assert.equal(real.maxInsight, r, `${label} ${attr}: max insight`);
            else if (L === 'stamina recovery') assert.equal(real.staminaRecovery, r, `${label} ${attr}: stamina recovery`);
            else if (L === 'insight recovery') assert.equal(real.insightRecovery, r, `${label} ${attr}: insight recovery`);
            else {
                const kind = L.endsWith('attack') ? 'attack' : 'defense';
                const types = L.startsWith('every elemental') ? ['fire', 'ice', 'lightning', 'water', 'earth', 'wind']
                    : L.startsWith('every magical') ? ['fire', 'ice', 'lightning', 'water', 'earth', 'wind', 'light', 'dark', 'arcane']
                    : L.includes('(all types)') ? Object.keys(real.defense)
                    : L.includes('damage types') ? Object.keys(real[kind]).filter(t => real[kind][t] > 0)
                    : L.replace(/ (attack|defense)$/, '').split(' / ').map(s => s.trim());
                for (const t of types) { assert.equal(real[kind][t], r, `${label} ${attr}: ${t} ${kind}`); claimed[kind].add(t); }
            }
        }
        // and nothing the attribute really raises goes unmentioned
        for (const kind of ['attack', 'defense']) for (const [t, v] of Object.entries(real[kind])) if (v > 0) assert.ok(claimed[kind].has(t), `${label} ${attr}: the card says it raises ${t} ${kind}`);
        for (const k of ['maxStamina', 'maxInsight', 'staminaRecovery', 'insightRecovery', 'maxHp']) {
            if (real[k] > 0) assert.ok(card.rows.some(r => r.label.toLowerCase() === k.replace(/([A-Z])/g, ' $1').toLowerCase().replace('max hp', 'max hp')), `${label} ${attr}: the card says it raises ${k}`);
        }
    }
}

test("every number on a person's attribute cards is what the stat calculator gives", () => {
    const hero = quiet(() => EntityFactory.create('HUMANOID', { name: 'Hero', level: 10 }));
    assert.equal(StatCalculator.usesEnemyScaling(hero), false);
    checkCard(hero, 'person');
});

test("a beast companion's cards follow the beast rules (and would be wrong with the person's)", () => {
    const dog = quiet(() => EntityFactory.create('DOG', { name: 'Rex', level: 10 }));
    assert.equal(StatCalculator.usesEnemyScaling(dog), true);
    checkCard(dog, 'beast');
    assert.match(getStatDescription('strength', helpOptionsFor(dog)).note, /beast/i);
});

test('the encounter roll each attribute is shown to give is the one encounters roll with, on every difficulty', async () => {
    const { EncounterLogic } = await import('../../frontend/src/screens/encounter/encounterLogic.js');
    const hero = quiet(() => EntityFactory.create('HUMANOID', { name: 'Hero' }));
    gameState.party.members = [hero];
    const was = gameState.difficulty;
    try {
        for (const difficulty of ['easy', 'normal', 'hard', 'nightmare']) {
            gameState.difficulty = difficulty;
            for (let v = 1; v <= 30; v++) {
                hero.state.attributes = { ...hero.state.attributes, strength: v };
                const roll = EncounterLogic.calculateRoll({ attribute: 'strength', threshold: 10 });
                assert.equal(roll.mod, rollModifier(v, difficulty), `${difficulty}, strength ${v}`);
                assert.equal(roll.total - roll.d20, roll.mod);
            }
            const none = EncounterLogic.calculateRoll({ attribute: 'none', threshold: 10 });
            assert.equal(none.mod, rollModifier(0, difficulty, { attribute: false }), `${difficulty}: a check no attribute helps`);
        }
    } finally { gameState.difficulty = was; }
    // the formula itself, spot-checked
    assert.deepEqual([9, 10, 12, 13, 16, 19].map(v => rollModifier(v, 'normal')), [0, 0, 0, 1, 2, 3]);
    assert.deepEqual([7, 9, 10, 13].map(v => rollModifier(v, 'hard')), [-3, -3, -2, -1]);
    assert.equal(rollModifier(19, 'nightmare'), 0, '+3 - 3 = 0');
    assert.equal(rollModifier(30, 'nightmare'), 1, '+6 - 3 = 3, halved to 1');
    assert.equal(rollModifier(10, 'easy'), 2);
});

test("each card shows the character's own current roll for that attribute", () => {
    const hero = quiet(() => EntityFactory.create('HUMANOID', { name: 'Hero' }));
    hero.state.attributes = { ...hero.state.attributes, dexterity: 16 };
    const card = getStatDescription('dexterity', helpOptionsFor(hero, 'normal'));
    const row = card.rows.find(r => r.label.startsWith('Your roll now'));
    assert.equal(row.value, 'd20 +2');
    assert.match(card.note, /d20/);
});
