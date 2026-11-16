# The castle town's other houses (mapObjects/objCastleHouse<Name>.png): six more of the town house's kind (castleTownhouse.py,
# castleTownhouseSide.py: the keep's stone and slate, its gothic manner, its shading, light from the upper left), every one seen from the side
# (its long wall to the south) and sealed: no door, the whole wall solid (its bottom two rows). They differ in size and build:
#   NARROW  3 x 5   a slip of a house between its neighbours: one lancet, a steep roof, a chimney
#   HALL    7 x 5   a long hall: five lancets between piers, two dormers, two chimneys
#   TALL    4 x 6   two storeys: a string course, lancets above and below, a dormer
#   TOWER   4 x 7   a tower house: three storeys of slit windows, a corbelled crenellated parapet, a slate pyramid roof behind it
#   ROW     6 x 5   two houses built as one: a taller and a lower roof, a party wall's coping standing up between them
#   ARMORY  11 x 9  (objCastleArmory.png, front view, with a door): the castle's armory, a long two-storey hall behind a battlemented parapet,
#                   a gabled frontispiece with the great door (column 5, CASTLE_DOOR), crossed swords, banners, a bartizan on its
#                   left corner and a round stair turret rising out of its right corner high over the roof
#   RUIN    5 x 5   fallen in: half its roof gone to bare rafters over the dark inside, its wall broken down at one end, empty windows,
#                   rubble, ivy
# Each sprite is the object's size in tiles x 32; its cell is the bottom-left (castleLayout.js puts it at the bottom of its row).
#   python3 castleTownVariants.py <out dir>
import sys, os, math, random
import numpy as np
from PIL import Image

STONE = np.array([156, 148, 128], np.float32)
TILE = np.array([110, 108, 112], np.float32)
GLASS = np.array([30, 38, 60], np.float32)
SKY = np.array([58, 80, 128], np.float32)
MOSS = np.array([74, 98, 50], np.float32)
IVY = [np.array(c, np.float32) for c in [(34, 58, 30), (48, 80, 38), (66, 104, 46)]]
WOOD = np.array([86, 62, 42], np.float32)
IRON = np.array([52, 54, 62], np.float32)
DARK = np.array([22, 18, 17], np.float32)
SHADE = np.array([[1.0, 0.93], [0.96, 1.04], [1.05, 0.95], [0.94, 1.0]], np.float32)
OUT = STONE * 0.34
PALETTE = 44
ROOF, CHIM, FACE, PIER, DORM, GABLE, INSIDE, RUBBLE = 1, 2, 3, 4, 5, 6, 7, 8

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
    """a fish-scale slate (castleTownhouseSide.py's): u along the eaves, v up the slope"""
    u, v = int(u), int(v)
    row = v // 6
    su = (u + (row % 2) * 4) % 8
    sv = v % 6
    ti = (u + (row % 2) * 4) // 8
    c = TILE * (0.9, 0.98, 1.05, 0.95)[(ti * 7 + row * 5) % 4]
    d = abs(su + 0.5 - 4)
    edge_h = 3.2 * (1 - (d / 4) ** 2) ** 0.5 if d < 4 else 0
    if sv < 3 and sv < 3 - edge_h + 0.01: return c * 0.52 * light
    if sv < 3 and sv < 3 - edge_h + 1.2: return TILE * 0.4 * light
    if sv < 3 and sv < 3 - edge_h + 2.2: return c * 1.2 * light
    if su == 0 and sv >= 3: c = c * 0.7
    if sv == 5: c = c * 0.86
    return c * light

def in_poly(px, py, pts):
    inside = False
    n = len(pts)
    for i in range(n):
        x1, y1 = pts[i]; x2, y2 = pts[(i + 1) % n]
        if (y1 > py) != (y2 > py) and px < (x2 - x1) * (py - y1) / (y2 - y1 + 1e-9) + x1: inside = not inside
    return inside

def arch_inside(d, t, half, w):
    ah = 0.866 * w
    if t >= ah: return d <= half
    return t >= 0 and (d + half) ** 2 + (ah - t) ** 2 <= w * w

def build(s):
    W, H = s['w'] * 32, s['h'] * 32
    rng = random.Random(s.get('seed', 1))
    img = np.zeros((H, W, 4), np.float32)
    part = np.zeros((H, W), np.uint8)
    cur = [0]
    def put(x, y, c):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < W and 0 <= y < H: img[y, x, :3] = np.clip(c, 0, 255); img[y, x, 3] = 255; part[y, x] = cur[0]
    def shade(x, y, k):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < W and 0 <= y < H and img[y, x, 3] > 0: img[y, x, :3] *= k
    def clear(x, y):
        if 0 <= x < W and 0 <= y < H: img[y, x] = 0; part[y, x] = 0
    FX0, FX1 = 14, W - 14
    FACE0 = s['face0']                              # the wall's top (under the eaves or the parapet)

    # ---------------- pieces ----------------
    def slope(x0, x1, ridge, eave, light=1.0):
        """a side slope of slates from x0 to x1, its ridge capping (crested) along the top, its eaves' lip"""
        cur[0] = ROOF
        for y in range(ridge, eave + 1):
            for x in range(x0, x1): put(x, y, slate(x, eave - y, light))
        for x in range(x0, x1):
            put(x, eave - 1, TILE * 1.3); put(x, eave, TILE * 1.05); put(x, eave + 1, OUT)
            put(x, ridge - 4, OUT); put(x, ridge - 3, TILE * 1.5); put(x, ridge - 2, TILE * 1.25); put(x, ridge - 1, TILE * 0.95); put(x, ridge, TILE * 0.5)
            if (x - x0) % 8 in (3, 4): put(x, ridge - 5, TILE * 1.4); put(x, ridge - 6, OUT if (x - x0) % 8 == 3 else TILE * 1.2)
    def coping(x0, top, bottom, lit, broken=0):
        """a gable wall's coping standing up from the slates, from the ridge to the eaves, a finial at its top"""
        cur[0] = GABLE
        top2 = top + broken
        for y in range(top2 - 7, bottom + 2):
            for i in range(7):
                c = STONE * ((1.34 if i < 3 else 1.08) if lit else (1.0 if i < 2 else 0.6))
                if (y - top) % 8 == 0: c = c * 0.7
                put(x0 + i, y, c)
            put(x0 - 1, y, OUT); put(x0 + 7, y, OUT)
        for i in range(-1, 8): put(x0 + i, top2 - 8, OUT)
        if broken: return
        for t in range(6):
            put(x0 + 3, top - 9 - t, STONE * (1.3 if lit else 0.8)); put(x0 + 4, top - 9 - t, STONE * (0.9 if lit else 0.6))
        put(x0 + 2, top - 12, STONE * 1.2); put(x0 + 5, top - 12, STONE * 0.7)
        if lit:
            for y in range(top - 4, bottom + 1):
                for k, f in enumerate((0.5, 0.64, 0.8)): shade(x0 + 8 + k, y, f)
    def chimney(cx, top, base):
        cur[0] = CHIM
        c0, c1 = cx - 7, cx + 7
        for y in range(top, base):
            for x in range(c0, c1):
                i = x - c0
                r = (y // 5) % 2
                joint = (y % 5 == 0) or ((x + r * 4) % 8 == 0)
                put(x, y, STONE * (0.55 if joint else (1.22 if i < 4 else (0.6 if i > 10 else 0.98))))
            put(c0 - 1, y, OUT); put(c1, y, OUT)
        for x in range(c0 - 2, c1 + 2):
            put(x, top - 2, OUT); put(x, top - 1, STONE * 1.3); put(x, top, STONE * 1.05); put(x, top + 1, STONE * 0.5)
        for x in range(c0 + 3, c1 - 3): put(x, top - 3, STONE * 0.2)
        for y in range(base, base + 6):
            for x in range(c0 + 2 + (y - base), c1 + 3 + (y - base)): shade(x, y, 0.62)
    def dormer(cx, base):
        cur[0] = DORM
        DW, DH = 13, 22
        for y in range(base - DH, base + 1):
            for x in range(cx - DW, cx + DW + 1):
                u = x + 0.5 - cx
                c = masonry_px(x, y) * 0.9
                t = y - (base - DH + 4)
                if arch_inside(abs(u), t, 4, 8): c = SKY if t < 6 else GLASS
                elif arch_inside(abs(u), t + 2, 6, 12): c = STONE * (1.3 if u < 0 else 0.62)
                if abs(u) > DW - 2: c = STONE * (1.3 if u < 0 else 0.6)
                put(x, y, c)
            put(cx - DW - 1, y, OUT); put(cx + DW + 1, y, OUT)
        for x in range(cx - DW - 1, cx + DW + 2): put(x, base + 1, STONE * 1.25); put(x, base + 2, STONE * 0.45)
        gy = base - DH
        for t in range(16):
            hw = (DW + 2) * (1 - t / 16)
            y = gy - t
            for x in range(int(cx - hw), int(cx + hw) + 1): put(x, y, slate(y, abs(x - cx), 1.25 if x < cx else 0.62))
            put(cx - hw, y, STONE * 1.4); put(cx - hw + 1, y, STONE * 1.2); put(cx + hw, y, STONE * 0.6); put(cx + hw - 1, y, STONE * 0.75)
            put(cx - hw - 1, y, OUT); put(cx + hw + 1, y, OUT)
        for y in range(gy - 24, gy - 15): put(cx - 0.5, y, STONE * 1.28); put(cx + 0.5, y, STONE * 0.7)
        for x in range(cx - 3, cx + 4): put(x, gy - 21, STONE * (1.28 if x < cx else 0.72))
        for y in range(gy - 8, base + 3):
            for k, f in enumerate((0.5, 0.64, 0.8)): shade(cx + DW + 2 + k, y, f)
    def wall(x0, x1, top):
        cur[0] = FACE
        for y in range(top, H):
            for x in range(x0, x1): put(x, y, masonry_px(x, y))
        for y in range(H - 6, H):
            for x in range(x0, x1): put(x, y, STONE * 1.18 if y == H - 6 else (STONE * 0.55 if y == H - 5 else masonry_px(x, y) * 0.82))
    def corbels(x0, x1, top):
        cur[0] = FACE
        for x in range(x0, x1):
            u = x % 10
            for y in range(top, top + 7): put(x, y, masonry_px(x, y) * 0.62)
            if 3 <= u <= 6:
                for y in range(top, top + 6): put(x, y, STONE * (1.2 if u == 3 else (0.72 if u == 6 else 1.0)))
                put(x, top + 6, STONE * 0.45)
            put(x, top + 7, STONE * 1.25); put(x, top + 8, STONE * 0.5)
    def course(x0, x1, y):
        cur[0] = FACE
        for x in range(x0, x1): put(x, y, STONE * 1.3); put(x, y + 1, STONE * 1.05); put(x, y + 2, STONE * 0.48)
        for x in range(x0, x1):
            for k, f in enumerate((0.7, 0.84)): shade(x, y + 3 + k, f)
    def lancet(cx, top, w, h, empty=False):
        cur[0] = FACE
        half = w / 2
        for y in range(top - 4, top + h + 1):
            t = y - top
            for x in range(int(cx - half - 4), int(cx + half + 5)):
                d = abs(x + 0.5 - cx)
                if arch_inside(d, t, half - 2.5, w - 5):
                    if empty: c = DARK if t < h * 0.3 else STONE * (0.2 + 0.22 * (t - h * 0.3) / (h * 0.7))   # the glass long gone: the inside, sunlit low down where the roof is open
                    else:
                        u_, v_ = (x + y) % 6, (x - y) % 6
                        c = SKY if t < h * 0.35 else GLASS
                        if u_ == 0 or v_ == 0: c = GLASS * 0.5
                    if abs(x + 0.5 - cx) < 0.8 and t > (w - 5) * 0.6 and not (empty and t < h * 0.7): c = STONE * 1.0
                    put(x, y, c)
                elif arch_inside(d, t, half, w):
                    put(x, y, masonry_px(x, y) * (0.5 if x < cx else 1.15))
                elif arch_inside(d, t + 2.5, half + 2, w + 4):
                    put(x, y, STONE * (1.3 if x < cx else 0.62))
        for x in range(int(cx - half - 2), int(cx + half + 3)):
            put(x, top + h, STONE * 1.25); put(x, top + h + 1, STONE * 0.95); put(x, top + h + 2, STONE * 0.45)
    def slit(cx, top, h=18):
        cur[0] = FACE
        for y in range(top, top + h):
            t = y - top
            hw = 1.5 if t > 2 else 0.5 + t * 0.4
            for x in range(cx - 4, cx + 5):
                d = abs(x + 0.5 - cx)
                if d <= hw: put(x, y, GLASS if t > 3 else SKY)
                elif d <= hw + 1.5: put(x, y, STONE * (0.55 if x < cx else 1.2))
                elif d <= hw + 2.6: put(x, y, STONE * (1.3 if x < cx else 0.62))
        for x in range(cx - 4, cx + 5): put(x, top + h, STONE * 1.25); put(x, top + h + 1, STONE * 0.45)
    def pier(lo, up, set_y, cap, pinnacle_top=None):
        cur[0] = PIER
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
        stage(a0, a1, set_y + 4, H)
        stage(b0, b1, cap + 4, set_y)
        for k in range(4):
            f = (k + 1) / 4
            x0, x1 = round(b0 + (a0 - b0) * f), round(b1 + (a1 - b1) * f)
            for x in range(x0, x1): put(x, set_y + k, STONE * (1.42 - 0.06 * k if x < x1 - 2 else 0.7))
        for x in range(a0, a1): put(x, set_y + 4, STONE * 0.45)
        for k in range(4):
            f = (k + 1) / 4
            x0, x1 = round((b0 + 2) + (b0 - (b0 + 2)) * f), round((b1 - 2) + (b1 - (b1 - 2)) * f)
            for x in range(x0, x1): put(x, cap + k, STONE * (1.42 - 0.06 * k if x < x1 - 2 else 0.7))
        for x in range(a0 - 1, a1 + 1):
            put(x, H - 6, STONE * 1.25); put(x, H - 5, STONE * 0.5)
            for y in range(H - 4, H): put(x, y, STONE * (1.0 if x > a0 else 1.2) * (0.6 if x >= a1 - 1 else 1.0))
        for y in range(cap + 4, H - 6):
            xr = (a1 if y >= set_y else b1)
            for k, f in enumerate((0.55, 0.68, 0.82)): shade(xr + k, y, f)
        if pinnacle_top is not None:
            px = (b0 + b1) // 2 - 3
            for y in range(pinnacle_top, cap):
                for x in range(px, px + 7): put(x, y, STONE * (1.28 if x < px + 2 else (0.6 if x > px + 4 else 1.0)))
                put(px, y, OUT); put(px + 6, y, OUT)
            for t in range(12):
                hw = 3.5 * (1 - t / 12)
                for x in range(int(px + 3.5 - hw), int(px + 3.5 + hw) + 1): put(x, pinnacle_top - 1 - t, STONE * (1.22 if x < px + 3.5 else 0.66))
    def corner_piers(set_y, cap, pin_top):
        pier((10, 24), (12, 22), set_y, cap, pin_top)
        pier((W - 24, W - 10), (W - 22, W - 12), set_y, cap, pin_top)
    def mid_pier(x, set_y, cap):
        pier((x - 5, x + 5), (x - 4, x + 4), set_y, cap)

    # ---------------- the houses ----------------
    kind = s['kind']
    if kind in ('NARROW', 'HALL', 'TALL', 'RUIN'):
        RIDGE, EAVE = s['ridge'], s['eave']
        slope(4, W - 4, RIDGE, EAVE)
        if kind == 'RUIN':
            # the right part of the roof fallen in: bare rafters over the dark inside, the slates' broken edge stepping down
            # Through the hole the inside is lit by the sun coming in: the far (north) wall's inner face at the top, the floor below it with a
            # patch of sunlight on it, in shadow under the slates that are left and in the stripes the rafters throw, black only in the deepest
            # corners and a few holes in the floor
            cur[0] = INSIDE
            brk = [int(W * 0.42 + 10 * math.sin(i * 1.7) + rng.randint(-4, 4)) for i in range(EAVE - RIDGE + 8)]
            edge_at = lambda y: brk[(y - RIDGE + 6) // 6 * 6 % len(brk)]
            FAR = RIDGE + 30                                               # where the far wall's face meets the floor
            RAF = list(range(int(W * 0.42) + 6, W - 8, 13))
            pits = [(rng.randint(int(W * 0.5), W - 20), rng.randint(FAR + 8, H - 20), rng.uniform(2.5, 5)) for _ in range(4)]
            def inside_px(x, y, b):
                if y < FAR:                                                # the far wall's inner face, lit from above and the left
                    c = masonry_px(x, y) * (0.62 + 0.2 * (y - RIDGE) / (FAR - RIDGE))
                    if y < RIDGE - 3: c = STONE * 1.25                    # its broken top, catching the light
                else:                                                      # the floor: flags, a sunlit patch, rubble
                    fx, fy = x % 12, (y - FAR) % 7
                    c = STONE * (0.78 if fx and fy else 0.5) * (0.96 + 0.05 * ((x // 12 + (y - FAR) // 7) % 3))
                    sun = ((x - 0.7 * (y - FAR)) - b) / 30.0               # a slanting patch of sun, further from the slates' edge
                    c = c * (0.62 + 0.55 * max(0.0, min(1.0, sun - 0.4)))
                    for rx in RAF:                                         # the rafters' shadows, thrown down and to the right
                        if 0 <= x - (rx + 3 + (y - FAR) // 4) < 3: c = c * 0.55
                    for py in (RIDGE + 22, RIDGE + 48):
                        if 0 <= y - (py + 14) < 2: c = c * 0.62
                    for (px2, py2, pr) in pits:                           # holes into the cellar: pitch black
                        if (x - px2) ** 2 + ((y - py2) * 1.6) ** 2 < pr * pr: c = DARK * 0.8
                d = x - b
                if d < 10: c = c * (0.35 + 0.065 * d) if d >= 0 else c * 0.35    # the gloom under the slates still standing
                if d < 3 and y > FAR: c = DARK                                    # and right under their edge, black
                return c
            self_inside = inside_px
            for y in range(RIDGE - 6, EAVE + 2):
                b = edge_at(y)
                for x in range(b, W - 4):
                    put(x, y, inside_px(x, y, b))
                put(b - 1, y, TILE * 0.35); put(b - 2, y, TILE * 1.25)          # the slates' broken edge
            for y in range(RIDGE - 6, RIDGE - 2):
                for x in range(int(W * 0.42) + 18, W): clear(x, y)          # (the ridge gone over it)
            cur[0] = ROOF
            for rx in range(int(W * 0.42) + 6, W - 8, 13):                 # rafters running up the slope, some snapped
                top = RIDGE - 2 if rng.random() < 0.6 else RIDGE + rng.randint(10, 30)
                for y in range(top, EAVE + 1):
                    put(rx, y, WOOD * 1.35); put(rx + 1, y, WOOD * 1.0); put(rx + 2, y, WOOD * 0.6)
                if top > RIDGE:
                    put(rx, top - 1, WOOD * 1.5); put(rx + 2, top - 2, WOOD * 0.8)
            for py in (RIDGE + 22, RIDGE + 48):                            # a purlin or two across them
                for x in range(int(W * 0.42) + 4, W - 6):
                    if (x * 7 + py) % 29 < 24:
                        put(x, py, WOOD * 1.3); put(x, py + 1, WOOD * 0.95); put(x, py + 2, WOOD * 0.55)
            coping(4, RIDGE, EAVE, True)
            coping(W - 11, RIDGE, EAVE, False, broken=34)
        else:
            coping(4, RIDGE, EAVE, True)
            coping(W - 11, RIDGE, EAVE, False)
        for cx in s.get('dormers', []): dormer(cx, EAVE - 10)
        for cx in s.get('chimneys', []): chimney(cx, RIDGE - 22, RIDGE + 16)
        wall(FX0, FX1, FACE0)
        corbels(FX0, FX1, FACE0)
        for y in s.get('courses', []): course(FX0, FX1, y)
        for (cx, top, w, h) in s['windows']: lancet(cx, top, w, h, empty=(kind == 'RUIN'))
        corner_piers(s['set'], FACE0 + 8, EAVE - 10)
        for x in s.get('mid_piers', []): mid_pier(x, s['set'], FACE0 + 8)
        if kind == 'RUIN':
            # the wall broken down toward the right end, course by course: its top a stepped line of blocks (lower toward the end), the
            # wall's thickness lit along it, the dark inside showing above; the piers there broken down with it
            cur[0] = FACE
            x_start = int(W * 0.56)
            drops = {}
            for x in range(x_start, W - 9):
                bk = (x - x_start) // 8
                if bk not in drops:
                    f = bk / max(1, (W - 9 - x_start) // 8)
                    drops[bk] = 8 * min(3, int(f * 3.4 + rng.random() * 0.9)) + rng.choice([0, 0, 2, 4])
                top = FACE0 + 10 + drops[bk]
                for y in range(4, top):
                    if part[y, x] == PIER and y < EAVE + 2: clear(x, y)        # its pinnacle gone
                    elif part[y, x] in (FACE, PIER) and y > EAVE + 1:
                        c = self_inside(x, y, int(W * 0.42))                     # the floor inside, seen over the broken wall
                        put(x, y, c * (0.55 + 0.35 * (top - y) / max(1, top - EAVE)))   # (the wall left standing shades its foot)
                put(x, top, STONE * 1.35); put(x, top + 1, STONE * 1.15); put(x, top + 2, STONE * 0.5)
                if (x - x_start) % 8 == 0:                                   # the step between blocks
                    for y in range(top, top + 3): put(x, y, OUT)
            cur[0] = RUBBLE                                                # rubble at the foot of the break, fallen blocks
            for i in range(16):
                bx = int(W * 0.6 + rng.random() * W * 0.3); by = H - 1 - rng.randint(0, 6)
                bw, bh = rng.randint(4, 8), rng.randint(3, 5)
                for y in range(by - bh, by):
                    for x in range(bx, bx + bw):
                        if x < W - 2: put(x, y, STONE * (1.25 if y == by - bh else (0.55 if y == by - 1 or x == bx + bw - 1 else 0.95)) * rng.uniform(0.9, 1.0))
            for vine in range(2):                                          # ivy up the broken end
                x, y = int(W * 0.5) + vine * 26, H - 3
                for _ in range(rng.randint(30, 50)):
                    if 0 <= y < H and 0 <= x < W and img[y, x, 3] and part[y, x] in (FACE, PIER) and img[y, x, :3].sum() > 120:
                        img[y, x, :3] = IVY[0]
                        lx = x + rng.choice([-1, 1])
                        if rng.random() < 0.6 and 0 <= lx < W and img[y, lx, 3]: img[y, lx, :3] = IVY[rng.randrange(1, 3)]
                    x += rng.choice([-1, 0, 0, 1]); y -= 1
    elif kind == 'ROW':
        # two houses as one: the left taller, the right lower, a party wall's coping standing up between them
        MID = s['mid']
        (r1, e1), (r2, e2) = s['roofs']
        slope(MID, W - 4, r2, e2)
        slope(4, MID + 4, r1, e1)
        coping(4, r1, e1, True)
        coping(W - 11, r2, e2, False)
        coping(MID - 3, r1, e1, True)
        for cx in s.get('dormers', []): dormer(cx, (e1 if cx < MID else e2) - 10)
        for (cx, side) in s.get('chimneys', []): chimney(cx, (r1 if side == 0 else r2) - 22, (r1 if side == 0 else r2) + 16)
        wall(FX0, FX1, FACE0)
        corbels(FX0, MID, e1 + 2)
        corbels(MID, FX1, e2 + 2)
        for (cx, top, w, h) in s['windows']: lancet(cx, top, w, h)
        corner_piers(s['set'], FACE0 + 8, e1 - 10)
        mid_pier(MID, s['set'], e2 + 10)
    elif kind == 'TOWER':
        # a tower house: a slate pyramid behind a crenellated parapet on a corbel table, three storeys of slits
        PT, PB = s['parapet']                       # the parapet's top (merlons) and its foot
        E, A = PT + 6, s['apex']                     # the roof's foot behind the parapet, its apex
        cur[0] = ROOF
        x0, x1, cx = 18, W - 18, W // 2
        d = 18                                      # how deep the pyramid's base reads, back from its front edge
        FL, FR, BL, BR, AP = (x0, E), (x1, E), (x0 + 6, E - d), (x1 - 6, E - d), (cx, A)
        for y in range(A - 1, E + 1):
            for x in range(x0 - 1, x1 + 2):
                if in_poly(x + 0.5, y + 0.5, [FL, FR, AP]): c = slate(x, E - y, 1.0)
                elif in_poly(x + 0.5, y + 0.5, [BL, FL, AP]): c = slate(y, x - x0, 1.32)
                elif in_poly(x + 0.5, y + 0.5, [BR, FR, AP]): c = slate(y, x1 - x, 0.58)
                else: continue
                put(x, y, c)
        for (a, b, lit) in ((AP, FL, 1.45), (AP, FR, 1.2)):        # hips
            n = int(math.hypot(b[0] - a[0], b[1] - a[1]))
            for i in range(n + 1):
                x = a[0] + (b[0] - a[0]) * i / n; y = a[1] + (b[1] - a[1]) * i / n
                put(x - 1, y, TILE * lit); put(x, y, TILE * 1.2); put(x + 1, y, TILE * 0.5)
        for y in range(A - 12, A + 1): put(cx - 0.5, y, STONE * 1.28); put(cx + 0.5, y, STONE * 0.7)   # its finial cross
        for x in range(cx - 4, cx + 5): put(x, A - 8, STONE * (1.28 if x < cx else 0.72))
        wall(FX0, FX1, PB)
        # the parapet on its corbels, standing out a little from the wall
        cur[0] = FACE
        for x in range(FX0 - 3, FX1 + 3):
            i = x - (FX0 - 3)
            m = ((x - FX0) % 14) < 8
            top = PT if m else PT + 7
            for y in range(top, PB):
                c = masonry_px(x, y) * 1.0
                if y < top + 2: c = STONE * 1.36
                elif y == top + 2: c = STONE * 1.1
                put(x, y, c)
            if m and (x - FX0) % 14 in (0, 7):
                for y in range(top, PB - 2): put(x, y, OUT)
            if not m: put(x, top - 1, OUT)
            put(x, PB, STONE * 0.45 if x % 6 else STONE * 0.9)
            u = x % 6
            for y in range(PB + 1, PB + 6): put(x, y, STONE * (1.15 if u == 1 else (0.7 if u == 4 else 0.5)) if 1 <= u <= 4 else masonry_px(x, y) * 0.45)
        for x in range(FX0, FX1):
            for k, f in enumerate((0.5, 0.64, 0.78, 0.9)): shade(x, PB + 6 + k, f)
        for (cx2, top) in s['slits']: slit(cx2, top)
        for y in s.get('courses', []): course(FX0, FX1, y)
        pier((10, 22), (11, 20), s['set'], PB + 8)
        pier((W - 22, W - 10), (W - 20, W - 11), s['set'], PB + 8)

    elif kind == 'ARMORY':
        # the armory: a long two-storey hall under a slate roof behind a battlemented parapet, a gabled frontispiece in the middle with the great
        # door (its gap one door wide, column DOOR_COL, cut clean through: CASTLE_DOOR stands in it) under a moulded arch, crossed swords carved
        # over it and a rose in the gable; barred windows below, lancets above, tattered banners hung on the face, a bartizan and a stair turret
        RIDGE, EAVE = s['ridge'], s['eave']
        slope(4, W - 4, RIDGE, EAVE)
        coping(4, RIDGE, EAVE, True)
        coping(W - 11, RIDGE, EAVE, False)
        for cx in s.get('dormers', []): dormer(cx, EAVE - 10)
        for cx in s.get('chimneys', []): chimney(cx, RIDGE - 22, RIDGE + 16)
        wall(FX0, FX1, FACE0)
        # the parapet along the face's top, on a row of corbels: merlons with a lit stone top
        cur[0] = FACE
        for x in range(FX0 - 2, FX1 + 2):
            m = ((x - FX0) % 14) < 8
            top = FACE0 - 14 if m else FACE0 - 6
            for y in range(top, FACE0 + 2):
                c = masonry_px(x, y) * 1.0
                if y < top + 3: c = STONE * 1.36
                elif y == top + 3: c = STONE * 1.08
                put(x, y, c)
            if m and (x - FX0) % 14 in (0, 7):
                for y in range(top, FACE0): put(x, y, OUT)
            if not m: put(x, top - 1, OUT)
            u = x % 8
            for y in range(FACE0 + 2, FACE0 + 9):
                put(x, y, STONE * (1.2 if u == 2 else (0.7 if u == 5 else 1.0)) if 2 <= u <= 5 else masonry_px(x, y) * 0.5)
            put(x, FACE0 + 9, STONE * 1.25); put(x, FACE0 + 10, STONE * 0.5)
        CS = s['course']
        course(FX0, FX1, CS)
        cxm = W // 2
        FR0, FR1 = cxm - 52, cxm + 52                     # the frontispiece
        # upper storey: lancets in the bays either side of the frontispiece; lower: barred windows
        for cx in s['upper']: lancet(cx, FACE0 + 20, 15, 34)
        def barred(cx, top, w=18, h=22):
            cur[0] = FACE
            for y in range(top - 3, top + h + 3):
                for x in range(cx - w // 2 - 3, cx + w // 2 + 3):
                    inside = cx - w // 2 <= x < cx + w // 2 and top <= y < top + h
                    if inside:
                        c = GLASS * 0.55 * (1.0 + 0.5 * (y - top) / h)
                        if (x - (cx - w // 2)) % 5 in (0, 1) or (y - top) % 7 == 0: c = IRON * (1.5 if (x - (cx - w // 2)) % 5 == 0 or (y - top) % 7 == 0 else 0.8)
                        put(x, y, c)
                    elif y < top or y >= top + h:
                        put(x, y, STONE * (1.3 if y < top else 0.55))
                    else:
                        put(x, y, STONE * (1.25 if x < cx else 0.6))
        for cx in s['lower']: barred(cx, CS + 12)
        # the frontispiece: a little proud of the face (its own lit edge and shadow), rising into a gable over the parapet
        GT = FACE0 - 58
        for y in range(GT, H):
            if y < FACE0 - 2:
                f = (y - GT) / (FACE0 - 2 - GT)
                hw = (FR1 - FR0) / 2 * f
                x0, x1 = int(cxm - hw), int(cxm + hw) + 1
            else:
                x0, x1 = FR0, FR1
            for x in range(x0, x1):
                c = masonry_px(x, y) * 1.06
                if y < FACE0 - 2 and (abs(x + 0.5 - x0) < 3.5 or abs(x + 0.5 - x1) < 3.5):
                    c = STONE * (1.32 if x < cxm else 0.62)                     # the gable's coping
                put(x, y, c)
            if y < FACE0 - 2:
                put(x0 - 1, y, OUT); put(x1, y, OUT)
                if (y - GT) % 9 == 5 and y > GT + 6:                            # crockets
                    put(x0 - 2, y, STONE * 1.3); put(x1 + 1, y, STONE * 0.7)
        for y in range(FACE0 - 2, H - 6):
            for k, f in enumerate((0.55, 0.7, 0.85)): shade(FR1 + k, y, f)
            put(FR0, y, STONE * 1.3); put(FR1 - 1, y, OUT)
        for y in range(GT - 16, GT + 1): put(cxm - 0.5, y, STONE * 1.28); put(cxm + 0.5, y, STONE * 0.7)   # its cross
        for x in range(cxm - 5, cxm + 6): put(x, GT - 11, STONE * (1.28 if x < cxm else 0.72))
        ocx, ocy, orr = cxm, GT + 34, 11                  # the rose
        for y in range(ocy - orr - 3, ocy + orr + 4):
            for x in range(ocx - orr - 3, ocx + orr + 4):
                dx, dy = x + 0.5 - ocx, y + 0.5 - ocy
                r = math.hypot(dx, dy)
                if r > orr + 2.5: continue
                if r > orr + 1: c = STONE * (1.0 + 0.3 * (-(dx * 0.6 + dy * 0.8) / (r + 1e-6)))
                elif r > orr: c = STONE * 0.5
                elif r < 2.5: c = STONE * 1.0
                else:
                    spoke = abs(((math.atan2(dy, dx) / (2 * math.pi) * 8) % 1) - 0.5) > 0.38
                    c = STONE * (1.02 if dx < 0 else 0.8) if spoke else (SKY if dy < -2 else GLASS)
                put(x, y, c)
        for (cx, cy) in ((FR0 + 16, FACE0 + 26), (FR1 - 16, FACE0 + 26)):   # tall lancets in the frontispiece's upper storey
            lancet(cx, cy, 14, 34)
        # the great door: its gap cut through, a moulded pointed arch over it (breaking up through the string course), crossed swords on the tympanum
        cur[0] = FACE
        gx0, gx1, gtop = s['door_col'] * 32, s['door_col'] * 32 + 32, H - 48
        dcx, half = (gx0 + gx1) / 2, 16
        APX = 30
        off = (APX * APX - half * half) / (2 * half); rad = half + off
        def field(x, y):
            px, py = x + 0.5 - dcx, y + 0.5 - gtop
            if py >= 0: return half - abs(px), ((-1.0 if px < 0 else 1.0), 0.0)
            ccx = off if px < 0 else -off
            dx, dy = px - ccx, py
            r = math.hypot(dx, dy) or 1e-6
            return rad - r, (dx / r, dy / r)
        lit = lambda n, k=0.4: 1.0 + k * (n[0] * -0.6 + n[1] * -0.8)
        for y in range(gtop - APX - 12, H):
            for x in range(gx0 - 12, gx1 + 12):
                dist, n = field(x, y)
                if dist >= 0:
                    if y < gtop:                          # the tympanum: two swords crossed, their hilts down
                        u, v = x + 0.5 - dcx, y + 0.5 - (gtop - 13)
                        c = STONE * 0.5
                        for sgn in (-1, 1):
                            if abs(u - sgn * v * 0.8) < 1.1 and -12 < v < 12: c = IRON * 1.7 if u * sgn < 0 else IRON * 1.2
                            if abs(v - 8) < 0.8 and abs(u - sgn * 6.4) < 3: c = np.array([170, 140, 70], np.float32)   # the guards
                        put(x, y, c)
                    continue
                if dist >= -3: put(x, y, masonry_px(x, y) * (0.55 + 0.5 * max(0.0, -(n[0] * -0.6 + n[1] * -0.8))))
                elif dist >= -6: put(x, y, STONE * 1.12 * lit(n))
                elif dist >= -7.5: put(x, y, STONE * 0.5 * lit(n, 0.2))
                elif dist >= -10: put(x, y, STONE * 1.18 * lit(n))
                elif dist >= -11: put(x, y, OUT)
        for y in range(gtop, H):
            for x in range(gx0, gx1): clear(x, y)
        # piers: at the corners, either side of the frontispiece, and between the bays
        corner_piers(s['set'], FACE0 + 10, None)
        for x in s.get('mid_piers', []): mid_pier(x, s['set'], FACE0 + 10)
        pier((FR0 - 6, FR0 + 4), (FR0 - 5, FR0 + 3), s['set'], FACE0 + 10)
        pier((FR1 - 4, FR1 + 6), (FR1 - 3, FR1 + 5), s['set'], FACE0 + 10)
        # bartizans: little round turrets corbelled out at the parapet's corners, slate caps
        for (bx, lit_side) in ((FX0 - 2, True),) + (() if s.get('turret') else ((FX1 - 14, False),)):
            cur[0] = PIER
            for y in range(FACE0 - 10, FACE0 + 22):
                for x in range(bx, bx + 16):
                    u = (x - bx - 7.5) / 8
                    if y > FACE0 + 12 and abs(u) > 1 - (y - FACE0 - 12) / 10: continue   # the corbelling, tapering under it
                    put(x, y, STONE * (0.65 + 0.45 * math.cos(math.asin(max(-1, min(1, u))) + 0.55)) * (0.6 if (y - FACE0) % 6 == 0 else 1.0))
            cur[0] = ROOF
            for t in range(26):
                hw = 9 * (1 - t / 26)
                y = FACE0 - 11 - t
                for x in range(int(bx + 7.5 - hw), int(bx + 7.5 + hw) + 1): put(x, y, slate(y, abs(x - bx - 7.5) * 2, 1.25 if x < bx + 7.5 else 0.62))
            for y in range(FACE0 - 44, FACE0 - 36): put(bx + 7, y, STONE * 1.2)
        # the turret: a round stair tower rising out of the armory's corner, up through the roof's line and well above it: courses of stone round
        # its drum (lit on the left), slit windows climbing it, string courses, a corbelled crenellated crown, a tall slate cone with a finial
        if s.get('turret'):
            tcx, tr = s['turret'], 23
            ttop = 70                                      # the crown's foot
            def cyl(u, k=0.55):
                """light on a cylinder at u (-1 left edge .. 1 right edge), lit from the upper left: bright on the left third, a dark core
                shadow past the middle, a little light bounced back along the far right edge"""
                th = math.asin(max(-1, min(1, u)))
                l = max(0.0, math.cos(th + k))
                bounce = 0.12 * max(0.0, u - 0.7) / 0.3
                return 0.38 + 0.78 * l ** 0.9 + bounce
            cur[0] = PIER
            for x in range(int(tcx - tr), int(tcx + tr) + 1):
                u = (x - tcx) / tr
                if abs(u) > 1: continue
                arc = tr * math.asin(u)
                light = cyl(u)
                for y in range(ttop, H):
                    ci = (y - ttop) // 8
                    bx = int((arc + (6 if ci % 2 else 0) + 200) // 12)
                    bu = (arc + (6 if ci % 2 else 0) + 200) % 12
                    yo = (y - ttop) % 8
                    k = 0.93 + 0.08 * ((ci * 7 + bx * 3) % 5) / 4 + (0.04 if (ci * 5 + bx * 11) % 9 == 0 else 0)
                    c = STONE * light * k
                    if yo == 0 or bu < 1: c = STONE * 0.4 * light                       # mortar
                    elif yo == 1: c = c * 1.08                                           # each block's lit top edge
                    elif yo == 7 or bu > 11: c = c * 0.82                                # its shaded lower edge
                    put(x, y, c)
            # weathering: streaks down from under each course band, a damp foot
            for y in range(ttop, H):
                for x in range(int(tcx - tr), int(tcx + tr) + 1):
                    if img[y, x, 3] and part[y, x] == PIER:
                        if y > H - 22: img[y, x, :3] *= 1.0 - 0.18 * (y - (H - 22)) / 22
            for sy in (ttop + 40, ttop + 96, ttop + 150):           # string courses round it: a lit top, a shadow under
                for x in range(int(tcx - tr) - 1, int(tcx + tr) + 2):
                    u = max(-1, min(1, (x - tcx) / (tr + 1)))
                    light = cyl(u)
                    put(x, sy, STONE * 1.25 * light); put(x, sy + 1, STONE * 1.05 * light); put(x, sy + 2, STONE * 0.4)
                    for k2, f in enumerate((0.72, 0.86)): shade(x, sy + 3 + k2, f)
                    if (x * 7 + sy) % 11 == 0:                          # a rain streak below it
                        for yy in range(sy + 3, sy + 3 + (x * 3 + sy) % 14): shade(x, yy, 0.9)
            for (sx, sy) in ((tcx - 7, ttop + 12), (tcx + 4, ttop + 58), (tcx - 4, ttop + 112), (tcx + 3, ttop + 164)):   # slits climbing with the stair
                u0 = (sx - tcx) / tr
                for y in range(int(sy) - 3, int(sy) + 19):
                    t = y - sy
                    for x in range(int(sx) - 4, int(sx) + 5):
                        d = abs(x + 0.5 - sx)
                        if 0 <= t < 16:
                            hw = 1.2 if t > 2 else 0.4 + t * 0.4
                            if d <= hw: put(x, y, GLASS * (0.6 if t > 3 else 1.0) if t > 3 else SKY * 0.8)
                            elif d <= hw + 1.4: put(x, y, STONE * (0.45 if x < sx else 1.15) * cyl(u0))     # the splay: the far side lit
                            elif d <= hw + 2.6: put(x, y, STONE * (1.3 if x < sx else 0.7) * cyl(u0))      # its dressed surround
                        elif t == -3 or t == -2: 
                            if d <= 4: put(x, y, STONE * (1.3 if t == -3 else 1.0) * cyl(u0))           # the lintel
                        elif t in (16, 17):
                            if d <= 4: put(x, y, STONE * (1.25 if t == 16 else 0.45) * cyl(u0))         # the sill
                for yy in range(int(sy) + 18, int(sy) + 28): shade(sx, yy, 0.86)                   # a stain under the sill
            # the crown: corbels with their drop-holes between, a ring of merlons standing out, their tops lit, its shade on the shaft below
            for x in range(int(tcx - tr) - 3, int(tcx + tr) + 4):
                u = max(-1, min(1, (x - tcx) / (tr + 3)))
                light = cyl(u)
                for y in range(ttop - 4, ttop + 6):
                    if y >= ttop:
                        corb = (x % 6) in (1, 2, 3)
                        c = STONE * light * (1.12 - 0.1 * (y - ttop)) if corb else STONE * 0.22
                    else: c = STONE * light * 1.12
                    put(x, y, c)
                put(x, ttop - 4, STONE * 1.3 * light)
            for x in range(int(tcx - tr), int(tcx + tr) + 1):
                for k2, f in enumerate((0.5, 0.62, 0.76, 0.9)): shade(x, ttop + 6 + k2, f)
            # the cone: slates in rings round it, lit as a cone (bright on the left, deep on the right), the rows set over, a lit eave lip
            cur[0] = ROOF
            CH = 66
            cb = ttop - 6
            for t in range(CH):
                y = cb - t
                hw = (tr - 2) * (1 - t / CH) ** 1.05
                for x in range(int(math.floor(tcx - hw)), int(math.ceil(tcx + hw)) + 1):
                    dx = (x + 0.5 - tcx) / max(1, hw)
                    if abs(dx) > 1: continue
                    light = cyl(dx, 0.5) * (1.05 - 0.15 * t / CH)
                    row = t // 5
                    su = (math.asin(max(-1, min(1, dx))) * 18 + (row % 2) * 4) % 8
                    c = TILE * light * (0.94 + 0.07 * ((row * 5 + int(math.asin(max(-1, min(1, dx))) * 18 / 8) * 3) % 4) / 3)
                    if t % 5 == 0: c = TILE * 0.42 * light                        # the shadow under each ring of slates
                    elif t % 5 == 4: c = c * 1.16                                 # each slate's lit lower edge
                    elif su < 1: c = c * 0.68                                     # the joints
                    put(x, y, c)
                put(math.floor(tcx - hw) - 1, y, OUT); put(math.ceil(tcx + hw) + 1, y, OUT)
            for x in range(int(tcx - tr + 1), int(tcx + tr)):                     # the eave lip over the crown
                u = (x - tcx) / tr
                put(x, cb + 1, TILE * 1.3 * cyl(u, 0.5)); put(x, cb + 2, OUT)
            cur[0] = PIER
            # the ring of merlons, in front of the cone's foot
            for x in range(int(tcx - tr) - 3, int(tcx + tr) + 4):
                u = max(-1, min(1, (x - tcx) / (tr + 3)))
                light = cyl(u)
                m = ((x - int(tcx - tr)) % 9) < 5
                top = ttop - 18 if m else ttop - 9
                for y in range(top, ttop - 4):
                    c = STONE * light * (1.32 if y < top + 2 else (0.95 + 0.1 * ((x // 9 + y // 5) % 2)))
                    if y == top: c = OUT
                    put(x, y, c)
                if m and (x - int(tcx - tr)) % 9 in (0, 4):
                    for y in range(top, ttop - 4): put(x, y, OUT)
            for y in range(cb - CH - 14, cb - CH + 2): put(tcx - 0.5, y, STONE * 1.3); put(tcx + 0.5, y, STONE * 0.68)   # the finial: a spike with a ball
            for (ox, oy, k2) in ((-1, -1, 1.3), (0, -1, 1.0), (1, -1, 0.7), (-1, 0, 1.2), (0, 0, 0.9), (1, 0, 0.6)): put(tcx + ox, cb - CH - 6 + oy, STONE * k2)
        # banners hung from the parapet, faded and tattered, a device on each
        cur[0] = INSIDE + 2
        for bx in s['banners']:
            for y in range(FACE0 + 10, FACE0 + 56):
                for x in range(bx - 7, bx + 8):
                    bottom = FACE0 + 50 + (4 if (x - bx) % 4 < 2 else 0) - (6 if abs(x - bx) < 2 else 0)
                    if y > bottom: continue
                    c = np.array([128, 46, 42], np.float32) * (1.15 if x < bx - 2 else (0.75 if x > bx + 3 else 1.0)) * (0.92 if (x - bx) % 5 == 0 else 1.0)
                    if abs(x - bx) < 3 and FACE0 + 22 < y < FACE0 + 34 and abs(x - bx) + abs(y - FACE0 - 28) < 6: c = np.array([190, 160, 80], np.float32)
                    put(x, y, c)
            for x in range(bx - 9, bx + 10): put(x, FACE0 + 10, WOOD * 1.2); put(x, FACE0 + 11, WOOD * 0.8)
    # ---------------- the shading that makes it stand up ----------------
    a = img[..., 3] > 0
    ys, xs = np.mgrid[0:H, 0:W]
    def mul(mask, k):
        img[mask, :3] *= (k[mask][:, None] if isinstance(k, np.ndarray) else k)
    roof = a & (part == ROOF)
    top_y, bot_y = (ys[roof].min(), ys[roof].max()) if roof.any() else (0, 1)
    mul(roof, 1.14 - 0.28 * np.clip((ys - top_y) / max(1, bot_y - top_y), 0, 1))
    mul(roof, 1.02 - 0.1 * xs / W)
    eave_shadow = s.get('eave_shadow', FACE0 + 9)
    for k, f in enumerate((0.42, 0.52, 0.62, 0.72, 0.82, 0.9)):
        mul(a & ((part == FACE) | (part == PIER)) & (ys == eave_shadow + k), f)
    front = a & ((part == FACE) | (part == PIER))
    mul(front & (part == FACE), 0.86)
    mul(front, 1.06 - 0.3 * np.clip((ys - FACE0) / (H - FACE0), 0, 1) ** 1.4)
    mul(front, 1.03 - 0.08 * xs / W)
    mul(a & (part == PIER) & (ys > H - 14), 0.9)
    edge = a & ~(np.roll(a, 1, 0) & np.roll(a, -1, 0) & np.roll(a, 1, 1) & np.roll(a, -1, 1))
    edge[-1, :] = False
    img[edge, :3] = OUT
    for i in range(W // 6):
        x, y = 16 + (i * 53) % (W - 32), H - 2 - (i * 7) % 9
        if a[y, x] and not edge[y, x]: img[y, x, :3] = img[y, x, :3] * 0.4 + MOSS * 0.6
    if kind == 'RUIN':
        for i in range(120):
            x, y = rng.randrange(W), rng.randrange(H)
            if a[y, x] and not edge[y, x] and part[y, x] in (FACE, ROOF, PIER): img[y, x, :3] = img[y, x, :3] * 0.45 + MOSS * 0.55
    return img

def save(img, path):
    H, W = img.shape[:2]
    rgba = np.clip(img, 0, 255).astype(np.uint8)
    alpha = rgba[..., 3].copy()
    q = Image.fromarray(rgba[..., :3], 'RGB').quantize(colors=PALETTE, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
    out = np.dstack([np.asarray(q), np.where(alpha > 0, 255, 0).astype(np.uint8)])
    SH = np.array([14, 11, 10], np.uint8)
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

HOUSES = {
    'Narrow': dict(kind='NARROW', w=3, h=5, ridge=34, eave=100, face0=102, set=132, chimneys=[66], windows=[(48, 120, 15, 28)]),
    'Hall': dict(kind='HALL', w=7, h=5, ridge=30, eave=102, face0=104, set=132, dormers=[64, 160], chimneys=[112, 200],
                 windows=[(40, 122, 14, 26), (78, 122, 14, 26), (112, 120, 17, 30), (146, 122, 14, 26), (184, 122, 14, 26)], mid_piers=[95, 129]),
    'Tall': dict(kind='TALL', w=4, h=6, ridge=30, eave=92, face0=94, set=150, dormers=[48], chimneys=[96], courses=[140],
                 windows=[(40, 110, 13, 22), (86, 110, 13, 22), (40, 154, 14, 26), (86, 154, 14, 26)], mid_piers=[64]),
    'Tower': dict(kind='TOWER', w=4, h=7, apex=18, parapet=(84, 100), face0=100, set=170, eave_shadow=108, courses=[146, 188],
                  slits=[(44, 118), (84, 118), (64, 158), (44, 196), (84, 196)]),
    'Row': dict(kind='ROW', w=6, h=5, mid=104, roofs=((28, 100), (44, 104)), face0=102, set=132, dormers=[52], chimneys=[(76, 0), (156, 1)],
                windows=[(40, 120, 14, 28), (78, 120, 14, 28), (128, 122, 14, 26), (166, 122, 14, 26)]),
    'Armory': dict(kind='ARMORY', w=11, h=9, ridge=62, eave=150, face0=160, set=242, course=226, door_col=5, dormers=[60, 260], chimneys=[90, 230],
                   upper=[40, 76, 276], lower=[40, 80, 272], mid_piers=[58, 294], banners=[96, 256], eave_shadow=172, turret=322),
    'Ruin': dict(kind='RUIN', w=5, h=5, ridge=30, eave=102, face0=104, set=132, seed=7, chimneys=[40],
                 windows=[(42, 120, 14, 28), (80, 120, 16, 30), (120, 124, 14, 24)], mid_piers=[100]),
}

out_dir = sys.argv[1]
for name, spec in HOUSES.items():
    save(build(spec), os.path.join(out_dir, 'objCastleArmory.png' if name == 'Armory' else f'objCastleHouse{name}.png'))
print('ok', ', '.join(HOUSES))
