// Records an app demo: drives an Electron app (or any URL) through a scenario,
// saving timed frames for a GIF/MP4 plus named still screenshots.
//
// Usage (run with the Electron binary, not node):
//   <electron> record.mjs --scenario <scenario.mjs> --out <dir> (--app <main.js> | --url <url>)
//                         [--size 1200x760] [--interval 20] [--timeout 300]
//
// Scenario module:
//   export function setup({ app, dialog, electron, args }) {}  // optional, runs BEFORE the app loads
//   export default async function run(d) {}                     // drives the demo, see `d` below
import electron from 'electron';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const { app, dialog, BrowserWindow } = electron;

const args = {};
const argv = process.argv.slice(process.argv.findIndex((a) => a.endsWith('record.mjs')) + 1);
for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--'))
        args[argv[i].slice(2)] = argv[i + 1]?.startsWith('--') ? true : argv[++i];
}
for (const req of ['scenario', 'out']) {
    if (!args[req]) {
        console.error(`Missing --${req}`);
        process.exit(2);
    }
}
if (!args.app && !args.url) {
    console.error('Pass --app <main.js> or --url <url>');
    process.exit(2);
}

const OUT = path.resolve(args.out);
const FRAMES = path.join(OUT, 'frames');
const SHOTS = path.join(OUT, 'shots');
const [W, H] = (args.size ?? '1200x760').split('x').map(Number);
const INTERVAL = Number(args.interval ?? 20);
const TIMEOUT = Number(args.timeout ?? 300) * 1000;

for (const d of [FRAMES, SHOTS]) {
    fs.rmSync(d, { recursive: true, force: true });
    fs.mkdirSync(d, { recursive: true });
}
const LOG_FILE = path.join(OUT, 'log.txt');
fs.writeFileSync(LOG_FILE, '');
// Electron on Windows often swallows stdout, so everything also goes to log.txt
const log = (m) => {
    fs.appendFileSync(LOG_FILE, m + '\n');
    console.log(m);
};
const fail = (e) => {
    log('ERROR ' + (e?.stack ?? e));
    app.exit(1);
};
setTimeout(() => fail(`Timed out after ${TIMEOUT / 1000}s`), TIMEOUT).unref();

// A clean profile, so localStorage, recent files and window state start empty
const userData = path.join(OUT, 'userdata');
fs.rmSync(userData, { recursive: true, force: true });
app.setPath('userData', userData);

const scenario = await import(pathToFileURL(path.resolve(args.scenario)).href);
await scenario.setup?.({ app, dialog, electron, args });

if (args.app) await import(pathToFileURL(path.resolve(args.app)).href);

// Never `await app.whenReady()` at top level: Electron waits for this ESM entry to
// finish evaluating before it emits `ready`, so that await deadlocks.
app.whenReady().then(main).catch(fail);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
    let win;
    if (args.url) {
        win = new BrowserWindow({ width: W, height: H, show: true });
        win.setMenuBarVisibility(false);
        win.loadURL(args.url);
    } else {
        while (!(win = BrowserWindow.getAllWindows()[0])) await sleep(100);
    }
    win.setContentSize(W, H);
    // `did-finish-load` may already have fired before we got the window
    while (win.webContents.isLoading() || win.webContents.getURL() === '') await sleep(100);
    await sleep(800);
    log('loaded ' + win.webContents.getURL());

    const js = (code) => win.webContents.executeJavaScript(code);

    const CURSOR = `(() => {
      if (document.getElementById('__demo_cursor')) return true;
      const c = document.createElement('div');
      c.id = '__demo_cursor';
      c.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M3 2l7 19 2.5-7.5L20 11z" fill="white" stroke="black" stroke-width="1.5" stroke-linejoin="round"/></svg>';
      Object.assign(c.style, { position: 'fixed', left: (window.__demoX ?? innerWidth / 2) + 'px', top: (window.__demoY ?? innerHeight * 0.66) + 'px', zIndex: 2147483647, pointerEvents: 'none', transition: 'left .6s ease, top .6s ease, transform .15s' });
      document.documentElement.appendChild(c);
      return true;
    })()`;
    const ensureCursor = () => js(CURSOR);

    // ---- recording ----
    let frame = 0;
    let recording = null;
    const times = path.join(FRAMES, 'times.txt');
    async function loop(state) {
        while (state.on) {
            const img = await win.webContents.capturePage();
            const name = `f${String(frame++).padStart(5, '0')}.png`;
            fs.writeFileSync(path.join(FRAMES, name), img.toPNG());
            fs.appendFileSync(times, `${name} ${Date.now()}\n`);
            await sleep(INTERVAL);
        }
    }
    const record = {
        start() {
            if (recording) return;
            const state = { on: true };
            recording = { state, done: loop(state) };
        },
        async stop() {
            if (!recording) return;
            recording.state.on = false;
            await recording.done;
            recording = null;
        },
    };

    // ---- helpers handed to the scenario ----
    const q = JSON.stringify;
    async function waitFor(target, { timeout = 10000 } = {}) {
        const test =
            typeof target === 'string' ? `!!document.querySelector(${q(target)})` : `!!(${target})`;
        const end = Date.now() + timeout;
        while (Date.now() < end) {
            if (await js(test)) return;
            await sleep(100);
        }
        throw new Error(`waitFor timed out: ${target}`);
    }
    async function moveTo(sel) {
        await waitFor(sel);
        await ensureCursor();
        await js(`(() => {
          const el = document.querySelector(${q(sel)});
          el.scrollIntoView({ block: 'nearest' });
          const r = el.getBoundingClientRect();
          window.__demoX = r.left + r.width / 2; window.__demoY = r.top + r.height / 2;
          const c = document.getElementById('__demo_cursor');
          c.style.left = window.__demoX + 'px'; c.style.top = window.__demoY + 'px';
        })()`);
        await sleep(750);
    }
    const d = {
        win,
        electron,
        args,
        log,
        sleep,
        js,
        waitFor,
        record,
        moveTo,
        /** Move the cursor to `sel`, press, and click it. */
        async click(sel, { wait = 900 } = {}) {
            await moveTo(sel);
            await js(`(() => {
              const c = document.getElementById('__demo_cursor');
              c.style.transform = 'scale(.8)'; setTimeout(() => (c.style.transform = ''), 150);
              document.querySelector(${q(sel)}).click();
            })()`);
            await sleep(wait);
        },
        /** Type into an input one character at a time, firing input events. */
        async type(sel, text, { delay = 60, wait = 500 } = {}) {
            await moveTo(sel);
            await js(`document.querySelector(${q(sel)}).focus()`);
            for (const ch of text) {
                await js(`(() => {
                  const el = document.querySelector(${q(sel)});
                  el.value += ${q(ch)};
                  el.dispatchEvent(new Event('input', { bubbles: true }));
                })()`);
                await sleep(delay);
            }
            await js(
                `document.querySelector(${q(sel)}).dispatchEvent(new Event('change', { bubbles: true }))`,
            );
            await sleep(wait);
        },
        /** Give the element matching a JS expression an id and return its selector. */
        async tag(expr, id) {
            const ok = await js(
                `(() => { const el = (${expr}); if (!el) return false; el.id = ${q(id)}; return true; })()`,
            );
            if (!ok) throw new Error(`tag found nothing: ${expr}`);
            return '#' + id;
        },
        /** Save a still to shots/<name>.png, without the fake cursor. */
        async shot(name) {
            await js(
                `(() => { const c = document.getElementById('__demo_cursor'); if (c) c.style.visibility = 'hidden'; })()`,
            );
            await sleep(150);
            const img = await win.webContents.capturePage();
            fs.writeFileSync(path.join(SHOTS, name + '.png'), img.toPNG());
            await js(
                `(() => { const c = document.getElementById('__demo_cursor'); if (c) c.style.visibility = ''; })()`,
            );
            log('shot ' + name);
        },
    };

    await ensureCursor();
    await scenario.default(d);
    await record.stop();
    log(`done: ${frame} frames`);
    app.exit(0);
}
