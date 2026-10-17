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
        const buttonWidth = 400;
        const buttonHeight = 70;
        const startY = height * 0.52;
        const spacing = 95;

        state.menuItems.forEach((item, index) => {
            const x = width / 2 - buttonWidth / 2;
            const y = startY + (index * spacing);

            hitboxes.push({ id: item.id, x: x, y: y, w: buttonWidth, h: buttonHeight, zIndex: 10 });

            // The standard button: hover / keyboard cursor / pressed all come from the shared state look.
            // The semi-transparent backing keeps the label legible over the background image.
            ui.drawButton(x, y, buttonWidth, buttonHeight, item.text,
                ui.flags(item.id, state.hoveredId),
                { bg: 'rgba(10, 10, 14, 0.7)', font: UITheme.fonts.header });
        });

        // 3. Update Controller Hitbox Cache
        controller.updateHitboxes(hitboxes);
    }
}
