/* A Trapper on the Prowl (FROZEN_TRAPPER_PATROL in mapObjectDefinitions.js): one of the frozen trappers of the snowy mountains, gone shackled in the
   cold, still walking his trapline with his spear. A few walk the open snow (biomeDefinitions.js, the snowy mountains' rules). He sees 5 tiles ahead,
   in a half circle the way he faces (`sight`), like the legionaries, the madmen and the Arc Knights.

     unseen      walked up to from behind (he has not seen you): his back. Assassinate him [DEX], distract him [INT], steal from him [DEX], switch who
                 goes first, or walk away. A failed roll and he turns on you.
     slain       a quiet kill: search the body.
     distracted  he goes off after the noise, into the snow, and is gone.
     robbed      his pouch is yours; he goes on along his line, and is gone.
     caught / turned   the fight.
   frozen_trapper_spots_you: seen first, there is only the fight.

   Like every patrol, one that is killed or sent off comes back when a new act begins (world/patrols.js). The narrator only (voiceLines.js). */
const TITLE = "A Trapper on the Prowl";
/* encounter_frozen_trapper_patrol.png, 4 x 2 cells of 128 (the trapper, posed, like the legionary's sheet):
     (0,0) his back, walking his line   (1,0) turned on you, the spear levelled   (2,0) dead in the snow   (3,0) stalking off after a noise
     (0,1) lunging, a hand out           (1,1) from behind, his pouch cut          (2,1) the spear pointed at you (seen)                            */
const BACK = { col: 0, row: 0 };
const FRONT = { col: 1, row: 0 };
const SLAIN = { col: 2, row: 0 };
const WALKS_OFF = { col: 3, row: 0 };
const GRABS = { col: 0, row: 1 };
const ROBBED = { col: 1, row: 1 };
const SPOTTED = { col: 2, row: 1 };
const HUMANOID = { type: "has_tag", tag: "HUMANOID" };
const toStage = (stageId) => [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId } }] }];
const end = (results = []) => [{ weight: 100, results: [...results, { type: "END_ENCOUNTER", payload: null }] }];
const fight = () => [{ weight: 100, results: [
    { type: "DESTROY_OBJECT" },
    { type: "START_BATTLE", payload: { enemies: [{ id: "FROZEN_TRAPPER" }], bgm: "snowyMountainsBattleBgm" } }
] }];
const stage = (text, decisions, extra = {}) => ({ displayText: TITLE, image: BACK, text, decisions, ...extra });

export const frozenTrapperPatrol = {
    id: "frozen_trapper_patrol",
    title: TITLE,
    imageSheet: "encounter_frozen_trapper_patrol",
    initialStage: "unseen",
    stages: {
        unseen: stage("A trapper picks his way through the snow ahead of you, his back turned, his spear over his shoulder. Frost has grown on his rags like moss. He is counting under his breath: snares, or days, or nothing at all. He has not heard you.",
            [
                {
                    text: "[DEX] Assassinate him: a blade under the hood, before he turns.",
                    corruption: 2,   // a cruel act
                    type: "skill_check",
                    attribute: "dexterity",
                    threshold: 13,
                    conditions: [HUMANOID],
                    successOutcomes: toStage("slain"),
                    failureOutcomes: toStage("turned")
                },
                {
                    text: "[INT] Distract him: snap a branch off in the trees.",
                    type: "skill_check",
                    attribute: "intelligence",
                    threshold: 12,
                    conditions: [HUMANOID],
                    successOutcomes: toStage("distracted"),
                    failureOutcomes: toStage("turned")
                },
                {
                    text: "[DEX] Steal from him: cut the pouch from his belt.",
                    type: "skill_check",
                    attribute: "dexterity",
                    threshold: 14,
                    conditions: [HUMANOID],
                    successOutcomes: toStage("robbed"),
                    failureOutcomes: toStage("caught")
                },
                { text: "Switch party member.", type: "switch_character", conditions: [{ type: "has_other_party_members" }] },
                { text: "Walk away.", outcomes: end() }
            ], { bgm: "aDisturbingSightBgm" }),
        slain: stage("He folds into the snow without a sound. The counting stops. Snow is already settling on his back.",
            [{
                text: "Search the body.",
                outcomes: end([
                    { type: "RECORD_KILL", payload: { enemyId: "FROZEN_TRAPPER", amount: 1 } },
                    { type: "MODIFY_CURRENCY", payload: { amount: 10 } },
                    { type: "ROLL_LOOT_TABLE", payload: { lootTableId: "frozen_trapper_drops", rolls: 1 } },
                    { type: "DESTROY_OBJECT" }
                ])
            }], { image: SLAIN, tone: "blood", effect: "blood", sfx: "quickStabSfx" }),
        distracted: stage("The branch cracks in the trees behind you. His head snaps round to the sound. He sniffs the air like a dog, then goes off after it, spear first, and the snow swallows him.",
            [{ text: "Go on your way.", outcomes: end([{ type: "DESTROY_OBJECT" }]) }], { image: WALKS_OFF }),
        robbed: stage("One cut and the pouch is in your hand. He walks on along his line, still counting, and never looks back. By the time he misses it you are long gone.",
            [{
                text: "Count your take.",
                outcomes: end([
                    { type: "MODIFY_CURRENCY", payload: { amount: 20 } },
                    { type: "ROLL_LOOT_TABLE", payload: { lootTableId: "frozen_trapper_drops", rolls: 1 } },
                    { type: "DESTROY_OBJECT" }
                ])
            }], { image: ROBBED }),
        caught: stage("A hand like a frozen iron trap closes on your wrist. He turns, slowly, and the eyes in the hood are pale and empty.",
            [{ text: "Tear free and fight.", outcomes: fight() }], { image: GRABS, tone: "blood", effect: "jolt", bgm: "snowyMountainsBattleBgm" }),
        turned: stage("The snow crunches under your foot. He spins, quicker than the cold should let him, and the spear comes down level with your chest.",
            [{ text: "Fight.", outcomes: fight() }], { image: FRONT, tone: "blood", effect: "jolt", bgm: "snowyMountainsBattleBgm" })
    }
};

/* A trapper who sees you coming (FROZEN_TRAPPER_PATROL from the front or the sides, in his 5 tiles of sight): nothing left but the fight. */
export const frozenTrapperSpotsYou = {
    id: "frozen_trapper_spots_you",
    title: TITLE,
    imageSheet: "encounter_frozen_trapper_patrol",
    initialStage: "spotted",
    stages: {
        spotted: {
            displayText: "Seen",
            image: SPOTTED,
            bgm: "snowyMountainsBattleBgm",
            text: "The trapper stops dead. His hood turns your way, and the spear comes up, pointing at you. Fresh meat for the line.",
            decisions: [{ text: "Draw your weapon.", outcomes: fight() }]
        }
    }
};
