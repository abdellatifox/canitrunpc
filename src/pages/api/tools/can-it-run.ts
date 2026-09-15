export const prerender = false;
import type { APIRoute } from 'astro';
import { getGpu, getCpu } from '../../../lib/db';
import { getRequirements, type ReqSide } from '../../../lib/game-reqs';

const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export const OPTIONS: APIRoute = () => new Response(null, { status: 204, headers });

/** One requirement line's outcome. `null` state = the publisher did not state it. */
type CheckState = 'pass' | 'fail' | 'unknown';
interface Check {
  label: string;
  yours: string;
  required: string | null;
  state: CheckState;
}

function cmp(yours: number | null, needed: number | null): CheckState {
  if (needed == null || yours == null) return 'unknown';
  return yours >= needed ? 'pass' : 'fail';
}

/**
 * Compare against a clock/core requirement that names no specific chip.
 * Both stated dimensions must be met; a dimension the publisher left out is
 * simply not tested. If nothing was stated, the row stays unverified.
 */
function cpuFloorState(
  floor: { ghz: number | null; cores: number | null } | null | undefined,
  cpu: any
): CheckState {
  if (!floor || !cpu) return 'unknown';
  const checks: boolean[] = [];
  if (floor.ghz != null && cpu.boost_ghz) checks.push(cpu.boost_ghz >= floor.ghz);
  if (floor.cores != null && cpu.cores) checks.push(cpu.cores >= floor.cores);
  if (!checks.length) return 'unknown';
  return checks.every(Boolean) ? 'pass' : 'fail';
}

function buildChecks(side: ReqSide | null, gpu: any, cpu: any, ramGb: number): Check[] {
  if (!side) return [];
  return [
    {
      label: 'Graphics card',
      // Name only: the raw perf value differs from the 0-100 index shown on part pages.
      yours: gpu ? gpu.name : '—',
      // Show the publisher's wording, not our interpretation of it.
      required: side.rg ?? (side.gpu?.n ?? null),
      state: side.gpu ? cmp(gpu?.perf ?? null, side.gpu.p) : 'unknown'
    },
    {
      label: 'Processor',
      yours: cpu ? cpu.name : '—',
      required: side.rc ?? (side.cpu?.n ?? null),
      state: side.cpu
        ? cmp(cpu?.perf ?? null, side.cpu.p)
        // Older titles state a clock and core count instead of a model
        // ("2.0 GHz Dual Core"). That is still a real requirement, so compare
        // against it structurally rather than giving up.
        : cpuFloorState(side.cf, cpu)
    },
    {
      label: 'System memory',
      yours: `${ramGb} GB`,
      required: side.ram != null ? `${side.ram} GB` : null,
      state: cmp(ramGb, side.ram)
    },
    {
      label: 'Video memory',
      yours: gpu?.vram_gb ? `${gpu.vram_gb} GB` : '—',
      required: side.vram != null ? `${side.vram} GB` : null,
      state: cmp(gpu?.vram_gb ?? null, side.vram)
    },
    {
      label: 'Storage',
      yours: '—',
      required: side.sto != null ? `${side.sto} GB free` : null,
      state: 'unknown'
    }
  ];
}

const meets = (checks: Check[]) =>
  checks.some(c => c.state !== 'unknown') && checks.every(c => c.state !== 'fail');

export const POST: APIRoute = async (context) => {
  try {
    const body: any = await context.request.json().catch(() => ({}));
    const { game, gpu: gpuSlug, cpu: cpuSlug, ram } = body;
    const ramGb = Number(ram);

    if (!game || !gpuSlug || !Number.isFinite(ramGb)) {
      return new Response(
        JSON.stringify({ error: 'Pick a game, a graphics card and your memory size.' }),
        { status: 400, headers }
      );
    }

    const kv = (context.locals as any).runtime?.env?.TOOLS_KV;
    const [reqs, gpu, cpu] = await Promise.all([
      getRequirements(String(game), kv),
      getGpu(context.locals, String(gpuSlug)),
      cpuSlug ? getCpu(context.locals, String(cpuSlug)) : Promise.resolve(null)
    ]);

    if (!reqs) {
      return new Response(
        JSON.stringify({ error: 'We could not find published PC requirements for that game.' }),
        { status: 404, headers }
      );
    }
    if (!gpu) {
      return new Response(JSON.stringify({ error: 'Unknown graphics card.' }), { status: 404, headers });
    }

    const minChecks = buildChecks(reqs.min, gpu, cpu, ramGb);
    const recChecks = buildChecks(reqs.rec, gpu, cpu, ramGb);

    const meetsMin = reqs.min ? meets(minChecks) : false;
    const meetsRec = reqs.rec ? meets(recChecks) : false;

    // Headroom is only meaningful when the publisher named a part we know.
    const recPerf = reqs.rec?.gpu?.p ?? null;
    const headroom = recPerf && gpu.perf ? gpu.perf / recPerf : null;

    let verdict: string, tone: 'pass' | 'warn' | 'fail', detail: string;
    if (!reqs.min && !reqs.rec) {
      verdict = 'No published requirements';
      tone = 'warn';
      detail = 'The publisher has not stated PC requirements for this title, so there is nothing to check against.';
    } else if (!meetsMin) {
      const failed = minChecks.filter(c => c.state === 'fail').map(c => c.label.toLowerCase());
      verdict = 'Below minimum';
      tone = 'fail';
      detail = failed.length
        ? `Your ${failed.join(' and ')} ${failed.length > 1 ? 'fall' : 'falls'} short of the minimum the publisher states.`
        : 'Your system does not meet the stated minimum.';
    } else if (!reqs.rec) {
      // Plenty of older titles publish a minimum tier and nothing else. Judging
      // those as "playable but not recommended" is misleading — there is no
      // recommended tier to miss. Report against the only bar that exists.
      verdict = 'Runs well';
      tone = 'pass';
      detail = 'You clear the minimum specification, which is the only tier this publisher states for the title.';
    } else if (!meetsRec) {
      verdict = 'Playable';
      tone = 'warn';
      detail = 'You clear the minimum but not the recommended spec. Expect to lower settings or resolution.';
    } else if (headroom && headroom >= 1.35) {
      verdict = 'Runs comfortably';
      tone = 'pass';
      detail = 'You are comfortably above the recommended spec, with headroom for higher settings.';
    } else {
      verdict = 'Runs well';
      tone = 'pass';
      detail = 'You meet the recommended requirements the publisher states.';
    }

    const unknowns = [...minChecks, ...recChecks].filter(c => c.state === 'unknown' && c.label !== 'Storage');

    return new Response(JSON.stringify({
      game: { name: reqs.n, year: reqs.y, image: reqs.img, source: reqs.src, live: Boolean(reqs.live) },
      you: {
        gpu: { name: gpu.name, slug: gpu.slug, vramGb: gpu.vram_gb, tier: gpu.tier },
        cpu: cpu ? { name: cpu.name, slug: cpu.slug, tier: cpu.tier } : null,
        ramGb
      },
      verdict, tone, detail,
      meetsMin, meetsRec,
      minimum: reqs.min ? { checks: minChecks, os: reqs.min.os, directx: reqs.min.dx } : null,
      recommended: reqs.rec ? { checks: recChecks, os: reqs.rec.os, directx: reqs.rec.dx } : null,
      caveats: unknowns.length
        ? [`The publisher did not state ${[...new Set(unknowns.map(u => u.label.toLowerCase()))].join(' or ')} in a form we can compare, so those rows are marked unverified.`]
        : []
    }), { status: 200, headers });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Something went wrong running that check.' }), { status: 500, headers });
  }
};
