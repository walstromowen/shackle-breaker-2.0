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

    drawFilledPanel(x, y, w, h, color = UITheme.colors.borderHighlight) {
        this.ctx.save();
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, w, h);
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
     * Wraps text within a specific width.
     */
    drawWrappedText(text, x, y, maxWidth, lineHeight = 24, font = UITheme.fonts.body, color = UITheme.colors.textMain) {
        if (!text) return;

        this.ctx.save();
        this.ctx.font = font;
        this.ctx.fillStyle = color;
        this.ctx.textAlign = "left";
        this.ctx.textBaseline = "top";

        const words = text.split(' ');
        let line = '';
        let cursorY = y;

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = this.ctx.measureText(testLine);
            const testWidth = metrics.width;
            
            if (testWidth > maxWidth && n > 0) {
                this.ctx.fillText(line, x, cursorY);
                line = words[n] + ' ';
                cursorY += lineHeight;
            } else {
                line = testLine;
            }
        }
        this.ctx.fillText(line, x, cursorY);
        this.ctx.restore();
    }

    // --- GAMEPLAY ELEMENTS ---

    drawBar(x, y, w, h, current, max, color = UITheme.colors.danger) {
        const fill = Math.max(0, Math.min(1, current / max)); // Clamp between 0 and 1
        
        this.ctx.save();
        // Background
        this.ctx.fillStyle = "#222";
        this.ctx.fillRect(x, y, w, h);

        // Fill
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, w * fill, h);

        // Border
        this.ctx.strokeStyle = UITheme.colors.border;
        this.ctx.strokeRect(x, y, w, h);
        this.ctx.restore();
    }

    drawPortraitCircle(x, y, radius, label) {
        this.ctx.save();
        
        // Circle
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.strokeStyle = UITheme.colors.border;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Optional: Draw a placeholder background inside
        this.ctx.fillStyle = "#111";
        this.ctx.fill();

        // Nameplate (optional label)
        if (label) {
            const plateW = radius * 2.5;
            const plateH = 24;
            this.drawPanel(x - (plateW/2), y + radius - 12, plateW, plateH);
            this.drawText(label, x, y + radius, UITheme.fonts.small, UITheme.colors.textMain, "center", "middle");
        }
        
        this.ctx.restore();
    }
}