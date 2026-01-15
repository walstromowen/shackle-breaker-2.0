export const oakTree = {
    id: "oakTree",
    title: "An Oak Tree",
    initialStage: "start",
    stages: {
        "start": {
            narrative: "A massive, gnarled oak tree stands before you. Its branches reach out like skeletal fingers against the sky.",
            imageSrc: "./assets/media/encounters/oak_tree.jpg",
            decisions: [
                {
                    text: "Chop down",
                    type: "BRANCH",
                    // --- NEW LOGIC HOOKS ---
                    // This tells the EncounterController to delete the map object
                    outcome: "DESTROY_OBJECT", 
                    // This adds an item to gameState.party.inventory
                    reward: "Wood Log",        
                    nextStage: "chopped_result"
                },
                {
                    text: "Climb",
                    type: "BRANCH",
                    nextStage: "climb_result"
                },
                {
                    text: "Leave",
                    type: "EXIT"
                }
            ]
        },
        "chopped_result": {
            narrative: "The wood is surprisingly soft. You wipe the sawdust from your clothes and gather the timber.",
            decisions: [
                { text: "Leave", type: "EXIT" }
            ]
        },
        "climb_result": {
            narrative: "From the high branches, you can see the layout of the surrounding forest. You feel a strange sense of clarity.",
            decisions: [
                { text: "Descend and leave", type: "EXIT" }
            ]
        }
    }
};