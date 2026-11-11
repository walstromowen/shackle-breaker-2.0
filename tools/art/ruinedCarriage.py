# The ruined carriage, after the reference stagecoach, in the style of the abandoned houses (their palette, wood grain, straw-like canvas, moss).
# Drawn as flat materials on a 64 grid at scale s, then each material is textured pixel by pixel at the final size, and every edge darkened.
import sys, math, random
from PIL import Image, ImageDraw
PAL = {   # from objAbandonedHouse1.png
 'wood':   [(55,40,33),(75,58,42),(88,68,47),(101,79,55),(126,104,73)],
 'wood_d': [(34,25,22),(48,37,25),(55,40,33),(63,48,33)],
 'trim':   [(60,44,25),(78,60,31),(89,69,36),(117,101,65)],
 'canvas': [(101,79,55),(117,101,65),(128,108,71),(134,115,74),(146,127,89),(166,145,102)],
 'glass':  [(6,6,10),(10,8,7),(20,16,14)],
 'iron':   [(34,25,22),(48,44,44),(66,64,66),(90,88,90)],
 'moss':   [(40,56,32),(52,70,38),(66,88,46)],
 'board':  [(78,60,31),(89,69,36),(101,79,55),(126,104,73)],
 'gold':   [(117,101,65),(166,145,102),(200,176,110)],
}
OUTLINE=(20,16,14,255)
KEYS={}
def key(name):
    if name not in KEYS: KEYS[name]=(len(KEYS)*9+7, 3, 200, 255)
    return KEYS[name]
def draw(s, ground=False, looted=False, seed=7):
    rnd=random.Random(seed*1000+s)
    N=64*s; lab=Image.new('RGBA',(N,N),(0,0,0,0)); d=ImageDraw.Draw(lab)
    P=lambda pts:[(x*s,y*s) for x,y in pts]
    def poly(pts,m): d.polygon(P(pts), fill=key(m))
    def line(a,b,m,w=1): d.line(P([a,b]), fill=key(m), width=max(1,int(w*s)))
    def ell(box,m,w=None):
        if w: d.ellipse(P(box), outline=key(m), width=max(1,int(w*s)))
        else: d.ellipse(P(box), fill=key(m))
    def wheel(cx,cy,r,spokes,missing=(),squash=1.0):
        d.ellipse(P([(cx-r,cy-r*squash),(cx+r,cy+r*squash)]), outline=key('wood_d'), width=max(2,int(1.6*s)))
        for i in range(spokes):
            if i in missing: continue
            a=2*math.pi*i/spokes; line((cx,cy),(cx+(r-1)*math.cos(a),cy+(r-1)*squash*math.sin(a)),'trim',0.8)
        ell([(cx-1.6,cy-1.6*squash),(cx+1.6,cy+1.6*squash)],'iron')
    # --- the front wheel, broken off and lying flat in the grass (left), half its rim gone
    wheel(13,55,10.5,8,missing=(1,2),squash=0.38)
    line((21,51),(24,48.5),'trim',0.8)   # a spoke torn loose, sticking up
    # --- the perch: the beam under the body, its front end down in the grass where the wheel went
    line((47,44),(8,49),'wood_d',1.6)
    # --- the body: boat-bottomed, the front (left) sagging low
    body=[(12,21),(50,15),(53,17),(53,33),(51,37),(45,40),(22,44.5),(15,43),(12,39)]   # a coach's body: the underside curves up at both ends
    poly(body,'wood')
    for x in range(16,53,5): line((x,21-(x-12)*0.15+1),(x,43.5-(x-12)*0.1),'wood_d',0.5)
    line((12,21),(50,15),'trim',1); line((13,37),(53,31),'trim',1)   # the beading along the top and the waist
    # the roof rail, and the canvas load on top, torn open in the middle
    line((11,20),(51,14),'wood_d',1.2)
    poly([(15,19),(17,12),(24,9),(34,8),(44,7),(49,10),(50,14)],'canvas')
    poly([(28,10),(33,9),(32,13),(28,14)],'glass')                     # the tear
    line((22,10),(23,18),'wood_d',0.5); line((40,8),(41,15),'wood_d',0.5)   # the ropes
    # the driver's bench and footboard, out front
    poly([(5,23),(12,22),(12,26),(6,27)],'wood_d')                      # the seat, against the coach's front
    line((6,27),(11,34),'wood_d',0.9); line((4,26),(4,31),'trim',0.6)   # its brace, and the broken lamp-iron
    poly([(2,32),(11,31),(11,34),(2,35)],'wood')                        # the footboard
    # windows: the front one boarded up, the rear one black, the door between them hanging open
    poly([(16,25),(24,23.8),(24,31),(16,32.2)],'glass')
    for y in (25.5,28,30.5): line((15.5,y+0.5),(24.5,y-0.8),'board',0.9)
    poly([(39,21.6),(48,20.3),(48,28),(39,29.3)],'glass')
    poly([(27,23.5),(36,22),(36,41),(27,43)],'wood_d')                  # the doorway, dark inside
    poly([(36,22),(41,24),(41,42),(36,41)],'wood')                      # the door, swung out on one hinge
    line((38,30),(39,30.5),'trim',0.8)
    # --- the rear wheel, still on, a spoke snapped
    wheel(47,45,10,10,missing=(3,))
    line((50,40),(53,36),'trim',0.6)
    # moss on the canvas and along the sill
    for (x,y,w,h) in [(18,11,5,3),(43,8,5,3),(14,40,7,3),(30,42,4,2)]: ell([(x,y),(x+w,y+h)],'moss')
    # splinters in the grass
    line((24,53),(30,51.5),'wood',0.6); line((33,56),(37,54),'wood_d',0.6)
    if not looted:
        # the strongbox spilled in the grass, and coins
        poly([(53,49),(61,48.5),(61,55),(53,55.5)],'wood_d'); line((53,51),(61,50.5),'trim',0.7); line((53,53.5),(61,53),'trim',0.7)
        for (x,y) in [(4,58),(7,60),(26,58),(57,58)]: ell([(x,y),(x+1.4,y+1)],'gold')
    # --- texture every material at the final resolution
    img=Image.new('RGBA',(N,N),(0,0,0,0)); src=lab.load(); dst=img.load()
    inv={v:k for k,v in KEYS.items()}
    col_shift=[rnd.choice([-1,0,0,1]) for _ in range(N)]
    for y in range(N):
        for x in range(N):
            k=src[x,y]
            if k[3]==0: continue
            m=inv.get(k)
            if m is None: continue
            p=PAL[m]; n=len(p)
            if m in ('wood','wood_d','board','trim'):
                i=min(n-1,max(0,n//2+col_shift[x//max(1,s//1)]+(1 if rnd.random()<0.10 else 0)-(1 if rnd.random()<0.12 else 0)))
            elif m=='canvas':
                i=min(n-1,max(0,int(rnd.random()*n*0.9)+(1 if (x+y)%3==0 else 0)))
            elif m=='glass':
                i=0; 
                if rnd.random()<0.02: dst[x,y]=(150,150,170,255); continue   # a glint, as in the houses' windows
            elif m=='moss':
                if rnd.random()<0.35: continue                               # moss is patchy
                i=rnd.randrange(n)
            else:
                i=min(n-1,max(0,n//2+rnd.choice([-1,0,1])))
            dst[x,y]=p[i]+(255,)
    # light from above: the top rows of each shape a little lighter is already in the palette; now the edges, darkened as the houses' are
    px=img.load(); edge=[]
    for y in range(N):
        for x in range(N):
            if px[x,y][3]==0: continue
            if any(not(0<=x+dx<N and 0<=y+dy<N) or px[x+dx,y+dy][3]==0 for dx,dy in ((1,0),(-1,0),(0,1),(0,-1))): edge.append((x,y))
    for x,y in edge:
        r,g,b,a=px[x,y]; px[x,y]=(int(r*0.45),int(g*0.42),int(b*0.4),255) if (x+y)%5 else OUTLINE
    # the ground: a soft shadow (and for the encounter picture, a patch of grass and earth)
    base=Image.new('RGBA',(N,N),(0,0,0,0)); bd=ImageDraw.Draw(base)
    if ground:
        bd.ellipse(P([(0,42),(64,64)]), fill=(52,70,38,255)); bd.ellipse(P([(3,44),(61,62)]), fill=(66,88,46,255))
        bp=base.load()
        for y in range(N):
            for x in range(N):
                if bp[x,y][3] and rnd.random()<0.18: bp[x,y]=PAL['moss'][rnd.randrange(3)]+(255,)
    sh=Image.new('RGBA',(N,N),(0,0,0,0)); ImageDraw.Draw(sh).ellipse(P([(3,47),(63,61)]), fill=(0,0,0,85))
    base.alpha_composite(sh); base.alpha_composite(img)
    return base
out=sys.argv[1]
draw(1).save(out+'/objRuinedCarriage.png'); draw(1,looted=True).save(out+'/objRuinedCarriageLooted.png'); draw(2,ground=True).save(out+'/ruined_carriage.png')
prev=Image.new('RGBA',(256+16+256+16+160,256),(92,124,70,255))
prev.alpha_composite(draw(1).resize((256,256),Image.NEAREST),(0,0)); prev.alpha_composite(draw(2,True).resize((256,256),Image.NEAREST),(272,0))
h=Image.open('/home/user/shackle-breaker-2.0/frontend/src/assets/mapObjects/objAbandonedHouse1.png').convert('RGBA').crop((0,40,160,160)).resize((160,120),Image.NEAREST)
prev.alpha_composite(h,(544,70)); prev.alpha_composite(draw(1),(544+40,190))
prev.save(out+'/preview2.png')
