// backend/test/statdescriptions.test.js: `npm test`. The in-game help for each attribute is built from the real scaling numbers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StatCalculator } from '../../shared/characters/statCalculator.js';
import { DAMAGE_SCALING, DAMAGE_TYPES } from '../../shared/core/constants.js';
import { ATTRIBUTE_KEYS, STAT_KEYS, getStatDescription, damageTypesFor, trimNumber } from '../../shared/characters/statDescriptions.js';

const ZERO = { vigor: 0, strength: 0, dexterity: 0, intelligence: 0, attunement: 0 };
const calc = (attributes) => StatCalculator.calculate({ level: 1, attributes: { ...ZERO, ...attributes }, baseStats: { maxHp: 10, maxStamina: 10, maxInsight: 10, baseAttack: {} } });

test('all five attributes are described, and nothing unknown is', () => {
    assert.deepEqual(ATTRIBUTE_KEYS, ['vigor', 'strength', 'dexterity', 'intelligence', 'attunement']);
    for (const k of ATTRIBUTE_KEYS) {
        const d = getStatDescription(k);
        assert.ok(d && d.name && d.description && d.rows.length > 0, `${k} is missing text`);
        assert.ok(d.rows.every(r => r.label && r.value), `${k} has an empty row`);
    }
    assert.equal(getStatDescription('nonsense'), null);
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
    assert.equal(rowValue('vigor', 'Max HP'), '+3 per point');
    assert.equal(rowValue('vigor', 'Defense (all types)'), undefined, 'Vigor is health only');
    assert.ok(hp >= 40 * 3, `Vigor 40 should give about 120 HP, got ${hp}`);
    assert.equal(rowValue('dexterity', 'Max stamina'), '+2 per point');
    assert.equal(rowValue('dexterity', 'Stamina recovery'), '+0.25 per point');
    assert.equal(rowValue('strength', 'Max stamina'), '+2 per point');
    assert.equal(rowValue('intelligence', 'Max insight'), '+2 per point');
    assert.equal(rowValue('attunement', 'Max insight'), '+2 per point');
    assert.equal(rowValue('attunement', 'Insight recovery'), '+0.25 per point');
    assert.equal(rowValue('strength', 'Stamina recovery'), '+0.25 per point');
    assert.equal(rowValue('intelligence', 'Insight recovery'), '+0.25 per point');
    assert.equal(rowValue('strength', 'Blunt / Slash defense'), '+1 per 2 points');
});

test('each attribute lists the attacks and defenses it feeds; Dexterity and Attunement also list their pools', () => {
    const labels = (k) => getStatDescription(k).rows.map(r => r.label);
    assert.deepEqual(labels('strength').filter(l => /attack/.test(l)), ['Blunt / Slash attack']);
    assert.deepEqual(labels('dexterity').filter(l => /attack/.test(l)), ['Slash / Pierce attack']);
    assert.deepEqual(labels('attunement').filter(l => /attack/.test(l)), ['Every elemental attack']);
    assert.deepEqual(labels('intelligence').filter(l => /attack/.test(l)), ['Light / Dark / Arcane attack']);
    assert.ok(!labels('vigor').some(l => /attack/.test(l)), 'vigor has no attack row');
    assert.ok(labels('dexterity').includes('Max stamina') && labels('dexterity').includes('Stamina recovery'));
    assert.ok(labels('attunement').includes('Max insight') && labels('attunement').includes('Insight recovery'));
});

test('the text follows a character\'s own multipliers and the skill-check option', () => {
    const tough = getStatDescription('vigor', { multipliers: { hpPerVigor: 4 } });
    assert.equal(tough.rows.find(r => r.label === 'Max HP').value, '+4 per point');
    assert.ok(!getStatDescription('vigor').rows.some(r => r.label === 'Skill checks'));
    assert.ok(getStatDescription('vigor', { skillChecks: true }).rows.some(r => r.label === 'Skill checks'));
});

test('the six elements are listed in full, the smaller groups by name', () => {
    assert.equal(getStatDescription('attunement').detail, 'Fire, Ice, Lightning, Water, Earth and Wind.');
    assert.equal(getStatDescription('strength').rows.find(r => /attack/.test(r.label)).label, 'Blunt / Slash attack');
    assert.equal(getStatDescription('intelligence').detail, '');
    assert.match(getStatDescription('attack:slash').note, /higher of Strength or Dexterity/);
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

test('the attribute wording is the first version\'s, brought up to date', () => {
    const d = (k) => getStatDescription(k).description;
    assert.match(d('vigor'), /^A measure of how many hits one can take\./);
    assert.match(d('strength'), /blunt and slash damage/);
    assert.match(d('dexterity'), /slash and pierce damage/);
    assert.match(d('dexterity'), /maximum stamina and how quickly it recovers/);
    assert.match(d('intelligence'), /light, dark and arcane/);
    assert.match(d('attunement'), /maximum insight and how quickly it recovers/);
    assert.match(d('attunement'), /attachment to the elements/);
});

test('every other stat has a card too, in the first version\'s words', () => {
    for (const k of STAT_KEYS.filter(k => !['attack', 'defense', 'resistance'].includes(k))) {
        const s = getStatDescription(k);
        assert.ok(s && s.name && s.description.length > 15, `${k} has no card`);
    }
    assert.equal(getStatDescription('speed').description, 'Additive value impacting ability turn order.');
    assert.equal(getStatDescription('maxHp').description, 'Value measuring one\'s life.');
    assert.match(getStatDescription('corruption').description, /shackled/);
    assert.equal(getStatDescription('attack:blunt').description, 'Raw damage delivered to a target as a result of a blunt attack.');
    assert.equal(getStatDescription('defense:arcane').description, 'Additive value negated on receiving an arcane attack.');
    assert.equal(getStatDescription('resistance:ice').name, 'Ice Resistance');
    // the typed ones need a real damage type
    assert.equal(getStatDescription('attack'), null);
    assert.equal(getStatDescription('attack:banana'), null);
    assert.equal(getStatDescription('attack', { type: 'fire' }).name, 'Fire Attack');
});

test('the stat cards\' numbers come from the same constants as the calculator', () => {
    const rowValue = (id, label) => getStatDescription(id).rows.find(r => r.label === label)?.value;
    assert.equal(rowValue('maxHp', 'Vigor'), '+3 per point');
    assert.equal(rowValue('maxStamina', 'Dexterity'), '+2 per point');
    assert.equal(rowValue('maxInsight', 'Attunement'), '+2 per point');
    assert.equal(rowValue('staminaRecovery', 'Dexterity'), '+0.25 per point');
    assert.equal(rowValue('maxStamina', 'Strength'), '+2 per point');
    assert.equal(rowValue('maxInsight', 'Intelligence'), '+2 per point');
    assert.equal(rowValue('attack:slash', 'Strength'), '+1 per point');
    assert.equal(rowValue('attack:slash', 'Dexterity'), '+1 per point');
    assert.equal(rowValue('staminaRecovery', 'Strength'), '+0.25 per point');
    assert.equal(rowValue('insightRecovery', 'Intelligence'), '+0.25 per point');
    assert.equal(rowValue('attack:fire', 'Attunement'), '+1 per point');
    assert.equal(rowValue('defense:arcane', 'Intelligence'), '+1 per 2 points');
    assert.equal(getStatDescription('attack:fire').rows.length, 1);
});
