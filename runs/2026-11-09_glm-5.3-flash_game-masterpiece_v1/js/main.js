/* ============================================================
   THE LONG LIGHT — main.js
   the engine: title, days, nights, the last night, the endings
   ============================================================ */
"use strict";
window.Game = (function () {

  const $ = (id) => document.getElementById(id);
  const app = () => document.getElementById("app");

  let scene = "title";        // title | day | night | ending | credits
  let rafId = 0; let lastT = 0;
  let night = null;           // night runtime
  let rhythm = null;          // climax rhythm runtime
  let climaxPhase = null;     // null | 'ritual' | 'choice'
  let pendingMorning = null;

  function reducedMotion() {
    const st = State.settings();
    return st.motion === "calm" || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  /* ============================================================
     BOOT
     ============================================================ */
  function boot() {
    State.loadSettings();
    Art.init($("stage"));
    UI.bindAll();
    bindTitle();
    bindHud();
    bindNight();
    bindKeys();

    const st = State.settings();
    app().dataset.motion = st.motion;
    document.getElementById("fader").classList.add("is-clear");

    showTitle();
    startLoop();

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) { Snd.suspend(); }
      else { Snd.resume(); lastT = 0; }
    });
    window.addEventListener("beforeunload", () => {
      const s = State.get();
      if (s && s.chapter >= 1 && !s.ending) { try { State.saveSlot(0); } catch (e) {} }
    });
  }

  function frameStep(dt) {
    try {
      Art.draw(dt);
      Snd.update(performance.now());
      const top = UI.topOverlay();
      const tickingOK = !top || top === "ov-event";
      if (night && !night.blocked && tickingOK && !climaxPhase) nightTick(dt);
      if (rhythm) rhythmTick(dt);
      if (scene === "night" && night) pushNightParams();
    } catch (e) { /* the show goes on */ }
  }

  function startLoop() {
    const step = (ts) => {
      rafId = requestAnimationFrame(step);
      const dt = lastT ? Math.min(0.05, (ts - lastT) / 1000) : 0.016;
      lastT = ts;
      if (!document.hidden) frameStep(dt);
    };
    rafId = requestAnimationFrame(step);
    // heartbeat: some embedding contexts (occluded panes, odd webviews)
    // suspend requestAnimationFrame while claiming to be visible. The sea
    // does not stop for that; catch the loop up in small honest steps.
    window.setInterval(() => {
      if (document.hidden) return;
      const now = performance.now();
      const gap = now - lastT;
      if (gap < 1100) return; // rAF is alive
      let rem = Math.min(4000, gap);
      lastT = now - rem;
      while (rem > 0 && !document.hidden) {
        const dms = Math.min(50, rem);
        lastT += dms;
        frameStep(dms / 1000);
        rem -= dms;
      }
    }, 500);
  }

  /* ============================================================
     TITLE
     ============================================================ */
  function showTitle() {
    scene = "title";
    night = null; rhythm = null; climaxPhase = null;
    app().dataset.ch = "0";
    Art.clearParams();
    Art.setScene("title");
    UI.show("s-title");
    Snd.setAmbScene("title");
    Snd.music("warm");
    Snd.setWeather("clear");
    Snd.stopWatch();
    Snd.setHum(0);
    $("btn-continue").hidden = !State.peekSlot(0);
  }

  function bindTitle() {
    $("btn-new").addEventListener("click", () => { Snd.ensure(); Snd.play("select"); beginPrologue(false); });
    $("btn-continue").addEventListener("click", () => {
      Snd.ensure();
      const st = State.loadSlot(0);
      if (st) { Snd.play("chime"); resumeFrom(st); }
      else UI.toast("The autosave page is missing.");
    });
    $("btn-saves").addEventListener("click", () => { Snd.ensure(); UI.openSaves("load"); });
    $("btn-settings").addEventListener("click", () => { Snd.ensure(); UI.openSettings(); });
    $("btn-help").addEventListener("click", () => { Snd.ensure(); UI.openOverlay("ov-help"); });
  }

  /* resume a saved state at the nearest coherent beat */
  function resumeFrom(st) {
    State.set(st);
    const s = State.get();
    if (s.ending) { playEnding(s.ending, true); return; }
    if (s.chapter === 0) {
      if (State.nightScore(0) > 0) { startChapter(1); }
      else { beginPrologue(true); }
      return;
    }
    startChapter(s.chapter);
  }

  /* ============================================================
     APPLY FX — one place where choices change the world
     ============================================================ */
  function applyFx(fx) {
    if (!fx) return;
    const s = State.get();
    if (fx.trust) { for (const w in fx.trust) State.trust(w, fx.trust[w]); }
    if (fx.trust2) { for (const w in fx.trust2) State.trust(w, fx.trust2[w]); }
    if (fx.flags) fx.flags.forEach((f) => { s.flags[f] = true; });
    if (fx.item) fx.item.forEach((i) => State.giveItem(i));
    if (fx.take) fx.take.forEach((i) => State.takeItem(i));
    if (fx.marks) s.marks = Math.max(0, s.marks + fx.marks);
    if (fx.oilStore) s.oilStore = Math.max(0, s.oilStore + fx.oilStore);
    if (fx.lampOil) s.lampOil = Math.max(0, Math.min(100, s.lampOil + fx.lampOil));
    if (fx.repair) { for (const r in fx.repair) s.repairs[r] = Math.min(2, Math.max(s.repairs[r], fx.repair[r])); }
    if (fx.journal) fx.journal.forEach((j) => State.addJournal(j));
    if (fx.selStays !== undefined) s.selStays = fx.selStays;
    if (fx.gaveWatch !== undefined) s.gaveWatch = fx.gaveWatch;
    if (fx.fleetWarned !== undefined) s.fleetWarned = fx.fleetWarned;
    if (fx.fn) { try { fx.fn(s); } catch (e) { /* story must survive a bad effect */ } }
    updateHud();
  }

  /* ============================================================
     PROLOGUE
     ============================================================ */
  function beginPrologue(skipIntro) {
    if (!State.isLoaded()) State.set(State.fresh("Edda"));
    const s = State.get();
    scene = "day"; // canvas will show island dusk under the sequence overlay
    s.chapter = 0;
    app().dataset.ch = "0";
    UI.show("s-seq");
    Art.setScene("day", dayParams());
    Snd.setAmbScene("day");
    Snd.setWeather("mist");
    Snd.music("warm");
    if (skipIntro) {
      UI.playSequence([CN.signLines[1], CN.signLines[2]], { onDone: () => UI.openName() });
    } else {
      UI.playSequence(CN.prologueLines, { onDone: () => UI.openName() });
    }
  }

  function newGame(name) {
    const s = State.get() || State.fresh(name);
    s.name = State.sanitizeName(name);
    State.set(s);
    UI.playSequence(CN.signLines, { onDone: () => startTutorialNight() });
  }

  function startTutorialNight() {
    beginNight(0);
  }

  /* ============================================================
     CHAPTERS / DAYS
     ============================================================ */
  function startChapter(n) {
    const s = State.get();
    s.chapter = n;
    s.slot = 0; s.hours = 6; s.visited = [];
    const ch = CW.CHAPTERS[n];
    s.weather = ch ? ch.weather[0] : "clear";
    if (ch && ch.journal) ch.journal.forEach((j) => State.addJournal(j));
    app().dataset.ch = String(n);
    Snd.stopWatch();
    night = null; rhythm = null; climaxPhase = null;
    try { State.saveSlot(0); } catch (e) {}
    UI.fadeThrough(() => {
      $("card-num").textContent = "CHAPTER " + ["", "ONE", "TWO", "THREE", "FOUR", "FIVE"][n] || "";
      $("card-title").textContent = ch ? ch.title : "";
      $("card-epigraph").textContent = ch ? ch.epigraph : "";
      UI.show("s-card");
      Snd.music(["", "warm", "grey", "slate", "dusk", "storm"][n] || "warm");
      Snd.setAmbScene("none");
    });
  }

  function bindCard() {
    $("card-go").addEventListener("click", () => { Snd.play("select"); startDay(); });
  }

  function dayParams() {
    const s = State.get();
    return {
      chapter: s.chapter, slot: s.slot, weather: s.weather, tide: s.tide,
      tern: s.chapter === 1 && !s.flags.bo_gone && s.slot <= 1 ? true : (s.chapter >= 2 && !s.flags.bo_gone ? true : false),
      skiff: s.repairs.skiff === 0 ? "broken" : false,
      bellRepaired: s.repairs.bell >= 1,
    };
  }

  function startDay() {
    const s = State.get();
    const ch = CW.CHAPTERS[s.chapter];
    scene = "day";
    s.tide = CW.tideLow(s.chapter, s.slot) ? "low" : "high";
    Art.clearParams();
    Art.setScene("day", dayParams());
    UI.show("s-day");
    Snd.setAmbScene("day");
    Snd.setWeather(s.weather);
    Snd.music(["", "warm", "grey", "slate", "dusk", "storm"][s.chapter] || "warm");
    renderHotspots();
    updateHud();
    morningBeat(s.chapter);
    Snd.gulls(s.weather === "clear" || s.weather === "mist");
  }

  function morningBeat(n) {
    const s = State.get();
    if (n === 2) {
      UI.toast("A wire has come up the cliff. The house, probably.", 4200);
    } else if (n === 3) {
      UI.toast("Rain again, and mail under the door.", 4200);
    } else if (n === 4) {
      if (s.flags.fleet_warned) {
        State.addJournal("j_fleet");
        UI.openArtifact("doc_fleet", () => {
          if (s.flags.co_signed) { State.addJournal("j_tables"); State.giveItem("tables"); UI.openArtifact("doc_tables"); }
        });
      } else {
        UI.toast("The fleet never answered.", 4200);
      }
    } else if (n === 5) {
      Snd.play("thunder");
      UI.toast("The storm arrives before its hour.", 4200);
    }
  }

  /* ---------------- hotspots ---------------- */
  function availableActions(locId) {
    const s = State.get();
    const list = (CD.ACTIONS[locId] || []).filter((a) => {
      if (a.cond && !a.cond(s)) return false;
      if (!a.rep && s.flags["act_" + a.id]) return false;
      return true;
    });
    return list;
  }

  function renderHotspots() {
    const box = $("hotspots");
    box.innerHTML = "";
    const s = State.get();
    for (const locId in CW.L) {
      const acts = availableActions(locId);
      const visited = visitedToday(locId);
      // hide exhausted places (no actions and already seen), except the tower
      // and the house, which are always worth the walk
      if (!acts.length && s.flags["seen_" + locId] && locId !== "house" && locId !== "tower") continue;
      const lm = Art.LANDMARKS[CW.L[locId].pos] || { x: 0.5, y: 0.5 };
      const b = UI.el("button", "hotspot" + (acts.length ? " is-novel" : visited ? " is-done" : " is-novel"));
      b.style.left = (lm.x * 100).toFixed(1) + "%";
      b.style.top = (lm.y * 100).toFixed(1) + "%";
      b.setAttribute("aria-label", CW.L[locId].name + (acts.length ? " — something to do" : ""));
      b.innerHTML = '<span class="hs-ring">' + UI.icon(CW.L[locId].icon, 26) + "</span>" +
        '<span class="hs-label">' + CW.L[locId].name + "</span>";
      b.addEventListener("click", () => enterLocation(locId));
      box.appendChild(b);
    }
  }

  function visitedToday(locId) {
    const s = State.get();
    return s.visited.indexOf(locId) !== -1;
  }

  function enterLocation(locId) {
    const s = State.get();
    const loc = CW.L[locId];
    if (!loc) return;
    Snd.ensure();
    Snd.play("click");
    const acts = availableActions(locId);
    if (!visitedToday(locId)) {
      s.visited.push(locId);
      s.flags["seen_" + locId] = true;
      if (s.hours > 0) { s.hours = Math.max(0, s.hours - 1); }
    }
    updateHud();
    // location menu
    const opts = acts.map((a) => ({
      t: a.label,
      note: a.note + (a.cost > 0 && !visitedToday(locId) ? "" : ""),
      onPick: () => runAction(locId, a),
    }));
    opts.push({ t: "(Leave)", onPick: () => { UI.closeEvent(); } });
    const cfg = UI.showEvent({ head: loc.name.toUpperCase(), text: loc.desc, opts: opts });
    cfg._isLocation = true;
  }

  function runAction(locId, a) {
    const s = State.get();
    if (a.cost > 0 && s.hours <= 0) {
      UI.toast("The day is spent — only the lamp room will take you now.");
      return;
    }
    UI.closeEvent();
    if (a.cost > 0) s.hours = Math.max(0, s.hours - 1);
    if (!a.rep) s.flags["act_" + a.id] = true;
    updateHud();
    UI.startDialogue(a.scene, () => {
      renderHotspots();
      updateHud();
      // offer to stay at the location if more can be done here
      const more = availableActions(locId);
      if (more.length) enterLocation(locId);
    }, CW.L[locId].name);
  }

  /* ---------------- HUD ---------------- */
  function slotOf(s) {
    const spent = 6 - s.hours;
    return spent <= 0 ? 0 : spent <= 2 ? 1 : spent <= 4 ? 2 : 3;
  }
  function updateHud() {
    const s = State.get();
    if (!s) return;
    const ch = CW.CHAPTERS[s.chapter];
    const slot = slotOf(s);
    $("hud-chapter").textContent = s.chapter >= 1 && ch ? "CHAPTER " + ["", "ONE", "TWO", "THREE", "FOUR", "FIVE"][s.chapter] + " — " + ch.title : "THE CROSSING";
    $("hud-day").textContent = ch ? ch.day.toLowerCase() + ", " + ch.date : "the arrival";
    $("hud-slot").textContent = ["Morning", "Forenoon", "Afternoon", "Evening"][slot] || "—";
    $("hud-weather").textContent = s.weather;
    $("hud-hours").textContent = s.hours === 0 ? "the day is spent" : s.hours + " hour" + (s.hours === 1 ? "" : "s") + " of light";
    // first undone order as the objective line
    let obj = "Keep the light. Everything else is commentary.";
    if (ch) {
      const todo = ch.orders.find((o) => !o.done(s));
      obj = todo ? todo.text + " — " + todo.note : "The day's orders are done. The light wants lighting.";
    }
    $("day-objective").textContent = obj;
    $("btn-lamp").classList.toggle("lamp-urgent", s.hours === 0);
    // keep the painted island in step with the state (tide, boat, weather)
    if (scene === "day") {
      s.tide = CW.tideLow(s.chapter, slot) ? "low" : "high";
      Art.setParams(dayParams());
    }
  }

  /* ============================================================
     NIGHTS
     ============================================================ */
  function nightDef(n) {
    return n === 0 ? CN.prologueNight : n === 5 ? CN.night5 : CN.nights[n];
  }

  function beginNight(n) {
    const s = State.get();
    const def = nightDef(n);
    scene = "night";
    night = {
      n: n, def: def, t: 0, blocked: false,
      oil: n === 0 ? 45 : s.lampOil, wick: n === 0 ? 62 : 100, lens: n === 0 ? 72 : (s.repairs.lens >= 2 ? 100 : 92),
      brightness: "full",
      evIdx: 0, eventOpen: false, goalEvent: null,
      ships: [], swell: def.swell || 0.2,
      good: 0, all: 0, gutter: 0, scoreEvents: 0,
      busy: {}, finished: false, selWatched: false,
    };
    app().dataset.ch = String(n);
    Art.clearParams();
    Art.setScene("night", {});
    UI.show("s-night");
    Snd.setAmbScene("night");
    Snd.setWeather(def.weather);
    Snd.music(["", "warm", "grey", "slate", "dusk", "storm"][n] || "storm");
    Snd.setHum(def.swell ? def.swell * 0.5 : 0.1);
    if (State.hasItem("watch")) Snd.startWatch();
    $("na-bell").hidden = s.repairs.bell < 1;
    $("night-label").textContent = def.label || "THE NIGHT WATCH";
    $("night-day").textContent = n === 0 ? "the teaching night" : (CW.CHAPTERS[n] ? CW.CHAPTERS[n].day.toLowerCase() : "");
    $("night-feed").innerHTML = "";
    feed("<strong>" + (def.label || "The watch") + "</strong> — the light is yours.");
    syncDial();
    updateNightHud();
    // intro card
    night.blocked = true;
    UI.showEvent({
      head: def.label || "THE NIGHT WATCH",
      text: def.intro || "Dusk. The lamp room. The water.",
      opts: [{ t: "Take up the watch", onPick: () => { night.blocked = false; UI.closeEvent(); } }],
    });
  }

  function syncDial() {
    document.querySelectorAll(".dial-opt").forEach((b) => b.classList.toggle("is-on", b.dataset.b === night.brightness));
  }

  function bindNight() {
    bindCard();
    document.querySelectorAll(".dial-opt").forEach((b) => {
      b.addEventListener("click", () => {
        if (!night || night.finished) return;
        night.brightness = b.dataset.b;
        Snd.play("click");
        syncDial();
        feed("Beam taken to <strong>" + b.dataset.b + "</strong>.");
      });
    });
    $("na-pump").addEventListener("click", () => nightAction("pump"));
    $("na-trim").addEventListener("click", () => nightAction("trim"));
    $("na-true").addEventListener("click", () => nightAction("true"));
    $("na-bell").addEventListener("click", () => nightAction("bell"));
    $("na-look").addEventListener("click", () => nightAction("look"));
  }

  function nightAction(kind) {
    if (!night || night.finished) return;
    const now = performance.now();
    const busyMs = kind === "pump" ? 900 : kind === "trim" ? 700 : 500;
    if (night.busy[kind] && now < night.busy[kind]) return;
    night.busy[kind] = now + busyMs;
    const s = State.get();
    if (kind === "pump") {
      if (s.oilStore <= 0) { UI.toast("The store is dry — this is all the oil there is."); return; }
      night.oil = Math.min(100, night.oil + 30);
      s.oilStore -= 1;
      Snd.play("pump");
      feed("Pumped a barrel's worth. <strong>" + s.oilStore + "</strong> left in store.");
    } else if (kind === "trim") {
      night.wick = Math.min(100, night.wick + 28);
      Snd.play("trim");
      feed("Trimmed the wick. Little and often.");
    } else if (kind === "true") {
      night.lens = Math.min(100, night.lens + 32);
      Snd.play("select");
      feed("Trued the lens. The beam levels out.");
    } else if (kind === "bell") {
      Snd.play("bell", { times: 1 });
      const foggy = night.def.weather === "fog" || s.weather === "fog" || s.weather === "mist";
      if (foggy) { night.scoreEvents += 2; feed("The bell speaks into the fog. <em>Here.</em>"); }
      else feed("The bell rings, and the night takes it, and gives nothing back. No fog tonight to answer.");
    } else if (kind === "look") {
      const glass = State.hasItem("glass") || s.repairs.lens >= 2;
      const ships = night.ships.filter((sh) => !sh.gone);
      let line = "";
      if (night.swell > 0.55) line = "The water stands wrong at the edges, and under it the green light is " + (night.swell > 0.75 ? "close enough to read the tower's shadow by" : "circling, slow, below the bar") + ".";
      else if (ships.length) line = ships.length === 1 ? "One light out there, working the ebb." : ships.length + " lights out there, working the dark.";
      else line = "Nothing moving. The sea is keeping its own counsel.";
      if (glass) line += " The glass makes it certain: " + (ships.length ? "hulls, standing off the bar." : "empty water to the Reach.");
      feed(line);
      if (State.hasItem("watch")) feed("The watch ticks " + (night.swell > 0.6 ? "fast — hurrying — like something keeping time with its own drowning." : "steady."));
    }
    updateNightHud();
  }

  function feed(html, cls) {
    const box = $("night-feed");
    const d = UI.el("div", "feed-item" + (cls ? " " + cls : ""), html);
    box.appendChild(d);
    while (box.children.length > 14) box.removeChild(box.firstChild);
    box.scrollTop = box.scrollHeight;
  }

  function pushNightParams() {
    const s = State.get();
    const shake = night.def.weather === "storm" ? 0.05 + 0.05 * Math.sin(night.t * 0.9) : 0;
    Art.setParams({
      brightness: night.brightness, oil: night.oil, wick: night.wick, lens: night.lens,
      swell: night.swell, ships: night.ships, weather: night.def.weather,
      shake: shake, chapter: night.n,
    });
    if (Math.random() < 0.02) Snd.setHum(Math.min(1, night.swell));
  }

  function nightTick(dt) {
    const def = night.def;
    if (climaxPhase) return;
    const paused = night.eventOpen && !night.goalEvent;
    if (!paused) {
      night.t += dt;
      const mult = night.brightness === "beacon" ? 1.8 : night.brightness === "low" ? 0.55 : 1;
      const lensEase = State.get().repairs.lens >= 1 ? 0.62 : 1;
      night.oil = Math.max(0, night.oil - def.decay.oil * mult * dt);
      night.wick = Math.max(0, night.wick - def.decay.wick * dt);
      night.lens = Math.max(0, night.lens - def.decay.lens * mult * lensEase * dt);
      if (night.oil <= 0 || night.wick <= 0) {
        night.gutter += dt;
        if (!night._gutterWarned) { night._gutterWarned = true; Snd.play("creak"); feed("The lamp <strong>gutters</strong> — oil or wick, now!", "is-danger"); }
      } else night._gutterWarned = false;
      night.all += dt;
      if (night.oil > 10 && night.wick > 20 && night.lens > 40 && night.brightness === "full") night.good += dt;
      // swell rises through the night
      const target = (def.swell || 0.2) + (night.t / def.dur) * 0.3;
      night.swell = Math.min(1, night.swell + (target - night.swell) * dt * 0.4);
      // ships move
      for (const sh of night.ships) {
        sh.x += sh.dir * sh.speed * dt;
        if (sh.x < -0.05 || sh.x > 1.05) sh.gone = true;
      }
    }
    updateNightHud();
    // events
    if (night.goalEvent) {
      const g = night.goalEvent;
      if (g.goal(night, night)) {
        night.goalEvent = null;
        night.eventOpen = false;
        Snd.play("chime");
        UI.eventReply(g.head, g.doneText, () => {
          document.getElementById("ov-event").classList.remove("is-passive");
          night.evIdx += 1;
          night.eventOpen = false;
        });
        night.eventOpen = true;
      }
      return;
    }
    if (night.eventOpen) return;
    const evs = def.events || [];
    if (night.evIdx < evs.length) {
      const ev = evs[night.evIdx];
      if (ev.cond && !ev.cond(State.get())) { night.evIdx += 1; return; }
      if (night.t >= ev.at) triggerEvent(ev);
    } else {
      endNight();
    }
  }

  function triggerEvent(ev) {
    const s = State.get();
    night.eventOpen = true;
    if (ev.weather) { night.def.weather = ev.weather; Snd.setWeather(ev.weather); }
    if (ev.swell !== undefined) night.swell = Math.max(night.swell, ev.swell);
    if (ev.ship) night.ships.push(Object.assign({ row: 1 }, ev.ship));
    if (ev.kind === "goal") {
      night.goalEvent = ev;
      UI.showEvent({ head: ev.head, text: ev.text, opts: [] });
      document.getElementById("ov-event").classList.add("is-passive");
      return;
    }
    const opts = (ev.opts || []).map((o) => ({
      t: o.t,
      note: typeof o.note === "function" ? o.note(s) : o.note,
      onPick: () => {
        applyFx(o.fx || {});
        if (o.fx && o.fx.oil) night.oil = Math.max(0, Math.min(100, night.oil + o.fx.oil));
        if (o.score) night.scoreEvents += o.score;
        if (o.obs) State.addObserved(o.obs);
        const reply = typeof o.reply === "function" ? o.reply(s) : o.reply;
        Snd.play("select");
        UI.eventReply("THE LOGBOOK", reply || "Entered.", () => {
          document.getElementById("ov-event").classList.remove("is-passive");
          night.evIdx += 1;
          night.eventOpen = false;
          feed("<strong>" + ev.head.toLowerCase() + "</strong> — noted.");
          updateNightHud();
        });
      },
    }));
    UI.showEvent({ head: ev.head, text: typeof ev.text === "function" ? ev.text(s) : ev.text, opts: opts });
  }

  function updateNightHud() {
    if (!night) return;
    const set = (g, v) => {
      const box = document.querySelector('.gauge[data-g="' + g + '"]');
      if (!box) return;
      box.querySelector(".gauge-fill").style.width = Math.max(0, Math.min(100, v)) + "%";
      box.querySelector(".gauge-val").textContent = String(Math.round(v));
      box.classList.toggle("is-low", v < 25);
    };
    set("oil", night.oil); set("wick", night.wick); set("lens", night.lens);
    const s = State.get();
    $("store-count").textContent = String(s.oilStore);
    $("reserve-note").textContent = s.oilStore === 0 ? "none — the lamp is all" : s.oilStore === 1 ? "one barrel" : s.oilStore + " barrels";
    // clock
    const f = Math.min(1, night.t / night.def.dur);
    const labels = ["dusk", "evening", "the middle watch", "the small hours", "the wolf hour", "grey light"];
    $("night-clock").textContent = labels[Math.min(labels.length - 1, Math.floor(f * labels.length))];
    // busy buttons
    const now = performance.now();
    [["na-pump", "pump"], ["na-trim", "trim"], ["na-true", "true"]].forEach(([id, k]) => {
      $(id).disabled = !!(night.busy[k] && now < night.busy[k]);
    });
  }

  function endNight() {
    if (night.finished) return;
    night.finished = true;
    const s = State.get();
    const n = night.n;
    // score
    const stab = night.all > 0 ? night.good / night.all : 1;
    let score = Math.round(28 + stab * 42 + night.scoreEvents - Math.min(15, night.gutter * 4));
    if (n === 0) score = Math.max(60, score);
    score = Math.max(5, Math.min(100, score));
    const logLines = (CN.logs[n] ? CN.logs[n](s) : []).filter(Boolean);
    State.nightRecord(n, score, logLines);
    State.addObserved("night_" + n);
    if (n === 0) s.lampOil = Math.max(s.lampOil, 60);
    s.lampOil = Math.round(Math.max(30, Math.min(100, night.oil)));
    Snd.stopWatch();
    night = null;
    try { State.saveSlot(0); } catch (e) {}
    if (n === 5) { climaxPhase = "intro"; runClimax(); return; }
    // dawn
    UI.fadeThrough(() => {
      scene = "day";
      Art.clearParams();
      Art.setScene("day", dayParams());
      Snd.setAmbScene("day");
      Snd.setWeather(s.weather);
      Snd.setHum(0);
      Snd.music(["", "warm", "grey", "slate", "dusk", "storm"][n] || "warm");
      UI.playSequence(
        [{ text: "Dawn. " + CN.scoreNote(score) }, { text: logLines.join("\n\n") }],
        { onDone: () => startChapter(n + 1), cue: "click for the dawn" }
      );
    });
  }

  /* ============================================================
     THE LAST NIGHT — the rite and the choice
     ============================================================ */
  function runClimax() {
    climaxPhase = "ritual";
    rhythm = { round: 0, phase: "idle", hits: 0, total: 0, results: [] };
    UI.fadeThrough(() => {
      // keep the night scene visible; freeze gauges
      UI.showEvent({
        head: "THE WATER ASKS",
        text: "At the wolf hour the storm leans back to listen, and the hum comes up through the glass — five notes, down and up. It has been asking all week.\n\nTonight it will ask YOU.",
        opts: [{ t: "Answer it", onPick: () => { UI.closeEvent(); startRitualRound(0); } }],
      });
    });
  }

  function startRitualRound(ri) {
    const r = CN.rhythm.rounds[ri];
    const s = State.get();
    const ease = s.flags.hum_learned ? 0.8 : 1;
    rhythm.round = ri;
    rhythm.phase = "listen";
    rhythm.beats = r.beats.map((b) => b * ease * (1 + (1 - r.tempo) * 0.5));
    rhythm.noteIdx = 0;
    rhythm.hits = 0; rhythm.total = rhythm.beats.length;
    rhythm.t = 0;
    rhythm.hitWindow = 150 * ease + 40;
    rhythm.markers = [];
    // build the ritual UI
    const box = $("ritual-track");
    box.innerHTML = '<div class="ritual-strike"></div>';
    rhythm.markers = rhythm.beats.map((b, i) => {
      const d = UI.el("div", "ritual-note" + (i % 2 ? " is-sea" : ""));
      box.appendChild(d);
      return { el: d, beat: b, i: i, state: 0 };
    });
    $("night-ritual").hidden = false;
    $("ritual-title").textContent = CN.rhythm.title + " — ROUND " + (ri + 1) + " OF " + CN.rhythm.rounds.length;
    $("ritual-hint").textContent = r.listenText;
    Snd.play("sea-note");
  }

  function rhythmTick(dt) {
    if (!rhythm || rhythm.phase === "done") return;
    rhythm.t += dt * 1000;
    const track = $("ritual-track");
    const w = track.clientWidth || 600;
    const strikeX = w * 0.18;
    if (rhythm.phase === "listen") {
      // play the sea's asking; markers drift toward the strike line slowly
      let acc = 0;
      for (let i = 0; i < rhythm.beats.length; i++) {
        const start = acc;
        acc += rhythm.beats[i];
        if (!rhythm.markers[i].played && rhythm.t >= start) {
          rhythm.markers[i].played = true;
          Snd.note("sea");
        }
      }
      if (rhythm.t >= acc + 700) {
        rhythm.phase = "answer";
        rhythm.t = 0;
        rhythm.answerAcc = rhythm.beats.slice(); // copy
        $("ritual-hint").textContent = CN.rhythm.rounds[rhythm.round].answerHint;
        Snd.play("keeper-note");
      }
      // markers idle-drift
      rhythm.markers.forEach((m, i) => {
        const x = strikeX + 60 + i * 28;
        m.el.style.left = x + "px";
        m.el.style.top = "50%";
        m.el.classList.remove("is-miss", "is-hit");
      });
      return;
    }
    // answer phase
    let acc = 0;
    let allDone = true;
    for (let i = 0; i < rhythm.beats.length; i++) {
      const tI = acc; acc += rhythm.beats[i];
      const m = rhythm.markers[i];
      const dtms = tI - rhythm.t;
      const px = Math.max(-40, Math.min(w, strikeX + (dtms / 900) * (w - strikeX)));
      m.el.style.left = px + "px";
      m.el.style.top = "50%";
      if (m.state === 0) {
        allDone = false;
        if (dtms < -rhythm.hitWindow) { m.state = -1; m.el.classList.add("is-miss"); Snd.play("splash"); }
      }
    }
    if (allDone || rhythm.t > acc + 800) finishRitualRound();
  }

  function rhythmTap() {
    if (!rhythm || rhythm.phase !== "answer") return false;
    const track = $("ritual-track");
    const w = track.clientWidth || 600;
    const strikeX = w * 0.18;
    let best = null; let bestD = 1e9;
    let acc = 0;
    for (let i = 0; i < rhythm.beats.length; i++) {
      const tI = acc; acc += rhythm.beats[i];
      const m = rhythm.markers[i];
      if (m.state !== 0) continue;
      const d = Math.abs(tI - rhythm.t);
      if (d < bestD) { bestD = d; best = m; }
    }
    if (best && bestD <= rhythm.hitWindow) {
      best.state = 1; best.el.classList.add("is-hit");
      rhythm.hits += 1;
      Snd.note("keeper");
      if (State.get().flags.sel_rhythm) { window.setTimeout(() => Snd.note("sea"), 120); }
      return true;
    }
    return false;
  }

  function finishRitualRound() {
    if (rhythm.phase === "done") return;
    rhythm.phase = "done";
    const ri = rhythm.round;
    const hits = rhythm.hits, total = rhythm.total;
    rhythm.results.push(hits / total);
    $("night-ritual").hidden = true;
    const acc = total ? hits / total : 0;
    const text = acc >= 0.7 ? CN.rhythm.passText(hits, total) : acc >= 0.45 ? CN.rhythm.weakText(hits, total) : CN.rhythm.missText(hits, total);
    const isLast = ri >= CN.rhythm.rounds.length - 1;
    UI.openOverlay("ov-event"); // the rite panel closed the card; bring it back for the verdict
    UI.eventReply("THE ANSWER", text, () => {
      document.getElementById("ov-event").classList.remove("is-passive");
      if (isLast) { climaxPhase = "choice"; showClimaxChoice(); }
      else startRitualRound(ri + 1);
    });
  }

  function showClimaxChoice() {
    const s = State.get();
    const choices = CN.climaxChoices(s, night ? { score: 60 } : {});
    const opts = choices.map((c) => ({
      t: c.title,
      note: c.desc + " — " + c.risk,
      onPick: () => {
        UI.closeEvent();
        if (night) night.eventOpen = false;
        resolveClimax(c.id);
      },
    }));
    UI.showEvent({
      head: "WHAT IS THE LIGHT FOR?",
      text: "The water stands off the point, asking. The fleet is out there. The Tern is out there. Tam's flame burns across the strait. Ninety-three steps below, a girl holds a silver watch against her collar.\n\nThe oldest question on this coast, and tonight it has your name on it.",
      opts: opts,
    });
  }

  function resolveClimax(id) {
    const s = State.get();
    // the rite matters: how well the keeper answered the water grades the road out
    const riteAcc = (rhythm && rhythm.results && rhythm.results.length)
      ? rhythm.results.reduce((a, b) => a + b, 0) / rhythm.results.length
      : (s.flags.hum_learned ? 0.6 : 0.3);
    let ending = "steady_ok";
    if (id === "steady") ending = s.repairs.tower >= 1 ? "steady_ok" : "steady_hurt";
    else if (id === "dark") ending = "dark_ok";
    else if (id === "led") {
      const selSing = s.selStays && s.flags.sel_rhythm && s.flags.hum_learned;
      const boHere = !s.flags.bo_gone && s.flags.bo_settled && s.trust.bo >= 1;
      const company = selSing || (boHere && s.flags.hum_learned);
      if (company && riteAcc >= 0.4) ending = "led_home";
      else if (s.flags.hum_learned || company) ending = "led_drift";
      else ending = "led_lost";
    }
    const stab = night && night.all ? night.good / night.all : 1;
    const score = Math.round(28 + stab * 42 + (night ? night.scoreEvents : 0));
    State.nightRecord(5, score, ["FRIDAY — the last night. The water rose and was answered. The answer was " + CN.endings[ending].title.toLowerCase() + ", and it was mine."]);
    s.lampOil = 100;
    Snd.stopWatch();
    night = null; rhythm = null; climaxPhase = null;
    try { State.saveSlot(0); } catch (e) {}
    playEnding(ending, false);
  }

  /* ============================================================
     ENDINGS & CREDITS
     ============================================================ */
  function playEnding(id, fromSave) {
    const s = State.get();
    s.ending = id; s.chapter = 6;
    const end = CN.endings[id];
    try { State.saveSlot(0); } catch (e) {}
    UI.fadeThrough(() => {
      scene = "ending";
      app().dataset.ch = "6";
      Art.clearParams();
      Art.setScene("sea", { variant: end.tone === "hope" ? "two" : end.tone === "storm" ? "skiff" : "dawn" });
      Snd.setAmbScene("ending");
      Snd.setWeather("clear");
      Snd.music(end.tone === "hope" ? "hope" : end.tone === "storm" ? "storm" : "slate");
      Snd.setHum(0);
      const beats = end.beats(s).filter(Boolean);
      UI.playSequence(beats.concat([{ text: "THE LONG LIGHT", paper: false }]), {
        onDone: () => showCredits(),
        cue: "click, space or enter",
      });
    });
  }

  function showCredits() {
    scene = "credits";
    UI.fadeThrough(() => {
      const box = $("credits-scroll");
      box.innerHTML = "";
      box.scrollTop = 0;
      CN.credits.forEach((b) => {
        const div = UI.el("div", "cr-block");
        div.innerHTML = '<p class="cr-role">' + b.role + "</p>" + b.names.map((n) => '<p class="cr-name">' + n + "</p>").join("");
        box.appendChild(div);
      });
      UI.show("s-credits");
      Snd.music("hope");
    });
  }

  /* ============================================================
     MENUS / GLOBAL KEYS
     ============================================================ */
  function bindHud() {
    $("btn-journal").addEventListener("click", () => { Snd.play("click"); UI.openJournal(); });
    $("btn-journal-n").addEventListener("click", () => { Snd.play("click"); UI.openJournal(); });
    $("btn-bag").addEventListener("click", () => { Snd.play("click"); UI.openBag(); });
    $("btn-orders").addEventListener("click", () => { Snd.play("click"); UI.openOrders(); });
    $("btn-menu").addEventListener("click", () => { Snd.play("click"); UI.openOverlay("ov-menu"); });
    $("btn-menu-n").addEventListener("click", () => { Snd.play("click"); UI.openOverlay("ov-menu"); });
    $("btn-lamp").addEventListener("click", () => {
      const s = State.get();
      if (s.hours === 0 || s.slot === 3) { beginNight(s.chapter === 0 ? 0 : s.chapter); return; }
      UI.confirmBox("Climb to the light before the evening's work is done? The rest of the day is lost.", () => beginNight(s.chapter === 0 ? 0 : s.chapter));
    });
    $("m-resume").addEventListener("click", () => UI.closeOverlay("ov-menu"));
    $("m-save").addEventListener("click", () => UI.openSaves("save"));
    $("m-load").addEventListener("click", () => UI.openSaves("load"));
    $("m-settings").addEventListener("click", () => UI.openSettings());
    $("m-help").addEventListener("click", () => UI.openOverlay("ov-help"));
    $("m-quit").addEventListener("click", () => {
      UI.confirmBox("Lay down the light and return to the title? The autosave keeps your place.", () => {
        try { State.saveSlot(0); } catch (e) {}
        UI.closeOverlay("ov-menu");
        UI.fadeThrough(() => showTitle());
      });
    });
    $("credits-back").addEventListener("click", () => {
      UI.fadeThrough(() => showTitle());
    });
    $("seq-box").addEventListener("click", (e) => { if (e.target.id !== "seq-skip") UI.advanceSeq(); });
    $("seq-skip").addEventListener("click", (e) => { e.stopPropagation(); UI.skipSeq(); });
    $("dlg-text").addEventListener("click", () => UI.advanceDialogue());
    $("evt-text").addEventListener("click", () => UI.eventTyping());
  }

  function bindKeys() {
    document.addEventListener("keydown", (e) => {
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      const top = UI.topOverlay();
      const key = e.key;
      if (key === "Escape") {
        if (top === "ov-confirm") { $("confirm-no").click(); return; }
        if (top && top !== "ov-name") { UI.closeOverlay(top); return; }
        if (scene === "day" || scene === "night") { UI.openOverlay("ov-menu"); return; }
        return;
      }
      if (UI.seqActive()) {
        if (key === "Enter" || key === " ") { e.preventDefault(); UI.advanceSeq(); }
        return;
      }
      if (top === "ov-dialogue") {
        if (key === "Enter" || key === " ") { e.preventDefault(); UI.advanceDialogue(); return; }
        const n = parseInt(key, 10);
        if (n >= 1 && n <= 4) { UI.pickOption(n); return; }
        return;
      }
      if (top === "ov-event") {
        const cfg = window._evt;
        if (key === "Enter" || key === " ") { e.preventDefault(); UI.eventTyping(); return; }
        const hasBtns = !!(cfg && cfg._btns && cfg._btns.length);
        const n = parseInt(key, 10);
        if (hasBtns && n >= 1 && n <= 6) { UI.eventPick(n); return; }
        if (key === " " && rhythm && rhythm.phase === "answer") { e.preventDefault(); rhythmTap(); return; }
        // passive (goal) cards leave the apparatus keyboard-reachable
        if (!hasBtns && scene === "night" && !rhythm) {
          const map = { "1": "na-pump", "2": "na-trim", "3": "na-true", "4": "na-bell", "5": "na-look" };
          if (map[key] && !$(map[key]).hidden) { $(map[key]).click(); return; }
        }
        return;
      }
      if (scene === "night" && rhythm && (key === " " || key === "Enter")) { e.preventDefault(); rhythmTap(); return; }
      // night actions 1-5
      if (scene === "night" && !top && !rhythm) {
        const map = { "1": "na-pump", "2": "na-trim", "3": "na-true", "4": "na-bell", "5": "na-look" };
        if (map[key] && !$(map[key]).hidden) { $(map[key]).click(); return; }
      }
      // panels
      if (!top && (scene === "day" || scene === "night")) {
        const k = key.toLowerCase();
        if (k === "j") UI.openJournal();
        else if (k === "i") UI.openBag();
        else if (k === "q") UI.openOrders();
      }
    });
  }

  /* expose */
  document.addEventListener("DOMContentLoaded", boot);

  return {
    boot, applyFx, newGame, resumeFrom, beginPrologue, startChapter, startDay,
    beginNight, playEnding, showCredits,
    reducedMotion,
    step: (dt) => frameStep(dt),   // deterministic single-frame step (tests / embedding)
    dbg: () => ({
      scene: scene, climaxPhase: climaxPhase,
      night: night ? { t: Math.round(night.t), blocked: night.blocked, eventOpen: night.eventOpen, evIdx: night.evIdx, oil: Math.round(night.oil), wick: Math.round(night.wick), lens: Math.round(night.lens), dur: night.def.dur } : null,
      rhythm: rhythm ? { phase: rhythm.phase, round: rhythm.round, t: Math.round(rhythm.t), beats: rhythm.beats ? rhythm.beats.length : 0, results: rhythm.results.slice() } : null,
      topOverlay: UI.topOverlay(),
    }),
  };
})();
