/* The Hooded Stranger (object HOODED_STRANGER_NPC): the quest giver of the Shackled questline. There is only ever one of him, standing in one village
   workshop (InteriorFactory picks it: world.strangerHome), and the player comes back to him after every step.

   Who he is: shackled like the player, further along, and slowly losing his mind to it. Genuine, and very hard on himself; never cruel to the player.
   He tells only what is needed for the next step, and nothing of his own story outright: the player pieces it together. A dry, dark humour, always at
   his own expense (the weather, the anvil, the voices he hears), closes every step he gives.

   What he says depends on the player's quests (initialStage below):
     shackled_stranger active          meet .. meet_4: the first meeting; hands in "find him" and gives shackled1
     a step active, objectives done     turnin_<step>: he hears the report (COMPLETE_QUEST: its rewards), lore_<step> and lore_<step>_2: a piece
                                        of the story, then give_<next>: the next step (START_QUEST). After Darius: turnin, lore, lore_2, lore_3, the end.
     a step active, not done yet        waiting_<step> .. waiting_<step>_3: small talk and a reminder of what he asked
     a step not yet given               offer_<step>, offer_<step>_2, then give_<step> (an old save, or a step handed in before he existed)
     every step handed in, act 1        after_darius .. after_darius_3
   Act 2, in the desert workshop (world.strangerDesertHome): "The Hands That Speak", the search for Codey (codey1, codey2, codey3, all turnIn
   HOODED_STRANGER): desert_meet .. desert_meet_4 and give_codey1 the first time; then waiting_ / turnin_ / lore_ / give_ as above. codey3's last
   objective is the Dry Kraken, which ambushes the player in the open desert once the miragewrights are dead (story/storyAmbush.js,
   story/encounters/story/codey.js); the hand-in is the reunion; after_codey .. after_codey_3 afterwards.
   Every conversation is three to five stages. He does not know what causes the curse: he notices things (the clever ones went first) and shrugs.
   The chain, in order: shackled_stranger, shackled1, shackled2, shackled3, shackled7, shackled8 (questDefinitions.js; every step has turnIn: "HOODED_STRANGER").
   What he lets slip, visit by visit: the shackles count you; the brightest stone (the artifact) came before the war and the king called it a gift, the rest kept falling all through the war;
   the ones who could work a spell went strange first (he does not know why, and would rather not); the king gave one of the stones to Darius, a
   governor and one of his advisers, to keep until he came back, and Darius lost it (his soldiers in the old colors search for it still); the red moon.
   He is Cornelius Mentoras, once commander of the royal guard (docs/story.md): never said, and nothing he says may give it away before the story does. (Act 2, story/encounters/story/actTwo.js, shows the rest.)
   His grief (his son, docs/story.md) is never spoken of. Once only, when Codey comes back alive, it slips out: "One of you did."

   Personal: in a party of players this is never shared or voted on, since it is about this player's own quests.
   Art: assets/icons/encounters/story/hooded_stranger.png registered as `encounter_hooded_stranger` (one 128 px picture). */
import { gameState } from '../../../core/gameState.js';
import { QuestModel } from '../../questModel.js';
import { movedNorth, heroesOutcome, has as hasMilestone } from '../../heroes.js';

const CHAIN = ['shackled_stranger', 'shackled1', 'shackled2', 'shackled3', 'shackled7', 'shackled8'];
const DESERT = ['codey1', 'codey2', 'codey3'];   // act 2: the search for Codey
const IMG = { col: 0, row: 0 };
const TITLE = "The Hooded Stranger";

const toStage = (stageId) => [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId } }] }];
const leave = (text = "Leave him to his work.") => ({ text, outcomes: [{ weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }] });
const stage = (text, decisions, extra = {}) => ({ displayText: TITLE, image: IMG, text, decisions, ...extra });
const next = (stageId) => [{ text: "Continue.", outcomes: toStage(stageId) }];

/** The stage he opens with, from the player's quests (and, in act 2, the desert search). */
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
    if (!(Array.isArray(gameState.milestones) && gameState.milestones.includes('act2'))) return 'after_darius';
    // act 2: the desert
    for (const id of DESERT) {
        if (done(id)) continue;
        if (active(id)) return QuestModel.checkCompletion(gameState, id) ? `turnin_${id}` : `waiting_${id}`;
        return id === 'codey1' ? 'desert_meet' : `offer_${id}`;
    }
    // act 3, in the snowy house (story/heroes.js)
    if (movedNorth()) {
        const o = heroesOutcome();
        if (o === 'friends' || o === 'brothers') return 'friends_m';
        if (o === 'pursuer' && hasMilestone('pursuer_done')) return 'rescued_m';
    }
    return 'after_codey';
}

/* A step handed out: his words, then the player's word starts it. */
const give = (questId, text, answer = "\"I'll see it done.\"") => stage(text, [{
    text: answer,
    outcomes: [{ weight: 100, results: [{ type: "START_QUEST", payload: { questId } }, { type: "END_ENCOUNTER", payload: null }] }]
}]);

/* A step handed in: his words, its rewards, then on to what he lets slip this time. */
const turnIn = (questId, text, then, extra = {}) => stage(text, [{
    text: "Continue.",
    outcomes: [{ weight: 100, results: [{ type: "COMPLETE_QUEST", payload: { questId } }, { type: "ADVANCE_STAGE", payload: { stageId: then } }] }]
}], extra);

/* A visit before the step is done: three stages of talk (or one), the last one lets you go. */
const waiting = (id, a, b, c) => (b ? {
    [`waiting_${id}`]: stage(a, next(`waiting_${id}_2`)),
    [`waiting_${id}_2`]: stage(b, next(`waiting_${id}_3`)),
    [`waiting_${id}_3`]: stage(c, [leave()])
} : { [`waiting_${id}`]: stage(a, [leave()]) });

/* A step he has not given yet (an old save, or a conversation left half way): he notices you, then gives it. `to` is the stage that gives it. */
const offer = (id, to = `give_${id}`) => ({
    [`offer_${id}`]: stage("\"You. I wondered when you would come back.\"", next(`offer_${id}_2`)),
    [`offer_${id}_2`]: stage("\"Listen.\"", next(to))
});

export const STRANGER_CHAIN = CHAIN;
export const STRANGER_DESERT = DESERT;

// Codey's own picture (the Namuh nightblade's portrait stands in for him) for the stages he is in
const CODEY_IMG = { sheet: "nightbladeHeroPortrait", col: 0, row: 0 };

export const hoodedStranger = {
    id: "hooded_stranger",
    title: TITLE,
    imageSheet: "encounter_hooded_stranger",
    personal: true,
    tone: "cold",
    initialStage: opening,
    stages: {
        // ---- the first meeting: he takes the player for one more doomed man, and is sorry for it ----
        meet: stage("A hooded man leans against the workbench. He looks at your wrists before he looks at your face, and something in his own face closes. \"Another one.\"",
            next("meet_2")),
        meet_2: stage("\"Those shackles have no lock. They were never meant to come off. I have watched many wear them. I tried to help some. It ended the same way, every time.\"",
            next("meet_3")),
        meet_3: stage("\"I am sorry. I was not good enough for them. I do not think I would be for you.\"",
            next("meet_4")),
        meet_4: stage("\"Stay alive. If you can. ...I say the same to myself every morning. So far it has worked. Mostly.\"",
            [{
                text: "\"I'll be back.\"",
                outcomes: [{ weight: 100, results: [
                    { type: "COMPLETE_QUEST", payload: { questId: "shackled_stranger", force: true } },
                    { type: "START_QUEST", payload: { questId: "shackled1" } },
                    { type: "END_ENCOUNTER", payload: null }
                ] }]
            }]),

        // ---- shackled1 (Not Good Enough): grow strong; he sees something in the one who comes back ----
        ...offer('shackled1'),
        give_shackled1: give("shackled1", "\"Stay alive. If you can. ...I say the same to myself every morning. So far it has worked. Mostly.\"", "\"I'll be back.\""),
        ...waiting('shackled1',
            "\"You came back. ...Not yet. Not like this.\"",
            "\"The last one who stood where you are stood there only once.\"",
            "\"Stay alive. That is all I ask.\""),
        turnin_shackled1: turnIn("shackled1", "He looks at your wrists, then at your face. Longer, this time. \"...You are still yourself. Most are not, by now.\"", "lore_shackled1"),
        lore_shackled1: stage("\"I was wrong about you. ...I am glad of it. Good enough.\"", next("lore_shackled1_2")),
        lore_shackled1_2: stage("\"The iron is not there to hold you. It counts you. Everyone in chains is being kept for something.\"", next("lore_shackled1_3")),
        lore_shackled1_3: stage("\"I have my suspicions. You do not need them yet. The voices have theories too. They mostly want to talk about the weather.\"", next("give_shackled2")),

        // ---- shackled2: the madmen ----
        ...offer('shackled2'),
        give_shackled2: give("shackled2", "\"The madmen in the grass wear the same iron. Put three of them down. Listen before you swing. The mad say true things. ...Try not to agree with them. That is how it starts.\""),
        ...waiting('shackled2',
            "\"Three madmen.\"",
            "\"Follow the laughter.\"",
            "\"If it starts to sound like a tune, you have stayed too long. ...And if you catch yourself humming it on the way back, do not tell me. I would rather not know.\""),
        turnin_shackled2: turnIn("shackled2", "\"Stones from the sky. They all say it.\"", "lore_shackled2"),
        lore_shackled2: stage("\"They are right. The brightest fell first, before the war. The rest kept falling all through it.\"", next("lore_shackled2_2")),
        lore_shackled2_2: stage("\"The king knelt before the brightest and called it a gift. It was not.\"", next("give_shackled3_pre")),

        // ---- shackled3: the spellcasters (he does not know why they went first) ----
        ...offer('shackled3', 'give_shackled3_pre'),
        give_shackled3_pre: stage("\"There are others. The ones who cannot stop casting. Healers, scholars, soldiers with bright blades. The clever went strange first. Make of that what you will.\"", next("give_shackled3")),
        give_shackled3: give("shackled3", "\"Put three of them down. It is a mercy. I would want the same. ...Remind me I said that, when the time comes. I may not take it well.\""),
        ...waiting('shackled3',
            "\"Three of the spellcasters.\"",
            "\"Do not let them show you a trick.\"",
            "\"Go. I will be here, talking to the anvil. It is a good listener. Better than most.\""),
        turnin_shackled3: turnIn("shackled3", "\"It is done. ...I should have been the one to do it.\"", "lore_shackled3"),
        lore_shackled3: stage("\"Every one of them could work a spell. Those who never could laugh later. Or not at all.\"", next("lore_shackled3_2")),
        lore_shackled3_2: stage("\"I do not know why. Perhaps I never will. I have given up on the weather entirely.\"", next("give_shackled7_pre")),

        // ---- shackled7: the old soldiers, and the meteorite ----
        ...offer('shackled7', 'give_shackled7_pre'),
        give_shackled7_pre: stage("\"Soldiers in the old colours still search for a stone. Legionaries, watchmen. They march as if the war never ended. Nobody told them.\"", next("give_shackled7")),
        give_shackled7: give("shackled7", "\"Take one from them. ...If you find one who knows the war is over, bring him back. I have questions. So do the voices.\""),
        ...waiting('shackled7',
            "\"Three legionaries. Two watchmen.\"",
            "\"They still salute each other.\"",
            "\"Bring back a stone. And try not to die. I would have to find someone else to talk to, and the anvil has started sulking.\""),
        turnin_shackled7: turnIn("shackled7", "\"You found one. Do not hold it long. It should not be warm.\"", "lore_shackled7"),
        lore_shackled7: stage("\"A governor named Darius had the king's ear. The king gave him one of the stones to keep until he returned.\"", next("lore_shackled7_2")),
        lore_shackled7_2: stage("\"Darius lost it. His soldiers still search. He waits in the dark for a king who is not coming.\"", next("give_shackled8")),

        // ---- shackled8: Darius ----
        ...offer('shackled8'),
        give_shackled8: give("shackled8", "\"There is an altar of dark stone deep in the caves, above a hollow the size of a fallen star. He kneels there still. Show him your stone. He will not take it well. ...I suppose it serves him right.\""),
        ...waiting('shackled8',
            "\"The altar. The Groveler. The stone.\"",
            "\"Go when you are strong.\"",
            "\"He has had a long time to grow angry.\""),
        turnin_shackled8: turnIn("shackled8", "\"The Groveler is dead. He waited his whole life for a king. Nobody came. ...Nobody ever comes.\"", "lore_shackled8"),
        lore_shackled8: stage("\"Whatever that stone held back, it is loose now. You feel it in the iron.\"", next("lore_shackled8_2")),
        lore_shackled8_2: stage("\"I do not know what comes next. ...I rarely do. I simply hide it better than most.\"", next("lore_shackled8_3")),
        lore_shackled8_3: stage("\"Go carefully.\"", [leave("Leave.")]),

        // ---- every step handed in, still act 1 (the same words as the last hand-in: the same clips) ----
        after_darius: stage("\"Whatever that stone held back, it is loose now. You feel it in the iron.\"", next("after_darius_2")),
        after_darius_2: stage("\"I do not know what comes next. ...I rarely do. I simply hide it better than most.\"", next("after_darius_3")),
        after_darius_3: stage("\"Go carefully.\"", [leave("Leave.")]),

        // ==== act 2, the desert workshop: "The Hands That Speak" ====
        // ---- the first visit: the red moon (as new to him as to the player), and Codey ----
        desert_meet: stage("The workshop is cold. The hooded man sits against a dead forge, the broken chain across his knees. He does not look surprised to see you. \"You have seen the moon.\"",
            next("desert_meet_2"), { ambience: "none" }),
        desert_meet_2: stage("\"In all my years I have never seen it that colour. Neither have the voices. They have gone very quiet. ...I do not like it when they are quiet.\"",
            next("desert_meet_3")),
        desert_meet_3: stage("\"I need someone found. A Namuh. ...They are not from here. They see in the dark, and they speak with their hands. You will not mistake him.\"",
            next("desert_meet_4")),
        desert_meet_4: stage("\"His name is Codey. He went into this desert. He has not come out.\"", [
            { text: "Continue.", outcomes: toStage("give_codey1") },
            { text: "\"Who is he to you?\"", outcomes: toStage("desert_who") }
        ]),
        desert_who: stage("\"Someone I owe. More than I can repay.\"", next("give_codey1")),
        give_codey1: give("codey1", "\"The sand stalkers drag what they kill into the dunes. Start there. If he fell, they will know where. ...He will not have fallen easily. Neither will you, I hope. I am running short of people to send.\"", "\"I'll find him.\""),

        // ---- codey1: the sand stalkers ----
        ...waiting('codey1',
            "\"The stalkers. Go.\"",
            "\"Look for black cloth. He wears black. He always has.\"",
            "\"The voices say he is close. The voices say a great many things. Twice now, they have been right. That worries me more than the rest.\""),
        turnin_codey1: turnIn("codey1", "You lay a strip of black cloth before him, stiff with dried blood. He studies it, then sets it down.", "lore_codey1"),
        lore_codey1: stage("\"His. Not his blood.\"", next("give_codey2")),

        // ---- codey2: the old road and its crusaders ----
        ...offer('codey2'),
        give_codey2: give("codey2", "\"There is an old road under the sand. Calcified crusaders walk it. He would have gone that way. Clear it. ...They have been dead for years, and they still keep better order than I do.\""),
        ...waiting('codey2', "\"The road. The crusaders will not step aside for you. Do not ask them to.\""),
        turnin_codey2: turnIn("codey2", "Among the shattered crusaders you found a mark cut into a road-stone: a hand, fingers spread, then closed into a fist.", "lore_codey2"),
        lore_codey2: stage("\"His mark. He was alive when he made it.\"", next("give_codey3")),

        // ---- codey3: the miragewrights (and, waiting in the open sand, the Dry Kraken) ----
        ...offer('codey3'),
        give_codey3: give("codey3", "\"The miragewrights hide what they find. If he is anywhere, he is behind one of their illusions. Break them. ...And if you see me out there, it is not me. Probably.\""),
        ...waiting('codey3', "\"Do not trust what you see out there. I stopped trusting my eyes years ago. They have yet to notice.\""),
        // the reunion: Codey is back (the Dry Kraken is dead). The one time his grief slips out.
        turnin_codey3: turnIn("codey3", "He is on his feet before you are through the door. He does not go to Codey. Codey does not go to him. They stand across the room like two soldiers deciding whether to salute.", "codey_back", { image: CODEY_IMG, ambience: "none" }),
        codey_back: stage("Codey strikes his fist twice against his chest. The old man returns it, stiffly, as if his arm has forgotten how. \"You took your time.\"", next("codey_back_2"), { image: CODEY_IMG }),
        codey_back_2: stage("\"...You came back. [pause] One of you did.\"", next("codey_back_3")),
        codey_back_3: stage("The words seem to surprise him. He turns to the forge at once. \"That will be all.\"", [leave("Leave them to it.")]),

        // ---- afterwards ----
        after_codey: stage("\"...You again. Good.\"", [
            { text: "Continue.", outcomes: toStage("after_codey_2") },
            // "ashes" (story/heroes.js): show him the sword found by the cold campfire
            { text: "[Brother's Sword] Show him the sword.", conditions: [{ type: "has_item", itemId: "brothers_sword", qty: 1 }, { type: "lacks_milestone", id: "brothers_sword_shown" }], outcomes: toStage("sword") }
        ]),
        sword: stage("He takes it from you and turns it over in his hands, slowly, the way he turned the black cloth. \"...Panzerian steel.\"", next("sword_2")),
        sword_2: stage("\"He was looking for me. Wasn't he.\"", next("sword_3")),
        sword_3: stage("He does not wait for an answer. For a long while he only looks at it. Then he holds it out to you, hilt first. \"Keep it. He would want it used.\"",
            [leave("Take it back.")].map(d => ({ ...d, outcomes: [{ weight: 100, results: [{ type: "GRANT_MILESTONE", payload: { id: "brothers_sword_shown" } }, { type: "END_ENCOUNTER", payload: null }] }] }))),
        // act 3: with Nikoli there ("friends", "brothers"); back from the catacombs ("pursuer")
        friends_m: stage("\"He cheats at cards. In three languages.\"", [leave("Leave.")]),
        rescued_m: stage("\"Codey has forgiven me for being caught. I have not.\"", [leave("Leave.")]),
        after_codey_2: stage("\"He keeps watch at the door. So do I. Between the two of us and the voices, it is getting crowded in here.\"", next("after_codey_3")),
        after_codey_3: stage("\"The voices are louder since the moon turned. One of them sounds like me. It is more optimistic. I do not trust it.\"", [leave("Leave.")])
    }
};
