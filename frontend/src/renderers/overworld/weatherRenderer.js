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

        this.settings = {
            'particle_rain': {
                count: 450, 
                color: 'rgba(200, 220, 255, 0.5)',
                splashColor: 'rgba(230, 240, 255, 0.6)',
                speedY: [25, 45], 
                speedX: [2, 5], 
                length: [6, 12] 
            },
            'particle_sand': {
                count: 600,
                color: 'rgba(210, 180, 140, 0.7)',
                speedY: [1, 3],  
                speedX: [20, 35], 
                size: [1, 2]      
            },
            'overlay_fog': {
                count: 40, 
                speedX: [0.1, 0.3], 
                speedY: [-0.1, 0.1], 
                size: [500, 800] 
            }
        };
    }

    createFogAsset() {
        const offscreen = document.createElement('canvas');
        const size = 256;
        offscreen.width = size;
        offscreen.height = size;
        const oCtx = offscreen.getContext('2d');

        const gradient = oCtx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
        gradient.addColorStop(0, 'rgba(220, 230, 245, 0.15)'); 
        gradient.addColorStop(0.5, 'rgba(220, 230, 245, 0.05)');
        gradient.addColorStop(1, 'rgba(220, 230, 245, 0)');

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
            x: Math.random() * (this.canvas.width + 600) - 300, 
            speedY: settings.speedY[0] + Math.random() * (settings.speedY[1] - settings.speedY[0]),
            speedX: settings.speedX[0] + Math.random() * (settings.speedX[1] - settings.speedX[0])
        };

        if (visualEffect === 'particle_sand' || visualEffect === 'overlay_fog' || randomizeY) {
            p.y = Math.random() * (this.canvas.height + 200) - 100;
        } else {
            p.y = -100 - (Math.random() * 200);
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

        return p;
    }

    createSplash(x, y) {
        for (let i = 0; i < 3; i++) {
            this.splashParticles.push({
                x: x,
                y: y,
                speedX: (Math.random() * 2) - 1,
                speedY: (Math.random() * 2) - 1,
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
            'FOG': 'overlay_fog'
        };
        
        let stateEffect = 'none';
        if (stateWeather && stateWeather.visualEffect && stateWeather.visualEffect !== 'none') {
            stateEffect = stateWeather.visualEffect;
        } else if (defaultEffects[stateId]) {
            stateEffect = defaultEffects[stateId];
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
            
            if (Math.abs(deltaX) > 100 || Math.abs(deltaY) > 100) {
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

            if (this.displayEffect === 'particle_sand') {
                if (p.x > this.canvas.width + 50) p.x = -50;
                else if (p.x < -50) p.x = this.canvas.width + 50;

                if (p.y > this.canvas.height + 50) p.y = -50;
                else if (p.y < -50) p.y = this.canvas.height + 50;
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

            if (p.y > this.canvas.height + 150 || p.x > this.canvas.width + 150 || p.x < -150) {
                this.particles[i] = this.createParticle(this.displayEffect, false);
            }
        }
    }

    render(ctx, camera) {
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

        if (this.splashParticles.length > 0) {
            ctx.fillStyle = settings.splashColor;
            for (const p of this.splashParticles) {
                ctx.globalAlpha = p.life * this.renderIntensity;
                ctx.fillRect(p.x, p.y, 1, 1); 
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
            ctx.lineWidth = 1.0; 
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