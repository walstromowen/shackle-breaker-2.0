/* Act 3: where the stories of Mentoras (the Hooded Stranger), Nikoli and Jaeger come together (story/heroes.js says which outcome a player has, and who
   stands where). Here are the scenes that are not Nikoli's or the Stranger's own (those are in nikoli.js and hoodedStranger.js):

     codey            Codey in the snowy house: a nod; or, Mentoras taken ("pursuer"), the wrecked house, Codey wounded, his signs, the quest the_pursuer.
     stranger_mark    the desert workshop once they have gone north: Codey's mark scratched into the anvil, and mountains under snow.
     brothers_sword   "ashes": Nikoli's cold campfire, his greatsword planted in the snow. Taking it is the player's own doing.
     pursuer          "pursuer": in the hoard of the catacombs, Jaeger and his prisoner; the fight (a boss, no escape), then pursuer_won.
     pursuer_won      Jaeger flees into the dark; the chains broken; Mentoras's thanks. He never blames the player: he does not know.

   Nobody ever vanishes in front of the player: whoever leaves does it as the scene tells it (REMOVE_STORY_NPC takes them off this player's map only).
   Voiced (shared/story/voiceLines.js): the narrator, the Stranger, and Jaeger. Personal: each player's own story. */
import { gameState } from '../../../core/gameState.js';
import { mentorasTaken, has } from '../../heroes.js';

const toStage = (stageId) => [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId } }] }];
const next = (stageId) => [{ text: "Continue.", outcomes: toStage(stageId) }];
const end = (text = "Leave.", results = []) => [{ text, outcomes: [{ weight: 100, results: [...results, { type: "END_ENCOUNTER", payload: null }] }] }];
const CODEY_IMG = { sheet: "nightbladeHeroPortrait", col: 0, row: 0 };
const JAEGER_IMG = { sheet: "warlordHeroPortrait", col: 0, row: 0 };
const STRANGER_IMG = { sheet: "encounter_hooded_stranger", col: 0, row: 0 };
const questActive = (id) => !!(gameState.quests && gameState.quests.active && gameState.quests.active[id]);

export const codey = {
    id: "codey",
    title: "Codey",
    imageSheet: "nightbladeHeroPortrait",
    personal: true,
    tone: "cold",
    initialStage: () => (mentorasTaken() ? (questActive('the_pursuer') ? 'taken_waiting' : 'taken') : 'idle'),
    stages: {
        idle: { displayText: "Codey", image: CODEY_IMG, text: "Codey sits with his back to the wall, facing the door. He gives you a short nod, and goes back to watching it.", decisions: end() },
        taken: { displayText: "The Workshop", image: CODEY_IMG, ambience: "none", sfx: "whispers", sfxVolume: 0.4,
            text: "The door hangs from one hinge. Inside, frost has crept over everything: the anvil, the tools, the walls. The forge is dead and white with frost.",
            decisions: next("taken_2") },
        taken_2: { displayText: "Codey", image: CODEY_IMG,
            text: "Codey sits against the far wall, one arm held tight to his side. He is bleeding, and does not seem to care. He raises his hands as you come in.",
            decisions: next("taken_3") },
        taken_3: { displayText: "Codey", image: CODEY_IMG,
            text: "He signs slowly. A big man. A greatsword. A hood, drawn low. Hands bound at the wrist. Then a skull, and steps going down into the dark.",
            decisions: end("\"I'll bring him back.\"", [{ type: "START_QUEST", payload: { questId: "the_pursuer" } }]) },
        taken_waiting: { displayText: "Codey", image: CODEY_IMG,
            text: "Codey has not moved from the wall. When he sees you, he signs the skull and the steps again, slower.",
            decisions: end() }
    }
};

export const strangerMark = {
    id: "stranger_mark",
    title: "The Anvil",
    imageSheet: "encounter_hooded_stranger",
    personal: true,
    tone: "cold",
    initialStage: "mark",
    stages: {
        mark: { displayText: "The Anvil", image: STRANGER_IMG, ambience: "none",
            text: "The forge is cold. Scratched into the anvil is a mark you have seen before: a hand, fingers spread, then closed into a fist. Beneath it, a crude drawing of mountains under snow.",
            decisions: end() }
    }
};

export const brothersSword = {
    id: "brothers_sword",
    title: "A Cold Fire",
    imageSheet: "warlordHeroPortrait",
    personal: true,
    tone: "cold",
    initialStage: "cold",
    stages: {
        cold: { displayText: "A Cold Fire", image: JAEGER_IMG, bgm: "none", ambience: "none",
            text: "The campfire is cold. Snow has drifted into the ashes, and no one has sat here for many nights.",
            decisions: next("sword") },
        sword: { displayText: "Brother's Sword",
            text: "A greatsword stands planted in the snow beside it, rimed with frost. A length of broken chain hangs from its hilt.",
            decisions: end("Take the sword.", [
                { type: "GIVE_ITEM", payload: { itemId: "brothers_sword", qty: 1 } },
                { type: "GRANT_MILESTONE", payload: { id: "brothers_sword_taken" } },
                { type: "REMOVE_STORY_NPC", payload: { objectId: "BROTHERS_SWORD" } }
            ]) }
    }
};

export const pursuer = {
    id: "pursuer",
    title: "The Pursuer",
    imageSheet: "warlordHeroPortrait",
    personal: true,
    tone: "cold",
    initialStage: () => (has('pursuer_done') ? 'freed_again' : 'captive'),
    stages: {
        captive: { displayText: "The Pursuer", image: JAEGER_IMG, bgm: "apexPredatorBgm",
            text: "Among the hoard, a broad man in dark Panzerian armour stands waiting, a greatsword in his hands. At his feet, chained and silent, kneels the hooded man.",
            decisions: next("captive_2") },
        captive_2: { displayText: "Nikoli", image: JAEGER_IMG, text: "\"You came. Good. Nikoli hates to wait.\"", decisions: next("captive_3") },
        captive_3: { displayText: "The Hooded Stranger", image: STRANGER_IMG, text: "\"That is not Nikoli. ...Nikoli has fewer teeth.\"", decisions: next("captive_4") },
        captive_4: { displayText: "Nikoli", image: JAEGER_IMG, text: "\"Quiet, Commander.\"", decisions: [{
            text: "Draw your weapon.",
            outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: { enemies: ["JAEGER_BOSS"], bgm: "apexPredatorBgm", noEscape: true, afterVictory: { encounterId: "pursuer_won" } } }] }]
        }] },
        // talked to again after he is freed, before the player has gone
        freed_again: { displayText: "The Hooded Stranger", image: STRANGER_IMG, text: "\"Go on. I know the way back. I usually do.\"", decisions: end() }
    }
};

export const pursuerWon = {
    id: "pursuer_won",
    title: "The Pursuer",
    imageSheet: "encounter_hooded_stranger",
    personal: true,
    tone: "cold",
    initialStage: "fled",
    stages: {
        fled: { displayText: "The Pursuer", image: JAEGER_IMG, bgm: "none",
            text: "He staggers back between the graves, frost bleeding from his wounds, and is gone into the dark.",
            decisions: [{ text: "Continue.", outcomes: [{ weight: 100, results: [{ type: "REMOVE_STORY_NPC", payload: { objectId: "JAEGER_CAPTOR" } }, { type: "ADVANCE_STAGE", payload: { stageId: "chains" } }] }] }] },
        chains: { displayText: "The Hooded Stranger", image: STRANGER_IMG,
            text: "You break the chains. The hooded man rises slowly, rubbing his wrists. \"You came. ...I did not expect anyone to.\" [pause] \"Thank you.\"",
            decisions: end("Leave.", [
                { type: "COMPLETE_QUEST", payload: { questId: "the_pursuer", force: true } },
                { type: "GRANT_MILESTONE", payload: { id: "pursuer_done" } }
            ]) }
    }
};
