const fs = require('fs');
let css = fs.readFileSync('css/style.css', 'utf8');

// Fix splash screen to be truly fullscreen
css = css.replace(
  `.splash-screen {
  position: fixed;
  top: 0; left: 0; width: 100vw; height: 100vh;
  z-index: 9999;`,
  `.splash-screen {
  position: fixed;
  top: 0; left: 0; width: 100%;
  height: 100%;
  min-height: 100vh;
  z-index: 9999;`
);

// If not found try the old form
if (!css.includes('min-height: 100vh;')) {
  css = css.replace(
    '.splash-screen {\n  position: fixed;\n  top: 0; left: 0; width: 100vw; height: 100vh;',
    '.splash-screen {\n  position: fixed;\n  top: 0;\n  left: 0;\n  width: 100%;\n  height: 100%;\n  min-height: 100vh;'
  );
}

// Add territory hover highlight styles + unrecognized state styles
const additionalCss = `

/* Territory hover highlight */
.map-country {
  transition: fill 0.15s ease, filter 0.15s ease !important;
}
.map-country.is-hovered {
  fill: rgba(95, 196, 255, 0.35) !important;
  filter: drop-shadow(0 0 6px rgba(95, 196, 255, 0.5));
  stroke: rgba(95, 196, 255, 0.9) !important;
  stroke-width: 1.5 !important;
}
.map-country.is-active.is-hovered {
  fill: rgba(255, 209, 102, 0.45) !important;
  stroke: rgba(255, 209, 102, 1) !important;
}

/* Country node hover glow */
.country-node.is-hovered circle {
  filter: drop-shadow(0 0 8px rgba(95, 196, 255, 0.8));
  stroke: rgba(95, 196, 255, 0.95) !important;
  stroke-width: 2.5 !important;
}

/* Unrecognized state badge */
.type-unrecognized circle {
  stroke-dasharray: 5 3;
  stroke: rgba(255, 200, 50, 0.85) !important;
}

/* Splash screen fix - truly fullscreen */
html, body { 
  overflow: hidden;
  width: 100%;
  height: 100%;
}
.splash-screen {
  position: fixed !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  z-index: 99999 !important;
  background: linear-gradient(160deg, #08121f 0%, #0e1f33 50%, #07101a 100%) !important;
}

/* Better menu button */
.menu-btn {
  background: rgba(8, 18, 31, 0.85) !important;
  border-color: rgba(95, 196, 255, 0.2) !important;
  backdrop-filter: blur(12px) !important;
  width: 48px !important;
  height: 48px !important;
  border-radius: 14px !important;
  z-index: 1100 !important;
}
.menu-btn svg {
  width: 22px;
  height: 22px;
  color: var(--text);
}
.menu-btn:hover {
  background: rgba(95, 196, 255, 0.15) !important;
  border-color: rgba(95, 196, 255, 0.4) !important;
}

/* Sidebar scroll fix */
.sidebar {
  scroll-behavior: smooth;
  position: fixed !important;
}
`;

css += additionalCss;
fs.writeFileSync('css/style.css', css);
console.log('CSS patched successfully');
