/**
 * Pure geometry for the approval universe. Everything here is a function of
 * (viewport, blend, stage) so the DOM loop only has to apply the results.
 */
export interface Pt {
  x: number;
  y: number;
}

export interface Frame {
  w: number;
  h: number;
  /** Desktop/tablet pinned horizontal journey vs. stacked vertical journey. */
  pinned: boolean;
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const lerpPt = (a: Pt, b: Pt, t: number): Pt => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });

export const NODE_COUNT = 6;
const DEG = Math.PI / 180;

/** Dwell near each stage so cards settle in place instead of sliding past. */
export function plateau(raw: number): number {
  const r = clamp(raw, 0, NODE_COUNT - 1);
  const i = Math.floor(r);
  return i + smoothstep(0.1, 0.9, r - i);
}

export interface Orbit {
  hub: Pt;
  rx: number;
  ry: number;
  tilt: number;
}

/** True when the hero places copy on the left and the universe on the right. */
export function isSplit(f: Frame): boolean {
  return f.pinned && f.w >= 1000 && f.w / f.h >= 1.2;
}

export function heroOrbit(f: Frame): Orbit {
  if (!f.pinned) {
    const rx = Math.min(f.w * 0.3, 230);
    return { hub: { x: f.w * 0.5, y: f.h * 0.27 }, rx, ry: rx * 0.62, tilt: -9 };
  }
  if (isSplit(f)) {
    const rx = Math.min(f.w * 0.205, f.h * 0.56);
    return { hub: { x: f.w * 0.725, y: f.h * 0.53 }, rx, ry: rx * 0.52, tilt: -12 };
  }
  const rx = Math.min(f.w * 0.36, f.h * 0.34);
  return { hub: { x: f.w * 0.5, y: f.h * 0.7 }, rx, ry: rx * 0.5, tilt: -8 };
}

/** Compact orbit used by the stacked (mobile / reduced-motion) journey. */
export function stackedJourneyOrbit(f: Frame): Orbit {
  const rx = Math.min(f.w * 0.3, 170);
  return { hub: { x: f.w * 0.5, y: Math.min(f.h * 0.19, 150) }, rx, ry: rx * 0.52, tilt: -8 };
}

export interface RowLayout {
  spacing: number;
  routeY: number;
  cardW: number;
  cardTop: number;
}

export function rowLayout(f: Frame): RowLayout {
  const spacing = clamp(f.w * 0.29, 280, 420);
  const routeY = clamp(f.h * 0.31, 175, 360);
  return { spacing, routeY, cardW: clamp(spacing * 0.84, 250, 360), cardTop: routeY + 62 };
}

const ROW_WOBBLE = [8, -9, 6, -8, 9, -6];

export function orbitPoint(o: Orbit, index: number): Pt {
  const a = (-160 + index * 60) * DEG;
  const lx = Math.cos(a) * o.rx;
  const ly = Math.sin(a) * o.ry;
  const t = o.tilt * DEG;
  return {
    x: o.hub.x + lx * Math.cos(t) - ly * Math.sin(t),
    y: o.hub.y + lx * Math.sin(t) + ly * Math.cos(t),
  };
}

export function rowPoint(f: Frame, index: number, s: number): Pt {
  const r = rowLayout(f);
  return { x: f.w / 2 + (index - s) * r.spacing, y: r.routeY + (ROW_WOBBLE[index] ?? 0) };
}

export function rowHub(f: Frame, s: number): Pt {
  const r = rowLayout(f);
  return { x: f.w / 2 - r.spacing * 1.0 - s * r.spacing * 0.62, y: r.routeY };
}

/** Per-node orbit→row blend; nodes peel off in sequence. Labels reuse it so they travel with their node. */
export const nodeBlend = (t: number, i: number) => easeInOut(clamp(t * 1.35 - i * 0.07, 0, 1));

export interface SceneState {
  e: number;
  hub: Pt;
  hubScale: number;
  tilt: number;
  nodes: Pt[];
  /** Outward unit vector from hub for each node (used for hero labels). */
  outward: Pt[];
}

export function computeScene(f: Frame, t: number, s: number): SceneState {
  const e = easeInOut(t);
  const ho = heroOrbit(f);
  const nodes: Pt[] = [];
  const outward: Pt[] = [];
  let hub: Pt;
  let hubScale: number;
  let tilt: number;

  if (f.pinned) {
    hub = lerpPt(ho.hub, rowHub(f, s), e);
    hubScale = lerp(1, 0.86, e);
    tilt = ho.tilt;
    for (let i = 0; i < NODE_COUNT; i++) {
      const ei = nodeBlend(t, i);
      nodes.push(lerpPt(orbitPoint(ho, i), rowPoint(f, i, s), ei));
    }
  } else {
    const jo = stackedJourneyOrbit(f);
    const o: Orbit = {
      hub: lerpPt(ho.hub, jo.hub, e),
      rx: lerp(ho.rx, jo.rx, e),
      ry: lerp(ho.ry, jo.ry, e),
      tilt: lerp(ho.tilt, jo.tilt, e),
    };
    hub = o.hub;
    hubScale = o.rx / ho.rx;
    tilt = o.tilt;
    for (let i = 0; i < NODE_COUNT; i++) nodes.push(orbitPoint(o, i));
  }

  // Labels sit outside the orbit; reference the hero orbit when pinned so the
  // direction stays stable while the nodes slide into the row.
  for (let i = 0; i < NODE_COUNT; i++) {
    const ref = f.pinned ? orbitPoint(ho, i) : nodes[i]!;
    const origin = f.pinned ? ho.hub : hub;
    const vx = ref.x - origin.x;
    const vy = ref.y - origin.y;
    const len = Math.hypot(vx, vy) || 1;
    outward.push({ x: vx / len, y: vy / len });
  }
  return { e, hub, hubScale, tilt, nodes, outward };
}

/* ---------- route (Catmull-Rom as cubic Béziers) ---------- */

export interface Seg {
  p0: Pt;
  c1: Pt;
  c2: Pt;
  p1: Pt;
  len: number;
}

function toSeg(P0: Pt, P1: Pt, P2: Pt, P3: Pt): Seg {
  const c1 = { x: P1.x + (P2.x - P0.x) / 6, y: P1.y + (P2.y - P0.y) / 6 };
  const c2 = { x: P2.x - (P3.x - P1.x) / 6, y: P2.y - (P3.y - P1.y) / 6 };
  const seg: Seg = { p0: P1, c1, c2, p1: P2, len: 0 };
  let prev = P1;
  let len = 0;
  for (let k = 1; k <= 10; k++) {
    const p = bez(seg, k / 10);
    len += Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
  }
  seg.len = len;
  return seg;
}

export function bez(s: Seg, u: number): Pt {
  const v = 1 - u;
  const a = v * v * v;
  const b = 3 * v * v * u;
  const c = 3 * v * u * u;
  const d = u * u * u;
  return {
    x: a * s.p0.x + b * s.c1.x + c * s.c2.x + d * s.p1.x,
    y: a * s.p0.y + b * s.c1.y + c * s.c2.y + d * s.p1.y,
  };
}

/**
 * Segments 0..4 form the open route (Declare → Decide). Segment 5 closes the
 * hero orbit (Decide → Declare) and fades out as the journey takes over.
 */
export function buildRoute(nodes: Pt[], e: number): Seg[] {
  const n = nodes as [Pt, Pt, Pt, Pt, Pt, Pt];
  const g0 = lerpPt(n[5], { x: 2 * n[0].x - n[1].x, y: 2 * n[0].y - n[1].y }, e);
  const g1 = lerpPt(n[0], { x: 2 * n[5].x - n[4].x, y: 2 * n[5].y - n[4].y }, e);
  return [
    toSeg(g0, n[0], n[1], n[2]),
    toSeg(n[0], n[1], n[2], n[3]),
    toSeg(n[1], n[2], n[3], n[4]),
    toSeg(n[2], n[3], n[4], n[5]),
    toSeg(n[3], n[4], n[5], g1),
    toSeg(n[4], n[5], n[0], n[1]),
  ];
}

const f1 = (v: number) => v.toFixed(1);
const P = (p: Pt) => `${f1(p.x)} ${f1(p.y)}`;
export const segTo = (s: Seg) => `C${P(s.c1)} ${P(s.c2)} ${P(s.p1)}`;

export function routeD(segs: Seg[], from: number, to: number): string {
  let d = `M${P(segs[from]!.p0)}`;
  for (let i = from; i < to; i++) d += segTo(segs[i]!);
  return d;
}

/** Position and arc-length for a param along the segment list. */
export function along(segs: Seg[], rawParam: number, count: number): { pt: Pt; len: number } {
  const param = Number.isFinite(rawParam) ? clamp(rawParam, 0, count) : 0;
  const i = Math.min(count - 1, Math.floor(param));
  const f = param >= count ? 1 : param - i;
  let len = 0;
  for (let k = 0; k < i; k++) len += segs[k]!.len;
  len += segs[i]!.len * f;
  return { pt: bez(segs[i]!, f), len };
}

export function totalLen(segs: Seg[], count: number): number {
  let sum = 0;
  for (let i = 0; i < count; i++) sum += segs[i]!.len;
  return sum;
}

/* ---------- deterministic decor ---------- */

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Topographic contour rings in unit space (origin-centred, y squashed). */
export function contourPaths(seed: number, count: number, r0: number, step: number): string[] {
  const rand = mulberry32(seed);
  const out: string[] = [];
  for (let k = 0; k < count; k++) {
    const r = r0 + k * step;
    const p1 = rand() * 6.28;
    const p2 = rand() * 6.28;
    const p3 = rand() * 6.28;
    const a1 = 0.1 + rand() * 0.05;
    const a2 = 0.05 + rand() * 0.04;
    const a3 = 0.025 + rand() * 0.02;
    const pts: string[] = [];
    const N = 84;
    for (let i = 0; i <= N; i++) {
      const th = (i / N) * Math.PI * 2;
      const rr = r * (1 + a1 * Math.sin(2 * th + p1 + k * 0.18) + a2 * Math.sin(3 * th + p2) + a3 * Math.sin(5 * th + p3));
      pts.push(`${(Math.cos(th) * rr).toFixed(1)} ${(Math.sin(th) * rr * 0.68).toFixed(1)}`);
    }
    out.push(`M${pts.join("L")}Z`);
  }
  return out;
}
