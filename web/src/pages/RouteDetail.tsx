import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getRoute, type RouteDetailPayload, type TrainStop } from "../api";
import { to12h } from "../format";

export default function RouteDetail() {
  const { slug = "" } = useParams();
  const [data, setData] = useState<RouteDetailPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    setErr(null);
    getRoute(slug).then(setData).catch((e) => setErr(String(e)));
  }, [slug]);

  if (err) return <p className="text-red-400">Failed to load: {err}</p>;
  if (!data) return <p className="text-slate-400">Loading…</p>;

  return (
    <div className="space-y-4">
      <div>
        <Link to="/" className="text-sm text-sky-400">‹ All routes</Link>
        <h1 className="mt-1 text-2xl font-semibold">{data.name}</h1>
        <p className="text-sm text-slate-400">{data.summary}</p>
      </div>

      <ul className="space-y-3">
        {data.trains.map((t) => (
          <li key={t.number} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="flex items-center gap-3">
              <Link to={`/trains/${t.number}`} className="text-xl font-semibold text-sky-300 hover:text-sky-200">
                #{t.number}
              </Link>
              <span className="text-slate-500">{t.direction === "up" ? "↑" : t.direction === "down" ? "↓" : ""}</span>
              <div className="ml-auto text-sm text-slate-400">
                {t.status === "complete" ? "Completed" : t.speedMph != null ? `${t.speedMph} mph` : t.status}
              </div>
            </div>
            <ol className="mt-3 border-l border-slate-800 pl-4 space-y-2">
              {t.stops.map((s, i) => (
                <StopRow key={`${t.number}-${i}`} stop={s} />
              ))}
            </ol>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StopRow({ stop }: { stop: TrainStop }) {
  const dot = {
    ontime: "bg-emerald-400",
    early: "bg-sky-400",
    late: "bg-amber-400",
    scheduled: "bg-slate-500",
    passed: "bg-slate-700",
    unknown: "bg-slate-700",
  }[stop.status];
  return (
    <li className="relative">
      <span className={`absolute -left-[21px] top-2 h-2 w-2 rounded-full ${dot}`} />
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-xs text-slate-500">{stop.code}</span>
        <span className="truncate">{stop.station}</span>
        <span className="ml-auto text-right">
          {stop.time && <span className="tabular-nums">{to12h(stop.time)}</span>}
          {stop.delay && (
            <span className={`ml-2 text-xs ${stop.status === "late" ? "text-amber-400" : stop.status === "early" ? "text-sky-400" : "text-slate-400"}`}>
              {stop.delay}
            </span>
          )}
        </span>
      </div>
    </li>
  );
}
