export class Input {
    constructor() {
        this.heldKeys = new Set();
        
        // Listeners for key state
        window.addEventListener("keydown", (e) => {
            // console.log("Key Down:", e.code); // <-- Uncomment this to debug!
            this.heldKeys.add(e.code);
        });

        window.addEventListener("keyup", (e) => {
            this.heldKeys.delete(e.code);
        });
    }

    get direction() {
        const keys = Array.from(this.heldKeys);
        // We iterate backwards to get the most recently pressed key
        for (let i = keys.length - 1; i >= 0; i--) {
            const key = keys[i];
            if (key === "ArrowUp" || key === "KeyW") return "UP";
            if (key === "ArrowDown" || key === "KeyS") return "DOWN";
            if (key === "ArrowLeft" || key === "KeyA") return "LEFT";
            if (key === "ArrowRight" || key === "KeyD") return "RIGHT";
        }
        return null;
    }
}