export function makeId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeCode(code) {
  return String(code || "").trim().toUpperCase();
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function getFlagUrl(code) {
  return code ? `https://flagcdn.com/w80/${code.toLowerCase()}.png` : "";
}

export function wrapNumber(value, size) {
  if (!size) return value;
  return ((value % size) + size) % size;
}

export function parsePowerMetric(popStr, gdpStr) {
  if (!popStr || !gdpStr || popStr === "N/A" || gdpStr === "N/A") return 0;
  let p = parseFloat(String(popStr).replace(/,/g, '.').replace(/\s/g, '')) || 0;
  if (String(popStr).includes("Md")) p *= 1000;
  let g = parseFloat(String(gdpStr).replace(/,/g, '.').replace(/\s/g, '')) || 0;
  const pScore = Math.min(p / 1450, 1);
  const gScore = Math.min(g / 30000, 1);
  return Math.round((pScore * 0.4 + gScore * 0.6) * 100);
}

// Debounce helper
export function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
