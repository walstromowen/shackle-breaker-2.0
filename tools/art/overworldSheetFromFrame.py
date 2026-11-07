# Builds an overworld sheet (512 x 960: 8 columns x 12 rows of 64 px, the layout every character sheet uses) from ONE front-facing 64 px frame,
# for a character who only ever stands facing you (an NPC): every row is that frame; the idle rows breathe (the upper body sinks a pixel for half
# the cycle) and every frame gets the soft shadow oval of the hero sheets (copied from the Warlord's).
#   python3 tools/art/overworldSheetFromFrame.py front.png frontend/src/assets/sprites/warlord_hero/warlord_hero_sprite.png out.png
import sys
import numpy as np
from PIL import Image

src_path, warlord_path, out_path = sys.argv[1:4]
C = 64
base = np.asarray(Image.open(src_path).convert('RGBA')).copy()
war = np.asarray(Image.open(warlord_path).convert('RGBA'))

# the shadow: the Warlord's idle-down frame, its translucent pixels plus the opaque ones inside the oval's rows
wf = war[0:C, 0:C]
shadow = np.zeros((C, C), np.uint8)
for y in range(C):
    semi = np.where((wf[y, :, 3] > 0) & (wf[y, :, 3] < 255))[0]
    if len(semi) == 0:
        continue
    for x in range(semi.min(), semi.max() + 1):
        a = wf[y, x, 3]
        shadow[y, x] = a if 0 < a < 255 else 92


def over(dst, part, dy=0):
    ys, xs = np.where(part[:, :, 3] > 0)
    for y, x in zip(ys, xs):
        ty = y + dy
        if 0 <= ty < C:
            dst[ty, x] = part[y, x]


def frame(breathe):
    out = np.zeros((C, C, 4), np.uint8)
    out[shadow > 0] = (8, 6, 10, 0)
    out[:, :, 3] = shadow
    ys = np.where(base[:, :, 3] > 0)[0]
    top, bottom = ys.min(), ys.max()
    waist = top + int(0.55 * (bottom - top))
    lower = base.copy(); lower[:waist] = 0
    upper = base.copy(); upper[waist:] = 0
    over(out, lower)
    over(out, upper, breathe)
    return out


still, breath = frame(0), frame(1)
sheet = np.zeros((C * 12, C * 8, 4), np.uint8)
for r in range(12):
    for i in range(8):
        f = breath if (r < 4 and i in (3, 4, 5, 6)) else still
        sheet[r * C:(r + 1) * C, i * C:(i + 1) * C] = f
Image.fromarray(sheet).save(out_path, optimize=True)
print('wrote', out_path)
