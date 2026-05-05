export function renderDefaultPanel(container) {
  container.innerHTML = `
    <div class="sp-default">
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        <line x1="2" y1="12" x2="22" y2="12"></line>
      </svg>
      <p>Cliquez sur un pays ou une alliance sur la carte pour afficher les détails.</p>
    </div>
  `;
}
