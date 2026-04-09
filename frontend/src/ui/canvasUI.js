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
            this.ctx.lineWidth = 1;
            this.ctx.globalAlpha = 0.5; // Softens the line to make it feel more delicate
            
            // The +0.5 trick prevents HTML canvas from blurring 1px lines into 2px lines
            this.ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        }
        this.ctx.restore();
    }

    drawLine(x1, y1, x2, y2, color = UITheme.colors.border, width = 1) {
        this.ctx.save();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width;
        this.ctx.globalAlpha = 0.5; // Soft, elegant dividers
        
        this.ctx.beginPath();
        // Offset for horizontal/vertical crispness
        const offset = (width === 1) ? 0.5 : 0; 
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
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

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
        
        // --- Elegant Gothic Border ---
        this.ctx.strokeStyle = UITheme.colors.border;

        // 1. Outer crisp line
        this.ctx.lineWidth = 1;
        this.ctx.globalAlpha = 0.6;
        this.ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        
        // 2. Faint, delicate inner frame
        const inset = 4;
        this.ctx.globalAlpha = 0.15;
        this.ctx.strokeRect(x + inset + 0.5, y + inset + 0.5, w - (inset * 2) - 1, h - (inset * 2) - 1);

        // 3. Corner accents (pips)
        this.ctx.globalAlpha = 0.7;
        this.ctx.fillStyle = UITheme.colors.border;
        const pSize = 2;
        
        this.ctx.fillRect(x + inset, y + inset, pSize, pSize); // Top Left
        this.ctx.fillRect(x + w - inset - pSize, y + inset, pSize, pSize); // Top Right
        this.ctx.fillRect(x + inset, y + h - inset - pSize, pSize, pSize); // Bottom Left
        this.ctx.fillRect(x + w - inset - pSize, y + h - inset - pSize, pSize, pSize); // Bottom Right
        
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

    // --- HUD ELEMENTS ---
    
    drawSelectionBrackets(x, y, w, h, dist, color = UITheme.colors.borderHighlight) {
        const p = dist; 
        const len = 8;        
        
        this.ctx.save();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1; // Thinned this out as well!
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = 6; 
        
        this.ctx.beginPath();
        // Top Left
        this.ctx.moveTo(x - p + 0.5, y - p + len + 0.5);
        this.ctx.lineTo(x - p + 0.5, y - p + 0.5);
        this.ctx.lineTo(x - p + len + 0.5, y - p + 0.5);
        
        // Top Right
        this.ctx.moveTo(x + w + p - len + 0.5, y - p + 0.5);
        this.ctx.lineTo(x + w + p + 0.5, y - p + 0.5);
        this.ctx.lineTo(x + w + p + 0.5, y - p + len + 0.5);
        
        // Bottom Right
        this.ctx.moveTo(x + w + p + 0.5, y + h + p - len + 0.5);
        this.ctx.lineTo(x + w + p + 0.5, y + h + p + 0.5);
        this.ctx.lineTo(x + w + p - len + 0.5, y + h + p + 0.5);
        
        // Bottom Left
        this.ctx.moveTo(x - p + len + 0.5, y + h + p + 0.5);
        this.ctx.lineTo(x - p + 0.5, y + h + p + 0.5);
        this.ctx.lineTo(x - p + 0.5, y + h + p - len + 0.5);
        
        this.ctx.stroke();
        this.ctx.restore();
    }
    drawLancetArchedPanel(x, y, w, h, bgColor = UITheme.colors.panelBg, borderCol = UITheme.colors.border) {
        this.ctx.save();
        
        // 1. Calculate arch parameters
        // The "Point" starts at archY, which is the height minus the radius needed for the curve
        const curveRadius = w / 2;
        const archY = y + curveRadius; 
        
        // Ensure the arch doesn't take up more than half the total height
        const actualArchY = Math.max(y + 5, Math.min(archY, y + (h * 0.5)));

        // 2. Define the Pointed Arch Path
        const definePath = (ctx, offset = 0) => {
            const ox = x + offset;
            const oy = y + offset;
            const ow = w - (offset * 2);
            const oh = h - (offset * 2);
            const oArchY = actualArchY + offset;
            const middleX = ox + (ow / 2);

            ctx.beginPath();
            // Start Bottom Left
            ctx.moveTo(ox, oy + oh);
            // Line up to start of arch
            ctx.lineTo(ox, oArchY);
            
            // Left Curve: Control point is top-left corner, ends at middle top point
            ctx.quadraticCurveTo(ox, oy, middleX, oy);
            
            // Right Curve: Control point is top-right corner, ends at right edge
            ctx.quadraticCurveTo(ox + ow, oy, ox + ow, oArchY);
            
            // Line down to bottom right
            ctx.lineTo(ox + ow, oy + oh);
            // Close bottom line
            ctx.closePath();
        };

        // 3. Draw Background Fill
        if (bgColor) {
            definePath(this.ctx);
            this.ctx.fillStyle = bgColor;
            this.ctx.fill();
        }

        // 4. Draw Elegant Thin Border (+0.5 trick for crispness)
        this.ctx.strokeStyle = borderCol;
        this.ctx.lineWidth = 1;
        this.ctx.globalAlpha = 0.6;
        definePath(this.ctx, 0.5); 
        this.ctx.stroke();

        this.ctx.restore();
    }

    /**
     * Draws a delicate Gothic line flourish (pips on ends, diamond in center)
     */
    drawLineWithGothicFlourish(x, y, w, color = UITheme.colors.border) {
        this.ctx.save();
        this.ctx.strokeStyle = color;
        this.ctx.fillStyle = color;
        this.ctx.lineWidth = 1;
        this.ctx.globalAlpha = 0.4;
        
        const middleX = x + (w/2);
        const pipSize = 2;
        const diaSize = 3; // Center Diamond

        // Draw Main Line (Crisp 1px horizontal)
        this.ctx.beginPath();
        this.ctx.moveTo(x + pipSize + 2, y + 0.5);
        this.ctx.lineTo(x + w - pipSize - 2, y + 0.5);
        this.ctx.stroke();

        this.ctx.globalAlpha = 0.7; // Pips are brighter

        // End Pips
        this.ctx.fillRect(x, y - (pipSize/2), pipSize, pipSize);
        this.ctx.fillRect(x + w - pipSize, y - (pipSize/2), pipSize, pipSize);

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
}