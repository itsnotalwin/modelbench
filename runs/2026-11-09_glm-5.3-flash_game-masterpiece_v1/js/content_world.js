/* ============================================================
   THE LONG LIGHT — content_world.js
   the world: its people, its things, its paper, its days
   ============================================================ */
"use strict";
window.CW = (function () {

  /* ---------------- the cast ---------------- */
  const CHARS = {
    narr:   { name: "", color: "#cfc3a9" },
    you:    { name: "You", color: "#f4c069" },
    bo:     { name: "Bo Halloran", color: "#c9884a", line: "Master of the supply Tern. Thirty years on this run, and grumbles at every one of them." },
    sel:    { name: "Sel", color: "#9aab8c", line: "Sixteen years old. Sleeps rough, listens hard, lies badly." },
    tam:    { name: "Tammas Reeve", color: "#6f9fb8", line: "Keeper of Widow's Reach, across the strait. Sends telegrams nobody answers." },
    aldo:   { name: "Aldo Voss", color: "#e8a13d", line: "Keeper of this light for thirty-one years. Gone a week before you came." },
    commission: { name: "The Commission", color: "#8fa0a8", line: "The Northern Light Commission. Eleven shillings the week, and opinions to spare." },
  };

  /* ---------------- things ---------------- */
  const ITEMS = {
    oil_can:   { name: "Tin of Lamp Oil", desc: "A quart of the good winter oil. The lamp drinks it slow.", icon: "oil" },
    rope:      { name: "Coil of Rope", desc: "Hemp, still sweet in the middle. Salt-stiff at the ends.", icon: "rope" },
    brass:     { name: "Brass Scrap", desc: "A jeweller's weight of old brass, from a boat that went ashore.", icon: "brass" },
    pitch:     { name: "Pot of Pitch", desc: "Black, stinking, and exactly right for leaks.", icon: "pitch" },
    canvas:    { name: "Oiled Canvas", desc: "A sail that failed before the wind did. Still sound at the seams.", icon: "canvas" },
    charts:    { name: "Lens Charts", desc: "Aldo's own drawings of the great lens. He knew every facet by name.", icon: "chart" },
    lantern:   { name: "Storm Lantern", desc: "Brass, shielded, heavy. It will burn in weather that blows out stars.", icon: "lantern" },
    watch:     { name: "Jory's Silver Watch", desc: "It has kept the hour since before the Cormorant sailed. Of late it keeps the hour strangely.", icon: "watch" },
    glass:     { name: "Tam's Watch-Glass", desc: "A battered brass telescope. It makes the far horizon honest.", icon: "glass" },
    bread:     { name: "Loaf and Hard Cheese", desc: "A keeper's supper, or a stowaway's.", icon: "bread" },
    pipe:      { name: "Tin of Pipe Tobacco", desc: "Aldo bought it and never got to be an old man with a pipe. It will keep for the next keeper, or the next kindness.", icon: "pipe" },
    letter_aldo: { name: "Aldo's Last Letter", desc: "Found beneath a floorboard, folded twice, and waiting.", icon: "letter" },
    braces:    { name: "Oak Braces", desc: "Sawn to length by somebody who knew this gallery by heart.", icon: "beam" },
    brass_bag: { name: "Screws and Odd Brass", desc: "Bo's chandlery odds. Enough to make a bell honest again.", icon: "brass" },
    tables:    { name: "Tam's Tables", desc: "Eighty-eight years of nights, written in a careful widow's hand.", icon: "chart" },
  };

  /* ---------------- repairs ---------------- */
  const REPAIRS = {
    bell:  { name: "The fog bell", stages: ["cracked through", "mended", "tuned sweet"] },
    lens:  { name: "The great lens", stages: ["salt-hazed", "cleaned and trued", "sealed and steady"] },
    tower: { name: "The tower", stages: ["sound enough", "braced", "stayed for weather"] },
    skiff: { name: "Aldo's skiff", stages: ["dashed", "caulked", "seaworthy"] },
  };

  /* ---------------- the folk (logbook, People tab) ---------------- */
  function standing(t) {
    if (t >= 4) return "would follow you into the water";
    if (t >= 3) return "trusts you outright";
    if (t >= 2) return "is with you";
    if (t >= 1) return "is warming to you";
    if (t >= 0) return "is watching you";
    if (t >= -1) return "has doubts";
    return "has written you off";
  }
  const FOLK = [
    { id: "bo", name: "Bo Halloran", role: "Master of the Tern, supply run out of Brayhead.", want: "Wants his last season to be an easy one. Wants, quietly, to be needed once more.", read: (s) => {
      const t = s.trust.bo;
      if (s.flags.bo_confession) return "He told you about the crewman he couldn't reach, in 'twenty-six. Telling him about the Vesper was the right thing. Keepers keep.";
      if (t >= 2) return "He calls you 'keeper' like it's a proper word now. He'd bring the Tern out in weather, if you asked him true.";
      if (t >= 0) return "He measures every new keeper against Aldo and finds them short. Fair enough, so far.";
      return "He's decided about you already, and not kindly.";
    } },
    { id: "sel", name: "Sel", role: "Sixteen. Came out on the Tern without asking.", want: "Wants her brother back, or failing that, a sound that sounds like him.", read: (s) => {
      const t = s.trust.sel;
      if (s.gaveWatch) return "You gave her Jory's watch. She wears it under her collar, against her skin, and it ticks like a small brave heart.";
      if (t >= 3) return "She saves you the burnt edge of the toast because it's the best bit. She calls the tower 'our light' now.";
      if (t >= 1) return "She's decided the lamp room is the best room in the world. She might be right.";
      return "She watches you the way gulls watch a hand that might throw bread or a stone.";
    } },
    { id: "tam", name: "Tammas Reeve", role: "Keeper, Widow's Reach. Forty years on the wire.", want: "Wants one colleague. Wants the Commission to read one table, once.", read: (s) => {
      const t = s.trust.tam;
      if (t >= 3) return "He wires weather, tables, and now and then a joke, each with the same care. Forty years of one-sided letters, ended.";
      if (t >= 1) return "You answer his wires. He has begun to expect answers, which is its own kind of faith.";
      return "He wires; the coast does not reply. It has been a long forty years.";
    } },
    { id: "aldo", name: "Aldo Voss", role: "Your uncle. Keeper here thirty-one years. Gone a week before you came.", want: "Wanted the light to owe nobody anything. Wanted to tell you something, and put it off.", read: (s) => {
      if (s.flags.aldo_letter) return "His last letter is in your satchel and your chest at once. He meant to lead it out alone, so it would never learn your name.";
      if (s.flags.charts_read) return "Every chart in the study is gridded in pencil and gridded in grief. He was measuring the water's memory.";
      return "A log in a steady hand that stops mid-line, one week ago.";
    } },
  ];

  /* ---------------- journal entries ---------------- */
  const JOURNAL = {
    j_arrival: { ch: 0, tag: "station", title: "The appointment",
      body: "Appointed keeper of Halden Point, wage eleven shillings the week, in place of Aldo Voss, retired to his rest. The Commission's letter says the light must not go dark — not for weather, not for grief, not for anything under heaven. Under the stamp, in pencil, small: 'It is not a lighthouse. It is an invitation. — A.V.'" },
    j_first_light: { ch: 0, tag: "watch", title: "Night the first",
      body: "The lamp lit true on the first match. The logbook teaches its own hand: what the water says, you write down. Something under the water said something. It was green, and it was slow, and it was listening." },
    j_low_water: { ch: 1, tag: "deep", title: "Low water, and what it leaves",
      body: "At low water the rocks give back everything they borrowed: boots, spars, a doll's head. The cave past the headland has a tally cut in the rock — years, going back and back. 1762. 1850. 1938. The spaces between get no smaller. Something comes, and the sea, before it comes, begins to return things." },
    j_wreck: { ch: 1, tag: "station", title: "The Sea-Change",
      body: "The wreck on the cliff path is a lifeboat, and her name-board reads SEA-CHANGE. There was a Braxton keeping this station in 1850. His lifeboat is on my cliff. I took the rope and the brass and left the name where it lies. Some things are where they mean to be." },
    j_tam_wire: { ch: 1, tag: "folk", title: "Widow's Reach answers",
      body: "The station across the strait wired within the hour of my first light: ACKNOWLEDGED HALDEN POINT LIGHT. WILL WATCH YOUR FLAME ACROSS THE WATER. T. REEVE. Forty years that man has wired this coast, and tonight is the first time anybody wired back." },
    j_sel_found: { ch: 2, tag: "folk", title: "A tenant in the oil store",
      body: "There was a girl asleep in the oil store among the barrels, with bread in her pocket and a knife she never touched me with. Sel. She came out on the Tern without asking. She is listening for something the sea is supposed to be saying." },
    j_cormorant: { ch: 2, tag: "folk", title: "The Cormorant",
      body: "Sel's brother Jory was deckhand on the Cormorant, lost with all hands the spring before last — one of the twelve the sea kept that year. She says the water has started giving things back. She says if the sea is giving things back, it can give a brother back. It is not a stupid hope. It is only a hopeless one." },
    j_co_signed: { ch: 2, tag: "station", title: "A signature, co-signed",
      body: "Tam Reeve has wired the Commission for years that the water rises on an eighty-eight year turn. They filed his tables under 'opinions'. I put the keeper's stamp of Halden Point beside his name. Let them file that." },
    j_tam_talked: { ch: 3, tag: "folk", title: "The voice across the strait",
      body: "Wired long into the evening with Tam. He is seventy-four and deaf in one ear and he knows this water like his own hand. He says: the Swell is not weather, it is a tide that got lost and never found its way home, and it is lonely, and it follows a steady light like a dog follows a whistle. He says a bell is a voice too, and a bell cannot be followed. He will coach me on the bell, he says, if I keep answering." },
    j_bell_song: { ch: 3, tag: "deep", title: "A bell is a voice too",
      body: "Tam, by wire: THE THING FOLLOWS WHAT BURNS STEADY. IT CANNOT FOLLOW WHAT RINGS AND DIES AWAY. RING YOUR BELL IN WEATHER AND LET THE SOUND DO YOUR SHOUTING. A VOICE THAT ENDS CANNOT BE FOLLOWED HOME." },
    j_tables: { ch: 4, tag: "deep", title: "The tables of Tam Reeve",
      body: "His tables, copied out in a careful hand: 1762. 1850. 1938. Eighty-eight years between, and the one before 1762 lost to old men's arguments. Next turn: this week. He wrote in the margin, smaller: THEY WILL SAY I WAS MAD. THE TABLES ARE NOT MAD. THE TABLES ARE ONLY EARLY." },
    j_1850: { ch: 4, tag: "deep", title: "Braxton's account, 1850",
      body: "From the log shelf, in a spill of a hand: 'The Swell stood off the point three nights like a gentleman waiting to be asked in. What it wanted of us I cannot say, for what I gave it was a lantern, and it followed me out to the deep water past the Reach, and I never saw my tower again — only that green light going down ahead of me like a star going out. The sea keeps nothing. The sea lends. Every boat it took in my lifetime came home that spring, and I did not.' Under it, another hand: 'He was my father. He gave the town back every drowned thing it grieved for. — E. Braxton'" },
    j_steady: { ch: 4, tag: "deep", title: "Steady light, erring light",
      body: "Aldo's charts, worked over in pencil: a steady flame stands still, and a thing that is lost will walk toward what stands still. A light that errs — that moves, that dies away and comes again — cannot be followed home. There are two ways to be a light the water cannot follow: be a voice that ends (a bell), or be a star that wanders. There is a third way written in the margin, and it is crossed out, and it is not quite crossed out." },
    j_hum: { ch: 4, tag: "deep", title: "What the hum asks",
      body: "It is not weather, and it is not an animal, quite. It hums, and the hum has a shape, and the shape is a question. Sel says it is the same hum the Cormorant's men whistled at the rail. The question, I think, is the one every lost thing asks: are you there? A keeper answers, because answering is the work. The trick — Aldo's trick — is to answer in a voice the water cannot follow." },
    j_aldo_letter: { ch: 4, tag: "folk", title: "Aldo's letter, unsent",
      body: "'Nell. By the time you read this I will have tried to be clever, and clever men drown. The Swell is come early, as Reeve said, and it is lonely, and everything lonely follows. I mean to take the lantern out and let it follow me past the Reach, and then to go dark, and drift, and come home some morning it has forgotten me. The trick is not to lead it. The trick is to walk beside it until it forgets you were ever light at all. If I am slow coming home, mind the lamp first and grieve after. The light is for the living. — your Uncle A.'" },
    j_watch: { ch: 4, tag: "folk", title: "Jory's watch",
      body: "The tide gave back a silver watch, and the name inside the case is J. TRELOWEN. It still runs. It runs differently when the water stands up — faster, like something hurrying. Sel wore it to sleep and woke with it still warm, which is not a thing watches do. I gave it to her. Some instruments measure the water. That one measures her." },
    j_lent_things: { ch: 4, tag: "deep", title: "What the sea lends",
      body: "The cave is full of the sea's lending: a boot, a bible swelled to double, a ship's bell green with sea-milk, a pocket of letters tied in oilcloth, a child's shoe. The oldest things here are older than the lighthouse. The sea is tidying. The sea is returning what it took, before whatever takes it next arrives." },
    j_merrilee: { ch: 3, tag: "station", title: "The Merrilee",
      body: "The lugger Merrilee ran for the harbor in fog tonight and the bell was not there to meet her. She is on the bar, mast gone by the board, crew off in the Tern's boat. Nobody drowned. That is the sentence and it has to be enough, and it isn't." },
    j_merrilee_safe: { ch: 3, tag: "station", title: "The Merrilee, home safe",
      body: "Fog thick as wool on the water tonight, and the Merrilee out in it — but the bell was tuned and Tam's coaching held, and she came round the bar on the sound alone. Her master sent up a rocket when she made the quay. For a bell, that is a parade." },
    j_fleet: { ch: 4, tag: "station", title: "The fleet, warned",
      body: "Wired Brayhead: WATER RISES FRIDAY NIGHT. KEEP YOUR BOATS. The fleet master wired back ONE WORD OF LIES AND WE LOSE THE SEASON, KEEPER — then, an hour later: THE VIGILANT WILL STAND OFF THE STRAIT FRIDAY. IF YOU ARE WRONG I WILL TELL EVERYONE YOU WERE WRONG. IF YOU ARE RIGHT I WILL TELL NOBODY ANYTHING." },
    j_vesper: { ch: 4, tag: "folk", title: "The Vesper",
      body: "Eleven years ago, my first posting. Storm, and the manual said douse in the unmanned hours to save the oil. I read the manual out loud, like it was a compass. The Vesper went on the rocks at Stone Quay in the dark I made. Three men. The inquiry called it regrettable and correct. I signed the log 'weather: severe, visibility nil' — which was true, and mine. Aldo knew. Of course Aldo knew. He kept the light burning anyway, and he kept me." },
    j_led: { ch: 4, tag: "deep", title: "The way out is the way through",
      body: "The margin Aldo could not quite cross out: 'Braxton led it out and did not come back. But Braxton burned a lantern all the way to the deep water and it followed him the whole road like a brother. If the lantern goes dark before the deep water — if the leader goes dark and drifts — the water loses him. It cannot follow what ends. It cannot follow what errs. A bell is a voice that ends. A man who douses his own light is a star that errs. Tam's tables mark where the deep water begins: past the Reach, two minutes by oar past the old anchor.' " },
    j_commission2: { ch: 4, tag: "station", title: "The Commission, forewarned",
      body: "Reply to our co-signed wire: THE COMMISSION NOTES THE OPINIONS OF THE KEEPERS OF HALDEN POINT AND WIDOW'S REACH AND WILL ADVISE CAPTAINS OF COMMERCIAL TRAFFIC ACCORDINGLY. Filed, stamped, and — for once — acted on. The Vigilant stands off the strait Friday night, if the fleet master keeps his word." },
    j_steady_lamp: { ch: 5, tag: "station", title: "The Steady Lamp",
      body: "The oldest order there is: the light must not go dark. Not for weather. Not for grief. Not for anything under heaven. If the water wants a light, it can come to mine, and the tower will stand between it and everything I love, because that is what towers are for." },
    j_dark_watch: { ch: 5, tag: "station", title: "The Dark Watch",
      body: "Douse the tower, douse the house, douse the harbor, and let the water look for a star and find none. The bell rings where eyes are useless. The sea takes what shows itself — so show it nothing, and let it pass like weather." },
    j_led_light: { ch: 5, tag: "station", title: "The Led Light",
      body: "Take the lantern out. Let it follow. Then, past the Reach, go dark, and drift, and be nothing it can follow home. Aldo tried it alone in a dashed skiff. I am not Aldo. I have a mended boat if I mended it, a rhythm if I learned it, and people — which is the part the sea has never worked out." },
  };

  /* ---------------- documents (letters, wires, charts) ---------------- */
  const DOCUMENTS = {
    doc_commission1: { title: "The Northern Light Commission", head: "BRAYHEAD · STATIONERY OF THE NORTHERN LIGHT COMMISSION",
      body: "To the Keeper of the Light at Halden Point, greetings —\n\nYou are appointed Keeper of the light at Halden Point, wage eleven shillings the week, in place of Aldo Voss, retired to his rest.\n\nThe Commission reminds the Keeper that the light must not go dark. Not for weather. Not for grief. Not for anything under heaven.\n\nBy order,\nE. PARGITER, Asst. Sec." },
    doc_aldo_pencil: { title: "Beneath the stamp", head: "IN PENCIL, SMALL, ACROSS THE COMMISSION'S FACE",
      body: "It is not a lighthouse.\nIt is an invitation.\n\n— A.V." },
    doc_tam1: { title: "Wire — Widow's Reach", head: "RECEIVED AT HALDEN POINT · NIGHT OF YOUR FIRST LIGHT",
      body: "ACKNOWLEDGED HALDEN POINT LIGHT STOP YOUR FLAME STANDS ON THE WATER LIKE IT HAS OPINIONS STOP TAM REEVE WIDOWS REACH STOP REPLY IF THERE IS ANYBODY THERE STOP THERE NEVER HAS BEEN" },
    doc_tam2: { title: "Wire — Widow's Reach", head: "RECEIVED AT HALDEN POINT · MORNING, TUESDAY",
      body: "FUG YOU MEAN FOG STOP BELL WEATHER COMING STOP IS YOUR BELL SOUND STOP MINE IS TUNED AND I AM DEAF AS A POST AND STILL IT KEEPS THE SHIPS OFF STOP RING IT SOON AND RING IT OFTEN STOP REEVE" },
    doc_co_sign: { title: "Joint wire to the Commission", head: "SENT JOINTLY, HALDEN POINT AND WIDOW'S REACH",
      body: "TO THE COMMISSION STOP THE WATER RISES THIS WEEK STOP NOT OPINION TABLES STOP EIGHTY EIGHT YEAR TURN LAST STOOD 1850 STOP REEVE FILES TABLES HERETOFORE IGNORED STOP CO-SIGNED ALDO VOSS KEEPER LATE AND THE PRESENT KEEPER OF HALDEN POINT STOP WE WILL STAND OUR LIGHTS STOP ANSWER US" },
    doc_commission2: { title: "The Commission replies", head: "RECEIVED AT HALDEN POINT · THURSDAY",
      body: "THE COMMISSION NOTES THE OPINIONS OF THE KEEPERS OF HALDEN POINT AND WIDOW'S REACH AND WILL ADVISE CAPTAINS OF COMMERCIAL TRAFFIC ACCORDINGLY STOP THE COMMISSION REMINDS KEEPERS THAT THE LIGHT MUST NOT GO DARK STOP THIS CLAUSE HAS NO EXCEPTIONS AND NEVER HAS STOP E. PARGITER ASST SEC" },
    doc_tables: { title: "Nights of the Swell — the tables of Tam Reeve", head: "COPIED IN A CAREFUL HAND AND POSTED THURSDAY",
      body: "   YEAR    THE WATER STOOD\n   1674    (old men's argument)\n   1762    three nights, off the point\n   1850    three nights; keeper Braxton led it out; lost\n   1938    (this hand's grandfather logged it; filed as weather)\n   ----    next turn: THIS WEEK\n\nIn the margin, smaller: THEY WILL SAY I WAS MAD. THE TABLES ARE NOT MAD. THE TABLES ARE ONLY EARLY." },
    doc_fleet: { title: "Wire — Brayhead fleet master", head: "RECEIVED AT HALDEN POINT · THURSDAY",
      body: "KEEPER STOP ONE WORD OF LIES AND WE LOSE THE SEASON STOP ONE WORD OF TRUTH AND WE LOSE IT ANYWAY STOP REEVE SAYS YOUR NAME LIKE IT IS WORTH SOMETHING STOP THE VIGILANT STEAMS FRIDAY AND STANDS OFF THE STRAIT STOP IF YOU ARE WRONG I WILL TELL EVERYONE STOP IF YOU ARE RIGHT I WILL TELL NOBODY ANYTHING STOP V. PENTREATH" },
    doc_vigilant: { title: "Wire — H.M.S. Vigilant", head: "RECEIVED AT HALDEN POINT · FRIDAY, DUSK",
      body: "TO THE KEEPER OF HALDEN POINT STOP WE STAND FIVE MILES OFF YOUR STRAIT TONIGHT AND WE SEE YOUR LIGHT BURNING STOP WHATEVER YOUR WATER DOES TONIGHT THERE ARE THREE HUNDRED MEN WHO WILL SAY THEY SAW IT STOP KEEP IT BURNING KEEPER STOP THE NAVY IS WATCHING AND THE NAVY TELLS STORIES TOO" },
    doc_charts: { title: "The great lens, by facet", head: "FROM ALDO'S STUDY · PEN AND PENCIL AND PENCIL AGAIN",
      body: "A drawing of the great lens, every facet numbered in Aldo's hand. Around the margins, worked over and over:\n\nA STEADY FLAME STANDS STILL. A THING LOST WALKS TOWARD WHAT STANDS STILL.\nA LIGHT THAT ERRS CANNOT BE FOLLOWED HOME.\nA BELL IS A VOICE THAT ENDS.\n\nAnd in the bottom corner, crossed out once, then written again, smaller:\nGo dark, and drift, and come home some morning it has forgotten you." },
  };

  /* ---------------- locations ---------------- */
  const L = {
    jetty: {
      id: "jetty", name: "The Jetty", icon: "jetty", pos: "jetty",
      desc: "Grey planks on black piles, and beyond them the whole grey road of the sea. The Tern ties up here when Brayhead remembers this rock exists.",
      enter: (s) => true,
    },
    skiff: {
      id: "skiff", name: "Aldo's Skiff", icon: "skiff", pos: "skiff",
      desc: "Hauled above the tide line, keel up, the way you leave a boat you mean to come back for. Or the way the sea left it.",
      enter: (s) => true,
    },
    store: {
      id: "store", name: "The Oil Store", icon: "store", pos: "store",
      desc: "Stone walls, iron door, and a smell of winter oil that gets into wool and never leaves. Barrels stacked the way Aldo stacked them, which is to say properly.",
      enter: (s) => true,
    },
    tower: {
      id: "tower", name: "The Tower", icon: "tower", pos: "tower",
      desc: "Ninety-three steps, and every one of them Aldo's. The great lens sits at the top like a glass eye learning to look at you.",
      enter: (s) => true,
    },
    bell: {
      id: "bell", name: "The Fog Bell", icon: "bell", pos: "bell",
      desc: "An A-frame of oak and a bell that has said the same sentence to the fog for a hundred years: here, here, here.",
      enter: (s) => true,
    },
    house: {
      id: "house", name: "The Keeper's House", icon: "house", pos: "house",
      desc: "Two rooms below, one above, a stove that has never once gone cold. The clocks are stopped at ten past ten. Everything here is waiting for somebody to wind it.",
      enter: (s) => true,
    },
    cliff: {
      id: "cliff", name: "The Cliff Path", icon: "cliff", pos: "cliff",
      desc: "The path climbs the headland past the old lifeboat and out to where the wind lives. At low water, a cave opens under the point that the sea uses for keeping things.",
      enter: (s) => true,
    },
  };

  /* ---------------- chapters ---------------- */
  const CHAPTERS = [
    null, // index 0 unused; prologue handled separately
    {
      num: 1, title: "LOW WATER", day: "MONDAY", date: "the first day",
      epigraph: "In which the keeper takes stock of an island, a boat, and a week's worth of oil.",
      weather: ["clear", "clear", "clear", "mist"],
      orders: [
        { id: "o1_1", text: "Show Bo Halloran there is a keeper on this rock", done: (s) => !!s.flags.met_bo, note: "the Tern calls at the jetty" },
        { id: "o1_2", text: "Walk the island before dark — see what the water left", done: (s) => !!s.flags.wreck_seen, note: "the cliff path, they say" },
        { id: "o1_3", text: "Keep the first full watch tonight", done: (s) => State.nightScore(1) > 0, note: "the light will want oil, wick, and your eyes" },
      ],
      journal: ["j_arrival"],
    },
    {
      num: 2, title: "THE STOWAWAY", day: "TUESDAY", date: "the second day",
      epigraph: "In which the oil store has a tenant, and the Commission learns that keepers talk to each other.",
      weather: ["fog", "fog", "fog", "fog"],
      orders: [
        { id: "o2_1", text: "Find out who is living in your oil store", done: (s) => !!s.flags.sel_found, note: "somebody has been eating like a gull and sleeping like a fox" },
        { id: "o2_2", text: "Decide what to do about them", done: (s) => s.selStays !== null, note: "the Tern leaves on the afternoon tide" },
        { id: "o2_3", text: "Read Tam's wire, and consider signing it with him", done: (s) => !!s.flags.co_signed, note: "optional — but nothing here is optional, really" },
      ],
      journal: [],
    },
    {
      num: 3, title: "WIDOW'S REACH", day: "WEDNESDAY", date: "the third day",
      epigraph: "In which a voice across the strait answers at last, and the fog asks its question.",
      weather: ["rain", "rain", "rain", "rain"],
      orders: [
        { id: "o3_1", text: "Answer Widow's Reach on the wire", done: (s) => !!s.flags.tam_talked, note: "Tam has wired every day for forty years" },
        { id: "o3_2", text: "Have the fog bell ready before dark", done: (s) => s.repairs.bell >= 1, note: "scrap brass would do it, or Bo's chandlery" },
        { id: "o3_3", text: "Warn Brayhead before the water rises", done: (s) => !!s.flags.fleet_warned, note: "the fleet trusts nobody, and less each year" },
      ],
      journal: [],
    },
    {
      num: 4, title: "WHAT THE WATER REMEMBERS", day: "THURSDAY", date: "the fourth day",
      epigraph: "In which the sea grows honest, and a study keeps its secret badly.",
      weather: ["mist", "clear", "squall", "squall"],
      orders: [
        { id: "o4_1", text: "See what the tide gave back at low water", done: (s) => !!s.flags.watch_found, note: "the cave, at the turning of the tide" },
        { id: "o4_2", text: "Read what Aldo could not send", done: (s) => !!s.flags.aldo_letter, note: "the study knows more than it says" },
        { id: "o4_3", text: "Learn what the hum is asking", done: (s) => !!s.flags.hum_learned, note: "Sel hears it first. She always hears it first." },
        { id: "o4_4", text: "Settle things with Bo before the Tern sails", done: (s) => !!s.flags.bo_settled, note: "the Tern leaves Friday noon, he says. We'll see." },
      ],
      journal: [],
    },
    {
      num: 5, title: "THE LAST NIGHT", day: "FRIDAY", date: "the fifth day",
      epigraph: "In which the keeper answers the oldest question on this coast: what is the light for?",
      weather: ["storm", "storm", "storm", "storm"],
      orders: [
        { id: "o5_1", text: "Carry every barrel the tower can hold", done: (s) => s.oilStore >= 3, note: "the store, while the light lasts" },
        { id: "o5_2", text: "Keep the last watch", done: (s) => s.chapter >= 6, note: "whatever it costs. Whatever it decides." },
      ],
      journal: [],
    },
  ];

  /* the turning of the tide — sea cave opens on even days, midday hours */
  function tideLow(chapter, slot) {
    return (chapter === 2 || chapter === 4) && slot >= 1 && slot <= 2;
  }

  return { CHARS, ITEMS, REPAIRS, FOLK, JOURNAL, DOCUMENTS, L, CHAPTERS, tideLow, standing };
})();
