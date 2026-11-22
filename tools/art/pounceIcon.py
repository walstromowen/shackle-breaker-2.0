"""
tools/art/pounceIcon.py
The Pounce ability's icon (abilityDefinitions: pounce), drawn into frontend/src/assets/icons/abilities.png at cell (12, 2), in the beasts' row next to
Bite: a big paw coming down, speed lines behind it and a burst where it lands. Hard-edged with a dark outline, like the other icons.

    python3 tools/art/pounceIcon.py
"""
from pathlib import Path
from PIL import Image, ImageDraw

SHEET = Path(__file__).resolve().parents[2] / 'frontend/src/assets/icons/abilities.png'
CELL = (12, 2)


def c(h, a=255):
    h = h.lstrip('#')
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


OUT, FUR, FUR_L, PAD, PAD_L, CLAW, LINE, BURST, BURST_L = (c('#1b1410'), c('#8a6440'), c('#b98d5c'), c('#3a2a22'), c('#5c443a'),
                                                           c('#eee6d6'), c('#d9cfc0'), c('#f0c04a'), c('#fff2b0'))


def outline(im):
    px = im.load()
    w, h = im.size
    rim = [(x, y) for y in range(h) for x in range(w) if px[x, y][3] == 0 and any(
        0 <= x + dx < w and 0 <= y + dy < h and px[x + dx, y + dy][3] > 0 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))]
    for p in rim:
        px[p] = OUT


def main():
    icon = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(icon)
    # the burst where it lands (under the paw)
    star = [(48, 40), (56, 44), (49, 47), (58, 54), (47, 51), (49, 60), (42, 53), (36, 58), (37, 50), (30, 50), (37, 45), (33, 40), (41, 43)]
    d.polygon(star, fill=BURST)
    d.polygon([(44, 46), (50, 48), (45, 52), (41, 50)], fill=BURST_L)
    # speed lines from the upper left
    for (x0, y0, x1, y1) in ((4, 10, 16, 16), (2, 20, 14, 25), (8, 3, 20, 9)):
        d.line((x0, y0, x1, y1), fill=LINE, width=2)
    # the paw: a broad leg coming in from the top left, the pad and four toes
    d.polygon([(10, 14), (22, 6), (38, 26), (28, 36)], fill=FUR)
    d.line((22, 6, 38, 26), fill=FUR_L, width=2)
    d.ellipse((24, 24, 46, 44), fill=FUR)
    d.ellipse((30, 31, 42, 41), fill=PAD)
    d.point((33, 33), fill=PAD_L)
    for (x, y) in ((22, 22), (27, 17), (34, 17), (41, 22)):
        d.ellipse((x + 2, y + 2, x + 8, y + 8), fill=PAD)
    # claws
    for (x0, y0, x1, y1) in ((24, 26, 21, 31), (30, 21, 29, 26), (37, 21, 38, 26), (44, 26, 47, 30)):
        d.line((x0, y0, x1, y1), fill=CLAW, width=2)
    outline(icon)
    sheet = Image.open(SHEET).convert('RGBA')
    x, y = CELL[0] * 64, CELL[1] * 64
    sheet.paste(Image.new('RGBA', (64, 64), (0, 0, 0, 0)), (x, y))
    sheet.alpha_composite(icon, (x, y))
    sheet.save(SHEET, optimize=True)
    print('drew pounce at', CELL)


if __name__ == '__main__':
    main()
