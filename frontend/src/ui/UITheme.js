export const UITheme = {
    colors: {
        // Backgrounds
        background: "#050505", // The deep void black
        panelBg: "rgba(20, 20, 20, 0.95)", // Slightly transparent panels
        
        // Borders & Lines
        border: "#4a4a4a",
        borderHighlight: "#ffffff",

        // Text
        textMain: "#e0e0e0",      // Primary reading color
        textMuted: "#888888",     // Descriptions, empty slots
        textHighlight: "#FFD700", // Gold for selection
        
        // Gameplay Indicators
        accent: "#4fc3f7",  // Origin/Class text
        danger: "#ff5555",  // HP Low / Attacks
        success: "#55ff55", // Stamina / Healing
        magic: "#5555ff",   // Mana
    },

    fonts: {
        header: "bold 24px serif",
        body: "16px sans-serif",
        bold: "bold 16px sans-serif",
        small: "12px sans-serif",
        mono: "14px monospace" // Good for stats
    },

    layout: {
        padding: 20,
        headerHeight: 50,
        cornerRadius: 4
    }
};