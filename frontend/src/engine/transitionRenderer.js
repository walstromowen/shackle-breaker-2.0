import { drawLoadingScreen, pickSplash } from '../ui/loadingScreen.js';

// milliseconds a frame a loading screen spends on its work (setWork): the rest of the frame keeps the screen and its progress bar moving
const WORK_BUDGET_MS = 14;
// a loading screen stays up at least this long (seconds), so its lore can be read even when the work is quick
const LOADING_MIN_SHOWN = 1.4;

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
        this.loading = null;
        this.hold = options.hold || 0;          // seconds the screen stays covered once the midpoint callback has run (a night's sleep)
        this.holdLeft = 0;
        this.work = null;                        // work done while the screen is covered (setWork): a loading screen
        this.loading = null;                     // the loading screen being shown: { label, splash, shown }
        this.onDone = options.onDone || null;   // called when the picture is fully back
    }

    /**
     * Keeps the screen covered after the midpoint until `steps` (a generator that yields { done, total }) has run out, running it WORK_BUDGET_MS
     * a frame and showing `label` with a progress bar. Call it from the midpoint callback (e.g. building the world around the player).
     */
    setWork(steps, label = 'Loading') {
        this.work = steps;
        this.workProgress = 0;
        this.loading = { label, splash: pickSplash(), shown: 0 };
    }

    _runWork() {
        const deadline = performance.now() + WORK_BUDGET_MS;
        while (this.work && performance.now() < deadline) {
            const r = this.work.next();
            if (r.done) { this.work = null; this.workProgress = 1; break; }
            if (r.value && r.value.total) this.workProgress = r.value.done / r.value.total;
        }
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
                
                this.holdLeft = this.hold || 0;
                this.state = (this.holdLeft > 0 || this.work) ? 'HOLD' : 'IN';
            }
        } 
        else if (this.state === 'HOLD') {
            if (this.work) this._runWork();
            if (this.loading) this.loading.shown += dt;
            this.holdLeft -= dt;
            const readLongEnough = !this.loading || this.loading.shown >= LOADING_MIN_SHOWN;
            if (this.holdLeft <= 0 && !this.work && readLongEnough) this.state = 'IN';
        }
        else if (this.state === 'IN') {
            this.progress -= dt * this.speed;
            if (this.progress <= 0) {
                this.progress = 0;
                this.state = 'IDLE';
                this.isActive = false;
                this.loading = null;
                if (this.onDone) { const done = this.onDone; this.onDone = null; done(); }
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

        // a loading screen (setWork): it fades out with the cover once the work is done
        if (this.loading && (this.state === 'HOLD' || this.state === 'IN')) {
            drawLoadingScreen(ctx, {
                W: CANVAS_WIDTH, H: CANVAS_HEIGHT,
                alpha: this.state === 'IN' ? Math.max(0, Math.min(1, this.progress)) : 1,
                progress: this.work ? this.workProgress : 1,
                label: this.loading.label, splash: this.loading.splash, loader: this.loader, shown: this.loading.shown,
            });
        }

        ctx.restore();
    }
}