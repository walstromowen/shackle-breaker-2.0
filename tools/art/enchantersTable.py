"""
tools/art/enchantersTable.py
Placeholder art for the Enchanter's Table (frontend/src/assets/mapObjects/objEnchantersTable.png, 32 x 32): a wooden table like the other benches,
with an open tome giving off a violet glow and an orb on a little stand. Drawn hard-edged with a dark outline to sit beside the hand-made station sprites.

    python3 tools/art/enchantersTable.py
"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[2] / 'frontend/src/assets/mapObjects/objEnchantersTable.png'


def c(h, a=255):
    h = h.lstrip('#')
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


OUTLINE = c('#1a1214')
WOOD, WOOD_L, WOOD_D = c('#8a5a34'), c('#b07a48'), c('#5e3a22')
PAGE, PAGE_D = c('#e8dcc0'), c('#bfae8c')
COVER = c('#4a2a6a')
GLOW, GLOW_L, GLOW_W = c('#8a5cff', 150), c('#c3a8ff'), c('#f3ecff')
STAND, ORB, ORB_L = c('#6a6a78'), c('#6a3cc8'), c('#b89cff')


def outline(im):
    px = im.load()
    w, h = im.size
    rim = []
    for y in range(h):
        for x in range(w):
            if px[x, y][3] == 0 and any(0 <= x + dx < w and 0 <= y + dy < h and px[x + dx, y + dy][3] > 200
                                       for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                rim.append((x, y))
    for p in rim:
        px[p] = OUTLINE


def main():
    im = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # legs and the stretcher
    for x in (6, 24):
        d.rectangle((x, 19, x + 2, 29), fill=WOOD_D)
        d.line((x, 19, x, 29), fill=WOOD)
    d.rectangle((8, 25, 24, 26), fill=WOOD_D)
    # table top
    d.rectangle((3, 15, 29, 19), fill=WOOD)
    d.line((3, 15, 29, 15), fill=WOOD_L)
    d.line((3, 19, 29, 19), fill=WOOD_D)
    # the open tome: violet covers, two pages and a glow rising from them
    d.rectangle((5, 11, 19, 15), fill=COVER)
    d.polygon([(6, 12), (12, 10), (12, 14), (6, 14)], fill=PAGE)
    d.polygon([(12, 10), (18, 12), (18, 14), (12, 14)], fill=PAGE_D)
    for y in (12, 13):
        d.line((7, y, 10, y - 1), fill=PAGE_D)
        d.line((14, y - 1, 17, y), fill=PAGE)
    # the orb on its stand
    d.rectangle((23, 12, 25, 15), fill=STAND)
    d.rectangle((22, 14, 26, 15), fill=STAND)
    d.ellipse((21, 6, 27, 12), fill=ORB)
    d.point((23, 8), fill=ORB_L)
    d.point((24, 7), fill=GLOW_W)
    outline(im)
    # the glow over the book and the sparks (drawn after the outline: light has no edge)
    glow = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    g = ImageDraw.Draw(glow)
    g.ellipse((7, 4, 17, 12), fill=GLOW)
    im = Image.alpha_composite(glow, im)
    px = im.load()
    for x, y, col in ((12, 6, GLOW_W), (10, 4, GLOW_L), (15, 3, GLOW_L), (13, 2, GLOW_W), (24, 4, GLOW_L)):
        px[x, y] = col
    im.save(OUT)
    print('wrote', OUT)


if __name__ == '__main__':
    main()
