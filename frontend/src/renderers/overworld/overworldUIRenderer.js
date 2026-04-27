/**
 * frontend/src/renderers/overworld/overworldUIRenderer.js
 */
import { CanvasUI } from '../../ui/canvasUI.js';
import { UITheme } from '../../ui/UITheme.js';

export class OverworldUIRenderer {
    constructor(config, loader) {
        this.config = config;
        this.loader = loader;

        // Reverted to the original 80x80 square layout
        this.buttons = [
            { id: 'btn_party', x: 48, y: 48, w: 80, h: 80, label: 'PARTY', hotkey: 'P' }
        ];
    }

    render(ctx, state) {
        const { hoveredHitboxId } = state || {};
        const ui = new CanvasUI(ctx);

        for (const btn of this.buttons) {
            const isHovered = hoveredHitboxId === btn.id;
            this.drawButton(ctx, ui, btn, isHovered);
        }
    }

    drawButton(ctx, ui, btn, isHovered) {
        // 1. Resolve colors based on hover state
        const bgColor = isHovered ? "rgba(60, 55, 50, 0.95)" : "rgba(20, 18, 15, 0.85)";
        const textColor = isHovered ? UITheme.colors.states.hoverText : UITheme.colors.textMain;
        
        // Add a slight tactile bump upwards when hovered
        const yOffset = isHovered ? -2 : 0;
        const drawY = btn.y + yOffset;

        // 2. Draw the Main Gothic Panel
        ui.drawPanel(btn.x, drawY, btn.w, btn.h, bgColor);

        // 3. Draw pulse/glow brackets if hovered
        if (isHovered) {
            ui.drawSelectionBrackets(btn.x - 2, drawY - 2, btn.w + 4, btn.h + 4, 8, UITheme.colors.borderHighlight);
        }

        // 4. Draw Simplified Text & Hotkey with a smaller font
        const displayText = btn.hotkey ? `${btn.label} [${btn.hotkey}]` : btn.label;

        ui.drawText(
            displayText,
            btn.x + (btn.w / 2),
            drawY + (btn.h / 2) + 4, // Vertically centered
            UITheme.fonts.small || "12px sans-serif", // Smaller text to fit the 80x80 box
            textColor,
            "center",
            "alphabetic"
        );
    }
}