// Two-pass generation.
//   Pass 1 (research): Claude with web search + web fetch builds a factual brief
//                      about the prospect. Tools only, plain text out.
//   Pass 2 (write):    Claude turns the brief into deck copy in Charm voice,
//                      constrained to a JSON schema. No tools.
// Splitting them keeps the schema-constrained call free of server-tool
// pause_turn handling and keeps the research prompt cheap to iterate on.

import Anthropic from '@anthropic-ai/sdk';
import { VOICE, NARRATIVE } from './brand.js';

const MODEL = 'claude-opus-5';

const client = new Anthropic();

// ---------------------------------------------------------------- pass 1

const RESEARCH_SYSTEM = `
You are a go-to-market researcher for Charm, an outbound agency. You are
briefing a founder before a sales call with a prospect company. Your job is
facts, not pitch copy.

Search the web and fetch the prospect's site. Be concrete and cite what you
find. Where you are inferring rather than confirming, say "inferred" in that
line. Never invent a customer name, a headcount, a funding round, or a metric.
If you cannot establish something, write "unknown" and move on.

Produce a brief with these sections:

1. WHAT THEY DO. One or two sentences, plain language, no marketing copy.
2. WHO THEY SELL TO. The customer profile: company type, size, industry, and
   the buyer titles who actually sign. Note if they sell to more than one segment.
3. TAM SHAPE. Roughly how many companies fit that profile, how you got to that
   number, and the two or three segments worth splitting out.
4. DEAL SHAPE. Price point, sales cycle, self-serve versus sales-led, contract
   size if discoverable.
5. CURRENT GO-TO-MARKET. What you can actually observe: careers pages hiring
   SDRs or AEs, a blog or newsletter, paid ads, event presence, LinkedIn
   activity from the founders, obvious use of an outbound tool. Say what is
   visible and what is absent.
6. PRESSURE. What is provably changing in their market right now: regulation,
   funding climate, a competitor's move, a platform shift, seasonality. This is
   what makes their buyers' pain build over time.
7. BUYING SIGNALS. Five observable events in THEIR buyers' world that indicate
   rising pain. For each, note whether it is loud (stated openly, for example a
   job posting or an RFP) or quiet (visible only if you are watching, for
   example headcount drift, a quiet tooling change, a leadership departure).
8. RISKS AND UNKNOWNS. What you could not verify, and anything that would make
   this a bad fit for outbound.
9. SOURCES. Title and URL for each page you actually used.

Keep the whole brief under 1200 words.
`.trim();

async function researchPass(domain, onProgress) {
  const tools = [
    { type: 'web_search_20260209', name: 'web_search', max_uses: 12 },
    { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 10 },
  ];

  let messages = [
    {
      role: 'user',
      content: `Research the company at ${domain}. Start by fetching https://${domain} and work outward from there.`,
    },
  ];

  let response;
  let continuations = 0;

  for (;;) {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: RESEARCH_SYSTEM,
      output_config: { effort: 'high' },
      tools,
      messages,
    });

    if (response.stop_reason !== 'pause_turn') break;

    // Server tool loop hit its iteration cap. Append the paused turn and resume.
    if (++continuations > 5) break;
    onProgress?.('Still researching, resuming the search...');
    messages = [...messages, { role: 'assistant', content: response.content }];
  }

  if (response.stop_reason === 'refusal') {
    throw new Error('The research pass was declined by safety classifiers. Try a different domain.');
  }

  const brief = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();

  if (!brief) throw new Error('The research pass returned nothing usable.');
  return brief;
}

// ---------------------------------------------------------------- pass 2

const str = { type: 'string' };
const strArray = { type: 'array', items: { type: 'string' } };

const obj = (properties) => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});

export const DECK_SCHEMA = obj({
  company: obj({
    name: str,
    one_liner: str,
    industry: str,
    what_they_sell: str,
  }),
  icp: obj({
    who_they_sell_to: str,
    buyer_titles: strArray,
    deal_shape: str,
  }),
  tam: obj({
    headline: str,
    reasoning: str,
    segments: {
      type: 'array',
      items: obj({ name: str, size_note: str, why: str }),
    },
  }),
  channels: obj({
    email: str,
    linkedin: str,
    phone: str,
  }),
  four_things: obj({
    leads: str,
    words: str,
    signals_teaser: str,
    infrastructure: str,
  }),
  sequence: obj({
    headline: str,
    body: str,
    touches: {
      type: 'array',
      items: obj({ day: str, channel: str, what: str }),
    },
  }),
  signals: {
    type: 'array',
    items: obj({
      name: str,
      loudness: { type: 'string', enum: ['screaming', 'wincing'] },
      what_it_looks_like: str,
      how_we_act: str,
    }),
  },
  sample_email: obj({ subject: str, body: str, signal_used: str }),
  sample_linkedin: obj({ connection_note: str, follow_up: str, signal_used: str }),
  read: obj({
    observed: strArray,
    gap: str,
    question: str,
  }),
  sources: {
    type: 'array',
    items: obj({ title: str, url: str }),
  },
});

const WRITE_SYSTEM = `
${VOICE}

${NARRATIVE}

You are writing the personalized slots of a Charm discovery deck for one
specific prospect. You are given a research brief. Turn it into deck copy.

RULES FOR THIS JOB:
- Every field is prospect-specific. If a line would read the same for any
  company, rewrite it.
- Deck copy, not prose. Slide lines are short. No paragraph runs on a slide.
- Never invent a fact that is not in the brief. If the brief says unknown, write
  around it rather than filling it in.
- The signals array is the heart of the deck. Give a mix of loud signals
  ("screaming": stated openly, a job post, an RFP, a public complaint) and quiet
  signals ("wincing": only visible if you are watching, headcount drift, a
  quiet tooling swap, a leadership change, a pricing page edit). Include at
  least two "wincing" signals, because the whole point of the reveal is that
  most pain is never stated out loud.
- how_we_act says what Charm's team does when the signal fires. It is an
  operator action, for example "the sequence swaps to the hiring angle within a
  day", not a product feature.
- sample_email is a real cold email a Charm wizard would send to one of this
  prospect's buyers, triggered by one of the signals you listed. Four sentences
  maximum. No pleasantries, no "hope this finds you well", no link dump. Subject
  is lowercase and under seven words.
- sample_linkedin follows the same trigger. The connection note is under 300
  characters and does not pitch.
- read.observed is three to five things Charm noticed about the prospect's
  current outbound, drawn from the brief. read.gap is one sentence naming the
  gap between where they are and where they want to be. read.question is the
  gap-sell question Chris asks out loud, in his voice.
- sources come straight from the brief. If the brief has none, return an empty
  array.
- Check every field for em dashes before you return. There must be none.
`.trim();

async function writePass(domain, brief) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    system: WRITE_SYSTEM,
    output_config: {
      effort: 'high',
      format: { type: 'json_schema', schema: DECK_SCHEMA },
    },
    messages: [
      {
        role: 'user',
        content: `Prospect domain: ${domain}\n\nResearch brief:\n\n${brief}`,
      },
    ],
  });

  if (response.stop_reason === 'refusal') {
    throw new Error('The writing pass was declined by safety classifiers.');
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error('The writing pass ran out of output tokens before finishing.');
  }

  const text = response.content.find((b) => b.type === 'text')?.text;
  if (!text) throw new Error('The writing pass returned no JSON.');
  return JSON.parse(text);
}

// ---------------------------------------------------------------- public

const EM_DASH = /[—–]/g;

function scrubEmDashes(value) {
  if (typeof value === 'string') return value.replace(EM_DASH, ',');
  if (Array.isArray(value)) return value.map(scrubEmDashes);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, scrubEmDashes(v)]));
  }
  return value;
}

export async function generateDeckData(domain, onProgress) {
  onProgress?.('Researching ' + domain + '. Reading the site and searching the market.');
  const brief = await researchPass(domain, onProgress);

  onProgress?.('Research done. Writing the deck in Charm voice.');
  const deck = await writePass(domain, brief);

  // Belt and braces on the no-em-dash rule.
  return { ...scrubEmDashes(deck), _brief: brief };
}
