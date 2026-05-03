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
     * @param {String} type - 'fade', 'wipe', 'circle', 'flash', 'ethereal', 'silhouette', 'blade'
     * @param {Object} options - Override default colors/speeds
     */
    start(onMidpoint, type = 'fade', options = {}) {
        this.isActive = true;
        this.progress = 0;
        this.state = 'OUT';
        this.callback = onMidpoint;
        
        this.type = type;
        this.color = options.color || (type === 'flash' ? '#ffffff' : '#0a0a12');
        
        // Adjust default speeds based on the transition type
        let defaultSpeed = 2.0;
        if (type === 'flash') defaultSpeed = 4.0;
        if (type === 'ethereal') defaultSpeed = 1.5; 
        if (type === 'silhouette') defaultSpeed = 0.75; 
        if (type === 'blade') defaultSpeed = 1.2; // Slower, to let the dramatic greyscale pause sink in
        
        this.speed = options.speed || defaultSpeed;
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
                ctx.globalAlpha = Math.max(0, Math.min(1, this.progress));
                ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                break;

            case 'wipe':
                ctx.globalAlpha = 1.0;
                const wipeWidth = CANVAS_WIDTH * this.progress;
                
                if (this.state === 'OUT') {
                    ctx.fillRect(0, 0, wipeWidth, CANVAS_HEIGHT);
                } else {
                    ctx.fillRect(CANVAS_WIDTH - (CANVAS_WIDTH * this.progress), 0, CANVAS_WIDTH * this.progress, CANVAS_HEIGHT);
                }
                break;

            case 'circle':
                ctx.globalAlpha = 1.0;
                const maxRadius = Math.hypot(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
                const currentRadius = maxRadius * (1 - this.progress); 

                ctx.beginPath();
                ctx.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                ctx.arc(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, Math.max(0, currentRadius), 0, Math.PI * 2, true);
                ctx.fill();
                break;

            case 'ethereal':
                const cx = CANVAS_WIDTH / 2;
                const cy = CANVAS_HEIGHT / 2;
                const maxDist = Math.hypot(cx, cy);
                const numLayers = 4; 
                
                ctx.translate(cx, cy);

                for (let j = 0; j < numLayers; j++) {
                    const adjustedProgress = Math.min(1, this.progress * (1 + j * 0.15));
                    const holeRadius = maxDist * (1 - adjustedProgress); 
                    
                    ctx.globalAlpha = j === 0 ? 1.0 : 0.4 - (j * 0.1);
                    
                    ctx.beginPath();
                    ctx.rect(-maxDist * 2, -maxDist * 2, maxDist * 4, maxDist * 4);
                    
                    const spinPhase = Math.pow(this.progress, 2);
                    const rotation = spinPhase * Math.PI * 4 * (1 + j * 0.2); 
                    
                    for (let i = 0; i < 4; i++) {
                        const angle = rotation - (i * Math.PI / 2);
                        const x = Math.cos(angle) * holeRadius;
                        const y = Math.sin(angle) * holeRadius;
                        
                        if (i === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.closePath();
                    ctx.fill('evenodd');
                }
                ctx.translate(-cx, -cy);
                break;

            case 'silhouette':
                const cxSil = CANVAS_WIDTH / 2;
                const cySil = CANVAS_HEIGHT / 2;
                const maxSilRadius = Math.hypot(cxSil, cySil) * 1.5; 
                
                const zoomPhase = Math.pow(this.progress, 3);
                const baseRadius = maxSilRadius * zoomPhase;

                ctx.translate(cxSil, cySil);

                for (let j = 3; j >= 0; j--) {
                    ctx.globalAlpha = j === 0 ? 1.0 : 0.15;
                    const layerRadius = baseRadius * (1 + j * 0.2);
                    
                    ctx.beginPath();
                    const points = 40; 
                    for (let i = 0; i <= points; i++) {
                        const theta = (i / points) * Math.PI * 2;
                        
                        const wriggle = Math.sin(theta * 7 + this.progress * 30) * (layerRadius * 0.15) 
                                      + Math.cos(theta * 11 - this.progress * 20) * (layerRadius * 0.1);
                        
                        const x = Math.cos(theta) * (layerRadius + wriggle) * 0.7; 
                        const y = Math.sin(theta) * (layerRadius + wriggle) * 1.3;

                        if (i === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.closePath();
                    ctx.fill();
                }

                ctx.translate(-cxSil, -cySil);
                break;

            case 'blade':
                // If the scene has already changed and we are fading IN, 
                // just do a normal fade from black so it doesn't play backwards.
                if (this.state === 'IN') {
                    ctx.fillStyle = this.color;
                    ctx.globalAlpha = Math.max(0, Math.min(1, this.progress));
                    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                    break;
                }

                // --- Cinematic Outbound Animation ---
                const cxBlade = CANVAS_WIDTH / 2;
                const cyBlade = CANVAS_HEIGHT / 2;

                // 1. Instantly snap to greyscale
                const desatAlpha = Math.min(1, this.progress * 10); 
                if (desatAlpha > 0) {
                    ctx.globalCompositeOperation = 'saturation';
                    ctx.fillStyle = '#000000';
                    ctx.globalAlpha = desatAlpha;
                    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                }

                // Reset composite operation to draw the glint and fade
                ctx.globalCompositeOperation = 'source-over';

                // 2. The Initial Gleam (0.0 to 0.25)
                if (this.progress < 0.25) {
                    const flashTarget = 0.08; 
                    const flashDuration = 0.25;
                    let intensity = 0;
                    
                    if (this.progress < flashTarget) {
                        intensity = this.progress / flashTarget; 
                    } else {
                        intensity = 1 - ((this.progress - flashTarget) / (flashDuration - flashTarget)); 
                    }

                    // Screen-wide ambient white flash
                    ctx.fillStyle = '#ffffff';
                    ctx.globalAlpha = intensity * 0.5;
                    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

                    // Sharp diagonal star/diamond glint
                    ctx.translate(cxBlade, cyBlade);
                    ctx.rotate(-Math.PI / 4); 
                    
                    const glintLength = CANVAS_WIDTH * 1.5 * intensity;
                    const glintThickness = 30 * Math.pow(intensity, 2);

                    ctx.globalAlpha = intensity;
                    
                    ctx.beginPath();
                    ctx.moveTo(-glintLength / 2, 0);
                    ctx.lineTo(0, -glintThickness / 2);
                    ctx.lineTo(glintLength / 2, 0);
                    ctx.lineTo(0, glintThickness / 2);
                    ctx.fill();

                    ctx.fillStyle = '#e0f7fa'; 
                    ctx.beginPath();
                    ctx.moveTo(-glintLength / 4, 0);
                    ctx.lineTo(0, -glintThickness / 4);
                    ctx.lineTo(glintLength / 4, 0);
                    ctx.lineTo(0, glintThickness / 4);
                    ctx.fill();

                    ctx.rotate(Math.PI / 4);
                    ctx.translate(-cxBlade, -cyBlade);
                }

                // 3. The Dramatic Fade (0.4 to 1.0)
                if (this.progress > 0.4) {
                    const fadeAlpha = (this.progress - 0.4) / 0.6; 
                    ctx.fillStyle = this.color;
                    ctx.globalAlpha = fadeAlpha;
                    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                }
                break;
        }

        ctx.restore();
    }
}