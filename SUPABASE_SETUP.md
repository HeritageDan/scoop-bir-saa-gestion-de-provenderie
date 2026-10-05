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

Le fichier [`supabase-schema.sql`](file:///C:/Users/HP/antigravity/Provenda---Gestion-de-Provenderie/supabase-schema.sql) à la racine de ce projet contient la structure complète, les droits GRANT et les politiques RLS.

1. Dans votre tableau de bord Supabase, cliquez sur l'icône **SQL Editor** dans le menu vertical de gauche (icône terminal `>_`).
2. Cliquez sur le bouton **« + New query »**.
3. **IMPORTANT :** Effacez tout texte déjà présent dans la fenêtre de l'éditeur.
4. Ouvrez le fichier [`supabase-schema.sql`](file:///C:/Users/HP/antigravity/Provenda---Gestion-de-Provenderie/supabase-schema.sql) (ou cliquez sur le bouton **« Copier supabase-schema.sql »** dans l'application Provenda sous *Paramètres Système > Base de données*).
5. Collez l'intégralité du script dans l'éditeur Supabase.
6. **ATTENTION :** Assurez-vous qu'aucun extrait de texte n'est sélectionné/surligné (sinon Supabase n'exécute que la partie surlignée).
7. Cliquez sur le bouton vert **« Run »** en bas à droite (ou faites `Ctrl + Entrée`).
8. Vous verrez le message :
   - `Success. No rows returned` (ou `Success`) : c'est le comportement PostgreSQL standard pour les créations de tables DDL (puisqu'une création de table ne retourne pas de lignes de données).
9. Pour vérifier que vos tables sont bien là, cliquez sur **Table Editor** (l'icône de tableau dans le menu de gauche) : vous verrez la liste de vos 12 tables (`sales_points`, `users`, `products`, `customers`, `invoices`, etc.) sous le schéma `public`.

---

## Étape 3 : Récupérer vos identifiants d'accès Supabase

1. Dans votre projet Supabase, cliquez sur l'icône **Project Settings** (icône d'engrenage en bas du menu de gauche).
2. Allez dans le sous-menu **API**.
3. Vous y trouverez deux valeurs essentielles :
   - **Project URL** : ex: `https://xyzabcdefghijklm.supabase.co`
   - **anon / public key** : une longue clé JWT commençant par `eyJh...`

---

## Étape 4 : Connecter l'application à Supabase

Vous disposez de **deux méthodes simples** :

### Option A : Directement dans l'interface de l'application (Immédiat)
1. Ouvrez votre application Provenda.
2. Rendez-vous dans **Paramètres Système** > onglet **Base de Données Cloud (Supabase)**.
3. Renseignez votre **URL de projet** et votre **Clé Anon**, puis cliquez sur **« Enregistrer la Configuration »**.
4. Cliquez sur **« Tester la connexion & tables »** : un voyant vert confirme que la liaison fonctionne et que la table `sales_points` est accessible !
5. Cliquez sur le bouton vert **« Envoyer les données locales vers Supabase (Push) »** : votre catalogue de produits, points de vente, utilisateurs et paramètres d'usine sont instantanément injectés dans votre base cloud !

### Option B : Via Vercel (Pour que tous les utilisateurs soient automatiquement connectés)
1. Rendez-vous sur votre tableau de bord [Vercel](https://vercel.com).
2. Cliquez sur votre projet `provenda`.
3. Allez dans **Settings** > **Environment Variables**.
4. Ajoutez les deux variables suivantes :
   - Nom : `VITE_SUPABASE_URL` | Valeur : *Votre URL Supabase*
   - Nom : `VITE_SUPABASE_ANON_KEY` | Valeur : *Votre clé publique Anon*
   *(L'application accepte également `SUPABASE_URL` et `SUPABASE_ANON_KEY`)*
5. Allez dans l'onglet **Deployments**, cliquez sur les trois petits points du dernier déploiement puis sur **Redeploy**.
6. Dès lors, toute personne accédant à votre site Vercel verra le badge vert **Cloud** dans l'en-tête !

---

## Résolution des Problèmes Courants

| Problème / Message | Cause | Solution |
| :--- | :--- | :--- |
| `PGRST125` / `Invalid path specified in request URL` | L'URL Supabase configurée contient `/rest/v1` à la fin (ex: `https://xyz.supabase.co/rest/v1`). | Dans Vercel ou dans les Paramètres de l'application, retirez `/rest/v1` de l'URL pour ne garder que `https://xyz.supabase.co`. |
| `Erreur lors de l'envoi de la table "sales_points"` (404) | Les tables ne sont pas encore créées dans Supabase. | Ouvrez Supabase > SQL Editor > New query, collez le script `supabase-schema.sql` et cliquez sur **Run**. |
| `Permission denied for table sales_points` (401/403) | Droits `GRANT` manquants sur le rôle `anon`. | Ré-exécutez la dernière version du script `supabase-schema.sql` qui inclut les clauses `GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;`. |
| `Success. No rows returned` dans SQL Editor | Comportement PostgreSQL normal pour la création de tables. | Tout va bien ! Cliquez sur **Table Editor** à gauche pour voir vos tables. |
| Le badge affiche `Local` au lieu de `Cloud` | Variables d'environnement non configurées ou non enregistrées. | Renseignez l'URL et la clé dans *Paramètres Système* ou dans Vercel puis redéployez. |
