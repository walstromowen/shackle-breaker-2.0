# The ruined carriage's art, from the covered-wagon asset (tools/art/sources/coveredWagon.png, 64 x 96: 2 x 3 tiles, seen from above):
#   python3 tools/art/ruinedCarriage.py tools/art/sources/coveredWagon.png frontend/src/assets/mapObjects
# The wagon is used as it is; only its alpha is snapped to solid or clear, so it draws crisp on the map. The looted wagon looks the same.
# (The encounter picture is the artist's own, in cell 0, 0 of icons/encounters/ruined_carriage.png, a copy of the encounter template.)
import sys
from PIL import Image
src, out_dir = sys.argv[1], sys.argv[2]
car = Image.open(src).convert('RGBA')
px = car.load()
for y in range(car.height):
    for x in range(car.width):
        r, g, b, a = px[x, y]
        px[x, y] = (r, g, b, 255) if a >= 128 else (0, 0, 0, 0)
car.save(out_dir + '/objRuinedCarriage.png'); car.save(out_dir + '/objRuinedCarriageLooted.png')
