/* Nikoli (object NIKOLI_NPC): a general of the Panzerians, the good one of two brothers (Jaeger Ironson, "The Pursuer", the corrupted one, comes later: docs/story.md). Both are hunting for
   Commander Mentoras, who is the Hooded Stranger: nobody knows that, and nothing here may say it outright. Nikoli and Mentoras are old friends,
   though they did not always agree (docs/story.md); they have not met again yet, and the Stranger does not know he is being looked for.

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
     beast .. beast_3            either way he then mentions, in passing, why the cats are so hungry: a Panzerkamfer, one of the many war
                                 beasts Panzeria sent into the war, gone wild, hunts the peaks. Asking about it starts the quest panzerian_war_beast (kill one, then come
                                 back to him); it can also be asked about on any later visit, until it is taken.
     beast_done                  the beast is dead: he hears it, and the quest pays a second Insight of Ice (questDefinitions.js).
     beast_waiting               the quest taken, the beast still alive.
     again                       a later visit by the fire while he has not been told: he asks again.
     told_again                  told, still act 1: he is getting ready to leave.
     workshop .. workshop_3      act 2, told: he stands where the Stranger used to, and has just missed him.

   How he talks (docs/story.md, Nikolai Ironson): witty, a boyish gap-toothed grin, speaks of himself in the third person in broken Alterian
   (no articles, a northern cadence, "da", "my friend"), yet now and then a word from his two universities slips out.

   Personal: in a party of players this is each player's own (their milestones), never shared or voted on. The fight it starts may still pull
   in the players nearby; Nikoli then fights beside all of them.
   Art: the Panzerian warlord's portrait for now (entity NIKOLI); his brother Jaeger looks the same (story/encounters/story/jaeger.js). */
import { gameState } from '../../../core/gameState.js';
import { QuestModel } from '../../questModel.js';
import { movedNorth, heroesOutcome } from '../../heroes.js';

const TITLE = "Nikoli";
const IMG = { col: 0, row: 0 };
const LEOPARDS_IMG = { sheet: "snowLeopardPortrait", col: 0, row: 0 };
const BEAST_QUEST = "panzerian_war_beast";
// the snowy mountains' battle music, from the moment the scene opens (he only ever meets you there) and on into the fight, unbroken
const BATTLE_BGM = "snowyMountainsBattleBgm";
const STRANGER_IMG = { sheet: "encounter_hooded_stranger", col: 0, row: 0 };
const CODEY_IMG = { sheet: "nightbladeHeroPortrait", col: 0, row: 0 };

const toStage = (stageId) => [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId } }] }];
const end = (results = []) => [{ weight: 100, results: [...results, { type: "END_ENCOUNTER", payload: null }] }];
const stage = (text, decisions, extra = {}) => ({ displayText: TITLE, image: IMG, text, decisions, ...extra });
const next = (stageId) => [{ text: "Continue.", outcomes: toStage(stageId) }];

const milestones = () => (Array.isArray(gameState.milestones) ? gameState.milestones : []);
const has = (id) => milestones().includes(id);

/** The stage he opens with, from this player's milestones and quests. */
function opening() {
    // act 3, told: he has found Mentoras, in the snowy house (story/heroes.js): the reunion, or his brother's arrival, then the old friends
    if (movedNorth() && has('nikoli_told')) {
        if (heroesOutcome() === 'brothers' && !has('brothers_done')) return 'brothers';
        if (heroesOutcome() === 'friends' && !has('friends_met')) return 'reunion';
        return 'friends_after';
    }
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
    meet: stage("A broad man in dark Panzerian armour stands with his back to the campfire, a greatsword in his hands. Beyond the light, pale shapes slink through the snow: snow leopards, starved thin, their eyes on the fire.",
        next("meet_2"), { image: LEOPARDS_IMG, bgm: BATTLE_BGM }),
    meet_2: stage("\"Three cats, one Nikoli. Is bad arithmetic, even for general.\" He grins over his shoulder, and you count more gaps than teeth. \"You have weapon, da? Then stand with Nikoli.\"",
        [{
            text: "Draw your weapon.",
            outcomes: [{ weight: 100, results: [
                { type: "GRANT_MILESTONE", payload: { id: "nikoli_met" } },
                { type: "START_BATTLE", payload: {
                    enemies: ["SNOW_LEOPARD", "SNOW_LEOPARD", "SNOW_LEOPARD"],
                    allies: [{ id: "NIKOLI" }],
                    bgm: BATTLE_BGM,
                    noEscape: true,
                    afterVictory: { encounterId: "nikoli_after_battle" }
                } }
            ] }]
        }, {
            // walking away: he holds the fire alone, and the meeting waits for another night (no milestone, so the next visit starts here again)
            text: "Walk away.",
            outcomes: toStage("walk_away")
        }], { bgm: BATTLE_BGM }),
    walk_away: stage("You back away from the light. Behind you a deep voice curses in Panzerian, and the cats scream, and then the night is quiet again.",
        [{ text: "Keep walking.", outcomes: end() }], { bgm: "none" }),

    // ---- after the fight: thanks, who he is, and who he is looking for ----
    // (in a party of players everyone who fought beside him plays this on their own screen: they have met him now too)
    after: stage("The last of the cats lies still in the snow. The big man wipes his greatsword clean on a frozen sleeve and grins his gap-toothed grin at you. \"Thank you, stranger. Without you, Nikoli is supper for cats.\"",
        [{ text: "Continue.", outcomes: [{ weight: 100, results: [{ type: "GRANT_MILESTONE", payload: { id: "nikoli_met" } }, { type: "ADVANCE_STAGE", payload: { stageId: "after_2" } }] }] }]),
    after_2: stage("\"Nikoli was general of Panzeria, when Panzeria still had armies worth the name. Now Nikoli walks long way for one man: Commander Mentoras, of Altus royal guard.\"",
        next("ask")),
    ask: stage("\"Old friend of Nikoli. Friends, not always agreeing. He knows thing Nikoli must know. You have seen him? Tired eyes, sharp tongue, melancholic disposition, as professors in Altus would say.\"",
        [tellHim, { text: "\"I don't know anyone by that name.\"", outcomes: toStage("dunno") }]),
    told: stage("Nikoli is quiet for a long moment. \"A hood. Da. This is like him.\" He laughs once, without much in it.",
        next("told_2")),
    told_2: stage("\"You do Nikoli great kindness, stranger. Take. Ice remembers what rest of us forget.\"",
        [{ text: "Take it.", outcomes: [{ weight: 100, results: [
            { type: "GIVE_ITEM", payload: { itemId: "insight_of_ice", qty: 1 } },
            { type: "GRANT_MILESTONE", payload: { id: "nikoli_told" } },
            { type: "ADVANCE_STAGE", payload: { stageId: "beast" } }
        ] }] }]),
    dunno: stage("\"No? Few do, these days. If you hear name, come find Nikoli. Nikoli waits here, by fire, until he has reason to leave.\"",
        next("beast")),

    // ---- the war beast, mentioned in passing ----
    beast: stage("He prods the fire. \"Careful in high passes, my friend. Cats are not hungry for nothing. Something bigger eats their game. Panzerkamfer, if Nikoli knows tracks. And Nikoli knows tracks.\"",
        [{ text: "[Panzerkamfer] \"A Panzerkamfer?\"", conditions: [{ type: "quest_not_started", id: BEAST_QUEST }], outcomes: toStage("beast_2") }, { text: "Leave him to the fire.", outcomes: end() }]),
    beast_2: stage("\"War beast of my people. In war, Panzeria sent many into battle: snow tigers raised on iron, bound in plate, bred to break shield walls. When our army broke, they went wild. This is one of them.\"",
        next("beast_3")),
    beast_3: stage("\"It hunts these peaks now, wilder every winter. Follow tracks through snow, kill it, come back to Nikoli. Nikoli makes it worth your while. Is promise.\"",
        [
            { text: "\"I'll hunt it.\"", conditions: [{ type: "quest_not_started", id: BEAST_QUEST }], outcomes: end([{ type: "START_QUEST", payload: { questId: BEAST_QUEST } }]) },
            { text: "\"Not today.\"", outcomes: end() }
        ]),
    beast_waiting: stage("Nikoli looks up from the fire. \"Beast still lives. Nikoli smells it on wind. Follow tracks through high snow, my friend.\"",
        [tellHim, { text: "Leave him to the fire.", outcomes: end() }], { ambience: "fireCrackle" }),
    beast_done: stage("Nikoli takes one look at you and laughs, a big gap-toothed laugh, the first real one you have heard from him. \"You smell of iron and blood. Beast is dead, then. Good! Take, as Nikoli promised.\"",
        [{ text: "Take it.", outcomes: end([{ type: "COMPLETE_QUEST", payload: { questId: BEAST_QUEST } }]) }]),

    // ---- later visits by the fire ----
    again: stage("Nikoli sits by the campfire with the greatsword across his knees. \"Back again! Fire is free, company is poor. Any word of Commander Mentoras?\"",
        [tellHim, askBeast, { text: "\"Not yet.\"", outcomes: end() }], { ambience: "fireCrackle" }),
    told_again: stage("Nikoli is packing a worn saddlebag by the fire. \"Nikoli leaves when snow lets him. Workshop, you said. Nikoli will find it.\"",
        [askBeast, { text: "Leave him to his packing.", outcomes: end() }], { ambience: "fireCrackle" }),

    // ---- act 2: the Stranger's old workshop, a step too late ----
    workshop: stage("Nikoli stands at the cold forge where the hooded man used to wait, turning a length of broken chain over in his hands. \"He was here. Ashes still warm when Nikoli came.\"",
        next("workshop_2"), { ambience: "none" }),
    workshop_2: stage("\"He leaves in hurry, and he leaves this.\" He holds up the chain. \"Toward sand, Nikoli thinks. Always one step ahead of Nikoli, that one. Always he was.\"",
        [askBeast, { text: "Leave him to his hunt.", outcomes: end() }]),

    // ==== act 3, the snowy house (story/heroes.js). A stage id ending _m1 / _m2 is Mentoras speaking, _j1 / _j2 Jaeger (voiceLines.js SPEAKERS) ====
    // ---- "Old Friends": only Nikoli was told ----
    reunion: stage("There is a third man in the workshop tonight. A broad Panzerian sits on an upturned crate by the forge, a greatsword across his knees, and he is talking. By the look of things, he has been talking for some time.",
        next("reunion_2"), { ambience: "fireCrackle" }),
    reunion_2: stage("\"...and Nikoli says to colonel, is not bad arithmetic, is Panzerian arithmetic. Ah! Is you!\"", next("reunion_3")),
    reunion_3: stage("He grins his gap-toothed grin. Across the forge, the hooded man has his hood down. For the first time, you see him almost smile.", next("reunion_4")),
    reunion_4: stage("\"You find him for Nikoli. Tired eyes, sharp tongue, da? Exactly as Nikoli said.\"", next("reunion_m1")),
    reunion_m1: stage("\"He has not stopped talking since he arrived. I had forgotten. ...I had not forgotten. I had hoped.\"", next("reunion_5"), { displayText: "The Hooded Stranger", image: STRANGER_IMG }),
    reunion_5: stage("\"Nikoli and Commander walk together now. Old friends, old arguments. Nikoli is right about all of them.\"", next("reunion_m2")),
    reunion_m2: stage("\"He is not.\"", next("reunion_6"), { displayText: "The Hooded Stranger", image: STRANGER_IMG }),
    reunion_6: stage("In the corner, Codey watches them both, and signs something you cannot follow. Whatever it was, it makes the old man look away.", next("reunion_7"), { image: CODEY_IMG }),
    reunion_7: stage("\"Take. For finding him. Ice remembers what rest of us forget.\"", [{ text: "Take it.", outcomes: end([
        { type: "GIVE_ITEM", payload: { itemId: "insight_of_ice", qty: 1 } },
        { type: "GRANT_MILESTONE", payload: { id: "friends_met" } }
    ]) }]),
    friends_after: stage("Nikoli is at the forge, mid-argument with the hooded man. \"Nikoli and Commander argue about everything. Is wonderful.\"",
        [{ text: "Leave them to it.", outcomes: end() }], { ambience: "fireCrackle" }),

    // ---- "Brothers": both were told. Jaeger followed Nikoli here ----
    brothers: stage("There is a third man in the workshop tonight: a broad Panzerian with a gap-toothed grin, a greatsword across his knees. He is mid-story, and the hooded man is almost smiling.",
        next("brothers_2"), { ambience: "fireCrackle" }),
    brothers_2: stage("\"Ah! Is you! You find him for Nikoli. Tired eyes, sharp tongue, exactly as Nikoli...\"", next("brothers_door")),
    brothers_door: stage("The door opens behind you. The torches gutter. Frost creeps in across the floor.", next("brothers_door_2"), { effect: "shake", sfx: "whispers", sfxVolume: 0.5, ambience: "none", bgm: "none" }),
    brothers_door_2: stage("A second broad man in dark Panzerian armour stands in the doorway. The same face. The same greatsword. A straight, white, even smile.", next("brothers_3")),
    brothers_3: stage("\"...Jaeger.\"", next("brothers_j1")),
    brothers_j1: stage("\"Brother. You always did leave a trail a child could follow.\"", next("brothers_4"), { displayText: "Jaeger" }),
    brothers_4: stage("\"Nikoli led you here.\"", next("brothers_m1")),
    brothers_m1: stage("\"Not your fault. It never is, with him.\"", next("brothers_j2"), { displayText: "The Hooded Stranger", image: STRANGER_IMG }),
    brothers_j2: stage("\"Commander. You look tired.\"", [{
        text: "Draw your weapon.",
        outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: {
            enemies: ["JAEGER_BOSS"], allies: [{ id: "NIKOLI" }], bgm: "apexPredatorBgm", noEscape: true,
            afterVictory: { encounterId: "brothers_won" }
        } }] }]
    }], { displayText: "Jaeger", bgm: "apexPredatorBgm" }),
    // after the fight (brothers_won): Jaeger beaten, gone into the night; the old friends
    won: stage("Jaeger falls back against the door frame, frost bleeding from his wounds. For a moment the brothers only look at each other.", next("won_j1"), { bgm: "none" }),
    won_j1: stage("\"This is not finished, brother.\"", next("won_2"), { displayText: "Jaeger" }),
    won_2: stage("Then he is through the door and gone into the night.", next("won_3")),
    won_3: stage("\"No. Is not.\"", next("won_4")),
    won_4: stage("Nikoli sits down heavily by the forge. After a while, the hooded man sits beside him.", next("won_m1")),
    won_m1: stage("\"We leave at first light. Both of us.\"", next("won_5"), { displayText: "The Hooded Stranger", image: STRANGER_IMG }),
    won_5: stage("\"Old friends, old arguments. Nikoli is right about all of them.\"", next("won_m2")),
    won_m2: stage("\"He is not.\"", next("won_6"), { displayText: "The Hooded Stranger", image: STRANGER_IMG }),
    won_6: stage("\"Take. For finding him.\"", [{ text: "Take it.", outcomes: end([
        { type: "GIVE_ITEM", payload: { itemId: "insight_of_ice", qty: 1 } },
        { type: "GRANT_MILESTONE", payload: { id: "brothers_done" } }
    ]) }])
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

/* Played when the fight against his brother is won (act 3, "Brothers"): the same conversation, from after that fight. */
export const nikoliBrothersWon = {
    ...nikoli,
    id: "brothers_won",
    initialStage: "won"
};

/* Played when the fight beside him is won (START_BATTLE afterVictory): the same conversation, from after the fight. */
export const nikoliAfterBattle = {
    ...nikoli,
    id: "nikoli_after_battle",
    initialStage: "after"
};
