/* Where encounters can leave a mark on a character: the moments that sometimes teach a trait, good or bad, in one table.

   Each entry is an encounter's stage: when the party reaches it, whatever it then chooses there, the character in the encounter (the active one;
   in a party of players, each player's own) has `chance` of gaining the trait (ADD_TRAIT with `chance`, rolled on the encounter's seeded dice so every
   screen agrees; nobody gains a trait they already have). The chances are kept low: a trait should say something about a character, and be rare.

   The other ways to gain a trait:
     the character creator   one of Quick, Inquisitive, Brawler, Tough or Stealthy
     battle                  the abilities a character uses, kills with, or lives through (abilities/abilityTraits.js), and a scar when struck down
     the Strange Obelisk     any trait, good after a success, bad after a failure (encounters/strangeObelisk.js)
   and to lose one: Kurtus's Brew, drunk outside a fight, forgets the last trait gained (good or bad); the obelisk can strip them all. */

export const ENCOUNTER_TRAITS = {
    // ---- good ----
    'a_disturbing_sight.a_quiet_end':     [['stealthy', 0.25, 'a kill he never heard coming']],
    'a_disturbing_sight.a_lucky_strike':  [['deadeye', 0.25, 'one stone, one throw']],
    'a_disturbing_sight.pleased_the_magic': [['inquisitive', 0.2, '"Magic like you!"']],
    'wild_hunt.successful_hunt':          [['perfectionist', 0.2, 'a perfect shot']],
    'wild_hunt.boss_revealed':            [['stealthy', 0.2, 'stayed hidden while the horror fed']],
    'tracks_in_the_snow.deer_hunted':     [['stealthy', 0.2, 'closed the distance unseen']],
    'tracks_in_the_snow.predator_escape': [['quick', 0.25, 'outran the apex predator']],
    'quicksand.hauled':                   [['athletic', 0.2, 'dragged themselves out by strength']],
    'cyclone.calm':                       [['academic', 0.2, 'read the storm and was right']],
    'cyclone.seized':                     [['ironhide', 0.2, 'an arm into a wall of flaying sand']],
    'arrow_trap.dodged':                  [['nimble', 0.2, 'dropped under a volley']],
    'pit_trap.caught':                    [['athletic', 0.15, 'caught the lip of the pit']],
    'cave_in.exhausted':                  [['tough', 0.15, 'dug for hours and did not stop']],
    'aftermath.officer_orders_found':     [['academic', 0.15, 'read a Royal Guard officer\'s orders']],
    'suspicious_merchant.call_out_fakes': [['academic', 0.2, 'saw the painted glass for what it was']],
    'old_gravestone.escaped_the_grave':   [['claustrophobic', 0.3, 'clawed out of an open grave with the dead at their heels']],
    'old_gravestone.spirit_at_rest':      [['iron_willed', 0.15, 'stood before a spirit and talked it down']],

    // ---- bad ----
    'a_disturbing_sight.rejected_by_the_magic': [['superstitious', 0.2, '"Magic no like you!"']],
    'treasure_chest.summon_evil':         [['superstitious', 0.25, 'a spell that called something up']],
    'treasure_chest.chest_explosion':     [['frail', 0.15, 'caught in the blast']],
    'aftermath.alterian_ambush':          [['superstitious', 0.15, 'the dead stood up around them']],
    'peculiar_scarecrow.it_stirs':        [['superstitious', 0.2, 'the scarecrow turned its head']],
    'wild_hunt.boss_surprised':           [['clumsy', 0.2, 'snapped a root at the worst moment']],
    'wild_hunt.startled_stag':            [['clumsy', 0.15, 'stepped on a dry branch']],
    'tracks_in_the_snow.deer_escapes':    [['clumsy', 0.15, 'a branch cracked underfoot']],
    'mysterious_altar.smoke_cloud':       [['sluggish', 0.3, 'pale smoke sank into their limbs']],
    'bonfire.ambush_unseen':              [['myopic', 0.2, 'a stone out of the dark they never saw']],
    'quicksand.deeper':                   [['claustrophobic', 0.25, 'the sand closed over their chest']],
    'pit_trap.fell':                      [['frail', 0.15, 'dropped onto the stakes']],
    'arrow_trap.struck':                  [['sluggish', 0.15, 'the arrows were faster']],
    'cave_in.rocks_fall':                 [['frail', 0.15, 'heavy rocks came down on them']],
    'cyclone.thrown':                     [['frail', 0.1, 'thrown by the storm']],
    'old_gravestone.listen_failed':       [['dull', 0.15, 'a rushing in the head that would not stop']],
    'suspicious_merchant.merchant_escaped': [['dull', 0.1, 'robbed blind by a madman']],
};

const traitResult = (traitId, chance) => ({ type: "ADD_TRAIT", payload: { traitId, target: "active_character", chance } });
const withTraits = (outcomes, extra) => outcomes && outcomes.map(o => ({ ...o, results: [...extra, ...(o.results || [])] }));

/**
 * Puts the table into the encounters: every choice at each listed stage gets the trait results first. A stage's choices are copied before they are
 * changed (choices can be one array shared by several stages: the carriage's "Draw your weapons!"), so the trait never leaks into another stage.
 * @returns {string[]} the entries whose encounter or stage does not exist (empty when the table is right)
 */
export function applyEncounterTraits(defs, table = ENCOUNTER_TRAITS) {
    const missing = [];
    for (const [where, traits] of Object.entries(table)) {
        const [encId, stageId] = where.split('.');
        const stage = defs[encId] && defs[encId].stages && defs[encId].stages[stageId];
        if (!stage || !Array.isArray(stage.decisions)) { missing.push(where); continue; }
        if (stage._traitsApplied) continue;   // a stage object two encounters share is changed once
        const extra = traits.map(([id, chance]) => traitResult(id, chance));
        stage.decisions = stage.decisions.map(d => ({
            ...d,
            ...(d.outcomes ? { outcomes: withTraits(d.outcomes, extra) } : {}),
            ...(d.successOutcomes ? { successOutcomes: withTraits(d.successOutcomes, extra) } : {}),
            ...(d.failureOutcomes ? { failureOutcomes: withTraits(d.failureOutcomes, extra) } : {})
        }));
        Object.defineProperty(stage, '_traitsApplied', { value: true });
    }
    return missing;
}
