export const bonfire = {
    id: "bonfire",
    title: "Bonfire",
    initialStage: "start",
    stages: {
        "start": {
            narrative: "A small fire crackles in the clearing. The warmth is inviting, but the woods are quiet—too quiet.",
            imageSrc: "./assets/media/encounters/bonfire.jpg",
            decisions: [
                {
                    text: "Rest by the fire",
                    type: "CHECK",
                    check: { stat: "survival", difficulty: 10 },
                    success: { type: "TABLE", id: "bonfire_rest_success" },
                    failure: { type: "TABLE", id: "bonfire_rest_fail" }
                },
                {
                    text: "Leave the clearing",
                    type: "DIRECT",
                    outcome: { type: "EXIT", log: "You vanish back into the trees." }
                }
            ]
        }
    }
};