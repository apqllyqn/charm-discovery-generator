// Renders a personalized discovery deck from generated deck data.
// One self-contained HTML file, 16:9, keyboard driven.

import { BRAND } from './brand.js';

const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const nl2br = (v) => esc(v).replace(/\n/g, '<br>');

const NOTES = {
  cover: 'Hold here while they settle. Say their company name out loud. Nothing else on this slide on purpose.',
  tof: 'Ask it as a real question. "What are we actually doing at the top of the funnel?" Wait. Then answer: generate awareness, educate.',
  how: 'One word answer. Channels. Let it land before you list them.',
  channels: 'Three channels. Charm runs outbound. This is where you say we are operators, not a tool.',
  turn: 'The narrowing. Phone is real but it is not today. Today is awareness through email and LinkedIn.',
  world: 'Read their world back to them. If you got something wrong here, that is a gift. Let them correct you.',
  things: 'Count them on your fingers. Three. When you hit the signals line under the words, do NOT explain it. Say "more on that in a minute" and keep moving. The curiosity is the point.',
  sequence: 'The key word is intertwined. Not three vendors, not three campaigns. One system per prospect, all running at once.',
  cool: 'Slow down. This is the turn of the whole deck. "But this is where it gets cool."',
  kid: 'Tell it like a story, not a slide. Everyone with kids nods here. The point: the wince is still pain, and dad still helps.',
  signals: 'These are theirs, not generic. Ask which one they would want us watching first.',
  touches: 'Real copy, triggered by a real signal. Do not defend the copy. Ask what they would change.',
  read: 'Slow. This is the read. End on the question and then stop talking.',
  close: 'Two calls. This one was the read. The next one is the remedy. Pull up the calendar while this is on screen.',
};

function slide(id, notes, inner) {
  return `<section class="slide" data-id="${esc(id)}" data-notes="${esc(notes)}">${inner}</section>`;
}

export function renderDeck({ slug, domain, data, dateLabel }) {
  const d = data;
  const company = d.company?.name || domain;
  // four_things is the pre Jul 30 2026 shape, kept so older decks still render.
  const t = d.three_things || d.four_things || {};

  const segments = (d.tam?.segments || [])
    .map(
      (s) => `<div class="seg">
        <div class="seg-name">${esc(s.name)}</div>
        <div class="seg-size">${esc(s.size_note)}</div>
        <p>${esc(s.why)}</p>
      </div>`
    )
    .join('');

  const titles = (d.icp?.buyer_titles || [])
    .map((t) => `<li>${esc(t)}</li>`)
    .join('');

  const touches = (d.sequence?.touches || [])
    .map(
      (t) => `<tr>
        <td class="t-day">${esc(t.day)}</td>
        <td class="t-chan"><span class="chip chip-${esc((t.channel || '').toLowerCase().replace(/[^a-z]/g, ''))}">${esc(t.channel)}</span></td>
        <td>${esc(t.what)}</td>
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
        <p class="sig-act"><strong>We act:</strong> ${esc(s.how_we_act)}</p>
      </div>`
    )
    .join('');

  const observed = (d.read?.observed || [])
    .map((o) => `<li>${esc(o)}</li>`)
    .join('');

  const sources = (d.sources || [])
    .map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a></li>`)
    .join('');

  const slides = [
    slide(
      'cover',
      NOTES.cover,
      `<div class="cover">
        <img class="mark" src="${BRAND.logo}" alt="Charm">
        <h1>${esc(company)}</h1>
        <p class="cover-sub">A reading, prepared by Charm</p>
        <p class="cover-date">${esc(dateLabel)}</p>
      </div>`
    ),

    slide(
      'tof',
      NOTES.tof,
      `<div class="statement">
        <p class="ask">What are we doing at the top of the funnel?</p>
        <h2>Generate awareness.<br>Educate.</h2>
      </div>`
    ),

    slide(
      'how',
      NOTES.how,
      `<div class="statement">
        <p class="ask">How do we do that?</p>
        <h2>Channels.</h2>
      </div>`
    ),

    slide(
      'channels',
      NOTES.channels,
      `<div class="pad">
        <p class="kicker">Charm runs outbound</p>
        <h2 class="h-slide">Three channels.</h2>
        <div class="chan-grid">
          <div class="chan"><div class="chan-name">Email</div><p>${esc(d.channels?.email)}</p></div>
          <div class="chan"><div class="chan-name">LinkedIn</div><p>${esc(d.channels?.linkedin)}</p></div>
          <div class="chan"><div class="chan-name">Phone</div><p>${esc(d.channels?.phone)}</p></div>
        </div>
        <p class="foot">One team runs all three. Not three vendors.</p>
      </div>`
    ),

    slide(
      'turn',
      NOTES.turn,
      `<div class="statement dark">
        <p class="ask light">We are here to talk about</p>
        <h2>Driving <em>awareness</em><br>using Email and LinkedIn.</h2>
      </div>`
    ),

    slide(
      'world',
      NOTES.world,
      `<div class="pad">
        <p class="kicker">Your world, as we read it</p>
        <h2 class="h-slide">${esc(company)}</h2>
        <p class="lead">${esc(d.company?.one_liner)}</p>
        <div class="two-col">
          <div class="card">
            <h4>Who you sell to</h4>
            <p>${esc(d.icp?.who_they_sell_to)}</p>
            <ul class="titles">${titles}</ul>
            <p class="small">${esc(d.icp?.deal_shape)}</p>
          </div>
          <div class="card card-tint">
            <h4>Your TAM</h4>
            <p class="tam-head">${esc(d.tam?.headline)}</p>
            <p class="small">${esc(d.tam?.reasoning)}</p>
          </div>
        </div>
      </div>`
    ),

    slide(
      'segments',
      'Ask which segment they would start with. Their answer tells you where the real pipeline pressure is.',
      `<div class="pad">
        <p class="kicker">Where the TAM splits</p>
        <h2 class="h-slide">Three doors into the same market.</h2>
        <div class="seg-grid">${segments}</div>
      </div>`
    ),

    slide(
      'things',
      NOTES.things,
      `<div class="pad">
        <p class="kicker">What happens when you work with Charm</p>
        <h2 class="h-slide">Three things we do for you.</h2>
        <ol class="things">
          <li><span class="n">1</span><div><h4>Get the leads</h4><p>${esc(t.leads)}</p></div></li>
          <li><span class="n">2</span><div>
            <h4>Write the words</h4>
            <p>${esc(t.words)}</p>
            <p class="tease">${esc(t.signals_teaser)} <span class="later">more on this in a minute</span></p>
          </div></li>
          <li><span class="n">3</span><div><h4>Manage the infrastructure</h4><p>${esc(t.infrastructure)}</p></div></li>
        </ol>
      </div>`
    ),

    slide(
      'sequence',
      NOTES.sequence,
      `<div class="pad">
        <p class="kicker">All of it, at the same time</p>
        <h2 class="h-slide">${esc(d.sequence?.headline)}</h2>
        <p class="lead">${esc(d.sequence?.body)}</p>
        <table class="touches"><tbody>${touches}</tbody></table>
        <p class="foot">One intertwined sequence per prospect. Every prospect in your TAM.</p>
      </div>`
    ),

    slide(
      'cool',
      NOTES.cool,
      `<div class="statement dark">
        <h2 class="big">But this is where<br>it gets cool.</h2>
      </div>`
    ),

    slide(
      'kid',
      NOTES.kid,
      `<div class="pad">
        <p class="kicker">Signals</p>
        <h2 class="h-slide">Pain is not always stated.</h2>
        <p class="lead">It ebbs. It flows. It builds.</p>
        <div class="kid-grid">
          <div class="kid">
            <div class="kid-label">The scream</div>
            <p>A kid hurts himself and screams. Dad knows to help.</p>
            <p class="kid-map">In your market: the job posting. The RFP. The public complaint. Everyone sees it, and everyone is already selling into it.</p>
          </div>
          <div class="kid kid-quiet">
            <div class="kid-label">The wince</div>
            <p>Or he holds his arm and winces without a sound. Dad still knows to help.</p>
            <p class="kid-map">In your market: headcount drift. A quiet tooling swap. A leader who left. Nobody is selling into it yet, because nobody is watching.</p>
          </div>
        </div>
        <p class="foot">Not all pain the people we can help feel is stated explicitly. Signals are how we hear the wince.</p>
      </div>`
    ),

    slide(
      'signals',
      NOTES.signals,
      `<div class="pad">
        <p class="kicker">Signals we would watch for ${esc(company)}</p>
        <h2 class="h-slide">What we listen for.</h2>
        <div class="sig-grid">${signals}</div>
      </div>`
    ),

    slide(
      'touches',
      NOTES.touches,
      `<div class="pad">
        <p class="kicker">What that looks like in the sequence</p>
        <h2 class="h-slide">The signal fires. The words change.</h2>
        <div class="two-col">
          <div class="card">
            <h4>Email</h4>
            <p class="trigger">Triggered by: ${esc(d.sample_email?.signal_used)}</p>
            <p class="subject">Subject: ${esc(d.sample_email?.subject)}</p>
            <p class="body">${nl2br(d.sample_email?.body)}</p>
          </div>
          <div class="card">
            <h4>LinkedIn</h4>
            <p class="trigger">Triggered by: ${esc(d.sample_linkedin?.signal_used)}</p>
            <p class="body"><strong>Connection note.</strong><br>${nl2br(d.sample_linkedin?.connection_note)}</p>
            <p class="body"><strong>Follow up.</strong><br>${nl2br(d.sample_linkedin?.follow_up)}</p>
          </div>
        </div>
      </div>`
    ),

    slide(
      'read',
      NOTES.read,
      `<div class="pad">
        <p class="kicker">The read</p>
        <h2 class="h-slide">Here is what we noticed.</h2>
        <ul class="observed">${observed}</ul>
        <div class="gap">
          <p>${esc(d.read?.gap)}</p>
        </div>
        <p class="question">"${esc(d.read?.question)}"</p>
      </div>`
    ),

    slide(
      'close',
      NOTES.close,
      `<div class="pad">
        <p class="kicker">The whole process</p>
        <h2 class="h-slide">Two calls.</h2>
        <div class="steps">
          <div class="step step-now">
            <div class="step-n">1</div>
            <h4>This call</h4>
            <p>The read. We listen, we look at what is actually happening, we tell you what we see.</p>
            <div class="you-are-here">you are here</div>
          </div>
          <div class="step">
            <div class="step-n">2</div>
            <h4>The next call</h4>
            <p>The remedy. Scope, sequence, investment. Remedy, not menu.</p>
          </div>
          <div class="step">
            <div class="step-n">3</div>
            <h4>Go live</h4>
            <p>Our team runs it. You decide what you want to say.</p>
          </div>
        </div>
        ${sources ? `<details class="sources"><summary>Sources used to build this reading</summary><ul>${sources}</ul></details>` : ''}
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
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{
  --purple:${BRAND.purple}; --deep:${BRAND.deep}; --soft:${BRAND.soft};
  --tint:${BRAND.tint}; --accent:${BRAND.lightAccent};
  --ink:${BRAND.ink}; --ink2:${BRAND.ink2}; --muted:${BRAND.muted}; --muted2:${BRAND.muted2};
  --line:${BRAND.line}; --line2:${BRAND.line2};
}
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%}
body{
  font-family:${BRAND.font};
  background:#0d0b11;color:var(--ink);
  display:flex;align-items:center;justify-content:center;overflow:hidden;
}
#stage{position:relative;width:100vw;height:100vh;display:flex;align-items:center;justify-content:center}
#deck{
  position:relative;width:min(100vw, 177.78vh);height:min(100vh, 56.25vw);
  background:#fff;overflow:hidden;box-shadow:0 30px 90px rgba(0,0,0,.5);
}
.slide{
  position:absolute;inset:0;display:none;
  padding:0;background:#fff;
}
.slide.active{display:block}

/* layout primitives, sized in cqw-ish units off the deck height */
.pad{position:absolute;inset:0;padding:5.2% 6.5%;display:flex;flex-direction:column}
.kicker{
  font-size:1.35vh;letter-spacing:.16em;text-transform:uppercase;
  color:var(--purple);font-weight:600;margin-bottom:1.6vh;
}
.kicker::before{content:"\\2726  ";}
.h-slide{font-size:4.6vh;line-height:1.08;font-weight:700;letter-spacing:-.02em;margin-bottom:1.8vh}
.lead{font-size:2.1vh;line-height:1.5;color:var(--ink2);max-width:78%;margin-bottom:2.6vh}
.small{font-size:1.55vh;line-height:1.5;color:var(--muted)}
.foot{margin-top:auto;padding-top:2vh;font-size:1.6vh;color:var(--muted);border-top:1px solid var(--line)}

/* cover */
.cover{
  position:absolute;inset:0;display:flex;flex-direction:column;
  align-items:center;justify-content:center;text-align:center;
  background:radial-gradient(120% 90% at 50% 10%, #ffffff 0%, var(--tint) 100%);
}
.cover .mark{width:9vh;margin-bottom:4vh;opacity:.9}
.cover h1{font-size:7vh;font-weight:700;letter-spacing:-.03em;line-height:1.05;max-width:80%}
.cover-sub{margin-top:2.4vh;font-size:1.9vh;color:var(--purple);font-weight:500;letter-spacing:.02em}
.cover-date{margin-top:.8vh;font-size:1.5vh;color:var(--muted2)}

/* statement slides */
.statement{
  position:absolute;inset:0;display:flex;flex-direction:column;
  align-items:flex-start;justify-content:center;padding:0 9%;
}
.statement .ask{font-size:2.2vh;color:var(--muted);margin-bottom:2.2vh;font-weight:400}
.statement h2{font-size:7.4vh;line-height:1.06;font-weight:700;letter-spacing:-.03em}
.statement .big{font-size:8.6vh}
.statement em{font-style:normal;color:var(--accent)}
.statement.dark{
  background:linear-gradient(135deg, var(--deep) 0%, #120a24 70%, #000 100%);
  color:#fff;
}
.statement.dark .ask,.statement.dark .ask.light{color:var(--accent)}

/* channels */
.chan-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2.4vh;margin-top:1.4vh}
.chan{
  border:1px solid var(--line);border-radius:1.4vh;padding:3vh 2.4vh;
  background:linear-gradient(180deg,#fff, #fbfaff);
}
.chan-name{font-size:2.6vh;font-weight:700;margin-bottom:1.2vh;color:var(--purple)}
.chan p{font-size:1.65vh;line-height:1.55;color:var(--ink2)}

/* two column */
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:2.4vh;flex:1;min-height:0}
.card{border:1px solid var(--line);border-radius:1.4vh;padding:2.8vh;overflow:hidden}
.card-tint{background:var(--tint);border-color:#e0d5f4}
.card h4{font-size:1.35vh;letter-spacing:.14em;text-transform:uppercase;color:var(--purple);margin-bottom:1.4vh;font-weight:600}
.card p{font-size:1.75vh;line-height:1.5;color:var(--ink2);margin-bottom:1.2vh}
.titles{list-style:none;display:flex;flex-wrap:wrap;gap:.7vh;margin:1.2vh 0}
.titles li{
  font-size:1.4vh;padding:.5vh 1.1vh;border:1px solid var(--line2);
  border-radius:99px;color:var(--ink2);background:#fff;
}
.tam-head{font-size:2.6vh!important;font-weight:600;color:var(--deep)}

/* segments */
.seg-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2.2vh;flex:1;min-height:0}
.seg{border-top:.4vh solid var(--purple);padding-top:2vh}
.seg-name{font-size:2.3vh;font-weight:700;margin-bottom:.5vh}
.seg-size{font-size:1.45vh;color:var(--purple);font-weight:600;margin-bottom:1.2vh}
.seg p{font-size:1.6vh;line-height:1.55;color:var(--muted)}

/* four things */
.things{list-style:none;display:flex;flex-direction:column;gap:1.5vh;flex:1;justify-content:center}
.things li{display:flex;gap:2.2vh;align-items:flex-start;padding:1.5vh 0;border-bottom:1px solid var(--line)}
.things li:last-child{border-bottom:none}
.things .n{
  flex:0 0 auto;width:4.6vh;height:4.6vh;border-radius:50%;
  background:linear-gradient(135deg,var(--purple),#9a6ae0);color:#fff;
  display:flex;align-items:center;justify-content:center;font-weight:700;font-size:2vh;
}
.things h4{font-size:2.4vh;font-weight:600;margin-bottom:.4vh}
.things p{font-size:1.65vh;line-height:1.5;color:var(--muted)}
.things .tease{
  margin-top:.9vh;padding-left:1.4vh;border-left:.3vh solid var(--purple);
  color:var(--purple)!important;font-weight:500;
}
.later{
  font-size:1.2vh;letter-spacing:.1em;text-transform:uppercase;color:#fff;
  background:var(--purple);padding:.35vh .9vh;border-radius:99px;
  margin-left:1vh;vertical-align:middle;font-weight:600;
}

/* sequence table */
.touches{width:100%;border-collapse:collapse;margin-bottom:1vh}
.touches td{padding:1.15vh .8vh;border-bottom:1px solid var(--line);font-size:1.6vh;color:var(--ink2);vertical-align:top}
.t-day{width:12%;color:var(--muted);font-variant-numeric:tabular-nums}
.t-chan{width:16%}
.chip{
  display:inline-block;font-size:1.25vh;font-weight:600;padding:.35vh 1vh;border-radius:99px;
  background:var(--tint);color:var(--deep);
}
.chip-linkedin{background:#e6efff;color:#1c4ea8}
.chip-phone{background:#fdf0e6;color:#9a5a17}

/* kid analogy */
.kid-grid{display:grid;grid-template-columns:1fr 1fr;gap:2.6vh;flex:1;min-height:0}
.kid{border-radius:1.4vh;padding:2.8vh;background:#fbfaff;border:1px solid var(--line)}
.kid-quiet{background:linear-gradient(160deg,var(--deep),#160c2b);color:#fff;border-color:transparent}
.kid-label{font-size:1.3vh;letter-spacing:.16em;text-transform:uppercase;font-weight:600;color:var(--purple);margin-bottom:1.4vh}
.kid-quiet .kid-label{color:var(--accent)}
.kid p{font-size:1.9vh;line-height:1.5;margin-bottom:1.4vh}
.kid-map{font-size:1.55vh!important;color:var(--muted)}
.kid-quiet .kid-map{color:#c9c2d8}

/* signals */
.sig-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(20%,1fr));gap:1.8vh;flex:1;min-height:0}
.sig{border:1px solid var(--line);border-radius:1.2vh;padding:2.2vh 1.9vh;display:flex;flex-direction:column}
.sig-wincing{background:linear-gradient(165deg,var(--deep),#160c2b);border-color:transparent;color:#fff}
.sig-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.2vh}
.sig-num{font-size:1.5vh;font-weight:700;color:var(--purple)}
.sig-wincing .sig-num{color:var(--accent)}
.sig-tag{
  font-size:1.1vh;letter-spacing:.12em;text-transform:uppercase;font-weight:600;
  padding:.3vh .8vh;border-radius:99px;background:var(--tint);color:var(--deep);
}
.sig-wincing .sig-tag{background:rgba(196,169,239,.2);color:var(--accent)}
.sig h3{font-size:1.95vh;font-weight:600;line-height:1.25;margin-bottom:1vh}
.sig p{font-size:1.45vh;line-height:1.5;color:var(--muted);margin-bottom:1vh}
.sig-wincing p{color:#c9c2d8}
.sig-act{margin-top:auto;margin-bottom:0!important;color:var(--ink2)!important}
.sig-wincing .sig-act{color:#e6e0f2!important}
.sig-act strong{color:var(--purple)}
.sig-wincing .sig-act strong{color:var(--accent)}

/* sample copy */
.trigger{font-size:1.35vh!important;color:var(--purple)!important;font-weight:600;margin-bottom:1.2vh!important}
.subject{font-weight:600;font-size:1.85vh!important;padding-bottom:1.2vh;border-bottom:1px solid var(--line)}
.body{font-size:1.7vh!important;line-height:1.6;white-space:normal}

/* read */
.observed{list-style:none;display:flex;flex-direction:column;gap:1vh;margin-bottom:2.4vh}
.observed li{font-size:1.9vh;line-height:1.45;padding-left:2.6vh;position:relative;color:var(--ink2)}
.observed li::before{content:"\\2726";position:absolute;left:0;color:var(--purple)}
.gap{background:var(--tint);border-left:.5vh solid var(--purple);padding:2vh 2.4vh;border-radius:0 1vh 1vh 0}
.gap p{font-size:2.1vh;line-height:1.45;font-weight:500;color:var(--deep)}
.question{margin-top:auto;font-size:2.6vh;line-height:1.35;font-weight:600;letter-spacing:-.01em}

/* close */
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:2.2vh;flex:1;align-content:center}
.step{border:1px solid var(--line);border-radius:1.4vh;padding:2.8vh;position:relative}
.step-now{border-color:var(--purple);background:var(--tint)}
.step-n{
  width:4.2vh;height:4.2vh;border-radius:50%;background:var(--ink);color:#fff;
  display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1.9vh;margin-bottom:1.6vh;
}
.step-now .step-n{background:var(--purple)}
.step h4{font-size:2.2vh;font-weight:600;margin-bottom:.9vh}
.step p{font-size:1.6vh;line-height:1.5;color:var(--muted)}
.you-are-here{
  position:absolute;top:-1.3vh;right:1.8vh;font-size:1.15vh;letter-spacing:.12em;
  text-transform:uppercase;font-weight:600;background:var(--purple);color:#fff;
  padding:.4vh 1vh;border-radius:99px;
}
.sources{margin-top:2vh;font-size:1.4vh;color:var(--muted)}
.sources summary{cursor:pointer;color:var(--purple)}
.sources ul{margin-top:1vh;padding-left:2vh;display:flex;flex-direction:column;gap:.5vh}
.sources a{color:var(--muted)}

/* chrome */
#chrome{
  position:fixed;bottom:1.6vh;left:0;right:0;display:flex;justify-content:center;
  gap:1.6vh;align-items:center;font-size:1.4vh;color:#7d7590;z-index:20;
  opacity:0;transition:opacity .2s;pointer-events:none;
}
#stage:hover #chrome{opacity:1;pointer-events:auto}
#chrome button{
  font:inherit;background:rgba(255,255,255,.08);color:#cfc7de;border:1px solid rgba(255,255,255,.12);
  border-radius:99px;padding:.5vh 1.4vh;cursor:pointer;
}
#counter{font-variant-numeric:tabular-nums;letter-spacing:.08em}
#progress{position:fixed;top:0;left:0;height:3px;background:var(--purple);z-index:30;transition:width .25s}
#notes{
  position:fixed;left:0;right:0;bottom:0;background:#15111c;color:#d9d2e6;
  padding:2.2vh 4vh;font-size:1.7vh;line-height:1.5;display:none;z-index:25;
  border-top:2px solid var(--purple);
}
#notes.on{display:block}
#notes b{color:var(--accent);display:block;font-size:1.2vh;letter-spacing:.14em;text-transform:uppercase;margin-bottom:.8vh}
#menu{
  position:fixed;inset:0;background:rgba(10,8,14,.94);z-index:40;display:none;
  padding:8vh;overflow:auto;
}
#menu.on{display:block}
#menu h3{color:#fff;font-size:2vh;margin-bottom:3vh;letter-spacing:.14em;text-transform:uppercase;font-weight:600}
#menu ol{list-style:none;display:grid;grid-template-columns:repeat(3,1fr);gap:1.2vh}
#menu li{
  color:#cfc7de;font-size:1.7vh;padding:1.2vh 1.8vh;border:1px solid rgba(255,255,255,.12);
  border-radius:1vh;cursor:pointer;
}
#menu li:hover{background:rgba(111,73,178,.35);color:#fff}
#menu li span{color:#7d7590;margin-right:1.2vh;font-variant-numeric:tabular-nums}

@media print{
  body{display:block;background:#fff}
  #deck{width:100%;height:auto;box-shadow:none}
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

  var hash = parseInt((location.hash || '').replace('#',''), 10);
  go(isNaN(hash) ? 0 : hash - 1);
})();
</script>
</body>
</html>`;
}
