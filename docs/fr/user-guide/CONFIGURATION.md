# Configuration

L'onglet **Configuration** est le centre de commande d'Email Automator. Ici, vous connectez vos fournisseurs de messagerie, définissez le comportement de votre IA et configurez les règles qui pilotent l'automatisation.

---

## 📧 Comptes e-mail (BYOK)

Email Automator suit un modèle **"Bring Your Own Key" (BYOK)**. Vous fournissez vos propres identifiants OAuth, garantissant que l'accès à vos données reste entièrement sous votre contrôle.

### 🔴 Configuration Gmail (OAuth 2.0)
1.  **Google Cloud Console** : Créez un projet et activez l'**API Gmail**.
2.  **Écran de consentement** : Configurez l'écran de consentement OAuth et ajoutez votre adresse e-mail en tant qu'**Utilisateur de test**.
3.  **Identifiants** : Créez un **ID client OAuth 2.0** (Type : Application Web).
    *   **URI de redirection autorisée** : `https://<votre-ref-projet>.supabase.co/functions/v1/auth-gmail/callback`
4.  **Connecter** : Dans Email Automator, cliquez sur **Connect Gmail**.
5.  **Autoriser** : Collez votre ID client et votre Secret (ou téléchargez le JSON), puis suivez le lien pour autoriser votre compte.

### 🔵 Configuration Outlook (Code d'appareil)
1.  **Portail Azure** : Enregistrez une nouvelle application dans **App Registrations** (Enregistrements d'applications).
2.  **Type de compte** : Sélectionnez "Comptes dans n'importe quel annuaire organisationnel et comptes Microsoft personnels".
3.  **Authentification** : Assurez-vous que "Autoriser les flux de clients publics" est défini sur **Oui**.
4.  **Connecter** : Dans Email Automator, cliquez sur **Connect Outlook** et entrez votre **ID client**.
5.  **Autoriser** : Suivez l'invite de **Code d'appareil** dans votre navigateur pour terminer la connexion.

---

## 📅 Portée et limites de synchronisation

Avant de lancer votre première synchronisation, configurez les limites pour assurer la performance et l'efficacité des coûts :

*   **Synchroniser depuis** : Choisissez la date de début (par exemple, "Depuis maintenant" ou une date historique spécifique).
*   **E-mails max** : Définissez le nombre maximum d'e-mails à traiter dans un seul lot (Par défaut : 50).
*   **Intervalle de synchronisation** : Définissez la fréquence à laquelle le planificateur en arrière-plan doit vérifier les nouveaux messages (par exemple, toutes les 15 minutes).

> [!TIP]
> **Commencez petit** : Pour votre premier lancement, nous vous recommandons de régler "Synchroniser depuis" sur "Maintenant" et "E-mails max" sur 10-20 pour vérifier que vos règles fonctionnent comme prévu.

---

## 🤖 Automatisation et Auto-Pilot

La gestion du comportement de votre IA — y compris la création de règles personnalisées, l'activation des automatisations du système et la définition des politiques de rétention — a été consolidée dans l'onglet **[Auto-Pilot](./AUTOMATION.md)**.

---

## 🧠 Paramètres de l'IA et du système

### Configuration du fournisseur
Email Automator détecte les modèles disponibles via **RealTimeX Desktop**.
*   **Fournisseur LLM** : Choisissez votre moteur d'IA préféré (par exemple, OpenAI, Anthropic ou des modèles locaux).
*   **Modèle d'intégration** : Utilisé pour le système RAG (Génération augmentée par récupération) pour aider l'IA à comprendre votre contexte spécifique.

### Voix et Accessibilité (TTS)
Activez la **synthèse vocale** (TTS) pour que l'IA lise à haute voix les résumés ou les alertes importantes.
*   **Lecture automatique** : Lit automatiquement les notifications de haute priorité.
*   **Profil de voix** : Choisissez parmi diverses voix de haute qualité disponibles via RealTimeX.

---

**Étape suivante :** [Surveillance du tableau de bord](./DASHBOARD.md)