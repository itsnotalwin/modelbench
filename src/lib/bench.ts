import catalog from "@/data/catalog.json";

export const AXES = ["completeness", "robustness", "craft", "depth", "originality", "performance"] as const;
export type Axis = (typeof AXES)[number];
export type Scores = Partial<Record<Axis, number | null>>;
export type Run = (typeof catalog.runs)[number];
export type Challenge = (typeof catalog.challenges)[number];
export type Preference = { saved: boolean; scores: Scores | null };
export type Preferences = Record<string, Preference>;
export const runs = catalog.runs;
export const challenges = catalog.challenges;
export const runBySlug = new Map(runs.map((run) => [run.slug, run]));
export const challengeBySlug = new Map(challenges.map((challenge) => [challenge.slug, challenge]));
export const models = [...new Set(runs.map((r) => r.model))].sort();
export const REPO_URL = "https://github.com/itsnotalwin/modelbench";
export const artifactUrl = (run: Run) => `https://itsnotalwin.github.io/modelbench/${run.path}`;
export const axisDescription: Record<Axis, string> = {
  completeness: "How much of the brief is fully delivered?",
  robustness: "Does it hold up across inputs and edge cases?",
  craft: "How polished is the design and interaction?",
  depth: "How substantial are the underlying systems?",
  originality: "Does the build bring a distinctive idea?",
  performance: "How fast and responsive does it feel?",
};
const names: Record<string, string> = {
  "beam-free": "Beam", "gpt-6": "GPT-6", "ernie-5.5-flash-preview-free": "ERNIE 5.5 Flash", "longcat-2.5-free": "LongCat 2.5",
  "glm-5.3-flash": "GLM 5.3 Flash", "zai-glm": "Z.ai GLM", "flint-40b-free": "Flint 40B", "deepseek-v4.1-flash-free": "DeepSeek V4.1 Flash",
  "claude-sonnet-5-5": "Claude Sonnet 5.5", "claude-haiku-5-5": "Claude Haiku 5.5", "ernie-5.5-flash-preview": "ERNIE 5.5 Preview",
};
export const modelName = (slug: string) => names[slug] || slug;
export const dateLabel = (date: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
export const displayAxis = (axis: string) => axis.charAt(0).toUpperCase() + axis.slice(1);
export function average(scores?: Scores | null) {
  if (!scores || AXES.some((axis) => typeof scores[axis] !== "number")) return null;
  return AXES.reduce((sum, axis) => sum + (scores[axis] as number), 0) / AXES.length;
}
export function validScores(value: unknown): value is Scores {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const entries = Object.entries(value);
  return entries.length > 0 && entries.every(([key, score]) => AXES.includes(key as Axis) && (score === null || (typeof score === "number" && Number.isFinite(score) && score >= 0 && score <= 5 && Number.isInteger(score * 2))));
}
export function challengeLabel(slug: string) {
  const short: Record<string, string> = { restaurant: "Restaurant", saas: "SaaS", "site-refresh": "Site refresh" };
  return short[slug] || challengeBySlug.get(slug)?.title || slug;
}
