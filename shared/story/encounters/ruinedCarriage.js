/* The Ruined Carriage (map object RUINED_CARRIAGE, 2 x 3 tiles, on the plains: biomeDefinitions.js PLAINS, its own band).

   A covered wagon abandoned in the grass, its strongbox still aboard and its owner dead against the wheel. Its horses went mad and broke their
   traces: they are shackled steeds now, and they graze close by. The carriage stays on the map until it has been looted, so the party may come
   back to it again and again: every choice does something (no stage only tells the party something and sends it back), and nothing that went
   wrong takes a choice away (a failure ends the visit; the next visit offers every choice again).

     discovery        Search the wagon bed [DEX 12], pry open the strongbox [STR 14], search the dead man, hunt down the herd, or leave.
     search           success: a heavy purse (found_gold) or a merchant's crates (found_valuables). Failure: the noise brings the herd (steeds) or a
                      rotten board splinters into your hand (splinters).
     strongbox        success: the biggest haul, coin, a Shmindolyn's Draught and a merchant's goods (strongbox_open). Failure: the iron rings out,
                      and the herd comes (strongbox_noise).
     the dead man     (body) [DEX 11] work the ring off his hand: a Noble's Ring (ring_noble) or, on a cord at his throat, a Royal Guard's Signet
                      (ring_signet); failure snaps the finger, and the herd hears it (bone_snap). His journal starts the quest Cursed Populace
                      (journal; offered until that quest has been taken up). Or leave him in peace.
     the herd         hunt it down first (hunt), or fight it when the noise brings it: 2 to 4 shackled steeds. Win, and the wagon can be searched at
                      leisure (ruined_carriage_cleared: the purse or the crates, the strongbox, or the dead man's ring, no roll needed).
   Every haul empties the carriage for good (REPLACE_OBJECT: RUINED_CARRIAGE_LOOTED): the purse 250 to 450 coin; the strongbox 350 coin, a Shmindolyn's
   Draught (eases corruption) and more; or two or three rolls of ruined_carriage_valuables (lootTableDefinitions.js); or the ring. The journal does not:
   the quest is a bonus on top of whatever the party takes.
   Art: assets/icons/encounters/ruined_carriage.png registered as `encounter_ruined_carriage` (one 128 px picture). */
import { toStage, END } from './stageKit.js';

const TITLE = "Ruined Carriage";
const IMG = { col: 0, row: 0 };
const STEEDS_IMG = { sheet: "shackledSteedPortrait", col: 0, row: 0 };
const QUEST = "cursed_populace";

const stage = (text, decisions, extra = {}) => ({ displayText: TITLE, image: IMG, text, decisions, ...extra });
const LOOTED = { type: "REPLACE_OBJECT", payload: { objectId: "RUINED_CARRIAGE_LOOTED" } };

/* the herd: two, three or four shackled steeds (three most often). Beat it, and the wagon is the party's to search at leisure. */
const herd = (n) => ({ type: "START_BATTLE", payload: { enemies: Array(n).fill("SHACKLED_STEED"), bgm: "plainsBattleBgm", afterVictory: { encounterId: "ruined_carriage_cleared" } } });
const herdOutcomes = [
    { weight: 1, results: [herd(2)] },
    { weight: 2, results: [herd(3)] },
    { weight: 1, results: [herd(4)] }
];
const fightTheHerd = [{ text: "Draw your weapons!", outcomes: herdOutcomes }];

/* what a search turns up: the purse or the crates */
const searchFinds = [
    { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "found_gold" } }] },
    { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "found_valuables" } }] }
];
/* what is on the dead man: a noble's ring on his hand, or the signet of the Royal Guard of Altus on a cord at his throat */
const ringFinds = [
    { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "ring_noble" } }] },
    { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "ring_signet" } }] }
];
const journal = {
    text: "Take the journal from his coat.",
    conditions: [{ type: "quest_not_started", id: QUEST }],
    outcomes: toStage("journal")
};

const stages = {
    discovery: stage("A covered wagon stands abandoned in the tall grass, its canvas stained and its team long gone. The traces hang empty, ending in links of black iron. A man in a good coat sits against the front wheel with his head bowed, as if he stopped to rest and never got up. Fresh hoofprints circle the wagon.", [
        {
            text: "[DEX] Search the wagon bed.",
            type: "skill_check", attribute: "dexterity", threshold: 12,
            successOutcomes: searchFinds,
            failureOutcomes: [
                { weight: 3, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "steeds" } }] },
                { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "splinters" } }] }
            ]
        },
        {
            text: "[STR] Pry open the strongbox.",
            type: "skill_check", attribute: "strength", threshold: 14,
            successOutcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "strongbox_open" } }] }],
            failureOutcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "strongbox_noise" } }] }]
        },
        { text: "Search the dead man.", outcomes: toStage("body") },
        { text: "Hunt down the herd before you search.", outcomes: toStage("hunt") },
        { text: "Leave it be.", outcomes: [{ weight: 100, results: [END] }] }
    ]),

    // ---- the dead man ----
    body: stage("He has been dead for days; the cold has kept him. His boots are good and his hands are soft. A ring glints on one swollen finger, and inside his coat is a journal wrapped in oilcloth.", [
        {
            text: "[DEX] Work the ring off his hand.",
            type: "skill_check", attribute: "dexterity", threshold: 11,
            successOutcomes: ringFinds,
            failureOutcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "bone_snap" } }] }]
        },
        journal,
        { text: "Leave the dead in peace.", outcomes: [{ weight: 100, results: [END] }] }
    ]),
    ring_noble: stage("The ring comes free: gold, set with a blue stone, a crest worn almost smooth inside the band. No merchant, then. A noble, travelling as one, and in a hurry.", [{
        text: "Take it and go.",
        outcomes: [{ weight: 1, results: [{ type: "GIVE_ITEM", payload: { itemId: "nobles_ring", qty: 1 } }, LOOTED, END] }]
    }]),
    ring_signet: stage("The ring is cheap brass. What he hid is on a cord at his throat: a heavy iron signet stamped with the crest of the Royal Guard of Altus. A guard, escorting the wagon, or deserting with it.", [{
        text: "Take the signet and go.",
        outcomes: [{ weight: 1, results: [{ type: "GIVE_ITEM", payload: { itemId: "royal_guards_signet", qty: 1 } }, LOOTED, END] }]
    }]),
    bone_snap: stage("The finger will not give up the ring. You pull harder, and the bone snaps as loud as a branch. Out in the grass, chains rattle.",
        fightTheHerd, { image: STEEDS_IMG, bgm: "plainsBattleBgm" }),
    journal: stage("The last page is written in a shaking hand. \"We left the town at night. They laughed at nothing, never slept, and looked at us as though we were meat. They were not themselves. I am no longer sure they are still men. Somebody must find out what happened to them.\"", [
        {
            text: "Find out what happened to them.",
            outcomes: [{ weight: 100, results: [{ type: "START_QUEST", payload: { questId: QUEST } }, END] }]
        },
        { text: "Leave the journal with him.", outcomes: [{ weight: 100, results: [END] }] }
    ]),

    // ---- the herd ----
    hunt: stage("You follow the hoofprints out into the grass. They do not go far. The steeds stand in a ring with their heads down, iron dragging from their legs, and as one they lift their heads and look at you.",
        fightTheHerd, { image: STEEDS_IMG, bgm: "plainsBattleBgm" }),
    steeds: stage("A board splits with a crack like a whip. Out in the grass something answers: a scream that is not quite a horse's. Black iron rattles as the shackled steeds come back for their wagon.",
        fightTheHerd, { image: STEEDS_IMG, bgm: "plainsBattleBgm" }),
    strongbox_noise: stage("The lid holds, but the iron bands ring out across the plain like a bell. Out in the grass, heads come up. Chains rattle, and the shackled steeds come running.",
        fightTheHerd, { image: STEEDS_IMG, bgm: "plainsBattleBgm" }),

    // ---- after the herd: the wagon at leisure (ruined_carriage_cleared) ----
    cleared: stage("The last of the steeds goes down in a tangle of chain. The plain is quiet. Nothing is left to hear you, and the wagon is yours to pick over at your leisure.", [
        { text: "Search the wagon bed.", outcomes: searchFinds },
        {
            text: "Take your time over the strongbox.",
            outcomes: [{ weight: 1, results: [{ type: "ADVANCE_TIME", payload: { hours: 1 } }, { type: "ADVANCE_STAGE", payload: { stageId: "strongbox_open" } }] }]
        },
        { text: "Search the dead man.", outcomes: ringFinds },
        journal
    ]),

    // ---- what a search turns up ----
    found_gold: stage("Under the seat, behind a loose board, sits a heavy purse sewn shut against thieves. Somebody's whole fortune, by the weight of it.", [{
        text: "Take it.",
        outcomes: [
            { weight: 3, results: [{ type: "MODIFY_CURRENCY", payload: { amount: 250 } }, LOOTED, END] },
            { weight: 1, results: [{ type: "MODIFY_CURRENCY", payload: { amount: 450 } }, LOOTED, END] }
        ]
    }]),
    found_valuables: stage("Crates stacked under the canvas held a merchant's best, wrapped in oilcloth and untouched by the rain.", [{
        text: "Take what you can carry.",
        outcomes: [{ weight: 1, results: [{ type: "ROLL_LOOT_TABLE", payload: { lootTableId: "ruined_carriage_valuables", minRolls: 2, maxRolls: 3 } }, LOOTED, END] }]
    }]),
    strongbox_open: stage("The lock gives with a crack. The strongbox is full: coin to the brim, a sealed draught glowing amber in its straw, Shmindolyn's mark on the wax, and a merchant's papers wrapped around something heavier.", [{
        text: "Empty it.",
        outcomes: [{ weight: 1, results: [
            { type: "MODIFY_CURRENCY", payload: { amount: 350 } },
            { type: "GIVE_ITEM", payload: { itemId: "shmindolyns_draught", qty: 1 } },   // eases corruption
            { type: "ROLL_LOOT_TABLE", payload: { lootTableId: "ruined_carriage_valuables", rolls: 1 } },
            LOOTED, END
        ] }]
    }]),

    // ---- a hurt hand ----
    splinters: stage("A rotten board gives way under your hand, and splinters drive deep into your palm. Whatever was under it, the rain has had it.", [{
        text: "Pull your hand free and back away.",
        outcomes: [{ weight: 1, results: [{ type: "MODIFY_VITALS", payload: { hp: -15, isPercentageOfMax: true, damageType: "pierce" } }, END] }]
    }])
};

export const ruinedCarriage = {
    id: "ruined_carriage",
    title: TITLE,
    imageSheet: "encounter_ruined_carriage",
    initialStage: "discovery",
    ambience: "battlefieldWind",
    stages
};

/* Played when the herd is beaten (START_BATTLE afterVictory): the same carriage, searched with nobody left to hear. */
export const ruinedCarriageCleared = {
    ...ruinedCarriage,
    id: "ruined_carriage_cleared",
    initialStage: "cleared"
};
