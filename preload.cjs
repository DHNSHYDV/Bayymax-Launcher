const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectExe: () => ipcRenderer.invoke('dialog:selectExe'),
  getGames: () => ipcRenderer.invoke('store:getGames'),
  saveGame: (gameData) => ipcRenderer.invoke('store:saveGame', gameData),
  updateGame: (data) => ipcRenderer.invoke('store:updateGame', data),
  deleteGame: (exePath) => ipcRenderer.invoke('store:deleteGame', exePath),
  launchGame: (data) => ipcRenderer.invoke('os:launchGame', data),
  getGpus: () => ipcRenderer.invoke('os:getGpus'),
  openLogs: () => ipcRenderer.invoke('os:openLogs'),
  close: () => ipcRenderer.invoke('os:close'),
  minimize: () => ipcRenderer.invoke('os:minimize'),
  openUrl: (url) => ipcRenderer.invoke('os:openUrl', url),
  onLaunchError: (callback) => ipcRenderer.on('os:launch-error', (_event, value) => callback(value)),
  onGameClosed: (callback) => ipcRenderer.on('os:game-closed', () => callback()),
  onBootStart: (callback) => ipcRenderer.on('boot:start-intro', () => callback())
});
