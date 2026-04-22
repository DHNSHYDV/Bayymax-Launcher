const { app, BrowserWindow, ipcMain, dialog, shell, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');

// File to store our custom games
const dbPath = path.join(app.getPath('userData'), 'games.json');

// Ensure db exists
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify([]));
}

const logPath = path.join(app.getPath('userData'), 'debug.log');
function logToFile(msg) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}\n`;
  console.log(line.trim());
  try {
    fs.appendFileSync(logPath, line);
  } catch (e) {
    console.error("Failed to write to log:", e);
  }
}

// Clear log on startup
try {
  fs.writeFileSync(logPath, `--- Bayymax Launcher Startup: ${new Date().toISOString()} ---\n`);
} catch (e) {}

// we check for admin rights by trying a high-privilege command (net session)
// we also check for the --admin flag to prevent infinite relaunch loops
if (app.isPackaged && process.platform === 'win32' && !process.argv.includes('--admin')) {
  try {
    const { execSync } = require('child_process');
    execSync('net session');
    logToFile("System: Verified - Running with Administrative privileges.");
  } catch (err) {
    logToFile("System: NOT Admin. Triggering Elevation...");
    // Relaunch the app with the 'RunAs' verb and the --admin flag
    const psCommand = `Start-Process "${process.execPath}" -ArgumentList '--admin' -Verb RunAs`;
    const child = spawn('powershell', ['-Command', psCommand], { 
      detached: true, 
      stdio: 'ignore' 
    });
    child.unref();
    app.quit();
    process.exit(0);
  }
}
// -------------------------------------

let mainWindow;
let splashWindow;

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 600,
    height: 400,
    transparent: false,
    backgroundColor: '#000000',
    frame: false,
    alwaysOnTop: true,
    center: true,
    skipTaskbar: true,
    webPreferences: {
      webSecurity: false
    }
  });

  splashWindow.loadFile('splash.html');
  splashWindow.maximize();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    show: false, // Start hidden for boot orchestration
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: '#0a0a0c',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      autoplayPolicy: 'no-user-gesture-required'
    }
  });

  mainWindow.maximize();

  // During development, we load the Vite dev server directly.
  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  } else {
    mainWindow.loadURL('http://localhost:5174');
  }

  // BOOT ORCHESTRATION
  createSplashWindow();

  setTimeout(() => {
    if (splashWindow) splashWindow.close();
    if (mainWindow) {
      mainWindow.show();
      mainWindow.webContents.send('boot:start-intro');
    }
  }, 4000); 
}

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

// IPC: Select an EXE file
ipcMain.handle('dialog:selectExe', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Executables', extensions: ['exe'] }]
  });
  if (result.canceled) {
    return null;
  }
  return result.filePaths[0]; // Returns the exact path on disk
});

// IPC: Get Games
ipcMain.handle('store:getGames', () => {
  try {
    const data = fs.readFileSync(dbPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading games.json:', error);
    return [];
  }
});

// IPC: Get GPUs from system
ipcMain.handle('os:getGpus', async () => {
  return new Promise((resolve) => {
    exec('powershell "Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name"', (err, stdout) => {
      if (err) return resolve(['Generic GPU']);
      const gpus = stdout.split('\r\n').map(g => g.trim()).filter(g => g.length > 0);
      resolve(gpus.length > 0 ? gpus : ['Generic GPU']);
    });
  });
});

// IPC: Set Windows GPU Preference for an EXE
async function setGpuPreference(exePath, preference) {
  // preference: 1 = Integrated, 2 = High Performance
  const regValue = `GpuPreference=${preference};`;
  const psCommand = `powershell "New-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\DirectX\\UserGpuPreferences' -Name '${exePath}' -Value '${regValue}' -PropertyType String -Force"`;
  
  return new Promise((resolve) => {
    exec(psCommand, (err) => {
      if (err) console.error('Registry Error:', err);
      resolve(!err);
    });
  });
}

// IPC: Save Game
ipcMain.handle('store:saveGame', async (event, gameData) => {
  try {
    const data = fs.readFileSync(dbPath, 'utf-8');
    const games = JSON.parse(data);
    games.push(gameData);
    fs.writeFileSync(dbPath, JSON.stringify(games, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing to games.json:', error);
    return false;
  }
});

// IPC: Delete Game
ipcMain.handle('store:deleteGame', async (event, exePath) => {
  try {
    const data = fs.readFileSync(dbPath, 'utf-8');
    let games = JSON.parse(data);
    games = games.filter(g => g.exePath !== exePath);
    fs.writeFileSync(dbPath, JSON.stringify(games, null, 2));
    return true;
  } catch (error) {
    console.error('Error deleting game:', error);
    return false;
  }
});

// IPC: Update Game
ipcMain.handle('store:updateGame', async (event, { oldExePath, updatedGame }) => {
  try {
    const data = fs.readFileSync(dbPath, 'utf-8');
    let games = JSON.parse(data);
    const index = games.findIndex(g => g.exePath === oldExePath);
    if (index !== -1) {
      games[index] = { ...games[index], ...updatedGame };
      fs.writeFileSync(dbPath, JSON.stringify(games, null, 2));
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error updating game:', error);
    return false;
  }
});

// --- UNIVERSAL PROCESS ENGINE ---
process.on('uncaughtException', (err) => {
  logToFile(`CRITICAL: Uncaught Exception: ${err.message}`);
});

ipcMain.handle('os:launchGame', async (event, { exePath, gpuPreference }) => {
  logToFile(`OS: Universal Launch - ${exePath}`);
  
  try {
    if (gpuPreference && gpuPreference !== '0') {
      await setGpuPreference(exePath, gpuPreference);
    }

    const startTime = Date.now();
    const exeName = path.basename(exePath);
    const procName = exeName.replace(/\.exe$/i, '');
    
    if (mainWindow) {
      mainWindow.maximize();
      mainWindow.blur(); // Yield focus so the game window can come forward
      mainWindow.webContents.send('os:game-launching');
    }
    
    if (!fs.existsSync(exePath)) {
      throw new Error(`File not found: ${exePath}`);
    }

    // Using 'start' is the most compatible way to launch complex Windows games.
    // It allows the Windows shell to handle launchers and window focus correctly.
    exec(`start "" "${exePath}"`, { cwd: path.dirname(exePath) });

    let exitHandled = false;
    const handleExit = () => {
      if (exitHandled) return;
      exitHandled = true;
      logToFile(`OS: Session complete: ${procName}`);
      if (mainWindow) {
        mainWindow.maximize();
        mainWindow.focus();
        mainWindow.webContents.send('os:game-closed');
      }
      
      const duration = Date.now() - startTime;
      try {
        const data = fs.readFileSync(dbPath, 'utf-8');
        const games = JSON.parse(data);
        const idx = games.findIndex(g => g.exePath === exePath);
        if (idx !== -1) {
          games[idx].playtimeMs = (games[idx].playtimeMs || 0) + duration;
          fs.writeFileSync(dbPath, JSON.stringify(games, null, 2));
        }
      } catch (e) {}
    };

    // UNIVERSAL SENTINEL: Tracks the process name AND its children
    const pollInterval = setInterval(() => {
      // Check for any process that matches the EXE name OR is a child of the original spawn
      // This handles "Launcher -> Game" transitions
      const psCommand = `powershell "$p = Get-Process -Name '${procName}' -ErrorAction SilentlyContinue; if(!$p){ $p = Get-Process | Where-Object { $_.ParentProcessId -eq ${child.pid} } }; if($p){ echo 'RUNNING' }"`;
      
      exec(psCommand, (err, stdout) => {
        const isRunning = stdout && stdout.includes('RUNNING');
        if (!isRunning) {
          // Double check with tasklist just in case
          exec(`tasklist /FI "IMAGENAME eq ${exeName}"`, (err2, stdout2) => {
            const isStillRunning = stdout2 && stdout2.toLowerCase().includes(exeName.toLowerCase());
            if (!isStillRunning) {
              clearInterval(pollInterval);
              handleExit();
            }
          });
        }
      });
    }, 5000);

    child.unref();
    return true;
  } catch (err) {
    logToFile(`OS: Universal Launch Error: ${err.message}`);
    return false;
  }
});

ipcMain.handle('os:openLogs', () => {
  exec(`explorer /select,"${logPath}"`);
});

ipcMain.handle('os:close', () => {
  app.quit();
});

ipcMain.handle('os:openUrl', (event, url) => {
  shell.openExternal(url);
});

ipcMain.handle('os:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});
