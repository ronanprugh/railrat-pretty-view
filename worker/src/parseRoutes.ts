import { decodeEntities, stripTags } from "./util.ts";

export type RouteSummary = {
  slug: string;
  name: string;
  active: number;
  complete: number;
  pending: number;
};

export type RoutesPayload = {
  totals: { active: number; complete: number; pending: number };
  routes: RouteSummary[];
  lastUpdated: string | null;
};

const ROW_RE =
  /<tr>\s*<td>\s*<a\s+href="\/routes\/([^"/]+)\/"[^>]*>([^<]+)<\/a>\s*<\/td>\s*<td>(\d+)<\/td>\s*<td>(\d+)<\/td>\s*<td>(\d+)<\/td>\s*<\/tr>/g;

const TOTALS_RE =
  /<tr>\s*<td>\s*<b>\s*TOTALS\s*<\/b>\s*<\/td>\s*<td>\s*<b>(\d+)<\/b>\s*<\/td>\s*<td>\s*<b>(\d+)<\/b>\s*<\/td>\s*<td>\s*<b>(\d+)<\/b>\s*<\/td>\s*<\/tr>/;

const LAST_UPDATED_RE = /Last updated ([^<]+?)<\/small>/;

export function parseRoutes(html: string): RoutesPayload {
  const seen = new Set<string>();
  const routes: RouteSummary[] = [];
  for (const m of html.matchAll(ROW_RE)) {
    const slug = m[1];
    if (seen.has(slug)) continue;
    seen.add(slug);
    routes.push({
      slug,
      name: decodeEntities(m[2]).trim(),
      active: +m[3],
      complete: +m[4],
      pending: +m[5],
    });
  }

  const t = html.match(TOTALS_RE);
  const totals = t
    ? { active: +t[1], complete: +t[2], pending: +t[3] }
    : routes.reduce(
        (acc, r) => ({
          active: acc.active + r.active,
          complete: acc.complete + r.complete,
          pending: acc.pending + r.pending,
        }),
        { active: 0, complete: 0, pending: 0 }
      );

  const lu = html.match(LAST_UPDATED_RE);
  const lastUpdated = lu ? stripTags(lu[1]).trim() : null;

  return { totals, routes, lastUpdated };
}
