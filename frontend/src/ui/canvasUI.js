import { UITheme } from './UITheme.js'; 

export class CanvasUI {
  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  constructor(ctx) {
    this.ctx = ctx;
  }

  // --- SCREEN MANAGEMENT ---
  clearScreen(width, height) {
    this.ctx.fillStyle = UITheme.colors.background;
    this.ctx.fillRect(0, 0, width, height);
  }

  // --- CLIPPING (Required for Scrolling Lists) ---
  startClip(x, y, w, h) {
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(x, y, w, h);
    this.ctx.clip();
  }

  endClip() {
    this.ctx.restore();
  }

  // --- BASIC SHAPES ---
  drawRect(x, y, w, h, color, filled = true) {
    this.ctx.save();
    if (filled) {
      this.ctx.fillStyle = color;
      this.ctx.fillRect(x, y, w, h);
    } else {
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 2; 
      this.ctx.globalAlpha = 0.5;
      this.ctx.strokeRect(x, y, w, h);
    }
    this.ctx.restore();
  }

  drawLine(x1, y1, x2, y2, color = UITheme.colors.border, width = 2) {
    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.globalAlpha = 0.5;
    this.ctx.beginPath();
    // Dynamic offset based on line width (odd widths need 0.5, even widths do not)
    const offset = (width % 2 !== 0) ? 0.5 : 0;
    this.ctx.moveTo(x1 + offset, y1 + offset);
    this.ctx.lineTo(x2 + offset, y2 + offset);
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawArrow(x, y, size, direction, color = UITheme.colors.textMain) {
    this.ctx.save();
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    if (direction === 'left') {
      this.ctx.moveTo(x + size, y - size); // Top Right
      this.ctx.lineTo(x - size, y);        // Left Point
      this.ctx.lineTo(x + size, y + size); // Bottom Right
    } else {
      this.ctx.moveTo(x - size, y - size); // Top Left
      this.ctx.lineTo(x + size, y);        // Right Point
      this.ctx.lineTo(x - size, y + size); // Bottom Left
    }
    this.ctx.fill();
    this.ctx.restore();
  }

  // --- HUD ELEMENTS ---
  drawBar(x, y, w, h, current, max, color = UITheme.colors.hp, bgColor = "rgba(0,0,0,0.5)") {
    this.ctx.save();
    // 1. Draw Background (Track)
    this.ctx.fillStyle = bgColor;
    this.ctx.fillRect(x, y, w, h);

    // 2. Calculate Fill Amount
    if (max <= 0) max = 1;
    const pct = Math.max(0, Math.min(1, current / max));

    // 3. Draw Foreground (Fill)
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, w * pct, h);

    // 4. Crisp Border Frame
    this.ctx.strokeStyle = UITheme.colors.border;
    this.ctx.globalAlpha = 0.4;
    this.ctx.lineWidth = 2; 
    this.ctx.strokeRect(x, y, w, h);
    this.ctx.restore();
  }

  // --- PANELS ---
  drawPanel(x, y, w, h, bgColor = UITheme.colors.panelBg) {
    this.ctx.save();
    // Fill
    if (bgColor) {
      this.ctx.fillStyle = bgColor;
      this.ctx.fillRect(x, y, w, h);
    }

    // --- Single Line Modern Border ---
    this.ctx.strokeStyle = UITheme.colors.borderHighlight;
    this.ctx.lineWidth = 2; 
    this.ctx.globalAlpha = 0.6;
    this.ctx.strokeRect(x, y, w, h);

    this.ctx.restore();
  }

  // --- TEXT RENDERING ---
  drawText(text, x, y, font = UITheme.fonts.body, color = UITheme.colors.textMain, align = "left", baseline = "alphabetic", maxWidth = undefined) {
    this.ctx.save();
    this.ctx.font = font;
    this.ctx.fillStyle = color;
    this.ctx.textAlign = align;
    this.ctx.textBaseline = baseline;
    if (maxWidth) {
      this.ctx.fillText(text, x, y, maxWidth);
    } else {
      this.ctx.fillText(text, x, y);
    }
    this.ctx.restore();
  }

  getWrappedLines(text, maxWidth, font = UITheme.fonts.body) {
    if (!text) return [];
    this.ctx.save();
    this.ctx.font = font;
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];
    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = this.ctx.measureText(currentLine + " " + word).width;
      if (width < maxWidth) {
        currentLine += " " + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    this.ctx.restore();
    return lines;
  }

  drawWrappedText(text, x, y, maxWidth, lineHeight = 58, font = UITheme.fonts.body, color = UITheme.colors.textMain) {
    if (!text) return;
    const paragraphs = text.split('\n');
    let cursorY = y;
    paragraphs.forEach(paragraph => {
      const lines = this.getWrappedLines(paragraph, maxWidth, font);
      lines.forEach(line => {
        this.drawText(line, x, cursorY, font, color, "left", "top");
        cursorY += lineHeight;
      });
    });
  }

  // --- STAT CHIPS ("Label: value" pairs that wrap to fit a width) ---

  /**
   * Measures a list of { label, value, tone } chips and packs them into rows
   * no wider than maxWidth. Call this BEFORE sizing a card so the card height
   * can account for the number of rows.
   * @returns {Array<Array<{chip:object, x:number, valueX:number, w:number}>>}
   */
  layoutChips(chips, maxWidth, font = UITheme.fonts.small, labelGap = 4, chipGap = 16) {
    if (!chips || chips.length === 0) return [];

    this.ctx.save();
    this.ctx.font = font;

    const rows = [];
    let row = [];
    let cursor = 0;

    chips.forEach(chip => {
      const labelW = this.ctx.measureText(chip.label).width;
      const valueW = this.ctx.measureText(chip.value).width;
      const w = labelW + labelGap + valueW;

      // Start a new row when this chip would run past the edge (but never leave a row empty)
      if (row.length > 0 && cursor + w > maxWidth) {
        rows.push(row);
        row = [];
        cursor = 0;
      }

      row.push({ chip, x: cursor, valueX: cursor + labelW + labelGap, w });
      cursor += w + chipGap;
    });

    if (row.length > 0) rows.push(row);
    this.ctx.restore();
    return rows;
  }

  /**
   * Lays chips out as a column: one stat per line, values lined up under each other.
   * Returns the same row shape as layoutChips, so drawChipRows draws it unchanged.
   */
  layoutChipColumn(chips, font = UITheme.fonts.small, labelGap = 8) {
    if (!chips || chips.length === 0) return [];

    this.ctx.save();
    this.ctx.font = font;

    let labelColW = 0;
    chips.forEach(chip => {
      labelColW = Math.max(labelColW, this.ctx.measureText(chip.label).width);
    });

    const valueX = labelColW + labelGap;
    const rows = chips.map(chip => {
      const w = valueX + this.ctx.measureText(chip.value).width;
      return [{ chip, x: 0, valueX, w }];
    });

    this.ctx.restore();
    return rows;
  }

  /**
   * Draws rows produced by layoutChips. (x, y) is the left edge / vertical middle
   * of the first row; each following row is rowH lower.
   * colors: { muted, accent, normal }
   */
  drawChipRows(rows, x, y, rowH, font, colors) {
    this.ctx.save();
    this.ctx.font = font;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';

    rows.forEach((row, rowIndex) => {
      const rowY = y + (rowIndex * rowH);
      row.forEach(({ chip, x: chipX, valueX }) => {
        this.ctx.fillStyle = colors.muted;
        this.ctx.fillText(chip.label, x + chipX, rowY);
        this.ctx.fillStyle = chip.tone === 'accent' ? colors.accent : colors.normal;
        this.ctx.fillText(chip.value, x + valueX, rowY);
      });
    });

    this.ctx.restore();
  }

  drawInteractiveRow(x, y, w, h, label, font, align, isFocused, isHovered) {
    this.ctx.save();
    let textColor = UITheme.colors.textMuted;
    let bgColor = null;

    // 1. Resolve State Colors
    if (isFocused) {
      textColor = UITheme.colors.states.focusText;
      bgColor = UITheme.colors.states.focusBg;
    } else if (isHovered) {
      textColor = UITheme.colors.states.hoverText;
      bgColor = UITheme.colors.states.hoverBg;
    }

    // 2. Draw Background
    if (bgColor) {
      this.drawRect(x, y, w, h, bgColor, true);
    }

    // 3. Draw Text
    const textY = y + (h / 2) + 10;
    let textX = x;
    if (align === "center") textX = x + (w / 2);
    else if (align === "right") textX = x + w - 24;
    else textX = x + 24; 

    this.drawText(label, textX, textY, font, textColor, align, "alphabetic");

    // 4. Draw Focus Brackets
    if (isFocused) {
      this.drawSelectionBrackets(x, y, w, h, 10, UITheme.colors.borderHighlight);
    }
    this.ctx.restore();
  }

  // --- IMAGES ---
  drawSprite(image, sx, sy, sw, sh, dx, dy, dw, dh) {
    if (!image) return;
    this.ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
  }

  // --- ITEM ICONS ---
  // One shared answer to "which sprite sheet is this item's icon on?" so the inventory,
  // equipment, workshop, item detail, held-item cursor and pickup toasts all agree.
  //
  // If an item category still doesn't draw, open the browser console: ONE warning per
  // category lists every sheet key that was tried. Add the key your loader really uses to
  // ITEM_SHEET_ALIASES (or give the item  icon: { sheet: 'myKey', col, row }).

  /** Sheet keys to try, in order, for each item category (first one the loader knows wins). */
  static ITEM_SHEET_ALIASES = {
    weapons:     ['weapons'],
    armor:       ['armor', 'armour'],
    consumables: ['consumables', 'consumable', 'potions', 'consumableItems'],
    materials:   ['materials', 'material'],
    items:       ['items', 'icons']
  };

  /** Per-category source cell size in px. Leave empty to use each renderer's ICON_SRC_SIZE (64). */
  static ITEM_CELL_SIZE = {
    // consumables: 32,
  };

  /** item.type / item.category values that live on the consumables sheet. */
  static CONSUMABLE_TYPES = ['consumable', 'consumables', 'potion', 'food', 'drink', 'scroll', 'elixir', 'tonic'];

  static _warnedItemSheets = new Set();

  /** 'weapons' | 'armor' | 'consumables' | 'materials' | 'items' */
  getItemCategory(def) {
    if (!def) return 'items';

    const type = String(def.type || '').toLowerCase();
    const category = String(def.category || def.itemType || '').toLowerCase();
    const slot = String(def.slot || '').toLowerCase();

    if (['mainhand', 'offhand'].includes(slot) || ['weapon', 'shield', 'tool'].includes(type)) return 'weapons';
    if (type === 'armor' || ['head', 'body', 'legs', 'feet', 'hands', 'accessory'].includes(slot)) return 'armor';
    if (CanvasUI.CONSUMABLE_TYPES.includes(type) || CanvasUI.CONSUMABLE_TYPES.includes(category)) return 'consumables';
    if (type === 'material' || category === 'material' || category === 'materials') return 'materials';
    return 'items';
  }

  /**
   * Finds the loaded sprite sheet for an item category (or a sheet name such as a toast's iconSheet).
   * @returns {{sheet:CanvasImageSource, key:string, category:string, cell:number|null}|null}
   */
  resolveItemSheet(loader, categoryOrKey, explicitKey = null) {
    if (!loader) return null;

    const aliases = CanvasUI.ITEM_SHEET_ALIASES;
    const category = aliases[categoryOrKey]
      ? categoryOrKey
      : (Object.keys(aliases).find(c => aliases[c].includes(categoryOrKey)) || null);

    const candidates = [
      ...(explicitKey ? [explicitKey] : []),
      ...(category ? aliases[category] : [categoryOrKey]),
      ...aliases.items,
      'icons'
    ];

    const lookup = (key) => {
      try {
        if (typeof loader.get === 'function') return loader.get(key) || null;
        if (typeof loader.getAsset === 'function') return loader.getAsset(key) || null;
      } catch (e) { /* unknown key -> treat as missing */ }
      return null;
    };

    const own = [...(explicitKey ? [explicitKey] : []), ...(category ? aliases[category] : [categoryOrKey])];

    for (const key of candidates) {
      const sheet = lookup(key);
      if (!sheet) continue;

      if (!own.includes(key)) this._warnMissingItemSheet(category || categoryOrKey, candidates, key);
      return { sheet, key, category, cell: (category && CanvasUI.ITEM_CELL_SIZE[category]) || null };
    }

    this._warnMissingItemSheet(category || categoryOrKey, candidates, null);
    return null;
  }

  _warnMissingItemSheet(category, tried, usedFallback) {
    const warned = CanvasUI._warnedItemSheets;
    if (warned.has(category)) return;
    warned.add(category);

    const tail = usedFallback
      ? `Falling back to "${usedFallback}", so icons may be wrong or blank.`
      : 'No fallback sheet found either, so nothing will draw.';
    console.warn(`[CanvasUI] No sprite sheet loaded for "${category}" (tried: ${[...new Set(tried)].join(', ')}). ${tail}`);
  }

  // An item whose type matches no sheet (and there is no general "items" sheet) can't be drawn.
  // Say exactly which item and type it was, once per type.
  _warnUnmappedItemType(def) {
    const type = String(def.type || '(none)');
    const warned = CanvasUI._warnedItemSheets;
    const key = `unmapped:${type}`;
    if (warned.has(key)) return;
    warned.add(key);

    console.warn(
      `[CanvasUI] Item "${def.id || def.name || '?'}" has type "${type}"` +
      `${def.slot ? ` / slot "${def.slot}"` : ''}, which doesn't map to weapons, armor, consumables or ` +
      `materials, and no "items" sheet is loaded, so its icon can't be drawn. ` +
      `Add "${type.toLowerCase()}" to CanvasUI.CONSUMABLE_TYPES (or the right category), ` +
      `or give the definition icon: { sheet: '<sheetKey>', col, row }.`
    );
  }

  /**
   * Draws an item definition's icon ({col,row}) from the sheet that matches its category.
   * @param {number} defaultCell  source cell size to use unless a category/item override exists
   * @returns {boolean} true if something was drawn (so callers can draw a placeholder otherwise)
   */
  drawItemIcon(loader, def, x, y, size, defaultCell = 64) {
    if (!def) return false;

    const icon = (def.icon && typeof def.icon === 'object') ? def.icon : { col: 0, row: 0 };
    const explicit = icon.sheet || def.iconSheet || null;

    const category = this.getItemCategory(def);
    const found = this.resolveItemSheet(loader, category, explicit);
    if (!found) {
      if (category === 'items') this._warnUnmappedItemType(def);
      return false;
    }

    const cell = icon.size || found.cell || defaultCell;
    this.drawSprite(found.sheet, (icon.col || 0) * cell, (icon.row || 0) * cell, cell, cell, x, y, size, size);
    return true;
  }

  // --- HUD ELEMENTS ---
  drawSelectionBrackets(x, y, w, h, dist = null, color = UITheme.colors.borderHighlight) {
    const p = dist !== null ? dist : 10 + Math.sin(Date.now() / 150) * 5;
    const len = 19; 
    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2; 
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 14; 

    this.ctx.beginPath();
    // Top Left
    this.ctx.moveTo(x - p, y - p + len);
    this.ctx.lineTo(x - p, y - p);
    this.ctx.lineTo(x - p + len, y - p);
    // Top Right
    this.ctx.moveTo(x + w + p - len, y - p);
    this.ctx.lineTo(x + w + p, y - p);
    this.ctx.lineTo(x + w + p, y - p + len);
    // Bottom Right
    this.ctx.moveTo(x + w + p, y + h + p - len);
    this.ctx.lineTo(x + w + p, y + h + p);
    this.ctx.lineTo(x + w + p - len, y + h + p);
    // Bottom Left
    this.ctx.moveTo(x - p + len, y + h + p);
    this.ctx.lineTo(x - p, y + h + p);
    this.ctx.lineTo(x - p, y + h + p - len);

    this.ctx.stroke();
    this.ctx.restore();
  }

  drawLancetArchedPanel(x, y, w, h, bgColor = UITheme.colors.panelBg, borderCol = UITheme.colors.border) {
    this.ctx.save();
    const curveRadius = w / 2;
    const archY = y + curveRadius;
    const actualArchY = Math.max(y + 12, Math.min(archY, y + (h * 0.5))); 

    const definePath = (ctx, offset = 0) => {
      const ox = x + offset;
      const oy = y + offset;
      const ow = w - (offset * 2);
      const oh = h - (offset * 2);
      const oArchY = actualArchY + offset;
      const middleX = ox + (ow / 2);

      ctx.beginPath();
      ctx.moveTo(ox, oy + oh);
      ctx.lineTo(ox, oArchY);
      ctx.quadraticCurveTo(ox, oy, middleX, oy);
      ctx.quadraticCurveTo(ox + ow, oy, ox + ow, oArchY);
      ctx.lineTo(ox + ow, oy + oh);
      ctx.closePath();
    };

    if (bgColor) {
      definePath(this.ctx);
      this.ctx.fillStyle = bgColor;
      this.ctx.fill();
    }

    this.ctx.strokeStyle = borderCol;
    this.ctx.lineWidth = 2; 
    this.ctx.globalAlpha = 0.6;
    definePath(this.ctx, 0);
    this.ctx.stroke();

    this.ctx.restore();
  }

  drawLineWithGothicFlourish(x, y, w, color = UITheme.colors.border) {
    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.fillStyle = color;
    this.ctx.lineWidth = 2; 
    this.ctx.globalAlpha = 0.4;
    const middleX = x + (w / 2);
    const pipSize = 5; 
    const diaSize = 7; 

    // Draw Main Line
    this.ctx.beginPath();
    this.ctx.moveTo(x + pipSize + 5, y); 
    this.ctx.lineTo(x + w - pipSize - 5, y);
    this.ctx.stroke();

    this.ctx.globalAlpha = 0.7;
    // End Pips
    this.ctx.fillRect(x, y - (pipSize / 2), pipSize, pipSize);
    this.ctx.fillRect(x + w - pipSize, y - (pipSize / 2), pipSize, pipSize);

    // Center Diamond flourish
    this.ctx.beginPath();
    this.ctx.moveTo(middleX, y - diaSize); // Top
    this.ctx.lineTo(middleX + diaSize, y); // Right
    this.ctx.lineTo(middleX, y + diaSize); // Bottom
    this.ctx.lineTo(middleX - diaSize, y); // Left
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.restore();
  }

  // --- STANDARDIZED CONTEXT MENU (With Icon & Ability Support) ---
drawContextMenu(menu, layout, hitboxes = [], hoveredId = null, loader = null) {
  if (!menu || !menu.options) return;

  const options = menu.options;
  const highlightIndex = menu.selectedIndex;
  const padding = menu.padding || 0;
  const btnHeight = menu.btnHeight || 64;

  this.drawPanel(layout.x, layout.y, layout.w, layout.h, UITheme.colors.bgScale[1]);

  hitboxes.unshift({
    id: 'MENU_BG',
    type: 'context_bg',
    x: layout.x,
    y: layout.y,
    w: layout.w,
    h: layout.h,
    cursor: 'default'
  });

  options.forEach((opt, i) => {
    const btnY = layout.y + padding + (i * btnHeight);
    const optId = `MENU_OPT_${i}`;

    // Don't register click hitboxes for informational dividers
    if (!opt.isDivider) {
      hitboxes.unshift({
        id: optId,
        type: 'context_opt',
        x: layout.x,
        y: btnY,
        w: layout.w,
        h: btnHeight,
        cursor: opt.isInfo ? 'default' : 'pointer'
      });
    }

    const isHovered = (i === highlightIndex) || (hoveredId === optId);

    if (isHovered && !opt.isDivider) {
      this.drawRect(layout.x + 12, btnY, layout.w - 24, btnHeight, "rgba(255, 255, 255, 0.05)", true);
    }

    // --- DIVIDER LINE ---
    if (opt.isDivider) {
      this.drawLine(
        layout.x + 16,
        btnY + (btnHeight / 2),
        layout.x + layout.w - 16,
        btnY + (btnHeight / 2),
        UITheme.colors.border,
        1
      );
      return;
    }

    // --- ICON RENDERING (32x32) ---
    let textX = layout.x + (layout.w / 2);
    let textAlign = "center";

    if (opt.iconSheet && loader) {
      const sheet = loader.get(opt.iconSheet) || loader.get('abilities') || loader.get('icons');
      if (sheet) {
        const iconSize = opt.iconSize || 32;
        const iconX = layout.x + 16;
        const iconY = btnY + Math.floor((btnHeight - iconSize) / 2);

        const col = opt.iconCol || 0;
        const row = opt.iconRow || 0;

        // Draw the 32x32 icon
        this.drawSprite(sheet, col * iconSize, row * iconSize, iconSize, iconSize, iconX, iconY, iconSize, iconSize);

        // Shift text to the right and left-align
        textX = iconX + iconSize + 12;
        textAlign = "left";
      }
    }

    // --- TEXT RENDERING ---
    const textColor = opt.isInfo ? UITheme.colors.textHighlight : UITheme.colors.textMain;

    this.drawText(
      opt.label,
      textX,
      btnY + (btnHeight / 2) + 2,
      UITheme.fonts.cardSmall,
      textColor,
      textAlign,
      "middle"
    );
  });
}
}