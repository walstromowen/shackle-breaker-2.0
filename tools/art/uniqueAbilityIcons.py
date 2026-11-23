"""
tools/art/uniqueAbilityIcons.py
Every ability its own icon. Abilities that shared a cell of frontend/src/assets/icons/abilities.png with another (the cell's art belongs to the
other) get one of their own here, in a fixed free cell: the item abilities show their item's picture (copied from the consumables sheet), the rest
are drawn, hard-edged with a dark outline like the other icons (helpers from missingAbilityIcons.py). Tidal Wave moves to the wave already drawn
at (3, 8). It prints the cell each ability should name (shared/abilities/abilityDefinitions.js `icon`).

    python3 tools/art/uniqueAbilityIcons.py
"""
import json
import math
import sys
from pathlib import Path
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from missingAbilityIcons import c, outline, new, arc_line, bolt, drop, heart, plus, orb, ICONS, S  # noqa: E402

def shield_bash():
    im, d = new()
    d.ellipse((8, 10, 46, 48), fill=c('#8a6a44')); d.ellipse((14, 16, 40, 42), fill=c('#a8834f'))
    d.ellipse((22, 24, 32, 34), fill=c('#c9c2b0'))
    for (x0, y0, x1, y1) in ((48, 14, 60, 8), (50, 28, 62, 28), (48, 42, 60, 48)):
        d.line((x0, y0, x1, y1), fill=c('#f4e6b0'), width=3)
    return outline(im)

def fire_punch():
    im, d = new()
    for (x0, y0, x1, y1, col) in ((14, 4, 34, 30, '#f08a24'), (28, 2, 48, 28, '#f6b13a'), (22, 0, 38, 20, '#ffe08a')):
        d.ellipse((x0, y0, x1, y1), fill=c(col))
    d.rounded_rectangle((14, 22, 50, 50), 6, fill=c('#e0b08a'))
    for x in (18, 26, 34, 42):
        d.line((x, 24, x, 36), fill=c('#a8775a'), width=2)
    d.rectangle((20, 50, 44, 60), fill=c('#7a4a2a'))
    return outline(im)

def hit_and_run():
    im, d = new()
    d.line((8, 52, 40, 12), fill=c('#d8dde4'), width=5); d.line((36, 18, 44, 8), fill=c('#f4f6f8'), width=3)
    d.line((6, 54, 14, 46), fill=c('#7a5a3a'), width=5)
    arc_line(d, 40, 40, 14, -60, 150, c('#e8c060'), 4)
    d.polygon([(22, 46), (28, 56), (16, 54)], fill=c('#e8c060'))
    return outline(im)

def rampage():
    im, d = new()
    for i, (x0, x1) in enumerate(((6, 26), (16, 38), (28, 50), (40, 60))):
        d.line((x0, 8 + i * 3, x1, 56 - i * 2), fill=c('#9a1c22'), width=5)
        d.line((x0 + 1, 8 + i * 3, x1 - 2, 52 - i * 2), fill=c('#d8404a'), width=2)
    for (x, y) in ((8, 50), (52, 12), (30, 58)):
        d.ellipse((x - 3, y - 3, x + 3, y + 3), fill=c('#a88a6a'))
    return outline(im)

def last_watch():
    im, d = new()
    d.polygon([(30, 4), (36, 4), (36, 42), (33, 48), (30, 42)], fill=c('#cfe6f4'))
    d.line((33, 6, 33, 40), fill=c('#f6fbff'), width=1)
    d.rectangle((20, 42, 46, 47), fill=c('#7a6a54')); d.rectangle((30, 47, 36, 60), fill=c('#5a4632'))
    for (x, y) in ((14, 14), (50, 22), (16, 32), (52, 8)):
        d.line((x - 4, y, x + 4, y), fill=c('#bfe6ff'), width=2); d.line((x, y - 4, x, y + 4), fill=c('#bfe6ff'), width=2)
    return outline(im)

def baton_pass():
    im, d = new()
    d.ellipse((4, 34, 22, 52), fill=c('#5a6a8a')); d.ellipse((42, 34, 60, 52), fill=c('#8a5a6a'))
    arc_line(d, 32, 44, 22, 200, 340, c('#e8d070'), 3)
    orb(d, 32, 20, 8, c('#f4d24a'), c('#fff6c0'))
    d.polygon([(52, 30), (58, 38), (48, 38)], fill=c('#e8d070'))
    return outline(im)

def mass_fear():
    im, d = new()
    for (x, y, r) in ((18, 22, 12), (44, 22, 12), (31, 44, 13)):
        d.ellipse((x - r, y - r, x + r, y + r), fill=c('#2a2236'))
        d.ellipse((x - 7, y - 3, x - 2, y + 3), fill=c('#d4f070')); d.ellipse((x + 2, y - 3, x + 7, y + 3), fill=c('#d4f070'))
    for r in (28, 31):
        arc_line(d, 32, 34, r, 200, 340, c('#6a5a8a'), 2)
    return outline(im)

def throw_net():
    im, d = new()
    d.ellipse((6, 6, 58, 58), fill=c('#b8a07a', 70))
    for k in range(-3, 4):
        d.line((32 + k * 8 - 20, 8, 32 + k * 8 + 20, 56), fill=c('#c8b48a'), width=2)
        d.line((32 + k * 8 + 20, 8, 32 + k * 8 - 20, 56), fill=c('#c8b48a'), width=2)
    for (x, y) in ((10, 32), (54, 32), (32, 8), (32, 56)):
        d.ellipse((x - 3, y - 3, x + 3, y + 3), fill=c('#7a7a80'))
    im2 = Image.new('RGBA', (S, S), (0, 0, 0, 0)); mask = Image.new('L', (S, S), 0)
    from PIL import ImageDraw as _D
    _D.Draw(mask).ellipse((6, 6, 58, 58), fill=255)
    im2.paste(im, (0, 0), mask)
    return outline(im2)

def sack_snatch():
    im, d = new()
    d.polygon([(14, 26), (50, 26), (56, 56), (8, 56)], fill=c('#a8825a'))
    d.ellipse((8, 40, 56, 60), fill=c('#a8825a'))
    d.polygon([(20, 26), (44, 26), (38, 12), (26, 12)], fill=c('#8a6a46'))
    d.line((18, 26, 46, 26), fill=c('#5a3a22'), width=3)
    arc_line(d, 52, 18, 10, 90, 300, c('#d8c08a'), 2)
    return outline(im)

def gravity():
    im, d = new()
    for r, col in ((26, '#3a2a5a'), (19, '#4a3274'), (12, '#6a44a0')):
        d.ellipse((32 - r, 32 - r, 32 + r, 32 + r), fill=c(col))
    d.ellipse((26, 26, 38, 38), fill=c('#120c1c'))
    for x in (12, 32, 52):
        d.line((x, 2, x, 12), fill=c('#c8b4ff'), width=2); d.polygon([(x - 4, 10), (x + 4, 10), (x, 16)], fill=c('#c8b4ff'))
    return outline(im)

def drain_life():
    im, d = new()
    heart(d, 22, 36, 14, c('#c8283a'), c('#ff9aa8'))
    for i, (x, y) in enumerate(((40, 28), (48, 20), (56, 12))):
        d.ellipse((x - 4 + i, y - 4 + i, x + 4 - i, y + 4 - i), fill=c('#d8384a'))
    arc_line(d, 44, 34, 14, 260, 360, c('#4a2a5a'), 3)
    return outline(im)

def osmose():
    im, d = new()
    orb(d, 18, 40, 13, c('#2a4a9a'), c('#9ab8ff'))
    for i, (x, y) in enumerate(((52, 12), (44, 20), (36, 28))):
        drop(d, x, y - 6, 4 + i, c('#6a9ae8'), c('#d8e8ff'))
    return outline(im)

def sapping_slam():
    im, d = new()
    d.rounded_rectangle((18, 6, 46, 34), 6, fill=c('#8a8478')); d.line((22, 14, 40, 14), fill=c('#6a645a'), width=2)
    d.rectangle((26, 34, 38, 42), fill=c('#6a645a'))
    d.polygon([(2, 58), (20, 46), (32, 52), (44, 46), (62, 58)], fill=c('#7a5a3a'))
    for (x, y) in ((12, 44), (52, 44), (32, 44)):
        d.ellipse((x - 3, y - 3, x + 3, y + 3), fill=c('#7ab8ff'))
    return outline(im)

def raise_skeleton():
    im, d = new()
    d.ellipse((4, 44, 60, 64), fill=c('#5a4632'))
    d.ellipse((18, 8, 46, 34), fill=c('#e8e2d0')); d.rectangle((24, 30, 40, 40), fill=c('#e8e2d0'))
    d.ellipse((23, 16, 30, 24), fill=c('#1a1612')); d.ellipse((34, 16, 41, 24), fill=c('#1a1612'))
    for x in (26, 30, 34, 38):
        d.line((x, 34, x, 40), fill=c('#8a8270'), width=1)
    for (x, y) in ((10, 30), (54, 26), (14, 14), (50, 40)):
        d.ellipse((x - 2, y - 2, x + 2, y + 2), fill=c('#8af0a0'))
    return outline(im)

def bear_form():
    im, d = new()
    d.ellipse((12, 22, 52, 60), fill=c('#6a4428'))
    for (x, y) in ((10, 8), (24, 2), (40, 2), (54, 8)):
        d.ellipse((x - 7, y, x + 7, y + 14), fill=c('#6a4428'))
    d.ellipse((22, 34, 42, 52), fill=c('#8a5e3a'))
    for (x, y) in ((10, 8), (24, 2), (40, 2), (54, 8)):
        d.line((x, y + 2, x, y - 2), fill=c('#e8e0c8'), width=2)
    return outline(im)

def wrap():
    im, d = new()
    for i, y in enumerate((14, 26, 38, 50)):
        d.ellipse((10, y - 6, 54, y + 6), outline=c('#5a8a3a' if i % 2 else '#7aa84a'), width=5)
    d.ellipse((46, 4, 58, 14), fill=c('#7aa84a')); d.point((53, 8), fill=c('#1a1a12'))
    return outline(im)

def cleanse():
    im, d = new()
    for (x, y) in ((16, 44), (44, 48), (30, 54)):
        d.ellipse((x - 5, y - 4, x + 5, y + 4), fill=c('#4a3a5a'))
    for (x, y, r) in ((32, 24, 12), (14, 14, 6), (50, 16, 7)):
        d.polygon([(x, y - r), (x + r * 0.3, y - r * 0.3), (x + r, y), (x + r * 0.3, y + r * 0.3), (x, y + r), (x - r * 0.3, y + r * 0.3), (x - r, y), (x - r * 0.3, y - r * 0.3)], fill=c('#fffbe0'))
    d.line((8, 38, 56, 38), fill=c('#c8e8ff'), width=2)
    return outline(im)

def purify():
    im, d = new()
    arc_line(d, 32, 14, 14, 180, 360, c('#ffe890'), 3)
    drop(d, 32, 14, 14, c('#f4fbff'), c('#ffffff'))
    d.line((32, 30, 32, 50), fill=c('#c8dcf0'), width=2); d.line((24, 40, 40, 40), fill=c('#c8dcf0'), width=2)
    return outline(im)

DRAWN = {
    'shield_bash': shield_bash, 'fire_punch': fire_punch, 'hit_and_run': hit_and_run, 'rampage': rampage, 'last_watch': last_watch,
    'baton_pass': baton_pass, 'mass_fear': mass_fear, 'item_throw_net': throw_net, 'sack_snatch': sack_snatch, 'gravity': gravity,
    'drain_life': drain_life, 'osmose': osmose, 'sapping_slam': sapping_slam, 'raise_skeleton': raise_skeleton, 'bear_form': bear_form,
    'wrap': wrap, 'cleanse': cleanse, 'purify': purify,
}
FROM_ITEM = {   # (sheet, col, row) of the item each belongs to
    'item_bandage': ('consumables', 7, 1), 'item_antidote': ('consumables', 5, 1), 'item_aloe': ('consumables', 8, 1),
    'item_poison_knife': ('consumables', 8, 0),
}
ORDER = list(DRAWN) + list(FROM_ITEM)
FREE = [(20, 15), (21, 15), (22, 15), (23, 15), (24, 15)] + [(c_, 16) for c_ in range(25)]
CELLS = {aid: FREE[i] for i, aid in enumerate(ORDER)}
MOVED = {'tidal_wave': (3, 8)}   # already drawn there (the cell Throw Net and Snatch shared)

def main():
    sheet = Image.open(ICONS / 'abilities.png').convert('RGBA')
    consumables = Image.open(ICONS / 'consumables.png').convert('RGBA')
    for aid in ORDER:
        if aid in DRAWN:
            img = DRAWN[aid]()
        else:
            _, col, row = FROM_ITEM[aid]
            img = consumables.crop((col * S, row * S, col * S + S, row * S + S))
            assert img.getbbox(), f'{aid}: its item icon is empty'
        x, y = CELLS[aid][0] * S, CELLS[aid][1] * S
        sheet.paste(Image.new('RGBA', (S, S), (0, 0, 0, 0)), (x, y))
        sheet.alpha_composite(img, (x, y))
    sheet.save(ICONS / 'abilities.png', optimize=True)
    print(json.dumps({**{k: {'col': v[0], 'row': v[1]} for k, v in CELLS.items()}, **{k: {'col': v[0], 'row': v[1]} for k, v in MOVED.items()}}))

if __name__ == '__main__':
    main()
