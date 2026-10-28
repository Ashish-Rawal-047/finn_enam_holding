const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = path.join(__dirname, '.chrome-temp');

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
  const port = 9444;
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    'http://localhost:4173/',
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
        callbacks.get(msg.id)(msg.result);
        callbacks.delete(msg.id);
      }
    };

    await new Promise((r) => (ws.onopen = r));
    console.log('Connected to Chrome DevTools Protocol');

    await send('Page.enable');
    await send('Runtime.enable');

    // 1. Mobile Phone (iPhone 14 Pro: 390 x 844, 2x DPR)
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
      fitWindow: false,
    });
    await sleep(600);

    // Diagnostics
    const evalData = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const overflowing = [];
          document.querySelectorAll('*').forEach(el => {
            if (el.scrollWidth > 390) {
              overflowing.push({
                tag: el.tagName,
                class: el.className.toString().slice(0, 50),
                scrollWidth: el.scrollWidth,
                clientWidth: el.clientWidth
              });
            }
          });
          return {
            windowWidth: window.innerWidth,
            bodyWidth: document.body.clientWidth,
            bodyScrollWidth: document.body.scrollWidth,
            overflowCount: overflowing.length,
            overflowing: overflowing.slice(0, 5)
          };
        })()
      `,
      returnByValue: true,
    });
    console.log('Mobile Layout Diagnostics:', JSON.stringify(evalData.result.value, null, 2));

    // Capture Screen 1: Today (Warm Editorial Light)
    const s1 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('finn-enam/redesign-mobile-today.png', Buffer.from(s1.data, 'base64'));
    console.log('Captured Screen 1 (Today)');

    // Click on first priority signal to capture Signal Detail Drawer
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const signalCard = document.querySelector('section:nth-of-type(3) .cursor-pointer');
          if (signalCard) signalCard.click();
        })()
      `,
    });
    await sleep(500);
    const sDetail = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('finn-enam/redesign-mobile-signal-detail.png', Buffer.from(sDetail.data, 'base64'));
    console.log('Captured Signal Detail Drawer');

    // Close detail drawer
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const closeBtn = document.querySelector('[aria-label="Close"]');
          if (closeBtn) closeBtn.click();
        })()
      `,
    });
    await sleep(300);

    // Switch to Screen 2: Signals
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const buttons = Array.from(document.querySelectorAll('nav button'));
          const btn = buttons.find(b => b.textContent.includes('Signals'));
          if (btn) btn.click();
        })()
      `,
    });
    await sleep(500);
    const s2 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('finn-enam/redesign-mobile-signals.png', Buffer.from(s2.data, 'base64'));
    console.log('Captured Screen 2 (Signals)');

    // Switch to Screen 3: Research
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const buttons = Array.from(document.querySelectorAll('nav button'));
          const btn = buttons.find(b => b.textContent.includes('Research'));
          if (btn) btn.click();
        })()
      `,
    });
    await sleep(500);
    const s3 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('finn-enam/redesign-mobile-research.png', Buffer.from(s3.data, 'base64'));
    console.log('Captured Screen 3 (Research)');

    // Switch to Screen 4: Event Memory
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const buttons = Array.from(document.querySelectorAll('nav button'));
          const btn = buttons.find(b => b.textContent.includes('Memory'));
          if (btn) btn.click();
        })()
      `,
    });
    await sleep(500);
    const s4 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('finn-enam/redesign-mobile-memory.png', Buffer.from(s4.data, 'base64'));
    console.log('Captured Screen 4 (Event Memory)');

    // Toggle to Dark Mode
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const themeBtn = document.querySelector('[aria-label="Toggle theme"]');
          if (themeBtn) themeBtn.click();
          const buttons = Array.from(document.querySelectorAll('nav button'));
          const todayBtn = buttons.find(b => b.textContent.includes('Today'));
          if (todayBtn) todayBtn.click();
        })()
      `,
    });
    await sleep(500);
    const sDark = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('finn-enam/redesign-mobile-dark-today.png', Buffer.from(sDark.data, 'base64'));
    console.log('Captured Dark Mode (Today)');

    // Switch back to light theme for desktop
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const themeBtn = document.querySelector('[aria-label="Toggle theme"]');
          if (themeBtn) themeBtn.click();
        })()
      `,
    });
    await sleep(200);

    // Desktop Layout (1280 x 800)
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false,
      fitWindow: false,
    });
    await sleep(500);
    const sDesktop = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('finn-enam/redesign-desktop-today.png', Buffer.from(sDesktop.data, 'base64'));
    console.log('Captured Desktop View');

    ws.close();
  } finally {
    chrome.kill();
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {}
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
