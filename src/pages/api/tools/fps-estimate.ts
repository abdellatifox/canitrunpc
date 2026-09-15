export const prerender = false;
import type { APIRoute } from 'astro';
import { getGpu, getCpu } from '../../../lib/db';
import { getRequirements } from '../../../lib/game-reqs';
import { FRAME_CAPS } from '../../../../data/frame-caps.mjs';

const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export const OPTIONS: APIRoute = () => new Response(null, { status: 204, headers });

const RES_FACTOR: Record<string, number> = { '1080p': 1.0, '1440p': 0.62, '4k': 0.36 };
const PRESET_FACTOR: Record<string, number> = { low: 1.75, medium: 1.32, high: 1.0, ultra: 0.78 };
const RES_LABEL: Record<string, string> = { '1080p': '1080p', '1440p': '1440p', '4k': '4K' };

/**
 * The model, stated plainly: a system that exactly meets the publisher's
 * recommended specification should reach roughly 60 FPS at 1080p on high. We
 * scale from that anchor by the ratio of the user's hardware to the requirement,
 * then apply resolution and preset factors, then cap by what the processor can
 * feed. The CPU ceiling barely moves with resolution, which is why a weak
 * processor shows up hardest at 1080p.
 */
function estimate(recGpuPerf: number, gpuPerf: number, cpuPerf: number | null, recCpuPerf: number | null, res: string, preset: string) {
  const resF = RES_FACTOR[res] ?? 1;
  const preF = PRESET_FACTOR[preset] ?? 1;

  const gpuFps = 60 * Math.pow(gpuPerf / Math.max(recGpuPerf, 1), 1.05) * resF * preF;

  let ceiling = Infinity;
  if (cpuPerf != null && recCpuPerf) {
    ceiling = 60 * Math.pow(cpuPerf / Math.max(recCpuPerf, 1), 0.9) * 1.6 * preF;
  }
  return { fps: Math.max(5, Math.round(Math.min(gpuFps, ceiling))), gpuFps, ceiling };
}

export const POST: APIRoute = async (context) => {
  try {
    const body: any = await context.request.json().catch(() => ({}));
    const res = ['1080p', '1440p', '4k'].includes(body.resolution) ? body.resolution : '1080p';
    const preset = ['low', 'medium', 'high', 'ultra'].includes(body.preset) ? body.preset : 'high';

    const kv = (context.locals as any).runtime?.env?.TOOLS_KV;
    const [reqs, gpu, cpu] = await Promise.all([
      getRequirements(String(body.game ?? ''), kv),
      getGpu(context.locals, String(body.gpu ?? '')),
      body.cpu ? getCpu(context.locals, String(body.cpu)) : Promise.resolve(null)
    ]);

    if (!reqs) return new Response(JSON.stringify({ error: 'We could not find published requirements for that game.' }), { status: 404, headers });
    if (!gpu) return new Response(JSON.stringify({ error: 'Pick your graphics card from the suggestions.' }), { status: 400, headers });

    // Without a resolved recommended GPU there is no anchor, and guessing one
    // would be exactly the invented number this rebuild exists to avoid.
    const recGpuPerf = reqs.rec?.gpu?.p ?? reqs.min?.gpu?.p ?? null;
    if (!recGpuPerf) {
      return new Response(JSON.stringify({
        error: `The publisher's requirements for ${reqs.n} do not name a graphics card we can measure against (they read "${reqs.min?.rg ?? reqs.rec?.rg ?? 'unspecified'}"), so we cannot estimate a frame rate for it.`
      }), { status: 422, headers });
    }

    const usedMin = !reqs.rec?.gpu?.p;
    const recCpuPerf = reqs.rec?.cpu?.p ?? reqs.min?.cpu?.p ?? null;
    const gpuPerf = gpu.perf ?? gpu.score;
    const cpuPerf = cpu ? (cpu.perf ?? cpu.score) : null;

    // An engine cap overrides the model entirely: no hardware exceeds it.
    const cap = (FRAME_CAPS as Record<string, { fps: number; note: string }>)[String(reqs.a)] ?? null;
    const applyCap = (n: number) => (cap ? Math.min(n, cap.fps) : n);

    const main = estimate(recGpuPerf, gpuPerf, cpuPerf, recCpuPerf, res, preset);
    main.fps = applyCap(main.fps);

    const table = (['1080p', '1440p', '4k'] as const).map(r => {
      const e = estimate(recGpuPerf, gpuPerf, cpuPerf, recCpuPerf, r, preset);
      const fps = applyCap(e.fps);
      return {
        resolution: RES_LABEL[r],
        fps,
        low: Math.max(5, Math.round(applyCap(fps * 0.85))),
        high: applyCap(Math.round(fps * 1.15)),
        current: r === res
      };
    });

    const limitedBy = cap && main.fps >= cap.fps
      ? `Capped at ${cap.fps} FPS by the game itself`
      : cpuPerf == null
      ? 'Graphics-card estimate only — add your processor for a ceiling'
      : main.ceiling < main.gpuFps
        ? `Limited by the ${cpu!.name}`
        : `Limited by the ${gpu.name}`;

    return new Response(JSON.stringify({
      fps: main.fps,
      low: Math.max(5, applyCap(Math.round(main.fps * 0.85))),
      high: applyCap(Math.round(main.fps * 1.15)),
      resolution: RES_LABEL[res],
      preset: preset.charAt(0).toUpperCase() + preset.slice(1),
      limitedBy,
      table,
      game: { name: reqs.n, source: reqs.src },
      note: `${cap ? cap.note + ' ' : ''}Anchored to the ${usedMin ? 'minimum' : 'recommended'} specification the publisher states for ${reqs.n}. These are modelled estimates, not captured benchmark runs — see our <a href="/editorial-standards">methodology</a>.`
    }), { status: 200, headers });
  } catch {
    return new Response(JSON.stringify({ error: 'Something went wrong.' }), { status: 500, headers });
  }
};
