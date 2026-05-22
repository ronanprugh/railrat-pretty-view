import { decodeEntities, stripTags } from "./util.ts";

export type TrainsIndexGroup = {
  routeSlug: string;
  routeName: string;
  trains: { number: string; recent: boolean }[];
};

export type TrainsIndexPayload = {
  groups: TrainsIndexGroup[];
  lastUpdated: string | null;
};

// One section per route: <h2><a href="/routes/SLUG/">Name</a></h2><p>...trains...</p>
const SECTION_RE =
  /<h2>\s*<a\s+href="\/routes\/([^"/]+)\/"[^>]*>([^<]+)<\/a>\s*<\/h2>\s*<p>([\s\S]*?)<\/p>/g;

// Inside the <p>: <a href="./NNN/"/>NNN</a> or <a href="./NNN/"/><b>NNN</b></a>.
// Note railrat ships a stray self-closing slash on the <a>, but we just need the number + bold marker.
const TRAIN_RE = /href="\.\/(\d+)\/"[^>]*>\s*(<b>)?\s*(\d+)/g;

const LAST_UPDATED_RE = /Last updated ([^<]+?)<\/small>/;

export function parseTrainsIndex(html: string): TrainsIndexPayload {
  const groups: TrainsIndexGroup[] = [];
  for (const m of html.matchAll(SECTION_RE)) {
    const routeSlug = m[1];
    const routeName = decodeEntities(m[2]).trim();
    const body = m[3];
    const trains: { number: string; recent: boolean }[] = [];
    const seen = new Set<string>();
    for (const t of body.matchAll(TRAIN_RE)) {
      const number = t[1];
      if (seen.has(number)) continue;
      seen.add(number);
      trains.push({ number, recent: !!t[2] });
    }
    groups.push({ routeSlug, routeName, trains });
  }

  const lu = html.match(LAST_UPDATED_RE);
  return {
    groups,
    lastUpdated: lu ? stripTags(lu[1]).trim() : null,
  };
}
