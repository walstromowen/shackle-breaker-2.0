# Stand-in battle sheets for the castle grounds' two new foes, until they have real art: each made from the Madman's sheet (its 32-frame loops, front
# and back), so they breathe and sway as he does.
#   python3 tools/art/castleFoesPlaceholder.py frontend/src/assets
# writes, in the layout every battle sheet has (128 px frames, 16 to a row; rows 0-1 the loop seen across the field, rows 4-5 the one on the
# party's side, 8 rows in all):
#   sprites/executioner/executioner_portrait.png   the Executioner: the Madman made burlier, his rags darkened to black leather, a black pointed
#                                                  hood with two ember eyes, a headsman's axe resting head-down beside him
#   sprites/abductor/abductor_portrait.png         the Abductor: the Madman drawn thin and gaunt, his skin grey, a bulging burlap sack slung
#                                                  behind his shoulder by a rope
import sys, os
import numpy as np
from PIL import Image

ROOT = sys.argv[1]
SRC = Image.open(os.path.join(ROOT, 'sprites/madman/madman_portrait.png')).convert('RGBA')
F = 128
OUTLINE = np.array([22, 16, 14], np.float32)

def frames():
    """(row, col, front?) for every frame of the two loops"""
    for base, front in ((0, True), (4, False)):
        for f in range(32):
            yield base + f // 16, f % 16, front

def bbox(a):
    ys, xs = np.nonzero(a[..., 3] > 0)
    return xs.min(), ys.min(), xs.max(), ys.max()

def rescale(img, sx, sy):
    """scale a frame about its bottom centre (nearest, so the pixels stay pixels)"""
    w, h = img.size
    big = img.resize((max(1, round(w * sx)), max(1, round(h * sy))), Image.NEAREST)
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    out.alpha_composite(big, ((w - big.size[0]) // 2, h - big.size[1]) if big.size[1] <= h else ((w - big.size[0]) // 2, 0),
                        (0, 0, big.size[0], big.size[1]) if big.size[1] <= h else (0, big.size[1] - h, big.size[0], big.size[1]))
    return out

def put(a, x, y, c):
    x, y = int(round(x)), int(round(y))
    if 0 <= x < F and 0 <= y < F:
        a[y, x, :3] = np.clip(c, 0, 255); a[y, x, 3] = 255

def skin_mask(a):
    r, g, b = [a[..., k].astype(np.float32) for k in range(3)]
    mx = np.maximum(np.maximum(r, g), b); mn = np.minimum(np.minimum(r, g), b)
    return (a[..., 3] > 0) & (r > g) & (g > b) & (mx > 95) & ((mx - mn) / np.maximum(mx, 1) > 0.18) & ((mx - mn) / np.maximum(mx, 1) < 0.55)

# ---------------- the Executioner ----------------
def executioner(img, front):
    img = rescale(img, 1.12, 1.0)                             # broader (the frame has no room above the head for taller)
    a = np.asarray(img).astype(np.float32).copy()
    op = a[..., 3] > 0
    skin = skin_mask(a)
    cloth = op & ~skin
    lum = a[..., :3].mean(axis=2)
    # rags to black leather (a little warm), skin left as it is but duller
    a[cloth, :3] = (lum[cloth, None] * np.array([0.42, 0.36, 0.34])) + np.array([10, 6, 6])
    a[skin, :3] *= 0.86
    x0, y0, x1, y1 = bbox(a)
    # the hood: over every pixel of the head (its own outline, a cell wider), flaring onto the shoulders
    HEAD = 24
    rows = {}
    for y in range(y0, min(F, y0 + HEAD + 6)):
        xs = np.nonzero(op[y])[0]
        if y < y0 + HEAD:
            xs = xs[np.abs(xs - np.median(np.nonzero(op[y0:y0 + 8].any(axis=0))[0])) < 15] if len(xs) else xs
        if len(xs): rows[y] = (xs.min(), xs.max())
    hx = np.median([(l + r) / 2 for l, r in rows.values()]) if rows else (x0 + x1) / 2
    for y, (l, r) in rows.items():
        t = (y - y0) / HEAD
        if t > 1:                                             # the cape over the shoulders
            l, r = hx - 13 - 2 * (t - 1) * 10, hx + 13 + 2 * (t - 1) * 10
        else:
            l, r = min(l, hx - 6) - 1, max(r, hx + 6) + 1
        for x in range(int(l) - 1, int(r) + 2):
            edge = x < l or x > r
            if t > 1 and not op[y, min(F - 1, max(0, x))] and not edge: continue
            if edge:
                if t <= 1 or op[y, min(F - 1, max(0, x))]: put(a, x, y, OUTLINE)
            else:
                k = 0.8 + 0.4 * max(0.0, 1 - abs(x + 0.5 - hx) / 14) * (1 if x < hx else 0.6)
                put(a, x, y, np.array([32, 27, 29]) * k)
    if front:   # the eyes: two embers in slits
        ey = y0 + 10
        for ex in (hx - 4, hx + 3):
            for dx in (0, 1):
                put(a, ex + dx, ey, (210, 70, 34)); put(a, ex + dx, ey - 1, (120, 28, 18))
            put(a, ex - 1, ey, (60, 14, 10)); put(a, ex + 2, ey, (60, 14, 10))
    # the axe, resting head-down beside him: the haft from his hand to the ground, the broad blade on the ground turned outward
    side = 1 if front else -1
    ax = (x1 + 3) if side > 0 else (x0 - 3)
    ax = int(min(F - 24, max(23, ax)))
    htop, hbot = y0 + 44, y1 - 1
    for y in range(htop, hbot + 1):
        for k, c in enumerate(((44, 30, 20), (110, 76, 46), (80, 54, 33), (44, 30, 20))):
            put(a, ax - 1 + k, y, c)
    for k in range(-1, 3): put(a, ax + k, htop - 1, OUTLINE)
    by1, by0 = hbot + 1, hbot - 25                            # the blade, its edge down on the ground
    for y in range(by0, by1):
        t = (y - by0) / (by1 - by0)
        reach = 6 + 13 * (1 - (2 * t - 1) ** 2)
        for i in range(2, int(reach) + 2):
            c = (208, 208, 214) if i >= reach else ((150, 150, 158) if i < reach - 3 else (178, 178, 186))
            if i == 2: c = (62, 62, 68)
            put(a, ax + side * i, y, c)
        put(a, ax + side * (int(reach) + 2), y, OUTLINE)
    for y in (by0 - 1, by1):
        for i in range(2, 9): put(a, ax + side * i, y, OUTLINE)
    for y in range(by0 + 9, by0 + 13):                        # a notch, and old blood dried on the edge
        put(a, ax + side * 16, y, (96, 38, 32)); put(a, ax + side * 17, y, OUTLINE)
    for y in range(by0 + 14, by0 + 20): put(a, ax + side * 17, y, (120, 44, 36))
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGBA')

# ---------------- the Abductor ----------------
def abductor(img, front):
    img = rescale(img, 0.86, 1.0)                             # drawn thin (gaunt: the frame has no room for taller)
    body = np.asarray(img).astype(np.float32).copy()
    op = body[..., 3] > 0
    lum = body[..., :3].mean(axis=2)
    skin = skin_mask(body)
    # grey, sickly skin; the rags drained toward a cold grey-brown
    body[skin, :3] = lum[skin, None] * np.array([0.86, 0.9, 0.92]) + np.array([4, 8, 10])
    rest = op & ~skin
    body[rest, :3] = body[rest, :3] * 0.55 + lum[rest, None] * np.array([0.4, 0.38, 0.36])
    x0, y0, x1, y1 = bbox(body)
    cx = (x0 + x1) / 2
    # the sack: behind his shoulder (in front of him from behind), a bulging burlap bag, its neck tied with rope
    sack = np.zeros_like(body)
    side = 1 if front else -1
    scx, scy, rx, ry = cx + side * 17, y0 + 26, 17, 20
    for y in range(int(scy - ry - 2), int(scy + ry + 3)):
        for x in range(int(scx - rx - 2), int(scx + rx + 3)):
            dx, dy = (x + 0.5 - scx) / rx, (y + 0.5 - scy) / ry
            lump = 0.08 * np.sin(x * 0.7) * np.cos(y * 0.5)
            d = dx * dx + dy * dy - lump
            if d <= 1:
                shade = 0.8 + 0.35 * (-dx * 0.6 - dy * 0.8)
                weave = 0.92 if (x + y) % 3 == 0 else (1.06 if (x - y) % 4 == 0 else 1.0)
                put(sack, x, y, np.array([150, 120, 82]) * shade * weave)
            elif d <= 1.15:
                put(sack, x, y, OUTLINE)
    # a dark stain seeping through its bottom
    for y in range(int(scy + ry * 0.4), int(scy + ry)):
        for x in range(int(scx - 6), int(scx + 7)):
            if sack[y, x, 3] > 0 and (x * 7 + y * 3) % 5 < 3: sack[y, x, :3] = sack[y, x, :3] * np.array([0.55, 0.34, 0.3])
    # its neck, tied off, and the rope over his shoulder
    nx, ny = scx - side * 10, scy - ry - 1
    for k in range(5):
        for j in range(4): put(sack, nx - 2 + j, ny - k, (128, 100, 66) if j in (1, 2) else OUTLINE)
    for y in range(int(ny) - 1, int(ny) + 2):
        for x in range(int(nx) - 3, int(nx) + 4): put(sack, x, y, (96, 78, 52))
    out = np.zeros_like(body)
    first, second = (sack, body) if front else (body, sack)
    for layer in (first, second):
        m = layer[..., 3] > 0
        out[m] = layer[m]
    if front:   # the rope across his chest to the far shoulder, over him
        sx0, sy0, sx1, sy1 = nx, ny, cx - side * 9, y0 + 30
        for t in np.linspace(0, 1, 60):
            x, y = sx0 + (sx1 - sx0) * t, sy0 + (sy1 - sy0) * t + 6 * np.sin(np.pi * t)
            put(out, x, y, (120, 96, 62)); put(out, x, y + 1, (70, 56, 36))
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), 'RGBA')

def sheet(fn):
    s = Image.new('RGBA', SRC.size, (0, 0, 0, 0))
    for row, col, front in frames():
        fr = SRC.crop((col * F, row * F, (col + 1) * F, (row + 1) * F))
        s.alpha_composite(fn(fr, front), (col * F, row * F))
    return s

for name, fn in (('executioner', executioner), ('abductor', abductor)):
    d = os.path.join(ROOT, 'sprites', name)
    os.makedirs(d, exist_ok=True)
    sheet(fn).save(os.path.join(d, f'{name}_portrait.png'), optimize=True)
    print('ok', name)
