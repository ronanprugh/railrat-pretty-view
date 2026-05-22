import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getStations, type StationsIndexPayload } from "../api";

export default function StationsList() {
  const [data, setData] = useState<StationsIndexPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    getStations().then(setData).catch((e) => setErr(String(e)));
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return data.stations;
    return data.stations.filter(
      (s) =>
        s.code.toLowerCase().includes(needle) ||
        s.name.toLowerCase().includes(needle)
    );
  }, [data, q]);

  if (err) return <p className="text-red-400">Failed to load: {err}</p>;
  if (!data) return <p className="text-slate-400">Loading stations…</p>;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <h1 className="text-lg font-semibold">Stations</h1>
        <p className="mt-1 text-sm text-slate-400">
          {data.stations.length} Amtrak stations.
        </p>
        <input
          placeholder="Filter by name or code…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-base placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
        />
      </section>

      {filtered.length === 0 ? (
        <p className="text-slate-400">No stations match “{q}”.</p>
      ) : (
        <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900/50">
          {filtered.map((s) => (
            <li key={s.code}>
              <Link
                to={`/stations/${s.code}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800/50 active:bg-slate-800"
              >
                <span className="font-mono text-xs text-slate-500 w-12 shrink-0">
                  {s.code}
                </span>
                <span className="flex-1 truncate">{s.name}</span>
                <span aria-hidden className="text-slate-600">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {data.lastUpdated && (
        <p className="text-xs text-slate-500">Updated {data.lastUpdated}</p>
      )}
    </div>
  );
}
