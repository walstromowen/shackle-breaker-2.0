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
    error: "#e57373",       // Soft red for error lines (hotbar notice, empty counts)

    // --- Battle HUD (these were read with fallbacks before; now they are real tokens with the same values) ---
    highlight: "#b89947",                       // the gold line along the action bar, the active-player marker
    highlightGlow: "rgba(184, 153, 71, 0.15)",
    menuBg: "rgba(0, 0, 0, 0.8)",
    panelBorder: "#3a352c",
    targetRed: "#9e1a1a",
    hpGlow: "rgba(140, 28, 28, 0.2)",

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

    // ========================================================================
    // INTERACTION STATES - the ONE look every screen uses (see CanvasUI.drawStateBox)
    //
    //   normal     nothing drawn
    //   highlight  what you are pointing at: the mouse hover OR the keyboard cursor. They are the same look on purpose,
    //              and only one of them is ever active (the controllers feed the renderer a single focus id)
    //   selected   a choice that stays (the active tab, the chosen quest, the equipped slot): a bar on the left edge
    //   pressed    the mouse button is down on a highlighted element
    //   disabled   cannot be used right now
    // ========================================================================
    states: {
      highlightText: "#b89947",                 // Tarnished Gold
      highlightBg: "rgba(184, 153, 71, 0.10)",
      highlightBorder: "rgba(184, 153, 71, 0.45)",

      selectedText: "#d4cbb8",                  // textMain
      selectedBg: "rgba(212, 203, 184, 0.06)",
      selectedBar: "#d4cbb8",

      pressedText: "#8f7a38",
      pressedBg: "rgba(0, 0, 0, 0.35)",

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
  },

  // Floating panels (tooltips, context menus): CanvasUI.drawPopupPanel. bg is the same value as colors.bgScale[1].
  popup: {
    bg: "#0b0b0d",
    shadowColor: "rgba(0, 0, 0, 0.8)",
    shadowBlur: 29,
    shadowOffset: 10
  },

  // The corner brackets drawn on a highlighted element (CanvasUI.drawSelectionBrackets)
  selection: {
    bracketDist: 10,   // px outside the element (dense grids / menus pass an inset instead)
    bracketInset: -6,  // the same, for elements that sit close together: negative = inside the element
    bracketLen: 19,    // length of each arm
    bracketPulse: 0,   // px of slow in/out breathing; 0 = perfectly still. The same for every bracket on every screen.
    pressedDist: 4     // brackets pull in tight while the mouse button is held
  },

  // Scrollbars (CanvasUI.drawScrollbar)
  scrollbar: {
    width: 14,
    minThumb: 36
  }
};

// What the mouse is doing right now, shared by every screen. UIInteractionManager writes it, CanvasUI.flags() reads it.
//   pressedId  the hitbox the mouse button is held down on (null while nothing is held, or once the press turns into a drag)
export const UIPointer = {
  pressedId: null
};
