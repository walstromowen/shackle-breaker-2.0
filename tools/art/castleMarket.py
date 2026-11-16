# The castle town's market (castleLayout.js: plan.markets): wooden shop stands and wheelbarrows, abandoned like the rest of the town. In the
# game's 3/4 view, light from the upper left, the soft ground shadow the houses have.
#   objMarketStall1..3   3 x 3 tiles (96 x 96): four posts, a counter of planks with goods on it, a striped canvas awning on top, faded and
#                        torn; 1 baskets of produce long gone over, 2 crocks and jars, 3 bolts of cloth and sacks (its awning half fallen)
#   objMarketStallBack   3 x 3: a stand seen from behind (the square's south side, its counter facing north)
#   objMarketStallSideE/W  2 x 3: a stand seen from its side, its counter facing east (on the square's west side) or west
#   objWheelbarrow1..3   2 x 2 tiles (its body in the bottom row): a barrow in 3/4 view, 1 heaped with stones, 2 a load of sacks, 3 empty, tipped up
#   objMarketWell        2 x 3: the square's well, its roof, windlass and bucket
#   python3 castleMarket.py <out dir>
import sys, os, math, random
import numpy as np
from PIL import Image

WOOD = np.array([118, 84, 54], np.float32)
WOOD_D = np.array([84, 58, 38], np.float32)
IRON = np.array([62, 62, 66], np.float32)
STONE = np.array([150, 144, 128], np.float32)
OUT = np.array([36, 28, 22], np.float32)
CANVAS = [np.array(c, np.float32) for c in [(150, 70, 58), (196, 178, 140)]]          # a faded red and an old cream
CANVAS2 = [np.array(c, np.float32) for c in [(70, 92, 120), (190, 176, 140)]]         # a faded blue
CANVAS3 = [np.array(c, np.float32) for c in [(150, 120, 60), (110, 84, 54)]]          # ochre and brown
PALETTE = 64

def grain(x, y, k=1.0, vertical=False, seed=0):
    """a plank's wood: streaks running along it (wavering), a knot now and then, a little variation from plank to plank"""
    u, v = (y, x) if vertical else (x, y)                 # u along the plank, v across it
    plank = (v // 6) if not vertical else (v // 8)
    w = 0.5 + 0.5 * math.sin(v * 2.1 + math.sin(u * 0.11 + plank * 1.7 + seed) * 2.2)
    c = WOOD * (0.86 + 0.16 * w) * (0.94 + 0.08 * ((plank * 37 + seed) % 5) / 4)
    kx, ky = (plank * 29 + seed * 7) % 41, (plank * 13 + seed) % 6
    if (plank * 7 + seed) % 4 == 0 and abs(u % 53 - kx) < 2 and abs(v % 6 - ky) < 1.2: c = WOOD_D * 0.8   # a knot, here and there
    return c * k

def finish(img, path, shadow=True):
    H, W = img.shape[:2]
    a = img[..., 3] > 0
    edge = a & ~(np.roll(a, 1, 0) & np.roll(a, -1, 0) & np.roll(a, 1, 1) & np.roll(a, -1, 1))
    img[edge, :3] = img[edge, :3] * 0.35 + OUT * 0.65
    rgba = np.clip(img, 0, 255).astype(np.uint8)
    alpha = rgba[..., 3].copy()
    q = Image.fromarray(rgba[..., :3], 'RGB').quantize(colors=PALETTE, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
    out = np.dstack([np.asarray(q), np.where(alpha > 0, 255, 0).astype(np.uint8)])
    if shadow:                                       # the ground shadow (the houses'): soft, to the right and a little down
        SH = np.array([14, 11, 10], np.uint8)
        for y in range(H - 9, H):
            for x in range(W):
                if out[y, x, 3]: continue
                t = (y - (H - 9)) / 8
                k = 0.85 if 6 <= x < W - 4 else 0.35
                al = int(150 * k * t ** 1.2)
                if al > 8: out[y, x] = [*SH, al]
    Image.fromarray(out, 'RGBA').save(path, optimize=True)

def stall(kind, seed):
    """a shop stand in 3/4 view: a canvas awning sloping down toward us (its top seen, each stripe bellied between the ribs, its scalloped
    valance hanging at the front), the stand's back boards in the awning's shade, the end boards seen as slivers (the left lit, the right in
    shade), a counter whose plank top recedes from a lit front lip, its front of upright boards, round posts at the corners, the goods on the
    counter each with its highlight and its shadow, the awning's shadow across the back of the counter"""
    rng = random.Random(seed)
    W = H = 96
    img = np.zeros((H, W, 4), np.float32)
    def put(x, y, c):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < W and 0 <= y < H: img[y, x, :3] = np.clip(c, 0, 255); img[y, x, 3] = 255
    def mul(x, y, k):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < W and 0 <= y < H and img[y, x, 3] > 0: img[y, x, :3] *= k
    def wood(x, y, k=1.0, grain=0):
        g = ((x * 7 + y * 3 + grain * 5) % 9) / 8
        return WOOD * (0.9 + 0.12 * g) * k
    stripes = {1: CANVAS, 2: CANVAS2, 3: CANVAS3}[kind]
    L, R = 7, W - 8                                   # the stand's front corners (the front posts' outer edges)
    BL, BR = 11, W - 12                               # its back corners, a little in (they're further away)
    AW_T, AW_B = 4, 30                                 # the awning's back rail and its front edge
    VAL = 8                                           # the valance's drop
    BACK0, CT0, CT1, FOOT = AW_B + VAL - 2, 56, 66, H - 4   # the back boards' top, the counter top's back and front edges, the ground

    # the back boards: an upright wall of planks behind the counter, in the awning's shade
    for y in range(BACK0, CT0 + 1):
        for x in range(BL, BR):
            c = wood(x, y, 0.62, grain=x // 7)
            if (x - BL) % 7 == 0: c = c * 0.7
            put(x, y, c)
    for x in range(BL, BR):                           # a shelf on it, a few things on the shelf
        put(x, BACK0 + 8, WOOD * 0.95); put(x, BACK0 + 9, WOOD_D * 0.55)
    for i in range(5):
        sx = BL + 6 + i * 15 + rng.randint(-2, 2)
        h = rng.randint(3, 6)
        for y in range(BACK0 + 8 - h, BACK0 + 8):
            for x in range(sx, sx + 4): put(x, y, (np.array([120, 92, 70], np.float32) if i % 2 else np.array([110, 110, 104], np.float32)) * (1.1 if x == sx else 0.75))
    # the end boards, seen edge on past the posts: the left lit, the right in shade
    for y in range(BACK0, CT1):
        for x in range(L, BL): put(x, y, wood(x, y, 1.08))
        for x in range(BR, R): put(x, y, wood(x, y, 0.55))
    # the counter top: planks across, receding from the lit front lip to the shaded back
    for y in range(CT0, CT1):
        t = (y - CT0) / (CT1 - CT0)
        x0, x1 = BL + (L - BL) * t, BR + (R - BR) * t
        for x in range(int(x0), int(x1) + 1):
            c = wood(x, y, 0.78 + 0.32 * t, grain=y // 2)
            if (y - CT0) % 3 == 0: c = c * 0.8
            put(x, y, c)
    for x in range(L, R): put(x, CT1, WOOD * 1.38); put(x, CT1 + 1, WOOD * 1.1)     # the front lip, catching the light
    # the counter's front: upright boards, a rail across, darker toward the ground, the ground's gloom at its foot
    for y in range(CT1 + 2, FOOT):
        t = (y - CT1) / (FOOT - CT1)
        for x in range(L, R):
            c = wood(x, y, 0.86 - 0.3 * t, grain=x // 8)
            u = (x - L) % 9
            if u == 0: c = c * 0.6
            elif u == 1: c = c * 1.12
            put(x, y, c)
    for ry in (CT1 + 8, FOOT - 8):
        for x in range(L + 1, R - 1): put(x, ry, WOOD * 1.12); put(x, ry + 1, WOOD_D * 0.62)
        for x in range(L + 4, R - 4, 9): put(x, ry, IRON * 1.6)                     # nails
    # the goods on the counter, each with its highlight and a shadow to its lower right on the planks
    def blob(cx, cy, rx, ry, col, shine=1.3):
        for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
            for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
                dx, dy = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
                d = dx * dx + dy * dy
                if d <= 1:
                    k = 1.0 + 0.4 * (-dx * 0.6 - dy * 0.8) - 0.25 * d
                    put(x, y, col * k * (shine if d < 0.15 and dx < -0.1 and dy < -0.1 else 1.0))
    def shadow(cx, cy, rx):
        for x in range(int(cx - rx + 2), int(cx + rx + 4)):
            for y in (int(cy) + 1, int(cy) + 2): mul(x, y, 0.62)
    if kind == 1:                                     # woven baskets, heaped with produce gone over
        for bx in (18, 40, 62):
            shadow(bx + 9, CT1 - 2, 9)
            for y in range(CT1 - 9, CT1):
                for x in range(bx, bx + 18):
                    t = (y - (CT1 - 9)) / 9
                    hw = 9 * (0.85 + 0.15 * t)
                    dx = (x + 0.5 - bx - 9) / hw
                    if abs(dx) <= 1:
                        weave = ((x + (y // 2) * 2) % 4 < 2)
                        put(x, y, WOOD * (1.2 if weave else 0.85) * (1.2 - 0.5 * (dx + 1) / 2) * (0.9 + 0.2 * (1 - t)))
            for x in range(bx, bx + 18): put(x, CT1 - 9, WOOD * 1.35)               # the rim
            for i in range(7):
                k = rng.random()
                col = np.array([104, 96, 46] if k < 0.45 else ([120, 74, 46] if k < 0.8 else [80, 70, 42]), np.float32)
                blob(bx + 3 + (i % 4) * 4 + (i // 4) * 2, CT1 - 11 - (i // 4) * 3, 2.6, 2.2, col)
    elif kind == 2:                                   # crocks and jars of glazed earthenware
        for (jx, jh, jw, col) in ((16, 16, 11, (138, 96, 66)), (31, 12, 9, (118, 120, 112)), (44, 19, 12, (138, 96, 66)), (60, 11, 9, (96, 104, 88)), (73, 15, 10, (138, 96, 66))):
            col = np.array(col, np.float32)
            shadow(jx + jw / 2, CT1 - 1, jw / 2)
            for y in range(CT1 - jh, CT1):
                t = (y - (CT1 - jh)) / jh
                hw = jw / 2 * (0.5 if t < 0.12 else (0.62 + 0.38 * math.sin(math.pi * min(1, (t - 0.08) / 0.92))))
                for x in range(int(jx + jw / 2 - hw), int(jx + jw / 2 + hw) + 1):
                    dx = (x + 0.5 - jx - jw / 2) / max(1, hw)
                    k = 1.0 + 0.45 * (-dx) - 0.15 * abs(dx) ** 2
                    if -0.6 < dx < -0.3 and 0.25 < t < 0.6: k = 1.65                # the glaze's shine
                    put(x, y, col * k)
            for x in range(int(jx + jw * 0.3), int(jx + jw * 0.7) + 1): put(x, CT1 - jh, OUT); put(x, CT1 - jh + 1, col * 0.5)   # its mouth
        for (x, y) in ((34, CT1 + 0), (36, CT1 - 1), (39, CT1)): put(x, y, np.array([138, 96, 66], np.float32) * 0.9)   # a broken one's shards
    else:                                             # bolts of cloth lying on their sides, sacks slumped
        for (cx, col) in ((14, (128, 62, 54)), (28, (72, 92, 116)), (42, (156, 138, 100))):
            col = np.array(col, np.float32)
            shadow(cx + 7, CT1 - 1, 7)
            for y in range(CT1 - 9, CT1):
                t = (y - (CT1 - 9)) / 9
                for x in range(cx, cx + 14):
                    k = 1.35 - 0.8 * t if t < 0.5 else 0.95 - 0.5 * (t - 0.5)        # a roll: lit on top, dark beneath
                    if (x - cx) % 5 == 0: k *= 0.85
                    put(x, y, col * k)
            for y in range(CT1 - 9, CT1):                                            # its end, the cloth wound round
                r = abs(y - (CT1 - 4.5))
                put(cx + 13, y, col * (0.7 + 0.1 * (r % 2)))
        for (sx, sw) in ((60, 14), (74, 12)):
            shadow(sx + sw / 2, CT1 - 1, sw / 2)
            for y in range(CT1 - 15, CT1):
                t = (y - (CT1 - 15)) / 15
                hw = sw / 2 * (0.45 + 0.55 * math.sin(math.pi * min(1, t * 0.85 + 0.15)))
                for x in range(int(sx + sw / 2 - hw), int(sx + sw / 2 + hw) + 1):
                    dx = (x + 0.5 - sx - sw / 2) / max(1, hw)
                    put(x, y, np.array([172, 152, 114], np.float32) * (1.0 + 0.4 * (-dx) - 0.2 * t) * (0.85 if (y - CT1) % 4 == 0 and abs(dx) < 0.6 else 1.0))
            put(sx + sw / 2, CT1 - 15, OUT); put(sx + sw / 2, CT1 - 16, np.array([120, 100, 70], np.float32))   # its tie
    # the awning's shadow across the back of the counter and the goods
    for y in range(BACK0, CT0 + 6):
        for x in range(BL, BR): mul(x, y, 0.72 if y < CT0 else 0.85)
    # the back posts (behind the awning, darker), then the front posts, round: lit left, dark right
    for px in (BL, BR - 3):
        for y in range(AW_B, CT0):
            for i in range(3): put(px + i, y, WOOD_D * (1.1, 0.9, 0.7)[i])
    for px in (L, R - 4):
        for y in range(AW_B, FOOT):
            for i in range(4): put(px + i, y, WOOD * (1.4, 1.1, 0.85, 0.6)[i] * (1.0 - 0.15 * (y - AW_B) / (FOOT - AW_B)))
        for i in range(-1, 5): put(px + i, FOOT - 1, WOOD_D * 0.7)                  # its foot
    # the awning: its top seen as it slopes down to us; stripes from back to front, each bellied between the ribs (a crest lit, the trough
    # in shade), narrowing a little toward the back; the third torn half away to its bare ribs, a flap hanging down
    fall = kind == 3
    cut = int(W * 0.56)
    cx_mid = W / 2
    for y in range(AW_T, AW_B):
        t = (y - AW_T) / (AW_B - AW_T)                 # 0 at the back rail, 1 at the front edge
        half = (W / 2 - 4) * (0.9 + 0.1 * t)
        for x in range(int(cx_mid - half), int(cx_mid + half) + 1):
            if fall and x >= cut: continue
            u = (x - cx_mid) / (0.9 + 0.1 * t) + (W / 2 - 4)        # where across the canvas, in its own measure
            band = int(u / 12) % 2
            phase = (u % 12) / 12
            belly = 0.82 + 0.3 * math.sin(math.pi * phase)             # each stripe bellied between two ribs
            light = (1.18 - 0.28 * t) * (1.05 - 0.12 * (x / W))
            put(x, y, stripes[band] * belly * light)
            if phase < 0.08: put(x, y, stripes[band] * 0.62 * light)    # the rib's seam
    for x in range(4, W - 4):
        if fall and x >= cut: continue
        put(x, AW_T - 1, WOOD_D); put(x, AW_T, WOOD * 1.2)            # the back rail
    if fall:
        for rx in range(cut + 4, W - 4, 12):                            # the bare ribs
            for y in range(AW_T, AW_B): put(rx, y, WOOD * 1.25); put(rx + 1, y, WOOD_D * 0.8)
        for x in range(cut, W - 4): put(x, AW_T, WOOD * 1.2); put(x, AW_B, WOOD * 1.1)
    for x in range(4, W - 4):                                           # the valance: an upright hem, scalloped, darker (it faces us)
        if fall and x >= cut: continue
        u = x - 4
        band = int(u / 12) % 2
        p = u % 12
        hang = VAL - (3 if p in (0, 11) else (1 if p in (1, 10) else 0))
        for y in range(AW_B, AW_B + hang):
            put(x, y, stripes[band] * (0.78 - 0.04 * (y - AW_B)) * (1.05 - 0.1 * x / W))
        put(x, AW_B, stripes[band] * 1.25)                               # the fold over the front edge, lit
        put(x, AW_B + hang, OUT)
    if fall:
        for y in range(AW_B - 4, AW_B + 24):
            w = max(2, 10 - (y - AW_B + 4) // 4)
            for x in range(cut, cut + w): put(x, y, stripes[0] * (0.74 - 0.008 * (y - AW_B)) * (1.1 if x == cut else 1.0))
    for x in range(4, W - 4):
        if not (fall and x >= cut): put(x, AW_T - 2, OUT)
    # ---- the finer things: the canvas's weave and its patches, lashings at the posts' heads, what hangs from the hem, a slate leaning on the
    # counter, cloth over its front, grain in the boards, wear ----
    for y in range(AW_T, AW_B + VAL):                  # the weave: every other pixel a touch darker, the canvas reads as cloth
        for x in range(4, W - 4):
            if (x + y) % 2 and img[y, x, 3] and not (fall and x >= cut): mul(x, y, 0.95)
    for (px, py, pw, ph) in ([(20, 12, 9, 7)] if kind == 1 else ([(58, 15, 8, 6)] if kind == 2 else [(26, 14, 8, 8)])):   # a patch, stitched on
        col = stripes[1] * 0.92 if kind != 3 else np.array([120, 104, 80], np.float32)
        for y in range(py, py + ph):
            for x in range(px, px + pw):
                put(x, y, col * (1.1 if y == py else 1.0))
        for x in range(px, px + pw, 2): put(x, py, OUT * 1.6); put(x, py + ph - 1, OUT * 1.6)
        for y in range(py, py + ph, 2): put(px, y, OUT * 1.6); put(px + pw - 1, y, OUT * 1.6)
    if kind != 3:                                     # a tear, frayed
        tx = 70 if kind == 1 else 24
        for k in range(7):
            put(tx + k, AW_T + 8 + k // 2, OUT); put(tx + k, AW_T + 9 + k // 2, stripes[0] * 0.4)
            if k % 2: put(tx + k, AW_T + 7 + k // 2, stripes[1] * 1.2)
    for px in (L, R - 4):                             # rope lashing where the awning's front edge meets each front post
        for y in range(AW_B - 2, AW_B + 5):
            for x in range(px - 1, px + 5):
                if (x + y) % 3 == 0: put(x, y, np.array([170, 150, 110], np.float32) * (1.15 if x < px + 2 else 0.8))
    if kind == 1:                                     # strings of onions and garlic hanging from the hem
        for hx in (22, 46, 70):
            for y in range(AW_B + VAL, AW_B + VAL + 12):
                put(hx, y, np.array([160, 140, 100], np.float32) * 0.7)
                if (y - AW_B) % 3 == 0:
                    for dx in (-2, -1, 1, 2):
                        put(hx + dx, y, np.array([196, 168, 120] if hx != 46 else [170, 110, 80], np.float32) * (1.15 if dx < 0 else 0.8))
    elif kind == 2:                                   # a lantern on a hook
        lx = 48
        for y in range(AW_B + VAL, AW_B + VAL + 4): put(lx, y, IRON)
        for y in range(AW_B + VAL + 4, AW_B + VAL + 12):
            for x in range(lx - 3, lx + 4):
                edge = x in (lx - 3, lx + 3) or y in (AW_B + VAL + 4, AW_B + VAL + 11)
                put(x, y, IRON * (1.3 if x < lx else 0.8) if edge else np.array([150, 118, 60], np.float32) * (1.1 if x < lx else 0.8))
    else:                                             # a length of cloth thrown over the counter's front, in folds
        for y in range(CT1 - 1, CT1 + 20):
            for x in range(14, 40):
                f = 0.85 + 0.25 * math.sin((x - 14) * 0.7)
                if y > CT1 + 12 + 4 * math.sin((x - 14) * 0.5): continue
                put(x, y, np.array([128, 62, 54], np.float32) * f * (1.0 - 0.15 * (y - CT1) / 20))
    if kind in (1, 2):                                # a slate board leaning on the counter, chalk marks on it
        sx0, sy0 = (60 if kind == 1 else 20), CT1 + 9
        for y in range(sy0, sy0 + 13):
            for x in range(sx0, sx0 + 11):
                frame = x in (sx0, sx0 + 10) or y in (sy0, sy0 + 12)
                put(x, y, WOOD * (1.2 if x == sx0 else 0.9) if frame else np.array([44, 46, 50], np.float32))
        for (cx, cy) in ((2, 3), (3, 3), (5, 3), (6, 3), (2, 6), (4, 6), (5, 6), (7, 6), (3, 9), (6, 9)):
            put(sx0 + cx, sy0 + cy, np.array([200, 200, 196], np.float32))
    for y in range(CT1 + 2, FOOT):                     # grain in the counter's front boards
        for x in range(L, R):
            if img[y, x, 3] and (x - L) % 9 not in (0, 1) and abs(img[y, x, 0] - img[y, x, 1]) > 15:
                img[y, x, :3] = img[y, x, :3] * 0.7 + grain(x, y, 0.82 - 0.3 * (y - CT1) / (FOOT - CT1), vertical=True, seed=kind) * 0.3
    for i in range(10):                               # moss and wear at the foot
        x, y = L + (i * 23) % (R - L), FOOT - 1 - (i * 7) % 4
        if img[y, x, 3]: img[y, x, :3] = img[y, x, :3] * 0.5 + np.array([74, 98, 50], np.float32) * 0.5
    return img

def stall_back(seed):
    """a stand seen from behind (on the square's south side, its counter facing north into the square): its back wall of upright planks
    braced across, posts at the corners, the awning's top seen beyond it (striped, its back rail toward us), sacks and a crate left against it"""
    rng = random.Random(seed)
    W = H = 96
    img = np.zeros((H, W, 4), np.float32)
    def put(x, y, c):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < W and 0 <= y < H: img[y, x, :3] = np.clip(c, 0, 255); img[y, x, 3] = 255
    stripes = CANVAS2 if seed % 2 else CANVAS
    L, R, AW_T, AW_B, TOPW, FOOT = 7, W - 8, 10, 30, 30, H - 4
    # the awning beyond: its top, sloping away from us, the front valance's top edge showing past it
    for y in range(AW_T - 4, AW_T): 
        for x in range(6, W - 6): put(x, y, stripes[(x // 12) % 2] * 0.62)
    for y in range(AW_T, AW_B):
        t = (y - AW_T) / (AW_B - AW_T)
        for x in range(4, W - 4):
            phase = ((x - 4) % 12) / 12
            belly = 0.82 + 0.3 * math.sin(math.pi * phase)
            c = stripes[((x - 4) // 12) % 2] * belly * (0.9 + 0.25 * t) * (1.05 - 0.12 * x / W)
            if phase < 0.08: c = c * 0.65
            if (x + y) % 2: c = c * 0.95
            put(x, y, c)
    for x in range(4, W - 4): put(x, AW_B, WOOD * 1.3); put(x, AW_B + 1, WOOD_D * 0.8)   # the back rail, nearest us
    # the back wall: upright planks with a brace across, the light on the left
    for y in range(AW_B + 2, FOOT):
        for x in range(L, R):
            c = grain(x, y, 0.95 - 0.28 * (y - AW_B) / (FOOT - AW_B), vertical=True, seed=seed) * (1.04 - 0.1 * x / W)
            u = (x - L) % 10
            if u == 0: c = c * 0.58
            elif u == 1: c = c * 1.12
            put(x, y, c)
    for by in (AW_B + 14, FOOT - 12):
        for x in range(L + 2, R - 2):
            put(x, by, WOOD * 1.25); put(x, by + 1, WOOD * 1.0); put(x, by + 2, WOOD_D * 0.6)
        for x in range(L + 5, R - 5, 10): put(x, by + 1, IRON * 1.7)
    for k in range(R - L - 8):                         # a diagonal brace between the rails
        x = L + 4 + k; y = AW_B + 17 + int(k * (FOOT - 15 - AW_B - 17) / (R - L - 8))
        put(x, y, WOOD * 1.2); put(x, y + 1, WOOD_D * 0.7)
    for px in (L - 1, R - 3):                          # the corner posts, round
        for y in range(AW_B - 2, FOOT):
            for i in range(4): put(px + i, y, WOOD * (1.4, 1.1, 0.85, 0.6)[i] * (1.0 - 0.15 * (y - AW_B) / (FOOT - AW_B)))
    # sacks slumped against it and a crate
    for (sx, sw, col) in ((14, 13, (168, 150, 112)), (26, 11, (150, 134, 100))):
        for y in range(FOOT - 15, FOOT):
            t = (y - (FOOT - 15)) / 15
            hw = sw / 2 * (0.45 + 0.55 * math.sin(math.pi * min(1, t * 0.85 + 0.15)))
            for x in range(int(sx + sw / 2 - hw), int(sx + sw / 2 + hw) + 1):
                dx = (x + 0.5 - sx - sw / 2) / max(1, hw)
                put(x, y, np.array(col, np.float32) * (1.0 + 0.4 * (-dx) - 0.15 * t))
    for y in range(FOOT - 13, FOOT):
        for x in range(62, 78):
            top = y < FOOT - 10
            c = WOOD * (1.25 if top else 0.9) * (1.1 if x < 64 else 1.0)
            if not top and ((x - 62) % 5 == 0 or (y - FOOT) % 4 == 0): c = c * 0.7
            put(x, y, c)
    return img

def stall_side(face, seed):
    """a stand seen from its side (on the square's west side facing east, face=1, or its east side facing west, face=-1): 2 x 3. The back
    post tall at the back, the front post shorter, the awning sloping from the back down to the front over the counter, its valance hanging at
    the front, the end board of the counter in full with its planks, the goods' tops showing over the counter's edge; light from the upper left
    whichever way it faces"""
    rng = random.Random(seed)
    W, H = 64, 96
    img = np.zeros((H, W, 4), np.float32)
    def put(x, y, c):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < W and 0 <= y < H: img[y, x, :3] = np.clip(c, 0, 255); img[y, x, 3] = 255
    X = (lambda x: x) if face > 0 else (lambda x: W - 1 - x)   # 0 = the back of the stand, W-1 its front
    stripes = CANVAS3 if seed % 2 else CANVAS
    FOOT, CT = H - 4, 58
    # the back boards (the stand's back, seen edge on: a narrow upright strip), the counter's end board
    for y in range(26, FOOT):
        for u in range(4, 10): put(X(u), y, grain(u, y, 0.7, vertical=True, seed=seed))
    for y in range(CT, FOOT):
        for u in range(6, W - 6):
            x = X(u)
            c = grain(u, y, 0.95 - 0.3 * (y - CT) / (FOOT - CT), seed=seed) * (1.05 - 0.12 * x / W)
            if (y - CT) % 8 == 0: c = c * 0.62
            put(x, y, c)
        put(X(6), y, WOOD * 1.3); put(X(W - 7), y, WOOD_D * 0.7)
    for u in range(6, W - 6): put(X(u), CT, WOOD * 1.4); put(X(u), CT + 1, WOOD * 1.1)   # the counter's top edge, lit
    # goods showing over the edge
    for i, u in enumerate(range(14, W - 12, 9)):
        h = rng.randint(4, 9)
        col = np.array([[150, 110, 70], [118, 120, 110], [110, 70, 46], [168, 150, 112]][i % 4], np.float32)
        for y in range(CT - h, CT):
            for k in range(6): put(X(u + k), y, col * (1.25 if X(u + k) < X(u + 3) else 0.8) * (1.1 if y == CT - h else 1.0))
    # the posts: the back one tall, the front one up to the awning's low edge
    for (u, top) in ((6, 10), (W - 10, 34)):
        for y in range(top, FOOT):
            for i in range(4):
                x = X(u + i)
                put(x, y, WOOD * (1.35 if (x == min(X(u), X(u + 3))) else (0.65 if x == max(X(u), X(u + 3)) else 1.0)))
    # the awning, its top seen as it slopes from the back (high) down to the front (low), in bands across it; the valance at the front
    for u in range(3, W - 3):
        t = (u - 3) / (W - 6)
        top, bot = 6 + 22 * t, 22 + 22 * t
        for y in range(int(top), int(bot)):
            band = int((y - top) / 3.3) % 2
            c = stripes[band] * (1.15 - 0.2 * (y - top) / (bot - top)) * (0.95 + 0.1 * math.sin(math.pi * ((y - top) % 6.6) / 6.6))
            if (u + y) % 2: c = c * 0.95
            put(X(u), y, c)
        put(X(u), int(top) - 1, OUT); put(X(u), int(top), stripes[1] * 1.3)
    for y in range(44, 56):                            # the valance hanging at the front end, seen edge on
        for k in range(3):
            u = W - 4 - k
            put(X(u), y, stripes[(y // 4) % 2] * (0.8 if k else 0.62))
    return img

def barrow3d(kind):
    """a wheelbarrow in 3/4 view, 2 x 2 (its body in the bottom row): a tray of boards seen from above and the side (its inside in shade,
    its rim lit), the wheel in front with its spokes and iron tyre, the handles running back, a pair of legs; 1 heaped with stones, 2 a load
    of sacks, 3 empty and tipped up on its wheel"""
    W, H = 64, 64
    img = np.zeros((H, W, 4), np.float32)
    def put(x, y, c):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < W and 0 <= y < H: img[y, x, :3] = np.clip(c, 0, 255); img[y, x, 3] = 255
    tilt = kind == 3
    lift = 10 if tilt else 0
    # handles (behind), running back to the right, lit along the top
    for k in range(22):
        for side, dy in ((0, 0), (1, 6)):
            x = 40 + k; y = (40 - lift - k * (0.55 if tilt else 0.18)) + dy
            put(x, y, WOOD * (1.35 if side == 0 else 1.1)); put(x, y + 1, WOOD_D * 0.75)
    for (lx, ly) in ((44, 46), (48, 51)):              # the legs
        for y in range(ly - lift // 2, ly + 10 - (lift if tilt else 0)):
            put(lx, y, WOOD_D * 1.15); put(lx + 1, y, WOOD_D * 0.75)
    # the tray: a box, wider at the top; its far wall's inside, its floor, its near side, its rim
    x0, x1, yt, yb = 10, 48, 30 - lift, 50 - lift // 2
    for y in range(yt, yb):
        t = (y - yt) / (yb - yt)
        a, b = x0 + 5 * t, x1 - 3 * t
        for x in range(int(a), int(b)):
            if y < yt + 7:                             # the inside, seen over the rim: the far wall and the floor, in shade
                c = grain(x, y, 0.55 + 0.04 * (y - yt), seed=3)
            else:                                      # the near side, boards running along it, darker toward the bottom
                c = grain(x, y, 1.0 - 0.35 * (t - 0.3), seed=5) * (1.05 - 0.1 * x / W)
                if (y - yt) % 6 == 1: c = c * 0.65
            put(x, y, c)
    for x in range(x0, x1): put(x, yt, WOOD * 1.45); put(x, yt + 1, WOOD * 1.15)          # the far rim
    for x in range(x0 + 1, x1 - 1): put(x, yt + 7, WOOD * 1.4); put(x, yt + 8, WOOD_D * 0.7)   # the near rim
    for (ax, ay) in ((x0 + 3, yt + 10), (x1 - 6, yt + 10)):     # iron corner straps
        for k in range(8): put(ax, ay + k, IRON * 1.3); put(ax + 1, ay + k, IRON * 0.8)
    # the load
    if kind == 1:
        rr = random.Random(5)
        for i in range(16):
            sx, sy = x0 + 6 + (i * 7) % 30, yt - 3 + (i * 5) % 8
            r = rr.uniform(2.2, 3.4)
            for y in range(int(sy - r) - 1, int(sy + r) + 2):
                for x in range(int(sx - r) - 1, int(sx + r) + 2):
                    dx, dy = (x + 0.5 - sx) / r, (y + 0.5 - sy) / (r * 0.85)
                    d = dx * dx + dy * dy
                    if d <= 1: put(x, y, STONE * (1.0 + 0.35 * (-dx * 0.6 - dy * 0.8) - 0.2 * d))
    elif kind == 2:
        for (sx, sw, col) in ((16, 15, (172, 152, 114)), (28, 14, (156, 138, 104))):
            for y in range(yt - 9, yt + 6):
                t = (y - (yt - 9)) / 15
                hw = sw / 2 * (0.5 + 0.5 * math.sin(math.pi * min(1, t * 0.9 + 0.1)))
                for x in range(int(sx + sw / 2 - hw), int(sx + sw / 2 + hw) + 1):
                    dx = (x + 0.5 - sx - sw / 2) / max(1, hw)
                    put(x, y, np.array(col, np.float32) * (1.0 + 0.4 * (-dx) - 0.15 * t))
            put(sx + sw / 2, yt - 9, OUT)
    # the wheel in front: an iron tyre, wooden felloes, spokes, a hub; lit on its upper left
    wcx, wcy, wr = 10, H - 12 - (0 if not tilt else 2), 10
    for y in range(wcy - wr - 1, wcy + wr + 2):
        for x in range(wcx - wr - 1, wcx + wr + 2):
            dx, dy = x + 0.5 - wcx, (y + 0.5 - wcy)
            r = math.hypot(dx, dy)
            if r > wr + 0.5: continue
            lit = 1.0 + 0.4 * (-(dx / (r + 1e-6)) * 0.6 - (dy / (r + 1e-6)) * 0.8)
            if r > wr - 1.5: put(x, y, IRON * lit)
            elif r > wr - 4: put(x, y, WOOD * 0.95 * lit)
            elif r < 2.2: put(x, y, IRON * (1.3 if dx < 0 else 0.8))
            else:
                ang = math.degrees(math.atan2(dy, dx)) % 45
                if ang < 8: put(x, y, WOOD * 1.1 * lit)
    for x in range(wcx, x0 + 6): put(x, wcy - 1, WOOD_D); put(x, wcy, WOOD_D * 0.7)   # the axle to the tray
    return img

def well(seed):
    """the square's well, 2 x 3: a round shaft of the walls' stone (its top seen as a ring, the dark water deep inside), two posts and a little
    tiled roof over it, the windlass with its rope and a bucket on the rim"""
    W, H = 64, 96
    img = np.zeros((H, W, 4), np.float32)
    def put(x, y, c):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < W and 0 <= y < H: img[y, x, :3] = np.clip(c, 0, 255); img[y, x, 3] = 255
    cx, ry, rx = 32, 9, 27
    top_y, foot = 62, H - 4
    # the shaft's side: courses of stone round a cylinder, lit on the left
    for x in range(cx - rx, cx + rx + 1):
        u = (x - cx) / rx
        if abs(u) > 1: continue
        bow = ry * math.sqrt(1 - u * u)
        light = 0.62 + 0.42 * math.cos(math.asin(u) + 0.55)
        for y in range(int(top_y + bow), int(foot + bow * 0.2)):
            ly = y - bow
            course = int((ly - top_y) // 6)
            arc = rx * math.asin(u)
            bu = (arc + (4 if course % 2 else 0) + 100) % 10
            c = STONE * light * (0.94 + 0.06 * ((course * 7 + int((arc + 100) // 10) * 3) % 4) / 3)
            if (ly - top_y) % 6 < 1 or bu < 1: c = STONE * 0.45 * light
            put(x, y, c)
    # its top: the ring of coping round the dark shaft, the water far down catching the sky
    for y in range(top_y - ry - 1, top_y + ry + 2):
        for x in range(cx - rx - 1, cx + rx + 2):
            dx, dy = (x + 0.5 - cx) / rx, (y + 0.5 - top_y) / ry
            d = dx * dx + dy * dy
            if d > 1: continue
            dxi, dyi = (x + 0.5 - cx) / (rx - 5), (y + 0.5 - top_y) / (ry - 3)
            di = dxi * dxi + dyi * dyi
            if di < 1:
                c = np.array([16, 14, 14], np.float32) * (1.0 + 0.6 * dyi)
                if di < 0.12 and dyi > 0: c = np.array([46, 58, 80], np.float32)
            else: c = STONE * (1.25 - 0.3 * (dy + 1) / 2) * (1.05 - 0.15 * (dx + 1) / 2)
            put(x, y, c)
    # the posts and the roof
    for px in (cx - rx + 2, cx + rx - 5):
        for y in range(18, top_y + 2):
            for i in range(4): put(px + i, y, WOOD * (1.4, 1.1, 0.85, 0.6)[i])
    for y in range(4, 22):                             # a little roof of tiles, two planes, the ridge running across
        t = (y - 4) / 18
        for x in range(4, W - 4):
            v = y - 4
            row = v // 4
            su = (x + (row % 2) * 3) % 6
            c = np.array([118, 112, 108], np.float32) * (1.25 - 0.4 * t) * (0.94 + 0.06 * ((x // 6 + row) % 3))
            if v % 4 == 0 or su == 0: c = c * 0.6
            put(x, y, c)
        put(3, y, OUT); put(W - 4, y, OUT)
    for x in range(4, W - 4): put(x, 3, np.array([140, 134, 128], np.float32) * 1.3); put(x, 22, OUT); put(x, 21, np.array([118, 112, 108], np.float32) * 0.7)
    # the windlass: a beam across under the roof, the rope wound on it and down into the shaft
    for x in range(cx - rx + 4, cx + rx - 4): put(x, 30, WOOD * 1.25); put(x, 31, WOOD * 0.95); put(x, 32, WOOD_D * 0.7)
    for x in range(cx - 8, cx + 8):
        for y in range(29, 34):
            if (x + y) % 2: put(x, y, np.array([176, 156, 116], np.float32) * (1.1 if y < 31 else 0.8))
    for y in range(34, top_y): put(cx, y, np.array([176, 156, 116], np.float32) * 0.9)
    for x in range(cx + rx - 4, cx + rx + 2): put(x, 34, WOOD_D)    # the crank
    for y in range(34, 40): put(cx + rx + 1, y, WOOD_D)
    # a bucket on the rim
    bx, by = cx - 18, top_y - 3
    for y in range(by - 8, by + 1):
        for x in range(bx - 5, bx + 6):
            t = (y - (by - 8)) / 8
            if abs(x - bx) <= 5 - t: put(x, y, WOOD * (1.2 if x < bx else 0.8) * (0.9 if (y - by) % 3 == 0 else 1.0))
    for x in range(bx - 5, bx + 6): put(x, by - 8, IRON * 1.3)
    return img

out = sys.argv[1]
for k in (1, 2, 3): finish(stall(k, 40 + k), os.path.join(out, f'objMarketStall{k}.png'))
finish(stall_back(7), os.path.join(out, 'objMarketStallBack.png'))
finish(stall_side(1, 3), os.path.join(out, 'objMarketStallSideE.png'))
finish(stall_side(-1, 4), os.path.join(out, 'objMarketStallSideW.png'))
for k in (1, 2, 3): finish(barrow3d(k), os.path.join(out, f'objWheelbarrow{k}.png'))
finish(well(1), os.path.join(out, 'objMarketWell.png'))
print('ok')
