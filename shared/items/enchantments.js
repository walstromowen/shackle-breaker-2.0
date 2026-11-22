// shared/items/enchantments.js: weapon enchantments. Browser-free, data and pure helpers (the battle reads them in AbilitySystem, the item in ItemModel).
//
// A weapon carries at most one enchantment, on the item itself (item.enchantment = { id, share? }), so it travels with the weapon when it is traded or
// swapped. It is made at the Enchanter's Table (frontend workshop, station 'enchanters_table') from one Insight of an element: the table rolls which of that
// element's enchantments the weapon gets (rollEnchantment), and a new one replaces the old.
//
// Two kinds:
//   status    the wielder's damaging hits on an enemy have a 10% chance (`chance`) to put a status on it: Searing (fire: burn), Frostbitten (ice: frozen),
//             Stormstruck (lightning: paralyzed), Venomous (earth: poison). An ability that already has that status adds the chances together (one roll).
//   convert   part of the weapon's blunt / slash / pierce attack (`share`, rolled 25% to 50%) becomes attack in the element, which the wielder's spells of that
//             element hit with (and its own physical strikes lose). One for each magical element: Flame-Wrought, Frost-Wrought...
import { ItemDefinitions } from './itemDefinitions.js';

export const PHYSICAL_TYPES = ['blunt', 'slash', 'pierce'];

// BALANCE KNOBS
export const STATUS_ENCHANT_CHANCE = 0.10;       // the bonus chance a status enchantment adds to every damaging hit on an enemy
export const STATUS_CHANCE_CAP = 0.75;           // an ability's own chance plus every bonus never goes above this
export const CONVERT_SHARE_MIN = 0.25;           // a conversion moves this much of the weapon's physical attack, at the least...
export const CONVERT_SHARE_MAX = 0.50;           // ...and at the most (in steps of 5%)
export const STATUS_ODDS = 0.5;                  // an element with a status enchantment: the chance the table gives that one rather than its conversion

export const ENCHANTMENTS = {
    // --- status ---
    searing: { id: 'searing', name: 'Searing', kind: 'status', element: 'fire', status: 'burn', chance: STATUS_ENCHANT_CHANCE, duration: 3,
        description: 'Hits on an enemy have a 10% chance to burn it.' },
    frostbitten: { id: 'frostbitten', name: 'Frostbitten', kind: 'status', element: 'ice', status: 'frozen', chance: STATUS_ENCHANT_CHANCE, duration: 2,
        description: 'Hits on an enemy have a 10% chance to freeze it.' },
    stormstruck: { id: 'stormstruck', name: 'Stormstruck', kind: 'status', element: 'lightning', status: 'paralyzed', chance: STATUS_ENCHANT_CHANCE, duration: 2,
        description: 'Hits on an enemy have a 10% chance to paralyze it.' },
    venomous: { id: 'venomous', name: 'Venomous', kind: 'status', element: 'earth', status: 'poison', chance: STATUS_ENCHANT_CHANCE, duration: 3,
        description: 'Hits on an enemy have a 10% chance to poison it.' },
    // --- conversion: part of the weapon's physical attack becomes the element's ---
    fire_wrought: { id: 'fire_wrought', name: 'Flame-Wrought', kind: 'convert', element: 'fire' },
    ice_wrought: { id: 'ice_wrought', name: 'Frost-Wrought', kind: 'convert', element: 'ice' },
    lightning_wrought: { id: 'lightning_wrought', name: 'Storm-Wrought', kind: 'convert', element: 'lightning' },
    water_wrought: { id: 'water_wrought', name: 'Tide-Wrought', kind: 'convert', element: 'water' },
    earth_wrought: { id: 'earth_wrought', name: 'Stone-Wrought', kind: 'convert', element: 'earth' },
    wind_wrought: { id: 'wind_wrought', name: 'Gale-Wrought', kind: 'convert', element: 'wind' },
    light_wrought: { id: 'light_wrought', name: 'Sun-Wrought', kind: 'convert', element: 'light' },
    dark_wrought: { id: 'dark_wrought', name: 'Shadow-Wrought', kind: 'convert', element: 'dark' },
    arcane_wrought: { id: 'arcane_wrought', name: 'Arcane-Wrought', kind: 'convert', element: 'arcane' },
};

/** The enchantments an element's Insight can give: [status?, conversion]. */
export function enchantmentsOfElement(element) {
    return Object.values(ENCHANTMENTS).filter(e => e.element === element);
}

const defOfItem = (item) => (item && (item.definition || ItemDefinitions[item.defId || item.id])) || null;

/** Can this weapon be enchanted? A weapon with some physical attack (not a shield, not an Insight). */
export function canEnchant(item) {
    const def = defOfItem(item);
    if (!def || def.type !== 'weapon') return false;
    return PHYSICAL_TYPES.some(t => (def.attack || {})[t] > 0);
}

/**
 * The table's roll for a weapon enchanted with an Insight of `element`: { id, share? }. `rand` gives numbers in [0, 1).
 * An element with a status enchantment gives it half the time (STATUS_ODDS), its conversion otherwise; a conversion's share is rolled.
 */
export function rollEnchantment(element, rand = Math.random) {
    const options = enchantmentsOfElement(element);
    const status = options.find(e => e.kind === 'status');
    const convert = options.find(e => e.kind === 'convert');
    if (!convert && !status) return null;
    if (status && (!convert || rand() < STATUS_ODDS)) return { id: status.id };
    const steps = Math.round((CONVERT_SHARE_MAX - CONVERT_SHARE_MIN) / 0.05);
    const share = Math.round((CONVERT_SHARE_MIN + Math.floor(rand() * (steps + 1)) * 0.05) * 100) / 100;
    return { id: convert.id, share };
}

/** An item's enchantment with its definition merged in ({ id, name, kind, element, share?, status?... }), or null. */
export function enchantmentOf(item) {
    const e = item && item.enchantment;
    if (!e || !ENCHANTMENTS[e.id]) return null;
    return { ...ENCHANTMENTS[e.id], ...e };
}

/** A weapon's attack with its conversion applied: `share` of each physical type moved into the element (rounded, so whole numbers stay whole). */
export function convertAttack(attack, enchantment) {
    if (!enchantment || enchantment.kind !== 'convert' || !attack) return attack;
    const out = { ...attack };
    let moved = 0;
    for (const t of PHYSICAL_TYPES) {
        if (!out[t]) continue;
        const m = Math.round(out[t] * (enchantment.share || 0));
        out[t] -= m;
        moved += m;
    }
    if (moved) out[enchantment.element] = (out[enchantment.element] || 0) + moved;
    return out;
}

/** The enchanted name: "Searing Shortsword", "Flame-Wrought Shortsword". */
export function enchantedName(item) {
    const def = defOfItem(item);
    const name = def?.name || item?.name || '';
    const e = enchantmentOf(item);
    return e ? `${e.name} ${name}` : name;
}

/** One line saying what the enchantment does: "Hits on an enemy have a 10% chance to burn it." / "35% of its physical attack is fire." */
export function describeEnchantment(item) {
    const e = enchantmentOf(item);
    if (!e) return '';
    if (e.kind === 'convert') return `${Math.round((e.share || 0) * 100)}% of its physical attack is ${e.element} instead.`;
    return e.description;
}

/** The status chances a combatant's enchanted gear adds to its damaging hits: [{ status, chance, duration, source }]. */
export function enchantmentStatuses(entity) {
    const owner = entity && (entity.originalEntity || entity);
    const equipment = (owner && (owner.state?.equipment || owner.equipment)) || {};
    const out = [];
    for (const item of Object.values(equipment)) {
        const e = item && typeof item === 'object' ? enchantmentOf(item) : null;
        if (e && e.kind === 'status') out.push({ status: e.status, chance: e.chance, duration: e.duration, source: e.name });
    }
    return out;
}
