/**
 * frontend/src/renderers/overworld/overworldUIRenderer.js
 */
import { CanvasUI } from '../../ui/canvasUI.js';
import { UITheme } from '../../ui/UITheme.js';

export class OverworldUIRenderer {
    constructor(config, loader) {
        this.config = config;
        this.loader = loader;
        
        // Coordinated with OverworldController (80x80 square layout)
        this.buttons = [
            { id: 'btn_party', x: 48, y: 48, w: 80, h: 80, label: 'PARTY', hotkey: 'P' }
        ];
    }

    render(ctx, state) {
        const { hoveredHitboxId } = state || {};
        
        // Instantiate the CanvasUI helper
        const ui = new CanvasUI(ctx);

        // Draw each button
        for (const btn of this.buttons) {
            const isHovered = hoveredHitboxId === btn.id;
            this.drawButton(ctx, ui, btn, isHovered);
        }
    }

    drawButton(ctx, ui, btn, isHovered) {
        // 1. Resolve colors based on hover state
        const solidLightenedBg = "rgba(50, 45, 40, 0.95)"; 
        const bgColor = isHovered ? solidLightenedBg : UITheme.colors.panelBg;
        const textColor = isHovered ? UITheme.colors.states.hoverText : UITheme.colors.textMain;
        
        const hotkeyColor = isHovered ? UITheme.colors.textMain : UITheme.colors.textMuted;

        // 2. Draw the Gothic Panel
        ui.drawPanel(btn.x, btn.y, btn.w, btn.h, bgColor);

        // 3. Draw pulse/glow brackets if hovered
        if (isHovered) {
            ui.drawSelectionBrackets(btn.x, btn.y, btn.w, btn.h, 6, UITheme.colors.borderHighlight);
        }

        // 4. Draw Icon, Text, and Hotkey (Vertically Stacked & Centered)
        const iconAsset = this.loader.get(`ui_icon_${btn.id}`);
        
        if (iconAsset) {
            const iconSize = 32;
            
            // Draw Icon horizontally centered, pushed closer to the top to make room
            ctx.save();
            ctx.drawImage(iconAsset, btn.x + (btn.w / 2) - (iconSize / 2), btn.y + 10, iconSize, iconSize);
            ctx.restore();

            // Draw Text horizontally centered below the icon
            ui.drawText(
                btn.label, 
                btn.x + (btn.w / 2), 
                btn.y + 58, 
                UITheme.fonts.cardSmall, 
                textColor, 
                "center", 
                "alphabetic"
            );

            // Draw Hotkey Indicator centered at the bottom
            if (btn.hotkey) {
                ui.drawText(
                    `(${btn.hotkey})`, 
                    btn.x + (btn.w / 2), 
                    btn.y + 74, 
                    UITheme.fonts.cardSmall, 
                    hotkeyColor, 
                    "center", 
                    "alphabetic"
                );
            }
        } else {
            // Fallback: If no icon exists, center the Text and Hotkey more evenly
            ui.drawText(
                btn.label, 
                btn.x + (btn.w / 2), 
                btn.y + (btn.h / 2) - 4, 
                UITheme.fonts.cardSmall, 
                textColor, 
                "center", 
                "alphabetic"
            );

            if (btn.hotkey) {
                ui.drawText(
                    `(${btn.hotkey})`, 
                    btn.x + (btn.w / 2), 
                    btn.y + (btn.h / 2) + 16, 
                    UITheme.fonts.cardSmall, 
                    hotkeyColor, 
                    "center", 
                    "alphabetic"
                );
            }
        }
    }
}