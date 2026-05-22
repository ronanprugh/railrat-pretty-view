import { decodeEntities } from "./util.ts";

export type StationSummary = { code: string; name: string };

export type StationsIndexPayload = {
  stations: StationSummary[];
  lastUpdated: string | null;
};

// <li>Aberdeen, MD [<a href="/stations/ABE/">ABE</a>]</li>
// Some entries are just the code: <li>BAS [<a href="/stations/BAS/">BAS</a>]</li>
const STATION_RE =
  /<li>\s*([^<]+?)\s*\[<a\s+href="\/stations\/([^"/]+)\/"[^>]*>[^<]+<\/a>\]\s*<\/li>/g;
const LAST_UPDATED_RE = /Last updated ([^<]+?)<\/small>/;

export function parseStationsIndex(html: string): StationsIndexPayload {
  const stations: StationSummary[] = [];
  const seen = new Set<string>();
  for (const m of html.matchAll(STATION_RE)) {
    const code = m[2];
    if (seen.has(code)) continue;
    seen.add(code);
    stations.push({ code, name: decodeEntities(m[1]).trim() });
  }
  const lu = html.match(LAST_UPDATED_RE);
  return {
    stations,
    lastUpdated: lu ? decodeEntities(lu[1]).replace(/<[^>]+>/g, "").trim() : null,
  };
}
