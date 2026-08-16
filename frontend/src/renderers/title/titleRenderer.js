import { UITheme } from '../../ui/UITheme.js';
import { CanvasUI } from '../../ui/canvasUI.js';

export class TitleRenderer {
    constructor(canvas, config, loader) {
        this.canvas = canvas;
        this.config = config;
        this.loader = loader;
    }

    render(ctx, state, controller) {
        const ui = new CanvasUI(ctx);
        const width = this.canvas.width;
        const height = this.canvas.height;

        // 1. Draw Fullscreen Background Image
        const bgImage = this.loader.getImage ? this.loader.getImage('title_bg') : this.loader.get('title_bg');

        if (bgImage) {
            ctx.drawImage(bgImage, 0, 0, width, height);
        } else {
            ui.clearScreen(width, height);
        }

        // Dark Vignette & Overlay for UI Readability
        const overlay = ctx.createRadialGradient(width / 2, height / 2, width * 0.25, width / 2, height / 2, width * 0.75);
        overlay.addColorStop(0, 'rgba(0, 0, 0, 0.35)');
        overlay.addColorStop(1, 'rgba(0, 0, 0, 0.75)');
        ctx.fillStyle = overlay;
        ctx.fillRect(0, 0, width, height);

        // 2. Draw Title Text with Drop Shadow
        const titleY = height * 0.22;

        ctx.save();
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetY = 4;

        ui.drawText(
            'Shackle Breaker',
            width / 2,
            titleY,
            UITheme.fonts.title,
            UITheme.colors.textMain,
            'center',
            'middle'
        );
        ctx.restore();

        // Gothic flourish underline beneath title
        const flourishWidth = 500;
        const flourishX = (width / 2) - (flourishWidth / 2);
        ui.drawLineWithGothicFlourish(
            flourishX,
            titleY + 70,
            flourishWidth,
            UITheme.colors.borderHighlight
        );

        // 3. Draw Menu Items & Calculate Hitboxes
        const hitboxes = [];
        const buttonWidth = 400;
        const buttonHeight = 70;
        const startY = height * 0.52;
        const spacing = 95;

        state.menuItems.forEach((item, index) => {
            const x = width / 2 - buttonWidth / 2;
            const y = startY + (index * spacing);

            hitboxes.push({
                id: item.id,
                x: x,
                y: y,
                w: buttonWidth,
                h: buttonHeight,
                zIndex: 10
            });

            const isHovered = state.hoveredId === item.id;

            // Semi-transparent panel backing for clear button text legibility
            ui.drawRect(x, y, buttonWidth, buttonHeight, 'rgba(10, 10, 14, 0.7)', true);

            if (isHovered) {
                ui.drawRect(x, y, buttonWidth, buttonHeight, UITheme.colors.states.hoverBg, true);
                ui.drawSelectionBrackets(
                    x,
                    y,
                    buttonWidth,
                    buttonHeight,
                    15,
                    UITheme.colors.borderHighlight
                );
            } else {
                ui.drawRect(x, y, buttonWidth, buttonHeight, UITheme.colors.border, false);
            }

            const textColor = isHovered ? UITheme.colors.states.hoverText : UITheme.colors.textMain;

            ui.drawText(
                item.text,
                width / 2,
                y + buttonHeight / 2,
                UITheme.fonts.header,
                textColor,
                'center',
                'middle'
            );
        });

        // 4. Update Controller Hitbox Cache
        controller.updateHitboxes(hitboxes);
    }
}