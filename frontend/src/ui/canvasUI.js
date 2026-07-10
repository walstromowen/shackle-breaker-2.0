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

  // --- STANDARDIZED CONTEXT MENU (Party Screen Style) ---
  drawContextMenu(menu, layout, hitboxes = [], hoveredId = null) {
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

      hitboxes.unshift({
        id: optId,
        type: 'context_opt',
        x: layout.x,
        y: btnY,
        w: layout.w,
        h: btnHeight,
        cursor: 'pointer'
      });

      const isHovered = (i === highlightIndex) || (hoveredId === optId);

      if (isHovered) {
        this.drawRect(layout.x + 12, btnY, layout.w - 24, btnHeight, "rgba(255, 255, 255, 0.05)", true);
      }

      const color = UITheme.colors.textMain;
      this.drawText(
        opt.label,
        layout.x + (layout.w / 2),
        btnY + (btnHeight / 2),
        UITheme.fonts.cardSmall,
        color,
        "center",
        "middle"
      );
    });
  }
}