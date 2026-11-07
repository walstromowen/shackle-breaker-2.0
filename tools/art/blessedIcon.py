# The Blessed status icon (64 x 64, the status sheet's style: dark outline, a few flat shades, sparkles): a glowing golden heart under a halo.
import sys
import numpy as np
from PIL import Image

N = 64
OUT = sys.argv[1]
img = np.zeros((N, N, 4), np.uint8)

OUTLINE = (58, 34, 10, 255)
SHADES = [(176, 98, 18, 255), (226, 150, 38, 255), (250, 196, 78, 255), (255, 232, 150, 255), (255, 251, 226, 255)]
HALO_DARK, HALO_MID, HALO_LIGHT = (196, 128, 24, 255), (246, 196, 64, 255), (255, 240, 170, 255)
SPARK = (255, 236, 120, 255)

def heart(px, py):
    # two round lobes and a point: lobes at (23.5, 31) and (40.5, 31), radius 9.5; the point at (32, 55)
    for (lx, ly) in ((23.5, 31.0), (40.5, 31.0)):
        if (px - lx) ** 2 + (py - ly) ** 2 <= 9.5 ** 2:
            return True
    if 31.0 <= py <= 55.0:
        half = 17.0 * (55.0 - py) / 24.0 + 0.0
        if abs(px - 32) <= half + (2.2 if py < 40 else 0.6):
            return True
    return False

inside = np.zeros((N, N), bool)
for py in range(N):
    for px in range(N):
        inside[py, px] = heart(px + 0.5, py + 0.5)

# shading: light from the upper left, a soft glow in the middle
for py in range(N):
    for px in range(N):
        if not inside[py, px]:
            continue
        lx, ly = (px - 25) / 21.0, (py - 31) / 21.0
        light = 1.0 - (lx * lx + ly * ly) ** 0.5
        if light > 0.78: s = 4
        elif light > 0.55: s = 3
        elif light > 0.25: s = 2
        elif light > -0.05: s = 1
        else: s = 0
        img[py, px] = SHADES[s]

# a small glint
for (gx, gy) in [(21, 28), (22, 28), (21, 29), (23, 27), (20, 30)]:
    img[gy, gx] = (255, 255, 255, 255)

def outline(mask):
    edge = np.zeros_like(mask)
    for py in range(N):
        for px in range(N):
            if mask[py, px]:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                qx, qy = px + dx, py + dy
                if 0 <= qx < N and 0 <= qy < N and mask[qy, qx]:
                    edge[py, px] = True
                    break
    return edge

for py, px in zip(*np.where(outline(inside))):
    img[py, px] = OUTLINE

# the halo: a ring floating over the heart
cx, cy, rx, ry = 32, 10, 12.5, 4.2
ring = np.zeros((N, N), bool)
for py in range(N):
    for px in range(N):
        d = ((px + 0.5 - cx) / rx) ** 2 + ((py + 0.5 - cy) / ry) ** 2
        d_in = ((px + 0.5 - cx) / (rx - 3.2)) ** 2 + ((py + 0.5 - cy) / (ry - 2.2)) ** 2
        if d <= 1.0 and d_in > 1.0:
            ring[py, px] = True
for py, px in zip(*np.where(ring)):
    top = py < cy
    img[py, px] = HALO_LIGHT if (top and abs(px - cx) < 9) else (HALO_MID if top or abs(px - cx) > 8 else HALO_DARK)
for py, px in zip(*np.where(outline(ring))):
    if img[py, px, 3] == 0:
        img[py, px] = OUTLINE

# sparkles (gold plus-signs, like the other glowing icons)
def plus(x, y, r=1):
    for k in range(-r, r + 1):
        for (qx, qy) in ((x + k, y), (x, y + k)):
            if 0 <= qx < N and 0 <= qy < N and img[qy, qx, 3] == 0:
                img[qy, qx] = SPARK
for (x, y, r) in [(7, 25, 2), (57, 26, 2), (10, 47, 1), (54, 47, 1), (51, 15, 1), (12, 14, 1)]:
    plus(x, y, r)

Image.fromarray(img).save(OUT)
print('wrote', OUT)
