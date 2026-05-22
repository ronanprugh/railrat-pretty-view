import { decodeEntities, stripTags } from "./util.ts";

export type TrainStop = {
  code: string;
  station: string;
  time: string | null;
  delay: string | null;
  status: "ontime" | "late" | "early" | "scheduled" | "passed" | "unknown";
};

export type Train = {
  number: string;
  direction: "up" | "down" | "unknown";
  speedMph: number | null;
  status: "active" | "complete" | "pending";
  stops: TrainStop[];
};

export type RouteDetailPayload = {
  slug: string;
  name: string;
  summary: string;
  trains: Train[];
};

const NAME_RE = /<h1>([^<]+)<\/h1>/;
const SUMMARY_RE = /<section class="routes">\s*<p>([^<]+)<\/p>/;

export function parseRouteDetail(html: string, slug: string): RouteDetailPayload {
  const name = decodeEntities((html.match(NAME_RE)?.[1] ?? slug).trim());
  const summary = decodeEntities((html.match(SUMMARY_RE)?.[1] ?? "").trim());

  // Locate the route table.
  const tableStart = html.indexOf("<table", html.indexOf("<section class=\"routes\""));
  const tableEnd = tableStart >= 0 ? html.indexOf("</table>", tableStart) : -1;
  if (tableStart < 0 || tableEnd < 0) {
    return { slug, name, summary, trains: [] };
  }
  const table = html.slice(tableStart, tableEnd);

  // Headers: first <tr> inside <thead>: contains <a href="/trains/NNN/">NNN</a><br>↑ or ↓
  const headerRowMatch = table.match(/<thead>([\s\S]*?)<\/thead>/);
  if (!headerRowMatch) return { slug, name, summary, trains: [] };
  const thead = headerRowMatch[1];

  const trainHeaders: { number: string; direction: "up" | "down" | "unknown" }[] = [];
  const thRe = /<th>([\s\S]*?)<\/th>/g;
  for (const m of thead.matchAll(thRe)) {
    const cell = m[1];
    const num = cell.match(/\/trains\/([^"/]+)\//)?.[1];
    if (!num) continue;
    const dir = cell.includes("&#8593;") ? "up" : cell.includes("&#8595;") ? "down" : "unknown";
    trainHeaders.push({ number: num, direction: dir });
  }

  // Speed row: second <tr> in <thead>. Each <td><i>NN mph</i></td> or <td>Comp.</td>.
  const speedRowMatch = thead.match(/<tr>\s*<td>&nbsp;<\/td>([\s\S]*?)<\/tr>\s*$/);
  const speeds: (number | null)[] = [];
  const statuses: ("active" | "complete" | "pending")[] = [];
  if (speedRowMatch) {
    const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/g;
    const cells = [...speedRowMatch[1].matchAll(tdRe)].map((m) => m[1]);
    for (const c of cells.slice(0, trainHeaders.length)) {
      const speedM = c.match(/(\d+)\s*mph/);
      if (speedM) {
        speeds.push(+speedM[1]);
        statuses.push("active");
      } else if (/Comp\.?/i.test(c)) {
        speeds.push(null);
        statuses.push("complete");
      } else {
        speeds.push(null);
        statuses.push("pending");
      }
    }
  }

  // Body rows. Each row is one station; first cell = code link, last cell = station name, middle = stops.
  const tbodyMatch = table.match(/<tbody>([\s\S]*?)<\/tbody>/);
  const tbody = tbodyMatch?.[1] ?? "";
  const rowRe = /<tr>([\s\S]*?)<\/tr>/g;

  const stationCells: { code: string; station: string; cells: string[] }[] = [];
  for (const r of tbody.matchAll(rowRe)) {
    const row = r[1];
    const tds = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1]);
    if (tds.length < 2) continue;
    const codeMatch = tds[0].match(/\/stations\/([^"/]+)\//);
    const code = codeMatch?.[1] ?? stripTags(tds[0]).trim();
    const station = decodeEntities(stripTags(tds[tds.length - 1])).trim();
    const cells = tds.slice(1, -1);
    stationCells.push({ code, station, cells });
  }

  // Pivot: for each train column i, build stops in station order.
  const trains: Train[] = trainHeaders.map((h, i) => {
    const stops: TrainStop[] = [];
    for (const s of stationCells) {
      const raw = s.cells[i] ?? "";
      stops.push(parseStopCell(raw, s.code, s.station));
    }
    // Trim leading/trailing rows where this train hasn't started/has ended (only arrows or empty).
    const trimmed = trimStops(stops);
    return {
      number: h.number,
      direction: h.direction,
      speedMph: speeds[i] ?? null,
      status: statuses[i] ?? "active",
      stops: trimmed,
    };
  });

  return { slug, name, summary, trains };
}

function parseStopCell(raw: string, code: string, station: string): TrainStop {
  // The popup div is inside the <a>; strip it for the visible time.
  const visible = raw.replace(/<div[\s\S]*?<\/div>/g, "");
  const text = decodeEntities(stripTags(visible)).replace(/\s+/g, " ").trim();

  // text is like "22:53 14m er" or "18:31 26m lt 05/21" or "↑" or ""
  if (!text || text === "↑" || text === "↓") {
    return {
      code,
      station,
      time: null,
      delay: null,
      status: text ? "passed" : "unknown",
    };
  }

  const timeMatch = text.match(/^(\d{1,2}:\d{2})/);
  const delayMatch = text.match(/(on tm|\d+m\s+(?:lt|er))/i);
  const time = timeMatch?.[1] ?? null;
  const delay = delayMatch?.[1] ?? null;

  let status: TrainStop["status"] = "unknown";
  if (delay) {
    if (/on tm/i.test(delay)) status = "ontime";
    else if (/er$/i.test(delay)) status = "early";
    else if (/lt$/i.test(delay)) status = "late";
  } else if (time) {
    status = "scheduled";
  }

  return { code, station, time, delay, status };
}

function trimStops(stops: TrainStop[]): TrainStop[] {
  let start = 0;
  let end = stops.length;
  while (start < end && stops[start].status === "unknown") start++;
  while (end > start && stops[end - 1].status === "unknown") end--;
  return stops.slice(start, end);
}
