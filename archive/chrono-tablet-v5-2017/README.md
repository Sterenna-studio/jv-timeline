# ChronoTablet — BZH CHRONICLES v5
## Sterenna · Architecture multi-années

### Principe
Projection temporelle : **année réelle − 10 = année cible jouée**.
- 2026 réel → 2016 | 2027 → 2017 | 2028 → 2018 | …
- Les années futures se déverrouillent automatiquement.

### Lancer
```bash
python -m http.server 8000
# http://localhost:8000/index.html
```
> ⚠️ `fetch()` est bloqué en `file://` — serveur HTTP obligatoire.

### Arborescence
```
index.html
data/
  games_2016.json   ← fourni
  games_2017.json   ← à créer (même schéma)
  games_2018.json   ← etc.
```

### Schéma JSON
```json
{
  "d": "2016-05-13",
  "t": "DOOM (2016)",
  "p": ["PC", "PS4", "XB1"],
  "g": ["FPS", "Action"],
  "steam_appid": 379720,
  "steam_url": "https://...",
  "note": "Texte libre"
}
```

### Fonctionnalités v5
| Feature | Description |
|---|---|
| **Multi-années** | Grille 2016–2025, unlock auto selon date réelle |
| **Reveal du jour** | 1 pioche aléatoire / jour sur TOUTES les années débloquées |
| **Marquage "fait"** | Bouton toggle dans la fiche modale — badge ✓ sur la carte |
| **Export Save** | Télécharge `bzh-chronicles-save.json` |
| **Import Save** | Restaure l'état depuis un fichier JSON |
| **Reset** | Efface reveals + faits + daily sur toutes les années |
| **SFX** | Sons WebAudio — toggle persistant |

### LocalStorage (clés)
| Clé | Contenu |
|---|---|
| `BZH_YEAR` | Dernière année sélectionnée |
| `BZH_MONTH` | Dernier mois sélectionné (0–11) |
| `BZH_REVEALED` | `{ "2016:2016-05-13:DOOM (2016)": true }` |
| `BZH_DONE` | Même format, jeux marqués faits |
| `BZH_DAILY` | `{ date:"2026-3-19", key:"…", year:2016 }` |
| `BZH_SFX` | `"1"` ou `"0"` |

### Ajouter une année
1. Créer `data/games_XXXX.json` (tableau d'objets, voir schéma ci-dessus).
2. L'année s'active automatiquement quand `XXXX + 10 <= année réelle`.
3. Aucune modification du code nécessaire.
