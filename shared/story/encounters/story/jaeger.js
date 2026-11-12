/* Jaeger Ironson, "The Pursuer" (object JAEGER_NPC): Nikoli's brother, a Panzerian general corrupted by the artifact (docs/story.md). He is hunting
   Commander Mentoras (the Hooded Stranger) to kill him, and passes himself off as Nikoli to find him. He looks like Nikoli and speaks like him, but more
   seriously: the player has to see through him themselves. Nothing points it out; the clues are all there before he asks:
     his smile is straight and even (Nikoli has more gaps than teeth), and cold; the torches burn low and frost rims his gauntlets; he does not laugh or
     move; he slips into "I" before catching himself (Nikoli never forgets his third person); and a player who has met Nikoli gets no sign that he
     remembers them (remember).

   Where: among the hoard of the first catacombs the player walks into (InteriorFactory: world.jaegerCatacomb, CatacombGenerator config.storyNpc), until
   met. The player is never offered "you're not Nikoli": seeing through him means answering that they do not know the name, keeping Mentoras hidden
   on purpose. Either way he is gone from the map (DESTROY_OBJECT), and the milestone jaeger_met keeps him from coming back; jaeger_told remembers that
   the player told him of the hooded man in the workshop.

   Voiced in Nikoli's voice, played cold (tools/voice/voices.json JAEGER). Personal: this player's own meeting.
   Art: the Panzerian warlord's portrait, the same as Nikoli's. */
const TITLE = "Nikoli";   // the name he gives
const IMG = { col: 0, row: 0 };

const toStage = (stageId) => [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId } }] }];
const stage = (text, decisions, extra = {}) => ({ displayText: TITLE, image: IMG, text, decisions, ...extra });
const next = (stageId) => [{ text: "Continue.", outcomes: toStage(stageId) }];
// he is gone: the meeting is over for good (and what the player did, remembered)
const gone = (text, milestones = []) => [{ text, outcomes: [{ weight: 100, results: [
    { type: "GRANT_MILESTONE", payload: { id: "jaeger_met" } },
    ...milestones.map(id => ({ type: "GRANT_MILESTONE", payload: { id } })),
    { type: "DESTROY_OBJECT" },
    { type: "END_ENCOUNTER", payload: null }
] }] }];

export const jaeger = {
    id: "jaeger",
    title: TITLE,
    imageSheet: "warlordHeroPortrait",
    personal: true,
    tone: "cold",
    ambience: "none",
    initialStage: "waiting",
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
                conditions: [{ type: "quest_completed", id: "shackled_stranger" }],
                outcomes: toStage("told")
            },
            { text: "\"I don't know anyone by that name.\"", outcomes: toStage("dunno") }
        ]),

        // ---- told: he has what he came for ----
        told: stage("For a moment nothing in his face moves at all. \"A workshop. Of course. He always did like to be near a fire.\"",
            next("told_2")),
        told_2: stage("\"Thank you, my friend. You have been more helpful than you know.\"",
            next("told_3")),
        told_3: stage("He rises, and is gone into the dark between the graves before you think to ask how he knew the way.",
            gone("Leave.", ["jaeger_told"])),

        // ---- not told ----
        dunno: stage("\"No? Pity.\" He studies you a long moment, the way a man studies a lock.",
            next("dunno_2")),
        dunno_2: stage("\"If you remember, Nikoli will find you. Nikoli always finds people.\"",
            gone("Leave him to the dark."))
    }
};
