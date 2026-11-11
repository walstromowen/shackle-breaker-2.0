# The hunting hawk's overworld sheet, from its battle sheet (frontend/src/assets/sprites/hawk/hawk_portrait.png, 128 px frames; row 4 faces right, its
# 8 wingbeat poses each drawn twice):
#   python3 tools/art/hawkOverworldSheet.py frontend/src/assets/sprites/hawk/hawk_portrait.png frontend/src/assets/sprites/hawk/hawk_sprite.png
# The layout every character sheet has (512 x 768: 8 frames of 64 px, 12 rows: idle, walk, run, each facing S, E, N, W). The hawk is small, about 22 px
# across the wings, and flies above a small shadow on the ground (its bottom on row 54, where everyone's feet are). It bobs with its wingbeat. It has no
# head-on drawing: east is the battle sheet's own right-facing hawk, west the same mirrored, south and north reuse them (a bird is seen side-on
# whichever way it flies).
import sys, math
from PIL import Image, ImageDraw, ImageOps
src, out = sys.argv[1], sys.argv[2]
battle = Image.open(src).convert('RGBA')
F, ROW, SCALE = 128, 4, 0.36
poses = []
for k in range(8):
    fr = battle.crop((k * 2 * F, ROW * F, k * 2 * F + F, ROW * F + F))
    fr = fr.crop(fr.getbbox())
    w, h = max(1, round(fr.width * SCALE)), max(1, round(fr.height * SCALE))
    small = fr.convert('RGBa').resize((w, h), Image.LANCZOS).convert('RGBA')   # premultiplied, so the edges do not go grey
    px = small.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            px[x, y] = (r, g, b, 255) if a >= 110 else (0, 0, 0, 0)
    # a dark rim on the outer pixels, as the battle art has, so the little bird stays crisp on grass
    rim = [(x, y) for y in range(h) for x in range(w) if px[x, y][3] and any(not (0 <= x + dx < w and 0 <= y + dy < h) or px[x + dx, y + dy][3] == 0 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))]
    for x, y in rim:
        r, g, b, a = px[x, y]; px[x, y] = (int(r * 0.45), int(g * 0.4), int(b * 0.38), 255)
    poses.append(small)
sheet = Image.new('RGBA', (512, 768), (0, 0, 0, 0))
CX, BASE = 32, 54                                       # the frame's middle, and the ground row the shadow sits on
def cell(col, row, pose, mirror, lift):
    img = ImageOps.mirror(pose) if mirror else pose
    x0, y0 = col * 64, row * 64
    shadow = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).ellipse([CX - 6, BASE - 2, CX + 6, BASE + 1], fill=(0, 0, 0, 70))
    sheet.alpha_composite(shadow, (x0, y0))
    sheet.alpha_composite(img, (x0 + CX - img.width // 2, y0 + BASE - 12 - lift - img.height))
FACING = {0: False, 1: False, 2: True, 3: True}         # S, E, N, W: mirrored for north and west
for block, bob in ((0, 1.0), (1, 1.5), (2, 2.0)):        # idle, walk, run: the wingbeat lifts it a little more the faster it goes
    for d in range(4):
        for f in range(8):
            lift = round(bob * (1 + math.sin(2 * math.pi * f / 8)))
            cell(f, block * 4 + d, poses[f], FACING[d], lift)
sheet.save(out)
