export class TransitionRenderer {
    constructor(config) {
        this.config = config;
        this.alpha = 0;
        this.isActive = false;
        this.callback = null; // Function to run when fade-out finishes
        this.state = 'IDLE';  // 'IDLE', 'FADE_OUT', 'FADE_IN'
    }

    /**
     * Starts a transition sequence.
     * 1. Fades to Black
     * 2. Calls the 'onMidpoint' function (e.g. change scene)
     * 3. Fades back in (optional)
     */
    start(onMidpoint) {
        this.isActive = true;
        this.alpha = 0;
        this.state = 'FADE_OUT';
        this.callback = onMidpoint;
    }

    update(dt) {
        if (!this.isActive) return;

        const FADE_SPEED = 2.0; // Adjust for faster/slower fades

        if (this.state === 'FADE_OUT') {
            this.alpha += dt * FADE_SPEED;
            if (this.alpha >= 1) {
                this.alpha = 1;
                this.state = 'HOLD';
                
                // Trigger the "Midpoint" action (Swap scenes, load map, etc.)
                if (this.callback) {
                    this.callback();
                    this.callback = null; // Don't run it again
                }
                
                // Start Fading Back In immediately? 
                // Or wait for manual signal? 
                // For now, let's auto-fade in:
                this.state = 'FADE_IN';
            }
        } 
        else if (this.state === 'FADE_IN') {
            this.alpha -= dt * FADE_SPEED;
            if (this.alpha <= 0) {
                this.alpha = 0;
                this.state = 'IDLE';
                this.isActive = false;
            }
        }
    }

    render(ctx) {
        if (!this.isActive && this.alpha <= 0) return;

        const { CANVAS_WIDTH, CANVAS_HEIGHT } = this.config;

        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = "#0a0a12"; // The Gothic Black
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.restore();
    }
}