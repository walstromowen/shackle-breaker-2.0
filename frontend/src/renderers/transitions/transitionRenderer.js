export class TransitionRenderer {
    constructor(config) {
        this.config = config;
        this.progress = 0; // 0.0 to 1.0
        this.isActive = false;
        this.callback = null;
        this.state = 'IDLE';  // 'IDLE', 'OUT', 'IN'
        
        // Transition settings
        this.type = 'fade'; 
        this.color = '#0a0a12';
        this.speed = 2.0; 
    }

    /**
     * @param {Function} onMidpoint - Callback when screen is fully covered
     * @param {String} type - 'fade', 'wipe', 'circle', 'flash'
     * @param {Object} options - Override default colors/speeds
     */
    start(onMidpoint, type = 'fade', options = {}) {
        this.isActive = true;
        this.progress = 0;
        this.state = 'OUT';
        this.callback = onMidpoint;
        
        this.type = type;
        this.color = options.color || (type === 'flash' ? '#ffffff' : '#0a0a12');
        this.speed = options.speed || (type === 'flash' ? 4.0 : 2.0); // Flash is faster
    }

    update(dt) {
        if (!this.isActive) return;

        if (this.state === 'OUT') {
            this.progress += dt * this.speed;
            if (this.progress >= 1) {
                this.progress = 1;
                this.state = 'HOLD';
                
                if (this.callback) {
                    this.callback();
                    this.callback = null; 
                }
                
                this.state = 'IN';
            }
        } 
        else if (this.state === 'IN') {
            this.progress -= dt * this.speed;
            if (this.progress <= 0) {
                this.progress = 0;
                this.state = 'IDLE';
                this.isActive = false;
            }
        }
    }

    render(ctx) {
        if (!this.isActive && this.progress <= 0) return;

        const { CANVAS_WIDTH, CANVAS_HEIGHT } = this.config;
        
        ctx.save();
        ctx.fillStyle = this.color;

        switch (this.type) {
            case 'fade':
            case 'flash':
                // Flash and Fade use standard opacity
                ctx.globalAlpha = Math.max(0, Math.min(1, this.progress));
                ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                break;

            case 'wipe':
                // Slides across the screen from left to right
                ctx.globalAlpha = 1.0;
                const wipeWidth = CANVAS_WIDTH * this.progress;
                
                if (this.state === 'OUT') {
                    ctx.fillRect(0, 0, wipeWidth, CANVAS_HEIGHT);
                } else {
                    // Slide out to the right
                    ctx.fillRect(CANVAS_WIDTH - (CANVAS_WIDTH * this.progress), 0, CANVAS_WIDTH * this.progress, CANVAS_HEIGHT);
                }
                break;

            case 'circle':
                // Classic JRPG Iris wipe
                ctx.globalAlpha = 1.0;
                const maxRadius = Math.hypot(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
                const currentRadius = maxRadius * (1 - this.progress); // Shrinks as progress goes up

                ctx.beginPath();
                // Draw a rectangle covering the screen
                ctx.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                // Cut a circle out of it (arc going counter-clockwise)
                ctx.arc(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, Math.max(0, currentRadius), 0, Math.PI * 2, true);
                ctx.fill();
                break;
        }

        ctx.restore();
    }
}