# GUIDE COMPLET : INSTALLATION APPLICATION DE BUREAU & SYNCHRONISATION GOOGLE AI STUDIO
## Application : COOPS BIR SAA (Gestion de Provenderie & Caisse POS)

---

## 1. ARCHITECTURE GLOBALE : COMMENT ÇA FONCTIONNE ?

Pour qu'un point de vente physique (ordinateur de caisse sous Windows) puisse fonctionner **100% hors-ligne** et se synchroniser avec votre **application web publiée dans Google AI Studio** (consultable par le gérant à distance), le système repose sur 3 piliers :

```
┌────────────────────────────────────────┐
│  POINT DE VENTE PHYSIQUE (WINDOWS)     │
│  Application Bureau COOPS BIR SAA      │
│  - 100% Hors-Ligne (Offline First)     │
│  - Base locale IndexedDB               │
│  - Impression tickets thermiques 58/80 │
└──────────────────┬─────────────────────┘
                   │
                   │  Synchronisation Idempotente
                   │  (Dès que la connexion Internet est active)
                   ▼
┌────────────────────────────────────────┐
│  SERVEUR CLOUD CENTRAL (SUPABASE)      │
│  - Base PostgreSQL sécurisée           │
│  - Stockage central des ventes, stocks │
│  - Gestion multi-terminaux (store_id)  │
└──────────────────▲─────────────────────┘
                   │
                   │  Lecture / Consultation en temps réel
                   │
┌──────────────────┴─────────────────────┐
│  APPLICATION WEB (GOOGLE AI STUDIO)    │
│  - Consultable à distance (Mobile/PC)  │
│  - Tableaux de bord, rapports, stocks  │
│  - Supervision du gérant en direct     │
└────────────────────────────────────────┘
```

---

## PARTIE A : INSTALLER ET UTILISER L'APPLICATION BUREAU SUR WINDOWS

### Méthode 1 : Lancement Rapide en Mode Fenêtre Autonome (Recommandé)

Un script de démarrage rapide a été créé à la racine du projet : `Lancer_COOPS_BIR_SAA.bat`.

1. Double-cliquez sur le fichier **`Lancer_COOPS_BIR_SAA.bat`**.
2. Le script vérifie l'environnement, démarre le serveur local et ouvre automatiquement l'application dans une **fenêtre bureau dédiée** (sans barre d'adresse ni onglets de navigateur).
3. L'application se comporte exactement comme un logiciel Windows natif.

---

### Méthode 2 : Installation en Application PWA Windows (Icône Bureau & Barre des Tâches)

L'application intègre un **Web App Manifest** (`manifest.json`) et un **Service Worker** (`sw.js`) pour une installation native Windows :

1. Lancez l'application en local (ou ouvrez l'adresse `http://localhost:3000` dans **Microsoft Edge** ou **Google Chrome**).
2. Dans la barre d'adresse du navigateur :
   - Cliquez sur l'icône **« Installer COOPS BIR SAA »** (ou menu `...` > **Applications** > **« Installer cette application sur votre ordinateur »**).
3. Cochez :
   - [x] *Créer un raccourci sur le Bureau*
   - [x] *Épingler à la barre des tâches*
   - [x] *Démarrer à la connexion (optionnel)*
4. Vous disposez maintenant d'une véritable application de bureau Windows installée, avec son propre processus, son icône personnalisée et sa base de données locale persistante.

---

### Méthode 3 : Fonctionnement 100% Hors-Ligne (Offline)

* Même si le câble réseau est débranché ou que la connexion 4G/WiFi est coupée :
  * Le caissier saisit les ventes normalement.
  * Les stocks se décrémentent en temps réel dans la base locale `IndexedDB`.
  * Les tickets de caisse thermiques (58 mm ou 80 mm) s'impriment immédiatement sur l'imprimante USB ou réseau installée sous Windows.
  * Chaque vente est étiquetée avec un statut `pending_sync` (en attente de synchronisation).

---

## PARTIE B : SYNCHRONISER AVEC L'APPLICATION WEB (GOOGLE AI STUDIO)

Pour que la version web (accessible dans Google AI Studio ou via le lien Cloud Run) et la version de bureau (installée sur la caisse) partagent les mêmes données sans conflit, elles se connectent à une **base cloud commune Supabase** (gratuite).

### Étape 1 : Créer votre Base Cloud Gratuite sur Supabase (2 minutes)

1. Rendez-vous sur [supabase.com](https://supabase.com) et créez un compte gratuit.
2. Cliquez sur **« New Project »** :
   - Nom du projet : `coops-bir-saa-db`
   - Mot de passe de la base de données : *Définissez un mot de passe sécurisé*
   - Région : Choisissez la région la plus proche (ex: *Frankfurt* ou *London*).
3. Cliquez sur **« Create new project »**.

---

### Étape 2 : Déployer le Schéma de la Base de Données

1. Dans votre projet Supabase, cliquez sur **« SQL Editor »** dans le menu de gauche.
2. Cliquez sur **« New Query »**.
3. Ouvrez le fichier local [`supabase-schema.sql`](file:///c:/Users/HP/Desktop/App%20provenderie/Provenda---Gestion-de-Provenderie/supabase-schema.sql) situé à la racine de votre projet.
4. Copiez l'intégralité du code SQL et collez-le dans l'éditeur Supabase.
5. Cliquez sur **« Run »**.
   *Toutes les tables (`products`, `sales`, `invoices`, `stock_movements`, `purchases`, `expenses`, `customers`, `settings`, etc.) avec support multi-magasins (`store_id`) sont créées instantanément.*

---

### Étape 3 : Récupérer vos Clés de Connexion

1. Dans Supabase, allez dans **Project Settings** (icône d'engrenage) > **API**.
2. Notez deux informations :
   - **Project URL** : `https://xyzcompany.supabase.co`
   - **Project API Keys (anon/public)** : `eyJhbGciOi...`

---

### Étape 4 : Configurer l'Application Bureau

1. Ouvrez l'application bureau **COOPS BIR SAA**.
2. Allez dans le menu **Paramètres** > onglet **Base Locale & Sauvegardes**.
3. Déroulez la section **« Configuration Synchronisation Cloud Supabase »**.
4. Collez votre **URL Supabase** et votre **Clé Publique Anon**.
5. Cliquez sur **« Tester la connexion »** : un message vert confirme la liaison.
6. Cliquez sur **« Push Supabase »** : toutes les données locales de départ (produits, prix, stocks initiaux) sont envoyées sur le cloud.

---

### Étape 5 : Configurer l'Application Web dans Google AI Studio

Dans **Google AI Studio** :
1. Ouvrez votre projet web.
2. Dans le panneau latéral des **Secrets / Environment Variables** :
   - Ajoutez `VITE_SUPABASE_URL` = *Votre URL Supabase*
   - Ajoutez `VITE_SUPABASE_ANON_KEY` = *Votre clé Anon Supabase*
3. Publiez / Lancez l'application.

> **Résultat :**
> Dès que l'application de caisse sur le PC de vente enregistre des transactions et dispose d'une connexion Internet, elle pousse les ventes vers le cloud.
> Lorsque le gérant ouvre l'application dans Google AI Studio depuis son téléphone ou son ordinateur portable distant, il visualise en temps réel :
> - Le chiffre d'affaires du jour.
> - Les niveaux de stock actuels de la provenderie.
> - Le journal des factures et règlements.
> - Les rapports financiers et bilans de marges.
