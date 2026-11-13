// shared/story/heroes.js: how the stories of Mentoras (the Hooded Stranger), Nikoli and Jaeger come together, and where each of them stands, for
// this player (milestones and quests are each player's own: in a party, two players can find the same room holding different people).
//
// Who the player told where Commander Mentoras is:   Nikoli (nikoli_told)   Jaeger (jaeger_told, at the catacombs; never met counts as not told)
//   ashes      neither          Mentoras and Codey hide in the snowy house. Nikoli's campfire is cold, his greatsword planted in the snow:
//                               the Brother's Sword (brothers_sword_taken), which Mentoras, shown it, hands back (brothers_sword_shown).
//   friends    Nikoli only      Nikoli has found them: the three heroes in the snowy house (friends_met once the reunion has played).
//   pursuer    Jaeger only      the snowy house wrecked, Codey wounded, Mentoras taken (quest the_pursuer): Jaeger holds him in the hoard of the
//                               catacombs where the player first met him. Won, Mentoras is freed (pursuer_done) and goes back; he never blames the player.
//   brothers   both             Jaeger followed his brother: in the snowy house the player and Nikoli fight him (brothers_done), then the three heroes.
//
// When: act 3 begins when the Dry Kraken dies (act3). Mentoras waits in the desert until Codey is brought back (codey3 handed in); after that, between
// visits, he and Codey are in the first snowy-mountain crafting house the player walks into (world.strangerSnowHome), the desert workshop left empty
// but for a mark scratched into its anvil. Nobody ever vanishes in front of the player: they are simply somewhere else the next time.
import { ActSystem } from './actSystem.js';

// every flag here belongs to the WORLD (story/worldStory.js): in a party everyone sees the same people in the same places
export const has = (id) => ActSystem.hasMilestone(id);

/** Codey is back with Mentoras (the reunion handed in, by anyone in this world): from now on they are in the snowy house. */
export const movedNorth = () => has('act3') && has('codey_back');

/** 'ashes' | 'friends' | 'pursuer' | 'brothers': what the player's answers to the two brothers have made of it. */
export function heroesOutcome() {
    const n = has('nikoli_told'), j = has('jaeger_told');
    return n && j ? 'brothers' : n ? 'friends' : j ? 'pursuer' : 'ashes';
}

/** Mentoras taken by Jaeger, not yet freed. */
export const mentorasTaken = () => movedNorth() && heroesOutcome() === 'pursuer' && !has('pursuer_done');

/** Who stands in the snowy house (map object ids, in the order they are placed), or [] when it is not theirs yet. */
export function snowHouseResidents() {
    if (!movedNorth()) return [];
    const o = heroesOutcome();
    if (o === 'pursuer') return has('pursuer_done') ? ['HOODED_STRANGER_NPC', 'CODEY_NPC'] : ['CODEY_NPC_WOUNDED'];
    if (o === 'friends') return [has('friends_met') ? 'NIKOLI_NPC' : 'NIKOLI_NPC_REUNION', 'HOODED_STRANGER_NPC', 'CODEY_NPC'];
    if (o === 'brothers') return [has('brothers_done') ? 'NIKOLI_NPC' : 'NIKOLI_NPC_REUNION', 'HOODED_STRANGER_NPC', 'CODEY_NPC'];
    return ['HOODED_STRANGER_NPC', 'CODEY_NPC'];
}

/** Who is in the hoard of Jaeger's catacombs: Jaeger (until met), or, while Mentoras is his prisoner, Jaeger and the chained Mentoras. */
export function catacombResidents() {
    if (has('mentoras_taken') && !has('pursuer_done')) return ['JAEGER_CAPTOR', 'MENTORAS_CHAINED'];
    if (!has('jaeger_met')) return ['JAEGER_NPC'];
    return [];
}
