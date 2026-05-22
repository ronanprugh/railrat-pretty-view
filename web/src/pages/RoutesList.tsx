import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getRoutes, type RoutesPayload } from "../api";

export default function RoutesList() {
  const [data, setData] = useState<RoutesPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    getRoutes().then(setData).catch((e) => setErr(String(e)));
  }, []);

  if (err) return <p className="text-red-400">Failed to load: {err}</p>;
  if (!data) return <p className="text-slate-400">Loading routes…</p>;

  const { totals, routes, lastUpdated } = data;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <h1 className="text-lg font-semibold">System status</h1>
        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
          <Stat label="Active" value={totals.active} tone="text-emerald-400" />
          <Stat label="Pending" value={totals.pending} tone="text-amber-400" />
          <Stat label="Complete" value={totals.complete} tone="text-slate-400" />
        </div>
        {lastUpdated && (
          <p className="mt-3 text-xs text-slate-500">Updated {lastUpdated}</p>
        )}
      </section>

      <section>
        <h2 className="px-1 pb-2 text-sm font-medium uppercase tracking-wide text-slate-400">
          Routes
        </h2>
        <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900/50">
          {routes.map((r) => (
            <li key={r.slug}>
              <Link
                to={`/routes/${r.slug}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800/50 active:bg-slate-800"
              >
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{r.name}</div>
                  <div className="text-xs text-slate-500">
                    {r.active} active · {r.pending} pending · {r.complete} done
                  </div>
                </div>
                <span aria-hidden className="text-slate-600">›</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-lg bg-slate-950/60 py-2">
      <div className={`text-2xl font-bold ${tone}`}>{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}
