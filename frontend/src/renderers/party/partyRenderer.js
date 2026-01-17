import { UITheme } from '../../ui/UITheme.js';
import { CanvasUI } from '../../ui/canvasUI.js';

export class PartyRenderer {
    constructor(ctx) {
        this.ui = new CanvasUI(ctx);
    }

    render(state) {
        const { members, ui } = state; 
        
        // 1. Clear Screen
        this.ui.clearScreen(800, 600);

        // 2. Draw Title
        this.ui.drawText(
            "Current Party", 
            50, 
            50, 
            UITheme.fonts.header, 
            UITheme.colors.textMain
        );

        // 3. List Names
        const startY = 100;
        const lineHeight = 40;

        members.forEach((member, index) => {
            const y = startY + (index * lineHeight);
            const isSelected = index === ui.selectedIndex;

            // Simple visual logic: Gold text with a ">" prefix if selected
            const text = isSelected ? `> ${member.name}` : member.name;
            const color = isSelected ? UITheme.colors.textHighlight : UITheme.colors.textMain;
            const font = isSelected ? UITheme.fonts.bold : UITheme.fonts.body;

            this.ui.drawText(text, 50, y, font, color);
        });
    }
}