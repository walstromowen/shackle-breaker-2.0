/* The catacombs' deeper rooms (placed by the CatacombGenerator, see world/catacombPuzzle.js):

     catacomb_vault_door     VAULT_DOOR: the locked door of a side room of chests and crates. A small iron key opens it (spent on the lock). As it opens
                             the warding rune over the lock flares: most often it only gutters out, but one time in three the vault's two guards rise
                             from their niches and must be fought (the door is open either way).
     ossuary_warden          OSSUARY_WARDEN: the boss of the catacombs, in the dark round hall before the main chamber, guarding the lever that raises
                             the last gate. Coming within 3 cells wakes it (triggerRadius). Backing away ends it; it wakes again when you come back.
     ossuary_warden_fallen   after the Warden's fight is won (afterVictory): its bones fall apart and it is gone from the map, so the lever can be pulled.

   Art: assets/icons/encounters/catacomb_depths.png registered as `encounter_catacomb_depths`, a 4 x 4 grid of 128 px cells:
     (0,0) the locked door  (1,0) the vault open  (2,0) the Warden in the dark  (3,0) the Warden fallen, the lever behind */

const toStage = (stageId) => [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId } }] }];
const END = { type: "END_ENCOUNTER", payload: null };
const OPEN_DOOR = { type: "REPLACE_OBJECT", payload: { objectId: "VAULT_DOOR_OPEN" } };
const WARDEN_FIGHT = { type: "START_BATTLE", payload: { tableId: "ossuary_warden_boss", afterVictory: { encounterId: "ossuary_warden_fallen" }, bgm: "shackledMarchBgm" } };

export const catacombVaultDoor = {
    id: "catacomb_vault_door",
    title: "The Vault",
    imageSheet: "encounter_catacomb_depths",
    initialStage: "locked",
    tone: "cold",
    stages: {
        locked: {
            displayText: "A Locked Door",
            image: { col: 0, row: 0 },
            sfx: "lockClick",
            sfxVolume: 0.5,
            text: "A door of black oak bound in iron closes the passage. A padlock hangs from its hasp, small but stout, and above it a warding rune glows a faint, cold blue. Whatever the dead kept in there, they meant to keep it.",
            decisions: [
                {
                    text: "[Small Iron Key] Unlock the door.",
                    conditions: [
                        { type: "has_item", itemId: "small_iron_key", qty: 1 },
                        { type: "has_tag", tag: "HUMANOID" }
                    ],
                    customActionText: "The small key turns stiffly, and the padlock drops open into your hand...",
                    outcomes: [
                        { weight: 2, results: [{ type: "REMOVE_ITEM", payload: { itemId: "small_iron_key", qty: 1 } }, { type: "ADVANCE_STAGE", payload: { stageId: "rune_fades" } }] },
                        { weight: 1, results: [{ type: "REMOVE_ITEM", payload: { itemId: "small_iron_key", qty: 1 } }, { type: "ADVANCE_STAGE", payload: { stageId: "guards_wake" } }] }
                    ]
                },
                {
                    text: "Switch party member.",
                    type: "switch_character",
                    conditions: [{ type: "has_other_party_members" }]
                },
                {
                    text: "Leave the door shut.",
                    outcomes: [{ weight: 100, results: [END] }]
                }
            ]
        },
        rune_fades: {
            displayText: "The Vault",
            tone: "gold",
            image: { col: 1, row: 0 },
            sfx: "chestCreak",
            text: "The rune flares once and gutters out. The door groans inward on rusted hinges, and your light falls on chests and crates stacked against the walls, untouched for longer than anyone can remember.",
            decisions: [{ text: "Step inside.", outcomes: [{ weight: 100, results: [OPEN_DOOR, END] }] }]
        },
        guards_wake: {
            displayText: "The Guards Wake",
            tone: "blood",
            effect: "jolt",
            image: { col: 2, row: 0 },
            sfx: "bonesRattle",
            bgm: "caveBattleBgm",
            text: "The rune flares and does not go out. The door swings wide, and in the niches on either side two shapes of bone lift their heads. The vault was never left unguarded.",
            decisions: [{
                text: "Draw your weapon.",
                outcomes: [{ weight: 100, results: [OPEN_DOOR, { type: "START_BATTLE", payload: { tableId: "vault_guardians" } }] }]
            }]
        }
    }
};

export const ossuaryWarden = {
    id: "ossuary_warden",
    title: "The Ossuary Warden",
    imageSheet: "encounter_catacomb_depths",
    initialStage: "stirs",
    tone: "cold",
    stages: {
        stirs: {
            displayText: "Something in the Dark",
            image: { col: 2, row: 0 },
            bgm: "none",
            sfx: "heartbeat",
            text: "The hall is round and utterly dark. In its middle, between you and a lever in the far wall, something tall stands with a sword grounded before it. Two points of cold blue light kindle where its eyes should be.",
            decisions: [
                { text: "Hold your ground.", outcomes: toStage("challenge") },
                { text: "Back away into the dark.", outcomes: [{ weight: 100, results: [END] }] }
            ]
        },
        challenge: {
            displayText: "The Ossuary Warden",
            image: { col: 2, row: 0 },
            effect: "shake",
            bgm: "shackledMarchBgm",
            text: "Bone grinds on bone as it lifts the sword. A knight in the rags of the old colors, shackles still on its wrists. \"None pass. The king's dead sleep, and I keep them. Turn back, or lie down among them.\"",
            decisions: [
                { text: "Draw your weapon.", outcomes: [{ weight: 100, results: [WARDEN_FIGHT] }] },
                { text: "Back away into the dark.", outcomes: [{ weight: 100, results: [END] }] }
            ]
        }
    }
};

export const ossuaryWardenFallen = {
    id: "ossuary_warden_fallen",
    title: "The Ossuary Warden",
    imageSheet: "encounter_catacomb_depths",
    initialStage: "fallen",
    tone: "cold",
    stages: {
        fallen: {
            displayText: "The Last Watch",
            image: { col: 3, row: 0 },
            bgm: "none",
            sfx: "rockThud",
            text: "The Warden staggers. Its sword slips from its fingers, and the bones that held together through all those years come apart at last, clattering into a heap at the foot of the lever. The blue light in its eyes goes out.",
            decisions: [{ text: "Let it rest.", outcomes: [{ weight: 100, results: [{ type: "DESTROY_OBJECT" }, END] }] }]
        }
    }
};
