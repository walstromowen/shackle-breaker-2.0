/* The Hooded Stranger (object HOODED_STRANGER_NPC): the quest giver of the Shackled questline. There is only ever one of him, standing in one village
   workshop (InteriorFactory picks it: world.strangerHome), and the player comes back to him after every step.

   Who he is: shackled like the player, further along. He has made his peace with going mad and finds it funnier than he should. Gritty, tired,
   gallows humour. He tells what he knows a little at a time: one piece of the story each time a step is handed in.

   What he says depends on the player's quests (initialStage below):
     shackled_stranger active          meet .. meet_4: the first meeting; hands in "find him" and gives shackled1
     a step active, objectives done     turnin_<step>: he hears the report (COMPLETE_QUEST: its rewards), lore_<step> and lore_<step>_2: a piece
                                        of the story, then give_<next>: the next step (START_QUEST). After Darius: turnin, lore, lore_2, lore_3, the end.
     a step active, not done yet        waiting_<step> .. waiting_<step>_3: small talk and a reminder of what he asked
     a step not yet given               offer_<step>, offer_<step>_2, then give_<step> (an old save, or a step handed in before he existed)
     every step handed in               after_darius .. after_darius_3
   Every conversation is three to five stages. He does not know what causes the curse: he notices things (the clever ones went first) and shrugs.
   The chain, in order: shackled_stranger, shackled1, shackled2, shackled3, shackled7, shackled8 (questDefinitions.js; every step has turnIn: "HOODED_STRANGER").
   What he lets slip, visit by visit: the shackles count you; the brightest stone (the artifact) came before the war and the king called it a gift, the rest kept falling all through the war;
   the ones who could work a spell went strange first (he does not know why, and would rather not); the king gave one of the stones to Darius, a
   governor and one of his advisers, to keep until he came back, and Darius lost it (his soldiers in the old colors search for it still); the red moon.
   He is Cornelius Mentoras, once commander of the royal guard (docs/story.md): never said, and nothing he says may give it away before the story does. (Act 2, story/encounters/story/actTwo.js, shows the rest.)

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
        return `offer_${id}`;
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

/* A visit before the step is done: three stages of talk, the last one lets you go. */
const waiting = (id, a, b, c) => ({
    [`waiting_${id}`]: stage(a, next(`waiting_${id}_2`)),
    [`waiting_${id}_2`]: stage(b, next(`waiting_${id}_3`)),
    [`waiting_${id}_3`]: stage(c, [leave()])
});

/* A step he has not given yet (an old save): he takes a moment to remember, then gives it. `to` is the stage that gives it. */
const offer = (id, to = `give_${id}`) => ({
    [`offer_${id}`]: stage("\"You again. I lose track of who I've sent where. Faces blur after a while.\"", next(`offer_${id}_2`)),
    [`offer_${id}_2`]: stage("\"Right. Yes. I remember now. Mostly.\"", next(to))
});

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
        ...offer('shackled1'),
        give_shackled1: give("shackled1", "\"Get stronger, then come back. The truth is heavy, and you can barely lift your own arms.\""),
        ...waiting('shackled1',
            "\"Not yet. You still walk like a prisoner.\"",
            "\"Don't take it badly. I walked like that for a year. Then I stopped walking much at all.\"",
            "\"Go. Come back when the iron feels lighter. It won't, but you'll stop noticing.\""),
        turnin_shackled1: turnIn("shackled1", "\"Still sane? Good. Enjoy it. It doesn't keep.\"", "lore_shackled1"),
        lore_shackled1: stage("\"The iron isn't there to hold you. It's there to count you. Every one of us in chains was being kept for something.\"", next("lore_shackled1_2")),
        lore_shackled1_2: stage("\"I never found out what. I stopped asking when the voices started answering. They're no help. They mostly want to talk about the weather.\"", next("give_shackled2")),

        // ---- shackled2: the madmen ----
        ...offer('shackled2'),
        give_shackled2: give("shackled2", "\"The madmen in the grass wear the same iron. Put three of them down, and listen before you swing. The mad say true things sometimes. They just say them very loudly.\""),
        ...waiting('shackled2',
            "\"Three madmen. Follow the laughing.\"",
            "\"If it starts to sound like a tune, you've stayed too long.\"",
            "\"And if you catch yourself humming it on the way back, don't tell me. I'd rather not know.\""),
        turnin_shackled2: turnIn("shackled2", "\"Let me guess. Stones from the sky. They all say it.\"", "lore_shackled2"),
        lore_shackled2: stage("\"I say it too, in my sleep, or so the walls tell me. The brightest came first, before the war, back when Altus still had kings. The rest kept falling all through it. One here, one there, year after year.\"", next("lore_shackled2_2")),
        lore_shackled2_2: stage("\"The king knelt before the brightest of them and called it a gift. Kings call anything a gift if someone else pays for it.\"", next("give_shackled3_pre")),

        // ---- shackled3: the spark-throwers (he does not know why they went first, and would rather not guess) ----
        ...offer('shackled3', 'give_shackled3_pre'),
        give_shackled3_pre: stage("\"There are others. The ones who can't stop throwing sparks. Healers, scholars, soldiers with pretty blades. The clever ones went strange first. Make of that what you like. I try not to.\"", next("give_shackled3")),
        give_shackled3: give("shackled3", "\"Put three of them down. Call it mercy. I'd want somebody to do it for me.\""),
        ...waiting('shackled3',
            "\"Three of the spark-throwers. They'll be the ones setting the grass on fire.\"",
            "\"Don't let them show you a trick. Don't ask me why. Call it a feeling. I get a lot of those lately.\"",
            "\"Go on. I'll be here, talking to the anvil. It's a good listener. Better than most.\""),
        turnin_shackled3: turnIn("shackled3", "\"Done? Don't look at me like that. I'd have done it myself, but my hands shake these days.\"", "lore_shackled3"),
        lore_shackled3: stage("\"Strange thing. Every one of them could work a spell, before. The ones who never could seem to laugh less. Or later. I can't tell which.\"", next("lore_shackled3_2")),
        lore_shackled3_2: stage("\"Probably nothing. I've been wrong before. About the war, about the king, about the weather. Mostly the weather.\"", next("give_shackled7")),

        // ---- shackled7: the old soldiers, and the meteorite ----
        ...offer('shackled7'),
        give_shackled7: give("shackled7", "\"The soldiers who still wear the old colors are searching for a stone. Legionaries, watchmen. They march like the war never ended. Nobody told them. Nobody ever tells soldiers anything. Take one from them.\""),
        ...waiting('shackled7',
            "\"Three legionaries, two watchmen. They still salute each other.\"",
            "\"It'd be funny if it weren't so sad. It's a little funny.\"",
            "\"Bring back a stone. And try not to die. I'd have to find someone else to talk to, and the anvil's started sulking.\""),
        turnin_shackled7: turnIn("shackled7", "\"You found one. Don't hold it too long. Warm, isn't it? Stones shouldn't be warm. Neither should I, these days.\"", "lore_shackled7"),
        lore_shackled7: stage("\"There was a man who served the king. Darius, a governor with the king's ear. The king gave him one of the stones to keep safe until he came back.\"", next("lore_shackled7_2")),
        lore_shackled7_2: stage("\"Darius lost it. His soldiers have been searching ever since, while he kneels in the dark and waits for a king who isn't coming. Loyalty's a fine thing, right up until it isn't.\"", next("give_shackled8")),

        // ---- shackled8: Darius ----
        ...offer('shackled8'),
        give_shackled8: give("shackled8", "\"There's an altar of dark stone deep in the caves, a skull above a hollow the size of a fallen star. He's still kneeling there. Show him your stone, and see if he can tell it from his own. He won't thank you.\""),
        ...waiting('shackled8',
            "\"The altar, the Groveler, the stone.\"",
            "\"Go when you're strong. He's had a long time to get angry, and nothing else to do.\"",
            "\"Or go now, and save me the trouble of remembering your name. I'm already losing mine.\""),
        turnin_shackled8: turnIn("shackled8", "\"So the Groveler is dead. Poor bastard. Waited his whole life for a king, and he got you.\"", "lore_shackled8"),
        lore_shackled8: stage("\"Whatever that stone was holding back, it isn't now. I can feel it in the iron. You can too, can't you?\"", next("lore_shackled8_2")),
        lore_shackled8_2: stage("\"Look up tonight. If the moon's red, it's begun. If it isn't, I've finally lost it.\"", next("lore_shackled8_3")),
        lore_shackled8_3: stage("\"Either way, come back. Where else would I go?\"", [leave("Leave.")]),

        // ---- after the questline ----
        after_darius: stage("\"Still here. Still mostly me.\"", next("after_darius_2")),
        after_darius_2: stage("\"The voices are louder since the moon turned. One of them does a good impression of my mother. I didn't like her either.\"", next("after_darius_3")),
        after_darius_3: stage("\"Come back when you've seen what walks under the red moon. Or don't. I'll be here regardless.\"", [leave("Leave.")])
    }
};
