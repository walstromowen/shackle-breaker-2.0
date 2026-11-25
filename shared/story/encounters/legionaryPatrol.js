/* A Legionary on Patrol (LEGIONARY_PATROL in mapObjectDefinitions.js): a legionary of the old garrison, gone shackled in his rusted plate and still
   walking his round. One keeps the streets of every village (villagePlanner.js _planLegionaryPatrol) and a few walk the lanes of every castle
   (castleLayout.js). He sees 10 tiles ahead of him, in a half circle the way he faces (`sight`), like the madmen and the Arc Knights.

     unseen      walked up to from behind (he has not seen you): his back, as the madman's Disturbing Sight. Assassinate him [DEX], distract him
                 [INT], steal from him [DEX], switch who goes first, or walk away. A failed roll and he turns on you.
     slain       a quiet kill: search the body.
     distracted  he goes off after the noise, and is gone.
     robbed      the purse is yours; he goes off searching the wrong streets, and is gone.
     caught / turned   the fight.
   legionary_spots_you: seen first, there is only the fight.

   Like every patrol, one that is killed or sent off comes back when a new act begins (world/patrols.js). The narrator only (voiceLines.js). */
const TITLE = "A Legionary on Patrol";
/* encounter_legionary_patrol.png, 4 x 2 cells of 128 (made from the Legionary's battle portrait, turned and posed):
     (0,0) his back, walking his round   (1,0) his front, turned on you      (2,0) dead, face down, a dagger in his back   (3,0) walking off after a noise
     (0,1) lunging, a gauntlet out       (1,1) from behind, at his cut purse (2,1) a salute with his sword (seen)                                          */
const BACK = { col: 0, row: 0 };
const FRONT = { col: 1, row: 0 };
const SLAIN = { col: 2, row: 0 };
const WALKS_OFF = { col: 3, row: 0 };
const GRABS = { col: 0, row: 1 };
const ROBBED = { col: 1, row: 1 };
const SALUTE = { col: 2, row: 1 };
const HUMANOID = { type: "has_tag", tag: "HUMANOID" };
const toStage = (stageId) => [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId } }] }];
const end = (results = []) => [{ weight: 100, results: [...results, { type: "END_ENCOUNTER", payload: null }] }];
const fight = () => [{ weight: 100, results: [
    { type: "DESTROY_OBJECT" },
    { type: "START_BATTLE", payload: { enemies: [{ id: "LEGIONARY" }], bgm: "plainsBattleBgm" } }
] }];
const stage = (text, decisions, extra = {}) => ({ displayText: TITLE, image: BACK, text, decisions, ...extra });

export const legionaryPatrol = {
    id: "legionary_patrol",
    title: TITLE,
    imageSheet: "encounter_legionary_patrol",
    initialStage: "unseen",
    stages: {
        unseen: stage("A legionary walks his round ahead of you, his back turned. Rust weeps from every joint of his plate, and the sword in his hand drags a thin line through the dirt. He mutters orders to men long dead. He has not heard you.",
            [
                {
                    text: "[DEX] Assassinate him: a blade through the gap beneath his helm.",
                    corruption: 2,   // a cruel act
                    type: "skill_check",
                    attribute: "dexterity",
                    threshold: 13,
                    conditions: [HUMANOID],
                    successOutcomes: toStage("slain"),
                    failureOutcomes: toStage("turned")
                },
                {
                    text: "[INT] Distract him: toss a stone into the shadows.",
                    type: "skill_check",
                    attribute: "intelligence",
                    threshold: 12,
                    conditions: [HUMANOID],
                    successOutcomes: toStage("distracted"),
                    failureOutcomes: toStage("turned")
                },
                {
                    text: "[DEX] Steal from him: lift the purse at his belt.",
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
        slain: stage("Steel finds the gap beneath his helm. He sags against you without a sound, heavy as a sack of iron, and is still. Whatever orders he was muttering, he has given his last.",
            [{
                text: "Search the body.",
                outcomes: end([
                    { type: "RECORD_KILL", payload: { enemyId: "LEGIONARY", amount: 1 } },
                    { type: "MODIFY_CURRENCY", payload: { amount: 12 } },
                    { type: "ROLL_LOOT_TABLE", payload: { lootTableId: "mad_man_drops", rolls: 1 } },
                    { type: "DESTROY_OBJECT" }
                ])
            }], { image: SLAIN, tone: "blood", effect: "blood", sfx: "quickStabSfx" }),
        distracted: stage("The stone clatters off into the dark. His helm turns toward the sound. He listens, then stamps off after it, sword raised, barking at nothing. He does not come back.",
            [{ text: "Go on your way.", outcomes: end([{ type: "DESTROY_OBJECT" }]) }], { image: WALKS_OFF }),
        robbed: stage("Your fingers find the purse and slip it free. He never breaks stride. By the time he pats his belt you are long gone, and somewhere behind you he goes off searching the wrong streets.",
            [{
                text: "Count your take.",
                outcomes: end([
                    { type: "MODIFY_CURRENCY", payload: { amount: 25 } },
                    { type: "ROLL_LOOT_TABLE", payload: { lootTableId: "mad_man_drops", rolls: 1 } },
                    { type: "DESTROY_OBJECT" }
                ])
            }], { image: ROBBED }),
        caught: stage("His gauntlet closes on your wrist like a trap. The helm turns, slowly, and the dark slit of it settles on you.",
            [{ text: "Tear free and fight.", outcomes: fight() }], { image: GRABS, tone: "blood", effect: "jolt", bgm: "plainsBattleBgm" }),
        turned: stage("A stone shifts under your foot. He turns, faster than rust should allow, and his sword comes up.",
            [{ text: "Fight.", outcomes: fight() }], { image: FRONT, tone: "blood", effect: "jolt", bgm: "plainsBattleBgm" })
    }
};

/* A legionary who sees you coming (LEGIONARY_PATROL from the front or the sides, in his 10 tiles of sight): nothing left but the fight. */
export const legionarySpotsYou = {
    id: "legionary_spots_you",
    title: TITLE,
    imageSheet: "encounter_legionary_patrol",
    initialStage: "spotted",
    stages: {
        spotted: {
            displayText: "Seen",
            image: SALUTE,
            bgm: "plainsBattleBgm",
            text: "The legionary halts mid-stride. His helm turns, and the dark slit of it settles on you. He lifts his sword in salute to no one, and comes for you.",
            decisions: [{ text: "Draw your weapon.", outcomes: fight() }]
        }
    }
};
