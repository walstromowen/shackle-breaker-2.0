# The castle town's house (mapObjects/objCastleTownhouse.png): a house of the town inside the castle's walls (castleLayout.js: plan.buildings),
# in the keep's gothic manner and the walls' own stone (castleKeep.py: the same 16 x 8 blocks on the same 32 px grid, the same slate), at the
# size of the abandoned village's house: 5 x 5 tiles (160 x 160), its walls the bottom two rows, the door gap one door wide (column 2, 32 px)
# and 48 px tall down to the bottom edge, cut clean through (the door object, HOUSE_DOOR_WOODEN, stands in it).
#
# Seen from the south and above, gable end on: a steep slate roof (its lit left plane and shaded right one meeting at the ridge), and before it
# a stone gable with a crocketed coping, a cross at its peak and a small rose window, on a front of ashlar between corner buttresses: a pointed
# lancet of leaded glass either side of the door, the door (CASTLE_DOOR: iron) under a moulded pointed arch. A stone chimney stands on the right plane.
#   python3 castleTownhouse.py <out.png>
import sys, math
import numpy as np
from PIL import Image

W = H = 160
STONE = np.array([156, 148, 128], np.float32)   # the walls' limestone
TILE = np.array([118, 112, 108], np.float32)    # the keep's slate
GLASS = np.array([30, 38, 60], np.float32)
SKY = np.array([58, 80, 128], np.float32)
MOSS = np.array([74, 98, 50], np.float32)
SHADE = np.array([[1.0, 0.93], [0.96, 1.04], [1.05, 0.95], [0.94, 1.0]], np.float32)
OUT = STONE * 0.34
PALETTE = 40
LX, LY = -0.6, -0.8

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
    """a slate at (u along the ridge, v out from it): 6 x 8, courses set over by half, a joint, a lit edge, a dark lip"""
    u, v = int(u), int(v)
    col = v // 6
    su = (u + (col % 2) * 4) % 8
    sv = v % 6
    ti = (u + (col % 2) * 4) // 8
    c = TILE * (0.93, 1.0, 1.06, 0.97)[(ti * 7 + col * 5) % 4]
    if sv == 0: c = TILE * 0.5
    elif su == 0: c = TILE * 0.62
    elif sv == 5: c = c * 0.82
    elif su == 1: c = c * 1.14
    return c * light

def in_poly(px, py, pts):
    inside = False
    n = len(pts)
    for i in range(n):
        x1, y1 = pts[i]; x2, y2 = pts[(i + 1) % n]
        if (y1 > py) != (y2 > py) and px < (x2 - x1) * (py - y1) / (y2 - y1 + 1e-9) + x1: inside = not inside
    return inside

def house():
    img = np.zeros((H, W, 4), np.float32)
    part = np.zeros((H, W), np.uint8)           # what each pixel belongs to (ROOF, CHIM, FACE, PIER, GABLE, DOOR), for the shading at the end
    cur = [0]
    def put(x, y, c):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < W and 0 <= y < H: img[y, x, :3] = np.clip(c, 0, 255); img[y, x, 3] = 255; part[y, x] = cur[0]
    def shade(x, y, k):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < W and 0 <= y < H and img[y, x, 3] > 0: img[y, x, :3] *= k
    CX = 80
    FACE0, FX0, FX1 = 100, 14, 146             # the front: its top (the gable's foot), its sides
    APEX, GAP = 52, (64, 96, 112)              # the gable's peak; the door gap x0, x1, top

    # ---------------- the roof: two planes from the ridge (x = CX) down to the eaves; the far verges rise to the ridge's top ----------------
    cur[0] = ROOF
    RT, VY, EY = 4, 54, 108                    # the ridge's top, the outer verges' top, the eaves' corners
    left = [(CX, RT), (4, VY), (4, EY), (CX, APEX + 4)]
    right = [(CX, RT), (W - 4, VY), (W - 4, EY), (CX, APEX + 4)]
    for y in range(RT, EY + 1):
        for x in range(2, W - 2):
            if in_poly(x + 0.5, y + 0.5, left): c = slate(y, CX - x, 1.22)
            elif in_poly(x + 0.5, y + 0.5, right): c = slate(y, x - CX, 0.62)
            else: continue
            put(x, y, c)
    for y in range(RT, EY + 1):                # the eaves' edges, the verges: a lit or dark lip
        for x in range(2, W - 2):
            a = in_poly(x + 0.5, y + 0.5, left) or in_poly(x + 0.5, y + 0.5, right)
            if not a: continue
            below = in_poly(x + 0.5, y + 2.5, left) or in_poly(x + 0.5, y + 2.5, right)
            above = in_poly(x + 0.5, y - 1.5, left) or in_poly(x + 0.5, y - 1.5, right)
            if not below: put(x, y, TILE * (1.35 if x < CX else 0.8)); put(x, y + 1, OUT)
            elif not above: put(x, y, TILE * (1.45 if x < CX else 0.9))
    for y in range(RT, APEX + 6):              # the ridge: a capping, lit on its left
        put(CX - 1, y, TILE * 1.5); put(CX, y, TILE * 1.15); put(CX + 1, y, TILE * 0.5)
    for x in (4, W - 5):
        for y in range(VY, EY + 1): put(x, y, OUT)
    # the chimney: a stone stack on the right plane, a cap, the flue
    cur[0] = CHIM
    CH0, CH1, CHT = 108, 122, 18
    for y in range(CHT, 66):
        for x in range(CH0, CH1):
            i = x - CH0
            r = (y // 5) % 2
            joint = (y % 5 == 0) or ((x + r * 4) % 8 == 0)
            k = 1.22 if i < 4 else (0.6 if i > 10 else 0.98)
            put(x, y, STONE * (0.55 if joint else k))
        put(CH0 - 1, y, OUT); put(CH1, y, OUT)
    for x in range(CH0 - 2, CH1 + 2):
        put(x, CHT - 2, OUT); put(x, CHT - 1, STONE * 1.3); put(x, CHT, STONE * 1.05); put(x, CHT + 1, STONE * 0.5)
    for x in range(CH0 + 3, CH1 - 3): put(x, CHT - 3, STONE * 0.2)
    for y in range(58, 72):                    # its shadow down the slates
        for k, f in enumerate((0.55, 0.68, 0.82)): shade(CH1 + 1 + k, y, f)

    # ---------------- the front: ashlar between buttresses, a string course under the gable ----------------
    cur[0] = FACE
    for y in range(FACE0, H):
        for x in range(FX0, FX1):
            put(x, y, masonry_px(x, y) * (1.02 - 0.12 * (y - FACE0) / (H - FACE0)))
    for x in range(FX0, FX1):                  # the eaves' shadow on the face's top
        for k, f in enumerate((0.55, 0.7, 0.85)): shade(x, FACE0 + 4 + k, f)
    for y in range(H - 6, H):                  # the plinth
        for x in range(FX0, FX1): put(x, y, STONE * 1.18 if y == H - 6 else (STONE * 0.55 if y == H - 5 else masonry_px(x, y) * 0.82))
    def arch_inside(d, t, half, w):
        ah = 0.866 * w
        if t >= ah: return d <= half
        return t >= 0 and (d + half) ** 2 + (ah - t) ** 2 <= w * w
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
                    if abs(x + 0.5 - cx) < 0.8 and t > (w - 5) * 0.6: c = STONE * 1.0      # the mullion
                    put(x, y, c)
                elif arch_inside(d, t, half, w):
                    put(x, y, masonry_px(x, y) * (0.5 if x < cx else 1.15))          # the reveal, lit on its right
                elif arch_inside(d, t + 2.5, half + 2, w + 4):
                    put(x, y, STONE * (1.3 if x < cx else 0.62))                       # the hood moulding
        for x in range(int(cx - half - 2), int(cx + half + 3)):
            put(x, top + h, STONE * 1.25); put(x, top + h + 1, STONE * 0.95); put(x, top + h + 2, STONE * 0.45)
    lancet(39, 112, 15, 30)
    lancet(121, 112, 15, 30)
    # buttresses at the corners: piers standing out from the front and past its sides, set back once (a sloped weathering at the set-off)
    # and capped with a sloped top under a pinnacle; each face lit from the upper left (a lit left arris, a dark right one), a shadow cast
    # onto the wall to the right
    cur[0] = PIER
    SET, CAP = 128, FACE0 + 2                     # the set-off's foot; the top of the pier
    def pier(lo, up):
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
                    put(x, y, c * (1.0 - 0.1 * (y - CAP) / (H - CAP)))
        stage(a0, a1, SET + 4, H)
        stage(b0, b1, CAP + 4, SET)
        for k in range(4):                         # the weathering at the set-off: a slope from the upper stage out to the lower one, lit
            f = (k + 1) / 4
            x0, x1 = round(b0 + (a0 - b0) * f), round(b1 + (a1 - b1) * f)
            for x in range(x0, x1): put(x, SET + k, STONE * (1.42 - 0.06 * k if x < x1 - 2 else 0.7))
        for x in range(a0, a1): put(x, SET + 4, STONE * 0.45)
        for k in range(4):                         # its sloped top
            f = (k + 1) / 4
            x0, x1 = round((b0 + 2) + (b0 - (b0 + 2)) * f), round((b1 - 2) + (b1 - (b1 - 2)) * f)
            for x in range(x0, x1): put(x, CAP + k, STONE * (1.42 - 0.06 * k if x < x1 - 2 else 0.7))
        for x in range(a0 - 1, a1 + 1):            # its plinth, a course wider
            put(x, H - 6, STONE * 1.25); put(x, H - 5, STONE * 0.5)
            for y in range(H - 4, H): put(x, y, STONE * (1.0 if x > a0 else 1.2) * (0.6 if x >= a1 - 1 else 1.0))
        for y in range(CAP + 4, H - 6):            # its shadow on the wall to its right
            xr = (a1 if y >= SET else b1)
            for k, f in enumerate((0.55, 0.68, 0.82)): shade(xr + k, y, f)
    pier((10, 24), (12, 22))
    pier((136, 150), (138, 148))

    # ---------------- the gable: a stone triangle on the front, a crocketed coping, a rose, a cross at its peak ----------------
    cur[0] = GABLE
    for y in range(APEX, FACE0 + 1):
        f = (y - APEX) / (FACE0 - APEX)
        hw = (FX1 - FX0) / 2 * f
        for x in range(int(CX - hw), int(CX + hw) + 1):
            c = masonry_px(x, y) * (1.04 if x < CX else 0.92)
            if abs(x + 0.5 - (CX - hw)) < 3.5: c = STONE * 1.32               # the coping, lit on the left
            elif abs(x + 0.5 - (CX + hw)) < 3.5: c = STONE * 0.62
            put(x, y, c)
        put(CX - hw - 1, y, OUT); put(CX + hw + 1, y, OUT)
        if (y - APEX) % 9 == 6 and f > 0.12:   # crockets
            put(CX - hw - 2, y, STONE * 1.3); put(CX - hw - 3, y - 1, STONE * 1.15)
            put(CX + hw + 2, y, STONE * 0.72); put(CX + hw + 3, y - 1, STONE * 0.6)
    for x in range(FX0, FX1):                   # the string course along the gable's foot
        put(x, FACE0, STONE * 1.3); put(x, FACE0 + 1, STONE * 1.05); put(x, FACE0 + 2, STONE * 0.48)
    for y in range(APEX - 12, APEX + 1): put(CX - 0.5, y, STONE * 1.28); put(CX + 0.5, y, STONE * 0.7)   # its cross
    for x in range(CX - 4, CX + 5): put(x, APEX - 8, STONE * (1.28 if x < CX else 0.72))
    for x in (CX - 1, CX, CX + 1): put(x, APEX - 13, OUT)
    ocx, ocy, orr = CX, 67, 7                    # the rose
    for y in range(ocy - orr - 3, ocy + orr + 4):
        for x in range(ocx - orr - 3, ocx + orr + 4):
            dx, dy = x + 0.5 - ocx, y + 0.5 - ocy
            r = math.hypot(dx, dy)
            if r > orr + 2.5: continue
            n = (dx * LX + dy * LY) / (r + 1e-6)
            if r > orr + 1: c = STONE * (1.0 + 0.32 * n)
            elif r > orr: c = STONE * 0.5
            elif r < 2: c = STONE * 1.0
            else:
                spoke = abs(((math.atan2(dy, dx) / (2 * math.pi) * 8) % 1) - 0.5) > 0.38
                c = STONE * (1.02 if dx < 0 else 0.8) if spoke else (SKY if dy < -2 else GLASS)
            put(x, y, c)
    cur[0] = PIER
    for px in (14, 139):                       # little pinnacles on the piers, at the gable's feet
        for y in range(FACE0 - 14, FACE0):
            for x in range(px, px + 7): put(x, y, STONE * (1.28 if x < px + 2 else (0.6 if x > px + 4 else 1.0)))
            put(px, y, OUT); put(px + 6, y, OUT)
        for t in range(12):
            hw = 3.5 * (1 - t / 12)
            for x in range(int(px + 3.5 - hw), int(px + 3.5 + hw) + 1): put(x, FACE0 - 15 - t, STONE * (1.22 if x < px + 3.5 else 0.66))

    # the door (after the gable: its arch breaks up through the string course, short of the rose): the gap is cut through; round it a moulded pointed arch, its head a tympanum of stone
    cur[0] = DOOR
    gx0, gx1, gtop = GAP
    dcx, half = (gx0 + gx1) / 2, (gx1 - gx0) / 2
    APX = 20                                    # the arch's rise above the gap's top
    off = (APX * APX - half * half) / (2 * half); rad = half + off
    def field(x, y):                            # (signed distance inside the opening, its outward normal)
        px, py = x + 0.5 - dcx, y + 0.5 - gtop
        if py >= 0: return half - abs(px), ((-1.0 if px < 0 else 1.0), 0.0)
        ccx = off if px < 0 else -off
        dx, dy = px - ccx, py
        r = math.hypot(dx, dy) or 1e-6
        return rad - r, (dx / r, dy / r)
    lit = lambda n, k=0.4: 1.0 + k * (n[0] * LX + n[1] * LY)
    for y in range(gtop - APX - 8, H):
        for x in range(gx0 - 8, gx1 + 8):
            dist, n = field(x, y)
            if dist >= 0:
                if y < gtop:                    # the tympanum over the gap: dark stone, a carved quatrefoil
                    q = math.hypot(x + 0.5 - dcx, y + 0.5 - (gtop - 9))
                    put(x, y, STONE * (0.32 if 3 < q < 5 else 0.48))
                continue
            if dist >= -2: put(x, y, masonry_px(x, y) * (0.55 + 0.5 * max(0.0, -(n[0] * LX + n[1] * LY))))
            elif dist >= -4: put(x, y, STONE * 1.12 * lit(n))
            elif dist >= -5: put(x, y, STONE * 0.5 * lit(n, 0.2))
            elif dist >= -6.5: put(x, y, STONE * 1.18 * lit(n))
            elif dist >= -7.5: put(x, y, OUT)
    for y in range(gtop, H):                    # the gap itself, cut clean
        for x in range(gx0, gx1): img[y, x] = 0
    # ---------------- the shading that makes it stand up: light from the upper left ----------------
    a = img[..., 3] > 0
    ys, xs = np.mgrid[0:H, 0:W]
    def mul(mask, k):
        img[mask, :3] *= (k[mask][:, None] if isinstance(k, np.ndarray) else k)
    # the roof: lighter up by the ridge, darker down to the eaves (the slates nearest the eaves in the gloom under the next course), the
    # outer verges darkened; the gable stands proud of the slates and throws a shadow down the right plane beside its coping
    roof = a & (part == ROOF)
    d = np.clip((ys - RT) / (EY - RT), 0, 1)
    mul(roof, 1.12 - 0.3 * d)
    mul(roof & (xs < CX), 1.1); mul(roof & (xs > CX), 0.8)          # the planes: one to the light, one away
    mul(roof & ((xs < 10) | (xs > W - 11)), 0.82)
    gab_hw = lambda y: (FX1 - FX0) / 2 * np.clip((y - APEX) / (FACE0 - APEX), 0, 1)
    for k, f in enumerate((0.5, 0.62, 0.74, 0.86)):
        m = roof & (ys >= APEX) & (ys <= FACE0) & (np.abs(xs - (CX + gab_hw(ys) + 2 + k)) < 0.6)
        mul(m, f)
    for k, f in enumerate((0.55, 0.7, 0.85)):           # and the chimney's own on the slates below it, longer
        mul(roof & (ys == 66 + k * 2) & (xs >= CH0) & (xs < CH1 + 3), f)
    # under the eaves: where the roof overhangs the piers and the wall's top corners, a band of shadow
    for k, f in enumerate((0.45, 0.58, 0.7, 0.82, 0.92)):
        m = a & ((part == PIER) | (part == FACE)) & (ys == EY + 1 + k) & ((xs < 34) | (xs > W - 35))
        mul(m, f)
    # the front: darker toward its foot (damp, the ground's gloom), a touch darker to the right (turned from the light), and a soft
    # darkening in the corners where the wall meets the piers and the string course
    front = a & ((part == FACE) | (part == GABLE) | (part == DOOR) | (part == PIER))
    # (an upright face takes less of the light than the roof does: the whole front a step darker than the slates' lit plane)
    mul(front & (part != PIER), 0.86)
    mul(front, 1.06 - 0.3 * np.clip((ys - FACE0) / (H - FACE0), 0, 1) ** 1.4)
    # the gable's coping stands out from its face: a line of shadow under it inside each edge, deeper on the right
    gab = a & (part == GABLE)
    for k, f in enumerate((0.6, 0.74, 0.88)):
        inner = 3.5 + k
        mul(gab & (ys > APEX + 4) & (np.abs(xs + 0.5 - (CX - gab_hw(ys) + inner)) < 0.55), f + 0.08)
        mul(gab & (ys > APEX + 4) & (np.abs(xs + 0.5 - (CX + gab_hw(ys) - inner)) < 0.55), f - 0.06)
    mul(front, 1.03 - 0.08 * xs / W)
    face = a & (part == FACE)
    for k, f in enumerate((0.62, 0.78, 0.9)):
        mul(face & (np.abs(xs - (24 + k)) < 0.5), f)                 # right of the left pier (in its shadow already: deepened)
        mul(face & (np.abs(xs - (135 - k)) < 0.5), 0.8 + 0.06 * k)   # left of the right pier
        mul(face & (ys == FACE0 + 3 + k), f + 0.1)                  # under the string course
    # round the door: the reveal deepest at its foot
    for k, f in enumerate((0.6, 0.75, 0.88)):
        mul(a & (part == DOOR) & (ys > GAP[2]) & ((np.abs(xs - (GAP[0] - 1 - k)) < 0.5) | (np.abs(xs - (GAP[1] + k)) < 0.5)), f)
    # the piers: their foot in the ground's gloom
    mul(a & (part == PIER) & (ys > H - 14), 0.9)

    # ---------------- weather, the outline, moss ----------------
    edge = a & ~(np.roll(a, 1, 0) & np.roll(a, -1, 0) & np.roll(a, 1, 1) & np.roll(a, -1, 1))
    edge[-1, :] = False                         # (the foot sits on the ground: no outline along it)
    img[edge, :3] = OUT
    for i in range(26):
        x, y = 16 + (i * 53) % 128, H - 2 - (i * 7) % 9
        if a[y, x] and not edge[y, x]: img[y, x, :3] = img[y, x, :3] * 0.4 + MOSS * 0.6
    for i in range(10):                         # moss in the slates near the eaves
        x = 10 + (i * 37) % 140; y = 96 + (i * 5) % 10
        if a[y, x] and not edge[y, x]: img[y, x, :3] = img[y, x, :3] * 0.5 + MOSS * 0.5
    return img

ROOF, CHIM, FACE, PIER, GABLE, DOOR = 1, 2, 3, 4, 5, 6
img = house()
rgba = np.clip(img, 0, 255).astype(np.uint8)
alpha = rgba[..., 3].copy()
q = Image.fromarray(rgba[..., :3], 'RGB').quantize(colors=PALETTE, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
out = np.dstack([np.asarray(q), np.where(alpha > 0, 255, 0).astype(np.uint8)])
# the shadow on the ground at the house's foot (as the abandoned house has): soft, cast to the right and a little down, seen beside the piers
# and along the foot (never in the door gap, where the door stands)
SH = np.array([14, 11, 10], np.uint8)
for y in range(H - 12, H):
    for x in range(W):
        if out[y, x, 3] or (64 <= x < 96 and y >= 112): continue
        t = (y - (H - 12)) / 11                          # deeper toward the ground line
        if x < 10: k = max(0.0, 1 - (10 - x) / 9) * 0.55   # thin on the lit left
        elif x >= W - 10: k = max(0.0, 1 - (x - (W - 10)) / 10) * 0.95
        else: k = 0.8
        al = int(215 * k * t ** 1.3)
        if al > 8: out[y, x] = [*SH, al]
Image.fromarray(out, 'RGBA').save(sys.argv[1], optimize=True)
print('ok', img.shape)
