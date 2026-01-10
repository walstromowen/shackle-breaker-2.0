import { SPRITES } from '../../../../shared/data/sprites.js';

export class LightingRenderer {
    constructor(config) {
        this.config = config;
        this.overlay = document.createElement('canvas');
        this.oCtx = this.overlay.getContext('2d');
    }

    render(ctx, ambientData, camera, entities, mapObjects = []) {
        // 1. If bright day (alpha 0 or less), do nothing
        if (ambientData.a <= 0) return;

        const { width, height } = ctx.canvas;
        const { TILE_SIZE } = this.config;

        // Resize overlay if window changed
        if (this.overlay.width !== width || this.overlay.height !== height) {
            this.overlay.width = width;
            this.overlay.height = height;
        }

        // 2. Fill Darkness
        this.oCtx.clearRect(0, 0, width, height);
        this.oCtx.fillStyle = `rgba(${ambientData.r}, ${ambientData.g}, ${ambientData.b}, ${ambientData.a})`;
        this.oCtx.fillRect(0, 0, width, height);

        // 3. Cut Holes
        this.oCtx.globalCompositeOperation = 'destination-out';

        // --- A. GENERIC ENTITY LIGHTS (Player, Enemies, NPCs) ---
        if (entities) {
            entities.forEach(ent => {
                // Check if the entity has the new 'light' config object
                if (ent.light && ent.light.hasLight) {
                    // Calculate center of entity in PIXELS
                    // (Assuming ent.x/y are top-left)
                    const centerX = ent.x + (ent.width || TILE_SIZE) / 2;
                    const centerY = ent.y + (ent.height || TILE_SIZE) / 2;

                    this.drawLightPoint(this.oCtx, camera, centerX, centerY, ent.light);
                }
            });
        }

        // --- B. GENERIC MAP OBJECT LIGHTS (Campfires, Lamps) ---
        if (mapObjects) {
            mapObjects.forEach(obj => {
                // Check if the object has the new 'light' config object
                if (obj.light && obj.light.hasLight) {
                    // Calculate center of object in PIXELS
                    // (Assuming obj.col/row are grid coordinates)
                    const pixelX = (obj.col * TILE_SIZE) + (obj.w * TILE_SIZE / 2);
                    const pixelY = (obj.row * TILE_SIZE) + (obj.h * TILE_SIZE / 2);

                    this.drawLightPoint(this.oCtx, camera, pixelX, pixelY, obj.light);
                }
            });
        }

        // 4. Draw to Screen
        this.oCtx.globalCompositeOperation = 'source-over'; 
        ctx.drawImage(this.overlay, 0, 0);
    }

    /**
     * Draws a light at a specific PIXEL location in the world.
     * Updated to support the 'lightConfig' object and Sine-wave flicker.
     */
    drawLightPoint(ctx, camera, worldPixelX, worldPixelY, lightConfig) {
        const { GAME_SCALE, TILE_SIZE } = this.config;

        // 1. Calculate Screen Position (Pixels)
        const screenX = Math.floor((worldPixelX - camera.x) * GAME_SCALE);
        const screenY = Math.floor((worldPixelY - camera.y) * GAME_SCALE);

        // 2. Base Radius calculation
        let finalRadius = lightConfig.radius * TILE_SIZE;

        // 3. Apply Smooth Flicker (Sine Wave Math)
        if (lightConfig.flickerAmp) {
            const time = Date.now() * 0.005; 
            // Combine two waves for organic "fire" noise
            const noise = (Math.sin(time) + Math.sin(time * 3) * 0.5) * 0.1; 
            finalRadius += (noise * lightConfig.flickerAmp * TILE_SIZE);
        }

        // Safety: Prevent negative radius crashes
        if (finalRadius < 0) finalRadius = 0;

        // 4. Scale Radius for the Canvas
        const scaledRadius = finalRadius * GAME_SCALE;

        // 5. Draw Gradient
        try {
            const gradient = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, scaledRadius);
            
            // 'destination-out' uses Alpha to determine how much darkness to remove.
            // Alpha 1.0 = Fully remove darkness (Brightest)
            // Alpha 0.0 = Remove no darkness (Darkest)
            const maxAlpha = lightConfig.maxAlpha || 1.0;
            
            gradient.addColorStop(0, `rgba(0, 0, 0, ${maxAlpha})`); 
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(screenX, screenY, scaledRadius, 0, Math.PI * 2);
            ctx.fill();
        } catch (e) {
            // Suppress radius errors silently
        }
    }
}