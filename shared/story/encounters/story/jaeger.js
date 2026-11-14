/* Jaeger Ironson, "The Pursuer" (object JAEGER_NPC): Nikoli's brother, a Panzerian general corrupted by the artifact (docs/story.md). He is hunting
   Commander Mentoras (the Hooded Stranger) to kill him, and passes himself off as Nikoli to find him. He looks like Nikoli and speaks like him, but more
   seriously: the player has to see through him themselves. Nothing points it out; the clues are all there before he asks:
     his smile is straight and even (Nikoli has more gaps than teeth), and cold; the torches burn low and frost rims his gauntlets; he does not laugh or
     move; he slips into "I" before catching himself (Nikoli never forgets his third person); and a player who has met Nikoli gets no sign that he
     remembers them (remember). Told nothing, he nearly says his own name ("Jae... Nikoli will find you"). Neither he nor the narrator ever names him.

   Where: among the hoard of the first catacombs the player walks into (InteriorFactory: world.jaegerCatacomb, CatacombGenerator config.storyNpc), until
   met. The player is never offered "you're not Nikoli": seeing through him means answering that they do not know the name, keeping Mentoras hidden
   on purpose. He never vanishes in front of the player: he stays where he sat for the rest of the visit (talked to again, he has nothing more to say:
   again / again_told), and the next time the player walks into the catacombs he has moved on (the milestone jaeger_met keeps InteriorFactory from
   putting him back; it is this player's own, so in a party each player meets him in their own time, and nothing goes into the shared world); jaeger_told remembers that
   the player told him of the hooded man in the workshop.

   Voiced in Nikoli's voice, played cold (tools/voice/voices.json JAEGER). The world's: shared with the party near you, who vote on what
   he is told (story/worldStory.js).
   Art: the Panzerian warlord's portrait, the same as Nikoli's. */
import { ActSystem } from '../../actSystem.js';
import { toStage, next } from '../stageKit.js';

const TITLE = "Nikoli";   // the name he gives
const IMG = { col: 0, row: 0 };

const stage = (text, decisions, extra = {}) => ({ displayText: TITLE, image: IMG, text, decisions, ...extra });
// the meeting is over (and what the player did, remembered); he stays where he is until the player has gone, and is not there when they come back
const done = (text, milestones = []) => [{ text, outcomes: [{ weight: 100, results: [
    { type: "GRANT_MILESTONE", payload: { id: "jaeger_met" } },
    ...milestones.map(id => ({ type: "GRANT_MILESTONE", payload: { id } })),
    { type: "END_ENCOUNTER", payload: null }
] }] }];
// his story belongs to the world (story/worldStory.js)
const has = (id) => ActSystem.hasMilestone(id);
/** The first meeting, or (talked to again before the player leaves) a word to say he is finished with them. */
function opening() {
    if (!has('jaeger_met')) return 'waiting';
    return has('jaeger_told') ? 'again_told' : 'again';
}

export const jaeger = {
    id: "jaeger",
    title: TITLE,
    imageSheet: "warlordHeroPortrait",
    personal: false,   // the world's story (story/worldStory.js): in a party, the players near you are pulled in and vote on what is said
    tone: "cold",
    ambience: "none",
    initialStage: opening,
    stages: {
        // ---- before the question: the clues ----
        waiting: stage("Among the hoard, a broad man in dark Panzerian armour sits on a burial chest, a greatsword across his knees. He does not rise. He has been watching the door.",
            next("cold")),
        cold: stage("The torches burn low on his side of the hall. Frost rims his gauntlets, though the air is still and warm.",
            next("greet")),
        greet: stage("\"Ah. You are one who killed statue. Is good. Nikoli was tired of waiting for it to fall over.\"",
            next("smile")),
        smile: stage("He smiles. It is a straight, white, even smile. It does not reach his eyes.", [
            { text: "Continue.", conditions: [{ type: "has_milestone", id: "nikoli_met" }], outcomes: toStage("remember") },
            { text: "Continue.", conditions: [{ type: "lacks_milestone", id: "nikoli_met" }], outcomes: toStage("host") }
        ]),
        // only for a player who has met the real Nikoli: he does not know them
        remember: stage("\"You look at Nikoli as if you know him. Many people know Nikoli. Few remember him correctly.\"",
            next("host")),
        host: stage("\"Nikoli would offer you drink, but I... Nikoli has none. Tombs are poor hosts.\" He does not laugh. He does not move at all, except his eyes.",
            next("ask")),

        // ---- the question ----
        ask: stage("\"Nikoli searches for old friend. Commander Mentoras, of Altus royal guard. Tired eyes. Sharp tongue. You have seen him, da?\"",
            next("debt")),
        debt: stage("\"He owes Nikoli a debt. Nikoli intends to collect it. In full.\"", [
            {
                text: "[Hooded Stranger] \"There's a hooded man in a village workshop. He might be the one.\"",
                conditions: [{ type: "has_milestone", id: "stranger_met" }],   // someone in this world has met the Stranger
                outcomes: toStage("told")
            },
            { text: "\"I don't know anyone by that name.\"", outcomes: toStage("dunno") }
        ]),

        // ---- told: he has what he came for ----
        told: stage("For a moment nothing in his face moves at all. \"A workshop. Of course. He always did like to be near a fire.\"",
            next("told_2")),
        told_2: stage("\"Thank you, my friend. You have been more helpful than you know.\"",
            next("told_3")),
        told_3: stage("He rises and takes up his greatsword. He does not ask you where the workshop is. He does not look at you again.",
            done("Leave.", ["jaeger_told"])),

        // ---- not told ----
        dunno: stage("\"No? Pity.\" He studies you a long moment, the way a man studies a lock.",
            next("dunno_2")),
        // the one slip of his own name, caught at once: never named, by him or by the narrator
        dunno_2: stage("\"Jae... Nikoli will find you. [pause] Nikoli always finds people.\"",
            done("Leave him to the dark.")),

        // ---- talked to again, before the player has gone ----
        again: stage("He does not look up from the greatsword across his knees. \"Nikoli has nothing more to ask you.\"",
            [{ text: "Leave.", outcomes: [{ weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }] }]),
        again_told: stage("He is buckling on his gauntlets. \"Nikoli has what he came for. Go, my friend.\"",
            [{ text: "Leave.", outcomes: [{ weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }] }])
    }
};
