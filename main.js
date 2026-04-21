// Mock Fallback Game Data
const mockGames = [
  {
    exePath: '',
    title: 'Welcome to Baymax',
    meta: 'System • Local Library Empty',
    description: 'Press the + button in the top right to locate .exe files on your computer and build your library.',
    bgImage: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1920&q=80',
    coverImage: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=600&q=80'
  }
];

let games = [...mockGames];
let focusedIndex = 0;
let activeBgLayer = 1; // 1 or 2
let isPlayButtonFocused = false;
let isModalOpen = false;

// DOM Elements
const track = document.getElementById('carousel-track');
const bgLayer1 = document.getElementById('bg-layer-1');
const bgLayer2 = document.getElementById('bg-layer-2');
const titleEl = document.getElementById('game-title');
const metaEl = document.getElementById('game-meta');
const descEl = document.getElementById('game-description');
const playBtn = document.getElementById('play-btn');

// Modal Elements
const modal = document.getElementById('add-game-modal');
const btnAddGame = document.getElementById('btn-add-game');
const inputExe = document.getElementById('input-exe');
const inputTitle = document.getElementById('input-title');
const inputCover = document.getElementById('input-cover');
const inputBg = document.getElementById('input-bg');
const btnSave = document.getElementById('btn-save');
const btnCancel = document.getElementById('btn-cancel');
const btnDelete = document.getElementById('btn-delete');
const btnManageGame = document.getElementById('manage-game-btn');
const manageDivider = document.getElementById('manage-divider');
const modalTitle = document.getElementById('modal-title');
const modalDesc = document.getElementById('modal-desc');

let editModePath = null; // Stores original path when editing

async function init() {
  loadProfile();
  await fetchGames();
  await initGpuPreference();
  renderCarousel();
  updateFocusUI(true);
  startClock();
  initBattery();
  initGithubLink();

  if (window.electronAPI) {
    window.electronAPI.onBootStart(() => {
      initIntro();
    });
  } else {
    // Web Fallback
    initIntro();
  }
}

function initIntro() {
  const introOverlay = document.getElementById('intro-overlay');
  const introVideo = document.getElementById('intro-video');
  const landingUI = document.querySelector('.launcher-container');
  
  if (!introVideo || !introOverlay) {
    if (landingUI) landingUI.style.opacity = '1';
    initAudio(); 
    return;
  }

  // Ensure landing UI is hidden
  if (landingUI) landingUI.style.opacity = '0';
  landingUI.style.transition = 'opacity 2s ease-in-out';

  // Play video immediately
  introVideo.play().catch(err => {
    console.log("Intro autoplay blocked, waiting for interaction", err);
    // If blocked, we might need a "Press to Start" but let's try auto-playing first
  });

  introVideo.onended = () => {
    // 1. Fade out the video
    introOverlay.classList.add('hidden');
    
    // 2. The 1.5 second "Suspense Gap"
    setTimeout(() => {
      // 3. Reveal the landing page
      if (landingUI) landingUI.style.opacity = '1';
      
      // 4. Start the background music logic only now
      initAudio();
    }, 1500);
  };
}

function initAudio() {
  const music = document.getElementById('bg-music');
  const musicBtn = document.getElementById('music-toggle-btn');
  let hasStarted = false;

  // Initialize volume at 0 for fade-in
  if (music) {
    music.volume = 0;
  }

  const startMusic = () => {
    if (hasStarted || !music) return;
    hasStarted = true;
    
    music.play().then(() => {
      musicBtn.classList.add('playing');
      // Gentle Fade In
      let vol = 0;
      const fadeIn = setInterval(() => {
        vol += 0.02;
        music.volume = vol;
        if (vol >= 0.4) clearInterval(fadeIn);
      }, 100);
    }).catch(err => console.log("Autoplay blocked or file missing:", err));

    // Remove listeners once music starts
    window.removeEventListener('keydown', startMusic);
    window.removeEventListener('click', startMusic);
    window.removeEventListener('wheel', startMusic);
  };

  // Start on first interaction
  window.addEventListener('keydown', startMusic);
  window.addEventListener('click', startMusic);
  window.addEventListener('wheel', startMusic);

  // Sync with Game Lifecycle
  if (window.electronAPI) {
    window.electronAPI.onGameClosed(() => {
      if (music && hasStarted) {
        // Resume with fade-in
        music.play();
        musicBtn.classList.add('playing');
        musicBtn.classList.remove('muted');
        
        // Gentle Fade In from 0
        music.volume = 0;
        let vol = 0;
        const fadeIn = setInterval(() => {
          vol += 0.05;
          music.volume = vol;
          if (vol >= 0.4) clearInterval(fadeIn);
        }, 100);
      }
    });
  }

  // Toggle Function
  if (musicBtn) {
    musicBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Don't trigger startMusic listener again
      if (!music) return;

      if (music.paused) {
        music.play();
        musicBtn.classList.add('playing');
        musicBtn.classList.remove('muted');
      } else {
        music.pause();
        musicBtn.classList.remove('playing');
        musicBtn.classList.add('muted');
      }
    });
  }
}

function initGithubLink() {
  const githubLink = document.getElementById('github-link');
  if (githubLink) {
    githubLink.addEventListener('click', () => {
      window.electronAPI.openUrl('https://github.com/DHNSHYDV');
    });
  }
}

// Profile API
function loadProfile() {
  const username = localStorage.getItem('baymax_username') || localStorage.getItem('stellar_username') || 'Player One';
  const avatar = localStorage.getItem('baymax_avatar') || localStorage.getItem('stellar_avatar') || 'https://api.dicebear.com/9.x/pixel-art/svg?seed=Player1&backgroundColor=15151a';
  document.getElementById('profile-username-text').textContent = username;
  document.getElementById('profile-avatar-img').src = avatar;
}

// Battery API integration
function initBattery() {
  const batteryText = document.getElementById('battery-text');
  const batteryFill = document.getElementById('battery-fill');

  if (navigator.getBattery) {
    navigator.getBattery().then(battery => {
      function updateBattery() {
        const level = Math.round(battery.level * 100);
        batteryText.textContent = `${level}%`;
        
        const chargingIcon = document.getElementById('charging-icon');
        if (chargingIcon) {
          chargingIcon.style.display = battery.charging ? 'inline' : 'none';
        }

        const batteryItem = document.getElementById('battery-status-item');
        if (batteryItem) {
          if (battery.charging) batteryItem.classList.add('charging-pulse');
          else batteryItem.classList.remove('charging-pulse');
        }

        // Update SVG fill width (max width in viewBox is approx 10-14 for the fill)
        if (batteryFill) {
          batteryFill.setAttribute('width', (battery.level * 12).toFixed(1));
          batteryFill.style.fill = battery.level < 0.2 ? '#ff4757' : (battery.charging ? 'var(--accent)' : 'var(--text-primary)');
        }
      }
      updateBattery();
      battery.addEventListener('levelchange', updateBattery);
      battery.addEventListener('chargingchange', updateBattery);
    });
  } else {
    const batteryItem = document.getElementById('battery-status-item');
    if (batteryItem) batteryItem.style.display = 'none';
  }
}

// When returning focused to the launcher (e.g. game closed), refresh DB stats
window.addEventListener('focus', async () => {
  if (window.electronAPI) {
    await fetchGames();
    if (focusedIndex >= games.length) focusedIndex = games.length - 1;
    updateFocusUI();
  }
});

const addGameTile = {
  isAddTile: true,
  title: 'Add New Game',
  meta: 'System Action',
  description: 'Select an executable file from your computer to add it to your library.',
  bgImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1920&q=80'
};

// Fetch local JSON from Electron
async function fetchGames() {
  if (window.electronAPI) {
    const storedGames = await window.electronAPI.getGames();
    if (storedGames && storedGames.length > 0) {
      games = [...storedGames, addGameTile]; // Append Add tile
    } else {
      games = [addGameTile]; // No games? Just show the '+' tile
    }
  } else {
    games = [addGameTile]; // local dev clean slate
  }
}

// Helper to ensure local paths work as file:/// URLs
function ensureFileUrl(path) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  if (path.startsWith('file:///')) return path;
  // Convert C:\Path to file:///C:/Path
  let sanitized = path.replace(/\\/g, '/');
  if (!sanitized.startsWith('/')) sanitized = '/' + sanitized;
  return 'file://' + sanitized;
}

// Render the game cards
function renderCarousel() {
  track.innerHTML = '';
  games.forEach((game, index) => {
    const card = document.createElement('div');
    card.className = 'game-card';
    card.id = `card-${index}`;
    
    // Fallback clicking
    card.addEventListener('click', () => {
      if (isModalOpen) return;
      if (focusedIndex === index) {
        // Already focused, clicking again acts as 'Play'
        if (game.isAddTile) {
          triggerAddGameFlow();
        } else {
          playBtn.innerText = 'Starting...';
          if (window.electronAPI && game.exePath) {
            const gpuPreference = localStorage.getItem('baymax_gpu_preference') || '0';
            window.electronAPI.launchGame({ exePath: game.exePath, gpuPreference });
          }
          setTimeout(() => {
            playBtn.innerHTML = '<span class="icon">▶</span><span class="text">Play Now</span>';
          }, 2000);
        }
      } else {
        focusedIndex = index;
        isPlayButtonFocused = false;
        updateFocusUI();
      }
    });

    if (game.isAddTile) {
      card.innerHTML = `
        <div class="add-tile-content">+</div>
        <div class="card-overlay" style="opacity: 1; background: transparent; padding-bottom: 0.5rem; justify-content: center; transform: translateY(0);">
          <span class="card-title" style="transform:none;">Add Game</span>
        </div>
      `;
    } else {
      const coverUrl = ensureFileUrl(game.coverImage);
      card.innerHTML = `
        <img src="${coverUrl}" alt="" onerror="this.src='https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80'; this.style.opacity='0.5';" />
        <div class="card-overlay">
          <span class="card-title">${game.title}</span>
        </div>
      `;
    }
    
    track.appendChild(card);
  });
}

// Update the focused visuals
function updateFocusUI(initial = false) {
  if (games.length === 0) return;
  const game = games[focusedIndex];
  
  // 1. Calculate Playtime & Update Game Info text
  let metaDisplay = game.meta;
  if (!game.isAddTile) {
    if (game.playtimeMs) {
      const hoursPlayed = (game.playtimeMs / (1000 * 60 * 60)).toFixed(2);
      metaDisplay = `${hoursPlayed} Hours Played`;
    } else {
      metaDisplay = `0 Hours Played`;
    }
  }

  titleEl.textContent = game.title;
  metaEl.textContent = metaDisplay;
  descEl.textContent = game.description;

  // re-trigger animation
  titleEl.style.animation = 'none';
  metaEl.style.animation = 'none';
  descEl.style.animation = 'none';
  playBtn.style.animation = 'none';
  void titleEl.offsetWidth; // trigger reflow
  titleEl.style.animation = 'fadeUp 0.6s var(--ease-out)';
  metaEl.style.animation = 'fadeUp 0.7s var(--ease-out)';
  descEl.style.animation = 'fadeUp 0.8s var(--ease-out)';
  if(!initial) playBtn.style.animation = 'fadeUp 0.9s var(--ease-out)';

  // Show/Hide Manage button
  if (btnManageGame && manageDivider) {
    if (game && !game.isAddTile) {
      btnManageGame.style.display = 'flex';
      manageDivider.style.display = 'block';
    } else {
      btnManageGame.style.display = 'none';
      manageDivider.style.display = 'none';
    }
  }

  // 2. Crossfade Backgrounds
  const newBgUrl = `url('${game.bgImage}')`;
  if (activeBgLayer === 1) {
    bgLayer2.style.backgroundImage = newBgUrl;
    bgLayer2.classList.add('active');
    bgLayer1.classList.remove('active');
    activeBgLayer = 2;
  } else {
    bgLayer1.style.backgroundImage = newBgUrl;
    bgLayer1.classList.add('active');
    bgLayer2.classList.remove('active');
    activeBgLayer = 1;
  }

  // 3. Highlight Card
  document.querySelectorAll('.game-card').forEach((el, index) => {
    if (index === focusedIndex) {
      el.classList.add('focused');
    } else {
      el.classList.remove('focused');
    }
  });

  // 4. Update Play Button focus state
  if (game.isAddTile) {
    playBtn.innerHTML = '<span class="icon">+</span><span class="text">Select File</span>';
  } else {
    playBtn.innerHTML = '<span class="icon">▶</span><span class="text">Play Now</span>';
  }

  if (isPlayButtonFocused) {
    playBtn.classList.add('focused');
    document.getElementById(`card-${focusedIndex}`).classList.remove('focused');
  } else {
    playBtn.classList.remove('focused');
  }

  // 5. Move Carousel Track (Centered Overhaul)
  const cardWidth = 300;
  const gap = 200;
  const itemTotalWidth = cardWidth + gap;
  
  // Calculation to keep the focused item perfectly in the center of the screen
  const screenCenter = window.innerWidth / 2;
  const centeredOffset = screenCenter - (itemTotalWidth / 2);
  const offset = centeredOffset - (focusedIndex * itemTotalWidth);
  
  track.style.transform = `translateX(${offset}px) translate3d(0,0,0)`;
}

async function triggerAddGameFlow() {
  editModePath = null; // We are adding, not editing
  modalTitle.innerText = 'Add Local PC Game';
  modalDesc.innerText = 'Details for your new shortcut.';
  btnSave.innerText = 'Add to Library';
  btnDelete.classList.add('hidden');

  if (!window.electronAPI) {
    // WEB BROWSER FALLBACK: Show UI for testing even without OS system hooks
    isModalOpen = true;
    inputExe.value = "C:\\Games\\Mock_Local_Game.exe";
    inputTitle.value = '';
    inputCover.value = '';
    inputBg.value = '';
    btnSave.classList.remove('hidden');
    modal.classList.remove('hidden');
    inputTitle.focus();
    return;
  }
  
  const exePath = await window.electronAPI.selectExe();
  if (exePath) {
    isModalOpen = true;
    inputExe.value = exePath;
    inputTitle.value = '';
    inputCover.value = '';
    inputBg.value = '';
    btnSave.classList.remove('hidden');
    modal.classList.remove('hidden');
    inputTitle.focus();
  }
}

playBtn.addEventListener('click', () => {
  const activeGame = games[focusedIndex];
  
  if (activeGame.isAddTile) {
    triggerAddGameFlow();
  } else {
    playBtn.innerText = 'Starting...';
    // Mute music on launch
    const music = document.getElementById('bg-music');
    if (music) music.pause();
    const musicBtn = document.getElementById('music-toggle-btn');
    if (musicBtn) musicBtn.classList.remove('playing');

    // BOOT SYSTEM
    if (window.electronAPI && activeGame.exePath) {
      const gpuPreference = localStorage.getItem('baymax_gpu_preference') || '0';
      window.electronAPI.launchGame({ exePath: activeGame.exePath, gpuPreference });
    }
    setTimeout(() => {
      playBtn.innerHTML = '<span class="icon">▶</span><span class="text">Play Now</span>';
    }, 2000);
  }
});

btnCancel.addEventListener('click', () => {
  modal.classList.add('hidden');
  isModalOpen = false;
});

btnSave.addEventListener('click', async () => {
  if (!inputTitle.value || !inputCover.value || !inputBg.value) {
    alert('Please fill out all fields first!');
    return;
  }
  
  const newGame = {
    exePath: inputExe.value,
    title: inputTitle.value,
    meta: 'PC System Utility',
    description: 'Locally added executable file.',
    bgImage: ensureFileUrl(inputBg.value),
    coverImage: ensureFileUrl(inputCover.value)
  };

  btnSave.disabled = true;
  btnSave.innerText = "Saving...";

  if (window.electronAPI) {
    if (editModePath) {
      // UPDATING
      const success = await window.electronAPI.updateGame({ oldExePath: editModePath, updatedGame: newGame });
      if (success) {
        await fetchGames();
        renderCarousel();
        updateFocusUI(true);
      } else {
        alert('Failed to update game data.');
      }
    } else {
      // SAVING NEW
      await window.electronAPI.saveGame(newGame);
      await fetchGames();
      focusedIndex = games.length - 2; // Focus newly added game automatically
      renderCarousel();
      updateFocusUI();
    }
  } else {
    // WEB FALLBACK
    const addTile = games.pop();
    games.push(newGame);
    games.push(addTile);
    focusedIndex = games.length - 2;
    renderCarousel();
    updateFocusUI();
  }

  modal.classList.add('hidden');
  isModalOpen = false;
  btnSave.disabled = false;
  btnSave.innerText = editModePath ? "Save Changes" : "Add to Library";
});

btnDelete.addEventListener('click', async () => {
  if (!editModePath) return;
  
  const confirmed = confirm(`Are you sure you want to remove "${inputTitle.value}" from your library?\n\nThis will not delete the game files from your computer.`);
  if (!confirmed) return;

  if (window.electronAPI) {
    const success = await window.electronAPI.deleteGame(editModePath);
    if (success) {
      await fetchGames();
      if (focusedIndex >= games.length) focusedIndex = games.length - 1;
      renderCarousel();
      updateFocusUI(true);
      modal.classList.add('hidden');
      isModalOpen = false;
    } else {
      alert('Failed to delete game.');
    }
  }
});

btnManageGame.addEventListener('click', () => {
  const activeGame = games[focusedIndex];
  if (!activeGame || activeGame.isAddTile) return;

  isModalOpen = true;
  editModePath = activeGame.exePath;
  
  // Setup Modal UI
  modalTitle.innerText = 'Edit Game Details';
  modalDesc.innerText = 'Modify identifying info or art for this game.';
  btnSave.innerText = 'Save Changes';
  btnSave.classList.remove('hidden');
  btnDelete.classList.remove('hidden');
  
  // Fill fields
  inputExe.value = activeGame.exePath;
  inputTitle.value = activeGame.title;
  inputCover.value = activeGame.coverImage;
  inputBg.value = activeGame.bgImage;

  modal.classList.remove('hidden');
  inputTitle.focus();
});

// ----- PROFILE LOGIC -----
const profileBtn = document.getElementById('profile-btn');
const profileModal = document.getElementById('edit-profile-modal');
const inputUsername = document.getElementById('input-username');
const inputAvatarConfig = document.getElementById('input-avatar');
const avatarOptions = document.querySelectorAll('.avatar-option');
const btnCustomAvatar = document.getElementById('btn-custom-avatar');
const customAvatarUpload = document.getElementById('custom-avatar-upload');
const btnSaveProfile = document.getElementById('btn-save-profile');
const btnCancelProfile = document.getElementById('btn-cancel-profile');

// Handle avatar click selection (for presets)
avatarOptions.forEach(opt => {
  if (opt.id !== 'btn-custom-avatar') {
    opt.addEventListener('click', () => {
      avatarOptions.forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      inputAvatarConfig.value = opt.getAttribute('data-url');
    });
  }
});

// Handle custom upload button
btnCustomAvatar.addEventListener('click', () => {
  customAvatarUpload.click();
});

customAvatarUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target.result;
      
      // Select this option visually
      avatarOptions.forEach(o => o.classList.remove('selected'));
      btnCustomAvatar.classList.add('selected');
      
      // Show preview inside the btn
      btnCustomAvatar.style.backgroundImage = `url('${base64Data}')`;
      btnCustomAvatar.textContent = ''; 
      
      // Update hidden input and data store
      inputAvatarConfig.value = base64Data;
      btnCustomAvatar.setAttribute('data-url', base64Data);
    };
    reader.readAsDataURL(file);
  }
});

profileBtn.addEventListener('click', () => {
  isModalOpen = true;
  profileModal.classList.remove('hidden');
  inputUsername.value = localStorage.getItem('baymax_username') || localStorage.getItem('stellar_username') || 'Player One';
  
  const savedAvatar = localStorage.getItem('baymax_avatar') || localStorage.getItem('stellar_avatar') || 'https://api.dicebear.com/9.x/pixel-art/svg?seed=Player1&backgroundColor=15151a';
  inputAvatarConfig.value = savedAvatar;
  
  // Highlight the correct avatar in the grid
  let found = false;
  avatarOptions.forEach(opt => {
    if (opt.id !== 'btn-custom-avatar' && opt.getAttribute('data-url') === savedAvatar) {
      opt.classList.add('selected');
      found = true;
    } else {
      opt.classList.remove('selected');
    }
  });
  
  // Restore Custom Base64 Image if it was previously saved
  if (!found && savedAvatar) {
    btnCustomAvatar.classList.add('selected');
    btnCustomAvatar.style.backgroundImage = `url('${savedAvatar}')`;
    btnCustomAvatar.textContent = '';
    btnCustomAvatar.setAttribute('data-url', savedAvatar);
  } else {
    // Reset custom button to default + state
    btnCustomAvatar.classList.remove('selected');
    btnCustomAvatar.style.backgroundImage = '';
    btnCustomAvatar.textContent = '+';
  }
});

btnCancelProfile.addEventListener('click', () => {
  profileModal.classList.add('hidden');
  isModalOpen = false;
});

btnSaveProfile.addEventListener('click', () => {
  if (inputUsername.value) localStorage.setItem('baymax_username', inputUsername.value);
  if (inputAvatarConfig.value) localStorage.setItem('baymax_avatar', inputAvatarConfig.value);
  
  loadProfile(); // refresh DOM
  profileModal.classList.add('hidden');
  isModalOpen = false;
});

// ----- GPU SETTINGS LOGIC -----
const gpuBtn = document.getElementById('gpu-preference-btn');
const gpuModal = document.getElementById('gpu-modal');
const gpuListContainer = document.getElementById('detected-gpu-list');
const gpuOptBtns = document.querySelectorAll('.gpu-opt-btn');
const btnCloseGpu = document.getElementById('btn-close-gpu');
const gpuTextIcon = document.getElementById('gpu-text');

async function initGpuPreference() {
  const currentPref = localStorage.getItem('baymax_gpu_preference') || '0';
  updateGpuUI(currentPref);

  if (window.electronAPI) {
    const gpus = await window.electronAPI.getGpus();
    gpuListContainer.innerHTML = '';
    gpus.forEach(gpu => {
      const div = document.createElement('div');
      div.className = 'gpu-item';
      div.textContent = gpu;
      gpuListContainer.appendChild(div);
    });
  }
}

function updateGpuUI(pref) {
  gpuOptBtns.forEach(btn => {
    if (btn.getAttribute('data-pref') === pref) {
      btn.classList.add('selected');
    } else {
      btn.classList.remove('selected');
    }
  });

  const labels = { '0': 'AUTO', '1': 'iGPU', '2': 'dGPU' };
  gpuTextIcon.textContent = labels[pref] || 'AUTO';
}

gpuBtn.addEventListener('click', () => {
  isModalOpen = true;
  gpuModal.classList.remove('hidden');
});

gpuOptBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const pref = btn.getAttribute('data-pref');
    localStorage.setItem('baymax_gpu_preference', pref);
    updateGpuUI(pref);
  });
});

btnCloseGpu.addEventListener('click', () => {
  gpuModal.classList.add('hidden');
  isModalOpen = false;
});

const btnOpenLogs = document.getElementById('btn-open-logs');
btnOpenLogs.addEventListener('click', () => {
  if (window.electronAPI) window.electronAPI.openLogs();
});

if (window.electronAPI) {
  window.electronAPI.onLaunchError((errorMsg) => {
    alert(`LAUNCH ERROR: ${errorMsg}\n\nTry running Bayymax Launcher as Administrator if this persists.`);
  });
}
// ----------------------------
// ----------------------------

// Window Controls
const winMin = document.getElementById('win-min');
const winMode = document.getElementById('win-mode');
const winClose = document.getElementById('win-close');
const launcherContainer = document.querySelector('.launcher-container');

winMin.addEventListener('click', () => {
  if (window.electronAPI) window.electronAPI.minimize();
});

winClose.addEventListener('click', () => {
  if (window.electronAPI) window.electronAPI.close();
});

winMode.addEventListener('click', () => {
  launcherContainer.classList.toggle('bordered-mode');
  // Optional: If you wanted to really resize the window, you'd call an IPC here.
  // For now, we simulate the "bordered" look while keeping the app at scale.
});

// Keyboard Navigation
window.addEventListener('keydown', (e) => {
  if (isModalOpen) return; // Disable keyboard nav in modal

  if (e.key === 'ArrowRight') {
    if (!isPlayButtonFocused) {
      if (focusedIndex < games.length - 1) {
        focusedIndex++;
        updateFocusUI();
      }
    }
  } else if (e.key === 'ArrowLeft') {
    if (!isPlayButtonFocused) {
      if (focusedIndex > 0) {
        focusedIndex--;
        updateFocusUI();
      }
    }
  } else if (e.key === 'ArrowUp') {
    if (!isPlayButtonFocused) {
      isPlayButtonFocused = true;
      updateFocusUI();
    }
  } else if (e.key === 'ArrowDown') {
    if (isPlayButtonFocused) {
      isPlayButtonFocused = false;
      updateFocusUI();
    }
  } else if (e.key === 'Enter') {
    if (isPlayButtonFocused) {
      const activeGame = games[focusedIndex];
      
      if (activeGame.isAddTile) {
        triggerAddGameFlow();
      } else {
        playBtn.innerText = 'Starting...';
        // Mute music on launch
        const music = document.getElementById('bg-music');
        if (music) music.pause();
        const musicBtn = document.getElementById('music-toggle-btn');
        if (musicBtn) musicBtn.classList.remove('playing');

        // BOOT SYSTEM
        if (window.electronAPI && activeGame.exePath) {
          const gpuPreference = localStorage.getItem('baymax_gpu_preference') || '0';
          window.electronAPI.launchGame({ exePath: activeGame.exePath, gpuPreference });
        }
        setTimeout(() => {
          playBtn.innerHTML = '<span class="icon">▶</span><span class="text">Play Now</span>';
        }, 2000);
      }
      
    } else {
      // If pressing enter on a card, shift focus up to play button
      isPlayButtonFocused = true;
      updateFocusUI();
    }
  }
});

// Mouse/Trackpad Scrolling over the stack
let isScrollingCooldown = false;
window.addEventListener('wheel', (e) => {
  if (isScrollingCooldown || isModalOpen) return;

  const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
  
  if (Math.abs(delta) > 10) { 
    let direction = Math.sign(delta);

    if (direction < 0 && focusedIndex < games.length - 1) { // Scroll Up/Left
      focusedIndex++;
      isPlayButtonFocused = false;
      updateFocusUI();
      isScrollingCooldown = true;
    } else if (direction > 0 && focusedIndex > 0) { // Scroll Down/Right
      focusedIndex--;
      isPlayButtonFocused = false;
      updateFocusUI();
      isScrollingCooldown = true;
    }

    if (isScrollingCooldown) {
      setTimeout(() => {
        isScrollingCooldown = false;
      }, 250); 
    }
  }
});

function startClock() {
  const clockEl = document.getElementById('clock');
  setInterval(() => {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString([], {timeStyle: 'short'});
  }, 1000);
}

// Boot up
document.addEventListener('DOMContentLoaded', init);
