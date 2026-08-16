/**
 * frontend/src/renderers/overworld/overworldUIRenderer.js
 */
import { CanvasUI } from '../../ui/canvasUI.js';
import { UITheme } from '../../ui/UITheme.js';

export class OverworldUIRenderer {
    constructor(config, loader) {
        this.config = config;
        this.loader = loader;
    }

    render(ctx, state) {
        const { hoveredHitboxId, isMenuOpen, menuToggleHitbox, dropdownHitboxes } = state || {};
        const ui = new CanvasUI(ctx);

        if (menuToggleHitbox) {
            const isMainHovered = hoveredHitboxId === menuToggleHitbox.id;
            this.drawSquareButton(ctx, ui, menuToggleHitbox, isMainHovered, isMenuOpen);
        }

        if (isMenuOpen && dropdownHitboxes) {
            for (const btn of dropdownHitboxes) {
                const isHovered = hoveredHitboxId === btn.id;
                this.drawSquareButton(ctx, ui, btn, isHovered, false);
            }
        }
    }

    drawSquareButton(ctx, ui, btn, isHovered, isActiveOverride = false) {
        const isActive = isHovered || isActiveOverride;
        
        // --- TRANSPARENT SQUARE BACKGROUNDS ---
        // Alpha lowered dramatically from 0.92 to 0.4 (and 0.6 on hover/active)
        const bgColor = isActive ? "rgba(65, 58, 50, 0.6)" : "rgba(25, 23, 20, 0.4)";
        const textColor = isActive ? UITheme.colors.states.hoverText : UITheme.colors.textMain;
        
        // Slight hover bounce
        const yOffset = isHovered ? -3 : 0;
        const drawY = btn.y + yOffset;

        // Draw the square panel background
        ui.drawPanel(btn.x, drawY, btn.w, btn.h, bgColor);

        // Highlight brackets outside the panel
        if (isActive) {
            ui.drawSelectionBrackets(btn.x - 4, drawY - 4, btn.w + 8, btn.h + 8, 8, UITheme.colors.borderHighlight);
        }

        const centerX = btn.x + (btn.w / 2);
        const uiSheet = this.loader.get('ui_icons'); 

        // Draw the 64x64 icon from the spritesheet
        if (uiSheet && btn.spriteCol !== undefined && btn.spriteRow !== undefined) {
            const iconSize = 64;
            const dstX = centerX - (iconSize / 2);
            // Position the icon slightly near the top to leave room for text
            const dstY = drawY + 8;
            
            const srcX = btn.spriteCol * iconSize;
            const srcY = btn.spriteRow * iconSize;

            ctx.drawImage(
                uiSheet,
                srcX, srcY, iconSize, iconSize, 
                dstX, dstY, iconSize, iconSize  
            );
        }

        // Draw bold centered destination label below the icon
        const textY = drawY + btn.h - 20; 
        
        ui.drawText(
            btn.label, 
            centerX, 
            textY, 
            "bold 16px sans-serif", 
            textColor, 
            "center", 
            "middle"
        );
    }
}