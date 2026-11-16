# Ruined castle walls, outside (tilesets/castle_ruins): the plains tileset's own shapes (every outline, so the blob-47 renderer takes it as it is),
# repainted as a ruined castle. Wall faces: weathered pale limestone in dressed 16 x 8 blocks laid on the 32 px grid (a block across a tile edge is
# the same block, the same shade, on both sides), with fallen-out blocks, cracks, chipped corners, rain streaks, and moss and ivy climbing from the
# foot of the wall. Wall tops: the wall-walk, worn flagstones with grass and weeds in the joints and a little rubble. Dirt: a broken cobbled
# courtyard with grass between the stones. Grass, water (the moat) and the cast shadow are the plains' own. Stairs: castle stone.
#   python3 castle_gen.py <plains tileset dir> <out dir>
import numpy as np, os, sys
from PIL import Image
SRC, DST = sys.argv[1], sys.argv[2]
os.makedirs(DST, exist_ok=True)

def load(n): return np.asarray(Image.open(os.path.join(SRC, n)).convert('RGBA')).astype(np.float32)
def save(n, a): Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGBA').save(os.path.join(DST, n), optimize=True)
def copy(n): Image.open(os.path.join(SRC, n)).save(os.path.join(DST, n), optimize=True)

STONE = np.array([156, 148, 128], np.float32)       # weathered limestone, a warm pale grey
WALK = np.array([138, 134, 120], np.float32)        # the wall-walk's flags, a touch darker and cooler (worn by feet and rain)
COBBLE = np.array([122, 116, 104], np.float32)
MOSS = [np.array(c, np.float32) for c in [(58, 78, 42), (74, 98, 50), (92, 116, 58)]]
IVY = [np.array(c, np.float32) for c in [(34, 58, 30), (48, 80, 38), (66, 104, 46)]]
GRASS = [np.array(c, np.float32) for c in [(96, 122, 62), (118, 146, 72), (78, 104, 52)]]
HOLE = np.array([30, 28, 26], np.float32)

def lum(rgb): return rgb @ np.array([0.299, 0.587, 0.114], np.float32)

def edge_dist(cell_a):
    """distance (Chebyshev, up to 4) from each opaque pixel of a 32 px tile to the nearest transparent pixel inside the tile"""
    dist = np.full((32, 32), 4.0, np.float32)
    for d in range(1, 4):
        sh = np.zeros_like(cell_a)
        for dy in range(-d, d + 1):
            for dx in range(-d, d + 1):
                if max(abs(dx), abs(dy)) != d: continue
                ys = slice(max(0, dy), 32 + min(0, dy)); yd = slice(max(0, -dy), 32 + min(0, -dy))
                xs = slice(max(0, dx), 32 + min(0, dx)); xd = slice(max(0, -dx), 32 + min(0, -dx))
                sh[yd, xd] |= ~cell_a[ys, xs]
        dist = np.where(sh & (dist == 4.0) & cell_a, float(d), dist)
    return dist

# the shade of each block of a tile: 4 courses x 2 blocks, the same in every tile so neighbours always agree
SHADE = np.array([[1.0, 0.93], [0.96, 1.04], [1.05, 0.95], [0.94, 1.0]], np.float32)
# blocks wholly inside a tile (x0, y0 of their 16 x 8 box): courses 0 and 2 both blocks, courses 1 and 3 the middle one
INNER = [(0, 0), (16, 0), (8, 8), (0, 16), (16, 16), (8, 24)]

def castle_face(src, seed, ground=False):
    """a wall face sheet repainted as castle masonry. ground=True (the ext sheet: the foot of the wall, hanging into the cell below) grows more moss."""
    H, W = src.shape[:2]
    alpha = src[..., 3] > 0
    out = src.copy()
    rng = np.random.default_rng(seed)
    # the plains rock's own light and dark, a little of it kept, so the face is lit as the tile set lights it
    rock_l = lum(src[..., :3])
    for ty in range(0, H, 32):
        for tx in range(0, W, 32):
            cell_a = alpha[ty:ty + 32, tx:tx + 32]
            if not cell_a.any(): continue
            dist = edge_dist(cell_a)
            cl = rock_l[ty:ty + 32, tx:tx + 32]
            mean_l = cl[cell_a].mean() if cell_a.any() else 1
            for ly in range(32):
                row = ly // 8
                for lx in range(32):
                    if not cell_a[ly, lx]: continue
                    X, Y = tx + lx, ty + ly
                    if dist[ly, lx] <= 1:   # the outline, as the tile set draws it, in the castle's stone
                        out[Y, X, :3] = STONE * 0.34
                        continue
                    sx = (lx + (row % 2) * 8) % 32
                    xo, yo = sx % 16, ly % 8
                    k = SHADE[row, sx // 16] * (0.96 + ((lx * 7 + ly * 13) % 5) * 0.018)
                    if yo == 0 or xo == 0: c = STONE * 0.42                 # weathered mortar, deep in the joint
                    elif yo == 1: c = STONE * k * 1.12                      # the lit top of the block
                    elif yo == 7 or xo == 15: c = STONE * k * 0.8           # its shaded lower and right edge
                    else: c = STONE * k * (0.97 + 0.03 * (((lx * 31 + ly * 17) % 7) / 7))
                    c = c * (0.9 + 0.025 * dist[ly, lx])                    # a little darker right at the wall's edges
                    c = c * (0.96 + 0.04 * np.clip(cl[ly, lx] / max(mean_l, 1), 0.6, 1.4))   # the plains rock's own light: barely (the face reads even, top to bottom)
                    out[Y, X, :3] = np.clip(c, 0, 255)
            inner_ok = lambda x0, y0: cell_a[y0 + 1:y0 + 8, x0 + 1:x0 + 16].all() and dist[y0 + 1:y0 + 8, x0 + 1:x0 + 16].min() > 1
            # a fallen-out block now and then: a dark hollow, its top lip lit, rubble crumbs at its foot
            if rng.random() < 0.06:
                cand = [b for b in INNER if inner_ok(*b)]
                if cand:
                    x0, y0 = cand[int(rng.integers(len(cand)))]
                    # a recess, darkest under its lip, the back of the hole a little lit; its broken edge ragged; crumbs on the course below
                    for y in range(y0 + 1, y0 + 8):
                        for x in range(x0 + 1, x0 + 16):
                            depth = (y - y0) / 7.0
                            out[ty + y, tx + x, :3] = STONE * (0.18 + 0.2 * depth)
                    for x in range(x0 + 1, x0 + 16, 3):
                        if rng.random() < 0.5: out[ty + y0 + 1, tx + x, :3] = STONE * 0.75     # a ragged lip
                    for _ in range(2):
                        x = x0 + int(rng.integers(2, 14)); y = y0 + 9
                        if y < 31 and cell_a[y, x] and dist[y, x] > 1: out[ty + y, tx + x, :3] = STONE * 0.95
            # chipped corners and hairline cracks in whole blocks
            for _ in range(int(rng.integers(1, 4))):
                x0, y0 = INNER[int(rng.integers(len(INNER)))]
                if not inner_ok(x0, y0): continue
                if rng.random() < 0.5:   # a chipped corner
                    cx = x0 + (1 if rng.random() < 0.5 else 13); cy = y0 + 1
                    for dy in range(2):
                        for dx in range(3 - dy):
                            xx = cx + (dx if cx == x0 + 1 else 2 - dx)
                            out[ty + cy + dy, tx + xx, :3] = STONE * 0.55
                else:                    # a crack running down through the block
                    cx, cy = x0 + int(rng.integers(3, 13)), y0 + 1
                    while cy < y0 + 8:
                        out[ty + cy, tx + cx, :3] *= 0.55
                        cx = int(np.clip(cx + rng.integers(-1, 2), x0 + 1, x0 + 15)); cy += 1
            # rain streaks: faint dark runs down from a joint
            for _ in range(int(rng.integers(0, 3))):
                x = int(rng.integers(3, 29)); y = int(rng.choice([1, 9, 17, 25]))
                for i in range(int(rng.integers(4, 12))):
                    if y + i < 32 and cell_a[y + i, x] and dist[y + i, x] > 1:
                        out[ty + y + i, tx + x, :3] *= 0.88 + 0.02 * i / 4
            # moss in the joints, and on the foot of the wall more of it, with ivy climbing
            n_moss = int(rng.integers(2, 6)) + (3 if ground else 0)
            for _ in range(n_moss):
                if ground: y = int(np.clip(31 - abs(rng.normal(0, 7)), 2, 30))
                else: y = int(rng.choice([0, 8, 16, 24])) + int(rng.integers(0, 2))
                x = int(rng.integers(2, 30))
                for _ in range(int(rng.integers(2, 6))):
                    xx, yy = x + int(rng.integers(-1, 2)), y + int(rng.integers(-1, 2))
                    if 0 <= xx < 32 and 0 <= yy < 32 and cell_a[yy, xx] and dist[yy, xx] > 1:
                        m = MOSS[int(rng.integers(3))]
                        out[ty + yy, tx + xx, :3] = out[ty + yy, tx + xx, :3] * 0.35 + m * 0.65
            if rng.random() < (0.18 if ground else 0.08):   # an ivy runner, climbing and branching
                x, y = int(rng.integers(4, 28)), 30
                for _ in range(int(rng.integers(10, 24))):
                    if 0 <= x < 32 and 0 <= y < 32 and cell_a[y, x] and dist[y, x] > 1:
                        out[ty + y, tx + x, :3] = IVY[0]
                        if rng.random() < 0.45:       # a leaf
                            lx2 = x + int(rng.choice([-1, 1]))
                            if 0 <= lx2 < 32 and cell_a[y, lx2] and dist[y, lx2] > 1:
                                out[ty + y, tx + lx2, :3] = IVY[int(rng.integers(1, 3))]
                    x += int(rng.integers(-1, 2)); y -= 1 if rng.random() < 0.8 else 0
    return out

def walkway(src, seed):
    """the top of the wall: flagstones (16 px, every other row set over), grass and weeds in the joints, a little rubble; the outline kept"""
    H, W = src.shape[:2]
    alpha = src[..., 3] > 0
    out = src.copy()
    rng = np.random.default_rng(seed)
    src_l = lum(src[..., :3])
    for ty in range(0, H, 32):
        for tx in range(0, W, 32):
            cell_a = alpha[ty:ty + 32, tx:tx + 32]
            if not cell_a.any(): continue
            dist = edge_dist(cell_a)
            cl = src_l[ty:ty + 32, tx:tx + 32]
            ref = np.median(cl[cell_a])
            for ly in range(32):
                row = ly // 16
                for lx in range(32):
                    if not cell_a[ly, lx]: continue
                    X, Y = tx + lx, ty + ly
                    if dist[ly, lx] <= 1 or cl[ly, lx] < ref * 0.8:   # the rim and outline the tile set draws: kept, in stone
                        out[Y, X, :3] = WALK * 0.5 * np.clip(cl[ly, lx] / max(ref, 1), 0.4, 1.3)
                        continue
                    sx = (lx + row * 8) % 32
                    xo, yo = sx % 16, ly % 16
                    k = [[1.0, 0.93], [0.95, 1.04]][row][sx // 16] * (0.97 + ((lx * 5 + ly * 11) % 7) * 0.01)
                    if yo == 0 or xo == 0:
                        c = WALK * 0.55
                        if rng.random() < 0.35: c = GRASS[int(rng.integers(3))]         # weeds in the joint
                    elif yo == 1 or xo == 1: c = WALK * k * 1.08
                    else: c = WALK * k
                    out[Y, X, :3] = np.clip(c * (0.9 + 0.025 * dist[ly, lx]), 0, 255)
            # tufts of grass, cracks and loose rubble, away from the tile's edges
            for _ in range(int(rng.integers(1, 4))):
                cx, cy = int(rng.integers(4, 28)), int(rng.integers(4, 28))
                if not (cell_a[cy, cx] and dist[cy, cx] > 2): continue
                kind = rng.random()
                if kind < 0.45:
                    for _ in range(int(rng.integers(3, 7))):
                        xx, yy = cx + int(rng.integers(-2, 3)), cy + int(rng.integers(-1, 2))
                        if cell_a[yy, xx] and dist[yy, xx] > 1: out[ty + yy, tx + xx, :3] = GRASS[int(rng.integers(3))]
                elif kind < 0.75:
                    for _ in range(int(rng.integers(3, 6))):
                        if cell_a[cy, cx] and dist[cy, cx] > 1: out[ty + cy, tx + cx, :3] *= 0.6
                        cx = int(np.clip(cx + rng.integers(-1, 2), 2, 29)); cy = int(np.clip(cy + 1, 2, 29))
                else:
                    for dx, dy in [(0, 0), (1, 0), (0, 1)]:
                        out[ty + cy + dy, tx + cx + dx, :3] = STONE * (1.05 if dy == 0 else 0.62)
    return out

def cobbles(src, seed, shift=0):
    """the dirt of a sheet turned into a broken cobbled yard: round setts with grass between them where the dirt was; anything else (the grass rim) kept"""
    a = src.copy()
    rgb = src[..., :3]
    dirt = (src[..., 3] > 0) & (rgb[..., 0] > rgb[..., 1] + 25)
    H, W = a.shape[:2]
    y, x = np.mgrid[0:H, 0:W]
    ly, lx = y % 32, x % 32
    # setts on an 8 px grid, every other row set over by 4: a round stone in each cell, its own shade from its place in the tile
    row = ly // 8
    sx = (lx + (row % 2) * 4) % 32
    cxp, cyp = sx % 8 - 3.5, ly % 8 - 3.5
    r2 = np.abs(cxp) ** 3 + np.abs(cyp) ** 3        # a rounded square: a sett, not a pebble
    shade = 0.86 + 0.18 * (((row * 7 + (sx // 8) * 13) % 9) / 9)
    stone = r2 < 40
    lit = stone & (cyp < -1.5)
    dark = stone & (cyp > 2.0)
    # between the setts: packed earth, with grass coming up in some of the joints
    joint_grass = (((x * 7 + y * 13) % 5) == 0) | ((((x // 3) * 11 + (y // 3) * 5) % 9) == 0)
    gap = np.where(joint_grass[..., None], (GRASS[2] * 0.85)[None, None, :], np.array([74, 64, 52], np.float32)[None, None, :])
    col = np.where(stone[..., None], COBBLE[None, None, :] * shade[..., None], gap)
    col = np.where(lit[..., None], col * 1.15, col)
    col = np.where(dark[..., None], col * 0.75, col)
    # a few setts gone: bare earth
    gone = (((row * 31 + (sx // 8) * 17 + (ly // 32) * 7 + (x // 32) * 3 + shift) % 11) == 0) & stone
    col = np.where(gone[..., None], np.array([92, 76, 58], np.float32)[None, None, :], col)
    # keep the dirt's own light and shadow at its edge (the sheet's soft rim)
    l = lum(rgb); ref = np.median(l[dirt]) if dirt.any() else 1
    col = col * np.clip(l / max(ref, 1), 0.6, 1.25)[..., None]
    a[..., :3] = np.where(dirt[..., None], col, a[..., :3])
    return a

def stairs(src):
    """the plains stairs in castle stone: the brown rock and the wooden steps become limestone and worn stone treads; the grass stays"""
    a = src.copy()
    rgb = src[..., :3]
    brown = (src[..., 3] > 0) & (rgb[..., 0] > rgb[..., 1] + 12) & (rgb[..., 1] >= rgb[..., 2] - 4)
    l = lum(rgb); ref = np.median(l[brown])
    k = np.clip(l / max(ref, 1), 0.3, 1.6)
    stone = STONE[None, None, :] * (0.25 + 0.75 * k)[..., None] * 0.95
    # block joints over the rock (the same 16 x 8 bond as the walls, on the 32 px grid), only where the rock is lit enough to be a face
    H, W = a.shape[:2]
    y, x = np.mgrid[0:H, 0:W]
    row = (y % 32) // 8
    sx = (x % 32 + (row % 2) * 8) % 32
    joint = ((y % 8) == 0) | ((sx % 16) == 0)
    stone = np.where((joint & (k > 0.7))[..., None], stone * 0.55, stone)
    a[..., :3] = np.where(brown[..., None], stone, a[..., :3])
    return a

# ---- the cliff pieces, drawn from scratch with a castle's straight lines (not the plains rock's outline) ----
# For a cell on the wall with neighbour mask m (blob-47): the FLOOR piece is its top (the wall-walk, a parapet with battlements along every
# open side), the WALL piece its south face inside the cell (from TOPS down), the EXT piece the rest of that face, hanging into the cell
# below (EXT px, the depth the plains face has, so the cast shadows still fit), ending in a flat plinth. 8 variants: the same shapes, other
# damage.
TOPS, EXT, RIM, MERH, CAP = 16, 28, 4, 8, 2
N_, NE_, E_, SE_, S_, SW_, W_, NW_ = 1, 2, 4, 8, 16, 32, 64, 128
def reduce47(bm):
    if not (bm & N_ and bm & E_): bm &= ~NE_
    if not (bm & S_ and bm & E_): bm &= ~SE_
    if not (bm & S_ and bm & W_): bm &= ~SW_
    if not (bm & N_ and bm & W_): bm &= ~NW_
    return bm
MASKS = sorted(set(reduce47(i) for i in range(256)))
OUTLINE = STONE * 0.34

def mason(lx, ly):
    """the walls' masonry at a pixel of a cell (lx, ly in 0..31): the 16 x 8 bond on the 32 px grid, as the towers draw it"""
    row = ly // 8
    sx = (lx + (row % 2) * 8) % 32
    xo, yo = sx % 16, ly % 8
    k = SHADE[row, sx // 16] * (0.96 + ((lx * 7 + ly * 13) % 5) * 0.018)
    if yo == 0 or xo == 0: return STONE * 0.42
    if yo == 1: return STONE * k * 1.12
    if yo == 7 or xo == 15: return STONE * k * 0.8
    return STONE * k * (0.97 + 0.03 * (((lx * 31 + ly * 17) % 7) / 7))

def flag(lx, ly):
    row = ly // 16; sx = (lx + row * 8) % 32
    k = [[1.0, 0.93], [0.95, 1.04]][row][sx // 16] * (0.97 + ((lx * 5 + ly * 11) % 7) * 0.01)
    if ly % 16 == 0 or sx % 16 == 0: return WALK * 0.55
    if ly % 16 == 1 or sx % 16 == 1: return WALK * k * 1.08
    return WALK * k

MER0, MER1 = 4, 24     # a merlon from 4 to 24 px of every 32 (20 px), a crenel the other 12: on the 32 px grid, so neighbours always agree
def merlon_at(t): return MER0 <= (t % 32) < MER1
PT = 8                  # the parapet's thickness, seen from above (the stone top of a merlon or a sill)
MH = 11                 # how far a merlon's face shows below its top (the far parapet's inner face)

def damage(tile, rng, region, ground=False):
    """cracks, a chipped block, moss, now and then a fallen-out block, only in blocks wholly inside region (x0, y0, x1, y1) of the tile"""
    x0, y0, x1, y1 = region
    for _ in range(int(rng.integers(0, 3))):
        cx, cy = int(rng.integers(x0 + 2, max(x0 + 3, x1 - 2))), int(rng.integers(y0 + 2, max(y0 + 3, y1 - 3)))
        for _ in range(int(rng.integers(3, 8))):
            if x0 + 1 <= cx < x1 - 1 and y0 + 1 <= cy < y1 - 1: tile[cy, cx, :3] *= 0.6
            cx += int(rng.integers(-1, 2)); cy += 1
    for _ in range(int(rng.integers(1, 5)) + (3 if ground else 0)):
        cx = int(rng.integers(x0 + 1, max(x0 + 2, x1 - 1)))
        cy = int(np.clip(y1 - 2 - abs(rng.normal(0, 5)), y0 + 1, y1 - 2)) if ground else int(rng.integers(y0 + 1, max(y0 + 2, y1 - 1)))
        if (cy % 8) in (0, 1) or ground:
            tile[cy, cx, :3] = tile[cy, cx, :3] * 0.35 + MOSS[int(rng.integers(3))] * 0.65
    if rng.random() < 0.05 and x1 - x0 >= 18 and y1 - y0 >= 10:
        bx = x0 + 1 + (16 - x0 % 16) % 16 if (x0 % 16) else x0 + 1
        by = y0 + (8 - y0 % 8) % 8 + 1
        if bx + 14 < x1 and by + 6 < y1:
            for y in range(by, by + 7):
                for x in range(bx, bx + 15): tile[y, x, :3] = STONE * (0.18 + 0.2 * (y - by) / 7)

def crack(a, rng, x0, y0, x1, y1, allow=None, n=1, length=(12, 28), down=True, dark=0.32):
    """cracks run through stone in a (an RGBA array, region x0..x1, y0..y1): each a jagged line wandering on (down a wall's face, or any way
    across a floor), a dark split with a lit lip on one side, a branch or two, only over pixels `allow` lets through (and opaque ones)"""
    H, W = a.shape[:2]
    ok = lambda x, y: x0 <= x < x1 and y0 <= y < y1 and a[y, x, 3] > 0 and (allow is None or allow[y, x])
    for _ in range(n):
        for _try in range(20):
            x, y = int(rng.integers(x0 + 2, max(x0 + 3, x1 - 2))), int(rng.integers(y0 + 1, max(y0 + 2, y1 - 2)))
            if ok(x, y): break
        else: continue
        dx, dy = (0, 1) if down else ((1, 0) if rng.random() < 0.5 else (0, 1))
        heads = [(x, y, int(rng.integers(*length)))]
        while heads:
            x, y, left = heads.pop()
            for _step in range(left):
                if not ok(x, y): break
                a[y, x, :3] *= dark
                lx, ly = (x + 1, y) if dy else (x, y + 1)
                if ok(lx, ly): a[ly, lx, :3] = np.minimum(255, a[ly, lx, :3] * 1.14)
                if rng.random() < 0.06 and len(heads) < 2: heads.append((x, y, int(rng.integers(4, 10))))
                j = int(rng.integers(-1, 2)) if rng.random() < 0.55 else 0
                if dy: x += j; y += 1
                else: x += 1; y += j
                if not down and rng.random() < 0.08: dx, dy = dy, dx

def decorate(kind, f, wl, ex, m, rng):
    """a wall cell's character, on one of the decorated variants: an arrow loop, ivy, a repaired patch of other stone, a drain and its stain,
    a blind niche, heavy moss, blocks fallen out; and on its walk, rubble, weeds or a puddle. Each piece kept whole in itself (a cell's face and
    the part of it hanging into the cell below may be drawn from different variants)"""
    e, w, s_open = not (m & E_), not (m & W_), not (m & S_)
    inner = not e and not w                                   # a cell with wall either side (room for a loop or a niche)
    if s_open and kind == 'loop' and inner:                   # a cross-shaped arrow loop in the face below the walk
        cx = 16
        for y in range(3, 20):
            for x in range(cx - 4, cx + 4):
                d = abs(x + 0.5 - cx)
                if d < 1.0: ex[y, x, :3] = HOLE
                elif d < 2.2: ex[y, x, :3] = STONE * (0.55 if x < cx else 1.2)        # the splay, lit on its right
                elif d < 3.2 and y in (3, 19): ex[y, x, :3] = STONE * 1.2
        for x in range(cx - 4, cx + 4):                       # its cross arm
            for y in (10, 11):
                if abs(x + 0.5 - cx) >= 1: ex[y, x, :3] = HOLE if y == 10 else STONE * 1.15
        ex[20, cx - 3:cx + 3, :3] = STONE * 1.25
    if s_open and kind == 'niche' and inner:                  # a blind pointed niche, a statue long gone
        cx = 16
        for y in range(2, 21):
            for x in range(cx - 7, cx + 7):
                d = abs(x + 0.5 - cx); t = y - 2
                inside = (d <= 4.5) if t >= 6 else ((d + 4.5) ** 2 + (6 - t) ** 2 <= 81)
                rim = (d <= 6.5) if t >= 5 else ((d + 6.5) ** 2 + (7 - t) ** 2 <= 169)
                if inside: ex[y, x, :3] = STONE * (0.32 + 0.18 * t / 19) * (0.8 if x < cx else 1.0)
                elif rim: ex[y, x, :3] = STONE * (1.28 if x < cx else 0.62)
        ex[20, cx - 6:cx + 6, :3] = STONE * 1.3; ex[21, cx - 6:cx + 6, :3] = STONE * 0.5
    if s_open and kind == 'drain':                            # a spout under the walk, its stain down the face
        cx = 10 + int(rng.integers(0, 12))
        wl[TOPS + 3:TOPS + 6, cx - 2:cx + 3, :3] = STONE * 1.2; wl[TOPS + 5, cx - 1:cx + 2, :3] = HOLE
        for y in range(TOPS + 6, 32): wl[y, cx - 1:cx + 2, :3] *= 0.72
        for y in range(0, EXT - 6): ex[y, cx - 1 + (y // 9) % 2:cx + 2, :3] *= 0.72 - 0.004 * y
    if s_open and kind == 'patch':                            # a patch of later repair: blocks of a warmer, darker stone
        bx = int(rng.integers(0, 2)) * 16
        for a in (wl, ex):
            y0 = TOPS if a is wl else 0
            for y in range(y0, 32 if a is wl else EXT - 6):
                for x in range(bx, bx + 16):
                    if a[y, x, 3] and (x % 16) and (y % 8): a[y, x, :3] = a[y, x, :3] * np.array([0.9, 0.87, 0.82], np.float32)
    if s_open and kind == 'holes':                            # blocks fallen out of the face, the core behind dark
        for a, (y0, y1) in ((wl, (TOPS + 1, 31)), (ex, (1, EXT - 7))):
            row = y0 + int(rng.integers(0, max(1, (y1 - y0) // 8))) * 8
            sx = int(rng.integers(0, 2)) * 16 + (8 if (row // 8) % 2 else 0)
            for y in range(row + 1, min(y1, row + 8)):
                for x in range(sx + 1, min(32, sx + 16)):
                    if a[y, x, 3]: a[y, x, :3] = HOLE * (1.0 + 0.4 * (y - row) / 8)
            a[min(y1, row + 8), sx + 1:min(32, sx + 16), :3] = STONE * 1.2
    if s_open and kind in ('ivy', 'moss'):                    # ivy climbing from the foot, or moss thick in the joints
        for a, y_lo, y_hi in ((ex, 0, EXT - 2), (wl, TOPS, 32)):
            if kind == 'ivy':
                for vine in range(2):
                    x, y = 4 + int(rng.integers(0, 24)), y_hi - 1
                    for _ in range(int(rng.integers(14, 30))):
                        if y_lo <= y < y_hi and 0 <= x < 32 and a[y, x, 3]:
                            a[y, x, :3] = IVY[0]
                            lx = x + (1 if rng.random() < 0.5 else -1)
                            if 0 <= lx < 32 and rng.random() < 0.7 and a[y, lx, 3]: a[y, lx, :3] = IVY[int(rng.integers(1, 3))]
                        x += int(rng.integers(-1, 2)); y -= 1
            else:
                for y in range(y_lo, y_hi):
                    for x in range(32):
                        if a[y, x, 3] and (y % 8 in (0, 7) or x % 16 in (0, 15)) and rng.random() < 0.45:
                            a[y, x, :3] = a[y, x, :3] * 0.4 + MOSS[int(rng.integers(3))] * 0.6
    # the walk: rubble, weeds, a puddle
    y1 = TOPS if s_open else 32
    if kind in ('loop', 'rubble', 'patch'):
        for _ in range(int(rng.integers(3, 7))):
            x, y = 6 + int(rng.integers(0, 20)), 4 + int(rng.integers(0, max(1, y1 - 8)))
            if f[y, x, 3]: f[y:y + 2, x:x + 3, :3] = STONE * 1.15; f[y + 2, x:x + 3, :3] = WALK * 0.5
    if kind in ('ivy', 'moss', 'weeds'):
        for _ in range(int(rng.integers(8, 16))):
            x, y = 2 + int(rng.integers(0, 28)), 2 + int(rng.integers(0, max(1, y1 - 4)))
            if f[y, x, 3]: f[y, x, :3] = GRASS[int(rng.integers(3))]
    if kind in ('drain', 'niche'):
        cx, cy = 8 + int(rng.integers(0, 16)), 5 + int(rng.integers(0, max(1, y1 - 12)))
        for y in range(cy, cy + 5):
            for x in range(cx - 4, cx + 5):
                if (x - cx) ** 2 / 16 + (y - cy - 2) ** 2 / 4 < 1 and f[y, x, 3]: f[y, x, :3] = f[y, x, :3] * np.array([0.62, 0.66, 0.74], np.float32)

def piece_floor(m, rng):
    """the top of a wall cell: the wall-walk's flags, and on every open side but the south a thick parapet of merlons and crenels. The far (north)
    parapet shows its merlons' faces toward us; the side parapets are blocks seen from above (a lit top, a south face, their shade on the walk).
    Crenels are open on the outer half (the ground beyond shows) with a low sill on the inner half. The south parapet is a piece of its own."""
    t = np.zeros((32, 32, 4), np.float32)
    n, e, s_, w = not (m & N_), not (m & E_), not (m & S_), not (m & W_)
    ne, nw = (m & N_) and (m & E_) and not (m & NE_), (m & N_) and (m & W_) and not (m & NW_)
    y1 = TOPS if s_ else 32
    for y in range(y1):
        for x in range(32):
            t[y, x, :3] = flag(x, y); t[y, x, 3] = 255
    top = lambda x, y, k=1.0: STONE * (1.12 - 0.04 * ((x // 16 + y // 16) % 2)) * k        # a parapet's stone top, two slabs a cell
    # the side parapets (first, so the far parapet's corner merlons sit over them)
    for side, cond in (('w', w), ('e', e)):
        if not cond: continue
        xs = range(0, PT) if side == 'w' else range(32 - PT, 32)
        outer = 0 if side == 'w' else 31
        inner = PT if side == 'w' else 31 - PT
        for y in range(y1):
            ly = y % 32
            if merlon_at(ly):
                sf = ly >= MER1 - 7                                   # the merlon's south face, under its top
                for x in xs: t[y, x, :3] = mason(x, y) * 0.8 if sf else top(x, y)
                if ly == MER0: 
                    for x in xs: t[y, x, :3] = OUTLINE                # its north edge
                t[y, outer, :3] = OUTLINE
                if 0 <= inner < 32: t[y, inner, :3] = WALK * 0.5      # its shade on the walk
            else:
                # a crenel: the parapet cut down to a low sill across its whole thickness (as thick as the merlons), never open to what lies
                # under the wall (the courtyard's cobbles would show as the tile set's grass)
                for x in xs: t[y, x, :3] = top(x, y, 0.8)
                t[y, outer, :3] = OUTLINE
                ix = inner - 1 if side == 'w' else inner + 1         # the sill's inner edge, lit
                if 0 <= ix < 32: t[y, ix, :3] = STONE * (1.15 if side == 'w' else 0.95)
                if 0 <= inner < 32: t[y, inner, :3] = WALK * 0.75
            if ly == MER1 and 0 <= inner < 32:                        # the shade under a merlon's south face, across the sill
                for x in xs: t[y, x, :3] = t[y, x, :3] * 0.7
    # the far parapet
    if n:
        for x in range(32):
            if (w and x < PT) or (e and x >= 32 - PT): continue
            if merlon_at(x):
                for y in range(0, PT): t[y, x, :3] = top(x, y)
                for y in range(PT, min(y1, PT + MH)): t[y, x, :3] = mason(x, y) * 0.84            # its face, toward us
                if PT + MH < y1: t[PT + MH, x, :3] = WALK * 0.5
                if PT + MH + 1 < y1: t[PT + MH + 1, x, :3] = WALK * 0.75
                t[0, x, :3] = OUTLINE
                if x % 32 in (MER0, MER1 - 1):
                    for y in range(0, PT + MH): t[y, x, :3] = OUTLINE
            else:
                # a crenel: the parapet cut down to a low sill across its whole thickness, as thick as the merlons beside it (not open)
                for y in range(0, PT): t[y, x, :3] = top(x, y, 0.8)
                t[0, x, :3] = OUTLINE
                t[PT - 1, x, :3] = STONE * 1.15                                                  # the sill's inner edge, lit
                for y in range(PT, PT + 3): t[y, x, :3] = mason(x, y) * 0.78                     # its low face, toward us
                t[PT + 3, x, :3] = WALK * 0.6
        # the corners where a side parapet meets the far one: one big merlon
        for cx in ([range(0, PT)] if w else []) + ([range(32 - PT, 32)] if e else []):
            for x in cx:
                for y in range(0, PT): t[y, x, :3] = top(x, y)
                for y in range(PT, PT + 7): t[y, x, :3] = mason(x, y) * 0.8
                t[0, x, :3] = OUTLINE
    if ne or nw:   # an inner corner: the corner block of the parapets that meet there
        for x in (range(32 - PT, 32) if ne else range(0, PT)):
            for y in range(0, PT): t[y, x, :3] = top(x, y)
            for y in range(PT, PT + 7): t[y, x, :3] = mason(x, y) * 0.8
    if s_:   # the near (south) parapet is a battlement piece of its own (front_piece)
        for y in range(y1):
            for x in range(32): t[y, x, :3] = STONE * 0.9
    # a tuft of grass or loose stones on the walk now and then
    for _ in range(int(rng.integers(0, 3))):
        cx, cy = int(rng.integers(PT + 3, 28 - PT)), int(rng.integers(PT + MH + 3 if n else 3, max(PT + MH + 4 if n else 4, y1 - 4)))
        if cy + 1 < y1:
            for _ in range(4):
                xx, yy = cx + int(rng.integers(-2, 3)), cy + int(rng.integers(-1, 2))
                if 0 <= yy < y1 and 0 <= xx < 32 and t[yy, xx, 3] > 0: t[yy, xx, :3] = GRASS[int(rng.integers(3))]
    return t

def piece_wall(m, rng):
    t = np.zeros((32, 32, 4), np.float32)
    if m & S_: return t                       # only a south-open cell shows a face
    e, w = not (m & E_), not (m & W_)
    for y in range(TOPS, 32):
        for x in range(32):
            t[y, x, :3] = mason(x, y); t[y, x, 3] = 255
            if (w and x == 0) or (e and x == 31): t[y, x, :3] = OUTLINE
    damage(t, rng, (1 if w else 0, TOPS + 1, 31 if e else 32, 32))
    return t

def piece_ext(m, rng, plinth=True):
    """the face hanging into the cell below; plinth=False (cliff_blob47_ext_step.png): for a wall standing on a one-row step, its face running
    straight on down over the step's own face (one taller wall), no base course, no foot"""
    t = np.zeros((32, 32, 4), np.float32)
    if m & S_: return t
    e, w = not (m & E_), not (m & W_)
    for y in range(EXT if plinth else 32):
        for x in range(32):
            c = mason(x, y)
            if plinth:
                if y == EXT - 6: c = STONE * 1.14                 # the plinth's chamfer, lit
                elif y >= EXT - 5: c = mason(x, y) * 0.78          # the base course, a little proud and darker
                if y == EXT - 1: c = OUTLINE                       # a flat foot
            if (w and x == 0) or (e and x == 31): c = OUTLINE
            t[y, x, :3] = c; t[y, x, 3] = 255
    damage(t, rng, (1 if w else 0, 0, 31 if e else 32, EXT - 6 if plinth else 32), ground=plinth)
    return t

FRONT_H, FRONT_RISE = 40, 24     # (blobTerrainRenderer.js: FRONT_H, FRONT_RISE)
MTOP, SILL = -22, -8              # in cell px: the top of a merlon's stone top and of a crenel's sill, above the cell (the wall-walk's feet line is the cell's top)
def front_piece(m, rng):
    """the south parapet of a south-open cell, in front of whoever walks the wall: merlons (an 8 px stone top, then their face, which is the
    wall's face going on up) and crenels (a sill with its stone top). 32 x FRONT_H, the cell's top at FRONT_RISE."""
    t = np.zeros((FRONT_H, 32, 4), np.float32)
    if m & S_: return t
    e, w = not (m & E_), not (m & W_)
    for py in range(FRONT_H):
        y = py - FRONT_RISE
        for x in range(32):
            mer = merlon_at(x) or (w and x < PT) or (e and x >= 32 - PT)          # a merlon at each end of the run
            topy = MTOP if mer else SILL
            if y < topy or y >= TOPS: continue
            if y < topy + PT:
                c = STONE * (1.13 - 0.04 * ((x // 16) % 2))                    # the stone top
                if y == topy: c = OUTLINE
            else:
                c = mason(x, y % 32)
                if y == topy + PT: c = c * 0.62                                 # the arris under the top
            if mer and not ((w and x < PT) or (e and x >= 32 - PT)) and x % 32 in (MER0, MER1 - 1) and y < SILL + PT: c = OUTLINE
            if (w and x == 0) or (e and x == 31): c = OUTLINE
            t[py, x, :3] = c; t[py, x, 3] = 255
    # weathering on the merlons' faces: a crack or a chip, moss in a joint
    for _ in range(int(rng.integers(0, 3))):
        cx, cy = int(rng.integers(MER0 + 2, MER1 - 2)), int(rng.integers(MTOP + PT + 2, 10)) + FRONT_RISE
        for _ in range(int(rng.integers(3, 7))):
            if 0 <= cy < FRONT_H and t[cy, cx, 3] > 0: t[cy, cx, :3] *= 0.6
            cx += int(rng.integers(-1, 2)); cy += 1
    for _ in range(int(rng.integers(0, 4))):
        cx, cy = int(rng.integers(1, 31)), int(rng.integers(0, FRONT_H))
        if t[cy, cx, 3] > 0 and ((cy - FRONT_RISE) % 8) in (0, 1): t[cy, cx, :3] = t[cy, cx, :3] * 0.35 + MOSS[int(rng.integers(3))] * 0.65
    return t

def stair_sheet():
    """castle stairs, kind 'C' (castleLayout.js): a stone flight two cells wide built out from a wall's inner face into the yard, climbing north
    onto the wall-walk; 64 x 96 (the lip cell and the two below it), cheek walls either side. Style 0 whole, style 1 worn and broken."""
    out = np.zeros((96, 128, 4), np.float32)
    rng = np.random.default_rng(907)
    CH, STEP = 6, 10
    for style in (0, 1):
        ox = style * 64
        for y in range(96):
            for x in range(64):
                X = ox + x
                if x < CH or x >= 64 - CH:                                        # the cheek walls: masonry, lit along their top
                    c = mason(x % 32, y % 32) * (0.92 if x >= 64 - CH else 1.0)
                    if x in (CH - 1, 64 - CH): c = STONE * 0.45
                    if x in (0, 63): c = OUTLINE
                    if x in (1, 64 - CH + 1): c = STONE * 1.14
                else:
                    k = (95 - y) % STEP                                           # counting up from the foot: riser, then tread
                    if y < 4: c = flag(x % 32, y)                                 # the landing, the wall-walk's own flags
                    elif k < 6: c = mason(x % 32, y % 32) * 0.82                  # the riser
                    elif k == 6: c = STONE * 0.5                                  # the tread's nosing shadow
                    else: c = STONE * (1.12 if k == 9 else 1.02)                  # the tread, lit at its edge
                if y == 95: c = OUTLINE
                out[y, X, :3] = c; out[y, X, 3] = 255
        if style == 1:   # worn: chipped treads, cracks, moss in the corners, a broken cheek
            for _ in range(10):
                cx, cy = int(rng.integers(CH + 2, 62 - CH)), int(rng.integers(8, 92))
                for _ in range(int(rng.integers(3, 7))):
                    out[cy, ox + cx, :3] *= 0.55; cx += int(rng.integers(-1, 2)); cy += 1
                    if cy >= 95: break
            for _ in range(40):
                cx = int(rng.choice([CH, CH + 1, 62 - CH, 61 - CH])); cy = int(rng.integers(6, 94))
                out[cy, ox + cx, :3] = out[cy, ox + cx, :3] * 0.35 + MOSS[int(rng.integers(3))] * 0.65
            for y in range(20, 34):
                for x in range(64 - CH, 64):
                    if (y - 20) + (x - (64 - CH)) * 2 < 14: out[y, ox + x, 3] = 0
    save('cliff_stairs.png', out)

def cliff_sheets():
    rng = np.random.default_rng(903)
    # 24 variants of every cliff piece (the pack's hashVariants has the renderer pick one by the cell's place, not on a beat): the first 12
    # weathered as before, then 4 cracked right through (the wall-walk's flags split, the face's blocks broken by a crack running down), then 8
    # with a character of their own (decorate: arrow loops, ivy, a repaired patch, a drain, a niche, moss, fallen-out blocks)
    NVAR, CRACKED = 24, 4
    DECOR = ['loop', 'ivy', 'patch', 'drain', 'niche', 'moss', 'holes', 'loop']   # the last 8 variants: each its own character
    out = {k: np.zeros((192, NVAR * 256, 4), np.float32) for k in ('floor', 'wall', 'ext', 'ext_step')}
    out['front'] = np.zeros((6 * FRONT_H, 2048, 4), np.float32)
    for v in range(NVAR):
        cracked = 12 <= v < 12 + CRACKED
        deco = DECOR[v - 16] if v >= 16 else None
        for i, m in enumerate(MASKS):
            # (mask 255, a cell walled in on every side: the plain wall-walk; the pack sets fullCliffFloor so the renderer uses it)
            cx, cy = v * 256 + (i % 8) * 32, (i // 8) * 32
            f, wl, ex = piece_floor(m, rng), piece_wall(m, rng), piece_ext(m, rng)
            if cracked:
                n_, e_, s__, w_ = not (m & N_), not (m & E_), not (m & S_), not (m & W_)
                crack(f, rng, PT if w_ else 0, PT if n_ else 0, 32 - PT if e_ else 32, TOPS if s__ else 32, n=1, down=False)
                crack(wl, rng, 1 if w_ else 0, TOPS + 1, 31 if e_ else 32, 32, n=1, length=(10, 18))
                crack(ex, rng, 1 if w_ else 0, 0, 31 if e_ else 32, EXT - 6, n=1, length=(8, 16))
            if deco: decorate(deco, f, wl, ex, m, rng)
            out['floor'][cy:cy + 32, cx:cx + 32] = f
            out['wall'][cy:cy + 32, cx:cx + 32] = wl
            out['ext'][cy:cy + 32, cx:cx + 32] = ex
            es = piece_ext(m, rng, plinth=False)
            if deco in ('ivy', 'moss', 'patch', 'holes'): decorate(deco, np.zeros_like(f), np.zeros_like(wl), es, m, rng)
            out['ext_step'][cy:cy + 32, cx:cx + 32] = es
            if v < 8:
                fy = (i // 8) * FRONT_H
                out['front'][fy:fy + FRONT_H, cx:cx + 32] = front_piece(m, rng)
    for k, n in (('floor', 'cliff_blob47_floor.png'), ('wall', 'cliff_blob47_wall.png'), ('ext', 'cliff_blob47_ext.png'), ('ext_step', 'cliff_blob47_ext_step.png'), ('front', 'cliff_blob47_front.png')): save(n, out[k])
cliff_sheets()
stair_sheet()
def cracked_yard(a, src, rng, n=2):
    """the courtyard's cobbles broken: cracks wandering across the setts, and here and there a sett split or sunk"""
    rgb = src[..., :3]
    dirt = (src[..., 3] > 0) & (rgb[..., 0] > rgb[..., 1] + 25)
    H, W = a.shape[:2]
    for ty in range(0, H, 32):
        for tx in range(0, W, 32):
            cell = dirt[ty:ty + 32, tx:tx + 32]
            if cell.sum() < 200: continue
            if rng.random() < 0.6: crack(a, rng, tx, ty, tx + 32, ty + 32, allow=dirt, n=int(rng.integers(1, n + 1)), length=(10, 22), down=False, dark=0.55)
            for _ in range(int(rng.integers(0, 3))):              # a sunken sett: dark earth in its place
                sx, sy = tx + 4 + int(rng.integers(0, 24)), ty + 4 + int(rng.integers(0, 24))
                if dirt[sy, sx]: a[sy - 2:sy + 3, sx - 2:sx + 3, :3] = np.where(dirt[sy - 2:sy + 3, sx - 2:sx + 3, None], HOLE * 1.4, a[sy - 2:sy + 3, sx - 2:sx + 3, :3])
    return a
# the courtyard: six copies of its blob set side by side (the renderer picks one by the cell's place), the setts gone in other places in each,
# the last two cracked
src = load('secondary_floor_blob47.png')
rng_y = np.random.default_rng(906)
copies = [cobbles(src, 904, shift=k * 3) for k in range(6)]
for k in (4, 5): copies[k] = cracked_yard(copies[k], src, rng_y)
save('secondary_floor_blob47.png', np.concatenate(copies, axis=1))
# the inner ward's terrace (cobbles on a level, the on-level sheet's own 16 variants): the last four cracked
src = load('secondary_floor_on_level.png')
lv = cobbles(src, 905)
per = src.shape[1] // 16
for k in range(12, 16):
    sl = slice(k * per, (k + 1) * per)
    lv[:, sl] = cracked_yard(lv[:, sl].copy(), src[:, sl], rng_y, n=2)
save('secondary_floor_on_level.png', lv)
for n in ['primary_floor_blob47.png', 'water_interior_anim.png']: copy(n)

def soft_shadows(src):
    """the cast shadow, finer than the plains' flat shade: a soft penumbra a few pixels wide where it meets the light, full in its core
    (as deep as the tiles wholly in shadow, so they meet without a seam), a faint grain in it; tile by tile, a tile's own edges taken as running on into the next so neighbours meet without seams"""
    out = src.copy()
    H, W = src.shape[:2]
    A0 = float(src[..., 3].max()) or 78.0
    for ty in range(0, H, 32):
        for tx in range(0, W, 32):
            a = src[ty:ty + 32, tx:tx + 32, 3] > 0
            if not a.any(): continue
            pad = np.pad(a, 8, mode='edge')                 # beyond the tile: as its own edge (the shadow runs on)
            dist = np.full(pad.shape, 9.0, np.float32)
            lit = ~pad
            # distance (chamfer, up to 8) from each shadow pixel to the nearest lit one
            d = np.where(lit, 0.0, 9.0).astype(np.float32)
            for _ in range(2):
                for y in range(1, d.shape[0]):
                    d[y, :] = np.minimum(d[y, :], d[y - 1, :] + 1)
                    d[y, 1:] = np.minimum(d[y, 1:], d[y - 1, :-1] + 1.4); d[y, :-1] = np.minimum(d[y, :-1], d[y - 1, 1:] + 1.4)
                for x in range(1, d.shape[1]): d[:, x] = np.minimum(d[:, x], d[:, x - 1] + 1)
                for y in range(d.shape[0] - 2, -1, -1):
                    d[y, :] = np.minimum(d[y, :], d[y + 1, :] + 1)
                    d[y, 1:] = np.minimum(d[y, 1:], d[y + 1, :-1] + 1.4); d[y, :-1] = np.minimum(d[y, :-1], d[y + 1, 1:] + 1.4)
                for x in range(d.shape[1] - 2, -1, -1): d[:, x] = np.minimum(d[:, x], d[:, x + 1] + 1)
            d = d[8:40, 8:40]
            t = np.clip(d / 6.0, 0, 1)
            k = 0.4 + 0.6 * (t * t * (3 - 2 * t))           # the penumbra: light at the edge, full a few pixels in
            yy, xx = np.mgrid[0:32, 0:32]
            grain = 1.0 + 0.06 * (((xx * 7 + yy * 13 + tx * 3 + ty * 5) % 5) / 4 - 0.5)
            alpha = np.where(a, np.clip(A0 * k * grain, 0, 255), 0)
            out[ty:ty + 32, tx:tx + 32, 3] = alpha
    # tiles wholly in shadow keep the full shade (their neighbours' edges carry the penumbra)
    return out
save('cliff_blob47_shadow.png', soft_shadows(load('cliff_blob47_shadow.png')))
# the moat: the plains water, its shore fringe (the plains' orange dirt) turned to the courtyard's earth
w = load('water_blob47_anim.png')
rgb = w[..., :3]
orange = (w[..., 3] > 0) & (rgb[..., 0] > rgb[..., 1] + 30) & (rgb[..., 0] > rgb[..., 2] + 50)
l = lum(rgb)
w[..., :3] = np.where(orange[..., None], np.array([96, 86, 72], np.float32)[None, None, :] * np.clip(l / 120.0, 0.55, 1.3)[..., None], rgb)
save('water_blob47_anim.png', w)
print('ok')
