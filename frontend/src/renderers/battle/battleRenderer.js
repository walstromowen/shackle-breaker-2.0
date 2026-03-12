import { CanvasUI } from '../../ui/canvasUI.js';
import { UITheme } from '../../ui/UITheme.js';
import { events } from '../../../src/core/eventBus.js';
import { BattleCombatantRenderer } from './battleCombatantRenderer.js';
import { BattleHUDRenderer } from './battleHUDRenderer.js';
import { BattleDebugRenderer } from './battleDebugRenderer.js';

export class BattleRenderer {
    constructor(ctx, config, loader) {
        this.ctx = ctx;
        this.config = config;
        this.loader = loader;
        
        this.ui = new CanvasUI(ctx);
        
        // --- SUBCOMPONENTS ---
        this.combatantRenderer = new BattleCombatantRenderer(ctx, config, loader, this.ui);
        this.hudRenderer = new BattleHUDRenderer(ctx, config, loader, this.ui, this.combatantRenderer);
        this.debugRenderer = new BattleDebugRenderer(ctx, config); // <-- Decoupled instantiation
        
        this.showDebug = false; // <-- Flag to toggle debug view

        this.lastTime = performance.now();
        this.dt = 0;
        this.showDebug = false;
        // FCT Setup
        this.floatingTexts = [];
        this.currentState = null; 

        // Needed strictly for FCT colors
        this.COLORS = {
            stamina: UITheme.colors.stm,
            insight: UITheme.colors.ins,
            insightDim: UITheme.colors.insDim,
            highlight: UITheme.colors.textHighlight    
        };

        events.on('SPAWN_FCT', (payload) => {
            if (!this.currentState) return; 
            this.spawnFloatingText(payload);
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

        // --- Audio Sync Logic ---
        const anim = state.activeAnimation;
        if (anim) {
            const progress = state.timer ? Math.min(state.timer / anim.duration, 1) : 0;
            const audioCues = anim.getAudioTriggers(progress);
            
            audioCues.forEach(cue => {
                events.emit('PLAY_SFX', { 
                    id: cue.key, 
                    volume: cue.volume || 1.0, 
                    pitch: cue.pitch || 1.0 
                });
            });
        }

        this.ctx.imageSmoothingEnabled = false;

        // 1. Draw Background
        const bgKey = state.backgroundId || 'plainsBattleDayBg';
        const bgImg = this.loader.get ? this.loader.get(bgKey) : this.loader.getAsset(bgKey);

        if (bgImg) {
            this.ctx.drawImage(bgImg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        } else {
            this.ctx.fillStyle = UITheme.colors.bgScale[2]; 
            this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }

        // 2. Draw Entities (Delegated)
        this.combatantRenderer.drawGroup(state.activeEnemies, false, state);
        this.combatantRenderer.drawGroup(state.activeParty, true, state);

        // 3. Draw Projectiles (Overlaps entities)
        this.drawProjectiles(state); 

        // 4. Draw HUD & Menus (Delegated)
        this.hudRenderer.render(state, this.dt);

        // 5. Draw Floating Combat Text (Top-most layer)
        this.drawFloatingTexts(this.dt);

        // 6. Draw Debug Overlay (Top-most UI layer) <-- Added Debug Call
        if (this.showDebug) {
            this.debugRenderer.render(state);
        }
    }

    drawProjectiles(state) {
        const anim = state.activeAnimation;
        if (!anim || typeof anim.getActiveProjectiles !== 'function') return;

        const progress = state.timer ? Math.min(state.timer / anim.duration, 1) : 0;
        const projectiles = anim.getActiveProjectiles(progress);
        
        if (!projectiles || projectiles.length === 0) return;

        const sourcePos = this.combatantRenderer.getEntityPosition(anim.actor, state);
        if (!anim.targets || anim.targets.length === 0) return;
        const targetPos = this.combatantRenderer.getEntityPosition(anim.targets[0], state); 

        if (!sourcePos || !targetPos) return;

        projectiles.forEach(p => {
            const { flightProgress, def } = p;
            this.ctx.save();

            let currentX, currentY;
            let currentRotation = typeof def.rotation === 'number' ? (def.rotation * Math.PI) / 180 : 0;
            let currentScale = def.scale || 1.0;
            let currentAlpha = 1.0;

            if (def.blendMode) {
                if (def.blendMode === 'screen') this.ctx.globalCompositeOperation = 'screen';
                if (def.blendMode === 'add') this.ctx.globalCompositeOperation = 'lighter';
            }

            if (def.type === 'overlay') {
                currentX = targetPos.x;
                currentY = targetPos.y;

                if (def.movement === 'swipe_diagonal') {
                    const offset = 40; 
                    currentX += -offset + (offset * 2 * flightProgress);
                    currentY += -offset + (offset * 2 * flightProgress);
                } 
                else if (def.movement === 'expand_and_fade') {
                    currentScale *= (0.5 + flightProgress * 1.5); 
                    currentAlpha = 1.0 - flightProgress; 
                } 
                else if (def.movement === 'float_up_and_pop') {
                    currentY += (20 - (flightProgress * 40)); 
                    if (flightProgress > 0.8) {
                        currentScale *= 1.5;
                        currentAlpha = (1.0 - flightProgress) * 5;
                    }
                }
            } else {
                currentX = sourcePos.x + (targetPos.x - sourcePos.x) * flightProgress;
                currentY = sourcePos.y + (targetPos.y - sourcePos.y) * flightProgress;

                if (def.arc) {
                    const arcPeak = Math.sin(flightProgress * Math.PI); 
                    currentY -= arcPeak * def.arc; 
                }

                if (def.rotation === 'auto') {
                    let nextFlightProgress = Math.min(flightProgress + 0.05, 1.0);
                    let nextX = sourcePos.x + (targetPos.x - sourcePos.x) * nextFlightProgress;
                    let nextY = sourcePos.y + (targetPos.y - sourcePos.y) * nextFlightProgress;
                    
                    if (def.arc) {
                        const nextArcPeak = Math.sin(nextFlightProgress * Math.PI);
                        nextY -= nextArcPeak * def.arc;
                    }
                    
                    currentRotation = Math.atan2(nextY - currentY, nextX - currentX);
                }
            }

            this.ctx.translate(currentX, currentY);
            this.ctx.rotate(currentRotation);
            this.ctx.globalAlpha = Math.max(0, Math.min(1, currentAlpha));

            let sheet = null;
            if (def.sheetKey) {
                sheet = this.loader.get ? this.loader.get(def.sheetKey) : this.loader.getAsset(def.sheetKey);
            }

            if (sheet && def.frame) {
                const frameSize = def.frameSize || 32; 
                const srcX = def.frame.col * frameSize;
                const srcY = def.frame.row * frameSize;
                
                const w = frameSize * currentScale;
                const h = frameSize * currentScale;

                this.ctx.drawImage(
                    sheet, 
                    srcX, srcY, frameSize, frameSize,
                    -w/2, -h/2, w, h
                );
            } else {
                this.ctx.fillStyle = def.color || UITheme.colors.selectedWhite;
                this.ctx.shadowColor = def.color || UITheme.colors.selectedWhite;
                this.ctx.shadowBlur = 10;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, (def.size || 5) * currentScale, 0, Math.PI * 2);
                this.ctx.fill();
            }

            this.ctx.restore();
        });
    }

    spawnFloatingText({ target, value, resource, text, type, isCritical }) {
        const pos = this.combatantRenderer.getEntityPosition(target, this.currentState);
        if (!pos) return;

        let displayText = text;
        let color = UITheme.colors.textMain;
        let fontSize = isCritical ? 32 : 24; 

        if (value !== undefined) {
            const isGain = value > 0;
            const prefix = isGain ? '+' : '';
            displayText = `${prefix}${Math.round(value)}`;

            if (resource === 'hp') color = isGain ? UITheme.colors.success : UITheme.colors.hp;
            else if (resource === 'stamina') color = isGain ? this.COLORS.stamina : UITheme.colors.attack;
            else if (resource === 'insight') color = isGain ? this.COLORS.insight : this.COLORS.insightDim;
            
            if (isCritical) color = this.COLORS.highlight; 
        } 
        else if (type === 'status') {
            color = UITheme.colors.textMuted; 
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
            life: 1.5,
            maxLife: 1.5,
            velocityY: isCritical ? -45 : -35 
        });
    }

    drawFloatingTexts(dt) {
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            
            ft.life -= dt;
            ft.y += ft.velocityY * dt;

            if (ft.life <= 0) {
                this.floatingTexts.splice(i, 1);
                continue;
            }

            this.ctx.save();
            this.ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
            
            this.ctx.font = `bold ${ft.fontSize}px monospace`; 
            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "middle";
            
            this.ctx.strokeStyle = UITheme.colors.bgScale[0];
            this.ctx.lineWidth = 4;
            this.ctx.strokeText(ft.text, ft.x, ft.y);
            
            this.ctx.fillStyle = ft.color;
            this.ctx.fillText(ft.text, ft.x, ft.y);
            this.ctx.restore();
        }
    }
}