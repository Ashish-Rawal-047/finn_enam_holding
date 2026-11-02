/**
 * Responsive UI audit over the Chrome DevTools Protocol (no extra dependencies).
 *
 *   APP_URL=http://localhost:3001 node scripts/ui-audit.mjs
 *
 * Registers a throwaway user, loads the demo portfolio, then for each viewport visits all
 * five tabs (plus the company signal screen) and reports:
 *   - horizontal overflow (document wider than the viewport, and the offending elements)
 *   - visible touch targets smaller than 40×40 CSS px in the bottom navigation
 *   - number of primary navigation tabs
 * Screenshots go to screenshots/audit/.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const APP = process.env.APP_URL ?? 'http://localhost:3001';
const CHROME = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9333;
const OUT = path.resolve('screenshots', 'audit');
const VIEWPORTS = [
  { name: 'iphone-390x844', width: 390, height: 844, mobile: true, scale: 3 },
  { name: 'iphone-430x932', width: 430, height: 932, mobile: true, scale: 3 },
  { name: 'tablet-768x1024', width: 768, height: 1024, mobile: true, scale: 2 },
  { name: 'desktop-1440x900', width: 1440, height: 900, mobile: false, scale: 1 },
];
const TABS = ['Home', 'Signals', 'Research', 'Event Memory', 'Settings'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

const userDir = fs.mkdtempSync(path.join(os.tmpdir(), 'finn-audit-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDir}`, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });

async function connect() {
  for (let i = 0; i < 40; i++) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = targets.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {
      /* not up yet */
    }
    await sleep(250);
  }
  throw new Error('Chrome did not start');
}

const ws = new WebSocket(await connect());
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let seq = 0;
const pending = new Map();
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, (msg) => (msg.error ? reject(new Error(`${method}: ${msg.error.message}`)) : resolve(msg.result)));
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'evaluate failed');
  return r.result.value;
};
const navigate = async (url) => {
  await send('Page.navigate', { url });
  await sleep(2500);
};
const shot = async (name) => {
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(data, 'base64'));
};

await send('Page.enable');
await send('Runtime.enable');

// Sign in a fresh user with the demo portfolio (same-origin fetch so the cookie is set).
await navigate(APP);
const email = `audit.${Date.now()}@finn.test`;
const setup = await evaluate(`(async () => {
  const r = await fetch('/api/auth/register', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: '${email}', password: 'AuditPassw0rd!', fullName: 'Ashish Rawal' }) });
  const body = await r.json();
  const d = await fetch('/api/portfolio/demo', { method: 'POST', headers: { Authorization: 'Bearer ' + body.accessToken } });
  return { register: r.status, demo: d.status };
})()`);
console.log('[audit] setup', setup);

const report = [];
for (const vp of VIEWPORTS) {
  await send('Emulation.setDeviceMetricsOverride', { width: vp.width, height: vp.height, deviceScaleFactor: vp.scale, mobile: vp.mobile });
  await send('Emulation.setTouchEmulationEnabled', { enabled: vp.mobile });
  await navigate(APP);

  const navInfo = await evaluate(`(() => {
    const navs = [...document.querySelectorAll('nav[aria-label="Primary"]')].filter((n) => n.offsetParent !== null || getComputedStyle(n).position === 'fixed' && n.getBoundingClientRect().height > 0);
    const visible = navs.find((n) => n.getBoundingClientRect().width > 0);
    const buttons = visible ? [...visible.querySelectorAll('button')] : [];
    return { tabs: buttons.length, labels: buttons.map((b) => b.textContent.trim()),
      small: buttons.filter((b) => { const r = b.getBoundingClientRect(); return r.width < 40 || r.height < 40; }).length,
      position: visible ? getComputedStyle(visible).position : null };
  })()`);

  for (const label of TABS) {
    await evaluate(`(() => {
      const navs = [...document.querySelectorAll('nav[aria-label="Primary"]')].filter((n) => n.getBoundingClientRect().width > 0);
      const b = navs.flatMap((n) => [...n.querySelectorAll('button')]).find((x) => x.textContent.includes(${JSON.stringify(label)}) || (${JSON.stringify(label)} === 'Event Memory' && x.textContent.includes('Memory')));
      b && b.click();
    })()`);
    await sleep(1800);
    const overflow = await evaluate(`(() => {
      const w = window.innerWidth;
      const offenders = [...document.querySelectorAll('body *')].filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.right > w + 1 && getComputedStyle(el).position !== 'fixed' && !el.closest('.overflow-x-auto, .overflow-auto');
      }).slice(0, 5).map((el) => el.tagName.toLowerCase() + '.' + String(el.className).split(' ').slice(0, 3).join('.'));
      return { scrollWidth: document.documentElement.scrollWidth, innerWidth: w, offenders };
    })()`);
    const name = `${vp.name}-${label.toLowerCase().replace(/\s+/g, '-')}`;
    await shot(name);
    report.push({ viewport: vp.name, tab: label, horizontalOverflow: overflow.scrollWidth > overflow.innerWidth, offenders: overflow.offenders.join(' | ') || '-' });
  }

  // Company signal screen (chart) from the Signals tab.
  await evaluate(`(() => {
    const navs = [...document.querySelectorAll('nav[aria-label="Primary"]')].filter((n) => n.getBoundingClientRect().width > 0);
    navs.flatMap((n) => [...n.querySelectorAll('button')]).find((x) => x.textContent.includes('Signals'))?.click();
  })()`);
  await sleep(1500);
  await evaluate(`document.querySelector('main button.flex.w-full.items-center')?.click()`);
  await sleep(2500);
  const sheet = await evaluate(`({ open: !!document.querySelector('[role=dialog]'), svg: !!document.querySelector('[role=dialog] svg[role=img]'), scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth })`);
  await shot(`${vp.name}-company-signal-screen`);
  report.push({ viewport: vp.name, tab: 'Company screen', horizontalOverflow: sheet.scrollWidth > sheet.innerWidth, offenders: sheet.open && sheet.svg ? 'chart rendered' : 'CHART MISSING' });
  console.log(`[audit] ${vp.name}: nav tabs=${navInfo.tabs} (${navInfo.labels.join(', ')}), small targets=${navInfo.small}, nav position=${navInfo.position}`);
}

console.table(report);
const failures = report.filter((r) => r.horizontalOverflow || r.offenders === 'CHART MISSING');
console.log(failures.length ? `[audit] FAIL: ${failures.length} issue(s)` : '[audit] PASS: no horizontal overflow at any viewport; all screens rendered');
ws.close();
chrome.kill();
process.exit(failures.length ? 1 : 0);
