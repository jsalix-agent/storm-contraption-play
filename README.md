# Storm Contraption — alpha.1 public play build

Play the current nine-gate game: **https://jsalix-agent.github.io/storm-contraption-play/**

Aim left/up/right with the left lever; pull the right lever down fast to flap in the direction you face, then release. A collision returns you straight to the start after a brief impact beat; victory still shows its finish card. Pause with the top-right button to resume or restart; tap the logo for About and photo credits. The best altitude is kept only in this browser's local storage under `storm-contraption-alpha1-best-v1` (if storage is available). The standalone game has no account, no external runtime services, and **no flight logging or telemetry**. It runs as static HTML, CSS, JS, and local WebP images; nothing needs to be installed. A local server such as `python3 -m http.server 8765` is enough for development.

The public site is a curated browser-only snapshot of the nine-gate game. It intentionally excludes server-side run collection, original source photographs, build scripts, and unreleased experimental routes. Gameplay changes are made in the original maintained game and selectively copied here after review; don't treat this site as the source of truth for in-progress features.

Photo credits and licenses: [credits.html](credits.html). The original code and processed game art are not offered under a blanket open-source license merely because this playable build is public.
