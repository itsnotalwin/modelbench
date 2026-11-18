"use client";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { average, challenges, modelName, models, runs } from "@/lib/bench";
import { Icon } from "./icons";
import { useLab } from "./lab-provider";
import { RunCard } from "./run-card";
import { EmptyState, SelectControl } from "./ui";

export default function Explorer() {
  const [query, setQuery] = useState(""); const q = useDeferredValue(query.trim().toLowerCase());
  const [challenge, setChallenge] = useState(""); const [model, setModel] = useState(""); const [sort, setSort] = useState("featured");
  const [savedOnly, setSavedOnly] = useState(false); const [view, setView] = useState("grid"); const [limit, setLimit] = useState(6);
  const input = useRef<HTMLInputElement>(null); const { preferences } = useLab();
  useEffect(() => {
    // Read browser-only preferences after hydration, off the render path.
    queueMicrotask(() => {
      const initial = new URLSearchParams(window.location.search).get("challenge");
      if (initial && challenges.some((c) => c.slug === initial)) setChallenge(initial);
      try { if (localStorage.getItem("modelbench.view") === "list") setView("list"); } catch { /* Optional preference. */ }
    });
    function onKey(e: KeyboardEvent) { const t = e.target as HTMLElement; if ((e.key === "/" || (e.key === "k" && (e.metaKey || e.ctrlKey))) && !["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) && !document.querySelector("dialog[open]")) { e.preventDefault(); input.current?.focus(); } }
    document.addEventListener("keydown", onKey); return () => document.removeEventListener("keydown", onKey);
  }, []);
  const filtered = useMemo(() => {
    const result = runs.filter((r) => (!savedOnly || preferences[r.slug]?.saved) && (!challenge || r.category === challenge) && (!model || r.model === model) && (!q || `${r.title} ${r.category} ${r.description} ${r.notes} ${modelName(r.model)} ${r.model}`.toLowerCase().includes(q)));
    if (sort === "newest") result.sort((a, b) => b.date.localeCompare(a.date));
    if (sort === "oldest") result.sort((a, b) => a.date.localeCompare(b.date));
    if (sort === "name") result.sort((a, b) => a.title.localeCompare(b.title));
    if (sort === "score") result.sort((a, b) => (average(preferences[b.slug]?.scores) ?? -1) - (average(preferences[a.slug]?.scores) ?? -1));
    return result;
  }, [q, challenge, model, sort, savedOnly, preferences]);
  function chooseView(value: string) { setView(value); try { localStorage.setItem("modelbench.view", value); } catch { /* Optional preference. */ } }
  const countSaved = Object.values(preferences).filter((p) => p.saved).length;
  function reset() { setQuery(""); setChallenge(""); setModel(""); setSavedOnly(false); setLimit(6); window.history.replaceState(null, "", "/#runs"); }
  return <section id="runs" className="explorer"><div className="section-heading"><div><div className="title-row"><h2>Run explorer</h2><span className="count-pill">{filtered.length} runs</span></div><p>A collection of real builds, straight from the models.</p></div><div className="explorer-actions"><button className={`saved-filter ${savedOnly ? "active" : ""}`} onClick={() => { setSavedOnly(!savedOnly); setLimit(6); }} aria-pressed={savedOnly}><Icon name="bookmark" size={15} filled={savedOnly}/>Saved{countSaved > 0 && <span>{countSaved}</span>}</button><div className="view-switch"><button aria-label="Grid view" title="Grid view" className={view === "grid" ? "active" : ""} onClick={() => chooseView("grid")} aria-pressed={view === "grid"}><Icon name="grid" size={16}/></button><button aria-label="List view" title="List view" className={view === "list" ? "active" : ""} onClick={() => chooseView("list")} aria-pressed={view === "list"}><Icon name="list" size={17}/></button></div></div></div>
    <div className="filter-bar"><div className="search-field"><Icon name="search" size={17}/><input ref={input} aria-label="Search runs" placeholder="Search runs, models, or keywords..." value={query} onChange={(e) => { setQuery(e.target.value); setLimit(6); }}/>{query ? <button aria-label="Clear search" onClick={() => setQuery("")}><Icon name="close" size={14}/></button> : <kbd>/</kbd>}</div>
      <SelectControl label="Filter by challenge" icon="layers" value={challenge} onChange={(v) => { setChallenge(v); setLimit(6); }} className="challenge-select"><option value="">All challenges</option>{challenges.map((c) => <option value={c.slug} key={c.slug}>{c.title}</option>)}</SelectControl>
      <SelectControl label="Filter by model" icon="chip" value={model} onChange={(v) => { setModel(v); setLimit(6); }} className="model-select"><option value="">All models</option>{models.map((m) => <option value={m} key={m}>{modelName(m)}</option>)}</SelectControl>
      <SelectControl label="Sort runs" icon="sort" value={sort} onChange={setSort} className="sort-select"><option value="featured">Featured</option><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name">Title A–Z</option><option value="score">Highest rated</option></SelectControl>
    </div>
    {(challenge || model || q || savedOnly) && <div className="filter-summary"><span>{filtered.length} matching {filtered.length === 1 ? "run" : "runs"}{savedOnly ? " in your saved collection" : ""}</span><button onClick={reset}>Clear filters <Icon name="close" size={12}/></button></div>}
    {filtered.length ? <><div className={`run-grid ${view === "list" ? "list-view" : ""}`}>{filtered.slice(0, limit).map((r, i) => <RunCard run={r} index={i} key={r.slug}/>)}</div><div className="load-more"><span>Showing {Math.min(filtered.length, limit)} of {filtered.length} runs</span>{limit < filtered.length && <button className="button" onClick={() => setLimit((n) => n + 6)}>Load more runs <Icon name="down" size={14}/></button>}</div></> : <EmptyState icon={savedOnly ? "bookmark" : "search"} title={savedOnly && !countSaved ? "Your saved collection starts here" : "No matching runs"} description={savedOnly && !countSaved ? "Bookmark a run to keep it in your personal collection." : "Try a different search or clear your filters to see every build."}><button className="button" onClick={reset}>Browse all runs <Icon name="arrow" size={15}/></button></EmptyState>}
  </section>;
}
