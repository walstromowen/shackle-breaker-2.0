# The hunting hawk's overworld sheet, from the artist's flying hawk: two poses, each one row of 48 px frames for eight directions (S, SE, E, NE, N, NW,
# W, SW): wings spread (tools/art/sources/hawk_flying_idle.png) and wings swept down (tools/art/sources/hawk_flying_wingdown.png).
#   python3 tools/art/hawkOverworldSheet.py tools/art/sources/hawk_flying_idle.png tools/art/sources/hawk_flying_wingdown.png frontend/src/assets/sprites/hawk/hawk_sprite.png
# The layout every character sheet has (512 x 768: 8 frames of 64 px, 12 rows: idle, walk, run, each facing S, E, N, W). Idle, walk and run are the
# same: a slow wingbeat (spread, spread, down, down), the hawk rising a pixel on the downstroke, over a small shadow on the ground (row 54, where
# everyone's feet are). Each 48 px cell is drawn whole at half size, so the two poses keep the artist's alignment and the bird does not jump; it is
# about 23 px across the wings, small beside the party.
import sys, math
from PIL import Image, ImageDraw
spread_src, down_src, out = sys.argv[1], sys.argv[2], sys.argv[3]
C, HALF = 48, 24
DIRS = {0: 0, 1: 2, 2: 4, 3: 6}                         # the sheet's rows S, E, N, W: their columns in the artist's sheets
def shrink(fr):
    small = fr.convert('RGBa').resize((HALF, HALF), Image.LANCZOS).convert('RGBA')   # premultiplied, so the edges do not go grey
    px = small.load()
    for y in range(HALF):
        for x in range(HALF):
            r, g, b, a = px[x, y]
            px[x, y] = (r, g, b, 255) if a >= 110 else (0, 0, 0, 0)
    # a dark rim on the outer pixels, as the full-size art has, so the little bird stays crisp on grass
    rim = [(x, y) for y in range(HALF) for x in range(HALF) if px[x, y][3] and any(not (0 <= x + dx < HALF and 0 <= y + dy < HALF) or px[x + dx, y + dy][3] == 0 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))]
    for x, y in rim:
        r, g, b, a = px[x, y]; px[x, y] = (int(r * 0.45), int(g * 0.4), int(b * 0.38), 255)
    return small
poses = []
for src in (spread_src, down_src):
    art = Image.open(src).convert('RGBA')
    assert art.size == (8 * C, C), art.size
    poses.append({d: shrink(art.crop((col * C, 0, col * C + C, C))) for d, col in DIRS.items()})
sheet = Image.new('RGBA', (512, 768), (0, 0, 0, 0))
CX, BASE, MID = 32, 54, 33                              # the frame's middle, the ground row the shadow sits on, and where the cell's centre flies
def cell(col, row, img, lift):
    x0, y0 = col * 64, row * 64
    shadow = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).ellipse([CX - 6, BASE - 2, CX + 6, BASE + 1], fill=(0, 0, 0, 70))
    sheet.alpha_composite(shadow, (x0, y0))
    sheet.alpha_composite(img, (x0 + CX - HALF // 2, y0 + MID - HALF // 2 - lift))
BEAT = (0, 0, 1, 1, 0, 0, 1, 1)                         # spread, spread, down, down: twice through the 8 frames
for block in range(3):                                  # idle, walk, run: all the same
    for d in range(4):
        for f in range(8):
            cell(f, block * 4 + d, poses[BEAT[f]][d], BEAT[f])
sheet.save(out)
