# Tâches Alliance Cartographer

## PRIORITÉ HAUTE

### UI / UX
- [x] **Éditeur de scénario inline** : permettre d'ajouter/supprimer des nœuds et liens directement depuis le panneau latéral sans passer par l'import JSON. Formulaire avec champs : pays (select ou texte), type de relation, intensité, années start/end.
- [x] **Recherche de pays** : barre de recherche en haut du panneau qui filtre et met en surbrillance un nœud sur le graphe, et centre la vue dessus.
- [x] **Animations de transition** : quand on change de scénario, faire entrer/sortir les nœuds et liens avec une animation (fade + déplacement D3).

### Données
- [x] **Ajouter des scénarios manquants** : compléter avec des scénarios géopolitiques importants actuels — G7, G20, SCO (Organisation de coopération de Shanghai), ASEAN, Union Africaine, Ligue Arabe, Commonwealth, Francophonie.
- [x] **Enrichir COUNTRY_INFO** : ajouter les pays manquants qui apparaissent dans les scénarios (NP Népal, BD Bangladesh, MU Maurice, AR Argentine, etc.) avec leurs données (régime, population, PIB, région, coordonnées).

### Carte
- [x] **Surbrillance pays actifs** : quand un scénario est chargé, colorier les pays impliqués directement sur le fond de carte géographique (pas seulement les nœuds du graphe de force).
- [x] **Zoom sur région** : bouton ou action pour recentrer la vue sur la région principale du scénario actif (ex: Europe pour l'OTAN, Asie pour l'Indo-Pacifique).

---

## PRIORITÉ MOYENNE

### Fonctionnalités
- [x] **Comparaison de scénarios** : afficher deux scénarios côte à côte en split-screen, ou en superposition avec opacité différente par scénario.
- [x] **Historique / undo** : ajouter un bouton "Annuler la dernière action" pour l'édition manuelle.
- [x] **Filtres dynamiques** : boutons dans la sidebar pour masquer/afficher certains types de relations (ex: masquer les "rivalités" pour ne voir que les alliances).
- [x] **Indicateur de puissance** : afficher une barre ou un score de puissance normalisé (basé sur PIB + population) sur chaque fiche pays.

### Export / Partage
- [x] **Copier le lien** : remplacer "Mettre l'URL à jour" par un bouton "Copier le lien" qui met l'URL à jour ET copie dans le presse-papier avec feedback visuel (ex: texte qui change en "✓ Copié !").
- [x] **Export SVG** : ajouter l'export en format SVG en plus du PNG.

### Performance
- [x] **Mise en cache du fond de carte** : le TopoJSON est rechargé à chaque init. Utiliser une variable globale pour ne le charger qu'une fois.

---

## PRIORITÉ BASSE

### Accessibilité
- [x] **Raccourcis clavier** : Echap pour désélectionner, flèches pour naviguer entre pays focalisés, T pour toggle thème.
- [x] **Mode daltonien** : palette alternative accessible aux daltoniens (remplacer les couleurs rouge/vert par des formes différentes ou des textures de ligne).

### Données
- [x] **Source des données** : ajouter une section "À propos" ou un tooltip sur chaque scénario indiquant la source/date des données (ex: "Données OTAN 2024").
- [x] **Conflit en cours** : ajouter un flag visuel "actif" sur les liens conflict/rivalry qui sont en cours à l'année sélectionnée (pulsation ou animation).

---

## RÈGLES IMPORTANTES POUR L'AGENT
1. **Ne jamais casser les fonctionnalités existantes** — tester mentalement chaque modification.
2. **Rester dans un seul fichier HTML** — ne pas séparer en plusieurs fichiers.
3. **Pas de dépendances nouvelles non nécessaires** — si besoin d'une lib, utiliser un CDN jsDelivr ou unpkg.
4. **Conserver la structure des données** (RELATION_TYPES, COUNTRY_INFO, scenarios, state) — les modifier, ne pas les remplacer.
5. **Marquer chaque tâche comme [x] quand elle est terminée** dans ce fichier.
6. **Faire une tâche à la fois**, la tester mentalement, puis passer à la suivante.
7. **Commenter les nouvelles sections** de code avec `// [AJOUT: nom de la tâche]`.
