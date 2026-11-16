# The castle's tower (tilesets/castle_ruins_exterior/castle_tower.png): a tall, slender gothic tower of the walls' own stone (the same 16 x 8
# blocks, shades and mortar, on the same 32 px grid, so where it stands on a wall the courses run on through it), under a stone spire.
#
# Its footprint is TW x TW cells (over the wall's thickness). It is the wall made taller: the eaves of its roof are drawn RISE tiles above the
# footprint and its front face runs from there down to the foot of the wall's own face (the same flat plinth). The frame is
# W x (TOP + ROOF + FACE): TOP px for the spire above the eaves, the roof's foot (TW rows, seen from above), the face (RISE tiles + 28 px).
# Placed at x = footprint col * 32, y = (footprint row - RISE) * 32 - TOP; it sorts by the row under its footprint.
#
# The game looks at the world from the south and above, so a tower shows its front face and its top; it reads as solid from its light (from
# the upper left): corner pilasters lit on their fronts with shaded returns, buttressed set-offs at the foot; three stages parted by string
# courses that stand out with a shadow under them, each with its own window (deep reveals, one jamb in shadow, tracery, a hood mould, a sill)
# and a pointed doorway at the foot; a cornice on corbels; a stone spire of four faces (lit, front, shaded) with rolled hips, an eave and its
# shadow, a dormer, a finial, and a slender pinnacle on each corner.
#   python3 castleTower.py <out.png>
import sys, math
import numpy as np
from PIL import Image
sys.path.insert(0, __import__('os').path.dirname(__import__('os').path.abspath(__file__)))
from walltop import walltop

TW = 4                 # the footprint, TW x TW cells (a house is 4 x 4)
RISE = 8               # the eaves stand this many tiles above the footprint
SPIRE = 150            # the spire's height above the middle of its foot
W, TOP, ROOF, FACE = TW * 32, 52, TW * 32, RISE * 32 + 28   # FACE: down to the wall face's foot (16 px into its cell, 28 px into the next)
H = TOP + ROOF + FACE
STONE = np.array([156, 148, 128], np.float32)   # the walls' limestone (castleRuinsTileset.py)
ROOFSTONE = np.array([146, 142, 132], np.float32)
WALK = np.array([138, 134, 120], np.float32)    # the walk round the spire's foot (the walls' wall-walk)
GLASS = np.array([30, 38, 60], np.float32)
WOOD = np.array([92, 64, 40], np.float32)
IRON = np.array([44, 44, 50], np.float32)
MOSS = [np.array(c, np.float32) for c in [(58, 78, 42), (74, 98, 50), (92, 116, 58)]]
SHADE = np.array([[1.0, 0.93], [0.96, 1.04], [1.05, 0.95], [0.94, 1.0]], np.float32)   # the wall tiles' block shades
OUT = STONE * 0.34
PIL_W = 14             # a corner pilaster's width
PALETTE = 48           # the colours the finished sheet is reduced to
SKY = np.array([58, 80, 128], np.float32)       # the sky caught in a window's upper panes

def masonry_px(x, y):
    """the wall tiles' masonry at sprite pixel (x, y): the sprite's x is on the 32 px grid; its y is TOP px above a grid line"""
    lx, ly = int(x) % 32, (int(y) - TOP) % 32
    row = ly // 8
    sx = (lx + (row % 2) * 8) % 32
    xo, yo = sx % 16, ly % 8
    k = SHADE[row, sx // 16]
    if yo == 0 or xo == 0: return STONE * 0.42
    if yo == 1: return STONE * k * 1.12
    if yo == 7 or xo == 15: return STONE * k * 0.8
    return STONE * k

def slab(x, y):
    """the spire's stone slabs: long thin courses, each slab a little different"""
    x, y = int(x), int(y)
    r = y // 5
    sx = (x + (r % 3) * 5) % 14
    k = 0.95 + 0.08 * (((x // 14) * 11 + r * 7) % 5) / 4
    if y % 5 == 0: return ROOFSTONE * 0.6
    if sx == 0: return ROOFSTONE * 0.75
    if y % 5 == 1: return ROOFSTONE * k * 1.08
    return ROOFSTONE * k

def in_tri(px, py, a, b, c):
    d1 = (px - b[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (py - b[1])
    d2 = (px - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (py - c[1])
    d3 = (px - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (py - a[1])
    return not ((d1 < 0 or d2 < 0 or d3 < 0) and (d1 > 0 or d2 > 0 or d3 > 0))

def tower(door='ground'):
    """door: 'ground' (frame 0) the door on the ground; 'walk' (frame 1) a tower that a wall runs on south from, its door on that wall's walk
    (the wall hides the tower's foot); 'none' (frame 2) a tower on a corner of the walls with a wall running on south: no door, a window and
    loops in its bottom stage instead, the wall's walk running on into its face"""
    walk_door = door == 'walk'
    no_door = door == 'none'
    img = np.zeros((H, W, 4), np.float32)
    def put(x, y, c):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < W and 0 <= y < H: img[y, x, :3] = np.clip(c, 0, 255); img[y, x, 3] = 255
    roof0, face0 = TOP, TOP + ROOF
    L, R = PIL_W, W - PIL_W                           # the face between the pilasters

    # ---------------- the face: masonry, plinth ----------------
    for y in range(face0, H):
        for x in range(W): put(x, y, masonry_px(x, y) * 0.96)
    for y in range(H - 8, H):                         # the plinth: a lit chamfer, a base course standing out, a flat foot
        for x in range(W):
            put(x, y, STONE * 1.2 if y == H - 8 else (STONE * 0.55 if y == H - 7 else (masonry_px(x, y) * 0.86 if y < H - 1 else OUT)))

    # the stages: [top, bottom) of each, and the string courses between them (a lit top, the moulding, a shadow under it)
    CORN = face0 + 18                                 # under the cornice
    S1 = face0 + 112                                  # course between the top and middle stages
    S2 = face0 + 192                                  # course between the middle and bottom stages
    def course(y):
        for x in range(W):
            put(x, y, STONE * 1.28); put(x, y + 1, STONE * 1.1); put(x, y + 2, STONE * 0.98); put(x, y + 3, STONE * 0.5); put(x, y + 4, masonry_px(x, y + 4) * 0.72)
    course(S1); course(S2)

    # ---------------- windows and the door ----------------
    def arch_inside(d, t, half, w):
        ah = 0.866 * w
        if t >= ah: return d <= half
        return t >= 0 and (d + half) ** 2 + (ah - t) ** 2 <= w * w
    def window(cx, top, w, h):
        """a pointed window: a moulded frame, deep reveals (the left jamb's inner face in shadow, the right one lit), two lights with a trefoil
        over them, dark glass, a sill standing out with a shadow under it, a hood mould over it"""
        half = w / 2
        for y in range(top - 5, top + h + 1):
            t = y - top
            for x in range(int(cx - half - 5), int(cx + half + 6)):
                d = abs(x + 0.5 - cx)
                if arch_inside(d, t, half - 3, w - 6) and t >= 0:          # the glass, set deep
                    # leaded panes: a diamond lattice of lead cames, the glass a little lighter toward its top left (the sky in it), a glint now and then
                    u, v = (x + y) % 8, (x - y) % 8
                    c = SKY if t < h * 0.35 else GLASS                           # the sky in its upper panes
                    if u == 0 or v == 0: c = GLASS * 0.55
                    elif u == 4 and v == 4 and t < h * 0.6: c = GLASS * 2.4       # a glint
                    inner = abs(x + 0.5 - cx)
                    if inner < 1.2 and t > (w - 6) * 0.55: c = STONE * 1.02            # the mullion
                    ly = t - (w - 6) * 0.3                                              # the trefoil in the head
                    if 0 < ly < 7 and 2.3 < math.hypot(inner, ly - 3.5) < 3.4: c = STONE * 1.0
                    put(x, y, c)
                elif arch_inside(d, t, half, w) and t >= -1:                # the reveal
                    put(x, y, masonry_px(x, y) * (0.5 if x < cx else 1.15))
                elif arch_inside(d, t + 3, half + 2.5, w + 5) and t >= -4:   # the hood mould
                    put(x, y, STONE * (1.28 if x < cx else 0.62))
        for x in range(int(cx - half - 3), int(cx + half + 4)):            # the sill
            put(x, top + h, STONE * 1.25); put(x, top + h + 1, STONE * 1.0); put(x, top + h + 2, STONE * 0.45)
        for (sx, k) in ((cx - half - 4, 1.2), (cx + half + 3, 0.7)):        # the hood mould's label stops
            for y in range(int(top + 0.866 * w * 0.55), int(top + 0.866 * w * 0.55) + 4): put(sx, y, STONE * k); put(sx + 1, y, STONE * k * 0.9)
    # the windows: at least as big as a village house's (about 24 x 24 of glass), each well inside its own stage
    window(W / 2, CORN + 16, 38, 66)                  # the top stage: the tallest window (32 px of glass across)
    window(W / 2, S1 + 16, 34, 54)                    # the middle stage (28 px of glass)
    if no_door:
        # a corner tower with a wall running on south: no door. Its bottom stage takes a window like the stages above, and a loop either side;
        # under it the wall in front hides the foot, and the wall's walk runs on into the face
        window(W / 2, S2 + 14, 30, 42)
        for lx in (W // 2 - 30, W // 2 + 29):
            for y in range(S2 + 18, S2 + 38): put(lx, y, STONE * 0.14); put(lx + 1, y, STONE * 0.3)
            for x in range(lx - 3, lx + 5): put(x, S2 + 25, STONE * 0.14)
            put(lx, S2 + 38, STONE * 1.25); put(lx + 1, S2 + 38, STONE * 1.25)
    else:
        # the bottom stage: the doorway, two cells wide and two tall (the tower's middle columns, from the ground up: 64 x 64 on the grid), so a door
        # two cells wide can stand in it and the tower can be entered later. Its head is a true pointed arch: each side an arc about a centre a little
        # past the middle (so the two arcs meet in a clean point, exactly at the middle), and every band round it (the reveal, the mouldings, the hood
        # mould) is a fixed distance from that line, so it runs evenly up the jambs, round the head and through the point. Each band is lit by the way
        # its surface faces (the light from the upper left), never by which side of the middle it is on.
        DX0, DX1 = 32, 96
        if walk_door:
            dbot = H - 1 - 28                             # on the walk of the wall that runs on south from the tower (it hides the 28 px below)
            DH = 48
        else:
            dbot = H - 1                                  # down to the ground
            DH = 64
        half = (DX1 - DX0) / 2; dcx = (DX0 + DX1) / 2
        APEX = 42                                         # the head's height over its springing
        dsp = dbot + 1 - DH + APEX                        # the springing line (y): the jambs below, the head above
        off = (APEX * APEX - half * half) / (2 * half)    # each arc's centre, this far past the middle; its radius half + off
        rad = half + off
        LX, LY = -0.6, -0.8                               # toward the light
        def door_field(x, y):
            """(distance inside the doorway's outline, the outward normal) for a pixel: positive inside the opening"""
            px, py = x + 0.5 - dcx, y + 0.5 - dsp
            if py >= 0:                                   # the jambs
                return half - abs(px), ((-1.0 if px < 0 else 1.0), 0.0)
            ccx = off if px < 0 else -off                 # the left side's arc is about a centre right of the middle, and the other way round
            dx, dy = px - ccx, py
            r = math.hypot(dx, dy) or 1e-6
            return rad - r, (dx / r, dy / r)
        def lit(n, k=0.38): return 1.0 + k * (n[0] * LX + n[1] * LY)
        BANDS = [(-3.0, 'reveal'), (-4.5, 'roll'), (-6.0, 'hollow'), (-7.5, 'roll2'), (-8.5, 'edge')]
        HOOD = (-11.5, -9.5)                              # the hood mould, standing clear of the arch
        for y in range(int(dsp - APEX) - 14, dbot + 1):
            for x in range(DX0 - 14, DX1 + 14):
                dist, n = door_field(x, y)
                if dist >= 0:                             # the door: two leaves of planks, set back in the shadow of the arch
                    u = x - DX0
                    plank = u % 8
                    c = WOOD * (1.08 if plank == 1 else (0.66 if plank == 0 else 0.92 + 0.04 * ((u // 8) % 2)))

                    if abs(x + 0.5 - dcx) < 1.0: c = WOOD * 0.4                             # the leaves meet
                    c = c * (0.62 + 0.38 * min(1.0, (dist + 0.5) / 6))                      # the reveal's shadow on the door's edges
                    if y < dsp + 6: c = c * (0.8 + 0.2 * max(0.0, (y - (dsp - APEX)) / (APEX + 6)))   # the head's shadow
                    for sy in ((dsp + 8, dsp + 22) if not walk_door else (dsp + 4,)):        # strap hinges, curling at their ends
                        if abs(y - sy) < 1.2 and dist > 2 and abs(x + 0.5 - dcx) > 3: c = IRON * (1.5 if y < sy else 1.0)
                    if plank == 4 and (y - int(dsp)) % 14 == 7 and dist > 3: c = IRON * 1.4    # nail heads, in rows
                    put(x, y, c)
                    continue
                band = next((b for (lim, b) in BANDS if dist >= lim), None)
                if band == 'reveal':                       # the reveal faces into the opening: lit where it faces the light
                    put(x, y, masonry_px(x, y) * (0.55 + 0.55 * max(0.0, -(n[0] * LX + n[1] * LY))))
                elif band == 'roll':
                    put(x, y, STONE * 1.1 * lit(n))
                elif band == 'hollow':
                    put(x, y, STONE * 0.5 * lit(n, 0.2))
                elif band == 'roll2':
                    put(x, y, STONE * 1.15 * lit(n))
                elif band == 'edge':
                    put(x, y, OUT)
                elif HOOD[0] <= dist < HOOD[1] and y < dsp + 4:   # the hood mould over the head, down to its label stops
                    put(x, y, STONE * (1.22 * lit(n) if dist > (HOOD[0] + HOOD[1]) / 2 else 0.5))
        for sx in (-1, 1):                                # the hood mould's label stops: a little block each side, at the springing
            bx = dcx + sx * (half + 10)
            for y in range(int(dsp) + 2, int(dsp) + 8):
                for x in range(int(bx - 2), int(bx + 2)): put(x, y, STONE * (1.22 if x < bx else 0.7) * (0.85 if y == int(dsp) + 7 else 1.0))
        for (rx, ry) in ((dcx - 6, dsp + (10 if walk_door else 16)), (dcx + 5, dsp + (10 if walk_door else 16))):   # ring handles
            for (ox, oy) in ((0, 0), (1, 0), (-1, 1), (2, 1), (-1, 2), (2, 2), (0, 3), (1, 3)): put(rx + ox, ry + oy, IRON * 1.7)
            put(rx, ry - 1, IRON * 0.8); put(rx + 1, ry - 1, IRON * 0.8)
        for x in range(DX0 - 8, DX1 + 8): put(x, dbot, STONE * 0.45)                    # the threshold
        if walk_door:   # under it, hidden by the wall in front, plain masonry (the wall's own top meets the threshold)
            for y in range(dbot + 1, H):
                for x in range(DX0 - 12, DX1 + 12): put(x, y, masonry_px(x, y) * 0.96)

    # ---------------- the corner pilasters, with buttresses at the foot ----------------
    for left in (True, False):
        for y in range(CORN, H - 8):
            bw = PIL_W + (5 if y > S2 + 8 else (2 if y > S1 + 8 else 0))           # wider lower down: set-offs at each string course
            for i in range(bw):
                x = i if left else W - 1 - i
                c = masonry_px(x, y) * 1.1
                if left and i == 1: c = STONE * 1.3                                  # the lit arris
                if i >= bw - 3:                                                      # the return (its side toward the face): the left one's faces
                    c = masonry_px(x, y) * (0.52 if left else 1.24)                   # away from the light, the right one's toward it
                if i == bw - 1: c = OUT
                if not left and i == 0: c = OUT
                put(x, y, c)
            if left:                                                                 # the left pilaster's shadow across the face, soft at its edge
                for k in range(6):
                    x = bw + k
                    img[y, x, :3] *= (0.6, 0.7, 0.8, 0.88, 0.94, 0.98)[k]
        for (yy, bw) in ((S2 + 8, PIL_W + 5), (S1 + 8, PIL_W + 2)):                 # the weathered set-offs
            for i in range(bw):
                x = i if left else W - 1 - i
                put(x, yy - 1, OUT); put(x, yy, STONE * 1.28); put(x, yy + 1, STONE * 1.05); put(x, yy + 2, STONE * 0.5)

    # ---------------- the cornice on its corbels ----------------
    for x in range(W):
        for y in range(face0 + 4, CORN):
            put(x, y, masonry_px(x, y) * 0.9)
        u = x % 8
        if 2 <= u <= 5:                                                              # a corbel, standing out, lit on top and left
            for y in range(face0 + 7, face0 + 14):
                c = STONE * (1.18 if u == 2 else (0.75 if u == 5 else 1.0))
                if y == face0 + 13: c = STONE * 0.5
                put(x, y, c)
            put(x, face0 + 7, STONE * 1.25)
        else:
            for y in range(face0 + 7, face0 + 14): put(x, y, masonry_px(x, y) * 0.6)  # the shadow between corbels
    for x in range(W):                                                               # the cornice ledge itself
        put(x, face0, STONE * 1.3); put(x, face0 + 1, STONE * 1.18); put(x, face0 + 2, STONE * 1.02); put(x, face0 + 3, STONE * 0.85)
        put(x, face0 + 4, STONE * 0.4); put(x, face0 + 5, STONE * 0.55)

    # ---------------- the top: pinnacles at the back corners, the spire, pinnacles at the front corners ----------------
    def shade(x, y, k):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < W and 0 <= y < H and img[y, x, 3] > 0: img[y, x, :3] *= k
    def pinnacle(px, base, front=True):
        """a corner turret, standing square in its corner of the top, wholly inside the tower's outline. From its foot up: a corbel stepping out,
        a shaft of three faces (the left lit, the front, the right in shade) ringed at its foot and head, a pointed window with a lit frame and a
        sill, a cornice on little corbels, a square cap like the great roof (lit face, shaded face, a pale ridge, a pair of crockets on each edge)
        and a ball finial with a cross. The left ones throw a shadow to their right."""
        PW = 14
        cx = px + PW / 2
        LIT, FRONT, DARK = 1.25, 0.98, 0.58
        def tone(x, y):
            i = x - px
            k = LIT if i < 4 else (DARK if i >= PW - 4 else FRONT)
            return ashlar_s(x, y) * k
        # the corbel at its foot, stepping out in three courses
        for i, y in enumerate(range(base - 4, base + 1)):
            grow = min(i, 2)
            for x in range(px + 2 - grow, px + PW - 2 + grow):
                j = x - (px + 2 - grow)
                c = STONE * (1.2 if j < 3 else (0.6 if j >= (PW - 4 + 2 * grow) - 3 else 0.95))
                if y == base: c = OUT
                put(x, y, c)
        # the shaft
        SH = 22
        top = base - 4 - SH
        for y in range(top, base - 4):
            for x in range(px, px + PW):
                c = tone(x, y)
                if x - px in (4, PW - 4): c = c * 0.78
                if x == px or x == px + PW - 1: c = OUT
                put(x, y, c)
        for yy in (base - 6, top + 1):                                   # the rings at its foot and head
            for x in range(px, px + PW):
                i = x - px
                k = 1.32 if i < 4 else (0.72 if i >= PW - 4 else 1.18)
                put(x, yy, STONE * k); put(x, yy + 1, STONE * 0.5)
        # its pointed window: dark, a lit frame on the left, a dark one on the right, a sill
        wy = top + 5
        for y in range(wy, wy + 11):
            t = y - wy
            hw = 1.5 if t > 2 else 0.5 + t * 0.5
            for x in range(int(cx - 3), int(cx + 4)):
                d = abs(x + 0.5 - cx)
                if d <= hw: put(x, y, GLASS * (1.4 if t < 3 else 1.0))
                elif d <= hw + 1.1: put(x, y, STONE * (1.3 if x < cx else 0.6))
        for x in range(int(cx - 3), int(cx + 3)): put(x, wy + 11, STONE * 1.25); put(x, wy + 12, STONE * 0.5)
        # the cornice, on little corbels
        for x in range(px - 1, px + PW + 1):
            i = x - (px - 1)
            put(x, top - 3, OUT); put(x, top - 2, STONE * 1.32); put(x, top - 1, STONE * (1.12 if i < PW - 2 else 0.72))
            put(x, top, STONE * 0.45 if (x - px) % 3 else STONE * 0.9)
        # the cap: a square pyramid like the great roof
        CH = 24
        cb = top - 4
        for t in range(CH):
            y = cb - t
            hw = (PW / 2 + 1) * (1 - t / CH)
            for x in range(int(math.floor(cx - hw)), int(math.ceil(cx + hw))):
                dx = x + 0.5 - cx
                cap_t = np.array([118, 112, 108], np.float32)                 # the great roof's tiles
                rr = (y // 4) % 2
                tc = cap_t * (0.5 if y % 4 == 3 else (0.68 if (x + rr * 2) % 4 == 0 else (1.15 if y % 4 == 0 else 1.0)))
                c = tc * (1.3 if dx < 0 else 0.6)
                if abs(dx) < 0.6: c = cap_t * 1.5                              # the ridge
                put(x, y, c)
            put(math.floor(cx - hw) - 1, y, OUT); put(math.ceil(cx + hw), y, OUT)
            if t in (7, 15) and hw > 2:                                         # crockets: a lit leaf on the left edge, a dark one on the right
                put(math.floor(cx - hw) - 1, y, STONE * 1.3); put(math.floor(cx - hw) - 2, y - 1, STONE * 1.15)
                put(math.ceil(cx + hw), y, STONE * 0.75); put(math.ceil(cx + hw) + 1, y - 1, STONE * 0.6)
        for x in range(int(px - 1), int(px + PW + 1)): put(x, cb + 1, np.array([118, 112, 108], np.float32) * 0.5)  # the cap's eave
        fy = cb - CH                                                           # the finial: a ball, a cross
        for (ox, oy, k) in ((-1, 0, 1.35), (0, 0, 0.75), (-1, -1, 1.25), (0, -1, 0.8), (-1, 1, 1.0), (0, 1, 0.6)):
            put(cx + ox, fy + oy, STONE * k)
        for y in range(fy - 7, fy - 1): put(cx - 0.5, y, STONE * 1.25)
        put(cx - 2, fy - 5, STONE * 1.2); put(cx + 1, fy - 5, STONE * 0.75)
        if px < W / 2:                                                         # its shadow to its right
            for y in range(top - 10, base - 4):
                for k, f in enumerate((0.6, 0.72, 0.86)):
                    shade(px + PW + k, y, f)

    def roof_tone(x, y):
        r = int(y) // 4
        k = 0.96 + 0.06 * (((int(x) // 6) * 5 + r * 3) % 3) / 2
        return ROOFSTONE * (0.62 if int(y) % 4 == 3 else k)

    def ashlar_s(x, y):
        x, y = int(x), int(y)
        r = y // 6
        sx = (x + (r % 2) * 4) % 8
        k = 0.96 + 0.06 * (((x // 8) * 7 + r * 5) % 4) / 3
        if y % 6 == 0 or sx == 0: return STONE * 0.62
        if y % 6 == 1: return STONE * k * 1.1
        return STONE * k

    # the platform round the spire's foot: the cornice's top, flagged, a lit coping along its outer edge, its far edge outlined
    INS = 15                                          # the spire stands this far in from each side; the turrets on the corners outside it
    for y in range(roof0, face0):
        for x in range(W):
            ly = (y - roof0) % 10
            c = walltop(x, y - roof0) * 1.0                 # the walls' own flags (walltop.py)
            if y < roof0 + 3: c = STONE * (1.28 if y == roof0 + 1 else (0.5 if y == roof0 + 2 else OUT / STONE))   # the far coping
            if x < 3: c = STONE * (1.25 if x == 1 else OUT / STONE if x == 0 else 0.9)                         # the left coping, lit
            if x >= W - 3: c = STONE * (0.7 if x == W - 2 else OUT / STONE if x == W - 1 else 0.8)           # the right coping, in shade
            put(x, y, c)
    # battlements round the top, between the corner turrets, in the walls' manner: merlons with a stone top, crenels with a sill
    PT, MH2 = 5, 7                                    # the parapet's thickness seen from above, a far merlon's face
    mer = lambda t: (t - INS) % 16 < 9                # 9 px merlons, 7 px crenels, from the turrets inward
    for x in range(INS, W - INS):                     # the far run: merlons show their faces toward us; through a crenel, the air beyond
        if mer(x):
            for y in range(roof0, roof0 + PT): put(x, y, STONE * (1.22 if y > roof0 else 0.34))
            for y in range(roof0 + PT, roof0 + PT + MH2): put(x, y, masonry_px(x, y) * 0.86)
            put(x, roof0 + PT + MH2, WALK * 0.5)
            if (x - INS) % 16 in (0, 8):
                for y in range(roof0, roof0 + PT + MH2): put(x, y, OUT)
        else:                                         # a crenel: cut down to a sill across the parapet's whole thickness, never open
            for y in range(roof0, roof0 + PT): put(x, y, STONE * 0.84)
            put(x, roof0, OUT); put(x, roof0 + PT - 1, STONE * 1.15)
            for y in range(roof0 + PT, roof0 + PT + 2): put(x, y, masonry_px(x, y) * 0.78)
            put(x, roof0 + PT + 2, WALK * 0.62)
    for side in (0, 1):                               # the side runs: blocks seen from above, each with its south face and its shade
        xs = range(0, PT) if side == 0 else range(W - PT, W)
        inner = PT if side == 0 else W - PT - 1
        for y in range(roof0 + INS, face0 - INS):
            t = (y - roof0 - INS) % 16
            if t < 9:
                sf = t >= 6
                for x in xs: put(x, y, masonry_px(x, y) * 0.78 if sf else STONE * (1.24 if side == 0 else 1.1))
                if t == 0:
                    for x in xs: put(x, y, OUT)
                put(inner, y, WALK * 0.5)
            else:
                for x in xs: put(x, y, STONE * 0.86)
                put(inner, y, WALK * 0.78)
            put(0 if side == 0 else W - 1, y, OUT)
    pinnacle(1, roof0 + INS - 1, front=False); pinnacle(W - 15, roof0 + INS - 1, front=False)

    # the roof: a square pyramid of tiles over the top, standing a little in from its edges (the corner turrets outside it). Seen from the south
    # and above, three of its faces show: the left one (lit), the front one and the right one (in shade), meeting at the apex over the middle,
    # ridge tiles up the hips. Its tiles are small, each its own: rows parallel to that face's eave, every other row set over by half a tile, each
    # tile lit along its top with a rounded foot that laps the tile below and throws a little shadow on it.
    # its foot is a square: in this view a square on the ground shows as a square (a cell's top is 32 x 32 on the screen), so the foot is as deep
    # (back eave to front eave) as it is wide
    FL, FR = (INS, face0 - INS), (W - INS, face0 - INS)       # centred on the top: the same margin on every side
    BL, BR = (INS, roof0 + INS), (W - INS, roof0 + INS)
    cx = W / 2
    PH = 60                                           # the apex stands this high over the middle of the roof's foot
    apex = (cx, (BL[1] + FL[1]) / 2 - PH)
    TILE = np.array([118, 112, 108], np.float32)      # the roof's tiles: a dark, cool stone grey
    def roof_tile(u, v, light):
        """a tile at (u along the face's eave, v up the face from the eave), px: tiles 8 across and 6 up, every other row set over by half a
        tile; each its own tone, a dark joint between neighbours, lit along its top and its left edge, its lower lip dark where it laps the
        tile below, its lower corners just rounded"""
        TWD, THT = 8, 6
        u, v = int(u), int(v)
        row = v // THT
        su = (u + (row % 2) * (TWD // 2)) % TWD
        sv = v % THT                                      # 0 at the tile's lower edge (toward the eave)
        ti = (u + (row % 2) * (TWD // 2)) // TWD
        k = (0.93, 1.0, 1.06, 0.97)[(ti * 7 + row * 5) % 4]
        c = TILE * k
        if sv == 0: c = TILE * 0.46                       # its lower lip, in shadow on the tile below
        elif su == 0: c = TILE * 0.62                     # the joint with its neighbour
        elif sv == 1 and su in (1, TWD - 1): c = TILE * 0.62   # a just-rounded lower corner
        elif sv == THT - 1: c = c * 1.2                   # its top, lit
        elif su == 1: c = c * 1.1                         # its left edge, lit
        return c * light
    def roof_slab(x, y, light): return roof_tile(x, FL[1] - y, light)   # (the dormer's little roof uses the front face's tiles)
    for y in range(int(apex[1]) - 1, face0):
        for x in range(INS - 1, W - INS + 2):
            if in_tri(x, y, FL, FR, apex): c = roof_tile(x, FL[1] - y, 0.98)                 # the front face: rows across
            elif in_tri(x, y, BL, FL, apex): c = roof_tile(y, x - INS, 1.32)                 # the left face: rows up and down (its eave runs front to back)
            elif in_tri(x, y, BR, FR, apex): c = roof_tile(y, (W - INS) - x, 0.6)            # the right face
            else: continue
            f = (y - apex[1]) / (FL[1] - apex[1])
            if f > 0.82: c = c * 0.92                                                          # a little darker along the eaves
            cl = ((x // 3) * 7 + (y // 3) * 13) % 41
            if f > 0.7 and cl == 0: c = c * 0.5 + MOSS[1] * 0.5                              # moss low on the roof
            put(x, y, c)
    # ridge tiles up the four hips: a rounded cap, lit on its upper left, its shadow beside it
    def ridge(ex, ey, lit_side):
        n = int(math.hypot(ex - cx, ey - apex[1]))
        for i in range(n + 1):
            x = cx + (ex - cx) * i / n; y = apex[1] + (ey - apex[1]) * i / n
            put(x - 1, y, TILE * (1.45 if lit_side else 0.9)); put(x, y, TILE * 1.25); put(x + 1, y, TILE * 0.55)
            if i % 5 == 0: put(x, y, TILE * 0.7)                                              # the joints of the ridge tiles
    ridge(*BL, True); ridge(*BR, False)                                                       # the back hips: the faces' far edges
    ridge(*FL, True); ridge(*FR, True)                                                        # the front hips
    # the eaves: the front one a lit edge over its gutter, the side ones seen end-on; the outline round the roof's foot
    for x in range(INS - 1, W - INS + 2):
        put(x, FL[1] + 1, TILE * 1.35); put(x, FL[1] + 2, TILE * 0.8); put(x, FL[1] + 3, OUT)
        put(x, FL[1] + 4, WALK * 0.55); put(x, FL[1] + 5, WALK * 0.78)                       # its shadow on the platform
    for y in range(BL[1], FL[1] + 3):
        put(INS - 1, y, OUT); put(INS, y, TILE * 1.45)                                        # the left eave, lit
        put(W - INS + 1, y, OUT); put(W - INS, y, TILE * 0.5)                                 # the right eave, in shade
    for y in range(BL[1], FL[1]):                                                             # the roof's shadow on the platform to its right
        for k, f in enumerate((0.58, 0.68, 0.8, 0.9)):
            xx = W - INS + 2 + k
            if 0 <= xx < W - 3: img[y, xx, :3] *= f

    # a dormer on the front face: a little gabled lucarne of stone, its cheek in shade, a leaded light, its own roof and a tiny finial; and the
    # shadow it throws down the roof to its right
    dx, dy = cx, (apex[1] + face0) / 2 + 22
    DW, DH = 12, 14
    for y in range(int(dy) - DH // 2 - 6, int(dy) + DH):              # its shadow
        for k, f in enumerate((0.6, 0.68, 0.78, 0.88)):
            shade(dx + DW + 1 + k, y + 2, f)
    for y in range(int(dy) - DH // 2, int(dy) + DH):
        for x in range(int(dx - DW), int(dx + DW) + 1):
            u = x + 0.5 - dx
            c = masonry_px(x, y) * (1.08 if u < DW - 4 else 0.58)          # its face, and its right cheek in shade
            if abs(u) < 4.5 and y > dy - 2:                                  # the window: leaded, set in
                c = GLASS * (1.25 if (x + y) % 4 == 0 else 1.0)
                if abs(u) < 0.7: c = STONE * 1.0
                if abs(u) >= 3.8: c = masonry_px(x, y) * (0.55 if u < 0 else 1.15)
            if abs(u) < 3.2 and dy - 5 < y <= dy - 2: c = GLASS * 0.9
            if abs(u) >= DW - 0.5: c = OUT
            put(x, y, c)
    for x in range(int(dx - DW) - 1, int(dx + DW) + 2): put(x, int(dy) + DH, STONE * 1.25); put(x, int(dy) + DH + 1, STONE * 0.45)
    gy = int(dy) - DH // 2
    for t in range(15):                                                 # its gable roof, with its own hips
        hw = (DW + 2) * (1 - t / 15)
        y = gy - t
        for x in range(int(dx - hw), int(dx + hw) + 1): put(x, y, roof_slab(x, y, 1.25 if x < dx else 0.66))
        put(dx - hw, y, ROOFSTONE * 1.45); put(dx + hw, y, OUT)
    for y in range(gy - 21, gy - 14): put(dx - 0.5, y, STONE * 1.25); put(dx + 0.5, y, STONE * 0.7)   # its finial
    put(dx - 1.5, gy - 18, STONE * 1.2); put(dx + 1.5, gy - 18, STONE * 0.7)

    # the finial on the apex: a collar, a knob, a cross
    ax, ay = cx, apex[1]
    for y in range(int(ay) - 4, int(ay) + 3):
        w_ = 2 if y > ay - 1 else 1
        for x in range(int(ax - w_), int(ax + w_) + 1): put(x, y, STONE * (1.25 if x < ax else 0.7))
    for y in range(int(ay) - 16, int(ay) - 4): put(ax - 0.5, y, STONE * 1.28); put(ax + 0.5, y, STONE * 0.72)
    for x in range(int(ax - 4), int(ax + 5)): put(x, int(ay) - 12, STONE * (1.25 if x < ax else 0.72))
    put(ax - 0.5, ay - 17, STONE * 1.2)

    for x in range(INS, W - INS):                     # the near run, over the cornice and in front of the roof's foot: merlons rising, crenels a sill
        m = mer(x)
        topy = face0 - 14 if m else face0 - 6
        for y in range(topy, face0):
            if y < topy + 4: c = STONE * (1.25 if y > topy else 0.34)          # the stone top
            else: c = masonry_px(x, y) * (0.6 if y == topy + 4 else 1.0)       # the face, the arris under the top in shadow
            put(x, y, c)
        if m and (x - INS) % 16 in (0, 8):
            for y in range(topy, face0 - 6 + 4): put(x, y, OUT)
        if not m: put(x, topy - 1, WALK * 0.6)                                 # the shade a crenel's sill throws on the walk behind it
    pinnacle(1, face0 - 1); pinnacle(W - 15, face0 - 1)   # the front turrets, in front of the roof's foot

    # ---------------- weather and light across the whole face ----------------
    rng2 = np.random.default_rng(29)
    a0 = img[..., 3] > 0
    for y in range(face0, H):
        f = (y - face0) / (H - face0)
        k = 1.04 - 0.1 * f - (0.1 * ((y - (H - 30)) / 30) if y > H - 30 else 0)   # lighter high up, darker low, grimy at the foot
        img[y, a0[y], :3] *= k
    for y0 in (face0 + 5, S1 + 5, S2 + 5):                                       # soft shade under the cornice and each course
        for i, k in enumerate((0.78, 0.86, 0.92, 0.96)):
            img[y0 + i, a0[y0 + i], :3] *= k
    # rain: a few dark streaks running down from the sills and courses, 2 px wide, a clear step darker (not a haze)
    for (ys, xs_) in ((S1 + 5, (20, 46, 98)), (S2 + 5, (26, 104)), (CORN + 16 + 66 + 3, (54, 70)), (S1 + 16 + 54 + 3, (58,))):
        for x in xs_:
            ln = 10 + (x * 7) % 9
            for i in range(ln):
                for xx in (x, x + 1):
                    y = ys + i
                    if 0 <= y < H and a0[y, xx]: img[y, xx, :3] *= 0.86

    # ---------------- the outline, a little moss at the foot ----------------
    a = img[..., 3] > 0
    edge = a & ~(np.roll(a, 1, 0) & np.roll(a, -1, 0) & np.roll(a, 1, 1) & np.roll(a, -1, 1))
    edge[:, 0] |= a[:, 0]; edge[:, -1] |= a[:, -1]; edge[-1, :] |= a[-1, :]
    img[edge, :3] = OUT
    rng = np.random.default_rng(71)
    for _ in range(26):
        x, y = int(rng.integers(2, W - 3)), H - 1 - int(abs(rng.normal(0, 12)))
        if img[y, x, 3] > 0 and not edge[y, x]: img[y, x, :3] = img[y, x, :3] * 0.35 + MOSS[int(rng.integers(3))] * 0.65
    return img

img = np.concatenate([tower('ground'), tower('walk'), tower('none')], axis=1)   # frames: 0 the door on the ground, 1 on a wall's walk, 2 no door (a corner)
# crisp pixel art: the whole sheet in one limited palette, no dithering, so the light falls in clean bands and there is no per-pixel mush
rgba = np.clip(img, 0, 255).astype(np.uint8)
alpha = rgba[..., 3].copy()
q = Image.fromarray(rgba[..., :3], 'RGB').quantize(colors=PALETTE, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
out = np.dstack([np.asarray(q), np.where(alpha > 0, 255, 0).astype(np.uint8)])
Image.fromarray(out, 'RGBA').save(sys.argv[1], optimize=True)
print('ok', img.shape)
