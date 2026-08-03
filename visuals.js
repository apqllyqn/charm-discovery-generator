// Drawn art for the deck. Everything here is inline SVG or CSS, no binary
// assets and no network calls, so a slide can never render half-loaded in
// front of a prospect.
//
// Two kinds live here:
//   fixed    - the same every deck (funnel, channel mesh, waveform)
//   derived  - drawn from generated deck data (added in the data-visual pass)
//
// Colours come through as currentColor or explicit vars so the same shape can
// sit on paper or on ink without a second copy.

// Paper grain, lifted from the Focal proposal so the two documents share a
// surface. Applied via the .grain class in deck.js.
export const GRAIN_URI =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.05 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")";

// ---------------------------------------------------------------- funnel
// Top of funnel is the widest band and the only lit one. The two below are
// drawn but dimmed, because the deck is not about them and saying so visually
// is faster than saying it out loud.

// The viewBox is wider than the funnel so the "you are here" callout has room
// to live inside the art. It was a positioned HTML element and got clipped by
// the slide edge, which is exactly the kind of thing nobody notices until it is
// on a screen share.
export function funnel() {
  return `
<svg class="art art-funnel" viewBox="0 0 610 300" role="img" aria-label="A funnel with the awareness band at the top lit and the lower bands dimmed">
  <defs>
    <linearGradient id="fn-lit" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="var(--accent)"/>
      <stop offset="100%" stop-color="var(--accent-2)"/>
    </linearGradient>
  </defs>

  <!-- awareness -->
  <path d="M8 14 H452 L372 104 H88 Z" fill="url(#fn-lit)"/>
  <text x="230" y="66" class="fn-label fn-label-lit">AWARENESS</text>

  <!-- consideration -->
  <path d="M92 118 H368 L322 200 H138 Z" fill="none" stroke="var(--line-strong)" stroke-width="1.5"/>
  <text x="230" y="164" class="fn-label">CONSIDERATION</text>

  <!-- decision -->
  <path d="M142 214 H318 L286 288 H174 Z" fill="none" stroke="var(--line)" stroke-width="1.5"/>
  <text x="230" y="257" class="fn-label fn-label-faint">DECISION</text>

  <!-- you are here -->
  <circle cx="446" cy="59" r="3.5" fill="var(--accent)"/>
  <line x1="446" y1="59" x2="486" y2="59" stroke="var(--accent)" stroke-width="1.5"/>
  <text x="494" y="63" class="fn-here">YOU ARE HERE</text>
</svg>`;
}

// ---------------------------------------------------------------- channels
// Three channels running down into one operator. The convergence is the point:
// it is the difference between an agency and three vendors, drawn.

export function channelMesh({ dimPhone = false } = {}) {
  const node = (x, label, dim) => `
  <g class="${dim ? 'ch-node ch-dim' : 'ch-node'}">
    <rect x="${x - 58}" y="10" width="116" height="46" rx="23"
          fill="var(--paper)" stroke="${dim ? 'var(--line)' : 'var(--accent)'}" stroke-width="1.5"/>
    <text x="${x}" y="38" class="ch-label">${label}</text>
  </g>`;

  // Curves from each node down into the mark.
  const line = (x, dim) =>
    `<path d="M${x} 56 C ${x} 110, 230 110, 230 168" fill="none"
       stroke="${dim ? 'var(--line)' : 'var(--accent)'}" stroke-width="1.5"
       ${dim ? 'stroke-dasharray="3 4"' : ''} opacity="${dim ? 0.5 : 0.85}"/>`;

  return `
<svg class="art art-mesh" viewBox="0 0 460 250" role="img" aria-label="Email, LinkedIn and phone converging into one team">
  ${line(80, false)}
  ${line(230, false)}
  ${line(380, dimPhone)}

  ${node(80, 'Email', false)}
  ${node(230, 'LinkedIn', false)}
  ${node(380, 'Phone', dimPhone)}

  <rect x="146" y="168" width="168" height="58" rx="12" fill="var(--ink)"/>
  <text x="230" y="197" class="ch-core">ONE TEAM</text>
  <text x="230" y="213" class="ch-core-sub">not three vendors</text>
</svg>`;
}

// ---------------------------------------------------------------- waveform
// The thesis of the deck in one picture. A scream crosses the line where
// everyone else starts selling. A wince never does, and is still pain.

const THRESHOLD = 52;
const BASE = 104;

// A burst: silence, one spike, a short decay, silence.
const SCREAM_PATH =
  'M0 104 H150 l7 -5 l5 9 l6 -84 l7 92 l6 -46 l7 50 l6 -22 l7 25 l6 -11 l7 12 H460';

// A tremor that never stops and never spikes. Built by hand rather than
// generated so it reads as organic instead of as a sine wave.
const WINCE_PATH = [
  'M0 104',
  'q 12 -9 24 -1', 'q 11 8 22 -2', 'q 10 -10 21 -3', 'q 12 9 23 1',
  'q 11 -11 22 -2', 'q 12 10 23 0', 'q 10 -8 21 -4', 'q 12 11 24 2',
  'q 11 -12 22 -3', 'q 12 9 23 1', 'q 10 -9 21 -2', 'q 12 10 23 0',
  'q 11 -10 22 -3', 'q 12 8 23 2', 'q 10 -11 21 -1', 'q 12 9 23 3',
  'q 11 -8 22 -2', 'q 12 10 24 0',
].join(' ');

function wave({ path, klass, caption }) {
  return `
<svg class="art art-wave ${klass}" viewBox="0 0 460 130" preserveAspectRatio="none"
     role="img" aria-label="${caption}">
  <line x1="0" y1="${THRESHOLD}" x2="460" y2="${THRESHOLD}"
        stroke="var(--wave-threshold)" stroke-width="1" stroke-dasharray="4 5"/>
  <line x1="0" y1="${BASE}" x2="460" y2="${BASE}" stroke="var(--wave-base)" stroke-width="1"/>
  <path d="${path}" fill="none" stroke="var(--wave-ink)" stroke-width="2"
        stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
</svg>`;
}

export const screamWave = () =>
  wave({ path: SCREAM_PATH, klass: 'wave-loud', caption: 'One sharp spike that crosses the line' });

export const winceWave = () =>
  wave({ path: WINCE_PATH, klass: 'wave-quiet', caption: 'A constant low tremor that never crosses the line' });

// ---------------------------------------------------------------- lockup
// Their mark beside ours on the cover. Sourced from the public favicon service
// so it needs no research pass and no stored asset. If it 404s the element
// removes itself and the cover falls back to the Charm mark alone, which is
// why the fallback is inline rather than a stylesheet rule.

export function lockup(domain, charmLogo) {
  const safe = String(domain || '').replace(/[^a-z0-9.\-]/gi, '');
  if (!safe) return `<img class="lk-mark" src="${charmLogo}" alt="Charm">`;
  // DuckDuckGo, not Google. Google's favicon endpoint never 404s: it serves a
  // generic globe for domains it does not know, so an onerror fallback never
  // fires and the cover shows a placeholder that reads as "we got your logo
  // wrong". DuckDuckGo 404s, so a miss collapses to the Charm mark alone.
  // A missing mark is invisible. A wrong mark is not.
  return `
<div class="lockup">
  <img class="lk-them" src="https://icons.duckduckgo.com/ip3/${safe}.ico"
       alt="" onerror="this.closest('.lockup').classList.add('lk-solo')">
  <span class="lk-x">&times;</span>
  <img class="lk-mark" src="${charmLogo}" alt="Charm">
</div>`;
}
