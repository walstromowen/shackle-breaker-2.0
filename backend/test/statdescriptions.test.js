// backend/test/statdescriptions.test.js: `npm test`. The in-game help for each attribute is built from the real scaling numbers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StatCalculator } from '../../shared/systems/statCalculator.js';
import { DAMAGE_SCALING, DAMAGE_TYPES } from '../../shared/data/constants.js';
import { ATTRIBUTE_KEYS, getStatDescription, damageTypesFor, trimNumber } from '../../shared/utils/statDescriptions.js';

const ZERO = { vigor: 0, strength: 0, dexterity: 0, intelligence: 0, attunement: 0 };
const calc = (attributes) => StatCalculator.calculate({ level: 1, attributes: { ...ZERO, ...attributes }, baseStats: { maxHp: 10, maxStamina: 10, maxInsight: 10, baseAttack: {} } });

test('all five attributes are described, and anything else is not', () => {
    assert.deepEqual(ATTRIBUTE_KEYS, ['vigor', 'strength', 'dexterity', 'intelligence', 'attunement']);
    for (const k of ATTRIBUTE_KEYS) {
        const d = getStatDescription(k);
        assert.ok(d && d.name && d.tagline && d.rows.length > 0, `${k} is missing text`);
        assert.ok(d.rows.every(r => r.label && r.value), `${k} has an empty row`);
    }
    assert.equal(getStatDescription('speed'), null);
    assert.equal(getStatDescription(undefined), null);
    assert.equal(getStatDescription('VIGOR').key, 'vigor');
});

test('every damage type is explained by exactly the attributes that feed it', () => {
    for (const t of DAMAGE_TYPES) {
        const feeders = ATTRIBUTE_KEYS.filter(a => damageTypesFor(a).some(g => g.types.includes(t)));
        assert.deepEqual(feeders.sort(), Object.keys(DAMAGE_SCALING[t]).sort(), `${t}`);
    }
});

test('the numbers in the text match what the calculator really does', () => {
    // attack per point, read back from the calculator for 20 points of each attribute
    for (const a of ATTRIBUTE_KEYS) {
        const atk = calc({ [a]: 20 }).attack;
        for (const { types, weight } of damageTypesFor(a)) {
            for (const t of types) assert.equal(atk[t], Math.round(20 * weight), `${a} -> ${t}`);
        }
    }
    const rowValue = (attr, label) => getStatDescription(attr).rows.find(r => r.label === label)?.value;
    const hp = calc({ vigor: 40 }).maxHp.total ?? calc({ vigor: 40 }).maxHp;
    assert.equal(rowValue('vigor', 'Max HP'), '+1.5 per point');
    assert.equal(rowValue('vigor', 'Defense (all types)'), '+1 per 2 points');
    assert.ok(hp >= 40 * 1.5, `Vigor 40 should give about 60 HP, got ${hp}`);
    assert.equal(rowValue('dexterity', 'Max stamina'), '+2 per point');
    assert.equal(rowValue('dexterity', 'Stamina recovery'), '+0.5 per point');
    assert.equal(rowValue('attunement', 'Max insight'), '+2 per point');
    assert.equal(rowValue('attunement', 'Insight recovery'), '+0.5 per point');
});

test('slash is described as counting only while it is the higher of Strength and Dexterity', () => {
    for (const a of ['strength', 'dexterity']) {
        const row = getStatDescription(a).rows.find(r => r.label === 'Slash attack');
        assert.equal(row.value, '+1 per point, if higher', a);
    }
    assert.ok(!getStatDescription('intelligence').rows.some(r => /Slash/.test(r.label)));
});

test('the text follows a character\'s own multipliers and the skill-check option', () => {
    const tough = getStatDescription('vigor', { multipliers: { hpPerVigor: 4 } });
    assert.equal(tough.rows.find(r => r.label === 'Max HP').value, '+2 per point');
    assert.ok(!getStatDescription('vigor').rows.some(r => r.label === 'Skill checks'));
    assert.ok(getStatDescription('vigor', { skillChecks: true }).rows.some(r => r.label === 'Skill checks'));
});

test('the elements are listed in full, the arcane trio by name', () => {
    assert.equal(getStatDescription('attunement').detail, 'Fire, Ice, Lightning, Water, Earth and Wind.');
    assert.equal(getStatDescription('intelligence').rows[0].label, 'Light / Dark / Arcane attack');
    assert.equal(trimNumber(0.65), '0.65');
    assert.equal(trimNumber(1), '1');
});

test('every attribute card carries one short story line that holds no numbers', () => {
    for (const k of ATTRIBUTE_KEYS) {
        const d = getStatDescription(k);
        assert.ok(d.flavor && d.flavor.length > 20 && d.flavor.length < 100, `${k} flavor: ${d.flavor}`);
        assert.ok(!/\d/.test(d.flavor), `${k} flavor must not carry a number`);
    }
});
