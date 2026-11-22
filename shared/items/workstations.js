// shared/items/workstations.js: which crafting station works which gear. Browser-free.
//
// Gear is upgraded only at the station of its trade (the workshop, frontend/src/screens/workshop, shows a station only the gear it can work):
//   anvil              metal weapons, and plate (iron, the Arc Knights')
//   carpenters_bench   wooden weapons: bows, the crossbow, the club, the buckler
//   tailors_bench      cloth, leather and the rest of the soft armour (the Amputators', the Artificers')
// Weapons are enchanted only at the Enchanter's Table (items/enchantments.js). An item can name its own with `upgradeStation`.
import { ItemDefinitions } from './itemDefinitions.js';

export const ENCHANTERS_TABLE = 'enchanters_table';

export const STATION_TITLES = {
    anvil: 'Anvil',
    forge: 'Forge',
    carpenters_bench: "Carpenter's Bench",
    stone_banker: 'Stone Banker',
    tailors_bench: "Tailor's Bench",
    [ENCHANTERS_TABLE]: "Enchanter's Table",
};

const WOODEN_WEAPONS = new Set(['shortbow', 'crossbow', 'wooden_club', 'wooden_buckler']);
const PLATE_SETS = ['iron_', 'arc_knight_'];

const defOf = (item) => (typeof item === 'string' ? ItemDefinitions[item] : (item && (item.definition || ItemDefinitions[item.defId || item.id] || (item.type ? item : null)))) || null;

/** The station an item is upgraded at ('anvil', 'carpenters_bench', 'tailors_bench'), or null when it is not upgraded at all. */
export function upgradeStationOf(item) {
    const def = defOf(item);
    if (!def || !def.upgradeCosts) return null;
    if (def.upgradeStation) return def.upgradeStation;
    if (def.type === 'armor') return PLATE_SETS.some(p => def.id.startsWith(p)) ? 'anvil' : 'tailors_bench';
    if (['weapon', 'shield', 'tool'].includes(def.type)) return WOODEN_WEAPONS.has(def.id) ? 'carpenters_bench' : 'anvil';
    return null;
}

/** Can this station upgrade this item? ('all' is the debug workshop that does everything.) */
export function canUpgradeAt(item, stationId) {
    const at = upgradeStationOf(item);
    return !!at && (stationId === 'all' || stationId === at);
}
