---
name: app-demo
description: Record a demo GIF, video or screenshots of an Electron or web app for a README, docs page or release. Use when asked for an app demo, walkthrough recording, or fresh screenshots of the app in use.
---

# App demo

Drive the real app through a scripted **storyboard**, record timed frames with a fake cursor, and render them into a GIF/MP4 plus still screenshots. Everything runs on the agent's machine: [`scripts/record.mjs`](scripts/record.mjs) (Electron driver), [`scripts/render.py`](scripts/render.py) (frames → GIF/MP4), ffmpeg and Python on PATH. Work in the scratchpad; only the finished assets go into the repo. `<skill>` below is this skill's base directory.

## 1. Storyboard

Write 4–7 **beats**: one user action each, ending on a screen that looks different. A beat whose action leaves the screen unchanged is dead air (turning on a camera option whose preview stays the same tells the viewer nothing), so pick actions with a visible **payoff**, and put the app's headline feature in the middle. Name the stills to capture (one per README step is typical). Aim for 15–30 s.

Done when every beat names its action, its payoff, and the selector it clicks (read the UI source for ids).

## 2. Demo content

Build realistic content the app can show: real images and video, not test patterns. [`media.md`](media.md) has openly licensed sources and ffmpeg recipes; read it whenever the app displays media.

Everything on screen gets published, so keep it **neutral**:

- Paths: put the content under a short path. On Windows, `subst L: <scratch>\demo` shows `L:\Film Night` instead of a user folder; `subst L: /D` removes it afterwards.
- Names and text: invented, generic (a "Film Night" playlist, "Alex Rivera" as host), never the user's own data, org or accounts.
- App state: `record.mjs` starts from an empty profile, so recent lists and settings show only what the demo creates.

## 3. Scenario

Build the app first (its own build script), then copy [`scripts/example-scenario.mjs`](scripts/example-scenario.mjs) to the scratchpad and rewrite `run` from the storyboard. The scenario gets a driver `d`:

| Helper                                                   | Does                                                                                                |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `d.record.start()` / `await d.record.stop()`             | Start / stop capturing frames                                                                       |
| `await d.click(sel, { wait })`                           | Glide the cursor to `sel`, press, click, then wait `wait` ms (default 900) for the payoff to render |
| `await d.type(sel, text)`                                | Type into an input character by character                                                           |
| `await d.moveTo(sel)`                                    | Glide the cursor without clicking                                                                   |
| `await d.waitFor(sel or jsExpr)`                         | Wait for async rendering                                                                            |
| `await d.tag(jsExpr, id)`                                | Give the element a JS expression finds an id; returns `#id` for `click`                             |
| `await d.shot(name)`                                     | Save `shots/<name>.png` with the cursor hidden                                                      |
| `await d.js(code)`, `d.log(msg)`, `d.sleep(ms)`, `d.win` | Escape hatches                                                                                      |

`export function setup({ dialog, app })` runs before the app loads: stub `dialog.showOpenDialog*` and anything else native that would block the run. End the scenario by reading back app state with `d.js` and logging it, so the log proves the demo's actions actually took effect.

## 4. Record

```sh
<electron> <skill>/scripts/record.mjs --app <repo>/<package.json "main"> --scenario <scratch>/scenario.mjs --out <scratch>/rec
```

- `<electron>` is the binary itself, `<repo>/node_modules/electron/dist/electron.exe` on Windows. `npx electron` swallows the output.
- For a web app, pass `--url http://localhost:5173` instead of `--app`; with no Electron in the project, use `npx -y electron@<version you know>` as `<electron>`.
- Options: `--size 1200x760` (window content size), `--timeout 300` (seconds).

Then read `<out>/log.txt`: it ends with `done: N frames` on success, or an `ERROR` with the stack.

## 5. Review

```sh
python <skill>/scripts/render.py <scratch>/rec --gif <scratch>/demo.gif --sheet <scratch>/sheet.png
```

Read the contact sheet and every still. Done when each beat's payoff is visible in the sheet, and no frame shows a personal path or name, a black or half-loaded thumbnail you didn't intend, an error toast, or a stalled cursor. Fix the scenario or content and record again until it passes; three or four rounds is normal.

## 6. Render and publish

Render the final GIF (`--end-hold` sets how long the last frame stays, `--trim-start`/`--trim-end` cut dead time). Keep it under 5 MB at 960 px wide: GitHub renders larger ones slowly. Add `--mp4` when the target is a website or release notes.

Put the outputs in the repo's `assets/` folder as `<app>-demo.gif` and `<app>-<step>.png`, plus `assets/CREDITS.md` when [`media.md`](media.md) sources were used. In the README, link the GIF to a full-size still, write alt text that narrates the beats, and add a one-line caption with the credits link. Remove any `subst` drive when done.

## Gotchas

- Electron waits for the ESM entry to finish before emitting `ready`, so a top-level `await app.whenReady()` deadlocks. `record.mjs` already avoids it; keep scenario `setup` synchronous or quick.
- Frames come at about 5 fps (`capturePage` is slow). `render.py` replays them at real time, so UI motion looks right; keep cursor glides at the default 0.6 s.
- A styled checkbox or radio is usually a hidden `<input>`: click its `<label>` (via `d.tag(... .closest('label'))`).
- If the app persists settings outside `userData` (a config file in the content folder, the registry), reset them in `setup` so each run starts the same.
- A behaviour that looks wrong on screen during the demo may be a real app bug: report it to the user rather than only scripting around it.
