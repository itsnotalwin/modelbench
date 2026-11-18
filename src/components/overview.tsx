import { AXES, challenges, models, runs } from "@/lib/bench";
import { Icon } from "./icons";

export function Overview() {
  const stats = [{ value: runs.length, label: "Model runs", icon: "stack" }, { value: models.length, label: "AI models", icon: "chip" }, { value: challenges.length, label: "Challenges", icon: "layers" }, { value: AXES.length.toString().padStart(2, "0"), label: "Scoring axes", icon: "sliders" }];
  return <section className="overview" aria-label="Benchmark overview">
    <div className="hero"><div className="hero-grid"/><img className="hero-art" src="/art/benchmark-core.webp" alt="Sculptural layers of lime glass and machined metal forming a floating compute core" width="1350" height="562" fetchPriority="high"/>
      <div className="hero-content"><div className="lab-label"><span className="status-light"/>OPEN BENCHMARK LAB</div><h1>One prompt.<br/><span>Endless possibilities.</span></h1><p>Explore, compare, and evaluate one-shot AI builds.<br className="desktop-break"/> Real challenges. Real outputs. One place.</p></div>
      <div className="figure-label"><span/> FIG. 01 <b>/</b> BENCHMARK CORE</div><span className="hero-cross cross-1">+</span><span className="hero-cross cross-2">+</span>
    </div>
    <div className="stats-strip">{stats.map((stat) => <div className="stat" key={stat.label}><span className="stat-icon"><Icon name={stat.icon} size={23}/></span><div><strong>{stat.value}</strong><span>{stat.label}</span></div></div>)}</div>
  </section>;
}
