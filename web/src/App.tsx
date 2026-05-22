import type { ReactNode } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";

export default function App() {
  return (
    <div className="min-h-full flex flex-col mx-auto max-w-2xl">
      <header className="sticky top-0 z-10 bg-slate-950/85 backdrop-blur border-b border-slate-800">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link to="/" className="text-sky-400 font-bold text-lg tracking-tight">
            RailRat
          </Link>
          <span className="text-slate-500 text-sm">pretty view</span>
          <nav className="ml-auto flex gap-1 text-sm">
            <Tab to="/" end>Routes</Tab>
            <Tab to="/trains">Trains</Tab>
            <Tab to="/stations">Stations</Tab>
          </nav>
        </div>
      </header>
      <main className="flex-1 px-4 py-4">
        <Outlet />
      </main>
      <footer className="px-4 py-6 text-xs text-slate-500 text-center">
        Data scraped from{" "}
        <a className="underline hover:text-slate-300" href="https://railrat.net" target="_blank" rel="noreferrer">
          railrat.net
        </a>
        . Unofficial. Source: Amtrak.
      </footer>
    </div>
  );
}

function Tab({ to, end, children }: { to: string; end?: boolean; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `px-3 py-1.5 rounded-md ${isActive ? "bg-slate-800 text-sky-300" : "text-slate-300 hover:bg-slate-900"}`
      }
    >
      {children}
    </NavLink>
  );
}
