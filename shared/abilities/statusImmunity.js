// shared/abilities/statusImmunity.js: the status effects a creature cannot be given, because of what it is. Browser-free.
// One rule for every way a status is put on someone (an ability, a status that reacts, the weather, an encounter): EntityModel.applyStatusEffect
// refuses it, and AbilitySystem says so in the battle log ("Skeletal Warrior is immune to Bleed.").
//
//   no blood, no flesh   SKELETON, CONSTRUCT (stone, calcified), SKULL     bleed, poison
//   dead flesh           UNDEAD (a hollow still has flesh to cut)          poison
//   no body at all       SPIRIT / GHOST                                    bleed, poison, knocked down, bound (nets and traps pass through)
//   off the ground       FLOATING                                          knocked down
// A definition can add its own with `statusImmunities: ['burn', ...]`.

const BY_TAG = {
    SKELETON: ['bleed', 'poison'],
    CONSTRUCT: ['bleed', 'poison'],
    SKULL: ['bleed', 'poison'],
    UNDEAD: ['poison'],
    SPIRIT: ['bleed', 'poison', 'knocked_down', 'bound'],
    GHOST: ['bleed', 'poison', 'knocked_down', 'bound'],
    FLOATING: ['knocked_down'],
};

const tagsOf = (e) => (e && (e.state?.tags || e.tags || e.originalEntity?.state?.tags)) || [];
const ownOf = (e) => (e && (e.state?.statusImmunities || e.statusImmunities || e.originalEntity?.state?.statusImmunities)) || [];

/** Every status id this creature (an EntityModel, a combatant, or a plain definition) cannot be given. */
export function statusImmunitiesOf(entity) {
    const out = new Set(ownOf(entity));
    for (const tag of tagsOf(entity)) for (const id of BY_TAG[tag] || []) out.add(id);
    return out;
}

/** Can this creature not be given this status? */
export function isImmuneToStatus(entity, statusId) {
    return !!statusId && statusImmunitiesOf(entity).has(statusId);
}
