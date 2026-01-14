export const oakTree = {
    id: "oakTree",
    title: "An Oak Tree",
    initialStage: "start",
    stages: {
        "start": {
            narrative: "A massive, gnarled oak tree stands before you. Its branches reach out like skeletal fingers against the sky, and the air around it feels heavy with age.",
            imageSrc: "./assets/media/encounters/oak_tree.jpg",
            decisions: [
                {
                    text: "Chop down",
                    type: "BRANCH",
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
            narrative: "The wood is surprisingly soft, as if the tree had been waiting to fall. You harvest enough timber for a sturdy fire or basic repairs.",
            decisions: [
                { text: "Done", type: "EXIT" }
            ]
        },
        "climb_result": {
            narrative: "From the high branches, you can see the layout of the surrounding forest. You feel a strange sense of clarity gazing out from the canopy.",
            decisions: [
                { text: "Descend and leave", type: "EXIT" }
            ]
        }
    }
};