# The Brother's Sword's icon (items: brothers_sword), on the weapon sheet beside the Panzerian greatsword it is made from:
#   python3 tools/art/brothersSwordIcon.py frontend/src/assets/icons/weapons.png
# Takes the Panzerian greatsword (64 px cell, col 14 row 0), rimes it with frost (the steel paler and bluer, white flecks along the blade), darkens
# the grip, and hangs a short length of broken black chain from the crossguard. Writes it into col 15 row 0 of the same sheet.
import sys
from PIL import Image, ImageDraw
path = sys.argv[1]
sheet = Image.open(path).convert('RGBA')
C = 64
src = sheet.crop((14 * C, 0, 15 * C, C))
out = src.copy(); px = out.load()
for y in range(C):
    for x in range(C):
        r, g, b, a = px[x, y]
        if not a: continue
        lum = (r + g + b) / 3
        if b >= r and lum > 70:                           # the steel: towards frost
            px[x, y] = (min(255, int(r * 0.80 + 55)), min(255, int(g * 0.85 + 50)), min(255, int(b * 0.85 + 60)), a)
        elif r > b + 20:                                  # the leather grip: darker, colder
            px[x, y] = (int(r * 0.6), int(g * 0.6), int(b * 0.75 + 10), a)
# frost flecks along the blade (only on cells that are already steel)
for (x, y) in [(40, 12), (44, 9), (35, 19), (30, 23), (48, 6), (37, 15), (27, 27), (42, 16)]:
    if px[x, y][3]: px[x, y] = (236, 246, 255, 255)
# a broken chain hanging from the crossguard: three dark links, the last one open
d = ImageDraw.Draw(out)
IRON, HI = (74, 76, 88, 255), (160, 166, 180, 255)
links = [(29, 53), (30, 58), (30, 62)]   # from the end of the crossguard, down
for i, (x, y) in enumerate(links):
    if i % 2 == 0: d.ellipse([x - 2, y - 3, x + 2, y + 3], outline=IRON, width=2)
    else: d.ellipse([x - 3, y - 2, x + 3, y + 2], outline=IRON, width=2)
    d.point((x - 1, y - 2) if i % 2 == 0 else (x - 2, y - 1), fill=HI)
d.line([(31, 62), (33, 63)], fill=(0, 0, 0, 0), width=2)       # the last link, broken open
sheet.paste(out, (15 * C, 0))
sheet.save(path)
