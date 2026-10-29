/**
 * FINN Live UI & Brand Verification Suite
 * Controls headless Chrome via native Chrome DevTools Protocol (CDP)
 * Audits Native Mobile Expo (8081) and Web Client (5173)
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9222;
const USER_DATA_DIR = path.join(os.tmpdir(), `chrome-test-${Date.now()}`);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        if (data.id && this.callbacks.has(data.id)) {
          const { resolve, reject } = this.callbacks.get(data.id);
          this.callbacks.delete(data.id);
          if (data.error) reject(new Error(data.error.message));
          else resolve(data.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res.result?.value;
  }

  async captureScreenshot(outputPath) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(outputPath, Buffer.from(res.data, 'base64'));
    console.log(`  [SCREENSHOT] Saved: ${outputPath} (${(res.data.length / 1024).toFixed(1)} KB)`);
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function run() {
  console.log('====================================================');
  console.log('      FINN LIVE UI & BRAND VERIFICATION SUITE       ');
  console.log('====================================================\n');

  console.log('1. Launching Headless Chrome on port', PORT);
  const chromeProcess = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${USER_DATA_DIR}`,
    'about:blank',
  ]);

  await sleep(1500);

  try {
    // 2. Discover target
    const listRes = await fetch(`http://localhost:${PORT}/json/list`);
    const targets = await listRes.json();
    const pageTarget = targets.find((t) => t.type === 'page');
    if (!pageTarget) throw new Error('No page target discovered');

    const cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('DOM.enable');

    // ------------------------------------------------------------------------
    // AUDIT 1: Native Mobile Application (Expo on Port 8081)
    // ------------------------------------------------------------------------
    console.log('\n--- AUDITING EXPO NATIVE MOBILE APP (http://localhost:8081) ---');

    // Set iPhone 14 Pro Mobile Viewport (390 x 844, scale factor 2)
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });

    console.log('Navigating to http://localhost:8081...');
    await cdp.send('Page.navigate', { url: 'http://localhost:8081' });

    // Wait for bundling & rendering
    let rendered = false;
    for (let i = 0; i < 30; i++) {
      await sleep(1000);
      const text = await cdp.evaluate('document.body.innerText');
      if (text && (text.includes('FINN') || text.includes('ENAM INTEL') || text.includes('Morning Briefing') || text.includes('TODAY'))) {
        rendered = true;
        console.log(`App rendered successfully after ${i + 1}s!`);
        break;
      }
    }

    if (!rendered) {
      console.warn('Timeout waiting for text, taking debug screenshot...');
    }

    // Inspect Logo & Brand Elements
    const logoAudit = await cdp.evaluate(`
      (() => {
        const svgs = document.querySelectorAll('svg');
        const hasSvgLogo = svgs.length > 0;
        const brandText = document.body.innerText.includes('FINN');
        const anamIntel = document.body.innerText.includes('ENAM INTEL');
        const header = document.querySelector('div');
        return {
          totalSvgs: svgs.length,
          hasSvgLogo,
          brandText,
          anamIntel
        };
      })()
    `);
    console.log('Mobile Brand Audit:', logoAudit);

    // Capture Screen 1: Today
    await sleep(1000);
    const screen1Path = 'finn-enam/mobile/screenshots/mobile-screen1-today.png';
    await cdp.captureScreenshot(screen1Path);

    // Helper to click RN Web tab
    const selectTab = async (index, name) => {
      console.log(`Switching tab to ${name} (index ${index})...`);
      const clicked = await cdp.evaluate(`
        (() => {
          const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
          const el = tabs[${index}];
          if (!el) return false;
          const rect = el.getBoundingClientRect();
          const clientX = rect.left + rect.width / 2;
          const clientY = rect.top + rect.height / 2;
          const opts = { bubbles: true, cancelable: true, clientX, clientY };
          el.dispatchEvent(new PointerEvent('pointerdown', opts));
          el.dispatchEvent(new MouseEvent('mousedown', opts));
          el.dispatchEvent(new PointerEvent('pointerup', opts));
          el.dispatchEvent(new MouseEvent('mouseup', opts));
          el.dispatchEvent(new MouseEvent('click', opts));
          return true;
        })()
      `);
      console.log(`  Tab ${name} clicked:`, clicked);
      await sleep(1500);
    };

    // Navigate to Signals tab (index 1)
    await selectTab(1, 'Signals');
    await cdp.captureScreenshot('finn-enam/mobile/screenshots/mobile-screen2-signals.png');

    // Navigate to Research tab (index 2)
    await selectTab(2, 'Research');
    await cdp.captureScreenshot('finn-enam/mobile/screenshots/mobile-screen3-research.png');

    // Navigate to Event Memory tab (index 3)
    await selectTab(3, 'Memory');
    await cdp.captureScreenshot('finn-enam/mobile/screenshots/mobile-screen4-memory.png');

    // ------------------------------------------------------------------------
    // AUDIT 2: Web Client Application (Vite on Port 5173)
    // ------------------------------------------------------------------------
    console.log('\n--- AUDITING WEB CLIENT APP (http://localhost:5173) ---');
    await cdp.send('Page.navigate', { url: 'http://localhost:5173' });
    await sleep(1500);

    const webAudit = await cdp.evaluate(`
      (() => {
        const svgLogo = document.querySelector('header svg');
        const headerBg = window.getComputedStyle(document.querySelector('header')).backgroundColor;
        const bodyBg = window.getComputedStyle(document.body).backgroundColor;
        return {
          hasSvgLogoInHeader: Boolean(svgLogo),
          headerBg,
          bodyBg
        };
      })()
    `);
    console.log('Web Client Brand Audit:', webAudit);

    await cdp.captureScreenshot('finn-enam/screenshots/web-mobile-screen1-today.png');

    // Desktop view
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 2,
      mobile: false,
    });
    await sleep(800);
    await cdp.captureScreenshot('finn-enam/screenshots/web-desktop-screen1-today.png');

    cdp.close();
    console.log('\nAll UI audits and screenshots completed successfully!');
  } finally {
    chromeProcess.kill();
    try {
      fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
    } catch {}
  }
}

run().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
