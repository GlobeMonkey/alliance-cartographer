import { state, exportState } from './store.js';

export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportJson() {
  const json = JSON.stringify(exportState(), null, 2);
  const blob = new Blob([json], { type: "application/json" });
  downloadBlob("alliance-cartographer.json", blob);
}

export function exportPng() {
  const svgNode = document.getElementById("graph");
  if (!svgNode) return;
  const svgData = new XMLSerializer().serializeToString(svgNode);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const img = new Image();
  img.onload = () => {
    canvas.width = svgNode.clientWidth;
    canvas.height = svgNode.clientHeight;
    ctx.fillStyle = state.darkMode ? "#050a10" : "#f8f9fa";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    canvas.toBlob((blob) => {
      downloadBlob("alliance-cartographer.png", blob);
    });
  };
  img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
}

export function exportSvg() {
  const svgNode = document.getElementById("graph");
  if (!svgNode) return;
  const serializer = new XMLSerializer();
  const clone = svgNode.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", svgNode.clientWidth);
  clone.setAttribute("height", svgNode.clientHeight);
  const svgText = serializer.serializeToString(clone);
  const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
  downloadBlob("alliance-cartographer.svg", blob);
}
