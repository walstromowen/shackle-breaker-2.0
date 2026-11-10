/* Nikoli (object NIKOLI_NPC): a general of the Panzerians, the good one of two brothers (Ragnar, the cursed one, comes later). Both are hunting for
   Commander Mentoras, who is the Hooded Stranger: nobody knows that, and nothing here may say it outright.

   Where he is (WorldManager and InteriorFactory put him there, from this player's milestones):
     act 1, or never told        beside the first campfire of the snowy mountains the player came upon (world.nikoliCampfire)
     act 2 and told              in the Hooded Stranger's old workshop (world.strangerHome), one step behind him: the Stranger has gone to the
                                 first desert workshop the player walks into in act 2 (world.strangerDesertHome). They are never in one place.

   How it goes (milestones: nikoli_met, nikoli_told):
     meet .. meet_2              the first time: starving snow leopards close in on his fire, and he asks you to stand with him (or you
                                 walk away: the meeting waits for another night, walk_away). The fight
                                 (Nikoli an ally, battleState context.allies) is followed by nikoli_after_battle: his thanks, his name, his
                                 hunt, and the question.
     ask                         "Have you seen Commander Mentoras?" Telling him about the hooded man in the workshop needs the Stranger met
                                 (quest shackled_stranger handed in); it earns an Insight of Ice. "I don't know" leaves the question open.
     beast .. beast_3            either way he then mentions, in passing, why the cats are so hungry: a Panzerkamfer, a war beast of his
                                 people gone wild, hunts the peaks. Asking about it starts the quest panzerian_war_beast (kill one, then come
                                 back to him); it can also be asked about on any later visit, until it is taken.
     beast_done                  the beast is dead: he hears it, and the quest pays a second Insight of Ice (questDefinitions.js).
     beast_waiting               the quest taken, the beast still alive.
     again                       a later visit by the fire while he has not been told: he asks again.
     told_again                  told, still act 1: he is getting ready to leave.
     workshop .. workshop_3      act 2, told: he stands where the Stranger used to, and has just missed him.

   Personal: in a party of players this is each player's own (their milestones), never shared or voted on. The fight it starts may still pull
   in the players nearby; Nikoli then fights beside all of them.
   Art: the Panzerian warlord's portrait stands in for his own (entity NIKOLI). */
import { gameState } from '../../../core/gameState.js';
import { QuestModel } from '../../questModel.js';

const TITLE = "Nikoli";
const IMG = { col: 0, row: 0 };
const LEOPARDS_IMG = { sheet: "snowLeopardPortrait", col: 0, row: 0 };
const BEAST_QUEST = "panzerian_war_beast";

const toStage = (stageId) => [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId } }] }];
const end = (results = []) => [{ weight: 100, results: [...results, { type: "END_ENCOUNTER", payload: null }] }];
const stage = (text, decisions, extra = {}) => ({ displayText: TITLE, image: IMG, text, decisions, ...extra });
const next = (stageId) => [{ text: "Continue.", outcomes: toStage(stageId) }];

const milestones = () => (Array.isArray(gameState.milestones) ? gameState.milestones : []);
const has = (id) => milestones().includes(id);

/** The stage he opens with, from this player's milestones and quests. */
function opening() {
    if (!has('nikoli_met')) return 'meet';
    const q = gameState.quests || {};
    if (q.active && q.active[BEAST_QUEST] && QuestModel.checkCompletion(gameState, BEAST_QUEST)) return 'beast_done';
    if (has('nikoli_told')) return has('act2') ? 'workshop' : 'told_again';
    if (q.active && q.active[BEAST_QUEST]) return 'beast_waiting';
    return 'again';
}

/* The answer that tells him: only once the player has met the Hooded Stranger, and only while he has not been told. */
const tellHim = {
    text: "[Hooded Stranger] \"There's a hooded man in a village workshop. He might be the one.\"",
    conditions: [{ type: "quest_completed", id: "shackled_stranger" }, { type: "lacks_milestone", id: "nikoli_told" }],
    outcomes: toStage("told")
};
/* Asking about the war beast he mentioned, on a later visit: until the quest is taken. */
const askBeast = {
    text: "[Panzerkamfer] \"Tell me about that war beast.\"",
    conditions: [{ type: "quest_not_started", id: BEAST_QUEST }],
    outcomes: toStage("beast_2")
};

const STAGES = {
    // ---- the first meeting: starving snow leopards come for his fire ----
    meet: stage("A broad man in a battered Panzerian greatcoat stands with his back to the campfire, a greatsword in his hands. Beyond the light, pale shapes slink through the snow: snow leopards, starved thin, their eyes on the fire.",
        next("meet_2"), { image: LEOPARDS_IMG }),
    meet_2: stage("\"Three of them, and one of me. I liked those odds better when I was younger.\" He glances at you, then back at the dark. \"You carry a weapon. Stand with me.\"",
        [{
            text: "Draw your weapon.",
            outcomes: [{ weight: 100, results: [
                { type: "GRANT_MILESTONE", payload: { id: "nikoli_met" } },
                { type: "START_BATTLE", payload: {
                    enemies: ["SNOW_LEOPARD", "SNOW_LEOPARD", "SNOW_LEOPARD"],
                    allies: [{ id: "NIKOLI" }],
                    bgm: "snowyMountainsBattleBgm",
                    noEscape: true,
                    afterVictory: { encounterId: "nikoli_after_battle" }
                } }
            ] }]
        }, {
            // walking away: he holds the fire alone, and the meeting waits for another night (no milestone, so the next visit starts here again)
            text: "Walk away.",
            outcomes: toStage("walk_away")
        }]),
    walk_away: stage("You back away from the light. Behind you a deep voice curses in Panzerian, and the cats scream, and then the night is quiet again.",
        [{ text: "Keep walking.", outcomes: end() }]),

    // ---- after the fight: thanks, who he is, and who he is looking for ----
    // (in a party of players everyone who fought beside him plays this on their own screen: they have met him now too)
    after: stage("The last of the cats lies still in the snow. The big man wipes his greatsword clean on a frozen sleeve and looks you over. \"My thanks, stranger. I would have been their supper.\"",
        [{ text: "Continue.", outcomes: [{ weight: 100, results: [{ type: "GRANT_MILESTONE", payload: { id: "nikoli_met" } }, { type: "ADVANCE_STAGE", payload: { stageId: "after_2" } }] }] }]),
    after_2: stage("\"My name is Nikoli. I was a general of Panzeria, back when Panzeria had armies worth the name. I have come a long way south for one man: Commander Mentoras, of the Altus royal guard.\"",
        next("ask")),
    ask: stage("\"We bled on the same field at the end of the war, and he knows something I need to know. Have you seen him? Tired eyes. A sharp tongue. He never could stand being looked at.\"",
        [tellHim, { text: "\"I don't know anyone by that name.\"", outcomes: toStage("dunno") }]),
    told: stage("Nikoli is quiet for a long moment. \"A hood. Yes. That would be like him.\" He laughs once, without much in it.",
        next("told_2")),
    told_2: stage("\"You have done me a kindness, stranger. Take this. The ice remembers what the rest of us forget.\"",
        [{ text: "Take it.", outcomes: [{ weight: 100, results: [
            { type: "GIVE_ITEM", payload: { itemId: "insight_of_ice", qty: 1 } },
            { type: "GRANT_MILESTONE", payload: { id: "nikoli_told" } },
            { type: "ADVANCE_STAGE", payload: { stageId: "beast" } }
        ] }] }]),
    dunno: stage("\"No? Few do, these days. If you hear the name, come and find me. I will be here, by the fire, until I have a reason to leave.\"",
        next("beast")),

    // ---- the war beast, mentioned in passing ----
    beast: stage("He prods the fire. \"Mind the high passes on your way. Those cats were not hungry for nothing. Something bigger has been eating their game. A Panzerkamfer, if I am any judge of tracks.\"",
        [{ text: "[Panzerkamfer] \"A Panzerkamfer?\"", conditions: [{ type: "quest_not_started", id: BEAST_QUEST }], outcomes: toStage("beast_2") }, { text: "Leave him to the fire.", outcomes: end() }]),
    beast_2: stage("\"A war beast of my people. A snow tiger raised on iron and bound in plate, bred to break shield walls. When our army broke, the beasts went wild, and wilder every winter.\"",
        next("beast_3")),
    beast_3: stage("\"One hunts these peaks now. Follow its tracks through the snow and kill it, and come back to me. I will make it worth your while.\"",
        [
            { text: "\"I'll hunt it.\"", conditions: [{ type: "quest_not_started", id: BEAST_QUEST }], outcomes: end([{ type: "START_QUEST", payload: { questId: BEAST_QUEST } }]) },
            { text: "\"Not today.\"", outcomes: end() }
        ]),
    beast_waiting: stage("Nikoli looks up from the fire. \"The beast still lives. I can smell it on the wind. Follow the tracks through the high snow.\"",
        [tellHim, { text: "Leave him to the fire.", outcomes: end() }], { ambience: "fireCrackle" }),
    beast_done: stage("Nikoli takes one look at you and laughs, the first real laugh you have heard from him. \"You smell of iron and blood. The beast is dead, then. Good. Take this, as I promised.\"",
        [{ text: "Take it.", outcomes: end([{ type: "COMPLETE_QUEST", payload: { questId: BEAST_QUEST } }]) }]),

    // ---- later visits by the fire ----
    again: stage("Nikoli sits by the campfire with the greatsword across his knees. \"Back again. The fire is free, the company is poor. Any word of Commander Mentoras?\"",
        [tellHim, askBeast, { text: "\"Not yet.\"", outcomes: end() }], { ambience: "fireCrackle" }),
    told_again: stage("Nikoli is packing a worn saddlebag by the fire. \"I leave when the snow lets me. A workshop, you said. I will find it.\"",
        [askBeast, { text: "Leave him to his packing.", outcomes: end() }], { ambience: "fireCrackle" }),

    // ---- act 2: the Stranger's old workshop, a step too late ----
    workshop: stage("Nikoli stands at the cold forge where the hooded man used to wait, turning a length of broken chain over in his hands. \"He was here. The ashes were still warm when I came.\"",
        next("workshop_2"), { ambience: "none" }),
    workshop_2: stage("\"He left in a hurry, and he left this.\" He holds up the chain. \"South, I think. Toward the sand. Always one step ahead of me, that one. He always was.\"",
        [askBeast, { text: "Leave him to his hunt.", outcomes: end() }])
};

export const nikoli = {
    id: "nikoli",
    title: TITLE,
    imageSheet: "warlordHeroPortrait",
    personal: true,
    tone: "cold",
    ambience: "fireCrackle",
    initialStage: opening,
    stages: STAGES
};

/* Played when the fight beside him is won (START_BATTLE afterVictory): the same conversation, from after the fight. */
export const nikoliAfterBattle = {
    ...nikoli,
    id: "nikoli_after_battle",
    initialStage: "after"
};
