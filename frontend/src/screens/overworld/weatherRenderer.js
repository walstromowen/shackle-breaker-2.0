import { gameState } from '../../../../shared/core/gameState.js';

export class WeatherRenderer {
    constructor(canvas, ctx, config) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.config = config;
        
        this.particles = [];

        // Splashes live in flat typed arrays (no object per splash, nothing allocated while it rains) and are drawn in a few alpha batches
        this.SPLASH_MAX = 8192;
        this.splashes = {
            n: 0,
            x: new Float32Array(this.SPLASH_MAX), y: new Float32Array(this.SPLASH_MAX),
            vx: new Float32Array(this.SPLASH_MAX), vy: new Float32Array(this.SPLASH_MAX),
            life: new Float32Array(this.SPLASH_MAX), decay: new Float32Array(this.SPLASH_MAX)
        };
        this.rainAtlas = null; // built the first time it rains
        
        // --- UPDATED INTERNAL STATE ---
        this.targetWeatherId = 'CLEAR';
        this.displayEffect = 'none';
        this.renderIntensity = 0; 
        this.targetIntensity = 0;
        
        this.lastCameraX = null;
        this.lastCameraY = null;

        this.fogPuffImage = this.createFogAsset();

        this.RAIN_LENGTH_STEPS = 8;
        this.RAIN_SLANT_STEPS = 4;

        // Weather is pure decoration, so it must never cost the game its frame rate: if the frames stay slow while a particle weather is
        // on screen (a laptop panel on its integrated graphics, say), the weather thins out step by step until the game runs smoothly again.
        this.DENSITY_STEPS = [1, 0.6, 0.35];
        this.SLOW_FRAME_MS = 24;     // slower than ~42 fps on average...
        this.SLOW_WINDOW_MS = 1500;  // ...for this long counts as struggling
        this.densityStep = 0;
        this._lastFrameAt = 0;
        this._windowMs = 0;
        this._windowFrames = 0;

        // 1920x1080 Scaling applies a 2.4x multiplier to sizes/speeds, and a 5.76x multiplier (Area) to particle counts.
        this.settings = {
            'particle_rain': {
                count: 2592, // Scaled from 450
                color: 'rgba(200, 220, 255, 0.5)',
                splashColor: 'rgba(230, 240, 255, 0.6)',
                speedY: [60, 108], // Scaled from [25, 45]
                speedX: [4.8, 12], // Scaled from [2, 5]
                length: [14.4, 28.8] // Scaled from [6, 12]
            },
            'particle_sand': {
                count: 3456, // Scaled from 600
                color: 'rgba(210, 180, 140, 0.7)',
                speedY: [2.4, 7.2], // Scaled from [1, 3]
                speedX: [48, 84], // Scaled from [20, 35]
                size: [2.4, 4.8] // Scaled from [1, 2]
            },
            'particle_blizzard': {
                count: 3600,
                color: 'rgba(245, 250, 255, 1)',      // flakes: a little transparent according to how near they are (see render)
                overlay: [222, 232, 244],             // the white-out laid over the whole screen
                speedX: [60, 150],                    // a hard wind: the flakes fly sideways, the near ones fastest
                speedY: [10, 70],
                size: [2.4, 7.2]                      // far flakes are small, near ones big
            },
            'overlay_fog': {
                count: 25, // drastically reduced from 230 for scattered wisps
                speedX: [0.4, 0.9], // Slightly faster horizontal drift
                speedY: [-0.05, 0.05], // Kept mostly horizontal
                size: [900, 1600] // Slightly varied size for distinct clouds
            }
        };
    }

    createFogAsset() {
        const offscreen = document.createElement('canvas');
        const size = 614; // Scaled from 256
        offscreen.width = size;
        offscreen.height = size;
        const oCtx = offscreen.getContext('2d');

        const gradient = oCtx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
        
        // Bumping opacity and whiteness so the few scattered clouds pop
        gradient.addColorStop(0, 'rgba(240, 248, 255, 0.4)');
        gradient.addColorStop(0.4, 'rgba(240, 248, 255, 0.15)');
        gradient.addColorStop(1, 'rgba(240, 248, 255, 0)');

        oCtx.fillStyle = gradient;
        oCtx.fillRect(0, 0, size, size);

        return offscreen;
    }

    initParticles(visualEffect) {
        this.particles = [];
        this.splashes.n = 0;
        this.densityStep = 0; // every new weather gets a fresh chance at full density
        this._windowMs = 0;
        this._windowFrames = 0;
        const settings = this.settings[visualEffect];
        if (!settings || !settings.count) return;

        for (let i = 0; i < settings.count; i++) {
            this.particles.push(this.createParticle(visualEffect, true));
        }
    }

    createParticle(visualEffect, randomizeY = false) {
        return this.resetParticle({}, visualEffect, randomizeY);
    }

    // (Re)rolls a particle in place, so a drop that lands is reused instead of a new object being allocated for it
    resetParticle(p, visualEffect, randomizeY = false) {
        const settings = this.settings[visualEffect];

        p.x = Math.random() * (this.canvas.width + 1440) - 720; // Scaled from +600, -300
        p.speedY = settings.speedY[0] + Math.random() * (settings.speedY[1] - settings.speedY[0]);
        p.speedX = settings.speedX[0] + Math.random() * (settings.speedX[1] - settings.speedX[0]);

        if (visualEffect === 'particle_sand' || visualEffect === 'particle_blizzard' || visualEffect === 'overlay_fog' || randomizeY) {
            p.y = Math.random() * (this.canvas.height + 480) - 240; // Scaled from +200, -100
        } else {
            p.y = -240 - (Math.random() * 480); // Scaled from -100, 200
        }

        if (visualEffect === 'particle_rain') {
            p.length = settings.length[0] + Math.random() * (settings.length[1] - settings.length[0]);
            p.sprite = this.rainSpriteIndex(p.speedX, p.length, settings);
            
            if (randomizeY) {
                p.targetY = p.y + Math.random() * (this.canvas.height - p.y);
            } else {
                p.targetY = Math.random() * this.canvas.height;
            }
        }

        if (visualEffect === 'overlay_fog') {
            p.size = settings.size[0] + Math.random() * (settings.size[1] - settings.size[0]);
        } else if (settings.size) {
            p.size = settings.size[0] + Math.random() * (settings.size[1] - settings.size[0]);
        }

        if (visualEffect === 'particle_blizzard') {
            // one number decides the flake: 0 = far (small, slow, faint), 1 = near (big, fast, bright), so the snow has depth
            const t = Math.random();
            const lerp = (r) => r[0] + (r[1] - r[0]) * t;
            p.size = lerp(settings.size);
            p.speedX = lerp(settings.speedX);
            p.speedY = lerp(settings.speedY);
            p.cls = t < 0.6 ? 0 : (t < 0.9 ? 1 : 2);
        }

        return p;
    }

    createSplash(x, y) {
        const s = this.splashes;
        for (let i = 0; i < 3 && s.n < this.SPLASH_MAX; i++) {
            const k = s.n++;
            s.x[k] = x;
            s.y[k] = y;
            s.vx[k] = (Math.random() * 4.8) - 2.4; // Scaled from *2, -1
            s.vy[k] = (Math.random() * 4.8) - 2.4; // Scaled from *2, -1
            s.life[k] = 1.0;
            s.decay[k] = 0.1 + (Math.random() * 0.05);
        }
    }

    // ---- Rain streaks -------------------------------------------------------------------------------------------
    // A streak is a 2.4px line with round caps, slanted by the wind. Stroking 2,600 of those every frame was the weather's whole cost
    // (the browser has to build and anti-alias a path for each); instead every length/slant combination is drawn ONCE into a small
    // atlas and the drops are stamped from it, which the browser can batch into a single draw.
    rainSpriteIndex(speedX, length, settings) {
        const L = this.RAIN_LENGTH_STEPS, S = this.RAIN_SLANT_STEPS;
        const li = Math.min(L - 1, Math.floor((length - settings.length[0]) / (settings.length[1] - settings.length[0]) * L));
        const si = Math.min(S - 1, Math.floor((speedX - settings.speedX[0]) / (settings.speedX[1] - settings.speedX[0]) * S));
        return li * S + si;
    }

    buildRainAtlas() {
        const settings = this.settings.particle_rain;
        const L = this.RAIN_LENGTH_STEPS, S = this.RAIN_SLANT_STEPS;
        const width = 2.4, pad = 2;
        const cellW = Math.ceil(settings.speedX[1] + width) + pad * 2;
        const cellH = Math.ceil(settings.length[1] + width) + pad * 2;

        const cv = document.createElement('canvas');
        cv.width = cellW * S;
        cv.height = cellH * L;
        const cx = cv.getContext('2d');
        cx.strokeStyle = settings.color;
        cx.lineWidth = width;
        cx.lineCap = 'round';

        const cells = [];
        for (let li = 0; li < L; li++) {
            // each cell draws the middle of its range, so the quantised streaks are as long and as slanted as the originals on average
            const len = settings.length[0] + (li + 0.5) / L * (settings.length[1] - settings.length[0]);
            for (let si = 0; si < S; si++) {
                const slant = settings.speedX[0] + (si + 0.5) / S * (settings.speedX[1] - settings.speedX[0]);
                const ox = Math.ceil(slant + width / 2) + pad;                             // where the drop's (x, y) sits inside its cell
                const oy = Math.ceil(len + width / 2) + pad;
                const cellX = si * cellW, cellY = li * cellH;
                const w = ox + Math.ceil(width / 2) + pad, h = oy + Math.ceil(width / 2) + pad;
                cx.beginPath();
                cx.moveTo(cellX + ox, cellY + oy);
                cx.lineTo(cellX + ox - slant, cellY + oy - len);
                cx.stroke();
                cells[li * S + si] = { sx: cellX, sy: cellY, w, h, ox, oy };
            }
        }
        this.rainAtlas = { image: cv, cells };
    }

    // How many of the particles are in play at the current density
    activeCount() {
        return Math.min(this.particles.length, Math.ceil(this.particles.length * this.DENSITY_STEPS[this.densityStep]));
    }

    watchFrameRate(now) {
        const gap = now - this._lastFrameAt;
        this._lastFrameAt = now;
        if (gap <= 0 || gap > 1000) { // the first frame, a tab that was in the background: not a measure of the weather
            this._windowMs = 0;
            this._windowFrames = 0;
            return;
        }
        this._windowMs += gap;
        this._windowFrames++;
        if (this._windowMs < this.SLOW_WINDOW_MS) return;
        if (this._windowMs / this._windowFrames > this.SLOW_FRAME_MS && this.densityStep < this.DENSITY_STEPS.length - 1) this.densityStep++;
        this._windowMs = 0;
        this._windowFrames = 0;
    }

    update(dt, camera) {
        // Fallback safety to prevent NaN errors
        const safeDt = dt || 0.016; 
        
        const stateWeather = gameState.world.currentWeather;
        const stateId = (stateWeather && stateWeather.id) ? stateWeather.id.toUpperCase() : 'CLEAR';
        
        // --- Auto-Mapping ---
        const defaultEffects = {
            'SANDSTORM': 'particle_sand',
            'RAIN': 'particle_rain',
            'FOG': 'overlay_fog',
            'BLIZZARD': 'particle_blizzard'
        };
        
        let stateEffect = 'none';
        if (stateWeather && stateWeather.visualEffect && stateWeather.visualEffect !== 'none') {
            stateEffect = stateWeather.visualEffect;
        } else if (defaultEffects[stateId]) {
            stateEffect = defaultEffects[stateId];
        }

        // Indoors (a house, a cave) there is no weather: drop it at once instead of fading rain out inside the room
        if (gameState.world.isInterior) {
            this.targetWeatherId = stateId;
            this.targetIntensity = 0;
            this.renderIntensity = 0;
            this.displayEffect = 'none';
            this.particles = [];
            this.splashes.n = 0;
            return;
        }

        // ---------------------------------------------------------
        // 1. FIXED: Particle Initialization (Runs ONLY on change)
        // ---------------------------------------------------------
        if (this.targetWeatherId !== stateId) {
            this.targetWeatherId = stateId;

            // Only initialize new particles if it's not CLEAR
            if (stateId !== 'CLEAR' && stateEffect !== 'none') {
                if (this.displayEffect !== stateEffect) {
                    this.displayEffect = stateEffect;
                    this.initParticles(this.displayEffect);
                }
            }
        }

        // ---------------------------------------------------------
        // 2. FIXED: Sync Target Intensity (Runs EVERY FRAME)
        // ---------------------------------------------------------
        if (stateId === 'CLEAR' || stateEffect === 'none') {
            this.targetIntensity = 0; 
        } else {
            // Now continuously tracks the WeatherModel as it fades in/out!
            this.targetIntensity = (stateWeather.intensity !== undefined) ? stateWeather.intensity : 1.0;
        }

        // --- Smooth Fading Logic (Always active) ---
        if (this.renderIntensity !== this.targetIntensity) {
            const fadeSpeed = 0.5; // Takes 2 seconds
            
            if (this.renderIntensity < this.targetIntensity) {
                this.renderIntensity = Math.min(this.targetIntensity, this.renderIntensity + safeDt * fadeSpeed);
            } else {
                this.renderIntensity = Math.max(this.targetIntensity, this.renderIntensity - safeDt * fadeSpeed);
            }

            // Once fully cleared, clean up memory
            if (this.renderIntensity <= 0 && this.targetIntensity === 0) {
                this.displayEffect = 'none';
                this.particles = [];
                this.splashes.n = 0;
            }
        }

        // Early return if skies are fully clear
        if (this.displayEffect === 'none' || this.renderIntensity <= 0) return;

        let deltaX = 0;
        let deltaY = 0;
        
        if (this.lastCameraX !== null && this.lastCameraY !== null) {
            deltaX = (camera.x - this.lastCameraX) * this.config.GAME_SCALE;
            deltaY = (camera.y - this.lastCameraY) * this.config.GAME_SCALE;
            
            if (Math.abs(deltaX) > 240 || Math.abs(deltaY) > 240) { // Scaled from 100
                deltaX = 0; deltaY = 0;
            }
        }
        
        this.lastCameraX = camera.x;
        this.lastCameraY = camera.y;

        const fpsMultiplier = safeDt * 60; 

        // Update Splashes (a dead one is replaced by the last one in the arrays, so nothing is shifted or allocated)
        const s = this.splashes;
        for (let i = s.n - 1; i >= 0; i--) {
            const life = s.life[i] - s.decay[i] * fpsMultiplier;
            if (life <= 0) {
                const last = --s.n;
                if (i !== last) {
                    s.x[i] = s.x[last]; s.y[i] = s.y[last];
                    s.vx[i] = s.vx[last]; s.vy[i] = s.vy[last];
                    s.life[i] = s.life[last]; s.decay[i] = s.decay[last];
                }
                continue;
            }
            s.life[i] = life;
            s.x[i] += s.vx[i] * fpsMultiplier - deltaX;
            s.y[i] += s.vy[i] * fpsMultiplier - deltaY;
        }

        // Update Main Particles
        const active = this.displayEffect === 'overlay_fog' ? this.particles.length : this.activeCount();
        for (let i = 0; i < active; i++) {
            let p = this.particles[i];
            
            p.y += p.speedY * fpsMultiplier - deltaY;
            p.x += p.speedX * fpsMultiplier - deltaX;

            if (this.displayEffect === 'overlay_fog') {
                const pad = p.size / 2;
                const wrapWidth = this.canvas.width + p.size;
                const wrapHeight = this.canvas.height + p.size;
                
                if (p.x > this.canvas.width + pad) p.x -= wrapWidth;
                else if (p.x < -pad) p.x += wrapWidth;
                
                if (p.y > this.canvas.height + pad) p.y -= wrapHeight;
                else if (p.y < -pad) p.y += wrapHeight;
                continue; 
            }

            if (this.displayEffect === 'particle_sand' || this.displayEffect === 'particle_blizzard') {
                if (p.x > this.canvas.width + 120) p.x = -120; // Scaled from 50
                else if (p.x < -120) p.x = this.canvas.width + 120;

                if (p.y > this.canvas.height + 120) p.y = -120; // Scaled from 50
                else if (p.y < -120) p.y = this.canvas.height + 120;
                continue; 
            }

            if (this.displayEffect === 'particle_rain') {
                p.targetY -= deltaY; 
                if (p.y > p.targetY) {
                    this.createSplash(p.x, p.y);
                    this.resetParticle(p, this.displayEffect, false);
                    continue;
                }
            }

            if (p.y > this.canvas.height + 360 || p.x > this.canvas.width + 360 || p.x < -360) { // Scaled from 150
                this.resetParticle(p, this.displayEffect, false);
            }
        }
    }

    render(ctx, camera, totalTime = 0) {
        if (this.displayEffect === 'none' || this.renderIntensity <= 0) return;

        const settings = this.settings[this.displayEffect];
        if (!settings) return;

        if (this.displayEffect !== 'overlay_fog') this.watchFrameRate(performance.now());
        const active = this.activeCount();

        ctx.save();
        
        ctx.globalAlpha = this.renderIntensity; 

        if (this.displayEffect === 'overlay_fog') {
            // The fog is a few huge, soft clouds, so painting them at full size spent the whole frame filling pixels (25 clouds of up to
            // 1600px, overlapping). They are soft anyway: paint them into a quarter-size layer and stretch that over the screen once.
            const FOG_DOWN = 4;
            const lw = Math.ceil(this.canvas.width / FOG_DOWN), lh = Math.ceil(this.canvas.height / FOG_DOWN);
            if (!this.fogLayer || this.fogLayer.width !== lw || this.fogLayer.height !== lh) {
                this.fogLayer = document.createElement('canvas');
                this.fogLayer.width = lw;
                this.fogLayer.height = lh;
                this.fogLayerCtx = this.fogLayer.getContext('2d');
            }
            const lctx = this.fogLayerCtx;
            lctx.clearRect(0, 0, lw, lh);
            for (const p of this.particles) {
                const half = p.size / 2;
                // clouds that are completely off screen cost nothing
                if (p.x + half < 0 || p.y + half < 0 || p.x - half > this.canvas.width || p.y - half > this.canvas.height) continue;
                lctx.drawImage(this.fogPuffImage, (p.x - half) / FOG_DOWN, (p.y - half) / FOG_DOWN, p.size / FOG_DOWN, p.size / FOG_DOWN);
            }
            ctx.imageSmoothingEnabled = true;
            ctx.drawImage(this.fogLayer, 0, 0, lw, lh, 0, 0, this.canvas.width, this.canvas.height);
            ctx.restore();
            return; 
        }

        if (this.displayEffect === 'particle_blizzard') {
            // gusts: the white-out thickens and thins in slow waves (two sines that beat against each other, so it never settles into a pattern)
            const gust = 0.5 + 0.5 * Math.sin(totalTime * 0.55) * Math.sin(totalTime * 0.23 + 1);
            const [or, og, ob] = settings.overlay;
            ctx.fillStyle = `rgba(${or}, ${og}, ${ob}, ${0.24 + 0.14 * gust})`;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // flakes in three depth classes (far, middle, near), one path each; each is a short streak along the wind
            const alphas = [0.5, 0.7, 0.9];
            for (let cls = 0; cls < 3; cls++) {
                ctx.fillStyle = `rgba(245, 250, 255, ${alphas[cls] * (0.85 + 0.15 * gust)})`;
                ctx.beginPath();
                for (let i = 0; i < active; i++) {
                    const p = this.particles[i];
                    if (p.cls === cls) ctx.rect(p.x, p.y, p.size * 3.5, p.size);
                }
                ctx.fill();
            }
            ctx.restore();
            return;
        }

        if (this.splashes.n > 0) {
            // Each splash used to get its own opacity (a canvas state change per dot, thousands of times a frame). They fade over
            // a handful of frames, so they are drawn in four opacity steps instead, one pass per step.
            const s = this.splashes, n = s.n, STEPS = 4;
            ctx.fillStyle = settings.splashColor;
            for (let step = 0; step < STEPS; step++) {
                ctx.globalAlpha = ((step + 0.5) / STEPS) * this.renderIntensity;
                for (let i = 0; i < n; i++) {
                    if (Math.min(STEPS - 1, (s.life[i] * STEPS) | 0) === step) ctx.fillRect(s.x[i], s.y[i], 2.4, 2.4); // Scaled from 1, 1
                }
            }
            ctx.globalAlpha = this.renderIntensity; 
        }

        if (this.displayEffect === 'particle_sand') {
            // FIXED: Removed the renderIntensity multiplier from the rgba channel, 
            // since ctx.globalAlpha is already applying the overall fade!
            ctx.fillStyle = `rgba(90, 70, 40, 0.55)`; 
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        ctx.fillStyle = settings.color;
        ctx.strokeStyle = settings.color;
        
        if (this.displayEffect === 'particle_rain') {
            if (!this.rainAtlas) this.buildRainAtlas();
            const { image, cells } = this.rainAtlas;
            ctx.imageSmoothingEnabled = false;
            for (let i = 0; i < active; i++) {
                const p = this.particles[i];
                const c = cells[p.sprite];
                ctx.drawImage(image, c.sx, c.sy, c.w, c.h, Math.round(p.x - c.ox), Math.round(p.y - c.oy), c.w, c.h);
            }
        } else if (this.displayEffect === 'particle_sand') {
            ctx.beginPath();
            for (let i = 0; i < active; i++) {
                const p = this.particles[i];
                ctx.rect(p.x, p.y, p.size * 4, p.size); 
            }
            ctx.fill(); 
        }

        ctx.restore();
    }
}