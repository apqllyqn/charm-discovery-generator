// Renders a personalized discovery deck from generated deck data.
// One self-contained HTML file, 16:9, keyboard driven.
//
// Design language is deliberately the same as the Focal proposal: cream paper,
// grain, Instrument Serif for statements, Geist Mono for labels, numbered
// sections. The deck is the piece before the proposal, so the two should read
// as one document set rather than two vendors.
//
// Sizing is in container query units against #deck, not vh. The deck box is
// letterboxed to 16:9, so vh only matched the box on wide windows and overflowed
// on tall ones.

import { BRAND, PROOF } from './brand.js';
import {
  GRAIN_URI,
  funnel,
  channelMesh,
  screamWave,
  winceWave,
  lockup,
} from './visuals.js';

const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const nl2br = (v) => esc(v).replace(/\n/g, '<br>');

const NOTES = {
  cover: 'Hold here while they settle. Say their company name out loud. Nothing else on this slide on purpose.',
  proof: 'Ten seconds, not sixty. They came from a cold email and do not know us yet. Read one number, not four, then move. "That is the last time I talk about us."',
  tof: 'Ask it as a real question. "What are we actually doing at the top of the funnel?" Wait. Then answer: generate awareness, educate.',
  how: 'One word answer. Channels. Let it land before you list them.',
  channels: 'Three channels, one team. Point at the convergence. This is where you say we are operators, not a tool.',
  turn: 'The narrowing. Phone is real but it is not today. Today is awareness through email and LinkedIn.',
  world: 'Read their world back to them. If you got something wrong here, that is a gift. Let them correct you.',
  segments: 'Ask which segment they would start with. Their answer tells you where the real pipeline pressure is.',
  things: 'Count them on your fingers. Three. When you hit the signals line under the words, do NOT explain it. Say "more on that in a minute" and keep moving. The curiosity is the point.',
  sequence: 'The key word is intertwined. Not three vendors, not three campaigns. One system per prospect, all running at once.',
  cool: 'Slow down. This is the turn of the whole deck. "But this is where it gets cool."',
  kid: 'Tell it like a story, not a slide. Everyone with kids nods here. Point at the dotted line: that is where every other agency starts selling. The wince never crosses it, and it is still pain.',
  signals: 'These are theirs, not generic. Ask which one they would want us watching first.',
  touches: 'Real copy, triggered by a real signal. Do not defend the copy. Ask what they would change.',
  read: 'Slow. This is the read. End on the question and then stop talking.',
  close: 'Two calls. This one was the read. The next one is the remedy. Pull up the calendar while this is on screen.',
};

function slide(id, notes, inner, klass = '') {
  return `<section class="slide ${klass}" data-id="${esc(id)}" data-notes="${esc(notes)}">${inner}</section>`;
}

export function renderDeck({ slug, domain, data, dateLabel }) {
  const d = data;
  const company = d.company?.name || domain;
  // four_things is the pre Jul 30 2026 shape, kept so older decks still render.
  const t = d.three_things || d.four_things || {};

  // Sections are numbered the way the proposal numbers them: content slides
  // count, statement slides do not.
  let sectionNo = 0;
  const kicker = (label) =>
    `<p class="kicker"><span class="k-num">${String(++sectionNo).padStart(2, '0')}</span> / ${esc(label)}</p>`;

  const stats = PROOF.stats
    .map(
      (s) => `<div class="stat">
        <div class="stat-v">${esc(s.value)}</div>
        <div class="stat-l">${esc(s.label)}</div>
        <div class="stat-w">${esc(s.who)}</div>
        <div class="stat-n">${esc(s.note)}</div>
      </div>`
    )
    .join('');

  const segments = (d.tam?.segments || [])
    .map(
      (s) => `<div class="seg">
        <div class="seg-name">${esc(s.name)}</div>
        <div class="seg-size">${esc(s.size_note)}</div>
        <p>${esc(s.why)}</p>
      </div>`
    )
    .join('');

  const titles = (d.icp?.buyer_titles || []).map((x) => `<li>${esc(x)}</li>`).join('');

  const touches = (d.sequence?.touches || [])
    .map(
      (x) => `<tr>
        <td class="t-day">${esc(x.day)}</td>
        <td class="t-chan"><span class="chip chip-${esc((x.channel || '').toLowerCase().replace(/[^a-z]/g, ''))}">${esc(x.channel)}</span></td>
        <td>${esc(x.what)}</td>
      </tr>`
    )
    .join('');

  const signals = (d.signals || [])
    .map(
      (s, i) => `<div class="sig sig-${esc(s.loudness)}">
        <div class="sig-top">
          <span class="sig-num">${String(i + 1).padStart(2, '0')}</span>
          <span class="sig-tag">${s.loudness === 'screaming' ? 'screaming' : 'wincing'}</span>
        </div>
        <h3>${esc(s.name)}</h3>
        <p class="sig-look">${esc(s.what_it_looks_like)}</p>
        <p class="sig-act"><strong>We act.</strong> ${esc(s.how_we_act)}</p>
      </div>`
    )
    .join('');

  const observed = (d.read?.observed || []).map((o) => `<li>${esc(o)}</li>`).join('');

  const sources = (d.sources || [])
    .map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a></li>`)
    .join('');

  const slides = [
    slide(
      'cover',
      NOTES.cover,
      `<div class="cover grain">
        ${lockup(domain, BRAND.logo)}
        <h1 class="serif">${esc(company)}</h1>
        <p class="cover-sub">A reading, prepared by Charm</p>
        <p class="cover-date mono">${esc(dateLabel)}</p>
      </div>`
    ),

    // Cold traffic has no idea who we are. One slide of proof, then never
    // about us again.
    slide(
      'proof',
      NOTES.proof,
      `<div class="pad grain">
        ${kicker('Who you are talking to')}
        <h2 class="h-slide serif">We run outbound for companies<br>who need pipeline, not advice.</h2>
        <div class="stats">${stats}</div>
        <p class="foot mono">${esc(PROOF.line)}</p>
      </div>`
    ),

    slide(
      'tof',
      NOTES.tof,
      `<div class="pad grain split">
        <div class="split-l">
          <p class="ask mono">What are we doing at the top of the funnel?</p>
          <h2 class="statement-h serif">Generate awareness.<br>Educate.</h2>
          <p class="lead">Everything below this band is a different job for a different day.</p>
        </div>
        <div class="split-r">${funnel()}</div>
      </div>`
    ),

    slide(
      'how',
      NOTES.how,
      `<div class="statement grain">
        <p class="ask mono">How do we do that?</p>
        <h2 class="serif">Channels.</h2>
      </div>`
    ),

    slide(
      'channels',
      NOTES.channels,
      `<div class="pad grain">
        ${kicker('Charm runs outbound')}
        <h2 class="h-slide serif">Three channels. One team.</h2>
        <div class="split-mesh">
          <div class="mesh-art">${channelMesh()}</div>
          <div class="chan-stack">
            <div class="chan"><div class="chan-name mono">Email</div><p>${esc(d.channels?.email)}</p></div>
            <div class="chan"><div class="chan-name mono">LinkedIn</div><p>${esc(d.channels?.linkedin)}</p></div>
            <div class="chan"><div class="chan-name mono">Phone</div><p>${esc(d.channels?.phone)}</p></div>
          </div>
        </div>
      </div>`
    ),

    slide(
      'turn',
      NOTES.turn,
      `<div class="pad ink grain narrow-pad">
        <p class="ask mono">We are here to talk about</p>
        <h2 class="statement-h serif">Driving <em>awareness</em><br>using email and LinkedIn.</h2>
        <div class="narrowing">
          <div class="nw nw-on"><span class="mono">Email</span></div>
          <div class="nw nw-on"><span class="mono">LinkedIn</span></div>
          <div class="nw nw-off"><span class="mono">Phone</span><span class="nw-tag mono">not today</span></div>
        </div>
      </div>`,
      'ink'
    ),

    slide(
      'world',
      NOTES.world,
      `<div class="pad grain">
        ${kicker('Your world, as we read it')}
        <h2 class="h-slide serif">${esc(company)}</h2>
        <p class="lead">${esc(d.company?.one_liner)}</p>
        <div class="two-col">
          <div class="card">
            <h4 class="mono">Who you sell to</h4>
            <p>${esc(d.icp?.who_they_sell_to)}</p>
            <ul class="titles mono">${titles}</ul>
            <p class="small">${esc(d.icp?.deal_shape)}</p>
          </div>
          <div class="card card-tint">
            <h4 class="mono">Your TAM</h4>
            <p class="tam-head serif">${esc(d.tam?.headline)}</p>
            <p class="small">${esc(d.tam?.reasoning)}</p>
          </div>
        </div>
      </div>`
    ),

    slide(
      'segments',
      NOTES.segments,
      `<div class="pad grain">
        ${kicker('Where the TAM splits')}
        <h2 class="h-slide serif">Three doors into the same market.</h2>
        <div class="seg-grid">${segments}</div>
      </div>`
    ),

    slide(
      'things',
      NOTES.things,
      `<div class="pad grain">
        ${kicker('What happens when you work with Charm')}
        <h2 class="h-slide serif">Three things we do for you.</h2>
        <ol class="things">
          <li>
            <img class="wiz" src="${BRAND.wizards.cast}" alt="">
            <div><h4>Get the leads</h4><p>${esc(t.leads)}</p></div>
          </li>
          <li>
            <img class="wiz" src="${BRAND.wizards.orb}" alt="">
            <div>
              <h4>Write the words</h4>
              <p>${esc(t.words)}</p>
              <p class="tease">${esc(t.signals_teaser)} <span class="later mono">more on this in a minute</span></p>
            </div>
          </li>
          <li>
            <img class="wiz" src="${BRAND.wizards.broom}" alt="">
            <div><h4>Manage the infrastructure</h4><p>${esc(t.infrastructure)}</p></div>
          </li>
        </ol>
      </div>`
    ),

    slide(
      'sequence',
      NOTES.sequence,
      `<div class="pad grain">
        ${kicker('All of it, at the same time')}
        <h2 class="h-slide serif">${esc(d.sequence?.headline)}</h2>
        <p class="lead">${esc(d.sequence?.body)}</p>
        <table class="touches"><tbody>${touches}</tbody></table>
        <p class="foot mono">One intertwined sequence per prospect. Every prospect in your TAM.</p>
      </div>`
    ),

    slide(
      'cool',
      NOTES.cool,
      `<div class="statement ink grain">
        <h2 class="serif big">But this is where<br>it gets cool.</h2>
      </div>`,
      'ink'
    ),

    slide(
      'kid',
      NOTES.kid,
      `<div class="pad grain">
        ${kicker('Signals')}
        <h2 class="h-slide serif">Pain is not always stated.</h2>
        <div class="waves">
          <div class="wv">
            <div class="wv-head"><span class="wv-label mono">The scream</span><span class="wv-note mono">everyone sees it</span></div>
            ${screamWave()}
            <p>A kid hurts himself and screams. Dad knows to help.</p>
            <p class="wv-map">The job posting. The RFP. The public complaint. Everyone is already selling into it.</p>
          </div>
          <div class="wv wv-quiet">
            <div class="wv-head"><span class="wv-label mono">The wince</span><span class="wv-note mono">only if you are watching</span></div>
            ${winceWave()}
            <p>Or he holds his arm and winces without a sound. Dad still knows to help.</p>
            <p class="wv-map">Headcount drift. A quiet tooling swap. A leader who left. Nobody is selling into it yet.</p>
          </div>
        </div>
        <p class="foot mono">The dotted line is where every other agency starts selling. The wince never crosses it.</p>
      </div>`
    ),

    slide(
      'signals',
      NOTES.signals,
      `<div class="pad grain">
        ${kicker('Signals we would watch for ' + company)}
        <h2 class="h-slide serif">What we listen for.</h2>
        <div class="sig-grid">${signals}</div>
      </div>`
    ),

    slide(
      'touches',
      NOTES.touches,
      `<div class="pad grain">
        ${kicker('What that looks like in the sequence')}
        <h2 class="h-slide serif">The signal fires. The words change.</h2>
        <div class="two-col">
          <div class="card">
            <h4 class="mono">Email</h4>
            <p class="trigger mono">Triggered by: ${esc(d.sample_email?.signal_used)}</p>
            <p class="subject">${esc(d.sample_email?.subject)}</p>
            <p class="body">${nl2br(d.sample_email?.body)}</p>
          </div>
          <div class="card">
            <h4 class="mono">LinkedIn</h4>
            <p class="trigger mono">Triggered by: ${esc(d.sample_linkedin?.signal_used)}</p>
            <p class="body"><strong>Connection note.</strong><br>${nl2br(d.sample_linkedin?.connection_note)}</p>
            <p class="body"><strong>Follow up.</strong><br>${nl2br(d.sample_linkedin?.follow_up)}</p>
          </div>
        </div>
      </div>`
    ),

    slide(
      'read',
      NOTES.read,
      `<div class="pad grain read-pad">
        <div class="read-main">
          ${kicker('The read')}
          <h2 class="h-slide serif">Here is what we noticed.</h2>
          <ul class="observed">${observed}</ul>
          <div class="gap"><p>${esc(d.read?.gap)}</p></div>
          <p class="question serif">&ldquo;${esc(d.read?.question)}&rdquo;</p>
        </div>
        <img class="wiz-big" src="${BRAND.wizards.read}" alt="">
      </div>`
    ),

    slide(
      'close',
      NOTES.close,
      `<div class="pad grain">
        ${kicker('The whole process')}
        <h2 class="h-slide serif">Two calls.</h2>
        <div class="steps">
          <div class="step step-now">
            <div class="step-n mono">01</div>
            <h4>This call</h4>
            <p>The read. We listen, we look at what is actually happening, we tell you what we see.</p>
            <div class="you-are-here mono">you are here</div>
          </div>
          <div class="step">
            <div class="step-n mono">02</div>
            <h4>The next call</h4>
            <p>The remedy. Scope, sequence, investment. Remedy, not menu.</p>
          </div>
          <div class="step">
            <div class="step-n mono">03</div>
            <h4>Go live</h4>
            <p>Our team runs it. You decide what you want to say.</p>
          </div>
        </div>
        <div class="close-cta">
          <img class="wiz-cta" src="${BRAND.wizards.highfive}" alt="">
          <div class="cta-copy">
            <p class="cta-line serif">Ready for the remedy?</p>
            <a class="cta-btn mono" href="${BRAND.booking}" target="_blank" rel="noopener">Book a reading</a>
          </div>
        </div>
        ${sources ? `<details class="sources"><summary class="mono">Sources used to build this reading</summary><ul>${sources}</ul></details>` : ''}
      </div>`
    ),
  ].join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${esc(company)} · a reading by Charm</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=Geist+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root{
  --accent:${BRAND.purple};
  --accent-2:${BRAND.soft};
  --accent-bright:${BRAND.lightAccent};
  --accent-soft:rgba(111,73,178,.10);
  --accent-mid:rgba(111,73,178,.22);

  --paper:#FAFAF7; --paper-2:#F2F1EC; --paper-3:#E9E8E2;
  --ink:#0A0A0B; --ink-2:#141416; --ink-3:#1C1C20;

  --line:rgba(0,0,0,.10);
  --line-strong:rgba(0,0,0,.28);
  --text:#0A0A0B;
  --text-dim:rgba(0,0,0,.55);
  --text-dim-2:rgba(0,0,0,.40);

  --wave-ink:var(--accent);
  --wave-base:rgba(0,0,0,.18);
  --wave-threshold:rgba(0,0,0,.30);
}
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%}
body{
  font-family:'Inter',system-ui,Helvetica,Arial,sans-serif;
  background:#0a0a0b;color:var(--text);
  display:flex;align-items:center;justify-content:center;overflow:hidden;
  -webkit-font-smoothing:antialiased;
}
.serif{font-family:'Instrument Serif',Georgia,serif;font-weight:400;letter-spacing:-.02em;line-height:.98}
.mono{font-family:'Geist Mono',ui-monospace,monospace}

#stage{position:relative;width:100vw;height:100vh;display:flex;align-items:center;justify-content:center}
#deck{
  position:relative;width:min(100vw, 177.78vh);height:min(100vh, 56.25vw);
  background:var(--paper);overflow:hidden;box-shadow:0 30px 90px rgba(0,0,0,.55);
  /* everything inside sizes off the deck box, not the window */
  container-type:size;container-name:deck;
}
.slide{position:absolute;inset:0;display:none;background:var(--paper);color:var(--text)}
.slide.active{display:block}
.slide.ink{background:var(--ink);color:#fff;
  --text:#fff;--text-dim:rgba(255,255,255,.58);--text-dim-2:rgba(255,255,255,.40);
  --line:rgba(255,255,255,.12);--line-strong:rgba(255,255,255,.30);
  --accent:var(--accent-bright);
  --wave-ink:var(--accent-bright);--wave-base:rgba(255,255,255,.18);--wave-threshold:rgba(255,255,255,.30);
}

/* paper grain, same surface as the proposal */
.grain{position:relative}
.grain::before{
  content:"";position:absolute;inset:0;pointer-events:none;z-index:0;
  background-image:${GRAIN_URI};opacity:.5;mix-blend-mode:multiply;
}
.slide.ink .grain::before{mix-blend-mode:screen;opacity:.35}
.grain > *{position:relative;z-index:1}

/* ---------------------------------------------------------------- layout */
.pad{position:absolute;inset:0;padding:5.6cqh 6.4cqh;display:flex;flex-direction:column}
.kicker{
  font-family:'Geist Mono',monospace;font-size:1.5cqh;font-weight:500;
  letter-spacing:.12em;text-transform:uppercase;color:var(--text-dim);
  margin-bottom:2.2cqh;
}
.k-num{color:var(--accent);font-weight:600}
.h-slide{font-size:6.4cqh;margin-bottom:2.2cqh}
.statement-h{font-size:8.4cqh}
.lead{font-size:2.2cqh;line-height:1.45;color:var(--text-dim);max-width:74%;margin-bottom:2.6cqh}
.small{font-size:1.6cqh;line-height:1.5;color:var(--text-dim)}
.ask{font-size:1.5cqh;letter-spacing:.12em;text-transform:uppercase;color:var(--text-dim);margin-bottom:2.4cqh}
.foot{
  margin-top:auto;padding-top:2cqh;border-top:1px solid var(--line);
  font-size:1.4cqh;letter-spacing:.06em;color:var(--text-dim-2);
}
em{font-style:italic;color:var(--accent)}

/* ---------------------------------------------------------------- cover */
.cover{
  position:absolute;inset:0;display:flex;flex-direction:column;
  align-items:center;justify-content:center;text-align:center;
  background:var(--paper);
}
.lockup{display:flex;align-items:center;gap:2.4cqh;margin-bottom:5cqh}
.lockup img{height:5.4cqh;width:auto;display:block}
.lk-them{border-radius:.8cqh}
.lk-x{font-size:2.4cqh;color:var(--text-dim-2)}
.lockup.lk-solo .lk-them,.lockup.lk-solo .lk-x{display:none}
.cover h1{font-size:11cqh;max-width:84%}
.cover-sub{margin-top:3cqh;font-size:2.1cqh;color:var(--accent)}
.cover-date{margin-top:1.2cqh;font-size:1.4cqh;letter-spacing:.14em;text-transform:uppercase;color:var(--text-dim-2)}

/* ---------------------------------------------------------------- proof */
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:0;flex:1;align-content:center;min-height:0}
.stat{padding:0 2.6cqh;border-left:1px solid var(--line);display:flex;flex-direction:column;justify-content:center}
.stat:first-child{border-left:0;padding-left:0}
.stat-v{font-family:'Instrument Serif',Georgia,serif;font-size:7.6cqh;line-height:1;letter-spacing:-.02em}
.stat-l{font-family:'Geist Mono',monospace;font-size:1.3cqh;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin-top:.8cqh}
.stat-w{font-size:2cqh;font-weight:600;margin-top:2cqh}
.stat-n{font-size:1.5cqh;color:var(--text-dim);margin-top:.4cqh}

/* ---------------------------------------------------------------- statements */
.statement{
  position:absolute;inset:0;display:flex;flex-direction:column;
  align-items:flex-start;justify-content:center;padding:0 9%;
}
.statement h2{font-size:9.6cqh}
.statement .big{font-size:11cqh}

/* split: copy left, art right */
.split{flex-direction:row;align-items:center;gap:5cqh}
.split-l{flex:1 1 46%;min-width:0}
.split-r{flex:1 1 54%;min-width:0;position:relative;display:flex;align-items:center;justify-content:center}
.art{width:100%;height:auto;max-height:74cqh;overflow:visible}
.fn-label{font-family:'Geist Mono',monospace;font-size:11px;letter-spacing:.14em;text-anchor:middle;fill:var(--text-dim)}
.fn-label-lit{fill:#fff;font-weight:600}
.fn-label-faint{fill:var(--text-dim-2)}
.fn-here{font-family:'Geist Mono',monospace;font-size:11px;letter-spacing:.14em;fill:var(--accent);font-weight:500}

/* ---------------------------------------------------------------- channels */
.split-mesh{display:flex;gap:4cqh;flex:1;min-height:0;align-items:center}
.mesh-art{flex:1 1 52%;min-width:0}
.chan-stack{flex:1 1 48%;display:flex;flex-direction:column;gap:1.6cqh}
.chan{border-top:1px solid var(--line);padding-top:1.4cqh}
.chan-name{font-size:1.4cqh;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);margin-bottom:.7cqh}
.chan p{font-size:1.75cqh;line-height:1.5;color:var(--text-dim)}
.ch-label{font-family:'Geist Mono',monospace;font-size:13px;letter-spacing:.1em;text-anchor:middle;fill:var(--text)}
.ch-dim .ch-label{fill:var(--text-dim-2)}
.ch-core{font-family:'Geist Mono',monospace;font-size:14px;font-weight:600;letter-spacing:.16em;text-anchor:middle;fill:#fff}
.ch-core-sub{font-family:'Geist Mono',monospace;font-size:10px;letter-spacing:.1em;text-anchor:middle;fill:rgba(255,255,255,.55)}

/* ---------------------------------------------------------------- the turn */
.narrow-pad{justify-content:center}
.narrowing{display:flex;gap:1.6cqh;margin-top:4cqh}
.nw{
  padding:1.4cqh 2.6cqh;border-radius:99px;border:1px solid var(--accent);
  font-size:1.6cqh;letter-spacing:.1em;text-transform:uppercase;color:var(--accent);
}
.nw-off{border-color:var(--line);color:var(--text-dim-2);display:flex;align-items:center;gap:1.2cqh}
.nw-off span:first-child{text-decoration:line-through}
.nw-tag{font-size:1.1cqh;letter-spacing:.14em;opacity:.75;text-decoration:none}

/* ---------------------------------------------------------------- cards */
/* Body blocks size to their content and stay under the headline. Stretching
   them left short generated copy pooled at the top of a very tall card;
   centring them opened a gap between the headline and the content, which read
   as broken rather than as space. Top aligned with content-height cards is the
   combination that survives both short and long copy. */
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:2.6cqh;flex:1;min-height:0;
  grid-auto-rows:min-content;align-content:start}
.card{border:1px solid var(--line);border-radius:1.2cqh;padding:3cqh;overflow:hidden;background:rgba(255,255,255,.5)}
.card-tint{background:var(--accent-soft);border-color:var(--accent-mid)}
.card h4{font-size:1.3cqh;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);margin-bottom:1.6cqh;font-weight:500}
.card p{font-size:1.8cqh;line-height:1.5;color:var(--text-dim);margin-bottom:1.2cqh}
.titles{list-style:none;display:flex;flex-wrap:wrap;gap:.7cqh;margin:1.4cqh 0}
.titles li{
  font-size:1.25cqh;padding:.5cqh 1.1cqh;border:1px solid var(--line);
  border-radius:99px;color:var(--text-dim);background:var(--paper);
}
.tam-head{font-size:4.4cqh!important;color:var(--text)!important;margin-bottom:1.4cqh!important}

/* ---------------------------------------------------------------- segments */
.seg-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2.6cqh;flex:1;min-height:0;
  grid-auto-rows:min-content;align-content:start}
.seg{border-top:2px solid var(--accent);padding-top:2.2cqh}
.seg-name{font-size:2.5cqh;font-weight:600;margin-bottom:.5cqh}
.seg-size{font-family:'Geist Mono',monospace;font-size:1.35cqh;letter-spacing:.08em;color:var(--accent);margin-bottom:1.4cqh}
.seg p{font-size:1.65cqh;line-height:1.55;color:var(--text-dim)}

/* ---------------------------------------------------------------- three things */
.things{list-style:none;display:flex;flex-direction:column;gap:1.2cqh;flex:1;justify-content:center}
.things li{display:flex;gap:2.6cqh;align-items:center;padding:1.6cqh 0;border-bottom:1px solid var(--line)}
.things li:last-child{border-bottom:none}
.wiz{flex:0 0 auto;height:9.5cqh;width:auto;object-fit:contain}
.things h4{font-size:2.7cqh;font-weight:600;margin-bottom:.5cqh}
.things p{font-size:1.7cqh;line-height:1.5;color:var(--text-dim)}
.things .tease{
  margin-top:1cqh;padding-left:1.4cqh;border-left:2px solid var(--accent);
  color:var(--accent)!important;
}
.later{
  font-size:1.1cqh;letter-spacing:.12em;text-transform:uppercase;color:var(--paper);
  background:var(--accent);padding:.35cqh .9cqh;border-radius:99px;
  margin-left:1cqh;vertical-align:middle;
}

/* ---------------------------------------------------------------- sequence */
.touches{width:100%;border-collapse:collapse;margin-bottom:1cqh}
.touches td{padding:1.2cqh .8cqh;border-bottom:1px solid var(--line);font-size:1.65cqh;color:var(--text-dim);vertical-align:top}
.t-day{width:12%;font-family:'Geist Mono',monospace;font-size:1.4cqh;color:var(--text-dim-2)}
.t-chan{width:16%}
.chip{
  display:inline-block;font-family:'Geist Mono',monospace;font-size:1.2cqh;
  padding:.35cqh 1cqh;border-radius:99px;background:var(--accent-soft);color:var(--accent);
  letter-spacing:.06em;
}
.chip-linkedin{background:rgba(28,78,168,.10);color:#1c4ea8}
.chip-phone{background:rgba(154,90,23,.10);color:#9a5a17}

/* ---------------------------------------------------------------- waveform */
.waves{display:grid;grid-template-columns:1fr 1fr;gap:4cqh;flex:1;min-height:0;
  grid-auto-rows:min-content;align-content:center}
.wv{display:flex;flex-direction:column}
.wv-head{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:1.4cqh}
.wv-label{font-size:1.5cqh;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);font-weight:500}
.wv-note{font-size:1.2cqh;letter-spacing:.08em;color:var(--text-dim-2)}
.art-wave{width:100%;height:14cqh;margin-bottom:1.8cqh}
.wv p{font-size:1.85cqh;line-height:1.45;margin-bottom:1cqh}
.wv-map{font-size:1.55cqh!important;color:var(--text-dim)}
.wv-quiet{--wave-ink:var(--accent-2)}

/* ---------------------------------------------------------------- signals */
.sig-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(18%,1fr));gap:1.8cqh;flex:1;min-height:0;
  grid-auto-rows:min-content;align-content:start}
.sig{border:1px solid var(--line);border-radius:1cqh;padding:2.2cqh 1.9cqh;display:flex;flex-direction:column;background:rgba(255,255,255,.5)}
.sig-wincing{background:var(--ink);border-color:transparent;color:#fff}
.sig-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.4cqh}
.sig-num{font-family:'Geist Mono',monospace;font-size:1.4cqh;color:var(--accent)}
.sig-wincing .sig-num{color:var(--accent-bright)}
.sig-tag{
  font-family:'Geist Mono',monospace;font-size:1cqh;letter-spacing:.12em;text-transform:uppercase;
  padding:.3cqh .8cqh;border-radius:99px;background:var(--accent-soft);color:var(--accent);
}
.sig-wincing .sig-tag{background:rgba(196,169,239,.18);color:var(--accent-bright)}
.sig h3{font-size:2cqh;font-weight:600;line-height:1.2;margin-bottom:1cqh}
.sig p{font-size:1.45cqh;line-height:1.5;color:var(--text-dim);margin-bottom:1cqh}
.sig-wincing p{color:rgba(255,255,255,.62)}
.sig-act{margin-top:auto;margin-bottom:0!important}
.sig-act strong{color:var(--accent);font-weight:600}
.sig-wincing .sig-act strong{color:var(--accent-bright)}

/* ---------------------------------------------------------------- sample copy */
.trigger{font-size:1.3cqh!important;letter-spacing:.08em;color:var(--accent)!important;margin-bottom:1.4cqh!important}
.subject{font-weight:600;font-size:2cqh!important;color:var(--text)!important;padding-bottom:1.2cqh;border-bottom:1px solid var(--line)}
.body{font-size:1.7cqh!important;line-height:1.6}

/* ---------------------------------------------------------------- read */
.read-pad{flex-direction:row;align-items:stretch;gap:3cqh}
.read-main{flex:1 1 auto;display:flex;flex-direction:column;min-width:0}
.wiz-big{flex:0 0 auto;height:34cqh;width:auto;align-self:flex-end;object-fit:contain;opacity:.95}
.observed{list-style:none;display:flex;flex-direction:column;gap:1cqh;margin-bottom:2.6cqh}
.observed li{font-size:1.9cqh;line-height:1.4;padding-left:2.6cqh;position:relative;color:var(--text-dim)}
.observed li::before{content:"";position:absolute;left:0;top:.75cqh;width:1.2cqh;height:1px;background:var(--accent)}
.gap{background:var(--accent-soft);border-left:2px solid var(--accent);padding:2.2cqh 2.6cqh}
.gap p{font-size:2.1cqh;line-height:1.4;color:var(--text)}
.question{margin-top:auto;font-size:4.4cqh}

/* ---------------------------------------------------------------- close */
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:2.4cqh}
.step{border:1px solid var(--line);border-radius:1.2cqh;padding:2.6cqh;position:relative;background:rgba(255,255,255,.5)}
.step-now{border-color:var(--accent);background:var(--accent-soft)}
.step-n{font-size:1.5cqh;letter-spacing:.12em;color:var(--text-dim-2);margin-bottom:1.4cqh}
.step-now .step-n{color:var(--accent)}
.step h4{font-size:2.2cqh;font-weight:600;margin-bottom:.8cqh}
.step p{font-size:1.55cqh;line-height:1.5;color:var(--text-dim)}
.you-are-here{
  position:absolute;top:-1.1cqh;right:1.8cqh;font-size:1.05cqh;letter-spacing:.12em;
  text-transform:uppercase;background:var(--accent);color:var(--paper);
  padding:.4cqh 1cqh;border-radius:99px;
}
.close-cta{
  margin-top:auto;display:flex;align-items:center;gap:2.4cqh;
  border-top:1px solid var(--line);padding-top:2cqh;
}
.wiz-cta{height:11cqh;width:auto;object-fit:contain}
.cta-copy{display:flex;align-items:center;gap:2.4cqh}
.cta-line{font-size:3.4cqh}
.cta-btn{
  display:inline-block;background:var(--accent);color:var(--paper);text-decoration:none;
  padding:1.2cqh 2.4cqh;border-radius:99px;font-size:1.4cqh;letter-spacing:.1em;
  text-transform:uppercase;white-space:nowrap;
}
.sources{margin-top:1.4cqh;font-size:1.3cqh;color:var(--text-dim-2)}
.sources summary{cursor:pointer;color:var(--accent);letter-spacing:.08em}
.sources ul{margin-top:1cqh;padding-left:2cqh;display:flex;flex-direction:column;gap:.5cqh}
.sources a{color:var(--text-dim)}

/* ---------------------------------------------------------------- chrome */
#chrome{
  position:fixed;bottom:1.6vh;left:0;right:0;display:flex;justify-content:center;
  gap:1.6vh;align-items:center;font-family:'Geist Mono',monospace;font-size:1.4vh;
  color:#8a8494;z-index:20;opacity:0;transition:opacity .2s;pointer-events:none;
}
#stage:hover #chrome{opacity:1;pointer-events:auto}
#chrome button{
  font:inherit;background:rgba(255,255,255,.08);color:#cfc7de;border:1px solid rgba(255,255,255,.14);
  border-radius:99px;padding:.5vh 1.4vh;cursor:pointer;
}
#counter{letter-spacing:.12em}
#progress{position:fixed;top:0;left:0;height:2px;background:${BRAND.purple};z-index:30;transition:width .25s}
#notes{
  position:fixed;left:0;right:0;bottom:0;background:#0A0A0B;color:#e6e2ee;
  padding:2.2vh 4vh;font-size:1.7vh;line-height:1.5;display:none;z-index:25;
  border-top:2px solid ${BRAND.purple};
}
#notes.on{display:block}
#notes b{
  font-family:'Geist Mono',monospace;color:${BRAND.lightAccent};display:block;font-size:1.1vh;
  letter-spacing:.16em;text-transform:uppercase;margin-bottom:.8vh;font-weight:500;
}
#menu{position:fixed;inset:0;background:rgba(10,10,11,.95);z-index:40;display:none;padding:8vh;overflow:auto}
#menu.on{display:block}
#menu h3{
  font-family:'Geist Mono',monospace;color:#fff;font-size:1.5vh;margin-bottom:3vh;
  letter-spacing:.16em;text-transform:uppercase;font-weight:500;
}
#menu ol{list-style:none;display:grid;grid-template-columns:repeat(3,1fr);gap:1.2vh}
#menu li{
  font-family:'Geist Mono',monospace;color:#cfc7de;font-size:1.5vh;padding:1.2vh 1.8vh;
  border:1px solid rgba(255,255,255,.12);border-radius:.8vh;cursor:pointer;letter-spacing:.06em;
}
#menu li:hover{background:rgba(111,73,178,.35);color:#fff}
#menu li span{color:#7d7590;margin-right:1.2vh}

@media print{
  body{display:block;background:#fff}
  #deck{width:100%;height:auto;box-shadow:none;container-type:normal}
  .slide{position:relative;display:block;page-break-after:always;height:100vh}
  #chrome,#notes,#menu,#progress{display:none!important}
}
</style>
</head>
<body>
<div id="progress"></div>
<div id="stage">
  <div id="deck">
${slides}
  </div>
  <div id="chrome">
    <button data-act="prev">&larr;</button>
    <span id="counter">1 / 1</span>
    <button data-act="next">&rarr;</button>
    <button data-act="notes">notes (N)</button>
    <button data-act="menu">slides (M)</button>
  </div>
</div>
<div id="notes"><b>Talk line</b><span id="notes-text"></span></div>
<div id="menu"><h3>${esc(company)} · jump to slide</h3><ol id="menu-list"></ol></div>
<script>
(function(){
  var slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
  var i = 0;
  var notesOn = false;
  var counter = document.getElementById('counter');
  var progress = document.getElementById('progress');
  var notes = document.getElementById('notes');
  var notesText = document.getElementById('notes-text');
  var menu = document.getElementById('menu');
  var menuList = document.getElementById('menu-list');

  slides.forEach(function(s, n){
    var li = document.createElement('li');
    li.innerHTML = '<span>' + String(n+1).padStart(2,'0') + '</span>' + (s.dataset.id || '');
    li.onclick = function(){ go(n); menu.classList.remove('on'); };
    menuList.appendChild(li);
  });

  function render(){
    slides.forEach(function(s, n){ s.classList.toggle('active', n === i); });
    counter.textContent = (i+1) + ' / ' + slides.length;
    progress.style.width = (((i+1)/slides.length)*100) + '%';
    notesText.textContent = slides[i].dataset.notes || '';
    notes.classList.toggle('on', notesOn);
    try { history.replaceState(null, '', '#' + (i+1)); } catch(e){}
  }
  function go(n){ i = Math.max(0, Math.min(slides.length-1, n)); render(); }
  function next(){ go(i+1); }
  function prev(){ go(i-1); }

  document.addEventListener('keydown', function(e){
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev(); }
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(slides.length-1);
    else if (e.key === 'n' || e.key === 'N') { notesOn = !notesOn; render(); }
    else if (e.key === 'm' || e.key === 'M') menu.classList.toggle('on');
    else if (e.key === 'Escape') menu.classList.remove('on');
  });

  document.getElementById('chrome').addEventListener('click', function(e){
    var act = e.target.getAttribute('data-act');
    if (act === 'next') next();
    else if (act === 'prev') prev();
    else if (act === 'notes') { notesOn = !notesOn; render(); }
    else if (act === 'menu') menu.classList.toggle('on');
  });

  var startX = null;
  document.addEventListener('touchstart', function(e){ startX = e.touches[0].clientX; });
  document.addEventListener('touchend', function(e){
    if (startX === null) return;
    var dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 60) { dx < 0 ? next() : prev(); }
    startX = null;
  });

  function fromHash(){
    var h = parseInt((location.hash || '').replace('#',''), 10);
    return isNaN(h) ? 0 : h - 1;
  }

  // The URL carries the slide number so a link can point at one slide. Without
  // this listener that only worked on a cold load: editing the hash, or opening
  // a /d/slug#7 link while the deck was already open, changed the address bar
  // and nothing else.
  window.addEventListener('hashchange', function(){
    var target = fromHash();
    if (target !== i) go(target);
  });

  go(fromHash());
})();
</script>
</body>
</html>`;
}
