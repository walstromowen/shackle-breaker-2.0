# The hunting hawk's overworld sheet, from the artist's flying hawk (tools/art/sources/hawk_flying_idle.png: one row of 48 px frames, one for each of
# eight directions: S, SE, E, NE, N, NW, W, SW):
#   python3 tools/art/hawkOverworldSheet.py tools/art/sources/hawk_flying_idle.png frontend/src/assets/sprites/hawk/hawk_sprite.png
# The layout every character sheet has (512 x 768: 8 frames of 64 px, 12 rows: idle, walk, run, each facing S, E, N, W). Idle, walk and run are the
# same: the hawk glides whatever the party does, hovering a pixel or two over a small shadow on the ground (its bottom on row 54, where everyone's feet
# are). It is drawn at half size, about 23 px across the wings, so it stays small beside the party.
import sys, math
from PIL import Image, ImageDraw
src, out = sys.argv[1], sys.argv[2]
art = Image.open(src).convert('RGBA')
C, SCALE = 48, 0.5
DIRS = {0: 0, 1: 2, 2: 4, 3: 6}                         # the sheet's rows S, E, N, W: their columns in the artist's sheet
poses = {}
for d, col in DIRS.items():
    fr = art.crop((col * C, 0, col * C + C, C))
    fr = fr.crop(fr.getbbox())
    w, h = max(1, round(fr.width * SCALE)), max(1, round(fr.height * SCALE))
    small = fr.convert('RGBa').resize((w, h), Image.LANCZOS).convert('RGBA')   # premultiplied, so the edges do not go grey
    px = small.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            px[x, y] = (r, g, b, 255) if a >= 110 else (0, 0, 0, 0)
    # a dark rim on the outer pixels, as the full-size art has, so the little bird stays crisp on grass
    rim = [(x, y) for y in range(h) for x in range(w) if px[x, y][3] and any(not (0 <= x + dx < w and 0 <= y + dy < h) or px[x + dx, y + dy][3] == 0 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))]
    for x, y in rim:
        r, g, b, a = px[x, y]; px[x, y] = (int(r * 0.45), int(g * 0.4), int(b * 0.38), 255)
    poses[d] = small
sheet = Image.new('RGBA', (512, 768), (0, 0, 0, 0))
CX, BASE = 32, 54                                       # the frame's middle, and the ground row the shadow sits on
def cell(col, row, img, lift):
    x0, y0 = col * 64, row * 64
    shadow = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).ellipse([CX - 6, BASE - 2, CX + 6, BASE + 1], fill=(0, 0, 0, 70))
    sheet.alpha_composite(shadow, (x0, y0))
    sheet.alpha_composite(img, (x0 + CX - img.width // 2, y0 + BASE - 12 - lift - img.height))
for block in range(3):                                  # idle, walk, run: all the same
    for d in range(4):
        for f in range(8):
            cell(f, block * 4 + d, poses[d], round(1 + math.sin(2 * math.pi * f / 8)))   # a gentle hover
sheet.save(out)
