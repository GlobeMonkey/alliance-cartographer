const fs = require('fs');

const css = `

/* --- SPLASH SCREEN --- */
.splash-screen {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  transition: opacity 0.8s ease, visibility 0.8s;
  overflow: hidden;
}
.splash-glow {
  position: absolute;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(76,201,240,0.15) 0%, rgba(0,0,0,0) 70%);
  border-radius: 50%;
  pointer-events: none;
  transform: translate(-50%, -50%);
  transition: opacity 0.3s ease;
  z-index: 1;
}
.splash-content {
  position: relative;
  z-index: 2;
  text-align: center;
  max-width: 600px;
  padding: 2rem;
}
.splash-title {
  font-size: 3rem;
  margin-bottom: 1rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, var(--text) 0%, var(--accent) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.splash-subtitle {
  font-size: 1.2rem;
  color: var(--muted);
  line-height: 1.6;
  margin-bottom: 2.5rem;
}
.splash-btn {
  background: var(--accent);
  color: #fff;
  border: none;
  padding: 14px 32px;
  border-radius: 30px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 4px 15px rgba(76, 201, 240, 0.3);
}
.splash-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(76, 201, 240, 0.4);
}
body.app-started .splash-screen {
  opacity: 0;
  visibility: hidden;
}

/* --- MENU ICON --- */
.menu-btn {
  position: fixed;
  top: 16px;
  left: 16px;
  z-index: 1000;
  background: var(--panel-bg);
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: 12px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  transition: background 0.2s, transform 0.2s;
}
.menu-btn:hover {
  background: var(--panel-hover);
  transform: scale(1.05);
}
body.sidebar-collapsed .menu-btn {
  /* Change icon or style if needed */
}

/* --- SIDEBAR UPDATES --- */
.sidebar {
  border-radius: 16px;
  margin: 16px;
  height: calc(100vh - 32px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  top: 0;
  left: 0;
  z-index: 999;
}
body.sidebar-collapsed .sidebar {
  transform: translateX(calc(-100% - 32px));
}

/* Scrollbar styling */
.sidebar::-webkit-scrollbar {
  width: 6px;
}
.sidebar::-webkit-scrollbar-track {
  background: transparent;
}
.sidebar::-webkit-scrollbar-thumb {
  background: rgba(128, 128, 128, 0.3);
  border-radius: 4px;
}
.sidebar::-webkit-scrollbar-thumb:hover {
  background: rgba(128, 128, 128, 0.5);
}

/* --- FLOATING INFO PANEL --- */
.floating-panel {
  position: fixed;
  top: 16px;
  right: 16px;
  width: 320px;
  background: var(--panel-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  z-index: 1000;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s;
  backdrop-filter: blur(12px);
}
.floating-panel.empty {
  transform: translateX(120%);
  opacity: 0;
  pointer-events: none;
}
.floating-panel-close {
  position: absolute;
  top: 12px;
  right: 12px;
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  display: flex;
}
.floating-panel-close:hover {
  background: var(--panel-hover);
  color: var(--text);
}

/* Update main margin because sidebar is floating over */
.main {
  margin-left: 0;
}
`;

fs.appendFileSync('css/style.css', css, 'utf8');
console.log('CSS updated successfully');
