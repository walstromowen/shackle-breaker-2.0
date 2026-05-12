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

    // --- Damage / Element Types ---
    types: {
      blunt: '#B0BEC5',
      slash: '#CFD8DC',
      pierce: '#ECEFF1',
      fire: '#EF5350',
      ice: '#4DD0E1',
      lightning: '#FFEE58',
      water: '#42A5F5',
      earth: '#8D6E63',
      wind: '#81C784',
      light: '#FFF59D',
      dark: '#AB47BC',
      arcane: '#EC407A',
      healing: '#81C784', 
      physical: '#CFD8DC', 
      magical: '#EC407A'
    },
    
    // Ability Costs & Scrolling
    scrollTrack: "rgba(15, 15, 17, 0.5)",
    scrollThumb: "#d4cbb8", // Matched to the white border for visibility
    states: {
      hoverText: "#b89947",         // Tarnished Gold (matches borderHighlight)
      hoverBg: "rgba(184, 153, 71, 0.05)",
      focusText: "#d4cbb8",         // textMain
      focusBg: "rgba(255, 255, 255, 0.02)",
      disabledAlpha: 0.3
    },
  },
  fonts: {
    title: 'normal 101px "Georgia", serif',       // Scaled from 42px
    header: 'bold 58px "Georgia", serif',         // Scaled from 24px
    body: '34px "Georgia", serif',                // Scaled from 14px
    bold: 'bold 34px "Georgia", serif',           // Scaled from 14px
    italic: 'italic 29px "Georgia", serif',       // Scaled from 12px
    small: '29px "Georgia", serif',               // Scaled from 12px
    mono: '34px monospace',                       // Scaled from 14px
    
    // --- Added Micro Fonts for Cards ---
    cardTitle: 'bold 29px "Georgia", serif',      // Scaled from 12px
    cardSmall: '24px "Georgia", serif',           // Scaled from 10px
    cardItalic: 'italic 24px "Georgia", serif',   // Scaled from 10px
    cardMono: '24px monospace'                    // Scaled from 10px
  },
  layout: {
    padding: 48,          // Scaled from 20
    headerHeight: 120,    // Scaled from 50
    cornerRadius: 0       // Flat, sharp corners fit the aesthetic better
  }
};