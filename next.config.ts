import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const staticExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: { root: process.cwd() },
  // Project-page hosting (GitHub Pages) lives under /modelbench.
  ...(basePath ? { basePath } : {}),
  // Static hosting has no Node runtime: no route handlers, no image optimizer.
  ...(staticExport ? { output: "export" as const, trailingSlash: true } : {}),
  ...(staticExport ? {} : {
    async headers() {
      return [
        { source: "/art/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }] },
        { source: "/fonts/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
        { source: "/briefs/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" }] },
        { source: "/:path*", headers: [{ key: "X-Content-Type-Options", value: "nosniff" }, { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }] },
      ];
    },
  }),
};
export default nextConfig;
