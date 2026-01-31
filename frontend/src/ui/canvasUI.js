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

    // --- BASIC SHAPES (Added to fix your error) ---

    /**
     * Draws a rectangle (filled or stroked).
     * @param {number} x 
     * @param {number} y 
     * @param {number} w 
     * @param {number} h 
     * @param {string} color 
     * @param {boolean} filled - If true, fills; if false, strokes.
     */
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

    // --- IMAGES & SPRITES ---

    drawSprite(image, sx, sy, sw, sh, dx, dy, dw, dh) {
        if (!image) return;
        this.ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
    }

    // --- CLIPPING (For scrolling lists) ---

    startClip(x, y, w, h) {
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(x, y, w, h);
        this.ctx.clip();
    }

    endClip() {
        this.ctx.restore();
    }

    // --- PANELS & BOXES ---

    drawPanel(x, y, w, h, filled = true) {
        this.ctx.save();
        this.ctx.strokeStyle = UITheme.colors.border;
        this.ctx.lineWidth = 2;

        if (filled) {
            this.ctx.fillStyle = UITheme.colors.panelBg;
            this.ctx.fillRect(x, y, w, h);
        }
        
        this.ctx.strokeRect(x, y, w, h);
        this.ctx.restore();
    }

    drawButton(text, x, y, w, h, isHovered = false, isActive = false) {
        this.ctx.save();
        let bgColor = UITheme.colors.panelBg;
        let borderColor = UITheme.colors.border;
        let textColor = UITheme.colors.textMain;

        if (isActive) {
            borderColor = UITheme.colors.borderHighlight; 
            bgColor = '#333';
        } else if (isHovered) {
            bgColor = '#444'; 
            textColor = '#fff';
        }

        this.ctx.fillStyle = bgColor;
        this.ctx.fillRect(x, y, w, h);
        
        this.ctx.strokeStyle = borderColor;
        this.ctx.lineWidth = isActive ? 3 : 2;
        this.ctx.strokeRect(x, y, w, h);

        this.ctx.font = UITheme.fonts.body;
        this.ctx.fillStyle = textColor;
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText(text, x + (w / 2), y + (h / 2));
        this.ctx.restore();
    }

    // --- SCROLLING ---

    drawScrollBar(x, y, height, totalContentHeight, currentScrollY) {
        if (totalContentHeight <= height) return;

        const trackWidth = 6;
        const thumbColor = "#777";
        const trackColor = "rgba(0,0,0,0.3)";

        this.ctx.save();
        this.ctx.fillStyle = trackColor;
        this.ctx.fillRect(x, y, trackWidth, height);

        const viewRatio = height / totalContentHeight;
        const thumbHeight = Math.max(20, height * viewRatio);
        const maxScroll = totalContentHeight - height;
        const scrollRatio = Math.min(1, Math.max(0, currentScrollY / maxScroll));
        const thumbY = y + (scrollRatio * (height - thumbHeight));

        this.ctx.fillStyle = thumbColor;
        this.ctx.fillRect(x + 1, thumbY, trackWidth - 2, thumbHeight);
        this.ctx.restore();
    }

    // --- TEXT RENDERING ---

    drawText(text, x, y, font = UITheme.fonts.body, color = UITheme.colors.textMain, align = "left", baseline = "alphabetic") {
        this.ctx.save();
        this.ctx.font = font;
        this.ctx.fillStyle = color;
        this.ctx.textAlign = align;
        this.ctx.textBaseline = baseline;
        this.ctx.fillText(text, x, y);
        this.ctx.restore();
    }

    /**
     * Calculates line wrapping without drawing.
     * Used by Renderers to calculate layout height before drawing.
     */
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

    /**
     * Draws text that wraps automatically.
     */
    drawWrappedText(text, x, y, maxWidth, lineHeight = 24, font = UITheme.fonts.body, color = UITheme.colors.textMain) {
        if (!text) return;
        
        // Handle manual newlines first
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

    // --- GAMEPLAY ELEMENTS ---

    drawBar(x, y, w, h, current, max, color = UITheme.colors.danger) {
        const fill = Math.max(0, Math.min(1, current / max));
        this.ctx.save();
        this.ctx.fillStyle = "#222";
        this.ctx.fillRect(x, y, w, h);
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, w * fill, h);
        this.ctx.strokeStyle = UITheme.colors.border;
        this.ctx.strokeRect(x, y, w, h);
        this.ctx.restore();
    }

    drawPortraitCircle(x, y, radius, label) {
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.strokeStyle = UITheme.colors.border;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.fillStyle = "#111";
        this.ctx.fill();

        if (label) {
            const plateW = radius * 2.5;
            const plateH = 24;
            this.drawPanel(x - (plateW/2), y + radius - 12, plateW, plateH);
            this.drawText(label, x, y + radius, UITheme.fonts.small, UITheme.colors.textMain, "center", "middle");
        }
        this.ctx.restore();
    }

    // --- INPUT HELPERS ---

    static isPointInRect(x, y, rect) {
        return (x >= rect.x && x <= rect.x + rect.w &&
                y >= rect.y && y <= rect.y + rect.h);
    }
}