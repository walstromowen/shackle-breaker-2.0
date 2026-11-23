// shared/characters/naturalPackages.js: what a creature that fights without weapons is built with instead. Browser-free, data and lookups only.
//
// A beast cannot hold a sword or wear a coat, so the growth a humanoid gets from upgrading them is built into it as a stat package: not an item,
// nothing shown in its equipment, nothing to take off. Each kind of creature names its package in its definition (`naturalPackage`). It gives:
//   attack    its natural attack rises as if it carried a weapon upgraded on the players' curve: ATTACK_PER_UPGRADE more of each kind of damage it
//             deals (its own base attack above 1) for each weapon level a character of its level would have gained (battle/enemyArms.js
//             naturalUpgradesAt). An enemy and a recruit of the same level hit the same.
//   defense   in the party only (it stands in for the armour a party member upgrades; an enemy humanoid's armour is never forged, so an enemy beast
//             gets none): RECRUIT_DEFENSE_PER_UPGRADE more blunt, slash and pierce defense per weapon level, about what a full leather set
//             gains per upgrade.
//   abilities one more every 5 levels (5, 10, 15, 20): learned the moment it reaches the level, enemy or recruit alike, and shown with its other moves.
// It is all worked out from the creature's level whenever it is asked for (StatCalculator, EntityModel.abilities): nothing is stored, so a recruit
// keeps pace as it levels and recruiting has nothing to undo. Bosses and their limbs are tuned as they are and have no package.
//
// The rotter is the one humanoid with a package: the shackled dead never pick up a weapon, and are never recruited.

export const ATTACK_PER_UPGRADE = 5;
export const RECRUIT_DEFENSE_PER_UPGRADE = 3;
export const ABILITY_EVERY = 5;

/* No blade moves for an animal (Flurry, Low Sweep, Slash: a sword's), no Mass Fear for any of them yet; Eviscerate only for the hunters that rip
   (the hawk; the snow leopard is born with it). */
export const NATURAL_PACKAGES = {
    canine:   { name: 'Pack Hunter',   abilities: { 5: 'pounce', 10: 'intimidate', 15: 'hit_and_run', 20: 'rampage' } },        // leap, snarl, snap and fall back, the pack's frenzy
    feline:   { name: 'Stalker',       abilities: { 5: 'pounce', 10: 'hide', 15: 'hit_and_run', 20: 'rampage' } },              // leap, vanish, strike and slip away, maul
    avian:    { name: 'Raptor',        abilities: { 5: 'hit_and_run', 10: 'eviscerate', 15: 'intimidate', 20: 'reckless_charge' } },   // swoop, rip, the scream, the stoop
    arachnid: { name: 'Weaver',        abilities: { 5: 'wrap', 10: 'hide', 15: 'hit_and_run', 20: 'rampage' } },                // web, the dark, bite and scuttle off, many legs
    hoofed:   { name: 'Trampler',      abilities: { 5: 'guard_break', 10: 'intimidate', 15: 'rampage', 20: 'bolster' } },       // the kick, the bellow, the stampede, hide like iron
    burrower: { name: 'Coil',          abilities: { 5: 'wrap', 10: 'hide', 15: 'rampage', 20: 'reckless_charge' } },            // coil, burrow out of sight, thrash, burst up
    swarm:    { name: 'Swarm',         abilities: { 5: 'hit_and_run', 10: 'hide', 15: 'intimidate', 20: 'rampage' } },          // dart in and out, scatter, the drone, the cloud
    ursine:   { name: 'Great Bear',    abilities: { 5: 'intimidate', 10: 'bolster', 15: 'rampage', 20: 'reckless_charge' } },  // the roar, the thick hide, the maul, the charge
    rotter:   { name: 'Grave Nails',   abilities: { 5: 'wrap', 10: 'intimidate', 15: 'reckless_charge', 20: 'rampage' } }       // grab and hold, the stench of it, the lurch, tear (no blade moves)
};

/** The package of a character (an entity, a combatant, or a state), or null. */
export function packageOf(character) {
    const st = (character && (character.state || character)) || {};
    const tags = st.tags || character?.tags || [];
    if (tags.includes('BOSS') || st.fallsWith) return null;
    const id = st.naturalPackage || character?.naturalPackage;
    return (id && NATURAL_PACKAGES[id]) || null;
}

/** The abilities a package has taught by `level`, lowest level first. */
export function packageAbilitiesAt(pkg, level) {
    if (!pkg || !pkg.abilities) return [];
    return Object.entries(pkg.abilities).map(([at, id]) => [Number(at), id]).filter(([at]) => (level || 1) >= at).sort((a, b) => a[0] - b[0]).map(([, id]) => id);
}
