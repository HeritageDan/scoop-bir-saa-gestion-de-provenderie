# Guide de Déploiement - Provenda ERP

Ce guide décrit les étapes simples pour déployer l'application **Provenda** sur **Vercel** ou **Netlify** gratuitement avec un certificat SSL (HTTPS) automatique et un réseau de distribution mondial (CDN).

---

## Configuration Préparée

Le projet a déjà été configuré avec :
- [x] `vercel.json` : Réécriture SPA pour diriger toutes les routes vers `/index.html`.
- [x] `netlify.toml` : Définition des commandes de build (`npm run build`), du dossier de sortie (`dist`) et des redirections SPA.
- [x] `public/_redirects` : Règle de fallback pour Netlify & Cloudflare Pages.
- [x] `.gitignore` : Exclusion de `node_modules/`, `dist/` et des fichiers `.env`.

---

## Option 1 : Déploiement via GitHub (Recommandé - Déploiement Automatique)

Cette méthode est la plus pérenne : chaque mise à jour sur votre dépôt GitHub redéploiera automatiquement votre application.

### Étape 1 : Mettre le projet sur GitHub
1. Créez un nouveau dépôt sur [GitHub](https://github.com/new) (ex: `provenda-app`).
2. Depuis votre machine ou avec GitHub Desktop / Git, poussez le code vers GitHub :
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Provenda ERP"
   git branch -M main
   git remote add origin https://github.com/<votre-utilisateur>/provenda-app.git
   git push -u origin main
   ```

### Étape 2 : Connecter à Vercel ou Netlify

#### Sur Vercel :
1. Rendez-vous sur [vercel.com](https://vercel.com) et connectez-vous (avec votre compte GitHub).
2. Cliquez sur **"Add New..."** > **"Project"**.
3. Sélectionnez le dépôt `provenda-app` et cliquez sur **"Import"**.
4. Les paramètres sont détectés automatiquement grâce à `vercel.json` :
   - **Framework Preset :** Vite
   - **Build Command :** `npm run build`
   - **Output Directory :** `dist`
5. Cliquez sur **"Deploy"**.
6. En moins d'une minute, votre application sera accessible via une URL du type `https://provenda-app.vercel.app`.

#### Sur Netlify :
1. Rendez-vous sur [netlify.com](https://netlify.com) et connectez-vous.
2. Cliquez sur **"Add new site"** > **"Import an existing project"** > **GitHub**.
3. Choisissez le dépôt `provenda-app`.
4. Les paramètres sont automatiquement lus depuis `netlify.toml`.
5. Cliquez sur **"Deploy site"**.

---

## Option 2 : Déploiement Instantané par Glisser-Déposer (Netlify Drop)

Si vous ne souhaitez pas utiliser Git immédiatement :

1. Construisez le projet pour générer le dossier de production :
   ```bash
   npm run build
   ```
   *(Un dossier nommé `dist` sera généré contenant les fichiers HTML, JS, CSS et assets optimisés)*.
2. Ouvrez [app.netlify.com/drop](https://app.netlify.com/drop) dans votre navigateur.
3. Glissez-déposez le dossier `dist` directement sur la page.
4. Votre site est immédiatement en ligne avec une URL sécurisée !

---

## Option 3 : Déploiement via la Ligne de Commande (CLI)

### Avec Vercel CLI :
```bash
npx vercel
```
Suivez les invites interactives, puis pour la mise en production :
```bash
npx vercel --prod
```

### Avec Netlify CLI :
```bash
npx netlify deploy --prod --dir=dist
```

---

## Variables d'Environnement (Optionnel)

Si vous utilisez l'API Google Gemini ou d'autres services cloud :
- Dans le tableau de bord Vercel / Netlify, allez dans **Project Settings** > **Environment Variables**.
- Ajoutez vos variables d'environnement (ex: `GEMINI_API_KEY`).
