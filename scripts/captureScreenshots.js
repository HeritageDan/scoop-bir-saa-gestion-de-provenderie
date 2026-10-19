import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const DEBUG_PORT = 9222;
const USER_DATA_DIR = path.resolve(process.env.TEMP || 'C:\\Windows\\Temp', 'edge_cdp_profile_' + Date.now());
const SCREENSHOTS_DIR = path.resolve(process.cwd(), 'screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const TABS = [
  { url: 'http://localhost:3000/intro_card.html', filename: '00_intro.png', name: 'Écran Titre Introductif' },
  { id: 'dashboard', filename: '01_dashboard.png', name: 'Tableau de Bord & Indicateurs' },
  { id: 'pos', filename: '02_pos.png', name: 'Caisse POS & Vente au Comptoir' },
  { id: 'products', filename: '03_products.png', name: 'Catalogue Produits & Tarifs' },
  { id: 'stock', filename: '04_stock.png', name: 'Gestion des Stocks & Mouvements' },
  { id: 'purchases', filename: '05_purchases.png', name: 'Approvisionnements & Moteur CMP' },
  { id: 'invoices', filename: '06_invoices.png', name: 'Facturation & Avoirs' },
  { id: 'customers', filename: '07_customers.png', name: 'Clients & Suivi des Créances' },
  { id: 'suppliers', filename: '08_suppliers.png', name: 'Gestion des Fournisseurs' },
  { id: 'expenses', filename: '09_expenses.png', name: 'Dépenses d\'Exploitation' },
  { id: 'inventory', filename: '10_inventory.png', name: 'Inventaires Physiques & Écarts' },
  { id: 'reports', filename: '11_reports.png', name: 'Rapports Financiers & Exports PDF' },
  { id: 'audit', filename: '12_audit.png', name: 'Piste d\'Audit & Journal de Sécurité' },
  { id: 'admin_users', filename: '13_users.png', name: 'Gestion des Utilisateurs & Rôles' },
  { id: 'settings', filename: '14_settings.png', name: 'Paramètres & Sauvegardes 2-Min' },
  { id: 'documentation', filename: '15_documentation.png', name: 'Documentation Intégrée & Guide' },
  { url: 'http://localhost:3000/outro_card.html', filename: '16_outro.png', name: 'Écran de Conclusion & Déploiement' }
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForCdp() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
      if (res.ok) {
        const data = await res.json();
        console.log('Edge CDP connected:', data.Browser);
        return data;
      }
    } catch {
      await sleep(300);
    }
  }
  throw new Error('Edge CDP did not start in time');
}

async function run() {
  console.log('Launching Edge in headless mode with CDP...');
  const edgeProcess = spawn(EDGE_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--headless=new',
    '--window-size=1920,1080',
    '--hide-scrollbars',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${USER_DATA_DIR}`,
    'about:blank'
  ]);

  edgeProcess.on('error', err => {
    console.error('Edge process error:', err);
  });

  try {
    await waitForCdp();

    // Get active page target or create one
    const targetsRes = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
    const targets = await targetsRes.json();
    let pageTarget = targets.find(t => t.type === 'page');

    if (!pageTarget) {
      const newTabRes = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?about:blank`, { method: 'PUT' });
      pageTarget = await newTabRes.json();
    }

    console.log('Target WebSocket:', pageTarget.webSocketDebuggerUrl);
    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

    let msgId = 1;
    const pendingCallbacks = new Map();

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pendingCallbacks.has(msg.id)) {
        const { resolve, reject } = pendingCallbacks.get(msg.id);
        pendingCallbacks.delete(msg.id);
        if (msg.error) {
          reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        } else {
          resolve(msg.result);
        }
      }
    };

    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    const send = (method, params = {}) => {
      const id = msgId++;
      return new Promise((resolve, reject) => {
        pendingCallbacks.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    };

    // Enable Page and Runtime domains
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      mobile: false
    });

    console.log('\n--- CAPTURING FULL HD SCREENSHOTS OF ALL APP TABS ---');

    for (const tab of TABS) {
      const url = tab.url || `http://localhost:3000/?auth=true&tab=${tab.id}`;
      console.log(`Navigating to [${tab.name}] -> ${url}...`);
      await send('Page.navigate', { url });

      // Give ample time for React hydration, CSS transitions and mock data to render crisply
      await sleep(tab.id === 'dashboard' ? 3500 : 2000);

      // Capture screenshot
      const screenshotRes = await send('Page.captureScreenshot', {
        format: 'png',
        quality: 100,
        captureBeyondViewport: false
      });

      const buffer = Buffer.from(screenshotRes.data, 'base64');
      const outPath = path.join(SCREENSHOTS_DIR, tab.filename);
      fs.writeFileSync(outPath, buffer);
      console.log(`Saved: ${outPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
    }

    ws.close();
    console.log('\nAll 15 tab screenshots captured successfully!');
  } finally {
    edgeProcess.kill();
    try {
      fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
    } catch {}
  }
}

run().catch(err => {
  console.error('Fatal error during capture:', err);
  process.exit(1);
});
