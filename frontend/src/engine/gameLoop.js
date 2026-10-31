export class GameLoop {
    constructor(updateCallback, renderCallback) {
        this.fixedTimeStep = 1 / 60;
        // UPDATE 1: Lower the clamp to 0.1 (max 6 frames of catch-up)
        this.deltaTimeClampValue = 0.1;
        this.timeAccumulator = 0;
        this.lastTimeStamp = 0;
        this.isRunning = false;

        // Frame pacing. By default the loop draws on every screen refresh: the overworld blends between logic steps (interpolation), so a 144 Hz
        // monitor shows 144 smooth frames. Set targetRenderFps (e.g. 60) to draw only on every Nth refresh, N chosen so the rate lands at or just
        // above it with equal gaps (144 Hz -> every 2nd = 72, 165 Hz -> 82, 240 Hz -> 60): that saves GPU work on a weak machine with a fast screen,
        // but a fast monitor that keeps up looks choppier, so it is off (null).
        this.targetRenderFps = null;
        this.refreshDeltas = [];     // the last few gaps between animation frames (ms), to measure the screen's refresh rate
        this.frameStride = 1;        // draw every Nth animation frame
        this.frameCounter = 0;

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

        const frameGapMs = currentTimeStamp - this.lastTimeStamp;
        let deltaTime = frameGapMs / 1000;
        this.lastTimeStamp = currentTimeStamp;
        this._measureRefresh(frameGapMs);

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

        // Draw on every Nth refresh only (see frameStride)
        this.frameCounter = (this.frameCounter + 1) % this.frameStride;
        if (this.frameCounter === 0) {
            const interpolationFactor = this.timeAccumulator / this.fixedTimeStep;
            const totalTime = currentTimeStamp / 1000;
            this.render(interpolationFactor, totalTime);
        }

        requestAnimationFrame((timeStamp) => this.fireGameLoop(timeStamp));
    }

    /**
     * Keeps frameStride in step with the screen. The refresh rate is the median gap between animation frames (the median ignores the odd slow
     * frame or tab switch), re-measured every 30 frames, so dragging the window to another monitor adapts within half a second. A machine
     * that cannot keep up gets long gaps, a low measured rate and a stride of 1: it draws every frame it can.
     */
    _measureRefresh(gapMs) {
        if (!this.targetRenderFps) { this.frameStride = 1; return; }
        if (!(gapMs > 0) || gapMs > 250) return;
        this.refreshDeltas.push(gapMs);
        if (this.refreshDeltas.length < 30) return;
        const sorted = this.refreshDeltas.slice().sort((a, b) => a - b);
        this.refreshDeltas.length = 0;
        const refreshHz = 1000 / sorted[sorted.length >> 1];
        // +0.05 so a 119.8 Hz reading still counts as twice 60
        const stride = Math.max(1, Math.floor(refreshHz / this.targetRenderFps + 0.05));
        if (stride !== this.frameStride) {
            this.frameStride = stride;
            this.frameCounter = 0;
        }
    }
}