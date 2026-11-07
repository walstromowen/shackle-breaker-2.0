# Builds the Avalancher's overworld sheet (512 x 960: 8 columns x 12 rows of 64 px) in the layout every hero sheet uses:
#   rows 0-3 idle, 4-7 walk, 8-11 run; within each block the facings DOWN, RIGHT, UP, LEFT; 8 frames per row.
# The source has one still frame per direction (8 rotations: S SE E NE N NW W SW); the motion is made procedurally from those four facings,
# and every frame gets the soft shadow oval the other hero sheets have, taken from the Warlord's sheet.
import sys, math
import numpy as np
from PIL import Image

src_path, warlord_path, out_path = sys.argv[1:4]
src = np.asarray(Image.open(src_path).convert('RGBA'))
war = np.asarray(Image.open(warlord_path).convert('RGBA'))
C = 64

# the shadow: the Warlord's idle-down frame, its translucent pixels plus the opaque ones inside the oval's rows, as one mask
wf = war[0:C, 0:C]
shadow = np.zeros((C, C), np.uint8)
for y in range(C):
    semi = np.where((wf[y, :, 3] > 0) & (wf[y, :, 3] < 255))[0]
    if len(semi) == 0:
        continue
    x0, x1 = semi.min(), semi.max()
    for x in range(x0, x1 + 1):
        a = wf[y, x, 3]
        shadow[y, x] = a if 0 < a < 255 else 92
SHADOW_RGB = (8, 6, 10)

FACINGS = {'DOWN': 0, 'RIGHT': 2, 'UP': 4, 'LEFT': 6}   # columns of the source rotations
SIDE = {'RIGHT': 1, 'LEFT': -1}


def figure(col):
    return src[:, col * C:(col + 1) * C].copy()


def bounds(f):
    ys, xs = np.where(f[:, :, 3] > 0)
    return ys.min(), ys.max(), int(round((xs.min() + xs.max()) / 2))


def paste(dst, part, dx, dy):
    """alpha-over `part` (same size as dst, offset by dx, dy)."""
    h, w = part.shape[:2]
    ys, xs = np.where(part[:, :, 3] > 0)
    for y, x in zip(ys, xs):
        ty, tx = y + dy, x + dx
        if 0 <= ty < h and 0 <= tx < w:
            a = part[y, x, 3] / 255.0
            if a >= 1 or dst[ty, tx, 3] == 0:
                dst[ty, tx] = part[y, x]
            else:
                dst[ty, tx, :3] = (part[y, x, :3] * a + dst[ty, tx, :3] * (1 - a)).astype(np.uint8)
                dst[ty, tx, 3] = max(dst[ty, tx, 3], part[y, x, 3])


def make_frame(base, facing, bob=0, breathe=0, lift_l=0, lift_r=0, swing=0, lean=0):
    top, bottom, cx = bounds(base)
    waist = top + int(0.55 * (bottom - top))
    leg_top = bottom - 9
    out = np.zeros_like(base)
    # shadow first, on the ground: it does not bob
    out[:, :, 3] = shadow
    out[:, :, 0], out[:, :, 1], out[:, :, 2] = SHADOW_RGB
    out[shadow == 0] = 0

    body = np.zeros_like(base)
    # legs: each half (left / right of the middle) lifted on its own; side views swing the legs (a shear, more at the feet)
    legs = np.zeros_like(base)
    for y in range(leg_top, bottom + 1):
        k = (y - leg_top) / max(1, bottom - leg_top)
        sx = int(round(swing * k))
        for x in range(C):
            if base[y, x, 3] == 0:
                continue
            lift = lift_l if x < cx else lift_r
            ty, tx = y - lift, x + sx
            if 0 <= ty < C and 0 <= tx < C:
                legs[ty, tx] = base[y, x]
    paste(body, legs, 0, 0)
    # the middle (cloak, hips) stays; the upper body breathes (down a pixel) and leans when running
    mid = base.copy(); mid[:waist] = 0; mid[leg_top:] = 0
    paste(body, mid, 0, 0)
    upper = base.copy(); upper[waist:] = 0
    paste(body, upper, lean, breathe)
    paste(out, body, 0, bob)
    return out


sheet = np.zeros((C * 12, C * 8, 4), np.uint8)
order = ['DOWN', 'RIGHT', 'UP', 'LEFT']
for d, facing in enumerate(order):
    base = figure(FACINGS[facing])
    side = SIDE.get(facing, 0)
    for i in range(8):
        p = i / 8 * 2 * math.pi
        s = math.sin(p)
        # idle: a slow breath (the upper body sinks a pixel for half the cycle)
        idle = make_frame(base, facing, breathe=1 if i in (3, 4, 5, 6) else 0)
        # walk: up a pixel on the passing frames, feet lifted in turn; side views swing the legs instead of lifting halves
        if side:
            walk = make_frame(base, facing, bob=-1 if i in (2, 6) else 0, swing=round(3 * s) * side,
                              lift_l=1 if i in (1, 2, 3, 5, 6, 7) else 0, lift_r=0)
            run = make_frame(base, facing, bob=-1 if i in (1, 2, 3, 5, 6, 7) else 0, swing=round(5 * s) * side, lean=side,
                             lift_l=2 if i in (2, 6) else (1 if i in (1, 3, 5, 7) else 0))
        else:
            walk = make_frame(base, facing, bob=-1 if i in (2, 6) else 0,
                              lift_l=round(2 * max(0, s)), lift_r=round(2 * max(0, -s)))
            run = make_frame(base, facing, bob=-1 if i in (1, 2, 3, 5, 6, 7) else 0, breathe=1 if i in (0, 4) else 0,
                             lift_l=round(3 * max(0, s)), lift_r=round(3 * max(0, -s)))
        for block, fr in ((0, idle), (4, walk), (8, run)):
            r = block + d
            sheet[r * C:(r + 1) * C, i * C:(i + 1) * C] = fr

Image.fromarray(sheet).save(out_path, optimize=True)
print('wrote', out_path, sheet.shape)
