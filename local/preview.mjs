// Render the deck from a fixture so the design can be reviewed without
// spending a generation run.
//
//   node local/preview.mjs           -> writes local/preview.html and prints the path
//   node local/preview.mjs out.html  -> writes somewhere else
//
// The fixture is deliberately a plausible but invented company. It exists to
// exercise every slot at realistic length: long TAM reasoning, five signals with
// both loudness values, a full touch table. If a slide overflows here it will
// overflow on a real deck.

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

import { renderDeck } from '../deck.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FIXTURE = {
  company: {
    name: 'Northbeam Logistics',
    one_liner:
      'Freight visibility software for mid-market shippers who moved off spreadsheets but cannot justify a full TMS.',
    industry: 'Supply chain software',
    what_they_sell: 'A subscription tracking and exception-alerting layer that sits on top of existing carrier relationships.',
  },
  icp: {
    who_they_sell_to:
      'Mid-market shippers moving 200 to 2,000 loads a month. Distribution, food and beverage, building products. Companies with a logistics function but no logistics department.',
    buyer_titles: ['VP Supply Chain', 'Director of Logistics', 'Transportation Manager', 'COO', 'VP Operations'],
    deal_shape: 'Sales-led, $18k to $60k ACV, 45 to 90 day cycle, annual contracts with a pilot lane.',
  },
  tam: {
    headline: '11,400 companies',
    reasoning:
      'US shippers with 200+ monthly loads and no enterprise TMS in place. Derived from the intersection of manufacturing and distribution firms above $50M revenue and the absence of a named TMS in their stack.',
    segments: [
      {
        name: 'Food and beverage',
        size_note: '~4,100 companies',
        why: 'Temperature exceptions carry real spoilage cost, so an alert has a dollar figure attached to it the day it fires.',
      },
      {
        name: 'Building products',
        size_note: '~3,600 companies',
        why: 'Project deadlines mean a late load is a jobsite standing idle. The pain is loud and it is already measured.',
      },
      {
        name: 'Industrial distribution',
        size_note: '~3,700 companies',
        why: 'Highest load volume of the three and the most fragmented carrier base, which is exactly where visibility gaps live.',
      },
    ],
  },
  channels: {
    email: 'Where the VP of Supply Chain actually reads. Long enough to name a lane and a number.',
    linkedin: 'Where the Director of Logistics lurks and never posts. Good for warming, poor for asking.',
    phone: 'Real in this market, but not the channel we are talking about today.',
  },
  three_things: {
    leads: 'Every mid-market shipper in your three segments, mapped by load volume and by whether a TMS is already named in their stack.',
    words: 'Copy written per segment, because a spoilage number does not move a building products buyer.',
    signals_teaser: 'And the words change based on what we see happening in their world that week.',
    infrastructure: 'Domains, warmup, inboxes, deliverability. Our team runs it, you never see it.',
  },
  sequence: {
    headline: 'One prospect. Four touches. Two channels running together.',
    body: 'Every company in your TAM sits inside a sequence that adapts as we learn what they respond to.',
    touches: [
      { day: 'Day 1', channel: 'Email', what: 'Named lane, one observed exception pattern, no ask beyond a reply.' },
      { day: 'Day 2', channel: 'LinkedIn', what: 'Connection request to the same buyer. No pitch in the note.' },
      { day: 'Day 5', channel: 'Email', what: 'Threaded reply. The spoilage or delay number for their segment.' },
      { day: 'Day 9', channel: 'LinkedIn', what: 'Follow up message referencing the email, one question.' },
      { day: 'Day 14', channel: 'Email', what: 'Fresh angle. A peer in their segment, no name, same problem shape.' },
    ],
  },
  signals: [
    {
      name: 'Posting for a transportation manager',
      loudness: 'screaming',
      what_it_looks_like: 'An open req for a transportation or logistics manager, often with "visibility" or "exception" in the description.',
      how_we_act: 'The sequence swaps to the hiring angle within a day and leads with what the new hire will inherit.',
    },
    {
      name: 'Carrier base quietly consolidating',
      loudness: 'wincing',
      what_it_looks_like: 'Fewer carrier logos on the site, a dropped partner page, load boards showing less spread.',
      how_we_act: 'We open on concentration risk rather than on visibility, because that is the fear that week.',
    },
    {
      name: 'A recall or a service failure in the news',
      loudness: 'screaming',
      what_it_looks_like: 'Trade press coverage of a delivery failure, a recall, or a customer complaint at scale.',
      how_we_act: 'We hold the aggressive angle and send the quiet one. Nobody buys software the week they are on fire.',
    },
    {
      name: 'Logistics leader left and was not replaced',
      loudness: 'wincing',
      what_it_looks_like: 'A departure with no backfill posted after six weeks. The work did not go away, it got absorbed.',
      how_we_act: 'We write to whoever absorbed it, usually the COO, and we name the absorption rather than the product.',
    },
    {
      name: 'New DC or lane announced',
      loudness: 'wincing',
      what_it_looks_like: 'A permit filing, a local press mention, or a careers page suddenly hiring in a new metro.',
      how_we_act: 'We hit within 72 hours, while the lane is still being set up and the carrier mix is still open.',
    },
  ],
  sample_email: {
    subject: 'your reno lane',
    body: 'Saw you are hiring a transportation manager in Reno. Whoever takes that seat inherits the exception queue on day one, and in food and beverage that queue has a spoilage number attached to it.\n\nWe map every mid-market shipper in your segment and run the outbound for companies like yours. Worth showing you what we would send, or is the new hire meant to own this?',
    signal_used: 'Posting for a transportation manager',
  },
  sample_linkedin: {
    connection_note:
      'Saw the Reno req. Curious whether the exception queue is going to that seat or staying with ops. Either way, worth a connect.',
    follow_up:
      'Sent you a note about the Reno lane. Short version: we run outbound for supply chain software teams selling into mid-market shippers. Happy to show you the segment map, or leave you alone if the timing is wrong.',
    signal_used: 'Posting for a transportation manager',
  },
  read: {
    observed: [
      'No SDRs on the careers page and no outbound tooling visible in the stack.',
      'The blog stopped in March, so awareness is running on nothing right now.',
      'Founders post on LinkedIn but nobody is working the audience it builds.',
      'Case studies are all food and beverage, but the site sells to everyone.',
    ],
    gap: 'You have a market that can be listed and a story that only lands in one segment, and nothing systematically carrying that story to the other two.',
    question: 'If we could name every shipper in building products who just lost their logistics lead, what would you want them to hear first?',
  },
  sources: [
    { title: 'Northbeam Logistics, product page', url: 'https://example.com/product' },
    { title: 'Northbeam Logistics, careers', url: 'https://example.com/careers' },
    { title: 'Mid-market TMS adoption, trade report', url: 'https://example.com/report' },
  ],
};

const out = process.argv[2] || path.join(__dirname, 'preview.html');

writeFileSync(
  out,
  renderDeck({
    slug: 'northbeam-logistics',
    domain: 'northbeamlogistics.com',
    data: FIXTURE,
    dateLabel: 'August 3, 2026',
  })
);

console.log('wrote ' + out);
