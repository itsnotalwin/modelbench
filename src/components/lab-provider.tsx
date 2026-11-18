"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { runBySlug, type Preferences, type Run, type Scores } from "@/lib/bench";
import { Icon } from "./icons";

export type RunTab = "overview" | "preview" | "rating";
type Overlay = { type: "run"; slug: string; tab: RunTab } | { type: "guide" } | null;
const RunDialog = dynamic(() => import("./run-dialog"));
const GuideDialog = dynamic(() => import("./guide-dialog"));
interface LabContextValue {
  preferences: Preferences; selected: string[]; pending: Set<string>; ready: boolean;
  openRun: (run: Run, tab?: RunTab) => void; openGuide: () => void;
  toggleSave: (slug: string) => Promise<void>; toggleCompare: (slug: string) => void;
  clearCompare: () => void; saveRating: (slug: string, scores: Scores) => Promise<boolean>;
  importRatings: (ratings: Record<string, Scores>) => Promise<boolean>; notify: (message: string, error?: boolean) => void;
}
const LabContext = createContext<LabContextValue | null>(null);
export function useLab() { const value = useContext(LabContext); if (!value) throw new Error("Workspace provider missing"); return value; }
// GitHub Pages has no API route, so the workspace lives in this browser instead.
const LOCAL_WORKSPACE = process.env.NEXT_PUBLIC_STATIC === "1";
const STORE_KEY = "modelbench.workspace.v1";
function readLocalWorkspace(): Preferences {
  try { const raw: unknown = JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Preferences) : {}; } catch { return {}; }
}
export function LabProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [toast, setToast] = useState<{message: string; error: boolean} | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locks = useRef(new Set<string>());
  const initRequest = useRef<Promise<void> | null>(null);
  const notify = useCallback((message: string, error = false) => { if (timer.current) clearTimeout(timer.current); setToast({ message, error }); timer.current = setTimeout(() => setToast(null), 3500); }, []);
  useEffect(() => {
    // Restore the comparison selection after hydration, off the render path.
    queueMicrotask(() => {
      try { const value: unknown = JSON.parse(localStorage.getItem("modelbench.compare.v1") || "[]"); if (Array.isArray(value)) setSelected([...new Set(value.filter((s): s is string => typeof s === "string" && runBySlug.has(s)))].slice(0, 3)); } catch { /* A private storage mode does not prevent comparison. */ }
    });
    if (LOCAL_WORKSPACE) {
      queueMicrotask(() => { setPreferences(readLocalWorkspace()); setReady(true); });
    } else if (!initRequest.current) initRequest.current = fetch("/api/workspace", { cache: "no-store" }).then(async (r) => { if (!r.ok) throw new Error(); const data = await r.json(); setPreferences(data.preferences); }).catch(() => notify("Workspace is unavailable. You can still explore all runs.", true)).finally(() => setReady(true));
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [notify]);
  // Static hosting keeps bookmarks and scores in this browser.
  useEffect(() => { if (!LOCAL_WORKSPACE || !ready) return; try { localStorage.setItem(STORE_KEY, JSON.stringify(preferences)); } catch { /* Private storage still allows exploring. */ } }, [preferences, ready]);
  async function persist(body: object, lock: string) {
    if (locks.current.has(lock)) return false;
    locks.current.add(lock); setPending(new Set(locks.current));
    try {
      if (LOCAL_WORKSPACE) return true;
      await initRequest.current;
      const r = await fetch("/api/workspace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) { const data = await r.json(); throw new Error(data.error || "Could not save changes."); }
      return true;
    } catch (error) { notify(error instanceof Error ? error.message : "Could not save changes.", true); return false; }
    finally { locks.current.delete(lock); setPending(new Set(locks.current)); }
  }
  async function toggleSave(slug: string) {
    if (!ready) { notify("Your workspace is loading. Please try again shortly."); return; }
    const saved = !preferences[slug]?.saved;
    if (await persist({ action: "bookmark", slug, saved }, slug)) {
      setPreferences((ex) => ({ ...ex, [slug]: { scores: ex[slug]?.scores ?? null, saved } }));
      notify(saved ? "Run added to your saved collection." : "Run removed from your saved collection.");
    }
  }
  function updateSelected(value: string[]) { setSelected(value); try { localStorage.setItem("modelbench.compare.v1", JSON.stringify(value)); } catch { /* In-memory selection remains available. */ } }
  function toggleCompare(slug: string) {
    const has = selected.includes(slug);
    if (!has && selected.length >= 3) { notify("Compare up to 3 runs. Remove a run to add another.", true); return; }
    updateSelected(has ? selected.filter((id) => id !== slug) : [...selected, slug]);
    notify(has ? "Run removed from comparison." : "Run added. Open Compare to inspect it side by side.");
  }
  async function saveRating(slug: string, scores: Scores) {
    if (!(await persist({ action: "rate", slug, scores }, slug))) return false;
    setPreferences((ex) => ({ ...ex, [slug]: { saved: ex[slug]?.saved ?? false, scores } })); notify("Scorecard saved to your workspace."); return true;
  }
  async function importRatings(ratings: Record<string, Scores>) {
    if (!(await persist({ action: "import", ratings }, "import"))) return false;
    setPreferences((prev) => { const next = { ...prev }; for (const [slug, scores] of Object.entries(ratings)) next[slug] = { saved: prev[slug]?.saved || false, scores }; return next; });
    notify(`Imported ${Object.keys(ratings).length} scorecard${Object.keys(ratings).length === 1 ? "" : "s"}.`); return true;
  }
  return <LabContext.Provider value={{ preferences, selected, pending, ready, toggleSave, toggleCompare, saveRating, importRatings, notify, openRun: (run, tab = "overview") => setOverlay({ type: "run", slug: run.slug, tab }), openGuide: () => setOverlay({ type: "guide" }), clearCompare: () => updateSelected([]) }}>
    {children}
    {overlay?.type === "run" && <RunDialog key={overlay.slug} run={runBySlug.get(overlay.slug)!} initialTab={overlay.tab} onClose={() => setOverlay(null)} />}
    {overlay?.type === "guide" && <GuideDialog onClose={() => setOverlay(null)} />}
    <div className="toast-zone" aria-live="polite" aria-atomic="true">{toast && <div className={`toast ${toast.error ? "is-error" : ""}`}><Icon name={toast.error ? "info" : "check"} size={16}/>{toast.message}<button aria-label="Dismiss notification" onClick={() => setToast(null)}><Icon name="close" size={14}/></button></div>}</div>
  </LabContext.Provider>;
}
