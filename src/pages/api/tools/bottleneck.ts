export const prerender = false;
import type { APIRoute } from 'astro';
import { getGpu, getCpu, getGpus, getCpus } from '../../../lib/db';
import { bottleneck, cpuNeeded, perfOf } from '../../../lib/perf';

const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export const OPTIONS: APIRoute = () => new Response(null, { status: 204, headers });

const esc = (s: string) =>
  s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

export const POST: APIRoute = async (context) => {
  try {
    const body: any = await context.request.json().catch(() => ({}));
    const resolution = ['1080p', '1440p', '4k'].includes(body.resolution) ? body.resolution : '1440p';
    const resLabel = resolution === '4k' ? '4K' : resolution;

    const [cpu, gpu] = await Promise.all([
      getCpu(context.locals, String(body.cpu ?? '')),
      getGpu(context.locals, String(body.gpu ?? ''))
    ]);
    if (!cpu || !gpu) {
      return new Response(JSON.stringify({ error: 'Pick both parts from the suggestions.' }), { status: 400, headers });
    }

    const cpuPerf = perfOf(cpu);
    const gpuPerf = perfOf(gpu);
    // One model for the whole site (src/lib/perf.ts), so this tool, the CPU
    // pages and the CPU comparison cannot disagree about a pairing.
    const { component: limiter, percent: pct, needed } = bottleneck(gpuPerf, cpuPerf, resolution);

    /* The two directions are not symmetrical. Short of what the card needs, part
       of the card goes unused — worth fixing. Above it, the card is fully used,
       which is the healthy state; that is reported as processor headroom, never
       as an alarming "GPU bottleneck" percentage. */
    const severity = limiter === 'cpu' ? (pct >= 25 ? 'bad' : 'mild') : 'ok';
    const headline = limiter === 'balanced'
      ? `Well matched at ${resLabel}`
      : limiter === 'cpu'
        ? `Processor holds the card back ~${pct}% at ${resLabel}`
        : `Card is the limit at ${resLabel} — ${pct}% processor headroom`;

    const cpuName = esc(cpu.name), gpuName = esc(gpu.name);
    const detail = limiter === 'balanced'
      ? `At ${resLabel} the <b>${cpuName}</b> keeps the <b>${gpuName}</b> busy without much to spare either way. Neither part is wasting the other.`
      : limiter === 'cpu'
        ? `At ${resLabel} the <b>${cpuName}</b> can’t prepare frames as fast as the <b>${gpuName}</b> can draw them, so roughly ${pct}% of the card sits idle in busy scenes. Lowering graphics settings won’t win that back.`
        : `At ${resLabel} the <b>${gpuName}</b> sets the frame rate and the <b>${cpuName}</b> has about ${pct}% in reserve. That is the better way round to be unbalanced: the card you paid for is fully used.`;

    const desktop = (await getGpus(context.locals)).filter(g => !/laptop/i.test(g.name));
    const cpus = await getCpus(context.locals);
    const latestGpu = Math.max(...desktop.map(g => g.release_year));
    const latestCpu = Math.max(...cpus.map(c => c.release_year));

    const advice: string[] = [];
    if (limiter === 'cpu') {
      // The lowest-rated recent processor that clears what this card needs.
      const pick = cpus.filter(c => c.release_year >= latestCpu - 3 && c.cores >= 6 && perfOf(c) >= needed)
        .sort((a, b) => perfOf(a) - perfOf(b))[0];
      if (pick) advice.push(`A processor at the level of the <a href="/cpu/${pick.slug}">${esc(pick.name)}</a> or above would keep this card fed at ${resLabel}.`);
      if (resolution !== '4k') advice.push(`A higher resolution moves load onto the card: this pair is closer to even at ${resolution === '1080p' ? '1440p' : '4K'}.`);
      if (cpu.cores < 6) advice.push(`With <b>${cpu.cores} cores</b> the ${cpuName} is under the six most new games are built around.`);
    } else if (limiter === 'gpu') {
      // The fastest recent card this processor can still feed at this resolution.
      const top = desktop.filter(g => g.release_year >= latestGpu - 3 && cpuNeeded(perfOf(g), resolution) <= cpuPerf)
        .sort((a, b) => perfOf(b) - perfOf(a))[0];
      if (top && perfOf(top) > gpuPerf) advice.push(`The ${cpuName} could feed a card up to about the <a href="/gpu/${top.slug}">${esc(top.name)}</a> at ${resLabel}, so a graphics card upgrade is where extra frames come from.`);
      advice.push('Upscaling (DLSS, FSR or XeSS) raises frame rate when the card is the limit — see <a href="/dlss-fsr">how the modes compare</a>.');
    } else {
      advice.push('Nothing here is overdue. If you want more frames later, upgrade both parts together so they stay matched.');
    }
    advice.push('Games differ: check a specific title in <a href="/can-it-run">Can I Run It?</a> before buying.');

    // Bars: what the processor has against what the card needs, on the processor scale.
    const peak = Math.max(cpuPerf, needed, 1);
    return new Response(JSON.stringify({
      headline, severity, limiter, percent: pct, resolution, detail, advice,
      cpu: { name: cpu.name, slug: cpu.slug, score: cpu.score },
      gpu: { name: gpu.name, slug: gpu.slug, score: gpu.score },
      cpuHas: Math.round(cpuPerf),
      cpuNeeded: Math.round(needed),
      cpuBar: Math.round(Math.min(100, (cpuPerf / peak) * 100)),
      gpuBar: Math.round(Math.min(100, (needed / peak) * 100)),
      note: 'Our estimate of how much processor each card needs, adjusted for resolution. Real results vary by game — strategy and simulation games lean on the processor far harder than most shooters.'
    }), { status: 200, headers });
  } catch {
    return new Response(JSON.stringify({ error: 'Something went wrong.' }), { status: 500, headers });
  }
};
