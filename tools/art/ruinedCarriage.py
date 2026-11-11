# The ruined carriage's art, from the covered-wagon asset (tools/art/sources/coveredWagon.png, 64 x 96: 2 x 3 tiles, seen from above):
#   python3 tools/art/ruinedCarriage.py tools/art/sources/coveredWagon.png frontend/src/assets/mapObjects frontend/src/assets/icons/encounters/ruined_carriage.png
# The wagon is used as it is; only its alpha is snapped to solid or clear, so it draws crisp on the map. The looted wagon looks the same. The encounter
# picture is the wagon at full size on a patch of grass, in a 128 px square.
import sys, random
from PIL import Image, ImageDraw
src, out_dir, picture_path = sys.argv[1], sys.argv[2], (sys.argv[3] if len(sys.argv) > 3 else None)
car = Image.open(src).convert('RGBA')
px = car.load()
for y in range(car.height):
    for x in range(car.width):
        r, g, b, a = px[x, y]
        px[x, y] = (r, g, b, 255) if a >= 128 else (0, 0, 0, 0)
car.save(out_dir + '/objRuinedCarriage.png'); car.save(out_dir + '/objRuinedCarriageLooted.png')
if picture_path:
    rnd = random.Random(5)
    pic = Image.new('RGBA', (128, 128), (0, 0, 0, 0)); d = ImageDraw.Draw(pic)
    d.ellipse([6, 60, 122, 126], fill=(52, 70, 38, 255)); d.ellipse([10, 63, 118, 122], fill=(66, 88, 46, 255))
    p = pic.load()
    for y in range(128):
        for x in range(128):
            if p[x, y][3] and rnd.random() < 0.22: p[x, y] = rnd.choice([(40, 56, 32), (52, 70, 38), (66, 88, 46), (80, 104, 54)]) + (255,)
    sh = Image.new('RGBA', (128, 128), (0, 0, 0, 0)); ImageDraw.Draw(sh).ellipse([30, 98, 98, 122], fill=(0, 0, 0, 80))
    pic.alpha_composite(sh); pic.alpha_composite(car, (32, 22))
    pic.save(picture_path)
