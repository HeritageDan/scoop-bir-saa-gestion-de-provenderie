# Guide d'Intégration Supabase (Cloud PostgreSQL) - Provenda ERP

Ce guide vous explique comment connecter votre application Provenda déployée sur Vercel à une base de données **Supabase** gratuite et hautement sécurisée pour partager vos données en temps réel entre tous vos appareils (PC, smartphones, tablettes).

---

## Étape 1 : Créer votre projet Supabase (2 minutes)

1. Rendez-vous sur [supabase.com](https://supabase.com) et créez un compte gratuit (ou connectez-vous avec GitHub).
2. Cliquez sur **« New Project »** (Nouveau projet).
3. Remplissez les champs :
   - **Name :** `Provenda-Production`
   - **Database Password :** Choisissez un mot de passe fort (conservez-le en lieu sûr).
   - **Region :** Choisissez la région la plus proche (ex: *West Europe - Frankfurt* ou *Central EU*).
4. Cliquez sur **« Create new project »**. Supabase configure votre base de données PostgreSQL en ~1 minute.

---

## Étape 2 : Créer les tables avec le script SQL fourni (30 secondes)

Le fichier [`supabase-schema.sql`](file:///C:/Users/HP/antigravity/Provenda---Gestion-de-Provenderie/supabase-schema.sql) à la racine de ce projet contient la structure complète de votre base de données.

1. Dans votre tableau de bord Supabase, cliquez sur l'icône **SQL Editor** dans le menu de gauche (icône `>_`).
2. Cliquez sur le bouton **« + New query »**.
3. Ouvrez le fichier `supabase-schema.sql` situé dans ce projet, copiez l'intégralité de son contenu et collez-le dans l'éditeur Supabase.
4. Cliquez sur le bouton vert **« Run »** en bas à droite.
5. Vous verrez le message `Success. No rows returned` : toutes vos tables (`products`, `invoices`, `customers`, `stock_movements`, etc.) et règles de sécurité sont maintenant créées !

---

## Étape 3 : Récupérer vos identifiants d'accès Supabase

1. Dans votre projet Supabase, cliquez sur l'icône **Project Settings** (icône d'engrenage en bas à gauche).
2. Allez dans l'onglet **API**.
3. Vous y trouverez deux valeurs essentielles :
   - **Project URL** : ex: `https://abcdefghijklm.supabase.co`
   - **anon / public key** : une longue clé commençant par `eyJh...`

---

## Étape 4 : Connecter l'application à Supabase

Vous disposez de **deux méthodes simples** :

### Option A : Directement dans l'interface de l'application (Immédiat)
1. Ouvrez votre application (en local ou sur votre URL Vercel).
2. Rendez-vous dans **Paramètres Système** > onglet **Base de Données Cloud (Supabase)**.
3. Collez votre **URL de projet** et votre **Clé Anon**.
4. Cliquez sur **« Tester la connexion »** : un voyant vert confirme que la liaison fonctionne.
5. Cliquez sur **« Envoyer les données locales vers Supabase »** : votre catalogue de produits, utilisateurs et paramètres d'usine sont instantanément injectés dans votre base cloud !

### Option B : Via Vercel (Pour que tous les utilisateurs soient automatiquement connectés)
1. Rendez-vous sur votre tableau de bord [Vercel](https://vercel.com).
2. Cliquez sur votre projet `provenda`.
3. Allez dans **Settings** > **Environment Variables**.
4. Ajoutez les deux variables suivantes :
   - Nom : `VITE_SUPABASE_URL` | Valeur : *Votre URL Supabase*
   - Nom : `VITE_SUPABASE_ANON_KEY` | Valeur : *Votre clé publique Anon*
5. Allez dans l'onglet **Deployments**, cliquez sur les trois petits points du dernier déploiement puis sur **Redeploy**.
6. Dès lors, toute personne accédant à votre site Vercel sera automatiquement synchronisée avec la base Supabase !

---

## Fonctionnement de la synchronisation

- **Mode Cloud Actif :** Vos ventes, encaissements, modifications de stock et créances clients sont sauvegardés dans votre base PostgreSQL Supabase.
- **Résilience Hors-ligne :** Même en cas de coupure Internet momentanée, l'application conserve une copie locale dans le navigateur et vous permet de continuer à opérer.
