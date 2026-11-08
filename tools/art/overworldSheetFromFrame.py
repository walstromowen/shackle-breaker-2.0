# Builds an overworld sheet (8 columns x 12 rows of C px frames, the layout every character sheet uses; C = 64 for a person) from ONE front-facing frame,
# for a character who only ever stands facing you (an NPC): every row is that frame; the idle rows breathe (the upper body sinks a pixel for half
# the cycle) and every frame gets the soft shadow oval of the hero sheets (copied from the Warlord's, scaled to the frame).
#   python3 tools/art/overworldSheetFromFrame.py front.png frontend/src/assets/sprites/warlord_hero/warlord_hero_sprite.png out.png [size] [--still] [--fit]
#     size     the frame size in px (default 64). A bigger character (the Infernus Sentinel: 96) is drawn with a matching `character.frame` in its map object.
#     --still  no breathing (a statue)
#     --fit    the input is any size: its drawn pixels are scaled to stand in the frame the way a 64 px hero stands in its own (about 0.82 of the height,
#              feet 9/64 of the way up from the bottom, centred)
import sys
import numpy as np
from PIL import Image

args = [a for a in sys.argv[1:] if not a.startswith('--')]
flags = {a for a in sys.argv[1:] if a.startswith('--')}
src_path, warlord_path, out_path = args[:3]
C = int(args[3]) if len(args) > 3 else 64
src = Image.open(src_path).convert('RGBA')
if '--fit' in flags:
    src = src.crop(src.getbbox())
    h = int(C * 0.82); w = max(1, round(src.width * h / src.height))
    if w > C - 2: w = C - 2; h = max(1, round(src.height * w / src.width))
    src = src.resize((w, h), Image.LANCZOS if max(src.size) > 2 * h else Image.BOX)
    canvas = Image.new('RGBA', (C, C)); feet = C - round(C * 9 / 64)
    canvas.alpha_composite(src, ((C - w) // 2, feet - h))
    src = canvas
base = np.asarray(src).copy()
assert base.shape[0] == C and base.shape[1] == C, f'the frame must be {C} x {C} (or pass --fit)'
war_img = Image.open(warlord_path).convert('RGBA').crop((0, 0, 64, 64))
if C != 64: war_img = war_img.resize((C, C), Image.NEAREST)
war = np.asarray(war_img)

# the shadow: the Warlord's idle-down frame, its translucent pixels plus the opaque ones inside the oval's rows
wf = war
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


still, breath = frame(0), frame(0 if '--still' in flags else 1)
sheet = np.zeros((C * 12, C * 8, 4), np.uint8)
for r in range(12):
    for i in range(8):
        f = breath if (r < 4 and i in (3, 4, 5, 6)) else still
        sheet[r * C:(r + 1) * C, i * C:(i + 1) * C] = f
Image.fromarray(sheet).save(out_path, optimize=True)
print('wrote', out_path)
