"""Painterly thumbnail renderer: shapes are filled with short oriented brush strokes,
shaded light-from-upper-left in creamy whites and soft blues, like the reference art."""
import math, random, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

W, H = 1600, 1000
BG = (251, 252, 253)
PAL = [(0.00,(38,66,112)),(0.22,(70,108,170)),(0.42,(132,166,214)),(0.62,(200,217,238)),(0.80,(238,242,246)),(1.00,(252,247,228))]

def pal(v):
    v = min(1, max(0, v))
    for (a,ca),(b,cb) in zip(PAL, PAL[1:]):
        if v <= b:
            t = (v-a)/(b-a); return tuple(int(ca[i]+(cb[i]-ca[i])*t) for i in range(3))
    return PAL[-1][1]

def bez(p0,p1,p2,p3,n=40):
    return [((1-t)**3*p0[0]+3*(1-t)**2*t*p1[0]+3*(1-t)*t*t*p2[0]+t**3*p3[0],
             (1-t)**3*p0[1]+3*(1-t)**2*t*p1[1]+3*(1-t)*t*t*p2[1]+t**3*p3[1]) for t in np.linspace(0,1,n)]

def path(start, segs, ox, oy, s):
    pts=[]; cur=start
    for c1,c2,e in segs:
        pts += bez(cur,c1,c2,e); cur=e
    return [(ox+x*s, oy+y*s) for x,y in pts]

TOOTH = ((0.08,0.30),[((0.02,0.05),(0.30,-0.02),(0.50,0.10)),((0.70,-0.02),(0.98,0.05),(0.92,0.30)),
        ((0.88,0.55),(0.86,0.65),(0.80,0.80)),((0.76,1.05),(0.72,1.18),(0.64,1.18)),((0.58,1.18),(0.58,1.0),(0.54,0.86)),
        ((0.52,0.80),(0.48,0.80),(0.46,0.86)),((0.42,1.0),(0.42,1.18),(0.36,1.18)),((0.28,1.18),(0.24,1.05),(0.20,0.80)),
        ((0.14,0.65),(0.12,0.55),(0.08,0.30))])
CAP = ((0.08,0.30),[((0.02,0.05),(0.30,-0.02),(0.50,0.10)),((0.70,-0.02),(0.98,0.05),(0.92,0.30)),
        ((0.92,0.42),(0.90,0.50),(0.88,0.56)),((0.70,0.60),(0.30,0.60),(0.12,0.56)),((0.10,0.50),(0.08,0.42),(0.08,0.30))])

def mask_of(polys):
    m = Image.new('L',(W,H),0); d = ImageDraw.Draw(m)
    for p in polys: d.polygon(p, fill=255)
    return m

class Canvas:
    def __init__(s, seed):
        random.seed(seed); np.random.seed(seed)
        s.img = Image.new('RGB',(W,H),BG); s.d = ImageDraw.Draw(s.img,'RGBA')
    def stroke(s, x, y, ang, ln, wd, col, a):
        dx, dy = math.cos(ang)*ln/2, math.sin(ang)*ln/2
        s.d.line([(x-dx,y-dy),(x+dx,y+dy)], fill=col+(a,), width=int(wd))
        r = wd/2.2; s.d.ellipse([x+dx-r,y+dy-r,x+dx+r,y+dy+r], fill=col+(int(a*.8),))
    def paint(s, mask, n=9000, light=(-0.55,-0.83), bias=0.0, wscale=1.0, palfn=pal, interior_dir=None):
        a = np.asarray(mask, dtype=np.float32)/255
        b = np.asarray(mask.filter(ImageFilter.GaussianBlur(30)), dtype=np.float32)/255
        bb = np.asarray(mask.filter(ImageFilter.GaussianBlur(80)), dtype=np.float32)/255
        ys, xs = np.nonzero(a > .5)
        if len(xs) == 0: return
        bbn = bb / max(bb[ys, xs].max(), 1e-3)
        gy, gx = np.gradient(b)
        patch = np.asarray(Image.fromarray((np.random.rand(H//60+1, W//60+1)*255).astype(np.uint8)).resize((W, H), Image.BICUBIC), dtype=np.float32)/255
        tmp = s.img.copy(); d = ImageDraw.Draw(tmp, 'RGBA'); keep = s.d; s.d = d
        def shade(x, y):
            g = (gx[y,x], gy[y,x]); gm = math.hypot(*g)
            facing = 0 if gm < 1e-5 else (-g[0]*light[0]-g[1]*light[1])/gm
            edgew = min(1, (1-b[y,x])*1.6)
            return (0.70 + 0.25*(bbn[y,x]-0.5) + edgew*(0.55*facing - 0.25) + (patch[y,x]-0.5)*0.3 + bias + random.gauss(0, .07)), g, gm, facing
        for cnt, wmin, wmax, lmin, lmax in [(n*.4, 18, 30, 40, 90), (n*.6, 9, 16, 20, 46)]:
            for i in np.random.randint(0, len(xs), int(cnt)):
                x, y = xs[i], ys[i]
                v, g, gm, facing = shade(x, y)
                if gm > 2e-4: ang = math.atan2(g[1], g[0]) + math.pi/2 + random.gauss(0, .3)
                else: ang = (interior_dir if interior_dir is not None else random.choice([-0.7, 0.8])) + random.gauss(0, .45)
                s.stroke(x, y, ang, random.uniform(lmin, lmax)*wscale, random.uniform(wmin, wmax)*wscale, palfn(v), random.randint(170, 240))
        edge = np.nonzero((b > .3) & (b < .62) & (a > .5))
        if len(edge[0]):
            for i in np.random.randint(0, len(edge[0]), int(n*.05)):
                y, x = edge[0][i], edge[1][i]
                v, g, gm, facing = shade(x, y)
                if facing > -.1: continue
                ang = math.atan2(g[1], g[0]) + math.pi/2 + random.gauss(0, .15)
                s.stroke(x, y, ang, random.uniform(20, 44)*wscale, random.uniform(5, 9)*wscale, palfn(.08 + random.random()*.2), random.randint(150, 220))
        s.d = keep
        clip = mask.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.GaussianBlur(2.5))
        s.img = Image.composite(tmp, s.img, clip); s.d = ImageDraw.Draw(s.img, 'RGBA')
    def ground(s, cx, cy, wd, n=260):
        for _ in range(n):
            x = cx + random.gauss(0, wd*.32); y = cy + random.gauss(0, 9)
            s.stroke(x, y, random.gauss(0, .06), random.uniform(30, 90), random.uniform(5, 12), pal(random.uniform(.38, .7)), random.randint(60, 150))
    def sparkle(s, cx, cy, r):
        def star(cx, cy, r, col):
            pts = [(cx + r*.85*math.cos(t)**3, cy + r*1.15*math.sin(t)**3) for t in np.linspace(0, 2*math.pi, 120)]
            s.d.polygon(pts, fill=col)
        star(cx, cy, r, (104,146,210,235)); star(cx - r*.06, cy - r*.06, r*.55, (150,184,228,200))
    def finish(s, out):
        im = s.img.filter(ImageFilter.SMOOTH_MORE)
        # light canvas grain
        n = (np.random.normal(0, 3.2, (H, W, 1))).astype(np.int16)
        arr = np.clip(np.asarray(im).astype(np.int16) + n, 0, 255).astype(np.uint8)
        Image.fromarray(arr).resize((800, 500), Image.LANCZOS).save(out, quality=86, optimize=True, progressive=True)

def tooth_poly(ox, oy, s, shape=TOOTH): return path(shape[0], shape[1], ox, oy, s)

def rot_rect(cx, cy, w, h, ang, r=0):
    c, sn = math.cos(ang), math.sin(ang)
    pts = []
    for x, y in [(-w/2,-h/2),(w/2,-h/2),(w/2,h/2),(-w/2,h/2)]:
        pts.append((cx + x*c - y*sn, cy + x*sn + y*c))
    return pts

def mirror(c, cx, cy, ang=-0.22, length=560, head=118):
    # handle
    hx, hy = cx + math.sin(ang)*length*.55, cy + math.cos(ang)*length*.55
    hm = mask_of([rot_rect(hx, hy, 30, length*.9, -ang)])
    c.paint(hm, n=1400, wscale=.5, interior_dir=math.pi/2 - ang, palfn=lambda v: pal(0.06 + v*0.22))
    # knurling
    for k in range(40):
        t = random.uniform(.35, .75); px, py = cx + math.sin(ang)*length*t, cy + math.cos(ang)*length*t
        c.stroke(px + random.gauss(0, 5), py, random.choice([.8, -.8]), 22, 3, (40, 62, 98), 180)
    # head ring + glass
    ring = Image.new('L', (W, H), 0); dr = ImageDraw.Draw(ring)
    dr.ellipse([cx-head, cy-head*1.08, cx+head, cy+head*1.08], fill=255)
    c.paint(ring, n=2400, wscale=.7, interior_dir=-0.75, palfn=lambda v: pal(0.38 + v*0.5))
    c.d.ellipse([cx-head, cy-head*1.08, cx+head, cy+head*1.08], outline=(40, 66, 110, 235), width=13)

SCENES = {}
def scene(f): SCENES[f.__name__] = f; return f

@scene
def mirror_tooth(c):
    m = mask_of([tooth_poly(560, 230, 470)]); c.ground(800, 790, 520); c.paint(m, n=11000)
    mirror(c, 1060, 330); c.sparkle(470, 240, 70)

@scene
def brush(c):
    m = mask_of([tooth_poly(420, 250, 440)]); c.ground(700, 785, 520); c.paint(m, n=10000)
    # toothbrush standing at an angle, head up, bristles facing the tooth
    ang = -1.22; ux, uy = math.cos(ang), math.sin(ang)
    x0, y0 = 1010, 800; x1, y1 = x0 + ux*470, y0 + uy*470
    hm = mask_of([rot_rect((x0 + x1)/2, (y0 + y1)/2, 470, 40, ang)])
    c.paint(hm, n=2600, wscale=.6, interior_dir=ang, palfn=lambda v: pal(0.30 + v*0.45))
    hx, hy = x1 + ux*70, y1 + uy*70
    head = mask_of([rot_rect(hx, hy, 150, 46, ang)])
    c.paint(head, n=1200, wscale=.5, interior_dir=ang, palfn=lambda v: pal(0.25 + v*0.4))
    nx, ny = -uy, ux
    for k in range(90):
        t = random.uniform(-62, 62); bx, by = hx + ux*t - nx*40, hy + uy*t - ny*40
        c.stroke(bx, by, math.atan2(ny, nx) + random.gauss(0, .08), random.uniform(34, 48), random.uniform(5, 8), pal(random.uniform(.42, .78)), 235)
    c.sparkle(330, 230, 60)

@scene
def crown(c):
    m = mask_of([tooth_poly(560, 360, 470)]); c.ground(800, 940, 520)
    # stump: lower part of tooth only
    stump = Image.new('L', (W, H), 0); ImageDraw.Draw(stump).polygon(tooth_poly(560, 360, 470), fill=255)
    cut = Image.new('L', (W, H), 0); ImageDraw.Draw(cut).rectangle([0, 360 + 470*.42, W, H], fill=255)
    stump = Image.fromarray(np.minimum(np.asarray(stump), np.asarray(cut)))
    c.paint(stump, n=7000, bias=-.08)
    cap = mask_of([tooth_poly(540, 120, 510, CAP)]); c.paint(cap, n=6000, bias=.06)
    c.sparkle(1180, 200, 64); c.sparkle(450, 300, 40)

@scene
def implant(c):
    cap = mask_of([tooth_poly(600, 120, 400, CAP)]); c.ground(800, 930, 360)
    c.paint(cap, n=6000)
    ab = mask_of([[(740, 345), (860, 345), (845, 440), (755, 440)]]); c.paint(ab, n=1200, bias=-.3, wscale=.6, interior_dir=0)
    screw = mask_of([[(735, 440), (865, 440), (845, 820), (800, 880), (755, 820)]]); c.paint(screw, n=3200, bias=-.32, wscale=.6, interior_dir=0)
    for k in range(9):
        y = 470 + k*42; half = 66 - k*3.4
        for _ in range(4):
            c.stroke(800 + random.gauss(0, 6), y + random.gauss(0, 3), -0.18 + random.gauss(0, .05), half*2.1, random.uniform(5, 8), (46, 74, 120), 210)
    c.sparkle(1120, 260, 64)

@scene
def floss(c):
    for ox in (420, 790):
        m = mask_of([tooth_poly(ox, 260, 390)]); c.paint(m, n=7000)
    c.ground(800, 760, 640)
    pts = bez((440, 150), (620, 190), (760, 300), (800, 345), 40) + bez((800, 345), (840, 300), (980, 190), (1160, 150), 40)
    for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
        c.d.line([(x1, y1), (x2, y2)], fill=(52, 86, 140, 230), width=7)
    c.sparkle(1250, 210, 60)

@scene
def calm(c):
    m = mask_of([tooth_poly(560, 230, 470)]); c.ground(800, 790, 520); c.paint(m, n=11000)
    # eucalyptus sprig
    stem = bez((1020, 820), (1080, 600), (1140, 420), (1260, 240), 50)
    for (x1, y1), (x2, y2) in zip(stem, stem[1:]): c.d.line([(x1, y1), (x2, y2)], fill=(92, 120, 104, 230), width=7)
    for i, (x, y) in enumerate(stem[6::5]):
        for side in (-1, 1):
            ang = -1.1 + side*0.9
            lm = Image.new('L', (W, H), 0); ld = ImageDraw.Draw(lm)
            lx, ly = x + math.cos(ang)*48, y + math.sin(ang)*48
            ld.ellipse([lx-46, ly-20, lx+46, ly+20], fill=255)
            lm = lm.rotate(math.degrees(-ang), center=(lx, ly))
            c.paint(lm, n=500, wscale=.5, palfn=lambda v: tuple(int(a*(1-v*.55) + b*v*.55) for a, b in zip((96, 132, 112), (226, 236, 228))))
    c.sparkle(470, 240, 64)

if __name__ == '__main__':
    out = sys.argv[1]
    for i, (name, f) in enumerate(SCENES.items()):
        if len(sys.argv) > 2 and name not in sys.argv[2:]: continue
        c = Canvas(7 + i); f(c); c.finish(f'{out}/thumb-{name}.jpg'); print('rendered', name)
