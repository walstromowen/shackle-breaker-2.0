import { UITheme } from '../../../ui/UITheme.js';
import { Formatting } from '../../../../../shared/core/formatting.js';
import { AbilityDefinitions } from '../../../../../shared/abilities/abilityDefinitions.js';
import { ItemDefinitions } from '../../../../../shared/items/itemDefinitions.js';
import { gameState } from '../../../../../shared/core/gameState.js';
import { AbilityPreview } from '../../../ui/abilityPreview.js';
import { drawAbilityCard } from '../../../ui/abilityCard.js';

export class ItemDetailPanel {
  constructor(ui, loader) {
    this.ui = ui;
    this.loader = loader;

    // --- Strict Integer Scaling & Layout Constants ---
    this.ICON_SRC_SIZE = 64;       // Icon sprite sheet cell size (upgraded from 32)
    this.ICON_SIZE = 160;          // Main icon draw size (2.5x of 64 source)
    this.ABILITY_ICON_SIZE = 64;   // List icons drawn at 64x64 (1:1 with source)
    this.MATERIAL_ICON_SIZE = 24;  // Material icons base size (drawn at 2x)
    this.SCROLLBAR_WIDTH = 10;

    // --- Vertical Rhythm & Spacing ---
    this.layout = {
      padding: 24,         // Outer padding for panels
      innerPadding: 16,    // Inner padding for nested cards
      sectionGap: 36,      // Space between major sections
      lineHeight: 28,      // Standard text line height
      headerHeight: 44,    // Header text line height
      titleHeight: 36,     // Subtitle/Title line height
      dividerGap: 24       // Space around dividers
    };

    this.lastItemId = null;
    this.totalContentHeight = 0;
    this._previewActor = null;
    this._previewStats = null;
  }

  // Character whose current stats scale the damage / hit-chance numbers on ability cards.
  _resolvePreviewActor(state) {
    return (state && (state.member || state.activeMember)) || gameState.party?.members?.[0] || null;
  }

  render(item, x, y, w, h, state, hitboxes) {
    if (!item) {
      this.ui.drawStyled('empty', 'No item selected', x + w / 2, y + h / 2);
      return;
    }

    this._previewActor = this._resolvePreviewActor(state);
    this._previewStats = (state && state.derivedStats) || null;

    let def = this._resolveDefinition(item);
    const isAbility = !!(item.abilityId || AbilityDefinitions[item.id] || (def && def.type === 'ability'));

    if (!def) {
      this.ui.drawStyled('empty', 'Unknown definition', x + w / 2, y + h / 2);
      return;
    }

    const itemId = def.id || "unknown";
    if (itemId !== this.lastItemId) {
      state.scrollOffset = 0;
      this.lastItemId = itemId;
      this.totalContentHeight = 0;
    }

    const maxScroll = Math.max(0, this.totalContentHeight - h);

    if (state.layout) {
      state.layout.detailBounds = { x, y, w: w + 48, h };
      state.layout.detailMaxScroll = maxScroll;
      state.layout.detailViewportH = h;
    }

    state.scrollOffset = Math.max(0, Math.min(state.scrollOffset, maxScroll));

    this.ui.ctx.save();
    this.ui.startClip(x, y, w + 24, h);

    const initialDrawY = y - state.scrollOffset;
    let currentY = initialDrawY;

    // Content Area Bounds (used for inner content padding)
    const contentX = x + this.layout.padding;
    const contentW = w - (this.layout.padding * 2);

    // --- Render Sections ---
    currentY = this._drawHeader(item, def, x, currentY, w, isAbility);
    currentY += this.layout.innerPadding;

    // Main Icon & Text Info Layout
    currentY = this._drawMainInfo(def, contentX, currentY, contentW, isAbility);

    if (!isAbility) {
      currentY = this._drawStatsGrid(item, def, contentX, currentY, contentW);
      currentY = this._drawUpgradeCosts(item, def, contentX, currentY, contentW);
      currentY = this._drawAbilities(def, x, currentY, w);
    } else {
      currentY = this._drawAbilities({ grantedAbilities: [def.id] }, x, currentY, w);
    }

    this.totalContentHeight = currentY - initialDrawY + this.layout.padding;

    this.ui.endClip();
    this.ui.ctx.restore();

    if (this.totalContentHeight > h) {
      this.drawScrollBar(x + w + 14, y, h, this.totalContentHeight, state.scrollOffset, hitboxes, state);
    }
  }

  _resolveDefinition(item) {
    if (item.defId) return ItemDefinitions[item.defId];
    if (item.abilityId) return AbilityDefinitions[item.abilityId];
    if (AbilityDefinitions[item.id]) return AbilityDefinitions[item.id];
    if (item.definition) return item.definition;
    return item;
  }

  drawScrollBar(x, y, viewportH, contentH, scrollOffset, hitboxes, state) {
    this.ui.drawRect(x, y, this.SCROLLBAR_WIDTH, viewportH, UITheme.colors.scrollTrack || UITheme.colors.bgScale[0]);

    const viewRatio = viewportH / contentH;
    const thumbH = Math.max(48, viewportH * viewRatio);
    const maxScroll = contentH - viewportH;
    const scrollRatio = maxScroll > 0 ? (scrollOffset / maxScroll) : 0;
    const thumbY = y + (scrollRatio * (viewportH - thumbH));

    const isHovered = state && state.hoveredHitboxId === 'SCROLLBAR_THUMB';
    const thumbColor = isHovered ? UITheme.colors.states.hoverText : (UITheme.colors.scrollThumb || UITheme.colors.borderHighlight);

    this.ui.drawRect(x, thumbY, this.SCROLLBAR_WIDTH, thumbH, thumbColor);

    if (hitboxes) {
      hitboxes.push({
        id: 'SCROLLBAR_THUMB',
        type: 'ui',
        x: x - 10,
        y: y,
        w: this.SCROLLBAR_WIDTH + 19,
        h: viewportH,
        hoverSfx: 'hoverTick'
      });
    }
  }

  _formatValue(val, forceSign = false) {
    if (typeof val !== 'number') return val;

    let isDecimal = val % 1 !== 0;
    let displayVal = isDecimal ? +(val * 100).toFixed(1) : val;

    let str = '';
    if (forceSign && displayVal > 0) str += '+';
    str += displayVal;
    if (isDecimal) str += '%';

    return str;
  }

  _getStatColor(rawKey) {
    if (!rawKey) return UITheme.colors.textMain;
    const k = rawKey.toLowerCase();

    if (UITheme.colors[k]) return UITheme.colors[k];
    if (UITheme.colors.types && UITheme.colors.types[k]) return UITheme.colors.types[k];

    if (k.includes('hp') || k.includes('health')) return UITheme.colors.hp || "#8c1c1c";
    if (k.includes('stm') || k.includes('stamina')) return UITheme.colors.stm || "#4a5d4e";
    if (k.includes('ins') || k.includes('insight')) return UITheme.colors.ins || "#4a5b70";
    if (k.includes('atk') || k.includes('attack') || k.includes('damage')) return UITheme.colors.attack || "#9e1a1a";
    if (k.includes('def') || k.includes('block')) return UITheme.colors.defense || "#4a5b70";
    if (k.includes('res')) return UITheme.colors.resistance || "#8a8578";

    return UITheme.colors.textMain;
  }

  _getRarityColor(rarity) {
    switch ((rarity || "").toLowerCase()) {
      case 'common':    return "#ffffff";
      case 'uncommon':  return "#1eff00";
      case 'rare':      return "#0070dd";
      case 'epic':      return "#a335ee";
      case 'legendary': return "#ff8000";
      default:          return UITheme.colors.textMuted;
    }
  }

  _drawHeader(item, def, x, y, w, isAbility) {
    let currentY = y;
    const color = this._getRarityColor(def.rarity);
    const title = item.name || def.name || "Unknown";

    const itemLevel = item.level || def.level || def.itemLevel;
    const weight = item.weight !== undefined ? item.weight : def.weight;
    const value = item.value !== undefined ? item.value : def.value;

    let typeText = isAbility ? "SKILL / ABILITY" : `${(def.type || "Item").toUpperCase()}`;
    if (def.slot && !isAbility) {
      typeText += ` - ${def.slot.toUpperCase()}`;
    }

    // Background Banner
    this.ui.ctx.save();
    this.ui.ctx.fillStyle = color;
    this.ui.ctx.globalAlpha = 0.12;
    this.ui.ctx.fillRect(x, currentY, w, 85);
    this.ui.ctx.restore();

    // Header Text
    this.ui.drawStyled('cardTitle', title, x + this.layout.padding, currentY + 40, { color });

    if (itemLevel !== undefined) {
      this.ui.drawStyled('cardHeading', `Lv. ${itemLevel}`, x + w - this.layout.padding, currentY + 40, { align: 'right' });
    }

    this.ui.drawStyled('cardNote', typeText, x + this.layout.padding, currentY + 74);

    if (weight !== undefined || value !== undefined) {
      const rightMeta = [];
      if (weight !== undefined) rightMeta.push(`Wt: ${weight}`);
      if (value !== undefined) rightMeta.push(`Val: ${value}`);
      this.ui.drawStyled('cardLabel', rightMeta.join("   "), x + w - this.layout.padding, currentY + 74, { align: 'right' });
    }

    // Banner Border
    this.ui.ctx.save();
    this.ui.ctx.strokeStyle = color;
    this.ui.ctx.globalAlpha = 0.6;
    this.ui.ctx.beginPath();
    this.ui.ctx.moveTo(x, currentY + 85);
    this.ui.ctx.lineTo(x + w, currentY + 85);
    this.ui.ctx.stroke();
    this.ui.ctx.restore();

    return currentY + 85 + this.layout.padding;
  }

  _drawMainInfo(def, x, y, w, isAbility) {
    let textY = y;
    const iconSize = this.ICON_SIZE;

    // Draw Main Icon (Left Aligned)
    this.ui.drawPanel(x, y, iconSize, iconSize, UITheme.colors.bgScale[2]);
    this.ui.drawRect(x, y, iconSize, iconSize, UITheme.colors.border, false);
    this._drawMainIcon(def, x, y, isAbility);

    // Calculate Text Bounds (Right of Image)
    const textX = x + iconSize + this.layout.innerPadding;
    const textW = w - iconSize - this.layout.innerPadding;

    let hasContent = false;

    if (def.effectDescription) {
      const lines = this.ui.getWrappedLines(def.effectDescription, textW, UITheme.fonts.body);
      lines.forEach(line => {
        this.ui.drawStyled('body', line, textX, textY);
        textY += this.layout.lineHeight;
      });
      hasContent = true;
    }

    if (def.description) {
      if (hasContent) textY += this.layout.innerPadding;
      const lines = this.ui.getWrappedLines(`"${def.description}"`, textW, UITheme.fonts.cardItalic);
      lines.forEach(line => {
        this.ui.drawStyled('cardNote', line, textX, textY);
        textY += this.layout.lineHeight;
      });
      hasContent = true;
    }

    // Return whichever is taller: the icon or the description text block
    return Math.max(y + iconSize, textY) + (this.layout.sectionGap / 2);
  }

  _drawMainIcon(def, x, y, isAbility) {
    if (!this.loader) return;

    // Items (weapons, armor, consumables, materials ...) pick their own sprite sheet
    if (!isAbility) {
      this.ui.drawItemIcon(this.loader, def, x, y, this.ICON_SIZE, this.ICON_SRC_SIZE);
      return;
    }

    const sheet = this.loader.get('abilities') || this.loader.get('items') || this.loader.get('icons');

    if (sheet) {
      const iconData = def.icon || { col: 0, row: 0 };
      const src = this.ICON_SRC_SIZE;
      this.ui.drawSprite(sheet, iconData.col * src, iconData.row * src, src, src, x, y, this.ICON_SIZE, this.ICON_SIZE);
    }
  }

  _drawStatsGrid(item, def, x, y, w) {
    let currentY = y;
    const statItems = [];

    const getStatVal = (key) => {
      if (item.stats && item.stats[key] !== undefined) return item.stats[key];
      if (item[key] !== undefined) return item[key];
      if (def.stats && def.stats[key] !== undefined) return def.stats[key];
      if (def[key] !== undefined) return def[key];
      return undefined;
    };

    const primaryStats = [
      { key: 'damage', label: 'ATTACK' },
      { key: 'attack', label: 'ATTACK' },
      { key: 'defense', label: 'DEFENSE' },
      { key: 'block', label: 'BLOCK' }
    ];

    primaryStats.forEach(stat => {
      const val = getStatVal(stat.key);
      if (val === undefined || val === null) return;
      if (typeof val === 'object' && typeof val.min === 'undefined') return;

      let valStr = val;
      if (typeof val === 'object' && val.min !== undefined) {
        valStr = `${this._formatValue(val.min)}-${this._formatValue(val.max)}`;
      } else {
        valStr = this._formatValue(val);
      }

      statItems.push({ label: stat.label, val: valStr, color: this._getStatColor(stat.key) });
    });

    ['attack', 'defense', 'resistance'].forEach(category => {
      const catObj = getStatVal(category);
      if (!catObj || typeof catObj !== 'object') return;

      Object.keys(catObj).forEach(k => {
        if (k === 'min' || k === 'max' || catObj[k] === 0) return;

        const typeAbbr = (Formatting.getAbbreviation ? Formatting.getAbbreviation(k) : k.substring(0, 3)).toUpperCase();
        const catAbbr = category === 'resistance' ? 'RES' : (category === 'defense' ? 'DEF' : 'ATK');

        statItems.push({
          label: `${typeAbbr} ${catAbbr}`,
          val: this._formatValue(catObj[k]),
          color: this._getStatColor(k)
        });
      });
    });

    const baseAttrs = def.attributes || (def.stats ? def.stats.attributes : {}) || {};
    const itemAttrs = item.attributes || (item.stats ? item.stats.attributes : {}) || {};
    const attributes = { ...baseAttrs, ...itemAttrs };

    const baseRes = def.resources || {};
    const itemRes = item.resources || {};
    const resources = { ...baseRes, ...itemRes };

    Object.keys(attributes).forEach(key => {
      const val = attributes[key];
      if (val === 0) return;
      const label = (Formatting.getAbbreviation ? Formatting.getAbbreviation(key) : key.substring(0, 3)).toUpperCase();
      statItems.push({ label: label, val: this._formatValue(val, true), color: this._getStatColor(key) });
    });

    Object.keys(resources).forEach(key => {
      const val = resources[key];
      if (val === 0) return;

      let label = key.toUpperCase();
      if (key === 'maxHp') label = "MAX HP";
      else if (key === 'maxStamina') label = "MAX STM";
      else if (key === 'maxInsight') label = "MAX INS";
      else if (key === 'hpRecovery') label = "HP REC";
      else if (key === 'staminaRecovery') label = "STM REC";
      else if (key === 'insightRecovery') label = "INS REC";

      statItems.push({ label: label, val: this._formatValue(val, true), color: this._getStatColor(key) });
    });

    if (statItems.length === 0) return currentY;

    const numCols = 2;
    const colWidth = w / numCols;
    currentY += this.layout.innerPadding;

    for (let i = 0; i < statItems.length; i++) {
      const col = i % numCols;
      const row = Math.floor(i / numCols);

      const itemX = x + (col * colWidth);
      const itemY = currentY + (row * (this.layout.lineHeight + 4));

      let labelColor = UITheme.colors.textMuted;
      const l = statItems[i].label.toLowerCase();
      if (l.includes('atk') || l.includes('attack') || l.includes('damage') || l.includes('def') || l.includes('defense') || l.includes('block') || l.includes('res') || l.includes('resistance')) {
        labelColor = statItems[i].color;
      }

      this.ui.drawStyled('cardLabel', statItems[i].label, itemX, itemY, { color: labelColor });
      this.ui.drawStyled('cardLabel', String(statItems[i].val), itemX + colWidth - this.layout.innerPadding, itemY, { color: statItems[i].color, align: 'right' });
    }

    const totalRows = Math.ceil(statItems.length / numCols);
    return currentY + (totalRows * (this.layout.lineHeight + 4)) + this.layout.sectionGap;
  }

  _drawUpgradeCosts(item, def, x, y, w) {
    if (!def.upgradeCosts) return y;

    const currentLevel = item.level || def.level || 1;
    const nextLevel = currentLevel + 1;
    const cost = def.upgradeCosts[nextLevel];

    if (!cost) return y;

    let currentY = y;
    this.ui.drawStyled('cardHeading', `Upgrade to Lv. ${nextLevel}`, x, currentY);
    currentY += this.layout.lineHeight;

    if (cost.currency !== undefined) {
      this.ui.drawStyled('cardLabel', `Currency: ${cost.currency}`, x, currentY, { color: UITheme.colors.textMain });
      currentY += this.layout.lineHeight;
    }

    if (cost.materials && Object.keys(cost.materials).length > 0) {
      this.ui.drawStyled('cardLabel', 'Materials Required:', x, currentY);
      currentY += this.layout.lineHeight;

      Object.entries(cost.materials).forEach(([matId, count]) => {
        const matDef = ItemDefinitions[matId] || {};
        const matName = matDef.name || matId;

        const iconSize = this.MATERIAL_ICON_SIZE * 2; // Doubled Size

        const drewIcon = !!matDef.icon && this.ui.drawItemIcon(
          this.loader, matDef,
          x, currentY - (iconSize / 2) + 6, iconSize, this.ICON_SRC_SIZE
        );

        if (drewIcon) {
          this.ui.drawStyled('cardLabel', `- ${matName}: x${count}`, x + iconSize + 8, currentY, { color: UITheme.colors.textMain });
        } else {
          this.ui.drawStyled('cardLabel', `- ${matName}: x${count}`, x + 12, currentY, { color: UITheme.colors.textMain });
        }

        currentY += Math.max(this.layout.lineHeight, iconSize + 4);
      });
    }

    return currentY + this.layout.sectionGap;
  }

  _drawAbilities(def, x, y, w) {
    const granted = def.grantedAbilities || [];
    if (granted.length === 0) return y;

    let currentY = y;

    if (def.name) {
      this.ui.drawStyled('cardHeading', 'Granted Abilities', x, currentY);
      currentY += this.layout.lineHeight + 8;
    }

    granted.forEach(abilityId => {
      const ability = AbilityDefinitions[abilityId] || { name: abilityId, description: "" };
      const abilityObj = {
        id: abilityId,
        source: def.name || 'Innate',
        isEquipment: !!def.name
      };

      currentY = this._drawAbilityCard(ability, abilityObj, x, currentY, w);
    });

    return currentY + (def.name ? this.layout.sectionGap : 0);
  }

  _drawAbilityCard(ab, abilityObj, x, y, w) {
    const isEquip = abilityObj && (abilityObj.isEquipment || (abilityObj.source && abilityObj.source !== 'Innate'));
    return drawAbilityCard(this.ui, this.loader, ab, {
      x, y, w, member: this._previewActor, derivedStats: this._previewStats,
      name: abilityObj && (abilityObj.name || abilityObj.id),
      source: isEquip ? (abilityObj.source || 'Equip') : 'Innate'
    });
  }

  _drawAbilityIcon(ability, x, y) {
    if (!this.loader) return;
    const sheet = this.loader.get('abilities') || this.loader.get('items');

    if (sheet) {
      const iconData = ability.icon || { col: 0, row: 0 };
      const src = this.ICON_SRC_SIZE;
      this.ui.drawSprite(
        sheet,
        iconData.col * src, iconData.row * src, src, src,
        x, y, this.ABILITY_ICON_SIZE, this.ABILITY_ICON_SIZE
      );
    } else {
      this.ui.drawPanel(x, y, this.ABILITY_ICON_SIZE, this.ABILITY_ICON_SIZE, UITheme.colors.bgScale[1]);
    }
  }

  _formatTargetingText(targeting) {
      return AbilityPreview.getTargetText(targeting);
  }
}