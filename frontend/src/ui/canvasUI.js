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

    // --- INTERACTIVE ELEMENTS (NEW) ---

    /**
     * Draws a standardized button.
     * @param {string} text - Label
     * @param {number} x 
     * @param {number} y 
     * @param {number} w 
     * @param {number} h 
     * @param {boolean} isHovered - Changes color if true
     * @param {boolean} isActive - Changes border if true (e.g. selected)
     */
    drawButton(text, x, y, w, h, isHovered = false, isActive = false) {
        this.ctx.save();

        // 1. Determine Colors based on State
        let bgColor = UITheme.colors.panelBg;
        let borderColor = UITheme.colors.border;
        let textColor = UITheme.colors.textMain;

        if (isActive) {
            borderColor = UITheme.colors.borderHighlight; // Gold/Yellow
            bgColor = '#333';
        } else if (isHovered) {
            bgColor = '#444'; // Lighter grey
            textColor = '#fff';
        }

        // 2. Draw Box
        this.ctx.fillStyle = bgColor;
        this.ctx.fillRect(x, y, w, h);
        
        this.ctx.strokeStyle = borderColor;
        this.ctx.lineWidth = isActive ? 3 : 2;
        this.ctx.strokeRect(x, y, w, h);

        // 3. Draw Text (Centered)
        this.ctx.font = UITheme.fonts.body;
        this.ctx.fillStyle = textColor;
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        
        // Center X = x + w/2
        // Center Y = y + h/2
        this.ctx.fillText(text, x + (w / 2), y + (h / 2));

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

    drawWrappedText(text, x, y, maxWidth, lineHeight = 24, font = UITheme.fonts.body, color = UITheme.colors.textMain) {
        if (!text) return;

        this.ctx.save();
        this.ctx.font = font;
        this.ctx.fillStyle = color;
        this.ctx.textAlign = "left";
        this.ctx.textBaseline = "top";

        const paragraphs = text.split('\n');
        let cursorY = y;

        paragraphs.forEach(paragraph => {
            const words = paragraph.split(' ');
            let line = '';

            for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + ' ';
                const metrics = this.ctx.measureText(testLine);
                
                if (metrics.width > maxWidth && n > 0) {
                    this.ctx.fillText(line, x, cursorY);
                    line = words[n] + ' ';
                    cursorY += lineHeight;
                } else {
                    line = testLine;
                }
            }
            this.ctx.fillText(line, x, cursorY);
            cursorY += lineHeight;
        });

        this.ctx.restore();
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
            // Use drawPanel recursively for consistency!
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