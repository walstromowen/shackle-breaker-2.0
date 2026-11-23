"""
tools/art/missingAbilityIcons.py
Icons for every ability that had none (or pointed at an empty cell of frontend/src/assets/icons/abilities.png):
  - the abilities an item uses (a torch's Torchlight, the Insights' readings, the Escape Rope...) show their item's own picture, copied from the
    consumables / materials sheet into a free cell of the ability sheet;
  - the rest are drawn here, hard-edged with a dark outline like the other icons: the newer Insight spells, the heal / recover / channel spells
    (the Moderate ones a fuller version of the Minor), and Switch.
It writes the sheet and prints the cell each ability should name (shared/abilities/abilityDefinitions.js `icon`).

    python3 tools/art/missingAbilityIcons.py
"""
import json
import math
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
ICONS = ROOT / 'frontend/src/assets/icons'
S = 64

def c(h, a=255):
    h = h.lstrip('#')
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)

OUT = c('#14121c')

def outline(im):
    px = im.load()
    rim = [(x, y) for y in range(S) for x in range(S) if px[x, y][3] == 0 and any(
        0 <= x + dx < S and 0 <= y + dy < S and px[x + dx, y + dy][3] > 0 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))]
    for p in rim:
        px[p] = OUT
    return im

def new():
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)

def arc_line(d, cx, cy, r, a0, a1, col, w):
    pts = [(cx + r * math.cos(math.radians(a)), cy + r * math.sin(math.radians(a))) for a in range(int(a0), int(a1) + 1, 4)]
    d.line(pts, fill=col, width=w, joint='curve')

def bolt(d, pts, col, w):
    d.line(pts, fill=col, width=w)

# ---------------------------------------------------------------- the drawn icons
def gust():
    im, d = new()
    for (y, x0, x1, r) in ((18, 8, 44, 8), (32, 4, 52, 9), (46, 12, 40, 7)):
        d.line((x0, y, x1, y), fill=c('#e8f4f4'), width=4)
        arc_line(d, x1, y - r, r, -90, 150, c('#e8f4f4'), 4)
    d.line((14, 32, 36, 32), fill=c('#9fd6d6'), width=2)
    return outline(im)

def downwind():
    im, d = new()
    for (y, x0) in ((16, 6), (30, 2), (44, 8)):
        d.line((x0, y, x0 + 30, y), fill=c('#cfeee4'), width=3)
    for (x, y) in ((38, 18), (48, 32), (40, 46)):                      # chevrons pushing the party on
        d.line((x, y - 8, x + 8, y, x, y + 8), fill=c('#7fd0b0'), width=4)
    return outline(im)

def tempest():
    im, d = new()
    cols = [c('#c9d0d8'), c('#a9b4c2'), c('#8a97a8')]
    for i, (w, y) in enumerate(((44, 12), (34, 22), (24, 32), (16, 42), (8, 50))):
        d.ellipse((32 - w // 2, y - 4, 32 + w // 2 + (i % 2) * 3, y + 5), fill=cols[i % 3])
    d.line((30, 54, 34, 60), fill=c('#8a97a8'), width=3)
    for (x, y) in ((8, 26), (54, 36), (12, 46)):
        d.rectangle((x, y, x + 2, y + 2), fill=c('#c9d0d8'))
    return outline(im)

def tidal_wave():
    im, d = new()
    d.pieslice((4, 8, 60, 64), 180, 360, fill=c('#2f6fb5'))
    d.rectangle((4, 36, 60, 58), fill=c('#2f6fb5'))
    d.pieslice((22, 14, 54, 46), 180, 360, fill=c('#5aa2e0'))
    d.ellipse((30, 20, 46, 36), fill=(0, 0, 0, 0))
    for (x, y) in ((8, 14), (14, 9), (22, 7)):
        d.ellipse((x, y, x + 6, y + 5), fill=c('#e8f6ff'))
    d.line((6, 44, 58, 44), fill=c('#9fd0f4'), width=2)
    return outline(im)

def drop(d, cx, top, r, col, hi):
    d.polygon([(cx, top), (cx - r, top + r * 1.6), (cx + r, top + r * 1.6)], fill=col)
    d.ellipse((cx - r, top + r * 0.9, cx + r, top + r * 2.9), fill=col)
    d.ellipse((cx - r * 0.55, top + r * 1.5, cx - r * 0.15, top + r * 2.1), fill=hi)

def mending_tide():
    im, d = new()
    drop(d, 30, 6, 16, c('#3f8fd6'), c('#bfe2ff'))
    d.rectangle((40, 36, 46, 56), fill=c('#f2f6f2')); d.rectangle((33, 43, 53, 49), fill=c('#f2f6f2'))
    return outline(im)

def glacial_spike():
    im, d = new()
    d.polygon([(10, 58), (30, 4), (40, 30), (54, 58)], fill=c('#bfe6ff'))
    d.polygon([(30, 4), (40, 30), (54, 58), (36, 58)], fill=c('#7cc0ec'))
    d.line((30, 8, 26, 40), fill=c('#f4fbff'), width=2)
    d.polygon([(4, 58), (14, 40), (22, 58)], fill=c('#9ed3f6'))
    return outline(im)

def frost_ward():
    im, d = new()
    d.polygon([(32, 4), (56, 12), (54, 36), (32, 60), (10, 36), (8, 12)], fill=c('#8fd0f2'))
    d.polygon([(32, 10), (50, 16), (48, 34), (32, 52), (16, 34), (14, 16)], fill=c('#cfeeff'))
    for a in range(0, 180, 60):
        dx, dy = 13 * math.cos(math.radians(a)), 13 * math.sin(math.radians(a))
        d.line((32 - dx, 30 - dy, 32 + dx, 30 + dy), fill=c('#3f86c0'), width=3)
    return outline(im)

def chain_lightning():
    im, d = new()
    bolt(d, [(6, 8), (22, 22), (16, 28), (32, 40)], c('#fff6b0'), 4)
    bolt(d, [(32, 40), (44, 30), (40, 26), (58, 14)], c('#fff6b0'), 4)
    bolt(d, [(32, 40), (40, 50), (34, 54), (46, 62)], c('#ffe066'), 3)
    for (x, y) in ((4, 6), (56, 12), (44, 60)):
        d.ellipse((x - 4, y - 4, x + 4, y + 4), fill=c('#9ad0ff'))
    return outline(im)

def lightning_strike():
    im, d = new()
    for (x0, y0, x1, y1) in ((6, 4, 30, 20), (22, 2, 50, 18), (38, 6, 60, 22)):
        d.ellipse((x0, y0, x1, y1), fill=c('#5a6478'))
    d.polygon([(30, 16), (40, 16), (34, 32), (44, 32), (26, 60), (30, 38), (22, 38)], fill=c('#ffe066'))
    d.line((32, 20, 28, 34), fill=c('#fff8d0'), width=2)
    d.ellipse((16, 54, 40, 62), fill=c('#ffcf40', 200))
    return outline(im)

def heart(d, cx, cy, r, col, hi):
    d.ellipse((cx - r, cy - r * 0.8, cx, cy + r * 0.2), fill=col)
    d.ellipse((cx, cy - r * 0.8, cx + r, cy + r * 0.2), fill=col)
    d.polygon([(cx - r, cy - r * 0.2), (cx + r, cy - r * 0.2), (cx, cy + r * 1.1)], fill=col)
    d.ellipse((cx - r * 0.7, cy - r * 0.55, cx - r * 0.35, cy - r * 0.2), fill=hi)

def plus(d, cx, cy, n, col):
    d.rectangle((cx - n // 3, cy - n, cx + n // 3, cy + n), fill=col)
    d.rectangle((cx - n, cy - n // 3, cx + n, cy + n // 3), fill=col)

def minor_heal():
    im, d = new(); heart(d, 30, 32, 14, c('#d8384a'), c('#ffb0b8')); return outline(im)

def moderate_heal():
    im, d = new(); heart(d, 28, 30, 21, c('#e0283c'), c('#ffb0b8')); plus(d, 50, 50, 7, c('#f4fff0')); return outline(im)

def energy(d, cx, cy, s, col, hi):
    d.polygon([(cx + s * 0.2, cy - s), (cx - s * 0.6, cy + s * 0.15), (cx, cy + s * 0.15), (cx - s * 0.2, cy + s),
               (cx + s * 0.6, cy - s * 0.15), (cx, cy - s * 0.15)], fill=col)
    d.line((cx + s * 0.1, cy - s * 0.7, cx - s * 0.3, cy), fill=hi, width=2)

def minor_recover():
    im, d = new(); energy(d, 32, 32, 18, c('#7cc850'), c('#d8f4b0')); return outline(im)

def moderate_recover():
    im, d = new(); energy(d, 28, 30, 25, c('#5cb838'), c('#d8f4b0')); plus(d, 50, 50, 7, c('#f4fff0')); return outline(im)

def orb(d, cx, cy, r, col, hi):
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=col)
    d.ellipse((cx - r * 0.6, cy - r * 0.6, cx - r * 0.1, cy - r * 0.1), fill=hi)

def minor_channel():
    im, d = new(); orb(d, 32, 32, 13, c('#4a7ee0'), c('#c8dcff')); return outline(im)

def moderate_channel():
    im, d = new()
    for a in range(0, 360, 45):
        d.line((30 + 14 * math.cos(math.radians(a)), 30 + 14 * math.sin(math.radians(a)), 30 + 24 * math.cos(math.radians(a)), 30 + 24 * math.sin(math.radians(a))), fill=c('#9ec0ff'), width=3)
    orb(d, 30, 30, 15, c('#3a6ad8'), c('#c8dcff')); plus(d, 50, 50, 7, c('#f4fff0'))
    return outline(im)

def switch_combatant():
    im, d = new()
    arc_line(d, 32, 32, 20, 200, 340, c('#e8c060'), 5)
    d.polygon([(50, 18), (58, 30), (44, 30)], fill=c('#e8c060'))
    arc_line(d, 32, 32, 20, 20, 160, c('#c8a040'), 5)
    d.polygon([(14, 46), (6, 34), (20, 34)], fill=c('#c8a040'))
    return outline(im)

DRAWN = {
    'gust': gust, 'downwind': downwind, 'tempest': tempest, 'tidal_wave': tidal_wave, 'mending_tide': mending_tide,
    'glacial_spike': glacial_spike, 'frost_ward': frost_ward, 'chain_lightning': chain_lightning, 'lightning_strike': lightning_strike,
    'minor_heal': minor_heal, 'moderate_heal': moderate_heal, 'minor_recover': minor_recover, 'moderate_recover': moderate_recover,
    'minor_channel': minor_channel, 'moderate_channel': moderate_channel, 'switch_combatant': switch_combatant,
}
# ability -> (sheet, col, row) of the item it belongs to
FROM_ITEM = {
    # (an item's own `iconSheet` says where its picture is: the Insights are on the weapons sheet, the meteorite on the consumables sheet)
    'read_insight_fire': ('weapons', 0, 1), 'read_insight_water': ('weapons', 1, 1), 'read_insight_earth': ('weapons', 2, 1),
    'read_insight_lightning': ('weapons', 3, 1), 'read_insight_ice': ('weapons', 4, 1), 'read_insight_wind': ('weapons', 5, 1),
    'read_insight_arcane': ('weapons', 6, 1), 'read_insight_light': ('weapons', 7, 1), 'read_insight_dark': ('weapons', 8, 1),
    'meteorite_unshackle': ('consumables', 3, 1), 'brew_of_madness': ('consumables', 11, 1), 'shmindolyns_draught': ('consumables', 10, 1),
    'torchlight': ('consumables', 5, 0), 'escape_rope': ('consumables', 9, 0), 'read_interior_map': ('consumables', 11, 0),
    'use_bedroll': ('consumables', 10, 0), 'place_waypoint': ('consumables', 9, 1), 'item_smoke_bomb': ('consumables', 4, 1),
}
# where each goes (fixed, so running this again puts every icon back in the same cell)
CELLS = {"gust": [0, 14], "downwind": [1, 14], "tempest": [2, 14], "tidal_wave": [8, 8], "mending_tide": [9, 8], "glacial_spike": [4, 4], "frost_ward": [5, 4], "chain_lightning": [3, 5], "lightning_strike": [4, 5], "minor_heal": [5, 8], "moderate_heal": [0, 15], "minor_recover": [6, 8], "moderate_recover": [1, 15], "minor_channel": [7, 8], "moderate_channel": [2, 15], "switch_combatant": [5, 7], "read_insight_fire": [3, 15], "read_insight_water": [4, 15], "read_insight_earth": [5, 15], "read_insight_lightning": [6, 15], "read_insight_ice": [7, 15], "read_insight_wind": [8, 15], "read_insight_arcane": [9, 15], "read_insight_light": [10, 15], "read_insight_dark": [11, 15], "meteorite_unshackle": [12, 15], "brew_of_madness": [13, 15], "shmindolyns_draught": [14, 15], "torchlight": [15, 15], "escape_rope": [16, 15], "read_interior_map": [17, 15], "use_bedroll": [18, 15], "place_waypoint": [19, 15], "item_smoke_bomb": [4, 8]}

def main():
    sheet = Image.open(ICONS / 'abilities.png').convert('RGBA')
    sources = {k: Image.open(ICONS / f'{k}.png').convert('RGBA') for k in ('consumables', 'materials', 'weapons')}
    placed = {}
    for aid in list(DRAWN) + list(FROM_ITEM):
        cell = tuple(CELLS[aid])
        if aid in DRAWN:
            img = DRAWN[aid]()
        else:
            src, col, row = FROM_ITEM[aid]
            img = sources[src].crop((col * S, row * S, col * S + S, row * S + S))
            if img.getbbox() is None:
                raise SystemExit(f'{aid}: its item icon {src} ({col}, {row}) is empty')
        x, y = cell[0] * S, cell[1] * S
        sheet.paste(Image.new('RGBA', (S, S), (0, 0, 0, 0)), (x, y))
        sheet.alpha_composite(img, (x, y))
        placed[aid] = cell
    sheet.save(ICONS / 'abilities.png', optimize=True)
    print(json.dumps({k: {'col': v[0], 'row': v[1]} for k, v in placed.items()}))

if __name__ == '__main__':
    main()
