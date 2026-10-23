import { DAMAGE_SCALING, DAMAGE_SCALING_MODE } from '../core/constants.js';
import { HP_PER_VIGOR_SCALE, STAMINA_RECOVERY_PER_DEX, INSIGHT_RECOVERY_PER_ATT } from './statCalculator.js';

// What each attribute does, for the in-game help (hover / select an attribute on the level-up, character creator, character
// summary and encounter screens). The numbers are not typed in here: damage comes from DAMAGE_SCALING (core/constants.js) and the
// pools from the same constants StatCalculator uses, so changing the balance changes the help text with it.

export const ATTRIBUTE_KEYS = ['vigor', 'strength', 'dexterity', 'intelligence', 'attunement'];

const NAMES = {
    vigor: 'Vigor',
    strength: 'Strength',
    dexterity: 'Dexterity',
    intelligence: 'Intelligence',
    attunement: 'Attunement',
};

const TAGLINES = {
    vigor: 'Toughness and endurance.',
    strength: 'Raw physical force.',
    dexterity: 'Agility and precision.',
    intelligence: 'Mind and will.',
    attunement: 'Affinity with the elements.',
};

// A line of the game's story for each attribute, shown last and quietly on the card (italic, muted). Each says how that attribute keeps madness at bay, in the
// voice of the starting backgrounds (character creator): the blacksmiths who kept their sanity, the rangers who left the cities, the scholars who studied magic and
// the hermits who studied it alone. Magic is what drives people mad, and Insight is what it costs. It never carries a number or a rule.
const FLAVOR = {
    vigor: 'A sound body is the last wall madness must climb.',
    strength: 'Honest labour leaves little room for the whispers. The smiths kept their wits.',
    dexterity: 'A mind watching its footing has no time to listen. Keep moving.',
    intelligence: 'Reason is the lamp you hold against the dark. The scholars found it burns thin.',
    attunement: 'Touch magic and it touches back. This is how long you can listen before it answers.',
};

// Statements of fact about stats that are not in the formulas (kept short; the rows below carry the numbers)
const NOTES = {
    vigor: 'Defense is taken off every hit you receive.',
    dexterity: 'Stamina pays for physical abilities.',
    attunement: 'Insight pays for spells.',
};

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// 1 -> "1", 0.65 -> "0.65", 1.5 -> "1.5"
export const trimNumber = (n) => String(Math.round(n * 100) / 100);

const perPoint = (n) => `+${trimNumber(n)} per point`;

// Damage types an attribute feeds, grouped by weight: [{ types: ['blunt'], weight: 1, highest: false }, ...]
// highest: the type only counts this attribute while it is the higher of the ones feeding it (slash: Strength or Dexterity)
export function damageTypesFor(attr) {
    const groups = new Map();
    for (const [type, weights] of Object.entries(DAMAGE_SCALING)) {
        const w = weights[attr];
        if (!w) continue;
        const highest = DAMAGE_SCALING_MODE[type] === 'highest';
        const key = `${w}|${highest}`;
        if (!groups.has(key)) groups.set(key, { types: [], weight: w, highest });
        groups.get(key).types.push(type);
    }
    return [...groups.values()].sort((a, b) => (b.weight - a.weight) || (a.highest - b.highest));
}

const joinNames = (types) => {
    const names = types.map(cap);
    if (names.length <= 1) return names.join('');
    return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
};

/**
 * @param {string} attr  one of ATTRIBUTE_KEYS
 * @param {object} [opts]
 * @param {object} [opts.multipliers]  the character's statMultipliers ({ hpPerVigor, staminaPerDex, insightPerAtt }); defaults match new characters
 * @param {boolean} [opts.skillChecks] add the line about encounter skill checks (the encounter screen)
 * @returns {{ key, name, tagline, rows: {label, value, kind}[], note: string ('' when there is none), detail: string, flavor: string } | null}
 */
export function getStatDescription(attr, opts = {}) {
    const key = String(attr || '').toLowerCase();
    if (!ATTRIBUTE_KEYS.includes(key)) return null;

    const mults = { hpPerVigor: 3, staminaPerDex: 2, insightPerAtt: 2, ...(opts.multipliers || {}) };
    const rows = [];

    if (key === 'vigor') {
        rows.push({ label: 'Max HP', value: perPoint(mults.hpPerVigor * HP_PER_VIGOR_SCALE), kind: 'hp' });
        rows.push({ label: 'Defense (all types)', value: '+1 per 2 points', kind: 'defense' });
    }

    // Attack rows come straight from the scaling table
    for (const { types, weight, highest } of damageTypesFor(key)) {
        const label = types.length <= 3 ? `${types.map(cap).join(' / ')} attack` : 'Each elemental attack';
        rows.push({ label, value: perPoint(weight) + (highest ? ', if higher' : ''), kind: 'attack' });
    }

    if (key === 'dexterity') {
        rows.push({ label: 'Max stamina', value: perPoint(mults.staminaPerDex), kind: 'stamina' });
        rows.push({ label: 'Stamina recovery', value: `+${trimNumber(STAMINA_RECOVERY_PER_DEX)} per point`, kind: 'stamina' });
    }
    if (key === 'attunement') {
        rows.push({ label: 'Max insight', value: perPoint(mults.insightPerAtt), kind: 'insight' });
        rows.push({ label: 'Insight recovery', value: `+${trimNumber(INSIGHT_RECOVERY_PER_ATT)} per point`, kind: 'insight' });
    }

    if (opts.skillChecks) {
        rows.push({ label: 'Skill checks', value: '+1 per 3 above 10', kind: 'check' });
    }

    // For the elements, say which ones (the row label can only say "Elemental")
    const wide = damageTypesFor(key).find(g => g.types.length > 3);
    const detail = wide ? `${joinNames(wide.types)}.` : '';

    return {
        key,
        name: NAMES[key],
        tagline: TAGLINES[key],
        rows,
        detail,
        note: NOTES[key] || '',
        flavor: FLAVOR[key] || '',
    };
}
