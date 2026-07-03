import { CanvasUI } from '../../ui/canvasUI.js';
import { UITheme } from '../../ui/UITheme.js';
import { events } from '../../core/eventBus.js';
import { BattleCombatantRenderer } from './battleCombatantRenderer.js';
import { BattleHUDRenderer } from './battleHUDRenderer.js';
import { BattleDebuggerRenderer } from './battleDebuggerRenderer.js';
import { VFXRenderer } from './VFXRenderer.js';

export class BattleRenderer {
    constructor(ctx, config, loader) {
        this.ctx = ctx;
        this.config = config;
        this.loader = loader;
        this.ui = new CanvasUI(ctx);

        // --- SUBCOMPONENTS ---
        this.vfxRenderer = new VFXRenderer(ctx, loader);
        this.combatantRenderer = new BattleCombatantRenderer(ctx, config, loader, this.ui, this.vfxRenderer);
        this.hudRenderer = new BattleHUDRenderer(ctx, config, loader, this.ui, this.combatantRenderer);
        this.debugRenderer = new BattleDebuggerRenderer(ctx, config);

        this.showDebug = false;
        this.lastTime = performance.now();
        this.dt = 0;
        this.floatingTexts = [];
        this.currentState = null;

        // Map floating text palette strictly to centralized UITheme base vitals
        this.COLORS = {
            hp: UITheme.colors.hp,
            stm: UITheme.colors.stm,
            ins: UITheme.colors.ins,
            highlight: UITheme.colors.borderHighlight,
            textMain: UITheme.colors.textMain,
            textMuted: UITheme.colors.textMuted
        };

        // Event Listeners
        events.on('SPAWN_FCT', (payload) => {
            if (!this.currentState) return;
            this.spawnFloatingText(payload);
        });

        events.on('SPAWN_VFX', (payload) => {
            this.vfxRenderer.spawn(payload);
        });
        
        events.on('SPAWN_VFX_BURST', ({ x, y, count, config }) => {
            this.vfxRenderer.spawnBurst(x, y, count, config);
        });

        events.on('TOGGLE_BATTLE_DEBUG', () => {
            this.showDebug = !this.showDebug;
        });
    }

    render(state) {
        if (!state) return;
        this.currentState = state;
        
        const { CANVAS_WIDTH, CANVAS_HEIGHT } = this.config;
        const now = performance.now();
        this.dt = Math.min((now - (this.lastTime || now)) / 1000, 0.1);
        this.lastTime = now;

        // --- PIPELINE HITBOX INJECTION ---
        const hitboxes = [];

        // --- Update Systems ---
        this.vfxRenderer.update(this.dt);

        // --- Audio & VFX Sync Logic ---
        const anim = state.activeAnimation;
        if (anim) {
            const progress = (state.timer !== undefined && anim.duration) 
                ? Math.min(state.timer / anim.duration, 1.0) 
                : 0;

            if (typeof anim.getAudioTriggers === 'function') {
                const audioCues = anim.getAudioTriggers(progress);
                audioCues.forEach(cue => {
                    events.emit('PLAY_SFX', { id: cue.key, volume: cue.volume || 1.0, pitch: cue.pitch || 1.0 });
                });
            }

            if (typeof anim.getVFXTriggers === 'function') {
                const vfxCues = anim.getVFXTriggers(progress);
                if (vfxCues.length > 0) {
                    const centerPos = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };
                    const sourcePos = this.combatantRenderer.getEntityPosition(anim.actor, state) || centerPos;
                    const targetPos = (anim.targets && anim.targets.length > 0) ? 
                        (this.combatantRenderer.getEntityPosition(anim.targets[0], state) || sourcePos) : sourcePos;
                    
                    // --- BULLETPROOF ENEMY CHECK ---
// Safely evaluate if the actor is an enemy, handling both Object and String ID references
const isEnemy = state.activeEnemies ? state.activeEnemies.some(e => e === anim.actor || e.id === (anim.actor?.id || anim.actor)) : false;

vfxCues.forEach(cue => {
  // Avoid double-flipping: Auto-rotation already mathematically points towards the target!
  const isAutoRotate = cue.config.rotation === 'auto';

  // Inject flip flags securely into the config
const enhancedConfig = {
  ...cue.config,
  flipY: cue.config.flipY !== undefined ? cue.config.flipY : false, // Keeping this false stops it from going upside down
  flipX: cue.config.flipX !== undefined ? cue.config.flipX : (isAutoRotate ? false : isEnemy)
};

  // --- MULTI-TARGET MULTIPLEXER ---
  // If the effect is a flat 'spawn' or a particle 'burst' on the target, 
  // duplicate it for each target individual in a splash attack.
  if (cue.origin === 'target' && (cue.type === 'spawn' || cue.type === 'burst') && anim.targets && anim.targets.length > 0) {
    
    anim.targets.forEach(target => {
      const tPos = this.combatantRenderer.getEntityPosition(target, state) || sourcePos;
      
      if (cue.type === 'burst') {
        this.vfxRenderer.spawnBurst(tPos.x, tPos.y, cue.count || 10, enhancedConfig);
      } else if (cue.type === 'spawn') {
        this.vfxRenderer.spawn({ ...enhancedConfig, startX: tPos.x, startY: tPos.y });
      }
    });

  } else {
    // --- STANDARD FALLBACK ---
    // Runs normally if the origin is the source actor, or if it's a 'traveling' projectile
    let startX = cue.origin === 'target' ? targetPos.x : sourcePos.x;
    let startY = cue.origin === 'target' ? targetPos.y : sourcePos.y;

    if (cue.type === 'burst') {
      this.vfxRenderer.spawnBurst(startX, startY, cue.count || 10, enhancedConfig);
    } else if (cue.type === 'travel') {
      this.vfxRenderer.spawn({ 
        ...enhancedConfig, 
        startX: sourcePos.x, 
        startY: sourcePos.y, 
        endX: targetPos.x, 
        endY: targetPos.y, 
        movement: cue.config.movement || 'linear' 
      });
    } else if (cue.type === 'spawn') {
      this.vfxRenderer.spawn({ ...enhancedConfig, startX: startX, startY: startY });
    }
  }
});
                }
            }
        }

        this.ctx.imageSmoothingEnabled = false;

        // =========================================================================
        // 1. Draw Background
        // =========================================================================
        const baseBgKey = state.backgroundId || 'plainsBattleDayBg';
        const baseBgImg = this.loader.get ? this.loader.get(baseBgKey) : this.loader.getAsset(baseBgKey);
        
        const bgOffsetX = 0;
        const bgOffsetY = 0;

        if (baseBgImg) {
            this.ctx.drawImage(baseBgImg, bgOffsetX, bgOffsetY, CANVAS_WIDTH, CANVAS_HEIGHT);
        } else {
            this.ctx.fillStyle = UITheme.colors.background;
            this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }

        const gradient = this.ctx.createRadialGradient(
            CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_HEIGHT * 0.2,
            CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_HEIGHT * 0.9
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.7)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        if (anim && typeof anim.getActiveBackground === 'function') {
            const progress = (state.timer !== undefined && anim.duration) 
                ? Math.min(state.timer / anim.duration, 1.0) 
                : 0;
            const activeBg = anim.getActiveBackground(progress);

            if (activeBg) {
                this.ctx.save();
                this.ctx.globalAlpha = activeBg.alpha !== undefined ? activeBg.alpha : 1.0;
                
                if (activeBg.filter && activeBg.filter !== 'none') {
                    this.ctx.filter = activeBg.filter;
                }

                const overrideKey = (!activeBg.key || activeBg.key === 'current') ? baseBgKey : activeBg.key;
                const overrideImg = this.loader.get ? this.loader.get(overrideKey) : this.loader.getAsset(overrideKey);
                
                if (overrideImg) {
                    this.ctx.drawImage(overrideImg, bgOffsetX, bgOffsetY, CANVAS_WIDTH, CANVAS_HEIGHT);
                } else {
                    this.ctx.fillStyle = UITheme.colors.background;
                    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                }

                this.ctx.restore();
            }
        }

        // 2. Draw Entities
        this.combatantRenderer.drawGroup(state.activeEnemies, false, state, hitboxes);
        this.combatantRenderer.drawGroup(state.activeParty, true, state, hitboxes);

        // 3. Draw VFX
        this.vfxRenderer.render();

        // 4. Draw HUD & Menus
        this.hudRenderer.render(state, this.dt, hitboxes);

        // 5. Draw Floating Combat Text
        this.drawFloatingTexts(this.dt);

        // 6. Draw Debug Overlay
        if (this.showDebug) {
            this.debugRenderer.render(state);
        }

        // --- PIPELINE COMMIT ---
        if (state.onLayoutUpdate) {
            state.onLayoutUpdate(hitboxes);
        }
    }

    spawnFloatingText({ target, value, resource, text, type, isCritical, delay = 0 }) {
  const pos = this.combatantRenderer.getEntityPosition(target, this.currentState);
  if (!pos) return;

  let displayText = text;
  let color = this.COLORS.textMain;
  let fontSize = isCritical ? 86 : 53;

  if (value !== undefined) {
    const isGain = value > 0;
    const prefix = isGain ? '+' : '';
    displayText = `${prefix}${Math.round(value)}`;

    // --- FIXED RESOURCE MAPPING ---
    if (resource === 'hp') {
      color = this.COLORS.hp; // #8c1c1c (Dark Crimson)
    } else if (resource === 'stamina' || resource === 'stm') {
      color = this.COLORS.stm; // #4a5d4e (Muted Moss Green)
    } else if (resource === 'insight' || resource === 'ins') {
      color = this.COLORS.ins; // #4a5b70 (Deep Slate Blue)
    }
    
    // REMOVED: "if (isCritical) color = this.COLORS.hp;" 
    // This allows critical stamina or insight modifications to keep their clear green/blue hues!
    
  } else if (type === 'status') {
    color = this.COLORS.textMuted;
  }

  let targetX = pos.x + (Math.random() * 96 - 48);
  let targetY = pos.y - 96;

  for (const ft of this.floatingTexts) {
    if (Math.abs(ft.x - targetX) < 72 && Math.abs(ft.y - targetY) < 60) {
      targetY -= 60;
    }
  }

  this.floatingTexts.push({
    text: displayText,
    color,
    fontSize,
    x: targetX,
    y: targetY,
    life: isCritical ? 2.0 : 1.5,
    maxLife: isCritical ? 2.0 : 1.5,
    velocityY: isCritical ? -60 : -36,
    delay: delay
  });
}

    drawFloatingTexts(dt) {
  for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
    const ft = this.floatingTexts[i];

    if (ft.delay > 0) {
      ft.delay -= dt;
      continue;
    }

    ft.life -= dt;
    ft.y += ft.velocityY * dt;

    if (ft.life <= 0) {
      this.floatingTexts.splice(i, 1);
      continue;
    }

    this.ctx.save();
    this.ctx.globalAlpha = Math.min(1.0, (ft.life / ft.maxLife) * 2);

    const fontFamily = UITheme.fonts.body.split('px ')[1] || '"Georgia", serif';
    const fontStr = `italic bold ${ft.fontSize}px ${fontFamily}`;

    // 1. Setup native canvas text properties
    this.ctx.font = fontStr;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    // 2. Draw a thick, hard black outline
    this.ctx.lineJoin = "round"; // Prevents sharp spikes on corners
    this.ctx.lineWidth = ft.fontSize > 58 ? 8 : 5; // Thicker outline for crits
    this.ctx.strokeStyle = "rgba(0, 0, 0, 0.95)";
    this.ctx.strokeText(ft.text, ft.x, ft.y);

    // 3. Setup a tight, crisp drop shadow
    this.ctx.shadowColor = 'rgba(0, 0, 0, 1.0)';
    this.ctx.shadowBlur = 4; // Drastically reduced from 19!
    this.ctx.shadowOffsetX = 3;
    this.ctx.shadowOffsetY = 3;

    // 4. Fill the text with the main color
    this.ui.drawText(ft.text, ft.x, ft.y, fontStr, ft.color, "center", "middle");

    // 5. Critical hit overlay (Inner highlight)
    if (ft.fontSize > 58) {
      this.ctx.shadowBlur = 0;
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 0;
      this.ctx.globalAlpha *= 0.5;
      this.ui.drawText(ft.text, ft.x, ft.y, fontStr, UITheme.colors.textMain, "center", "middle");
    }

    this.ctx.restore();
  }
}
}