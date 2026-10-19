/**
 * Service de gestion et synchronisation dynamique des icônes de l'application (PWA, Desktop, Favicon)
 * 
 * Permet de mettre à jour instantanément :
 * 1. L'icône de l'onglet navigateur (<link rel="icon"> et <link rel="apple-touch-icon">)
 * 2. Le manifeste PWA (<link rel="manifest">) afin que l'icône de bureau créée lors de l'installation PWA reflète le logo importé
 * 3. L'icône de l'application de bureau Electron (fenêtre et barre des tâches via IPC)
 * 4. Les fichiers physiques sur le disque (public/assets/icon-512.png, icon-192.png, logo-coops.png via API locale)
 */

declare global {
  interface Window {
    electronDesktop?: {
      isElectron: boolean;
      getPrinters: () => Promise<any[]>;
      printReceipt: (options: any) => Promise<any>;
      updateAppIcon?: (base64DataUrl: string) => Promise<{ success: boolean; error?: string }>;
    };
  }
}

/**
 * Crée un canvas carré centré avec fond transparent ou blanc pour une netteté optimale
 */
function createSquareIconDataUrl(imageSrc: string, targetSize: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(imageSrc);
        return;
      }

      ctx.clearRect(0, 0, targetSize, targetSize);

      // Calculer l'échelle pour adapter l'image au carré avec une marge agréable (padding de 5%)
      const padding = targetSize * 0.05;
      const availableSize = targetSize - padding * 2;
      const scale = Math.min(availableSize / img.width, availableSize / img.height);
      const drawWidth = img.width * scale;
      const drawHeight = img.height * scale;
      const drawX = (targetSize - drawWidth) / 2;
      const drawY = (targetSize - drawHeight) / 2;

      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      resolve(imageSrc);
    };
    img.src = imageSrc;
  });
}

/**
 * Met à jour dynamiquement l'icône de l'application partout (navigateur, bureau PWA, Electron et fichiers locaux)
 */
export async function updateAppIconEverywhere(logoUrl: string): Promise<void> {
  if (!logoUrl || typeof logoUrl !== 'string') return;

  try {
    // 1. Générer des versions carrées haute définition (192x192 et 512x512)
    const [icon192, icon512] = await Promise.all([
      createSquareIconDataUrl(logoUrl, 192),
      createSquareIconDataUrl(logoUrl, 512),
    ]);

    // 2. Mettre à jour les balises favicons dans le document <head>
    let faviconLink = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!faviconLink) {
      faviconLink = document.createElement('link');
      faviconLink.rel = 'icon';
      faviconLink.type = 'image/png';
      document.head.appendChild(faviconLink);
    }
    faviconLink.href = icon192;

    let appleTouchLink = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
    if (!appleTouchLink) {
      appleTouchLink = document.createElement('link');
      appleTouchLink.rel = 'apple-touch-icon';
      document.head.appendChild(appleTouchLink);
    }
    appleTouchLink.href = icon192;

    // 3. Mettre à jour dynamiquement le manifest PWA (pour les raccourcis bureau Chrome / Edge / Windows)
    try {
      const dynamicManifest = {
        id: "/?app=scoops-bir-pos",
        short_name: "SCOOPS BIR SAA",
        name: "SCOOPS BIR SAA",
        description: "Application autonome de gestion opérationnelle, caisse POS avec impression thermique et reporting pour provenderie SCOOPS BIR SAA",
        icons: [
          {
            src: icon192,
            type: "image/png",
            sizes: "192x192"
          },
          {
            src: icon512,
            type: "image/png",
            sizes: "512x512"
          }
        ],
        start_url: "/?app=scoops-bir-pos",
        scope: "/",
        background_color: "#059669",
        theme_color: "#059669",
        display: "standalone",
        orientation: "any"
      };

      const manifestBlob = new Blob([JSON.stringify(dynamicManifest)], { type: 'application/json' });
      const manifestBlobUrl = URL.createObjectURL(manifestBlob);

      let manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
      if (manifestLink) {
        manifestLink.href = manifestBlobUrl;
      }
    } catch (e) {
      console.warn('[AppIconService] Erreur mise à jour manifest PWA:', e);
    }

    // 4. Si l'application tourne dans Electron (bureau autonome), appeler l'IPC natif
    if (window.electronDesktop?.updateAppIcon) {
      window.electronDesktop.updateAppIcon(icon512).catch(err => {
        console.warn('[AppIconService] Échec mise à jour icône Electron:', err);
      });
    }

    // 5. Envoyer vers le serveur de développement / local pour écrire sur le disque
    try {
      fetch('/api/update-icon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64DataUrl: icon512 }),
      }).catch(() => {
        // En mode statique pur ou production web distant, ignorer silencieusement
      });
    } catch {}
  } catch (err) {
    console.warn('[AppIconService] Erreur globale lors de la mise à jour des icônes:', err);
  }
}
