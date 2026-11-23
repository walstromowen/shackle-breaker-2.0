"""
tools/art/stormFrontAssets.py
Storm Front's own art (abilityDefinitions storm_front, which replaced Solar Beam), made from Tempest's so it sits with the other wind spells but is
its own: a darker, heavier storm with a white seam of lightning through it.
  - its icon, cell (3, 14) of frontend/src/assets/icons/abilities.png, beside Gust, Downwind and Tempest's cells: a storm cloud, wind and a bolt
  - its battle sheet, frontend/src/assets/abilityAnimations/storm_front.png (4 frames, like tempest.png)
Its sound (frontend/src/assets/audio/sfx/abilities/insight/storm_front.mp3) is made with ffmpeg (see the bottom of this file).

    python3 tools/art/stormFrontAssets.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageEnhance
import subprocess

ROOT = Path(__file__).resolve().parents[2]
ICONS = ROOT / 'frontend/src/assets/icons/abilities.png'
TEMPEST = ROOT / 'frontend/src/assets/abilityAnimations/tempest.png'
SHEET = ROOT / 'frontend/src/assets/abilityAnimations/storm_front.png'
SFX_DIR = ROOT / 'frontend/src/assets/audio/sfx/abilities/insight'


def stormy(img):
    """Darker, colder, heavier: the storm's colours pulled toward slate blue."""
    img = img.convert('RGBA')
    a = img.getchannel('A')
    rgb = ImageEnhance.Brightness(img.convert('RGB')).enhance(0.72)
    rgb = ImageEnhance.Contrast(rgb).enhance(1.25)
    r, g, b = rgb.split()
    b = b.point(lambda v: min(255, int(v * 1.18 + 10)))
    r = r.point(lambda v: int(v * 0.86))
    out = Image.merge('RGB', (r, g, b)).convert('RGBA')
    out.putalpha(a)
    return out


def bolt(d, x, y, h, w=2, color=(250, 250, 255, 255)):
    pts = [(x, y), (x + 4, y + h * 0.35), (x - 2, y + h * 0.4), (x + 3, y + h)]
    d.line(pts, fill=color, width=w)


def main():
    icons = Image.open(ICONS).convert('RGBA')
    icon = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(icon)
    OUT, DARK, MID, LIGHT, WIND = (18, 20, 30, 255), (58, 66, 86, 255), (88, 100, 124, 255), (132, 146, 170, 255), (200, 220, 230, 255)
    # the storm cloud: three heavy lobes, lit from above
    for (x0, y0, x1, y1) in ((8, 14, 32, 36), (22, 6, 50, 34), (38, 14, 58, 36), (10, 22, 56, 40)):
        d.ellipse((x0, y0, x1, y1), fill=MID)
    for (x0, y0, x1, y1) in ((24, 8, 46, 22), (12, 16, 28, 26)):
        d.ellipse((x0, y0, x1, y1), fill=LIGHT)
    d.rectangle((12, 32, 54, 39), fill=DARK)
    # wind streaking off it
    for (x0, y0, x1) in ((4, 44, 22), (2, 50, 16), (40, 47, 60)):
        d.line((x0, y0, x1, y0), fill=WIND, width=2)
    # the bolt
    bolt(d, 30, 36, 24, 4, OUT)
    bolt(d, 30, 36, 24, 2, (255, 246, 190, 255))
    px = icon.load()                                                 # a dark rim round it, like the other icons
    rim = [(x, y) for y in range(64) for x in range(64) if px[x, y][3] == 0 and any(
        0 <= x + dx < 64 and 0 <= y + dy < 64 and px[x + dx, y + dy][3] > 0 and px[x + dx, y + dy] != OUT for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))]
    for p_ in rim:
        px[p_] = OUT
    x, y = 3 * 64, 14 * 64
    icons.paste(Image.new('RGBA', (64, 64), (0, 0, 0, 0)), (x, y))
    icons.alpha_composite(icon, (x, y))
    icons.save(ICONS, optimize=True)

    sheet = stormy(Image.open(TEMPEST))
    fw = sheet.width // 4
    d = ImageDraw.Draw(sheet)
    for i in (1, 2):                                                 # lightning flickers in the middle frames
        bolt(d, i * fw + fw // 2 - 2, 10, sheet.height - 22, 2)
    sheet.save(SHEET, optimize=True)

    # the sound: Tempest's roar pitched down, with Gust's blast, slowed, breaking in after a second
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(SFX_DIR / 'tempest.mp3'), '-i', str(SFX_DIR / 'gust.mp3'), '-filter_complex',
                    '[0]asetrate=44100*0.8,aresample=44100,volume=1.1[a];[1]asetrate=44100*0.85,aresample=44100,adelay=1100|1100,volume=1.2[b];'
                    '[a][b]amix=inputs=2:duration=longest:normalize=0', '-ar', '44100', str(SFX_DIR / 'storm_front.mp3')], check=True)
    print('storm front: icon (3, 14), storm_front.png, storm_front.mp3')


if __name__ == '__main__':
    main()
