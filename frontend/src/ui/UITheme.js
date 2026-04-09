export const UITheme = {
    colors: {
        // --- Background Scale (Required for Column Renderers) ---
        bgScale: ["#080809", "#0b0b0d", "#0f0f11", "#141417"], 

        // Backgrounds
        background: "#050505", 
        panelBg: "rgba(15, 15, 17, 0.85)", 
        
        // Borders & Lines
         border: "#3a352c",
        selectedWhite: "#d4cbb8", 
        borderHighlight: "#b89947", // Tarnished Gold

        // Text
        textMain: "#d4cbb8",      // Aged bone white
        textMuted: "#8a8578",     
        textHighlight: "#b89947", // Tarnished Gold
        
        // --- Normalized Stat Colors (Foreground) ---
        hp: "#8c1c1c",      // Health: Dark Crimson
        stm: "#4a5d4e",     // Stamina: Muted Moss Green
        ins: "#4a5b70",     // Insight: Deep Slate Blue
        xp: "#c9b475",      // Experience: Estus Gold

        // --- Dimmed Stat Colors (Background/Empty Bars) ---
        hpDim: "#2b0909",  
        stmDim: "#1f2621", 
        insDim: "#1e242c",  
        xpDim: "#3a352c",  

        // --- Combat Stats (Defaults) ---
        attack: "#9e1a1a",      // Target Red
        defense: "#4a5b70",     // Insight Blue
        resistance: "#8a8578",  // Muted Grey

        // --- Gameplay Indicators ---
        success: "#c9b475",     // Estus Gold
        failure: "#8c1c1c",     // Dark Crimson
        
        // Ability Costs & Scrolling
        scrollTrack: "rgba(15, 15, 17, 0.5)", 
        scrollThumb: "#d4cbb8" // Matched to the white border for visibility
    },

    fonts: {
        title: 'normal 42px "Georgia", serif',
        header: 'bold 24px "Georgia", serif',
        body: '14px "Georgia", serif',
        bold: 'bold 14px "Georgia", serif',
        italic: 'italic 12px "Georgia", serif',
        small: '12px "Georgia", serif',
        mono: '14px monospace',
        // --- Added Micro Fonts for Cards ---
        cardTitle: 'bold 12px "Georgia", serif',
        cardSmall: '10px "Georgia", serif',
        cardItalic: 'italic 10px "Georgia", serif',
        cardMono: '10px monospace'
    },

    layout: {
        padding: 20,
        headerHeight: 50,
        cornerRadius: 0 // Flat, sharp corners fit the aesthetic better
    }
};