export const prerender = false;
import type { APIRoute } from 'astro';
import { getGpu, getCpu } from '../../../lib/db';
import { allBundledGames, type ReqSide } from '../../../lib/game-reqs';

const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export const OPTIONS: APIRoute = () => new Response(null, { status: 204, headers });

type Verdict = 'pass' | 'fail' | 'unknown';

/**
 * Same comparison rules as /api/tools/can-it-run, collapsed to a single
 * pass/fail/unknown per tier instead of a line-by-line table: a dimension the
 * publisher did not state is simply not tested, and a tier only counts as met
 * once at least one real dimension has been checked and none of them failed.
 */
function assess(side: ReqSide | null, gpuPerf: number, cpu: any, ramGb: number): Verdict {
  if (!side) return 'unknown';
  const checks: boolean[] = [];

  if (side.gpu) checks.push(gpuPerf >= side.gpu.p);
  if (side.cpu) {
    if (cpu?.perf != null) checks.push(cpu.perf >= side.cpu.p);
  } else if (side.cf) {
    if (cpu) {
      const dims: boolean[] = [];
      if (side.cf.ghz != null && cpu.boost_ghz) dims.push(cpu.boost_ghz >= side.cf.ghz);
      if (side.cf.cores != null && cpu.cores) dims.push(cpu.cores >= side.cf.cores);
      if (dims.length) checks.push(dims.every(Boolean));
    }
  }
  if (side.ram != null) checks.push(ramGb >= side.ram);

  if (!checks.length) return 'unknown';
  return checks.every(Boolean) ? 'pass' : 'fail';
}

export const POST: APIRoute = async (context) => {
  try {
    const body: any = await context.request.json().catch(() => ({}));
    const { gpu: gpuSlug, cpu: cpuSlug, ram } = body;
    const ramGb = Number(ram);

    if (!gpuSlug || !Number.isFinite(ramGb)) {
      return new Response(
        JSON.stringify({ error: 'Pick your graphics card and system memory.' }),
        { status: 400, headers }
      );
    }

    const [gpu, cpu] = await Promise.all([
      getGpu(context.locals, String(gpuSlug)),
      cpuSlug ? getCpu(context.locals, String(cpuSlug)) : Promise.resolve(null)
    ]);

    if (!gpu) {
      return new Response(JSON.stringify({ error: 'Unknown graphics card.' }), { status: 404, headers });
    }

    const results = { ultra: [] as any[], high: [] as any[], medium: [] as any[] };
    let belowCount = 0;

    for (const g of allBundledGames()) {
      if (!g.min && !g.rec) continue;

      const minState = assess(g.min, gpu.perf, cpu, ramGb);
      const recState = assess(g.rec, gpu.perf, cpu, ramGb);

      // No tier the publisher stated actually failed — but "unknown" alone
      // is not a pass, so a title with nothing comparable is left out rather
      // than counted as compatible on no evidence.
      const meetsMin = minState === 'pass' || (minState === 'unknown' && recState === 'pass');
      if (minState === 'fail' || (minState === 'unknown' && recState === 'fail') || !meetsMin) {
        if (minState === 'fail' || recState === 'fail') belowCount++;
        continue;
      }

      const entry = { name: g.n, appid: g.a, year: g.y, image: g.img, slug: String(g.a) };

      if (recState === 'pass') {
        const recPerf = g.rec?.gpu?.p ?? null;
        const headroom = recPerf ? gpu.perf / recPerf : null;
        (headroom && headroom >= 1.35 ? results.ultra : results.high).push(entry);
      } else {
        results.medium.push(entry);
      }
    }

    const cap = (arr: any[]) => arr.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 120);

    return new Response(JSON.stringify({
      you: { gpu: { name: gpu.name, slug: gpu.slug }, cpu: cpu ? { name: cpu.name, slug: cpu.slug } : null, ramGb },
      counts: { ultra: results.ultra.length, high: results.high.length, medium: results.medium.length, below: belowCount },
      games: {
        ultra: cap(results.ultra),
        high: cap(results.high),
        medium: cap(results.medium)
      }
    }), { status: 200, headers });
  } catch {
    return new Response(JSON.stringify({ error: 'Something went wrong running that check.' }), { status: 500, headers });
  }
};
