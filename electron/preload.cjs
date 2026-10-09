const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronDesktop', {
  isElectron: true,
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  printReceipt: (options) => ipcRenderer.invoke('print-receipt', options),
  updateAppIcon: (base64DataUrl) => ipcRenderer.invoke('update-app-icon', { base64DataUrl }),
});
