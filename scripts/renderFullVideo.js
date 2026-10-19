import { spawnSync, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const ROOT_DIR = process.cwd();
const SCREENSHOTS_DIR = path.resolve(ROOT_DIR, 'screenshots');
const VIDEOS_DIR = path.resolve(ROOT_DIR, 'videos');
const TEMP_ASS_DIR = path.resolve(ROOT_DIR, 'temp_ass');

if (!fs.existsSync(VIDEOS_DIR)) fs.mkdirSync(VIDEOS_DIR, { recursive: true });
if (!fs.existsSync(TEMP_ASS_DIR)) fs.mkdirSync(TEMP_ASS_DIR, { recursive: true });

const SECTIONS = [
  {
    id: '01_dashboard',
    badge: 'MODULE 01 / 15',
    title: 'TABLEAU DE BORD OPÉRATIONNEL',
    subtitle: 'Supervision en temps réel des ventes, marges et alertes de stock',
    bullets: [
      'Indicateurs clés en direct (Chiffre d\'Affaires, Marges brutes, Dépenses)',
      'Détection proactive des alertes de stock faible et ruptures magasin',
      'Graphiques d\'évolution des ventes et flux des transactions récentes',
      'Point de vente actif sélectionnable avec consolidation multi-dépôts'
    ],
    motion: 'center',
    duration: 5.2
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
    motion: 'right',
    duration: 5.2
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
    motion: 'center',
    duration: 5.2
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
    motion: 'center',
    duration: 5.2
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
    motion: 'left',
    duration: 5.2
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
    motion: 'left',
    duration: 5.2
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
    motion: 'center',
    duration: 5.2
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
    motion: 'center',
    duration: 5.2
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
    motion: 'center',
    duration: 5.2
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
    motion: 'center',
    duration: 5.2
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
    motion: 'left',
    duration: 5.2
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
    motion: 'center',
    duration: 5.2
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
    motion: 'center',
    duration: 5.2
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
    motion: 'center',
    duration: 5.2
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
    motion: 'center',
    duration: 5.2
  }
];

function generateAssContent(sec, duration) {
  const durSec = duration.toFixed(2);
  const durFormatted = `0:00:0${durSec}`;

  let bulletLines = '';
  const startY = 805;
  const lineSpacing = 38;
  sec.bullets.forEach((bullet, idx) => {
    const yPos = startY + idx * lineSpacing;
    bulletLines += `Dialogue: 0,0:00:00.00,${durFormatted},Bullet,,0,0,0,,{\\pos(80,${yPos})\\fad(350,200)}{\\c&H0081B910\\b1}✓ {\\c&H00F1F5F9\\b0}${bullet}\n`;
  });

  return `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: HeaderBrand, Segoe UI, 22, &H00FFFFFF, &H000000FF, &H00000000, &H00000000, -1, 0, 0, 0, 100, 100, 1, 0, 1, 0, 0, 7, 0, 0, 0, 1
Style: HeaderTag, Segoe UI, 18, &H0099D334, &H000000FF, &H00000000, &H00000000, -1, 0, 0, 0, 100, 100, 0, 0, 1, 0, 0, 7, 0, 0, 0, 1
Style: Badge, Segoe UI, 18, &H00022C22, &H000000FF, &H00000000, &H0081B910, -1, 0, 0, 0, 100, 100, 1, 0, 3, 6, 0, 7, 0, 0, 0, 1
Style: CardTitle, Segoe UI, 34, &H00FFFFFF, &H000000FF, &H00000000, &H00000000, -1, 0, 0, 0, 100, 100, 0, 0, 1, 0, 0, 7, 0, 0, 0, 1
Style: Subtitle, Segoe UI, 20, &H00B8A394, &H000000FF, &H00000000, &H00000000, 0, 0, 0, 0, 100, 100, 0, 0, 1, 0, 0, 7, 0, 0, 0, 1
Style: Bullet, Segoe UI, 21, &H00F1F5F9, &H000000FF, &H00000000, &H00000000, 0, 0, 0, 0, 100, 100, 0, 0, 1, 0, 0, 7, 0, 0, 0, 1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,${durFormatted},HeaderBrand,,0,0,0,,{\\pos(70,42)\\fad(200,200)}SCOOPS BIR SAA — VISITE APPLICATIVE
Dialogue: 0,0:00:00.00,${durFormatted},HeaderTag,,0,0,0,,{\\pos(540,45)\\fad(200,200)}● POINT DE VENTE : SIÈGE PRINCIPAL
Dialogue: 0,0:00:00.00,${durFormatted},Badge,,0,0,0,,{\\pos(80,715)\\fad(300,200)}${sec.badge}
Dialogue: 0,0:00:00.00,${durFormatted},CardTitle,,0,0,0,,{\\pos(280,710)\\fad(300,200)}${sec.title}
Dialogue: 0,0:00:00.00,${durFormatted},Subtitle,,0,0,0,,{\\pos(80,760)\\fad(300,200)}${sec.subtitle}
${bulletLines}`;
}

function getZoomPanFilter(motion, totalFrames) {
  if (motion === 'right') {
    return `zoompan=z='min(zoom+0.0006,1.06)':d=${totalFrames}:x='(iw-iw/zoom)*0.85':y='(ih-ih/zoom)*0.2':s=1920x1080:fps=30`;
  } else if (motion === 'left') {
    return `zoompan=z='min(zoom+0.0006,1.06)':d=${totalFrames}:x='(iw-iw/zoom)*0.15':y='(ih-ih/zoom)*0.2':s=1920x1080:fps=30`;
  } else {
    return `zoompan=z='min(zoom+0.0006,1.06)':d=${totalFrames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=30`;
  }
}

async function renderAllScenes() {
  console.log('================================================================');
  console.log('🎥 SCOOPS BIR SAA — PRODUCTION DE LA VIDÉO DE PRÉSENTATION');
  console.log('================================================================\n');

  const sceneFiles = [];

  // --- 1. SCENE 00 : INTRO CARD ---
  console.log('🎬 [00/16] Rendu de la scène d\'introduction...');
  const introPng = path.join(SCREENSHOTS_DIR, '00_intro.png');
  const introMp4 = path.join(VIDEOS_DIR, 'scene_00.mp4');
  const introFrames = Math.round(4.5 * 30);
  const introFilter = `zoompan=z='min(zoom+0.0004,1.03)':d=${introFrames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=30,fade=t=in:st=0:d=0.6`;
  execSync(`ffmpeg -y -i "${introPng}" -vf "${introFilter}" -c:v libx264 -preset fast -pix_fmt yuv420p "${introMp4}"`, { stdio: 'inherit' });
  sceneFiles.push(introMp4);
  console.log(`✅ Scène 00 terminée (${(fs.statSync(introMp4).size / 1024).toFixed(0)} KB)\n`);

  // --- 2. SCENES 01 to 15 : MODULES ---
  for (let i = 0; i < SECTIONS.length; i++) {
    const sec = SECTIONS[i];
    const sceneIndex = String(i + 1).padStart(2, '0');
    console.log(`🎬 [${sceneIndex}/16] Rendu module : ${sec.title}...`);

    const pngPath = path.join(SCREENSHOTS_DIR, `${sec.id}.png`);
    const mp4Path = path.join(VIDEOS_DIR, `scene_${sceneIndex}.mp4`);
    const relAssPath = `temp_ass/scene_${sceneIndex}.ass`;
    const fullAssPath = path.join(ROOT_DIR, relAssPath);

    // Write ASS subtitle file
    const assContent = generateAssContent(sec, sec.duration);
    fs.writeFileSync(fullAssPath, assContent, 'utf-8');

    const totalFrames = Math.round(sec.duration * 30);
    const zoomFilter = getZoomPanFilter(sec.motion, totalFrames);

    // Filter chain:
    // 1. Zoompan Ken Burns
    // 2. Top Header Box + Emerald indicator
    // 3. Lower Third Dark Translucent Backdrop
    // 4. Emerald Accent Line on top of card
    // 5. Dynamic Progress Bar at bottom of card
    // 6. Subtitles / Typography via ASS
    const filterComplex = [
      zoomFilter,
      'drawbox=x=45:y=24:w=900:h=56:color=#0f172a@0.90:t=fill',
      'drawbox=x=45:y=24:w=6:h=56:color=#10b981:t=fill',
      'drawbox=x=45:y=680:w=1280:h=320:color=#0f172a@0.92:t=fill',
      'drawbox=x=45:y=680:w=1280:h=4:color=#10b981:t=fill',
      `drawbox=x=45:y=996:w='min(1280,(t/${(sec.duration - 0.2).toFixed(2)})*1280)':h=4:color=#10b981:t=fill`,
      `ass='${relAssPath}'`
    ].join(',');

    execSync(`ffmpeg -y -i "${pngPath}" -vf "${filterComplex}" -c:v libx264 -preset fast -pix_fmt yuv420p "${mp4Path}"`, { stdio: 'inherit' });
    sceneFiles.push(mp4Path);
    console.log(`✅ Module ${sceneIndex} terminé (${(fs.statSync(mp4Path).size / 1024).toFixed(0)} KB)\n`);
  }

  // --- 3. SCENE 16 : OUTRO CARD ---
  console.log('🎬 [16/16] Rendu de la scène de conclusion & certification...');
  const outroPng = path.join(SCREENSHOTS_DIR, '16_outro.png');
  const outroMp4 = path.join(VIDEOS_DIR, 'scene_16.mp4');
  const outroFrames = Math.round(5.0 * 30);
  const outroFilter = `zoompan=z='min(zoom+0.0004,1.03)':d=${outroFrames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=30,fade=t=out:st=4.2:d=0.8`;
  execSync(`ffmpeg -y -i "${outroPng}" -vf "${outroFilter}" -c:v libx264 -preset fast -pix_fmt yuv420p "${outroMp4}"`, { stdio: 'inherit' });
  sceneFiles.push(outroMp4);
  console.log(`✅ Scène 16 terminée (${(fs.statSync(outroMp4).size / 1024).toFixed(0)} KB)\n`);

  // --- 4. CONCATENATION ---
  console.log('🔗 Assemblage de toutes les scènes...');
  const concatTxt = path.join(VIDEOS_DIR, 'concat_list.txt');
  const concatContent = sceneFiles.map(f => `file '${path.basename(f)}'`).join('\n');
  fs.writeFileSync(concatTxt, concatContent, 'utf-8');

  const fullVideoMute = path.join(VIDEOS_DIR, 'full_presentation_mute.mp4');
  execSync(`ffmpeg -y -f concat -safe 0 -i "${concatTxt}" -c copy "${fullVideoMute}"`, { stdio: 'inherit' });

  // Get total duration
  const probeOut = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${fullVideoMute}"`).toString().trim();
  const totalDuration = parseFloat(probeOut) || 87.5;
  console.log(`⏱️ Durée totale de la vidéo : ${totalDuration.toFixed(1)} secondes\n`);

  // --- 5. AUDIO SYNTHESIS & SOUND DESIGN ---
  console.log('🎵 Génération de la bande sonore corporative & design audio...');
  const audioTrack = path.join(VIDEOS_DIR, 'ambient_soundtrack.aac');
  // Gentle corporate harmonic chord progression with subtle rhythm pulse and soft fade in/out
  const audioExpr = `0.04*sin(2*PI*130.81*t) + 0.03*sin(2*PI*196.00*t)*cos(2*PI*0.1*t) + 0.03*sin(2*PI*261.63*t) + 0.025*sin(2*PI*329.63*t)*sin(2*PI*0.15*t) + 0.015*sin(2*PI*392.00*t)`;
  const audioFilter = `afade=t=in:st=0:d=1.5,afade=t=out:st=${(totalDuration - 2.5).toFixed(1)}:d=2.5`;
  execSync(`ffmpeg -y -f lavfi -i "aevalsrc=exprs='${audioExpr}':s=48000" -t ${totalDuration.toFixed(2)} -af "${audioFilter}" -c:a aac -b:a 192k "${audioTrack}"`, { stdio: 'inherit' });

  // --- 6. FINAL PRODUCTION MUX ---
  console.log('✨ Muxing final Full HD avec audio...');
  const finalVideoRoot = path.join(ROOT_DIR, 'SCOOPS_BIR_SAA_Presentation_Video.mp4');
  const finalVideoPublic = path.join(ROOT_DIR, 'public', 'SCOOPS_BIR_SAA_Presentation_Video.mp4');

  execSync(`ffmpeg -y -i "${fullVideoMute}" -i "${audioTrack}" -c:v copy -c:a copy -movflags +faststart "${finalVideoRoot}"`, { stdio: 'inherit' });
  fs.copyFileSync(finalVideoRoot, finalVideoPublic);

  const finalSizeMb = (fs.statSync(finalVideoRoot).size / (1024 * 1024)).toFixed(2);
  console.log('\n================================================================');
  console.log(`🎉 VIDÉO GÉNÉRÉE AVEC SUCCÈS !`);
  console.log(`📁 Fichier racine : ${finalVideoRoot} (${finalSizeMb} MB)`);
  console.log(`🌐 Fichier public : ${finalVideoPublic}`);
  console.log('================================================================\n');
}

renderAllScenes().catch(err => {
  console.error('Fatal render error:', err);
  process.exit(1);
});
