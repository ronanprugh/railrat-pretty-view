import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getStation, type StationDetailPayload, type StationTrain } from "../api";
import { to12h } from "../format";

export default function StationDetail() {
  const { code = "" } = useParams();
  const [data, setData] = useState<StationDetailPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    setErr(null);
    getStation(code).then(setData).catch((e) => setErr(String(e)));
  }, [code]);

  if (err) return <p className="text-red-400">Failed to load: {err}</p>;
  if (!data) return <p className="text-slate-400">Loading…</p>;

  return (
    <div className="space-y-4">
      <div>
        <Link to="/stations" className="text-sm text-sky-400">‹ All stations</Link>
        <div className="mt-1 flex items-baseline gap-2 flex-wrap">
          <h1 className="text-2xl font-semibold">{data.name}</h1>
          <span className="font-mono text-sm text-slate-500">[{data.code}]</span>
        </div>
      </div>

      {data.arriving.length > 0 && (
        <Section title="Arriving" tone="text-emerald-400" trains={data.arriving} kind="arr" />
      )}

      {data.departed.length > 0 && (
        <Section title="Departed" tone="text-slate-400" trains={data.departed} kind="dep" />
      )}

      {data.connectingServices.length > 0 && (
        <section>
          <h2 className="px-1 pb-2 text-sm font-medium uppercase tracking-wide text-slate-400">
            Connecting services
          </h2>
          <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900/50">
            {data.connectingServices.map((c) => (
              <li key={c.url}>
                <a
                  href={c.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block px-4 py-3 text-sky-300 hover:bg-slate-800/50"
                >
                  {c.name}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.lastUpdated && (
        <p className="text-xs text-slate-500">Updated {data.lastUpdated}</p>
      )}
    </div>
  );
}

function Section({
  title,
  tone,
  trains,
  kind,
}: {
  title: string;
  tone: string;
  trains: StationTrain[];
  kind: "arr" | "dep";
}) {
  return (
    <section>
      <h2 className={`px-1 pb-2 text-sm font-medium uppercase tracking-wide ${tone}`}>
        {title} <span className="text-slate-500">({trains.length})</span>
      </h2>
      <ul className="space-y-2">
        {trains.map((t, i) => (
          <TrainRow key={`${t.trainNumber}-${i}`} train={t} kind={kind} />
        ))}
      </ul>
    </section>
  );
}

function TrainRow({ train, kind }: { train: StationTrain; kind: "arr" | "dep" }) {
  const delayTone =
    train.delayClass === "ontime"
      ? "text-emerald-400"
      : train.delayClass === "early"
        ? "text-sky-400"
        : train.delayClass === "verylate"
          ? "text-red-400"
          : train.delayClass === "late"
            ? "text-amber-400"
            : "text-slate-400";

  return (
    <li className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
      <div className="flex items-baseline gap-3">
        <span className="tabular-nums text-lg font-semibold">{to12h(train.time)}</span>
        <Link
          to={`/trains/${train.trainNumber}`}
          className="text-sky-300 hover:text-sky-200 truncate"
        >
          {train.trainLabel}
        </Link>
        {train.delay && kind === "arr" && (
          <span className={`ml-auto text-sm ${delayTone}`}>{train.delay}</span>
        )}
      </div>

      {(train.origin || train.destination) && (
        <div className="mt-1 text-sm text-slate-400 truncate">
          {train.origin ?? "?"} <span className="text-slate-600">→</span>{" "}
          {train.destination ?? "?"}
        </div>
      )}

      <Times train={train} />
    </li>
  );
}

function Times({ train }: { train: StationTrain }) {
  const arrParts: string[] = [];
  if (train.scheduledArrival) arrParts.push(`sch ${to12h(train.scheduledArrival)}`);
  if (train.estimatedArrival) arrParts.push(`est ${to12h(train.estimatedArrival)}`);
  if (train.actualArrival) arrParts.push(`act ${to12h(train.actualArrival)}`);

  const depParts: string[] = [];
  if (train.scheduledDeparture) depParts.push(`sch ${to12h(train.scheduledDeparture)}`);
  if (train.estimatedDeparture) depParts.push(`est ${to12h(train.estimatedDeparture)}`);
  if (train.actualDeparture) depParts.push(`act ${to12h(train.actualDeparture)}`);

  if (!arrParts.length && !depParts.length) return null;
  return (
    <div className="mt-2 grid gap-y-0.5 grid-cols-[auto_1fr] text-xs text-slate-500">
      {arrParts.length > 0 && (
        <>
          <span className="pr-2">Ar</span>
          <span className="tabular-nums">{arrParts.join(" · ")}</span>
        </>
      )}
      {depParts.length > 0 && (
        <>
          <span className="pr-2">Dp</span>
          <span className="tabular-nums">{depParts.join(" · ")}</span>
        </>
      )}
    </div>
  );
}
