import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getTrain, type TrainDetailPayload, type TrainProgressStop } from "../api";
import { to12h } from "../format";

export default function TrainDetail() {
  const { num = "" } = useParams();
  const [data, setData] = useState<TrainDetailPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    setErr(null);
    getTrain(num).then(setData).catch((e) => setErr(String(e)));
  }, [num]);

  if (err) return <p className="text-red-400">Failed to load: {err}</p>;
  if (!data) return <p className="text-slate-400">Loading…</p>;

  return (
    <div className="space-y-4">
      <div>
        <Link to="/trains" className="text-sm text-sky-400">‹ All trains</Link>
        <div className="mt-1 flex items-baseline gap-2 flex-wrap">
          <h1 className="text-2xl font-semibold">#{data.number}</h1>
          {data.routeName && data.routeSlug && (
            <Link to={`/routes/${data.routeSlug}`} className="text-slate-300 hover:text-sky-300">
              {data.routeName}
            </Link>
          )}
          <StatusBadge status={data.status} />
        </div>
        {data.updatedAt && (
          <p className="text-xs text-slate-500 mt-1">
            Updated {data.updatedAt.replace(/^(\d{1,2}:\d{2})/, (m) => to12h(m))}
          </p>
        )}
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <div className="min-w-0">
            <div className="text-xs text-slate-500">Origin</div>
            <div className="truncate">{data.origin ?? "—"}</div>
          </div>
          <div className="px-3 text-slate-600">→</div>
          <div className="min-w-0 text-right">
            <div className="text-xs text-slate-500">Destination</div>
            <div className="truncate">{data.destination ?? "—"}</div>
          </div>
        </div>

        {data.position.text && (
          <div className="rounded-lg bg-slate-950/60 p-3 text-sm">
            <div className="font-medium">{data.position.text}</div>
            <div className="mt-1 text-slate-400">
              {data.position.speedMph != null && (
                <span className="tabular-nums">{data.position.speedMph} mph </span>
              )}
              {data.position.bearing && <span>{data.position.bearing}</span>}
              {(data.position.milesFromOrigin != null ||
                data.position.milesToDestination != null) && (
                <span className="ml-2">
                  ·{" "}
                  {data.position.milesFromOrigin != null && (
                    <span>{data.position.milesFromOrigin} mi from origin</span>
                  )}
                  {data.position.milesFromOrigin != null &&
                    data.position.milesToDestination != null &&
                    " · "}
                  {data.position.milesToDestination != null && (
                    <span>{data.position.milesToDestination} mi to dest.</span>
                  )}
                </span>
              )}
            </div>
          </div>
        )}
      </section>

      {data.progress.length > 0 && (
        <section>
          <h2 className="px-1 pb-2 text-sm font-medium uppercase tracking-wide text-slate-400">
            Progress
          </h2>
          <ol className="border-l border-slate-800 pl-4 space-y-3 ml-1">
            {data.progress.map((p, i) => (
              <ProgressRow key={`${p.code}-${i}`} stop={p} />
            ))}
          </ol>
        </section>
      )}

      {data.recentPositions.length > 0 && (
        <section>
          <h2 className="px-1 pb-2 text-sm font-medium uppercase tracking-wide text-slate-400">
            Recent positions
          </h2>
          <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900/50">
            {data.recentPositions.map((p, i) => (
              <li key={i} className="px-4 py-2 flex gap-3 text-sm">
                <span className="font-mono text-slate-500 w-16 shrink-0">{to12h(p.time)}</span>
                <span className="text-slate-200">{p.text}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: TrainDetailPayload["status"] }) {
  const cls = {
    active: "bg-emerald-900/40 text-emerald-300 border-emerald-800",
    complete: "bg-slate-800 text-slate-400 border-slate-700",
    pending: "bg-amber-900/40 text-amber-300 border-amber-800",
    unknown: "bg-slate-800 text-slate-400 border-slate-700",
  }[status];
  return (
    <span className={`ml-auto rounded-full border px-2 py-0.5 text-xs ${cls}`}>
      {status}
    </span>
  );
}

function ProgressRow({ stop }: { stop: TrainProgressStop }) {
  const done = stop.event === "departed" || stop.event === "arrived";
  const dotColor = done
    ? "bg-emerald-500 ring-2 ring-emerald-500/30"
    : stop.early
      ? "bg-sky-400"
      : stop.delayMin != null && stop.delayMin > 0
        ? "bg-amber-400"
        : "bg-emerald-400";

  return (
    <li className={`relative ${done ? "opacity-70" : ""}`}>
      <span
        className={`absolute -left-[24px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full ${dotColor}`}
      >
        {done && (
          <svg viewBox="0 0 20 20" className="h-3 w-3 text-slate-950" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4L8.5 12l6.8-6.7a1 1 0 011.4 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </span>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="font-mono text-xs text-slate-500 w-10">{stop.code}</span>
        <span className={`truncate ${done ? "line-through decoration-slate-700" : ""}`}>
          {stop.station}
        </span>
        <span className="ml-auto text-right tabular-nums">
          {stop.time && <span>{to12h(stop.time)}</span>}
        </span>
      </div>
      <div className="ml-12 text-xs">
        <span
          className={`capitalize ${done ? "font-medium text-emerald-400" : "text-slate-500"}`}
        >
          {stop.event}
        </span>
        {stop.delayMin != null && (
          <span className={`ml-2 ${stop.early ? "text-sky-400" : "text-amber-400"}`}>
            {stop.delayMin} min {stop.early ? "early" : "late"}
          </span>
        )}
      </div>
    </li>
  );
}
