/* The iron chest (object IRON_CHEST).
   Much simpler than the wooden treasure chest: no skill checks, no traps, no ambush. It only opens with a Large Iron Key
   (item id "large_iron_key"), which is spent on the lock. It is not tied to any place, so it reads the same wherever it stands. */
export const ironChest = {
    id: "iron_chest",
    title: "Iron Chest",
    imageSheet: "encounter_treasure_chest",   // reuses the wooden chest art; give it its own sheet (encounter_iron_chest) when you have one
    initialStage: "discovery",
    stages: {
        discovery: {
            displayText: "A Heavy Iron Chest",
            sfx: "lockClick",
            sfxVolume: 0.6,
            image: { col: 0, row: 0 },
            text: "A heavy iron chest, bound in riveted bands and shut with a lock the size of a fist. Prying at it would be pointless. This lock was made for one key, and a large one.",
            decisions: [
                {
                    text: "[Large Iron Key] Unlock the chest.",
                    conditions: [
                        { type: "has_item", itemId: "large_iron_key", qty: 1 },
                        { type: "has_tag", tag: "HUMANOID" }
                    ],
                    customActionText: "You fit the large iron key into the lock and throw the bolt with a heavy clunk...",
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "REMOVE_ITEM", payload: { itemId: "large_iron_key", qty: 1 } },
                                { type: "ADVANCE_STAGE", payload: { stageId: "opened_chest" } }
                            ]
                        }
                    ]
                },
                {
                    text: "Switch party member.",
                    type: "switch_character",
                    conditions: [{ type: "has_other_party_members" }]
                },
                {
                    text: "Leave the chest where it is.",
                    customActionText: "You leave the chest locked and move on.",
                    outcomes: [{ weight: 100, results: [{ type: "END_ENCOUNTER", payload: null }] }]
                }
            ]
        },
        opened_chest: {
            displayText: "The Hoard",
            tone: "gold",
            effect: "flash",
            sfx: "chestOpen",
            image: { col: 1, row: 0 },
            text: "The iron lid swings up on its hinges. Inside, packed tight in rotted cloth, lies a hoard that someone went to great lengths to lock away.",
            decisions: [
                {
                    text: "Gather the loot and depart.",
                    outcomes: [
                        {
                            weight: 100,
                            results: [
                                { type: "ROLL_LOOT_TABLE", payload: { lootTableId: "iron_chest_loot", rolls: 3 } },
                                { type: "AWARD_XP", payload: { amount: 15, target: "active_character" } },
                                { type: "DESTROY_OBJECT" },
                                { type: "END_ENCOUNTER", payload: null }
                            ]
                        }
                    ]
                }
            ]
        }
    }
};