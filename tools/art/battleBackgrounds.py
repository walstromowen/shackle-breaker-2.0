# Battle backgrounds painted in code, in the manner of the others (a wide field under a sky, the fighters standing on the ground in its middle
# band): drawn at 480 x 270 and set 4x larger (1920 x 1080), each pixel a 4 px block, quantized to a small palette.
#   python3 tools/art/battleBackgrounds.py frontend/src/assets/backgrounds
# writes
#   castle_grounds_battle_day_bg.png / _dusk_bg.png / _night_bg.png   a ruined castle's courtyard: its cobbles running back to the inner wall,
#                                                                     towers along it and the keep rising behind; rubble, moss, a broken cart
#   house_interior_battle_bg.png                                       inside an abandoned house: plank floor, half-timbered walls with the plaster
#                                                                     falling away, a cold hearth, a shuttered window letting in a shaft of light
import sys, os, math
import numpy as np
from PIL import Image

OUT = sys.argv[1]
W, H, S = 480, 270, 4
rng = np.random.default_rng(7)

# ---------------- helpers ----------------
def vnoise(w, h, cell, seed):
    """smooth value noise in 0..1"""
    r = np.random.default_rng(seed)
    gw, gh = w // cell + 3, h // cell + 3
    g = r.random((gh, gw))
    ys, xs = np.mgrid[0:h, 0:w] / cell
    x0, y0 = xs.astype(int), ys.astype(int)
    fx, fy = xs - x0, ys - y0
    sx, sy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    a = g[y0, x0] * (1 - sx) + g[y0, x0 + 1] * sx
    b = g[y0 + 1, x0] * (1 - sx) + g[y0 + 1, x0 + 1] * sx
    return a * (1 - sy) + b * sy

def fbm(w, h, cell, seed, oct=4):
    v, amp, tot = 0, 1.0, 0
    for o in range(oct):
        v = v + amp * vnoise(w, h, max(1, cell >> o), seed + o * 17); tot += amp; amp *= 0.5
    return v / tot

def lerp(a, b, t):
    return np.asarray(a, np.float32) + (np.asarray(b, np.float32) - np.asarray(a, np.float32)) * t

def finish(img, name, colors=56):
    im = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), 'RGB')
    q = im.quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
    q.resize((W * S, H * S), Image.NEAREST).save(os.path.join(OUT, name), optimize=True)
    print('ok', name)

def rect(img, x0, y0, x1, y1, c):
    img[max(0, int(y0)):max(0, int(y1)), max(0, int(x0)):max(0, int(x1))] = c

# ======================================================================================================
# THE CASTLE GROUNDS
# ======================================================================================================
TIMES = {
    'day':   dict(sky=[(78, 128, 170), (150, 186, 206), (206, 214, 206)], light=1.0, tint=(1.0, 1.0, 1.0), cloud=(236, 236, 230), sun=(255, 246, 214)),
    'dusk':  dict(sky=[(40, 66, 92), (150, 84, 86), (232, 130, 84)], light=0.78, tint=(1.06, 0.9, 0.84), cloud=(214, 120, 104), sun=(255, 170, 110)),
    'night': dict(sky=[(14, 18, 40), (32, 40, 74), (62, 70, 106)], light=0.6, tint=(0.78, 0.86, 1.12), cloud=(70, 78, 110), sun=(226, 230, 246)),
}
STONE = np.array([132, 126, 112], np.float32)
HZ = 96   # where the courtyard's floor meets the foot of the inner wall

def castle(time):
    T = TIMES[time]
    img = np.zeros((H, W, 3), np.float32)
    ys, xs = np.mgrid[0:H, 0:W]
    # ---- the sky: three bands of colour, banded into steps the way pixel skies are
    t = np.clip(ys / 92.0, 0, 1)
    steps = np.floor(t * 14) / 14
    c0, c1, c2 = [np.array(c, np.float32) for c in T['sky']]
    sky = np.where(steps[..., None] < 0.55, lerp(c0, c1, (steps / 0.55)[..., None]), lerp(c1, c2, ((steps - 0.55) / 0.45)[..., None]))
    img[:] = sky
    # clouds: soft bands, broken into pixel clusters
    cl = fbm(W, H, 48, 3)
    band = np.exp(-((ys - 34) / 22.0) ** 2) * 0.9 + np.exp(-((ys - 62) / 10.0) ** 2) * 0.6
    cm = (cl * band > 0.42) & (ys < 88)
    img[cm] = lerp(img[cm], T['cloud'], 0.55)
    edge = cm & ~np.roll(cm, 1, 0)
    img[edge] = lerp(img[edge], T['cloud'], 0.35)
    if time == 'night':
        for _ in range(140):
            x, y = rng.integers(0, W), rng.integers(0, 80)
            img[y, x] = (210, 214, 236) if rng.random() < 0.7 else (150, 156, 190)
        mx, my = 372, 26
        d = np.hypot(xs - mx, ys - my)
        img[d < 9] = (228, 232, 244); img[(d < 9) & (np.hypot(xs - mx - 4, ys - my + 2) < 8)] = sky[my, mx]
        img[(d >= 9) & (d < 15)] = lerp(img[(d >= 9) & (d < 15)], (120, 130, 170), 0.25)
    elif time == 'day':   # an overcast day: the sun a pale glow behind the cloud
        d = np.hypot(xs - 380, ys - 22)
        img[d < 40] = lerp(img[d < 40], (240, 236, 220), (0.35 * (1 - d[d < 40] / 40))[..., None])
    else:
        d = np.hypot(xs - 300, ys - 88)
        img[(d < 14) & (ys < 92)] = T['sun']
        glow = (d < 70) & (ys < 92)
        img[glow] = lerp(img[glow], (255, 150, 100), (0.4 * (1 - d[glow] / 70))[..., None])

    lit = T['light']
    def stone(x, y, k=1.0):
        return STONE * k * lit * np.array(T['tint'])

    # ---- the keep, behind the wall: a broad block, two spired towers, a pitched roof and a rose window
    kx0, kx1, ktop = 150, 262, 30
    blocks = fbm(W, H, 6, 11, 2)
    for y in range(ktop, HZ - 20):
        for x in range(kx0, kx1):
            mortar = (y % 6 == 0) or ((x + (y // 6) * 5) % 12 == 0)
            k = 0.72 + 0.18 * blocks[y, x] - (0.12 if x > (kx0 + kx1) / 2 + 30 else 0)
            img[y, x] = stone(x, y, k * (0.75 if mortar else 1))
    # its roof
    for y in range(ktop - 26, ktop):
        hw = (kx1 - kx0) / 2 * (y - (ktop - 26)) / 26
        cx = (kx0 + kx1) / 2
        for x in range(int(cx - hw), int(cx + hw) + 1):
            img[y, x] = np.array([70, 74, 84]) * lit * (1.1 if x < cx else 0.8) * (0.9 if (x + y) % 4 == 0 else 1)
    # its two towers with spires
    for tx in (kx0 - 6, kx1 - 14):
        for y in range(ktop - 6, HZ - 20):
            for x in range(tx, tx + 20):
                mortar = (y % 6 == 0) or ((x + (y // 6) * 5) % 10 == 0)
                img[y, x] = stone(x, y, (0.8 if x < tx + 12 else 0.62) * (0.78 if mortar else 1))
        for y in range(ktop - 46, ktop - 6):
            hw = 11 * (y - (ktop - 46)) / 40
            for x in range(int(tx + 10 - hw), int(tx + 10 + hw) + 1):
                img[y, x] = np.array([66, 70, 82]) * lit * (1.12 if x < tx + 10 else 0.78)
        for y in range(ktop - 52, ktop - 46): img[y, tx + 10] = np.array([90, 90, 96]) * lit
        for wy in (ktop + 8, ktop + 24):   # slit windows
            rect(img, tx + 8, wy, tx + 11, wy + 7, (24, 22, 30) if time != 'night' else (200, 150, 70))
    # the rose window and tall windows on its face
    cx, cy = (kx0 + kx1) / 2, ktop + 18
    d = np.hypot(xs - cx, ys - cy)
    m = d < 9
    img[m] = (40, 52, 90) if time != 'night' else (190, 140, 64)
    spokes = m & ((np.abs(np.arctan2(ys - cy, xs - cx) * 4 / math.pi % 1 - 0.5) > 0.42) | (d < 2))
    img[spokes] = stone(0, 0, 0.9)
    img[(d >= 9) & (d < 11)] = stone(0, 0, 1.15)
    for wx in (cx - 40, cx - 26, cx + 22, cx + 36):
        rect(img, wx, ktop + 14, wx + 6, ktop + 36, (34, 40, 66) if time != 'night' else (176, 128, 60))
        rect(img, wx + 2, ktop + 12, wx + 4, ktop + 14, (34, 40, 66) if time != 'night' else (176, 128, 60))

    # ---- the inner wall across the back of the courtyard, crenellated, towers along it
    WT, WB = HZ - 30, HZ
    for y in range(WT, WB):
        for x in range(W):
            mortar = (y % 5 == 0) or ((x + (y // 5) * 4) % 10 == 0)
            k = 0.82 + 0.16 * blocks[y, x] - 0.18 * (y - WT) / (WB - WT)
            img[y, x] = stone(x, y, k * (0.72 if mortar else 1))
    for x in range(0, W, 10):   # merlons
        rect(img, x, WT - 6, x + 6, WT, stone(0, 0, 0.95))
        rect(img, x, WT - 6, x + 6, WT - 5, stone(0, 0, 1.25))
    rect(img, 0, WT, W, WT + 1, stone(0, 0, 1.2))
    # the wall's towers
    for tx in (14, 120, 300, 420):
        for y in range(WT - 26, WB + 2):
            for x in range(tx, tx + 34):
                mortar = (y % 5 == 0) or ((x + (y // 5) * 4) % 9 == 0)
                k = (0.9 if x < tx + 20 else 0.66) * (0.74 if mortar else 1)
                img[y, x] = stone(x, y, k)
        for y in range(WT - 58, WT - 26):
            hw = 19 * (y - (WT - 58)) / 32
            for x in range(int(tx + 17 - hw), int(tx + 17 + hw) + 1):
                img[y, x] = np.array([68, 72, 86]) * lit * (1.12 if x < tx + 17 else 0.78) * (0.92 if (y % 3 == 0) else 1)
        rect(img, tx + 15, WT - 16, tx + 19, WT - 6, (20, 18, 26) if time != 'night' else (210, 160, 80))
        rect(img, tx + 12, WB - 18, tx + 22, WB + 2, (16, 14, 18))           # a dark doorway at its foot
        rect(img, tx + 13, WB - 20, tx + 21, WB - 18, (16, 14, 18))
    # shadow along the foot of the wall
    for y in range(HZ, HZ + 6):
        img[y] = img[y] * 1

    # ---- the courtyard: cobbles in perspective, running back to the wall
    fy = np.arange(HZ, H)
    z = 900.0 / (fy - HZ + 6)                                 # depth of each row
    rowsN = fbm(W, H, 20, 21)
    moss = fbm(W, H, 28, 31)
    for i, y in enumerate(fy):
        zz = z[i]
        wx = (np.arange(W) - W / 2) * zz / 60.0                # 60 / z px to a unit across
        wz = zz * 5.0                                         # rows foreshortened: a stone about half as deep on screen as it is wide
        row = np.floor(wz)
        off = (row % 2) * 0.5 + ((row * 0.37) % 1) * 0.3      # each row laid a little off the last
        u = wx * 1.0 + off
        cx_ = np.floor(u)
        fx_ = u % 1
        fz_ = wz % 1
        h = (np.sin(cx_ * 12.9898 + row * 78.233) * 43758.5453) % 1
        pxw = 60.0 / zz                                       # one stone's width on screen
        rowpx = 0.2 * 900.0 / (zz * zz) * 5.0 / 5.0 * 5.0     # and one row's depth (dy/dz = 900 / z^2, a row 1/5 of a z unit)
        gapw = np.clip(1.0 / max(pxw, 1), 0.08, 0.5)
        vg = np.clip((pxw - 2.5) / 4, 0, 1)                   # the mortar fades out where the stones grow too small to show it
        hg = np.clip((rowpx - 2.5) / 3.0, 0, 1)
        gv = (fx_ < gapw) * vg                                # how much mortar shows: full where the stones are big, none where tiny
        gh = (fz_ < np.clip(1.0 / max(rowpx, 1), 0.12, 0.4)) * hg
        gw = np.maximum(gv, gh)
        gap = gw > 0.5
        shade = 1.06 - 0.22 * fz_ + 0.08 * (0.5 - np.abs(fx_ - 0.5))   # lit on the far side, rounded
        base = STONE * (0.72 + 0.3 * h)[:, None] * np.asarray(shade)[..., None] if np.ndim(shade) else STONE * (0.72 + 0.3 * h)[:, None] * shade
        col = lerp(base, STONE * 0.34, gw[:, None])
        far = 1 - min(vg, hg)                                 # far off the stones blur into a mottled tone
        mott = STONE * (0.66 + 0.24 * rowsN[y][:, None] + 0.06 * (h[:, None] - 0.5))
        col = lerp(col, mott, far)
        # moss and grass in the gaps, more toward the sides
        side = np.abs(np.arange(W) - W / 2) / (W / 2)
        mm = (gap | (h < 0.04)) & (moss[y] * (0.55 + 0.7 * side) > 0.62)
        col[mm] = np.array([70, 92, 52]) * (0.8 + 0.3 * h[mm, None])
        dirt = rowsN[y] > 0.68
        col[dirt] = col[dirt] * np.array([0.86, 0.8, 0.72])
        near = (y - HZ) / (H - HZ)
        img[y] = col * lit * np.array(T['tint']) * (0.8 + 0.28 * near)
    # the wall's shadow across the near cobbles behind it
    for y in range(HZ, HZ + 8):
        img[y] = img[y] * (0.62 + 0.05 * (y - HZ))
    # cracks running across the courtyard
    for k in range(9):
        x, y = rng.integers(40, W - 40), rng.integers(HZ + 30, H - 10)
        ang = rng.random() * math.pi
        for s in range(rng.integers(20, 60)):
            ang += rng.normal(0, 0.35)
            x += math.cos(ang) * 1.2; y += math.sin(ang) * 0.5
            if 0 <= int(x) < W and HZ < int(y) < H: img[int(y), int(x)] = img[int(y), int(x)] * 0.45
    # ---- rubble heaps and props at the sides, framing the fight
    def heap(cx, cy, r, seed):
        rr = np.random.default_rng(seed)
        for _ in range(int(r * 5)):
            a = rr.random() * math.pi; dist = rr.random() ** 0.6 * r
            bx, by = cx + math.cos(a) * dist * (1 if rr.random() < 0.5 else -1), cy - math.sin(a) * dist * 0.45
            bw, bh = rr.integers(3, 8), rr.integers(2, 5)
            k = 0.6 + 0.5 * rr.random()
            rect(img, bx, by, bx + bw, by + bh, stone(0, 0, k * 0.95))
            rect(img, bx, by, bx + bw, by + 1, stone(0, 0, k * 1.22))
            rect(img, bx, by + bh - 1, bx + bw, by + bh, stone(0, 0, k * 0.55))
    heap(40, 212, 34, 1); heap(452, 190, 30, 2); heap(250, 104, 18, 3); heap(70, 118, 16, 4); heap(400, 116, 14, 5)
    # a broken cart on the left
    cx0, cy0 = 92, 150
    wood = np.array([96, 66, 40]) * lit * np.array(T['tint'])
    for k in range(6): rect(img, cx0 + k * 7, cy0 - 14 + (k % 2), cx0 + k * 7 + 6, cy0, wood * (1.15 if k % 2 else 0.9))
    rect(img, cx0, cy0 - 15, cx0 + 42, cy0 - 13, wood * 1.3)
    rect(img, cx0 - 2, cy0, cx0 + 46, cy0 + 2, wood * 0.6)
    d = np.hypot(xs - (cx0 + 32), ys - (cy0 + 4))
    ring = (d < 9) & (d > 6.5); img[ring] = wood * 0.7
    img[(d < 1.5)] = wood * 0.5
    for a in range(0, 360, 45):
        for r_ in range(2, 7):
            px, py = cx0 + 32 + math.cos(math.radians(a)) * r_, cy0 + 4 + math.sin(math.radians(a)) * r_
            img[int(py), int(px)] = wood * 0.8
    rect(img, cx0 + 50, cy0 + 2, cx0 + 64, cy0 + 4, wood * 0.7)   # its shaft, fallen
    # barrels on the right
    for bx, by in ((372, 150), (386, 152), (379, 140)):
        for y in range(by - 12, by):
            w = 5 + (1 if 3 < by - y < 9 else 0)
            rect(img, bx - w, y, bx + w, y + 1, wood * (1.1 if y % 4 else 0.6))
        rect(img, bx - 5, by - 13, bx + 5, by - 12, wood * 1.35)
    # a fallen banner on the cobbles
    for i in range(36):
        x, y = 300 + i, 222 + int(3 * math.sin(i / 6))
        rect(img, x, y, x + 1, y + 7, np.array([120, 30, 34]) * lit * (0.8 + 0.2 * math.sin(i / 2)))
    # ---- the foreground: dark weeds and broken stone at the bottom corners
    weeds = fbm(W, H, 10, 41)
    for x in range(W):
        side = abs(x - W / 2) / (W / 2)
        hgt = int((weeds[0, x] * 26) * max(0, side - 0.25) * 1.6)
        for y in range(H - hgt, H):
            k = 0.45 + 0.3 * ((x * 7 + y * 3) % 5) / 5
            img[y, x] = np.array([46, 62, 38]) * lit * k * np.array(T['tint'])
    # ---- the light: vignette, and a soft haze toward the wall
    v = 1 - 0.38 * (((xs - W / 2) / (W / 2)) ** 2 * 0.8 + ((ys - H * 0.55) / (H * 0.6)) ** 2 * 0.6)
    img *= np.clip(v, 0.55, 1)[..., None]
    haze = np.clip(1 - (ys - HZ) / 60.0, 0, 1) * (ys >= HZ - 30)
    img = lerp(img, np.array(T['sky'][2]) * 0.8, (haze * 0.18)[..., None])
    if time == 'night':
        img = img * np.array([0.85, 0.9, 1.08])
    finish(img, f'castle_grounds_battle_{time}_bg.png')

# ======================================================================================================
# INSIDE AN ABANDONED HOUSE
# ======================================================================================================
def house():
    img = np.zeros((H, W, 3), np.float32)
    ys, xs = np.mgrid[0:H, 0:W]
    BACK_T, BACK_B = 22, 132                                  # the back wall, its foot on the floor
    VX, VY = W / 2, 70                                        # the vanishing point
    PLASTER = np.array([150, 136, 110], np.float32); TIMBER = np.array([82, 56, 36], np.float32)
    BRICK = np.array([120, 74, 58], np.float32); WOOD = np.array([108, 74, 46], np.float32)
    pn = fbm(W, H, 18, 51); grain = fbm(W, H, 4, 52, 2)
    # ---- the back wall: plaster on a timber frame, fallen away in patches to the bricks behind
    for y in range(BACK_T, BACK_B):
        for x in range(W):
            if pn[y, x] > 0.6:                                # bare brick where the plaster is gone
                mortar = (y % 4 == 0) or ((x + (y // 4) * 4) % 8 == 0)
                img[y, x] = BRICK * (0.6 if mortar else 0.85 + 0.2 * grain[y, x])
            else:
                img[y, x] = PLASTER * (0.82 + 0.16 * grain[y, x] - 0.1 * pn[y, x])
            if 0.57 < pn[y, x] <= 0.6: img[y, x] = PLASTER * 0.55   # the broken edge of the plaster
    # stains running down from the ceiling
    for x in range(W):
        if (x * 37) % 23 < 2:
            for y in range(BACK_T, BACK_T + int(20 + 30 * pn[BACK_T + 5, x])): img[y, x] *= 0.86
    # the timber frame: posts, a rail and braces
    for px in (30, 150, 330, 450):
        rect(img, px, BACK_T, px + 8, BACK_B, TIMBER); rect(img, px, BACK_T, px + 2, BACK_B, TIMBER * 1.3); rect(img, px + 6, BACK_T, px + 8, BACK_B, TIMBER * 0.7)
    rect(img, 0, 76, W, 82, TIMBER); rect(img, 0, 76, W, 77, TIMBER * 1.3); rect(img, 0, 81, W, 82, TIMBER * 0.6)
    for (x0, x1) in ((38, 150), (338, 450)):
        for x in range(x0, x1):
            y = int(82 + (x - x0) / (x1 - x0) * (BACK_B - 82) * 0.98)
            rect(img, x, y - 3, x + 1, y + 3, TIMBER * (1.1 if x % 7 else 0.8))
    # ---- the window, its shutters hanging broken, light pouring through
    wx0, wx1, wy0, wy1 = 196, 250, 36, 74
    rect(img, wx0 - 4, wy0 - 4, wx1 + 4, wy1 + 5, TIMBER * 0.9)
    outside = lerp((180, 196, 200), (226, 222, 196), ((ys - wy0) / (wy1 - wy0))[..., None])
    m = (xs >= wx0) & (xs < wx1) & (ys >= wy0) & (ys < wy1)
    img[m] = outside[m]
    rect(img, (wx0 + wx1) // 2 - 1, wy0, (wx0 + wx1) // 2 + 1, wy1, TIMBER * 0.8)   # mullion
    rect(img, wx0, (wy0 + wy1) // 2 - 1, wx1, (wy0 + wy1) // 2 + 1, TIMBER * 0.8)
    for k in range(5):   # the left shutter hanging open, slats
        rect(img, wx0 - 22, wy0 + 2 + k * 8, wx0 - 6, wy0 + 8 + k * 8, WOOD * (0.9 if k % 2 else 0.75))
    for k in range(3):   # the right one fallen half shut, askew
        for x in range(wx1 - 14, wx1):
            y = wy0 + 6 + k * 10 + (x - (wx1 - 14)) // 3
            rect(img, x, y, x + 1, y + 7, WOOD * (0.85 if k % 2 else 0.7))
    # ---- the hearth on the right: a stone chimney breast, a cold black fireplace
    hx0, hx1 = 372, 440
    for y in range(BACK_T, BACK_B):
        for x in range(hx0, hx1):
            mortar = (y % 7 == 0) or ((x + (y // 7) * 6) % 13 == 0)
            img[y, x] = np.array([118, 112, 102]) * (0.62 if mortar else 0.84 + 0.18 * grain[y, x])
    rect(img, hx0 + 12, BACK_B - 34, hx1 - 12, BACK_B, (18, 14, 12))
    rect(img, hx0 + 8, BACK_B - 38, hx1 - 8, BACK_B - 34, (150, 142, 128))
    for x in range(hx0 + 16, hx1 - 16):                      # ash and a burnt log
        img[BACK_B - 3, x] = (70, 66, 62); img[BACK_B - 2, x] = (90, 86, 80)
    rect(img, hx0 + 20, BACK_B - 7, hx1 - 22, BACK_B - 3, (40, 28, 20))
    # soot above it
    for y in range(BACK_T, BACK_B - 38):
        for x in range(hx0 + 10, hx1 - 10): img[y, x] *= 0.8 + 0.2 * (y - BACK_T) / (BACK_B - 38 - BACK_T) * 0.6
    # ---- shelves on the left with pots and jars
    for sy in (52, 72):
        rect(img, 56, sy, 132, sy + 3, WOOD); rect(img, 56, sy, 132, sy + 1, WOOD * 1.3)
        for k, bx in enumerate(range(60, 128, 12)):
            if (k + sy) % 4 == 3: continue
            hgt = 6 + (k * 5 + sy) % 6
            c = np.array([[120, 80, 54], [90, 100, 96], [140, 120, 90]][k % 3])
            rect(img, bx, sy - hgt, bx + 7, sy, c); rect(img, bx + 1, sy - hgt, bx + 3, sy, c * 1.25); rect(img, bx + 2, sy - hgt - 2, bx + 5, sy - hgt, c * 0.8)
    # ---- the ceiling: dark beams running back
    for y in range(0, BACK_T):
        img[y] = np.array([40, 30, 22]) * (0.7 + 0.3 * y / BACK_T)
    for k in range(-6, 7):
        x_far = VX + k * 40
        for y in range(0, BACK_T + 1):
            t = 1 - y / BACK_T
            xc = x_far + (x_far - VX) * t * 1.6
            w = 3 + 6 * t
            rect(img, xc - w, y, xc + w, y + 1, np.array([64, 44, 28]) * (0.8 + 0.4 * t))
    rect(img, 0, BACK_T - 3, W, BACK_T, (52, 36, 24))
    # ---- the floor: planks running toward us from the wall, worn, a few broken
    for y in range(BACK_B, H):
        t = (y - BACK_B) / (H - BACK_B)
        zz = 1 / (0.06 + t * 0.94)
        for x in range(W):
            u = (x - VX) / ((y - VY) / (BACK_B - VY)) / 13.0      # plank index across, converging to the vanishing point
            pi_ = math.floor(u); fu = u - pi_
            hh = (math.sin(pi_ * 12.9898) * 43758.5453) % 1
            run = zz * 0.45 + hh * 7.3                         # along the plank; its boards butt end to end, staggered plank to plank
            seg = math.floor(run)
            board = (math.sin(pi_ * 7.13 + seg * 3.7) * 9631.7) % 1
            c = WOOD * (0.62 + 0.3 * board) * (0.86 + 0.18 * grain[y, x])
            gapw = 0.06 + 0.04 * (1 - t)
            if fu < gapw: c = c * 0.35
            elif (run % 1) < 0.02 * (1 + 4 * (1 - t)): c = c * 0.5
            if board < 0.025: c = np.array([20, 14, 10])         # a broken board: the dark beneath
            img[y, x] = c * (0.62 + 0.46 * t)
    # the rug, torn, under the middle of the room
    for y in range(BACK_B + 62, H - 30):
        t = (y - BACK_B) / (H - BACK_B)
        hw = 70 + 110 * t
        for x in range(int(VX - hw), int(VX + hw)):
            if pn[y, x] > 0.74: continue                      # holes worn through
            inner = abs(x - VX) < hw - 12 and BACK_B + 68 < y < H - 36
            stripe = inner and (int((x - VX) / (4 + 5 * t)) % 5 == 0 or int((y - BACK_B) / (2 + 3 * t)) % 7 == 0)
            edge = abs(x - VX) > hw - 4 or y < BACK_B + 64 or y > H - 33
            c = np.array([96, 40, 38]) if not stripe else np.array([136, 104, 64])
            if not inner and not edge: c = np.array([62, 46, 52])
            if edge: c = np.array([132, 100, 62])
            img[y, x] = c * (0.62 + 0.4 * t) * (0.86 + 0.18 * grain[y, x])
    # ---- furniture: a table on the left, a chair knocked over on the right, a crate
    def box(x0, y0, w, h, c, top=None):
        rect(img, x0, y0, x0 + w, y0 + h, c)
        rect(img, x0, y0, x0 + w, y0 + 1, (top if top is not None else c * 1.3))
        rect(img, x0 + w - 1, y0, x0 + w, y0 + h, c * 0.7)
    box(40, 150, 76, 6, WOOD * 0.9, WOOD * 1.35)               # the table top
    for lx in (44, 108): box(lx, 156, 5, 30, WOOD * 0.65)
    box(60, 128, 8, 22, np.array([150, 140, 120], np.float32))   # a candlestick, a guttered candle
    rect(img, 62, 124, 66, 128, (220, 200, 160))
    box(352, 186, 34, 5, WOOD * 0.85, WOOD * 1.25)             # the chair, on its side
    for k in range(4): rect(img, 356 + k * 8, 160, 359 + k * 8, 186, WOOD * 0.7)
    rect(img, 352, 158, 386, 162, WOOD * 0.9)
    box(406, 150, 28, 24, WOOD * 0.8, WOOD * 1.2)              # a crate by the hearth
    rect(img, 406, 161, 434, 163, WOOD * 0.55); rect(img, 419, 150, 421, 174, WOOD * 0.55)
    # debris: plaster crumbs and broken crockery along the foot of the wall
    for k in range(70):
        x, y = rng.integers(10, W - 10), rng.integers(BACK_B, BACK_B + 18)
        img[y, x] = PLASTER * (0.7 + 0.3 * rng.random())
    # cobwebs in the corners
    for (cx, cy, sx) in ((0, BACK_T, 1), (W - 1, BACK_T, -1)):
        for r in range(6, 40, 6):
            for a in np.linspace(0, math.pi / 2, 30):
                x, y = cx + sx * math.cos(a) * r, cy + math.sin(a) * r * 0.8
                if 0 <= int(x) < W and 0 <= int(y) < H: img[int(y), int(x)] = lerp(img[int(y), int(x)], (200, 196, 186), 0.5)
        for a in np.linspace(0, math.pi / 2, 5):
            for r in range(0, 40):
                x, y = cx + sx * math.cos(a) * r, cy + math.sin(a) * r * 0.8
                if 0 <= int(x) < W and 0 <= int(y) < H: img[int(y), int(x)] = lerp(img[int(y), int(x)], (200, 196, 186), 0.4)
    # ---- the light: dim and warm, the shaft from the window falling across the floor, dust in it
    dark = 0.5 + 0.5 * np.exp(-(((xs - 240) / 260.0) ** 2 + ((ys - 170) / 170.0) ** 2))
    img *= dark[..., None]
    # the shaft: a band from the window down and toward us
    for y in range(wy0, H):
        t = (y - wy0) / (H - wy0)
        x0 = wx0 + (60 - wx0 + wx0) * 0 + t * 70 - 10
        x1 = wx1 + t * 150 + 10
        xa, xb = int(max(0, wx0 - 4 + t * 60)), int(min(W, wx1 + 4 + t * 170))
        if xb > xa:
            g = 0.22 * (1 - t * 0.6)
            img[y, xa:xb] = lerp(img[y, xa:xb], (255, 236, 196), g)
    for k in range(120):   # motes
        t = rng.random(); y = int(wy0 + t * (H - wy0) * 0.8)
        x = int(wx0 + t * 60 + rng.random() * (wx1 - wx0 + t * 110))
        if 0 <= x < W and 0 <= y < H: img[y, x] = lerp(img[y, x], (255, 244, 214), 0.6)
    finish(img, 'house_interior_battle_bg.png', colors=60)

for t in ('day', 'dusk', 'night'):
    castle(t)
house()
