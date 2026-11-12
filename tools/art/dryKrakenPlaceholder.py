# Placeholder battle sheets for the Dry Kraken (a desert world boss): simple shapes only, until it has real art.
#   python3 tools/art/dryKrakenPlaceholder.py frontend/src/assets/sprites/dry_kraken
# writes, in the layout every battle sheet has (16 frames to a row; rows 0-1 the 32-frame loop seen across the field, rows 4-5 the one on the
# party's side, 6 rows in all):
#   dry_kraken_portrait.png            the head, 192 px frames (3072 x 1152): a sand-crusted dome risen out of a mound of sand, two yellow eyes and
#                                      a hooked beak; it swells and settles as it breathes and blinks once a loop
#   dry_kraken_tentacle_portrait.png   a tentacle, 128 px frames (2048 x 768): a tapered arm curling up out of the sand, swaying
import sys, os, math
from PIL import Image, ImageDraw
out = sys.argv[1]
SAND, SAND_DARK, SKIN, SKIN_DARK, SUCKER = (196, 160, 98, 255), (150, 118, 66, 255), (142, 96, 70, 255), (92, 58, 44, 255), (214, 170, 140, 255)
EYE, PUPIL, BEAK, LINE = (236, 200, 60, 255), (30, 20, 10, 255), (52, 40, 34, 255), (40, 26, 20, 255)

def sheet(F, frame_fn):
    s = Image.new('RGBA', (16 * F, 6 * F), (0, 0, 0, 0))
    for base in (0, 4):
        for f in range(32):
            s.alpha_composite(frame_fn(f), ((f % 16) * F, (base + f // 16) * F))
    return s

def head(f):
    F = 192
    im = Image.new('RGBA', (F, F), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    t = 2 * math.pi * f / 32
    swell = 4 * math.sin(t)                                   # breathing
    # the mound of sand it rose out of
    d.ellipse([18, 132, 174, 178], fill=SAND, outline=SAND_DARK, width=3)
    # the dome of the head
    top = 40 - swell
    d.ellipse([38, top, 154, 156], fill=SKIN, outline=LINE, width=4)
    d.ellipse([58, top + 14, 100, top + 40], fill=(168, 118, 88, 255))   # a sheen
    # sand caked on its crown
    for i, (x, y, r) in enumerate([(70, 64, 6), (112, 56, 8), (128, 84, 5), (88, 50, 4)]):
        d.ellipse([x - r, y - swell - r, x + r, y - swell + r], fill=SAND_DARK)
    # the eyes: open, except a blink at the end of the loop
    blink = f in (29, 30)
    for cx in (72, 120):
        if blink:
            d.line([cx - 14, 108, cx + 14, 108], fill=LINE, width=4)
        else:
            d.ellipse([cx - 14, 96, cx + 14, 120], fill=EYE, outline=LINE, width=3)
            d.rectangle([cx - 3, 99, cx + 3, 117], fill=PUPIL)        # a goat's slit
    # the beak, hooked down, opening a little on the out-breath
    gape = max(0, round(3 * math.sin(t)))
    d.polygon([(84, 124), (108, 124), (96, 146 + gape)], fill=BEAK, outline=LINE)
    return im

def tentacle(f):
    F = 128
    im = Image.new('RGBA', (F, F), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    t = 2 * math.pi * f / 32
    d.ellipse([28, 100, 100, 122], fill=SAND, outline=SAND_DARK, width=2)   # where it breaks the sand
    # a spine of points from the sand up to the curled tip, bending with the sway
    n, pts = 14, []
    for i in range(n + 1):
        u = i / n
        x = 64 + (22 * math.sin(t) * u ** 1.5) + 18 * math.sin(u * 2.2 + t * 0.5) * u
        y = 110 - 92 * u
        pts.append((x, y))
    left, right = [], []
    for i, (x, y) in enumerate(pts):
        w = 13 * (1 - i / (n + 2)) + 1.5                     # thick at the sand, thin at the tip
        nx, ny = (pts[min(i + 1, n)][1] - pts[max(i - 1, 0)][1]), -(pts[min(i + 1, n)][0] - pts[max(i - 1, 0)][0])
        l = math.hypot(nx, ny) or 1
        left.append((x + nx / l * w, y + ny / l * w)); right.append((x - nx / l * w, y - ny / l * w))
    d.polygon(left + right[::-1], fill=SKIN, outline=LINE)
    d.line(right, fill=SKIN_DARK, width=3)                    # its shaded underside
    for i in range(2, n - 2, 2):                              # a row of suckers
        x, y = right[i]; r = 3 * (1 - i / n) + 1
        d.ellipse([x - r, y - r, x + r, y + r], fill=SUCKER, outline=SKIN_DARK)
    return im

os.makedirs(out, exist_ok=True)
sheet(192, head).save(os.path.join(out, 'dry_kraken_portrait.png'))
sheet(128, tentacle).save(os.path.join(out, 'dry_kraken_tentacle_portrait.png'))
