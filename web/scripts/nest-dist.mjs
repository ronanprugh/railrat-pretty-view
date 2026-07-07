// Move every built file under dist/RRPrettyView/ so it lines up with the
// baked-in /RRPrettyView/ base. Then drop a _redirects at dist root that:
//   - bounces pages.dev/ to pages.dev/RRPrettyView/
//   - serves index.html for any deep-link path (SPA fallback)
import { readdirSync, renameSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dist = "dist";
const subdir = "RRPrettyView";
const target = join(dist, subdir);

mkdirSync(target, { recursive: true });

for (const entry of readdirSync(dist)) {
  if (entry === subdir) continue;
  renameSync(join(dist, entry), join(target, entry));
}

const redirects = [
  "/                     /RRPrettyView/            302",
  "/RRPrettyView         /RRPrettyView/            301",
  "/RRPrettyView/*       /RRPrettyView/index.html  200",
  "",
].join("\n");

writeFileSync(join(dist, "_redirects"), redirects);

console.log(`nested dist/* -> dist/${subdir}/ and wrote _redirects`);
