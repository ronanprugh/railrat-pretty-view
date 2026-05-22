import { decodeEntities, stripTags } from "./util.ts";

export type TrainProgressStop = {
  code: string;
  station: string;
  event: "departed" | "arrived" | "est. arrival" | "est. departure" | "scheduled" | "other";
  time: string | null;
  delayMin: number | null;
  early: boolean;
  raw: string;
};

export type TrainPosition = {
  time: string;
  text: string;
};

export type TrainDetailPayload = {
  number: string;
  routeName: string | null;
  routeSlug: string | null;
  updatedAt: string | null;
  origin: string | null;
  destination: string | null;
  status: "active" | "complete" | "pending" | "unknown";
  position: {
    text: string | null;
    speedMph: number | null;
    bearing: string | null;
    milesToDestination: number | null;
    milesFromOrigin: number | null;
  };
  progress: TrainProgressStop[];
  recentPositions: TrainPosition[];
  mapStations: { code: string; lat: number; lon: number; popup: string }[];
  mapTrain: { lat: number; lon: number } | null;
  lastUpdated: string | null;
};

const HEADER_RE =
  /<h1>\s*(?:<a\s+href="\/routes\/([^"/]+)\/"[^>]*>([^<]+)<\/a>\s*)?Train\s+(\d+)\s*<\/h1>/;
const UPDATED_RE = /updated\s+([0-9:]+)(?:&nbsp;|\s)+on(?:&nbsp;|\s)+([0-9/]+)/;
const LAST_UPDATED_RE = /Last updated ([^<]+?)<\/small>/;

// "32 mi SW of Wilmington [WIL], 104 mph NE"
const POSITION_RE =
  /<b>\s*(\d+)\s*mi\s+([NSEW]+)\s+of\s+([^[]+?)\s*\[<a[^>]*>([A-Z]+)<\/a>\][^,]*,\s*(\d+)&nbsp;mph&nbsp;([NSEW]+)\s*<\/b>/;

const MILES_TO_DEST_RE = /(\d+)\s+miles?\s+\w+\s+of\s+([^<]+?)<\/li>/;

const STATUS_RE = /Status:\s*(Active|Complete|Pending)/i;

export function parseTrainDetail(html: string, fallbackNum: string): TrainDetailPayload {
  const hdr = html.match(HEADER_RE);
  const routeSlug = hdr?.[1] ?? null;
  const routeName = hdr?.[2] ? decodeEntities(hdr[2]).trim() : null;
  const number = hdr?.[3] ?? fallbackNum;

  const upd = html.match(UPDATED_RE);
  const updatedAt = upd ? `${upd[1]} on ${upd[2]}` : null;

  const statusM = html.match(STATUS_RE);
  const statusRaw = statusM?.[1]?.toLowerCase();
  const status: TrainDetailPayload["status"] =
    statusRaw === "active" ? "active" : statusRaw === "complete" ? "complete" : statusRaw === "pending" ? "pending" : "unknown";

  // Origin/Destination — pull from viewport-1 spans (the long form).
  const origin = extract(html, /Origin:\s*([^,<]+(?:,\s*[A-Z]{2})?)/);
  const destination = extract(html, /Destination:\s*([^,<]+(?:,\s*[A-Z]{2})?)/);

  // Current position.
  const pos = html.match(POSITION_RE);
  const position = {
    text: pos ? `${pos[1]} mi ${pos[2]} of ${decodeEntities(pos[3]).trim()} [${pos[4]}]` : null,
    speedMph: pos ? +pos[5] : null,
    bearing: pos ? pos[6] : null,
    milesToDestination: null as number | null,
    milesFromOrigin: null as number | null,
  };

  // Two follow-up <li>s like "139 miles SW of New York Penn" / "65 miles NE of Washington Union"
  const milesRefs = [...html.matchAll(/<li>\s*(\d+)\s+miles?\s+[NSEW]+\s+of\s+([^<]+?)\s*<\/li>/g)];
  if (destination && milesRefs.length) {
    const toDest = milesRefs.find((m) => destination.startsWith(m[2].trim()));
    if (toDest) position.milesToDestination = +toDest[1];
  }
  if (origin && milesRefs.length) {
    const fromOrig = milesRefs.find((m) => origin.startsWith(m[2].trim()));
    if (fromOrig) position.milesFromOrigin = +fromOrig[1];
  }

  // Progress tracker: <div id="train_progress"> ... <ol> <li>...
  const progress = parseProgress(html);

  // Position Updates: <div id="train_position_updates;"> <ul><li>HH:MM - text</li>...
  const recentPositions = parseRecentPositions(html);

  // Map data: L.marker([lat,lon]).bindPopup("...[CODE]...")
  const mapStations: TrainDetailPayload["mapStations"] = [];
  const stationMarkerRe =
    /L\.marker\(\[(-?[\d.]+),(-?[\d.]+)\][^)]*\)\.addTo\(mymap\)\.bindPopup\("([\s\S]*?)"\)/g;
  for (const m of html.matchAll(stationMarkerRe)) {
    const popup = m[3];
    const codeMatch = popup.match(/\[([A-Z]+)\]/);
    if (!codeMatch) continue;
    mapStations.push({
      code: codeMatch[1],
      lat: +m[1],
      lon: +m[2],
      popup: decodeEntities(stripTags(popup)).replace(/\s+/g, " ").trim(),
    });
  }
  // The train marker uses marker_blue_med with zIndexOffset.
  const trainMarker = html.match(
    /L\.marker\(\[(-?[\d.]+),(-?[\d.]+)\][^)]*marker_blue_med[^)]*\)/
  );
  const mapTrain = trainMarker ? { lat: +trainMarker[1], lon: +trainMarker[2] } : null;

  const lu = html.match(LAST_UPDATED_RE);
  const lastUpdated = lu ? stripTags(lu[1]).trim() : null;

  return {
    number,
    routeName,
    routeSlug,
    updatedAt,
    origin,
    destination,
    status,
    position,
    progress,
    recentPositions,
    mapStations,
    mapTrain,
    lastUpdated,
  };
}

function extract(html: string, re: RegExp): string | null {
  const m = html.match(re);
  return m ? decodeEntities(m[1]).trim() : null;
}

function parseProgress(html: string): TrainProgressStop[] {
  const block = html.match(/<div id="train_progress">([\s\S]*?)<\/div>/);
  if (!block) return [];
  const ol = block[1].match(/<ol>([\s\S]*?)<\/ol>/);
  if (!ol) return [];

  const out: TrainProgressStop[] = [];
  // li tags aren't closed in this source; split on <li> and drop the empty preamble.
  const items = ol[1].split(/<li>/).slice(1);
  for (const item of items) {
    const li = item.replace(/<\/ol>[\s\S]*$/, "");
    const codeMatch = li.match(/<a\s+href="\/stations\/([^"/]+)\/"[^>]*title="([^"]+)"[^>]*>[A-Z]+<\/a>/);
    if (!codeMatch) continue;
    const code = codeMatch[1];
    const stationFull = decodeEntities(codeMatch[2]).trim();
    const text = decodeEntities(stripTags(li)).replace(/\s+/g, " ").trim();

    let event: TrainProgressStop["event"] = "other";
    if (/\bdeparted\b/i.test(text)) event = "departed";
    else if (/\barrived\b/i.test(text)) event = "arrived";
    else if (/est\.\s+departure/i.test(text)) event = "est. departure";
    else if (/est\.\s+arrival/i.test(text)) event = "est. arrival";
    else if (/\bsch\.\s+(?:arrival|departure)/i.test(text)) event = "scheduled";

    const timeMatch = text.match(/(\d{1,2}:\d{2})/);
    const delayMatch = text.match(/(\d+)\s+min\.\s+(late|early)/i);

    out.push({
      code,
      station: stationFull,
      event,
      time: timeMatch?.[1] ?? null,
      delayMin: delayMatch ? +delayMatch[1] : null,
      early: delayMatch ? /early/i.test(delayMatch[2]) : false,
      raw: text,
    });
  }
  return out;
}

function parseRecentPositions(html: string): TrainPosition[] {
  const block = html.match(/id="train_position_updates;?"[^>]*>([\s\S]*?)<\/div>/);
  if (!block) return [];
  const ul = block[1].match(/<ul>([\s\S]*?)<\/ul>/);
  if (!ul) return [];
  const out: TrainPosition[] = [];
  const liRe = /<li>([\s\S]*?)<\/li>/g;
  for (const m of ul[1].matchAll(liRe)) {
    const text = decodeEntities(stripTags(m[1])).replace(/\s+/g, " ").trim();
    const tm = text.match(/^(\d{1,2}:\d{2})\s*-\s*(.+)$/);
    if (tm) out.push({ time: tm[1], text: tm[2].trim() });
  }
  return out;
}
