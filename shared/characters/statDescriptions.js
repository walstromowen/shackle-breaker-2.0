import { DAMAGE_SCALING, BEST_OF_SCALING, DEFENSE_PER_SCALING_POINT, CORRUPTION } from '../core/constants.js';
import { HP_PER_VIGOR_SCALE, STAMINA_RECOVERY_PER_DEX, INSIGHT_RECOVERY_PER_ATT, STAMINA_RECOVERY_ATTRIBUTES, INSIGHT_RECOVERY_ATTRIBUTES } from './statCalculator.js';

// What each attribute and stat does, for the in-game help (hover / select one on the level-up, character creator, character summary and
// encounter screens). The words are the game's own: the descriptions come from the first version of the game's stat help, brought up to date.
// The numbers are not typed in here: damage comes from DAMAGE_SCALING (core/constants.js) and the pools from the same constants
// StatCalculator uses, so changing the balance changes the help text with it.

export const ATTRIBUTE_KEYS = ['vigor', 'strength', 'dexterity', 'intelligence', 'attunement'];

const NAMES = {
    vigor: 'Vigor',
    strength: 'Strength',
    dexterity: 'Dexterity',
    intelligence: 'Intelligence',
    attunement: 'Attunement',
};

// The first version's wording, with the facts brought up to date (what each attribute really feeds now) and the spelling mended.
const DESCRIPTIONS = {
    vigor: "A measure of how many hits one can take. Affects max health points as well as one's defense against every kind of attack. Also determines the effectiveness of decisions that require one to endure hardship.",
    strength: "A measure of one's physical prowess. Affects blunt and slash damage and defense, and how quickly one's stamina recovers. Also determines the effectiveness of decisions that require one to utilize strength.",
    dexterity: "A measure of one's finesse. Affects slash and pierce damage and defense, one's maximum stamina and how quickly it recovers. Also determines the effectiveness of decisions that require sleight of hand, stealth, and mobility.",
    intelligence: "A measure of one's knowledge. Affects light, dark and arcane damage and defense, and how quickly one's insight recovers. Also determines the effectiveness of decisions that require perception, problem solving, academia, and logical reasoning.",
    attunement: "A measure of one's attachment to the elements. Affects the damage and defense of the six elements, one's maximum insight and how quickly it recovers. Also determines the effectiveness of decisions that utilize perception, intuition, and nature.",
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
    strength: 'Slash uses the higher of Strength or Dexterity, not both.',
    dexterity: 'Stamina pays for physical abilities. Slash uses the higher of Strength or Dexterity, not both.',
    attunement: 'Insight pays for spells.',
};

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// 1 -> "1", 0.65 -> "0.65", 1.5 -> "1.5"
export const trimNumber = (n) => String(Math.round(n * 100) / 100);

const perPoint = (n) => `+${trimNumber(n)} per point`;

// Damage types an attribute feeds, grouped by weight: [{ types: ['blunt', 'slash', 'pierce'], weight: 1 }, ...]
export function damageTypesFor(attr) {
    const groups = new Map();
    for (const [type, weights] of Object.entries(DAMAGE_SCALING)) {
        const w = weights[attr];
        if (!w) continue;
        if (!groups.has(w)) groups.set(w, { types: [], weight: w });
        groups.get(w).types.push(type);
    }
    return [...groups.values()].sort((a, b) => b.weight - a.weight);
}

const ELEMENTS = ['fire', 'ice', 'lightning', 'water', 'earth', 'wind'];
// 'Blunt / Slash attack', or 'Every elemental attack' for the six elements (the card's detail line names them)
const groupLabel = (types, stat) => {
    if (types.length === ELEMENTS.length && ELEMENTS.every(t => types.includes(t))) return `Every elemental ${stat}`;
    if (types.length <= 3) return `${types.map(cap).join(' / ')} ${stat}`;
    return `${types.length} damage types (${stat})`;
};
const halfRate = (w) => {
    const per = w * DEFENSE_PER_SCALING_POINT;
    return per === 0.5 ? '+1 per 2 points' : perPoint(per);
};

const joinNames = (types) => {
    const names = types.map(cap);
    if (names.length <= 1) return names.join('');
    return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
};

// The stats that are not attributes. Where one comes in a version per damage type (attack, defense, resistance), the key is 'attack:blunt'.
export const STAT_KEYS = ['level', 'xp', 'currency', 'skillPoints', 'maxHp', 'maxStamina', 'maxInsight', 'hpRecovery', 'staminaRecovery', 'insightRecovery',
    'speed', 'accuracy', 'evasion', 'critChance', 'critMultiplier', 'corruption', 'attack', 'defense', 'resistance'];
const TYPED_STATS = ['attack', 'defense', 'resistance'];

const STAT_NAMES = {
    level: 'Level', xp: 'Experience', currency: 'Currency', skillPoints: 'Skill Points',
    maxHp: 'Max Health', maxStamina: 'Max Stamina', maxInsight: 'Max Insight',
    hpRecovery: 'Health Recovery', staminaRecovery: 'Stamina Recovery', insightRecovery: 'Insight Recovery',
    speed: 'Speed', accuracy: 'Accuracy', evasion: 'Evasion', critChance: 'Critical', critMultiplier: 'Critical Damage', corruption: 'Corruption',
};

const STAT_DESCRIPTIONS = {
    level: "Value determining one's overall power. Higher levels will result in more dangerous encounters and foes.",
    xp: "Experience earned from fights and encounters. Reaching the amount shown raises one's level and grants a skill point.",
    currency: "Coins carried by the party. They can be used to buy and upgrade items, as well as to barter with others.",
    skillPoints: "Points available to the current character. Each one raises the value of one attribute and its corresponding stats.",
    maxHp: "Value measuring one's life.",
    maxStamina: "Value measuring one's ability to perform physical abilities.",
    maxInsight: "Value measuring one's ability to perform magical abilities.",
    hpRecovery: "Health recovered at the end of a round of combat.",
    staminaRecovery: "Stamina recovered at the end of a round of combat.",
    insightRecovery: "Insight recovered at the end of a round of combat.",
    speed: "Additive value impacting ability turn order.",
    accuracy: "Multiplicative value impacting if one's own abilities land. It is set against the target's evasion.",
    evasion: "Multiplicative value impacting if a hostile ability lands.",
    critChance: "Chance for an ability to land a critical hit, dealing bonus damage.",
    critMultiplier: "How much damage a critical hit deals, compared to a normal one.",
    corruption: "A measure of one's progress towards becoming shackled. Impacts and is affected by moral decisions.",
};

const an = (word) => (/^[aeiou]/i.test(word) ? 'an ' : 'a ') + word;

const TYPED = {
    attack: (type) => `Raw damage delivered to a target as a result of ${an(type)} attack.`,
    defense: (type) => `Additive value negated on receiving ${an(type)} attack.`,
    resistance: (type) => `Multiplicative value negated on receiving ${an(type)} attack.`,
};

// 'attack:blunt' -> { key: 'attack', type: 'blunt' }; 'speed' -> { key: 'speed', type: null }
export function parseStatId(id) {
    const [key, type] = String(id || '').split(':');
    return { key, type: type || null };
}

/**
 * The help for one attribute or stat.
 * @param {string} attr  one of ATTRIBUTE_KEYS or STAT_KEYS ('attack', 'defense' and 'resistance' with a damage type: 'attack:blunt', or opts.type)
 * @param {object} [opts]
 * @param {object} [opts.multipliers]  the character's statMultipliers ({ hpPerVigor, staminaPerDex, insightPerAtt }); defaults match new characters
 * @param {boolean} [opts.skillChecks] add the line about encounter skill checks (the encounter screen)
 * @param {string} [opts.type]  the damage type, for attack / defense / resistance
 * @returns {{ key, name, description, rows: {label, value, kind}[], note: string ('' when there is none), detail: string, flavor: string } | null}
 */
export function getStatDescription(attr, opts = {}) {
    const parsed = parseStatId(attr);
    const key = ATTRIBUTE_KEYS.includes(parsed.key.toLowerCase()) ? parsed.key.toLowerCase() : parsed.key;
    const type = (parsed.type || opts.type || '').toLowerCase() || null;
    if (ATTRIBUTE_KEYS.includes(key)) return describeAttribute(key, opts);
    if (STAT_KEYS.includes(key)) return describeStat(key, type, opts);
    return null;
}

// "max health halved, magic damage +25%" for one corruption tier
const tierEffects = (tier) => {
    const parts = [];
    if (tier.maxHpMultiplier !== undefined) parts.push(tier.maxHpMultiplier === 0.5 ? 'max health halved' : `max health x${trimNumber(tier.maxHpMultiplier)}`);
    if (tier.magicDamageBonus) parts.push(`magic damage +${Math.round(tier.magicDamageBonus * 100)}%`);
    return parts.join(', ');
};

const multipliersOf = (opts) => ({ hpPerVigor: 3, staminaPerDex: 2, insightPerAtt: 2, ...(opts.multipliers || {}) });
const feederRows = (type, kind = 'attack') => Object.entries(DAMAGE_SCALING[type] || {}).map(([attr, w]) => ({ label: NAMES[attr], value: kind === 'attack' ? perPoint(w) : halfRate(w), kind }));
const bestOfNote = (type) => {
    if (!BEST_OF_SCALING.includes(type)) return '';
    return `Uses the higher of ${Object.keys(DAMAGE_SCALING[type]).map(a => NAMES[a]).join(' or ')}, not both. `;
};

function describeStat(key, type, opts) {
    const mults = multipliersOf(opts);
    const rows = [];
    let name = STAT_NAMES[key] || cap(key), description = STAT_DESCRIPTIONS[key] || '', note = '';

    if (TYPED_STATS.includes(key)) {
        if (!type || !DAMAGE_SCALING[type]) return null;
        name = `${cap(type)} ${cap(key)}`;
        description = TYPED[key](type);
    }

    if (key === 'level') {
        rows.push({ label: 'Defense (all types)', value: '+1 per 2 levels', kind: 'defense' });
        rows.push({ label: 'Skill points', value: '+1 per level', kind: 'check' });
    } else if (key === 'maxHp') {
        rows.push({ label: NAMES.vigor, value: perPoint(mults.hpPerVigor * HP_PER_VIGOR_SCALE), kind: 'hp' });
    } else if (key === 'maxStamina') {
        rows.push({ label: NAMES.dexterity, value: perPoint(mults.staminaPerDex), kind: 'stamina' });
        note = 'Stamina pays for physical abilities.';
    } else if (key === 'maxInsight') {
        rows.push({ label: NAMES.attunement, value: perPoint(mults.insightPerAtt), kind: 'insight' });
        note = 'Insight pays for spells.';
    } else if (key === 'staminaRecovery') {
        for (const a of STAMINA_RECOVERY_ATTRIBUTES) rows.push({ label: NAMES[a], value: perPoint(STAMINA_RECOVERY_PER_DEX), kind: 'stamina' });
    } else if (key === 'insightRecovery') {
        for (const a of INSIGHT_RECOVERY_ATTRIBUTES) rows.push({ label: NAMES[a], value: perPoint(INSIGHT_RECOVERY_PER_ATT), kind: 'insight' });
    } else if (key === 'corruption') {
        // What it does comes from the same table the game plays by (CORRUPTION in core/constants.js)
        rows.push({ label: 'Each magical ability used', value: `+${CORRUPTION.PER_MAGIC_USE}%`, kind: 'attack' });
        for (const tier of CORRUPTION.TIERS) rows.push({ label: `At ${tier.at}%`, value: tierEffects(tier), kind: 'defense' });
        rows.push({ label: `At ${CORRUPTION.SHACKLE_AT}%`, value: 'Shackled', kind: 'defense' });
        note = 'Cruel choices raise it and kind ones lower it. A shackled member is down until a fallen meteorite breaks the chains, and may turn on the party first.';
    } else if (key === 'attack') {
        rows.push(...feederRows(type));
        note = bestOfNote(type) + "A weapon adds to it, and each ability multiplies it by its power.";
    } else if (key === 'defense') {
        rows.push(...feederRows(type, 'defense'));
        rows.push({ label: NAMES.vigor, value: '+1 per 2 points', kind: 'defense' });
        rows.push({ label: 'Level', value: '+1 per 2 levels', kind: 'defense' });
        note = bestOfNote(type) + 'Taken off every hit of this type, after resistance.';
    } else if (key === 'resistance') {
        note = 'A share of the damage, taken off before defense.';
    } else if (key === 'speed') {
        note = 'The faster side acts first in a round.';
    } else if (key === 'evasion') {
        note = "A hit lands with the attacker's accuracy divided by this, never more than 95%.";
    } else if (key === 'accuracy') {
        note = "A hit lands with this divided by the target's evasion, never more than 95%.";
    }

    return { key: type ? `${key}:${type}` : key, name, description, rows, detail: '', note, flavor: '' };
}

function describeAttribute(key, opts) {
    const mults = multipliersOf(opts);
    const rows = [];

    if (key === 'vigor') {
        rows.push({ label: 'Max HP', value: perPoint(mults.hpPerVigor * HP_PER_VIGOR_SCALE), kind: 'hp' });
        rows.push({ label: 'Defense (all types)', value: '+1 per 2 points', kind: 'defense' });
    }

    // Attack and defense rows come straight from the scaling table
    for (const { types, weight } of damageTypesFor(key)) {
        rows.push({ label: groupLabel(types, 'attack'), value: perPoint(weight), kind: 'attack' });
        rows.push({ label: groupLabel(types, 'defense'), value: halfRate(weight), kind: 'defense' });
    }

    if (key === 'dexterity') {
        rows.push({ label: 'Max stamina', value: perPoint(mults.staminaPerDex), kind: 'stamina' });
    }
    if (STAMINA_RECOVERY_ATTRIBUTES.includes(key)) rows.push({ label: 'Stamina recovery', value: perPoint(STAMINA_RECOVERY_PER_DEX), kind: 'stamina' });
    if (key === 'attunement') {
        rows.push({ label: 'Max insight', value: perPoint(mults.insightPerAtt), kind: 'insight' });
    }
    if (INSIGHT_RECOVERY_ATTRIBUTES.includes(key)) rows.push({ label: 'Insight recovery', value: perPoint(INSIGHT_RECOVERY_PER_ATT), kind: 'insight' });

    if (opts.skillChecks) {
        rows.push({ label: 'Skill checks', value: '+1 per 3 above 10', kind: 'check' });
    }

    // For the elements, say which ones (the row label can only say "Every elemental attack")
    const wide = damageTypesFor(key).find(g => g.types.length > 3);
    const detail = wide ? `${joinNames(wide.types)}.` : '';

    return {
        key,
        name: NAMES[key],
        description: DESCRIPTIONS[key],
        rows,
        detail,
        note: NOTES[key] || '',
        flavor: FLAVOR[key] || '',
    };
}
