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
            this.ctx.strokeRect(x, y, w, h);
        }
        this.ctx.restore();
    }

    drawLine(x1, y1, x2, y2, color, width = 1) {
        this.ctx.save();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width;
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
        this.ctx.restore();
    }

    drawArrow(x, y, size, direction, color) {
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

    /**
     * Updated to remove hardcoded borders. 
     * Relies on the contrast between 'color' and 'bgColor' (dimmed version).
     */
    drawBar(x, y, w, h, current, max, color, bgColor = "rgba(0,0,0,0.5)") {
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

        // Note: Hardcoded border removed for cleaner "flat" look 
        // consistent with modern UI styles.

        this.ctx.restore();
    }

    // --- PANELS ---

    /**
     * Updated to accept a specific background color (e.g. for bgScale columns)
     */
    drawPanel(x, y, w, h, bgColor = UITheme.colors.panelBg) {
        this.ctx.save();
        
        // Fill
        if (bgColor) {
            this.ctx.fillStyle = bgColor;
            this.ctx.fillRect(x, y, w, h);
        }
        
        // Border
        this.ctx.strokeStyle = UITheme.colors.border;
        this.ctx.lineWidth = 1; // Thinned to 1px for sharper lines
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

    getWrappedLines(text, maxWidth, font) {
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

    drawWrappedText(text, x, y, maxWidth, lineHeight = 24, font = UITheme.fonts.body, color = UITheme.colors.textMain) {
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

    // --- IMAGES ---

    drawSprite(image, sx, sy, sw, sh, dx, dy, dw, dh) {
        if (!image) return;
        this.ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
    }
}