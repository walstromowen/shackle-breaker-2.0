export const testEncounter = {
    id: "test_encounter",
    title: "The Mysterious Monolith",
    imageSheet: "encounter_treasure_chest", // Using your existing chest sheet for testing
    initialStage: "discovery",
    stages: {
        "discovery": {
            displayText: "A Strange Phenomenon",
            image: { col: 0, row: 0 },
            text: "{name}'s party discovers a glowing monolith humming with strange energy. A booming voice echoes in your minds: 'Do you wish to become Tough?'",
            decisions: [
                {
                    text: "Grant 'Tough' to {name} only.",
                    customActionText: "{name} reaches out and touches the monolith alone...",
                    outcomes: [{
                        weight: 100,
                        results: [
                            { 
                                type: "ADD_TRAIT", 
                                payload: { traitId: "tough", target: "active_character" } 
                            },
                            { type: "END_ENCOUNTER", payload: null }
                        ]
                    }]
                },
                {
                    text: "Grant 'Tough' to the entire party.",
                    customActionText: "{name} gestures for the whole party to touch the monolith together...",
                    outcomes: [{
                        weight: 100,
                        results: [
                            { 
                                type: "ADD_TRAIT", 
                                payload: { traitId: "tough", target: "entire_party" } 
                            },
                            { type: "END_ENCOUNTER", payload: null }
                        ]
                    }]
                },
                {
                    text: "[Test Removal] Remove 'Tough' from {name}.",
                    customActionText: "The monolith draws the resilience out of {name}'s body...",
                    outcomes: [{
                        weight: 100,
                        results: [
                            { 
                                type: "REMOVE_TRAIT", 
                                payload: { traitId: "tough", target: "active_character" } 
                            },
                            { type: "END_ENCOUNTER", payload: null }
                        ]
                    }]
                },
                {
                    text: "Switch party member.",
                    type: "switch_character",
                    conditions: [{ type: "has_other_party_members" }]
                },
                {
                    text: "Leave the monolith alone.",
                    customActionText: "Deciding not to mess with strange magic, {name} leads the party away.",
                    outcomes: [{
                        weight: 100,
                        results: [
                            { type: "END_ENCOUNTER", payload: null }
                        ]
                    }]
                }
            ]
        }
    }
};