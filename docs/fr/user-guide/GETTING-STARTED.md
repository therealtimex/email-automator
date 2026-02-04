# Commencer

Bienvenue dans **Email Automator**, votre assistant e-mail personnel alimenté par l'IA. Ce guide vous aidera à configurer l'application en utilisant le modèle **"Bring Your Own Key" (BYOK)**, qui garantit que vos données restent sous votre contrôle au sein de votre propre infrastructure Supabase.

## 🛠 Prérequis

Avant de commencer, assurez-vous d'avoir les éléments suivants :

1.  **RealTimeX Desktop** : Installé et en cours d'exécution. Ceci est requis pour le traitement de l'IA (LLM) et les capacités de synthèse vocale (TTS).
2.  **Compte Supabase** : Un compte gratuit ou payant sur [supabase.com](https://supabase.com).

---

## 🚀 Configuration rapide avec l'Assistant

L'**Assistant de configuration** intégré est le moyen recommandé pour commencer. Il automatise les tâches techniques complexes.

### 1. Achat et Lancement
*   Ouvrez **RealTimeX Desktop**.
*   Allez dans l'onglet **Marketplace** → **Local Apps**.
*   Recherchez **"Email Automator"** et achetez-le (ou activez-le s'il est déjà possédé).
*   Une fois acheté, cliquez sur **Launch** (Lancer) depuis votre liste d'applications locales.

### 2. Exécuter l'Assistant de configuration
Lors du premier lancement, l'application vous guidera à travers la configuration initiale :

*   **Choisir un chemin de configuration** :
    *   **Provisionnement géré (Recommandé)** : Fournissez un **Jeton d'accès Supabase**. L'assistant créera automatiquement un nouveau projet, exécutera les migrations de base de données, déploiera les Edge Functions et intégrera la base de connaissances initiale.
    *   **Connecter un projet existant** : Utilisez un projet Supabase existant en fournissant votre **URL de projet** et votre **Clé Anon**. Vous pouvez optionnellement fournir un jeton d'accès ici pour que l'assistant exécute les migrations pour vous.

### 3. Créer votre compte
Une fois que la base de données est prête, vous serez invité à créer votre compte utilisateur local et à vous connecter pour accéder au **Tableau de bord**.

---

## 🔍 Trouver vos identifiants Supabase

Si vous choisissez de connecter un projet existant manuellement, vous pouvez trouver vos identifiants dans le [Tableau de bord Supabase](https://supabase.com/dashboard) :

1.  Sélectionnez votre projet.
2.  Naviguez vers **Settings** (Paramètres) → **API**.
3.  **URL de projet** : Copiez l'URL trouvée sous "Project URL".
4.  **Clé API** : Copiez la clé **anon (public)** sous "Project API keys".

> [!WARNING]
> **Note de sécurité** : N'utilisez jamais la clé `service_role`. Elle possède des privilèges d'administration complets et ne doit jamais être exposée dans des applications côté client.

---

## 🪪 Générer un jeton d'accès

Un jeton d'accès permet à l'Assistant de configuration de gérer vos projets Supabase (création, migrations, déploiement de fonctions) en votre nom.

1.  Dans votre tableau de bord Supabase, allez dans **Account** (Compte) → **Access Tokens** (Jetons d'accès).
2.  Cliquez sur **Generate new token**, donnez-lui un nom (par exemple, "Email Automator"), et copiez le résultat.
3.  Collez ce jeton dans l'Assistant de configuration lorsque vous y êtes invité.

---

**Étape suivante :** [Configurez vos comptes e-mail](./CONFIGURATION.md)  
**Glossaire :** [Termes courants](./GLOSSARY.md)