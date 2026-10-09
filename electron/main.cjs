const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'SCOOPS BIR SAA',
    icon: path.join(__dirname, '../public/assets/icon-512.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    autoHideMenuBar: true,
    show: false,
  });

  const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC: Direct thermal printer list and print support for Windows POS
ipcMain.handle('get-printers', async () => {
  if (!mainWindow) return [];
  try {
    const printers = await mainWindow.webContents.getPrintersAsync();
    return printers.map(p => ({
      name: p.name,
      displayName: p.displayName || p.name,
      description: p.description,
      status: p.status,
      isDefault: p.isDefault,
    }));
  } catch (err) {
    console.error('Error fetching printers:', err);
    return [];
  }
});

ipcMain.handle('print-receipt', async (event, { printerName, silent = true, copies = 1 }) => {
  if (!mainWindow) return { success: false, error: 'Fenêtre principale non disponible' };
  try {
    return new Promise((resolve) => {
      mainWindow.webContents.print(
        {
          silent: silent,
          printBackground: true,
          deviceName: printerName || undefined,
          copies: copies || 1,
          margins: {
            marginType: 'none',
          },
        },
        (success, failureReason) => {
          if (!success) {
            resolve({ success: false, error: failureReason });
          } else {
            resolve({ success: true });
          }
        }
      );
    });
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Dynamic Desktop Icon updater when user uploads logo
ipcMain.handle('update-app-icon', async (event, { base64DataUrl }) => {
  if (!base64DataUrl) return { success: false, error: 'Donnée image manquante' };
  try {
    const { nativeImage } = require('electron');
    const image = nativeImage.createFromDataURL(base64DataUrl);
    if (mainWindow && !image.isEmpty()) {
      mainWindow.setIcon(image);
    }
    const { updateDesktopIconEverywhere } = require('../scripts/desktopIconUpdater.cjs');
    updateDesktopIconEverywhere(base64DataUrl);
    return { success: true };
  } catch (err) {
    console.error('Failed to update app icon in Electron:', err);
    return { success: false, error: err.message };
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
