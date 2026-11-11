/* The Ruined Carriage (map object RUINED_CARRIAGE, 2 x 2 tiles, on the plains: biomeDefinitions.js PLAINS, its own band).

   A merchant's carriage broken in the grass, one wheel snapped flat, its strongbox spilled. Its horses went mad and broke their traces: they are shackled
   steeds now, and they graze close by. Whoever searches it may come away rich, or bring the herd down on the party.

     discovery        Search it [DEX 12], pry open the strongbox [STR 14], study the hoofprints [INT 10], or leave.
     search           success: a heavy purse (found_gold) or a merchant's crates (found_valuables). Failure: the noise draws the shackled steeds (steeds,
                      a fight against 2 to 4 of them), or a rotten board splinters into your hands (splinters).
     strongbox        success: the biggest haul, coin and a merchant's goods (strongbox_open). Failure: the iron bands ring out, and the herd comes (steeds).
     hoofprints       success: you know what made them, and can search quietly [DEX 12]: a failed quiet search finds nothing, but you slip away unseen.
                      Failure: the prints mean nothing (tracks_lost).
   The haul is large on purpose: 250 to 450 coin in the purse; 350 coin, a Mender's Draught (cures a bad trait) and more in the strongbox; or two or
   three rolls of ruined_carriage_valuables (lootTableDefinitions.js), where the draught can turn up too. Once looted the carriage stays where it is, empty (REPLACE_OBJECT: RUINED_CARRIAGE_LOOTED). A fight leaves it as it was, so
   the survivors can search again.
   Art: assets/icons/encounters/ruined_carriage.png registered as `encounter_ruined_carriage` (one 128 px picture). */

const TITLE = "Ruined Carriage";
const IMG = { col: 0, row: 0 };
const STEEDS_IMG = { sheet: "shackledSteedPortrait", col: 0, row: 0 };

const toStage = (stageId) => [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId } }] }];
const stage = (text, decisions, extra = {}) => ({ displayText: TITLE, image: IMG, text, decisions, ...extra });
const LOOTED = { type: "REPLACE_OBJECT", payload: { objectId: "RUINED_CARRIAGE_LOOTED" } };
const END = { type: "END_ENCOUNTER", payload: null };

/* the herd comes: two, three or four shackled steeds (three most often) */
const herd = (n) => ({ type: "START_BATTLE", payload: { enemies: Array(n).fill("SHACKLED_STEED"), bgm: "plainsBattleBgm" } });
const fightTheHerd = [{
    text: "Draw your weapons!",
    outcomes: [
        { weight: 1, results: [herd(2)] },
        { weight: 2, results: [herd(3)] },
        { weight: 1, results: [herd(4)] }
    ]
}];

/* what a successful search turns up: the purse or the crates */
const searchFinds = [
    { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "found_gold" } }] },
    { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "found_valuables" } }] }
];

export const ruinedCarriage = {
    id: "ruined_carriage",
    title: TITLE,
    imageSheet: "encounter_ruined_carriage",
    initialStage: "discovery",
    ambience: "battlefieldWind",
    stages: {
        discovery: stage("A carriage lies broken in the tall grass, one wheel snapped from its axle and the other split through. Its door hangs from one hinge. The horses are gone, but the harness ends in links of black iron, and fresh hoofprints circle the wreck.", [
            {
                text: "[DEX] Search the carriage.",
                type: "skill_check", attribute: "dexterity", threshold: 12,
                conditions: [{ type: "context_flag_not_set", flagId: "knows_steeds" }],
                successOutcomes: searchFinds,
                failureOutcomes: [
                    { weight: 3, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "steeds" } }] },
                    { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "splinters" } }] }
                ]
            },
            {
                // once the hoofprints have been read: search with one eye on the grass, and slip away if it goes wrong
                text: "[DEX] Search the carriage quietly, one eye on the grass.",
                type: "skill_check", attribute: "dexterity", threshold: 12,
                conditions: [{ type: "context_flag_set", flagId: "knows_steeds" }],
                successOutcomes: searchFinds,
                failureOutcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "slip_away" } }] }]
            },
            {
                text: "[STR] Pry open the strongbox.",
                type: "skill_check", attribute: "strength", threshold: 14,
                successOutcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "strongbox_open" } }] }],
                failureOutcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "strongbox_noise" } }] }]
            },
            {
                text: "[INT] Study the hoofprints.",
                type: "skill_check", attribute: "intelligence", threshold: 10,
                conditions: [{ type: "context_flag_not_set", flagId: "read_tracks" }],
                successOutcomes: [{ weight: 1, results: [
                    { type: "SET_CONTEXT_FLAG", payload: { flagId: "read_tracks" } },
                    { type: "SET_CONTEXT_FLAG", payload: { flagId: "knows_steeds" } },
                    { type: "ADVANCE_STAGE", payload: { stageId: "tracks_read" } }
                ] }],
                failureOutcomes: [{ weight: 1, results: [
                    { type: "SET_CONTEXT_FLAG", payload: { flagId: "read_tracks" } },
                    { type: "ADVANCE_STAGE", payload: { stageId: "tracks_lost" } }
                ] }]
            },
            { text: "Leave it be.", outcomes: [{ weight: 100, results: [END] }] }
        ]),

        // ---- the hoofprints ----
        tracks_read: stage("The prints are deep and unshod, and between them run the drag-marks of chains. Shackled steeds: whatever took the people took the horses too. They graze close by, and they will come back to the wreck. Work quietly.",
            [{ text: "Back to the carriage.", outcomes: toStage("discovery") }]),
        tracks_lost: stage("The prints cross and recross until they mean nothing at all. Whatever made them could be anywhere.",
            [{ text: "Back to the carriage.", outcomes: toStage("discovery") }]),

        // ---- what a search turns up ----
        found_gold: stage("Under the seat, behind a loose board, sits a heavy purse sewn shut against thieves. Somebody's whole fortune, by the weight of it.", [{
            text: "Take it.",
            outcomes: [
                { weight: 3, results: [{ type: "MODIFY_CURRENCY", payload: { amount: 250 } }, LOOTED, END] },
                { weight: 1, results: [{ type: "MODIFY_CURRENCY", payload: { amount: 450 } }, LOOTED, END] }
            ]
        }]),
        found_valuables: stage("Crates lashed to the roof held a merchant's best, wrapped in oilcloth and untouched by the rain.", [{
            text: "Take what you can carry.",
            outcomes: [{ weight: 1, results: [{ type: "ROLL_LOOT_TABLE", payload: { lootTableId: "ruined_carriage_valuables", minRolls: 2, maxRolls: 3 } }, LOOTED, END] }]
        }]),
        strongbox_open: stage("The lock gives with a crack. The strongbox is full: coin to the brim, a physician's sealed draught glowing amber in its straw, and a merchant's papers wrapped around something heavier.", [{
            text: "Empty it.",
            outcomes: [{ weight: 1, results: [
                { type: "MODIFY_CURRENCY", payload: { amount: 350 } },
                { type: "GIVE_ITEM", payload: { itemId: "menders_draught", qty: 1 } },   // cures a bad trait
                { type: "ROLL_LOOT_TABLE", payload: { lootTableId: "ruined_carriage_valuables", rolls: 1 } },
                LOOTED, END
            ] }]
        }]),
        slip_away: stage("You find nothing worth the risk, and something heavy is moving out in the grass. You back away from the wreck before it finds you.",
            [{ text: "Leave quietly.", outcomes: [{ weight: 100, results: [END] }] }]),

        // ---- what goes wrong ----
        splinters: stage("A rotten board gives way under your hand, and splinters drive deep into your palm. Whatever was in there, the rain has had it.", [{
            text: "Leave it be.",
            outcomes: [{ weight: 1, results: [{ type: "MODIFY_VITALS", payload: { hp: -15, isPercentageOfMax: true, damageType: "pierce" } }, END] }]
        }]),
        steeds: stage("A board splits with a crack like a whip. Out in the grass something answers: a scream that is not quite a horse's. Black iron rattles as the shackled steeds come back for their carriage.",
            fightTheHerd, { image: STEEDS_IMG, bgm: "plainsBattleBgm" }),
        strongbox_noise: stage("The lid holds, but the iron bands ring out across the plain like a bell. Out in the grass, heads come up. Chains rattle, and the shackled steeds come running.",
            fightTheHerd, { image: STEEDS_IMG, bgm: "plainsBattleBgm" })
    }
};
