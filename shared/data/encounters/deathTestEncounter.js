export const deathTestEncounter = {
    id: "death_test_encounter",
    title: "Lethal Trap",
    initialStage: "start",
    stages: {
        "start": {
            displayText: "Suspicious Room",
            image: { sheet: "bg_encounters", col: 0, row: 0 }, // Replace with a relevant sprite if you have one
            text: "{name} discovers a room containing a rusty guillotine and a large ominous lever on the wall.",
            decisions: [
                {
                    text: "Test the guillotine.",
                    customActionText: "{name} foolishly decides to test the blade's sharpness with their neck...",
                    outcomes: [
                        {
                            weight: 1,
                            results: [
                                // Massive damage to the active character only
                                { type: "MODIFY_VITALS", payload: { hp: -9999 } },
                                { type: "END_ENCOUNTER", payload: null }
                            ]
                        }
                    ]
                },
                {
                    text: "Pull the ominous lever.",
                    customActionText: "{name} yanks the lever, causing the ceiling to instantly collapse on the party!",
                    outcomes: [
                        {
                            weight: 1,
                            results: [
                                // Massive damage to the entire party
                                { type: "MODIFY_VITALS", payload: { hp: -9999, target: "entire_party" } },
                                { type: "END_ENCOUNTER", payload: null }
                            ]
                        }
                    ]
                },
                {
                    text: "Leave immediately.",
                    customActionText: "{name} wisely decides to walk away.",
                    outcomes: [
                        {
                            weight: 1,
                            results: [
                                { type: "END_ENCOUNTER", payload: null }
                            ]
                        }
                    ]
                }
            ]
        }
    }
};