/* The Dry Kraken, and Codey (act 2, "Behind the Mirage", questDefinitions.js codey3; the Hooded Stranger's desert search: story/encounters/story/hoodedStranger.js).

   dry_kraken_ambush   once the miragewrights are dead, any step on the open sand may wake it (story/storyAmbush.js): the desert goes still, a dune
                       breathes in, and the Dry Kraken rises, Codey held high in one of its tentacles. No way round it: the fight (a boss, no
                       escape) starts at once. Its head and eight tentacles: entityDefinitions.js DRY_KRAKEN.
   codey_freed         after the fight (START_BATTLE afterVictory): Codey lands, cleans his blade, and asks the player, in signs, about the hooded man.
                       The kraken's death has already counted for the quest ("Find Codey"); the player takes him back to the workshop.

   Codey: a Namuh nightblade, mute; he speaks with his hands (the narrator tells the signs). The Namuh nightblade's portrait stands in for his.
   Narrated (shared/story/voiceLines.js VOICED: no speakers). The world's (story/worldStory.js): the party near you is pulled in, and the fight is theirs too (the fight may still pull in
   the players nearby). */
import { toStage, next } from '../stageKit.js';
const TITLE = "The Dry Kraken";
const KRAKEN_IMG = { sheet: "dryKrakenPortrait", col: 0, row: 0, size: 192 };
const CODEY_IMG = { sheet: "nightbladeHeroPortrait", col: 0, row: 0 };
const KRAKEN = ["DRY_KRAKEN", ...Array(8).fill("DRY_KRAKEN_TENTACLE")];


export const dryKrakenAmbush = {
    id: "dry_kraken_ambush",
    title: TITLE,
    personal: false,   // the world's story: shared with the party near you
    tone: "blood",
    initialStage: "stillness",
    stages: {
        stillness: {
            displayText: "Stillness",
            bgm: "none",
            ambience: "none",
            text: "The wind dies. Every grain of sand around you stops moving at once.",
            decisions: next("breath")
        },
        breath: {
            displayText: "Stillness",
            effect: "shake",
            sfx: "cinematicBoom",
            text: "Then the dune ahead breathes in.",
            decisions: next("rises")
        },
        rises: {
            displayText: TITLE,
            image: KRAKEN_IMG,
            bgm: "apexPredatorBgm",
            text: "It rises out of the desert like a sunken ship: a vast head crusted in salt and sand, eyes like old gold. The sea left this thing behind an age ago. It never forgave the land for it.",
            decisions: next("captive")
        },
        captive: {
            displayText: TITLE,
            image: KRAKEN_IMG,
            text: "One tentacle hangs half-severed, bleeding grey. Another holds a man in torn black high above the sand, a curved blade still in his fist. He is not struggling. He is waiting for his moment.",
            decisions: next("signal")
        },
        signal: {
            displayText: "Codey",
            image: CODEY_IMG,
            text: "Seeing you, he frees one hand and signs a single word, sharp and plain: Now.",
            decisions: [{
                text: "Draw your weapons.",
                outcomes: [{ weight: 100, results: [
                    { type: "START_BATTLE", payload: { enemies: KRAKEN, bgm: "apexPredatorBgm", noEscape: true, afterVictory: { encounterId: "codey_freed" } } }
                ] }]
            }]
        }
    }
};

export const codeyFreed = {
    id: "codey_freed",
    title: "Codey",
    personal: false,   // the world's story: shared with the party near you
    tone: "cold",
    initialStage: "sinks",
    stages: {
        sinks: {
            displayText: TITLE,
            image: KRAKEN_IMG,
            bgm: "none",
            text: "The Dry Kraken sinks back into the sand it came from, and the desert closes over it like water.",
            // its death begins act 3 (story/actDefinitions.js, story/heroes.js)
            decisions: [{ text: "Continue.", outcomes: [{ weight: 100, results: [{ type: "GRANT_MILESTONE", payload: { id: "act3" } }, { type: "ADVANCE_STAGE", payload: { stageId: "landed" } }] }] }]
        },
        landed: {
            displayText: "Codey",
            image: CODEY_IMG,
            text: "The nightblade lands on his feet. Of course he does. He cleans his blade before he looks at you, then studies you a long while with strange, patient eyes.",
            decisions: next("signs")
        },
        signs: {
            displayText: "Codey",
            image: CODEY_IMG,
            text: "He raises his hands and signs slowly, so that even you can follow: a hood, drawn low over the face. Then a question.",
            decisions: [{ text: "\"He's waiting for you.\"", outcomes: [{ weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }] }]
        }
    }
};
