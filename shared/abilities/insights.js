// shared/abilities/insights.js: what a character knows of each kind of magic. Browser-free, data only (learning and forgetting, which move corruption,
// are AbilitySystem's `learn_insight` / `forget_insight` effects).
//
// An Insight (itemDefinitions: insight_of_fire ... insight_of_darkness) is a consumable now. Reading one raises the reader's rank in its element by one,
// up to its `insight.maxRank` (5). What the ranks give is in the item's `insight` block:
//   - `spells` by rank: rank 1 teaches spells[1], each further rank the spells listed for it (Wind: Gust, then Downwind at 2...);
//   - every rank adds the Insight's attack in its element (`attack`, plus `attackGrowth` for each rank above 1), as the old held Insight did at that level;
//   - a rank asks `requirements` (+ `requirementGrowth` for each rank above 1) of the reader's attributes, and costs corruption (INSIGHT_CORRUPTION).
// A character keeps them in state.insights ({ fire: 2, wind: 1 }) and, for the Shmindolyn's Draught (which takes the last rank back), the order they were learned
// in: state.insightLog ([{ element, corruption }], newest last).
//
// Enemies have ranks too, from their definition's `insights` (raised as the acts go on: ActSystem.scaleEnemyInsights). Their spells come from those ranks;
// their attack does not (state.insightAttack === false), because their definition's baseAttack already counts their magic.
import { ItemDefinitions } from '../items/itemDefinitions.js';

/** element -> the Insight item that teaches it */
export const INSIGHT_ITEMS = {
    fire: 'insight_of_fire',
    water: 'insight_of_water',
    earth: 'insight_of_earth',
    lightning: 'insight_of_lightning',
    ice: 'insight_of_ice',
    wind: 'insight_of_wind',
    arcane: 'insight_of_arcane',
    light: 'insight_of_light',
    dark: 'insight_of_darkness',
};
export const INSIGHT_ELEMENTS = Object.keys(INSIGHT_ITEMS);
const ELEMENT_OF_ITEM = Object.fromEntries(Object.entries(INSIGHT_ITEMS).map(([el, id]) => [id, el]));

// BALANCE KNOB: the corruption each rank costs to learn (rank 1 first). The deeper the understanding, the more it takes from you.
export const INSIGHT_CORRUPTION = [5, 6, 7, 8, 10];

/** The element an Insight item teaches ('fire'...), or null. Takes an item id, a definition or an item instance. */
export function elementOfInsight(item) {
    const id = typeof item === 'string' ? item : (item && (item.defId || item.definition?.id || item.id));
    return ELEMENT_OF_ITEM[id] || null;
}

/** The `insight` block of an element's Insight item (see the top of this file), or null. */
export function insightDef(element) {
    return ItemDefinitions[INSIGHT_ITEMS[element]]?.insight || null;
}

export function maxRank(element) {
    return insightDef(element)?.maxRank || 5;
}

/** The ranks a character (or a bare state) has: { fire: 2 } ({} when none). */
export function ranksOf(entity) {
    const state = entity && (entity.state || entity);
    return (state && state.insights) || {};
}

export function rankOf(entity, element) {
    return ranksOf(entity)[element] || 0;
}

/** The spells an element teaches up to a rank, in the order they are learned. */
export function spellsAt(element, rank) {
    const def = insightDef(element);
    if (!def || rank < 1) return [];
    const out = [];
    for (let r = 1; r <= rank; r++) out.push(...((def.spells || {})[r] || []));
    return [...new Set(out)];
}

/** The spells rank `rank` adds (rank 1: the first ones). */
export function spellsOfRank(element, rank) {
    const def = insightDef(element);
    return [...((def?.spells || {})[rank] || [])];
}

/** Every spell a character knows from their ranks. */
export function insightSpells(entity) {
    const out = [];
    for (const [el, rank] of Object.entries(ranksOf(entity))) for (const id of spellsAt(el, rank)) if (!out.includes(id)) out.push(id);
    return out;
}

/** The attack an element's rank adds: { fire: 11 } at fire rank 3 (5 + 3 + 3). */
export function attackAt(element, rank) {
    const def = insightDef(element);
    if (!def || rank < 1) return {};
    const growth = def.attackGrowth || {};
    const out = {};
    for (const [t, v] of Object.entries(def.attack || {})) out[t] = v + (growth[t] || 0) * (rank - 1);
    return out;
}

/** All the attack a character's ranks add (nothing for an enemy: see the top of this file). */
export function insightAttack(entity) {
    const state = entity && (entity.state || entity);
    const out = {};
    if (!state || state.insightAttack === false) return out;
    for (const [el, rank] of Object.entries(ranksOf(entity))) {
        for (const [t, v] of Object.entries(attackAt(el, rank))) out[t] = (out[t] || 0) + v;
    }
    return out;
}

/** What a rank asks of the reader's attributes: { attunement: 11, intelligence: 9 }. */
export function requirementsForRank(element, rank) {
    const def = insightDef(element);
    if (!def) return {};
    const out = {};
    for (const [attr, need] of Object.entries(def.requirements || {})) out[attr] = need + ((def.requirementGrowth || {})[attr] || 0) * Math.max(0, rank - 1);
    return out;
}

/** The corruption a rank costs. */
export function corruptionForRank(rank) {
    return INSIGHT_CORRUPTION[Math.max(0, Math.min(INSIGHT_CORRUPTION.length - 1, rank - 1))];
}
