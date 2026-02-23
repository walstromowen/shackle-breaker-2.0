import { CanvasUI } from '../../ui/canvasUI.js';
import { UITheme } from '../../ui/UITheme.js';

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
        this.ICON_SHEET_KEY = 'ability_icons'; 
        this.SRC_SIZE = 32; 

        // --- HUD CONFIGURATION ---
        this.HUD = {
            CARD_W: 155,      
            CARD_H: 58,       
            GAP: 6,           
            
            // Bar Dimensions
            BAR_HEIGHT: 5,    
            BAR_WIDTH: 70,    
            
            PADDING_X: 8,
            PADDING_Y: 8
        };

        // --- COLORS ---
        this.COLORS = {
            stamina: "#2ecc71",     // Green
            staminaDim: "#1e8449",
            insight: "#9b59b6",     // Purple
            insightDim: "#6c3483",
            highlight: "#f1c40f"    // Yellow (Selection Cursor)
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
    }

    // --- NEW: Helper to keep dead bodies visible until their death message plays ---
    isEntityVisible(entity, state) {
        if (!entity) return false;
        if (entity.hp > 0) return true;
        
        // If they are dead, check if we are still waiting to announce it
        return state.turnQueue.some(
            turn => turn.type === 'DEATH_MESSAGE' && turn.message.includes(entity.name)
        );
    }

    render(state) {
        if (!state) return;
        const { CANVAS_WIDTH, CANVAS_HEIGHT } = this.config;

        this.ctx.imageSmoothingEnabled = false;

        // 1. Solid Background
        this.ctx.fillStyle = "#212121"; 
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // 2. Draw Units (Pass state so they can check the queue)
        this.drawGroup(state.activeEnemies, false, state);
        this.drawGroup(state.activeParty, true, state);

        // 3. Draw HUD
        this.drawHUD(state);

        // 4. INTERFACE LAYERS
        if (state.phase === 'INTRO' || state.phase === 'RESOLVE' || state.phase === 'VICTORY' || state.phase === 'DEFEAT') {
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

    drawGroup(entities, isPlayer, state) {
        if (!entities) return;

        let renderables = entities.map((entity, index) => {
            // UPDATED: Check visibility logic instead of strictly HP <= 0
            if (!this.isEntityVisible(entity, state) || index >= 3) return null;
            
            const layout = isPlayer ? this.LAYOUT.PLAYER[index] : this.LAYOUT.ENEMY[index];
            if (!layout) return null;

            const x = Math.floor(layout.x * this.config.CANVAS_WIDTH);
            const y = Math.floor(layout.y * this.config.CANVAS_HEIGHT);
            const size = Math.floor(this.FRAME_SIZE * this.SPRITE_SCALE);

            return { entity, x, y, size };
        }).filter(item => item !== null);

        renderables.sort((a, b) => a.y - b.y);

        renderables.forEach(item => {
            const { entity, x, y, size } = item;
            const assetKey = entity.spritePortrait || entity.spriteOverworld;
            const img = this.loader.get ? this.loader.get(assetKey) : this.loader.getAsset(assetKey);

            if (img) {
                const srcY = isPlayer ? this.FRAME_SIZE : 0;
                this.ui.drawSprite(img, 0, srcY, this.FRAME_SIZE, this.FRAME_SIZE, x - size/2, y - size/2, size, size);
            } else {
                const color = isPlayer ? UITheme.colors.defense : UITheme.colors.hp;
                this.ui.drawRect(x - size/2, y - size/2, size, size, color, true);
            }
        });
    }

    drawIcon(ctx, iconData, x, y, size = 32) {
        if (typeof iconData === 'object' && iconData !== null) {
            const sheet = this.loader.get ? this.loader.get(this.ICON_SHEET_KEY) : this.loader.getAsset(this.ICON_SHEET_KEY);
            
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
        ctx.fillStyle = 'white';
        ctx.font = `${Math.floor(size * 0.7)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x + size / 2, y + size / 2 + 2);
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
        const spacingY = 9;
        
        party.forEach((member, index) => {
            if (!member) return; // Safety check

            const y = startY + (index * (this.HUD.CARD_H + this.HUD.GAP));
            
            this.ui.drawPanel(startX, y, this.HUD.CARD_W, this.HUD.CARD_H);

            const maxHp = member.maxHp || 10; 
            const currentHp = member.hp || 0;
            const maxStam = member.maxStamina || 10;
            const currStam = member.stamina || 0;
            const maxIns = member.maxInsight || 10;
            const currIns = member.insight || 0;

            this.ui.drawText(member.name, startX + this.HUD.PADDING_X, y + 12, UITheme.fonts.small, UITheme.colors.textMain);

            const barX = startX + this.HUD.PADDING_X;
            let currentY = y + 18;

            this.ui.drawBar(barX, currentY, this.HUD.BAR_WIDTH, this.HUD.BAR_HEIGHT, currentHp, maxHp, UITheme.colors.hp, UITheme.colors.hpDim);
            this.drawBarText(currentHp, maxHp, barX, currentY);
            
            currentY += spacingY;
            this.ui.drawBar(barX, currentY, this.HUD.BAR_WIDTH, this.HUD.BAR_HEIGHT, currStam, maxStam, this.COLORS.stamina, this.COLORS.staminaDim);
            this.drawBarText(currStam, maxStam, barX, currentY);

            currentY += spacingY;
            this.ui.drawBar(barX, currentY, this.HUD.BAR_WIDTH, this.HUD.BAR_HEIGHT, currIns, maxIns, this.COLORS.insight, this.COLORS.insightDim);
            this.drawBarText(currIns, maxIns, barX, currentY);
        });
    }

    drawBarText(current, max, barX, barY) {
        this.ctx.font = "9px monospace";
        this.ctx.fillStyle = "#aaa";
        this.ctx.fillText(`${Math.floor(current)}/${max}`, barX + this.HUD.BAR_WIDTH + 5, barY + 5);
    }

    drawEnemyCards(enemies, state) {
        const ENEMY_CARD_H = 38; 
        const stackHeight = (enemies.length * ENEMY_CARD_H) + ((enemies.length - 1) * this.HUD.GAP);
        const bottomMargin = 90; 
        
        const startX = this.config.CANVAS_WIDTH - this.HUD.CARD_W - 10;
        const startY = this.config.CANVAS_HEIGHT - bottomMargin - stackHeight;

        enemies.forEach((enemy, index) => {
            // UPDATED: Use the new visibility checker so the HUD doesn't vanish early either
            if (!this.isEntityVisible(enemy, state)) return; 

            const y = startY + (index * (ENEMY_CARD_H + this.HUD.GAP));

            this.ui.drawPanel(startX, y, this.HUD.CARD_W, ENEMY_CARD_H);

            const maxHp = enemy.maxHp || 10;
            const currentHp = enemy.hp || 0;

            this.ui.drawText(enemy.name, startX + this.HUD.CARD_W - this.HUD.PADDING_X, y + 14, UITheme.fonts.small, UITheme.colors.textMain, "right");

            const barX = (startX + this.HUD.CARD_W - this.HUD.PADDING_X) - this.HUD.BAR_WIDTH;
            const barY = y + 20;

            this.ui.drawBar(barX, barY, this.HUD.BAR_WIDTH, this.HUD.BAR_HEIGHT, currentHp, maxHp, UITheme.colors.hp, UITheme.colors.hpDim);
            
            this.ctx.font = "9px monospace";
            this.ctx.fillStyle = "#aaa";
            this.ctx.textAlign = "right";
            this.ctx.fillText(`${Math.floor(currentHp)}/${maxHp}`, barX - 5, barY + 5);
            this.ctx.textAlign = "left"; 
        });
    }

    drawActionMenu(state) {
        const activeChar = state.activeParty[state.activePartyIndex];
        
        if (!activeChar || !activeChar.abilities) return;

        const itemW = 160;   
        const itemH = 40;    
        const margin = 10;   
        const paddingX = 20; 
        const headerH = 35;  

        const availableWidth = this.config.CANVAS_WIDTH - (paddingX * 2);
        const columns = Math.floor(availableWidth / (itemW + margin));
        
        const totalItems = activeChar.abilities.length;
        const rows = Math.ceil(totalItems / columns);

        const contentHeight = (rows * itemH) + ((rows - 1) * margin);
        const minHeight = 80;
        const h = Math.max(minHeight, contentHeight + headerH + 20); 

        const w = this.config.CANVAS_WIDTH;
        const x = 0;
        const y = this.config.CANVAS_HEIGHT - h; 
        const startY = y + headerH; 

        this.ui.drawPanel(x, y, w, h);

        this.ui.drawText(`${activeChar.name}'s Action`, x + paddingX, y + 20, UITheme.fonts.small, "#aaa");

        activeChar.abilities.forEach((ability, index) => {
            const isSelected = (index === state.menuIndex);
            const canAfford = ability.canPayCost(activeChar); 

            const row = Math.floor(index / columns);
            const col = index % columns;

            const drawX = paddingX + (col * (itemW + margin));
            const drawY = startY + (row * (itemH + margin));

            if (isSelected) {
                this.ctx.fillStyle = this.COLORS.highlight;
                this.ctx.fillRect(drawX, drawY, itemW, itemH);
                
                this.ctx.strokeStyle = canAfford ? "#fff" : "#e74c3c"; 
                this.ctx.strokeRect(drawX, drawY, itemW, itemH);
            } else {
                this.ctx.fillStyle = "#333";
                this.ctx.fillRect(drawX, drawY, itemW, itemH);
            }

            if (!canAfford) {
                this.ctx.globalAlpha = 0.4; 
            }

            const iconSize = 32;
            const iconX = drawX + 4;
            const iconY = drawY + 4; 
            
            this.drawIcon(this.ctx, ability.icon, iconX, iconY, iconSize);

            let textColor = "#fff";
            if (isSelected) {
                textColor = canAfford ? "#000" : "#555"; 
            } else if (!canAfford) {
                textColor = "#aaa"; 
            }

            this.ctx.fillStyle = textColor;
            this.ctx.font = UITheme.fonts.body || "12px sans-serif";
            this.ctx.textAlign = "left";
            this.ctx.fillText(ability.name, iconX + iconSize + 8, iconY + iconSize/2 + 4);

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
        const index = state.targetIndex;
        const enemy = state.activeEnemies[index];
        
        // Use the visibility checker here too!
        if (!this.isEntityVisible(enemy, state)) return; 
        
        const layout = this.LAYOUT.ENEMY[index];
        if(!layout) return;

        const x = Math.floor(layout.x * this.config.CANVAS_WIDTH);
        const y = Math.floor(layout.y * this.config.CANVAS_HEIGHT);
        const size = Math.floor(this.FRAME_SIZE * this.SPRITE_SCALE);

        const arrowX = x - (size/2) - 20; 
        
        this.ctx.fillStyle = "#e74c3c"; 
        this.ctx.beginPath();
        this.ctx.moveTo(arrowX + 15, y);
        this.ctx.lineTo(arrowX, y - 10);
        this.ctx.lineTo(arrowX, y + 10);
        this.ctx.fill();
        
        this.ui.drawText("TARGET", arrowX - 50, y + 5, UITheme.fonts.small, "#e74c3c");
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
}