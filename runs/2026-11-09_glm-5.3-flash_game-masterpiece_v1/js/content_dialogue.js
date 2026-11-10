/* ============================================================
   THE LONG LIGHT — content_dialogue.js
   every conversation, search, repair and piece of paper
   ============================================================
   node: { id?, who, text, next? | opts? | end? }
   opt:  { t, note?, to?, fx?, cond?, show? }
   fx:   { trust:{who:+1}, flags:[..], flagsOff:[..], item:[..], take:[..],
           marks:+2, oilStore:+1, lampOil:+x, repair:{bell:1}, journal:[..],
           selStays:true/false, gaveWatch:true, doc:'doc_x', fn:(s)=>{} }
   ============================================================ */
"use strict";
window.CD = (function () {

  /* =====================================================================
     MONDAY — LOW WATER
     ===================================================================== */
  const ch1_bo_arrive = [
    { id: "a", who: "narr", text: "The Tern comes round the point at slack water, a black hull with one white dog-leg of foam at her bow. She handles the jetty like she's done it in worse dreams than this.", next: "b" },
    { id: "b", who: "bo", text: "Mind the gap. She bites.\n\n(He means the boat. He also, you suspect, means himself.)", next: "c" },
    { id: "c", who: "bo", text: "Bo Halloran. Supply run, Brayhead. Oil, bread, salt, and my opinions, which are free.\n\nYou'll be the niece. Aldo's letter said a keeper was coming. Said it the way a man says a tooth's coming.", opts: [
      { t: "\"I'm the keeper. Not the niece.\"", fx: { trust: { bo: 1 } }, to: "d" },
      { t: "\"Niece, keeper — same difference.\"", note: "He decides about people quickly", to: "d" },
      { t: "\"And you'd be the opinion.\"", fx: { trust: { bo: -1 } }, to: "d" },
    ] },
    { id: "d", who: "bo", text: "Hm. Aldo could make that land. You'll want a week to grow into the coat.\n\nRight. Business. You've three barrels in the store, a week's bread, and a fog coming tomorrow that'll wrap this rock like a wet blanket.", next: "e" },
    { id: "e", who: "bo", text: "Two things I'll say once, sunshine, because I don't like saying things.\n\nOne: your uncle went out in his skiff a week back, at night, with a lantern. Boat came back on the tide. He didn't.\n\nTwo: I don't ferry gossip. Ask me about the oil, the bread, or the weather. Not about Aldo.", opts: [
      { t: "\"Understood. The weather, then.\"", fx: { flags: ["met_bo"], trust: { bo: 1 } }, to: "f" },
      { t: "\"I'll ask anyway, when you're ready.\"", fx: { flags: ["met_bo"] }, to: "f" },
      { t: "\"People don't vanish.\"", fx: { flags: ["met_bo"], trust: { bo: -1 } }, to: "f" },
    ] },
    { id: "f", who: "bo", text: "Weather. Fog tomorrow, whole day of it. Thursday it blows up ugly from the southwest — the Swell-water, the old men call it. Friday, I don't know. Friday I'll be gone.\n\nThe Tern sails Friday noon and I don't stay for sermons. That's the shape of the week.", next: "g" },
    { id: "g", who: "bo", text: "Store's stocked, bread's in the box, manifest's here if you want brass or canvas at Brayhead prices, which are honest and ugly.\n\nI'll be at the jetty most days before the tide turns. Don't wave at me across the water. I see you fine.", opts: [
      { t: "\"Thank you, Bo.\"", fx: { trust: { bo: 1 } }, to: "h" },
      { t: "(Say nothing. Take the manifest.)", to: "h" },
    ] },
    { id: "h", who: "narr", text: "He backs the Tern off the jetty the way other men park cars, and shouts one thing across the widening water:\n\n\"Mind the wick, sunshine! Aldo trimmed it like a woman plucking a brow — you'll butcher it your first week, everyone does!\"", end: true },
  ];

  const ch1_bo_shop = [
    { id: "a", who: "bo", text: "Manifest's short this week. Brayhead's short with me and I'm short with you, that's the weather of commerce.\n\nBrass odds, one mark. Oiled canvas, one mark. Oak braces, two — sawn for a gallery like yours, though I'd thank you not to ask how I know.", opts: [
      { t: "Brass odds (1 mark)", cond: (s) => s.marks >= 1 && !State.hasItem("brass_bag"), fx: { marks: -1, item: ["brass_bag"], flags: ["bought_brass"] }, to: "a2" },
      { t: "Oiled canvas (1 mark)", cond: (s) => s.marks >= 1 && !State.hasItem("canvas"), fx: { marks: -1, item: ["canvas"] }, to: "a2" },
      { t: "Oak braces (2 marks)", cond: (s) => s.marks >= 2 && s.chapter >= 3 && !State.hasItem("braces"), fx: { marks: -2, item: ["braces"] }, to: "a2" },
      { t: "Another barrel of oil (1 mark)", cond: (s) => s.marks >= 1, rep: true, fx: { marks: -1, oilStore: 1 }, to: "a2" },
      { t: "\"Nothing today.\"", to: "b" },
    ] },
    { id: "a2", who: "bo", text: "(He bites the coin, doesn't look at it, pockets it.)\n\nAnything else, or are we done measuring each other?", opts: [
      { t: "(Back to the manifest.)", to: "a" },
      { t: "\"Done.\"", to: "b" },
    ] },
    { id: "b", who: "bo", text: "\"Right. Tide's turning.\"", end: true },
  ];

  const ch1_bo_talk = [
    { id: "a", who: "bo", text: "You want talk, sunshine, you get weather. It's what I stock.\n\nThirty years I've run this supply line. Man at the Brayhead chandlery asked me last spring what I'd do when I gave it up. I said: give what up?", opts: [
      { t: "\"You don't sound like a man ready to stop.\"", fx: { trust: { bo: 1 } }, to: "b" },
      { t: "\"Thirty years is thirty years.\"", to: "b" },
      { t: "\"You said the Tern sails Friday.\"", to: "c" },
    ] },
    { id: "b", who: "bo", text: "No. I sound like a man whose crew is a nephew with sea-sickness and a nephew with debts, and whose boat is older than both. I sound like a man counting barrels so he doesn't count years.\n\nAnyway. Ask the weather, keeper.", end: true },
    { id: "c", who: "bo", text: "It sails. Friday noon, storm or sermon. I've a nephew getting married in Brayhead and a boat that doesn't love this coast in southwest wind.\n\nIf Friday's as ugly as Thursday, you'll be alone on your rock, and you'll wish you'd bought the braces. That's not a sales pitch. Well. It's a bit of a sales pitch.", end: true },
  ];

  const ch1_tower_lens = [
    { id: "a", who: "narr", text: "The great lens stands the height of a man's chest and the width of his shoulders, and the salt haze has put a grey skin on it, like a cataract.\n\nThe wick carriage, the oil pump, the brass winding key — all of it Aldo's hand has polished to the colour of honey.", next: "b" },
    { id: "b", who: "narr", text: "A card, painted neat, is screwed inside the housing:\n\nOIL BEFORE DUSK. WICK AS TALL AS THE LETTER O. LENS TRUE, OR THE LIGHT IS ONLY FIRE.\n\nUnderneath, in different ink, newer: *or the light is an invitation.*", next: "c" },
    { id: "c", who: "narr", text: "You wipe the lens housing with your sleeve. It will need more than a sleeve — charts, cloth, a whole afternoon. The flame, though. The flame you can manage tonight.", opts: [
      { t: "\"Aye. Tonight it burns.\"", fx: { flags: ["lens_seen"] }, to: "d" },
      { t: "(Note what wants mending. Climb down.)", fx: { flags: ["lens_seen"] }, to: "d" },
    ] },
    { id: "d", who: "narr", end: true },
  ];

  const ch1_tower_logs = [
    { id: "a", who: "narr", text: "The log shelf runs the whole curve of the lamp room — fifty years of logbooks in oilskin, spine out, dated in a hand that never slanted in bad weather because bad weather was when it mattered.", next: "b" },
    { id: "b", who: "narr", text: "You find Aldo's last entries without looking for them. They come off the shelf into your hands like they were left at the front.\n\n*Mon —* Water green off the point again. Logged it as weed. It isn't weed.\n*Tue —* Reeve wired. Read his tables. Read them twice.\n*Wed —* If it answers, it answers a light. If it follows, it follows a steady one. Mind the charts. Mind Nell.\n*Thu —* (the line stops. The rest of the page is blank, and the blankness has a pressure, like a held breath.)", next: "c" },
    { id: "c", who: "narr", text: "Nell. That's — you. Nobody has called you that since you were nine years old and afraid of gulls.", opts: [
      { t: "(Put the logbooks back. Square the spines.)", fx: { flags: ["logshelf_read"], journal: ["j_arrival"] }, to: "d" },
      { t: "(Sit with the blank page a while.)", fx: { flags: ["logshelf_read"], journal: ["j_arrival"] }, to: "d" },
    ] },
    { id: "d", who: "narr", text: "The other logbooks are older. The oldest that's left is 1850, and its spine is broken, and you will want to read it — but the light wants walking down to, and the day is spending itself.", end: true },
  ];

  const ch1_cliff_wreck = [
    { id: "a", who: "narr", text: "The path is sheep-track narrow, grass polished slick by a hundred years of keepers' boots. Halfway up the headland, in the lee of a stone wall, lies what the gulls have known about for a long time.\n\nA lifeboat. Keel gone to lacework, thwarts sprung like ribs, her paint scaled off in fever-bright flakes.", next: "b" },
    { id: "b", who: "narr", text: "The name-board is under the thwarts, face-down. You turn it.\n\nSEA-CHANGE\n\nCut deep, painted gold once. Someone loved this boat with letters before the sea had her.", opts: [
      { t: "(Take the coil of rope off the stems.)", fx: { item: ["rope"], flags: ["wreck_seen"], journal: ["j_wreck"] }, to: "c" },
      { t: "(Take rope and the brass from her fittings.)", fx: { item: ["rope", "brass"], flags: ["wreck_seen"], journal: ["j_wreck"] }, to: "c" },
      { t: "(Touch nothing. Leave her her name.)", fx: { flags: ["wreck_seen"], trust: {}, journal: ["j_wreck"] }, to: "c" },
    ] },
    { id: "c", who: "narr", text: "Under the stern sheets, scratched into the wood with something finer than a knife — a nail, a fork, a careful finger:\n\nB. FOR BRAXTON. 1850. THE LIGHT KEPT. THE KEEPER DID NOT COME BACK.\n\nThe wind off the headland moves the grass in one long breath, like the island turning over in its sleep.", next: "d" },
    { id: "d", who: "narr", text: "From up here you can see all of it: the tower, the house with its stopped clocks, the jetty, the far grey line of Widow's Reach across the strait. And between them, the water — flat today, patient today, keeping something under it the way a tongue keeps a word.", end: true },
  ];

  const ch1_house_first = [
    { id: "a", who: "narr", text: "The door opens on the smell of bread and lamp oil and, underneath, the smell of a man: tobacco, soap, wool. The stove is warm. The stove is always warm — Aldo banked it before he left, the way you bank a fire for someone coming home.", next: "b" },
    { id: "b", who: "narr", text: "Two clocks on the wall, both stopped at ten past ten. A third on the shelf, also stopped. Not run down — stopped. Hands set deliberately, like a man closing a ledger he doesn't want arithmetic on.", next: "c" },
    { id: "c", who: "narr", text: "On the kitchen table: a loaf in a cloth, hard cheese under a pot, and a letter from the Commission with a stamp on it like a wax seal on a shop receipt.", opts: [
      { t: "(Take the bread. A keeper eats.)", fx: { item: ["bread"], flags: ["house_seen"] }, to: "d" },
      { t: "(Go through to the study.)", fx: { flags: ["house_seen"] }, to: "d" },
    ] },
    { id: "d", who: "narr", text: "The study door is ajar. Inside, a desk under the window, a chair pushed back at an angle of someone who meant to return — and the window looks at nothing but sea.\n\nA keeper's house is a held breath. You'll want to come back to this room. Rooms like this tell you things slowly, if you let them.", end: true },
  ];

  const ch1_house_mail = [
    { id: "a", who: "narr", text: "The Commission's letter, under its stamp:", next: "b" },
    { id: "b", who: "commission", text: "\"To the Keeper of the Light at Halden Point, greetings —\n\nYou are appointed Keeper of the light at Halden Point, wage eleven shillings the week, in place of Aldo Voss, retired to his rest.\n\nThe Commission reminds the Keeper that the light must not go dark. Not for weather. Not for grief. Not for anything under heaven.\n\nBy order, E. Pargiter, Asst. Sec.\"", next: "c" },
    { id: "c", who: "narr", text: "Across the Commission's face, in pencil, small, half-erased:\n\n*It is not a lighthouse. It is an invitation. — A.V.*", opts: [
      { t: "(Read it again. Every word, twice.)", fx: { journal: ["j_arrival"], doc: "doc_commission1" }, to: "d" },
      { t: "(Fold it away. Work first, grief after.)", fx: { journal: ["j_arrival"], doc: "doc_aldo_pencil" }, to: "d" },
    ] },
    { id: "d", who: "narr", text: "The mail shelf also holds: a tin of pipe tobacco, unopened — Aldo bought it and never got to be an old man with a pipe — and a drawer of small brass marks, the keeper's trade tokens. Two of them.", opts: [
      { t: "(Take the marks. Leave the tobacco.)", fx: { marks: 2, flags: ["mail_read"] }, to: "e" },
      { t: "(Take the marks and the tobacco. Somebody will want one.)", fx: { marks: 2, item: ["pipe"], flags: ["mail_read"] }, to: "e" },
    ] },
    { id: "e", who: "narr", text: "You put the tobacco in your pocket and then take it out, and then put it back. Grief does that: reaches for a thing, apologises, reaches again.", end: true },
  ];

  const ch1_store_first = [
    { id: "a", who: "narr", text: "Three barrels stand shoulder to shoulder, stencilled WINTER OIL — BRAYHEAD. Iron shelves. Aldo's inventory board on the door, chalked in his tidy upright hand:\n\n3 BARRELS. WICKS 5. MATCHES 1 BOX. GLASS CLOTH, LOW.\n\nAnd under it, chalked smaller, newer, and then half-wiped — but chalk remembers:\n\nkeep the light. it isn't for them.", next: "b" },
    { id: "b", who: "narr", text: "On the bottom shelf, behind the barrels: one tin of lamp oil put by, the way a careful man puts by a tin of lamp oil. And a draft through a gap in the stone that wasn't there when the door was shut.", opts: [
      { t: "(Take the tin.)", fx: { item: ["oil_can"], flags: ["store_seen"] }, to: "c" },
      { t: "(Leave it. Ration for a worse week.)", fx: { flags: ["store_seen", "left_tin"] }, to: "c" },
    ] },
    { id: "c", who: "narr", text: "The draft smells of bread and salt. Something, or someone, has been sleeping rougher than the store's tin smell should allow.\n\nYou look at the gap in the stonework for a while. It looks back, in the way of gaps.", end: true },
  ];

  const ch1_store_oil = [
    { id: "a", who: "narr", text: "You move a barrel to the stairhead for the night's pumping. The stencilled WINTER OIL looks less like a label and more like a promise.", opts: [
      { t: "(Stage one barrel by the stairs.)", fx: { fn: (s) => { /* staged — pure flavour */ } }, to: "b" },
      { t: "(Leave them stacked. You'll carry as needed.)", to: "b" },
    ] },
    { id: "b", who: "narr", text: "Whatever Aldo was, he was not careless with oil. You will not be careless with it either. A light that cannot pay for its own burning is only a fire.", end: true },
  ];

  const ch1_bell_look = [
    { id: "a", who: "narr", text: "The bell hangs in her A-frame like a patient patient — a hundred years of saying *here, here, here* into fog, and the fog never once came to see her.\n\nYou strike her with the flat of your hand. The note comes out wrong: bright, then a fizz at the end, like a word with a broken tooth.", next: "b" },
    { id: "b", who: "narr", text: "There it is. A crack, hairline, running down from the crown like a tear nobody wiped.\n\n*Here, here, here-* goes the fizz. In fog, that fizz is the difference between a course and a wish.", opts: [
      { t: "\"Before the fog, then.\"", fx: { flags: ["bell_seen"] }, to: "c" },
      { t: "(Note it. Brass would mend it.)", fx: { flags: ["bell_seen"] }, to: "c" },
    ] },
    { id: "c", who: "narr", end: true },
  ];

  const ch1_skiff_look = [
    { id: "a", who: "narr", text: "Keel up, hauled past the weed line, exactly where a careful man leaves a boat he means to come back to.\n\nYou look under her, at Aldo's request or habit, and the request is in shreds. A plank sprung the full length. Garboard seam open like a mouth. She didn't hit anything to do this — she was *dashed*, by water that came up out of order and with its elbows out.", next: "b" },
    { id: "b", who: "narr", text: "In the bilge, turned to rust and kept anyway: an oar. One oar. A rower with one oar is a swimmer with a plan.", opts: [
      { t: "(Sit on the upturned keel a minute.)", fx: { flags: ["skiff_seen"] }, to: "c" },
      { t: "(She can be mended. Pitch, canvas, rope.)", fx: { flags: ["skiff_seen", "skiff_mendable"] }, to: "c" },
    ] },
    { id: "c", who: "narr", end: true },
  ];

  const cave_closed = [
    { id: "a", who: "narr", text: "The tide is up and the cave's mouth is a black comb of water striking the rock. Nothing today, and nothing about today either — just the sea keeping what it keeps.", opts: [
      { t: "(Come back at low water.)", to: "b" },
    ] },
    { id: "b", who: "narr", end: true },
  ];

  /* =====================================================================
     TUESDAY — THE STOWAWAY
     ===================================================================== */
  const ch2_store_sel = [
    { id: "a", who: "narr", text: "You come in for a barrel and the barrels are breathing.\n\nYou stand very still. Stone walls. Iron door. And one of the stacked sacks breathing, slow and even, with a boot-toe sticking out of it like a guilty bookmark.", next: "b" },
    { id: "b", who: "narr", text: "You give the sack three seconds' warning by clearing your throat.\n\nThe sack detonates. A girl comes out of it all elbows, wedge of bread in one fist, clasp-knife open in the other — and stops, because you haven't moved, and because the knife is a gesture and gestures need an audience.", next: "c" },
    { id: "c", who: "sel", text: "\"Don't — I'm not taking. I was keeping it safe. Oil keeps better with somebody watching it, everyone knows that.\"", opts: [
      { t: "\"Put the knife down, and we'll talk.\"", fx: { flags: ["sel_found"], trust: { sel: 1 } }, to: "d" },
      { t: "\"You're Sel. Bo's been carrying a ghost all week.\"", fx: { flags: ["sel_found"] }, to: "d" },
      { t: "(Just look at her. Wait.)", fx: { flags: ["sel_found"], trust: { sel: 1 } }, to: "d" },
    ] },
    { id: "d", who: "sel", text: "The knife closes. She's sixteen, or nearly, with salt in her eyebrows and the particular stillness of someone who has been practising being invisible.\n\n\"Sel. I came out on the Tern. Under the netting. Bo doesn't know. Bo knows. Bo's pretending he doesn't know because it's easier.\"", next: "e" },
    { id: "e", who: "sel", text: "\"Look — before you send me back. I need to hear it. The water. I need to be where it's saying it.\"", opts: [
      { t: "\"Saying what?\"", to: "f" },
      { t: "\"This isn't a listening place. It's a working one.\"", fx: { trust: { sel: -1 } }, to: "f" },
      { t: "\"Nobody's sending anyone anywhere yet.\"", fx: { trust: { sel: 1 } }, to: "f" },
    ] },
    { id: "f", who: "sel", text: "\"The hum! There's a hum in the water, since — since the spring, since the Cormorant went. My brother was deckhand on her. Jory. He used to whistle at the rail and the crew used to throw things at him, and now the water whistles and I'm the only one who — \"\n\nShe stops. Breathes. Sixteen, holding a whole drowned year at arm's length.", next: "g" },
    { id: "g", who: "narr", text: "The fog has come all the way up the cliff and is leaning on the store's small window, making the oil barrels into soft grey shapes. Outside, somewhere, the Tern's bell. Bo is loading for the day.", opts: [
      { t: "\"The Tern can carry you back today. You're sixteen and I'm not your keeper.\"", fx: { selStays: false, trust: { sel: 0 } }, to: "send" },
      { t: "\"You can stay — for the week. You work. That's the whole bargain.\"", fx: { selStays: true, trust: { sel: 2 }, flags: ["sel_bargain"] }, to: "stay" },
      { t: "\"Nobody rows into fog after a whistle. Stay tonight. We'll talk tomorrow.\"", fx: { selStays: true, trust: { sel: 1 }, flags: ["sel_soft"] }, to: "stay" },
    ] },
    { id: "send", who: "narr", text: "Something closes in her face — not tears, an arithmetic. She has done this sum before: adults, boats, brothers, gone.\n\n\"Right,\" she says, in a voice like a door shutting politely. \"Right.\"", next: "send2" },
    { id: "send2", who: "narr", text: "She folds up out of the sack and stands with her back to the oil shelves, waiting to be walked to the jetty like a parcel.\n\nYou could still change your mind. You probably should. You probably won't.", opts: [
      { t: "(Walk her down. It's decided.)", fx: { flags: ["sel_to_jetty"] }, to: "end" },
      { t: "\"No. Actually. Stay. I've changed my mind.\"", fx: { selStays: true, trust: { sel: 2 } }, to: "stay" },
    ] },
    { id: "stay", who: "narr", text: "She is in the lamp room within the hour, asking the wick's name.\n\nThe oil store, relieved of its tenant, goes back to smelling of winter oil and held breath. But the store will never quite be the same room again. Rooms remember who slept in them.", end: true },
  ];

  const ch2_sel_talk1 = [
    { id: "a", fx: { flags: ["sel_talked1"] }, who: "sel", text: "\"Do you hear it yet? Don't answer. You'll hear it Thursday or you'll never hear it, those are the options.\"", opts: [
      { t: "\"Tell me about the Cormorant.\"", fx: { journal: ["j_cormorant"], trust: { sel: 1 } }, to: "b" },
      { t: "\"How did you get out here, truly?\"", to: "b" },
    ] },
    { id: "b", who: "sel", text: "\"Jory was the funny one. I was the one who got told to stop whistling. He'd whistle at the rail — a little run of five notes, down and up, like a wave you could hold. The crew used to throw rope-ends at him. He'd catch them. Behind his back. Showing off.\"\n\n\"The Cormorant went with all hands, the spring before last. Twelve. The sea kept twelve that year and gave back none, and everyone said, that's the sea. And now the sea is — giving. Boots. A doll's head. Things.\"", next: "c" },
    { id: "c", who: "sel", text: "\"You give a thing back, you can give a man back. That's not stupid. That's just — maths.\"", opts: [
      { t: "\"It's not stupid. It's hope with its coat off.\"", fx: { trust: { sel: 1 } }, to: "d" },
      { t: "\"Sel. The sea doesn't do maths.\"", fx: { trust: { sel: -1 } }, to: "d" },
      { t: "(Say nothing. Let her have the maths.)", to: "d" },
    ] },
    { id: "d", who: "sel", text: "She looks at the window, where fog is doing its slow grey arithmetic on the world.\n\n\"The hum's five notes,\" she says, quieter. \"Down and up. Like a wave you could hold. I'm going to hear it again. And this time I'll whistle back.\"", end: true },
  ];

  const ch2_sel_talk2 = [
    { id: "a", fx: { flags: ["sel_talked2"] }, who: "sel", text: "\"Bo says I stow like a cargo of eels. He said it almost nice.\"", opts: [
      { t: "\"He's warming. Bo warms like a stove — nobody notices till the room's changed.\"", fx: { trust: { sel: 1 }, trust2: { bo: 1 } }, to: "b" },
      { t: "\"He's practical. Practical people keep you alive.\"", to: "b" },
    ] },
    { id: "b", who: "sel", text: "\"Can I ask the question you don't want?\"\n\nShe doesn't wait for permission. Sixteen has no patience for doors.\n\n\"What happened to the keeper before you? Bo won't say and the sea won't and you keep looking at the skiff like it owes you money.\"", opts: [
      { t: "\"He went out with a lantern, a week back. The boat came back.\"", fx: { trust: { sel: 1 } }, to: "c" },
      { t: "\"When I know, you'll know.\"", to: "c" },
    ] },
    { id: "c", who: "sel", text: "\"With a lantern. At night. In the Swell-water.\"\n\nShe sits with that. Then: \"People go to the water when it calls. That's the whole history of coasts.\"\n\nAnd, softer, not really to you: \"I'd go. I'd go tonight.\"", opts: [
      { t: "\"Not while there's work that needs you ashore.\"", fx: { trust: { sel: 1 }, flags: ["sel_anchor"] }, to: "d" },
      { t: "\"Sel. No.\"", fx: { trust: { sel: 1 } }, to: "d" },
    ] },
    { id: "d", who: "sel", text: "\"Aye, keeper.\"\n\nShe says it the way she'll say it for the rest of the week — half mockery, half the other thing. Then she is up the stairs three at a time, because sixteen.", end: true },
  ];

  const ch2_bo_sel = [
    { id: "a", who: "bo", text: "He is not pretending not to know. He is cleaning the Tern's deck with a vigor that suggests the subject.\n\n\"Before you say it. I checked the netting Tuesday last. Empty. I checked it Friday. Girl-shaped. I said nothing, because she said she'd only swim back, and I believed her.\"", opts: [
      { t: "\"She stays. She works. I'm answerable.\"", fx: { trust: { bo: 1 }, trust2: { sel: 1 } }, to: "b" },
      { t: "\"You should have told me day one.\"", fx: { trust: { bo: -1 } }, to: "b" },
    ] },
    { id: "b", who: "bo", text: "\"Aye, and when the Commission hears a keeper's keeping a stowaway, it's my manifest they read twice.\"\n\nHe stops scrubbing. Looks out at the fog.\n\n\"Her brother Jory. Good lad. Terrible whistler. If the water's come back to this coast to give things back — \" He shuts his mouth on the rest of it like a man biting a coin.", opts: [
      { t: "\"If it gives things back, we'll be here to see it. Both of us.\"", fx: { trust: { bo: 1 }, flags: ["bo_soft"] }, to: "c" },
      { t: "\"Superstition, Bo.\"", fx: { trust: { bo: -1 } }, to: "c" },
    ] },
    { id: "c", who: "bo", text: "\"Hm.\"\n\nHe hands you the manifest. Which is Bo for: discussion closed, commerce open, and I may have said more than I meant.", end: true },
  ];

  const ch2_house_charts = [
    { id: "a", who: "narr", text: "The study at noon, with the fog pressing at the glass like a customer at a counter.\n\nThe desk is Aldo's and the desk is honest: it does not pretend he'll be back. You go through it the way you'd go through a man's pockets at a wake — gently, and thoroughly.", next: "b" },
    { id: "b", who: "narr", text: "Under the blotter, folded in oilcloth: drawings of the great lens. Every facet numbered. The glass cloth, for cleaning, wrapped in the same cloth — he was keeping them together, because they belong together.", next: "c" },
    { id: "c", who: "narr", text: "In the margins of the drawings, worked over and over, pencil on pencil:\n\nA STEADY FLAME STANDS STILL. A THING LOST WALKS TOWARD WHAT STANDS STILL.\nA LIGHT THAT ERRS CANNOT BE FOLLOWED HOME.\nA BELL IS A VOICE THAT ENDS.", opts: [
      { t: "(Read the bottom corner too.)", fx: { item: ["charts"], flags: ["charts_read"], journal: ["j_steady"], doc: "doc_charts" }, to: "d" },
      { t: "(Enough. That's enough for one day.)", fx: { item: ["charts"], flags: ["charts_read"], journal: ["j_steady"] }, to: "d" },
    ] },
    { id: "d", who: "narr", text: "The bottom corner, crossed out once, written again smaller:\n\n*Go dark, and drift, and come home some morning it has forgotten you.*\n\nThe fog at the window leans closer, as if it too is reading.", end: true },
  ];

  const ch2_cliff_cave = [
    { id: "a", who: "narr", text: "Low water, and the sea pulls its skirt back from the point. The cave mouth shows itself: black stone, green weed, and a cold that comes out of it like a held note.\n\nYou go in with the lamp, and the lamp is glad of the work.", next: "b" },
    { id: "b", who: "narr", text: "The floor is wet sand and lying water. And the walls — the walls have a tally cut into them, generations of a knife moving slow:\n\n1762\n1850\n1938\n\nNothing since. Spaces as regular as teeth. Something comes, and between the comings, the sea begins to return things.", next: "c" },
    { id: "c", who: "narr", text: "Things. Here at your feet, the sea's lending, tidily arranged by nothing human: a boot with barnacles for buttons. A bible swelled to twice itself, every page a fossil of every page. A ship's bell gone green as riverstone. A child's shoe. A pocket of letters tied in oilcloth that no longer opens.", opts: [
      { t: "(Take the pot of pitch wedged in the rack.)", fx: { item: ["pitch"], journal: ["j_low_water"], flags: ["cave1"] }, to: "d" },
      { t: "(Touch nothing. This is somebody's else's parlour.)", fx: { journal: ["j_low_water"], flags: ["cave1"] }, to: "d" },
    ] },
    { id: "d", who: "narr", text: "At the cave mouth, looking out: the fog bank offshore has a slow green light in it, deep down, moving with the water and not with the wind.\n\nYou watch it for a long time. It does not mind being watched. That's the worst of it.", end: true },
  ];

  const ch2_tam_wire = [
    { id: "a", who: "narr", text: "The wire from Widow's Reach came at first fog — Morse hammered out across the strait and handed up the cliff by the line-boy like a bucket of water:\n\nFUG YOU MEAN FOG. BELL WEATHER COMING. IS YOUR BELL SOUND. MINE IS TUNED AND I AM DEAF AS A POST AND STILL IT KEEPS THE SHIPS OFF. RING IT SOON AND RING IT OFTEN. REEVE.", next: "b" },
    { id: "b", who: "narr", text: "Under it, the operator has appended, apologetically:\n\n*P.S. The old man wires this every fog for forty years. First time anyone's been here to take it down in living memory.*", opts: [
      { t: "(Wire back: BELL CRACKED. MENDING TODAY. THANK YOU, HALDEN POINT.)", fx: { flags: ["answered_tam"], trust: { tam: 1 } }, to: "c" },
      { t: "(Wire the Commission instead. Protocol is a comfort.)", fx: { flags: ["answered_tam"] }, to: "c" },
    ] },
    { id: "c", who: "narr", text: "There's a second paper under the first. Tam's tables — the eighty-eight year turn — with a covering note:\n\n*They filed these under OPINIONS in 1938. I have copied them fresh. If your hand goes beside mine, it stops being one mad old man's weather-sense and starts being a station's report. — T.R.*", opts: [
      { t: "(Stamp it. Co-sign it. Send it.)", fx: { flags: ["co_signed"], trust: { tam: 2 }, journal: ["j_co_signed"], doc: "doc_co_sign" }, to: "d" },
      { t: "(Hold it. A keeper's stamp is a weight.)", fx: { flags: ["held_tables"] }, to: "d" },
    ] },
    { id: "d", who: "narr", text: "The stamp comes down on the paper like a small brass verdict: HALDEN POINT LIGHT — KEPT.\n\nForty years of one-sided letters, and today the coast wrote back.", end: true },
  ];

  const ch2_bell_mend = [
    { id: "a", who: "narr", text: "Brass, heat, a steady hand. The crack wants closing like a wound wants closing — from the inside, patiently, in layers.", next: "b" },
    { id: "b", who: "narr", text: "By afternoon the fizz has gone out of her voice. You strike her.\n\n*Here.*\n\nOne clean note, and the fog takes it and keeps it, the way fog does.", opts: [
      { t: "(Ring her once more, for the pleasure.)", fx: { repair: { bell: 1 }, fn: () => { State.takeItem(State.hasItem("brass") ? "brass" : "brass_bag"); window.Snd.play("bell", { times: 2 }); } }, to: "c" },
      { t: "(Done. The night will want her.)", fx: { repair: { bell: 1 }, fn: () => State.takeItem(State.hasItem("brass") ? "brass" : "brass_bag") }, to: "c" },
    ] },
    { id: "c", who: "narr", text: "Mended, not tuned. Tuning is an ear's work, and the only ear on this coast that qualifies is across the strait.", end: true },
  ];

  const ch2_lens_clean = [
    { id: "a", who: "narr", text: "The charts say every facet has a name and a number and a mood. You climb with the glass cloth and the drawings, and you give the great lens the afternoon.", next: "b" },
    { id: "b", who: "narr", text: "Salt haze off, facet by facet, number by number. By dusk the lens holds the room in itself, curved and bright, and the flame doubled and doubled again stands in her middle like a heart that finally has its shape.", opts: [
      { t: "(True the winding key to Aldo's card: as tall as the letter O.)", fx: { repair: { lens: 1 } }, to: "c" },
      { t: "(Good. She'll hold tonight.)", fx: { repair: { lens: 1 } }, to: "c" },
    ] },
    { id: "c", who: "narr", text: "From the gallery: fog to the whole horizon, and the far green light under it, in no hurry at all.", end: true },
  ];

  const ch2_skiff_mend = [
    { id: "a", who: "narr", text: "Pitch, heat, the sprung plank coerced home. It's a job for two hands and a knee and language you wouldn't use in front of the Commission.", next: "b" },
    { id: "b", who: "narr", text: "By dark the seam is closed and black and honest. Not seaworthy yet — canvas on the thwarts, rope in the stays — but caulked. A boat with a plan.", fx: { repair: { skiff: 1 }, fn: () => State.takeItem("pitch") }, opts: [
      { t: "(Look at her a while.)", to: "c" },
      { t: "(Cover her, and leave her kept.)", to: "c" },
    ] },
    { id: "c", who: "narr", end: true },
  ];

  /* =====================================================================
     WEDNESDAY — WIDOW'S REACH
     ===================================================================== */
  const ch3_tam_wire = [
    { id: "a", who: "narr", text: "The line-boy comes up the cliff at forenoon with a spool of the day's wire and the expression of a boy carrying somebody's soul in a bucket.\n\nTam Reeve has sent not a wire but a correspondence. Nine hundred words. In Morse. To a keeper he has never met, about a bell.", next: "b" },
    { id: "b", who: "tam", text: "*KEEPER. YOU STAMPED MY TABLES. I HAVE READ YOUR NAME FORTY YEARS IN OTHER MEN'S REPORTS AND NOW IT IS BESIDE MINE, WHICH IS A STRANGE WEATHER. LET US DO THE WORK.*", next: "c" },
    { id: "c", who: "tam", text: "*FIRST. YOUR BELL. MENDED IS NOT TUNED. A CRACKED BELL SHOUTS. A TUNED BELL ANSWERS. FILE THE SEAM, SEAT THE CLAPPER, AND SHE WILL CARRY ACROSS THE BAR WHERE A SHOUT CARRIES TEN FEET AND DIES.*", next: "d" },
    { id: "d", who: "tam", text: "*SECOND. THE THING YOUR UNCLE LOGGED AND MY GRANDFATHER LOGGED AND A MAN CALLED BRAXTON LOGGED IN 1850 — IT IS NOT WEATHER. IT IS A TIDE THAT GOT LOST AND NEVER FOUND HOME, AND IT IS LONELY, AND LONELY FOLLOWS A STEADY LIGHT LIKE A DOG FOLLOWS A WHISTLE.*", opts: [
      { t: "(Wire back: HOW DO WE KEEP THE SHIPS OFF IT?)", fx: { flags: ["tam_talked"], trust: { tam: 1 }, journal: ["j_tam_talked"] }, to: "e" },
      { t: "(Wire back: AND IF IT FOLLOWS THE LIGHT?)", fx: { flags: ["tam_talked"], trust: { tam: 1 }, journal: ["j_tam_talked"] }, to: "e" },
    ] },
    { id: "e", who: "tam", text: "*THEN THE LIGHT MUST NOT BE A THING THAT CAN BE FOLLOWED HOME. RING YOUR BELL IN WEATHER. A BELL IS A VOICE THAT ENDS. IT CANNOT BE FOLLOWED HOME BECAUSE THERE IS NO HOME IN IT — ONLY SOUND, AND THEN THE FOG.*", next: "f" },
    { id: "f", who: "tam", text: "*THIRD AND LAST. THURSDAY THE WATER STANDS. FRIDAY IT RISES. MY LIGHT WILL BURN ACROSS FROM YOU AND I WILL WATCH YOUR FLAME AND YOU MAY WATCH MINE, AND IF EITHER GOES DARK THE OTHER WILL KNOW THE DIFFERENCE BETWEEN GONE AND SLEEPING.*\n\n*FORTY YEARS I WIRE THIS COAST. YOU ARE THE FIRST THAT WIRED BACK. IT IS A GOOD COAST. IT WAS ONLY QUIET.* — T. REEVE, WIDOW'S REACH, KEEPER.", opts: [
      { t: "(Wire back: THEN WE KEEP EACH OTHER'S LIGHT. — HALDEN POINT.)", fx: { trust: { tam: 2 }, flags: ["tam_pact", "tam_coached"] }, to: "g" },
      { t: "(Wire back: UNDERSTOOD. THANK YOU, KEEPER.)", fx: { trust: { tam: 1 }, flags: ["tam_coached"] }, to: "g" },
    ] },
    { id: "g", who: "narr", text: "The line-boy, waiting: \"He'll have that up on his wall, you know. The old man keeps every wire he's ever had answered. That's — \" the boy blushes at his own arithmetic — \"that's one wire, now.\"", end: true },
  ];

  const ch3_bell_tune = [
    { id: "a", who: "narr", text: "Tam's instructions, pinned to the A-frame where the rain can't argue with them: FILE THE SEAM. SEAT THE CLAPPER. STRIKE, LISTEN, STRIKE AGAIN.\n\nThe rain keeps the file company. The bell keeps both honest.", next: "b" },
    { id: "b", who: "narr", text: "By the turn of the tide she is a different instrument. You strike her, and the note goes out over the water flat and clean and long, and somewhere out in the rain a thing that has been holding its breath for eighty-eight years hears it and — stills.", fx: { repair: { bell: 2 }, journal: ["j_bell_song"] }, opts: [
      { t: "(Ring her three times, for practice.)", fx: { fn: () => window.Snd.play("bell", { times: 3 }) }, to: "c" },
      { t: "(Enough. Save her voice for fog.)", to: "c" },
    ] },
    { id: "c", who: "narr", end: true },
  ];

  const ch3_bo_warn = [
    { id: "a", who: "bo", text: "Rain straight as nails. Bo stands under the jetty awning like a man weatherproofed by disapproval.\n\n\"You've been reading Reeve's tables. I can tell. You've got the face. It's the face of a person about to make work for me.\"", opts: [
      { t: "\"Wire Brayhead. Tell the fleet to stay in Friday.\"", fx: { trust: { bo: 1 } }, to: "b" },
      { t: "\"The tables are right. You know they're right.\"", fx: { trust: { bo: 1 } }, to: "b" },
    ] },
    { id: "b", who: "bo", text: "\"I know the tables are *early*, which is worse. Early warns nobody and panics everybody.\"\n\nHe chews it over. Rain finds the one gap in the awning and hits his shoulder, as rain does.\n\n\"Fleet master's name is Pentreath. He trusts no one and me least. If I wire him, he'll wire back asking who stamped it.\"", opts: [
      { t: "\"A keeper of Halden Point stamped it.\"", fx: { trust: { bo: 1 } }, to: "c" },
      { t: "\"Then let him ask.\"", to: "c" },
    ] },
    { id: "c", who: "narr", text: "Bo looks at you for a long moment, rain dripping off the awning's edge in a slow count.\n\n\"Right,\" he says. \"Right. I'll wire it tonight, keeper, and if you're wrong I'll never let you forget it, and if you're right I'll take the Tern out Friday whether she loves it or not.\n\nThat's not sentiment. That's how a supply man shakes hands.\"", fx: { flags: ["fleet_warned"] }, opts: [
      { t: "\"That's the finest handshake I've had all year.\"", fx: { trust: { bo: 1 } }, to: "d" },
      { t: "\"Done, then.\"", fx: { journal: [] }, to: "d" },
    ] },
    { id: "d", who: "narr", text: "He goes into the wheelhouse to compose the wire, and you hear him typing the way other men pray.", end: true },
  ];

  const ch3_lens_finish = [
    { id: "a", who: "narr", text: "Tam's wire had a PS, because Tam's wires always have a PS:\n\n*P.S. YOUR LENS. SEAL THE FACET SEAMS WITH WAX AND BRASS, TIGHT AS A DRUM, AND SHE WILL NOT DRIFT IN THE UGLY WEATHER. DRIFTING LENSES MAKE LYING LIGHTS AND LYING LIGHTS MAKE WRECKS.*", next: "b" },
    { id: "b", who: "narr", text: "Wax and brass, and the whole wet afternoon for it. The great lens comes out of the work sealed and steady, a made thing instead of a kept thing.", fx: { repair: { lens: 2 } }, opts: [
      { t: "(Stand in her light a moment.)", to: "c" },
      { t: "(Back down the ninety-three steps.)", to: "c" },
    ] },
    { id: "c", who: "narr", text: "From the gallery at dusk: rain on the water, and the far steady point of Widow's Reach across the strait, burning like a held breath in someone else's chest.", end: true },
  ];

  const ch3_sel_listen = [
    { id: "a", fx: { flags: ["sel_rain"] }, who: "narr", text: "You find her at the cliff head in the rain, hood down, hair flat to her skull, listening to the water like it owes her five notes.\n\n\"Sel. You'll take your death.\"", next: "b" },
    { id: "b", who: "sel", text: "\"It's *closer*. Under the rain. Can't you — \"\n\nShe stops. Looks at your face. Adjusts.\n\n\"It's under the rain,\" she says, stubbornly, the way people say true things. \"Thursday, Bo says. Thursday the water stands.\"", opts: [
      { t: "\"Then Thursday I'll listen with you.\"", fx: { trust: { sel: 2 }, flags: ["sel_promise"] }, to: "c" },
      { t: "\"Thursday you'll be inside, dry, where I can see you.\"", fx: { trust: { sel: 1 }, flags: ["sel_anchored"] }, to: "c" },
    ] },
    { id: "c", who: "sel", text: "She takes your sleeve, tugs it once, and lets go — the entire vocabulary of a girl who has been handling grown-ups' refusals since she was twelve.\n\n\"Do you know what's stupid? I'm not even cold. The water's warm this year. Everyone says that's wrong. I say the water's just — awake.\"", end: true },
  ];

  const ch3_house_mail = [
    { id: "a", who: "narr", text: "Morning mail, under the door in its oilskin roll: the Commission's answer to a stamped wire that two keepers put their names to.", next: "b" },
    { id: "b", who: "commission", text: "*THE COMMISSION NOTES THE OPINIONS OF THE KEEPERS OF HALDEN POINT AND WIDOW'S REACH AND WILL ADVISE CAPTAINS OF COMMERCIAL TRAFFIC ACCORDINGLY. THE COMMISSION REMINDS KEEPERS THAT THE LIGHT MUST NOT GO DARK. THIS CLAUSE HAS NO EXCEPTIONS AND NEVER HAS. — E. PARGITER, ASST. SEC.*", opts: [
      { t: "(\"Opinions.\" Two keepers and eighty-eight years. *Opinions.*)", fx: { journal: ["j_commission2"], flags: ["commission_replied"] }, to: "c" },
      { t: "(File it. There'll be a use for paper.)", fx: { journal: ["j_commission2"], flags: ["commission_replied"] }, to: "c" },
    ] },
    { id: "c", who: "narr", text: "Under the Commission's envelope, a battered parcel, string and brown paper, addressed in a careful widower's hand:\n\n*TO THE KEEPER OF HALDEN POINT. A WATCH-GLASS. IT MAKES THE FAR HORIZON HONEST. YOU WILL WANT THAT THURSDAY. — T.R.*", opts: [
      { t: "(Take the watch-glass.)", fx: { item: ["glass"], trust: { tam: 1 }, fn: () => window.Snd.play("page") }, to: "d" },
    ] },
    { id: "d", who: "narr", text: "Brass telescope, dented at the eyepiece where a thumb has rested for forty years. It still smells, faintly, of pipe tobacco and the inside of a lamp room.", end: true },
  ];

  const ch3_skiff_finish = [
    { id: "a", who: "narr", text: "Canvas over the thwarts, rope in the stays, the garboard seam black and sound. Aldo's skiff, a boat again. She sits in the rain like a word somebody has finally finished saying.", fx: { repair: { skiff: 2 }, fn: () => { State.takeItem("canvas"); State.takeItem("rope"); } }, opts: [
      { t: "(Press a palm to the hull. It's warm, with weather coming.)", to: "b" },
    ] },
    { id: "b", who: "narr", end: true },
  ];

  /* =====================================================================
     THURSDAY — WHAT THE WATER REMEMBERS
     ===================================================================== */
  const ch4_cave_watch = [
    { id: "a", who: "narr", text: "Low water, Thursday. The sea is wrong. Not rough — wrong. It stands too high at the edges and too flat in the middle, like a sheet pulled by someone deciding.\n\nThe cave mouth is open, and inside, the lending has grown overnight.", next: "b" },
    { id: "b", who: "narr", text: "The boot. The bible. The green bell. The child's shoe. And new, in the middle of the wet sand, placed — placed is the word, nothing else washes up *placed* — a silver pocket watch.", next: "c" },
    { id: "c", who: "narr", text: "You pick it up and it is ticking and it is warm.\n\nInside the case, engraved: *J. TRELOWEN — FROM ALL OF US, CORMORANT '34.*\n\nJ. Trelowen. Jory Trelowen. Deckhand of the Cormorant, lost with all hands. Whistler of five notes.", opts: [
      { t: "(Take it to Sel at once.)", fx: { item: ["watch"], flags: ["watch_found"], journal: ["j_lent_things", "j_watch"], trust: { sel: 1 } }, to: "d" },
      { t: "(Keep it in the satchel. It's evidence, or an instrument.)", fx: { item: ["watch"], flags: ["watch_found"], journal: ["j_lent_things", "j_watch"] }, to: "d" },
    ] },
    { id: "d", who: "narr", text: "The watch ticks against your palm. It ticks evenly, and then — as the green light under the offshore water brightens a shade — it hurries.\n\nIt hurries like something trying to warn you, or something trying to keep time with its own drowning.", opts: [
      { t: "(Look out at the water. The water looks back, and does not mind.)", to: "e" },
    ] },
    { id: "e", who: "narr", end: true },
  ];

  const ch4_sel_hum = [
    { id: "a", who: "sel", text: "\"You promised.\"\n\nShe's on the cliff head with her hood down and the afternoon standing on edge, and the water below is standing too — standing, not moving, a flat wrong calm from here to Widow's Reach.", opts: [
      { t: "\"I promised. Listen with me, then.\"", fx: { flags: ["listening"] }, to: "b" },
      { t: "\"I promised I'd listen. Not that I'd hear.\"", fx: { flags: ["listening"], trust: { sel: -1 } }, to: "b" },
    ] },
    { id: "b", who: "narr", text: "You sit on the cold turf and you listen.\n\nWind. Weed. The tick of the silver watch in your pocket — no. In *her* collar now, warm against her skin, ticking. Ticking faster than watches tick.\n\nAnd under it, under everything, like a note you've been hearing all week and only now hearing: the hum.", next: "c" },
    { id: "c", who: "narr", text: "Five notes. Down, then up. Like a wave you could hold. Like a whistle at a rail.\n\nThe hum comes from under the flat water, and it is asking something. The question has no words, but it has a shape, and the shape is: *are you there? are you there? are you there?*", next: "d" },
    { id: "d", who: "sel", text: "\"There. THERE. That's Jory's run — he whistled it at the rail, down and up — \"\n\nShe is on her feet, and she has her fingers at her lips, and she is going to whistle back to a sea that has swallowed twelve men whole.", opts: [
      { t: "(Stop her hand. Gently. *Now.)*", fx: { trust: { sel: 2 }, flags: ["hum_learned", "stopped_whistle"] }, to: "e" },
      { t: "(Let her whistle. What harm in answering?)", fx: { flags: ["hum_learned", "let_whistle"], trust: { sel: -1 } }, to: "e" },
    ] },
    { id: "e", who: "sel", text: "She holds. Whether because of your hand or her own nerve, she holds.\n\n\"It's a question,\" she says, and her voice has gone old and careful. \"Aren't you going to answer it?\"\n\nAnd the watch against her collar hurries, hurries, hurries.", opts: [
      { t: "\"Yes. In a voice it can't follow. That's the work.\"", fx: { flags: ["hum_learned"], trust: { sel: 1 } }, to: "f" },
      { t: "\"Not today. Not from a cliff. From the lamp room, with the whole coast to hear it.\"", fx: { flags: ["hum_learned"], trust: { sel: 1 } }, to: "f" },
    ] },
    { id: "f", who: "narr", text: "You sit until the light goes the colour of bruises, and the hum goes on asking, and neither of you whistles.\n\nWhen you stand to go, Sel says, without turning: \"Keeper. Whatever it's for — the light, I mean. It's for *hearing* things like this, isn't it? Somebody has to be here to hear.\"", opts: [
      { t: "\"That's the truest sentence spoken on this rock all week.\"", fx: { trust: { sel: 1 } }, to: "g" },
      { t: "\"The light is for the ships.\"", fx: { trust: { sel: -1 } }, to: "g" },
    ] },
    { id: "g", who: "narr", end: true },
  ];

  const ch4_sel_givewatch = [
    { id: "a", who: "narr", text: "Sel is mending net in the doorway, because Sel has decided this is her house now and houses want mending.\n\nThe watch sits in your pocket, ticking its strange quick tick whenever the water stands up.", opts: [
      { t: "\"Sel. There's something the tide gave back.\"", fx: { flags: ["offering_watch"] }, to: "b" },
      { t: "(Keep it. An instrument is an instrument.)", to: "c" },
    ] },
    { id: "b", who: "narr", text: "You hold it out. She doesn't take it — she reads the case, both hands over her mouth, and then reads it again, and then her knees go and she sits down hard on the step with the watch held out flat like a wafer.", next: "b2" },
    { id: "b2", who: "sel", text: "\"That's — you got this from the SEA?\"\n\nIt is not grief on her face. It is arithmetic. Hope, doing sums it has been forbidden to do for two years.", opts: [
      { t: "\"It's yours. It was always going to be yours.\"", fx: { gaveWatch: true, take: ["watch"], trust: { sel: 2 }, journal: ["j_watch"] }, to: "d" },
      { t: "\"It's ours. You wear it. I need its tick at night.\"", fx: { gaveWatch: true, trust: { sel: 2 }, journal: ["j_watch"], flags: ["watch_shared"] }, to: "d" },
    ] },
    { id: "c", who: "narr", text: "You keep it. Its tick is the only instrument on this coast that hears the water standing up — you'll need it at night, in the dark, with the whole sky wrong.\n\nSel asks, once, quietly, if you'd sell it. You say no. She doesn't ask again. Something in the way she says *no, of course* is older than sixteen.", fx: { journal: ["j_watch"] }, to: "end" },
    { id: "d", who: "narr", text: "She wears it under her collar, against her skin, and for the rest of the week she touches it when she thinks nobody's looking, the way people touch doorframes they grew up in.\n\nIt still hurries when the water stands. But it is warm on her and it is hers, and some instruments measure the water, and that one measures her.", end: true },
    { id: "end", who: "narr", end: true },
  ];

  const ch4_house_letter = [
    { id: "a", who: "narr", text: "The study, for the fourth time. The desk, the chair, the window that looks at sea.\n\nAnd this time, because the week has taught you how Aldo kept things — carefully, in order, one shelf down from where a stranger would look — you go down on your knees to the floorboards.", next: "b" },
    { id: "b", who: "narr", text: "The third board from the wall lifts. Under it, wrapped in the same oilcloth as everything Aldo ever meant to survive: a letter, folded twice.\n\nYour name on the outside. Not *the keeper*. Your name.", next: "c" },
    { id: "c", who: "aldo", text: "*Nell.*\n\n*By the time you read this I will have tried to be clever, and clever men drown.*\n\n*The Swell is come early, as Reeve said. It is lonely. Everything lonely follows. I mean to take the lantern out and let it follow me past the Reach, and then to go dark, and drift, and come home some morning it has forgotten me.*\n\n*The trick is not to lead it. The trick is to walk beside it until it forgets you were ever light at all.*", next: "d" },
    { id: "d", who: "aldo", text: "*If I am slow coming home: mind the lamp first. Grieve after. The light is for the living, and you were always the livingest thing I ever kept.*\n\n*— your Uncle A.*\n\n*(P.S. The skiff is in the bilge for a reason. The garboard will tell you what to do. The sea takes one keeper a turn — it has never yet needed two.)*", opts: [
      { t: "(Fold it. Put it in the satchel. Stand up.)", fx: { item: ["letter_aldo"], flags: ["aldo_letter"], journal: ["j_aldo_letter", "j_vesper"] }, to: "e" },
      { t: "(Read it again. *Mind the lamp first. Grieve after.*)", fx: { item: ["letter_aldo"], flags: ["aldo_letter"], journal: ["j_aldo_letter", "j_vesper"] }, to: "e" },
    ] },
    { id: "e", who: "narr", text: "He knew about the Vesper. Eleven years you've carried it and he knew — knew and kept the light anyway, and kept you, and never said, because what would saying have done?\n\nWhat it does: makes the grieve-after part possible. That's all. That's everything.", end: true },
  ];

  const ch4_bo_settle = [
    { id: "a", who: "bo", text: "He's got the Tern's deck grey with rain and his jaw set greyer.\n\n\"Friday noon I sail. Say what you've come to say, sunshine, and say it quick — the tide doesn't argue.\"", opts: [
      { t: "\"The water rises tomorrow night. Reeve's tables, my stamp, Pentreath's wire.\"", cond: (s) => s.flags.fleet_warned, fx: {}, to: "b" },
      { t: "\"Don't sail. One night. For her.\"", cond: (s) => s.selStays !== false, fx: { trust: { bo: 0 } }, to: "b" },
      { t: "\"You said thirty years and no sermons. One night, Bo.\"", fx: { trust: { bo: 1 } }, to: "b" },
    ] },
    { id: "b", who: "bo", text: "He doesn't answer at once. He looks at the skiff — mended, if you mended it, keel-up if you didn't — and at the tower, and out at water that is standing the wrong way.\n\n\"Thirty years I've brought oil to that light. Never once seen what it's *for*. Seen ships, seen wrecks, seen you folk staring at water like it's a letter.\"", next: "c" },
    { id: "c", who: "bo", text: "\"My crew's ashore at a wedding. Boat's mine. So it's mine to risk.\"", opts: [
      { t: "\"I'm not asking you to risk her. I'm telling you tomorrow she'll matter.\"", fx: { trust: { bo: 1 }, flags: ["bo_settled"] }, to: "d" },
      { t: "\"Then I'll say it plain: I need the Tern out there tomorrow night.\"", fx: { trust: { bo: 1 }, flags: ["bo_settled"] }, to: "d" },
      { t: "\"Sail, then. I'll keep the light alone. That's the job.\"", fx: { flags: ["bo_settled", "bo_gone"], trust: { bo: -1 } }, to: "d" },
    ] },
    { id: "d", who: "bo", text: "\"Hm.\"\n\nHe turns the wheel-spoke with his thumb, once, all the way round.\n\n\"Friday dusk I'll stand her off the strait, engine at slow. If your light burns all night, I'll see it all night, and I'll tell my nephew at the wedding that his aunt married into a family of idiots.\"\n\nHe almost — *almost* — smiles. \"The oil, keeper. Buy the oil.\"", fx: { flags: ["bo_settled"] }, opts: [
      { t: "\"Buy the oil. Aye.\"", fx: { trust: { bo: 1 } }, to: "e" },
      { t: "\"You'll see it burn.\"", to: "e" },
    ] },
    { id: "e", who: "narr", end: true },
  ];

  const ch4_vesper = [
    { id: "a", who: "narr", text: "Bo is oiling the Tern's engine like a surgeon with a grudge. You sit on the rail, because the day is heavy, and some things go easier saying them to hands that are busy.", opts: [
      { t: "\"Bo. Eleven years ago I doused a light in a storm. Saved the oil, per the manual.\"", fx: { flags: ["told_bo"] }, to: "b" },
      { t: "(Say nothing. Some weights are carried, not shared.)", to: "end" },
    ] },
    { id: "b", who: "narr", text: "The oil-cloth stops moving.\n\n\"Stone Quay,\" he says. Not a question. \"The Vesper. I was at Brayhead quay that night. We heard her go — no fog, mind, no fog at all, just a dark patch where a light had been and then the rocks.\"", next: "c" },
    { id: "c", who: "bo", text: "\"Three men. You doused per the manual.\"\n\nHe says *per the manual* the way a man says *the sea is wet*.\n\n\"I lost a deckhand in 'twenty-six. Engine failure, night, four miles offshore. I turned the Tern and hunted that water for six hours and found him at dawn, and what I found was — \" His hands make a shape and then don't. \"I've hauled supplies to this light thirty years because a keeper dousing a manual-light is the only thing on this coast that ever made me go quiet.\"", opts: [
      { t: "\"It made me quiet too. Eleven years quiet.\"", fx: { trust: { bo: 2 }, flags: ["bo_confession"], journal: ["j_vesper"] }, to: "d" },
      { t: "\"The manual was wrong. I was wrong. Tomorrow I choose.\"", fx: { trust: { bo: 2 }, flags: ["bo_confession", "keeper_vow"], journal: ["j_vesper"] }, to: "d" },
    ] },
    { id: "d", who: "bo", text: "\"Tomorrow.\"\n\nHe wipes his hands, fast, like the job's the thing that keeps the room steady.\n\n\"Then I'll tell you what thirty years taught me about choosing, keeper. You don't choose brave. You choose *next*, and brave is what the next thing turns out to be.\"", end: true },
    { id: "end", who: "narr", end: true },
  ];

  const ch4_tower_logs = [
    { id: "a", who: "narr", text: "The log shelf, with new eyes. You go to the bottom spine — 1850, the broken one — and Braxton's hand spills off the pages like water off a ledge.", next: "b" },
    { id: "b", who: "narr", text: "*'The Swell stood off the point three nights like a gentleman waiting to be asked in. What it wanted of us I cannot say, for what I gave it was a lantern, and it followed me out to the deep water past the Reach, and I never saw my tower again — only that green light going down ahead of me like a star going out.'*", next: "c" },
    { id: "c", who: "narr", text: "*'The sea keeps nothing. The sea lends. Every boat it took in my lifetime came home that spring, and I did not.'*", next: "d" },
    { id: "d", who: "narr", text: "Under it, another hand, older ink:\n\n*'He was my father. He gave the town back every drowned thing it grieved for. — E. Braxton.'*", opts: [
      { t: "(Keep reading. The margins.)", fx: { journal: ["j_1850", "j_led"] }, to: "e" },
      { t: "(Close the book. That's a whole life.)", fx: { journal: ["j_1850"] }, to: "f" },
    ] },
    { id: "e", who: "narr", text: "And in the margin, a third hand — Aldo's — working it over:\n\n*'Braxton burned a lantern all the way to the deep water and it followed him like a brother. If the lantern goes dark BEFORE the deep water — if the leader goes dark and drifts — the water loses him. It cannot follow what ends. It cannot follow what errs.'*\n\n*Tam's tables mark the deep water: past the Reach, two minutes by oar past the old anchor. If I go, I go with a mended boat, and I go dark at the line.*", next: "g" },
    { id: "g", who: "narr", text: "Aldo had the plan. Aldo had the boat. Aldo went out with a *dashed* skiff and a lantern and no one holding a rhythm for him.\n\nThe sea takes one keeper a turn. It has never yet needed two — *if the second one knows the tune.*", fx: { journal: ["j_led"] }, end: true },
    { id: "f", who: "narr", text: "You close the book with both hands, the way you'd close a door on someone sleeping.\n\n1850. A lantern, a following, a man who gave the town back its drowned and did not come home. And a daughter's line under it, steady as a tide table: *He gave the town back every drowned thing it grieved for.*", end: true },
  ];

  const ch4_buys = [
    { id: "a", who: "bo", text: "\"Last manifest before the blow. Brayhead prices, honest and ugly.\"", opts: [
      { t: "Oak braces (2 marks)", cond: (s) => s.marks >= 2 && !State.hasItem("braces"), fx: { marks: -2, item: ["braces"] }, to: "a2" },
      { t: "Oiled canvas (1 mark)", cond: (s) => s.marks >= 1 && !State.hasItem("canvas"), fx: { marks: -1, item: ["canvas"] }, to: "a2" },
      { t: "A barrel of oil (1 mark)", cond: (s) => s.marks >= 1, rep: true, fx: { marks: -1, oilStore: 1 }, to: "a2" },
      { t: "Storm lantern, brass (2 marks)", cond: (s) => s.marks >= 2 && !State.hasItem("lantern"), fx: { marks: -2, item: ["lantern"] }, to: "a2" },
      { t: "\"That's all, Bo.\"", to: "b" },
    ] },
    { id: "a2", who: "bo", text: "(He weighs the coins without counting them.)\n\nMore?", opts: [
      { t: "(Back to the manifest.)", to: "a" },
      { t: "\"That's all.\"", to: "b" },
    ] },
    { id: "b", who: "bo", text: "\"Then get off my deck, sunshine, and mind your wick.\"", end: true },
  ];

  /* =====================================================================
     FRIDAY — THE LAST NIGHT
     ===================================================================== */
  const ch5_store_haul = [
    { id: "a", who: "narr", text: "The tower stairs, ninety-three of them, and a barrel of winter oil is a barrel of winter oil however you look at it.\n\nYou haul. The tower is warm from the stove below and cold from the sea above and the stairwell is the exact colour of a held breath.", opts: [
      { t: "(Haul every barrel up to the lamp room.)", fx: { fn: (s) => { s.flags.hauled = true; } }, to: "b" },
      { t: "(Haul what you need. Leave the rest.)", fx: { fn: (s) => { s.flags.hauled = true; } }, to: "b" },
    ] },
    { id: "b", who: "narr", text: (s) => "Barrels staged at the lamp room door: " + s.oilStore + ". Every one of them is a night's worth of *here, here, here*.\n\nThe sea, from the gallery, is the wrong colour and the wrong shape and entirely unwilling to be described.", end: true },
  ];

  const ch5_bo_dawn = [
    { id: "a", who: "narr", text: "Bo stands at the jetty rail in his oilskins, and the Tern behind him is riding at double lines with the sea breaking white over her toe-rail.\n\nHe hands you a bottle of something Brayhead-distilled and Brayhead-warm, and doesn't apologise for it.", opts: [
      { t: "\"You're staying out there all night.\"", fx: { trust: { bo: 1 } }, to: "b" },
      { t: "(Take the bottle. Words can wait till the water's done.)", fx: { item: ["bread"] }, to: "c" },
    ] },
    { id: "b", who: "bo", text: "\"Engine at slow, sea-room off the strait, and a boat's boat for your keeper's neck if your keeper needs one. My crew thinks I've gone religious.\"\n\nHe looks out at the standing water.\n\n\"Keep it burning, sunshine. Whatever else you choose — keep it burning till you've chosen.\"", end: true },
    { id: "c", who: "bo", text: "\"Brayhead's own,\" he says, of the bottle. \"Tastes like kerosene and good intentions. That's the whole coast in a bottle, that is.\"\n\nHe nods at the tower. \"Keep it burning, sunshine. Whatever else you choose — keep it burning till you've chosen.\"", end: true },
  ];

  const ch5_sel_tower = [
    { id: "a", fx: { flags: ["sel_pre"] }, who: "sel", text: "She's up in the lamp room with her hood back, watching the great lens turn, and the watch ticking warm and hurried at her collar.\n\n\"It's loud today. The hum. Like it's asking through a wall.\"", opts: [
      { t: "\"Whatever happens tonight — you stay in the house.\"", fx: { flags: ["sel_order"] }, to: "b" },
      { t: "\"Then tonight it gets answered. Whatever it costs.\"", fx: { trust: { sel: 1 } }, to: "b" },
    ] },
    { id: "b", who: "sel", text: "She hands you bread, burnt-edge first, because the burnt edge is the best bit and she's decided you should have the best bit.\n\n\"Keeper. If you go out — if you go out on the water — \"\n\nThe sentence doesn't finish. It doesn't have to. Sixteen knows what unfinished sentences cost.", opts: [
      { t: "\"Then you hold the rhythm. That's the bargain.\"", cond: (s) => s.flags.hum_learned, fx: { trust: { sel: 2 }, flags: ["sel_rhythm"] }, to: "c" },
      { t: "\"Then I come back. That's the whole plan and all of it.\"", fx: { trust: { sel: 1 } }, to: "c" },
    ] },
    { id: "c", who: "sel", text: "\"Down and up,\" she says. \"Like a wave you can hold.\"\n\nShe has her fingers on the watch through her collar. \"I'll be listening. I'm always listening. It's the whole of what I've got.\"", end: true },
  ];

  const ch5_tam_wire = [
    { id: "a", who: "narr", text: "The line-boy makes one last run up the cliff, bent double against the wind, and hands you the day's spool with both hands like it's alive.", next: "b" },
    { id: "b", who: "tam", text: "*KEEPER. IT STANDS OFF WIDOWS REACH NOW AND IT IS NOT WEATHER AND I HAVE KEPT MY LIGHT EVERY NIGHT FOR FORTY YEARS AND I WILL KEEP IT TONIGHT.*", next: "c" },
    { id: "c", who: "tam", text: "*WHATEVER YOU DO TONIGHT — BURN OR BELL OR BOAT — MY FLAME IS ACROSS FROM YOU AND MY EAR IS ON THE WIRE AND I WILL KNOW THE DIFFERENCE BETWEEN GONE AND SLEEPING.*\n\n*KEEP EACH OTHER'S LIGHT, KEEPER. IT IS A GOOD COAST. IT WAS ONLY QUIET.* — T. REEVE", opts: [
      { t: "(Wire back: BURN, BELL, BOAT. WATCH FOR ME. — HALDEN POINT.)", fx: { trust: { tam: 1 }, flags: ["tam_final"] }, to: "d" },
      { t: "(Wire back: KEEP YOUR LIGHT, OLD MAN. WE KEEP EACH OTHER'S.)", fx: { trust: { tam: 2 }, flags: ["tam_final"] }, to: "d" },
    ] },
    { id: "d", who: "narr", text: (s) => s.flags.fleet_warned
      ? "Under Tam's wire, one more sheet, navprinted and stamped: the Vigilant's standing orders. *THREE HUNDRED MEN WILL SAY THEY SAW IT BURNING. KEEP IT BURNING, KEEPER. THE NAVY TELLS STORIES TOO.*"
      : "Under Tam's wire, nothing. The fleet never answered. Brayhead's boats are out tonight, because nobody told them not to be, and their little riding-lights will be the only stars the sky doesn't own.", end: true },
  ];

  const ch5_skiff_check = [
    { id: "a", who: "narr", text: (s) => s.repairs.skiff >= 2
      ? "Aldo's skiff, canvas and rope and pitch, sitting quiet on her trolley like a horse that knows what Saturday means. Ready. The word sits on her without irony for once."
      : s.repairs.skiff === 1
        ? "The skiff, caulked but not canvas-stayed. She would float. Whether she would survive the water that is standing up out there is a different question, and the sea asks it in one take."
        : "The skiff, still keel-up and still shrouded, going quietly to rot with her one oar for a spine. Whatever Aldo meant to do out there, he meant to do it in this, and this was not enough.",
      opts: [
      { t: "(Leave her be.)", to: "b" },
    ] },
    { id: "b", who: "narr", end: true },
  ];

  /* ---------------- small repeatable talk flavour ---------------- */
  const misc_tam_wave = [
    { id: "a", who: "tam", text: "*ALL QUIET ON THE WATER STOP QUIET IS NOT THE SAME AS CALM STOP REEVE*", end: true },
  ];
  const misc_bo_wave = [
    { id: "a", who: "bo", text: "\"You again. Tide's turning, sunshine.\"", end: true },
  ];

  /* =====================================================================
     LOCATION ACTION TABLES — what can be done where, and when
     ===================================================================== */
  function A(id, label, note, cond, scene, cost, rep) {
    return { id: id, label: label, note: note || "", cond: cond || (() => true), scene: scene, cost: cost === undefined ? 1 : cost, rep: !!rep };
  }

  const ACTIONS = {
    jetty: [
      A("bo_arrive", "Meet the master of the Tern", "Bo Halloran, come to the point", (s) => s.chapter === 1 && !s.flags.met_bo, "ch1_bo_arrive"),
      A("bo_shop", "See to Bo's manifest", "brass, canvas, braces, oil — Brayhead prices", (s) => s.flags.met_bo && s.chapter <= 2, "ch1_bo_shop", 0, true),
      A("bo_shop4", "Last manifest before the blow", "the Tern sails Friday noon", (s) => s.chapter >= 4 && !s.flags.bo_gone, "ch4_buys", 0, true),
      A("bo_talk", "Talk to Bo", "weather, boats, opinions", (s) => s.flags.met_bo && s.chapter >= 2 && !s.flags.bo_gone, "ch1_bo_talk", 0, true),
      A("bo_vesper", "Sit on the rail with Bo", "some weights go easier with busy hands", (s) => s.chapter >= 4 && !s.flags.told_bo && s.trust.bo >= 1 && !s.flags.bo_gone, "ch4_vesper", 0),
      A("bo_settle", "Talk Bo out of sailing Friday", "the tide doesn't argue", (s) => s.chapter >= 4 && !s.flags.bo_settled, "ch4_bo_settle"),
      A("bo_dawn", "Stand at the rail with Bo", "the last day, the last jetty", (s) => s.chapter >= 5, "ch5_bo_dawn", 0, true),
    ],
    skiff: [
      A("skiff_look", "Look under Aldo's skiff", "one oar, one plan", (s) => !s.flags.skiff_seen, "ch1_skiff_look"),
      A("skiff_caulk", "Caulk the sprung plank", "needs pitch", (s) => s.flags.skiff_seen && s.repairs.skiff === 0 && State.hasItem("pitch"), "ch2_skiff_mend"),
      A("skiff_finish", "Canvas and stay her", "needs canvas and rope", (s) => s.repairs.skiff === 1 && State.hasItem("canvas") && State.hasItem("rope"), "ch3_skiff_finish"),
      A("skiff_check", "Look at her again", "whatever she is now", (s) => s.chapter >= 5, "ch5_skiff_check", 0, true),
    ],
    store: [
      A("store_first", "Take stock of the store", "barrels, wicks, and a draft that breathes", (s) => !s.flags.store_seen, "ch1_store_first"),
      A("store_oil", "Stage oil for the night", "the lamp drinks slow but it drinks", (s) => s.flags.store_seen && s.chapter < 5, "ch1_store_oil", 0, true),
      A("store_sel", "Find out who is breathing behind the sacks", "somebody is sleeping in your oil store", (s) => s.chapter === 2 && !s.flags.sel_found, "ch2_store_sel"),
      A("store_haul", "Haul barrels to the lamp room", "the last night wants oil", (s) => s.chapter === 5 && !s.flags.hauled, "ch5_store_haul"),
    ],
    tower: [
      A("tower_lens", "Look to the great lens", "the light's whole argument, in glass", (s) => !s.flags.lens_seen, "ch1_tower_lens"),
      A("tower_logs", "Read the log shelf", "fifty years of weather and one blank page", (s) => !s.flags.logshelf_read, "ch1_tower_logs"),
      A("tower_logs2", "The log shelf, with new eyes", "1850, spine broken", (s) => s.chapter >= 4 && s.flags.logshelf_read, "ch4_tower_logs"),
      A("lens_clean", "Clean and true the lens", "needs the charts and an afternoon", (s) => s.flags.charts_read && s.repairs.lens === 0, "ch2_lens_clean"),
      A("lens_seal", "Seal the facet seams", "Tam's advice: wax and brass", (s) => s.repairs.lens === 1 && s.flags.tam_coached, "ch3_lens_finish"),
    ],
    bell: [
      A("bell_look", "Strike the fog bell", "listen to what the fog hears", (s) => !s.flags.bell_seen, "ch1_bell_look"),
      A("bell_mend", "Mend the cracked bell", "needs brass", (s) => s.flags.bell_seen && s.repairs.bell === 0 && (State.hasItem("brass") || State.hasItem("brass_bag")), "ch2_bell_mend"),
      A("bell_tune", "Tune her to Tam's instruction", "file, seat, strike, listen", (s) => s.repairs.bell === 1 && s.flags.tam_coached, "ch3_bell_tune"),
    ],
    house: [
      A("house_first", "Open the keeper's house", "warm stove, stopped clocks", (s) => !s.flags.house_seen, "ch1_house_first"),
      A("house_mail", "Read the mail shelf", "the Commission, and things under it", (s) => s.flags.house_seen && !s.flags.mail_read, "ch1_house_mail"),
      A("house_charts", "Go through Aldo's study", "the desk is honest about him", (s) => s.chapter >= 2 && !s.flags.charts_read, "ch2_house_charts"),
      A("house_letter", "The study floorboards", "Aldo kept things one shelf down", (s) => s.chapter >= 4 && s.flags.charts_read && !s.flags.aldo_letter, "ch4_house_letter"),
      A("sel_givewatch", "Bring Sel what the tide gave back", "a silver watch, a name", (s) => s.chapter >= 4 && State.hasItem("watch") && !s.gaveWatch, "ch4_sel_givewatch", 0),
      A("house_mail3", "Read the morning mail", "oilskin roll under the door", (s) => s.chapter === 3 && !s.flags.commission_replied, "ch3_house_mail"),
      A("tam_wire2", "Read the wire from Widow's Reach", "fog weather coming, says the far station", (s) => s.chapter === 2 && !s.flags.answered_tam, "ch2_tam_wire"),
      A("sel_talk", "Sit with Sel", "bread, brothers, and the hum", (s) => s.selStays && s.chapter >= 2 && !s.flags.sel_talked1, "ch2_sel_talk1", 0),
      A("sel_talk2", "Sit with Sel again", "she has questions for you", (s) => s.selStays && s.flags.sel_talked1 && !s.flags.sel_talked2, "ch2_sel_talk2", 0),
      A("tam_wire5", "Read the morning wire", "the line-boy made it up the cliff", (s) => s.chapter === 5 && !s.flags.tam_final, "ch5_tam_wire", 0),
      A("sel_tower", "Sel is up in the lamp room", "she never misses dusk up there", (s) => s.chapter === 5 && s.selStays && !s.flags.sel_pre, "ch5_sel_tower", 0),
    ],
    cliff: [
      A("cliff_wreck", "Walk the cliff path", "the gulls know something up there", (s) => !s.flags.wreck_seen, "ch1_cliff_wreck"),
      A("cliff_cave", "Go into the sea cave at low water", "the tide is out", (s) => s.chapter >= 2 && s.tide === "low" && !s.flags.cave1, "ch2_cliff_cave"),
      A("cliff_cave2", "The sea cave again", "the lending has grown overnight", (s) => s.chapter >= 4 && s.tide === "low" && s.flags.cave1 && !s.flags.watch_found, "ch4_cave_watch"),
      A("cliff_cave_closed", "Look at the cave mouth", "the tide is up", (s) => s.chapter >= 2 && s.tide !== "low" && !s.flags.cave1, "cave_closed"),
      A("sel_listen", "Find Sel at the cliff head", "hood down, listening", (s) => s.chapter === 3 && s.selStays && !s.flags.sel_rain, "ch3_sel_listen", 0),
      A("sel_hum", "Listen with Sel", "you promised", (s) => s.chapter >= 4 && s.selStays && !s.flags.hum_learned, "ch4_sel_hum"),
    ],
  };

  return {
    scenes: {
      ch1_bo_arrive, ch1_bo_shop, ch1_bo_talk, ch1_tower_lens, ch1_tower_logs,
      ch1_cliff_wreck, ch1_house_first, ch1_house_mail, ch1_store_first, ch1_store_oil,
      ch1_bell_look, ch1_skiff_look, cave_closed,
      ch2_store_sel, ch2_sel_talk1, ch2_sel_talk2, ch2_bo_sel, ch2_house_charts,
      ch2_cliff_cave, ch2_tam_wire, ch2_bell_mend, ch2_lens_clean, ch2_skiff_mend,
      ch3_tam_wire, ch3_bell_tune, ch3_bo_warn, ch3_lens_finish, ch3_sel_listen,
      ch3_house_mail, ch3_skiff_finish,
      ch4_cave_watch, ch4_sel_hum, ch4_sel_givewatch, ch4_house_letter,
      ch4_bo_settle, ch4_vesper, ch4_tower_logs, ch4_buys,
      ch5_store_haul, ch5_bo_dawn, ch5_sel_tower, ch5_tam_wire, ch5_skiff_check,
      misc_tam_wave, misc_bo_wave,
    },
    ACTIONS,
  };
})();
