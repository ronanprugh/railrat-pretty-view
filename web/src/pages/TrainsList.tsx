import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getTrains, type TrainsIndexPayload } from "../api";

export default function TrainsList() {
  const [data, setData] = useState<TrainsIndexPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    getTrains().then(setData).catch((e) => setErr(String(e)));
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return data.groups;
    return data.groups
      .map((g) => ({
        ...g,
        trains: g.trains.filter(
          (t) => t.number.includes(needle) || g.routeName.toLowerCase().includes(needle)
        ),
      }))
      .filter((g) => g.trains.length > 0);
  }, [data, q]);

  if (err) return <p className="text-red-400">Failed to load: {err}</p>;
  if (!data) return <p className="text-slate-400">Loading trains…</p>;

  const totalTrains = data.groups.reduce((a, g) => a + g.trains.length, 0);
  const recentCount = data.groups.reduce(
    (a, g) => a + g.trains.filter((t) => t.recent).length,
    0
  );

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <h1 className="text-lg font-semibold">Trains</h1>
        <p className="mt-1 text-sm text-slate-400">
          {totalTrains.toLocaleString()} trains tracked · {recentCount} with recent updates (highlighted).
        </p>
        <input
          inputMode="numeric"
          placeholder="Filter by train # or route…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-base placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
        />
      </section>

      {filtered.length === 0 && (
        <p className="text-slate-400">No trains match “{q}”.</p>
      )}

      {filtered.map((g) => (
        <section key={g.routeSlug}>
          <h2 className="px-1 pb-2 text-sm font-medium uppercase tracking-wide text-slate-400">
            <Link to={`/routes/${g.routeSlug}`} className="hover:text-slate-200">
              {g.routeName}
            </Link>
          </h2>
          <div className="flex flex-wrap gap-2">
            {g.trains.map((t) => (
              <Link
                key={t.number}
                to={`/trains/${t.number}`}
                className={
                  "rounded-md border px-3 py-1.5 text-sm tabular-nums " +
                  (t.recent
                    ? "border-sky-700 bg-sky-900/40 text-sky-200"
                    : "border-slate-800 bg-slate-900/50 text-slate-300 hover:bg-slate-800/60")
                }
              >
                {t.number}
              </Link>
            ))}
          </div>
        </section>
      ))}

      {data.lastUpdated && (
        <p className="text-xs text-slate-500">Updated {data.lastUpdated}</p>
      )}
    </div>
  );
}
