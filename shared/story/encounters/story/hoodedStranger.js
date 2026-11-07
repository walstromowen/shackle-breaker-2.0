/* The Hooded Stranger (object HOODED_STRANGER_NPC): the quest giver of the Shackled questline. There is only ever one of him, standing in one village
   workshop (InteriorFactory picks it: world.strangerHome), and the player comes back to him after every step.

   Who he is: shackled like the player, further along. He has made his peace with going mad and finds it funnier than he should. Gritty, tired,
   gallows humour. He tells what he knows a little at a time: one piece of the story each time a step is handed in.

   What he says depends on the player's quests (initialStage below):
     shackled_stranger active          meet .. meet_4: the first meeting; hands in "find him" and gives shackled1
     a step active, objectives done     turnin_<step>: he hears the report (COMPLETE_QUEST: its rewards), lore_<step>: a piece of the story,
                                        then give_<next>: the next step (START_QUEST). After Darius: turnin_shackled8, then lore_shackled8 ends it.
     a step active, not done yet        waiting_<step>: a reminder of what he asked
     a step not yet given               give_<step>: he gives it (an old save, or a step handed in before he existed)
     every step handed in               after_darius
   The chain, in order: shackled_stranger, shackled1, shackled2, shackled3, shackled7, shackled8 (questDefinitions.js; every step has turnIn: "HOODED_STRANGER").
   What he lets slip, visit by visit: the shackles count you; the stone fell in the war and the king called it a gift; magic keeps a tally and
   someone pays it; Darius kept the light for a king who never came back; the red moon. (Act 2, story/encounters/story/actTwo.js, shows the rest.)

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
const next = (stageId) => [{ text: "Continue.", outcomes: toStage(stageId) }];

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

/* A step handed out: his words, then the player's word starts it. */
const give = (questId, text) => stage(text, [{
    text: "\"I'll see it done.\"",
    outcomes: [{ weight: 100, results: [{ type: "START_QUEST", payload: { questId } }, { type: "END_ENCOUNTER", payload: null }] }]
}]);

/* A step handed in: his words, its rewards, then on to what he lets slip this time. */
const turnIn = (questId, text, then) => stage(text, [{
    text: "Continue.",
    outcomes: [{ weight: 100, results: [{ type: "COMPLETE_QUEST", payload: { questId } }, { type: "ADVANCE_STAGE", payload: { stageId: then } }] }]
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
        meet: stage("A hooded man leans against the workbench with his arms folded, as if he has been waiting a long time. He looks at your wrists before he looks at your face.",
            next("meet_2")),
        meet_2: stage("\"So the line broke. Lucky you. Or not. It's hard to tell the difference anymore.\"",
            next("meet_3")),
        meet_3: stage("\"Those shackles have no lock. They were never meant to come off. I've seen a lot of wrists like yours. Most of them laugh now. Some days I catch myself humming along.\"",
            next("meet_4")),
        meet_4: stage("\"You want answers. Everyone does, right up until they get them. Get stronger first. The truth is heavy, and you can barely lift your own arms.\"",
            [{
                text: "\"I'll be back.\"",
                outcomes: [{ weight: 100, results: [
                    { type: "COMPLETE_QUEST", payload: { questId: "shackled_stranger", force: true } },
                    { type: "START_QUEST", payload: { questId: "shackled1" } },
                    { type: "END_ENCOUNTER", payload: null }
                ] }]
            }]),

        // ---- shackled1: get stronger ----
        give_shackled1: give("shackled1", "\"Get stronger, then come back. The truth is heavy, and you can barely lift your own arms.\""),
        waiting_shackled1: waiting("\"Not yet. You still walk like a prisoner. Come back when you stop flinching at your own shadow.\""),
        turnin_shackled1: turnIn("shackled1", "\"Still sane? Good. Enjoy it. It doesn't keep.\"", "lore_shackled1"),
        lore_shackled1: stage("\"The iron isn't there to hold you. It's there to count you. Every one of us in chains was being kept for something. I never found out what. I stopped asking when the voices started answering.\"",
            next("give_shackled2")),

        // ---- shackled2: the madmen ----
        give_shackled2: give("shackled2", "\"The madmen in the grass wear the same iron. Put three of them down, and listen before you swing. The mad say true things sometimes. They just say them very loudly.\""),
        waiting_shackled2: waiting("\"Three madmen. Follow the laughing. If it starts to sound like a tune, you've stayed too long.\""),
        turnin_shackled2: turnIn("shackled2", "\"Let me guess. A stone from the sky. They all say it. I say it too, in my sleep, or so the walls tell me.\"", "lore_shackled2"),
        lore_shackled2: stage("\"It fell in the war, back when Altus still had kings. The night went white, they say. The king knelt before it and called it a gift. Kings call anything a gift if someone else pays for it.\"",
            next("give_shackled3")),

        // ---- shackled3: the magic addicts ----
        give_shackled3: give("shackled3", "\"The ones who throw sparks were the first to touch it. Healers, scholars, soldiers with pretty blades. Now they can't stop. Three of them. Call it mercy. I'd want somebody to do it for me.\""),
        waiting_shackled3: waiting("\"Three of the spark-throwers. Don't let them show you a trick. Their tricks are how they got like this.\""),
        turnin_shackled3: turnIn("shackled3", "\"Done? Don't look at me like that. I'd have done it myself, but my hands shake now. That's how it starts. Then the humming. Then the jokes stop being yours.\"", "lore_shackled3"),
        lore_shackled3: stage("\"Magic keeps a tally, and somebody always pays it. I used to think it was the casters. Then I look at our wrists, and I wonder who was really paying.\"",
            next("give_shackled7")),

        // ---- shackled7: the old soldiers, and the meteorite ----
        give_shackled7: give("shackled7", "\"The stone went with the soldiers who still wear the old colors. Legionaries, watchmen. They march like the war never ended. Nobody told them. Nobody ever tells soldiers anything. Take it back.\""),
        waiting_shackled7: waiting("\"Three legionaries, two watchmen. They still salute each other. It'd be funny if it weren't so sad. It's a little funny.\""),
        turnin_shackled7: turnIn("shackled7", "\"You have it. Don't hold it too long. Warm, isn't it? Stones shouldn't be warm. Neither should I, these days.\"", "lore_shackled7"),
        lore_shackled7: stage("\"There was a man who served the king. Darius. He kept the light while the king was away. The king never came back, and Darius never stopped waiting. Loyalty's a fine thing, right up until it isn't.\"",
            next("give_shackled8")),

        // ---- shackled8: Darius ----
        give_shackled8: give("shackled8", "\"There's an altar of dark stone deep in the caves, a skull above a hollow the size of a fallen star. He's still kneeling there. Bring him his stone. He won't thank you.\""),
        waiting_shackled8: waiting("\"The altar, the Groveler, the stone. Go when you're strong. Or go now, and save me the trouble of remembering your name.\""),
        turnin_shackled8: turnIn("shackled8", "\"So the Groveler is dead. Poor bastard. Waited his whole life for a king, and he got you.\"", "lore_shackled8"),
        lore_shackled8: stage("\"Whatever that stone was holding back, it isn't now. Look up tonight. If the moon's red, it's begun. If it isn't, I've finally lost it. Either way, come back. Where else would I go?\"",
            [leave("Leave.")]),

        // ---- after the questline ----
        after_darius: stage("\"Still here. Still mostly me. Come back when you've seen what walks under the red moon.\"", [leave("Leave.")])
    }
};
