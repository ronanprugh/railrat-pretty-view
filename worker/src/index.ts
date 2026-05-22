import { parseRoutes } from "./parseRoutes.ts";
import { parseRouteDetail } from "./parseRouteDetail.ts";
import { parseTrainsIndex } from "./parseTrainsIndex.ts";
import { parseTrainDetail } from "./parseTrainDetail.ts";
import { parseStationsIndex } from "./parseStationsIndex.ts";
import { parseStationDetail } from "./parseStationDetail.ts";

type Env = { UPSTREAM: string };

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,OPTIONS",
  "access-control-allow-headers": "content-type",
};

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=30",
      ...CORS,
      ...(init.headers ?? {}),
    },
  });

async function fetchHtml(env: Env, path: string): Promise<string> {
  const url = new URL(path, env.UPSTREAM).toString();
  const r = await fetch(url, {
    headers: { "user-agent": "railrat-pretty-view/0.1 (+github)" },
    cf: { cacheTtl: 30, cacheEverything: true },
  });
  if (!r.ok) throw new Error(`upstream ${r.status} for ${path}`);
  return r.text();
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

    const { pathname } = new URL(req.url);

    try {
      if (pathname === "/api/routes") {
        const html = await fetchHtml(env, "/");
        return json(parseRoutes(html));
      }
      const r = pathname.match(/^\/api\/routes\/([A-Za-z0-9_-]+)\/?$/);
      if (r) {
        const slug = r[1];
        const html = await fetchHtml(env, `/routes/${slug}/`);
        return json(parseRouteDetail(html, slug));
      }
      if (pathname === "/api/trains") {
        const html = await fetchHtml(env, "/trains/");
        return json(parseTrainsIndex(html));
      }
      const t = pathname.match(/^\/api\/trains\/(\d+)\/?$/);
      if (t) {
        const num = t[1];
        const html = await fetchHtml(env, `/trains/${num}/`);
        return json(parseTrainDetail(html, num));
      }
      if (pathname === "/api/stations") {
        const html = await fetchHtml(env, "/stations/");
        return json(parseStationsIndex(html));
      }
      const s = pathname.match(/^\/api\/stations\/([A-Z]+)\/?$/);
      if (s) {
        const code = s[1];
        const html = await fetchHtml(env, `/stations/${code}/`);
        return json(parseStationDetail(html, code));
      }
      return json({ error: "not found" }, { status: 404 });
    } catch (e) {
      return json({ error: String(e instanceof Error ? e.message : e) }, { status: 502 });
    }
  },
};
