// shared/battle/enemyArms.js: what an enemy fights with. Browser-free.
//
// An enemy's weapon grows with it, on the same curve a player's does: WEAPON_DUE is the level by which a weapon is usually upgraded to each of its
// levels (1 to 5; tools/playthroughSim.mjs plays it, and Dolos measures the party against it, story/dolos.js). A level 10 legionary carries a level 3
// sword, not the level 1 sword it was made with, so how hard it hits comes from what it carries and how good that is, like the player's.
// Only weapons (pieces with an attack) are forged up: armour stays as made, so the player's blows land as hard as before.
// A creature that fights without weapons (a beast, a rotter) has a natural package instead (characters/naturalPackages.js): it grows on this same
// curve (naturalUpgradesAt, smooth between the levels of WEAPON_DUE) and learns a move every 5 levels. A humanoid that can hold a weapon has none:
// its weapon is its growth.
// An enemy may also be `armedWith` a list of weapons in its definition: it is made carrying one of them, picked at random (EntityFactory), so two
// madmen of one ambush can come at the party with a club and a scythe.

export const WEAPON_DUE = [1, 4, 9, 15, 22];
import { packageOf, ATTACK_PER_UPGRADE, RECRUIT_DEFENSE_PER_UPGRADE } from '../characters/naturalPackages.js';

/** How many weapon levels a character of `level` would have gained (0 to 4), smoothly: 0 at level 1, 1 at level 4, 2 at 9, 3 at 15, 4 from 22. */
export function naturalUpgradesAt(level) {
    const l = Math.max(1, level || 1);
    for (let i = 0; i < WEAPON_DUE.length - 1; i++) {
        const a = WEAPON_DUE[i], b = WEAPON_DUE[i + 1];
        if (l < b) return i + (l - a) / (b - a);
    }
    return WEAPON_DUE.length - 1;
}

/** Does this character fight with a natural package (characters/naturalPackages.js)? Bosses and their limbs never do. */
export const fightsNaturally = (character) => !!packageOf(character);

/** The natural attack a package adds to each kind of damage it deals (its own base attack above 1) at `level`. */
export const naturalAttackBonus = (level) => Math.round(ATTACK_PER_UPGRADE * naturalUpgradesAt(level));

/** The defense a package adds to blunt, slash and pierce at `level`, for a creature in the party (an enemy's armour is never forged). */
export const naturalDefenseBonus = (level) => Math.round(RECRUIT_DEFENSE_PER_UPGRADE * naturalUpgradesAt(level));

/** The weapon level an enemy of `level` carries (1 to 5). */
export const weaponLevelFor = (level) => Math.max(1, WEAPON_DUE.filter(l => (level || 1) >= l).length);

/**
 * Forges the weapons an enemy carries up to its level's (weaponLevelFor). `makeItem(defId, level)` builds an item (the scene manager's, which caps it
 * at the item's highest level). Bosses are left as made. Returns how many pieces were forged up. What each was made with is kept (state.forgedWeapons),
 * so an enemy that joins the party carries its own weapon at its own level again, not a free upgrade (unforgeWeapons).
 */
export function forgeEnemyWeapons(entity, makeItem, itemDefinitions) {
    const st = entity && entity.state;
    if (!st || !makeItem || (st.tags || []).includes('BOSS')) return 0;
    const eq = st.equipment || {};
    const want = weaponLevelFor(entity.level ?? st.level);
    let forged = 0;
    for (const slot of Object.keys(eq)) {
        const it = eq[slot];
        if (!it) continue;
        const defId = typeof it === 'string' ? it : (it.defId || it.id);
        const def = itemDefinitions && itemDefinitions[defId];
        if (!def || !def.attack) continue;   // a weapon only
        const level = (typeof it === 'object' && it.level) || 1;
        if (level >= want) continue;
        const better = makeItem(defId, want);
        if (better && (better.level || 1) > level) {
            eq[slot] = better; forged++;
            (st.forgedWeapons = st.forgedWeapons || {})[slot] = { defId, level };   // what it was made with: a recruit goes back to it (EntityFactory.removeLevelEdge)
        }
    }
    return forged;
}

/**
 * An enemy joins the party: every weapon its level forged up goes back to what it was made with (`makeItem(defId, level)` builds it). A weapon it
 * no longer carries is left alone. Returns how many went back.
 */
export function unforgeWeapons(entity, makeItem) {
    const st = entity && entity.state;
    if (!st || !st.forgedWeapons || !makeItem) return 0;
    let back = 0;
    for (const [slot, made] of Object.entries(st.forgedWeapons)) {
        const it = st.equipment && st.equipment[slot];
        const defId = it && (typeof it === 'string' ? it : (it.defId || it.id));
        if (defId !== made.defId) continue;
        const orig = makeItem(made.defId, made.level);
        if (orig) { st.equipment[slot] = orig; back++; }
    }
    delete st.forgedWeapons;
    return back;
}
