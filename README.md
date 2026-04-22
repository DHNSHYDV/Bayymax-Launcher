# Bayymax Launcher 🚀

A high-fidelity, cinema-inspired PC game launcher designed for the ultimate "Big Picture" desktop experience. 

![Bayymax Launcher Logo](assets/logo.ico)

## ✨ Features

- **🎬 Triple-Phase Boot Sequence**: Professional startup flow modeled after AAA titles (Splash Screen → Cinematic Intro → Landing Page).
- **🤫 Stealth Mode**: Launcher completely vanishes from the screen and taskbar during gameplay to minimize distractions.
- **⚙️ Integrated Game Manager**: Easily add, edit metadata, update cover art, or remove games from your local library.
- **⚡ Performance First**: GPU-accelerated carousel with premium cubic-bezier animations and unmuted cinematic transitions.
- **🎮 Controller-Friendly UI**: Responsive 10-foot interface with glassmorphic aesthetics and dynamic background crossfaders.
- **🔋 System Sync**: Intelligent monitoring of battery life, GPU preferences, and clock sync.
- **🛡️ Enhanced Process Tracker**: New shell-based engine that handles complex third-party launchers (Rockstar, Steam, etc.) with perfect reliability.

## 🆕 What's New
### v1.1.4 (The "Clean & Polish" Update)
- **UI Refinement:** Cleaned up the status bar by removing those weird gaps and redundant dividers.
- **Icon Glow-up:** Swapped the old settings icon for a much cleaner, minimalist gear.
- **Animation Fix:** Removed the distracting "rotating glow" and replaced it with a subtle, professional hover effect. No more squary boxes!
- **Symmetry:** Fixed the layout spacing in the top bar to make everything feel balanced and premium.

### v1.1.3
- **Universal Game Tracking:** Rewrote the process monitoring system from the ground up. Launcher now correctly detects when heavy AAA titles (GTA V, RDR2, etc.) are actually closed, even through third-party launchers.
- **GPU Preference Engine:** Added a dedicated hardware preference menu. You can now force games to use your Dedicated GPU (High Performance) or Integrated Graphics (Power Saving) directly from the launcher.
- **Admin Elevation:** Built-in manifest injection to ensure games always have the permissions they need to track playtime.
- **Visuals:** Refined glassmorphism and transition speeds for a snappier feel.


## 🛠️ Technology Stack

- **Framework**: Electron + Vite
- **Logic**: Vanilla JavaScript
- **Styling**: Modern CSS (Glassmorphism, Variable-based Design System)
- **Tooling**: `rcedit` (Windows binary modification), `electron-packager`

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- Windows OS (for the build pipeline and manifest injection)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/DHNSHYDV/Bayymax-Launcher.git
   cd Bayymax-Launcher
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run in development mode:
   ```bash
   npm run dev
   ```

### Building for Production

The project includes a custom orchestrated build pipeline that handles Electron packaging, icon injection, and Administrator manifest requirements:

```bash
node build.js
```

The final executable will be located in the `release/` folder and automatically synced to your Desktop.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Credits

Designed for gamers, by gamers. Dedicated to the pursuit of the perfect desktop experience.
