"use client";
import { challengeLabel, dateLabel, modelName, type Run } from "@/lib/bench";
import { Icon, categoryIcon } from "./icons";
import { useLab } from "./lab-provider";

export function CoverImage({ run, eager = false, large = false }: { run: Run; eager?: boolean; large?: boolean }) {
  return <img src={`/art/${run.art}${large ? "" : "-sm"}.webp`} srcSet={`/art/${run.art}-sm.webp 480w, /art/${run.art}.webp 900w`} sizes={large ? "(max-width: 720px) 94vw, 830px" : "(max-width: 600px) 92vw, (max-width: 900px) 45vw, 31vw"} alt={`Editorial cover artwork for ${run.title}`} width="900" height="506" loading={eager ? "eager" : "lazy"} decoding="async"/>;
}
export function RunCard({ run, index }: { run: Run; index: number }) {
  const { openRun, toggleSave, toggleCompare, preferences, selected, pending } = useLab();
  const saved = !!preferences[run.slug]?.saved; const compared = selected.includes(run.slug);
  return <article className={`run-card ${compared ? "is-compared" : ""}`}>
    <div className={`cover-wrap art-${run.art}`}><button className="cover-button" onClick={() => openRun(run)} aria-label={`Inspect ${run.title}`}><CoverImage run={run} eager={index < 3}/><div className="cover-shade"/><span className="category-badge"><Icon name={categoryIcon(run.category)} size={12}/>{challengeLabel(run.category)}</span><span className="cover-id">MB—{run.number}</span></button>
      <button className={`save-button ${saved ? "is-saved" : ""}`} aria-label={`${saved ? "Unsave" : "Save"} ${run.title}`} aria-pressed={saved} title={saved ? "Remove from saved runs" : "Save run"} disabled={pending.has(run.slug)} onClick={() => toggleSave(run.slug)}><Icon name="bookmark" size={15} filled={saved}/></button>
    </div>
    <div className="card-info"><button className="card-heading" onClick={() => openRun(run)}><h3>{run.title}</h3><Icon name="upRight" size={19}/></button><p className="card-description">{run.description}</p><div className="card-meta"><span className="model-name"><Icon name="chip" size={13}/>{modelName(run.model)}</span><span className="meta-dot">·</span><time dateTime={run.date}>{dateLabel(run.date)}</time><button className={`mini-compare ${compared ? "chosen" : ""}`} onClick={() => toggleCompare(run.slug)} aria-pressed={compared} aria-label={`${compared ? "Remove" : "Add"} ${run.title} ${compared ? "from" : "to"} comparison`} title={compared ? "Remove from comparison" : "Add to comparison"}><Icon name={compared ? "check" : "compare"} size={14}/></button></div></div>
  </article>;
}
