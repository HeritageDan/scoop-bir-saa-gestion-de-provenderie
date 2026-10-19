import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const OVERLAYS_DIR = path.resolve(process.cwd(), 'overlays');
if (!fs.existsSync(OVERLAYS_DIR)) {
  fs.mkdirSync(OVERLAYS_DIR, { recursive: true });
}

export const SECTIONS = [
  {
    id: '01_dashboard',
    badge: 'MODULE 01 / 15',
    title: 'TABLEAU DE BORD OPÉRATIONNEL',
    subtitle: 'Supervision en temps réel des ventes, marges et alertes de stock',
    bullets: [
      'Indicateurs clés en direct (Chiffre d\'Affaires, Marges brutes, Dépenses)',
      'Détection proactive des alertes de stock faible et ruptures magasin',
      'Graphiques d\'évolution des ventes et flux des transactions récentes',
      'Point de vente actif sélectionnable avec vue consolidée'
    ],
    zoom: 'in-center',
    duration: 5.5
  },
  {
    id: '02_pos',
    badge: 'MODULE 02 / 15',
    title: 'TERMINAL DE CAISSE POS & VENTES',
    subtitle: 'Encaissement tactile haute cadence et impression thermique',
    bullets: [
      'Catalogue avec recherche instantanée et filtres par catégories d\'aliments',
      'Plafonds de remise stricts par rôle (Caissier: 0% | Responsable: ≤ 15%)',
      'Règlements multiples : Espèces, Mobile Money (OM/MoMo), Virement, Crédit',
      'Impression automatique des tickets de caisse 58 mm & 80 mm'
    ],
    zoom: 'in-right',
    duration: 6.0
  },
  {
    id: '03_products',
    badge: 'MODULE 03 / 15',
    title: 'CATALOGUE PRODUITS & TARIFS',
    subtitle: 'Gestion fine des matières premières, concentrés et aliments finis',
    bullets: [
      'Double unité de gestion : Unité de vente (sac) ↔ Unité de base (kg)',
      'Facteur de conversion dynamique et calcul automatique des marges',
      'Configuration des seuils d\'alerte de réapprovisionnement par produit',
      'Historique horodaté des variations tarifaires avec motif obligatoire'
    ],
    zoom: 'in-center',
    duration: 5.5
  },
  {
    id: '04_stock',
    badge: 'MODULE 04 / 15',
    title: 'GESTION DES STOCKS & MOUVEMENTS',
    subtitle: 'Traçabilité inaltérable des flux et blocage des stocks négatifs',
    bullets: [
      'Journal chronologique exhaustif de chaque entrée et sortie de stock',
      'Règle de gestion inviolable : Interdiction absolue de créer un stock négatif',
      'Ajustements manuels motivés (avaries, pertes, autoconsommation)',
      'Exportation instantanée de l\'état des stocks au format CSV'
    ],
    zoom: 'in-center',
    duration: 5.5
  },
  {
    id: '05_purchases',
    badge: 'MODULE 05 / 15',
    title: 'APPROVISIONNEMENTS & CALCUL DU CMP',
    subtitle: 'Réceptions fournisseurs et calcul continu du Coût Moyen Pondéré',
    bullets: [
      'Bordereaux de réception avec intégration des frais de transport et d\'approche',
      'Recalcul automatique du Coût Moyen Pondéré (CMP) après chaque livraison',
      'Suivi rigoureux du prix de revient réel pour garantir la rentabilité commerciale',
      'Historique complet des approvisionnements par dépôt et magasin'
    ],
    zoom: 'in-left',
    duration: 5.5
  },
  {
    id: '06_invoices',
    badge: 'MODULE 06 / 15',
    title: 'FACTURATION & GESTION DES AVOIRS',
    subtitle: 'Séquençage certifié des factures et gestion conforme des retours',
    bullets: [
      'Numérotation officielle certifiée séquentielle FAC-AAAA-XXXXXX',
      'Suivi précis des statuts : Payée, Partielle, Crédit ou Annulée',
      'Émission de notes d\'avoir (AVR-AAAA-XXXXXX) avec réintégration en stock',
      'Impression des factures grand format (A4) ou tickets de caisse thermiques'
    ],
    zoom: 'in-left',
    duration: 5.5
  },
  {
    id: '07_customers',
    badge: 'MODULE 07 / 15',
    title: 'CLIENTS & SUIVI DES CRÉANCES',
    subtitle: 'Maîtrise du risque financier et encadrement des ventes à crédit',
    bullets: [
      'Plafonds de crédit personnalisés et suivi de l\'encours par éleveur',
      'Client Comptant / Divers permanent pour les passages caisse anonymes',
      'Enregistrement direct des règlements partiels et amortissement des dettes',
      'Historique détaillé des achats et situation de compte client'
    ],
    zoom: 'in-center',
    duration: 5.5
  },
  {
    id: '08_suppliers',
    badge: 'MODULE 08 / 15',
    title: 'GESTION DES FOURNISSEURS',
    subtitle: 'Annuaire des partenaires, producteurs de céréales et meuneries',
    bullets: [
      'Fiches détaillées des fournisseurs de matières premières et emballages',
      'Liaison directe avec les réceptions et l\'historique des livraisons',
      'Recherche instantanée par nom, téléphone, ville ou produits fournis',
      'Gestion centralisée des contacts et conditions d\'achat'
    ],
    zoom: 'in-center',
    duration: 5.0
  },
  {
    id: '09_expenses',
    badge: 'MODULE 09 / 15',
    title: 'DÉPENSES D\'EXPLOITATION (OPEX)',
    subtitle: 'Suivi rigoureux des charges de production et frais généraux',
    bullets: [
      'Catégorisation normalisée (énergie broyeurs, salaires, sacs, carburant)',
      'Saisie fluide de tout montant décaissé en FCFA sans restriction',
      'Pièces justificatives, modes de règlement et motifs obligatoires',
      'Imputation directe dans le compte de résultat de la provenderie'
    ],
    zoom: 'in-center',
    duration: 5.0
  },
  {
    id: '10_inventory',
    badge: 'MODULE 10 / 15',
    title: 'INVENTAIRES PHYSIQUES & ÉCARTS',
    subtitle: 'Contrôle contradictoire, calcul des écarts et régularisation auditée',
    bullets: [
      'Sessions d\'inventaire complètes ou par catégorie de produits',
      'Saisie des comptages physiques et calcul automatique des écarts',
      'Valorisation financière de la démarque au Coût Moyen Pondéré (CMP)',
      'Validation sécurisée réservée aux Responsables & Administrateurs'
    ],
    zoom: 'in-center',
    duration: 5.5
  },
  {
    id: '11_reports',
    badge: 'MODULE 11 / 15',
    title: 'RAPPORTS FINANCIERS & EXPORTS PDF',
    subtitle: 'Analyse décisionnelle : Ventes, Marges, Stocks, Achats et P&L',
    bullets: [
      '5 rapports complets : Ventes, Compte de Résultat, Inventaire, Achats, Dépenses',
      'Filtres temporels flexibles (Aujourd\'hui, Semaine, Mois, Exercice, Personnalisé)',
      'Génération automatique de rapports PDF professionnels haute résolution',
      'Exportation tabulaire Excel/CSV pour la comptabilité générale'
    ],
    zoom: 'in-left',
    duration: 5.5
  },
  {
    id: '12_audit',
    badge: 'MODULE 12 / 15',
    title: 'PISTE D\'AUDIT & SÉCURITÉ',
    subtitle: 'Traçabilité inaltérable pour chaque opération financière et magasin',
    bullets: [
      'Enregistrement automatique et horodaté de chaque action critique',
      'Traçabilité avant / après pour chaque changement de prix ou annulation',
      'Filtres avancés par opérateur, rôle et plage chronologique',
      'Garantie d\'imputabilité et protection contre la fraude interne'
    ],
    zoom: 'in-center',
    duration: 5.0
  },
  {
    id: '13_users',
    badge: 'MODULE 13 / 15',
    title: 'UTILISATEURS & CONTRÔLE D\'ACCÈS',
    subtitle: 'Ségrégation des tâches et affectation multi-points de vente',
    bullets: [
      'Rôles spécialisés : Caissier, Magasinier, Responsable, Administrateur',
      'Compte Développeur Système sanctuarisé contre toute suppression',
      'Attribution des utilisateurs à des dépôts et points de vente dédiés',
      'Contrôle automatique des autorisations d\'accès aux menus et fonctions'
    ],
    zoom: 'in-center',
    duration: 5.0
  },
  {
    id: '14_settings',
    badge: 'MODULE 14 / 15',
    title: 'PARAMÈTRES & SAUVEGARDE 2-MIN',
    subtitle: 'Moteur de sauvegarde automatique et résilience totale hors-ligne',
    bullets: [
      'Sauvegarde automatique en tâche de fond programmée toutes les 2 minutes',
      'Double persistance locale (LocalStorage + IndexedDB) avec restauration 1-clic',
      'Configuration des imprimantes thermiques de caisse (58 mm / 80 mm)',
      'Synchronisation Cloud optionnelle avec Supabase et tolérance réseau'
    ],
    zoom: 'in-center',
    duration: 5.5
  },
  {
    id: '15_documentation',
    badge: 'MODULE 15 / 15',
    title: 'DOCUMENTATION & GUIDES INTÉGRÉS',
    subtitle: 'Manuels complets bilingues pour l\'autonomie totale des équipes',
    bullets: [
      'Dictionnaire interactif de toutes les fonctions système et règles de gestion',
      'Téléchargement direct des manuels officiels en PDF (Français & Anglais)',
      'Guide pas à pas pour la formation des caissiers et gestionnaires de stock',
      'Assistance utilisateur autonome disponible directement dans l\'interface'
    ],
    zoom: 'in-center',
    duration: 5.0
  }
];

function buildOverlayHtml(sec) {
  const bulletItems = sec.bullets
    .map(b => `<li style="display:flex;align-items:flex-start;gap:10px;margin-bottom:6px;"><span style="color:#10b981;font-weight:900;font-size:16px;line-height:1.2;">✓</span><span style="color:#f1f5f9;font-size:14px;font-weight:500;line-height:1.35;">${b}</span></li>`)
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif; }
    body {
      width: 1920px;
      height: 1080px;
      background: transparent;
      overflow: hidden;
      position: relative;
    }
    .top-header {
      position: absolute;
      top: 24px;
      left: 36px;
      right: 36px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      pointer-events: none;
    }
    .brand-badge {
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(15, 23, 42, 0.88);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 9999px;
      padding: 8px 20px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
    }
    .brand-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 10px #10b981;
    }
    .brand-text {
      color: #fff;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .status-tag {
      background: rgba(16, 185, 129, 0.2);
      border: 1px solid rgba(16, 185, 129, 0.4);
      border-radius: 8px;
      padding: 6px 14px;
      color: #34d399;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .lower-third {
      position: absolute;
      bottom: 28px;
      left: 36px;
      width: 980px;
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.94) 0%, rgba(2, 44, 34, 0.92) 100%);
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-top: 3px solid #10b981;
      border-radius: 20px;
      padding: 22px 28px 18px 28px;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.65), 0 0 40px rgba(16, 185, 129, 0.15);
    }
    .card-head {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }
    .badge {
      display: inline-block;
      background: #10b981;
      color: #022c22;
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding: 4px 12px;
      border-radius: 9999px;
    }
    .subtitle {
      color: #94a3b8;
      font-size: 13px;
      font-weight: 600;
    }
    .title {
      font-size: 26px;
      font-weight: 900;
      color: #ffffff;
      letter-spacing: -0.3px;
      line-height: 1.15;
      margin-bottom: 12px;
      text-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
    }
    .bullets-list {
      list-style: none;
      margin-top: 6px;
    }
    .progress-bar-container {
      margin-top: 14px;
      height: 4px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 9999px;
      overflow: hidden;
    }
    .progress-bar {
      height: 100%;
      width: 100%;
      background: linear-gradient(90deg, #10b981 0%, #34d399 100%);
      box-shadow: 0 0 10px #10b981;
    }
  </style>
</head>
<body>
  <div class="top-header">
    <div class="brand-badge">
      <div class="brand-dot"></div>
      <div class="brand-text">SCOOPS BIR SAA — Visite Applicative</div>
    </div>
    <div class="status-tag">Point de Vente : Siège Principal (Douala Bassa)</div>
  </div>

  <div class="lower-third">
    <div class="card-head">
      <span class="badge">${sec.badge}</span>
      <span class="subtitle">${sec.subtitle}</span>
    </div>
    <div class="title">${sec.title}</div>
    <ul class="bullets-list">
      ${bulletItems}
    </ul>
    <div class="progress-bar-container">
      <div class="progress-bar"></div>
    </div>
  </div>
</body>
</html>`;
}

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const DEBUG_PORT = 9224;
const USER_DATA_DIR = path.resolve(process.env.TEMP || 'C:\\Windows\\Temp', 'edge_overlays_' + Date.now());

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  console.log('Generating transparent motion overlay PNGs...');
  const edge = spawn(EDGE_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--headless=new',
    '--window-size=1920,1080',
    '--default-background-color=00000000',
    '--hide-scrollbars',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${USER_DATA_DIR}`,
    'about:blank'
  ]);

  edge.on('error', err => console.error('Edge process error:', err));
  edge.stderr.on('data', d => {
    // console.log('[Edge err]:', d.toString());
  });

  try {
    let connected = false;
    for (let i = 0; i < 30; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
        if (res.ok) {
          const data = await res.json();
          console.log('Edge CDP connected successfully:', data.Browser);
          connected = true;
          break;
        }
      } catch {
        await sleep(300);
      }
    }
    if (!connected) throw new Error('Could not connect to Edge CDP on port ' + DEBUG_PORT);

    const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
    const targets = await res.json();
    let pageTarget = targets.find(t => t.type === 'page');
    if (!pageTarget) {
      const newTabRes = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?about:blank`, { method: 'PUT' });
      pageTarget = await newTabRes.json();
    }
    console.log(`Connecting to page target: ${pageTarget.id}...`);
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
        const timeout = setTimeout(() => {
          pendingCallbacks.delete(id);
          reject(new Error(`CDP command ${method} timed out (id=${id})`));
        }, 15000);
        pendingCallbacks.set(id, {
          resolve: (res) => { clearTimeout(timeout); resolve(res); },
          reject: (err) => { clearTimeout(timeout); reject(err); }
        });
        ws.send(JSON.stringify({ id, method, params }));
      });
    };

    console.log('Sending Page.enable and Emulation overrides...');
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
    try {
      await send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
    } catch (e) {
      console.log('BackgroundColorOverride note:', e.message);
    }

    for (const sec of SECTIONS) {
      const html = buildOverlayHtml(sec);
      const tempHtmlFile = path.resolve(OVERLAYS_DIR, `${sec.id}.html`);
      fs.writeFileSync(tempHtmlFile, html, 'utf-8');

      // Copy to public/overlays_temp so it can be fetched via http
      const pubDir = path.resolve(process.cwd(), 'public', 'temp_overlays');
      if (!fs.existsSync(pubDir)) fs.mkdirSync(pubDir, { recursive: true });
      fs.writeFileSync(path.resolve(pubDir, `${sec.id}.html`), html, 'utf-8');

      const url = `http://localhost:3000/temp_overlays/${sec.id}.html`;
      console.log(`Rendering overlay for [${sec.title}]...`);
      await send('Page.navigate', { url });
      await sleep(600);

      const shot = await send('Page.captureScreenshot', { format: 'png' });
      const outPng = path.resolve(OVERLAYS_DIR, `${sec.id}_overlay.png`);
      fs.writeFileSync(outPng, Buffer.from(shot.data, 'base64'));
      console.log(`Saved overlay: ${outPng} (${(fs.statSync(outPng).size / 1024).toFixed(1)} KB)`);
    }

    ws.close();
    console.log('\nAll 15 transparent motion overlays rendered successfully!');
  } finally {
    edge.kill();
    try {
      fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
    } catch {}
  }
}

run().catch(err => {
  console.error('Overlay generation failed:', err);
  process.exit(1);
});
