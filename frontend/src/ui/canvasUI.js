import { UITheme } from './UITheme.js';

export class CanvasUI {
    /**
     * @param {CanvasRenderingContext2D} ctx
     */
    constructor(ctx) {
        this.ctx = ctx;
    }

    /**
     * Fills the entire screen with the theme's background color.
     * @param {number} width 
     * @param {number} height 
     */
    clearScreen(width, height) {
        this.ctx.fillStyle = UITheme.colors.background;
        this.ctx.fillRect(0, 0, width, height);
    }

    /**
     * Draws a wireframe box (stroke only).
     * Used for container borders.
     * @param {number} x 
     * @param {number} y 
     * @param {number} w 
     * @param {number} h 
     */
    drawPanel(x, y, w, h) {
        this.ctx.strokeStyle = UITheme.colors.panelBorder;
        this.ctx.lineWidth = UITheme.layout.lineWidth;
        this.ctx.strokeRect(x, y, w, h);
    }

    /**
     * Draws a solid filled box.
     * Used for highlighting selected buttons or backgrounds.
     * @param {number} x 
     * @param {number} y 
     * @param {number} w 
     * @param {number} h 
     * @param {string} color - Optional override (defaults to theme highlight)
     */
    drawFilledPanel(x, y, w, h, color = UITheme.colors.highlightBg) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, w, h);
    }

    /**
     * Draws a single line of text.
     * @param {string} text 
     * @param {number} x 
     * @param {number} y 
     * @param {string} font - CSS font string (from UITheme)
     * @param {string} color - Hex color (from UITheme)
     * @param {string} align - "left", "center", or "right"
     */
    drawText(text, x, y, font = UITheme.fonts.body, color = UITheme.colors.textMain, align = "left") {
        this.ctx.font = font;
        this.ctx.fillStyle = color;
        this.ctx.textAlign = align;
        this.ctx.textBaseline = "middle"; 
        this.ctx.fillText(text, x, y);
    }

    /**
     * Automatically wraps text to fit within a specific width.
     * Used for narrative text and descriptions.
     * @param {string} text 
     * @param {number} x 
     * @param {number} y 
     * @param {number} maxWidth 
     * @param {number} lineHeight 
     */
    drawWrappedText(text, x, y, maxWidth, lineHeight = 24) {
        if (!text) return;
        
        this.ctx.font = UITheme.fonts.small;
        this.ctx.fillStyle = UITheme.colors.textMuted;
        this.ctx.textAlign = "left";
        this.ctx.textBaseline = "top"; // Top align makes multi-line math easier

        const words = text.split(' ');
        let line = '';
        let currentY = y;

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = this.ctx.measureText(testLine);
            const testWidth = metrics.width;
            
            if (testWidth > maxWidth && n > 0) {
                this.ctx.fillText(line, x, currentY);
                line = words[n] + ' ';
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        }
        // Draw the last remaining line
        this.ctx.fillText(line, x, currentY);
    }
}