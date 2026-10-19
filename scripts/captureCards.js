import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const DEBUG_PORT = 9226;
const USER_DATA_DIR = path.resolve(process.env.TEMP || 'C:\\Windows\\Temp', 'edge_cards_' + Date.now());

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('Starting Edge for intro/outro cards...');
  const edge = spawn(EDGE_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--headless=new',
    '--window-size=1920,1080',
    '--hide-scrollbars',
    '--disable-gpu',
    `--user-data-dir=${USER_DATA_DIR}`,
    'about:blank'
  ]);

  try {
    for (let i = 0; i < 20; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
        if (res.ok) break;
      } catch {
        await sleep(300);
      }
    }

    const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
    const targets = await res.json();
    const ws = new WebSocket(targets[0].webSocketDebuggerUrl);

    await new Promise(r => ws.onopen = r);
    let id = 1;
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const curId = id++;
      const handler = (evt) => {
        const msg = JSON.parse(evt.data);
        if (msg.id === curId) {
          ws.removeEventListener('message', handler);
          resolve(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: curId, method, params }));
    });

    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });

    // Intro
    const introUrl = 'http://localhost:3000/intro_card.html';
    console.log('Navigating to intro card:', introUrl);
    await send('Page.navigate', { url: introUrl });
    await sleep(1500);
    let shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('screenshots/00_intro.png', Buffer.from(shot.data, 'base64'));
    console.log('Saved screenshots/00_intro.png');

    // Outro
    const outroUrl = 'http://localhost:3000/outro_card.html';
    console.log('Navigating to outro card:', outroUrl);
    await send('Page.navigate', { url: outroUrl });
    await sleep(1500);
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('screenshots/16_outro.png', Buffer.from(shot.data, 'base64'));
    console.log('Saved screenshots/16_outro.png');

    ws.close();
  } finally {
    edge.kill();
    try {
      fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
    } catch {}
  }
}

run().catch(console.error);
