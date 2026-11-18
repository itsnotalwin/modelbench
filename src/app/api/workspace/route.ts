import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { runPreferences } from "@/db/schema";
import { runBySlug, validScores, type Scores } from "@/lib/bench";

export const dynamic = "force-dynamic";
const COOKIE = "modelbench_workspace";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function identity(req: NextRequest) {
  const cookie = req.cookies.get(COOKIE)?.value;
  return cookie && uuid.test(cookie) ? cookie : randomUUID();
}
function response(data: unknown, id: string, req: NextRequest, status = 200) {
  const res = NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
  const secure = req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto")?.split(",")[0].trim() === "https";
  // CHIPS keeps embedded preview workspaces private to their top-level site.
  res.cookies.set(COOKIE, id, { httpOnly: true, sameSite: secure ? "none" : "lax", secure, partitioned: secure, path: "/", maxAge: 60 * 60 * 24 * 365 });
  return res;
}
export async function GET(req: NextRequest) {
  const id = identity(req);
  try {
    const rows = await db.select({ slug: runPreferences.runSlug, saved: runPreferences.saved, scores: runPreferences.scores }).from(runPreferences).where(eq(runPreferences.workspaceId, id));
    return response({ preferences: Object.fromEntries(rows.map(({ slug, ...preference }) => [slug, preference])) }, id, req);
  } catch {
    return response({ error: "Your workspace could not be loaded. Please try again." }, id, req, 503);
  }
}
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const site = req.headers.get("sec-fetch-site");
  const hosts = [req.nextUrl.host, req.headers.get("host"), ...(req.headers.get("x-forwarded-host") || "").split(",").map((h) => h.trim())];
  let validOrigin = true;
  try { if (origin) validOrigin = hosts.includes(new URL(origin).host) || site === "same-origin"; } catch { validOrigin = false; }
  if (!validOrigin || site === "cross-site" || !req.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Same-origin JSON requests only." }, { status: 403 });
  }
  const id = identity(req);
  try {
    const reader = req.body?.getReader();
    const decoder = new TextDecoder();
    let raw = "", length = 0;
    if (reader) {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        length += part.value.byteLength;
        if (length > 80000) { await reader.cancel(); return response({ error: "The import is too large." }, id, req, 413); }
        raw += decoder.decode(part.value, { stream: true });
      }
      raw += decoder.decode();
    }
    let body;
    try { body = JSON.parse(raw); } catch { return response({ error: "Invalid JSON." }, id, req, 400); }
    if (!body || typeof body !== "object") return response({ error: "Invalid request." }, id, req, 400);
    if (body.action === "import") {
      if (!body.ratings || typeof body.ratings !== "object" || Array.isArray(body.ratings)) return response({ error: "Invalid ratings file." }, id, req, 400);
      const entries = Object.entries(body.ratings);
      if (entries.length === 0 || entries.length > runBySlug.size || entries.some(([slug, scores]) => !runBySlug.has(slug) || !validScores(scores))) return response({ error: "The file must contain known runs and ratings from 0 to 5, in half-point steps." }, id, req, 400);
      await db.insert(runPreferences).values(entries.map(([slug, scores]) => ({ workspaceId: id, runSlug: slug, scores: scores as Scores }))).onConflictDoUpdate({ target: [runPreferences.workspaceId, runPreferences.runSlug], set: { scores: sql`excluded.scores`, updatedAt: new Date() } });
      return response({ ok: true, count: entries.length }, id, req);
    }
    if (typeof body.slug !== "string" || !runBySlug.has(body.slug)) return response({ error: "Unknown run." }, id, req, 400);
    const updates: { saved?: boolean; scores?: Scores; updatedAt: Date } = { updatedAt: new Date() };
    if (body.action === "bookmark" && typeof body.saved === "boolean") updates.saved = body.saved;
    else if (body.action === "rate" && validScores(body.scores)) updates.scores = body.scores;
    else return response({ error: "Invalid bookmark or rating." }, id, req, 400);
    await db.insert(runPreferences).values({ workspaceId: id, runSlug: body.slug, ...updates }).onConflictDoUpdate({ target: [runPreferences.workspaceId, runPreferences.runSlug], set: updates });
    return response({ ok: true }, id, req);
  } catch {
    return response({ error: "Your changes could not be saved. Please try again." }, id, req, 503);
  }
}
