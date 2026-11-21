"""
tools/art/insightSpellSheets.py
Pixel-art effect sheets for the Insights' newer spells (shared/abilities/abilityDefinitions.js: gust, downwind, tempest, tidal_wave,
mending_tide, glacial_spike, frost_ward, chain_lightning, lightning_strike). Each sheet is one row of four 64 px frames, drawn hard-edged
in a small palette with a dark outline, like the hand-made sheets beside them in frontend/src/assets/abilityAnimations/.
Projectiles (gust, glacial_spike, chain_lightning) point right, as travel() expects.

    python3 tools/art/insightSpellSheets.py
"""
import math
import random
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[2] / 'frontend/src/assets/abilityAnimations'
S = 64


def hexc(h, a=255):
    h = h.lstrip('#')
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


def outline(im, color):
    """A 1 px dark rim round everything drawn, the way the hand-drawn sheets are edged."""
    px = im.load()
    w, h = im.size
    rim = []
    for y in range(h):
        for x in range(w):
            if px[x, y][3] == 0:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] > 0 and px[nx, ny][:3] != color[:3]:
                        rim.append((x, y))
                        break
    for p in rim:
        px[p] = color
    return im


def line(d, pts, color, width=1):
    d.line([(round(x), round(y)) for x, y in pts], fill=color, width=width)


def sheet(name, frames):
    out = Image.new('RGBA', (S * len(frames), S), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        out.alpha_composite(f, (i * S, 0))
    out.save(OUT / f'{name}.png', optimize=True)
    return out


def blank():
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)


# ---- GUST: a tight ball of whirling air with streaks torn off behind it (points right) ----
def gust():
    W, L, M, D = hexc('#f6f9f9'), hexc('#cdd8da'), hexc('#91a3a8'), hexc('#46545c')
    frames = []
    for f in range(4):
        im, d = blank()
        cx, cy = 44, 32
        for r, c, w in ((13, M, 3), (9, L, 2), (5, W, 2)):
            a0 = f * 90 + r * 20
            d.arc((cx - r, cy - r, cx + r, cy + r), a0, a0 + 250, fill=c, width=w)
        for k, (y, ln) in enumerate(((24, 22), (30, 30), (36, 26), (41, 16))):
            ln = ln - 4 * ((f + k) % 3)
            x1 = cx - 12
            line(d, [(x1 - ln, y), (x1, y + (1 if k % 2 else -1))], L if k % 2 else W, 2)
            d.point((x1 - ln - 4 - 2 * ((f + k) % 2), y), fill=M)
        frames.append(outline(im, D))
    return sheet('gust', frames)


# ---- DOWNWIND: long ribbons of a following wind, carrying leaves along with it ----
def downwind():
    W, L, M = hexc('#effaf3'), hexc('#b6e3c6'), hexc('#7cbf98')
    LEAF, LEAF2, D = hexc('#8cc251'), hexc('#4e8a2f'), hexc('#2f5a3e')
    frames = []
    for f in range(4):
        im, d = blank()
        for k, (y0, amp, col, w) in enumerate(((14, 3, L, 2), (26, 4, W, 2), (38, 3, M, 2), (50, 4, L, 2))):
            ph = f * 1.4 + k * 1.9
            start = (f * 9 + k * 13) % 20
            pts = [(x, y0 + amp * math.sin(x / 9.0 + ph)) for x in range(start, start + 40)]
            line(d, pts, col, w)
            # the curl where a ribbon ends
            ex, ey = pts[-1]
            d.arc((ex - 4, ey - 6, ex + 4, ey + 2), 270, 120, fill=col, width=1)
        rnd = random.Random(7)
        for n in range(3):
            lx = (n * 22 + f * 7 + rnd.randint(0, 6)) % 58 + 3
            ly = 10 + n * 16 + int(3 * math.sin(f + n))
            tilt = (f + n) % 2
            leaf = [(lx, ly), (lx + 3, ly - 2 - tilt), (lx + 6, ly), (lx + 3, ly + 2 - tilt)]
            d.polygon(leaf, fill=LEAF)
            d.point((lx + 3, ly), fill=LEAF2)
        frames.append(outline(im, D))
    return sheet('downwind', frames)


# ---- TEMPEST: a grey storm funnel, turning, with rubble whirled up round it ----
def tempest():
    shades = [hexc('#dfe4ea'), hexc('#aab4c0'), hexc('#76818f'), hexc('#5a6472')]
    D, ROCK = hexc('#2e343e'), hexc('#8a7a64')
    frames = []
    for f in range(4):
        im, d = blank()
        for i in range(14):
            y = 58 - i * 3.9
            rx = 3 + i * 1.85
            sway = 3 * math.sin(i / 3.0 + f * 1.3)
            cx = 32 + sway
            col = shades[(i + f) % 4]
            d.arc((cx - rx, y - 3, cx + rx, y + 3), 0, 360, fill=col, width=2)
            # the band's lit front edge
            d.arc((cx - rx, y - 3, cx + rx, y + 3), 20 + f * 25, 110 + f * 25, fill=shades[0], width=1)
        for n in range(6):
            a = f * 0.9 + n * 1.05
            r = 14 + (n % 3) * 7
            x = 32 + r * math.cos(a)
            y = 46 - n * 7 + 3 * math.sin(a)
            d.rectangle((x, y, x + 1 + n % 2, y + 1), fill=ROCK if n % 2 else shades[2])
        frames.append(outline(im, D))
    return sheet('tempest', frames)


# ---- TIDAL WAVE: a deep wave rearing up and curling over to crash ----
def tidal_wave():
    DEEP, MID, LIGHT, FOAM, D = hexc('#1c4a8c'), hexc('#2f74c0'), hexc('#5fb0ea'), hexc('#eaf7ff'), hexc('#0f2a52')
    frames = []
    for f in range(4):
        im, d = blank()
        top = 30 - f * 6               # the crest rears higher each frame
        cx = 26 + f * 4                # and leans further forward
        body = [(0, 63), (0, 54 - f * 2), (cx - 18, top + 16), (cx - 8, top + 4), (cx + 2, top), (cx + 12, top + 2), (cx + 20, top + 8),
                (cx + 24, top + 16), (cx + 18, top + 14), (cx + 14, top + 10), (cx + 8, top + 14), (cx + 10, top + 24), (cx + 18, 63)]
        d.polygon(body, fill=MID)
        # the hollow under the curl
        d.ellipse((cx + 4, top + 9, cx + 16, top + 22), fill=(0, 0, 0, 0))
        # depth: a dark back and lighter streaks running up the face
        d.polygon([(0, 63), (0, 56 - f * 2), (cx - 16, top + 22), (cx - 6, 63)], fill=DEEP)
        for k in range(5):
            x = cx - 14 + k * 5
            line(d, [(x, 60), (x + 4, top + 14 + k * 2)], LIGHT, 1)
        # foam along the lip and spray flung off the crest
        line(d, [(cx - 8, top + 4), (cx + 2, top), (cx + 12, top + 2), (cx + 20, top + 8), (cx + 24, top + 16)], FOAM, 2)
        rnd = random.Random(f + 3)
        for _ in range(5 + f * 2):
            x = cx + rnd.randint(-6, 26)
            y = top - rnd.randint(1, 6) + rnd.randint(0, 8)
            if 0 <= x < 63 and 0 <= y < 63:
                d.point((x, y), fill=FOAM)
        line(d, [(0, 62), (cx + 18, 62)], FOAM, 1)
        frames.append(outline(im, D))
    return sheet('tidal_wave', frames)


# ---- MENDING TIDE: a ring of clear water welling up round an ally, beads rising and glinting ----
def mending_tide():
    DEEP, MID, LIGHT, W, D = hexc('#1d8a80'), hexc('#43c2ae'), hexc('#a2f0e0'), hexc('#f4fffb'), hexc('#135852')
    frames = []
    for f in range(4):
        im, d = blank()
        ry = 6 + f
        d.ellipse((10 - f, 50 - ry, 54 + f, 50 + ry), outline=MID, width=3)
        d.arc((10 - f, 50 - ry, 54 + f, 50 + ry), 200, 340, fill=LIGHT, width=1)
        d.arc((10 - f, 50 - ry, 54 + f, 50 + ry), 20, 160, fill=DEEP, width=1)
        for k in range(6):
            x = 14 + k * 7
            y = 48 - ((f * 9 + k * 13) % 38)
            d.ellipse((x - 2, y - 3, x + 2, y + 2), fill=MID)
            d.point((x - 1, y - 2), fill=W)
        for k in range(3):
            x, y = 18 + k * 13 + f * 2, 10 + ((f + k) % 3) * 9
            c = W if (f + k) % 2 else LIGHT
            line(d, [(x - 2, y), (x + 2, y)], c)
            line(d, [(x, y - 2), (x, y + 2)], c)
        frames.append(outline(im, D))
    return sheet('mending_tide', frames)


# ---- GLACIAL SPIKE: a great faceted lance of ice, light running down its ridge (points right) ----
def glacial_spike():
    D, DARK, MID, LIGHT, W = hexc('#0e355f'), hexc('#2766a6'), hexc('#68aee4'), hexc('#cdeeff'), hexc('#ffffff')
    frames = []
    for f in range(4):
        im, d = blank()
        d.polygon([(4, 22), (60, 32), (4, 42)], fill=MID)
        d.polygon([(4, 32), (60, 32), (4, 42)], fill=DARK)
        d.polygon([(4, 22), (60, 32), (4, 28)], fill=LIGHT)
        line(d, [(6, 32), (58, 32)], LIGHT)
        # frost crystals bristling at the base
        for k, (y, ln) in enumerate(((20, 8), (26, 6), (38, 7), (44, 8))):
            sway = (f + k) % 2
            line(d, [(6, y + (2 if y < 32 else -2)), (6 - ln + 2, y - (sway if y < 32 else -sway))], MID, 2)
        # the glint travelling along the ridge
        gx = 14 + f * 12
        for dx, dy in ((0, 0), (-1, 0), (1, 0), (0, -1), (0, 1)):
            d.point((gx + dx, 32 + dy), fill=W)
        d.point((gx - 6, 29), fill=W)
        frames.append(outline(im, D))
    return sheet('glacial_spike', frames)


# ---- FROST WARD: a six-sided shield of ice crystallising: the flake first, then the faces, then a glint ----
def frost_ward():
    D, MID, LIGHT, W = hexc('#1a4c7c'), hexc('#7cc4f0'), hexc('#cbeeff'), hexc('#ffffff')
    PANE = hexc('#a6dcff', 120)
    frames = []
    for f in range(4):
        im, d = blank()
        cx, cy = 32, 32
        R = 26
        hexpts = [(cx + R * math.cos(math.radians(60 * k + 30)), cy + R * math.sin(math.radians(60 * k + 30))) for k in range(6)]
        if f >= 1:
            sides = 6 if f >= 2 else 3
            if f >= 2:
                d.polygon(hexpts, fill=PANE)
            for k in range(sides * (1 if f >= 2 else 2) // (1 if f >= 2 else 1)):
                if k >= 6:
                    break
                line(d, [hexpts[k], hexpts[(k + 1) % 6]], MID if k % 2 else LIGHT, 2)
        arm = 8 + f * 4
        for k in range(6):
            a = math.radians(60 * k + 30)
            ex, ey = cx + arm * math.cos(a), cy + arm * math.sin(a)
            line(d, [(cx, cy), (ex, ey)], LIGHT, 1)
            bx, by = cx + arm * 0.6 * math.cos(a), cy + arm * 0.6 * math.sin(a)
            for side in (-1, 1):
                b = a + side * math.radians(45)
                line(d, [(bx, by), (bx + 3 * math.cos(b), by + 3 * math.sin(b))], LIGHT, 1)
        d.rectangle((cx - 1, cy - 1, cx + 1, cy + 1), fill=W)
        if f == 3:
            gx, gy = hexpts[4]
            gx, gy = gx + 6, gy + 4
            line(d, [(gx - 3, gy), (gx + 3, gy)], W)
            line(d, [(gx, gy - 3), (gx, gy + 3)], W)
        frames.append(outline(im, D))
    return sheet('frost_ward', frames)


def bolt(rnd, a, b, rough, depth):
    """Midpoint-displaced jagged line from a to b."""
    pts = [a, b]
    for _ in range(depth):
        nxt = [pts[0]]
        for p, q in zip(pts, pts[1:]):
            mx, my = (p[0] + q[0]) / 2, (p[1] + q[1]) / 2
            dx, dy = q[0] - p[0], q[1] - p[1]
            ln = math.hypot(dx, dy) or 1
            off = rnd.uniform(-rough, rough) * ln / 32
            nxt += [(mx - dy / ln * off, my + dx / ln * off), q]
        pts = nxt
    return pts


# ---- CHAIN LIGHTNING: a cold blue arc, jumping and forking as it flies (points right) ----
def chain_lightning():
    GLOW, MID, W, D = hexc('#3d8fe0'), hexc('#8fe2ff'), hexc('#ffffff'), hexc('#142a5c')
    frames = []
    for f in range(4):
        im, d = blank()
        rnd = random.Random(40 + f)
        main = bolt(rnd, (2, 32), (60, 32), 9, 4)
        forks = []
        for _ in range(2):
            i = rnd.randint(4, len(main) - 5)
            p = main[i]
            forks.append(bolt(rnd, p, (p[0] + rnd.randint(8, 14), p[1] + rnd.choice((-1, 1)) * rnd.randint(8, 14)), 6, 2))
        for path in [main] + forks:
            line(d, path, GLOW, 3)
        for path in forks:
            line(d, path, MID, 1)
        line(d, main, W, 1)
        # the crackle at the tip
        tx, ty = main[-1]
        for k in range(4):
            a = rnd.uniform(-1.2, 1.2)
            line(d, [(tx - 2, ty), (tx - 2 + 5 * math.cos(a), ty + 5 * math.sin(a))], MID)
        frames.append(outline(im, D))
    return sheet('chain_lightning', frames)


# ---- LIGHTNING STRIKE: a violet-white bolt slamming down from the top of the frame, flaring where it lands ----
def lightning_strike():
    GLOW, MID, W, D = hexc('#8a6cff'), hexc('#d6ccff'), hexc('#ffffff'), hexc('#24124f')
    frames = []
    for f in range(4):
        im, d = blank()
        rnd = random.Random(90 + f)
        reach = (30, 54, 54, 54)[f]
        path = bolt(rnd, (32, 0), (32 + rnd.randint(-3, 3), reach), 8, 4)
        width = (3, 5, 5, 3)[f]
        line(d, path, GLOW, width)
        line(d, path, MID if f == 3 else W, 1 if f in (0, 3) else 2)
        if f >= 1:
            for _ in range(1 + (f == 1)):
                i = rnd.randint(3, len(path) - 4)
                p = path[i]
                fork = bolt(rnd, p, (p[0] + rnd.choice((-1, 1)) * rnd.randint(8, 13), p[1] + rnd.randint(6, 11)), 5, 2)
                line(d, fork, GLOW, 2)
                line(d, fork, MID, 1)
        if f == 1 or f == 2:
            bx, by = path[-1]
            r = 6 if f == 1 else 9
            d.ellipse((bx - r, by - r // 2, bx + r, by + r // 2), fill=MID)
            d.ellipse((bx - r // 2, by - 2, bx + r // 2, by + 2), fill=W)
            for k in range(8):
                a = math.pi + k * math.pi / 7
                L = r + 3 + (k % 2) * 4
                line(d, [(bx, by), (bx + L * math.cos(a), by + L * math.sin(a) * 0.6)], MID if k % 2 else W)
        if f == 3:
            bx, by = path[-1]
            for k in range(5):
                x = bx + rnd.randint(-12, 12)
                y = by - rnd.randint(0, 6)
                d.point((x, y), fill=MID)
        frames.append(outline(im, D))
    return sheet('lightning_strike', frames)


if __name__ == '__main__':
    for fn in (gust, downwind, tempest, tidal_wave, mending_tide, glacial_spike, frost_ward, chain_lightning, lightning_strike):
        fn()
        print('wrote', fn.__name__)
