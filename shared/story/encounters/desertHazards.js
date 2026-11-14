/* Two hazards of the open desert (biomeDefinitions.js DESERT: its encounter pool):

   quicksand   any time. The sand gives way: haul yourself out [STR 13], crawl flat for the edge [DEX 12], or lie still and let it hold you [INT 11]
               (which, done right, also turns up a buried traveller's pack). An escape rope is a sure way out, and is spent. Any failed attempt drags
               you deeper: you get out, but hurt and spent.
   cyclone     only in a sandstorm (the pool's `weather`). A cyclone with lightning in its heart, and something caught in its wall; the battle music
               starts with it. Reach into the wall [STR 14], dash through its eye [DEX 14], or read the storm [ATT 13]: done right, it gives up an
               Insight of Wind (the likeliest), of Earth, or of Lightning. Through the eye lies its heart: a great swarm of thunder locusts (six) guards
               what the storm carries, and beating it always gives one of those insights (cyclone_heart). Done wrong, it throws you, strikes you, or
               spits out a swarm of thunder locusts. Or shelter behind a dune and let it pass.

   Art: assets/icons/encounters/quicksand.png and cyclone.png (one 128 px picture each, placeholders: tools/art/desertHazards.py). */
const toStage = (stageId) => [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId } }] }];
const END = { type: "END_ENCOUNTER", payload: null };
const end = (text, results = []) => [{ text, outcomes: [{ weight: 100, results: [...results, END] }] }];
const IMG = { col: 0, row: 0 };

// ---------------------------------------------------------------- quicksand
const qs = (text, decisions, extra = {}) => ({ displayText: "Quicksand", image: IMG, text, decisions, ...extra });
export const quicksand = {
    id: "quicksand",
    title: "Quicksand",
    imageSheet: "encounter_quicksand",
    initialStage: "sinking",
    ambience: "battlefieldWind",
    tone: "cold",
    stages: {
        sinking: qs("The sand gives way beneath you without a sound. In a heartbeat you are in it to the knees, and every move drags you deeper.", [
            {
                text: "[STR] Haul yourself out.",
                type: "skill_check", attribute: "strength", threshold: 13,
                successOutcomes: toStage("hauled"),
                failureOutcomes: toStage("deeper")
            },
            {
                text: "[DEX] Spread your weight and crawl for the edge.",
                type: "skill_check", attribute: "dexterity", threshold: 12,
                successOutcomes: toStage("crawled"),
                failureOutcomes: toStage("deeper")
            },
            {
                text: "[INT] Lie still, and let the sand hold you up.",
                type: "skill_check", attribute: "intelligence", threshold: 11,
                successOutcomes: toStage("floated"),
                failureOutcomes: toStage("deeper")
            },
            {
                text: "[Escape Rope] Throw it around a rock and pull yourself free.",
                conditions: [{ type: "has_item", itemId: "escape_rope", qty: 1 }],
                outcomes: toStage("roped")
            }
        ], { effect: "shake" }),
        hauled: qs("You drag one leg free, then the other, and haul yourself out onto firm ground, gasping. Your legs shake for a long while afterwards.",
            end("Move on, carefully.", [{ type: "MODIFY_VITALS", payload: { stamina: -20, isPercentageOfMax: true } }])),
        crawled: qs("Flat on your belly, you inch toward firm ground a hand's width at a time. It takes forever. It works.",
            end("Move on, carefully.")),
        floated: qs("You stop fighting. Slowly the sand stops pulling, and you float in it like a stone in honey. Beneath the surface your hand finds a strap: someone else's pack. Someone who struggled.",
            end("Take the pack, and ease out.", [
                { type: "MODIFY_CURRENCY", payload: { amount: 60 } },
                { type: "ROLL_LOOT_TABLE", payload: { lootTableId: "desert", rolls: 1 } }
            ])),
        roped: qs("The rope bites around a jutting rock. Hand over hand, you pull yourself free. The sand keeps the rope.",
            end("Move on, carefully.", [{ type: "REMOVE_ITEM", payload: { itemId: "escape_rope", qty: 1 } }])),
        deeper: qs("You thrash, and the sand closes over your waist, then your chest. By the time you claw your way out onto firm ground you are bruised, spent, and coughing sand.",
            end("Move on.", [{ type: "MODIFY_VITALS", payload: { hp: -15, stamina: -30, isPercentageOfMax: true, damageType: "earth" } }]))
    }
};

// ---------------------------------------------------------------- the cyclone
const BGM = "desertBattleBgm";   // from its first sight, through any fight it leads to
const cy = (text, decisions, extra = {}) => ({ displayText: "Cyclone", image: IMG, text, decisions, ...extra });
// what it gives up: an Insight of Wind most often, of Earth or of Lightning less
const insight = [
    { weight: 2, results: [{ type: "GIVE_ITEM", payload: { itemId: "insight_of_wind", qty: 1 } }, END] },
    { weight: 1, results: [{ type: "GIVE_ITEM", payload: { itemId: "insight_of_earth", qty: 1 } }, END] },
    { weight: 1, results: [{ type: "GIVE_ITEM", payload: { itemId: "insight_of_lightning", qty: 1 } }, END] }
];
const swarm = (n) => ({ type: "START_BATTLE", payload: { enemies: Array(n).fill("THUNDER_LOCUST"), bgm: BGM } });
export const cyclone = {
    id: "cyclone",
    title: "Cyclone",
    imageSheet: "encounter_cyclone",
    initialStage: "funnel",
    ambience: "battlefieldWind",
    tone: "blood",
    stages: {
        funnel: cy("Out of the sandstorm a cyclone tears across the dunes toward you: a pillar of sand and screaming wind, lightning crackling in its heart. Something glints, caught in the spinning wall.", [
            {
                text: "[STR] Brace, and reach into the wall.",
                type: "skill_check", attribute: "strength", threshold: 14,
                successOutcomes: toStage("seized"),
                failureOutcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "thrown" } }] }, { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "swarm" } }] }]
            },
            {
                text: "[DEX] Time the gusts and dash through its eye.",
                type: "skill_check", attribute: "dexterity", threshold: 14,
                successOutcomes: toStage("eye"),
                failureOutcomes: [{ weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "thrown" } }] }, { weight: 1, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "swarm" } }] }]
            },
            {
                text: "[ATT] Stand still, and read the storm.",
                type: "skill_check", attribute: "attunement", threshold: 13,
                successOutcomes: toStage("calm"),
                failureOutcomes: toStage("struck")
            },
            { text: "Throw yourself down behind a dune.", outcomes: toStage("shelter") }
        ], { bgm: BGM, effect: "shake" }),
        seized: cy("Your arm goes into the wall up to the shoulder, and the wind tries to flay it. Your fingers close on something warm, and you tear it free.",
            [{ text: "Look at what you hold.", outcomes: insight }]),
        // through the eye, to its heart: a great swarm of thunder locusts guards what the storm carries. Win, and it is yours (cyclone_heart)
        eye: cy("You run with the gusts, and then you are through, into the eye. Deeper in, at the cyclone's heart, lightning gathers around something bright, and a great swarm of thunder locusts wheels about it, crackling.", [
            { text: "Fight your way into its heart.", outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: { enemies: Array(6).fill("THUNDER_LOCUST"), bgm: BGM, afterVictory: { encounterId: "cyclone_heart" } } }] }] },
            { text: "Get out while you can.", outcomes: toStage("slipped") }
        ]),
        slipped: cy("You go with the next gust and let it carry you out the far side of the storm. The cyclone roars away across the dunes, its heart still burning.",
            end("Get up, and go on.")),
        calm: cy("You let the wind tell you where it is going. It howls past close enough to touch, and as it goes, it sets something down at your feet, almost gently.",
            [{ text: "Pick it up.", outcomes: insight }]),
        thrown: cy("The wall takes you. For a moment you are flying, and then the ground comes up hard. When you can see again, the cyclone is already far away across the dunes.",
            end("Get up.", [{ type: "MODIFY_VITALS", payload: { hp: -20, isPercentageOfMax: true, damageType: "wind" } }])),
        struck: cy("The storm does not care what you hear in it. Lightning leaps from its heart to the nearest thing standing, and that is you.",
            end("Get up.", [{ type: "MODIFY_VITALS", payload: { hp: -20, isPercentageOfMax: true, damageType: "lightning" } }])),
        swarm: cy("The cyclone spits you out, and something else with you: a swarm of thunder locusts, crackling, furious, and looking for anything to blame.",
            [{ text: "Fight them off!", outcomes: [
                { weight: 2, results: [swarm(2)] },
                { weight: 1, results: [swarm(3)] }
            ] }]),
        shelter: cy("You throw yourself down behind a dune and press your face into the sand. The cyclone howls past, close enough to tear at your clothes. When it is gone, there is nothing left but smooth sand.",
            end("Get up, and go on."))
    }
};

/* After the swarm at the cyclone's heart is beaten (cyclone's START_BATTLE afterVictory): what the storm carried is yours, always one of the insights. */
export const cycloneHeart = {
    id: "cyclone_heart",
    title: "Cyclone",
    imageSheet: "encounter_cyclone",
    initialStage: "stilled",
    ambience: "battlefieldWind",
    tone: "blood",
    stages: {
        stilled: cy("The last locust drops, sparking, into the sand. At its heart the storm falters, and goes still, and what it carried falls into your hands.",
            [{ text: "Look at what you hold.", outcomes: insight }], { bgm: "none" })
    }
};
