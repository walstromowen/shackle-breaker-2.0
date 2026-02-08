export const UITheme = {
    colors: {
        // --- Background Scale (Required for Column Renderers) ---
        // 0: Darkest (Side Columns), 1: Lighter (Center), 2: Highlight (Active Tabs)
        bgScale: ["#0a0a0a", "#141414", "#1f1f1f", "#2a2a2a"], 

        // Backgrounds
        background: "#050505", 
        panelBg: "rgba(20, 20, 20, 0.95)", 
        
        // Borders & Lines
        border: "#4a4a4a",
        
        // CHANGED: Specific "Misty White" for selections
        selectedWhite: "#f0f0f0", 
        borderHighlight: "#f0f0f0", // Alias for backward compatibility if needed

        // Text
        textMain: "#e0e0e0",      
        textMuted: "#888888",     
        textHighlight: "#FFC107", // Matches XP Gold
        
        // --- Normalized Stat Colors (Foreground) ---
        hp: "#E02E2E",      // Health: Vibrant Signal Red
        stm: "#2E8B57",     // Stamina: Deep Emerald
        ins: "#F500FF",     // Insight: Neon Magenta
        xp: "#FFC107",      // Experience: Rich Amber Gold

        // --- Dimmed Stat Colors (Background/Empty Bars) ---
        hpDim: "rgba(224, 46, 46, 0.2)",  
        stmDim: "rgba(46, 139, 87, 0.2)", 
        insDim: "rgba(245, 0, 255, 0.2)",  
        xpDim: "rgba(255, 193, 7, 0.2)",  

        // --- Combat Stats (Defaults) ---
        attack: "#ff8c00",      // Dark Orange
        defense: "#3498db",     // Blue
        resistance: "#95a5a6",  // Slate Grey

        // --- Gameplay Indicators ---
        success: "#55ff55",     // Bright Green
        failure: "#ff5555",     // Bright Red
        
        // Ability Costs & Scrolling
        scrollTrack: "rgba(0,0,0,0.3)", 
        scrollThumb: "#666666"
    },

    fonts: {
        header: "bold 24px serif",
        body: "16px sans-serif",
        bold: "bold 16px sans-serif",
        small: "12px sans-serif",
        mono: "14px monospace" 
    },

    layout: {
        padding: 20,
        headerHeight: 50,
        cornerRadius: 4
    }
};