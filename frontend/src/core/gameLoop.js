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

        // Prevent "spiral of death" if the tab is inactive
        deltaTime = Math.min(deltaTime, this.deltaTimeClampValue);
        this.timeAccumulator += deltaTime;

        // Update Physics/Logic in fixed steps
        while (this.timeAccumulator >= this.fixedTimeStep) {
            this.update(this.fixedTimeStep);
            this.timeAccumulator -= this.fixedTimeStep;
        }

        // Calculate render interpolation
        const interpolationFactor = this.timeAccumulator / this.fixedTimeStep;
        
        // Calculate total elapsed time (in seconds) for animations
        const totalTime = currentTimeStamp / 1000; 

        // Render with both factors
        this.render(interpolationFactor, totalTime); 
        
        requestAnimationFrame((timeStamp) => this.fireGameLoop(timeStamp));
    }
}