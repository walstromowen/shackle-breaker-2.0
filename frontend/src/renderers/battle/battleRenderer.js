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

        // SOULS-LIKE PALETTE OVERRIDE
        this.COLORS = {
            stamina: '#4a5d4e',      // Muted moss green
            insight: '#4a5b70',      // Deep slate blue
            insightDim: '#1a1d24',
            highlight: '#b89947',    // Tarnished Gold
            blood: '#7a0000',        // Dark Crimson
            heal: '#c9b475',         // Estus Gold
            textMain: '#d4cbb8'      // Aged bone white
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
                    const targetPos = (anim.targets && anim.targets.length > 0) 
                        ? (this.combatantRenderer.getEntityPosition(anim.targets[0], state) || sourcePos) 
                        : sourcePos;

                    vfxCues.forEach(cue => {
                        let startX = cue.origin === 'target' ? targetPos.x : sourcePos.x;
                        let startY = cue.origin === 'target' ? targetPos.y : sourcePos.y;

                        if (cue.type === 'burst') {
                            this.vfxRenderer.spawnBurst(startX, startY, cue.count || 10, cue.config);
                        } 
                        else if (cue.type === 'travel') {
                            this.vfxRenderer.spawn({
                                ...cue.config,
                                startX: sourcePos.x, startY: sourcePos.y,
                                endX: targetPos.x, endY: targetPos.y,
                                movement: cue.config.movement || 'linear'
                            });
                        }
                        else if (cue.type === 'spawn') {
                            this.vfxRenderer.spawn({ ...cue.config, startX: startX, startY: startY });
                        }
                    });
                }
            }
        }

        this.ctx.imageSmoothingEnabled = false;

        // 1. Draw Background
        const baseBgKey = state.backgroundId || 'plainsBattleDayBg';
        const baseBgImg = this.loader.get ? this.loader.get(baseBgKey) : this.loader.getAsset(baseBgKey);

        if (baseBgImg) {
            this.ctx.drawImage(baseBgImg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        } else {
            this.ctx.fillStyle = '#111'; 
            this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }

        // --- NEW: CINEMATIC VIGNETTE OVER THE BACKGROUND ---
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
                const overrideKey = activeBg.key || baseBgKey;
                const overrideImg = this.loader.get ? this.loader.get(overrideKey) : this.loader.getAsset(overrideKey);

                if (overrideImg) {
                    this.ctx.drawImage(overrideImg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                } else {
                    this.ctx.fillStyle = '#000'; 
                    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                }
                this.ctx.restore();
            }
        }

        // 2. Draw Entities 
        this.combatantRenderer.drawGroup(state.activeEnemies, false, state);
        this.combatantRenderer.drawGroup(state.activeParty, true, state);

        // 3. Draw VFX
        this.vfxRenderer.render();

        // 4. Draw HUD & Menus
        this.hudRenderer.render(state, this.dt);

        // 5. Draw Floating Combat Text
        this.drawFloatingTexts(this.dt);

        // 6. Draw Debug Overlay
        if (this.showDebug) {
            this.debugRenderer.render(state);
        }
    }

    // Notice the new 'delay' parameter defaulting to 0
    spawnFloatingText({ target, value, resource, text, type, isCritical, delay = 0 }) {
        const pos = this.combatantRenderer.getEntityPosition(target, this.currentState);
        if (!pos) return;

        let displayText = text;
        let color = this.COLORS.textMain;
        let fontSize = isCritical ? 36 : 22; 

        if (value !== undefined) {
            const isGain = value > 0;
            const prefix = isGain ? '+' : '';
            displayText = `${prefix}${Math.round(value)}`;

            if (resource === 'hp') color = isGain ? this.COLORS.heal : this.COLORS.blood;
            else if (resource === 'stamina') color = isGain ? this.COLORS.stamina : '#8c8c8c';
            else if (resource === 'insight') color = isGain ? this.COLORS.insight : this.COLORS.insightDim;
            
            if (isCritical) color = this.COLORS.blood; 
        } 
        else if (type === 'status') {
            color = '#888'; 
        }

        let targetX = pos.x + (Math.random() * 40 - 20); 
        let targetY = pos.y - 40; 

        for (const ft of this.floatingTexts) {
            if (Math.abs(ft.x - targetX) < 30 && Math.abs(ft.y - targetY) < 25) {
                targetY -= 25; 
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
            velocityY: isCritical ? -25 : -15,
            delay: delay // Storing the delay
        });
    }

    drawFloatingTexts(dt) {
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            
            // Wait out the delay before showing or moving the text
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
            // Fade out smoothly in the last 50% of life
            this.ctx.globalAlpha = Math.min(1.0, (ft.life / ft.maxLife) * 2);
            
            // Serif font for a gothic look
            this.ctx.font = `italic bold ${ft.fontSize}px "Georgia", serif`; 
            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "middle";
            
            // Soft atmospheric drop-shadow instead of a hard stroke
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
            this.ctx.shadowBlur = 8;
            this.ctx.shadowOffsetX = 2;
            this.ctx.shadowOffsetY = 2;
            
            this.ctx.fillStyle = ft.color;
            this.ctx.fillText(ft.text, ft.x, ft.y);
            
            // Add a slight bright center glow for criticals
            if (ft.fontSize > 24) {
                this.ctx.shadowBlur = 0;
                this.ctx.globalAlpha *= 0.5;
                this.ctx.fillStyle = '#fff';
                this.ctx.fillText(ft.text, ft.x, ft.y);
            }
            
            this.ctx.restore();
        }
    }
}