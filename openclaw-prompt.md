# Prompt de démarrage pour OpenClaw

## Comment lancer l'agent sur le projet

Envoie ce message à ton agent OpenClaw (via ton canal connecté) :

---

```
Lis les fichiers alliance-map-context/project-context.md et alliance-map-context/tasks.md.

Ton rôle est de développer et améliorer le projet Alliance Cartographer (fichier : index.html).

Règles :
- Travaille les tâches dans l'ordre : d'abord PRIORITÉ HAUTE, puis MOYENNE, puis BASSE.
- Pour chaque tâche :
  1. Lis la description dans tasks.md
  2. Implémente la modification dans index.html
  3. Marque la tâche [x] dans tasks.md
  4. Passe à la suivante
- Ne casse jamais les fonctionnalités existantes
- Tout reste dans un seul fichier index.html
- Commente tes ajouts avec // [AJOUT: nom de la tâche]

Commence par la première tâche non terminée.
```

---

## Pour relancer après une pause

```
Continue le développement de Alliance Cartographer.
Lis alliance-map-context/tasks.md et reprends à la première tâche non cochée [x].
```

## Pour demander une tâche spécifique

```
Dans le projet Alliance Cartographer (index.html), implémente uniquement la tâche suivante :
[COLLE LE NOM DE LA TÂCHE ICI]
Respecte le contexte dans alliance-map-context/project-context.md.
```

## Pour un cron automatique (PowerShell)

```powershell
openclaw cron add --name "alliance-map-dev" --every 2h --session main --system-event "Continue le développement de Alliance Cartographer. Lis alliance-map-context/tasks.md et implémente la prochaine tâche non terminée dans index.html."
```
