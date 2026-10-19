import { gameState } from '../../../../shared/state/gameState.js';

export class WeatherRenderer {
    constructor(canvas, ctx, config) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.config = config;
        
        this.particles = [];
        this.splashParticles = []; 
        
        // --- UPDATED INTERNAL STATE ---
        this.targetWeatherId = 'CLEAR';
        this.displayEffect = 'none';
        this.renderIntensity = 0; 
        this.targetIntensity = 0;
        
        this.lastCameraX = null;
        this.lastCameraY = null;

        this.fogPuffImage = this.createFogAsset();

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
        this.splashParticles = [];
        const settings = this.settings[visualEffect];
        if (!settings || !settings.count) return;

        for (let i = 0; i < settings.count; i++) {
            this.particles.push(this.createParticle(visualEffect, true));
        }
    }

    createParticle(visualEffect, randomizeY = false) {
        const settings = this.settings[visualEffect];
        
        let p = {
            x: Math.random() * (this.canvas.width + 1440) - 720, // Scaled from +600, -300
            speedY: settings.speedY[0] + Math.random() * (settings.speedY[1] - settings.speedY[0]),
            speedX: settings.speedX[0] + Math.random() * (settings.speedX[1] - settings.speedX[0])
        };

        if (visualEffect === 'particle_sand' || visualEffect === 'particle_blizzard' || visualEffect === 'overlay_fog' || randomizeY) {
            p.y = Math.random() * (this.canvas.height + 480) - 240; // Scaled from +200, -100
        } else {
            p.y = -240 - (Math.random() * 480); // Scaled from -100, 200
        }

        if (visualEffect === 'particle_rain') {
            p.length = settings.length[0] + Math.random() * (settings.length[1] - settings.length[0]);
            
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
        for (let i = 0; i < 3; i++) {
            this.splashParticles.push({
                x: x,
                y: y,
                speedX: (Math.random() * 4.8) - 2.4, // Scaled from *2, -1
                speedY: (Math.random() * 4.8) - 2.4, // Scaled from *2, -1
                life: 1.0,
                decay: 0.1 + (Math.random() * 0.05)
            });
        }
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
            this.splashParticles = [];
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
                this.splashParticles = [];
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

        // Update Splashes
        for (let i = this.splashParticles.length - 1; i >= 0; i--) {
            let p = this.splashParticles[i];
            p.life -= p.decay * fpsMultiplier;
            if (p.life <= 0) {
                this.splashParticles.splice(i, 1);
                continue;
            }
            p.x += p.speedX * fpsMultiplier - deltaX;
            p.y += p.speedY * fpsMultiplier - deltaY;
        }

        // Update Main Particles
        for (let i = 0; i < this.particles.length; i++) {
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
                    this.particles[i] = this.createParticle(this.displayEffect, false);
                    continue;
                }
            }

            if (p.y > this.canvas.height + 360 || p.x > this.canvas.width + 360 || p.x < -360) { // Scaled from 150
                this.particles[i] = this.createParticle(this.displayEffect, false);
            }
        }
    }

    render(ctx, camera, totalTime = 0) {
        if (this.displayEffect === 'none' || this.renderIntensity <= 0) return;

        const settings = this.settings[this.displayEffect];
        if (!settings) return;

        ctx.save();
        
        ctx.globalAlpha = this.renderIntensity; 

        if (this.displayEffect === 'overlay_fog') {
            for (const p of this.particles) {
                ctx.drawImage(this.fogPuffImage, p.x - (p.size/2), p.y - (p.size/2), p.size, p.size);
            }
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
                for (const p of this.particles) {
                    if (p.cls === cls) ctx.rect(p.x, p.y, p.size * 3.5, p.size);
                }
                ctx.fill();
            }
            ctx.restore();
            return;
        }

        if (this.splashParticles.length > 0) {
            ctx.fillStyle = settings.splashColor;
            for (const p of this.splashParticles) {
                ctx.globalAlpha = p.life * this.renderIntensity;
                ctx.fillRect(p.x, p.y, 2.4, 2.4); // Scaled from 1, 1 
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
            ctx.lineWidth = 2.4; // Scaled from 1.0 
            ctx.lineCap = 'round'; 
            ctx.beginPath();
            for (const p of this.particles) {
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x - p.speedX, p.y - p.length);
            }
            ctx.stroke(); 
        } else if (this.displayEffect === 'particle_sand') {
            ctx.beginPath();
            for (const p of this.particles) {
                ctx.rect(p.x, p.y, p.size * 4, p.size); 
            }
            ctx.fill(); 
        }

        ctx.restore();
    }
}