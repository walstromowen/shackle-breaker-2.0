import { UITheme, UIPointer } from './UITheme.js';
import { Formatting } from '../../../shared/core/formatting.js';
import { UITextures } from './uiTextures.js';

// Panels are painted once into an offscreen picture and drawn from it every frame (a panel costs a texture fill, a blurred inner shadow and a
// frame; doing that sixty times a second for a dozen panels would be wasteful). The picture is kept per size + fill + screen density.
// The pixel budget keeps the cache small: the least recently drawn panels are dropped first.
const PANEL_CACHE_BUDGET = 20_000_000;
const PANEL_MARGIN = 3;                    // room around the picture for the half of the edge line that falls outside the outline
const _panelCache = new Map();
let _panelCachePixels = 0;
function makeLayer(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

export class CanvasUI {
  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  constructor(ctx) {
    this.ctx = ctx;
  }

  // --- SCREEN MANAGEMENT ---
  /** The background of a screen: the blurred world it opened over (or a mottled near-black), a vignette and film grain (UITextures). */
  clearScreen(width, height) {
    UITextures.drawScreenBackground(this.ctx, width, height);
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
      this.ctx.lineWidth = 1.5;
      this.ctx.globalAlpha = 0.6;
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
    const ctx = this.ctx;
    ctx.save();
    // 1. The track: a dark trough
    ctx.fillStyle = bgColor;
    ctx.fillRect(x, y, w, h);

    // 2. How full
    if (max <= 0) max = 1;
    const pct = Math.max(0, Math.min(1, current / max));
    const fw = w * pct;

    // 3. The fill, shaded like a rounded tube: lit along the top, deepest at the bottom, with a bright line where it ends
    if (fw > 0) {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, fw, h);
      if (h >= 6) {
        const tube = ctx.createLinearGradient(0, y, 0, y + h);
        tube.addColorStop(0, 'rgba(255, 245, 225, 0.22)');
        tube.addColorStop(0.45, 'rgba(255, 245, 225, 0)');
        tube.addColorStop(1, 'rgba(0, 0, 0, 0.38)');
        ctx.fillStyle = tube;
        ctx.fillRect(x, y, fw, h);
        if (pct < 1 && fw > 3) {
          ctx.fillStyle = 'rgba(255, 245, 225, 0.5)';
          ctx.fillRect(x + fw - 1.5, y, 1.5, h);
        }
      }
    }

    // 4. The trough's inner shadow, then a fine frame
    if (h >= 6) {
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = Math.min(8, h * 0.6);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
    }
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = UITheme.colors.border;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.restore();
  }

  // --- PANELS ---
  /** The outline of a panel: a rectangle with the top-left and bottom-right corners cut off. */
  panelPath(x, y, w, h, chamfer = UITheme.panel.chamfer, ctx = this.ctx) {
    const c = Math.max(0, Math.min(chamfer, Math.floor(Math.min(w, h) / 4)));
    ctx.beginPath();
    ctx.moveTo(x + c, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h - c);
    ctx.lineTo(x + w - c, y + h);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + c);
    ctx.closePath();
  }

  /**
   * A panel: a dark plate with grain and soft blotches in it, a shadowed inner edge, a brass hairline and a fainter second line inside it,
   * and small diamonds on its corners. The top-left and bottom-right corners are cut. Drawn from a cached picture (see PANEL_CACHE_BUDGET).
   */
  drawPanel(x, y, w, h, bgColor = UITheme.colors.panelBg, variant = 'plate') {
    const ctx = this.ctx;
    if (!(w > 1 && h > 1)) return;
    const scale = Math.round(Math.max(1, ctx.getTransform().a) * 2) / 2;
    const cacheable = bgColor === null || bgColor === undefined || typeof bgColor === 'string';
    if (!cacheable) {   // a gradient or pattern fill: painted directly, as before
      ctx.save();
      this.panelPath(x, y, w, h);
      ctx.fillStyle = bgColor;
      ctx.fill();
      ctx.restore();
      this._paintPanelSurface(ctx, x, y, w, h, false, variant);
      return;
    }
    const key = `${Math.round(w)}x${Math.round(h)}|${scale}|${variant}|${bgColor || ''}`;
    let layer = _panelCache.get(key);
    if (layer) {
      _panelCache.delete(key);          // re-insert: most recently used goes last
    } else {
      const pw = Math.ceil((Math.round(w) + PANEL_MARGIN * 2) * scale), ph = Math.ceil((Math.round(h) + PANEL_MARGIN * 2) * scale);
      layer = makeLayer(pw, ph);
      const g = layer.getContext('2d');
      g.scale(scale, scale);
      g.translate(PANEL_MARGIN, PANEL_MARGIN);
      if (bgColor) {
        this.panelPath(0, 0, Math.round(w), Math.round(h), UITheme.panel.chamfer, g);
        g.fillStyle = bgColor;
        g.fill();
      }
      this._paintPanelSurface(g, 0, 0, Math.round(w), Math.round(h), !!bgColor, variant);
      _panelCachePixels += pw * ph;
      for (const [k, old] of _panelCache) {
        if (_panelCachePixels <= PANEL_CACHE_BUDGET) break;
        _panelCache.delete(k);
        _panelCachePixels -= old.width * old.height;
      }
    }
    _panelCache.set(key, layer);
    ctx.drawImage(layer, 0, 0, layer.width, layer.height, x - PANEL_MARGIN, y - PANEL_MARGIN, layer.width / scale, layer.height / scale);
  }

  /** Everything of a panel but its fill: texture, lit top, shadowed inner edge, frame lines, corner marks. `g` is the context to draw on. */
  _paintPanelSurface(g, x, y, w, h, textured, variant = 'plate') {
    const p = UITheme.panel;
    const slot = variant === 'slot';   // an item slot: a dark recess, not a plate
    const small = slot || Math.min(w, h) < 60;
    g.save();
    this.panelPath(x, y, w, h, p.chamfer, g);
    g.clip();
    if (textured) {
      // the material: soft blotches and grain, a faint cool light along the top
      g.globalAlpha = slot ? p.mottle * 0.5 : p.mottle;
      g.fillStyle = g.createPattern(UITextures.mottle(), 'repeat');
      g.fillRect(x, y, w, h);
      g.globalAlpha = p.grain;
      g.fillStyle = g.createPattern(UITextures.grain(), 'repeat');
      g.fillRect(x, y, w, h);
      g.globalAlpha = 1;
      const sheen = g.createLinearGradient(0, y, 0, y + Math.min(h, 520));
      sheen.addColorStop(0, `rgba(150, 165, 195, ${p.sheen})`);
      sheen.addColorStop(1, 'rgba(150, 165, 195, 0)');
      g.fillStyle = sheen;
      g.fillRect(x, y, w, h);
    }
    // the inner edge falls into shadow: a blurred dark line along the outline, clipped to the inside
    g.shadowColor = `rgba(0, 0, 0, ${slot ? 1 : p.innerShadow})`;
    g.shadowBlur = slot ? 22 : small ? 10 : p.innerShadowBlur;
    g.strokeStyle = '#000';
    g.lineWidth = 2;
    this.panelPath(x, y, w, h, p.chamfer, g);
    g.stroke();
    g.restore();

    g.save();
    // the thin worn edge
    g.strokeStyle = p.edgeColor;
    g.lineWidth = slot ? 1 : p.edgeWidth;
    g.globalAlpha = slot ? p.edgeAlpha * 0.7 : p.edgeAlpha;
    this.panelPath(x, y, w, h, p.chamfer, g);
    g.stroke();
    if (slot) {   // a recess catches light on its lower lip
      g.globalAlpha = 0.16;
      g.strokeStyle = '#cfc7b4';
      g.beginPath();
      g.moveTo(x + 3, y + h - 0.5);
      g.lineTo(x + w - p.chamfer - 2, y + h - 0.5);
      g.stroke();
    }

    const b = p.brackets;
    if (b.on && !slot && Math.min(w, h) >= b.minSize) {
      // a large panel wears a doubled bracket on each corner: a longer outer arm and a shorter inner one just inside it
      g.strokeStyle = p.edgeColor;
      const corner = (cx, cy, sx, sy) => {
        for (const [off, arm, width, alpha] of [[b.inset, b.outerArm, 1.5, b.alpha], [b.inset + b.gap, b.innerArm, 1, b.alpha * 0.6]]) {
          g.globalAlpha = alpha;
          g.lineWidth = width;
          g.beginPath();
          g.moveTo(cx + sx * (off + arm), cy + sy * off);
          g.lineTo(cx + sx * off, cy + sy * off);
          g.lineTo(cx + sx * off, cy + sy * (off + arm));
          g.stroke();
        }
      };
      corner(x, y, 1, 1);
      corner(x + w, y, -1, 1);
      corner(x, y + h, 1, -1);
      corner(x + w, y + h, -1, -1);
    }
    g.restore();
  }

  /**
   * A full-height column of a screen (the three columns of the summary, the two halves of the shop): the fill colour with the same grain and
   * blotches as a panel, a shadow falling in from both long edges and a faint line down the side where it meets the next column.
   */
  drawColumn(x, y, w, h, bgColor = UITheme.colors.bgScale[0]) {
    const ctx = this.ctx;
    const p = UITheme.panel;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.fillStyle = bgColor;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = p.mottle * 0.8;
    ctx.fillStyle = ctx.createPattern(UITextures.mottle(), 'repeat');
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = p.grain * 0.8;
    ctx.fillStyle = ctx.createPattern(UITextures.grain(), 'repeat');
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
    const reach = Math.min(40, w / 3);
    for (const [from, to, edge] of [[x, x + reach, x], [x + w, x + w - reach, x + w]]) {
      const fall = ctx.createLinearGradient(from, 0, to, 0);
      fall.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
      fall.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = fall;
      ctx.fillRect(Math.min(from, to), y, reach, h);
    }
    ctx.fillStyle = 'rgba(194, 161, 79, 0.14)';
    ctx.fillRect(x + w - 1, y, 1, h);
    ctx.restore();
  }

  /** An item slot: a recess in the surface with a deep inner shadow (the same outline as a panel, so highlights fit it). */
  drawSlot(x, y, w, h, bgColor = UITheme.colors.bgScale[1]) {
    this.drawPanel(x, y, w, h, bgColor, 'slot');
  }

  /** The panel behind anything that floats above a screen (tooltips, context menus): the standard panel edge plus a drop shadow. */
  drawPopupPanel(x, y, w, h) {
    const p = UITheme.popup;
    this.ctx.save();
    this.ctx.shadowColor = p.shadowColor;
    this.ctx.shadowBlur = p.shadowBlur;
    this.ctx.shadowOffsetX = p.shadowOffset;
    this.ctx.shadowOffsetY = p.shadowOffset;
    this.drawPanel(x, y, w, h, p.bg);
    this.ctx.restore();
  }

  /** The same colour with another alpha: '#c2a14f' -> 'rgba(194, 161, 79, 0.3)'. Understands #rgb, #rrggbb and rgb()/rgba(). */
  withAlpha(color, alpha) {
    const c = String(color).trim();
    let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c);
    if (m) {
      let hex = m[1];
      if (hex.length === 3) hex = hex.split('').map(ch => ch + ch).join('');
      const n = parseInt(hex, 16);
      return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
    }
    m = /^rgba?\(([^)]+)\)$/i.exec(c);
    if (m) {
      const [r, g, b] = m[1].split(',').map(x => parseFloat(x));
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return c;
  }

  // --- TEXT RENDERING ---
  /* The "current/max" of a bar (3700/3700, 21929/21929...) in a column `maxWidth` wide, so a big number never runs into the bar beside it.
     1. as it is; 2. with the numbers shortened (21.9k/21.9k); 3. the font made smaller (down to 55%) until it fits. Returns { text, font, width }. */
  fitFraction(current, max, maxWidth, font = UITheme.fonts.cardMono) {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = font;
    const full = `${Math.floor(current || 0)}/${Math.floor(max || 0)}`;
    const widthOf = (t) => ctx.measureText(t).width;
    let result = { text: full, font, width: widthOf(full) };
    if (result.width > maxWidth) {
      const short = `${Formatting.compactNumber(current || 0)}/${Formatting.compactNumber(max || 0)}`;
      const w = widthOf(short);
      result = { text: short, font, width: w };
      if (w > maxWidth) {
        const m = /(\d+(?:\.\d+)?)px/.exec(font);
        const scale = Math.max(0.55, maxWidth / w);
        if (m) result = { text: short, font: font.replace(m[0], `${Math.floor(parseFloat(m[1]) * scale * 10) / 10}px`), width: w * scale };
      }
    }
    ctx.restore();
    return result;
  }

  /* drawText for the "current/max" of a bar, fitted to `maxWidth` with fitFraction. */
  drawFraction(current, max, x, y, maxWidth, font = UITheme.fonts.cardMono, color = UITheme.colors.textMuted, align = "right") {
    const fit = this.fitFraction(current, max, maxWidth, font);
    this.drawText(fit.text, x, y, fit.font, color, align);
  }

  drawText(text, x, y, font = UITheme.fonts.body, color = UITheme.colors.textMain, align = "left", baseline = "alphabetic", maxWidth = undefined, tracking = 0) {
    this.ctx.save();
    this.ctx.font = font;
    if (tracking && 'letterSpacing' in this.ctx) this.ctx.letterSpacing = `${tracking}px`;   // part of the saved state, so restore() resets it
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

  // --- TEXT ROLES (see UITheme.text for the list and what each one is for) ---

  /** The role's text, with its capitals / dashes rule applied ("empty" notes become "- text -", "columnLabel" is capitals). */
  styledText(role, text, opts = {}) {
    const r = UITheme.text[role];
    let t = String(text ?? '');
    if (opts.upper ?? r.upper) t = t.toUpperCase();
    if (r.dashes) t = `- ${t.replace(/^[-\s]+|[-\s.]+$/g, '')} -`;
    // Key help is written "[R-Click/ESC] Back" in the screens' strings; it is drawn "R-Click/ESC: Back" (no brackets anywhere in the UI)
    if (role === 'hint') t = t.replace(/\[([^\]]+)\]\s*/g, '$1: ');
    return t;
  }

  /**
   * Draws one line of text in a role:  ui.drawStyled('heading', 'Objectives', x, y)
   * opts (all optional) override the role: { align, baseline, color, font, maxWidth, kind, upper }  kind picks a 'notice' color.
   */
  drawStyled(role, text, x, y, opts = {}) {
    const r = UITheme.text[role];
    if (!r) throw new Error(`[CanvasUI] There is no text role "${role}".`);
    const color = opts.color || (r.kinds && r.kinds[opts.kind]) || r.color;
    const lift = r.shadow || null;   // titles and headings sit on a soft shadow, so they stand off whatever is behind them
    if (lift) {
      this.ctx.save();
      this.ctx.shadowColor = lift.color; this.ctx.shadowBlur = lift.blur; this.ctx.shadowOffsetY = lift.dy;
    }
    this.drawText(this.styledText(role, text, opts), x, y, opts.font || r.font, color,
      opts.align || r.align, opts.baseline || r.baseline || 'alphabetic', opts.maxWidth, opts.tracking ?? r.tracking ?? 0);
    if (lift) this.ctx.restore();
  }

  /** As drawStyled, for text that wraps: ui.drawStyledWrapped('body', text, x, y, maxWidth, lineHeight). */
  drawStyledWrapped(role, text, x, y, maxWidth, lineHeight, opts = {}) {
    const r = UITheme.text[role];
    if (!r) throw new Error(`[CanvasUI] There is no text role "${role}".`);
    const color = opts.color || (r.kinds && r.kinds[opts.kind]) || r.color;
    this.drawWrappedText(this.styledText(role, text, opts), x, y, maxWidth, lineHeight, opts.font || r.font, color);
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

  // ========================================================================
  // INTERACTION STATES - one visual language for every screen
  //
  // Every selectable thing (button, tab, list row, grid cell, card, menu option) is drawn with these, so hovering, keyboard
  // focus, a chosen item, a held mouse button and a disabled one look the same everywhere. Pass FLAGS:
  //   { highlighted, hovered, focused, selected, pressed, disabled }
  // highlighted / hovered / focused all mean "this is what the player is pointing at" - they are one look, and the controllers
  // only ever report one of them at a time (getFocusId), so just pass  highlighted: (id === state.hoveredHitboxId).
  // ========================================================================

  /**
   * The flags for one element, in one line:  ui.flags(id, state.hoveredId, { selected: i === chosen, disabled: !canUse })
   * highlighted = this is the focused element (mouse hover or keyboard cursor); pressed = the mouse button is held down on it.
   * `extra` is merged over the result.
   */
  flags(id, focusId, extra = {}) {
    return { highlighted: id != null && id === focusId, pressed: id != null && id === UIPointer.pressedId, ...extra };
  }

  /** 'disabled' | 'pressed' | 'highlight' | 'selected' | 'normal' */
  resolveState(flags = {}) {
    const lit = !!(flags.highlighted || flags.hovered || flags.focused);
    if (flags.disabled) return 'disabled';
    if (flags.pressed && lit) return 'pressed';
    if (lit) return 'highlight';
    if (flags.selected) return 'selected';
    return 'normal';
  }

  /** The text color a state calls for. `base` is what the text uses when nothing is going on. */
  stateTextColor(flags = {}, base = UITheme.colors.textMuted) {
    const s = UITheme.colors.states;
    switch (this.resolveState(flags)) {
      case 'pressed':   return s.pressedText;
      case 'highlight': return s.highlightText;
      case 'selected':  return s.selectedText;
      default:          return base;
    }
  }

  /** 1 normally, the theme's disabled alpha for a disabled element. */
  stateAlpha(flags = {}) {
    return flags.disabled ? UITheme.colors.states.disabledAlpha : 1;
  }

  /**
   * Draws the background, edge mark and corner brackets for a state. Draw the element's own content (text, icon) afterwards.
   *   highlight  gold wash + thin gold edge + a brass accent bar on the left edge
   *   pressed    dark wash
   *   selected   pale wash + a bar down the left edge (stays on while highlighted, so a chosen item that is also under the
   *              mouse shows both)
   * opts: { bar: false }  no accent bar          { wash: false }  no wash / edge (a button draws its own face)
   * @returns {string} the resolved state
   */
  drawStateBox(x, y, w, h, flags = {}, opts = {}) {
    const state = this.resolveState(flags);

    // A disabled element is never washed or barred, but the cursor can still be on it: show just a faint edge so a keyboard
    // cursor resting on it is not lost. The caller's globalAlpha (stateAlpha) does the fading.
    if (state === 'disabled') {
      if (flags.highlighted || flags.hovered || flags.focused) {
        this.ctx.save();
        this.ctx.strokeStyle = UITheme.colors.states.highlightBorder;
        this.ctx.lineWidth = 1;
        this.panelPath(x + 0.5, y + 0.5, w - 1, h - 1);
        this.ctx.stroke();
        this.ctx.restore();
      }
      return state;
    }

    const s = UITheme.colors.states;
    const sel = UITheme.selection;

    // The washes fade from the left edge to the right: a lit edge rather than a flat tint
    // Everything is drawn inside the same outline as a panel (top-left and bottom-right corners cut), so the highlight over a card
    // follows the card's notches instead of poking out of them. (`opts.notch === false` keeps square corners.)
    const notched = opts.notch !== false;
    const ctx = this.ctx;
    ctx.save();
    if (notched) { this.panelPath(x, y, w, h); ctx.clip(); }

    const wash = (from, to) => {
      const g = ctx.createLinearGradient(x, 0, x + w, 0);
      g.addColorStop(0, from);
      g.addColorStop(1, to);
      this.drawRect(x, y, w, h, g, true);
    };
    if (state === 'pressed') {
      this.drawRect(x, y, w, h, s.pressedBg, true);
    } else if (state === 'highlight' && opts.wash !== false) {
      wash(s.highlightBg, s.highlightBgEnd);
    } else if (state === 'selected') {
      wash(s.selectedBg, s.selectedBgEnd);
    }

    // The accent bar down the left edge: pale for a chosen item, brass for the item the cursor is on (there are no corner marks)
    if (opts.bar !== false) {
      if (state === 'highlight' || state === 'pressed') this.drawRect(x, y, 3, h, s.highlightBar, true);
      else if (flags.selected) this.drawRect(x, y, 3, h, s.selectedBar, true);
    }
    ctx.restore();

    if ((state === 'highlight' || state === 'pressed') && opts.wash !== false) {
      ctx.save();
      ctx.strokeStyle = s.highlightBorder;
      ctx.lineWidth = 1;
      ctx.shadowColor = s.highlightGlow;     // the edge gives off a soft light
      ctx.shadowBlur = s.highlightGlowBlur;
      if (notched) this.panelPath(x + 0.5, y + 0.5, w - 1, h - 1);
      else { ctx.beginPath(); ctx.rect(x + 0.5, y + 0.5, w - 1, h - 1); }
      ctx.stroke();
      ctx.restore();
    }
    return state;
  }

  /** The Back button: the same size, label and look on every screen (UITheme.backButton). Register a hitbox with the same id and box. */
  drawBackButton(focusId, box = UITheme.backButtonBox(), id = 'btn_back') {
    return this.drawButton(box.x, box.y, box.w, box.h, UITheme.backButton.label, this.flags(id, focusId));
  }

  /** A standard button: dark face, thin edge, centered label, and the shared state look on top. */
  drawButton(x, y, w, h, label, flags = {}, opts = {}) {
    const state = this.resolveState(flags);
    this.ctx.save();
    this.ctx.globalAlpha *= this.stateAlpha(flags); // multiply, so a screen fading in or out still fades

    const b = UITheme.button;
    if (opts.bg) {
      this.drawRect(x, y, w, h, opts.bg, true);
    } else {
      const lit = state === 'highlight' || state === 'pressed';
      const face = this.ctx.createLinearGradient(0, y, 0, y + h);
      face.addColorStop(0, lit ? b.faceTopLit : b.faceTop);
      face.addColorStop(1, lit ? b.faceBottomLit : b.faceBottom);
      this.drawRect(x, y, w, h, face, true);
    }
    this.ctx.save();
    this.ctx.strokeStyle = state === 'highlight' || state === 'pressed' ? b.edgeLit : b.edge;
    this.ctx.lineWidth = 1;
    if (state === 'highlight') { this.ctx.shadowColor = UITheme.colors.states.highlightGlow; this.ctx.shadowBlur = UITheme.colors.states.highlightGlowBlur; }
    this.ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    this.ctx.shadowBlur = 0;
    this.ctx.globalAlpha = 0.5;                       // the top edge catches the light
    this.ctx.strokeStyle = 'rgba(255, 238, 200, 0.3)';
    this.ctx.beginPath();
    this.ctx.moveTo(x + 2, y + 1.5);
    this.ctx.lineTo(x + w - 2, y + 1.5);
    this.ctx.stroke();
    this.ctx.restore();
    this.drawStateBox(x, y, w, h, flags, { ...opts, bar: false, wash: false, notch: false });   // a button is a plain rectangle

    this.drawText(
      opts.upper === false ? label : String(label).toUpperCase(), x + w / 2, y + h / 2,
      (!opts.font || opts.font === UITheme.fonts.medium || opts.font === UITheme.fonts.body) ? UITheme.fonts.button : opts.font,
      this.stateTextColor(flags, opts.color || UITheme.colors.textMain),
      'center', 'middle', undefined, opts.tracking ?? b.tracking
    );
    this.ctx.restore();
    return state;
  }

  /**
   * A scrollbar: track + thumb. Returns the thumb rectangle {x,y,w,h} to register as the drag hitbox (or null when there is
   * nothing to scroll). The thumb takes the highlight color while hovered or dragged, like everything else.
   */
  drawScrollbar(x, y, w, h, offset, maxScroll, viewportH, flags = {}) {
    if (!(maxScroll > 0)) return null;

    const sb = UITheme.scrollbar;
    // The hit area stays the full width; what is drawn is a hairline track with a slim rounded thumb down the middle
    const cx = x + w / 2;
    this.drawRect(cx - 1, y, 2, h, UITheme.colors.scrollTrack, true);

    const contentH = maxScroll + viewportH;
    const thumbH = Math.max(sb.minThumb, Math.min(h, h * (viewportH / contentH)));
    const t = Math.max(0, Math.min(1, offset / maxScroll));
    const thumbY = y + (h - thumbH) * t;

    const lit = !!(flags.highlighted || flags.hovered || flags.dragging || flags.focused || flags.pressed);
    this.ctx.save();
    this.ctx.globalAlpha = lit ? 0.95 : 0.5;
    this.ctx.fillStyle = lit ? UITheme.colors.states.highlightText : UITheme.colors.scrollThumb;
    const tw = Math.min(w, lit ? 8 : 6);
    this.ctx.beginPath();
    this.ctx.roundRect(cx - tw / 2, thumbY, tw, thumbH, tw / 2);
    this.ctx.fill();
    this.ctx.restore();

    return { x, y: thumbY, w, h: thumbH };
  }

  /** Marks where a dragged item would land. valid = gold dashes, not valid = red dashes. */
  drawDropTarget(x, y, w, h, valid = true) {
    this.ctx.save();
    this.ctx.strokeStyle = valid ? UITheme.colors.states.highlightText : UITheme.colors.failure;
    this.ctx.fillStyle = valid ? UITheme.colors.states.highlightBg : 'rgba(140, 28, 28, 0.12)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([10, 6]);
    this.ctx.fillRect(x, y, w, h);
    this.ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    this.ctx.restore();
  }

  /**
   * A selectable text row: menu options, list entries and tabs. flags as for drawStateBox (use ui.flags(...)).
   * opts: { font, align: 'left'|'center'|'right', inset, brackets, color (text color when nothing is going on) }
   * Tabs are just rows with  align: 'center', inset: true  - the chosen tab is  selected: true.
   */
  drawRow(x, y, w, h, label, flags = {}, opts = {}) {
    const align = opts.align || 'left';
    const state = this.resolveState(flags);

    this.ctx.save();
    this.ctx.globalAlpha *= this.stateAlpha(flags); // multiply, so a screen fading in or out still fades

    // 1. Background, edge, bar and brackets
    this.drawStateBox(x, y, w, h, flags, { inset: opts.inset });

    // 2. Text
    const textColor = this.stateTextColor(flags, opts.color || UITheme.colors.textMuted);
    let textX = x + 24;
    if (align === 'center') textX = x + (w / 2);
    else if (align === 'right') textX = x + w - 24;

    this.drawText(label, textX, y + (h / 2) + 10, opts.font || UITheme.fonts.body, textColor, align, 'alphabetic', undefined, opts.tracking || 0);
    this.ctx.restore();
    return state;
  }

  /**
   * A tab: a dark backing and thin edge with a centered label, in the shared state look. The open tab is
   * selected: true; the one under the mouse / keyboard cursor is highlighted (ui.flags does this).
   * Tab labels are always drawn in capitals. opts as for drawRow (font defaults to the small font, brackets are inside).
   */
  drawTab(x, y, w, h, label, flags = {}, opts = {}) {
    this.drawRect(x, y, w, h, opts.bg || 'rgba(0,0,0,0.5)', true);
    this.drawRect(x, y, w, h, UITheme.colors.border, false);
    return this.drawRow(x, y, w, h, String(label).toUpperCase(), flags, { font: UITheme.fonts.small, align: 'center', inset: true, tracking: 2, ...opts });
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
  // The corner brackets of a highlighted element. dist = px outside the element (negative = inside); null uses the theme's
  // distance (plus its optional slow breathing), so every bracket on every screen moves the same way.
  drawSelectionBrackets(x, y, w, h, dist = null, color = UITheme.colors.borderHighlight) {
    return;   // the corner brackets are retired: a highlighted element now shows the gold wash, a fine edge and an accent bar (drawStateBox)
    // eslint-disable-next-line no-unreachable
    const sel = UITheme.selection;
    const p = dist !== null && dist !== undefined
      ? dist
      : sel.bracketDist + (sel.bracketPulse ? Math.sin(Date.now() / 150) * sel.bracketPulse : 0);
    const len = Math.max(6, Math.min(sel.bracketLen, Math.floor(Math.min(w, h) / 2)));
    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1.5;
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 8;

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
    // Two hairlines that fade out toward their far ends, a gap, and a small diamond in the middle
    this.ctx.fillStyle = color;
    this.ctx.lineWidth = 1.5;
    const middleX = x + (w / 2);
    const gap = 16;
    const diaSize = 5;
    const left = this.ctx.createLinearGradient(x, 0, middleX - gap, 0);
    left.addColorStop(0, this.withAlpha(color, 0));
    left.addColorStop(1, color);
    const right = this.ctx.createLinearGradient(middleX + gap, 0, x + w, 0);
    right.addColorStop(0, color);
    right.addColorStop(1, this.withAlpha(color, 0));

    this.ctx.globalAlpha = 0.55;
    this.ctx.strokeStyle = left;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(middleX - gap, y);
    this.ctx.stroke();
    this.ctx.strokeStyle = right;
    this.ctx.beginPath();
    this.ctx.moveTo(middleX + gap, y);
    this.ctx.lineTo(x + w, y);
    this.ctx.stroke();

    this.ctx.globalAlpha = 0.85;
    this.ctx.beginPath();
    this.ctx.moveTo(middleX, y - diaSize);
    this.ctx.lineTo(middleX + diaSize, y);
    this.ctx.lineTo(middleX, y + diaSize);
    this.ctx.lineTo(middleX - diaSize, y);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.restore();
  }

  // --- STANDARDIZED CONTEXT MENU (With Icon & Ability Support) ---
  // One option is lit at a time: the one the mouse is over (hoveredId, MENU_OPT_n or CTX_OPT_n) or, if the mouse is not on an
  // option, the keyboard cursor (menu.selectedIndex; -1 = none). Dividers and info lines are never lit.
  drawContextMenu(menu, layout, hitboxes = [], hoveredId = null, loader = null) {
    if (!menu || !menu.options) return;

    const options = menu.options;
    const padding = menu.padding || 0;
    const btnHeight = menu.btnHeight || 64;

    let activeIndex = menu.selectedIndex;
    const hoverMatch = typeof hoveredId === 'string' ? /^(?:MENU_OPT_|CTX_OPT_)(\d+)$/.exec(hoveredId) : null;
    if (hoverMatch) activeIndex = parseInt(hoverMatch[1], 10);

    this.drawPopupPanel(layout.x, layout.y, layout.w, layout.h);

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

      const selectable = !opt.isInfo && !opt.disabled;
      const flags = { highlighted: selectable && i === activeIndex, disabled: !!opt.disabled };

      this.ctx.save();
      this.ctx.globalAlpha *= this.stateAlpha(flags); // multiply, so a screen fading in or out still fades

      // The shared highlight, inset so it stays inside the panel
      this.drawStateBox(layout.x + 12, btnY, layout.w - 24, btnHeight, flags, { inset: true });

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
      const baseColor = opt.isInfo ? UITheme.colors.textHighlight : UITheme.colors.textMain;
      const textColor = this.stateTextColor(flags, baseColor);

      this.drawText(
        opt.label,
        textX,
        btnY + (btnHeight / 2) + 2,
        UITheme.fonts.cardSmall,
        textColor,
        textAlign,
        "middle"
      );
      this.ctx.restore();
    });
  }
}
