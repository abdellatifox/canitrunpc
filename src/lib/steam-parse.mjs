/**
 * Parses Steam's `pc_requirements` HTML into structured fields.
 *
 * Steam stores requirements as publisher-authored HTML, so the shape varies a
 * lot between titles. The reliable part is the `<strong>Label:</strong> value`
 * pattern inside list items; everything else (ordering, extra labels, missing
 * sections, free text) differs per publisher.
 *
 * We keep the publisher's original string for every field alongside anything we
 * manage to normalise, so the site can always show what the publisher actually
 * wrote rather than only our interpretation of it.
 */

/** Strip tags/entities down to readable text. */
export function htmlToText(html) {
  if (!html) return '';
  return String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

/** Canonical field name for the many labels publishers use. */
const LABEL_MAP = [
  [/^(os|operating system|os \*|系统)/i, 'os'],
  [/^(processor|cpu)/i, 'cpu'],
  [/^(memory|ram)/i, 'ram'],
  [/^(graphics|gpu|video card|video)/i, 'gpu'],
  [/^(directx|direct x)/i, 'directx'],
  [/^(storage|hard drive|hard disk space|hdd|disk space|available space)/i, 'storage'],
  [/^(sound|sound card)/i, 'sound'],
  [/^(network|internet)/i, 'network'],
  [/^(additional notes?|notes?)/i, 'notes'],
  [/^(vr support)/i, 'vr']
];

function canonicalLabel(raw) {
  const s = raw.replace(/[:：]\s*$/, '').trim();
  for (const [re, key] of LABEL_MAP) if (re.test(s)) return key;
  return null;
}

/**
 * Extract label/value pairs. Steam's markup is `<strong>Label:</strong> value`,
 * usually inside <li>, but some publishers use <br> separated lines instead.
 */
export function parseRequirementBlock(html) {
  if (!html) return null;

  const out = { raw: {} };

  // Primary: <strong>Label:</strong> value  (value runs until the next <strong> or list/line break)
  const re = /<strong>\s*([^<:]{2,40})\s*:?\s*<\/strong>\s*([\s\S]*?)(?=<strong>|<\/li>|<br\s*\/?>\s*<strong>|$)/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const key = canonicalLabel(m[1]);
    if (!key) continue;
    const value = htmlToText(m[2]).replace(/^[:\-\s]+/, '').trim();
    if (!value) continue;
    if (!out.raw[key]) out.raw[key] = value;   // first occurrence wins
  }

  // Fallback: plain "Label: value" lines for publishers who skip <strong>
  if (Object.keys(out.raw).length === 0) {
    for (const line of htmlToText(html).split('\n')) {
      const mm = line.match(/^\s*([A-Za-z ]{2,30})\s*:\s*(.+)$/);
      if (!mm) continue;
      const key = canonicalLabel(mm[1]);
      if (key && !out.raw[key]) out.raw[key] = mm[2].trim();
    }
  }

  /*
   * Last resort: some older titles — most of Valve's back catalogue — write the
   * whole requirement as one prose sentence behind a single "Minimum:" label:
   *
   *   <p><strong>Minimum:</strong> 500 mhz processor, 96mb ram, 16mb video card,
   *   Windows XP, Mouse, Keyboard, Internet Connection</p>
   *
   * There is no per-field structure to extract, but the requirement is still
   * genuinely published. Dropping it made these games look like they had no
   * stated requirements at all, so we keep the prose (the site shows the
   * publisher's exact words) and pull out the clauses we can identify.
   */
  if (Object.keys(out.raw).length === 0) {
    const text = htmlToText(html).replace(/^(minimum|recommended)\s*:?\s*/i, '').trim();
    if (text.length >= 12) {
      out.raw.prose = text;
      const clause = (re) => {
        const m = text.match(re);
        return m ? m[0].trim() : null;
      };
      // A clause runs to the next separator — but a full stop between digits is
      // a decimal point, not a separator. Splitting naively turned Portal's
      // "1.7 GHz Processor" into "7 GHz Processor", which is far worse than
      // reporting nothing at all.
      const S = '(?:[^,;.]|\\.(?=\\d))*';
      const cpu = clause(new RegExp(`${S}\\b(?:ghz|mhz|processor|cpu|pentium|athlon|core\\s*\\d)\\b${S}`, 'i'));
      const gpu = clause(new RegExp(`${S}\\b(?:video card|graphics|gpu|directx|geforce|radeon)\\b${S}`, 'i'));
      const ram = clause(new RegExp(`${S}\\b(?:ram|memory)\\b${S}`, 'i'));
      if (cpu) out.raw.cpu = cpu;
      if (gpu) out.raw.gpu = gpu;
      if (ram) out.raw.ram = ram;
    }
  }

  return Object.keys(out.raw).length ? out.raw : null;
}

/** "12 GB RAM" -> 12 ; "8192 MB RAM" -> 8 */
export function parseRamGb(text) {
  if (!text) return null;
  const gb = text.match(/(\d+(?:[.,]\d+)?)\s*GB/i);
  if (gb) {
    const v = parseFloat(gb[1].replace(',', '.'));
    if (v > 0 && v <= 256) return Math.round(v);
  }
  const mb = text.match(/(\d{3,6})\s*MB/i);
  if (mb) {
    const v = Math.round(parseInt(mb[1], 10) / 1024);
    if (v > 0 && v <= 256) return v;
  }
  return null;
}

/** "70 GB available space" -> 70 ; "500 MB" -> 1 (rounded up) */
export function parseStorageGb(text) {
  if (!text) return null;
  const gb = text.match(/(\d+(?:[.,]\d+)?)\s*GB/i);
  if (gb) {
    const v = parseFloat(gb[1].replace(',', '.'));
    if (v > 0 && v <= 2000) return Math.round(v);
  }
  const mb = text.match(/(\d+(?:[.,]\d+)?)\s*MB/i);
  if (mb) {
    const v = parseFloat(mb[1].replace(',', '.'));
    if (v > 0) return Math.max(1, Math.round(v / 1024));
  }
  return null;
}

/** VRAM stated inside a graphics line: "GTX 1060 6GB" -> 6 */
export function parseVramGb(text) {
  if (!text) return null;
  // Prefer an explicit VRAM mention over an incidental model-name number.
  const explicit = text.match(/(\d+(?:\.\d+)?)\s*GB\s*(?:of\s*)?(?:VRAM|Video (?:RAM|Memory)|dedicated)/i);
  if (explicit) {
    const v = parseFloat(explicit[1]);
    if (v > 0 && v <= 64) return Math.round(v);
  }
  const any = [...text.matchAll(/(\d+(?:\.\d+)?)\s*GB/gi)]
    .map(m => parseFloat(m[1]))
    .filter(v => v > 0 && v <= 64);
  if (any.length) return Math.round(Math.min(...any)); // the minimum stated card
  const mb = text.match(/(\d{3,5})\s*MB/i);
  if (mb) {
    const v = parseInt(mb[1], 10) / 1024;
    if (v > 0 && v <= 64) return Math.max(1, Math.round(v));
  }
  return null;
}

/** "Version 12" / "DirectX 11" -> "DirectX 12" */
export function parseDirectX(text) {
  if (!text) return null;
  const m = text.match(/(?:version\s*)?(\d{1,2})(?:\.\d)?/i);
  if (!m) return null;
  const v = parseInt(m[1], 10);
  if (v < 8 || v > 12) return null;
  return `DirectX ${v}`;
}

/** Normalise the OS line to something short and consistent. */
export function parseOs(text) {
  if (!text) return null;
  const t = text.replace(/\s+/g, ' ').trim();
  if (/windows\s*11/i.test(t)) return 'Windows 11';
  if (/windows\s*10/i.test(t)) return 'Windows 10';
  if (/windows\s*8/i.test(t)) return 'Windows 8';
  if (/windows\s*7/i.test(t)) return 'Windows 7';
  if (/windows/i.test(t)) return 'Windows';
  return t.slice(0, 60) || null;
}

/**
 * Split a requirement line that names several alternatives into individual
 * candidate part names: "GeForce GTX 1060 6GB or Radeon RX 580 8GB or Arc A380"
 * -> ["GeForce GTX 1060 6GB", "Radeon RX 580 8GB", "Arc A380"]
 */
export function splitAlternatives(text) {
  if (!text) return [];
  return String(text)
    .replace(/\([^)]*\)/g, ' ')          // drop parentheticals like "(or equivalent)"
    .split(/\s+or\s+|\s*\/\s*|\s*\|\s*|\s*,\s*(?=[A-Za-z])/i)
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(s => s.length >= 3 && s.length <= 90)
    .filter(s => !/^(equivalent|better|higher|greater|above|newer|any)$/i.test(s));
}

/** Full parse of a Steam appdetails record's pc_requirements. */
export function parsePcRequirements(pcReq) {
  if (!pcReq || typeof pcReq !== 'object') return { minimum: null, recommended: null };
  return {
    minimum: parseRequirementBlock(pcReq.minimum),
    recommended: parseRequirementBlock(pcReq.recommended)
  };
}

/**
 * Many older titles state their processor requirement with no model at all:
 * "2.0 GHz Dual Core", "1.7 GHz Processor or better", "Dual Core 2.4GHz".
 *
 * That is still a real, publisher-stated requirement — just expressed
 * structurally rather than as a part number. Rather than discard it, we extract
 * the core count and clock so a system can be compared against it directly.
 * Nothing is inferred: if neither a clock nor a core count is stated, this
 * returns null and the requirement stays unverified.
 */
/**
 * Many older titles state their processor requirement with no model at all:
 * "2.0 GHz Dual Core", "1.7 GHz Processor or better", "Dual Core 2.4GHz".
 *
 * That is still a real, publisher-stated requirement — just expressed
 * structurally rather than as a part number. Rather than discard it, we extract
 * the core count and clock so a system can be compared against it directly.
 * Nothing is inferred: if neither a clock nor a core count is stated, this
 * returns null and the requirement stays unverified.
 */
export function parseCpuFloor(text) {
  if (!text) return null;
  const t = String(text).toLowerCase();

  let ghz = null;
  const g = t.match(/(\d(?:[.,]\d+)?)\s*ghz/);
  if (g) {
    const v = parseFloat(g[1].replace(',', '.'));
    if (v >= 0.5 && v <= 6) ghz = v;
  } else {
    const m = t.match(/(\d{3,4})\s*mhz/);
    if (m) {
      const v = parseInt(m[1], 10) / 1000;
      if (v >= 0.5 && v <= 6) ghz = v;
    }
  }

  const CORE_WORDS = [
    [8, /(octa|eight)[\s-]?core|8[\s-]?core/],
    [6, /(hexa|six)[\s-]?core|6[\s-]?core/],
    [4, /(quad|four)[\s-]?core|4[\s-]?core/],
    [2, /(dual|two)[\s-]?core|2[\s-]?core/]
  ];
  let cores = null;
  for (const [n, re] of CORE_WORDS) {
    if (re.test(t)) { cores = n; break; }
  }

  if (ghz === null && cores === null) return null;
  return { ghz, cores };
}
