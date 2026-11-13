// shared/items/equipRules.js: who can wear what. An item's `wornBy` (itemDefinitions.js) limits it to:
//   'humanoid'       people (the HUMANOID tag): a ring, a blade, a quiver
//   'medium_beast'   an animal companion of medium size: a dog or a wolf (CANINE), a snow leopard (FELINE); never a hawk, a boss or a person
// No `wornBy`: anyone with the slot can wear it. The character screen asks this before it equips anything (CharacterSummaryLogic).
const tagsOf = (entity) => (entity && (entity.tags || (entity.state && entity.state.tags))) || [];

export function canWear(def, entity) {
    const rule = def && def.wornBy;
    if (!rule) return true;
    const tags = tagsOf(entity);
    if (rule === 'humanoid') return tags.includes('HUMANOID');
    if (rule === 'medium_beast') return tags.includes('BEAST') && (tags.includes('CANINE') || tags.includes('FELINE')) && !tags.includes('BOSS');
    return true;
}

/** Why it cannot be worn, for the screen ("Only a dog, a wolf or a leopard can wear this."), or null when it can. */
export function wearRefusal(def, entity) {
    if (canWear(def, entity)) return null;
    return def.wornBy === 'medium_beast' ? 'Only a dog, a wolf or a leopard can wear this.' : 'Only a person can wear this.';
}
