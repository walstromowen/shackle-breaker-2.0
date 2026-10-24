export const UITheme = {
  colors: {
    // --- Background Scale (Required for Column Renderers) ---
    bgScale: ["#07080b", "#0a0c10", "#0e1116", "#13161d"],   // cool iron, darkest to lightest
    
    // Backgrounds
    background: "#040508",
    panelBg: "rgba(10, 12, 16, 0.88)",
    
    // Borders & Lines
    border: "#2a2d34",          // iron hairline
    selectedWhite: "#e2dac8",
    borderHighlight: "#c2a14f", // Brass
    
    // Text
    textMain: "#e2dac8",      // Bone
    textMuted: "#948f86",     // Ash
    textHighlight: "#c9a64f", // Brass
    textOnIcon: "#ffffff",    // small counts / letters drawn on top of an icon or badge

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
    highlight: "#c2a14f",                       // the gold line along the action bar, the active-player marker
    highlightGlow: "rgba(201, 166, 79, 0.15)",
    menuBg: "rgba(0, 0, 0, 0.8)",
    panelBorder: "#2a2d34",
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
    scrollTrack: "rgba(226, 218, 200, 0.05)",
    scrollThumb: "#cfc7b4",

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
      highlightText: "#d4b35c",                 // Brass, a little brighter than resting gold
      highlightBg: "rgba(201, 166, 79, 0.16)",  // the wash fades from this at the left edge ...
      highlightBgEnd: "rgba(201, 166, 79, 0.02)", // ... to this at the right
      highlightBorder: "rgba(201, 166, 79, 0.42)",
      highlightGlow: "rgba(214, 180, 92, 0.55)",   // the soft light the edge of the highlighted element gives off
      highlightGlowBlur: 12,

      selectedText: "#e2dac8",                  // textMain
      selectedBg: "rgba(226, 218, 200, 0.09)",
      selectedBgEnd: "rgba(226, 218, 200, 0.01)",
      selectedBar: "#e2dac8",
      highlightBar: "#c9a64f",                  // the accent bar on the item the cursor is on

      pressedText: "#9a8340",
      pressedBg: "rgba(0, 0, 0, 0.4)",

      disabledAlpha: 0.3
    },
  },
  fonts: {
    // Cormorant Garamond (display) for titles and headings, Barlow (UI) for everything you read, DM Mono for numbers in tables.
    // The files are in assets/fonts and declared in styles.css; main.js waits for them before the first frame.
    title: '600 110px "Cormorant Garamond", Georgia, serif',
    header: '600 64px "Cormorant Garamond", Georgia, serif',
    body: '400 34px "Barlow", system-ui, sans-serif',
    medium: '500 34px "Barlow", system-ui, sans-serif',
    button: '500 28px "Barlow", system-ui, sans-serif',   // buttons (drawn in tracked capitals, like the login screen's)
    bold: '600 34px "Barlow", system-ui, sans-serif',
    italic: 'italic 400 29px "Barlow", system-ui, sans-serif',
    small: '400 29px "Barlow", system-ui, sans-serif',
    mono: '400 32px "DM Mono", ui-monospace, monospace',
    
    bodyItalic: 'italic 400 34px "Barlow", system-ui, sans-serif',
    monoSmall: '400 27px "DM Mono", ui-monospace, monospace',
    display: '400 96px "DM Mono", ui-monospace, monospace',   // the big dice number
    sectionHeading: '700 42px "Cormorant Garamond", Georgia, serif',   // a section inside a panel

    // --- Added Micro Fonts for Cards ---
    cardTitle: '600 29px "Barlow", system-ui, sans-serif',
    cardSmall: '400 24px "Barlow", system-ui, sans-serif',
    cardItalic: 'italic 400 24px "Barlow", system-ui, sans-serif',
    cardMono: '400 22px "DM Mono", ui-monospace, monospace',

    // --- The battle debugger overlay (developer tool; monospace, dense) ---
    debugTitle: 'bold 26px monospace',
    debugHeader: 'bold 29px monospace',
    debugName: 'bold 22px monospace',
    debugRow: '20px monospace',
    debugSmall: '18px monospace'
  },
  layout: {
    padding: 48,          // Scaled from 20
    headerHeight: 120,    // Scaled from 50
    cornerRadius: 0       // Flat, sharp corners fit the aesthetic better
  },

  // Panels (CanvasUI.drawPanel): a hairline brass edge, a soft top-lit fill, and two cut corners (top-left, bottom-right) like riveted plate.
  panel: {
    chamfer: 0,        // 0 = square corners (Dark Souls style); 12 gives the old cut top-left / bottom-right corners
    edgeColor: '#b8ad96',      // the thin worn-bone edge of a plate
    edgeAlpha: 0.34,
    edgeWidth: 1.25,
    sheen: 0.06,       // how much lighter (and cooler) the top of a panel is than its bottom, like the login card
    mottle: 0,        // how strongly the soft blotches show in the plate (0 = none: panels are smooth)
    grain: 0,          // and the film grain (0 = none)
    innerShadow: 0.85,         // the dark fall-off along the inside of the edge: strength ...
    innerShadowBlur: 34,       // ... and reach
    // The doubled corner brackets a large panel wears, like the frame round the item grid: outer arm, inner arm, how far in, and how big a panel must be
    brackets: { on: true, minSize: 220, inset: 7, outerArm: 26, innerArm: 13, gap: 4, alpha: 0.5 }
  },

  // Buttons (CanvasUI.drawButton): the login screen's submit button -- a brass-tinted face, a brass hairline, tracked capitals.
  button: {
    faceTop: 'rgba(201, 166, 79, 0.13)',       faceBottom: 'rgba(201, 166, 79, 0.035)',
    faceTopLit: 'rgba(201, 166, 79, 0.26)',    faceBottomLit: 'rgba(201, 166, 79, 0.09)',
    edge: 'rgba(194, 161, 79, 0.50)',          edgeLit: 'rgba(212, 179, 92, 0.95)',
    tracking: 2.5
  },

  // The Back button every screen without another way out shows (CanvasUI.drawBackButton): one size, one label
  backButton: { w: 300, h: 76, margin: 48, label: 'Back' },

  // The plate behind every floating message (CanvasUI.drawMessageBox): the space between the text and the plate's edge, and its fill
  messageBox: { padX: 30, padY: 14, bg: 'rgba(15, 15, 18, 0.92)', gap: 10 },

  // Floating panels (tooltips, context menus): CanvasUI.drawPopupPanel. bg is the same value as colors.bgScale[1].
  popup: {
    bg: "#0b0b0d",
    shadowColor: "rgba(0, 0, 0, 0.8)",
    shadowBlur: 29,
    shadowOffset: 10
  },

  // The corner brackets drawn on a highlighted element (CanvasUI.drawSelectionBrackets)
  selection: {
    bracketDist: 8,    // px outside the element (dense grids / menus pass an inset instead)
    bracketInset: -6,  // the same, for elements that sit close together: negative = inside the element
    bracketLen: 12,    // length of each arm
    bracketPulse: 0,   // px of slow in/out breathing; 0 = perfectly still. The same for every bracket on every screen.
    pressedDist: 4     // brackets pull in tight while the mouse button is held
  },

  // Scrollbars (CanvasUI.drawScrollbar)
  scrollbar: {
    width: 14,
    minThumb: 36
  }
};

// ============================================================================
// TEXT ROLES - the ONE way each kind of text looks, on every screen (draw with CanvasUI.drawStyled / drawStyledWrapped).
//
//   Big text
//     title        the title of a screen or panel ("Inventory", a quest name, "Skill Check"). Written in normal capitals.
//     columnLabel  the label over a column of a screen ("Identity"), muted.
//     heading      a section inside a panel ("Objectives", "Required Materials"), gold display type.
//     subtitle     one line under a title ("Currency: 100"), gold, lightly tracked.
//   Reading text
//     body         ordinary text, an option, a name
//     label        the name of a value ("Strength"), small and muted
//     value        a number or amount, monospace
//     hint         key help and "Select a quest" (italic, muted, centered)
//     description  flavour or explanatory text, usually several lines (italic, muted)
//     empty        "nothing here" notes. Always drawn as "- text -".
//     notice       a status line: kind 'error' | 'success' | 'info'
//   Tables and cards (the compact tier, one step smaller)
//     tableHeader  a column header of a table ("TYPE ATK DEF RES"), always in capitals
//     cardTitle / cardLabel / cardValue / cardNote   the same four jobs inside a card or tooltip
//     cardHeading  a section heading inside a card ("Granted Abilities")
//     badge        a letter or a number drawn on top of an icon
//
// Buttons are written in Title Case ("New Game"); tabs are drawn in tracked capitals ("STATS") by CanvasUI.drawTab.
// Fonts: titles / headings = Cormorant Garamond, everything you read = Barlow, numbers in tables = DM Mono.
// ============================================================================
const F = UITheme.fonts;
const C = UITheme.colors;
/** Where the Back button goes (bottom-left of the screen unless a screen passes another corner): { x, y, w, h } in canvas pixels. */
UITheme.backButtonBox = (x, y) => ({
  x: x ?? UITheme.backButton.margin,
  y: y ?? (1080 - UITheme.backButton.margin - UITheme.backButton.h),
  w: UITheme.backButton.w,
  h: UITheme.backButton.h
});

UITheme.text = {
  title:       { font: F.header,         color: C.textMain,      align: 'center', shadow: { color: 'rgba(0, 0, 0, 0.9)', blur: 14, dy: 3 } },
  columnLabel: { font: F.sectionHeading, color: C.textMuted,     align: 'center' },
  heading:     { font: F.sectionHeading, color: C.textHighlight, align: 'left', shadow: { color: 'rgba(0, 0, 0, 0.85)', blur: 10, dy: 2 } },
  subtitle:    { font: '500 26px "Barlow", system-ui, sans-serif', color: C.textHighlight, align: 'center', tracking: 1.5 },

  body:        { font: F.body,       color: C.textMain,      align: 'left' },
  label:       { font: F.small,      color: C.textMuted,     align: 'left' },
  value:       { font: F.mono,       color: C.textMain,      align: 'left' },
  hint:        { font: F.italic,     color: C.textMuted,     align: 'center' },
  description: { font: F.italic,     color: C.textMuted,     align: 'left' },
  empty:       { font: F.italic,     color: C.textMuted,     align: 'center', dashes: true },
  notice:      { font: F.body,       color: C.textMain,      align: 'left', kinds: { error: C.error, success: C.success, info: C.textHighlight } },

  tableHeader: { font: F.cardTitle,  color: C.textMuted,     align: 'left', upper: true, tracking: 2 },
  cardTitle:   { font: F.cardTitle,  color: C.textMain,      align: 'left' },
  cardLabel:   { font: F.cardSmall,  color: C.textMuted,     align: 'left' },
  cardValue:   { font: F.cardMono,   color: C.textMain,      align: 'left' },
  cardNote:    { font: F.cardItalic, color: C.textMuted,     align: 'left' },
  cardHeading: { font: F.cardTitle,  color: C.textHighlight, align: 'left' },
  badge:       { font: F.cardSmall,  color: C.textMain,      align: 'center', baseline: 'middle' }
};

/** A font in the theme's family at any size: UITheme.font(40, { bold: true }). For sizes that change while playing (damage numbers). */
UITheme.font = (px, { bold = false, italic = false, mono = false, display = false } = {}) => {
  const family = mono ? '"DM Mono", ui-monospace, monospace' : display ? '"Cormorant Garamond", Georgia, serif' : '"Barlow", system-ui, sans-serif';
  return `${italic ? 'italic ' : ''}${bold ? (display ? '700 ' : '600 ') : '400 '}${Math.round(px)}px ${family}`;
};

// What the mouse is doing right now, shared by every screen. UIInteractionManager writes it, CanvasUI.flags() reads it.
//   pressedId  the hitbox the mouse button is held down on (null while nothing is held, or once the press turns into a drag)
export const UIPointer = {
  pressedId: null
};
