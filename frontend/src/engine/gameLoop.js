export class GameLoop {
    constructor(updateCallback, renderCallback) {
        this.fixedTimeStep = 1 / 60;
        // UPDATE 1: Lower the clamp to 0.1 (max 6 frames of catch-up)
        this.deltaTimeClampValue = 0.1;
        this.timeAccumulator = 0;
        this.lastTimeStamp = 0;
        this.isRunning = false;

        // Drawing is capped at the logic rate. The game logic steps at 60 per second, so a 120 / 144 / 165 Hz screen (most gaming laptops) only
        // redrew the same picture 2 to 3 times over, at 2 to 3 times the cost. The frames are paced on a schedule (nextRenderTime), so a 144 Hz
        // screen still averages 60 even though 144 is not a multiple of 60.
        this.maxRenderFps = 60;
        this.nextRenderTime = 0;

        this.update = updateCallback;
        this.render = renderCallback;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTimeStamp = performance.now();
        requestAnimationFrame((timeStamp) => this.fireGameLoop(timeStamp));
    }

    stop() {
        this.isRunning = false;
    }

    fireGameLoop(currentTimeStamp) {
        if (!this.isRunning) return;

        let deltaTime = (currentTimeStamp - this.lastTimeStamp) / 1000;
        this.lastTimeStamp = currentTimeStamp;

        // Prevent "spiral of death" if the tab is inactive
        deltaTime = Math.min(deltaTime, this.deltaTimeClampValue);
        this.timeAccumulator += deltaTime;

        // UPDATE 2: "Panic Drop" - If the accumulator gets critically backlogged
        // (e.g., 10+ frames behind despite the clamp), drop the time to prevent a freeze.
        if (this.timeAccumulator > this.fixedTimeStep * 10) {
            console.warn("[GameLoop] Too far behind! Dropping time to prevent freeze.");
            this.timeAccumulator = this.fixedTimeStep; // Reset to a single frame
        }

        // Update Physics/Logic in fixed steps
        while (this.timeAccumulator >= this.fixedTimeStep) {
            this.update(this.fixedTimeStep);
            this.timeAccumulator -= this.fixedTimeStep;
        }

        // Skip the draw when it is not yet time for the next frame (1 ms early is fine: vsync timestamps jitter a little)
        const renderInterval = 1000 / this.maxRenderFps;
        if (currentTimeStamp >= this.nextRenderTime - 1) {
            // On schedule, or reset after a stall so a slow frame does not cause a burst of catch-up draws
            this.nextRenderTime += renderInterval;
            if (this.nextRenderTime < currentTimeStamp) this.nextRenderTime = currentTimeStamp + renderInterval;

            const interpolationFactor = this.timeAccumulator / this.fixedTimeStep;
            const totalTime = currentTimeStamp / 1000;
            this.render(interpolationFactor, totalTime);
        }

        requestAnimationFrame((timeStamp) => this.fireGameLoop(timeStamp));
    }
}