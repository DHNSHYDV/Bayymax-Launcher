import packager from 'electron-packager';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { rcedit } = require('rcedit');
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

const options = {
  dir: '.',
  out: 'release',
  name: 'Bayymax Launcher',
  platform: 'win32',
  arch: 'x64',
  overwrite: true,
  asar: true,
  prune: true,
  win32metadata: {
    CompanyName: 'DHNSHYDV',
    FileDescription: 'Bayymax Launcher Executable',
    ProductName: 'Bayymax Launcher'
  },
  ignore: [
    /release/,
    /src/,
    /node_modules\/\.bin/,
    /README\.md/,
    /vite\.config\.js/,
    /\.git/,
    /\.zip$/,
    /\.cer$/
  ]
};

async function build() {
  console.log('--- Phase 0: Cleaning Up Processes ---');
  try {
    // Kill running process from desktop if any
    execSync('taskkill /F /IM "Bayymax Launcher.exe"', { stdio: 'ignore' });
  } catch (e) {}

  console.log('--- Phase 1: Vite Build ---');
  execSync('npm run build', { stdio: 'inherit' });

  console.log('--- Phase 2: Packaging Electron App ---');
  const appPaths = await packager(options);
  const appPath = appPaths[0];
  const exePath = path.join(appPath, 'Bayymax Launcher.exe');

  // Safety delay to ensure filesystem locks are released before rcedit
  console.log('--- Phase 2.5: Waiting for file release... ---');
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('--- Phase 3: Injecting Administrator Manifest & Icon ---');
  // rcedit allows us to manually set the requested-execution-level and the icon
  await rcedit(exePath, {
    'requested-execution-level': 'requireAdministrator',
    icon: path.resolve('assets/logo.ico')
  });

  console.log('--- Phase 3.5: Code Signing Executable ---');
  try {
    const certName = 'CN=DHNSHYDV';
    const psCommand = `$cert = Get-ChildItem -Path 'Cert:\\CurrentUser\\My' | Where-Object { $_.Subject -match '${certName}' } | Select-Object -First 1; Set-AuthenticodeSignature -FilePath '${exePath}' -Certificate $cert -TimestampServer 'http://timestamp.digicert.com'`;
    execSync(`powershell -Command "${psCommand}"`, { stdio: 'inherit' });
  } catch (err) {
    console.error('Signing failed:', err.message);
  }

  console.log('--- Phase 4: Syncing to Desktop ---');
  const desktopPath = 'C:/Users/dhanu/Desktop/Bayymax Launcher';
  
  // Kill running process if any
  try {
    execSync('taskkill /F /IM "Bayymax Launcher.exe"', { stdio: 'ignore' });
    console.log('--- Phase 4.1: Waiting for process termination... ---');
    await new Promise(resolve => setTimeout(resolve, 3000)); // Give Windows 3s to release locks
  } catch (e) {}

  if (!fs.existsSync(desktopPath)) {
    fs.mkdirSync(desktopPath, { recursive: true });
  }

  // Copy files to desktop
  const files = fs.readdirSync(appPath);
  for (const file of files) {
    const src = path.join(appPath, file);
    const dest = path.join(desktopPath, file);
    
    // Simple recursive copy
    if (fs.lstatSync(src).isDirectory()) {
       execSync(`powershell -Command "Copy-Item -Path '${src}' -Destination '${desktopPath}' -Recurse -Force"`);
    } else {
       // Retry logic for the main exe which might be locked by AV/Indexing
       let copied = false;
       let attempts = 0;
       while (!copied && attempts < 5) {
         try {
           fs.copyFileSync(src, dest);
           copied = true;
         } catch (err) {
           attempts++;
           if (attempts === 5) throw err;
           console.log(`--- Sync attempt ${attempts} failed (${file}), retrying... ---`);
           await new Promise(resolve => setTimeout(resolve, 2000));
         }
       }
    }
  }

  console.log('--- SUCCESS: Build complete and pushed to Desktop ---');
  console.log(`Path: ${desktopPath}`);
}

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
