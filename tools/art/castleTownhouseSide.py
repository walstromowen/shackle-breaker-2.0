# The castle town house seen from the side (mapObjects/objCastleTownhouseLeft.png, objCastleTownhouseRight.png): the same house as
# castleTownhouse.py (the keep's stone and slate, its gothic manner, its shading) turned so its long wall faces south, for a row that runs the
# other way, like the abandoned houses' side views. 5 x 5 tiles (160 x 160), its walls the bottom two rows, no door: a sealed shell, the whole
# wall solid. Left and Right differ in where the chimney, the dormer and the windows stand, not in the light (which comes from the upper left
# on both).
#
# Seen from the south and above: the roof's south slope, slate in courses along the eaves, a crested ridge along its top, the gable walls'
# coping standing up at each end; a stone dormer with a pointed light and a stone chimney on it. Under the eaves, a corbel table, then the
# wall: ashlar between piers at the corners and one in the middle, tall pointed lancets of leaded glass, a plinth; a soft shadow on the ground.
#   python3 castleTownhouseSide.py <left.png> <right.png>
import sys, math
import numpy as np
from PIL import Image

W = H = 160
STONE = np.array([156, 148, 128], np.float32)
TILE = np.array([110, 108, 112], np.float32)    # the keep's slate, a shade bluer and darker on this long plane
GLASS = np.array([30, 38, 60], np.float32)
SKY = np.array([58, 80, 128], np.float32)
MOSS = np.array([74, 98, 50], np.float32)
SHADE = np.array([[1.0, 0.93], [0.96, 1.04], [1.05, 0.95], [0.94, 1.0]], np.float32)
OUT = STONE * 0.34
PALETTE = 40
ROOF, CHIM, FACE, PIER, DORM, GABLE = 1, 2, 3, 4, 5, 6

def masonry_px(x, y):
    lx, ly = int(x) % 32, int(y) % 32
    row = ly // 8
    sx = (lx + (row % 2) * 8) % 32
    xo, yo = sx % 16, ly % 8
    k = SHADE[row, sx // 16]
    if yo == 0 or xo == 0: return STONE * 0.42
    if yo == 1: return STONE * k * 1.12
    if yo == 7 or xo == 15: return STONE * k * 0.8
    return STONE * k

def slate(u, v, light):
    """a fish-scale slate at (u along the eaves, v up the slope from them): 8 wide, courses 6 deep set over by half; each slate's foot a round
    tongue over the course below, its edge dark, a lit rim just inside it, the course below in shadow either side of it"""
    u, v = int(u), int(v)
    row = v // 6
    su = (u + (row % 2) * 4) % 8
    sv = v % 6
    ti = (u + (row % 2) * 4) // 8
    c = TILE * (0.9, 0.98, 1.05, 0.95)[(ti * 7 + row * 5) % 4]
    d = abs(su + 0.5 - 4)                            # from the slate's middle
    edge_h = 3.2 * (1 - (d / 4) ** 2) ** 0.5 if d < 4 else 0   # how far the round foot hangs below the course line
    if sv < 3 and sv < 3 - edge_h + 0.01:            # beside the tongue: the course below shows, in the shadow of this one
        return c * 0.52 * light
    if sv < 3 and sv < 3 - edge_h + 1.2: return TILE * 0.4 * light   # the tongue's dark edge
    if sv < 3 and sv < 3 - edge_h + 2.2: return c * 1.2 * light      # its lit rim
    if su == 0 and sv >= 3: c = c * 0.7              # the joint between slates, above the tongues
    if sv == 5: c = c * 0.86                         # the top of the slate, under the next course's tongues
    return c * light

def house(flip):
    img = np.zeros((H, W, 4), np.float32)
    part = np.zeros((H, W), np.uint8)
    cur = [0]
    def put(x, y, c):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < W and 0 <= y < H: img[y, x, :3] = np.clip(c, 0, 255); img[y, x, 3] = 255; part[y, x] = cur[0]
    def shade(x, y, k):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < W and 0 <= y < H and img[y, x, 3] > 0: img[y, x, :3] *= k
    mx = (lambda x: W - 1 - x) if flip else (lambda x: x)   # where things stand (mirrored for Right), never the light
    RX0, RX1, RIDGE, EAVE = 4, W - 4, 30, 102      # the roof's ends, its ridge, its eaves
    FX0, FX1, FACE0 = 14, W - 14, EAVE + 2         # the wall

    # ---------------- the roof: the south slope ----------------
    cur[0] = ROOF
    for y in range(RIDGE, EAVE + 1):
        for x in range(RX0, RX1):
            put(x, y, slate(x, EAVE - y, 1.0))
    for x in range(RX0, RX1):                      # the eaves' lip: the slates' lit edge, then the dark under them
        put(x, EAVE - 1, TILE * 1.3); put(x, EAVE, TILE * 1.05); put(x, EAVE + 1, OUT)
    for x in range(RX0, RX1):                      # the ridge: a capping, lit along its top, a little crest every 8 px
        put(x, RIDGE - 4, OUT); put(x, RIDGE - 3, TILE * 1.5); put(x, RIDGE - 2, TILE * 1.25); put(x, RIDGE - 1, TILE * 0.95); put(x, RIDGE, TILE * 0.5)
        if (x - RX0) % 8 in (3, 4): put(x, RIDGE - 5, TILE * 1.4); put(x, RIDGE - 6, OUT if (x - RX0) % 8 == 3 else TILE * 1.2)
    # the gable walls' coping at each end, standing up from the slates: a stone band, its top lit, from the eaves to the ridge
    cur[0] = GABLE
    for (x0, lit) in ((RX0, True), (RX1 - 7, False)):
        for y in range(RIDGE - 7, EAVE + 2):
            for i in range(7):
                x = x0 + i
                c = STONE * ((1.34 if i < 3 else 1.08) if lit else (1.0 if i < 2 else 0.6))
                if (y - RIDGE) % 8 == 0: c = c * 0.7    # its joints
                put(x, y, c)
            put(x0 - 1, y, OUT); put(x0 + 7, y, OUT)
        for i in range(-1, 8): put(x0 + i, RIDGE - 8, OUT)
        for t in range(6):                         # a little finial on the coping at the ridge
            put(x0 + 3, RIDGE - 9 - t, STONE * (1.3 if lit else 0.8)); put(x0 + 4, RIDGE - 9 - t, STONE * (0.9 if lit else 0.6))
        put(x0 + 2, RIDGE - 12, STONE * 1.2); put(x0 + 5, RIDGE - 12, STONE * 0.7)
    for y in range(RIDGE - 4, EAVE + 1):           # the coping's shadow on the slates to its right
        for k, f in enumerate((0.5, 0.64, 0.8)): shade(RX0 + 8 + k, y, f)

    # ---------------- the chimney ----------------
    cur[0] = CHIM
    CH0 = mx(112) if not flip else mx(112) - 13
    CH1, CHT = CH0 + 14, RIDGE - 22
    for y in range(CHT, RIDGE + 16):
        for x in range(CH0, CH1):
            i = x - CH0
            r = (y // 5) % 2
            joint = (y % 5 == 0) or ((x + r * 4) % 8 == 0)
            put(x, y, STONE * (0.55 if joint else (1.22 if i < 4 else (0.6 if i > 10 else 0.98))))
        put(CH0 - 1, y, OUT); put(CH1, y, OUT)
    for x in range(CH0 - 2, CH1 + 2):
        put(x, CHT - 2, OUT); put(x, CHT - 1, STONE * 1.3); put(x, CHT, STONE * 1.05); put(x, CHT + 1, STONE * 0.5)
    for x in range(CH0 + 3, CH1 - 3): put(x, CHT - 3, STONE * 0.2)
    for y in range(RIDGE + 16, RIDGE + 22):        # its shadow down the slates, to the lower right
        for x in range(CH0 + 2 + (y - RIDGE - 16), CH1 + 3 + (y - RIDGE - 16)): shade(x, y, 0.62)

    # ---------------- the dormer: a stone gablet with a pointed light, on the slope ----------------
    cur[0] = DORM
    DCX, DB = mx(56), EAVE - 10                    # its middle, the foot of its face
    DW, DH = 13, 22
    def arch_inside(d, t, half, w):
        ah = 0.866 * w
        if t >= ah: return d <= half
        return t >= 0 and (d + half) ** 2 + (ah - t) ** 2 <= w * w
    for y in range(DB - DH, DB + 1):               # its face, the light in it
        for x in range(DCX - DW, DCX + DW + 1):
            u = x + 0.5 - DCX
            c = masonry_px(x, y) * 0.9
            t = y - (DB - DH + 4)
            if arch_inside(abs(u), t, 4, 8): c = SKY if t < 6 else GLASS
            elif arch_inside(abs(u), t + 2, 6, 12): c = STONE * (1.3 if u < 0 else 0.62)
            if abs(u) > DW - 2: c = STONE * (1.3 if u < 0 else 0.6)
            put(x, y, c)
        put(DCX - DW - 1, y, OUT); put(DCX + DW + 1, y, OUT)
    for x in range(DCX - DW - 1, DCX + DW + 2): put(x, DB + 1, STONE * 1.25); put(x, DB + 2, STONE * 0.45)
    gy = DB - DH
    for t in range(16):                            # its gable: coping lit on the left, a slate roof behind
        hw = (DW + 2) * (1 - t / 16)
        y = gy - t
        for x in range(int(DCX - hw), int(DCX + hw) + 1):
            put(x, y, slate(y, abs(x - DCX), 1.25 if x < DCX else 0.62))
        put(DCX - hw, y, STONE * 1.4); put(DCX - hw + 1, y, STONE * 1.2); put(DCX + hw, y, STONE * 0.6); put(DCX + hw - 1, y, STONE * 0.75)
        put(DCX - hw - 1, y, OUT); put(DCX + hw + 1, y, OUT)
    for y in range(gy - 24, gy - 15): put(DCX - 0.5, y, STONE * 1.28); put(DCX + 0.5, y, STONE * 0.7)   # its cross
    for x in range(DCX - 3, DCX + 4): put(x, gy - 21, STONE * (1.28 if x < DCX else 0.72))
    for y in range(gy - 8, DB + 3):                # its shadow on the slates to its right
        for k, f in enumerate((0.5, 0.64, 0.8)): shade(DCX + DW + 2 + k, y, f)

    # ---------------- the wall ----------------
    cur[0] = FACE
    for y in range(FACE0, H):
        for x in range(FX0, FX1): put(x, y, masonry_px(x, y))
    for x in range(FX0, FX1):                      # the corbel table under the eaves
        u = x % 10
        for y in range(FACE0, FACE0 + 7): put(x, y, masonry_px(x, y) * 0.62)
        if 3 <= u <= 6:
            for y in range(FACE0, FACE0 + 6): put(x, y, STONE * (1.2 if u == 3 else (0.72 if u == 6 else 1.0)))
            put(x, FACE0 + 6, STONE * 0.45)
        put(x, FACE0 + 7, STONE * 1.25); put(x, FACE0 + 8, STONE * 0.5)
    for y in range(H - 6, H):                      # the plinth
        for x in range(FX0, FX1): put(x, y, STONE * 1.18 if y == H - 6 else (STONE * 0.55 if y == H - 5 else masonry_px(x, y) * 0.82))
    def lancet(cx, top, w, h):
        half = w / 2
        for y in range(top - 4, top + h + 1):
            t = y - top
            for x in range(int(cx - half - 4), int(cx + half + 5)):
                d = abs(x + 0.5 - cx)
                if arch_inside(d, t, half - 2.5, w - 5):
                    u_, v_ = (x + y) % 6, (x - y) % 6
                    c = SKY if t < h * 0.35 else GLASS
                    if u_ == 0 or v_ == 0: c = GLASS * 0.5
                    if abs(x + 0.5 - cx) < 0.8 and t > (w - 5) * 0.6: c = STONE * 1.0
                    put(x, y, c)
                elif arch_inside(d, t, half, w):
                    put(x, y, masonry_px(x, y) * (0.5 if x < cx else 1.15))
                elif arch_inside(d, t + 2.5, half + 2, w + 4):
                    put(x, y, STONE * (1.3 if x < cx else 0.62))
        for x in range(int(cx - half - 2), int(cx + half + 3)):
            put(x, top + h, STONE * 1.25); put(x, top + h + 1, STONE * 0.95); put(x, top + h + 2, STONE * 0.45)
    for cx in (mx(42), mx(64), mx(118)):           # two lancets on one side of the middle pier, one (wider) on the other
        lancet(cx, 120, 17 if cx == mx(118) else 14, 28)

    # piers at the corners and one between the bays, set back once, capped, a pinnacle on the corner ones; each casts a shadow to its right
    cur[0] = PIER
    SET, CAP = 132, FACE0 + 8
    def pier(lo, up, pinnacle=True):
        (a0, a1), (b0, b1) = lo, up
        def stage(x0, x1, y0, y1):
            w = x1 - x0
            for y in range(y0, y1):
                for x in range(x0, x1):
                    i = x - x0
                    r = (y - y0) // 6
                    joint = (y - y0) % 6 == 0 or ((x - x0) + (r % 2) * 4) % 8 == 0
                    c = STONE * (0.6 if joint else (1.02 + 0.05 * ((r * 3 + (x - x0) // 8) % 3)))
                    if i < 2: c = STONE * (1.36 if i == 1 else 1.2)
                    elif i >= w - 2: c = STONE * (0.5 if i == w - 1 else 0.62)
                    put(x, y, c)
        stage(a0, a1, SET + 4, H)
        stage(b0, b1, CAP + 4, SET)
        for k in range(4):
            f = (k + 1) / 4
            x0, x1 = round(b0 + (a0 - b0) * f), round(b1 + (a1 - b1) * f)
            for x in range(x0, x1): put(x, SET + k, STONE * (1.42 - 0.06 * k if x < x1 - 2 else 0.7))
        for x in range(a0, a1): put(x, SET + 4, STONE * 0.45)
        for k in range(4):
            f = (k + 1) / 4
            x0, x1 = round((b0 + 2) + (b0 - (b0 + 2)) * f), round((b1 - 2) + (b1 - (b1 - 2)) * f)
            for x in range(x0, x1): put(x, CAP + k, STONE * (1.42 - 0.06 * k if x < x1 - 2 else 0.7))
        for x in range(a0 - 1, a1 + 1):
            put(x, H - 6, STONE * 1.25); put(x, H - 5, STONE * 0.5)
            for y in range(H - 4, H): put(x, y, STONE * (1.0 if x > a0 else 1.2) * (0.6 if x >= a1 - 1 else 1.0))
        for y in range(CAP + 4, H - 6):
            xr = (a1 if y >= SET else b1)
            for k, f in enumerate((0.55, 0.68, 0.82)): shade(xr + k, y, f)
        if pinnacle:                                # over the eaves, a little spire
            px = (b0 + b1) // 2 - 3
            for y in range(EAVE - 10, CAP):
                for x in range(px, px + 7): put(x, y, STONE * (1.28 if x < px + 2 else (0.6 if x > px + 4 else 1.0)))
                put(px, y, OUT); put(px + 6, y, OUT)
            for t in range(12):
                hw = 3.5 * (1 - t / 12)
                for x in range(int(px + 3.5 - hw), int(px + 3.5 + hw) + 1): put(x, EAVE - 11 - t, STONE * (1.22 if x < px + 3.5 else 0.66))
    pier((10, 24), (12, 22))
    pier((136, 150), (138, 148))
    m = mx(90) if not flip else mx(90) - 10
    pier((m, m + 10), (m + 1, m + 9), pinnacle=False)

    # ---------------- the shading that makes it stand up ----------------
    a = img[..., 3] > 0
    ys, xs = np.mgrid[0:H, 0:W]
    def mul(mask, k):
        img[mask, :3] *= (k[mask][:, None] if isinstance(k, np.ndarray) else k)
    roof = a & (part == ROOF)
    mul(roof, 1.14 - 0.28 * np.clip((ys - RIDGE) / (EAVE - RIDGE), 0, 1))   # lighter up by the ridge, gloomier toward the eaves
    mul(roof, 1.02 - 0.1 * xs / W)
    # under the eaves: the overhang throws a deep band of shadow across the whole wall's top
    for k, f in enumerate((0.42, 0.52, 0.62, 0.72, 0.82, 0.9)):
        mul(a & ((part == FACE) | (part == PIER)) & (ys == FACE0 + 9 + k), f)
    front = a & ((part == FACE) | (part == PIER))
    mul(front & (part == FACE), 0.86)
    mul(front, 1.06 - 0.3 * np.clip((ys - FACE0) / (H - FACE0), 0, 1) ** 1.4)
    mul(front, 1.03 - 0.08 * xs / W)
    mul(a & (part == PIER) & (ys > H - 14), 0.9)

    # ---------------- weather, the outline, moss ----------------
    edge = a & ~(np.roll(a, 1, 0) & np.roll(a, -1, 0) & np.roll(a, 1, 1) & np.roll(a, -1, 1))
    edge[-1, :] = False
    img[edge, :3] = OUT
    for i in range(26):
        x, y = 16 + (i * 53) % 128, H - 2 - (i * 7) % 9
        if a[y, x] and not edge[y, x]: img[y, x, :3] = img[y, x, :3] * 0.4 + MOSS * 0.6
    for i in range(14):
        x = 10 + (i * 37) % 140; y = EAVE - 8 + (i * 5) % 8
        if a[y, x] and not edge[y, x] and part[y, x] == ROOF: img[y, x, :3] = img[y, x, :3] * 0.5 + MOSS * 0.5
    return img

def save(img, path):
    rgba = np.clip(img, 0, 255).astype(np.uint8)
    alpha = rgba[..., 3].copy()
    q = Image.fromarray(rgba[..., :3], 'RGB').quantize(colors=PALETTE, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
    out = np.dstack([np.asarray(q), np.where(alpha > 0, 255, 0).astype(np.uint8)])
    SH = np.array([14, 11, 10], np.uint8)          # the ground shadow, as on the front view
    for y in range(H - 12, H):
        for x in range(W):
            if out[y, x, 3]: continue
            t = (y - (H - 12)) / 11
            if x < 10: k = max(0.0, 1 - (10 - x) / 9) * 0.55
            elif x >= W - 10: k = max(0.0, 1 - (x - (W - 10)) / 10) * 0.95
            else: k = 0.8
            al = int(215 * k * t ** 1.3)
            if al > 8: out[y, x] = [*SH, al]
    Image.fromarray(out, 'RGBA').save(path, optimize=True)

save(house(False), sys.argv[1])
save(house(True), sys.argv[2])
print('ok')
