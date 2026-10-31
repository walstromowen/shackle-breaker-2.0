import { ItemDefinitions } from './itemDefinitions.js';

// Weapon attribute requirements, in the spirit of Souls games: any weapon can be equipped, but a wielder who does not meet ALL of its
// requirements hits much softer with it. Requirements rise with every upgrade level, so a weapon you keep upgrading keeps asking you to
// invest in both of its attributes instead of pouring every point into one.
//
// A weapon definition carries:
//   requirements:      { strength: 8, dexterity: 8 }   what level 1 asks for
//   requirementGrowth: { strength: 2, dexterity: 2 }   added for each level above 1
// StatCalculator applies the penalty; the tooltip, the character summary and the workshop show the numbers.

// BALANCE KNOB: share of the attack a wielder keeps, in the weapon's damage types, while any requirement is unmet. 0.6 = 40% less damage.
export const UNMET_REQUIREMENT_DAMAGE_SCALE = 0.6;

export const REQUIREMENT_ORDER = ['vigor', 'strength', 'dexterity', 'intelligence', 'attunement'];

const defOf = (itemOrDef) => {
    if (!itemOrDef) return null;
    if (typeof itemOrDef === 'string') return ItemDefinitions[itemOrDef] || null;
    return itemOrDef.definition || ItemDefinitions[itemOrDef.defId] || (itemOrDef.requirements || itemOrDef.type ? itemOrDef : ItemDefinitions[itemOrDef.id]) || null;
};

/** The requirements of a weapon definition at an item level (1 = as crafted). {} when it has none. */
export function requirementsAt(itemOrDef, level = 1) {
    const def = defOf(itemOrDef);
    if (!def || !def.requirements) return {};
    const ups = Math.max(0, Math.min(level, def.maxLevel || level) - 1);
    const growth = def.requirementGrowth || {};
    const out = {};
    for (const attr of REQUIREMENT_ORDER) {
        const base = def.requirements[attr] || 0;
        const total = base + (growth[attr] || 0) * ups;
        if (total > 0) out[attr] = total;
    }
    return out;
}

/** The requirements of an item instance at its current level. */
export function requirementsOf(item) {
    return requirementsAt(item, (item && item.level) || 1);
}

/** The requirements a set of attributes falls short of: [{ attr, need, have }] (empty when all are met). */
export function unmetRequirements(requirements, attributes = {}) {
    const unmet = [];
    for (const [attr, need] of Object.entries(requirements || {})) {
        const have = attributes[attr] || 0;
        if (have < need) unmet.push({ attr, need, have });
    }
    return unmet;
}

/**
 * Rows for showing requirements: [{ attr, need, have, met }] in attribute order. `attributes` is the character's final attributes
 * (StatCalculator.calculate); without one every row counts as met (have is null).
 */
export function requirementRows(requirements, attributes = null) {
    return Object.entries(requirements || {}).map(([attr, need]) => {
        const have = attributes ? (attributes[attr] || 0) : null;
        return { attr, need, have, met: have === null || have >= need };
    });
}
