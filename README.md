## [ShackleBreaker Legacy](https://shackle-breaker-frontend.onrender.com/)
Roguelike turnbased adventure game based on the Shackle Breaker story by Owen Walstrom

# PLANNED FEATURES
hand crafted areas
autenticaiton (last)
minimap
waypoints
revamped world generation
sprinting
party rendering on overworld

# REFINEMENTS
enhance battle animations / polish
particleRenderer revamped(global)
structures: 
more consistent sound for UI
Overall UI polish
better text style
targeting ui improvements for splash attacks with mouse
global texture/resolution upgrade
map tile connections / new tile connection system gamemaker
dynamic lighting system


# Bugs
shop system and character summary stacking equipables
Rain flash
rain sound effect too slow
flashing of sprites in battle renderer


Root
├── backend/
├── frontend/                  
│   ├── src/
│   │   ├── assets/
│   │   │   ├── sprites/
│   │   │   └── tilesets/
│   │   ├── controllers/       
│   │   │   ├── characterSummary/
│   │   │   │   ├── characterSummaryController.js 
│   │   │   │   └── characterSummaryLogic.js    
│   │   │   ├── encounter/
│   │   │   ├── core/
│   │   │   │   └── baseController.js  
│   │   │   ├── encounter/
│   │   │   │   ├── encounterController.js
│   │   │   │   └── encounterLogic.js
│   │   │   ├── battle/
│   │   │   │   ├── battleController.js
│   │   │   │   └── battleLogic.js
│   │   │   ├── characterCreator/
│   │   │   │   ├── characterCreatorController.js
│   │   │   │   └── characterCreatorLogic.js
│   │   │   ├── party/
│   │   │   │   ├── partyController.js
│   │   │   │   └── partyLogic.js
│   │   │   ├── levelUp/
│   │   │   │   ├── levelUpController.js
│   │   │   │   └── levelUpLogic.js
│   │   │   └── overworld/
│   │   │       ├── overworldController.js
│   │   │       └── overworldLogic.js
│   │   ├── core/
│   │   │   ├── assetLoader.js
│   │   │   ├── audioManager.js
│   │   │   ├── eventBus.js
│   │   │   ├── gameLoop.js
│   │   │   ├── input.js
│   │   │   ├── sceneManager.js
│   │   │   └── UIInteractionManager.js
│   │   ├── renderers/
│   │   │   ├── battle/
│   │   │   │   ├── battleRenderer.js
│   │   │   │   ├── battleCombatantRenderer.js
│   │   │   │   ├── battleHUDRenderer.js
│   │   │   │   └── battleVFXRenderer.js
│   │   │   ├── encounter/
│   │   │   │   └── encounterRenderer.js
│   │   │   ├── transitions/
│   │   │   │   └── transitionRenderer.js
│   │   │   ├── overworld/
│   │   │   │   ├── lightningRenderer.js
│   │   │   │   ├── mapRenderer.js
│   │   │   │   └── weatherRenderer.js
│   │   │   ├── characterCreator/        
│   │   │   │   └── characterCreatorRenderer.js
│   │   │   ├── characterSummary/
│   │   │   │   ├── characterSummaryRenderer.js
│   │   │   │   └── components/
│   │   │   │       ├── abilitiesPanel.js   
│   │   │   │       ├── statsPanel.js                
│   │   │   │       ├── itemDetailPanel.js          
│   │   │   │       ├── equipmentPanel.js            
│   │   │   │       ├── inventoryPanel.js            
│   │   │   │       └── tooltipSystem.js 
│   │   │   ├── levelUp/  
│   │   │   │   └── levelUpRenderer.js   
│   │   │   └── ui/ 
│   │   │       ├── contextMenuManager.js
│   │   │       ├── dragAndDropManager.js
│   │   │       ├── scrollManager.js
│   │   │       ├── UITheme.js
│   │   │       └── canvasUI.js      
│   │   ├── index.html
│   │   ├── main.js
│   │   └── styles.css
│   └── package.json      
├── shared/ 
│   ├── data/  
│   │   ├── battleAnimationDefinitions.js                     
│   │   ├── traitDefinitions.js 
│   │   ├── abilityDefinitions.js   
│   │   ├── statusEffectDefinitions.js 
│   │   ├── constants.js
│   │   ├── entityDefinitions.js    
│   │   ├── itemDefinitions.js      
│   │   ├── mapObjectDefinitions.js
│   │   └── weatherDefinitions.js
│   ├── models/ 
│   │   ├── abilityModel.js   
│   │   ├── combatantModel.js   
│   │   ├── battleAnimationModel.js                  
│   │   ├── entityModel.js 
│   │   ├── statusEffectModel.js 
│   │   ├── mapObjectModel.js    
│   │   ├── weatherModel.js             
│   │   └── itemModel.js                 
│   ├── state/
│   │   └── gameState.js            
│   ├── systems/
│   │   ├── factories/  
│   │   │   ├── abilityFactory.js   
│   │   │   ├── battleAnimationFactory.js             
│   │   │   ├── entityFactory.js 
│   │   │   ├── statusEffectFactory.js 
│   │   │   ├── mapObjectFactory.js 
│   │   │   ├── weatherFactory.js      
│   │   │   └── itemFactory.js
│   │   ├── abilitySystem.js
│   │   ├── turnManager.js
│   │   ├── battleRewardSystem.js
│   │   ├── targetingResolver.js
│   │   ├── itemUpgradeSystem.js  
│   │   ├── combatCalculator.js  
│   │   ├── experienceSystem.js  
│   │   ├── statCalculator.js    
│   │   ├── partyManager.js         
│   │   ├── timeSystem.js
│   │   └── worldManager.js
│   ├── utils/
│   │   ├── textEntry.js
│   │   └── formatting.js
├── .gitignore 
├── LICENSE 
├── package-lock.json 
├── package.json
└── README.md


//Tile set generator:

I need a Python script using the `Pillow` (PIL) library to programmatically generate a 2D top-down tileset for a game. The tileset should be a dark fantasy "Dark Souls" inspired plains biome. 

The final image must be exactly 272x272 pixels, containing an 8x8 grid of tiles. Each tile is 32x32 pixels, with a 1-pixel buffer/margin around each tile. The exact pixel coordinate formula for the top-left of a tile is `x = col * 34 + 1` and `y = row * 34 + 1`. Any grid coordinates not mapped in the JSON below must remain fully transparent.

**Tile Breakdown & JSON Mappings:**

**1. Plains Autotiling (Rows 0-5):**
Use this JSON to map the 47-tile blob format. 
[
  { "bitmask": 0, "row": 5, "col": 2 }, { "bitmask": 1, "row": 4, "col": 0 }, { "bitmask": 4, "row": 5, "col": 3 }, { "bitmask": 5, "row": 1, "col": 3 }, 
  { "bitmask": 7, "row": 2, "col": 5 }, { "bitmask": 16, "row": 3, "col": 0 }, { "bitmask": 17, "row": 5, "col": 0 }, { "bitmask": 20, "row": 0, "col": 3 }, 
  { "bitmask": 21, "row": 0, "col": 1 }, { "bitmask": 23, "row": 3, "col": 1 }, { "bitmask": 28, "row": 0, "col": 5 }, { "bitmask": 29, "row": 4, "col": 1 }, 
  { "bitmask": 31, "row": 1, "col": 5 }, { "bitmask": 64, "row": 5, "col": 4 }, { "bitmask": 65, "row": 1, "col": 4 }, { "bitmask": 68, "row": 5, "col": 1 }, 
  { "bitmask": 69, "row": 2, "col": 0 }, { "bitmask": 71, "row": 2, "col": 2 }, { "bitmask": 80, "row": 0, "col": 4 }, { "bitmask": 81, "row": 0, "col": 2 }, 
  { "bitmask": 84, "row": 1, "col": 0 }, { "bitmask": 85, "row": 4, "col": 6 }, { "bitmask": 87, "row": 3, "col": 3 }, { "bitmask": 92, "row": 1, "col": 2 }, 
  { "bitmask": 93, "row": 2, "col": 3 }, { "bitmask": 95, "row": 4, "col": 7 }, { "bitmask": 112, "row": 0, "col": 7 }, { "bitmask": 113, "row": 4, "col": 2 }, 
  { "bitmask": 116, "row": 1, "col": 1 }, { "bitmask": 117, "row": 2, "col": 4 }, { "bitmask": 119, "row": 4, "col": 4 }, { "bitmask": 121, "row": 5, "col": 6 }, 
  { "bitmask": 124, "row": 0, "col": 6 }, { "bitmask": 125, "row": 5, "col": 6 }, { "bitmask": 127, "row": 5, "col": 7 }, { "bitmask": 193, "row": 2, "col": 7 }, 
  { "bitmask": 197, "row": 2, "col": 1 }, { "bitmask": 199, "row": 2, "col": 6 }, { "bitmask": 209, "row": 3, "col": 2 }, { "bitmask": 213, "row": 3, "col": 4 }, 
  { "bitmask": 215, "row": 3, "col": 6 }, { "bitmask": 221, "row": 4, "col": 3 }, { "bitmask": 223, "row": 3, "col": 7 }, { "bitmask": 241, "row": 1, "col": 7 }, 
  { "bitmask": 245, "row": 4, "col": 5 }, { "bitmask": 247, "row": 3, "col": 5 }, { "bitmask": 251, "row": 1, "col": 7 }, { "bitmask": 253, "row": 5, "col": 5 }, 
  { "bitmask": 254, "row": 3, "col": 7 }, { "bitmask": 255, "row": 1, "col": 6 }
]

**2. Cliff Face Autotiling (Rows 6-7):**
Use this JSON to map the 1D horizontal cliff connections.
[
  { "type": "cliff_top", "connects": "right", "row": 6, "col": 0 }, { "type": "cliff_top", "connects": "both", "row": 6, "col": 1 }, 
  { "type": "cliff_top", "connects": "left", "row": 6, "col": 2 }, { "type": "cliff_top", "connects": "none", "row": 6, "col": 3 }, 
  { "type": "cliff_base", "connects": "right", "row": 7, "col": 0 }, { "type": "cliff_base", "connects": "both", "row": 7, "col": 1 }, 
  { "type": "cliff_base", "connects": "left", "row": 7, "col": 2 }, { "type": "cliff_base", "connects": "none", "row": 7, "col": 3 }, 
  { "type": "cliff_short", "connects": "right", "row": 7, "col": 5 }, { "type": "cliff_short", "connects": "both", "row": 7, "col": 6 }, 
  { "type": "cliff_short", "connects": "left", "row": 7, "col": 7 }
]

**Rendering Instructions:**
*   **Generative Textures:** Do not use external image files. Programmatically generate a "dark grass" texture (dark greens/greys/browns with noise), a "dirt drop-off edge" texture (darker browns/blacks), and a "vertical cliff face" texture (dark rock with vertical striations).
*   **Base Terrain (Rows 0-5):** Parse the bitmask (Top=1, Top-Right=2, Right=4, Bottom-Right=8, Bottom=16, Bottom-Left=32, Left=64, Top-Left=128). Draw the base dark grass. If a side is MISSING from the bitmask, draw the darker dirt drop-off edge on that side. If present, render the grass seamlessly to the edge.
*   **Cliff Tops (`cliff_top`):** Draw the vertical cliff texture with a grass overhang on the top edge. If `connects` is missing "left" or "right" (e.g., "right" means left is missing), draw a hard vertical dirt edge border on the non-connecting side.
*   **Cliff Bases (`cliff_base`):** Draw a pure vertical cliff texture extending downwards with a shadow/fade at the bottom edge. Apply the same left/right non-connecting border rules.
*   **Short Cliffs (`cliff_short`):** Draw a 1-tile high cliff featuring BOTH the top grass overhang and the bottom shadow in the same 32x32 tile. Apply left/right borders based on `connects`.
*   Save the final output as `dark_plains_tileset.png`.





"""
Generate a dark, hand-crafted-style dystopian pixel-art tileset (Stardew Valley
composition, Dark Souls mood) entirely procedurally with Pillow.

Output: dark_handcrafted_plains_tileset.png  (272x272, 8x8 grid of 32x32 tiles,
1px buffer/margin around every tile).
"""

import math
import random
from PIL import Image, ImageDraw

# ----------------------------------------------------------------------------
# Grid / geometry constants
# ----------------------------------------------------------------------------
TILE = 32
STEP = 34            # 32px tile + 1px margin on each side
IMG_SIZE = 272
GRID = 8


def cell_origin(row, col):
    return col * STEP + 1, row * STEP + 1


# ----------------------------------------------------------------------------
# Palette - bleak, cold, desaturated. Kept small & flat (no noisy dithering)
# so it reads as deliberately hand-drawn.
# ----------------------------------------------------------------------------
GRASS_SHADOW = (34, 46, 32, 255)
GRASS_DARK = (46, 60, 40, 255)
GRASS_MID = (58, 74, 48, 255)
GRASS_LIGHT = (74, 90, 58, 255)

STONE_BLACK = (18, 19, 22, 255)
STONE_SHADOW = (34, 36, 41, 255)
STONE_MID = (56, 59, 66, 255)
STONE_LIGHT = (82, 86, 94, 255)
STONE_HILITE = (112, 116, 124, 255)

FADE_BLACK = (8, 8, 10, 255)

# Bitmask bit values (Top=1, TopRight=2, Right=4, BottomRight=8,
# Bottom=16, BottomLeft=32, Left=64, TopLeft=128)
BIT_TOP, BIT_TOPRIGHT, BIT_RIGHT, BIT_BOTTOMRIGHT = 1, 2, 4, 8
BIT_BOTTOM, BIT_BOTTOMLEFT, BIT_LEFT, BIT_TOPLEFT = 16, 32, 64, 128

EDGE_DEPTH = 9   # how deep the stone drop-off eats into a tile


# ----------------------------------------------------------------------------
# Small drawing helpers
# ----------------------------------------------------------------------------
def rounded_cobble(draw, cx, cy, r, rng):
    """A single hand-drawn, rounded cobblestone with simple pixel-art shading."""
    base = rng.choice([STONE_MID, STONE_SHADOW])
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=base, outline=STONE_BLACK)
    # cold highlight, upper-left, gives the stones a stylized 3D pop
    hr = max(1, r - 2)
    draw.ellipse([cx - hr, cy - hr, cx - hr + r, cy - hr + r],
                 fill=STONE_LIGHT)
    draw.point([(cx - hr // 2, cy - hr)], fill=STONE_HILITE)
    # cold shadow, lower-right
    draw.ellipse([cx, cy, cx + hr, cy + hr], fill=STONE_SHADOW)


def cobble_layer(wx, wy, salt=0):
    """A full opaque 32x32 seamless cobblestone texture tile.

    The cobble grid is generated in WORLD space (keyed on wx,wy, the
    world-space position of this tile's local origin) then translated back
    to local (0..32) coordinates for drawing. Two tiles that sit next to
    each other in the sheet compute the exact same world-space grid points
    along their shared edge, so the stone interlocks seamlessly.
    """
    img = Image.new("RGBA", (TILE, TILE), STONE_MID)
    draw = ImageDraw.Draw(img)
    spacing = 8
    pad = 6

    row_i = int(math.floor((wy - pad) / spacing)) - 1
    y = row_i * spacing
    while y < wy + TILE + pad:
        offset = (spacing // 2) if (row_i % 2) else 0
        col_i = int(math.floor((wx - pad - offset) / spacing)) - 1
        x = col_i * spacing + offset
        while x < wx + TILE + pad:
            local_rng = random.Random((x * 7919) ^ (y * 104729) ^ salt)
            r = 4 + local_rng.randint(-1, 1)
            rounded_cobble(draw, x - wx, y - wy, r, local_rng)
            x += spacing
        y += spacing
        row_i += 1
    return img


def edge_mask(top=False, right=False, bottom=False, left=False,
              tl=False, tr=False, bl=False, br=False, depth=EDGE_DEPTH, corner_r=5):
    """Build an L-mode mask marking which parts of a tile should show stone
    (white) vs. the layer underneath (black)."""
    mask = Image.new("L", (TILE, TILE), 0)
    d = ImageDraw.Draw(mask)
    if top:
        d.rectangle([0, 0, TILE, depth], fill=255)
    if bottom:
        d.rectangle([0, TILE - depth, TILE, TILE], fill=255)
    if left:
        d.rectangle([0, 0, depth, TILE], fill=255)
    if right:
        d.rectangle([TILE - depth, 0, TILE, TILE], fill=255)
    r = corner_r
    if tl:
        d.ellipse([-r, -r, r, r], fill=255)
    if tr:
        d.ellipse([TILE - r, -r, TILE + r, r], fill=255)
    if bl:
        d.ellipse([-r, TILE - r, r, TILE + r], fill=255)
    if br:
        d.ellipse([TILE - r, TILE - r, TILE + r, TILE + r], fill=255)
    return mask


def grass_fill(draw, x0, y0, x1, y1, seed):
    """Flat, clean, deliberately hand-painted grass fill with a couple of
    subtle darker dabs -- NOT noisy/dithered."""
    draw.rectangle([x0, y0, x1 - 1, y1 - 1], fill=GRASS_MID)
    rng = random.Random(seed)
    for _ in range(5):
        w = rng.randint(3, 6)
        h = rng.randint(2, 4)
        px = rng.randint(x0, max(x0, x1 - w))
        py = rng.randint(y0, max(y0, y1 - h))
        shade = rng.choice([GRASS_DARK, GRASS_LIGHT])
        draw.rectangle([px, py, px + w, py + h], fill=shade)
    # a single crisp shadow line along the very bottom for grounding
    draw.line([(x0, y1 - 1), (x1 - 1, y1 - 1)], fill=GRASS_SHADOW)


# ----------------------------------------------------------------------------
# Base terrain (rows 0-5) -- 47-tile blob autotile
# ----------------------------------------------------------------------------
def draw_base_terrain(bitmask, world_x, world_y):
    img = Image.new("RGBA", (TILE, TILE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    top = bool(bitmask & BIT_TOP)
    right = bool(bitmask & BIT_RIGHT)
    bottom = bool(bitmask & BIT_BOTTOM)
    left = bool(bitmask & BIT_LEFT)
    tl = bool(bitmask & BIT_TOPLEFT)
    tr = bool(bitmask & BIT_TOPRIGHT)
    bl = bool(bitmask & BIT_BOTTOMLEFT)
    br = bool(bitmask & BIT_BOTTOMRIGHT)

    seed = (world_x * 92821) ^ (world_y * 68917) ^ bitmask

    # 1. full grass base everywhere
    grass_fill(draw, 0, 0, TILE, TILE, seed)

    # 2. stone drop-off wherever a cardinal side is *missing*, plus concave
    # corner notches where both adjacent edges are grass but the diagonal
    # neighbor bit is missing. Composited via a mask so the stone never
    # bleeds past its intended boundary.
    mask = edge_mask(
        top=not top, bottom=not bottom, left=not left, right=not right,
        tl=(top and left and not tl), tr=(top and right and not tr),
        bl=(bottom and left and not bl), br=(bottom and right and not br),
    )
    stone = cobble_layer(world_x, world_y, salt=1)
    img.paste(stone, (0, 0), mask)

    return img


# ----------------------------------------------------------------------------
# Cliff faces (rows 6-7) -- 1D horizontal connections
# ----------------------------------------------------------------------------
BORDER_W = 4


def side_border(draw, side):
    if side == "left":
        draw.rectangle([0, 0, BORDER_W - 1, TILE - 1], fill=STONE_BLACK)
        draw.line([(BORDER_W, 0), (BORDER_W, TILE - 1)], fill=STONE_HILITE)
    elif side == "right":
        draw.rectangle([TILE - BORDER_W, 0, TILE - 1, TILE - 1], fill=STONE_BLACK)
        draw.line([(TILE - BORDER_W - 1, 0), (TILE - BORDER_W - 1, TILE - 1)], fill=STONE_HILITE)


def apply_connect_borders(draw, connects):
    # connects tells us which sides are OPEN (seamless). Anything not listed
    # gets a hard rounded-stone border.
    if connects == "both":
        open_sides = {"left", "right"}
    elif connects == "left":
        open_sides = {"left"}
    elif connects == "right":
        open_sides = {"right"}
    else:  # "none"
        open_sides = set()

    if "left" not in open_sides:
        side_border(draw, "left")
    if "right" not in open_sides:
        side_border(draw, "right")


def draw_cliff_top(connects, world_x, world_y):
    img = cobble_layer(world_x, world_y, salt=1000)
    draw = ImageDraw.Draw(img)
    overhang = 8
    # solid, flat, hand-drawn grass overhang along the top edge (flat so it
    # stays seamless between connected neighbors), painted over the stone
    draw.rectangle([0, 0, TILE, overhang - 1], fill=GRASS_DARK)
    draw.line([(0, overhang - 1), (TILE, overhang - 1)], fill=GRASS_SHADOW)
    apply_connect_borders(draw, connects)
    return img


def fade_to_black(img, fade_h, max_alpha):
    """Alpha-blend (not just overwrite) a black gradient onto the bottom of
    an opaque tile so it reads as a true shading fade rather than punching
    a hole of transparency."""
    overlay = Image.new("RGBA", (TILE, TILE), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for i in range(fade_h):
        t = i / fade_h
        alpha = int(t * max_alpha)
        od.line([(0, TILE - fade_h + i), (TILE, TILE - fade_h + i)],
                fill=(FADE_BLACK[0], FADE_BLACK[1], FADE_BLACK[2], alpha))
    return Image.alpha_composite(img, overlay)


def draw_cliff_base(connects, world_x, world_y):
    img = cobble_layer(world_x, world_y, salt=2000)
    img = fade_to_black(img, fade_h=14, max_alpha=235)
    draw = ImageDraw.Draw(img)
    apply_connect_borders(draw, connects)
    return img


def draw_cliff_short(connects, world_x, world_y):
    img = cobble_layer(world_x, world_y, salt=3000)
    img = fade_to_black(img, fade_h=8, max_alpha=220)
    draw = ImageDraw.Draw(img)
    overhang = 6
    draw.rectangle([0, 0, TILE, overhang - 1], fill=GRASS_DARK)
    draw.line([(0, overhang - 1), (TILE, overhang - 1)], fill=GRASS_SHADOW)
    apply_connect_borders(draw, connects)
    return img


# ----------------------------------------------------------------------------
# Data: exact JSON mappings supplied in the spec
# ----------------------------------------------------------------------------
PLAINS = [
    {"bitmask": 0, "row": 5, "col": 2}, {"bitmask": 1, "row": 4, "col": 0},
    {"bitmask": 4, "row": 5, "col": 3}, {"bitmask": 5, "row": 1, "col": 3},
    {"bitmask": 7, "row": 2, "col": 5}, {"bitmask": 16, "row": 3, "col": 0},
    {"bitmask": 17, "row": 5, "col": 0}, {"bitmask": 20, "row": 0, "col": 3},
    {"bitmask": 21, "row": 0, "col": 1}, {"bitmask": 23, "row": 3, "col": 1},
    {"bitmask": 28, "row": 0, "col": 5}, {"bitmask": 29, "row": 4, "col": 1},
    {"bitmask": 31, "row": 1, "col": 5}, {"bitmask": 64, "row": 5, "col": 4},
    {"bitmask": 65, "row": 1, "col": 4}, {"bitmask": 68, "row": 5, "col": 1},
    {"bitmask": 69, "row": 2, "col": 0}, {"bitmask": 71, "row": 2, "col": 2},
    {"bitmask": 80, "row": 0, "col": 4}, {"bitmask": 81, "row": 0, "col": 2},
    {"bitmask": 84, "row": 1, "col": 0}, {"bitmask": 85, "row": 4, "col": 6},
    {"bitmask": 87, "row": 3, "col": 3}, {"bitmask": 92, "row": 1, "col": 2},
    {"bitmask": 93, "row": 2, "col": 3}, {"bitmask": 95, "row": 4, "col": 7},
    {"bitmask": 112, "row": 0, "col": 7}, {"bitmask": 113, "row": 4, "col": 2},
    {"bitmask": 116, "row": 1, "col": 1}, {"bitmask": 117, "row": 2, "col": 4},
    {"bitmask": 119, "row": 4, "col": 4}, {"bitmask": 121, "row": 5, "col": 6},
    {"bitmask": 124, "row": 0, "col": 6}, {"bitmask": 125, "row": 5, "col": 6},
    {"bitmask": 127, "row": 5, "col": 7}, {"bitmask": 193, "row": 2, "col": 7},
    {"bitmask": 197, "row": 2, "col": 1}, {"bitmask": 199, "row": 2, "col": 6},
    {"bitmask": 209, "row": 3, "col": 2}, {"bitmask": 213, "row": 3, "col": 4},
    {"bitmask": 215, "row": 3, "col": 6}, {"bitmask": 221, "row": 4, "col": 3},
    {"bitmask": 223, "row": 3, "col": 7}, {"bitmask": 241, "row": 1, "col": 7},
    {"bitmask": 245, "row": 4, "col": 5}, {"bitmask": 247, "row": 3, "col": 5},
    {"bitmask": 251, "row": 1, "col": 7}, {"bitmask": 253, "row": 5, "col": 5},
    {"bitmask": 254, "row": 3, "col": 7}, {"bitmask": 255, "row": 1, "col": 6},
]

CLIFFS = [
    {"type": "cliff_top", "connects": "right", "row": 6, "col": 0},
    {"type": "cliff_top", "connects": "both", "row": 6, "col": 1},
    {"type": "cliff_top", "connects": "left", "row": 6, "col": 2},
    {"type": "cliff_top", "connects": "none", "row": 6, "col": 3},
    {"type": "cliff_base", "connects": "right", "row": 7, "col": 0},
    {"type": "cliff_base", "connects": "both", "row": 7, "col": 1},
    {"type": "cliff_base", "connects": "left", "row": 7, "col": 2},
    {"type": "cliff_base", "connects": "none", "row": 7, "col": 3},
    {"type": "cliff_short", "connects": "right", "row": 7, "col": 5},
    {"type": "cliff_short", "connects": "both", "row": 7, "col": 6},
    {"type": "cliff_short", "connects": "left", "row": 7, "col": 7},
]


def build_tileset():
    sheet = Image.new("RGBA", (IMG_SIZE, IMG_SIZE), (0, 0, 0, 0))

    for entry in PLAINS:
        ox, oy = cell_origin(entry["row"], entry["col"])
        tile = draw_base_terrain(entry["bitmask"], ox, oy)
        sheet.alpha_composite(tile, (ox, oy))

    for entry in CLIFFS:
        ox, oy = cell_origin(entry["row"], entry["col"])
        if entry["type"] == "cliff_top":
            tile = draw_cliff_top(entry["connects"], ox, oy)
        elif entry["type"] == "cliff_base":
            tile = draw_cliff_base(entry["connects"], ox, oy)
        else:
            tile = draw_cliff_short(entry["connects"], ox, oy)
        sheet.alpha_composite(tile, (ox, oy))

    return sheet


if __name__ == "__main__":
    sheet = build_tileset()
    assert sheet.size == (IMG_SIZE, IMG_SIZE)
    out_path = "dark_handcrafted_plains_tileset.png"
    sheet.save(out_path)
    print(f"Saved {out_path} ({sheet.size[0]}x{sheet.size[1]})")















selection - brackets
focused - lightup

selected but not focused brackets no lightup


"We are using an Input Handling Pipeline for a game engine. The architecture follows a strict flow: Input.js (raw events) → SceneManager.js (mediator/router) → UIInteractionManager.js (semantic translator) → BaseController.js (logic consumer).

Core Architectural Rules:

The Bracket Rule: Interaction logic (like drag vs. click math) must be encapsulated within the UIInteractionManager to prevent 'input bleed.' If the UI captures an interaction, it returns a handled flag, and the SceneManager must discard that input for the rest of the game world.

The Interaction Standard: Left-click is for Selecting/Advancing; Right-click is the Universal Back/Cancel button. This is routed through the UIInteractionManager and consumed globally.

Semantic Translation: Raw mouse coordinates and button states are translated into high-level events (onDragStart, onDragMove, onDrop, onHover) before reaching the controllers.

Polymorphic Routing: The SceneManager routes these events to the activeController based on the current scene state."

provide 4 main interaction files: 


//COPY AND PASTE

"We are using an Input Handling Pipeline for a game engine. The architecture follows a strict flow: Input.js (raw events) → SceneManager.js (mediator/router) → UIInteractionManager.js (semantic translator) → BaseController.js (logic consumer). Core Architectural Rules: Interaction logic (like drag vs. click math) must be encapsulated within the UIInteractionManager to prevent 'input bleed.' If the UI captures an interaction, it returns a handled flag, and the SceneManager must discard that input for the rest of the game world. The Interaction Standard: Left-click is for Selecting/Advancing; Right-click is the Universal Back/Cancel button. This is routed through the UIInteractionManager and consumed globally. Semantic Translation: Raw mouse coordinates and button states are translated into high-level events (onDragStart, onDragMove, onDrop, onHover) before reaching the controllers. Polymorphic Routing: The SceneManager routes these events to the activeController based on the current scene state." I will now provide 4 main interaction files save this as the main goal of this session being to use these to standadrize input: /** * core/Input.js */ export class Input { /** * @param {HTMLCanvasElement} canvas */ constructor(canvas) { this.canvas = canvas; this.heldKeys = new Set(); this.lastClick = null; this.lastRightClick = null; this.isMouseDown = false; this.scrollDelta = 0; this.mousePosition = { x: 0, y: 0 }; this._onKeyDown = this._onKeyDown.bind(this); this._onKeyUp = this._onKeyUp.bind(this); this._onMouseDown = this._onMouseDown.bind(this); this._onMouseUp = this._onMouseUp.bind(this); this._onMouseMove = this._onMouseMove.bind(this); this._onWheel = this._onWheel.bind(this); this._onContextMenu = this._onContextMenu.bind(this); // --- ATTACH LISTENERS --- window.addEventListener("keydown", this._onKeyDown); window.addEventListener("keyup", this._onKeyUp); // Listen for mouseup on WINDOW so dragging doesn't get stuck // if the user releases the mouse outside the canvas. window.addEventListener("mouseup", this._onMouseUp); // Prevent default browser context menu window.addEventListener("contextmenu", this._onContextMenu); if (this.canvas) { this.canvas.addEventListener("mousedown", this._onMouseDown); this.canvas.addEventListener("mousemove", this._onMouseMove); this.canvas.addEventListener("wheel", this._onWheel, { passive: false }); } } // --- EVENT HANDLERS --- _onKeyDown(e) { this.heldKeys.add(e.code); } _onKeyUp(e) { this.heldKeys.delete(e.code); } _onContextMenu(e) { e.preventDefault(); } _getMouseCoords(e) { const rect = this.canvas.getBoundingClientRect(); const scaleX = this.canvas.width / rect.width; const scaleY = this.canvas.height / rect.height; return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }; } _onMouseDown(e) { this.isMouseDown = true; // Start Dragging // NOTE: Clicks are now strictly generated on mouseup to ensure // the interaction manager can differentiate them from drags. } _onMouseUp(e) { if (!this.isMouseDown) return; this.isMouseDown = false; // Stop Dragging // Register click only if released over the actual canvas if (e.target === this.canvas) { if (e.button === 2) { this.lastRightClick = this._getMouseCoords(e); } else { this.lastClick = this._getMouseCoords(e); } } } _onMouseMove(e) { this.mousePosition = this._getMouseCoords(e); } _onWheel(e) { e.preventDefault(); const delta = e.deltaY > 0 ? 1 : -1; this.scrollDelta += (delta * 30); this.mousePosition = this._getMouseCoords(e); } // --- CLEANUP --- destroy() { window.removeEventListener("keydown", this._onKeyDown); window.removeEventListener("keyup", this._onKeyUp); window.removeEventListener("mouseup", this._onMouseUp); window.removeEventListener("contextmenu", this._onContextMenu); if (this.canvas) { this.canvas.removeEventListener("mousedown", this._onMouseDown); this.canvas.removeEventListener("mousemove", this._onMouseMove); this.canvas.removeEventListener("wheel", this._onWheel); } } // --- PUBLIC API --- getAndResetClick() { if (!this.lastClick) return null; const click = { ...this.lastClick }; this.lastClick = null; return click; } getAndResetRightClick() { if (!this.lastRightClick) return null; const click = { ...this.lastRightClick }; this.lastRightClick = null; return click; } getAndResetScroll() { const val = this.scrollDelta; this.scrollDelta = 0; return val; } getMousePosition() { return this.mousePosition; } getIsMouseDown() { return this.isMouseDown; } reset() { this.heldKeys.clear(); this.lastClick = null; this.lastRightClick = null; this.isMouseDown = false; this.scrollDelta = 0; } get direction() { const keys = Array.from(this.heldKeys); for (let i = keys.length - 1; i >= 0; i--) { const key = keys[i]; if (key === "ArrowUp" || key === "KeyW") return "UP"; if (key === "ArrowDown" || key === "KeyS") return "DOWN"; if (key === "ArrowLeft" || key === "KeyA") return "LEFT"; if (key === "ArrowRight" || key === "KeyD") return "RIGHT"; } return null; } }import { events } from './eventBus.js'; import { Input } from './input.js'; import { UIInteractionManager } from './UIInteractionManager.js'; // --- CONTROLLERS --- import { OverworldController } from '../controllers/overworld/overworldController.js'; import { EncounterController } from '../controllers/encounter/encounterController.js'; import { CharacterCreatorController } from '../controllers/characterCreator/characterCreatorController.js'; import { PartyController } from '../controllers/party/partyController.js'; import { CharacterSummaryController } from '../controllers/characterSummary/characterSummaryController.js'; import { BattleController } from '../controllers/battle/battleController.js'; import { LevelUpController } from '../controllers/levelUp/levelUpController.js'; // --- RENDERERS --- import { MapRenderer } from '../renderers/overworld/mapRenderer.js'; import { LightingRenderer } from '../renderers/overworld/lightingRenderer.js'; import { WeatherRenderer } from '../renderers/overworld/weatherRenderer.js'; import { EncounterRenderer } from '../renderers/encounter/encounterRenderer.js'; import { TransitionRenderer } from '../renderers/transitions/transitionRenderer.js'; import { CharacterCreatorRenderer } from '../renderers/characterCreator/characterCreatorRenderer.js'; import { PartyRenderer } from '../renderers/party/partyRenderer.js'; import { CharacterSummaryRenderer } from '../renderers/characterSummary/characterSummaryRenderer.js'; import { BattleRenderer } from '../renderers/battle/battleRenderer.js'; import { LevelUpRenderer } from '../renderers/levelUp/levelUpRenderer.js'; import { WorldManager } from '../../../shared/systems/worldManager.js'; import { TimeSystem } from '../../../shared/systems/timeSystem.js'; import { gameState } from '../../../shared/state/gameState.js'; export class SceneManager { constructor(canvas, assetLoader, config) { this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.loader = assetLoader; this.config = config; // Systems this.input = new Input(this.canvas); this.worldManager = new WorldManager(); this.timeSystem = new TimeSystem(); this.uiInteractionManager = new UIInteractionManager(); console.log(`%c[SceneManager] Init. Seed: ${gameState.seed}`, 'color: #00aaaa'); // --- CONTROLLERS --- this.overworldController = new OverworldController(this.input, this.config, this.worldManager); this.encounterController = new EncounterController(this.input, this.config, this.worldManager); this.characterCreatorController = new CharacterCreatorController(); this.partyController = new PartyController(this.input); this.characterSummaryController = null; this.levelUpController = new LevelUpController(this.input); this.battleController = new BattleController(this.input, this.config, this.worldManager); // --- RENDERERS --- this.mapRenderer = new MapRenderer(this.canvas, this.loader, this.config); this.lightingRenderer = new LightingRenderer(this.config); this.weatherRenderer = new WeatherRenderer(this.canvas, this.ctx, this.config, this.loader); this.encounterRenderer = new EncounterRenderer(this.config, this.loader); this.transitionRenderer = new TransitionRenderer(this.config); this.characterCreatorRenderer = new CharacterCreatorRenderer(this.config, this.loader); this.partyRenderer = new PartyRenderer(this.ctx, this.loader); this.characterSummaryRenderer = new CharacterSummaryRenderer(this.ctx, this.loader); this.levelUpRenderer = new LevelUpRenderer(this.ctx, this.config, this.loader); this.battleRenderer = new BattleRenderer(this.ctx, this.config, this.loader); // State this.currentScene = 'character-creator'; this._handleGlobalKeydown = this._handleGlobalKeydown.bind(this); this.setupInputRouting(); this.setupEventListeners(); } resolveTargetBGM(targetScene) { if (targetScene === 'battle') return 'plainsBattle1'; if (targetScene === 'overworld') return 'plainsOverworldDay'; return null; } resolveTargetAmbience(targetScene) { if (['party', 'character_summary', 'level_up'].includes(targetScene)) return null; if (['battle', 'encounter', 'character-creator'].includes(targetScene)) return 'none'; if (gameState.world && gameState.world.currentWeather) { return gameState.world.currentWeather.audioEffect || 'none'; } return 'none'; } changeScene(sceneName) { console.log(`[SceneManager] Switching to: ${sceneName}`); this.currentScene = sceneName; const targetBGM = this.resolveTargetBGM(sceneName); if (targetBGM !== null) { events.emit('PLAY_MUSIC', { id: targetBGM, fadeTime: 1.0 }); } const targetAmbience = this.resolveTargetAmbience(sceneName); if (targetAmbience !== null) { if (targetAmbience === 'none') { events.emit('STOP_AMBIENCE', { fadeTime: 1.0 }); } else { events.emit('PLAY_AMBIENCE', { id: targetAmbience, fadeTime: 2.0 }); } } } setupEventListeners() { events.on('CHANGE_SCENE', ({ scene, data }) => { this.transitionRenderer.start(() => { this.input.reset(); if (scene === 'overworld') this.overworldController.isLocked = false; if (scene === 'character_summary') { this.characterSummaryController = new CharacterSummaryController(this.input, data); } if (scene === 'level_up') { this.levelUpController.init(data); } if (scene === 'party') { this.partyController.init(data || {}); } this.changeScene(scene); }, 'fade'); }); events.on('INTERACT', (data) => { if (data.type === 'ENCOUNTER') { this.transitionRenderer.start(() => { this.encounterController.start(data.id, data.context); this.changeScene('encounter'); }, 'fade'); } }); events.on('START_ENCOUNTER', (data) => { this.transitionRenderer.start(() => { this.encounterController.start(data.encounterId, data.context || {}); this.changeScene('encounter'); }, 'fade'); }); events.on('START_BATTLE', (data) => { this.transitionRenderer.start(() => { console.log("[SceneManager] Handing off entities to BattleController:", data.enemies); const context = data.context || {}; context.backgroundId = data.background; context.weather = data.weather; this.battleController.start(data.enemies, context); this.changeScene('battle'); }, 'flash', { speed: 4.0, color: '#ffffff' }); }); events.on('BATTLE_ENDED', (data) => { if (data.victory) { events.emit('CHANGE_SCENE', { scene: 'overworld' }); } else { console.log("[SceneManager] Game Over..."); } }); events.on('REQUEST_PARTY_SWAP', (data) => { this.transitionRenderer.start(() => { this.partyController.init({ mode: data.mode || 'BATTLE_SELECT', activeIndices: data.activeIndices, callback: data.callback }); this.changeScene('party'); }, 'wipe', { speed: 3.0 }); }); events.on('CHARACTER_RECRUITED', (data) => { this.transitionRenderer.start(() => { this.characterSummaryController = new CharacterSummaryController(this.input, { character: data.character }); this.changeScene('character_summary'); }, 'wipe', { speed: 3.0 }); }); events.on('TOGGLE_CHARACTER_SUMMARY', (data) => { this.transitionRenderer.start(() => { this.characterSummaryController = new CharacterSummaryController(this.input, { character: data.combatant, returnScene: 'battle', phase: data.phase, onItemSelected: data.onItemSelected }); this.changeScene('character_summary'); }, 'wipe', { speed: 4.0 }); }); } setupInputRouting() { window.addEventListener('keydown', this._handleGlobalKeydown); } _handleGlobalKeydown(e) { if (this.transitionRenderer.isActive && this.transitionRenderer.state === 'FADE_OUT') return; if (e.code === 'Backquote') this.mapRenderer.showDebug = !this.mapRenderer.showDebug; // --- POLYMORPHIC KEYDOWN ROUTING --- const activeController = this._getActiveController(); if (activeController && activeController.handleKeyDown) { // Note: Passed both e.code and e in case some older controllers still expect the raw event activeController.handleKeyDown(e.code, e); } } _getActiveController() { switch (this.currentScene) { case 'overworld': return this.overworldController; case 'encounter': return this.encounterController; case 'battle': return this.battleController; case 'character-creator': return this.characterCreatorController; case 'party': return this.partyController; case 'character_summary': return this.characterSummaryController; case 'level_up': return this.levelUpController; default: return null; } } // Helper to fetch active renderer (useful for generic mouse clicks that depend on UI layout) _getActiveRenderer() { switch (this.currentScene) { case 'overworld': return this.mapRenderer; case 'encounter': return this.encounterRenderer; case 'battle': return this.battleRenderer; case 'character-creator': return this.characterCreatorRenderer; case 'party': return this.partyRenderer; case 'character_summary': return this.characterSummaryRenderer; case 'level_up': return this.levelUpRenderer; default: return null; } } update(dt) { let click = this.input.getAndResetClick(); let rightClick = this.input.getAndResetRightClick(); const scroll = this.input.getAndResetScroll(); const mousePos = this.input.getMousePosition(); const isMouseDown = this.input.getIsMouseDown ? this.input.getIsMouseDown() : false; const activeController = this._getActiveController(); const activeRenderer = this._getActiveRenderer(); if (activeController) { const inputProxy = { getMousePosition: () => mousePos, getIsMouseDown: () => isMouseDown, getAndResetClick: () => click, getAndResetRightClick: () => rightClick }; // UI Interaction Manager const uiResult = this.uiInteractionManager.update(inputProxy, activeController); if (uiResult) { if (uiResult.handledClick) click = null; if (uiResult.handledRightClick) rightClick = null; } // --- POLYMORPHIC MOUSE/INPUT ROUTING --- // Relying on the new Base Controller interface to standardize inputs if (activeController.handleMouseMove) { activeController.handleMouseMove(mousePos.x, mousePos.y, isMouseDown, activeRenderer); } if (click && activeController.handleMouseDown) { // Passed activeRenderer here to support Party/LevelUp controllers that previously required it activeController.handleMouseDown(click.x, click.y, activeRenderer); } if (rightClick && activeController.handleRightClick) { activeController.handleRightClick(rightClick.x, rightClick.y); } if (scroll !== 0 && activeController.handleScroll) { activeController.handleScroll(scroll); } // --- POLYMORPHIC CONTROLLER UPDATE --- if (activeController.update) { activeController.update(dt); } } // --- GLOBAL & ENVIRONMENTAL UPDATES --- this.transitionRenderer.update(dt); // Weather and Time updates (Only relevant in specific scenes) if (['overworld', 'encounter', 'battle'].includes(this.currentScene)) { if (this.currentScene === 'overworld') { this.timeSystem.update(dt); } if (this.weatherRenderer.update && this.overworldController.getState().camera) { this.weatherRenderer.update(dt, this.overworldController.getState().camera); } } } render(interpolation, totalTime) { if (!this.loader.isDone()) return; this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); switch (this.currentScene) { case 'character-creator': const ccState = this.characterCreatorController.getState(); this.characterCreatorRenderer.render(this.ctx, ccState); break; case 'overworld': this.renderOverworld(interpolation, totalTime); break; case 'party': const pState = this.partyController.getState(); this.partyRenderer.render(pState); break; case 'encounter': this.renderOverworld(interpolation, totalTime); const encState = this.encounterController.getState(); this.encounterRenderer.render(this.ctx, encState); break; case 'battle': this.renderOverworld(interpolation, totalTime); const batState = this.battleController.getState(); this.battleRenderer.render(batState); break; case 'character_summary': if (this.characterSummaryController) { const csState = this.characterSummaryController.getState(); this.characterSummaryRenderer.render(csState); } break; case 'level_up': const luState = this.levelUpController.getState(); this.levelUpRenderer.render(luState); break; } this.transitionRenderer.render(this.ctx); } renderOverworld(interpolation, totalTime) { const state = this.overworldController.getState(); const ambientColor = this.timeSystem.getCurrentColorData(); this.mapRenderer.renderMap( this.worldManager, state.camera, state.entities, interpolation, totalTime, this.lightingRenderer, ambientColor, this.weatherRenderer ); } destroy() { this.input.destroy(); window.removeEventListener('keydown', this._handleGlobalKeydown); } }export class UIInteractionManager { constructor() { this.mouseDownPos = null; this.activeHitboxDown = null; this.isDragging = false; this.dragThreshold = 5; } /** * @returns {Object} { handledClick, handledRightClick } */ update(input, activeScreen) { const mousePos = input.getMousePosition(); const isMouseDown = input.getIsMouseDown ? input.getIsMouseDown() : false; const click = input.getAndResetClick(); const rightClick = input.getAndResetRightClick(); const hitboxes = activeScreen.getHitboxes ? activeScreen.getHitboxes() : []; hitboxes.sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0)); // Track what we intercept to tell SceneManager let handledClick = false; let handledRightClick = false; // 3. HOVER TRANSLATION if (mousePos && activeScreen.onHover) { const hoveredHitbox = this._findHitbox(mousePos.x, mousePos.y, hitboxes); activeScreen.onHover(hoveredHitbox ? hoveredHitbox.id : null); } // 4. RIGHT CLICK TRANSLATION if (rightClick) { const hit = this._findHitbox(rightClick.x, rightClick.y, hitboxes); // ALWAYS pass the event to the screen, whether there is a hitbox or not if (activeScreen.onRightClick) { activeScreen.onRightClick(hit ? hit.id : null); } handledRightClick = true; // Consume the event globally } // 5. DRAG VS CLICK MATH if (isMouseDown) { if (!this.mouseDownPos && mousePos) { this.mouseDownPos = { x: mousePos.x, y: mousePos.y }; this.activeHitboxDown = this._findHitbox(mousePos.x, mousePos.y, hitboxes); } else if (this.mouseDownPos && mousePos && !this.isDragging) { const dx = mousePos.x - this.mouseDownPos.x; const dy = mousePos.y - this.mouseDownPos.y; const distance = Math.sqrt(dx * dx + dy * dy); if (distance > this.dragThreshold && this.activeHitboxDown) { this.isDragging = true; if (activeScreen.onDragStart) { activeScreen.onDragStart(this.activeHitboxDown.id); } } } // ---> ADD THIS BLOCK <--- else if (this.isDragging && mousePos) { if (activeScreen.onDragMove) { activeScreen.onDragMove(mousePos.x, mousePos.y); } } } else { if (this.isDragging) { const targetHitbox = this._findHitbox(mousePos.x, mousePos.y, hitboxes); if (activeScreen.onDrop) { activeScreen.onDrop(this.activeHitboxDown.id, targetHitbox ? targetHitbox.id : null); } handledClick = true; // <--- ADD THIS: Consume the click so it doesn't bleed into the raw map/gameplay } else if (click) { const hit = this._findHitbox(click.x, click.y, hitboxes); // ALWAYS pass the click to the screen if (activeScreen.onClick) { activeScreen.onClick(hit ? hit.id : null); } // Consume the event so the game map doesn't process it handledClick = true; } // Reset drag state this.mouseDownPos = null; this.activeHitboxDown = null; this.isDragging = false; } // Pass consumption state back up return { handledClick, handledRightClick }; } _findHitbox(x, y, hitboxes) { return hitboxes.find(box => x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h ); } }/** * frontend/src/controllers/core/baseController.js */ export class BaseController { constructor(input) { this.input = input; // --- Shared State --- this.mouse = { x: 0, y: 0 }; this.lastRenderedHitboxes = []; this.hoveredHitboxId = null; } // --- Core Architecture --- update(dt) {} getState() { return {}; } // --- Standard UI Hitbox System --- // UIInteractionManager calls this to see what is clickable getHitboxes() { return this.lastRenderedHitboxes; } // Renderers (or controllers) call this to update the cache updateHitboxes(hitboxes) { this.lastRenderedHitboxes = hitboxes; } // --- Standard UI Callbacks --- // UIInteractionManager calls these automatically! onHover(hitboxId) { // Save the currently hovered ID so child controllers know what is highlighted this.hoveredHitboxId = hitboxId; } onClick(hitboxId) {} onRightClick(hitboxId) {} onDragMove(x, y) {} // <-- Add this onDragStart(hitboxId) {} onDrop(dragId, targetId) {} // --- Raw Input Fallbacks --- // SceneManager calls these automatically for non-UI interactions handleKeyDown(keyCode, e) {} handleScroll(delta) {} handleMouseMove(x, y, isMouseDown, renderer) { // Automatically keep track of raw mouse coordinates for all controllers this.mouse.x = x; this.mouse.y = y; } handleMouseDown(x, y, renderer) {} handleRightClick(x, y) {} }

