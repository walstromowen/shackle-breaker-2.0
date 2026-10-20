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

        // Note: The dark vignette overlay was removed from here to restore 
        // the original brightness of your background image.

        // 2. Draw Menu Items & Calculate Hitboxes
        const hitboxes = [];
        // Compact stack: the whole menu stays above the "SHACKLE BREAKER" lettering painted into the background
        // (which starts about 83% of the way down), so the buttons never cover the title name.
        const buttonWidth = 300;
        const buttonHeight = 54;
        const startY = height * 0.50;
        const spacing = 66;

        state.menuItems.forEach((item, index) => {
            const x = width / 2 - buttonWidth / 2;
            const y = startY + (index * spacing);

            hitboxes.push({ id: item.id, x: x, y: y, w: buttonWidth, h: buttonHeight, zIndex: 10 });

            // The standard button: hover / keyboard cursor / pressed all come from the shared state look.
            // The semi-transparent backing keeps the label legible over the background image.
            ui.drawRect(x, y, buttonWidth, buttonHeight, 'rgba(6, 7, 10, 0.72)', true);
            ui.drawButton(x, y, buttonWidth, buttonHeight, item.text,
                ui.flags(item.id, state.hoveredId, { disabled: !!item.disabled }));
        });

        // A short status line under the buttons (e.g. "No saved game yet.")
        if (state.message) {
            const lineY = startY + state.menuItems.length * spacing + 4;
            ui.drawStyled('notice', state.message, width / 2, lineY, { kind: 'error', align: 'center', baseline: 'middle' });
        }

        // Who is playing (bottom-left corner)
        if (state.accountLabel) {
            this._drawAccountLabel(ctx, state.accountLabel, 48, height - 48);
        }

        // 3. Update Controller Hitbox Cache
        controller.updateHitboxes(hitboxes);
    }

    // "Signed in as ..." in bright gold on a dark plate, so it stands out against the busy background art.
    _drawAccountLabel(ctx, text, x, y) {
        const font = '600 32px "Barlow", system-ui, sans-serif';
        ctx.save();
        ctx.font = font;
        const padX = 22, plateH = 56;
        const plateW = Math.ceil(ctx.measureText(text).width) + padX * 2;
        const plateY = y - plateH / 2;

        ctx.fillStyle = 'rgba(8, 8, 10, 0.82)';
        ctx.fillRect(x, plateY, plateW, plateH);
        ctx.fillStyle = '#e0b84a';                 // a bright gold accent bar on the left edge
        ctx.fillRect(x, plateY, 5, plateH);
        ctx.strokeStyle = 'rgba(224, 184, 74, 0.55)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, plateY, plateW, plateH);

        ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 2;
        ctx.fillStyle = '#ffd96b';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x + padX + 5, y + 1);
        ctx.restore();
    }
}
