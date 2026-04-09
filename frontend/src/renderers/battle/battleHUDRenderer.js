import { UITheme } from '../../ui/UITheme.js';
import { TargetingResolver } from '../../../../shared/systems/targetingResolver.js';

export class BattleHUDRenderer {
    constructor(ctx, config, loader, ui, combatantRenderer) {
        this.ctx = ctx;
        this.config = config;
        this.loader = loader;
        this.ui = ui; // canvasUI instance
        this.combatantRenderer = combatantRenderer;

        this.SRC_SIZE = 32; 

        // --- HUD CONFIGURATION ---
        this.HUD = {
            CARD_W: 160,      
            CARD_H: 46,       
            GAP: 6,           
            BAR_HEIGHT: 4,    
            BAR_WIDTH: 75,    
            PADDING_X: 10,
            PADDING_Y: 6      
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
            // FIX: Added string fallbacks in case UITheme colors are undefined
            const color = (state.phase === 'DEFEAT') ? (UITheme.colors.targetRed || '#cc0000') : (UITheme.colors.highlight || '#b89947');
            this.drawCinematicBanner(text, color, this.bannerAlpha);
        }

        // 5. Draw Standard Menus
        if (!isCinematicPhase) {
            if (state.phase === 'SELECT_ACTION') {
                this.drawActionMenu(state);
                this.drawActivePlayerIndicator(state);
            }
            else if (state.phase === 'SELECT_TARGET') {
                const activeChar = state.activeParty[state.activePartyIndex];
                const selectedAbility = state.selectedAction || (activeChar && activeChar.abilities[state.menuIndex]);
                
                const promptText = selectedAbility ? `Select a target for ${selectedAbility.name}...` : "Select a target...";
                
                // Pass the active character's name as a centered title 
                this.drawDialogueBox(promptText, `— ${activeChar.name} —`);
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
        if (this.ui.drawPanel) {
            this.ui.drawPanel(x, y, w, h, UITheme.colors.panelBg, UITheme.colors.panelBorder);
        } else {
            this.ctx.fillStyle = UITheme.colors.panelBg;
            this.ctx.fillRect(x, y, w, h);
            this.ctx.strokeStyle = UITheme.colors.panelBorder;
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(x, y, w, h);
        }
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
            
            this.ctx.font = UITheme.fonts.body;
            this.ctx.fillStyle = UITheme.colors.textMain;
            this.ctx.fillText(member.name, currentX + this.HUD.PADDING_X, y + 14);

            const textWidth = this.ctx.measureText(member.name).width;
            const safeStatusX = currentX + this.HUD.PADDING_X + textWidth + 10; 
            
            this.drawStatusEffects(member, safeStatusX, y); 

            const displayHp = this.getDisplayStat(member, 'hp', member.hp || 0);
            const displayStam = this.getDisplayStat(member, 'stamina', member.stamina || 0);
            const displayIns = this.getDisplayStat(member, 'insight', member.insight || 0);

            const barX = currentX + this.HUD.PADDING_X;
            let currentY = y + 20; 

            // Corrected UITheme mapping for vitals
            this.ui.drawBar(barX, currentY, this.HUD.BAR_WIDTH, this.HUD.BAR_HEIGHT, displayHp, member.maxHp || 10, UITheme.colors.hp, UITheme.colors.hpDim);
            this.drawBarText(displayHp, member.maxHp, barX, currentY); 
            
            currentY += spacingY;
            this.ui.drawBar(barX, currentY, this.HUD.BAR_WIDTH, this.HUD.BAR_HEIGHT, displayStam, member.maxStamina || 10, UITheme.colors.stm, UITheme.colors.stmDim);
            this.drawBarText(displayStam, member.maxStamina, barX, currentY);

            currentY += spacingY;
            this.ui.drawBar(barX, currentY, this.HUD.BAR_WIDTH, this.HUD.BAR_HEIGHT, displayIns, member.maxInsight || 10, UITheme.colors.ins, UITheme.colors.insDim);
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
            
            this.ctx.font = UITheme.fonts.bodyItalic || `italic ${UITheme.fonts.body}`;
            this.ctx.fillStyle = UITheme.colors.textMain;
            this.ctx.textAlign = 'right';
            this.ctx.fillText(enemy.name, currentX + this.HUD.CARD_W - this.HUD.PADDING_X, y + 14);
            this.ctx.textAlign = 'left';

            const textWidth = this.ctx.measureText(enemy.name).width;
            const activeEffects = enemy.statusEffects ? Math.min(enemy.statusEffects.length, 4) : 0;
            const iconsWidth = activeEffects * (16 + 6);
            
            const safeStatusX = currentX + this.HUD.CARD_W - this.HUD.PADDING_X - textWidth - 10 - iconsWidth;
            
            this.drawStatusEffects(enemy, safeStatusX, y);

            const displayHp = this.getDisplayStat(enemy, 'hp', enemy.hp || 0);
            const barX = (currentX + this.HUD.CARD_W - this.HUD.PADDING_X) - this.HUD.BAR_WIDTH;
            const barY = y + 20; 

            // Corrected UITheme mapping for vitals
            this.ui.drawBar(barX, barY, this.HUD.BAR_WIDTH, this.HUD.BAR_HEIGHT, displayHp, enemy.maxHp || 10, UITheme.colors.hp, UITheme.colors.hpDim);
        });
    }

    drawBarText(current, max, barX, barY) {
        this.ctx.save();
        
        // Dynamically shrink the theme's small font by 2px so we don't have to hardcode the font family
        let fontStr = UITheme.fonts.small || '12px sans-serif';
        fontStr = fontStr.replace(/\d+px/, match => Math.max(8, parseInt(match) - 2) + 'px');
        
        this.ctx.font = fontStr;
        this.ctx.fillStyle = UITheme.colors.textMuted;
        this.ctx.textAlign = "left";
        this.ctx.textBaseline = "middle";
        
        // Increased padding from + 5 to + 8 to un-cram it horizontally
        this.ctx.fillText(`${Math.floor(current)}/${max}`, barX + this.HUD.BAR_WIDTH + 8, barY + (this.HUD.BAR_HEIGHT / 2));
        this.ctx.restore();
    }

    drawActionMenu(state) {
        const activeChar = state.activeParty[state.activePartyIndex];
        if (!activeChar || !activeChar.abilities) return;

        const itemSize = 32; 
        const margin = 10;   
        const paddingX = 20; 
        const headerH = 35;  

        const availableWidth = this.config.CANVAS_WIDTH - (paddingX * 2);
        const columns = Math.floor(availableWidth / (itemSize + margin));
        
        // Lock the height to exactly 90 so it never fluctuates
        const h = 90; 

        const w = this.config.CANVAS_WIDTH;
        const x = 0;
        const y = this.config.CANVAS_HEIGHT - h; 
        const startY = y + headerH; 

        // Draw letterbox bottom area
        this.ctx.fillStyle = UITheme.colors.menuBg || 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(x, y, w, h);
        
        // Accent line
        this.ctx.strokeStyle = UITheme.colors.highlight;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(w, y);
        this.ctx.stroke();

        // Centered, smaller character action text
        this.ctx.save();
        this.ctx.textAlign = 'center';
        this.ctx.font = UITheme.fonts.bold; 
        this.ctx.fillStyle = UITheme.colors.textMuted;
        this.ctx.fillText(`— ${activeChar.name} —`, w / 2, y + 22);
        this.ctx.restore();

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
                const brktDist = 2 + (pulse * 2);
                const bracketColor = canAfford ? UITheme.colors.highlight : UITheme.colors.hp;
                
                this.ui.drawSelectionBrackets(drawX, drawY, itemSize, itemSize, brktDist, bracketColor);

                // Subtle inner glow
                this.ctx.fillStyle = canAfford ? (UITheme.colors.highlightGlow || 'rgba(184, 153, 71, 0.2)') : (UITheme.colors.hpGlow || 'rgba(140, 28, 28, 0.2)');
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

        const time = performance.now() * 0.003;
        const bob = Math.sin(time) * 4;
        const arrowY = y - (size/2) - 15 + bob;
        
        const pulse = (Math.sin(time * 2) + 1) / 2; // Oscillates between 0 and 1
        
        this.ctx.save();
        this.ctx.globalAlpha = 0.6 + (pulse * 0.4); // Pulses opacity between 0.6 and 1.0
        this.ctx.fillStyle = UITheme.colors.highlight;
        this.ctx.shadowColor = UITheme.colors.highlight;
        this.ctx.shadowBlur = 8 + (pulse * 12); // Pulses glow between 8 and 20
        
        this.ctx.beginPath();
        this.ctx.moveTo(x, arrowY - 6);
        this.ctx.lineTo(x + 6, arrowY);
        this.ctx.lineTo(x, arrowY + 6);
        this.ctx.lineTo(x - 6, arrowY);
        this.ctx.fill();
        
        this.ctx.restore();
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

        const time = performance.now() * 0.003;
        const bob = Math.sin(time) * 4;
        const pulse = (Math.sin(time * 2.5) + 1) / 2; // Slightly faster pulse for targets

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
            const targetColor = isAllyTargeting ? UITheme.colors.highlight : UITheme.colors.targetRed;

            this.ctx.save();
            
            this.ctx.globalAlpha = 0.6 + (pulse * 0.4); // Pulses opacity between 0.6 and 1.0
            this.ctx.fillStyle = targetColor;
            this.ctx.shadowColor = targetColor;
            this.ctx.shadowBlur = 8 + (pulse * 12); // Pulses glow between 8 and 20
            
            this.ctx.beginPath();
            this.ctx.moveTo(x, arrowY - 6);
            this.ctx.lineTo(x + 6, arrowY);
            this.ctx.lineTo(x, arrowY + 6);
            this.ctx.lineTo(x - 6, arrowY);
            this.ctx.fill();
            
            this.ctx.restore();
        });
    }

    drawDialogueBox(text, title = null) {
        const w = this.config.CANVAS_WIDTH;
        const h = 90; // Locked to 90 to perfectly match the Action Menu
        const x = 0;
        const y = this.config.CANVAS_HEIGHT - h;

        if (this.ui.drawCinematicPanel) {
            this.ui.drawCinematicPanel(x, y, w, h);
        } else {
            this.ctx.fillStyle = UITheme.colors.dialogueBg || 'rgba(15, 15, 17, 0.9)';
            this.ctx.fillRect(x, y, w, h);
            
            this.ctx.fillStyle = UITheme.colors.highlightTransparent || 'rgba(184, 153, 71, 0.4)';
            this.ctx.fillRect(x, y, w, 1);
        }

        let textY = y + 30;

        // Optionally center a title (like the character's name) over the prompt text
        if (title) {
            this.ctx.save();
            this.ctx.textAlign = 'center';
            this.ctx.font = UITheme.fonts.bold;
            this.ctx.fillStyle = UITheme.colors.textMuted;
            this.ctx.fillText(title, x + (w / 2), y + 22);
            this.ctx.restore();
            
            textY = y + 45; // Push the standard body text down slightly 
        }

        this.ui.drawWrappedText(
            text, 
            x + 20, 
            textY, 
            w - 40, 
            20, 
            UITheme.fonts.body, 
            UITheme.colors.textMain
        );
    }

    drawCinematicBanner(text, color, alpha = 1.0) {
        if (alpha <= 0.01) return;

        const w = this.config.CANVAS_WIDTH;
        const h = 120; 
        const y = (this.config.CANVAS_HEIGHT / 2) - (h / 2);

        this.ctx.save(); 

        this.ctx.fillStyle = `rgba(0, 0, 0, ${0.4 * alpha})`;
        this.ctx.fillRect(0, 0, w, this.config.CANVAS_HEIGHT);

        this.ctx.fillStyle = `rgba(0, 0, 0, ${0.85 * alpha})`;
        this.ctx.fillRect(0, y, w, h);

        const grad = this.ctx.createLinearGradient(0, y, w, y);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        // FIX: Added a final safety fallback here just in case the method is called manually with an undefined color
        grad.addColorStop(0.5, color || '#ffffff'); 
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        
        this.ctx.fillStyle = grad;
        this.ctx.globalAlpha = 0.5 * alpha;
        this.ctx.fillRect(0, y, w, 1);
        this.ctx.fillRect(0, y + h, w, 1);
        
        this.ctx.globalAlpha = alpha; 
        this.ctx.font = UITheme.fonts.title; 
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

        const iconSize = 16;
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
        this.ctx.fillStyle = UITheme.colors.textMain;
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