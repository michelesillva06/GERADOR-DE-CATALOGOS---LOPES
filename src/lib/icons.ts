/**
 * Renders a handful of Lucide icon paths (the same set the rest of this app's UI uses) as
 * data-URI <img> sources instead of React components. html2canvas has an unreliable async race
 * when it has to internally convert inline <svg> elements to images before capture — some icons
 * were silently missing from the final PNG. A real <img> tag from the start sidesteps that
 * conversion step entirely and lets the code explicitly wait for it to load before capturing.
 */

type IconNode = { d: string } | { cx: number; cy: number; r: number };

function nodeMarkup(node: IconNode): string {
  if ('cx' in node) return `<circle cx="${node.cx}" cy="${node.cy}" r="${node.r}"/>`;
  return `<path d="${node.d}"/>`;
}

function buildIconDataUri(nodes: IconNode[], color: string, size = 48): string {
  const inner = nodes.map(nodeMarkup).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// Path data copied directly from lucide-react (same icon set used everywhere else in this app).
const NODES = {
  house: [
    { d: 'M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8' },
    { d: 'M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' }
  ],
  bed: [
    { d: 'M2 4v16' },
    { d: 'M2 8h18a2 2 0 0 1 2 2v10' },
    { d: 'M2 17h20' },
    { d: 'M6 8v9' }
  ],
  bath: [
    { d: 'M10 4 8 6' },
    { d: 'M17 19v2' },
    { d: 'M2 12h20' },
    { d: 'M7 19v2' },
    { d: 'M9 5 7.621 3.621A2.121 2.121 0 0 0 4 5v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5' }
  ],
  car: [
    { d: 'M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2' },
    { cx: 7, cy: 17, r: 2 },
    { d: 'M9 17h6' },
    { cx: 17, cy: 17, r: 2 }
  ],
  maximize: [
    { d: 'M8 3H5a2 2 0 0 0-2 2v3' },
    { d: 'M21 8V5a2 2 0 0 0-2-2h-3' },
    { d: 'M3 16v3a2 2 0 0 0 2 2h3' },
    { d: 'M16 21h3a2 2 0 0 0 2-2v-3' }
  ],
  mapPin: [
    { d: 'M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0' },
    { cx: 12, cy: 10, r: 3 }
  ]
} satisfies Record<string, IconNode[]>;

export function iconDataUri(name: keyof typeof NODES, color: string, size = 48): string {
  return buildIconDataUri(NODES[name], color, size);
}
