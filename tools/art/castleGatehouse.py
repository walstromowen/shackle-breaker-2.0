# The castle's gatehouse (tilesets/castle_ruins_exterior/castle_gatehouse.png): the great gate over the way in (castleLayout.js: plan.gatehouse),
# between the two gate towers, in the towers' gothic manner and the walls' own stone (the same 16 x 8 blocks on the same 32 px grid).
#
# GW tiles wide (the gate's gap: a pier a cell wide either side of an opening GW - 2 wide), its foot on the wall's outer face. Seen from the south
# and above: its top (a walk between a back parapet and the front battlements, pinnacles at its corners), a projecting parapet on a row of
# machicolations, then its face: a great pointed arch, moulded all round, the portcullis drawn up into it (its iron teeth hanging in the vault's
# dark), arrow slits either side. The whole arch is see-through darkness: a dark shade over the passage (deeper toward the vault) and behind
# the portcullis's bars (only the iron is solid), so whoever walks through is seen in the gate's shadow. Placed at x = gate col * 32, y = (gate row + 1) * 32 - its height; it sorts by the
# row under the gate (gate row + 1), so someone in the passage is drawn first and seen through the opening.
# Closed (castle_gatehouse_closed.png): the portcullis let down to the ground, the same iron grid filling the whole arch, the darkness of the
# passage seen between its bars.
# Inner (castle_gatehouse_inner.png): the inner ward's smaller gate, 4 tiles wide (a pier a cell wide either side of a way two cells wide, over
# the flight up through the inner wall), lower, no arrow slits.
#   python3 castleGatehouse.py <out.png> [closed | inner | inner,closed]
import sys, math
import numpy as np
from PIL import Image
sys.path.insert(0, __import__('os').path.dirname(__import__('os').path.abspath(__file__)))
from walltop import walltop

MODE = (sys.argv[2] if len(sys.argv) > 2 else '').split(',')
CLOSED, INNER = 'closed' in MODE, 'inner' in MODE
GW = 4 if INNER else 6
W, H = GW * 32, (250 if INNER else 330)
STONE = np.array([156, 148, 128], np.float32)
WALK = np.array([138, 134, 120], np.float32)
IRON = np.array([52, 54, 62], np.float32)
VAULT = np.array([24, 21, 20], np.float32)
SHADE = np.array([[1.0, 0.93], [0.96, 1.04], [1.05, 0.95], [0.94, 1.0]], np.float32)
OUT = STONE * 0.34
PALETTE = 48
LX, LY = -0.6, -0.8
FACE0 = 104 if INNER else 128   # the front face's top (the foot of the projecting parapet)
SPRING = H - (64 if INNER else 92)   # where the arch's curve begins
APEX = 48 if INNER else 74          # how far above that its point is
OPEN_TOP = SPRING - (16 if INNER else 20)                  # below this the opening is open (the portcullis's teeth end above it)
OPEN_DARK = (150, 190)           # the passage's darkness (alpha of the shade over it): at the ground, under the portcullis
VAULT_DARK = 200                 # behind the portcullis's bars, deepening to VAULT_DARK + 20 at the crown

def masonry_px(x, y):
    lx, ly = int(x) % 32, (int(y) - (H % 32)) % 32
    row = ly // 8
    sx = (lx + (row % 2) * 8) % 32
    xo, yo = sx % 16, ly % 8
    k = SHADE[row, sx // 16]
    if yo == 0 or xo == 0: return STONE * 0.42
    if yo == 1: return STONE * k * 1.12
    if yo == 7 or xo == 15: return STONE * k * 0.8
    return STONE * k

def gatehouse():
    img = np.zeros((H, W, 4), np.float32)
    shade_a = np.zeros((H, W), np.float32)          # the see-through shade in the opening (alpha), laid on after quantizing
    def put(x, y, c):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < W and 0 <= y < H: img[y, x, :3] = np.clip(c, 0, 255); img[y, x, 3] = 255
    def shade(x, y, k):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < W and 0 <= y < H and img[y, x, 3] > 0: img[y, x, :3] *= k

    # ---------------- the top: a walk between the back parapet and the front battlements ----------------
    BACK, WALK0 = 34, 50
    for y in range(BACK, FACE0):
        for x in range(4, W - 4):
            put(x, y, walltop(x, y - BACK) * (0.9 + 0.1 * (y - BACK) / (FACE0 - BACK)))   # the walls' own flags (walltop.py)
    for x in range(4, W - 4):                     # the back parapet (its inner face toward us, its coping lit), crenellated
        m = (x % 16) < 9
        top = BACK - 12 if m else BACK - 4
        for y in range(top, WALK0):
            c = STONE * (1.3 if y < top + 3 else 0.62 + 0.1 * (y - top) / (WALK0 - top))
            if y == top: c = OUT
            put(x, y, c)
        if m and x % 16 in (0, 8):
            for y in range(top, WALK0 - 2): put(x, y, OUT)
    for x in range(4, W - 4):
        for k, f in enumerate((0.55, 0.7, 0.85)): shade(x, WALK0 + k, f)
    for y in range(BACK - 12, FACE0):             # its sides
        put(4, y, OUT); put(5, y, STONE * 1.25); put(W - 5, y, OUT); put(W - 6, y, STONE * 0.7)
    # pinnacles at the corners of the top
    for px in (2, W - 11):
        lit = px < W / 2
        for y in range(FACE0 - 40, FACE0 - 10):
            for x in range(px, px + 9): put(x, y, STONE * (1.28 if x < px + 3 else (0.6 if x > px + 6 else 1.0)))
            put(px, y, OUT); put(px + 8, y, OUT)
        for t in range(22):
            hw = 4.5 * (1 - t / 22)
            for x in range(int(px + 4.5 - hw), int(px + 4.5 + hw) + 1): put(x, FACE0 - 41 - t, STONE * (1.22 if x < px + 4.5 else 0.66))
        for y in range(FACE0 - 70, FACE0 - 62): put(px + 4, y, STONE * 1.2)

    # ---------------- the front battlements on their machicolations ----------------
    for x in range(0, W):
        m = (x % 16) < 9
        top = FACE0 - 22 if m else FACE0 - 12
        for y in range(top, FACE0):
            c = masonry_px(x, y) * 1.02
            if y < top + 3: c = STONE * 1.36
            elif y == top + 3: c = STONE * 1.08
            put(x, y, c)
        if m and x % 16 in (0, 8):
            for y in range(top, FACE0 - 2): put(x, y, OUT)
        if not m: put(x, top - 1, OUT)
    for x in range(0, W):                         # the machicolations: corbels with the drop-holes between them
        u = x % 12
        for y in range(FACE0, FACE0 + 16):
            if 3 <= u <= 8:
                put(x, y, STONE * (1.22 if u == 3 else (0.66 if u == 8 else 1.0)) * (1.0 - 0.25 * (y - FACE0) / 16))
            else:
                put(x, y, VAULT * 1.4 if y < FACE0 + 10 else masonry_px(x, y) * 0.5)
        put(x, FACE0, STONE * 1.3); put(x, FACE0 + 16, STONE * 0.45)
        for k, f in enumerate((0.55, 0.7, 0.85)): pass

    # ---------------- the face ----------------
    for y in range(FACE0 + 17, H):
        for x in range(W): put(x, y, masonry_px(x, y))
    for x in range(W):
        for k, f in enumerate((0.5, 0.64, 0.8, 0.9)): shade(x, FACE0 + 17 + k, f)
    for y in range(H - 6, H):                      # the plinth
        for x in range(W): put(x, y, STONE * 1.18 if y == H - 6 else (STONE * 0.55 if y == H - 5 else masonry_px(x, y) * 0.82))
    # arrow slits in the piers' upper part
    for cx in (() if INNER else (16, W - 16)):
        for y in range(FACE0 + 30, FACE0 + 58):
            t = y - (FACE0 + 30)
            hw = 1.5 if t > 3 else 0.5 + t * 0.35
            for x in range(cx - 5, cx + 6):
                d = abs(x + 0.5 - cx)
                if d <= hw: put(x, y, VAULT)
                elif d <= hw + 1.5: put(x, y, STONE * (0.55 if x < cx else 1.2))
                elif d <= hw + 2.8: put(x, y, STONE * (1.3 if x < cx else 0.62))
        for x in range(cx - 5, cx + 6): put(x, FACE0 + 58, STONE * 1.25); put(x, FACE0 + 59, STONE * 0.45)
    # the great arch: two-centred, its opening the gap less a pier each side, springing low, moulded all round evenly
    x0, x1 = 32, W - 32
    half, cx = (x1 - x0) / 2, W / 2
    off = (APEX * APEX - half * half) / (2 * half); rad = half + off
    def field(x, y):
        px, py = x + 0.5 - cx, y + 0.5 - SPRING
        if py >= 0: return half - abs(px), ((-1.0 if px < 0 else 1.0), 0.0)
        ccx = off if px < 0 else -off
        dx, dy = px - ccx, py
        r = math.hypot(dx, dy) or 1e-6
        return rad - r, (dx / r, dy / r)
    lit = lambda n, k=0.4: 1.0 + k * (n[0] * LX + n[1] * LY)
    for y in range(int(SPRING - APEX) - 22, H):
        for x in range(int(x0 - 22), int(x1 + 22)):
            dist, n = field(x, y)
            if dist >= 0:
                if y >= OPEN_TOP and not CLOSED:    # the opening: see-through, the passage's shade deepening up into the vault
                    img[y, x] = 0
                    t = (y - OPEN_TOP) / (H - OPEN_TOP)
                    shade_a[y, x] = OPEN_DARK[1] - (OPEN_DARK[1] - OPEN_DARK[0]) * t ** 0.9
                    if dist < 6: shade_a[y, x] = min(225, shade_a[y, x] + 35 * (1 - dist / 6))   # darker against the reveal
                else:                               # the vault's dark (see-through too, a little deeper), the portcullis drawn up into it
                    gx, gy = (x - x0) % 14, (y - int(SPRING - APEX)) % 14
                    if gx < 3 or gy < 3:            # its iron grid, lit on the upper left of each bar
                        put(x, y, IRON * (1.45 if (gx == 0 or gy == 0) else (0.75 if (gx == 2 or gy == 2) else 1.0)))
                    else:
                        img[y, x] = 0
                        t = (y - (SPRING - APEX)) / (OPEN_TOP - (SPRING - APEX))
                        shade_a[y, x] = VAULT_DARK + 20 * (1 - t) if t <= 1 else OPEN_DARK[1] - (OPEN_DARK[1] - OPEN_DARK[0]) * ((y - OPEN_TOP) / (H - OPEN_TOP)) ** 0.9
                continue
            if dist >= -5: put(x, y, masonry_px(x, y) * (0.5 + 0.55 * max(0.0, -(n[0] * LX + n[1] * LY))))   # the reveal
            elif dist >= -9: put(x, y, STONE * 1.12 * lit(n))                 # the inner order of the moulding
            elif dist >= -10.5: put(x, y, STONE * 0.5 * lit(n, 0.2))
            elif dist >= -14: put(x, y, STONE * 1.18 * lit(n))                # the outer order
            elif dist >= -15.5: put(x, y, OUT)
            elif -21 <= dist < -16.5 and y < SPRING + 6: put(x, y, STONE * (1.24 * lit(n) if dist > -18.5 else 0.5))   # the hood
    # the portcullis's teeth: each bar running down below the grid's last rail to a point, hanging over the open way
    for bx in range(int(x0) + 1, int(x1) - 1, 14):
        if CLOSED: break                            # (let down, its teeth are in the ground)
        for y in range(OPEN_TOP - 2, OPEN_TOP + 9):
            t = y - (OPEN_TOP - 2)
            w = 3 if t < 6 else (2 if t < 9 else 1)
            for x in range(bx, bx + w):
                d, _ = field(x, y)
                if d > 1: put(x, y, IRON * (1.45 if x == bx else 0.85)); shade_a[y, x] = 0
    # the reveal's shadow inside the left pier's edge and the hood's shadow under it
    # the piers' feet darker, the face darker toward the ground
    a = img[..., 3] > 0
    ys, xs = np.mgrid[0:H, 0:W]
    face = a & (ys > FACE0 + 16)
    img[face, :3] *= (0.92 - 0.2 * np.clip((ys[face] - FACE0) / (H - FACE0), 0, 1) ** 1.4)[:, None]
    img[face, :3] *= (1.03 - 0.08 * xs[face] / W)[:, None]
    top = a & (ys < FACE0)
    edge = a & ~(np.roll(a, 1, 0) & np.roll(a, -1, 0) & np.roll(a, 1, 1) & np.roll(a, -1, 1))
    edge[-1, :] = False
    img[edge, :3] = OUT
    return img, shade_a

img, sh = gatehouse()
rgba = np.clip(img, 0, 255).astype(np.uint8)
alpha = rgba[..., 3].copy()
q = Image.fromarray(rgba[..., :3], 'RGB').quantize(colors=PALETTE, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
out = np.dstack([np.asarray(q), np.where(alpha > 0, 255, 0).astype(np.uint8)])
m = (alpha == 0) & (sh > 0)
out[m, :3] = np.array([16, 13, 12], np.uint8)
out[m, 3] = np.clip(sh[m], 0, 255).astype(np.uint8)
Image.fromarray(out, 'RGBA').save(sys.argv[1], optimize=True)
print('ok', out.shape)
