import { UITheme } from '../../../ui/UITheme.js';
import { AbilityDefinitions } from '../../../../../shared/abilities/abilityDefinitions.js';
import { AbilityPreview } from '../../../ui/abilityPreview.js';
import { drawAbilityCard } from '../../../ui/abilityCard.js';

export class AbilitiesPanel {
  constructor(ui, loader) {
    this.ui = ui;
    this.loader = loader;

    this.SCROLLBAR_WIDTH = 10;
    this.ABILITY_ICON_SIZE = 64;
    this.ICON_SRC_SIZE = 64; // Sprite sheet cell size (upgraded from 32)
    this.totalContentHeight = 0;
  }

  render(member, x, y, w, h, state, hitboxes) {
    if (!member) return;

    // --- 1. Retrieve Compiled Abilities from State ---
    const abilityList = state.abilities || [];

    // --- 2. Render Empty State ---
    if (abilityList.length === 0) {
      this.ui.drawStyled('cardNote', "No abilities learned.", x + w / 2, y + 120, { align: 'center' });
      return;
    }

    // --- 3. Scroll Management ---
    const maxScroll = Math.max(0, this.totalContentHeight - h);

    if (state.layout) {
      state.layout.abilitiesBounds = { x: x, y: y, w: w + 48, h: h };
      state.layout.abilitiesMaxScroll = maxScroll;
      state.layout.abilitiesViewportH = h;
    }

    if (state.scrollOffset > maxScroll) state.scrollOffset = maxScroll;
    if (state.scrollOffset < 0) state.scrollOffset = 0;

    // --- 4. Render with Clipping ---
    this.ui.ctx.save();
    this.ui.startClip(x, y, w + 24, h);

    let currentY = y - state.scrollOffset;
    const initialDrawY = currentY;

    abilityList.forEach((abilityObj, index) => {
      const def = AbilityDefinitions[abilityObj.id];
      if (!def) return;

      // member + derivedStats let the card show damage scaled by the user's current stats
      currentY = this._drawAbilityCard(def, abilityObj, x, currentY, w, member, state.derivedStats);
    });

    this.totalContentHeight = currentY - initialDrawY;

    this.ui.endClip();
    this.ui.ctx.restore();

    // --- Draw Scrollbar ---
    if (this.totalContentHeight > h) {
      this.drawScrollBar(x + w + 14, y, h, this.totalContentHeight, state.scrollOffset, hitboxes);
    }
  }

  drawScrollBar(x, y, viewportH, contentH, scrollOffset, hitboxes) {
    this.ui.drawRect(x, y, this.SCROLLBAR_WIDTH, viewportH, UITheme.colors.scrollTrack || "rgba(0,0,0,0.5)");

    const viewRatio = viewportH / contentH;
    let thumbH = Math.max(48, viewportH * viewRatio);
    const maxScroll = contentH - viewportH;
    const scrollRatio = maxScroll > 0 ? (scrollOffset / maxScroll) : 0;
    const trackSpace = viewportH - thumbH;
    const thumbY = y + (scrollRatio * trackSpace);

    this.ui.drawRect(x, thumbY, this.SCROLLBAR_WIDTH, thumbH, UITheme.colors.scrollThumb || UITheme.colors.borderHighlight);

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

  _drawAbilityCard(ab, abilityObj, x, y, w, member = null, derivedStats = null) {
    const isEquip = abilityObj.isEquipment || (abilityObj.source && abilityObj.source !== 'Innate');
    return drawAbilityCard(this.ui, this.loader, ab, {
      x, y, w, member, derivedStats,
      name: abilityObj.name || abilityObj.id,
      source: isEquip ? (abilityObj.source || 'Equip') : 'Innate'
    });
  }

  _drawAbilityIcon(ability, x, y) {
    if (!this.loader) return;
    const sheet = this.loader.get('abilities') || this.loader.get('items');

    if (sheet) {
      const iconData = ability.icon || { col: 0, row: 0 };
      this.ui.drawSprite(
        sheet,
        iconData.col * this.ICON_SRC_SIZE, iconData.row * this.ICON_SRC_SIZE, this.ICON_SRC_SIZE, this.ICON_SRC_SIZE,
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