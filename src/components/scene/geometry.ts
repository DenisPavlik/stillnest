/**
 * Deterministic geometry for every generated scene.
 *
 * Server and client must produce byte-identical path data or hydration drifts,
 * so nothing in here may touch Math.random(), Date, or anything else that is
 * not a pure function of its arguments. Coordinates are rounded to one decimal
 * for the same reason: it keeps the emitted strings short and stable.
 */

/** mulberry32 — small, fast, and identical everywhere. */
export function seeded(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stable seed from a slug, so two houses never generate the same trees. */
export function hashSeed(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const f1 = (n: number): string => n.toFixed(1);

/** One spruce: narrow, many small tiers, a shallow notch. Never a triangle,
    never a diamond — at this scale the branches are texture, not shape. */
export function spruce(cx: number, base: number, h: number, rand: () => number): string {
  const tiers = 11 + Math.floor(rand() * 6);
  const half = h * (0.115 + rand() * 0.055);
  const step = h / tiers;
  const left: string[] = [];
  const right: string[] = [];

  for (let k = 0; k < tiers; k += 1) {
    const t = k / tiers;
    const w = half * Math.pow(1 - t, 0.7) * (0.88 + rand() * 0.24);
    const y = base - step * k;
    const inner = w * 0.58;
    const notch = y - step * 0.66;
    left.push(`L${f1(cx - w)} ${f1(y)}`, `L${f1(cx - inner)} ${f1(notch)}`);
    right.unshift(`L${f1(cx + inner)} ${f1(notch)}`, `L${f1(cx + w)} ${f1(y)}`);
  }

  return [
    `M${f1(cx - half * 0.16)} ${f1(base + h * 0.02)}`,
    `L${f1(cx - half)} ${f1(base)}`,
    ...left,
    `L${f1(cx)} ${f1(base - h)}`,
    ...right,
    `L${f1(cx + half)} ${f1(base)}`,
    `L${f1(cx + half * 0.16)} ${f1(base + h * 0.02)}`,
    "Z",
  ].join("");
}

/** A band of spruce across a width — aerial perspective is done by the caller. */
export function band(o: {
  seed: number;
  count: number;
  base: number;
  from: number;
  to: number;
  minH: number;
  maxH: number;
}): string {
  const rand = seeded(o.seed);
  const span = o.to - o.from;
  let d = "";
  for (let i = 0; i < o.count; i += 1) {
    const cx = o.from + (span * (i + 0.5 * rand())) / o.count;
    const h = o.minH + Math.pow(rand(), 1.35) * (o.maxH - o.minH);
    d += spruce(cx, o.base + rand() * 6, h, rand);
  }
  return d;
}

/** A tapering trunk — the foreground framing of the hero. */
export function trunk(
  x: number,
  wb: number,
  wt: number,
  top: number,
  bottom: number,
  lean: number,
): string {
  const c1 = bottom + (top - bottom) * 0.34;
  const c2 = bottom + (top - bottom) * 0.72;
  return [
    `M${f1(x - wb / 2)} ${f1(bottom)}`,
    `C${f1(x - wb / 2 + lean * 0.14)} ${f1(c1)} ${f1(x - wt / 2 + lean * 0.62)} ${f1(c2)} ${f1(x - wt / 2 + lean)} ${f1(top)}`,
    `L${f1(x + wt / 2 + lean)} ${f1(top)}`,
    `C${f1(x + wt / 2 + lean * 0.62)} ${f1(c2)} ${f1(x + wb / 2 + lean * 0.14)} ${f1(c1)} ${f1(x + wb / 2)} ${f1(bottom)}`,
    "Z",
  ].join("");
}

/** A ridge line: two sine terms plus a little grit, sampled every 20 units. */
export function ridge(o: {
  seed: number;
  from: number;
  to: number;
  base: number;
  crest: number;
  amplitude: number;
}): string {
  const rand = seeded(o.seed);
  let d = `M${o.from} ${f1(o.base)}`;
  for (let x = o.from; x <= o.to; x += 20) {
    const y =
      o.crest -
      o.amplitude * Math.sin(x / 210 + 0.6) -
      o.amplitude * 0.38 * Math.sin(x / 88 + 2.1) -
      rand() * 6;
    d += `L${x} ${f1(y)}`;
  }
  return `${d}L${o.to} ${f1(o.base)}Z`;
}
