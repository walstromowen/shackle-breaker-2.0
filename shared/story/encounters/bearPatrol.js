/* The Grizzly (BEAR_PATROL in mapObjectDefinitions.js): a great brown bear, rare, out in the plains and the snowy mountains (biomeDefinitions.js). It
   is seen on the map, keeping to its patch of ground: a few slow steps about where it stands, and long stops to grub at the roots (its `wander`).
   Coming within 3 tiles of it starts this.

     spotted     it lifts its head and huffs at you. Fight it; back away ([DEX]: it lets you go, and stays where it is); or stand tall and roar
                 back ([STR]: it lumbers off, and is gone). A failed roll and it charges.
     charge      the fight, and nothing to choose but how to meet it.
     backed_off  it goes back to its roots; come near again and it sees you again.
     driven_off  it leaves, and the map loses it.

   The narrator only: a bear says nothing (voiceLines.js). */
const TITLE = "A Grizzly";
const IMG = { col: 0, row: 0 };   // the Bear's own battle sheet, its first frame
const end = (results = []) => [{ weight: 100, results: [...results, { type: "END_ENCOUNTER", payload: null }] }];
const fight = (levelOffset) => [{ weight: 100, results: [
    { type: "DESTROY_OBJECT" },
    { type: "START_BATTLE", payload: { enemies: [{ id: "BEAR", levelOffset }], bgm: "apexPredatorBgm" } }   // a hunt's music, as the Arc Knights' patrols
] }];
const stage = (text, decisions, extra = {}) => ({ displayText: TITLE, image: IMG, text, decisions, ...extra });

export const bearPatrol = {
    id: "bear_patrol",
    title: TITLE,
    imageSheet: "bearPortrait",
    initialStage: "spotted",
    stages: {
        spotted: stage("A great brown bear is grubbing at the roots a stone's throw off, turning the earth over with one paw. It stops. Its head comes up, and it huffs at the air, at you. The fur along its shoulders rises.",
            [
                { text: "Fight it.", outcomes: fight(1) },
                {
                    text: "[DEX] Back away slowly.",
                    type: "skill_check",
                    attribute: "dexterity",
                    threshold: 12,
                    successOutcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "backed_off" } }] }],
                    failureOutcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "charge" } }] }]
                },
                {
                    text: "[STR] Stand tall and roar back.",
                    type: "skill_check",
                    attribute: "strength",
                    threshold: 14,
                    successOutcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "driven_off" } }] }],
                    failureOutcomes: [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId: "charge" } }] }]
                },
                { text: "Switch party member.", type: "switch_character", conditions: [{ type: "has_other_party_members" }] }
            ], { sfx: "bearCry", sfxVolume: 0.55, bgm: "apexPredatorBgm" }),
        charge: stage("It drops onto all fours and comes at you, faster than anything so big has any right to move.",
            [{ text: "Brace yourself.", outcomes: fight(2) }], { sfx: "bearCry", sfxVolume: 0.8, bgm: "apexPredatorBgm" }),
        backed_off: stage("You give it the width of the field, one slow step at a time. It watches you all the way, then lowers its head to the roots again.",
            [{ text: "Leave it be.", outcomes: end() }]),
        driven_off: stage("You spread your arms and roar. The bear rears up, huge against the sky, and for a long moment neither of you moves. Then it drops, snorts, and lumbers away, unhurried, as if it had meant to all along.",
            [{ text: "Let it go.", outcomes: end([{ type: "DESTROY_OBJECT" }]) }])
    }
};
