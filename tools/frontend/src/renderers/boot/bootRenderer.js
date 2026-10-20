import { UITheme } from '../../ui/UITheme.js';
import { CanvasUI } from '../../ui/canvasUI.js';

export class BootRenderer {
    constructor(canvas) {
        this.canvas = canvas;
    }

    render(ctx, state) {
        // Clamp progress between 0 and 1
        const safeProgress = Math.max(0, Math.min(1, state.progress || 0));
        const percentage = Math.floor(safeProgress * 100);

        const ui = new CanvasUI(ctx);

        // 1. Draw Deep Gothic Background
        ctx.fillStyle = UITheme.colors.background;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 2. Draw Loading Header Text
        ctx.fillStyle = UITheme.text.title.color;
        ctx.font = UITheme.text.title.font;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Thematic flavor text instead of standard "Loading..."
        ctx.fillText('Loading Assets...', this.canvas.width / 2, this.canvas.height / 2 - 80);

        // 3. Draw Percentage Text
        ctx.fillStyle = UITheme.colors.textMuted;
        ctx.font = UITheme.text.body.font;
        ctx.fillText(`Loading assets: ${percentage}%`, this.canvas.width / 2, this.canvas.height / 2 - 20);

        // 4. Bar Dimensions
        const barWidth = 500;
        const barHeight = 40;
        const x = this.canvas.width / 2 - barWidth / 2;
        const y = this.canvas.height / 2 + 20;

        // 5. The bar frame is the same panel every screen uses (dark track, thin gold edge)
        ui.drawPanel(x, y, barWidth, barHeight, UITheme.colors.bgScale[2]);

        // 7. Draw the Progress Bar Fill
        // We leave a 4px inner padding so the fill doesn't touch the border
        const padding = 4;
        const fillWidth = barWidth * safeProgress;
        
        if (fillWidth > padding * 2) {
            ctx.fillStyle = UITheme.colors.states.highlightText; // the shared gold
            ctx.fillRect(
                x + padding, 
                y + padding, 
                fillWidth - (padding * 2), 
                barHeight - (padding * 2)
            );
        }
    }
}

