/**
 * Shared performance model.
 *
 * One model behind every tool, so /benchmarks, /fps-estimator, /upgrade-advisor
 * and the can-it-run matchup pages can never disagree with each other about the
 * same hardware pairing.
 */
import type { Cpu, Game, Gpu } from './db';

export const RES_FACTOR: Record<string, number> = {
  '1080p': 1.0,
  '1440p': 0.62,
  '4k': 0.36
};

export const PRESET_FACTOR: Record<string, number> = {
  low: 1.75,
  medium: 1.32,
  high: 1.0,
  ultra: 0.78,
  ultra_rt: 0.52
};

/** Rough average FPS for a GPU/CPU pair on a given game. */
export function estimateFps(
  game: Pick<Game, 'rec_gpu_score' | 'rec_cpu_score' | 'gpu_intensive' | 'cpu_intensive'>,
  gpuScore: number,
  cpuScore: number,
  res: string = '1080p',
  preset: string = 'high'
): number {
  const resF = RES_FACTOR[res] ?? 1;
  const preF = PRESET_FACTOR[preset] ?? 1;

  // 60fps at the recommended spec is the anchor point of the model.
  const gpuRatio = gpuScore / Math.max(1, game.rec_gpu_score);
  const cpuRatio = cpuScore / Math.max(1, game.rec_cpu_score);

  const gpuFps = 60 * Math.pow(gpuRatio, 1.05) * resF * preF;

  // The CPU sets a ceiling that barely moves with resolution — that is exactly
  // why CPU bottlenecks show up hardest at 1080p.
  const cpuCeiling = 60 * Math.pow(cpuRatio, 0.9) * (game.cpu_intensive ? 1.25 : 1.9) * preF;

  const fps = Math.min(gpuFps, cpuCeiling);
  return Math.max(5, Math.round(fps));
}

/**
 * Processor needed to keep a graphics card fully used.
 *
 * The two `perf` indices cannot be compared directly: cards are anchored at
 * RTX 4090 = 100 and spread widely, processors at Ryzen 7 9800X3D = 100 and
 * compress at the top. Comparing them raw called a Ryzen 5 5600 an even match
 * for an RTX 5080. Instead each point below pairs a card with the processor we
 * judge it needs at 1080p on high — the site's estimate, not a measurement:
 *
 *   GTX 1050 Ti (11) → Core i5-4460 (36)     GTX 1060 6GB (19) → Ryzen 5 1600 (40)
 *   RTX 3060 12GB (34) → Ryzen 5 3600 (55)   RTX 3070 (51) → Ryzen 5 5600 (67)
 *   RTX 4070 Ti SUPER (74) → Ryzen 7 7700 (79)   RTX 4090 (100) → Ryzen 7 7800X3D (95)
 *   RTX 5090 (128) → Ryzen 7 9800X3D (100)
 *
 * Higher resolutions cut the frames a card can draw, so the card is treated as
 * slower and needs less processor. The cut is gentler than the frame-rate
 * model's RES_FACTOR: fast cards still run high frame rates at 1440p, and the
 * processor has to keep up with those.
 */
const PAIRING_RES_FACTOR: Record<string, number> = { '1080p': 1, '1440p': 0.8, '4k': 0.6 };
const CPU_FOR_GPU: [gpuPerf: number, cpuPerf: number][] = [
  [0, 20], [11, 36], [19, 40], [34, 55], [51, 67], [74, 79], [100, 95], [128, 100]
];

export function cpuNeeded(gpuPerf: number, res: string = '1440p'): number {
  const g = gpuPerf * (PAIRING_RES_FACTOR[res] ?? 1);
  const pts = CPU_FOR_GPU;
  if (g >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
  for (let i = 1; i < pts.length; i++) {
    const [x1, y1] = pts[i - 1], [x2, y2] = pts[i];
    if (g <= x2) return y1 + ((g - x1) / (x2 - x1)) * (y2 - y1);
  }
  return pts[pts.length - 1][1];
}

/** Resolution at which pages that show no picker describe a pairing. */
export const PAIRING_RES = '1440p';

/**
 * Which part limits a pairing, and by how much. Takes `perf` values, not the
 * 0-100 display scores. Short of the processor the card needs, `percent` is the
 * share of the card left unused; above it, `percent` is spare processor headroom.
 * Within 10% either way counts as balanced.
 */
export function bottleneck(gpuPerf: number, cpuPerf: number, res: string = PAIRING_RES) {
  const needed = cpuNeeded(gpuPerf, res);
  if (cpuPerf < needed) {
    const percent = Math.round(((needed - cpuPerf) / needed) * 100);
    return { component: (percent < 10 ? 'balanced' : 'cpu') as 'balanced' | 'cpu' | 'gpu', percent, needed };
  }
  const percent = Math.round(((cpuPerf - needed) / Math.max(cpuPerf, 1)) * 100);
  return { component: (percent < 10 ? 'balanced' : 'gpu') as 'balanced' | 'cpu' | 'gpu', percent, needed };
}

/** A part's `perf`, falling back to its display score for rows built before `perf` existed. */
export const perfOf = (p: { perf?: number; score: number }) => p.perf ?? p.score;

export type Verdict = 'ultra' | 'recommended' | 'minimum' | 'below';

export function verdictFor(game: Game, gpu: Gpu | null, cpu: Cpu | null, ramGb: number): Verdict {
  const g = gpu?.score ?? 0;
  const c = cpu?.score ?? 0;
  const vram = gpu?.vram_gb ?? 0;

  const meetsMin = g >= game.min_gpu_score && c >= game.min_cpu_score
    && ramGb >= game.min_ram_gb && vram >= game.min_vram_gb;
  const meetsRec = g >= game.rec_gpu_score && c >= game.rec_cpu_score
    && ramGb >= game.rec_ram_gb && vram >= game.rec_vram_gb;

  if (!meetsMin) return 'below';
  if (!meetsRec) return 'minimum';
  if (g >= game.rec_gpu_score * 1.3 && c >= game.rec_cpu_score * 1.15) return 'ultra';
  return 'recommended';
}

export const VERDICT_COPY: Record<Verdict, { label: string; tone: string; blurb: string }> = {
  ultra:       { label: 'Runs great',      tone: 'pass', blurb: 'Comfortably above the recommended spec — expect high settings with headroom to spare.' },
  recommended: { label: 'Runs well',       tone: 'pass', blurb: 'Meets the recommended requirements. Expect a smooth experience at high settings.' },
  minimum:     { label: 'Playable',        tone: 'warn', blurb: 'Meets the minimum but not the recommended spec. Expect to drop settings or resolution.' },
  below:       { label: 'Below minimum',   tone: 'fail', blurb: 'Falls short of the minimum requirements. The game may not launch or will run poorly.' }
};

/** Suggested preset for a target frame rate. */
export function targetPreset(fpsAtHigh: number, target = 60): string {
  if (fpsAtHigh >= target * 1.4) return 'ultra';
  if (fpsAtHigh >= target) return 'high';
  if (fpsAtHigh * 1.32 >= target) return 'medium';
  return 'low';
}
