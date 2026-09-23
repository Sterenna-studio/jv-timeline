# JV Timeline — ChronoTablet

Timeline ludique des sorties de jeux vidéo de 2016, issue de BZH Chronicles.
Application HTML statique autonome, sans compilation ni backend.

- Dépôt : [Sterenna-studio/jv-timeline](https://github.com/Sterenna-studio/jv-timeline).
- URL prévue : `https://nitro.sterenna.fr/timeline/` (pas encore publiée).
- Sources actives : `public/`.
- Originaux v1, v2 et v3 conservés intégralement dans `archive/` ; v3 sert de base.

## Utilisation locale

Depuis ce dossier : `python -m http.server 8086 --directory public`, puis
ouvrir `http://localhost:8086/`. Le lien Retour à Nitro vise la racine du
domaine de production. Pour tester le vrai sous-chemin, utiliser le test navigateur.

Node 24 et Chrome sont utilisés pour les contrôles, sans dépendance npm :

```powershell
npm test
npm run test:browser
```

`CHROME_PATH` peut définir le chemin de Chrome. Le test lance un navigateur
sans fenêtre avec profil dédié dans `.artifacts/`, un serveur limité à localhost
et la route `/timeline/`. Les captures desktop/mobile sont conservées dans
`.artifacts/` et ignorées par Git. Les images Steam externes sont bloquées pendant
ce test ; leur disponibilité et le rendu sonore ne sont pas validés.

## Comportement et corrections avant publication

- Projection du mois et du jour réels sur **2016**, même après 2026.
- Les cartes futures sont masquées visuellement mais restent visibles et
  activables : correction du conflit avec la classe `.hidden` des vues.
- Navigation mensuelle, fiches et révélations avec énergie persistée localement.
- Activation des cartes au clavier avec Entrée/Espace.
- Retour au hub Nitro, description et URL canonique.

Le catalogue est une sélection éditoriale historique, non exhaustive. Les tests
vérifient son format ; les dates de sortie et AppID n'ont pas été réaudités
auprès des éditeurs. La licence MIT d'origine est conservée ; les illustrations
Steam sont externes, non distribuées dans le dépôt.

## Pourquoi un dépôt séparé

Le hub Nitro déploie sa racine avec `rsync --delete`. Ses applications autonomes
sont gérées par leurs propres pipelines, avec un dossier protégé dans le workflow
du hub. Cette séparation permet de faire évoluer Timeline sans redéployer le hub
et d'y ajouter d'autres années. `bzh-universe` reste la documentation de l'univers ;
Skill Arena est un autre produit et n'est pas nécessaire à cette application.

## Première publication — ordre requis

1. Faire relire et fusionner la branche du hub qui ajoute `--exclude='/timeline/'`
   à `.github/workflows/deploy-ovh.yml`, puis attendre la réussite du déploiement du hub.
2. Créer le dépôt public `Sterenna-studio/jv-timeline`. Vérifier qu'il a accès aux
   secrets d'organisation `OVH_HOST`, `OVH_USER`, `OVH_SSH_KEY` (ne jamais copier
   leurs valeurs dans le code). Pousser `main` : tests puis déploiement vers
   **`~/nitro/timeline/` seulement**. La CI refuse de déployer si l'exclusion n'est
   pas présente dans le workflow publié du hub.
3. Attendre le succès des comparaisons HTTP du HTML et du JSON de production.
4. Faire relire et fusionner la seconde branche du hub ajoutant la carte Timeline
   et le sitemap. Cela évite un lien public avant que l'application soit disponible.

Les secrets OVH hérités de l'organisation ont été vérifiés par leur nom le
23 septembre 2026, sans consulter leurs valeurs. Le premier déploiement reste
à vérifier dans GitHub Actions.
Seul `public/` est déployé : pas d'archives, tests, documentation ou fichiers Git.

Pour revenir à une version antérieure, rétablir son contenu dans un nouveau commit
sur `main` et laisser le pipeline la publier. Ne pas retirer l'exclusion du hub
tant que le dossier Timeline doit être conservé sur OVH.
