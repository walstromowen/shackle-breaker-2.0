import { gameState } from '../../../../shared/state/gameState.js';

export class WeatherRenderer {
    // --- UPDATED: Added loader parameter ---
    constructor(canvas, ctx, config, loader) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.config = config;
        this.loader = loader; 
        
        this.particles = [];
        this.currentWeatherId = null;
        
        this.lastCameraX = null;
        this.lastCameraY = null;

        this.settings = {
            'particle_rain': {
                count: 300,
                color: 'rgba(150, 180, 255, 0.6)',
                speedY: [15, 25], 
                speedX: [-2, 2],  
                length: [10, 20], 
                width: 1.5
            },
            'particle_sand': {
                count: 400,
                color: 'rgba(210, 180, 140, 0.7)',
                speedY: [2, 5],
                speedX: [15, 25], 
                size: [1, 3]      
            },
            'overlay_fog': {
                color: 'rgba(200, 200, 210, 0.4)', 
                scrollSpeedX: 0.5,
                scrollSpeedY: 0.2
            }
        };

        this.fogOffsetX = 0;
        this.fogOffsetY = 0;

        // --- NEW: FETCH FROM ASSET LOADER ---
        // Assuming your manifest uses the key 'fog_texture'
        this.fogTexture = this.loader.get('fog_texture');

        // Fallback: If not in manifest, generate it so the game doesn't crash
        if (!this.fogTexture) {
            console.warn("WeatherRenderer: 'fog_texture' missing from AssetLoader. Falling back to procedural generation.");
            this.fogTexture = new Image();
            this.fogTexture.src = this.generateProceduralFog(640, 360);
        }
    }

    /**
     * Creates a seamless cloud/fog texture using overlapping radial gradients.
     * Used as a fallback if the AssetLoader doesn't have an image.
     */
    generateProceduralFog(width, height) {
        const offscreen = document.createElement('canvas');
        offscreen.width = width;
        offscreen.height = height;
        const oCtx = offscreen.getContext('2d');

        const cloudCount = 80;

        for (let i = 0; i < cloudCount; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const radius = 40 + Math.random() * 80;
            
            const gradient = oCtx.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, 'rgba(230, 230, 240, 0.12)'); 
            gradient.addColorStop(1, 'rgba(230, 230, 240, 0)');    

            oCtx.fillStyle = gradient;

            const offsets = [-1, 0, 1];
            for (let ox of offsets) {
                for (let oy of offsets) {
                    oCtx.save();
                    oCtx.translate(ox * width, oy * height);
                    oCtx.beginPath();
                    oCtx.arc(x, y, radius, 0, Math.PI * 2);
                    oCtx.fill();
                    oCtx.restore();
                }
            }
        }

        return offscreen.toDataURL('image/png');
    }

    initParticles(visualEffect) {
        this.particles = [];
        const settings = this.settings[visualEffect];
        if (!settings || !settings.count) return;

        for (let i = 0; i < settings.count; i++) {
            this.particles.push(this.createParticle(visualEffect, true));
        }
    }

    createParticle(visualEffect, randomizeY = false) {
        const settings = this.settings[visualEffect];
        
        let p = {
            x: Math.random() * this.canvas.width,
            y: randomizeY ? Math.random() * this.canvas.height : -50,
            speedY: settings.speedY[0] + Math.random() * (settings.speedY[1] - settings.speedY[0]),
            speedX: settings.speedX[0] + Math.random() * (settings.speedX[1] - settings.speedX[0])
        };

        if (visualEffect === 'particle_sand' && !randomizeY) {
            p.x = -50;
            p.y = Math.random() * this.canvas.height;
        }

        if (settings.length) p.length = settings.length[0] + Math.random() * (settings.length[1] - settings.length[0]);
        if (settings.size) p.size = settings.size[0] + Math.random() * (settings.size[1] - settings.size[0]);

        return p;
    }

    update(dt, camera) {
        const activeWeather = gameState.world.currentWeather; 
        
        if (!activeWeather || activeWeather.visualEffect === 'none') {
            this.particles = [];
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
                deltaX = 0;
                deltaY = 0;
            }
        }
        
        this.lastCameraX = camera.x;
        this.lastCameraY = camera.y;

        if (visualEffect === 'overlay_fog') {
            const settings = this.settings[visualEffect];
            this.fogOffsetX += settings.scrollSpeedX - deltaX;
            this.fogOffsetY += settings.scrollSpeedY - deltaY;
            return;
        }

        const fpsMultiplier = dt * 60; 

        for (let i = 0; i < this.particles.length; i++) {
            let p = this.particles[i];
            
            p.y += p.speedY * fpsMultiplier;
            p.x += p.speedX * fpsMultiplier;

            p.x -= deltaX;
            p.y -= deltaY;

            if (p.y > this.canvas.height + 50 || p.x > this.canvas.width + 50 || p.x < -100) {
                this.particles[i] = this.createParticle(visualEffect, false);
            }
        }
    }

    render(ctx, camera, totalTime) {
        const activeWeather = gameState.world.currentWeather;
        if (!activeWeather || activeWeather.visualEffect === 'none') return;

        const effect = activeWeather.visualEffect;
        const settings = this.settings[effect];

        ctx.save();
        
        // Apply the smooth fade intensity we set up earlier!
        ctx.globalAlpha = activeWeather.intensity || 1.0;

        // --- NEW: DRAW TEXTURED FOG ---
        if (effect === 'overlay_fog') {
            // Only draw the texture if the image has successfully loaded
            if (this.fogTexture && this.fogTexture.complete && this.fogTexture.width > 0) {
                
                // 1. Calculate the wrapping offset
                let startX = this.fogOffsetX % this.fogTexture.width;
                let startY = this.fogOffsetY % this.fogTexture.height;

                // 2. Adjust for negative values to ensure we always start drawing off-screen
                if (startX > 0) startX -= this.fogTexture.width;
                if (startY > 0) startY -= this.fogTexture.height;

                // 3. Draw a grid of the image to completely cover the canvas
                for (let x = startX; x < this.canvas.width; x += this.fogTexture.width) {
                    for (let y = startY; y < this.canvas.height; y += this.fogTexture.height) {
                        ctx.drawImage(this.fogTexture, x, y, this.fogTexture.width, this.fogTexture.height);
                    }
                }
            } else {
                // Fallback to solid semi-transparent color if the image is missing/loading
                ctx.fillStyle = settings.color;
                ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            }
            
            ctx.restore();
            return;
        }

        // --- DRAW PARTICLES (Rain / Sand) ---
        ctx.fillStyle = settings.color;
        ctx.strokeStyle = settings.color;
        ctx.lineWidth = settings.width || 1;

        ctx.beginPath();
        for (const p of this.particles) {
            if (effect === 'particle_rain') {
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x - p.speedX, p.y - p.length);
            } else if (effect === 'particle_sand') {
                ctx.fillRect(p.x, p.y, p.size, p.size);
            }
        }
        
        if (effect === 'particle_rain') {
            ctx.stroke();
        }

        ctx.restore();
    }
}