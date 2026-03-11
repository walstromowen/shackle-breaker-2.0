import { gameState } from '../../../../shared/state/gameState.js';

export class WeatherRenderer {
    constructor(canvas, ctx, config) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.config = config;
        
        this.particles = [];
        this.splashParticles = []; 
        this.currentWeatherId = null;
        
        this.lastCameraX = null;
        this.lastCameraY = null;

        // Pre-render a single, perfectly smooth fog puff to use as a stamp
        this.fogPuffImage = this.createFogAsset();

        this.settings = {
            'particle_rain': {
                count: 450, 
                color: 'rgba(200, 220, 255, 0.5)', // Slightly more transparent
                splashColor: 'rgba(230, 240, 255, 0.6)',
                // --- ADJUSTED: Slower, shorter, tighter rain for top-down perspective ---
                speedY: [25, 45], 
                speedX: [2, 5], 
                length: [6, 12] 
            },
            'particle_sand': {
                count: 400,
                color: 'rgba(210, 180, 140, 0.7)',
                speedY: [2, 5],
                speedX: [15, 25], 
                size: [1, 3]      
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
            y: randomizeY ? Math.random() * this.canvas.height : -100 - (Math.random() * 200),
            speedY: settings.speedY[0] + Math.random() * (settings.speedY[1] - settings.speedY[0]),
            speedX: settings.speedX[0] + Math.random() * (settings.speedX[1] - settings.speedX[0])
        };

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
            p.x = Math.random() * (this.canvas.width + p.size) - (p.size / 2);
            p.y = Math.random() * (this.canvas.height + p.size) - (p.size / 2);
        }

        if (settings.size && visualEffect !== 'overlay_fog') {
            p.size = settings.size[0] + Math.random() * (settings.size[1] - settings.size[0]);
        }

        return p;
    }

    createSplash(x, y) {
        for (let i = 0; i < 3; i++) {
            this.splashParticles.push({
                x: x,
                y: y,
                // --- ADJUSTED: Tighter splash burst ---
                speedX: (Math.random() * 2) - 1,
                speedY: (Math.random() * 2) - 1,
                life: 1.0,
                decay: 0.1 + (Math.random() * 0.05) // Fades quickly
            });
        }
    }

    update(dt, camera) {
        const activeWeather = gameState.world.currentWeather; 
        
        if (!activeWeather || activeWeather.visualEffect === 'none') {
            this.particles = [];
            this.splashParticles = [];
            this.currentWeatherId = null;
            return;
        }

        const visualEffect = activeWeather.visualEffect;

        if (this.currentWeatherId !== activeWeather.id) {
            this.currentWeatherId = activeWeather.id;
            this.initParticles(visualEffect);
        }

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

        const fpsMultiplier = dt * 60; 

        for (let i = this.splashParticles.length - 1; i >= 0; i--) {
            let p = this.splashParticles[i];
            p.life -= p.decay * fpsMultiplier;
            if (p.life <= 0) {
                this.splashParticles.splice(i, 1);
                continue;
            }
            p.x += p.speedX * fpsMultiplier;
            p.y += p.speedY * fpsMultiplier;
            
            p.x -= deltaX;
            p.y -= deltaY;
        }

        for (let i = 0; i < this.particles.length; i++) {
            let p = this.particles[i];
            
            p.y += p.speedY * fpsMultiplier;
            p.x += p.speedX * fpsMultiplier;

            p.x -= deltaX;
            p.y -= deltaY;

            if (visualEffect === 'overlay_fog') {
                const pad = p.size / 2;
                const wrapWidth = this.canvas.width + p.size;
                const wrapHeight = this.canvas.height + p.size;
                
                if (p.x > this.canvas.width + pad) p.x -= wrapWidth;
                else if (p.x < -pad) p.x += wrapWidth;
                
                if (p.y > this.canvas.height + pad) p.y -= wrapHeight;
                else if (p.y < -pad) p.y += wrapHeight;
                continue; 
            }

            if (visualEffect === 'particle_rain') {
                p.targetY -= deltaY; 
                
                if (p.y > p.targetY) {
                    this.createSplash(p.x, p.y);
                    this.particles[i] = this.createParticle(visualEffect, false);
                    continue;
                }
            }

            if (p.y > this.canvas.height + 150 || p.x > this.canvas.width + 150 || p.x < -150) {
                this.particles[i] = this.createParticle(visualEffect, false);
            }
        }
    }

    render(ctx, camera) {
        const activeWeather = gameState.world.currentWeather;
        if (!activeWeather || activeWeather.visualEffect === 'none') return;

        const effect = activeWeather.visualEffect;
        const settings = this.settings[effect];
        const intensity = activeWeather.intensity || 1.0;

        ctx.save();
        ctx.globalAlpha = intensity;

        if (effect === 'overlay_fog') {
            for (const p of this.particles) {
                ctx.drawImage(this.fogPuffImage, p.x - (p.size/2), p.y - (p.size/2), p.size, p.size);
            }
            ctx.restore();
            return; 
        }

        if (this.splashParticles.length > 0) {
            ctx.fillStyle = settings.splashColor;
            for (const p of this.splashParticles) {
                ctx.globalAlpha = p.life * intensity;
                // --- ADJUSTED: Splashes are now tiny 1x1 droplets ---
                ctx.fillRect(p.x, p.y, 1, 1); 
            }
            ctx.globalAlpha = intensity; 
        }

        ctx.fillStyle = settings.color;
        ctx.strokeStyle = settings.color;
        
        if (effect === 'particle_rain') {
            // --- ADJUSTED: Thinner lines ---
            ctx.lineWidth = 1.0; 
            ctx.lineCap = 'round'; 
            ctx.beginPath();
            for (const p of this.particles) {
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x - p.speedX, p.y - p.length);
            }
            ctx.stroke();
        } else if (effect === 'particle_sand') {
            ctx.beginPath();
            for (const p of this.particles) {
                ctx.fillRect(p.x, p.y, p.size, p.size);
            }
        }

        ctx.restore();
    }
}