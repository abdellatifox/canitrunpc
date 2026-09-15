export const GPU_PATTERNS = [
  // NVIDIA RTX 50 Series
  { pattern: /RTX\s*5090/i, name: 'NVIDIA RTX 5090', slug: 'nvidia-rtx-5090' },
  { pattern: /RTX\s*5080/i, name: 'NVIDIA RTX 5080', slug: 'nvidia-rtx-5080' },
  { pattern: /RTX\s*5070/i, name: 'NVIDIA RTX 5070', slug: 'nvidia-rtx-5070' },
  // NVIDIA RTX 40 Series
  { pattern: /RTX\s*4090/i, name: 'NVIDIA RTX 4090', slug: 'nvidia-rtx-4090' },
  { pattern: /RTX\s*4080\s*SUPER/i, name: 'NVIDIA RTX 4080 SUPER', slug: 'nvidia-rtx-4080-super' },
  { pattern: /RTX\s*4080/i, name: 'NVIDIA RTX 4080', slug: 'nvidia-rtx-4080' },
  { pattern: /RTX\s*4070\s*Ti\s*SUPER/i, name: 'NVIDIA RTX 4070 Ti SUPER', slug: 'nvidia-rtx-4070-ti-super' },
  { pattern: /RTX\s*4070\s*Ti/i, name: 'NVIDIA RTX 4070 Ti', slug: 'nvidia-rtx-4070-ti' },
  { pattern: /RTX\s*4070\s*SUPER/i, name: 'NVIDIA RTX 4070 SUPER', slug: 'nvidia-rtx-4070-super' },
  { pattern: /RTX\s*4070/i, name: 'NVIDIA RTX 4070', slug: 'nvidia-rtx-4070' },
  { pattern: /RTX\s*4060\s*Ti/i, name: 'NVIDIA RTX 4060 Ti', slug: 'nvidia-rtx-4060-ti' },
  { pattern: /RTX\s*4060/i, name: 'NVIDIA RTX 4060', slug: 'nvidia-rtx-4060' },
  // NVIDIA RTX 30 Series
  { pattern: /RTX\s*3090\s*Ti/i, name: 'NVIDIA RTX 3090 Ti', slug: 'nvidia-rtx-3090-ti' },
  { pattern: /RTX\s*3090/i, name: 'NVIDIA RTX 3090', slug: 'nvidia-rtx-3090' },
  { pattern: /RTX\s*3080\s*Ti/i, name: 'NVIDIA RTX 3080 Ti', slug: 'nvidia-rtx-3080-ti' },
  { pattern: /RTX\s*3080/i, name: 'NVIDIA RTX 3080', slug: 'nvidia-rtx-3080' },
  { pattern: /RTX\s*3070\s*Ti/i, name: 'NVIDIA RTX 3070 Ti', slug: 'nvidia-rtx-3070-ti' },
  { pattern: /RTX\s*3070/i, name: 'NVIDIA RTX 3070', slug: 'nvidia-rtx-3070' },
  { pattern: /RTX\s*3060\s*Ti/i, name: 'NVIDIA RTX 3060 Ti', slug: 'nvidia-rtx-3060-ti' },
  { pattern: /RTX\s*3060/i, name: 'NVIDIA RTX 3060', slug: 'nvidia-rtx-3060' },
  { pattern: /RTX\s*3050/i, name: 'NVIDIA RTX 3050', slug: 'nvidia-rtx-3050' },
  // NVIDIA RTX 20 Series
  { pattern: /RTX\s*2080\s*Ti/i, name: 'NVIDIA RTX 2080 Ti', slug: 'nvidia-rtx-2080-ti' },
  { pattern: /RTX\s*2080\s*SUPER/i, name: 'NVIDIA RTX 2080 SUPER', slug: 'nvidia-rtx-2080-super' },
  { pattern: /RTX\s*2080/i, name: 'NVIDIA RTX 2080', slug: 'nvidia-rtx-2080' },
  { pattern: /RTX\s*2070\s*SUPER/i, name: 'NVIDIA RTX 2070 SUPER', slug: 'nvidia-rtx-2070-super' },
  { pattern: /RTX\s*2070/i, name: 'NVIDIA RTX 2070', slug: 'nvidia-rtx-2070' },
  { pattern: /RTX\s*2060\s*SUPER/i, name: 'NVIDIA RTX 2060 SUPER', slug: 'nvidia-rtx-2060-super' },
  { pattern: /RTX\s*2060/i, name: 'NVIDIA RTX 2060', slug: 'nvidia-rtx-2060' },
  // NVIDIA GTX 16 Series
  { pattern: /GTX\s*1660\s*Ti/i, name: 'NVIDIA GTX 1660 Ti', slug: 'nvidia-gtx-1660-ti' },
  { pattern: /GTX\s*1660\s*SUPER/i, name: 'NVIDIA GTX 1660 SUPER', slug: 'nvidia-gtx-1660-super' },
  { pattern: /GTX\s*1660/i, name: 'NVIDIA GTX 1660', slug: 'nvidia-gtx-1660' },
  { pattern: /GTX\s*1650\s*SUPER/i, name: 'NVIDIA GTX 1650 SUPER', slug: 'nvidia-gtx-1650-super' },
  { pattern: /GTX\s*1650/i, name: 'NVIDIA GTX 1650', slug: 'nvidia-gtx-1650' },
  // NVIDIA GTX 10 Series
  { pattern: /GTX\s*1080\s*Ti/i, name: 'NVIDIA GTX 1080 Ti', slug: 'nvidia-gtx-1080-ti' },
  { pattern: /GTX\s*1080/i, name: 'NVIDIA GTX 1080', slug: 'nvidia-gtx-1080' },
  { pattern: /GTX\s*1070\s*Ti/i, name: 'NVIDIA GTX 1070 Ti', slug: 'nvidia-gtx-1070-ti' },
  { pattern: /GTX\s*1070/i, name: 'NVIDIA GTX 1070', slug: 'nvidia-gtx-1070' },
  { pattern: /GTX\s*1060/i, name: 'NVIDIA GTX 1060', slug: 'nvidia-gtx-1060' },
  { pattern: /GTX\s*1050\s*Ti/i, name: 'NVIDIA GTX 1050 Ti', slug: 'nvidia-gtx-1050-ti' },
  
  // AMD Radeon RX 7000 Series
  { pattern: /RX\s*7900\s*XTX/i, name: 'AMD Radeon RX 7900 XTX', slug: 'amd-radeon-rx-7900-xtx' },
  { pattern: /RX\s*7900\s*XT/i, name: 'AMD Radeon RX 7900 XT', slug: 'amd-radeon-rx-7900-xt' },
  { pattern: /RX\s*7900\s*GRE/i, name: 'AMD Radeon RX 7900 GRE', slug: 'amd-radeon-rx-7900-gre' },
  { pattern: /RX\s*7800\s*XT/i, name: 'AMD Radeon RX 7800 XT', slug: 'amd-radeon-rx-7800-xt' },
  { pattern: /RX\s*7700\s*XT/i, name: 'AMD Radeon RX 7700 XT', slug: 'amd-radeon-rx-7700-xt' },
  { pattern: /RX\s*7600\s*XT/i, name: 'AMD Radeon RX 7600 XT', slug: 'amd-radeon-rx-7600-xt' },
  { pattern: /RX\s*7600/i, name: 'AMD Radeon RX 7600', slug: 'amd-radeon-rx-7600' },
  // AMD Radeon RX 6000 Series
  { pattern: /RX\s*6950\s*XT/i, name: 'AMD Radeon RX 6950 XT', slug: 'amd-radeon-rx-6950-xt' },
  { pattern: /RX\s*6900\s*XT/i, name: 'AMD Radeon RX 6900 XT', slug: 'amd-radeon-rx-6900-xt' },
  { pattern: /RX\s*6800\s*XT/i, name: 'AMD Radeon RX 6800 XT', slug: 'amd-radeon-rx-6800-xt' },
  { pattern: /RX\s*6800/i, name: 'AMD Radeon RX 6800', slug: 'amd-radeon-rx-6800' },
  { pattern: /RX\s*6750\s*XT/i, name: 'AMD Radeon RX 6750 XT', slug: 'amd-radeon-rx-6750-xt' },
  { pattern: /RX\s*6700\s*XT/i, name: 'AMD Radeon RX 6700 XT', slug: 'amd-radeon-rx-6700-xt' },
  { pattern: /RX\s*6700/i, name: 'AMD Radeon RX 6700', slug: 'amd-radeon-rx-6700' },
  { pattern: /RX\s*6650\s*XT/i, name: 'AMD Radeon RX 6650 XT', slug: 'amd-radeon-rx-6650-xt' },
  { pattern: /RX\s*6600\s*XT/i, name: 'AMD Radeon RX 6600 XT', slug: 'amd-radeon-rx-6600-xt' },
  { pattern: /RX\s*6600/i, name: 'AMD Radeon RX 6600', slug: 'amd-radeon-rx-6600' },
  { pattern: /RX\s*6500\s*XT/i, name: 'AMD Radeon RX 6500 XT', slug: 'amd-radeon-rx-6500-xt' },
  // AMD Radeon RX 5000 Series
  { pattern: /RX\s*5700\s*XT/i, name: 'AMD Radeon RX 5700 XT', slug: 'amd-radeon-rx-5700-xt' },
  { pattern: /RX\s*5700/i, name: 'AMD Radeon RX 5700', slug: 'amd-radeon-rx-5700' },
  { pattern: /RX\s*5600\s*XT/i, name: 'AMD Radeon RX 5600 XT', slug: 'amd-radeon-rx-5600-xt' },
  // AMD Radeon RX 500/400 Series
  { pattern: /RX\s*590/i, name: 'AMD Radeon RX 590', slug: 'amd-radeon-rx-590' },
  { pattern: /RX\s*580/i, name: 'AMD Radeon RX 580', slug: 'amd-radeon-rx-580' },
  { pattern: /RX\s*570/i, name: 'AMD Radeon RX 570', slug: 'amd-radeon-rx-570' },

  // Intel Arc Series
  { pattern: /Arc\s*A770/i, name: 'Intel Arc A770', slug: 'intel-arc-a770' },
  { pattern: /Arc\s*A750/i, name: 'Intel Arc A750', slug: 'intel-arc-a750' },
  { pattern: /Arc\s*A580/i, name: 'Intel Arc A580', slug: 'intel-arc-a580' },
  { pattern: /Arc\s*A380/i, name: 'Intel Arc A380', slug: 'intel-arc-a380' }
];

export function parseWebGLRenderer(renderer: string): { name: string; slug: string } | null {
  for (const gpu of GPU_PATTERNS) {
    if (gpu.pattern.test(renderer)) return { name: gpu.name, slug: gpu.slug };
  }
  return null;
}

export const RAM_SIZES = [2, 4, 6, 8, 12, 16, 24, 32, 48, 64];

export const QUALITY_LABELS: Record<string, string> = {
  ultra_rt: 'Ultra + Ray Tracing',
  ultra: 'Ultra',
  high: 'High',
  medium: 'Medium',
  low: 'Low'
};
