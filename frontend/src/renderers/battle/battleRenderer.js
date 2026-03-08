import { CanvasUI } from '../../ui/canvasUI.js';
import { UITheme } from '../../ui/UITheme.js';
import { TargetingResolver } from '../../../../shared/systems/targetingResolver.js';
import { events } from '../../../src/core/eventBus.js';

export class BattleRenderer {
    constructor(ctx, config, loader) {
        this.ctx = ctx;
        this.config = config;
        this.loader = loader;
        
        this.ui = new CanvasUI(ctx);

        // --- VISUAL CONFIG ---
        this.SPRITE_SCALE = 2;   
        this.FRAME_SIZE = 128;
        
        // Icon Config
        this.SRC_SIZE = 32; 

        // --- HUD CONFIGURATION ---
        this.HUD = {
            CARD_W: 155,      
            CARD_H: 42,       
            GAP: 4,           
            
            // Bar Dimensions
            BAR_HEIGHT: 5,    
            BAR_WIDTH: 70,    
            
            PADDING_X: 8,
            PADDING_Y: 4      
        };

        // --- COLORS (Now Mapped to UITheme) ---
        this.COLORS = {
            stamina: UITheme.colors.stm,     
            staminaDim: UITheme.colors.stmDim,
            insight: UITheme.colors.ins,     
            insightDim: UITheme.colors.insDim,
            highlight: UITheme.colors.textHighlight    
        };

        // --- LAYOUT CONFIGURATION ---
        this.LAYOUT = {
            PLAYER: [
                { x: 0.38, y: 0.62 }, 
                { x: 0.24, y: 0.54 }, 
                { x: 0.10, y: 0.46 }  
            ],
            ENEMY: [
                { x: 0.62, y: 0.25 }, 
                { x: 0.76, y: 0.33 }, 
                { x: 0.90, y: 0.41 }  
            ]
        };
        this.displayStats = new WeakMap(); 
        this.lastTime = performance.now();
        this.dt = 0;
        this.BAR_LERP_SPEED = 5.0; 

        // --- Floating Combat Text Setup ---
        this.floatingTexts = [];
        this.currentState = null; 

        events.on('SPAWN_FCT', (payload) => {
            if (!this.currentState) return; 
            this.spawnFloatingText(payload);
        });
    }

    isEntityVisible(entity, state) {
        if (!entity) return false;
        if (entity.hp > 0) return true;
        
        return state.turnQueue.some(
            turn => turn.type === 'DEATH_MESSAGE' && turn.message.includes(entity.name)
        );
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

        // 1. Solid Background (Using theme scale 2 for a dark gray)
        this.ctx.fillStyle = UITheme.colors.bgScale[2]; 
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // 2. Draw Units
        this.drawGroup(state.activeEnemies, false, state);
        this.drawGroup(state.activeParty, true, state);

        // Draw Projectiles on top of units
        this.drawProjectiles(state); 

        // 3. Draw HUD
        this.drawHUD(state);

        // 4. INTERFACE LAYERS
        if (['INTRO', 'RESOLVE', 'VICTORY', 'DEFEAT'].includes(state.phase)) {
            if (state.message) {
                this.drawDialogueBox(state.message);
            }
        }
        else if (state.phase === 'SELECT_ACTION') {
            this.drawActionMenu(state);
            this.drawActivePlayerIndicator(state);
        }
        else if (state.phase === 'SELECT_TARGET') {
            this.drawActionMenu(state);
            this.drawTargetCursor(state); 
        }

        // Draw Floating Combat Text Last (On top of everything)
        this.drawFloatingTexts(this.dt);
    }

    getEntityPosition(entity, state) {
        let isPlayer = true;
        let index = state.activeParty ? state.activeParty.indexOf(entity) : -1;
        
        if (index === -1) {
            index = state.activeEnemies ? state.activeEnemies.indexOf(entity) : -1;
            isPlayer = false;
        }
        if (index === -1) return null;
        
        const layout = isPlayer ? this.LAYOUT.PLAYER[index] : this.LAYOUT.ENEMY[index];
        if (!layout) return null;

        return {
            x: Math.floor(layout.x * this.config.CANVAS_WIDTH),
            y: Math.floor(layout.y * this.config.CANVAS_HEIGHT)
        };
    }

    drawProjectiles(state) {
        const anim = state.activeAnimation;
        if (!anim || typeof anim.getActiveProjectiles !== 'function') return;

        const progress = state.timer ? Math.min(state.timer / anim.duration, 1) : 0;
        const projectiles = anim.getActiveProjectiles(progress);
        
        if (!projectiles || projectiles.length === 0) return;

        const sourcePos = this.getEntityPosition(anim.actor, state);
        if (!anim.targets || anim.targets.length === 0) return;
        const targetPos = this.getEntityPosition(anim.targets[0], state); 

        if (!sourcePos || !targetPos) return;

        projectiles.forEach(p => {
            const { flightProgress, def } = p;
            
            let currentX = sourcePos.x + (targetPos.x - sourcePos.x) * flightProgress;
            let currentY = sourcePos.y + (targetPos.y - sourcePos.y) * flightProgress;

            if (def.arc) {
                const arcPeak = Math.sin(flightProgress * Math.PI); 
                currentY -= arcPeak * def.arc; 
            }

            this.ctx.save();
            this.ctx.fillStyle = def.color || UITheme.colors.selectedWhite;
            this.ctx.beginPath();
            this.ctx.arc(currentX, currentY, def.size || 5, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.shadowColor = def.color || UITheme.colors.selectedWhite;
            this.ctx.shadowBlur = 10;
            this.ctx.fill();

            this.ctx.restore();
        });
    }

    drawGroup(entities, isPlayer, state) {
        if (!entities) return;

        const anim = state.activeAnimation;
        const progress = anim && state.timer ? Math.min(state.timer / anim.duration, 1) : 0;

        let renderables = entities.map((entity, index) => {
            if (!this.isEntityVisible(entity, state) || index >= 3) return null;
            
            const layout = isPlayer ? this.LAYOUT.PLAYER[index] : this.LAYOUT.ENEMY[index];
            if (!layout) return null;

            let x = Math.floor(layout.x * this.config.CANVAS_WIDTH);
            let y = Math.floor(layout.y * this.config.CANVAS_HEIGHT);
            const size = Math.floor(this.FRAME_SIZE * this.SPRITE_SCALE);
            let filter = 'none';

            if (anim && typeof anim.getTransform === 'function') {
                const transform = anim.getTransform(entity, progress, isPlayer);
                x += transform.xOffset || 0;
                y += transform.yOffset || 0;
                filter = transform.filter || 'none';
            }

            return { entity, x, y, size, filter };
        }).filter(item => item !== null);

        renderables.sort((a, b) => a.y - b.y);

        renderables.forEach(item => {
            const { entity, x, y, size, filter } = item;
            const assetKey = entity.spritePortrait || entity.spriteOverworld;
            const img = this.loader.get ? this.loader.get(assetKey) : this.loader.getAsset(assetKey);

            this.ctx.save();

            if (filter !== 'none') {
                this.ctx.filter = filter;
            }

            if (img) {
                const srcY = isPlayer ? this.FRAME_SIZE : 0;
                this.ui.drawSprite(img, 0, srcY, this.FRAME_SIZE, this.FRAME_SIZE, x - size/2, y - size/2, size, size);
            } else {
                const color = isPlayer ? UITheme.colors.defense : UITheme.colors.hp;
                this.ui.drawRect(x - size/2, y - size/2, size, size, color, true);
            }
            
            this.ctx.restore();
        });
    }

    drawIcon(ctx, iconData, sheetKey, x, y, size = 32) {
        if (typeof iconData === 'object' && iconData !== null) {
            const sheet = this.loader.get ? this.loader.get(sheetKey) : this.loader.getAsset(sheetKey);
            
            if (sheet) {
                const srcX = iconData.col * this.SRC_SIZE;
                const srcY = iconData.row * this.SRC_SIZE;

                ctx.drawImage(
                    sheet,
                    srcX, srcY, this.SRC_SIZE, this.SRC_SIZE, 
                    x, y, size, size                                  
                );
            } else {
                this.drawFallbackEmoji(ctx, '?', x, y, size);
            }
        } 
        else if (typeof iconData === 'string') {
            this.drawFallbackEmoji(ctx, iconData, x, y, size);
        }
    }

    drawFallbackEmoji(ctx, text, x, y, size) {
        ctx.save();
        ctx.fillStyle = UITheme.colors.selectedWhite;
        ctx.font = `${Math.floor(size * 0.7)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x + size / 2, y + size / 2 + 2);
        ctx.restore();
    }

    drawStatusEffects(entity, startX, startY) {
        if (!entity.statusEffects || entity.statusEffects.length === 0) return;

        const iconSize = 16;
        const spacing = 4;

        entity.statusEffects.forEach((effect, index) => {
            const x = startX + (index * (iconSize + spacing));
            const iconData = effect.icon || '✨'; 
            this.drawIcon(this.ctx, iconData, 'statusEffects', x, startY, iconSize);
        });
    }

    drawHUD(state) {
        if (state.activeParty && state.activeParty.length > 0) {
            this.drawPartyCards(state.activeParty);
        }

        if (state.activeEnemies && state.activeEnemies.length > 0) {
            this.drawEnemyCards(state.activeEnemies, state);
        }
    }

    drawPartyCards(party) {
        const startX = 10;
        const startY = 10;
        const spacingY = 8; 
        
        party.forEach((member, index) => {
            if (!member) return; 

            const y = startY + (index * (this.HUD.CARD_H + this.HUD.GAP));
            
            this.ui.drawPanel(startX, y, this.HUD.CARD_W, this.HUD.CARD_H);
            this.ui.drawText(member.name, startX + this.HUD.PADDING_X, y + 10, UITheme.fonts.small, UITheme.colors.textMain);

            const effectCount = member.statusEffects ? member.statusEffects.length : 0;
            const iconSpaceNeeded = effectCount * 20; 
            const statusStartX = startX + this.HUD.CARD_W - this.HUD.PADDING_X - iconSpaceNeeded;
            const safeStatusX = Math.max(startX + 80, statusStartX); 
            
            this.drawStatusEffects(member, safeStatusX, y + 4);

            const maxHp = member.maxHp || 10; 
            const targetHp = member.hp || 0;
            const displayHp = this.getDisplayStat(member, 'hp', targetHp);

            const maxStam = member.maxStamina || 10;
            const targetStam = member.stamina || 0;
            const displayStam = this.getDisplayStat(member, 'stamina', targetStam);

            const maxIns = member.maxInsight || 10;
            const targetIns = member.insight || 0;
            const displayIns = this.getDisplayStat(member, 'insight', targetIns);

            const barX = startX + this.HUD.PADDING_X;
            let currentY = y + 16; 

            // Draw HP
            this.ui.drawBar(barX, currentY, this.HUD.BAR_WIDTH, this.HUD.BAR_HEIGHT, displayHp, maxHp, UITheme.colors.hp, UITheme.colors.hpDim);
            this.drawBarText(displayHp, maxHp, barX, currentY); 
            
            // Draw Stamina
            currentY += spacingY;
            this.ui.drawBar(barX, currentY, this.HUD.BAR_WIDTH, this.HUD.BAR_HEIGHT, displayStam, maxStam, this.COLORS.stamina, this.COLORS.staminaDim);
            this.drawBarText(displayStam, maxStam, barX, currentY);

            // Draw Insight
            currentY += spacingY;
            this.ui.drawBar(barX, currentY, this.HUD.BAR_WIDTH, this.HUD.BAR_HEIGHT, displayIns, maxIns, this.COLORS.insight, this.COLORS.insightDim);
            this.drawBarText(displayIns, maxIns, barX, currentY);
        });
    }

    drawBarText(current, max, barX, barY) {
        this.ctx.save();
        this.ctx.font = "9px monospace";
        this.ctx.fillStyle = UITheme.colors.textMuted;
        this.ctx.textAlign = "left";
        this.ctx.textBaseline = "alphabetic";
        this.ctx.fillText(`${Math.floor(current)}/${max}`, barX + this.HUD.BAR_WIDTH + 5, barY + 5);
        this.ctx.restore();
    }

    drawEnemyCards(enemies, state) {
        const ENEMY_CARD_H = 28; 
        const stackHeight = (enemies.length * ENEMY_CARD_H) + ((enemies.length - 1) * this.HUD.GAP);
        const bottomMargin = 90; 
        
        const startX = this.config.CANVAS_WIDTH - this.HUD.CARD_W - 10;
        const startY = this.config.CANVAS_HEIGHT - bottomMargin - stackHeight;

        enemies.forEach((enemy, index) => {
            if (!this.isEntityVisible(enemy, state)) return; 

            const y = startY + (index * (ENEMY_CARD_H + this.HUD.GAP));

            this.ui.drawPanel(startX, y, this.HUD.CARD_W, ENEMY_CARD_H);

            this.ui.drawText(enemy.name, startX + this.HUD.CARD_W - this.HUD.PADDING_X, y + 12, UITheme.fonts.small, UITheme.colors.textMain, "right");

            this.drawStatusEffects(enemy, startX + this.HUD.PADDING_X, y + 4);

            const maxHp = enemy.maxHp || 10;
            const targetHp = enemy.hp || 0;
            const displayHp = this.getDisplayStat(enemy, 'hp', targetHp);

            const barX = (startX + this.HUD.CARD_W - this.HUD.PADDING_X) - this.HUD.BAR_WIDTH;
            const barY = y + 16; 

            this.ui.drawBar(barX, barY, this.HUD.BAR_WIDTH, this.HUD.BAR_HEIGHT, displayHp, maxHp, UITheme.colors.hp, UITheme.colors.hpDim);
            
            this.ctx.save();
            this.ctx.font = "9px monospace";
            this.ctx.fillStyle = UITheme.colors.textMuted;
            this.ctx.textAlign = "right";
            this.ctx.fillText(`${Math.round(displayHp)}/${maxHp}`, barX - 5, barY + 5); 
            this.ctx.restore();
        });
    }

    drawActionMenu(state) {
        const activeChar = state.activeParty[state.activePartyIndex];
        if (!activeChar || !activeChar.abilities) return;

        const itemSize = 32; 
        const margin = 12;   
        const paddingX = 20; 
        const headerH = 35;  

        const availableWidth = this.config.CANVAS_WIDTH - (paddingX * 2);
        const columns = Math.floor(availableWidth / (itemSize + margin));
        
        const totalItems = activeChar.abilities.length;
        const rows = Math.ceil(totalItems / columns);

        const contentHeight = (rows * itemSize) + ((rows - 1) * margin);
        const minHeight = 80;
        const h = Math.max(minHeight, contentHeight + headerH + 20); 

        const w = this.config.CANVAS_WIDTH;
        const x = 0;
        const y = this.config.CANVAS_HEIGHT - h; 
        const startY = y + headerH; 

        this.ui.drawPanel(x, y, w, h);

        this.ui.drawText(`${activeChar.name}'s Action`, x + paddingX, y + 20, UITheme.fonts.small, UITheme.colors.textMuted);

        activeChar.abilities.forEach((ability, index) => {
            const isSelected = (index === state.menuIndex);
            const canAfford = ability.canPayCost ? ability.canPayCost(activeChar) : true; 

            const row = Math.floor(index / columns);
            const col = index % columns;

            const drawX = paddingX + (col * (itemSize + margin));
            const drawY = startY + (row * (itemSize + margin));

            if (isSelected) {
                this.ctx.fillStyle = this.COLORS.highlight;
                this.ctx.fillRect(drawX - 2, drawY - 2, itemSize + 4, itemSize + 4);
                
                this.ctx.strokeStyle = canAfford ? UITheme.colors.selectedWhite : UITheme.colors.failure; 
                this.ctx.strokeRect(drawX - 2, drawY - 2, itemSize + 4, itemSize + 4);
            } 

            if (!canAfford) {
                this.ctx.globalAlpha = 0.4; 
            }

            this.drawIcon(this.ctx, ability.icon, 'abilities', drawX, drawY, itemSize);

            this.ctx.globalAlpha = 1.0; 
        });
    }

    drawActivePlayerIndicator(state) {
        const index = state.activePartyIndex;
        const layout = this.LAYOUT.PLAYER[index];
        if (!layout) return;

        const x = Math.floor(layout.x * this.config.CANVAS_WIDTH);
        const y = Math.floor(layout.y * this.config.CANVAS_HEIGHT);
        const size = Math.floor(this.FRAME_SIZE * this.SPRITE_SCALE);

        const arrowY = y - (size/2) - 10;
        
        this.ctx.fillStyle = this.COLORS.highlight;
        this.ctx.beginPath();
        this.ctx.moveTo(x, arrowY + 10);
        this.ctx.lineTo(x - 8, arrowY);
        this.ctx.lineTo(x + 8, arrowY);
        this.ctx.fill();
    }

    drawTargetCursor(state) {
        const activeChar = state.activeParty?.[state.activePartyIndex];
        if (!activeChar) return;

        const selectedAbility = state.selectedAction || activeChar.abilities[state.menuIndex];
        if (!selectedAbility) return;

        if (state.selectedTargets && state.selectedTargets.length > 0) {
            const targetCounts = new Map();
            state.selectedTargets.forEach(t => {
                targetCounts.set(t, (targetCounts.get(t) || 0) + 1);
            });

            targetCounts.forEach((count, target) => {
                if (!this.isEntityVisible(target, state)) return;

                const isEnemy = state.activeEnemies.includes(target);
                const index = isEnemy ? state.activeEnemies.indexOf(target) : state.activeParty.indexOf(target);
                const layout = isEnemy ? this.LAYOUT.ENEMY[index] : this.LAYOUT.PLAYER[index];
                if (!layout) return;

                const x = Math.floor(layout.x * this.config.CANVAS_WIDTH);
                const y = Math.floor(layout.y * this.config.CANVAS_HEIGHT);
                const size = Math.floor(this.FRAME_SIZE * this.SPRITE_SCALE);

                const badgeX = isEnemy ? x + (size/4) : x - (size/4);
                const badgeY = y; 

                this.ctx.fillStyle = this.COLORS.highlight;
                this.ctx.beginPath();
                this.ctx.arc(badgeX, badgeY, 14, 0, Math.PI * 2);
                this.ctx.fill();

                this.ctx.fillStyle = UITheme.colors.bgScale[0];
                this.ctx.font = "bold 14px monospace";
                this.ctx.textAlign = "center";
                this.ctx.textBaseline = "middle";
                this.ctx.fillText(`x${count}`, badgeX, badgeY + 1);
            });
        }

        const scope = selectedAbility?.targeting?.scope || 'enemy';
        const isAllyTargeting = ['ally', 'all_allies', 'self'].includes(scope);
        
        let primaryTarget;
        
        if (state.targetIndex === 'ALL') {
            primaryTarget = 'ALL';
        } else if (isAllyTargeting) {
            primaryTarget = state.activeParty[state.targetIndex];
        } else {
            primaryTarget = state.activeEnemies[state.targetIndex];
        }

        const targets = TargetingResolver.resolve(selectedAbility, activeChar, primaryTarget, state) || [];

        targets.forEach(target => {
            if (!this.isEntityVisible(target, state)) return;

            let isTargetEnemy = false;
            let index = state.activeParty.indexOf(target);
            let layout = index !== -1 ? this.LAYOUT.PLAYER[index] : null;

            if (index === -1) {
                index = state.activeEnemies.indexOf(target);
                layout = index !== -1 ? this.LAYOUT.ENEMY[index] : null;
                isTargetEnemy = true;
            }

            if (!layout) return; 

            const x = Math.floor(layout.x * this.config.CANVAS_WIDTH);
            const y = Math.floor(layout.y * this.config.CANVAS_HEIGHT);
            const size = Math.floor(this.FRAME_SIZE * this.SPRITE_SCALE);

            if (isTargetEnemy) {
                const arrowX = x - (size/2) - 20; 
                this.ctx.fillStyle = UITheme.colors.hp; 
                this.ctx.beginPath();
                this.ctx.moveTo(arrowX + 15, y);
                this.ctx.lineTo(arrowX, y - 10);
                this.ctx.lineTo(arrowX, y + 10);
                this.ctx.fill();
                
                this.ui.drawText("TARGET", arrowX - 50, y + 5, UITheme.fonts.small, UITheme.colors.hp);
            } else {
                const arrowY = y - (size/2) - 20; 
                this.ctx.fillStyle = UITheme.colors.success; 
                this.ctx.beginPath();
                this.ctx.moveTo(x, arrowY + 15);
                this.ctx.lineTo(x - 10, arrowY);
                this.ctx.lineTo(x + 10, arrowY);
                this.ctx.fill();

                this.ui.drawText("TARGET", x - 20, arrowY - 5, UITheme.fonts.small, UITheme.colors.success);
            }
        });
    }

    drawDialogueBox(text) {
        const w = this.config.CANVAS_WIDTH;
        const h = 80; 
        const x = 0;
        const y = this.config.CANVAS_HEIGHT - h;

        this.ui.drawPanel(x, y, w, h);
        this.ui.drawWrappedText(
            text, 
            x + 20, 
            y + 30, 
            w - 40, 
            20, 
            UITheme.fonts.body, 
            UITheme.colors.textMain
        );
    }
    
    getDisplayStat(entity, statKey, targetValue) {
        let stats = this.displayStats.get(entity);
        if (!stats) {
            stats = {};
            this.displayStats.set(entity, stats);
        }

        if (stats[statKey] === undefined) {
            stats[statKey] = targetValue; 
        } else {
            const diff = targetValue - stats[statKey];
            if (Math.abs(diff) > 0.05) {
                stats[statKey] += diff * this.BAR_LERP_SPEED * this.dt;
            } else {
                stats[statKey] = targetValue; 
            }
        }
        return stats[statKey];
    }

    // ==========================================
    // FLOATING COMBAT TEXT (FCT)
    // ==========================================

    spawnFloatingText({ target, value, resource, text, type, isCritical }) {
        const pos = this.getEntityPosition(target, this.currentState);
        if (!pos) return;

        let displayText = text;
        let color = UITheme.colors.textMain;
        let fontSize = isCritical ? 32 : 24; 

        // Handle Numerical Resource Changes (Damage / Healing / Cost)
        if (value !== undefined) {
            const isGain = value > 0;
            const prefix = isGain ? '+' : '';
            displayText = `${prefix}${Math.round(value)}`;

            // Match colors based on resource type & gain/loss
            if (resource === 'hp') color = isGain ? UITheme.colors.success : UITheme.colors.hp;
            else if (resource === 'stamina') color = isGain ? this.COLORS.stamina : UITheme.colors.attack;
            else if (resource === 'insight') color = isGain ? this.COLORS.insight : this.COLORS.insightDim;
            
            if (isCritical) color = this.COLORS.highlight; 
        } 
        // Handle Status Strings (Miss, Evade, etc.)
        else if (type === 'status') {
            color = UITheme.colors.textMuted; 
        }

        // --- OVERLAP PREVENTION LOGIC ---
        let targetX = pos.x + (Math.random() * 40 - 20); // Base random spread
        let targetY = pos.y - 40; // Base height

        // Check against existing text elements. If there's a collision, stack it upwards.
        for (const ft of this.floatingTexts) {
            if (Math.abs(ft.x - targetX) < 30 && Math.abs(ft.y - targetY) < 25) {
                targetY -= 25; // Bump up to avoid overlap
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
            
            // Draw a thick outline using the deepest background shade for readability
            this.ctx.strokeStyle = UITheme.colors.bgScale[0];
            this.ctx.lineWidth = 4;
            this.ctx.strokeText(ft.text, ft.x, ft.y);
            
            this.ctx.fillStyle = ft.color;
            this.ctx.fillText(ft.text, ft.x, ft.y);
            this.ctx.restore();
        }
    }
}