import { UITheme } from '../../ui/UITheme.js';
import { TargetingResolver } from '../../../../shared/systems/targetingResolver.js';

export class BattleHUDRenderer {
    constructor(ctx, config, loader, ui, combatantRenderer) {
        this.ctx = ctx;
        this.config = config;
        this.loader = loader;
        this.ui = ui;
        this.combatantRenderer = combatantRenderer;

        this.SRC_SIZE = 32; 

        // --- HUD CONFIGURATION ---
        this.HUD = {
            CARD_W: 160,      
            CARD_H: 46,       
            GAP: 6,           
            BAR_HEIGHT: 4,    // Thinner, more elegant bars
            BAR_WIDTH: 75,    
            PADDING_X: 10,
            PADDING_Y: 6      
        };

        // --- SOULS-LIKE PALETTE ---
        this.COLORS = {
            panelBg: 'rgba(15, 15, 17, 0.85)',
            panelBorder: '#3a352c',
            textMain: '#d4cbb8',
            textMuted: '#8a8578',
            stamina: '#4a5d4e',     
            staminaDim: '#1f2621',
            insight: '#4a5b70',     
            insightDim: '#1e242c',
            hp: '#8c1c1c',
            hpDim: '#2b0909',
            highlight: '#b89947',   // Tarnished Gold
            targetRed: '#9e1a1a'
        };

        this.displayStats = new WeakMap(); 
        this.BAR_LERP_SPEED = 5.0; 
        this.dt = 0; 
        
        // Banner and Phase timing
        this.bannerAlpha = 0.0; 
        this.lastPhase = null;
        this.phaseTime = 0;
    }

    render(state, dt) {
        this.dt = dt;

        // Track how long we've been in the current phase
        if (this.lastPhase !== state.phase) {
            this.phaseTime = 0;
            this.lastPhase = state.phase;
        }
        this.phaseTime += this.dt;

        // 1. Draw Static HUD Elements
        this.drawHUD(state);

        let targetBannerAlpha = 0.0;
        const isCinematicPhase = ['INTRO', 'RESOLVE', 'VICTORY', 'DEFEAT'].includes(state.phase);

        // 2. Evaluate Contextual Layers
        if (isCinematicPhase) {
            const isEndPhase = state.phase === 'VICTORY' || state.phase === 'DEFEAT';

            if (isEndPhase) {
                targetBannerAlpha = 1.0;
            }

            if (state.message) {
                if (isEndPhase) {
                    // Wait 3 full seconds before drawing the dialog box and dropping the banner
                    if (this.phaseTime > 3.0) { 
                        this.drawDialogueBox(state.message);
                        targetBannerAlpha = 0.0; 
                    }
                } else {
                    // For INTRO or RESOLVE, just draw the dialogue box without a banner
                    this.drawDialogueBox(state.message);
                }
            }
        }

        // 3. Smoothly lerp the banner's opacity
        const FADE_SPEED = 3.0;
        this.bannerAlpha += (targetBannerAlpha - this.bannerAlpha) * FADE_SPEED * this.dt;
        this.bannerAlpha = Math.max(0, Math.min(1, this.bannerAlpha)); 
        
        // 4. Draw giant overlay banners if they have any opacity
        if (this.bannerAlpha > 0.01) {
            const text = (state.phase === 'DEFEAT') ? 'PARTY SLAIN' : 'ENEMY SLAIN';
            const color = (state.phase === 'DEFEAT') ? this.COLORS.targetRed : this.COLORS.highlight;
            this.drawCinematicBanner(text, color, this.bannerAlpha);
        }

        // 5. Draw Standard Menus
        if (!isCinematicPhase) {
            if (state.phase === 'SELECT_ACTION') {
                this.drawActionMenu(state);
                this.drawActivePlayerIndicator(state);
            }
            else if (state.phase === 'SELECT_TARGET') {
                this.drawActionMenu(state);
                this.drawTargetCursor(state); 
            }
        }
    }

    drawHUD(state) {
        if (state.activeParty && state.activeParty.length > 0) {
            this.drawPartyCards(state.activeParty, state); 
        }
        if (state.activeEnemies && state.activeEnemies.length > 0) {
            this.drawEnemyCards(state.activeEnemies, state);
        }
    }

    drawDarkPanel(x, y, w, h) {
        this.ctx.fillStyle = this.COLORS.panelBg;
        this.ctx.fillRect(x, y, w, h);
        this.ctx.strokeStyle = this.COLORS.panelBorder;
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, w, h);
    }

    drawPartyCards(party, state) { 
        const targetX = 15;
        const hiddenX = -this.HUD.CARD_W - 20;
        const startY = 15;
        const spacingY = 8; 
        
        party.forEach((member, index) => {
            if (!member) return; 

            const isVisible = this.combatantRenderer.isEntityVisible(member, state);
            const slideProgress = this.getDisplaySlide(member, isVisible);

            if (slideProgress <= 0) return; 

            const currentX = hiddenX + ((targetX - hiddenX) * Math.pow(slideProgress, 0.5)); 
            const y = startY + (index * (this.HUD.CARD_H + this.HUD.GAP));
            
            this.drawDarkPanel(currentX, y, this.HUD.CARD_W, this.HUD.CARD_H);
            
            this.ctx.font = '12px "Georgia", serif';
            this.ctx.fillStyle = this.COLORS.textMain;
            this.ctx.fillText(member.name, currentX + this.HUD.PADDING_X, y + 14);

            // Dynamically measure text so icons never overlap the name
            const textWidth = this.ctx.measureText(member.name).width;
            const safeStatusX = currentX + this.HUD.PADDING_X + textWidth + 10; 
            
            this.drawStatusEffects(member, safeStatusX, y); // Adjusted Y to cleanly frame the text baseline

            const displayHp = this.getDisplayStat(member, 'hp', member.hp || 0);
            const displayStam = this.getDisplayStat(member, 'stamina', member.stamina || 0);
            const displayIns = this.getDisplayStat(member, 'insight', member.insight || 0);

            const barX = currentX + this.HUD.PADDING_X;
            let currentY = y + 20; 

            this.ui.drawBar(barX, currentY, this.HUD.BAR_WIDTH, this.HUD.BAR_HEIGHT, displayHp, member.maxHp || 10, this.COLORS.hp, this.COLORS.hpDim);
            this.drawBarText(displayHp, member.maxHp, barX, currentY); 
            
            currentY += spacingY;
            this.ui.drawBar(barX, currentY, this.HUD.BAR_WIDTH, this.HUD.BAR_HEIGHT, displayStam, member.maxStamina || 10, this.COLORS.stamina, this.COLORS.staminaDim);
            this.drawBarText(displayStam, member.maxStamina, barX, currentY);

            currentY += spacingY;
            this.ui.drawBar(barX, currentY, this.HUD.BAR_WIDTH, this.HUD.BAR_HEIGHT, displayIns, member.maxInsight || 10, this.COLORS.insight, this.COLORS.insightDim);
            this.drawBarText(displayIns, member.maxInsight, barX, currentY);
        });
    }

    drawEnemyCards(enemies, state) {
        const ENEMY_CARD_H = 32; 
        const stackHeight = (enemies.length * ENEMY_CARD_H) + ((enemies.length - 1) * this.HUD.GAP);
        const bottomMargin = 90; 
        
        const targetX = this.config.CANVAS_WIDTH - this.HUD.CARD_W - 15;
        const hiddenX = this.config.CANVAS_WIDTH + 20; 
        const startY = this.config.CANVAS_HEIGHT - bottomMargin - stackHeight;

        enemies.forEach((enemy, index) => {
            const isVisible = this.combatantRenderer.isEntityVisible(enemy, state);
            const slideProgress = this.getDisplaySlide(enemy, isVisible);

            if (slideProgress <= 0) return; 

            const currentX = hiddenX + ((targetX - hiddenX) * Math.pow(slideProgress, 0.5));
            const y = startY + (index * (ENEMY_CARD_H + this.HUD.GAP));

            this.drawDarkPanel(currentX, y, this.HUD.CARD_W, ENEMY_CARD_H);
            
            this.ctx.font = 'italic 12px "Georgia", serif';
            this.ctx.fillStyle = this.COLORS.textMain;
            this.ctx.textAlign = 'right';
            this.ctx.fillText(enemy.name, currentX + this.HUD.CARD_W - this.HUD.PADDING_X, y + 14);
            this.ctx.textAlign = 'left';

            // Calculate exact space needed so right-aligned names don't crash into left-aligned icons
            const textWidth = this.ctx.measureText(enemy.name).width;
            const activeEffects = enemy.statusEffects ? Math.min(enemy.statusEffects.length, 4) : 0;
            const iconsWidth = activeEffects * (16 + 6); // 16px icon + 6px spacing
            
            const safeStatusX = currentX + this.HUD.CARD_W - this.HUD.PADDING_X - textWidth - 10 - iconsWidth;
            
            this.drawStatusEffects(enemy, safeStatusX, y);

            const displayHp = this.getDisplayStat(enemy, 'hp', enemy.hp || 0);
            const barX = (currentX + this.HUD.CARD_W - this.HUD.PADDING_X) - this.HUD.BAR_WIDTH;
            const barY = y + 20; 

            this.ui.drawBar(barX, barY, this.HUD.BAR_WIDTH, this.HUD.BAR_HEIGHT, displayHp, enemy.maxHp || 10, this.COLORS.hp, this.COLORS.hpDim);
        });
    }

    drawBarText(current, max, barX, barY) {
        this.ctx.save();
        this.ctx.font = '9px "Georgia", serif';
        this.ctx.fillStyle = this.COLORS.textMuted;
        this.ctx.textAlign = "left";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText(`${Math.floor(current)}/${max}`, barX + this.HUD.BAR_WIDTH + 5, barY + (this.HUD.BAR_HEIGHT / 2));
        this.ctx.restore();
    }

    drawActionMenu(state) {
        const activeChar = state.activeParty[state.activePartyIndex];
        if (!activeChar || !activeChar.abilities) return;

        const itemSize = 32; // Explicitly set to 32x32 pixels
        const margin = 10;   
        const paddingX = 20; 
        const headerH = 35;  

        const availableWidth = this.config.CANVAS_WIDTH - (paddingX * 2);
        const columns = Math.floor(availableWidth / (itemSize + margin));
        
        const totalItems = activeChar.abilities.length;
        const rows = Math.ceil(totalItems / columns);

        const contentHeight = (rows * itemSize) + ((rows - 1) * margin);
        const minHeight = 85;
        const h = Math.max(minHeight, contentHeight + headerH + 20); 

        const w = this.config.CANVAS_WIDTH;
        const x = 0;
        const y = this.config.CANVAS_HEIGHT - h; 
        const startY = y + headerH; 

        // Draw letterbox bottom area
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(x, y, w, h);
        
        // Gold accent line
        this.ctx.strokeStyle = this.COLORS.highlight;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(w, y);
        this.ctx.stroke();

        this.ctx.font = '14px "Georgia", serif';
        this.ctx.fillStyle = this.COLORS.textMuted;
        this.ctx.fillText(`${activeChar.name}'s Action`, x + paddingX, y + 22);

        // --- ANIMATED SELECTOR LOGIC ---
        const time = performance.now() * 0.004;
        const pulse = (Math.sin(time) + 1) / 2; // 0 to 1

        activeChar.abilities.forEach((ability, index) => {
            const isSelected = (index === state.menuIndex);
            const canAfford = ability.canPayCost ? ability.canPayCost(activeChar) : true; 

            const row = Math.floor(index / columns);
            const col = index % columns;

            const drawX = paddingX + (col * (itemSize + margin));
            const drawY = startY + (row * (itemSize + margin));

            if (isSelected) {
                // Centralized UI Bracket Drawing
                const brktDist = 2 + (pulse * 2);
                const bracketColor = canAfford ? this.COLORS.highlight : this.COLORS.hp;
                
                this.ui.drawSelectionBrackets(drawX, drawY, itemSize, itemSize, brktDist, bracketColor);

                // Subtle inner glow
                this.ctx.fillStyle = canAfford ? 'rgba(184, 153, 71, 0.2)' : 'rgba(140, 28, 28, 0.2)';
                this.ctx.fillRect(drawX, drawY, itemSize, itemSize);
            } 

            if (!canAfford) {
                this.ctx.globalAlpha = 0.3; 
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

        // Animated bobbing
        const time = performance.now() * 0.003;
        const bob = Math.sin(time) * 4;
        const arrowY = y - (size/2) - 15 + bob;
        
        this.ctx.fillStyle = this.COLORS.highlight;
        this.ctx.shadowColor = this.COLORS.highlight;
        this.ctx.shadowBlur = 10;
        
        // Draw a diamond
        this.ctx.beginPath();
        this.ctx.moveTo(x, arrowY - 6);
        this.ctx.lineTo(x + 6, arrowY);
        this.ctx.lineTo(x, arrowY + 6);
        this.ctx.lineTo(x - 6, arrowY);
        this.ctx.fill();
        
        this.ctx.shadowBlur = 0;
    }

    drawTargetCursor(state) {
        const activeChar = state.activeParty?.[state.activePartyIndex];
        if (!activeChar) return;

        const selectedAbility = state.selectedAction || activeChar.abilities[state.menuIndex];
        if (!selectedAbility) return;

        const scope = selectedAbility?.targeting?.scope || 'enemy';
        const isAllyTargeting = ['ally', 'all_allies', 'self'].includes(scope);
        
        let primaryTarget;
        if (state.targetIndex === 'ALL') primaryTarget = 'ALL';
        else if (isAllyTargeting) primaryTarget = state.activeParty[state.targetIndex];
        else primaryTarget = state.activeEnemies[state.targetIndex];

        const targets = TargetingResolver.resolve(selectedAbility, activeChar, primaryTarget, state) || [];

        // Share the same bobbing timeline as the active player indicator
        const time = performance.now() * 0.003;
        const bob = Math.sin(time) * 4;

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

            const arrowY = y - (size/2) - 15 + bob;
            const targetColor = isAllyTargeting ? this.COLORS.highlight : this.COLORS.targetRed;

            this.ctx.save();
            
            this.ctx.fillStyle = targetColor;
            this.ctx.shadowColor = targetColor;
            this.ctx.shadowBlur = 10;
            
            // Draw the diamond
            this.ctx.beginPath();
            this.ctx.moveTo(x, arrowY - 6);
            this.ctx.lineTo(x + 6, arrowY);
            this.ctx.lineTo(x, arrowY + 6);
            this.ctx.lineTo(x - 6, arrowY);
            this.ctx.fill();
            
            this.ctx.restore();
        });
    }

    drawDialogueBox(text) {
        const w = this.config.CANVAS_WIDTH;
        const h = 80; 
        const x = 0;
        const y = this.config.CANVAS_HEIGHT - h;

        // Cinematic Dark Panel
        this.ctx.fillStyle = 'rgba(15, 15, 17, 0.9)';
        this.ctx.fillRect(x, y, w, h);
        
        // Top Gold Accent Border
        this.ctx.fillStyle = 'rgba(184, 153, 71, 0.4)';
        this.ctx.fillRect(x, y, w, 1);

        this.ui.drawWrappedText(
            text, 
            x + 20, 
            y + 30, 
            w - 40, 
            20, 
            UITheme.fonts.body, 
            this.COLORS.textMain
        );
    }

    drawCinematicBanner(text, color, alpha = 1.0) {
        if (alpha <= 0.01) return;

        const w = this.config.CANVAS_WIDTH;
        const h = 120; 
        const y = (this.config.CANVAS_HEIGHT / 2) - (h / 2);

        this.ctx.save(); 

        // 1. Darken the entire screen behind the banner
        this.ctx.fillStyle = `rgba(0, 0, 0, ${0.4 * alpha})`;
        this.ctx.fillRect(0, 0, w, this.config.CANVAS_HEIGHT);

        // 2. Draw the heavy black letterbox strip
        this.ctx.fillStyle = `rgba(0, 0, 0, ${0.85 * alpha})`;
        this.ctx.fillRect(0, y, w, h);

        // 3. Draw fading glowing borders
        const grad = this.ctx.createLinearGradient(0, y, w, y);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.5, color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        
        this.ctx.fillStyle = grad;
        this.ctx.globalAlpha = 0.5 * alpha;
        this.ctx.fillRect(0, y, w, 1);
        this.ctx.fillRect(0, y + h, w, 1);
        
        // 4. Draw the iconic spaced-out typography
        this.ctx.globalAlpha = alpha; 
        this.ctx.font = 'normal 42px "Georgia", serif'; 
        this.ctx.fillStyle = color;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        const spacedText = text.split('').join('  ');
        
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = 15;
        this.ctx.fillText(spacedText, w / 2, y + (h / 2) + 4); 
        
        this.ctx.restore(); 
    }

    drawStatusEffects(entity, startX, startY) {
        if (!entity.statusEffects || entity.statusEffects.length === 0) return;

        const iconSize = 16; // Explicitly set to 16x16 pixels
        const spacing = 6;   
        const maxIcons = 4;  

        const effectsToDraw = entity.statusEffects.slice(0, maxIcons);

        effectsToDraw.forEach((effect, index) => {
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
        this.ctx.fillStyle = this.COLORS.textMain;
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
    
    getDisplaySlide(entity, isVisible) {
        let stats = this.displayStats.get(entity);
        if (!stats) {
            stats = {};
            this.displayStats.set(entity, stats);
        }

        const target = isVisible ? 1.0 : 0.0;
        if (stats.slide === undefined) stats.slide = 0.0; 

        const SLIDE_SPEED = 10.0; 
        const diff = target - stats.slide;
        
        if (Math.abs(diff) > 0.01) {
            stats.slide += diff * SLIDE_SPEED * this.dt;
        } else {
            stats.slide = target;
        }
        
        return stats.slide;
    }
}