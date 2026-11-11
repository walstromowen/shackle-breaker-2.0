# The ruined carriage, 3 x 2 tiles (96 x 64): a side-on stagecoach after the reference, in the abandoned houses' style and palette.
# Flat materials are laid down (a label map), then textured pixel by pixel: wood grain, top-lit shading, dithered canvas, glass glints; every outer edge is
# darkened as the houses' are. The encounter picture is the same carriage, unscaled, on a patch of grass in a 128 px square.
import sys, math, random
from PIL import Image, ImageDraw
W, H = 96, 64
PAL = {
 'wood':    [(63,48,33),(75,58,42),(88,68,47),(101,79,55),(116,92,63),(126,104,73),(140,116,82)],
 'panel':   [(52,40,29),(63,48,33),(75,58,42),(88,68,47),(101,79,55)],
 'trim':    [(89,69,36),(117,101,65),(134,115,74),(146,127,89),(166,145,102)],
 'canvas':  [(101,79,55),(117,101,65),(128,108,71),(134,115,74),(146,127,89),(166,145,102)],
 'leather': [(34,25,22),(44,33,26),(55,40,33),(66,50,38)],
 'glass':   [(6,6,10),(10,8,7),(16,14,18)],
 'shard':   [(110,116,126),(150,156,166),(190,196,204)],
 'curtain': [(70,34,30),(92,46,38),(112,60,48)],
 'iron':    [(26,24,26),(40,38,40),(58,56,58),(82,80,82),(110,108,110)],
 'moss':    [(40,56,32),(52,70,38),(66,88,46),(80,104,54)],
 'board':   [(78,60,31),(89,69,36),(101,79,55),(126,104,73)],
 'gold':    [(117,101,65),(166,145,102),(212,186,118)],
 'hole':    [(14,10,9),(20,16,14)],
}
def make(looted=False, seed=11):
    rnd = random.Random(seed)
    lab = {}                                   # (x, y) -> material, the last one drawn wins
    order = []
    def put(x, y, m):
        if 0 <= x < W and 0 <= y < H: lab[(x, y)] = m
    def poly(pts, m):
        img = Image.new('L', (W, H), 0); ImageDraw.Draw(img).polygon(pts, fill=1)
        for y in range(H):
            for x in range(W):
                if img.getpixel((x, y)): put(x, y, m)
    def line(a, b, m, w=1):
        img = Image.new('L', (W, H), 0); ImageDraw.Draw(img).line([a, b], fill=1, width=w)
        for y in range(H):
            for x in range(W):
                if img.getpixel((x, y)): put(x, y, m)
    def ellipse(box, m, width=None):
        img = Image.new('L', (W, H), 0); d = ImageDraw.Draw(img)
        if width: d.ellipse(box, outline=1, width=width)
        else: d.ellipse(box, fill=1)
        for y in range(H):
            for x in range(W):
                if img.getpixel((x, y)): put(x, y, m)
    def wheel(cx, cy, rx, ry, spokes, missing=(), rimw=2, gap=None):
        ellipse([cx-rx, cy-ry, cx+rx, cy+ry], 'wood', width=rimw)
        ellipse([cx-rx+rimw, cy-ry+rimw*ry/rx, cx+rx-rimw, cy+ry-rimw*ry/rx], 'trim', width=1)    # the felloe's inner edge
        for i in range(spokes):
            if i in missing: continue
            a = 2*math.pi*i/spokes + 0.2
            line((cx, cy), (cx+(rx-2)*math.cos(a), cy+(ry-2)*math.sin(a)), 'trim', 1)
        ellipse([cx-2.5, cy-2.5*ry/rx, cx+2.5, cy+2.5*ry/rx], 'iron')
        put(int(cx)-1, int(cy-ry/rx), 'gold')
        if gap:   # a broken piece of the rim gone
            for (x, y) in list(lab):
                if lab[(x, y)] in ('wood', 'trim') and gap[0] <= x <= gap[2] and gap[1] <= y <= gap[3]: del lab[(x, y)]
    # ---------------------------------------------------------------- the broken front wheel, flat in the grass, and its snapped spoke
    wheel(15, 56, 13, 4.6, 10, missing=(2, 3), rimw=2, gap=(22, 51, 28, 54))
    line((24, 52), (28, 47), 'trim', 1); put(28, 46, 'wood')
    # ---------------------------------------------------------------- the perch (the beam under the body), its front end down in the grass
    line((74, 46), (14, 52), 'leather', 2)
    # the rear leaf springs, under the back of the body
    for k in range(3): line((62+k, 41-k), (84-k, 38-k), 'iron', 1)
    # ---------------------------------------------------------------- the body: a coach with a curved belly, sagging at the front where its wheel went
    top = lambda x: 18 - (x-22) * 5/60                       # the roof line falls 5 px from back to front
    belly = []
    for i in range(0, 31):
        t = i/30; x = 24 + t*58
        belly.append((x, top(x) + 22 + 6*math.sin(math.pi*t) - 2*t))
    body = [(22, top(22)), (82, top(82)), (84, top(84)+4), (84, top(84)+20)] + belly[::-1] + [(22, top(22)+20)]
    poly(body, 'wood')
    # panels: the front quarter, the door, the back quarter, each a raised moulding with a darker field
    def panel(x0, x1, y0off, y1off, m='panel'):
        pts = [(x0, top(x0)+y0off), (x1, top(x1)+y0off), (x1, top(x1)+y1off), (x0, top(x0)+y1off)]
        poly(pts, m)
        line(pts[0], pts[1], 'trim'); line(pts[1], pts[2], 'trim'); line(pts[3], pts[2], 'trim'); line(pts[0], pts[3], 'trim')
    panel(25, 35, 3, 19)
    panel(61, 81, 3, 19)
    # the door: it hangs from its lower hinge, swung out and tilted, a dark gap where it used to sit
    poly([(39, top(39)+2), (58, top(58)+2), (58, top(58)+5), (39, top(39)+5)], 'hole')
    door = [(39, top(39)+4), (58, top(58)+3), (59, top(58)+24), (40, top(39)+24)]
    poly(door, 'wood'); line(door[0], door[1], 'trim'); line(door[1], door[2], 'trim'); line(door[0], door[3], 'trim'); line(door[3], door[2], 'trim')
    # the door's window: the glass broken, a few shards still in the frame
    dw = [(43, top(43)+8), (54, top(54)+7), (55, top(54)+15), (44, top(43)+16)]
    poly(dw, 'glass'); line(dw[0], dw[1], 'trim'); line(dw[3], dw[2], 'trim')
    for (x, y) in [(44, 16+int(top(44)-18)+9), (45, 16+int(top(44)-18)+9), (53, 16+int(top(53)-18)+9), (44, 16+int(top(44)-18)+14)]: put(x, y, 'shard')
    put(55, int(top(55))+18, 'gold'); put(56, int(top(55))+18, 'gold')       # the handle
    # the front window, boarded over
    fw = [(27, top(27)+5), (33, top(33)+5), (33, top(33)+12), (27, top(27)+12)]
    poly(fw, 'glass')
    for dy in (6, 9): line((26, top(26)+dy+1), (34, top(34)+dy-1), 'board', 2)
    # the back window, a torn curtain hanging in it
    bw = [(64, top(64)+5), (78, top(78)+5), (78, top(78)+13), (64, top(64)+13)]
    poly(bw, 'glass')
    poly([(64, top(64)+5), (70, top(70)+5), (68, top(68)+10), (66, top(66)+13), (64, top(64)+12)], 'curtain')
    put(74, int(top(74))+8, 'shard')
    # a smashed board low in the back quarter
    poly([(66, top(66)+15), (68, top(68)+14), (70, top(70)+16), (73, top(73)+14.5), (75, top(75)+16), (74, top(74)+19), (66, top(66)+19)], 'hole')
    # the beading: along the roof line, the waist, and the belly
    line((22, top(22)), (84, top(84)), 'trim'); line((22, top(22)+20), (84, top(84)+20), 'trim')
    # the roof: a curved top, the luggage rack with its rail, a torn canvas bundle and a trunk sliding off the back
    poly([(21, top(21)), (25, top(25)-3), (82, top(82)-3), (86, top(86)), (84, top(84)+1), (22, top(22)+1)], 'leather')
    for x in range(28, 80, 7): line((x, top(x)-3), (x, top(x)-7), 'iron')
    line((26, top(26)-7), (80, top(80)-7), 'iron')
    poly([(30, top(30)-4), (33, top(33)-10), (44, top(44)-13), (56, top(56)-12), (60, top(60)-5)], 'canvas')
    poly([(43, top(43)-11), (48, top(48)-12), (47, top(47)-7), (43, top(43)-7)], 'hole')            # the tear in the canvas
    line((38, top(38)-11), (38, top(38)-4), 'leather'); line((52, top(52)-12), (53, top(53)-4), 'leather')   # ropes
    poly([(66, top(66)-4), (77, top(77)-4), (80, top(80)-11), (69, top(69)-11)], 'leather')         # the trunk, tipping
    line((66, top(66)-4), (69, top(69)-11), 'gold'); line((77, top(77)-4), (80, top(80)-11), 'gold')
    # the leather boot at the back
    poly([(84, top(84)+2), (90, top(84)+5), (91, top(84)+16), (84, top(84)+19)], 'leather')
    line((85, top(84)+9), (90, top(84)+10), 'iron')
    # the driver's box at the front: the seat, its back, the footboard, a broken lamp
    poly([(11, 17), (23, top(23)), (23, top(23)+12), (15, top(23)+12)], 'wood')   # the front boot, under the seat
    line((12, 18), (23, top(23)+1), 'trim'); line((15, top(23)+12), (23, top(23)+12), 'trim')
    poly([(8, 13), (21, 12), (22, 17), (9, 18)], 'leather')               # the seat cushion
    poly([(19, 7), (22, 7), (22, 14), (20, 14)], 'wood')                 # the seat's back
    poly([(5, 28), (16, 27), (16, 30), (5, 31)], 'wood')                 # the footboard, hanging off its iron
    line((15, top(23)+11), (13, 28), 'iron')
    line((23, top(23)+3), (19, top(23)+3), 'iron'); poly([(17, top(23)+1), (19, top(23)+1), (19, top(23)+6), (17, top(23)+6)], 'glass')   # the lamp
    put(17, int(top(23))+2, 'shard')
    # ---------------------------------------------------------------- the rear wheel, still on, a spoke snapped
    wheel(72, 47, 13, 13, 12, missing=(4,), rimw=2)
    line((74, 41), (79, 35), 'trim', 1)
    # moss on the roof edge and the belly, grass tufts round the wheels, splinters
    for (x, y, w, h) in [(24, 13, 7, 3), (56, 9, 6, 3), (30, 38, 8, 3), (50, 41, 7, 2), (82, 32, 4, 3), (12, 25, 4, 2)]: ellipse([x, y, x+w, y+h], 'moss')
    for (x, y) in [(60, 58), (62, 57), (85, 58), (87, 56), (4, 58), (30, 60), (33, 59)]: line((x, y), (x+1, y-3), 'moss')
    line((36, 55), (42, 53), 'board'); line((44, 58), (48, 56), 'wood')
    if not looted:
        # the strongbox, burst open in the grass, and coins
        poly([(84, 50), (93, 49), (93, 57), (84, 58)], 'leather'); line((84, 52), (93, 51), 'gold'); line((84, 55), (93, 54), 'gold')
        poly([(84, 49), (93, 48), (91, 45), (83, 46)], 'wood')
        for (x, y) in [(80, 59), (82, 60), (88, 60), (40, 60), (8, 61)]: put(x, y, 'gold'); put(x+1, y, 'gold')
    # ---------------------------------------------------------------- texture
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0)); px = img.load()
    grain = [rnd.choice([-1, 0, 0, 0, 1]) for _ in range(W)]
    for (x, y), m in lab.items():
        p = PAL[m]; n = len(p)
        if m in ('wood', 'board', 'panel'):
            light = 1 if y < top(x) + 6 else (-1 if y > top(x) + 17 else 0)      # lit from above
            i = n//2 + grain[x] + light + (1 if rnd.random() < 0.07 else 0) - (1 if rnd.random() < 0.10 else 0)
        elif m == 'trim':
            i = n//2 + (1 if rnd.random() < 0.3 else 0) - (1 if rnd.random() < 0.15 else 0)
        elif m == 'canvas':
            i = int(rnd.random()*n*0.8) + (1 if (x+y) % 3 == 0 else 0) + (1 if y < 8 else 0)
        elif m == 'glass':
            i = 0
            if rnd.random() < 0.03: px[x, y] = (150, 150, 170, 255); continue
        elif m == 'moss':
            if rnd.random() < 0.3: continue
            i = rnd.randrange(n)
        elif m == 'iron':
            i = n//2 + (1 if rnd.random() < 0.25 else 0)
        else:
            i = n//2 + rnd.choice([-1, 0, 0, 1])
        px[x, y] = p[max(0, min(n-1, i))] + (255,)
    # every outer edge darkened, as the houses' are; and a soft shadow under it all
    edges = [(x, y) for (x, y) in lab if any(not (0 <= x+dx < W and 0 <= y+dy < H) or px[x+dx, y+dy][3] == 0 for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)))]
    for x, y in edges:
        r, g, b, a = px[x, y]
        if a: px[x, y] = (int(r*0.42), int(g*0.38), int(b*0.36), 255)
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    sh = Image.new('RGBA', (W, H), (0, 0, 0, 0)); ImageDraw.Draw(sh).ellipse([5, 50, 94, 63], fill=(0, 0, 0, 80))
    out.alpha_composite(sh); out.alpha_composite(img)
    return out
def picture(car):
    rnd = random.Random(5)
    pic = Image.new('RGBA', (128, 128), (0, 0, 0, 0)); d = ImageDraw.Draw(pic)
    d.ellipse([2, 70, 126, 124], fill=(52, 70, 38, 255)); d.ellipse([6, 73, 122, 120], fill=(66, 88, 46, 255))
    p = pic.load()
    for y in range(128):
        for x in range(128):
            if p[x, y][3] and rnd.random() < 0.22: p[x, y] = PAL['moss'][rnd.randrange(4)] + (255,)
    pic.alpha_composite(car, (16, 40))
    return pic
out = sys.argv[1]
car = make(); car.save(out+'/objRuinedCarriage.png'); make(looted=True).save(out+'/objRuinedCarriageLooted.png'); picture(car).save(out+'/ruined_carriage.png')
prev = Image.new('RGBA', (96*4+20+256, 256), (92, 124, 70, 255))
prev.alpha_composite(car.resize((384, 256), Image.NEAREST), (0, 0)); prev.alpha_composite(picture(car).resize((256, 256), Image.NEAREST), (404, 0))
prev.save(out+'/preview.png')
