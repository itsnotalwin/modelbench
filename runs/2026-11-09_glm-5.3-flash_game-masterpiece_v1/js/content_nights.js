/* ============================================================
   THE LONG LIGHT — content_nights.js
   the watches: what the water does between dusk and dawn,
   the last night, and the endings
   ============================================================ */
"use strict";
window.CN = (function () {

  /* ============================================================
     PROLOGUE — the crossing, and the first night (a teaching night)
     ============================================================ */
  const prologueLines = [
    "The Northern Light Commission presents, without comment, the coast.",
    "You crossed from Brayhead on the morning boat, with a suitcase, a tin trunk of another keeper's life, and a letter bearing more stamp than kindness.",
    "Halden Point took three hours to reach and ninety-three steps to climb, and the whole of it smells of oil and salt and the inside of other people's weather.",
    "The logbook lies open on the desk of the lamp room. Somebody has left it open at the last page Aldo Voss wrote, and the last thing he wrote is a line that stops.",
    "You are the keeper now. The first thing a keeper does is sign.",
  ];

  const signLines = [
    "The pen is Aldo's. The ink is Aldo's. The hand, after some hesitation, is yours.",
    "Beneath your name, the log waits for its first entry in the new hand. It waits the way stone waits — without hurry, without mercy.",
    "Dusk comes early on a coast that turns its face from the sun. The lamp wants lighting, and the water wants watching, and the log wants learning its new hand.",
  ];

  /* prologue tutorial night — patient, guided, forgiving */
  const prologueNight = {
    label: "THE TEACHING NIGHT", dur: 150, weather: "clear", swell: 0.15,
    decay: { oil: 0.35, wick: 0.30, lens: 0.35 },
    intro: "The lamp room at dusk. The great lens waits in her cradle like a sleeping animal that has been fed on time all her life. Below: barrels. Above: sky going the colour of a bruise healing.\n\nThe logbook murmurs its first instruction: *oil before dusk.*",
    events: [
      { id: "t1", at: 4, kind: "goal", head: "THE RESERVOIR",
        text: "The reservoir gauge wants filling before the wick drinks the dregs dry. The pump handle is brass and warm from the day.\n\nPump oil — the button marked 1 — until the reservoir is comfortable.",
        goal: (s, n) => n.oil >= 60, doneText: "The reservoir takes the oil with a sound like a slow swallow. Good. A light that starts the night hungry makes bad decisions by two in the morning." },
      { id: "t2", at: 40, kind: "goal", head: "THE WICK",
        text: "The wick, left to itself, chars at the crown and burns crooked. The shears hang on a hook, honed by thirty years of Aldo's thumb.\n\nTrim the wick — button 2 — before the flame starts to gutter.",
        goal: (s, n) => n.wick >= 85, doneText: "You trim the way you've been taught by a dead man's habit: little and often, never all at once. The flame stands up straight, pleased with itself." },
      { id: "t3", at: 80, kind: "goal", head: "THE LENS",
        text: "The great lens has drifted a little off true with the day's heat. Off-true, she throws a lying light — bright one minute, dim the next, and ships navigate by neither.\n\nTrue the lens — button 3 — until the gauge rests at full.",
        goal: (s, n) => n.lens >= 92, doneText: "The winding key turns and the lens comes true with a soft clack of glass on glass. The beam goes out over the water, level and steady, like a sentence that means what it says." },
      { id: "t4", at: 108, kind: "ship", head: "A LIGHT OUT THERE",
        text: "Low on the horizon: a riding-light, white, steady, slow. A fishing lugger working home on the last of the ebb.\n\nThe logbook waits. What the water says, you write down.",
        ship: { x: 0.05, dir: 1, speed: 0.016, row: 0, color: "rgba(255,240,200,0.95)", name: "a lugger" },
        opts: [
          { t: "Log her course in the book", fx: {}, score: 10, obs: "obs_lugger1", reply: "Entered: *10.20 pm — white light, north-going, working ebb. Probably the Fanny. Probably.*\n\nThe logbook accepts the Probably without comment. The logbook has heard worse." },
          { t: "Let her pass. Eyes on the water, not the page.", fx: {}, score: 2, reply: "She crosses the whole width of the window and goes out around the point, unlogged, unwitnessed but for you.\n\nSomewhere afloat, a man yawns. The world does not end. But the log is a keeper's memory, and tonight it is one light poorer." },
        ] },
      { id: "t5", at: 136, kind: "card", head: "THE GREEN",
        text: "And then, below the lugger's wake — below the water, actually, which is a different thing entirely — a light.\n\nGreen. Slow. Under the surface, moving with the sea and not with any wind, and not minding, at all, that you are looking.",
        swell: 0.45,
        opts: [
          { t: "Watch it. All the way down past the point.", fx: { flags: ["greeted_swell"] }, score: 4, reply: "You watch it the whole way out.\n\nIt does not hurry. It does not hide. It goes down past the point like a neighbour walking home, and just before it passes beyond the strait, it brightens once — the way a person raises a hat — and is gone.\n\nYou write nothing. There is nothing in the Commission's columns for that." },
          { t: "Dim the beam. Watch from the dark.", fx: {}, score: 8, reply: "You take the beam down to a coal-glow and watch from inside it.\n\nThe green light slows. Circles once, below the water, slow as a held breath. Then it goes out past the point — and it seems to you, though you will never put this in a report, that it was looking for the flame, and missed it, and went.\n\nThe logbook, when you open it, has only the weather to offer. You enter: *clear. cold. strange.*" },
        ] },
    ],
    outro: "Dawn comes up grey and kind. The lugger is home, the green light is somewhere under the world, and the lamp is still burning — which is, a keeper learns, the whole of the job description and none of the salary.\n\nThe Commission's letter sits on the desk where you left it. The light must not go dark. Not for weather. Not for grief. Not for anything under heaven.\n\nYou will have five more nights on this rock. The water has already begun to give things back.",
  };

  /* ============================================================
     NIGHT 1 — LOW WATER
     ============================================================ */
  const night1 = {
    label: "THE FIRST FULL WATCH", dur: 180, weather: "clear", swell: 0.22,
    decay: { oil: 0.5, wick: 0.42, lens: 0.5 },
    intro: "The first night that is entirely yours. The Commission's letter says the light must not go dark. The logbook says what the water says, you write down. Nobody says what the water is saying tonight.\n\nYou pump, you trim, you true. The routine holds you like a hand.",
    events: [
      { id: "n1a", at: 22, kind: "ship", head: "SMOKE, THEN A LIGHT",
        text: "First smoke against the last of the light, then a riding-light: a steam trawler, coasting for Brayhead, high in the water and tired in the way of boats whose crews have sold their catch and spent the money already.\n\nShe's the *Star of Peace*, by her lines. She's running close in tonight — closer than the bar forgives.",
        ship: { x: 0.9, dir: -1, speed: 0.02, row: 0, color: "rgba(255,236,190,0.95)", name: "the Star of Peace" },
        opts: [
          { t: "Burn the beacon: one big flare of light to walk her off the bar", fx: { oil: -12 }, score: 12, reply: "You crank the brightness up and hold it, and hold it, and the reservoir feels it like a wound.\n\nBut the *Star of Peace* stands off the bar, circles, and takes the deep channel home. From her rail, a lantern lifts once — a seaman's salute, or a wave. From this distance you can choose which." },
          { t: "Ring the bell instead. Sound is cheaper than light.", fx: {}, score: 8, reply: (s) => s.repairs.bell >= 1
            ? "The bell says *here* into the dark, three clean strokes, and the trawler stands off the bar without the lamp spending a drop. Sound does the shouting; light does the staying."
            : "The bell cracks on the second stroke — that fizzing tooth-break of a note — and the trawler, getting no voice from the point, feels her way past on her own lead. She makes it. Barely. You log it, and you log the bell with her." },
        ] },
      { id: "n1b", at: 66, kind: "card", head: "FOG, COMING OFF THE WATER",
        text: "The fog doesn't roll in so much as rise — off the water's skin, climbing the tower's skirt, eating the horizon first and the stars after.\n\nIn fog, a keeper's voice is the bell. In fog, everything else is shouting.",
        weather: "mist",
        opts: [
          { t: "Ring the bell steady through the fog bank", fx: {}, score: 10, reply: (s) => s.repairs.bell >= 1
            ? "Here. Here. Here.\n\nTwo hours of it, in the end. Your arm knows the rhythm by midnight and your head by two. When the fog thins at three, there is nothing out there but water — which is what *nothing* means on this coast, and it is a good nothing, a bell-nursed nothing."
            : "The bell cracks on every stroke. You ring anyway, because a cracked voice beats silence, but the fog eats the fizz-end of every note and gives nothing back.\n\nYou log: *fog, heavy. bell unreliable. heard horns off the point at 2 — not ours.* Not ours. That sentence will keep." },
          { t: "Hold the light and let the fog find its own way", fx: {}, score: 4, reply: "The fog takes the beam apart into a glow with no direction. Ships off the bar call horns into it and the horns come back wrong.\n\nNothing grounds tonight. But out in the grey, somewhere, somebody makes the bar on nerve and lead-line, and curses this point all the way past it." },
        ] },
      { id: "n1c", at: 118, kind: "card", head: "THE GREEN, CLOSER",
        text: "It is back. Under the water, off the point — and closer than the teaching night, close enough now to throw its colour onto the wet rock below the tower.\n\nIt circles the light the way a moth circles, only slower, and older, and it does not mind the glass between you and it.",
        swell: 0.5,
        opts: [
          { t: "Keep the beam full and look it in the light", fx: { flags: ["greeted_swell"] }, score: 6, reply: "You keep the light full because a light that flinches is worse than a light that burns.\n\nThe green circles three times, slow, and on the third circle it stops — directly below, at the bottom of the tower's own shadow — and stays there for the better part of a minute, like something reading a name off a door.\n\nThen it goes, unhurried, out past the strait. Your hands are cold. The lamp is warm. You do not sleep again tonight." },
          { t: "Take the beam down and let it circle empty glass", fx: {}, score: 8, reply: "You take the light down to a whisper of flame and the green light loses you.\n\nYou watch it hunt — actually hunt, cast about below the water in widening circles like a dog that's lost the whistle — and find nothing, and go.\n\nIn the logbook: *green light under the water again. it followed the beam. took the beam down. it went.* Eleven words for a thing the Commission has no column for." },
        ] },
    ],
  };

  /* ============================================================
     NIGHT 2 — THE STOWAWAY
     ============================================================ */
  const night2 = {
    label: "THE SECOND WATCH", dur: 180, weather: "fog", swell: 0.3,
    decay: { oil: 0.55, wick: 0.45, lens: 0.5 },
    intro: "Fog all day, and fog now, and the fog has opinions. The bell talks to it and it talks back. Sel — if she stayed — is asleep in the house below with the stove against her back, dreaming in five notes.",
    events: [
      { id: "n2a", at: 15, kind: "card", head: "SMALL FEET ON NINETY-THREE STEPS",
        cond: (s) => s.selStays === true,
        text: "She comes up the last steps with a mug in each hand and her hood down, and puts one on the sill by your hand without a word, because the tea is for you and the tea does the talking.\n\n\"Can I keep watch? Just for a bit. I'm quiet. I'm the quietest thing on this coast and that's including the stones.\"", opts: [
          { t: "\"Watch with me, then. Two pairs of eyes beat one.\"", fx: { trust: { sel: 2 }, flags: ["sel_watch"] }, score: 12, reply: (s) => "She watches like it's paid work. Half past one, she says, flat: \"There. Rowing light, south of the bar — you'd have missed it, it's got no mast-light.\" She's right. A lugger, under oars, running dark past the point.\n\nYou log it: *dark boat, oars, standing off. Sel's light.* The logbook takes her name and keeps it, which is what logs are for.\n\nShe stays till four. When she goes down she says, at the door, not turning: \"This is the best room in the world.\" And the terrible thing is that she's right, and the worse thing is that she knows it." },
          { t: "\"Down you go. One keeper to a watch — that's the rule.\"", fx: { trust: { sel: -1 } }, score: 3, reply: "She goes. Uncomplaining, which from Sel is a weather warning.\n\nYou keep the watch alone. Around two you realize you've been watching the water with one ear upstairs the whole time, listening for her, and you're angry at the water, which is not how it works, and you log it anyway: *clear watch. quiet house.*" },
        ] },
      { id: "n2b", at: 70, kind: "card", head: "THE DARK SHIP",
        text: "No light at all. That's what's wrong. Out where the water flattens before the bar there is a *shape* — under sail, under oars, you can't say — that shows no riding-light, no lantern, nothing.\n\nEvery boat on this coast shows something. Light is a boat's voice. This one is being silent on purpose.",
        ship: { x: 0.85, dir: -1, speed: 0.024, row: 1, color: "rgba(150,190,170,0.5)", name: "a dark shape" },
        swell: 0.45,
        opts: [
          { t: "Log the shadow. Where she runs, others may follow.", fx: {}, score: 10, obs: "obs_darkship", reply: "Entered, with a cold pencil: *1.5 am — vessel running dark, south of the bar, no light shown. Logged in case she is the first of anything.*\n\nThe shape slides out around the point without hurry. You never do learn what she was. Some entries are questions the sea keeps the answer to." },
          { t: "Ring the bell — give the dark something to be dark against", fx: {}, score: 8, reply: (s) => s.repairs.bell >= 1
            ? "The bell speaks into the fog, clean and ending. The dark shape stands off the bar, hangs there a long minute — deciding, you'd swear, deciding — and then goes out around the point.\n\nYou do not see it again. You think about it for a week."
            : "The bell cracks. In the fog the crack-sound carries worse than nothing — it says *something is wrong here* in a voice that means *come look*, which is the opposite of what a bell is for.\n\nThe shape stands off anyway. The sea, tonight, is being polite to everyone. That won't last." },
        ] },
      { id: "n2c", at: 128, kind: "card", head: "THE WICK, GUTTERING",
        text: "The wick chars faster in fog-air — you know that now — and the flame has started that lean, sideways stutter that means she'll drown in her own oil if she drops much further.\n\nThe shears want your hand. The lamp wants a decision.",
        opts: [
          { t: "(That's what the button's for. Trim.)", fx: {}, score: 8, reply: "You trim, and the flame stands, and the night continues, which is the whole art of the thing. *Little and often.* Aldo's whole philosophy, one pair of shears wide." },
        ] },
    ],
  };

  /* ============================================================
     NIGHT 3 — WIDOW'S REACH (the Merrilee)
     ============================================================ */
  const night3 = {
    label: "THE THIRD WATCH", dur: 190, weather: "rain", swell: 0.38,
    decay: { oil: 0.55, wick: 0.45, lens: 0.55 },
    intro: "Rain like nails and the fog underneath it, and somewhere out in all that grey, the fishing fleet making for Brayhead harbor on the last of the flood.\n\nAcross the strait, forty years of a man's flame burns steady at Widow's Reach. You can see it between the gusts. You keep each other's light tonight.",
    events: [
      { id: "n3a", at: 12, kind: "card", head: "WIDOW'S REACH, ANSWERING",
        text: "The far light flashes — Tam's hand on his shutter, Morse across the strait:\n\n*HALDEN — HEAVY FOG ON THE BAR — MERRILEE AND TWO OTHERS MAKING FOR HARBOUR — YOUR BELL IS THEIR LAMP TONIGHT — RING TRUE — REEVE*", opts: [
          { t: "\"Ring true.\"", fx: {}, score: 5, reply: "You take the mallet off its hook. Ninety-three steps down, wind and rain, the bell A-frame with the whole night leaning on it." },
        ] },
      { id: "n3b", at: 40, kind: "card", head: "THE MERRILEE, ON THE BAR",
        text: "Through the rain-gusts: the Merrilee, standing in for the harbor with her net drying poles still up — arrogance, that, in this weather — and the fog going one way and her lead-line going another.\n\nShe is coming to the sound of your bell or she is coming to nothing, and tonight, this year, the difference is everything.",
        opts: [
          { t: "(Ring. All of it. Ring until your arm is the bell.)",
            fx: { fn: (s) => {
              if (s.repairs.bell >= 2) { s.merrilee = "safe"; State.trust("tam", 2); State.addJournal("j_merrilee_safe"); window.Snd.play("bell", { times: 4 }); window.Snd.play("hornsafe"); }
              else if (s.repairs.bell === 1) { s.merrilee = "grounded"; State.addJournal("j_merrilee"); window.Snd.play("bell", { times: 3 }); window.Snd.play("wave"); }
              else { s.merrilee = "grounded"; State.addJournal("j_merrilee"); State.trust("bo", -1); window.Snd.play("wave"); window.Snd.play("thunder"); }
            } },
            reply: (s) => s.repairs.bell >= 2
              ? "Tuned, Tam called it. Tuned is the right word: the note goes out flat and clean and *ends*, and in the intervals the fog gives back nothing, and into those silences the Merrilee's master steers by ear alone, calling his lead — *by the mark, five* — like a man praying with numbers.\n\nShe comes round the bar on the third stroke of the second hour and her master fires a rocket when she's clear, red, high, rude — a bell getting a parade.\n\nUp the stairs, dripping, arms like wet rope, you log: *merrilee safe on sound. all hands well. tam: your bell kept her.*"
              : s.repairs.bell === 1
                ? "Mended, not tuned. The note carries, but the crack still takes the edge off every ending, and it is the *endings* a helmsman steers by — the moment the sound dies and the silence says *now*.\n\nShe touches the bar. Gently, as groundings go: the bows grind, she swings, she stops with her stern to the sea and her crew safe off in the Tern's boat. Mast gone by the board. Nobody drowned.\n\nYou log it standing up, because sitting is for after. *Merrilee on the bar. all hands off. bell: one voice short.* Tam will have opinions. Tam will be right."
                : "The bell cracks on the third stroke — that fizzing tooth-break — and out in the fog the Merrilee's master, steering for a voice that keeps dying mid-sentence, does what honest men do with half a map: he guesses.\n\nShe grounds, hard, on the bar's south knee. Masts go. The Tern's boat brings the crew off through the dark, all of them, thank the water, all of them — but her master's face in the jetty lantern is a ledger of what a cracked bell costs.\n\nBo says nothing. Bo's silence has opinions." },
        ] },
      { id: "n3c", at: 130, kind: "card", head: "THE GREEN, ON THE BAR",
        text: "And under the bar where the Merrilee was — the green light, up close now, *under the shallows*, which it should not be and which no swell should do. It stands where her keel stood, and it does not follow her. It reads her wake.\n\nThen it lifts. Not a wave. Not a fish. A lift — like something under the world leaning closer to a window.",
        swell: 0.62,
        opts: [
          { t: "Hold the light on it. Let it see you seeing it.", fx: { flags: ["greeted_swell"] }, score: 8, reply: "You hold the beam on it and it holds you, the way deep water holds everything: patiently, without malice, without hurry.\n\nThen it goes down. All of it, the whole standing weight of whatever-it-is, down and out past the strait, and the sea comes back to being sea.\n\nYou log eleven words and stare at them a long time: *the water stood up tonight. it looked at the light. it left.*" },
          { t: "Bell and dark. Voice and nothing.", fx: {}, score: 10, reply: "You take the beam down to nothing and ring the bell into the dark, and the green light hunts — casts about under the bar, under the point, under the whole godforsaken rock — and finds a bell it cannot follow and a flame it cannot see.\n\nWhen the grey comes up out of the sea at four, the water is only water.\n\n*It cannot follow what ends,* Tam wired. You believe him now the way you believe tides." },
        ] },
    ],
  };

  /* ============================================================
     NIGHT 4 — WHAT THE WATER REMEMBERS
     ============================================================ */
  const night4 = {
    label: "THE FOURTH WATCH", dur: 190, weather: "squall", swell: 0.5,
    decay: { oil: 0.6, wick: 0.5, lens: 0.6 },
    intro: "Squalls walking the strait like a crew of loud men, and under it all — under everything — the hum. Not faint anymore. Asking.\n\nTomorrow night the tables say the water rises. Tonight it rehearses.",
    events: [
      { id: "n4a", at: 14, kind: "card", head: "THE HUM, THROUGH THE WALL",
        text: "The hum is in the glass tonight. In the frame. In the mullions and the salt and the oil-smell of the room, five notes down and up, asking its question: *are you there? are you there?*",
        cond: null,
        opts: [
          { t: "Answer it — with the bell, in a voice that ends", cond: (s) => s.repairs.bell >= 1, fx: {}, score: 10, reply: "You ring the bell, and the hum — stops. Not answered: *heard.* The way a question heard is different from a question ignored.\n\nIt starts again after a while. It always starts again. But something in the stopping felt like the nod you give a stranger you'll meet again, and that is a sentence you will never say out loud in Brayhead as long as you live." },
          { t: "Answer with the lamp. One long burn, steady, honest.", fx: {}, score: 6, reply: "You let the light burn steady and the hum rises to meet it, up and up, until the glass buzzes with it and the watch — if you have it — hurries like a heart.\n\nThen, slowly, it sinks. Asking somewhere else. The light answered *yes.* Yes was never the safe answer. Yes is only the warm one." },
          { t: "Answer nothing. Keep the watch. Log the question.", fx: {}, score: 8, reply: "You keep the watch and let it ask.\n\nThe log takes: *the hum asked all night. did not answer. it is not angry. it is only asking.* The Commission can file that under opinions too. Let them. Opinions is where the truth lives on this coast." },
        ] },
      { id: "n4b", at: 70, kind: "ship", head: "A FAMILIAR BLACK HULL",
        cond: (s) => !s.flags.bo_gone,
        text: "Out of the squall, close in under the point: the Tern, running dark with her engine at whisper, riding high and empty.\n\nBo's measuring the water. Bo doesn't believe in tables, so he's come out in a squall at midnight to check them personally.",
        ship: { x: 0.85, dir: -1, speed: 0.022, row: 1, color: "rgba(255,236,190,0.9)", name: "the Tern" },
        opts: [
          { t: "Burn one flare of light — show him the light stands", fx: { oil: -10 }, score: 10, reply: "You crank her up bright, and the Tern's shadow stands off to look, and out of the dark a horn goes — one blast, Brayhead-fashion: *noted.*\n\nThen she's gone into the squall again. A man who doesn't believe in tables, checking them. A man who says he'll sail Friday, standing off your rock at midnight to see your light is lit." },
          { t: "Let him look. He'll see it without help.", fx: {}, score: 6, reply: "The beam does its work and the Tern stands off the point a while, black against blacker, and then goes.\n\nYou'll find out in the morning whether that was Bo or the water. Tonight it was enough that something with an engine chose to look." },
        ] },
      { id: "n4c", at: 128, kind: "card", head: "THE WATER, STANDING",
        text: "At two the squalls walk off east and the strait comes flat, and flat is wrong, and the water stands. You can see it standing — the horizon sits higher than the horizon sits, the way a held breath sits.\n\nAnd under it, everywhere, everywhere, the hum. Not five notes now. Five notes, held. A wave you could hold.",
        swell: 0.72,
        opts: [
          { t: "(Watch until dawn. Whatever else — watch.)", fx: { flags: ["saw_standing"] }, score: 10, reply: "You watch until the grey comes up.\n\nIt never quite rises. It never quite settles. All night the water stands at the edge of standing, like a listener at a door deciding whether to knock.\n\nIn the logbook, where the weather goes, you write: *tomorrow.* And under it, because no one taught you to and every keeper before you would have: *I will be here.*" },
        ] },
    ],
  };

  const nights = { 1: night1, 2: night2, 3: night3, 4: night4 };

  /* ============================================================
     dawn log entries — the keeper's hand, between the nights
     ============================================================ */
  const logs = {
    1: (s) => [
      "MONDAY — the first full night. Kept. The star of Peace made the deep channel; the fog came and was argued with; the green light came closer and was watched.",
      (s.merrilee !== "unknown" ? "" : null),
      "The oil store holds " + s.oilStore + " barrel" + (s.oilStore === 1 ? "" : "s") + ". The wick is trimmed. The lens is " + (s.repairs.lens >= 1 ? "true" : "salt-hazed") + ". The bell is " + (s.repairs.bell >= 2 ? "tuned sweet" : s.repairs.bell >= 1 ? "mended" : "cracked through") + ".",
      "The log learns a new hand slowly. Mine is steeper than Aldo's and twice as cautious. The sea will not mind. The sea has read worse.",
    ],
    2: (s) => [
      "TUESDAY — fog from first light to last. The dark ship ran the bar and showed no light, and somebody's bell or nobody's spoke into the grey.",
      (s.selStays ? "The stowaway kept two hours of the watch and logged a light I'd have missed. The logbook has her name in it now. Logs are how keepers keep people, too." : "The Tern carried her back to Brayhead on the afternoon tide. The oil store is quiet again. Quiet is not the same as empty."),
      "The hum was under the fog all day. It does not mind the fog. Fog is just weather; the hum is a question.",
    ],
    3: (s) => [
      "WEDNESDAY — the Merrilee came to the bar on the sound of this station's bell, or she came to nothing, and the sound and the nothing were decided by a crack in a bell and forty years of a man's wire across the strait.",
      (s.merrilee === "safe" ? "She is safe. Tam wired: YOUR BELL KEPT HER. I HAVE READ IT FORTY TIMES. IT KEEPS." : s.merrilee === "grounded" ? "She is on the bar, mast gone by the board, all hands off in the Tern's boat. Nobody drowned. The sentence has to be enough. It isn't." : "Fleet ran dark past the point. Whatever the bar kept tonight, it kept quietly."),
      "Tam Reeve and I are keeping each other's lights. Two old lamps on one cold coast, wiring weather like men passing a rope across a gap.",
    ],
    4: (s) => [
      "THURSDAY — the water stood up at two in the morning and stood at the edge of standing until dawn, and the hum asked its question all night in five held notes.",
      (s.flags.hum_learned ? "I know what the hum is now. It is the same question every lost thing asks, and it is asked at a light because a light is the only thing on this coast that answers on purpose." : "The hum is asking. I don't yet know what. There is a day left to learn, and Aldo's margins to read it in."),
      "The tide gave back " + (s.flags.watch_found ? "a silver watch with a dead boy's name in it, and it hurries when the water stands" : "nothing tonight but weed and rope-end") + ". The sea lends. It has never once given back the thing itself — only the shape of the wanting.",
      "Tomorrow night, the tables. Tomorrow night, the choice that Aldo crossed out and did not cross out.",
    ],
    5: (s) => [ /* filled after the last night by the ending itself */ ],
  };

  /* ============================================================
     NIGHT 5 — THE LAST NIGHT
     ============================================================ */
  const night5 = {
    label: "THE LAST WATCH", dur: 160, weather: "storm", swell: 0.8,
    decay: { oil: 0.7, wick: 0.55, lens: 0.65 },
    intro: "The storm arrives before its hour, the way storms do, and takes the tower in its teeth and shakes the ninety-three steps like a ladder in a giant's hand.\n\nThe fleet is out. The Tern stands off the strait. The Vigilant steams five miles offshore with three hundred men who will say they saw whatever they see. And under everything, rising, the hum — five notes, held, asking.\n\nThis is the last watch. What the water asks tonight, you answer.",
    events: [
      { id: "n5a", at: 18, kind: "ship", head: "THE FLEET, OUT IN IT",
        cond: (s) => !s.flags.fleet_warned,
        text: "Through the rain-gusts: little riding-lights, strung along the dark toward Brayhead — the fleet, out because nobody told it not to be, each one a small warm star for something under the water to walk toward.\n\nYour light is the brightest thing on this coast. Yours, and theirs.",
        ship: { x: 0.9, dir: -1, speed: 0.018, row: 0, color: "rgba(255,214,150,0.8)", name: "a fleet riding-light" },
        opts: [
          { t: "(Log them. All of them. Every light you can see.)", fx: {}, score: 10, reply: "You log them until your pencil is a wet blunt thing: *seven lights, standing for the quay, small, low, slow.*\n\nSeven families' worth of *here, here, here.* Whatever you choose tonight, you choose with their lights in the ledger." },
        ] },
      { id: "n5b", at: 55, kind: "card", head: "THE TAKING OF THE TOWER",
        text: "The wind changes its mind and comes back with a run-up. The tower takes it — groans somewhere below the ninety-third step, a deep wooden sound like a ship being spoken to.\n\nThe great lens shivers in her cradle. Oil, wick, glass: the apparatus wants hands, and it wants them now.",
        opts: [
          { t: "(Mind the apparatus. The tower has stood before.)", fx: {}, score: 8, reply: (s) => "You mind the apparatus. The tower groans twice more and takes it, the way old things take weather — resentfully, and successfully.\n\n" + (s.repairs.tower >= 1 ? "The braces hold. You can hear them holding: a creak with a floor under it, a *not yet* instead of a *now*." : "Something up in the gallery shifts that you don't like the sound of at all. If the water comes to the light tonight, the tower will have to stand what follows.") },
        ] },
      { id: "n5c", at: 95, kind: "card", head: "THE HUM, THROUGH THE GLASS",
        text: "And then the storm leans back to listen, and you hear it — not faint anymore, not under anything: the hum, five notes, down and up, asking through the glass the way it has asked all week.\n\nThe water stands up at the edge of the world. The green light is under the bar now. It is very, very close.",
        swell: 0.95,
        opts: [
          { t: "(Listen. All the way down to the bottom of the question.)", fx: { flags: ["heard_last_ask"] }, score: 6, reply: "You listen.\n\nIt is the question every lost thing asks, and it is asked at YOU, because you are the one who answers on purpose. That is the whole of what a keeper is, maybe. The one who answers.\n\nThe question is: *are you there?* The question has been: are you there, all week, all eighty-eight years." },
        ] },
      { id: "n5d", at: 130, kind: "ship", head: "THE TERN, STANDING OFF",
        cond: (s) => !s.flags.bo_gone,
        text: (s) => "Black hull, engine at a whisper, standing off the strait exactly where Bo said she'd be. A lantern swings at her rail — three slow arcs, Brayhead for *standing by*.\n\n" + (s.flags.bo_settled ? "He said he'd stand off the strait, and he stood off the strait." : "He said he'd sail Friday noon, and he is standing off the strait."),
        ship: { x: 0.82, dir: 1, speed: 0.008, row: 1, color: "rgba(255,236,190,0.9)", name: "the Tern" },
        opts: [
          { t: "(Burn one flare of light: *noted, old friend.*)", fx: { oil: -8 }, score: 8, reply: "You burn one flare of light at the Tern, and the lantern at her rail swings three more slow arcs. Then she holds her station, engine whispering, riding it out.\n\nWhatever the night asks of you now — it asks with a boat waiting." },
        ] },
    ],
  };

  /* the rite: the hum asks in five notes; the keeper answers in kind.
     rounds of call-and-answer; accuracy decides how close it stands */
  const rhythm = {
    title: "THE WATER ASKS",
    rounds: [
      { beats: [520, 520, 780, 520, 1040], listenText: "The hum comes up through the glass. Five notes, down and up, patient as tide.", answerHint: "When each green note crosses the line — SPACE, or click the line. Answer in kind.", tempo: 0.55 },
      { beats: [420, 420, 630, 420, 420, 840, 420], listenText: "It asks again. Closer now. The glass hums with it. The watch, if you have it, hurries.", answerHint: "Answer in kind — SPACE or click as each note crosses the line.", tempo: 0.7 },
      { beats: [360, 360, 540, 360, 360, 540, 360, 900, 360], listenText: "The last asking. The water stands at the edge of the world and the whole sky is wrong and it is asking, asking, asking.", answerHint: "Last one. SPACE or click on the line. A keeper answers.", tempo: 0.85 },
    ],
    passText: (hit, total) => "You answer, and the answering lands — " + hit + " of " + total + " notes struck true. The hum takes the answer the way water takes a keel: without comment, and completely.",
    weakText: (hit, total) => "You answer, and some of the answering lands and some of it falls between the notes — " + hit + " of " + total + ". The hum holds anyway. It is patient. It has been patient for eighty-eight years.",
    missText: (hit, total) => hit + " of " + total + ". The water does not withdraw. It does not advance. It holds — listening harder now, the way a listener at a door leans closer when the voice inside falters.",
  };

  /* ============================================================
     THE CHOICE — three paths, gated by the week's work
     ============================================================ */
  function climaxChoices(s, metrics) {
    const list = [];
    list.push({
      id: "steady",
      title: "THE STEADY LAMP",
      desc: "Hold the light. Full beam, all night, come what follows. The oldest order there is.",
      risk: s.repairs.tower >= 1
        ? (s.flags.fleet_warned ? "The tower is braced. The fleet was warned. The Vigilant stands off. This is the path the Commission wrote you a letter about." : "The tower is braced — but Brayhead's fleet is out there in the dark with you, and a light that attracts has a wide skirt.")
        : "The gallery is unbraced. A light that is followed home is followed HERE. The tower will have to stand what the water brings.",
      ok: true,
    });
    const darkSafe = s.flags.fleet_warned && s.repairs.bell >= 1;
    list.push({
      id: "dark",
      title: "THE DARK WATCH",
      desc: "Douse the tower, the house, every light. Ring the bell into the black, and let the water look for a star and find none.",
      risk: darkSafe
        ? "Tam's bell is tuned and Brayhead was warned — the harbor can be dark too. The bell will have to do all the speaking a light would have done."
        : (s.flags.fleet_warned
          ? "The fleet was warned — but your bell is " + (s.repairs.bell >= 1 ? "tuned" : "still cracked") + ". In the dark, the bell is everything, and a bell that fizzes is a fog that talks."
          : "Brayhead was never warned. Their riding-lights will burn all night at the quay — a constellation of small warm stars for the water to walk toward."),
      ok: true,
    });
    const canLead = s.repairs.skiff >= 2 && (State.hasItem("lantern") || s.oilStore >= 1);
    if (canLead) {
      const selRhythm = s.flags.sel_rhythm && s.flags.hum_learned;
      const boEscort = !s.flags.bo_gone && s.flags.bo_settled && s.trust.bo >= 2;
      list.push({
        id: "led",
        title: "THE LED LIGHT",
        desc: "Take the storm lantern out in Aldo's mended skiff. Let it follow you. Then — past the Reach, at the deep water — go dark, and drift, and come home some morning it has forgotten you.",
        risk: selRhythm && boEscort
          ? "Sel holds the rhythm ashore. Bo stands off the strait with a boat's boat. Tam watches from across the water. You are not Braxton, and this is not 1850."
          : selRhythm
            ? "Sel holds the rhythm ashore — the tune you learned together. But the Tern will not be out there. If the water loses you too well, nobody is looking."
            : (s.flags.hum_learned
              ? "You know the tune, but you will row it alone. Braxton rowed it alone. Remember how that ended — and remember what the town got back."
              : "You never learned what the hum asks. Out there it will ask YOU, and you will have no answer, and the sea takes one keeper a turn."),
        ok: true,
      });
    }
    return list;
  }

  /* ============================================================
     ENDINGS
     ============================================================ */
  const endings = {
    steady_ok: {
      title: "THE STEADY LAMP",
      beats: (s) => [
        "You take the beam up to full and you leave it there, and you go and stand inside it.",
        (s.flags.fleet_warned ? "The fleet stayed home. Brayhead's quay is dark, the Vigilant is blacked-down five miles out, and the only burning thing between the point and the horizon is yours. The water rises, and it comes — of course it comes — to the one light that asked it to." : "The fleet is out there — Brayhead's little riding-lights strung along the dark like a rosary. The water rises, and it comes to the tower, because the tower is the steadiest thing on this coast, and you are in it."),
        (s.repairs.tower >= 1 ? "It circles the tower all night. That's the honest word for it — circles, below and around, the way weather circles a lighthouse it has decided to be respectful of. The braced gallery holds. The great lens turns. The light does not flicker, because you do not let it." : "It circles the tower all night, and the tower — unbraced, old, beloved — groans like a ship. Glass goes out of the gallery at three. Your hands bleed at four. The light does not flicker, because you do not let it."),
        (s.selStays ? "Sel comes up at the worst of it, because of course she does, and holds the watch-glass on the horizon and calls the lights to you — *fishing boat, standing off; steamer, making way — * and her voice through the storm is the second lamp on this rock." : "You keep the watch alone, and the watch is only yours, and it is enough, and it is not nothing."),
        "At four the green light stands directly under the tower, all of it, the whole standing weight, close enough to touch if touching were a thing that went downward — and it reads the light, and reads the keeper inside it, and does not take either.",
        "At dawn it goes. Not defeated. *Satisfied.* It takes its leave the way a guest takes leave who was only ever checking that the house was kept.",
        (s.flags.fleet_warned ? "The Vigilant's signal-lamp spells it out across five miles of morning: LIGHT OBSERVED BURNING ALL NIGHT — WELL DONE HALDEN POINT. Three hundred men saw it. The Commission will claim it was their idea." : "The fleet comes home through the morning calm with every boat afloat and stories that will grow all winter. Pentreath, the fleet master, wires one line: IF YOU ARE RIGHT I WILL TELL NOBODY ANYTHING. He tells nobody anything."),
        "The light must not go dark. Not for weather. Not for grief. Not for anything under heaven.\n\nYou kept it. It was not a lighthouse. It was an invitation — and last night, for the first time in eighty-eight years, somebody was home to answer it politely, and show it the door.",
      ],
      tone: "hope",
    },
    steady_hurt: {
      title: "THE STEADY LAMP",
      beats: (s) => [
        "You take the beam up to full and you leave it there, because the order is the order, and the order has no exceptions and never has.",
        "The water comes to the light the way the tables said it would. And the tower — unbraced, ninety-three steps of somebody else's maintenance — takes the standing weight of what follows.",
        "The gallery goes at two: glass first, then the rail, then the corner of the gallery deck itself, folded back like a page. You are thrown the length of the lamp room and the great lens, sealed and steady and beautiful, turns over you the whole time like a heart that does not know its body is failing.",
        (s.selStays ? "Sel drags you clear of the glass by both arms, swearing in words you didn't know she had, and holds the watch alone until dawn with the watch-glass and her own two eyes." : "You hold the watch alone with a arm you will not be able to lift for a month, and the watch is only yours, and it is enough."),
        "At four the green light stands under the tower, and the tower stands over you, and nothing more happens. It reads the light. It reads the blood on the floor. It goes.",
        "The Commission's letter arrives in spring, when the gallery is rebuilt and the arm is yours again. *THE KEEPER IS COMMENDED FOR THE MAINTENANCE OF THE LIGHT UNDER EXTREME CONDITIONS. THE COMMISSION NOTES THAT MAINTENANCE REQUESTS WERE FILED BUT UNACTED UPON.*\n\nFiled but unacted upon. Two keepers and eighty-eight years. Opinions.",
        "You keep the light. That was never the question. The question was what the light is for, and you have eleven shillings a week and the rest of your life to answer it, and you will answer it every night, and it is a good coast.",
      ],
      tone: "storm",
    },
    dark_ok: {
      title: "THE DARK WATCH",
      beats: (s) => [
        "You turn the key and the great lens goes dark, and the dark is so complete it has weight.",
        (s.flags.fleet_warned ? "Brayhead was warned; the quay lights go out one by one down the harbor like a curtain being drawn; the Vigilant blacks down five miles out. By midnight the coast is the oldest coast there is — the coast before lamps — and under everything the water rises, and looks for a star, and finds none." : "You douse what is yours. The harbor was never warned. Brayhead's quay burns small and warm and constellated, and the water rises, and turns — toward it."),
        (s.flags.fleet_warned ? "And the bell speaks. All night. Here. Here. Here. A voice that ends, so it cannot be followed home; a voice that ends, so everything out there steering by nothing knows exactly where *not* to be. The tuned bell carries across the bar where a shout would carry ten feet." : "And the bell speaks, cracked and fizzing, the best it can, which is not enough and is all there is — and you ring until your arm is the bell and the night is the bell and the crack in the bell is the whole sky."),
        (s.flags.fleet_warned ? "At two the green light stands where the tower's shadow would be, if there were a light to make one, and it casts about — hunts — the way a dog that's lost the whistle hunts. It cannot follow what ends. It cannot follow what errs. It cannot follow a dark rock that rings." : "At two the green light is off Brayhead, under the quay, and the whole town is awake and ringing what bells the town has, and the Merrilee's master is throwing everything that burns off his deck into the sea — and the light stands, and reads, and slowly, slowly, turns back toward the deep water."),
        "At dawn it is gone, and the coast comes back on like a stage lights-up, and the quay rings with horns — but the sea, in the grey, has left things on the sand. Boots. Spars. A doll's head. The lending, completing itself.",
        (s.flags.fleet_warned ? "There will be an inquiry. *THE KEEPER OF HALDEN POINT DID EXTINGUISH THE LIGHT CONTRARY TO STANDING ORDERS.* Pentreath wires: IF YOU ARE RIGHT I WILL TELL NOBODY ANYTHING. Tam wires: THE COAST WAS DARK AND NOTHING WAS LOST AND I WILL TESTIFY, WHICH IS A WORD I HAVE NEVER WIRED BEFORE." : "The inquiry is longer. Boats are lost at the quay; men are not, which is the sentence everyone repeats because it has to be enough. The Commission's letter uses the word *reprehensible* twice. Tam's testimony runs four pages, single-spaced, in a hand that never slants."),
        "The light must not go dark. Not for weather. Not for grief. Not for anything under heaven.\n\nLast night, for one night, for the right night, it went dark — and the dark did what a hundred years of brass could not: it gave the water nothing to follow, and the water went home.",
      ],
      tone: "grey",
    },
    led_home: {
      title: "THE LED LIGHT",
      beats: (s) => [
        "You take the storm lantern down the ninety-three steps in your own two hands.",
        (s.selStays && s.flags.sel_rhythm && s.flags.hum_learned ? "Sel is waiting at the jetty with bread in her pocket and the silver watch ticking hurry at her collar. \"Down and up,\" she says. \"Like a wave you can hold. I'll hold it from the cliff. You hold it from the boat. That's the whole plan and all of it.\"" : "You row out alone, the way Braxton rowed out alone. The difference is that you know the tune now, and Braxton had to invent it between heartbeats."),
        (!s.flags.bo_gone && s.flags.bo_settled ? "The Tern stands off the strait with her engine at whisper and her boat's boat at the davits, and Bo's voice comes across the black water once, Brayhead-soft: \"I'm here, sunshine. Row.\" " : "Nobody stands off the strait. You look back once at your own tower going dark behind you — you doused it; the light leads out tonight or it doesn't lead at all — and the dark where it stood is the biggest thing you have ever seen."),
        "The green light takes the lantern the way a lonely thing takes company.",
        "You row. It follows. Down the strait, past the point, past the bar where the Merrilee grounded or didn't — and the whole way out, the hum asks its question and you answer it in five notes, down and up, a wave you can hold, a wave you are holding, a wave that is holding you.",
        (s.flags.sel_rhythm && s.flags.hum_learned ? "At the Reach you hear it — thin across the water, half-drowned, stubborn: Sel, on the cliff head, whistling the run. The answer from two shores at once. The water stops. Between the notes, in the silence a bell-shaped silence makes, it loses you." : "Past the Reach, at the deep water, past the old anchor where the tables say the bottom falls away — you take the lantern's glass out with your thumb and finger, hot as a coal, and pinch it dark."),
        "And you go dark. And drift. And the green light casts about you in circles, close, closer, close enough to raise the hair on your arms — and cannot follow what ends, cannot follow what errs, cannot follow a man who has become flotsam in his own story.",
        (s.flags.sel_rhythm && s.flags.hum_learned ? "Dawn finds you three miles out, oars shipped, cold to the bone, alive — and the tide brings the skiff home on the flood with you in it, and on the cliff head a sixteen-year-old is ringing the fog bell with both hands like a person who has decided the whole coast should know." : "Dawn finds you three miles out, oars shipped, cold to the bone, alive. The tide brings the skiff home on the flood. Bo, who stood off the strait all night for a keeper and his light, finds you at the bar and says nothing at all, which is Bo for *welcome home* and a great deal more."),
        "The sea lends. Every boat the water took in Braxton's lifetime came home the spring after he didn't. This year the water lent the town its drowned — and the coast got its keeper back, because the keeper went out on the water as a light and came home from it as a man.",
        "By noon, Halden Point is burning again. By evening, so is Widow's Reach, two old lamps on one cold coast, wiring each other weather like men passing a rope across a gap.\n\nThe light is for the living. Aldo wrote that. Last night you found out what it costs to be sure — and it is eleven shillings a week, and ninety-three steps, and everything, and it is worth it, and you will light it again tonight.",
      ],
      tone: "hope",
    },
    led_drift: {
      title: "THE LED LIGHT",
      beats: (s) => [
        "You take the storm lantern down the ninety-three steps in your own two hands, and you row out alone into the standing water.",
        "The green light takes the lantern like a brother. It comes down the strait behind you, patient, glad, and the hum asks its question all the way out, and you answer it in five notes because it is the only prayer you have learned this week.",
        "Past the Reach, at the deep water, you pinch the lantern dark — and the water loses you, exactly as the margin promised, exactly as Aldo meant it to work.",
        "And Aldo meant it to work. And Aldo's skiff was dashed, and yours is mended, and the margin is right about everything except how long three days is, alone, in a fog of your own making, with no light and no whistle and nothing to steer by but the sound of a bell you cannot see.",
        "They find you on the third day. Bo, standing off the strait; then the Vigilant's launch; then, at the end, the tide itself, bringing the skiff in on the flood like the coast paying back a debt it had been keeping.\n\nYou are alive. Salt in the blood, light-blind, hands ruined from the oar — alive.",
        "The sea lends. The town got back its drowned that spring — boots and bells and a doll's head, and a silver watch that ticks strange, and every boat the water had kept. What the water kept this year was one keeper, three days, and the last of his certainty that the sea is only weather.",
        "You keep the light. Every night. You light it and you trim it and you watch the water stand up at the edge of standing, and you do not whistle back, and you do not go out, and some nights — only some nights, only some nights — the hum comes up through the glass, five notes, down and up, asking if you are there.\n\nAnd you are there. That's the job. That was always the job.",
      ],
      tone: "grey",
    },
    led_lost: {
      title: "THE LED LIGHT",
      beats: (s) => [
        "You take the storm lantern down the ninety-three steps in your own two hands.",
        (s.selStays ? "Sel runs the length of the jetty after you, and you leave her on the planks with the bread in her hand and her mouth open around a word that didn't get out in time." : "You row out alone. Nobody sees you off. The coast is dark and the coast is quiet and the coast was only ever quiet."),
        "The green light takes the lantern like a brother, and follows, and you lead it out down the strait past the point, past the bar — but you never learned what the hum asks, and out in the deep water it stops asking you and starts asking the lantern, and the lantern answers the way lanterns answer: with everything, all at once, until there is no lantern.",
        "The water takes the light out of your hands like a tide taking a sandcastle. Gently. Completely.",
        "It goes down after the lantern. The hum goes with it, five notes, down and up — a wave you could hold, a wave that was holding you, a wave that let go.",
        "The fog comes in behind it. You row for the point. You row for a long time. The bell rings somewhere ahead of you, here, here, here, and you row, and the fog comes in, and the fog comes in.",
        "The skiff comes home on the morning tide, dashed on the same ledges that dashed her once before, exactly where Aldo's came ashore a week ago, as if the coast keeps a place for the returning.",
        "Tam keeps your light that night, all night, forty years of a man's flame burning over the strait toward a tower that answered. Sel rings the bell at dusk, every dusk, and wears the silver watch against her skin, and tells anyone who will listen — and then anyone who won't — that the keeper led it out past the Reach like Braxton, and the sea will lend the keeper back. The sea lends. It has never once given back the thing itself.\n\nBut the town got back its drowned that spring. Every boat the water had kept. And on the cliff, in the lee of the stone wall, the old lifeboat's name-board still says what it has always said:\n\nSEA-CHANGE.",
        "By order of the Northern Light Commission, the light at Halden Point must not go dark. Not for weather. Not for grief. Not for anything under heaven.\n\nIt has not gone dark. It will not go dark. The log is kept in a steeper, more cautious hand these days, and the first entry under the new name still says what the water said, and what the keeper answered, in eleven words:\n\n*the water stood up. it asked if we were there. yes.*",
      ],
      tone: "storm",
    },
  };

  /* ============================================================
     CREDITS
     ============================================================ */
  const credits = [
    { role: "A STORY IN LIGHT AND WATER", names: ["THE LONG LIGHT"] },
    { role: "THE COAST", names: ["Halden Point — a rock, a tower, ninety-three steps", "The strait — which the old charts call simply THE WATER"] },
    { role: "THE FOLK", names: [
      "The Keeper — wants to be worthy of a light inherited; carries a doused lamp and a drowned night",
      "Bo Halloran — master of the Tern; thirty years of oil and opinions",
      "Sel — sixteen; sleeps rough, listens hard; whistles back",
      "Tammas Reeve — keeper of Widow's Reach; forty years of answered-by-nobody wires",
      "Aldo Voss — the keeper before; went out with a lantern and a plan",
      "Jory Trelowen — deckhand of the Cormorant; five notes, down and up",
    ] },
    { role: "WRITTEN, COMPOSED, ILLUSTRATED & PROGRAMMED", names: ["GLM-5.3-Flash", "in one sitting, on one coast, in one browser"] },
    { role: "THE INSTRUMENTS", names: [
      "Every wave, wind and bell — synthesized, no recordings",
      "Every tower, boat and bird — drawn, no images",
      "Every lamp lit and doused — yours",
    ] },
    { role: "FOR THE KEEPERS", names: [
      "who stand the ninety-three steps and answer the water,",
      "every night, in five notes, down and up",
    ] },
    { role: "THE END", names: ["The light must not go dark.", "It has not gone dark."] },
  ];

  /* night→score helper text */
  function scoreNote(score) {
    if (score >= 85) return "A flawless watch. The log glows with it.";
    if (score >= 70) return "A good watch. The lamp barely faltered.";
    if (score >= 50) return "A watch held. The lamp wavered; the coast forgives.";
    return "A hard watch. The lamp faltered more than once. The coast remembers.";
  }

  return { prologueLines, signLines, prologueNight, nights, logs, night5, rhythm, climaxChoices, endings, credits, scoreNote };
})();
