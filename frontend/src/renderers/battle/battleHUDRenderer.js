import { UITheme } from '../../ui/UITheme.js';
import { TargetingResolver } from '../../../../shared/systems/targetingResolver.js';

export class BattleHUDRenderer {
    constructor(ctx, config, loader, ui, combatantRenderer) {
        this.ctx = ctx;
        this.config = config;
        this.loader = loader;
        this.ui = ui;
        this.combatantRenderer = combatantRenderer;

        // Icon Config
        this.SRC_SIZE = 32; 

        // --- HUD CONFIGURATION ---
        this.HUD = {
            CARD_W: 155,      
            CARD_H: 42,       
            GAP: 4,           
            BAR_HEIGHT: 5,    
            BAR_WIDTH: 70,    
            PADDING_X: 8,
            PADDING_Y: 4      
        };

        // --- COLORS ---
        this.COLORS = {
            stamina: UITheme.colors.stm,     
            staminaDim: UITheme.colors.stmDim,
            insight: UITheme.colors.ins,     
            insightDim: UITheme.colors.insDim,
            highlight: UITheme.colors.textHighlight    
        };

        this.displayStats = new WeakMap(); 
        this.BAR_LERP_SPEED = 5.0; 
        this.dt = 0; // Updated per frame via render()
    }

    render(state, dt) {
        this.dt = dt;

        // 1. Draw Static HUD Elements
        this.drawHUD(state);

        // 2. Draw Contextual Interface Layers
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

            this.ui.drawBar(barX, currentY, this.HUD.BAR_WIDTH, this.HUD.BAR_HEIGHT, displayHp, maxHp, UITheme.colors.hp, UITheme.colors.hpDim);
            this.drawBarText(displayHp, maxHp, barX, currentY); 
            
            currentY += spacingY;
            this.ui.drawBar(barX, currentY, this.HUD.BAR_WIDTH, this.HUD.BAR_HEIGHT, displayStam, maxStam, this.COLORS.stamina, this.COLORS.staminaDim);
            this.drawBarText(displayStam, maxStam, barX, currentY);

            currentY += spacingY;
            this.ui.drawBar(barX, currentY, this.HUD.BAR_WIDTH, this.HUD.BAR_HEIGHT, displayIns, maxIns, this.COLORS.insight, this.COLORS.insightDim);
            this.drawBarText(displayIns, maxIns, barX, currentY);
        });
    }

    drawEnemyCards(enemies, state) {
        const ENEMY_CARD_H = 28; 
        const stackHeight = (enemies.length * ENEMY_CARD_H) + ((enemies.length - 1) * this.HUD.GAP);
        const bottomMargin = 90; 
        
        const startX = this.config.CANVAS_WIDTH - this.HUD.CARD_W - 10;
        const startY = this.config.CANVAS_HEIGHT - bottomMargin - stackHeight;

        enemies.forEach((enemy, index) => {
            if (!this.combatantRenderer.isEntityVisible(enemy, state)) return; 

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

    drawBarText(current, max, barX, barY) {
        this.ctx.save();
        this.ctx.font = "9px monospace";
        this.ctx.fillStyle = UITheme.colors.textMuted;
        this.ctx.textAlign = "left";
        this.ctx.textBaseline = "alphabetic";
        this.ctx.fillText(`${Math.floor(current)}/${max}`, barX + this.HUD.BAR_WIDTH + 5, barY + 5);
        this.ctx.restore();
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

            this.drawIcon(ability.icon, 'abilities', drawX, drawY, itemSize);
            this.ctx.globalAlpha = 1.0; 
        });
    }

    drawActivePlayerIndicator(state) {
        const index = state.activePartyIndex;
        const layout = this.combatantRenderer.LAYOUT.PLAYER[index];
        if (!layout) return;

        const x = Math.floor(layout.x * this.config.CANVAS_WIDTH);
        const y = Math.floor(layout.y * this.config.CANVAS_HEIGHT);
        const size = Math.floor(this.combatantRenderer.FRAME_SIZE * this.combatantRenderer.SPRITE_SCALE);

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
                if (!this.combatantRenderer.isEntityVisible(target, state)) return;

                const isEnemy = state.activeEnemies.includes(target);
                const index = isEnemy ? state.activeEnemies.indexOf(target) : state.activeParty.indexOf(target);
                const layout = isEnemy ? this.combatantRenderer.LAYOUT.ENEMY[index] : this.combatantRenderer.LAYOUT.PLAYER[index];
                if (!layout) return;

                const x = Math.floor(layout.x * this.config.CANVAS_WIDTH);
                const y = Math.floor(layout.y * this.config.CANVAS_HEIGHT);
                const size = Math.floor(this.combatantRenderer.FRAME_SIZE * this.combatantRenderer.SPRITE_SCALE);

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
            if (!this.combatantRenderer.isEntityVisible(target, state)) return;

            let isTargetEnemy = false;
            let index = state.activeParty.indexOf(target);
            let layout = index !== -1 ? this.combatantRenderer.LAYOUT.PLAYER[index] : null;

            if (index === -1) {
                index = state.activeEnemies.indexOf(target);
                layout = index !== -1 ? this.combatantRenderer.LAYOUT.ENEMY[index] : null;
                isTargetEnemy = true;
            }

            if (!layout) return; 

            const x = Math.floor(layout.x * this.config.CANVAS_WIDTH);
            const y = Math.floor(layout.y * this.config.CANVAS_HEIGHT);
            const size = Math.floor(this.combatantRenderer.FRAME_SIZE * this.combatantRenderer.SPRITE_SCALE);

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

    drawStatusEffects(entity, startX, startY) {
        if (!entity.statusEffects || entity.statusEffects.length === 0) return;

        const iconSize = 16;
        const spacing = 4;

        entity.statusEffects.forEach((effect, index) => {
            const x = startX + (index * (iconSize + spacing));
            const iconData = effect.icon || '✨'; 
            this.drawIcon(iconData, 'statusEffects', x, startY, iconSize);
        });
    }

    drawIcon(iconData, sheetKey, x, y, size = 32) {
        if (typeof iconData === 'object' && iconData !== null) {
            const sheet = this.loader.get ? this.loader.get(sheetKey) : this.loader.getAsset(sheetKey);
            if (sheet) {
                const srcX = iconData.col * this.SRC_SIZE;
                const srcY = iconData.row * this.SRC_SIZE;
                this.ctx.drawImage(
                    sheet,
                    srcX, srcY, this.SRC_SIZE, this.SRC_SIZE, 
                    x, y, size, size                                  
                );
            } else {
                this.drawFallbackEmoji('?', x, y, size);
            }
        } 
        else if (typeof iconData === 'string') {
            this.drawFallbackEmoji(iconData, x, y, size);
        }
    }

    drawFallbackEmoji(text, x, y, size) {
        this.ctx.save();
        this.ctx.fillStyle = UITheme.colors.selectedWhite;
        this.ctx.font = `${Math.floor(size * 0.7)}px sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(text, x + size / 2, y + size / 2 + 2);
        this.ctx.restore();
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
}