/* ============================================================
   Galley — data.js — the sample desk: The Calder Weekly,
   a small harbour-town paper. All dates are generated relative
   to "today" so the desk always looks like a live Tuesday.
   ============================================================ */
(function () {
  'use strict';
  const G = (window.G = window.G || {});

  function ago(days, h, m) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(h == null ? 10 : h, m == null ? 0 : m, 12, 0);
    return d.toISOString();
  }
  function ahead(n) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return G.domain.dateToStr(d);
  }
  function nextFriday() {
    const d = new Date();
    const diff = ((5 - d.getDay()) % 7 + 7) % 7 || 7;
    return ahead(diff);
  }
  function lastFriday() {
    const d = new Date();
    const diff = ((d.getDay() - 5) % 7 + 7) % 7 || 7;
    return ahead(-diff);
  }

  function hist(kind, detail, at) { return { at, kind, detail }; }

  function story(o, createdDaysAgo) {
    const created = ago(createdDaysAgo, 9, 30);
    return {
      id: o.id, slug: o.slug, headline: o.headline, standfirst: o.standfirst || '',
      section: o.section, writerId: o.writerId || '', status: o.status,
      priority: o.priority || 'normal', wordTarget: o.wordTarget || 1200,
      wordCount: o.wordCount || 0, due: o.due || '', tags: o.tags || [],
      slotId: o.slotId || null, publishedAt: o.publishedAt || null,
      archivedFrom: o.archivedFrom || null,
      notes: o.notes || [], history: o.history || [],
      createdAt: created, updatedAt: o.updatedAt || created,
    };
  }

  const W = (id, name, beat, capacity, color) =>
    ({ id, name, beat, capacity, color, active: true, createdAt: ago(30, 9) });

  function sample() {
    const ed127Date = lastFriday();
    const ed128Date = nextFriday();

    const writers = [
      W('w_priya',    'Priya Raman',    'City Hall',           3200, '#7c4a2d'),
      W('w_tomas',    'Tom\u00e1s Vega',  'Courts & crime',    2800, '#34547a'),
      W('w_june',     'June Okafor',    'Business & labour',   2800, '#58652e'),
      W('w_marisol',  'Marisol Brandt', 'Arts & culture',      2400, '#7a3a63'),
      W('w_dev',      'Dev Chauhan',    'Sport',               2800, '#2e5f52'),
      W('w_rob',      'Rob MacEwan',    'Outdoors',            2200, '#6b5a26'),
      W('w_sofia',    'Sofia Lindqvist','Schools',             2600, '#4a3d78'),
      W('w_arthur',   'Arthur Penn',    'Opinion',             1600, '#6d2f2f'),
      W('w_elena',    'Elena Fisher',   'Editor-at-large',     2000, '#3a3a3a'),
    ];
    writers.forEach((w) => { w.active = true; });
    // One inactive writer so the rule has something to bite on.
    writers.push(W('w_karl', 'Karl Dench', 'Photography (off desk)', 800, '#777264'));
    writers[writers.length - 1].active = false;

    const stories = [];

    /* ----- pitches (3) ----- */
    stories.push(story({
      id: 'st_levee_tour', slug: 'levee-tour',
      headline: 'Inside the levee: a walking tour of the town\u2019s 90-year-old flood defence',
      standfirst: 'It has held back the river since 1936, mostly with gravel, stubbornness and luck.',
      section: 'Outdoors', status: 'pitch', priority: 'normal', wordTarget: 1400, wordCount: 0,
      due: ahead(9), tags: ['floods', 'infrastructure'],
      history: [hist('created', 'Pitched to the desk', ago(1, 8, 40))],
    }, 1));

    stories.push(story({
      id: 'st_gala_menu', slug: 'gala-menu',
      headline: 'What the harbour gala banquet says about who we\u2019ve become',
      standfirst: 'Ninety seats, one seating, and the same five families at the head table since 1971.',
      section: 'Culture', status: 'pitch', priority: 'lead', wordTarget: 1600, wordCount: 0,
      due: ahead(11), tags: ['gala', 'food'],
      history: [hist('created', 'Pitched to the desk', ago(2, 11, 5))],
    }, 2));

    stories.push(story({
      id: 'st_bus_route_7', slug: 'bus-route-7',
      headline: 'Route 7 is the town\u2019s slowest bus. Riders did the maths.',
      standfirst: 'Door to door it takes 51 minutes to travel a walkable 2.4 kilometres.',
      section: 'News', status: 'pitch', priority: 'normal', wordTarget: 1200, wordCount: 0,
      due: ahead(8), tags: ['transport'],
      history: [hist('created', 'Pitched to the desk', ago(0, 8, 15))],
    }, 0));

    /* ----- assigned (3) ----- */
    stories.push(story({
      id: 'st_library_fines', slug: 'library-fines',
      headline: 'Council abolishes library fines \u2014 and borrowing jumps 22%',
      standfirst: 'The experiment nobody wanted to fund turned out to be the cheapest culture policy in years.',
      section: 'News', writerId: 'w_priya', status: 'assigned', priority: 'normal', wordTarget: 1100, wordCount: 0,
      due: ahead(3), tags: ['council', 'libraries'],
      history: [
        hist('created', 'Pitched to the desk', ago(3, 9, 10)),
        hist('status', 'Pitch \u2192 Assigned to Priya Raman', ago(2, 10, 2)),
      ],
      notes: [{ id: 'nt_lib1', at: ago(2, 10, 4), text: 'Get the 22% from the library board\u2019s own quarterly report, not the press release \u2014 they count renewals differently.' }],
    }, 3));

    stories.push(story({
      id: 'st_kerbside_glass', slug: 'kerbside-glass',
      headline: 'Kerbside glass collection returns in March \u2014 here\u2019s what changes',
      standfirst: 'Blue crate or blue bag, alternate weeks, and the depot finally takes lids off.',
      section: 'News', writerId: 'w_elena', status: 'assigned', priority: 'normal', wordTarget: 900, wordCount: 0,
      due: ahead(6), tags: ['waste', 'council'],
      history: [
        hist('created', 'Pitched to the desk', ago(2, 9, 0)),
        hist('status', 'Pitch \u2192 Assigned to Elena Fisher', ago(1, 9, 30)),
      ],
    }, 2));

    stories.push(story({
      id: 'st_rink_roof', slug: 'rink-roof',
      headline: 'The rink\u2019s roof has leaked for three winters. Repairs start \u2014 finally.',
      standfirst: 'A tarp over row Z, a bucket behind the away bench, and now a \u00a3410,000 fix.',
      section: 'Sport', writerId: 'w_dev', status: 'assigned', priority: 'normal', wordTarget: 800, wordCount: 0,
      due: ahead(4), tags: ['rink', 'council'],
      history: [
        hist('created', 'Pitched to the desk', ago(1, 14, 20)),
        hist('status', 'Pitch \u2192 Assigned to Dev Chauhan', ago(0, 9, 5)),
      ],
    }, 1));

    /* ----- draft (5) ----- */
    stories.push(story({
      id: 'st_ferry_fares', slug: 'ferry-fares',
      headline: 'Ferry operator seeks 40-cent fare rise, blames fuel',
      standfirst: 'Crossing numbers are back to 2019 levels, but the diesel bill never got the memo.',
      section: 'News', writerId: 'w_tomas', status: 'draft', priority: 'high', wordTarget: 1800, wordCount: 1450,
      due: ahead(1), tags: ['ferry', 'council'],
      history: [
        hist('created', 'Pitched to the desk', ago(5, 9, 0)),
        hist('status', 'Pitch \u2192 Assigned to Tom\u00e1s Vega', ago(5, 9, 40)),
        hist('status', 'Assigned \u2192 Draft', ago(4, 11, 10)),
      ],
      notes: [{ id: 'nt_ferry1', at: ago(1, 15, 0), text: 'Operator\u2019s fuel claim checks out against harbour board filings, but ask why the fast cat runs empty on the 15:40.' }],
    }, 5));

    stories.push(story({
      id: 'st_brewery_expansion', slug: 'brewery-expansion',
      headline: 'Foundry Ales doubles its brewhouse \u2014 and its water bill',
      standfirst: 'The canal-side brewery is now the town\u2019s third-largest water customer.',
      section: 'Business', writerId: 'w_june', status: 'draft', priority: 'normal', wordTarget: 1200, wordCount: 900,
      due: ahead(4), tags: ['small-business', 'water'],
      history: [
        hist('created', 'Pitched to the desk', ago(4, 10, 0)),
        hist('status', 'Pitch \u2192 Assigned to June Okafor', ago(4, 10, 30)),
        hist('status', 'Assigned \u2192 Draft', ago(3, 9, 45)),
      ],
    }, 4));

    stories.push(story({
      id: 'st_hockey_final', slug: 'hockey-final',
      headline: 'Harboursmen reach the provincial final for the first time since 1988',
      standfirst: 'Nine hundred travelling fans, one overturned hot-dog cart, and a penalty shot in overtime.',
      section: 'Sport', writerId: 'w_dev', status: 'draft', priority: 'lead', wordTarget: 1000, wordCount: 700,
      due: ahead(2), tags: ['hockey'],
      history: [
        hist('created', 'Pitched to the desk', ago(2, 18, 0)),
        hist('status', 'Pitch \u2192 Assigned to Dev Chauhan', ago(2, 18, 10)),
        hist('status', 'Assigned \u2192 Draft', ago(1, 8, 30)),
      ],
    }, 2));

    stories.push(story({
      id: 'st_school_trustee', slug: 'school-trustee',
      headline: 'Three candidates, one seat: the school trustee race nobody is watching',
      standfirst: 'The board sets a \u00a331m budget. Turnout last time was 11 per cent.',
      section: 'News', writerId: 'w_sofia', status: 'draft', priority: 'normal', wordTarget: 1800, wordCount: 1500,
      due: ahead(2), tags: ['schools', 'election'],
      history: [
        hist('created', 'Pitched to the desk', ago(6, 9, 0)),
        hist('status', 'Pitch \u2192 Assigned to Sofia Lindqvist', ago(6, 9, 20)),
        hist('status', 'Assigned \u2192 Draft', ago(3, 14, 0)),
      ],
    }, 6));

    stories.push(story({
      id: 'st_bistro_fire', slug: 'bistro-fire',
      headline: 'Alder Street bistro reopens seven months after the fire',
      standfirst: 'Same chef, new ceiling, and a neighbourhood that prepaid a winter\u2019s worth of dinners to keep the doors open.',
      section: 'Business', writerId: 'w_june', status: 'draft', priority: 'normal', wordTarget: 1000, wordCount: 800,
      due: ahead(5), tags: ['small-business', 'fire'],
      history: [
        hist('created', 'Pitched to the desk', ago(3, 11, 0)),
        hist('status', 'Pitch \u2192 Assigned to June Okafor', ago(3, 11, 15)),
        hist('status', 'Assigned \u2192 Draft', ago(2, 10, 0)),
      ],
    }, 3));

    /* ----- in edit (4) ----- */
    stories.push(story({
      id: 'st_council_budget', slug: 'council-budget',
      headline: 'Harbour levy clears council by two votes',
      standfirst: 'Seven to five, after an amendment to exempt fishing crews failed on a tie.',
      section: 'News', writerId: 'w_priya', status: 'edit', priority: 'lead', wordTarget: 1800, wordCount: 1750,
      due: ahead(0), tags: ['council', 'harbour'],
      history: [
        hist('created', 'Pitched to the desk', ago(4, 8, 0)),
        hist('status', 'Pitch \u2192 Assigned to Priya Raman', ago(4, 8, 30)),
        hist('status', 'Assigned \u2192 Draft', ago(3, 9, 0)),
        hist('status', 'Draft \u2192 In edit', ago(1, 16, 45)),
      ],
      notes: [
        { id: 'nt_cb1', at: ago(1, 17, 0), text: 'Two votes is the story \u2014 get the division list from the clerk\u2019s minutes before we print. \u2014 Elena' },
        { id: 'nt_cb2', at: ago(0, 9, 30), text: 'Clerk\u2019s minutes confirm 7\u20135. Quote from both sides sits in para 9. \u2014 Priya' },
      ],
    }, 4));

    stories.push(story({
      id: 'st_cinema_last_reel', slug: 'cinema-last-reel',
      headline: 'The Palace shows its last reel: inside the final weeks of a 96-year-old cinema',
      standfirst: 'The projector will run one more Saturday. The organ stays; the seats are spoken for.',
      section: 'Culture', writerId: 'w_marisol', status: 'edit', priority: 'high', wordTarget: 2000, wordCount: 1900,
      due: ahead(1), tags: ['cinema', 'heritage'],
      history: [
        hist('created', 'Pitched to the desk', ago(7, 9, 0)),
        hist('status', 'Pitch \u2192 Assigned to Marisol Brandt', ago(7, 9, 30)),
        hist('status', 'Assigned \u2192 Draft', ago(4, 10, 0)),
        hist('status', 'Draft \u2192 In edit', ago(1, 11, 20)),
      ],
      notes: [{ id: 'nt_cine1', at: ago(1, 11, 40), text: 'Lovely. Trim the projectionist\u2019s third anecdote, keep his last line \u2014 it\u2019s the one people will quote. \u2014 Elena' }],
    }, 7));

    stories.push(story({
      id: 'st_mussels', slug: 'mussels',
      headline: 'The mussel beds are coming back. The oyster farmers aren\u2019t sure they\u2019re welcome.',
      standfirst: 'Cleaner water brought the mussels. Cleaner water is also why the leases are being redrawn.',
      section: 'Outdoors', writerId: 'w_rob', status: 'edit', priority: 'normal', wordTarget: 1600, wordCount: 1600,
      due: ahead(1), tags: ['harbour', 'aquaculture'],
      history: [
        hist('created', 'Pitched to the desk', ago(6, 10, 0)),
        hist('status', 'Pitch \u2192 Assigned to Rob MacEwan', ago(6, 10, 20)),
        hist('status', 'Assigned \u2192 Draft', ago(3, 9, 0)),
        hist('status', 'Draft \u2192 In edit', ago(1, 9, 0)),
      ],
      notes: [{ id: 'nt_mus1', at: ago(1, 9, 20), text: 'Good on the science. Consider pairing with June\u2019s oyster-lease figures as one box, not two stories. \u2014 Elena' }],
    }, 6));

    stories.push(story({
      id: 'st_mail_room', slug: 'mail-room',
      headline: 'The post office plans to close its sorting floor by spring',
      standfirst: 'Forty-one jobs, one building, and a promise that \u201Cnothing changes for customers\u201D.',
      section: 'Business', writerId: 'w_june', status: 'edit', priority: 'high', wordTarget: 1200, wordCount: 1100,
      due: ahead(-1), tags: ['jobs', 'post-office'],
      history: [
        hist('created', 'Pitched to the desk', ago(5, 9, 0)),
        hist('status', 'Pitch \u2192 Assigned to June Okafor', ago(5, 9, 15)),
        hist('status', 'Assigned \u2192 Draft', ago(2, 13, 0)),
        hist('status', 'Draft \u2192 In edit', ago(0, 8, 50)),
      ],
    }, 5));

    /* ----- ready (4) ----- */
    stories.push(story({
      id: 'st_bakehouse', slug: 'bakehouse',
      headline: 'New bakehouse on Alder Street opens Friday \u2014 queue expected',
      standfirst: 'The Rasmussen brothers kept the 1911 ovens. Everything else is new.',
      section: 'Business', writerId: 'w_june', status: 'ready', priority: 'normal', wordTarget: 600, wordCount: 640,
      due: ahead(1), tags: ['small-business', 'food'],
      history: [
        hist('created', 'Pitched to the desk', ago(3, 9, 0)),
        hist('status', 'Pitch \u2192 Assigned to June Okafor', ago(3, 9, 10)),
        hist('status', 'Assigned \u2192 Draft', ago(2, 9, 0)),
        hist('status', 'Draft \u2192 In edit', ago(1, 10, 0)),
        hist('status', 'In edit \u2192 Ready', ago(0, 9, 0)),
      ],
    }, 3));

    stories.push(story({
      id: 'st_choir_90', slug: 'choir-90',
      headline: 'Ninety years on, the Calder Choral still rehearses in the same church hall',
      standfirst: 'Three members have sung every season since 1962. The radiators have survived longer.',
      section: 'Culture', writerId: 'w_marisol', status: 'ready', priority: 'normal', wordTarget: 1400, wordCount: 1300,
      due: ahead(3), tags: ['music', 'heritage'],
      history: [
        hist('created', 'Pitched to the desk', ago(5, 10, 0)),
        hist('status', 'Pitch \u2192 Assigned to Marisol Brandt', ago(5, 10, 30)),
        hist('status', 'Assigned \u2192 Draft', ago(3, 11, 0)),
        hist('status', 'Draft \u2192 In edit', ago(2, 15, 0)),
        hist('status', 'In edit \u2192 Ready', ago(1, 10, 30)),
      ],
    }, 5));

    stories.push(story({
      id: 'st_flood_map', slug: 'flood-map',
      headline: 'The new flood map puts 340 homes in the risk zone. Nobody has told them.',
      standfirst: 'The agency published the redrawn zones in a Friday-afternoon PDF. Letters go out \u201Ceventually\u201D.',
      section: 'News', writerId: 'w_elena', status: 'ready', priority: 'lead', wordTarget: 2200, wordCount: 2100,
      due: ahead(0), tags: ['floods', 'housing', 'council'],
      history: [
        hist('created', 'Pitched to the desk', ago(8, 9, 0)),
        hist('status', 'Pitch \u2192 Assigned to Elena Fisher', ago(8, 9, 10)),
        hist('status', 'Assigned \u2192 Draft', ago(5, 9, 0)),
        hist('status', 'Draft \u2192 In edit', ago(3, 14, 0)),
        hist('status', 'In edit \u2192 Ready', ago(2, 9, 40)),
      ],
      notes: [{ id: 'nt_fm1', at: ago(2, 9, 50), text: 'Strongest thing on the desk this week. Verify the 340 against the agency\u2019s own layer before slotting \u2014 the PDF and the web map disagree by six. \u2014 Elena' }],
    }, 8));

    stories.push(story({
      id: 'st_trail_volunteers', slug: 'trail-volunteers',
      headline: 'The ridge trail is maintained by eleven volunteers and a 1994 tractor',
      standfirst: 'The council owns the path. The friends-of group owns everything that can go wrong on it.',
      section: 'Outdoors', writerId: 'w_rob', status: 'ready', priority: 'normal', wordTarget: 1300, wordCount: 1200,
      due: ahead(4), tags: ['trails', 'volunteers'],
      history: [
        hist('created', 'Pitched to the desk', ago(4, 9, 0)),
        hist('status', 'Pitch \u2192 Assigned to Rob MacEwan', ago(4, 9, 20)),
        hist('status', 'Assigned \u2192 Draft', ago(2, 9, 0)),
        hist('status', 'Draft \u2192 In edit', ago(1, 9, 0)),
        hist('status', 'In edit \u2192 Ready', ago(0, 8, 40)),
      ],
    }, 4));

    /* ----- slotted in edition 128 (3) ----- */
    stories.push(story({
      id: 'st_gala_storm', slug: 'gala-storm',
      headline: 'Harbour gala cancelled after gale warning \u2014 organisers scramble',
      standfirst: 'The fireworks barge was already anchored when the Met Office flag went up.',
      section: 'News', writerId: 'w_tomas', status: 'slotted', priority: 'high', wordTarget: 900, wordCount: 850,
      due: ahead(2), tags: ['gala', 'weather'],
      slotId: 's128a',
      history: [
        hist('created', 'Pitched to the desk', ago(2, 7, 30)),
        hist('status', 'Pitch \u2192 Assigned to Tom\u00e1s Vega', ago(2, 7, 40)),
        hist('status', 'Assigned \u2192 Draft', ago(1, 12, 0)),
        hist('status', 'Draft \u2192 In edit', ago(1, 15, 0)),
        hist('status', 'In edit \u2192 Ready', ago(1, 16, 0)),
        hist('status', 'Ready \u2192 Slotted \u2014 Front \u2014 lead (No. 128)', ago(1, 16, 30)),
      ],
      notes: [{ id: 'nt_gs1', at: ago(1, 17, 0), text: 'HOLD \u2014 gala committee confirms the cancellation at noon today. Do not clear until they put it in writing. \u2014 Elena' }],
    }, 2));

    stories.push(story({
      id: 'st_overtime_rules', slug: 'overtime-rules',
      headline: 'New overtime rules split harbour employers',
      standfirst: 'Stevedores call it overdue. The fleet calls it a straw on an already-loaded camel.',
      section: 'Business', writerId: 'w_june', status: 'slotted', priority: 'normal', wordTarget: 1100, wordCount: 1080,
      due: ahead(2), tags: ['jobs', 'harbour'],
      slotId: 's128c',
      history: [
        hist('created', 'Pitched to the desk', ago(6, 9, 0)),
        hist('status', 'Pitch \u2192 Assigned to June Okafor', ago(6, 9, 20)),
        hist('status', 'Assigned \u2192 Draft', ago(4, 10, 0)),
        hist('status', 'Draft \u2192 In edit', ago(3, 10, 0)),
        hist('status', 'In edit \u2192 Ready', ago(2, 11, 0)),
        hist('status', 'Ready \u2192 Slotted \u2014 Page 3 \u2014 Business (No. 128)', ago(2, 14, 0)),
      ],
      notes: [{ id: 'nt_ot1', at: ago(2, 12, 0), text: 'Legal has read it \u2014 fine to print as written. \u2014 Elena' }],
    }, 6));

    stories.push(story({
      id: 'st_derby_preview', slug: 'derby-preview',
      headline: 'Sunday derby preview: what both managers said, and carefully didn\u2019t',
      standfirst: 'Two press conferences, eleven avoided questions, one very loaded team-sheet.',
      section: 'Sport', writerId: 'w_dev', status: 'slotted', priority: 'normal', wordTarget: 900, wordCount: 910,
      due: ahead(3), tags: ['football'],
      slotId: 's128f',
      history: [
        hist('created', 'Pitched to the desk', ago(3, 9, 0)),
        hist('status', 'Pitch \u2192 Assigned to Dev Chauhan', ago(3, 9, 10)),
        hist('status', 'Assigned \u2192 Draft', ago(2, 9, 0)),
        hist('status', 'Draft \u2192 In edit', ago(1, 9, 0)),
        hist('status', 'In edit \u2192 Ready', ago(1, 10, 0)),
        hist('status', 'Ready \u2192 Slotted \u2014 Back page (No. 128)', ago(1, 10, 30)),
      ],
    }, 3));

    /* ----- published in edition 127 (5) ----- */
    const pubHist = (edName, slotLabel) => [
      hist('created', 'Pitched to the desk', ago(9, 9, 0)),
      hist('status', 'Pitch \u2192 Assigned', ago(9, 9, 30)),
      hist('status', 'Assigned \u2192 Draft', ago(8, 10, 0)),
      hist('status', 'Draft \u2192 In edit', ago(6, 10, 0)),
      hist('status', 'In edit \u2192 Ready', ago(5, 10, 0)),
      hist('status', 'Ready \u2192 Slotted \u2014 ' + slotLabel + ' (' + edName + ')', ago(4, 12, 0)),
      hist('status', 'Slotted \u2192 Published \u2014 ' + edName + ' published', ago(3, 16, 20)),
    ];
    const dPast = (n) => ahead(-n);

    stories.push(story({
      id: 'st_water_main', slug: 'water-main',
      headline: 'Water main rupture dries out the east end for a day',
      standfirst: 'A 1952 cast-iron main gave way under Mill Lane at 4:40 in the morning.',
      section: 'News', writerId: 'w_tomas', status: 'published', priority: 'lead', wordTarget: 1400, wordCount: 1380,
      due: dPast(4), tags: ['water', 'infrastructure'],
      slotId: 's127a', publishedAt: ago(3, 16, 20),
      history: pubHist('No. 127', 'Front \u2014 lead'),
    }, 9));
    stories.push(story({
      id: 'st_harbour_swim', slug: 'harbour-swim',
      headline: 'The harbour swim returns after a nine-year ban',
      standfirst: 'Two hundred swimmers, a water-quality pass, and a lifeguard boat borrowed from the rowing club.',
      section: 'Sport', writerId: 'w_dev', status: 'published', priority: 'high', wordTarget: 1000, wordCount: 980,
      due: dPast(4), tags: ['harbour', 'swimming'],
      slotId: 's127b', publishedAt: ago(3, 16, 20),
      history: pubHist('No. 127', 'Front \u2014 secondary'),
    }, 9));
    stories.push(story({
      id: 'st_mini_budget', slug: 'mini-budget',
      headline: 'Regional mini-budget: what the harbour levy actually pays for',
      standfirst: 'Line by line: dredging, the pontoon, and a surprising amount of signage.',
      section: 'News', writerId: 'w_priya', status: 'published', priority: 'normal', wordTarget: 1500, wordCount: 1500,
      due: dPast(4), tags: ['council', 'harbour'],
      slotId: 's127c', publishedAt: ago(3, 16, 20),
      history: pubHist('No. 127', 'Page 3 \u2014 News'),
    }, 9));
    stories.push(story({
      id: 'st_opal_tapestry', slug: 'opal-tapestry',
      headline: 'A tapestry forty years in the making arrives at the customs house',
      standfirst: 'Eleven weavers started it in 1986. Three finished it this spring.',
      section: 'Culture', writerId: 'w_marisol', status: 'published', priority: 'normal', wordTarget: 1200, wordCount: 1150,
      due: dPast(4), tags: ['arts', 'heritage'],
      slotId: 's127d', publishedAt: ago(3, 16, 20),
      history: pubHist('No. 127', 'Culture \u2014 spread'),
    }, 9));
    stories.push(story({
      id: 'st_chickens', slug: 'backyard-chickens',
      headline: 'Backyard chickens, six months in: the eggs, the fox, the bylaw',
      standfirst: 'Forty households registered coops. The fox registered none, but attends regularly.',
      section: 'Outdoors', writerId: 'w_rob', status: 'published', priority: 'normal', wordTarget: 1100, wordCount: 1060,
      due: dPast(4), tags: ['bylaw', 'food'],
      slotId: 's127e', publishedAt: ago(3, 16, 20),
      history: pubHist('No. 127', 'Back page \u2014 Outdoors'),
    }, 9));

    /* ----- killed (2) ----- */
    stories.push(story({
      id: 'st_zip_line', slug: 'zip-line',
      headline: 'Adventure park\u2019s zip-line plan hits planning wall',
      standfirst: '',
      section: 'News', writerId: 'w_tomas', status: 'killed', priority: 'normal', wordTarget: 800, wordCount: 300,
      due: '', tags: ['planning'],
      history: [
        hist('created', 'Pitched to the desk', ago(10, 9, 0)),
        hist('status', 'Pitch \u2192 Assigned to Tom\u00e1s Vega', ago(10, 9, 20)),
        hist('status', 'Assigned \u2192 Draft', ago(9, 10, 0)),
        hist('status', 'Draft \u2192 Killed \u2014 planning appeal drags into winter; revisit in spring', ago(5, 11, 0)),
      ],
      notes: [{ id: 'nt_zip1', at: ago(5, 11, 5), text: 'Kill for now \u2014 the appeal won\u2019t resolve before the print run and the operator won\u2019t comment further. Revisit in spring. \u2014 Elena' }],
    }, 10));

    stories.push(story({
      id: 'st_ghost_kitchen', slug: 'ghost-kitchens',
      headline: 'Ghost kitchens arrive on Front Street',
      standfirst: '',
      section: 'Business', writerId: 'w_june', status: 'killed', priority: 'normal', wordTarget: 900, wordCount: 0,
      due: '', tags: ['food', 'small-business'],
      history: [
        hist('created', 'Pitched to the desk', ago(7, 9, 0)),
        hist('status', 'Pitch \u2192 Assigned to June Okafor', ago(7, 9, 30)),
        hist('status', 'Draft \u2192 Killed \u2014 superseded by the bistro reopening piece', ago(3, 12, 0)),
      ],
    }, 7));

    /* ----- editions ----- */
    const editions = [
      {
        id: 'ed_128', number: 128, name: 'No. 128', date: ed128Date, status: 'draft',
        createdAt: ago(2, 9, 0), publishedAt: null,
        slots: [
          { id: 's128a', label: 'Front \u2014 lead', section: 'News', storyId: 'st_gala_storm', hold: true },
          { id: 's128b', label: 'Front \u2014 secondary', section: 'any', storyId: null, hold: false },
          { id: 's128c', label: 'Page 3 \u2014 Business', section: 'Business', storyId: 'st_overtime_rules', hold: false },
          { id: 's128d', label: 'Culture \u2014 spread', section: 'Culture', storyId: null, hold: false },
          { id: 's128e', label: 'Opinion \u2014 column', section: 'Opinion', storyId: null, hold: false },
          { id: 's128f', label: 'Back page', section: 'Sport', storyId: 'st_derby_preview', hold: false },
        ],
      },
      {
        id: 'ed_127', number: 127, name: 'No. 127', date: ed127Date, status: 'published',
        createdAt: ago(8, 9, 0), publishedAt: ago(3, 16, 20),
        slots: [
          { id: 's127a', label: 'Front \u2014 lead', section: 'News', storyId: 'st_water_main', hold: false },
          { id: 's127b', label: 'Front \u2014 secondary', section: 'any', storyId: 'st_harbour_swim', hold: false },
          { id: 's127c', label: 'Page 3 \u2014 News', section: 'News', storyId: 'st_mini_budget', hold: false },
          { id: 's127d', label: 'Culture \u2014 spread', section: 'Culture', storyId: 'st_opal_tapestry', hold: false },
          { id: 's127e', label: 'Back page \u2014 Outdoors', section: 'Outdoors', storyId: 'st_chickens', hold: false },
        ],
      },
    ];

    /* ----- saved views ----- */
    const views = [
      { id: 'vw_overdue', name: 'Overdue', builtin: true, filters: { q: '', sections: [], status: 'active', writer: '', tag: '', overdue: true }, sort: { key: 'due', dir: 'asc' } },
      { id: 'vw_ready', name: 'Ready to slot', builtin: true, filters: { q: '', sections: [], status: 'ready', writer: '', tag: '', overdue: false }, sort: { key: 'due', dir: 'asc' } },
      { id: 'vw_works', name: 'In the works', builtin: true, filters: { q: '', sections: [], status: 'active', writer: '', tag: '', overdue: false }, sort: { key: 'updated', dir: 'desc' } },
      { id: 'vw_culture', name: 'Culture pipeline', builtin: true, filters: { q: '', sections: ['Culture'], status: 'active', writer: '', tag: '', overdue: false }, sort: { key: 'due', dir: 'asc' } },
      { id: 'vw_ferry', name: 'Ferry coverage', builtin: false, filters: { q: 'ferry', sections: [], status: '', writer: '', tag: '', overdue: false }, sort: { key: 'due', dir: 'asc' } },
    ];

    /* ----- activity seed ----- */
    const activity = [
      { id: 'ac_seed', at: ago(9, 9, 0), kind: 'data', text: 'Sample desk loaded \u2014 9 writers, 2 editions and the week\u2019s stories.' },
      { id: 'ac_ed127', at: ago(3, 16, 20), kind: 'edition', text: 'Edition No. 127 published \u2014 5 stories went to print.' },
      { id: 'ac_pub1', at: ago(3, 16, 20), kind: 'story', text: '\u201CWater main rupture dries out the east end for a day\u201D \u2192 published.' },
      { id: 'ac_floodmap', at: ago(2, 9, 40), kind: 'story', text: '\u201CThe new flood map puts 340 homes in the risk zone\u201D \u2192 ready for slotting.' },
      { id: 'ac_slot1', at: ago(1, 16, 30), kind: 'edition', text: '\u201CHarbour gala cancelled after gale warning\u201D slotted \u2014 Front \u2014 lead (No. 128), on hold.' },
      { id: 'ac_slot2', at: ago(1, 10, 30), kind: 'edition', text: '\u201CSunday derby preview\u201D slotted \u2014 Back page (No. 128).' },
      { id: 'ac_note1', at: ago(1, 17, 0), kind: 'note', text: 'Hold note added on \u201CHarbour gala cancelled after gale warning\u201D.' },
      { id: 'ac_edit1', at: ago(0, 8, 50), kind: 'story', text: '\u201CThe post office plans to close its sorting floor\u201D moved to In edit \u2014 a day past due, chasing the CWU rep.' },
      { id: 'ac_assign1', at: ago(0, 9, 5), kind: 'story', text: '\u201CThe rink\u2019s roof has leaked for three winters\u201D assigned to Dev Chauhan.' },
      { id: 'ac_pitch1', at: ago(0, 8, 15), kind: 'story', text: 'New pitch: \u201CRoute 7 is the town\u2019s slowest bus.\u201D' },
    ];

    return {
      schemaVersion: 1,
      meta: {
        createdAt: ago(9, 9, 0),
        updatedAt: ago(0, 9, 30),
        rev: 42,
        onboarded: false,
        isSample: true,
        paperName: 'The Calder Weekly',
      },
      writers,
      stories,
      editions,
      views,
      activity,
      ui: {
        route: 'board',
        filters: G.domain.defaultFilters(),
        sort: { key: 'due', dir: 'asc' },
        viewId: null,
        editionId: 'ed_128',
        pageSize: 60,
      },
    };
  }

  function blank() {
    return {
      schemaVersion: 1,
      meta: {
        createdAt: G.domain.now(),
        updatedAt: G.domain.now(),
        rev: 1,
        onboarded: false,
        isSample: false,
        paperName: 'My Paper',
      },
      writers: [],
      stories: [],
      editions: [],
      views: [
        { id: 'vw_overdue', name: 'Overdue', builtin: true, filters: { q: '', sections: [], status: 'active', writer: '', tag: '', overdue: true }, sort: { key: 'due', dir: 'asc' } },
        { id: 'vw_ready', name: 'Ready to slot', builtin: true, filters: { q: '', sections: [], status: 'ready', writer: '', tag: '', overdue: false }, sort: { key: 'due', dir: 'asc' } },
        { id: 'vw_works', name: 'In the works', builtin: true, filters: { q: '', sections: [], status: 'active', writer: '', tag: '', overdue: false }, sort: { key: 'updated', dir: 'desc' } },
      ],
      activity: [{ id: G.domain.uid('ac'), at: G.domain.now(), kind: 'data', text: 'Empty desk created.' }],
      ui: {
        route: 'board',
        filters: G.domain.defaultFilters(),
        sort: { key: 'due', dir: 'asc' },
        viewId: null,
        editionId: null,
        pageSize: 60,
      },
    };
  }

  G.data = { sample, blank };
})();
