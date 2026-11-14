"""Draws the Flying status icon (a pair of pale blue wings over a curl of wind) into its own cell of the status icon sheet.

    python3 tools/art/flyingIcon.py

Cell (col 0, row 3) of frontend/src/assets/icons/status_effects.png (64 px cells), the cell statusEffectDefinitions.js `flying` points at.
Drawn 4x larger and scaled down, so the feathers keep soft edges; the cell is cleared first. A stand-in: replace the cell with the final art
whenever it is ready (same size, same place), and nothing else needs to change.
"""
from PIL import Image, ImageDraw
import math, os

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
SHEET = os.path.join(ROOT, 'frontend', 'src', 'assets', 'icons', 'status_effects.png')
COL, ROW, CELL = 0, 3, 64
S = 4                       # supersampling
W = CELL * S

OUTLINE = (34, 70, 120, 255)
FEATHER = [(250, 253, 255, 255), (214, 236, 252, 255), (164, 208, 244, 255), (112, 172, 232, 255)]
WIND = [(150, 205, 245, 255), (96, 160, 225, 255)]


def leaf(draw, base, ang, length, width, fill):
    """One feather: a long leaf from `base` pointing along `ang` (radians, 0 = right, pi/2 = down)."""
    bx, by = base
    dx, dy = math.cos(ang), math.sin(ang)
    nx, ny = -dy, dx
    tip = (bx + dx * length, by + dy * length)
    mid = (bx + dx * length * 0.45, by + dy * length * 0.45)
    poly = [(bx + nx * width * 0.5, by + ny * width * 0.5), (mid[0] + nx * width, mid[1] + ny * width), tip,
            (mid[0] - nx * width, mid[1] - ny * width), (bx - nx * width * 0.5, by - ny * width * 0.5)]
    draw.polygon(poly, fill=fill, outline=OUTLINE)


def arm(side, t):
    """The wing's leading edge: from the middle of the icon out and up to the tip (t 0..1)."""
    x = W / 2 + side * (3 + 25 * t) * S
    y = (30 - 22 * t + 8 * t * t) * S
    return x, y


def wing(draw, side):
    """One wing: long feathers hanging from the leading edge (longest at the tip), shorter white ones over them, a soft band along the edge."""
    for layer, (n, base_len, extra, width, shade) in enumerate([(9, 9, 15, 3.4, 3), (9, 7, 11, 3.2, 2), (8, 5, 6, 3.0, 1)]):
        for i in range(n):
            t = 0.05 + 0.9 * i / (n - 1)
            x, y = arm(side, t)
            y += layer * 2.2 * S
            down = math.radians(90 - side * (12 + 38 * t))    # hangs down, swept out toward the tip
            leaf(draw, (x, y), down, (base_len + extra * t) * S, width * S, FEATHER[shade])
    pts = [arm(side, i / 12) for i in range(13)]
    draw.line(pts, fill=OUTLINE, width=int(5.2 * S), joint='curve')
    draw.line(pts, fill=FEATHER[0], width=int(3.2 * S), joint='curve')


def wind(draw):
    """Two curls of wind beneath the wings."""
    for (x0, y0, r, col) in [(18, 50, 7, WIND[0]), (34, 53, 6, WIND[1])]:
        box = [x0 * S - r * S, y0 * S - r * S, x0 * S + r * S, y0 * S + r * S]
        draw.arc(box, 160, 400, fill=col, width=int(1.8 * S))
    draw.line([(8 * S, 57 * S), (40 * S, 57 * S)], fill=WIND[1], width=int(1.6 * S))
    draw.line([(26 * S, 47 * S), (56 * S, 47 * S)], fill=WIND[0], width=int(1.6 * S))
    draw.arc([48 * S, 44 * S, 58 * S, 54 * S], 270, 450, fill=WIND[0], width=int(1.6 * S))


def main():
    big = Image.new('RGBA', (W, W), (0, 0, 0, 0))
    d = ImageDraw.Draw(big)
    wind(d)
    wing(d, -1)
    wing(d, 1)
    icon = big.resize((CELL, CELL), Image.LANCZOS)
    sheet = Image.open(SHEET).convert('RGBA')
    x, y = COL * CELL, ROW * CELL
    sheet.paste(Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0)), (x, y))
    sheet.alpha_composite(icon, (x, y))
    sheet.save(SHEET)
    print(f'flying icon drawn at col {COL}, row {ROW}')


if __name__ == '__main__':
    main()
