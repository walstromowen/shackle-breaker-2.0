# The castle's keep (tilesets/castle_ruins_exterior/castle_keep.png): the great hall-keep that stands on the raised platform in the middle of
# the castle (castleLayout.js: plan.keep), in the towers' gothic manner and the walls' own stone (the same 16 x 8 blocks on the same 32 px grid).
#
# Its footprint is KW x KD cells, the whole platform but the terrace and lip before its door. Seen from the south and above: its front face (RISE tiles tall, its foot on the bottom
# of its footprint), and its top: a walk behind the front battlements, a hipped roof of tiles (three faces: lit, front, shaded) with dormers and
# chimneys, and a tower on each corner, the front two full height, rising above the parapet under tiled caps. The front: a central bay under a
# stone gable (crocketed, with pinnacles) with a rose window and a great double door two cells wide in its middle columns (over the platform's
# stair), and either side bays of tall pointed windows in two storeys between buttresses. The frame is W x (TOP + KD*32 + RISE*32); placed
# at x = footprint col * 32, y = (footprint row + KD) * 32 - its height; it sorts by the row under its footprint.
#   python3 castleKeep.py <out.png>
import sys, math
import numpy as np
from PIL import Image
sys.path.insert(0, __import__('os').path.dirname(__import__('os').path.abspath(__file__)))
from walltop import walltop

KW, KD, RISE = 20, 10, 8                        # castleLayout's KEEP_SIZE: the platform's width, its depth less the terrace and lip before the door
W, TOP, ROOF, FACE = KW * 32, 124, KD * 32, RISE * 32
H = TOP + ROOF + FACE
STONE = np.array([156, 148, 128], np.float32)   # the walls' limestone
WALK = np.array([138, 134, 120], np.float32)
TILE = np.array([118, 112, 108], np.float32)    # the towers' roof tiles
GLASS = np.array([30, 38, 60], np.float32)
SKY = np.array([58, 80, 128], np.float32)
WOOD = np.array([92, 64, 40], np.float32)
IRON = np.array([44, 44, 50], np.float32)
MOSS = np.array([74, 98, 50], np.float32)
SHADE = np.array([[1.0, 0.93], [0.96, 1.04], [1.05, 0.95], [0.94, 1.0]], np.float32)
OUT = STONE * 0.34
PALETTE = 56
LX, LY = -0.6, -0.8                                 # toward the light (the upper left)

def masonry_px(x, y):
    lx, ly = int(x) % 32, (int(y) - TOP) % 32
    row = ly // 8
    sx = (lx + (row % 2) * 8) % 32
    xo, yo = sx % 16, ly % 8
    k = SHADE[row, sx // 16]
    if yo == 0 or xo == 0: return STONE * 0.42
    if yo == 1: return STONE * k * 1.12
    if yo == 7 or xo == 15: return STONE * k * 0.8
    return STONE * k

def ashlar(x, y):
    x, y = int(x), int(y)
    r = y // 6
    sx = (x + (r % 2) * 4) % 8
    k = 0.96 + 0.06 * (((x // 8) * 7 + r * 5) % 4) / 3
    if y % 6 == 0 or sx == 0: return STONE * 0.62
    if y % 6 == 1: return STONE * k * 1.1
    return STONE * k

def roof_tile(u, v, light):
    """a tile at (u along the face's eave, v up from it): 8 x 6, rows set over by half, a joint, a lit top and left edge, a dark lip"""
    u, v = int(u), int(v)
    row = v // 6
    su = (u + (row % 2) * 4) % 8
    sv = v % 6
    ti = (u + (row % 2) * 4) // 8
    c = TILE * (0.93, 1.0, 1.06, 0.97)[(ti * 7 + row * 5) % 4]
    if sv == 0: c = TILE * 0.46
    elif su == 0: c = TILE * 0.62
    elif sv == 1 and su in (1, 7): c = TILE * 0.62
    elif sv == 5: c = c * 1.2
    elif su == 1: c = c * 1.1
    return c * light

def in_poly(px, py, pts):
    inside = False
    n = len(pts)
    for i in range(n):
        x1, y1 = pts[i]; x2, y2 = pts[(i + 1) % n]
        if (y1 > py) != (y2 > py) and px < (x2 - x1) * (py - y1) / (y2 - y1 + 1e-9) + x1: inside = not inside
    return inside

def keep():
    img = np.zeros((H, W, 4), np.float32)
    def put(x, y, c):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < W and 0 <= y < H: img[y, x, :3] = np.clip(c, 0, 255); img[y, x, 3] = 255
    def shade(x, y, k):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < W and 0 <= y < H and img[y, x, 3] > 0: img[y, x, :3] *= k
    roof0, face0 = TOP, TOP + ROOF
    TT = 64                                          # a corner tower's width

    # ---------------- a corner tower's parts ----------------
    def tower_shaft(x0, y_top, y_bot, slits=True):
        """an octagonal tower's shaft: three faces (lit, front, shaded), ringed by string courses, its slit windows"""
        c3 = TT // 4
        for y in range(int(y_top), int(y_bot)):
            for x in range(x0, x0 + TT):
                i = x - x0
                c = ashlar(x, y) * (1.24 if i < c3 else (0.58 if i >= TT - c3 else 0.98))
                if i in (c3, TT - c3): c = c * 0.78
                if i == 0 or i == TT - 1: c = OUT
                put(x, y, c)
        y = int(y_bot) - 30
        n = 0
        while y > y_top + 8:
            for x in range(x0, x0 + TT):
                i = x - x0
                k = 1.3 if i < c3 else (0.72 if i >= TT - c3 else 1.18)
                put(x, y, STONE * k); put(x, y + 1, STONE * k * 0.88); put(x, y + 2, STONE * 0.45)
            if slits:
                cx = x0 + TT // 2
                for yy in range(y + 8, y + 22):
                    t = yy - (y + 8)
                    hw = 1.5 if t > 2 else 0.5 + t * 0.4
                    for xx in range(cx - 3, cx + 4):
                        d = abs(xx + 0.5 - cx)
                        if d <= hw: put(xx, yy, SKY if t < 4 else GLASS)
                        elif d <= hw + 1.1: put(xx, yy, STONE * (1.3 if xx < cx else 0.6))
                for xx in range(cx - 3, cx + 3): put(xx, y + 22, STONE * 1.25); put(xx, y + 23, STONE * 0.5)
            y -= 30; n += 1

    def tower_crown(x0, base):
        """above the parapet: a ring of battlements on corbels, then a tiled pyramid cap with a ridge, crockets and a finial"""
        cx = x0 + TT / 2
        # corbels and the crenellated ring
        for x in range(x0 - 2, x0 + TT + 2):
            i = x - (x0 - 2)
            put(x, base, STONE * 0.45 if (x - x0) % 4 else STONE * 0.95)
            put(x, base - 1, STONE * (1.15 if i < 12 else (0.7 if i > TT - 8 else 1.0)))
            put(x, base - 2, OUT)
            m = ((x - x0) % 10) < 6
            top = base - 14 if m else base - 6
            for y in range(top, base - 2):
                c = STONE * (1.28 if y < top + 3 else (1.0 if i < 12 else (0.62 if i > TT - 8 else 0.92)))
                if y == top: c = OUT
                put(x, y, c)
            if m and (x - x0) % 10 in (0, 5):
                for y in range(top, base - 6): put(x, y, OUT)
        # the cap
        CH = int(TT * 1.15)
        cb = base - 10
        for t in range(CH):
            y = cb - t
            hw = (TT / 2 - 2) * (1 - t / CH)
            for x in range(int(math.floor(cx - hw)), int(math.ceil(cx + hw))):
                dx = x + 0.5 - cx
                c = roof_tile(y, (dx + hw) * 2, 1.3) if dx < 0 else roof_tile(y, (hw - dx) * 2, 0.6)
                if abs(dx) < 0.7: c = TILE * 1.5
                put(x, y, c)
            put(math.floor(cx - hw) - 1, y, OUT); put(math.ceil(cx + hw), y, OUT)
            if t % 12 == 6 and hw > 3:
                put(math.floor(cx - hw) - 1, y, STONE * 1.3); put(math.floor(cx - hw) - 2, y - 1, STONE * 1.15)
                put(math.ceil(cx + hw), y, STONE * 0.75); put(math.ceil(cx + hw) + 1, y - 1, STONE * 0.6)
        fy = cb - CH
        for y in range(fy - 10, fy + 1): put(cx - 0.5, y, STONE * 1.25); put(cx + 0.5, y, STONE * 0.7)
        for x in range(int(cx - 3), int(cx + 4)): put(x, fy - 7, STONE * (1.25 if x < cx else 0.72))
        for (ox, oy, k) in ((-1, 0, 1.3), (0, 0, 0.8), (1, 0, 0.6), (-1, -1, 1.2), (0, -1, 0.85)): put(cx + ox, fy + oy, STONE * k)

    # ================= the top =================
    for y in range(roof0, face0):                     # the walk round the roof's foot
        for x in range(W):
            put(x, y, walltop(x, y - roof0))                 # the walls' own flags (walltop.py)
    for x in range(W):                                # the far parapet (a coping seen over the roof's back) and the side copings
        put(x, roof0, OUT); put(x, roof0 + 1, STONE * 1.25); put(x, roof0 + 2, STONE * 1.0); put(x, roof0 + 3, STONE * 0.5)
    for y in range(roof0, face0):
        put(0, y, OUT); put(1, y, STONE * 1.25); put(2, y, STONE * 1.05)
        put(W - 1, y, OUT); put(W - 2, y, STONE * 0.7); put(W - 3, y, STONE * 0.85)
    # the back corner towers, rising behind the roof
    for x0 in (2, W - TT - 2):
        tower_shaft(x0, roof0 - 6, roof0 + 44, slits=False)
        tower_crown(x0, roof0 - 6)
    # the hipped roof: a ridge from left to right, hips down to the four corners; three faces show
    INS = 40
    x0, x1 = INS, W - INS
    yb, yf = roof0 + 16, face0 - 22
    half_d = (yf - yb) / 2
    PH = int(half_d + 22)                             # the ridge a little above the back eave, so the roof closes over the top
    ry = (yb + yf) / 2 - PH
    R0, R1 = (x0 + half_d, ry), (x1 - half_d, ry)
    FL, FR, BL, BR = (x0, yf), (x1, yf), (x0, yb), (x1, yb)
    for y in range(int(ry) - 1, yf + 1):
        for x in range(x0 - 1, x1 + 2):
            if in_poly(x, y, [FL, FR, R1, R0]): c = roof_tile(x, yf - y, 0.98)
            elif in_poly(x, y, [BL, FL, R0]): c = roof_tile(y, x - x0, 1.32)
            elif in_poly(x, y, [BR, FR, R1]): c = roof_tile(y, x1 - x, 0.6)
            elif in_poly(x, y, [BL, BR, R1, R0]): c = roof_tile(x, y - yb, 1.12)      # (the back face, should any of it show)
            else: continue
            if (y - ry) / (yf - ry) > 0.85: c = c * 0.92
            put(x, y, c)
    def ridge_line(a, b, lit=True):
        n = int(math.hypot(b[0] - a[0], b[1] - a[1]))
        for i in range(n + 1):
            x = a[0] + (b[0] - a[0]) * i / n; y = a[1] + (b[1] - a[1]) * i / n
            put(x, y - 1, TILE * (1.5 if lit else 1.0)); put(x, y, TILE * 1.2); put(x, y + 1, TILE * 0.55)
            if i % 6 == 0: put(x, y, TILE * 0.7)
    def hip_line(a, b, lit):
        n = int(math.hypot(b[0] - a[0], b[1] - a[1]))
        for i in range(n + 1):
            x = a[0] + (b[0] - a[0]) * i / n; y = a[1] + (b[1] - a[1]) * i / n
            put(x - 1, y, TILE * (1.45 if lit else 0.9)); put(x, y, TILE * 1.22); put(x + 1, y, TILE * 0.55)
    hip_line(R0, BL, True); hip_line(R1, BR, False); hip_line(R0, FL, True); hip_line(R1, FR, True)
    ridge_line(R0, R1)
    for (rx, k) in ((R0[0], 1.25), (R1[0], 0.8)):    # finials at the ridge's ends
        for y in range(int(ry) - 12, int(ry)): put(rx - 0.5, y, STONE * 1.25); put(rx + 0.5, y, STONE * 0.7)
        put(rx - 1.5, ry - 8, STONE * 1.2); put(rx + 1.5, ry - 8, STONE * 0.7)
    for x in range(x0 - 1, x1 + 2):                   # the front eave, its shadow on the walk
        put(x, yf + 1, TILE * 1.35); put(x, yf + 2, TILE * 0.8); put(x, yf + 3, OUT); put(x, yf + 4, WALK * 0.55); put(x, yf + 5, WALK * 0.78)
    for y in range(yb, yf + 3):
        put(x0 - 1, y, OUT); put(x1 + 1, y, OUT)
    for y in range(yb, yf):                           # the roof's shadow on the walk to its right
        for k, f in enumerate((0.58, 0.7, 0.84)): shade(x1 + 2 + k, y, f)
    # dormers on the front face: little stone gables with a pointed light, their own roofs, their shadows
    def dormer(dx, dy):
        DW = 11
        for y in range(int(dy) - 8, int(dy) + 14):
            for k, f in enumerate((0.6, 0.72, 0.86)): shade(dx + DW + 1 + k, y + 2, f)
        for y in range(int(dy) - 6, int(dy) + 12):
            for x in range(int(dx - DW), int(dx + DW) + 1):
                u = x + 0.5 - dx
                c = masonry_px(x, y) * (1.08 if u < DW - 4 else 0.58)
                if abs(u) < 4 and y > dy - 1:
                    c = SKY if y < dy + 4 else GLASS
                    if abs(u) < 0.7: c = STONE * 1.0
                if abs(u) < 2.5 and dy - 4 < y <= dy - 1: c = SKY
                if abs(u) >= DW - 0.5: c = OUT
                put(x, y, c)
        for x in range(int(dx - DW) - 1, int(dx + DW) + 2): put(x, int(dy) + 12, STONE * 1.25); put(x, int(dy) + 13, STONE * 0.45)
        gy = int(dy) - 6
        for t in range(14):
            hw = (DW + 2) * (1 - t / 14)
            y = gy - t
            for x in range(int(dx - hw), int(dx + hw) + 1): put(x, y, roof_tile(x, gy - y, 1.25 if x < dx else 0.66))
            put(dx - hw, y, TILE * 1.45); put(dx + hw, y, OUT)
        for y in range(gy - 20, gy - 13): put(dx - 0.5, y, STONE * 1.25); put(dx + 0.5, y, STONE * 0.7)
    for dx in np.linspace(W * 0.26, W * 0.74, 5):
        dormer(dx, yf - 40)
    for dx in np.linspace(W * 0.38, W * 0.62, 3):     # and a higher row, smaller in the distance
        dormer(dx, yf - 150)
    # chimneys: stone stacks on the ridge, a lit left face, a cap, the dark flue
    for cxh in (R0[0] + 40, (R0[0] + R1[0]) / 2, R1[0] - 40):
        for y in range(int(ry) - 26, int(ry) + 8):
            for x in range(int(cxh - 7), int(cxh + 8)):
                i = x - (cxh - 7)
                put(x, y, ashlar(x, y) * (1.25 if i < 5 else (0.6 if i > 11 else 1.0)))
            put(cxh - 7, y, OUT); put(cxh + 7, y, OUT)
        for x in range(int(cxh - 9), int(cxh + 10)):
            put(x, int(ry) - 27, STONE * 1.3); put(x, int(ry) - 26, STONE * 0.5); put(x, int(ry) - 28, OUT)
        for x in range(int(cxh - 4), int(cxh + 5)): put(x, int(ry) - 29, STONE * 0.2)

    # ================= the front face =================
    for y in range(face0, H):
        for x in range(W): put(x, y, masonry_px(x, y) * 0.96)
    for y in range(H - 8, H):                         # the plinth
        for x in range(W): put(x, y, STONE * 1.2 if y == H - 8 else (STONE * 0.55 if y == H - 7 else (masonry_px(x, y) * 0.86 if y < H - 1 else OUT)))
    SC = face0 + 128                                  # the string course between the storeys
    for x in range(W):
        put(x, SC, STONE * 1.28); put(x, SC + 1, STONE * 1.1); put(x, SC + 2, STONE * 0.98); put(x, SC + 3, STONE * 0.5)
        for k, f in enumerate((0.72, 0.84, 0.94)): shade(x, SC + 4 + k, f)
    for x in range(W):                                # the corbel table under the parapet
        u = x % 10
        for y in range(face0 + 1, face0 + 10): put(x, y, masonry_px(x, y) * 0.9)
        if 3 <= u <= 6:
            for y in range(face0 + 3, face0 + 9): put(x, y, STONE * (1.18 if u == 3 else (0.72 if u == 6 else 1.0)))
            put(x, face0 + 9, STONE * 0.5)
        else:
            for y in range(face0 + 3, face0 + 9): put(x, y, masonry_px(x, y) * 0.58)
    def arch_inside(d, t, half, w):
        ah = 0.866 * w
        if t >= ah: return d <= half
        return t >= 0 and (d + half) ** 2 + (ah - t) ** 2 <= w * w
    def window(cx, top, w, h):
        half = w / 2
        for y in range(top - 5, top + h + 1):
            t = y - top
            for x in range(int(cx - half - 5), int(cx + half + 6)):
                d = abs(x + 0.5 - cx)
                if arch_inside(d, t, half - 3, w - 6) and t >= 0:
                    u_, v_ = (x + y) % 8, (x - y) % 8
                    c = SKY if t < h * 0.35 else GLASS
                    if u_ == 0 or v_ == 0: c = GLASS * 0.55
                    if abs(x + 0.5 - cx) < 1.2 and t > (w - 6) * 0.55: c = STONE * 1.02
                    put(x, y, c)
                elif arch_inside(d, t, half, w) and t >= -1:
                    put(x, y, masonry_px(x, y) * (0.5 if x < cx else 1.15))
                elif arch_inside(d, t + 3, half + 2.5, w + 5) and t >= -4:
                    put(x, y, STONE * (1.28 if x < cx else 0.62))
        for x in range(int(cx - half - 3), int(cx + half + 4)):
            put(x, top + h, STONE * 1.25); put(x, top + h + 1, STONE * 1.0); put(x, top + h + 2, STONE * 0.45)
    # the bays either side of the middle: tall windows in two storeys, buttresses between
    MID0, MID1 = W // 2 - 80, W // 2 + 80             # the central bay
    bays = [(TT, MID0), (MID1, W - TT)]
    for (b0, b1) in bays:
        n = max(2, round((b1 - b0) / 60))
        bw = (b1 - b0) / n
        for k in range(n):
            cx = b0 + bw * (k + 0.5)
            window(cx, face0 + 30, 30, 74)
            window(cx, SC + 24, 28, 72)
    # buttresses: at each bay's edge, standing out, a set-off at the string course; their shadows to the right
    butt = [MID0, MID1]
    for (b0, b1) in bays:
        n = max(2, round((b1 - b0) / 60))
        butt += [b0 + (b1 - b0) * k / n for k in range(1, n)]
    for bx in butt:
        bx = int(bx)
        for y in range(face0 + 10, H - 8):
            bwid = 10 if y > SC else 7
            for i in range(bwid):
                x = bx - bwid // 2 + i
                c = masonry_px(x, y) * (1.14 if i < bwid - 3 else 0.58)
                if i == 0: c = STONE * 1.3
                if i == bwid - 1: c = OUT
                put(x, y, c)
            for k, f in enumerate((0.62, 0.76, 0.9)): shade(bx + bwid // 2 + 1 + k, y, f)
        for i in range(10):
            x = bx - 5 + i
            put(x, SC + 4, OUT); put(x, SC + 5, STONE * 1.28); put(x, SC + 6, STONE * 1.0); put(x, SC + 7, STONE * 0.5)
    # the central bay: a rose window, the great door
    rcx, rcy, rr = W / 2, face0 + 72, 34
    for y in range(int(rcy - rr - 6), int(rcy + rr + 7)):
        for x in range(int(rcx - rr - 6), int(rcx + rr + 7)):
            dx, dy = x + 0.5 - rcx, y + 0.5 - rcy
            r = math.hypot(dx, dy)
            if r > rr + 5: continue
            ang = math.atan2(dy, dx)
            n = (dx * LX + dy * LY) / (r + 1e-6)
            if r > rr + 2: c = STONE * (1.0 + 0.32 * n)                                   # its moulded rim
            elif r > rr: c = STONE * (0.5 - 0.1 * n)                                      # the reveal
            elif r < 5: c = STONE * (1.1 if dx < 0 else 0.75)                             # its hub
            elif r < 6.5: c = OUT
            else:
                spoke = abs(((ang / (2 * math.pi) * 12) % 1) - 0.5) > 0.42
                ring = abs(r - rr * 0.62) < 0.9
                c = STONE * (1.05 if dx < 0 else 0.8) if (spoke or ring) else (SKY if dy < -rr * 0.2 else GLASS)
            put(x, y, c)
    # the great door: two cells wide (the middle columns), its head a true pointed arch, moulded all round evenly
    DX0, DX1 = W // 2 - 32, W // 2 + 32
    dbot = H - 1
    half = (DX1 - DX0) / 2; dcx = (DX0 + DX1) / 2
    APEX = 44; DH = 104
    dsp = dbot + 1 - DH + APEX
    off = (APEX * APEX - half * half) / (2 * half); rad = half + off
    def door_field(x, y):
        px, py = x + 0.5 - dcx, y + 0.5 - dsp
        if py >= 0: return half - abs(px), ((-1.0 if px < 0 else 1.0), 0.0)
        ccx = off if px < 0 else -off
        dx, dy = px - ccx, py
        r = math.hypot(dx, dy) or 1e-6
        return rad - r, (dx / r, dy / r)
    lit = lambda n, k=0.38: 1.0 + k * (n[0] * LX + n[1] * LY)
    for y in range(int(dsp - APEX) - 16, dbot + 1):
        for x in range(DX0 - 16, DX1 + 16):
            dist, n = door_field(x, y)
            if dist >= 0:
                u = x - DX0
                plank = u % 8
                c = WOOD * (1.08 if plank == 1 else (0.66 if plank == 0 else 0.92))
                if abs(x + 0.5 - dcx) < 1.0: c = WOOD * 0.4
                c = c * (0.62 + 0.38 * min(1.0, (dist + 0.5) / 6))
                if y < dsp + 6: c = c * 0.82
                for sy in (dsp + 10, dsp + 30):
                    if abs(y - sy) < 1.2 and dist > 2 and abs(x + 0.5 - dcx) > 3: c = IRON * (1.5 if y < sy else 1.0)
                if plank == 4 and (y - int(dsp)) % 14 == 7 and dist > 3: c = IRON * 1.4
                put(x, y, c)
                continue
            if dist >= -3: put(x, y, masonry_px(x, y) * (0.55 + 0.55 * max(0.0, -(n[0] * LX + n[1] * LY))))
            elif dist >= -5: put(x, y, STONE * 1.1 * lit(n))
            elif dist >= -6.5: put(x, y, STONE * 0.5 * lit(n, 0.2))
            elif dist >= -8.5: put(x, y, STONE * 1.15 * lit(n))
            elif dist >= -9.5: put(x, y, OUT)
            elif -13 <= dist < -10.5 and y < dsp + 6: put(x, y, STONE * (1.22 * lit(n) if dist > -11.8 else 0.5))
    for (rx, ry2) in ((dcx - 7, dsp + 22), (dcx + 6, dsp + 22)):
        for (ox, oy) in ((0, 0), (1, 0), (-1, 1), (2, 1), (-1, 2), (2, 2), (0, 3), (1, 3)): put(rx + ox, ry2 + oy, IRON * 1.7)
    for x in range(DX0 - 10, DX1 + 10): put(x, dbot, STONE * 0.45)

    # ================= the parapet along the front, the central gable, the front towers =================
    for x in range(TT, W - TT):                       # battlements: merlons rising from the face, crenels a sill
        m = ((x - TT) % 16) < 9
        topy = face0 - 14 if m else face0 - 6
        for y in range(topy, face0 + 1):
            c = STONE * (1.25 if y > topy else 0.34) if y < topy + 4 else masonry_px(x, y) * (0.6 if y == topy + 4 else 1.0)
            put(x, y, c)
        if m and (x - TT) % 16 in (0, 8):
            for y in range(topy, face0 - 2): put(x, y, OUT)
        if not m: put(x, topy - 1, WALK * 0.6)
    # the gable over the central bay: a stone triangle with a crocketed coping, a small rose in it, pinnacles at its feet
    gx0, gx1, gbase, gtop = MID0 + 6, MID1 - 6, face0 + 2, face0 - 84
    gcx = W / 2
    for y in range(gtop, gbase + 1):
        f = (y - gtop) / (gbase - gtop)
        hw = (gx1 - gx0) / 2 * f
        for x in range(int(gcx - hw), int(gcx + hw) + 1):
            c = masonry_px(x, y) * (1.04 if x < gcx else 0.9)
            if abs(x + 0.5 - (gcx - hw)) < 3 or abs(x + 0.5 - (gcx + hw)) < 3:   # its coping, lit on the left edge
                c = STONE * (1.3 if x < gcx else 0.62)
            put(x, y, c)
        put(gcx - hw - 1, y, OUT); put(gcx + hw + 1, y, OUT)
        if (y - gtop) % 9 == 5 and f > 0.1:          # crockets up the coping
            put(gcx - hw - 2, y, STONE * 1.3); put(gcx - hw - 3, y - 1, STONE * 1.15)
            put(gcx + hw + 2, y, STONE * 0.72); put(gcx + hw + 3, y - 1, STONE * 0.6)
    for y in range(gtop - 14, gtop + 1): put(gcx - 0.5, y, STONE * 1.25); put(gcx + 0.5, y, STONE * 0.7)   # its finial cross
    for x in range(int(gcx - 4), int(gcx + 5)): put(x, gtop - 10, STONE * (1.25 if x < gcx else 0.72))
    ocx, ocy = gcx, gtop + 46                          # a little rose in the gable
    for y in range(int(ocy - 9), int(ocy + 10)):
        for x in range(int(ocx - 9), int(ocx + 10)):
            r = math.hypot(x + 0.5 - ocx, y + 0.5 - ocy)
            if r <= 6: put(x, y, STONE * 1.0 if abs((math.atan2(y + 0.5 - ocy, x + 0.5 - ocx) / (2 * math.pi) * 6) % 1 - 0.5) > 0.4 else GLASS)
            elif r <= 8: put(x, y, STONE * (1.25 if x < ocx else 0.6))
    for px in (gx0 - 4, gx1 - 4):                     # pinnacles at the gable's feet
        for y in range(face0 - 40, face0 - 12):
            for x in range(px, px + 9): put(x, y, STONE * (1.25 if x < px + 3 else (0.6 if x > px + 6 else 1.0)))
            put(px, y, OUT); put(px + 8, y, OUT)
        for t in range(22):
            hw = 4.5 * (1 - t / 22)
            y = face0 - 41 - t
            for x in range(int(px + 4.5 - hw), int(px + 4.5 + hw) + 1): put(x, y, STONE * (1.22 if x < px + 4.5 else 0.66))
    # the front corner towers: full height, their crowns above the parapet
    for x0 in (0, W - TT):
        tower_shaft(x0, face0 - 6, H - 8)
        tower_crown(x0, face0 - 6)
        for k in range(4):                            # their shadow on the face beside them (the left one's, to its right)
            if x0 == 0:
                for y in range(face0, H - 8): shade(TT + k, y, (0.6, 0.72, 0.84, 0.94)[k])

    # ================= weather, the outline =================
    a0 = img[..., 3] > 0
    for y in range(face0, H):
        f = (y - face0) / (H - face0)
        img[y, a0[y], :3] *= 1.03 - 0.08 * f
    a = img[..., 3] > 0
    edge = a & ~(np.roll(a, 1, 0) & np.roll(a, -1, 0) & np.roll(a, 1, 1) & np.roll(a, -1, 1))
    edge[:, 0] |= a[:, 0]; edge[:, -1] |= a[:, -1]; edge[-1, :] |= a[-1, :]
    img[edge, :3] = OUT
    for i in range(40):                               # a little moss at the foot
        x, y = (i * 97) % W, H - 2 - (i * 7) % 10
        if a[y, x] and not edge[y, x]: img[y, x, :3] = img[y, x, :3] * 0.4 + MOSS * 0.6
    return img

img = keep()
rgba = np.clip(img, 0, 255).astype(np.uint8)
alpha = rgba[..., 3].copy()
q = Image.fromarray(rgba[..., :3], 'RGB').quantize(colors=PALETTE, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
Image.fromarray(np.dstack([np.asarray(q), np.where(alpha > 0, 255, 0).astype(np.uint8)]), 'RGBA').save(sys.argv[1], optimize=True)
print('ok', img.shape)
