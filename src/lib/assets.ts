// Public asset URLs need the deployment base path (GitHub Pages serves the lab
// from /modelbench), while local development serves from the site root.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const asset = (path: string) => `${BASE_PATH}${path}`;
