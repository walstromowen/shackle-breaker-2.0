export const UITheme = {
    colors: {
        // --- [NEW] Background Scale (Required for Column Renderers) ---
        // 0: Darkest (Side Columns), 1: Lighter (Center), 2: Highlight (Active Tabs)
        bgScale: ["#0a0a0a", "#141414", "#1f1f1f", "#2a2a2a"], 

        // Backgrounds
        background: "#050505", 
        panelBg: "rgba(20, 20, 20, 0.95)", 
        
        // Borders & Lines
        border: "#4a4a4a",
        borderHighlight: "#ffffff",

        // Text
        textMain: "#e0e0e0",      
        textMuted: "#888888",     
        textHighlight: "#FFD700", 
        
        // Gameplay Indicators
        accent: "#4fc3f7",  
        danger: "#ff5555",  
        success: "#55ff55", 
        magic: "#5555ff",   
        
        // Ability Costs & Scrolling
        insight: "#ffd700",        // Gold color for 'Insight' costs
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