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
    this.HUD = {
      CARD_W: 384,
      CARD_H: 110,
      GAP: 14,
      BAR_HEIGHT: 10,
      BAR_WIDTH: 180,
      PADDING_X: 24,
      PADDING_Y: 14
    };
    this.displayStats = new WeakMap();
    this.BAR_LERP_SPEED = 5.0;
    this.dt = 0;
    this.bannerAlpha = 0.0;
    this.lastPhase = null;
    this.phaseTime = 0;
  }

  render(state, dt, hitboxes = []) {
    this.dt = dt;
    if (this.lastPhase !== state.phase) {
      this.phaseTime = 0;
      this.lastPhase = state.phase;
    }
    this.phaseTime += this.dt;

    this.drawHUD(state, hitboxes);

    let targetBannerAlpha = 0.0;
    const isCinematicPhase = ['INTRO', 'RESOLVE', 'VICTORY', 'DEFEAT'].includes(state.phase);

    if (isCinematicPhase) {
      const isEndPhase = state.phase === 'VICTORY' || state.phase === 'DEFEAT';
      if (isEndPhase) {
        targetBannerAlpha = 1.0;
      }
      if (state.message) {
        if (isEndPhase) {
          if (this.phaseTime > 3.0) {
            this.drawDialogueBox(state.message);
            targetBannerAlpha = 0.0;
          }
        } else {
          this.drawDialogueBox(state.message);
        }
      }
    }

    const FADE_SPEED = 3.0;
    this.bannerAlpha += (targetBannerAlpha - this.bannerAlpha) * FADE_SPEED * this.dt;
    this.bannerAlpha = Math.max(0, Math.min(1, this.bannerAlpha));

    if (this.bannerAlpha > 0.01) {
      const text = (state.phase === 'DEFEAT') ? 'PARTY SLAIN' : 'ENEMY SLAIN';
      const color = (state.phase === 'DEFEAT') ? (UITheme.colors.targetRed || '#cc0000') : (UITheme.colors.highlight || '#b89947');
      this.drawCinematicBanner(text, color, this.bannerAlpha);
    }

    if (!isCinematicPhase) {
      if (state.phase === 'SELECT_ACTION') {
        this.drawActionMenu(state, hitboxes);
        this.drawActivePlayerIndicator(state);
        
        // --- MODIFIED: Wrap details rendering context inside layout state conditional ---
        if (state.showAbilityDetails) {
          const activeChar = state.activeParty[state.activePartyIndex];
          const focusedAbility = activeChar?.abilities?.[state.menuIndex];
          if (focusedAbility) {
            this.drawAbilityDetailsPopup(focusedAbility, state.menuIndex);
          }
        }
      } else if (state.phase === 'SELECT_TARGET') {
        const activeChar = state.activeParty[state.activePartyIndex];
        const selectedAbility = state.selectedAction || (activeChar && activeChar.abilities[state.menuIndex]);
        const promptText = selectedAbility ? `Select target(s) for ${selectedAbility.name}...` : "Select a target...";
        this.drawDialogueBox(promptText, `— ${activeChar.name} —`);
        this.drawTargetCursor(state);
      }
    }
  }

  drawHUD(state, hitboxes = []) {
    if (state.activeParty && state.activeParty.length > 0) {
      this.drawPartyCards(state.activeParty, state, hitboxes);
    }
    if (state.activeEnemies && state.activeEnemies.length > 0) {
      this.drawEnemyCards(state.activeEnemies, state, hitboxes);
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

  drawPartyCards(party, state, hitboxes = []) {
    const targetX = 36;
    const hiddenX = -this.HUD.CARD_W - 48;
    const startY = 36;
    const spacingY = 19;
    const activeChar = state.activeParty?.[state.activePartyIndex];
    const selectedAbility = state.selectedAction || (activeChar?.abilities?.[state.menuIndex]);
    const targetGroup = selectedAbility?.targetGroup || state.targetGroup;

    party.forEach((member, index) => {
      if (!member) return;
      const isVisible = this.combatantRenderer.isEntityVisible(member, state);
      const slideProgress = this.getDisplaySlide(member, isVisible);
      if (slideProgress <= 0) return;

      const currentX = hiddenX + ((targetX - hiddenX) * Math.pow(slideProgress, 0.5));
      const y = startY + (index * (this.HUD.CARD_H + this.HUD.GAP));

      let isValidTarget = true;
      if (state.phase === 'SELECT_TARGET') {
        if (targetGroup === 'enemy') isValidTarget = false;
        if (targetGroup === 'self' && member !== activeChar) isValidTarget = false;
      }

      const targetId = `TARGET_PARTY_${index}`;
      if (state.phase === 'SELECT_TARGET') {
        hitboxes.push({
          id: targetId,
          x: currentX,
          y: y,
          w: this.HUD.CARD_W,
          h: this.HUD.CARD_H,
          width: this.HUD.CARD_W,
          height: this.HUD.CARD_H,
          cursor: isValidTarget ? 'pointer' : 'not-allowed'
        });
      }

      this.ctx.save();
      const isAlreadySelected = state.selectedTargets?.includes(member);
      if (!isValidTarget && !isAlreadySelected && state.phase === 'SELECT_TARGET') {
        this.ctx.globalAlpha = 0.4;
      }

      this.drawDarkPanel(currentX, y, this.HUD.CARD_W, this.HUD.CARD_H);

      const isHoveredTarget = isValidTarget && state.hoveredElement?.id === targetId;
      if ((isHoveredTarget || isAlreadySelected) && state.phase === 'SELECT_TARGET') {
        this.ui.drawSelectionBrackets(currentX, y, this.HUD.CARD_W, this.HUD.CARD_H, 4, UITheme.colors.highlight);
        this.ctx.fillStyle = UITheme.colors.highlightGlow || 'rgba(184, 153, 71, 0.15)';
        this.ctx.fillRect(currentX, y, this.HUD.CARD_W, this.HUD.CARD_H);
      }

      this.ctx.font = UITheme.fonts.body;
      this.ctx.fillStyle = UITheme.colors.textMain;
      this.ctx.fillText(member.name, currentX + this.HUD.PADDING_X, y + 34);

      const textWidth = this.ctx.measureText(member.name).width;
      const safeStatusX = currentX + this.HUD.PADDING_X + textWidth + 24;
      this.drawStatusEffects(member, safeStatusX, y);

      const displayHp = this.getDisplayStat(member, 'hp', member.hp || 0);
      const displayStam = this.getDisplayStat(member, 'stamina', member.stamina || 0);
      const displayIns = this.getDisplayStat(member, 'insight', member.insight || 0);

      const barX = currentX + this.HUD.PADDING_X;
      let currentY = y + 48;

      this.ui.drawBar(barX, currentY, this.HUD.BAR_WIDTH, this.HUD.BAR_HEIGHT, displayHp, member.maxHp || 10, UITheme.colors.hp, UITheme.colors.hpDim);
      this.drawBarText(displayHp, member.maxHp, barX, currentY);

      currentY += spacingY;
      this.ui.drawBar(barX, currentY, this.HUD.BAR_WIDTH, this.HUD.BAR_HEIGHT, displayStam, member.maxStamina || 10, UITheme.colors.stm, UITheme.colors.stmDim);
      this.drawBarText(displayStam, member.maxStamina, barX, currentY);

      currentY += spacingY;
      this.ui.drawBar(barX, currentY, this.HUD.BAR_WIDTH, this.HUD.BAR_HEIGHT, displayIns, member.maxInsight || 10, UITheme.colors.ins, UITheme.colors.insDim);
      this.drawBarText(displayIns, member.maxInsight, barX, currentY);

      this.ctx.restore();
    });
  }

  drawEnemyCards(enemies, state, hitboxes = []) {
    const ENEMY_CARD_H = 77;
    const stackHeight = (enemies.length * ENEMY_CARD_H) + ((enemies.length - 1) * this.HUD.GAP);
    const bottomMargin = 216;
    const targetX = this.config.CANVAS_WIDTH - this.HUD.CARD_W - 36;
    const hiddenX = this.config.CANVAS_WIDTH + 48;
    const startY = this.config.CANVAS_HEIGHT - bottomMargin - stackHeight;
    const activeChar = state.activeParty?.[state.activePartyIndex];
    const selectedAbility = state.selectedAction || (activeChar?.abilities?.[state.menuIndex]);
    const targetGroup = selectedAbility?.targetGroup || state.targetGroup;

    enemies.forEach((enemy, index) => {
      const isVisible = this.combatantRenderer.isEntityVisible(enemy, state);
      const slideProgress = this.getDisplaySlide(enemy, isVisible);
      if (slideProgress <= 0) return;

      const currentX = hiddenX + ((targetX - hiddenX) * Math.pow(slideProgress, 0.5));
      const y = startY + (index * (ENEMY_CARD_H + this.HUD.GAP));

      let isValidTarget = true;
      if (state.phase === 'SELECT_TARGET') {
        if (targetGroup === 'party' || targetGroup === 'self') isValidTarget = false;
      }

      const targetId = `TARGET_ENEMY_${index}`;
      if (state.phase === 'SELECT_TARGET') {
        hitboxes.push({
          id: targetId,
          x: currentX,
          y: y,
          w: this.HUD.CARD_W,
          h: ENEMY_CARD_H,
          width: this.HUD.CARD_W,
          height: ENEMY_CARD_H,
          cursor: isValidTarget ? 'pointer' : 'not-allowed'
        });
      }

      this.ctx.save();
      const isAlreadySelected = state.selectedTargets?.includes(enemy);
      if (!isValidTarget && !isAlreadySelected && state.phase === 'SELECT_TARGET') {
        this.ctx.globalAlpha = 0.4;
      }

      this.drawDarkPanel(currentX, y, this.HUD.CARD_W, ENEMY_CARD_H);

      const isHoveredTarget = isValidTarget && state.hoveredElement?.id === targetId;
      if ((isHoveredTarget || isAlreadySelected) && state.phase === 'SELECT_TARGET') {
        this.ui.drawSelectionBrackets(currentX, y, this.HUD.CARD_W, ENEMY_CARD_H, 4, UITheme.colors.highlight);
        this.ctx.fillStyle = UITheme.colors.highlightGlow || 'rgba(184, 153, 71, 0.15)';
        this.ctx.fillRect(currentX, y, this.HUD.CARD_W, ENEMY_CARD_H);
      }

      this.ctx.font = UITheme.fonts.bodyItalic || `italic ${UITheme.fonts.body}`;
      this.ctx.fillStyle = UITheme.colors.textMain;
      this.ctx.textAlign = 'right';
      this.ctx.fillText(enemy.name, currentX + this.HUD.CARD_W - this.HUD.PADDING_X, y + 34);

      this.ctx.textAlign = 'left';
      const textWidth = this.ctx.measureText(enemy.name).width;
      const activeEffects = enemy.statusEffects ? Math.min(enemy.statusEffects.length, 4) : 0;
      const iconsWidth = activeEffects * (38 + 14);
      const safeStatusX = currentX + this.HUD.CARD_W - this.HUD.PADDING_X - textWidth - 24 - iconsWidth;
      this.drawStatusEffects(enemy, safeStatusX, y);

      const displayHp = this.getDisplayStat(enemy, 'hp', enemy.hp || 0);
      const barX = (currentX + this.HUD.CARD_W - this.HUD.PADDING_X) - this.HUD.BAR_WIDTH;
      const barY = y + 48;

      this.ui.drawBar(barX, barY, this.HUD.BAR_WIDTH, this.HUD.BAR_HEIGHT, displayHp, enemy.maxHp || 10, UITheme.colors.hp, UITheme.colors.hpDim);
      this.ctx.restore();
    });
  }

  drawBarText(current, max, barX, barY) {
    this.ctx.save();
    let fontStr = UITheme.fonts.small || '28px sans-serif';
    fontStr = fontStr.replace(/\d+px/, match => Math.max(19, parseInt(match) - 5) + 'px');
    this.ctx.font = fontStr;
    this.ctx.fillStyle = UITheme.colors.textMuted;
    this.ctx.textAlign = "left";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(`${Math.floor(current)}/${max}`, barX + this.HUD.BAR_WIDTH + 19, barY + (this.HUD.BAR_HEIGHT / 2));
    this.ctx.restore();
  }

  drawActionMenu(state, hitboxes = []) {
    const activeChar = state.activeParty[state.activePartyIndex];
    if (!activeChar || !activeChar.abilities) return;

    const itemSize = 64;
    const margin = 24;
    const paddingX = 48;
    const headerH = 84;
    const availableWidth = this.config.CANVAS_WIDTH - (paddingX * 2);
    const columns = Math.floor(availableWidth / (itemSize + margin));
    const h = 216;
    const w = this.config.CANVAS_WIDTH;
    const x = 0;
    const y = this.config.CANVAS_HEIGHT - h;
    const startY = y + headerH;

    this.ctx.fillStyle = UITheme.colors.menuBg || 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(x, y, w, h);
    this.ctx.strokeStyle = UITheme.colors.highlight;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(w, y);
    this.ctx.stroke();

    this.ctx.save();
    this.ctx.textAlign = 'center';
    this.ctx.font = UITheme.fonts.bold;
    this.ctx.fillStyle = UITheme.colors.textMuted;
    this.ctx.fillText(`— ${activeChar.name} —`, w / 2, y + 53);
    this.ctx.restore();

    const btnW = 160;
    const btnH = 48;
    const btnY = y + 20;
    const globalBtns = [
      { id: 'BUTTON_PARTY', text: 'Party [P]', x: 48 },
      { id: 'BUTTON_INVENTORY', text: 'Items [I]', x: w - btnW - 48 }
    ];

    globalBtns.forEach(btn => {
      hitboxes.push({ id: btn.id, x: btn.x, y: btnY, w: btnW, h: btnH, cursor: 'pointer' });
      const isHovered = state.hoveredElement?.id === btn.id;
      this.drawDarkPanel(btn.x, btnY, btnW, btnH);

      if (isHovered) {
        this.ui.drawSelectionBrackets(btn.x, btnY, btnW, btnH, 4, UITheme.colors.highlight);
        this.ctx.fillStyle = UITheme.colors.highlightGlow || 'rgba(184, 153, 71, 0.15)';
        this.ctx.fillRect(btn.x, btnY, btnW, btnH);
      }

      this.ctx.save();
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.font = UITheme.fonts.small || '18px sans-serif';
      this.ctx.fillStyle = isHovered ? (UITheme.colors.textHighlight || UITheme.colors.textMain) : UITheme.colors.textMuted;
      this.ctx.fillText(btn.text, btn.x + (btnW / 2), btnY + (btnH / 2));
      this.ctx.restore();
    });

    const time = performance.now() * 0.004;
    const pulse = (Math.sin(time) + 1) / 2;

    activeChar.abilities.forEach((ability, index) => {
      const isSelected = (index === state.menuIndex);
      const canAfford = ability.canPayCost ? ability.canPayCost(activeChar) : true;
      const row = Math.floor(index / columns);
      const col = index % columns;
      const drawX = paddingX + (col * (itemSize + margin));
      const drawY = startY + (row * (itemSize + margin));
      const actionId = `ACTION_${index}`;

      hitboxes.push({
        id: actionId,
        x: drawX,
        y: drawY,
        w: itemSize,
        h: itemSize,
        width: itemSize,
        height: itemSize,
        cursor: canAfford ? 'pointer' : 'not-allowed'
      });

      const isHovered = state.hoveredElement?.id === actionId;
      if (isSelected || isHovered) {
        const brktDist = isSelected ? (5 + (pulse * 5)) : 5;
        const bracketColor = canAfford ? UITheme.colors.highlight : UITheme.colors.hp;
        this.ui.drawSelectionBrackets(drawX, drawY, itemSize, itemSize, brktDist, bracketColor);
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

  drawAbilityDetailsPopup(ability, menuIndex) {
    // --- 1. Damage Type Colors Configuration ---
    let rawType = ability.damageType || (ability.type ? ability.type.toLowerCase() : 'physical');
    if (!ability.damageType && ability.effects && ability.effects.length > 0) {
      const dmgEffect = ability.effects.find(e => e.type === 'damage');
      if (dmgEffect && dmgEffect.damageType) rawType = dmgEffect.damageType.toLowerCase();
    }
    const themeColor = (UITheme.colors.types && UITheme.colors.types[rawType]) || UITheme.colors.textMuted;
    const displayType = rawType.charAt(0).toUpperCase() + rawType.slice(1);

    // --- 2. Calculate Content & Dynamic Heights ---
    const cardPadding = 24;
    const w = 480;
    const descW = w - (cardPadding * 2);
    const descStr = ability.description || 'No description available.';
    const fontItalic = UITheme.fonts.cardItalic || UITheme.fonts.bodyItalic || `italic ${UITheme.fonts.body}`;

    // Measure description lines
    let descLines = [descStr];
    if (this.ui.getWrappedLines) {
      descLines = this.ui.getWrappedLines(descStr, descW, fontItalic);
    }

    // Check for stats to adjust block height
    const pwr = ability.power || (ability.effects && ability.effects.find(e => e.type === 'damage' || e.type === 'heal')?.power);
    const hasStats = pwr || ability.accuracy || ability.speed;
    const infoBlockHeight = hasStats ? 160 : 136;
    const dividerHeight = descLines.length > 0 ? 40 : 0;
    const descTextHeight = descLines.length > 0 ? (descLines.length * 24) : 0;
    const h = cardPadding + infoBlockHeight + dividerHeight + descTextHeight + cardPadding;

    // --- 3. Calculate Positioning (Bottom-Up Anchoring) ---
    const itemSize = 64;
    const margin = 24;
    const paddingX = 48;
    const availableWidth = this.config.CANVAS_WIDTH - (paddingX * 2);
    const columns = Math.floor(availableWidth / (itemSize + margin));
    const col = menuIndex % columns;
    const buttonX = paddingX + (col * (itemSize + margin));
    
    let x = buttonX + (itemSize / 2) - (w / 2);
    x = Math.max(24, Math.min(x, this.config.CANVAS_WIDTH - w - 24));
    
    const actionMenuTop = this.config.CANVAS_HEIGHT - 216;
    const y = actionMenuTop - h - 16;

    // --- 4. Draw Thematic Background ---
    this.drawDarkPanel(x, y, w, h);
    this.ctx.save();
    
    const bgGrad = this.ctx.createLinearGradient(x, y, x, y + h);
    bgGrad.addColorStop(0, `${themeColor}15`);
    bgGrad.addColorStop(0.4, 'rgba(0,0,0,0)');
    this.ctx.fillStyle = bgGrad;
    this.ctx.fillRect(x, y, w, h);

    // --- 5. Render Info Block (TOP) ---
    const iconSize = 64;
    const infoY = y + cardPadding;

    // Draw Icon Frame
    const iconX = x + cardPadding;
    const iconY = infoY + 16;
    this.ctx.fillStyle = UITheme.colors.bgScale?.[2] || 'rgba(255, 255, 255, 0.05)';
    this.ctx.fillRect(iconX, iconY, iconSize, iconSize);
    this.drawIcon(ability.icon, 'abilities', iconX, iconY, iconSize);
    this.ctx.strokeStyle = themeColor;
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(iconX, iconY, iconSize, iconSize);

    const contentX = iconX + iconSize + 24;
    let currentTextY = iconY + 12;

    // Row 1: Title & Cost
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    this.ctx.font = UITheme.fonts.cardTitle || UITheme.fonts.bold;
    this.ctx.fillStyle = UITheme.colors.textMain;
    this.ctx.fillText(ability.name || 'Unknown Action', contentX, currentTextY);

    this.ctx.textAlign = 'right';
    this.ctx.font = UITheme.fonts.cardMono || UITheme.fonts.bold;
    if (ability.cost) {
      let costStr = "Free";
      let costCol = UITheme.colors.textMuted;
      if (ability.cost.hp) {
        costStr = `${ability.cost.hp} HP`;
        costCol = UITheme.colors.hp;
      } else if (ability.cost.mana) {
        costStr = `${ability.cost.mana} MP`;
        costCol = UITheme.colors.ins;
      } else if (ability.cost.stamina) {
        costStr = `${ability.cost.stamina} STM`;
        costCol = UITheme.colors.stm;
      } else if (ability.cost.insight) {
        costStr = `${ability.cost.insight} INS`;
        costCol = UITheme.colors.ins;
      }
      this.ctx.fillStyle = costCol;
      this.ctx.fillText(costStr, x + w - cardPadding, currentTextY);
    } else {
      this.ctx.fillStyle = UITheme.colors.textMuted;
      this.ctx.fillText("Free", x + w - cardPadding, currentTextY);
    }

    currentTextY += 32;

    // Row 2: Type Badge
    this.ctx.textAlign = 'left';
    this.ctx.font = fontItalic;
    const typeWidth = this.ctx.measureText(displayType).width;
    const badgePadX = 10;
    const badgeH = 24;
    const badgeW = typeWidth + (badgePadX * 2);
    const badgeDrawY = currentTextY - (badgeH / 2);
    
    this.ctx.fillStyle = `${themeColor}33`;
    this.ctx.strokeStyle = themeColor;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    if (this.ctx.roundRect) {
      this.ctx.roundRect(contentX, badgeDrawY, badgeW, badgeH, badgeH / 2);
    } else {
      this.ctx.rect(contentX, badgeDrawY, badgeW, badgeH);
    }
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = themeColor;
    this.ctx.fillText(displayType, contentX + badgePadX, currentTextY);

    currentTextY += 30;

    // Labels Alignment Measurement
    const targetLabel = "Target: ";
    const sourceLabel = "Source: ";
    const labelColumnW = Math.max(
      this.ctx.measureText(targetLabel).width,
      this.ctx.measureText(sourceLabel).width
    );

    // Row 3: Target
    const targetText = this.formatTargetingText(ability.targeting);
    this.ctx.fillStyle = UITheme.colors.textMuted;
    this.ctx.fillText(targetLabel, contentX, currentTextY);
    this.ctx.fillStyle = UITheme.colors.textMain;
    this.ctx.fillText(targetText, contentX + labelColumnW, currentTextY);

    currentTextY += 24;

    // Row 4: Source
    const sourceText = ability.isEquipment ? (ability.source || 'Equipment') : (ability.source || 'Innate');
    this.ctx.fillStyle = UITheme.colors.textMuted;
    this.ctx.fillText(sourceLabel, contentX, currentTextY);
    this.ctx.fillStyle = UITheme.colors.textMain;
    this.ctx.fillText(sourceText, contentX + labelColumnW, currentTextY);

    currentTextY += 26;

    // Row 5: Combat Stats Grid
    if (hasStats) {
      let statX = contentX;
      this.ctx.font = UITheme.fonts.cardMono || UITheme.fonts.small || '18px monospace';
      
      const drawStat = (label, value, valueColor) => {
        this.ctx.fillStyle = UITheme.colors.textMuted;
        this.ctx.fillText(`${label} `, statX, currentTextY);
        statX += this.ctx.measureText(`${label} `).width;
        this.ctx.fillStyle = valueColor;
        this.ctx.fillText(value, statX, currentTextY);
        statX += this.ctx.measureText(value).width + 24;
      };

      if (pwr) drawStat("Pwr:", `${pwr}x`, themeColor);
      if (ability.accuracy) drawStat("Acc:", `${Math.floor(ability.accuracy * 100)}%`, UITheme.colors.textMain);
      if (ability.speed) drawStat("Spd:", ability.speed, UITheme.colors.textMain);
    }

    // --- 6. Divider & Description (BOTTOM) ---
    this.ctx.textBaseline = 'top';
    let cursorY = infoY + infoBlockHeight;

    if (descLines.length > 0) {
      const flourishW = w * 0.6;
      const divX = x + (w - flourishW) / 2;
      
      if (this.ui.drawLineWithGothicFlourish) {
        this.ui.drawLineWithGothicFlourish(divX, cursorY, flourishW, themeColor);
      } else {
        this.ctx.strokeStyle = themeColor;
        this.ctx.globalAlpha = 0.4;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(divX, cursorY);
        this.ctx.lineTo(divX + flourishW, cursorY);
        this.ctx.stroke();
        this.ctx.globalAlpha = 1.0;
      }

      cursorY += 24;
      this.ctx.textAlign = 'center';
      this.ctx.fillStyle = UITheme.colors.textMuted;
      this.ctx.font = fontItalic;

      if (this.ui.getWrappedLines) {
        descLines.forEach(line => {
          this.ctx.fillText(line, x + w / 2, cursorY);
          cursorY += 24;
        });
      } else {
        this.ui.drawWrappedText(descStr, x + cardPadding, cursorY, descW, 24, fontItalic, UITheme.colors.textMuted);
      }
    }
    this.ctx.restore();
  }

  formatTargetingText(targeting) {
    if (!targeting) return 'None';
    const scope = targeting.scope || 'enemy';
    const select = targeting.select || 'single';
    const count = targeting.count || 1;

    if (scope === 'self') return 'Self';
    if (scope === 'all_enemies') return 'All Enemies';
    if (scope === 'all_allies') return 'All Allies';
    if (scope === 'everyone') return 'Everyone';

    const scopeStr = scope.charAt(0).toUpperCase() + scope.slice(1);
    if (select === 'multiple') return `${count}x ${scopeStr}`;
    if (select === 'random') return `Random ${scopeStr}`;
    if (select === 'row') return `${scopeStr} Row`;
    return `Single ${scopeStr}`;
  }

  drawActivePlayerIndicator(state) {
    const index = state.activePartyIndex;
    const layout = this.combatantRenderer.LAYOUT.PLAYER[index];
    if (!layout) return;

    const x = Math.floor(layout.x * this.config.CANVAS_WIDTH);
    const y = Math.floor(layout.y * this.config.CANVAS_HEIGHT);
    const size = Math.floor(this.combatantRenderer.FRAME_SIZE * this.combatantRenderer.SPRITE_SCALE);
    
    const time = performance.now() * 0.003;
    const bob = Math.sin(time) * 10;
    const arrowY = y - (size / 2) - 36 + bob;
    const pulse = (Math.sin(time * 2) + 1) / 2;

    this.ctx.save();
    this.ctx.globalAlpha = 0.6 + (pulse * 0.4);
    this.ctx.fillStyle = UITheme.colors.highlight;
    this.ctx.shadowColor = UITheme.colors.highlight;
    this.ctx.shadowBlur = 8 + (pulse * 12);
    
    this.ctx.beginPath();
    this.ctx.moveTo(x, arrowY - 14);
    this.ctx.lineTo(x + 14, arrowY);
    this.ctx.lineTo(x, arrowY + 14);
    this.ctx.lineTo(x - 14, arrowY);
    this.ctx.fill();
    this.ctx.restore();
  }

  drawTargetCursor(state) {
    const activeChar = state.activeParty?.[state.activePartyIndex];
    if (!activeChar) return;
    const selectedAbility = state.selectedAction || activeChar.abilities[state.menuIndex];
    if (!selectedAbility) return;

    let primaryTarget;
    let isHoverOverride = false;

    if (state.hoveredElement?.id?.startsWith('TARGET_')) {
      const parts = state.hoveredElement.id.split('_');
      const idx = parseInt(parts[2], 10);
      primaryTarget = (parts[1] === 'PARTY') ? state.activeParty[idx] : state.activeEnemies[idx];
      isHoverOverride = true;
    }

    if (!isHoverOverride) {
      if (state.targetIndex === 'ALL') {
        primaryTarget = 'ALL';
      } else if (state.targetGroup === 'everyone') {
        primaryTarget = [...state.activeParty, ...state.activeEnemies][state.targetIndex];
      } else if (state.targetGroup === 'party') {
        primaryTarget = state.activeParty[state.targetIndex];
      } else {
        primaryTarget = state.activeEnemies[state.targetIndex];
      }
    }

    const activeTargets = TargetingResolver.resolve(selectedAbility, activeChar, primaryTarget, state) || [];
    const targetTotals = new Map();

    if (state.selectedTargets) {
      state.selectedTargets.forEach(t => {
        targetTotals.set(t, (targetTotals.get(t) || 0) + 1);
      });
    }
    activeTargets.forEach(t => {
      targetTotals.set(t, (targetTotals.get(t) || 0) + 1);
    });

    const drawnCounts = new Map();
    const time = performance.now() * 0.003;
    const bob = Math.sin(time) * 8;
    const pulse = (Math.sin(time * 2.5) + 1) / 2;
    const totalHits = selectedAbility.hitCount || selectedAbility.maxTargets || 1;
    const currentCount = state.selectedTargets ? state.selectedTargets.length : 0;
    const remaining = totalHits - currentCount;

    const drawGothicShard = (target, isLocked, lockedIndex = null) => {
      if (!this.combatantRenderer.isEntityVisible(target, state)) return;
      const pos = this.combatantRenderer.getEntityPosition(target, state);
      if (!pos) return;

      const size = Math.floor(this.combatantRenderer.FRAME_SIZE * this.combatantRenderer.SPRITE_SCALE);
      const total = targetTotals.get(target);
      const currentIdx = drawnCounts.get(target) || 0;
      drawnCounts.set(target, currentIdx + 1);

      const spreadAngle = 0.40;
      const angle = (currentIdx - (total - 1) / 2) * spreadAngle;
      const pivotY = pos.y - (size / 2) - 10;
      const radius = 55 + (isLocked ? 0 : bob);

      this.ctx.save();
      this.ctx.translate(pos.x, pivotY);
      this.ctx.rotate(angle);
      this.ctx.translate(0, -radius);

      const colorCore = isLocked ? '#5a0000' : '#ff1a1a';
      const colorEdge = isLocked ? '#110000' : '#8a0000';
      const shadowColor = isLocked ? '#990000' : '#ff4d4d';

      this.ctx.globalAlpha = isLocked ? 0.85 : 0.95 + (pulse * 0.05);
      this.ctx.shadowColor = shadowColor;
      this.ctx.shadowBlur = isLocked ? 10 : 20 + (pulse * 15);

      this.ctx.beginPath();
      this.ctx.moveTo(0, 15);
      this.ctx.lineTo(10, -10);
      this.ctx.lineTo(0, -30);
      this.ctx.lineTo(-10, -10);
      this.ctx.closePath();

      const grad = this.ctx.createLinearGradient(0, -30, 0, 15);
      grad.addColorStop(0, colorEdge);
      grad.addColorStop(0.5, colorCore);
      grad.addColorStop(1, colorEdge);

      this.ctx.fillStyle = grad;
      this.ctx.strokeStyle = isLocked ? '#000000' : '#ffffff';
      this.ctx.lineWidth = isLocked ? 1 : 1.5;
      this.ctx.fill();
      this.ctx.stroke();

      let textToDraw = '';
      if (isLocked) {
        textToDraw = (lockedIndex + 1).toString();
      } else if (totalHits > 1 && remaining > 0) {
        textToDraw = remaining.toString();
      }

      if (textToDraw) {
        this.ctx.shadowBlur = 0;
        this.ctx.translate(0, -10);
        this.ctx.rotate(-angle);
        this.ctx.fillStyle = isLocked ? '#cccccc' : '#ffffff';
        const fontSize = isLocked ? 14 : 18 + (pulse * 2);
        this.ctx.font = `bold ${fontSize}px 'Georgia', 'Times New Roman', serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(textToDraw, 0, 0);
      }
      this.ctx.restore();
    };

    if (state.selectedTargets) {
      state.selectedTargets.forEach((t, idx) => drawGothicShard(t, true, idx));
    }
    activeTargets.forEach(t => drawGothicShard(t, false));
  }

  drawDialogueBox(text, title = null) {
    const w = this.config.CANVAS_WIDTH;
    const h = 216;
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

    let textY = y + 72;
    if (title) {
      this.ctx.save();
      this.ctx.textAlign = 'center';
      this.ctx.font = UITheme.fonts.bold;
      this.ctx.fillStyle = UITheme.colors.textMuted;
      this.ctx.fillText(title, x + (w / 2), y + 53);
      this.ctx.restore();
      textY = y + 108;
    }

    this.ui.drawWrappedText(text, x + 48, textY, w - 96, 48, UITheme.fonts.body, UITheme.colors.textMain);
  }

  drawCinematicBanner(text, color, alpha = 1.0) {
    if (alpha <= 0.01) return;
    const w = this.config.CANVAS_WIDTH;
    const h = 288;
    const y = (this.config.CANVAS_HEIGHT / 2) - (h / 2);

    this.ctx.save();
    this.ctx.fillStyle = `rgba(0, 0, 0, ${0.4 * alpha})`;
    this.ctx.fillRect(0, 0, w, this.config.CANVAS_HEIGHT);
    this.ctx.fillStyle = `rgba(0, 0, 0, ${0.85 * alpha})`;
    this.ctx.fillRect(0, y, w, h);

    const grad = this.ctx.createLinearGradient(0, y, w, y);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
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
    
    const spacedText = text.split('').join('  ');
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 15;
    this.ctx.fillText(spacedText, w / 2, y + (h / 2) + 10);
    this.ctx.restore();
  }

  drawStatusEffects(entity, startX, startY) {
    if (!entity.statusEffects || entity.statusEffects.length === 0) return;
    const iconSize = 32;
    const spacing = 14;
    const maxIcons = 4;
    const effectsToDraw = entity.statusEffects.slice(0, maxIcons);

    effectsToDraw.forEach((effect, index) => {
      const x = startX + (index * (iconSize + spacing));
      const iconData = effect.icon || '✨';
      this.drawIcon(iconData, 'statusEffects', x, startY, iconSize);
    });
  }

  drawIcon(iconData, sheetKey, x, y, size = 64) {
    if (typeof iconData === 'object' && iconData !== null) {
      const sheet = this.loader.get ? this.loader.get(sheetKey) : this.loader.getAsset(sheetKey);
      if (sheet) {
        const srcX = iconData.col * this.SRC_SIZE;
        const srcY = iconData.row * this.SRC_SIZE;
        this.ctx.drawImage(sheet, srcX, srcY, this.SRC_SIZE, this.SRC_SIZE, x, y, size, size);
      } else {
        this.drawFallbackEmoji('?', x, y, size);
      }
    } else if (typeof iconData === 'string') {
      this.drawFallbackEmoji(iconData, x, y, size);
    }
  }

  drawFallbackEmoji(text, x, y, size) {
    this.ctx.save();
    this.ctx.fillStyle = UITheme.colors.textMain;
    this.ctx.font = `${Math.floor(size * 0.7)}px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(text, x + size / 2, y + size / 2 + 5);
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