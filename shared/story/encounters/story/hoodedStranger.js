/* The Hooded Stranger (object HOODED_STRANGER_NPC): the quest giver of the Shackled questline. There is only ever one of him, standing in one village
   workshop (InteriorFactory picks it: world.strangerHome), and the player comes back to him after every step.

   What he says depends on the player's quests (initialStage below):
     shackled_stranger active          meet, meet_3, meet_4: the first meeting; hands in "find him" and gives shackled1
     a step active, objectives done     turnin_<step>: he hears the report (COMPLETE_QUEST: its rewards), then give_<next>: the next step (START_QUEST)
     a step active, not done yet        waiting_<step>: a reminder of what he asked
     a step not yet given               give_<step>: he gives it (an old save, or a step handed in before he existed)
     every step handed in               after_darius
   The chain, in order: shackled_stranger, shackled1, shackled2, shackled3, shackled7, shackled8 (questDefinitions.js; every step has turnIn: "HOODED_STRANGER").

   Personal: in a party of players this is never shared or voted on, since it is about this player's own quests.
   Art: assets/icons/encounters/story/hooded_stranger.png registered as `encounter_hooded_stranger` (one 128 px picture). */
import { gameState } from '../../../core/gameState.js';
import { QuestModel } from '../../questModel.js';

const CHAIN = ['shackled_stranger', 'shackled1', 'shackled2', 'shackled3', 'shackled7', 'shackled8'];
const IMG = { col: 0, row: 0 };
const TITLE = "The Hooded Stranger";

const toStage = (stageId) => [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId } }] }];
const leave = (text = "Leave him to his work.") => ({ text, outcomes: [{ weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }] });
const stage = (text, decisions, extra = {}) => ({ displayText: TITLE, image: IMG, text, decisions, ...extra });

/** The stage he opens with, from the player's quests. */
function opening() {
    const q = gameState.quests || {};
    const active = (id) => !!(q.active && q.active[id]);
    const done = (id) => Array.isArray(q.completed) && q.completed.includes(id);
    if (active('shackled_stranger')) return 'meet';
    for (const id of CHAIN.slice(1)) {
        if (done(id)) continue;
        if (active(id)) return QuestModel.checkCompletion(gameState, id) ? `turnin_${id}` : `waiting_${id}`;
        return `give_${id}`;
    }
    return 'after_darius';
}

/* A step handed out: his words, then "I'll see it done." starts it. */
const give = (questId, text) => stage(text, [{
    text: "\"It will be done.\"",
    outcomes: [{ weight: 100, results: [{ type: "START_QUEST", payload: { questId } }, { type: "END_ENCOUNTER", payload: null }] }]
}]);

/* A step handed in: his words, then on to the next step (or the end). */
const turnIn = (questId, text, next) => stage(text, [{
    text: "Continue.",
    outcomes: [{ weight: 100, results: [{ type: "COMPLETE_QUEST", payload: { questId } }, { type: "ADVANCE_STAGE", payload: { stageId: next } }] }]
}]);

const waiting = (text) => stage(text, [leave()]);

export const STRANGER_CHAIN = CHAIN;

export const hoodedStranger = {
    id: "hooded_stranger",
    title: TITLE,
    imageSheet: "encounter_hooded_stranger",
    personal: true,
    tone: "cold",
    initialStage: opening,
    stages: {
        // ---- the first meeting ----
        meet: stage("A hooded man leans against the workbench with his arms folded, as if he has been waiting a long time. He looks at your wrists before he looks at your face. \"So the line broke. I wondered which of you it would be.\"",
            [{ text: "Continue.", outcomes: toStage("meet_3") }]),
        meet_3: stage("\"Those shackles have no lock because they were never meant to come off. I have seen a great many wrists like yours. Most of them laugh now.\"",
            [{ text: "Continue.", outcomes: toStage("meet_4") }]),
        meet_4: stage("\"You are weak, and the road does not forgive weakness. Grow stronger. When you can stand on your own, come back, and I will tell you where to look.\"",
            [{
                text: "\"I will be back.\"",
                outcomes: [{ weight: 100, results: [
                    { type: "COMPLETE_QUEST", payload: { questId: "shackled_stranger", force: true } },
                    { type: "START_QUEST", payload: { questId: "shackled1" } },
                    { type: "END_ENCOUNTER", payload: null }
                ] }]
            }]),

        // ---- shackled1: grow stronger ----
        give_shackled1: give("shackled1", "\"You are weak, and the road does not forgive weakness. Grow stronger, then come back to me.\""),
        waiting_shackled1: waiting("\"Not yet. You still walk like a prisoner.\""),
        turnin_shackled1: turnIn("shackled1", "\"Better. You have stopped looking over your shoulder.\"", "give_shackled2"),

        // ---- shackled2: the madmen ----
        give_shackled2: give("shackled2", "\"Others wear the same iron as you. They laugh in the grass, sharing a dream they cannot wake from. Put three of them to rest, and listen to what they say before they go.\""),
        waiting_shackled2: waiting("\"The madmen still laugh in the grass. Three of them. And come back stronger than you left.\""),
        turnin_shackled2: turnIn("shackled2", "\"You heard them, then. A stone that fell from the sky. Their minds broke, but the memory did not.\"", "give_shackled3"),

        // ---- shackled3: the magic addicts ----
        give_shackled3: give("shackled3", "\"The ones who still conjure sparks were the first to touch it. They cannot stop now. Find three of them, and end it.\""),
        waiting_shackled3: waiting("\"The ones who conjure sparks. Three of them. It is a mercy, whatever they tell you.\""),
        turnin_shackled3: turnIn("shackled3", "\"Magic does that. It gives, and it keeps a tally.\"", "give_shackled7"),

        // ---- shackled7: the old soldiers, and the meteorite ----
        give_shackled7: give("shackled7", "\"The stone went with the soldiers who still wear the old colors. Legionaries, watchmen. They march as if the war never ended. Take it back from them.\""),
        waiting_shackled7: waiting("\"The old soldiers still have it. Three legionaries, two watchmen. Do not come back empty-handed.\""),
        turnin_shackled7: turnIn("shackled7", "\"You have it. Keep it close. It is warm, isn't it? It should not be.\"", "give_shackled8"),

        // ---- shackled8: Darius ----
        give_shackled8: give("shackled8", "\"There is an altar of dark stone deep in the caves, a skull above a hollow the size of a fallen star. Someone still kneels there. Bring him the stone, and be ready.\""),
        waiting_shackled8: waiting("\"The altar is waiting, and so is he. Carry the stone, and be strong when you go.\""),
        turnin_shackled8: turnIn("shackled8", "\"So the Groveler is dead, and the stone is spent.\"", "after_darius"),

        // ---- after the questline ----
        after_darius: stage("\"Look up tonight. If the moon has turned red, then it has begun. Come back when you have seen what walks under it.\"", [leave("Leave.")])
    }
};
