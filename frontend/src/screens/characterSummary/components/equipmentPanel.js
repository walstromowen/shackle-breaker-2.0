import { UITheme } from '../../../ui/UITheme.js';
import { UI_SFX } from '../../../ui/uiSfx.js';
import { TRAIT_DEFINITIONS } from '../../../../../shared/abilities/traitDefinitions.js';
import { ItemDefinitions } from '../../../../../shared/items/itemDefinitions.js';
import { Formatting } from '../../../../../shared/core/formatting.js';
import { isCursed, drawCursedPortrait } from '../../../ui/curseOverlay.js';

export class EquipmentPanel {
  constructor(ui, loader) {
    this.ui = ui;
    this.loader = loader;

    this.SLOT_HEIGHT = 115;
    this.PORTRAIT_SIZE = 256;
    this.RENDER_SIZE = 64;
    this.ICON_SRC_SIZE = 64;        // Item icon sprite sheet cell size (upgraded from 32)
    this.STATUS_ICON_SRC_SIZE = 64; // Status effect sprite sheet cell size (upgraded from 32)
    this.PORTRAIT_SRC_SIZE = 128;   // Portraits remain 128x128
    this.statRects = {};            // stat id -> { x, y, w, h } of the level / vitals text, from the last render (hover explains it)
  }

  _getVal(v) {
    return (v && typeof v === 'object') ? (v.total || v.value || 0) : (Number(v) || 0);
  }

  render(member, stats, activeSlots, selectedIndex, isChoosingItem, x, y, w, h, hitboxes, heldItem, hoveredId = null, isEditingName = false, menuOpen = false) {
    const centerX = Math.floor(x + (w / 2));
    let headerY = y + 24;
    this.statRects = {};

    const actualLevel = this._getVal(stats.level) || this._getVal(member.level) || 1;

    this.ui.ctx.font = UITheme.fonts.header;
    const nameWidth = this.ui.ctx.measureText(member.name).width + 80;
    const nameHeight = 64;

    hitboxes.push({
      id: 'BTN_EDIT_NAME',
      x: centerX - (nameWidth / 2),
      y: headerY,
      w: nameWidth,
      h: nameHeight,
      type: 'button'
    });

    if (!isEditingName) {
      // The name is a button (click to rename): it takes the shared highlight like everything else you can click
      const nameFlags = this.ui.flags('BTN_EDIT_NAME', menuOpen ? null : hoveredId);
      this.ui.drawStateBox(centerX - (nameWidth / 2), headerY, nameWidth, nameHeight, nameFlags);
      this.ui.drawStyled('title', member.name, centerX, headerY + 48, { color: this.ui.stateTextColor(nameFlags, UITheme.colors.textMain) });
    }

    const levelText = `Level ${actualLevel}`;
    this.ui.drawStyled('subtitle', levelText, centerX, headerY + 86);
    this.ui.ctx.font = UITheme.text.subtitle.font;
    const levelW = this.ui.ctx.measureText(levelText).width + 24;
    this.statRects.level = { x: centerX - levelW / 2, y: headerY + 66, w: levelW, h: 28 };
    // A shackled character is down until a meteorite frees them (CorruptionSystem): said in red beside the level
    if (member.shackled) {
      this.ui.drawStyled('subtitle', 'Shackled', centerX + levelW / 2 + 8, headerY + 86, { color: UITheme.colors.failure, align: 'left' });
    }

    this._drawVitals(member, stats, centerX, headerY + 139, x, w);

    const equipStartY = y + 228;
    this._drawEquipmentLayout(member, activeSlots, selectedIndex, isChoosingItem, centerX, equipStartY, w, hitboxes, heldItem, hoveredId, menuOpen);

    const traitsStartY = equipStartY + Math.max(this.PORTRAIT_SIZE, activeSlots.length / 2 * 125) + 60;
    this._drawTraitBadges(member, x, traitsStartY, w, hitboxes, menuOpen ? null : hoveredId);
  }

  _drawVitals(member, stats, centerX, y, fullX, fullW) {
    const totalMaxHp = this._getVal(stats.maxHp) || this._getVal(member.maxHp);
    const totalMaxStm = this._getVal(stats.maxStamina) || this._getVal(member.maxStamina);
    const totalMaxIns = this._getVal(stats.maxInsight) || this._getVal(member.maxInsight);

    const currentXp = this._getVal(stats.xp) || this._getVal(member.xp);
    const nextXp = this._getVal(stats.xpToNext) || this._getVal(member.xpToNext) || this._getVal(stats.maxXp) || this._getVal(member.maxXp) || 100;

    // The four texts sit in one centred row. When the numbers are too big for the row (XP in the thousands, a long name beside it) they are shortened
    // (21.9k/21.9k) and the gaps tightened, so the row never runs past the panel.
    const build = (n) => {
      const f = (v) => (n ? Formatting.compactNumber(this._getVal(v) ?? v) : v);
      return [
        `HP ${f(this._getVal(member.hp))}/${f(totalMaxHp)}`,
        `STM ${f(this._getVal(member.stamina))}/${f(totalMaxStm)}`,
        `INS ${f(this._getVal(member.insight))}/${f(totalMaxIns)}`,
        `XP ${f(currentXp)}/${f(nextXp)}`
      ];
    };

    this.ui.ctx.font = UITheme.fonts.mono;
    let gap = 36;
    const rowW = (texts) => this.ui.ctx.measureText(texts.join('')).width + (gap * 3);
    const room = Math.max(200, fullW - 192);
    let texts = build(false);
    if (rowW(texts) > room) texts = build(true);
    if (rowW(texts) > room) gap = 18;
    const [hpText, stmText, insText, xpText] = texts;

    const totalW = rowW(texts);
    let startX = centerX - (totalW / 2);

    const drawVital = (txt, color, id) => {
      const width = this.ui.ctx.measureText(txt).width;
      this.statRects[id] = { x: startX - 6, y: y - 26, w: width + 12, h: 36 };
      this.ui.drawText(txt, startX + width / 2, y, UITheme.fonts.mono, color, "center");
      startX += width + gap;
    };

    drawVital(hpText, UITheme.colors.hp, 'maxHp');
    drawVital(stmText, UITheme.colors.stm, 'maxStamina');
    drawVital(insText, UITheme.colors.ins, 'maxInsight');
    drawVital(xpText, UITheme.colors.xp, 'xp');

    this.ui.drawLineWithGothicFlourish(fullX + 96, y + 36, fullW - 192, UITheme.colors.borderHighlight);
  }

  _drawEquipmentLayout(member, activeSlots, selectedIndex, isChoosingItem, centerX, startY, w, hitboxes, heldItem, hoveredId, menuOpen = false) {
    const equipData = (member.state && member.state.equipment) ? member.state.equipment : (member.equipment || {});
    const splitIndex = Math.ceil(activeSlots.length / 2);

    let isOffhandBlocked = false;
    const mhKey = Object.keys(equipData).find(k => k.toLowerCase() === 'mainhand');
    if (mhKey && equipData[mhKey]) {
      const mhDef = ItemDefinitions[equipData[mhKey].defId];
      if (mhDef) {
        const mhSlot = (mhDef.slot || mhDef.type || '').toLowerCase().replace(/[\s-]/g, '');
        if (mhSlot.includes('twohand')) {
          isOffhandBlocked = true;
        }
      }
    }

    const pX = Math.floor(centerX - (this.PORTRAIT_SIZE / 2));
    const pY = startY + 24;

    this.ui.drawSlot(pX, pY, this.PORTRAIT_SIZE, this.PORTRAIT_SIZE, UITheme.colors.bgScale[0]);

    let assetKey = member.spritePortrait;
    const img = this.loader.get(assetKey);
    if (img) {
      if (isCursed(member)) drawCursedPortrait(this.ui.ctx, img, 0, 0, this.PORTRAIT_SRC_SIZE, this.PORTRAIT_SRC_SIZE, pX, pY, this.PORTRAIT_SIZE, this.PORTRAIT_SIZE);
      else this.ui.drawSprite(img, 0, 0, this.PORTRAIT_SRC_SIZE, this.PORTRAIT_SRC_SIZE, pX, pY, this.PORTRAIT_SIZE, this.PORTRAIT_SIZE);
    }

    this._drawStatusEffects(member, pX, pY, this.PORTRAIT_SIZE);

    const drawSlot = (slotName, index, isLeft) => {
      const slotW = Math.floor((w - this.PORTRAIT_SIZE - 62) / 2);
      const slotX = isLeft ? (centerX - (this.PORTRAIT_SIZE / 2) - slotW - 19) : (centerX + (this.PORTRAIT_SIZE / 2) + 19);
      const slotY = startY + (index * (this.SLOT_HEIGHT + 10));

      const isOffhandSlot = slotName.toLowerCase().replace(/\s/g, '') === 'offhand';
      const isBlocked = isOffhandSlot && isOffhandBlocked;

      let isValidDrop = false;
      if (heldItem) {
        const item = heldItem.item;
        const def = ItemDefinitions[item.defId];
        if (def) {
          const iSlot = (def.slot || def.type || '').toLowerCase().replace(/[\s-]/g, '');
          const sSlot = slotName.toLowerCase().replace(/\s/g, '');

          isValidDrop = (iSlot === sSlot) ||
                        (sSlot === 'mainhand' && (iSlot === 'weapon' || iSlot === 'tool' || iSlot === 'onehand' || iSlot.includes('twohand'))) ||
                        (sSlot === 'offhand' && (iSlot === 'shield' || iSlot === 'weapon' || iSlot === 'onehand') && !iSlot.includes('twohand'));
        }
      }

      // highlighted = the focused slot (mouse hover or keyboard cursor). While a menu is open the menu owns the focus and the
      // slot it was opened on stays "selected".
      const slotId = `SLOT_${slotName}`;
      const flags = this.ui.flags(slotId, menuOpen ? null : hoveredId, { selected: menuOpen && hoveredId === slotId });

      hitboxes.push({
        id: `SLOT_${slotName}`,
        x: slotX,
        y: slotY,
        w: slotW,
        h: this.SLOT_HEIGHT,
        type: 'slot',
        slotId: slotName,

        clickSfx: isBlocked ? UI_SFX.error : undefined
      });

      this.ui.drawPanel(slotX, slotY, slotW, this.SLOT_HEIGHT, isBlocked ? "rgba(140, 28, 28, 0.15)" : UITheme.colors.panelBg);

      // While an item is carried, every slot that would take it is marked (gold dashes); a blocked slot shows red
      if (isValidDrop) this.ui.drawDropTarget(slotX, slotY, slotW, this.SLOT_HEIGHT, !isBlocked);

      // The slots are stacked close together, so the brackets are drawn inside
      this.ui.drawStateBox(slotX, slotY, slotW, this.SLOT_HEIGHT, flags, { inset: true });

      let item = equipData[slotName];

      if (heldItem && heldItem.source === 'equipment' && heldItem.originSlot === slotName) {
        item = null;
      }

      let def = null;
      if (item && item.defId) {
        def = ItemDefinitions[item.defId];
      }

      let itemName = "Empty";

      if (isBlocked) {
        itemName = "Blocked";
        item = null;
        def = null;
      } else if (item && def) {
        itemName = def.name;
        if (item.level && item.level > 1) {
          itemName += ` Lv.${item.level}`;
        }
      }

      const iconX = isLeft ? (slotX + slotW - 82) : (slotX + 5);
      const textX = isLeft ? (slotX + slotW - 91) : (slotX + 86);
      const textW = slotW - 96;
      const align = isLeft ? "right" : "left";

      if (def) this._drawIcon(def, iconX, slotY + 19);

      this.ui.drawStyled('cardLabel', slotName.toUpperCase(), textX, slotY + 29, { align });

      const nameLines = this.ui.getWrappedLines(itemName, textW, UITheme.fonts.cardSmall);
      let nameY = slotY + 58;
      if (nameLines.length === 1) nameY += 10;

      nameLines.forEach((line, i) => {
        if (i < 2) {
          let color = UITheme.colors.textMuted;
          if (isBlocked) {
            color = UITheme.colors.failure;
          } else if (item) {
            color = UITheme.colors.textMain;
          }
          this.ui.drawStyled('cardLabel', line, textX, nameY + (i * 29), { color, align });
        }
      });
    };

    activeSlots.slice(0, splitIndex).forEach((s, i) => drawSlot(s, i, true));
    activeSlots.slice(splitIndex).forEach((s, i) => drawSlot(s, i, false));
  }

  _drawTraitBadges(member, x, y, w, hitboxes, hoveredId) {
    const centerX = x + (w / 2);

    this.ui.drawStyled('heading', 'Traits', centerX, y, { align: 'center' });
    this.ui.drawLineWithGothicFlourish(centerX - 120, y + 19, 240, UITheme.colors.borderHighlight);

    let currentX = x + 72;
    let currentY = y + 60;
    const traits = member.traits || [];

    if (traits.length === 0) {
      this.ui.drawStyled('empty', 'None', centerX, currentY + 29);
      return;
    }

    // Measure with the same font the label is drawn in (it used to measure with whatever font
    // was last set, so badges came out too narrow or too wide and the text crowded the edges)
    const badgeFont = UITheme.fonts.cardSmall;
    const badgePadX = 36;
    const maxBadgeW = Math.max(120, w - 144);
    const gapX = 24;
    const rowStep = 77;

    traits.forEach(traitId => {
      const def = TRAIT_DEFINITIONS[traitId] || { name: traitId };
      this.ui.ctx.save();
      this.ui.ctx.font = badgeFont;
      let label = def.name;
      let textW = this.ui.ctx.measureText(label).width;
      const maxTextW = maxBadgeW - badgePadX * 2;
      if (textW > maxTextW) {
        while (label.length > 1 && this.ui.ctx.measureText(label + '...').width > maxTextW) label = label.slice(0, -1);
        label += '...';
        textW = this.ui.ctx.measureText(label).width;
      }
      this.ui.ctx.restore();
      const width = Math.ceil(textW + badgePadX * 2);

      if (currentX + width > x + w - 72) {
        currentX = x + 72;
        currentY += rowStep;
      }

      const traitFlags = this.ui.flags(traitId, hoveredId);

      hitboxes.push({
        id: traitId,
        x: currentX,
        y: currentY,
        w: width,
        h: 53,
        type: 'trait'
      });

      this.ui.drawPanel(currentX, currentY, width, 53, UITheme.colors.bgScale[1]);
      this.ui.drawStateBox(currentX, currentY, width, 53, traitFlags, { inset: true });
      this.ui.drawText(label, currentX + width / 2, currentY + 34, badgeFont, this.ui.stateTextColor(traitFlags, UITheme.colors.textMain), "center", "middle");

      currentX += width + gapX;
    });
  }

  _drawIcon(def, x, y) {
    if (!def) return;

    // Picks the right sprite sheet for the item's category - see CanvasUI.drawItemIcon
    this.ui.drawItemIcon(this.loader, def, x, y, 64, this.ICON_SRC_SIZE);
  }

  _drawStatusEffects(member, pX, pY, pSize) {
    if (!member.statusEffects || member.statusEffects.length === 0) return;

    const sheetKey = 'statusEffects';
    const srcSize = this.STATUS_ICON_SRC_SIZE;
    const drawSize = 32;
    const spacing = 5;

    const sheet = this.loader.get ? this.loader.get(sheetKey) : this.loader.getAsset(sheetKey);

    let drawX = pX + 5;
    let drawY = pY + pSize - drawSize - 5;

    member.statusEffects.forEach(effect => {
      this.ui.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      this.ui.ctx.fillRect(drawX, drawY, drawSize, drawSize);

      if (sheet && effect.icon) {
        this.ui.ctx.drawImage(sheet, effect.icon.col * srcSize, effect.icon.row * srcSize, srcSize, srcSize, drawX, drawY, drawSize, drawSize);
      } else {
        this.ui.drawStyled('badge', effect.name.charAt(0), drawX + (drawSize / 2), drawY + (drawSize / 2), { color: UITheme.colors.textOnIcon });
      }

      this.ui.ctx.strokeStyle = UITheme.colors.border;
      this.ui.ctx.strokeRect(drawX, drawY, drawSize, drawSize);

      if (effect.stacks && effect.stacks > 1) {
        this.ui.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ui.ctx.beginPath();
        this.ui.ctx.arc(drawX + drawSize, drawY + drawSize, 14, 0, Math.PI * 2);
        this.ui.ctx.fill();
        this.ui.drawStyled('badge', effect.stacks.toString(), drawX + drawSize, drawY + drawSize, { color: UITheme.colors.textOnIcon });
      }

      drawX += (drawSize + spacing);
      if (drawX + drawSize > pX + pSize) return;
    });
  }
}