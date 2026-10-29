const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = path.join(__dirname, '.chrome-temp-e2e');

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
  const port = 9555;
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

    // 1. Click Research Nav Button
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const researchBtn = btns.find(b => b.textContent && b.textContent.includes('Research'));
        if (researchBtn) researchBtn.click();
      })()`,
    });
    await sleep(800);

    // 2. Click the quick question prompt chip
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const chip = btns.find(b => b.textContent && b.textContent.includes('margin guidance'));
        if (chip) chip.click();
      })()`,
    });
    await sleep(1200);

    // Take screenshot of Research Q&A
    const qaShot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(__dirname, 'redesign-mobile-research-qa.png'), Buffer.from(qaShot.data, 'base64'));
    console.log('Saved redesign-mobile-research-qa.png');

    // 3. Test Spotlight deep link to Event Memory Drawer
    // Navigate to Today
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const todayBtn = btns.find(b => b.textContent && b.textContent.includes('Today'));
        if (todayBtn) todayBtn.click();
      })()`,
    });
    await sleep(600);

    // Click "Explore ledger" or the spotlight card
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const ledgerBtn = btns.find(b => b.textContent && b.textContent.includes('Explore ledger'));
        if (ledgerBtn) ledgerBtn.click();
      })()`,
    });
    await sleep(800);

    const memDrawerShot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(__dirname, 'redesign-mobile-memory-drawer.png'), Buffer.from(memDrawerShot.data, 'base64'));
    console.log('Saved redesign-mobile-memory-drawer.png');

    // Diagnostic verification of viewport
    const evalRes = await send('Runtime.evaluate', {
      expression: `(() => {
        return {
          windowWidth: window.innerWidth,
          bodyScrollWidth: document.body.scrollWidth,
          overflow: document.body.scrollWidth > window.innerWidth,
          hasFinding: document.body.textContent.includes('EBITDA margin') || document.body.textContent.includes('Commitment'),
        };
      })()`,
      returnByValue: true,
    });
    console.log('E2E Diagnostic Results:', JSON.stringify(evalRes.result.value, null, 2));

    ws.close();
  } finally {
    chrome.kill();
  }
}

main().catch(console.error);
