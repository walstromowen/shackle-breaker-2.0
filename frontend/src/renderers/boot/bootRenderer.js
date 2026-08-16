export class BootRenderer {
    constructor(canvas) {
        this.canvas = canvas;
    }

    render(ctx, state) {
        // 1. Draw a solid black background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 2. Draw Loading Text (using a standard system font so it always works)
        ctx.fillStyle = '#ffffff';
        ctx.font = '24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Loading Assets...', this.canvas.width / 2, this.canvas.height / 2 - 40);

        // 3. Draw Progress Bar Outline
        const barWidth = 400;
        const barHeight = 30;
        const x = this.canvas.width / 2 - barWidth / 2;
        const y = this.canvas.height / 2;
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, barWidth, barHeight);

        // 4. Draw the Progress Bar Fill based on the loader's state
        ctx.fillStyle = '#00ffff'; // Cyan
        
        // Clamp progress between 0 and 1 just in case
        const safeProgress = Math.max(0, Math.min(1, state.progress));
        const fillWidth = barWidth * safeProgress;
        
        ctx.fillRect(x + 2, y + 2, fillWidth - 4, barHeight - 4);
    }
}