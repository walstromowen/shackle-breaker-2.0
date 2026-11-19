// shared/story/covenants.js: the covenants, the sworn brotherhoods of the world (like Dark Souls' and Bloodborne's): each has a face who offers its
// oath, and a gift for whoever takes it. A player belongs to one covenant at a time: swearing to one breaks the last. Membership is the player's own,
// not the world's (in a party each player swears for themselves): a milestone of theirs (COVENANTS[id].milestone).
//
//   amputators   THE AMPUTATORS. The not-yet-shackled who would stop the curse by cutting the shackles off the afflicted, and the limb with them when
//                the iron will not give. Most wear the proof of it (a stump, a hook, a wooden leg); all of them are a little mad, none shackled.
//                Their face is Osric of the Saw (story/encounters/story/amputators.js), in the first small graveyard the player comes upon in act 1;
//                he offers the oath once Brother Garrick, an Amputator going the way of the ones he cut, has been put to rest (quest amputators_trial).
import { gameState } from '../core/gameState.js';
import { ActSystem } from './actSystem.js';

export const COVENANTS = {
    amputators: {
        id: 'amputators',
        name: 'The Amputators',
        leader: 'AMPUTATOR_OSRIC',
        milestone: 'covenant_amputators',
        creed: 'Cut the chain, spare the soul.',
        description: 'A brotherhood of the not-yet-shackled who would stop the curse by cutting the shackles off the afflicted, and the limb with them if the iron will not give.',
        gift: 'amputators_saw'
    }
};

export const Covenants = {
    /** The covenant this player has sworn to (its id), or null. */
    of(state = gameState) {
        const ms = Array.isArray(state.milestones) ? state.milestones : [];
        const c = Object.values(COVENANTS).find(cv => ms.includes(cv.milestone));
        return c ? c.id : null;
    },
    isMember(id, state = gameState) {
        return this.of(state) === id;
    },
    /** Swears this player to covenant `id`, breaking any other oath. True when it is a new oath. */
    join(id, state = gameState) {
        const cv = COVENANTS[id];
        if (!cv || this.isMember(id, state)) return false;
        if (!Array.isArray(state.milestones)) state.milestones = [];
        state.milestones = state.milestones.filter(m => !Object.values(COVENANTS).some(o => o.milestone === m));
        ActSystem.grantMilestone(cv.milestone, state);
        return true;
    }
};
