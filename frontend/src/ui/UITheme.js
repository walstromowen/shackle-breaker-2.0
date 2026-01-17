export const UITheme = {
    colors: {
        // Backgrounds
        background: "#111111",       // Main screen background (Deep Charcoal)
        panelBg: "rgba(0, 0, 0, 0.8)", // Semi-transparent overlay for menus over game world
        
        // Borders & Lines
        panelBorder: "#ffffff",      // Wireframe lines
        
        // Text Colors
        textMain: "#ffffff",         // Standard text
        textMuted: "#888888",        // Unselected options or secondary info
        textHighlight: "#000000",    // Text inside a white selection box (must contrast with highlightBg)
        
        // Interaction
        highlightBg: "#ffffff",      // The white box behind selected menu items
        accent: "#4488ff",           // Special highlights (Mana bars, magic effects, etc.)
        danger: "#ff4444"            // Error messages or Health bars
    },
    
    fonts: {
        // Font strings compatible with ctx.font
        header: '24px "Gothic", sans-serif',
        body: '18px "Gothic", sans-serif',
        small: '16px "Gothic", sans-serif',
        bold: 'bold 18px "Gothic", sans-serif'
    },
    
    layout: {
        padding: 20,          // Standard spacing from edges
        lineWidth: 2,         // Thickness of the wireframe borders
        headerHeight: 40,     // Height of top title bars
        lineHeight: 24        // Standard text line spacing
    }
};