import { decodeEntities, stripTags } from "./util.ts";

export type StationTrain = {
  time: string;
  trainNumber: string;
  trainLabel: string;
  delay: string | null;
  delayClass: "ontime" | "early" | "late" | "verylate" | "unknown";
  origin: string | null;
  destination: string | null;
  scheduledArrival: string | null;
  estimatedArrival: string | null;
  actualArrival: string | null;
  scheduledDeparture: string | null;
  estimatedDeparture: string | null;
  actualDeparture: string | null;
};

export type StationDetailPayload = {
  code: string;
  name: string;
  arriving: StationTrain[];
  departed: StationTrain[];
  connectingServices: { name: string; url: string }[];
  lastUpdated: string | null;
};

const H1_RE = /<h1>\s*([^<\[]+?)\s*\[([A-Z]+)\]\s*<\/h1>/;
const LAST_UPDATED_RE = /Last updated ([^<]+?)<\/small>/;

export function parseStationDetail(html: string, fallbackCode: string): StationDetailPayload {
  const h1 = html.match(H1_RE);
  const code = h1?.[2] ?? fallbackCode;
  const name = h1 ? decodeEntities(h1[1]).trim() : code;

  const arriving = parseSection(html, "Arriving Trains");
  const departed = parseSection(html, "Departed Trains");

  const connectingServices = parseConnecting(html);

  const lu = html.match(LAST_UPDATED_RE);
  const lastUpdated = lu ? stripTags(lu[1]).trim() : null;

  return { code, name, arriving, departed, connectingServices, lastUpdated };
}

function parseSection(html: string, heading: string): StationTrain[] {
  const re = new RegExp(`<h2>\\s*${heading}\\s*<\\/h2>([\\s\\S]*?)(?=<h2>|$)`);
  const block = html.match(re);
  if (!block) return [];

  // Mask <li> inside popup <div>s so we can split outer items cleanly.
  const masked = block[1].replace(/<div\s+id="[^"]+"[^>]*>[\s\S]*?<\/div>/g, (match) =>
    match.replace(/<li>/g, "<<LI>>").replace(/<\/li>/g, "<<\/LI>>")
  );

  const items = masked.split(/<li>/).slice(1);
  const out: StationTrain[] = [];
  for (const item of items) {
    const restored = item.replace(/<<LI>>/g, "<li>").replace(/<<\/LI>>/g, "</li>");
    const parsed = parseTrainLi(restored);
    if (parsed) out.push(parsed);
  }
  return out;
}

function parseTrainLi(li: string): StationTrain | null {
  // Split into visible part (before <div ...>) and popup (inside <div>).
  const popupMatch = li.match(/<div\s+id="[^"]+"[^>]*>([\s\S]*?)<\/div>/);
  const popup = popupMatch?.[1] ?? "";
  const visible = li.replace(/<div\s+id="[^"]+"[^>]*>[\s\S]*?<\/div>/, "");

  // Visible: "HH:MM <a href="/trains/NUM/">Label</a>, delay text"
  const timeMatch = visible.match(/^\s*(\d{1,2}:\d{2})/);
  if (!timeMatch) return null;
  const time = timeMatch[1];

  const trainMatch = visible.match(/<a\s+href="\/trains\/(\d+)\/"[^>]*>([^<]+)<\/a>/);
  if (!trainMatch) return null;
  const trainNumber = trainMatch[1];
  const trainLabel = decodeEntities(trainMatch[2]).trim();

  // After the </a>, optional ", DELAY" until the next <a href="javascript:..." (the more_vert).
  let delay: string | null = null;
  let delayClass: StationTrain["delayClass"] = "unknown";
  const afterAnchor = visible.split(/<\/a>/)[1] ?? "";
  const beforeMore = afterAnchor.split(/<a\s+href="javascript:/)[0] ?? "";
  const delayText = decodeEntities(stripTags(beforeMore)).replace(/\s+/g, " ").trim();
  if (delayText) {
    const cleaned = delayText.replace(/^,\s*/, "").trim();
    if (cleaned) {
      delay = cleaned;
      if (/on tm/i.test(cleaned)) delayClass = "ontime";
      else if (/er$/i.test(cleaned) || /\ber\b/i.test(cleaned)) delayClass = "early";
      else if (/red/i.test(beforeMore)) delayClass = "verylate";
      else if (/lt$/i.test(cleaned) || /\blt\b/i.test(cleaned)) delayClass = "late";
    }
  }

  // Popup ul: <li>Origin [O] → Destination [D]</li> <li>Ar sch. HH:MM, est. HH:MM MM/DD</li> <li>Dp ...</li>
  let origin: string | null = null;
  let destination: string | null = null;
  let scheduledArrival: string | null = null;
  let estimatedArrival: string | null = null;
  let actualArrival: string | null = null;
  let scheduledDeparture: string | null = null;
  let estimatedDeparture: string | null = null;
  let actualDeparture: string | null = null;

  if (popup) {
    const popupItems = popup.split(/<li>/).slice(1).map((s) => s.replace(/<\/li>[\s\S]*$/, ""));
    for (const p of popupItems) {
      const text = decodeEntities(stripTags(p)).replace(/\s+/g, " ").trim();
      const od = text.match(/^([^[]+?)\s*\[[A-Z]+\]\s*(?:→|->|&rarr;)\s*([^[]+?)\s*\[[A-Z]+\]/);
      if (od) {
        origin = od[1].trim();
        destination = od[2].trim();
        continue;
      }
      // "Ar sch. 22:23, est. 21:48 05/22" or "Ar sch. 22:23, act. 22:25 05/22"
      const ar = text.match(/^Ar\s+(.+)$/i);
      const dp = text.match(/^Dp\s+(.+)$/i);
      const target = ar?.[1] ?? dp?.[1];
      if (!target) continue;
      const sch = target.match(/sch\.?\s+(\d{1,2}:\d{2})/);
      const est = target.match(/est\.?\s+(\d{1,2}:\d{2})/);
      const act = target.match(/act\.?\s+(\d{1,2}:\d{2})/);
      if (ar) {
        scheduledArrival = sch?.[1] ?? scheduledArrival;
        estimatedArrival = est?.[1] ?? estimatedArrival;
        actualArrival = act?.[1] ?? actualArrival;
      } else if (dp) {
        scheduledDeparture = sch?.[1] ?? scheduledDeparture;
        estimatedDeparture = est?.[1] ?? estimatedDeparture;
        actualDeparture = act?.[1] ?? actualDeparture;
      }
    }
  }

  return {
    time,
    trainNumber,
    trainLabel,
    delay,
    delayClass,
    origin,
    destination,
    scheduledArrival,
    estimatedArrival,
    actualArrival,
    scheduledDeparture,
    estimatedDeparture,
    actualDeparture,
  };
}

function parseConnecting(html: string): { name: string; url: string }[] {
  const block = html.match(/<h2>\s*Connecting Services\s*<\/h2>\s*<ul>([\s\S]*?)<\/ul>/);
  if (!block) return [];
  const out: { name: string; url: string }[] = [];
  for (const m of block[1].matchAll(/<a\s+href="([^"]+)"[^>]*>([^<]+)<\/a>/g)) {
    out.push({ url: m[1], name: decodeEntities(m[2]).trim() });
  }
  return out;
}
