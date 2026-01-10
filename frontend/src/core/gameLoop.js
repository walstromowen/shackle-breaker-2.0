

export class GameLoop {
    constructor(updateCallback, renderCallback) {
        this.fixedTimeStep = 1 / 60; 
        this.deltaTimeClampValue = 0.25; 
        
        this.timeAccumulator = 0;
        this.lastTimeStamp = 0;
        this.isRunning = false;

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

        deltaTime = Math.min(deltaTime, this.deltaTimeClampValue);
        this.timeAccumulator += deltaTime;

        while (this.timeAccumulator >= this.fixedTimeStep) {
            this.update(this.fixedTimeStep);
            this.timeAccumulator -= this.fixedTimeStep;
        }

        const interpolationFactor = this.timeAccumulator / this.fixedTimeStep;
        
        // --- ADD THIS ---
        // 1. Convert timestamp to Seconds (for animation math)
        const totalTime = currentTimeStamp / 1000; 

        // 2. Pass 'totalTime' as the SECOND argument
        this.render(interpolationFactor, totalTime); 
        // ----------------
        
        requestAnimationFrame((timeStamp) => this.fireGameLoop(timeStamp));
    }
}