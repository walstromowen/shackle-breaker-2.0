/* The voices: the whispering of madness, louder the closer Dolos's attention (story/dolos.js).

   Every shackled thing hears them; Mentoras has heard them for years ("The voices have theories too"). Here the party hears them as well, and how
   much depends on Dolos: silent while he has looked away (his respite), a murmur at the edge of hearing while he is calm, plainer as he stirs,
   and loud, close and cruel in his gaze. A blood moon and a party's corruption make them louder still.

   level()       how loud they are now, 0 (silent) .. 1
   nextWhisper() seconds until the next whisper is heard (sooner the louder they are)
   line()        what one of them would say: the louder the level, the plainer and crueller (TIERS). Never Dolos's name while the story keeps him
                 hidden; once he is named (story:dolos_named), now and then they say it. NOT shown in the game: the voices are sound only. The
                 lines are kept as the script for recording them as whispered speech one day.
   The sound (a short whisper, at a random pitch, from left or right) is the frontend's (engine/voicesPlayer.js). */
import { gameState } from '../core/gameState.js';
import { Dolos, THRESHOLDS } from './dolos.js';
import { CorruptionSystem } from '../characters/corruptionSystem.js';

/* how loud each of his phases makes them; calm rises with his tension toward stirring */
const PHASE_LEVEL = { respite: 0, calm: 0.1, stirring: 0.45, gaze: 0.85 };
export const SILENT = 0.05;                       // below this nothing is heard

/* What they say, by how loud they are. The words echo what the story already says: the iron counts you, the stones fell from the sky, the
   madmen laugh, nobody is good enough. */
export const TIERS = [
    { from: SILENT, lines: [
        "...hear it?", "...not yet...", "...count them...", "...little chains...", "...so tired...", "...shh...",
        "...behind you...", "...the stones...", "...laughing, laughing...", "...it is listening..."
    ] },
    { from: 0.35, lines: [
        "The iron counts you.", "Everyone in chains is being kept for something.", "Lie down. Rest. It is easier.",
        "You were not good enough for them. You will not be for this.", "The brightest fell first.", "They laugh because they understand.",
        "Your friends talk about you when you sleep.", "Listen before you swing.", "It is warm, where we are."
    ] },
    { from: 0.7, lines: [
        "WE SEE YOU.", "Stones fell from the sky. More will fall.", "Every one of you will kneel.", "Run. It will not matter.",
        "Give in. It is warmer.", "Your hands are not your own.", "We remember the king. He knelt too.", "LOOK UP."
    ] }
];
/* once the story names him, they do too (now and then) */
export const NAMED_LINES = ["Dolos sees you.", "Dolos is patient.", "Kneel to Dolos.", "...Dolos...Dolos...Dolos..."];

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export const Voices = {
    /** How loud they are now, 0..1: Dolos's phase (calm rising with his tension), a blood moon, the party's corruption. */
    level(state = gameState, bloodMoon = false) {
        const d = Dolos.state(state);
        if (!Dolos.noticed(state)) return 0;
        const phase = Dolos.effects(state, bloodMoon).phase;
        let level = PHASE_LEVEL[phase] ?? 0;
        if (phase === 'respite') return 0;                                              // he has looked away: silence
        if (phase === 'calm') level += 0.3 * clamp((d.tension || 0) / THRESHOLDS.stirring, 0, 1);
        if (phase === 'stirring') level += 0.3 * clamp(((d.tension || 0) - THRESHOLDS.stirring) / (THRESHOLDS.gaze - THRESHOLDS.stirring), 0, 1);
        if (bloodMoon) level += 0.15;
        const members = (state.party && state.party.members || []).filter(Boolean);
        const worst = members.reduce((m, e) => Math.max(m, CorruptionSystem.valueOf(e) || 0), 0);
        level += 0.2 * clamp(worst / 100, 0, 1);                                       // the corrupted hear them better
        return clamp(level, 0, 1);
    },

    /** Seconds until the next whisper: about 90 s at the edge of hearing, about 12 s at their loudest. */
    nextWhisper(level, rand = Math.random) {
        const base = 90 - 78 * clamp(level, 0, 1);
        return base * (0.6 + 0.8 * rand());
    },

    /** What one says at this level (null when silent). The louder, the plainer: the top tier it reaches, now and then one below. */
    line(level, rand = Math.random, named = false) {
        if (level < SILENT) return null;
        if (named && rand() < 0.15 * level) return NAMED_LINES[Math.floor(rand() * NAMED_LINES.length)];
        const reached = TIERS.filter(t => level >= t.from);
        const tier = reached.length > 1 && rand() < 0.3 ? reached[reached.length - 2] : reached[reached.length - 1];
        return tier.lines[Math.floor(rand() * tier.lines.length)];
    }
};
