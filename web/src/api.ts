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

const base = import.meta.env.DEV ? "" : (import.meta.env.VITE_API_BASE ?? "");

export async function getRoutes(): Promise<RoutesPayload> {
  const r = await fetch(`${base}/api/routes`);
  if (!r.ok) throw new Error(`routes ${r.status}`);
  return r.json();
}

export async function getRoute(slug: string): Promise<RouteDetailPayload> {
  const r = await fetch(`${base}/api/routes/${encodeURIComponent(slug)}`);
  if (!r.ok) throw new Error(`route ${slug} ${r.status}`);
  return r.json();
}

export type TrainsIndexGroup = {
  routeSlug: string;
  routeName: string;
  trains: { number: string; recent: boolean }[];
};

export type TrainsIndexPayload = {
  groups: TrainsIndexGroup[];
  lastUpdated: string | null;
};

export type TrainProgressStop = {
  code: string;
  station: string;
  event: "departed" | "arrived" | "est. arrival" | "est. departure" | "scheduled" | "other";
  time: string | null;
  delayMin: number | null;
  early: boolean;
  raw: string;
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
  recentPositions: { time: string; text: string }[];
  mapStations: { code: string; lat: number; lon: number; popup: string }[];
  mapTrain: { lat: number; lon: number } | null;
  lastUpdated: string | null;
};

export async function getTrains(): Promise<TrainsIndexPayload> {
  const r = await fetch(`${base}/api/trains`);
  if (!r.ok) throw new Error(`trains ${r.status}`);
  return r.json();
}

export async function getTrain(num: string): Promise<TrainDetailPayload> {
  const r = await fetch(`${base}/api/trains/${encodeURIComponent(num)}`);
  if (!r.ok) throw new Error(`train ${num} ${r.status}`);
  return r.json();
}

export type StationSummary = { code: string; name: string };
export type StationsIndexPayload = {
  stations: StationSummary[];
  lastUpdated: string | null;
};

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

export async function getStations(): Promise<StationsIndexPayload> {
  const r = await fetch(`${base}/api/stations`);
  if (!r.ok) throw new Error(`stations ${r.status}`);
  return r.json();
}

export async function getStation(code: string): Promise<StationDetailPayload> {
  const r = await fetch(`${base}/api/stations/${encodeURIComponent(code)}`);
  if (!r.ok) throw new Error(`station ${code} ${r.status}`);
  return r.json();
}
