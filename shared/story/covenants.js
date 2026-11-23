// shared/story/covenants.js: the covenants, the sworn orders of the world (like Dark Souls' and Bloodborne's): each has a face who offers its
// oath, and a gift for whoever takes it. Each CHARACTER swears for themselves (the one the conversation is about: switch party member to choose),
// and belongs to one covenant at a time: swearing to one breaks the last. Party members can each be in a different one. Kept on the character
// (state.covenant: { id, rank }), shown on their character summary; renounced by talking to the covenant's face again. A covenant opens choices
// of its own in encounters (condition in_covenant: the Amputators can [AMP] intimidate the mad merchant), as an origin does.
//
//   amputators   THE AMPUTATORS. The not-yet-shackled who would stop the curse by cutting the shackles off the afflicted, and the limb with them when
//                the iron will not give. Most wear the proof of it (a stump, a hook, a wooden leg); all of them are a little mad, none shackled.
//                They call each other by the old surgical ranks (ranks: Orderly up to Chief Surgeon; "Doctor" for a surgeon).
//                Their face is Senior Surgeon Osric (story/encounters/story/amputators.js), in the first small graveyard the player comes upon in act 1;
//                he offers the oath once Surgeon Garrick, an Amputator going the way of the ones he cut, has been put to rest (quest amputators_trial).
import { gameState } from '../core/gameState.js';

export const COVENANTS = {
    amputators: {
        id: 'amputators',
        name: 'The Amputators',
        leader: 'AMPUTATOR_OSRIC',
        legacyMilestone: 'covenant_amputators',   // where an older save kept the oath (Covenants.migrate)
        creed: 'Cut the chain, spare the soul.',
        description: 'A college of surgeons, the not-yet-shackled, who would stop the curse by cutting the shackles off the afflicted, and the limb with them if the iron will not give.',
        gift: 'amputators_saw',
        // the old surgical ranks they call each other by, lowest first; whoever takes the oath starts at the first (no way up them yet)
        ranks: ['Orderly', 'Dresser', 'Surgeon', 'Senior Surgeon', 'Chief Surgeon'],
        // what its face sells, by act (from the act on, until a later act names its own): Osric's shop opens once Surgeon Garrick is at rest.
        // The armor set is the Amputators' own, sold nowhere else
        wares: {
            1: ['wooden_club', 'mace'],   // plain weapons, for now
            3: ['amputators_hood', 'amputators_apron', 'amputators_gloves', 'amputators_trousers', 'amputators_boots']
        }
    }
};

/* A character's own state (an EntityModel keeps it in .state; a line-up snapshot in a shared encounter is the state itself). */
const stateOf = (entity) => (entity && (entity.state || entity)) || null;

export const Covenants = {
    /** The covenant this character has sworn to (its id), or null. Each character swears for themselves: one covenant at a time. */
    of(entity) {
        const s = stateOf(entity);
        const id = s && s.covenant && s.covenant.id;
        return id && COVENANTS[id] ? id : null;
    },
    isMember(id, entity) {
        return !!id && this.of(entity) === id;
    },
    /** The character's rank in their covenant ('Orderly'...), or null. */
    rankOf(entity) {
        const id = this.of(entity);
        if (!id) return null;
        const ranks = COVENANTS[id].ranks || [];
        return ranks[Math.max(0, Math.min(ranks.length - 1, stateOf(entity).covenant.rank || 0))] || null;
    },
    /** "The Amputators (Orderly)", or null: what the character summary shows. */
    label(entity) {
        const id = this.of(entity);
        if (!id) return null;
        const rank = this.rankOf(entity);
        return rank ? `${COVENANTS[id].name} (${rank})` : COVENANTS[id].name;
    },
    /** Swears this character to covenant `id` at its first rank, breaking any other oath of theirs. True when it is a new oath. */
    join(id, entity) {
        const s = stateOf(entity);
        if (!COVENANTS[id] || !s || this.isMember(id, entity)) return false;
        s.covenant = { id, rank: 0 };
        s.swornBefore = [...new Set([...(s.swornBefore || []), id])];   // a covenant once sworn to (its gift is given only the first time)
        return true;
    },
    /** Has this character ever sworn to covenant `id` (even if they have renounced it since)? */
    swornBefore(id, entity) {
        const s = stateOf(entity);
        return !!(s && Array.isArray(s.swornBefore) && s.swornBefore.includes(id)) || this.isMember(id, entity);
    },
    /** Breaks this character's oath. True when there was one to break. They may swear again. */
    renounce(entity) {
        const s = stateOf(entity);
        if (!s || !this.of(entity)) return false;
        delete s.covenant;
        return true;
    },
    /** An older save kept the oath as the player's milestone (covenant_amputators): it goes to the party's lead, and the milestone away. */
    migrate(state = gameState) {
        const ms = Array.isArray(state.milestones) ? state.milestones : [];
        const lead = state.party && state.party.members && state.party.members[0];
        for (const cv of Object.values(COVENANTS)) {
            if (!cv.legacyMilestone || !ms.includes(cv.legacyMilestone)) continue;
            if (lead && !this.of(lead)) this.join(cv.id, lead);
            state.milestones = state.milestones.filter(m => m !== cv.legacyMilestone);
        }
    },
    /** What covenant `id`'s face sells in `act`: the wares of the latest act at or before it that names any, as shop wares ([{ id }]). */
    waresFor(id, act) {
        const byAct = (COVENANTS[id] && COVENANTS[id].wares) || {};
        const at = Object.keys(byAct).map(Number).filter(n => n <= act).sort((a, b) => b - a)[0];
        return at ? byAct[at].map(itemId => ({ id: itemId })) : [];
    }
};
