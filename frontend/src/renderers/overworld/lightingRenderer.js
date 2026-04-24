import { gameState } from '../../../../shared/state/gameState.js';

export class LightingRenderer {
  constructor(config) {
    this.config = config;
    this.overlay = document.createElement('canvas');
    this.oCtx = this.overlay.getContext('2d');
  }

  // Changed 'camera' to 'renderCamera' in parameters for clarity
  render(ctx, baseAmbientData, renderCamera, entities, mapObjects = []) {
    // --- NEW: BLEND DAY/NIGHT WITH WEATHER ---
    let finalR = baseAmbientData.r;
    let finalG = baseAmbientData.g;
    let finalB = baseAmbientData.b;
    let finalA = baseAmbientData.a;
    const activeWeather = gameState.world.currentWeather;

    if (activeWeather && activeWeather.visualEffect === 'particle_rain') {
      const intensity = activeWeather.intensity || 1.0;
      const stormR = 15;
      const stormG = 20;
      const stormB = 35;
      const stormMaxAlpha = 0.65;

      finalR = Math.floor((finalR * (1 - intensity)) + (stormR * intensity));
      finalG = Math.floor((finalG * (1 - intensity)) + (stormG * intensity));
      finalB = Math.floor((finalB * (1 - intensity)) + (stormB * intensity));
      finalA = Math.max(finalA, stormMaxAlpha * intensity);
    }

    // 1. If completely bright (alpha 0 or less), do nothing
    if (finalA <= 0) return;

    const { width, height } = ctx.canvas;
    const { TILE_SIZE, GAME_SCALE } = this.config;

    // Resize overlay if window changed
    if (this.overlay.width !== width || this.overlay.height !== height) {
      this.overlay.width = width;
      this.overlay.height = height;
    }

    // --- FIX: ONLY CALCULATE SCALE ---
    // The MapRenderer already applied the center offsets. 
    // We only need the scale so we can draw the light radii correctly.
    const baseWidth = 800;
    const resScale = width / baseWidth;
    const scale = GAME_SCALE * resScale;

    // --------------------------------------------------------

    // 2. Fill Darkness (Using our new blended color)
    this.oCtx.clearRect(0, 0, width, height);
    this.oCtx.fillStyle = `rgba(${finalR}, ${finalG}, ${finalB}, ${finalA})`;
    this.oCtx.fillRect(0, 0, width, height);

    // 3. Cut Holes
    this.oCtx.globalCompositeOperation = 'destination-out';

    // --- A. GENERIC ENTITY LIGHTS ---
    if (entities) {
      entities.forEach(ent => {
        if (ent.light && ent.light.hasLight) {
          const centerX = ent.x + (ent.width || TILE_SIZE) / 2;
          const centerY = ent.y + (ent.height || TILE_SIZE) / 2;
          this.drawLightPoint(this.oCtx, renderCamera, centerX, centerY, ent.light, scale);
        }
      });
    }

    // --- B. GENERIC MAP OBJECT LIGHTS ---
    if (mapObjects) {
      mapObjects.forEach(obj => {
        if (obj.light && obj.light.hasLight) {
          const pixelX = (obj.col * TILE_SIZE) + (obj.w * TILE_SIZE / 2);
          const pixelY = (obj.row * TILE_SIZE) + (obj.h * TILE_SIZE / 2);
          this.drawLightPoint(this.oCtx, renderCamera, pixelX, pixelY, obj.light, scale);
        }
      });
    }

    // 4. Draw to Screen
    this.oCtx.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.overlay, 0, 0);
  }

  drawLightPoint(ctx, renderCamera, worldPixelX, worldPixelY, lightConfig, scale) {
    const { TILE_SIZE } = this.config;

    const screenX = Math.floor((worldPixelX - renderCamera.x) * scale);
    const screenY = Math.floor((worldPixelY - renderCamera.y) * scale);

    let finalRadius = lightConfig.radius * TILE_SIZE;

    if (lightConfig.flickerAmp) {
      const time = Date.now() * 0.005;
      const noise = (Math.sin(time) + Math.sin(time * 3) * 0.5) * 0.1;
      finalRadius += (noise * lightConfig.flickerAmp * TILE_SIZE);
    }

    if (finalRadius < 0) finalRadius = 0;
    const scaledRadius = finalRadius * scale;

    try {
      const gradient = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, scaledRadius);
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