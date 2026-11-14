# Placeholder pictures for the desert's hazards (story/encounters/desertHazards.js), one 128 px picture each, until they have real art:
#   python3 tools/art/desertHazards.py frontend/src/assets/icons/encounters
#   quicksand.png   dunes under a hot sky, a pit of sand swirling down, a hand and a pack strap at its heart
#   cyclone.png     a dark sandstorm sky, a funnel of sand from ground to cloud, lightning in its heart, something glinting in its wall
import sys, os, math, random
from PIL import Image, ImageDraw, ImageFilter
out = sys.argv[1]
W = 128

def sky(top, bottom):
    im = Image.new('RGBA', (W, W))
    d = ImageDraw.Draw(im)
    for y in range(W):
        t = y / (W - 1)
        d.line([0, y, W, y], fill=tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)) + (255,))
    return im

def dunes(d, y0, light, dark):
    for k, (amp, ph, off) in enumerate([(5, 0.3, 0), (7, 1.7, 14), (6, 2.9, 30)]):
        pts = [(x, y0 + off + amp * math.sin(x / 18 + ph)) for x in range(0, W + 4, 4)]
        d.polygon(pts + [(W, W), (0, W)], fill=light if k % 2 == 0 else dark)

def quicksand():
    im = sky((236, 196, 128), (250, 226, 170))
    d = ImageDraw.Draw(im)
    d.ellipse([92, 10, 116, 34], fill=(255, 246, 210, 255))   # a hot sun
    dunes(d, 52, (220, 180, 112, 255), (200, 158, 94, 255))
    # the pit: rings of darker sand drawn in toward its heart
    cx, cy = 62, 98
    for i in range(9, 0, -1):
        rx, ry = 6 + i * 5, 2 + i * 2
        c = 150 + i * 8
        d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=(c, int(c * 0.78), int(c * 0.5), 255))
    for i in range(1, 9, 2):
        rx, ry = 6 + i * 5, 2 + i * 2
        d.arc([cx - rx, cy - ry, cx + rx, cy + ry], 200 + i * 20, 320 + i * 20, fill=(236, 204, 140, 255), width=1)
    # a reaching hand, and the strap of a pack, at its heart
    d.line([cx - 4, cy, cx - 6, cy - 12], fill=(150, 104, 80, 255), width=3)
    for dx in (-9, -7, -5, -3):
        d.line([cx - 6, cy - 12, cx + dx, cy - 17], fill=(150, 104, 80, 255), width=1)
    d.arc([cx + 2, cy - 6, cx + 14, cy + 4], 180, 360, fill=(96, 62, 36, 255), width=2)
    return im

def cyclone():
    random.seed(7)
    im = sky((70, 52, 40), (168, 128, 82))
    d = ImageDraw.Draw(im)
    dunes(d, 92, (176, 136, 84, 255), (150, 112, 68, 255))
    # the funnel: stacked ellipses, wide at the cloud, narrow at the ground, wavering
    for i in range(46):
        t = i / 45
        y = 10 + t * 98
        rx = 34 * (1 - t) ** 1.3 + 5
        cx = 64 + 8 * math.sin(t * 5.5)
        shade = int(120 + 60 * (1 - t))
        d.ellipse([cx - rx, y - 4, cx + rx, y + 4], fill=(shade, int(shade * 0.78), int(shade * 0.55), 200), outline=(90, 66, 46, 220))
    # lightning in its heart
    pts, x, y = [], 60, 26
    for _ in range(6):
        pts.append((x, y)); x += random.choice((-5, 5)); y += 9
    d.line(pts, fill=(250, 250, 200, 255), width=2)
    d.line(pts, fill=(170, 220, 255, 255), width=1)
    # something glinting, caught in its wall
    gx, gy = 80, 46
    d.polygon([(gx, gy - 5), (gx + 3, gy), (gx, gy + 5), (gx - 3, gy)], fill=(140, 220, 200, 255), outline=(30, 40, 40, 255))
    d.line([gx - 7, gy, gx + 7, gy], fill=(255, 255, 230, 200)); d.line([gx, gy - 8, gx, gy + 8], fill=(255, 255, 230, 200))
    # blowing sand
    for _ in range(140):
        sx, sy = random.randint(0, W - 1), random.randint(0, W - 1)
        d.line([sx, sy, sx + 4, sy + 1], fill=(222, 186, 130, random.randint(60, 140)))
    return im

os.makedirs(out, exist_ok=True)
quicksand().save(os.path.join(out, 'quicksand.png'))
cyclone().save(os.path.join(out, 'cyclone.png'))
