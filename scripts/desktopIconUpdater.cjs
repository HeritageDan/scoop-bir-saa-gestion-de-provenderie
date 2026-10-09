const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Creates a Windows-compatible .ico buffer containing a PNG stream.
 * Windows 7/8/10/11 natively supports 256x256 PNGs in .ico and renders
 * crisp antialiased icons across all desktop DPI settings.
 */
function makeIcoFromPng(pngBuffer) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = icon
  header.writeUInt16LE(1, 4); // count: 1 image

  const entry = Buffer.alloc(16);
  entry.writeUInt8(0, 0); // width: 0 = 256
  entry.writeUInt8(0, 1); // height: 0 = 256
  entry.writeUInt8(0, 2); // palette: 0
  entry.writeUInt8(0, 3); // reserved: 0
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(pngBuffer.length, 8); // image byte size
  entry.writeUInt32LE(22, 12); // image offset (6 + 16 = 22)

  return Buffer.concat([header, entry, pngBuffer]);
}

/**
 * Recursively find all *.ico files in a directory
 */
function findIcoFilesRecursively(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const fullPath = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        findIcoFilesRecursively(fullPath, fileList);
      } else if (ent.isFile() && ent.name.toLowerCase().endsWith('.ico')) {
        fileList.push(fullPath);
      }
    }
  } catch {}
  return fileList;
}

/**
 * Updates application icons everywhere on the Windows system:
 * - Public asset images (icon-512, icon-192, logo-scoops)
 * - Windows .ico files (app_icon.ico, favicon.ico)
 * - Chrome & Edge PWA Web Applications cached .ico files
 * - Desktop shortcuts (.lnk files on user Desktop)
 * - Forces Windows shell icon cache refresh
 */
function updateDesktopIconEverywhere(imageInput) {
  let pngBuffer;
  if (Buffer.isBuffer(imageInput)) {
    pngBuffer = imageInput;
  } else if (typeof imageInput === 'string') {
    if (imageInput.startsWith('data:image/')) {
      const b64 = imageInput.replace(/^data:image\/\w+;base64,/, '');
      pngBuffer = Buffer.from(b64, 'base64');
    } else if (fs.existsSync(imageInput)) {
      pngBuffer = fs.readFileSync(imageInput);
    }
  }

  if (!pngBuffer || pngBuffer.length === 0) {
    return { success: false, error: 'Buffer image manquant ou invalide' };
  }

  const rootDir = path.resolve(__dirname, '..');
  const assetsDir = path.join(rootDir, 'public/assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  // 1. Write PNG files
  fs.writeFileSync(path.join(assetsDir, 'icon-512.png'), pngBuffer);
  fs.writeFileSync(path.join(assetsDir, 'icon-192.png'), pngBuffer);
  fs.writeFileSync(path.join(assetsDir, 'logo-scoops.png'), pngBuffer);
  fs.writeFileSync(path.join(assetsDir, 'logo-coops.png'), pngBuffer);

  // 2. Generate and write .ico files
  const icoBuffer = makeIcoFromPng(pngBuffer);
  const primaryIcoPath = path.join(assetsDir, 'app_icon.ico');
  fs.writeFileSync(primaryIcoPath, icoBuffer);
  fs.writeFileSync(path.join(rootDir, 'public/favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(rootDir, 'app_icon.ico'), icoBuffer);

  // Also write to dist/ if dist exists
  const distAssets = path.join(rootDir, 'dist/assets');
  if (fs.existsSync(distAssets)) {
    fs.writeFileSync(path.join(distAssets, 'icon-512.png'), pngBuffer);
    fs.writeFileSync(path.join(distAssets, 'icon-192.png'), pngBuffer);
    fs.writeFileSync(path.join(distAssets, 'logo-scoops.png'), pngBuffer);
    fs.writeFileSync(path.join(distAssets, 'app_icon.ico'), icoBuffer);
  }

  // 3. Update Chrome and Edge PWA Web Applications cached .ico files
  const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || 'C:\\Users\\HP', 'AppData\\Local');
  const browserPwaDirs = [
    path.join(localAppData, 'Google/Chrome/User Data/Default/Web Applications'),
    path.join(localAppData, 'Microsoft/Edge/User Data/Default/Web Applications'),
  ];

  for (const bDir of browserPwaDirs) {
    const icoFiles = findIcoFilesRecursively(bDir);
    for (const icoPath of icoFiles) {
      try {
        fs.writeFileSync(icoPath, icoBuffer);
      } catch {}
    }
  }

  // 4. Update Windows Desktop shortcuts & refresh shell cache via PowerShell
  const psScriptPath = path.join(rootDir, 'scripts/refreshShortcuts.ps1');
  const batchLaunchPath = path.join(rootDir, 'Lancer_SCOOPS_BIR_SAA.bat');
  const desktopDir = path.join(process.env.USERPROFILE || 'C:\\Users\\HP', 'Desktop');

  if (fs.existsSync(psScriptPath)) {
    try {
      execSync(
        `powershell -NoProfile -ExecutionPolicy Bypass -File "${psScriptPath}" -IcoPath "${primaryIcoPath}" -BatchPath "${batchLaunchPath}" -DesktopPath "${desktopDir}"`,
        { stdio: 'pipe' }
      );
    } catch (err) {
      console.warn('[DesktopIconUpdater] PowerShell shortcut update notice:', err.message);
    }
  }

  return { success: true, icoPath: primaryIcoPath };
}

module.exports = {
  makeIcoFromPng,
  updateDesktopIconEverywhere,
};

// If run directly from CLI
if (require.main === module) {
  const arg = process.argv[2];
  let srcFile = arg;
  if (!srcFile) {
    const desktopLogo = path.join(process.env.USERPROFILE || 'C:\\Users\\HP', 'Desktop/logo-removebg-preview.png');
    const desktopLogo2 = path.join(process.env.USERPROFILE || 'C:\\Users\\HP', 'Desktop/logo.png');
    const existing512 = path.resolve(__dirname, '../public/assets/icon-512.png');
    if (fs.existsSync(desktopLogo)) srcFile = desktopLogo;
    else if (fs.existsSync(desktopLogo2)) srcFile = desktopLogo2;
    else srcFile = existing512;
  }
  console.log('[DesktopIconUpdater] Updating icons with source:', srcFile);
  const result = updateDesktopIconEverywhere(srcFile);
  console.log('[DesktopIconUpdater] Result:', result);
}
