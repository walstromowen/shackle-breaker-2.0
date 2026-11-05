// shared/abilities/abilityTraits.js: the traits a character can pick up, very now and then, from the abilities they fight with.
//
// After a fight (BattleRewardSystem._processTraitRewards) every ability a party member used, killed with or was hit by and survived can teach them
// a trait that fits it: fire makes a pyromaniac, the bow a deadeye, heavy blows a brawler, spells an academic... The chances are small
// (ABILITY_TRAIT_CHANCE: per use, per kill, per hit), so a trait turns up once in a long while and says something about how that character fights.
// An ability's own `traitRewards` (abilityDefinitions.js), when it has any, are used instead of these.
export const ABILITY_TRAIT_CHANCE = {
    use_ability: 0.004,      // each time they use it
    kill: 0.02,              // each enemy they finish with it
    hit_by_ability: 0.002,   // each time it hits them and they live
};

const has = (def, tag) => (def.tags || []).includes(tag);
const damageTypes = (def) => new Set((def.effects || []).filter(e => e.type === 'damage').map(e => String(e.damageType || '').toLowerCase()));
const statuses = (def) => new Set([...(def.statusEffects || []), ...(def.selfStatusEffects || [])].map(s => s.id));

/** The traits an ability fits (one or two, the closest first), or [] for one that teaches nothing (an item's use, a retreat, a swap, a world action). */
export function traitsForAbility(def) {
    if (!def || def.behavior === 'flee_battle' || def.behavior === 'switch_party' || has(def, 'escape')) return [];   // a retreat, a swap
    const dmg = damageTypes(def), st = statuses(def);
    const magical = has(def, 'magical'), physical = has(def, 'physical');
    const effectTypes = new Set((def.effects || []).map(e => e.type));
    if (has(def, 'item') && !dmg.size && !st.size) return [];                 // a bandage, a torch: nothing to learn from
    if (!st.size && [...effectTypes].some(t => /^(world_buff|unshackle|exit_interior|show_interior_map|place_waypoint|advance_time)$/.test(t))) return [];   // a world action
    const free = !def.cost || !Object.values(def.cost).some(v => v > 0);
    if (free && has(def, 'healing') && has(def, 'magical')) return [];        // a herb eaten, a tonic drunk (the items' heals cost nothing)
    const out = [];
    const add = (...ids) => { for (const id of ids) if (!out.includes(id)) out.push(id); };
    if (dmg.has('fire') || has(def, 'fire')) add('pyromaniac');
    if (has(def, 'bow') || (physical && has(def, 'projectile'))) add('deadeye');
    if (has(def, 'lethal')) add('overconfident', 'deadeye');
    if (physical && has(def, 'heavy')) add(dmg.has('blunt') ? 'brawler' : 'berserker', 'lumbering');
    if (physical && dmg.has('blunt')) add('brawler', has(def, 'shield') ? 'ironhide' : 'tough');
    if (has(def, 'fast')) add('quick');
    if (physical && (has(def, 'multihit') || has(def, 'aoe'))) add('athletic');
    if (physical && (dmg.has('slash') || dmg.has('pierce'))) add('nimble');
    if (has(def, 'beast')) add('nocturnal');
    if (magical && (dmg.has('dark') || has(def, 'dark') || has(def, 'leech'))) add('nocturnal');
    if (magical && (has(def, 'poison') || st.has('poison'))) add('acidic');
    if (magical && dmg.has('arcane')) add('inquisitive');
    if (magical && (has(def, 'healing') || has(def, 'summon'))) add(has(def, 'healing') ? 'martyr' : 'academic');
    if (magical && [...dmg].some(t => /^(water|ice|lightning|earth|light|wind)$/.test(t))) add('academic');
    if (magical && !out.length) add('inquisitive');
    if (has(def, 'fear') || has(def, 'sound')) add('intimidating');
    if (has(def, 'stealth') || has(def, 'trap') || st.has('evasive')) add('stealthy');
    if (st.has('flying')) add('airborne');
    if (st.has('fortified')) add('iron_willed');
    if (st.has('counter_ready')) add('enduring');
    if (st.has('enraged') && !has(def, 'sound')) add('berserker');
    if (has(def, 'healing') && !magical) add('tough');                        // a rest, getting back up
    if (st.has('second_wind') || st.has('drawing_insight')) add('athletic');
    return out.slice(0, 2);
}

/** An ability's trait rewards for the post-battle check: { id, condition, chance } for using it, killing with it and (for a blow) living through it. */
export function traitRewardsFor(def) {
    if (def && Array.isArray(def.traitRewards) && def.traitRewards.length) return def.traitRewards;
    const traits = traitsForAbility(def);
    if (!traits.length) return [];
    const blow = (def.effects || []).some(e => e.type === 'damage');
    const out = traits.map(id => ({ id, condition: 'use_ability', chance: ABILITY_TRAIT_CHANCE.use_ability / traits.length }));
    if (blow) {
        out.push(...traits.map(id => ({ id, condition: 'kill', chance: ABILITY_TRAIT_CHANCE.kill / traits.length })));
        // living through a blow toughens you: a physical one makes the hide thicker, any one makes you harder
        const physical = (def.tags || []).includes('physical');
        out.push({ id: physical ? 'ironhide' : 'tough', condition: 'hit_by_ability', chance: ABILITY_TRAIT_CHANCE.hit_by_ability });
    }
    return out;
}
