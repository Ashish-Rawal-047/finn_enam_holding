const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = path.join(__dirname, '.chrome-temp-audit');

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getTargets(port) {
  for (let i = 0; i < 20; i++) {
    try {
      const data = await new Promise((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${port}/json`, (res) => {
          let buf = '';
          res.on('data', (c) => (buf += c));
          res.on('end', () => resolve(JSON.parse(buf)));
        });
        req.on('error', reject);
      });
      return data;
    } catch {
      await sleep(250);
    }
  }
  throw new Error('Timed out waiting for Chrome CDP');
}

async function main() {
  const port = 9666;
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--window-size=390,844',
    '--force-device-scale-factor=1',
    'http://localhost:3001/',
  ]);

  try {
    const targets = await getTargets(port);
    const page = targets.find((t) => t.type === 'page');
    if (!page) throw new Error('No page target found');

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    let id = 1;
    const callbacks = new Map();

    function send(method, params = {}) {
      return new Promise((resolve) => {
        const msgId = id++;
        callbacks.set(msgId, resolve);
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    }

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && callbacks.has(msg.id)) {
        const cb = callbacks.get(msg.id);
        callbacks.delete(msg.id);
        cb(msg.result);
      }
    };

    await new Promise((resolve) => {
      ws.onopen = resolve;
    });

    await send('Page.enable');
    await send('Runtime.enable');
    await send('DOM.enable');

    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });

    await sleep(1500);

    // 1. Audit Screen 1: TODAY (Light Mode)
    const shotTodayLight = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(__dirname, 'audit-today-light.png'), Buffer.from(shotTodayLight.data, 'base64'));

    // Check DOM metrics on Today
    const metricsToday = await send('Runtime.evaluate', {
      expression: `(() => {
        return {
          windowWidth: window.innerWidth,
          scrollWidth: document.body.scrollWidth,
          overflow: document.body.scrollWidth > window.innerWidth,
          focalText: document.querySelector('h1')?.innerText,
          elementsCount: document.querySelectorAll('*').length,
        };
      })()`,
      returnByValue: true,
    });
    console.log('Today Screen Metrics:', metricsToday.result.value);

    // 2. Audit Screen 2: SIGNALS
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const b = btns.find(el => el.textContent && el.textContent.includes('Signals'));
        if (b) b.click();
      })()`,
    });
    await sleep(800);
    const shotSignals = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(__dirname, 'audit-signals.png'), Buffer.from(shotSignals.data, 'base64'));

    // Click on the first signal to inspect Signal Detail Drawer
    await send('Runtime.evaluate', {
      expression: `(() => {
        const cards = Array.from(document.querySelectorAll('.cursor-pointer'));
        if (cards[0]) cards[0].click();
      })()`,
    });
    await sleep(800);
    const shotSignalDetail = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(__dirname, 'audit-signal-detail.png'), Buffer.from(shotSignalDetail.data, 'base64'));

    // Close drawer
    await send('Runtime.evaluate', {
      expression: `(() => {
        const closeBtn = document.querySelector('button[aria-label="Close drawer"]');
        if (closeBtn) closeBtn.click();
      })()`,
    });
    await sleep(500);

    // 3. Audit Screen 3: RESEARCH
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const b = btns.find(el => el.textContent && el.textContent.includes('Research'));
        if (b) b.click();
      })()`,
    });
    await sleep(800);
    const shotResearch = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(__dirname, 'audit-research.png'), Buffer.from(shotResearch.data, 'base64'));

    // 4. Audit Screen 4: EVENT MEMORY
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const b = btns.find(el => el.textContent && el.textContent.includes('Memory'));
        if (b) b.click();
      })()`,
    });
    await sleep(800);
    const shotMemory = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(__dirname, 'audit-memory.png'), Buffer.from(shotMemory.data, 'base64'));

    // 5. Audit Watchlist & Sensitivity Drawer
    await send('Runtime.evaluate', {
      expression: `(() => {
        const settingsBtn = document.querySelector('button[aria-label="Settings"]');
        if (settingsBtn) settingsBtn.click();
      })()`,
    });
    await sleep(800);
    const shotSettings = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(__dirname, 'audit-settings.png'), Buffer.from(shotSettings.data, 'base64'));

    // Close settings drawer by clicking the backdrop or close button
    await send('Runtime.evaluate', {
      expression: `(() => {
        const closeBtn = document.querySelector('button[aria-label="Close drawer"]');
        if (closeBtn) {
          closeBtn.click();
        } else {
          const btns = Array.from(document.querySelectorAll('button'));
          const xBtn = btns.find(b => b.innerHTML.includes('line') || b.getAttribute('aria-label') === 'Close');
          if (xBtn) xBtn.click();
        }
      })()`,
    });
    await sleep(800);

    // 6. Audit Desktop Viewport (1280x800)
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false,
    });

    // Close any open modals
    await send('Runtime.evaluate', {
      expression: `(() => {
        const ackBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Acknowledge'));
        if (ackBtn) ackBtn.click();
        const closeBtns = Array.from(document.querySelectorAll('button')).filter(b => b.getAttribute('aria-label') === 'Close drawer' || b.getAttribute('aria-label') === 'Close');
        closeBtns.forEach(b => b.click());
      })()`,
    });
    await sleep(800);

    // Navigate to Today
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const b = btns.find(el => el.textContent && el.textContent.includes('Today'));
        if (b) b.click();
      })()`,
    });
    await sleep(800);
    const shotDesktop = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(__dirname, 'audit-desktop-clean.png'), Buffer.from(shotDesktop.data, 'base64'));

    console.log('Audited all screens and saved audit-*.png');

    ws.close();
  } finally {
    chrome.kill();
  }
}

main().catch(console.error);
