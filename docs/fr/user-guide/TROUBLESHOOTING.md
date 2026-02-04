# Dépannage et Support

Si vous rencontrez des problèmes, ce guide couvre les pièges les plus courants et leurs solutions.

---

## 📡 Problèmes de synchronisation

### Les e-mails n'apparaissent pas dans le tableau de bord
*   **Vérifiez la date "Synchroniser depuis"** : L'IA ne traite que les e-mails reçus *après* cette date.
*   **Réinitialiser le point de contrôle (Reset Checkpoint)** : Si vous avez changé votre date de début et souhaitez rescanner les anciens e-mails, cliquez sur le bouton **Reset Checkpoint** dans le panneau de portée de synchronisation.
*   **Limites de lots** : Le paramètre **E-mails max** limite le nombre d'e-mails traités par cycle. Si vous avez un retard important, plusieurs cycles peuvent être nécessaires pour rattraper le retard.
*   **Déclenchement manuel** : Cliquez sur **Run Sync Now** sur le tableau de bord pour forcer une vérification immédiate.

### "Sync Failed" ou "Backend Not Connected"
*   **Serveur local** : Assurez-vous que l'application Email Automator est ouverte et en cours d'exécution.
*   **Flux d'activité en direct** : Ouvrez le terminal **Live Activity**. Il contient souvent des messages d'erreur techniques spécifiques (ex : "Network Error" ou "401 Unauthorized").

---

## 🔑 Authentification et Autorisations

### Google/Gmail : `redirect_uri_mismatch`
*   **La solution** : Votre URI de redirection dans la Google Cloud Console doit correspondre *exactement* à celle affichée dans Email Automator.
*   **Exemple** : `https://votre-ref.supabase.co/functions/v1/auth-gmail/callback` (assurez-vous qu'il n'y a pas d'espace ou de barre oblique finale superflue).

### Microsoft/Outlook : La connexion échoue ou expire
*   **Enregistrement de l'application** : Assurez-vous que votre enregistrement d'application Azure a l'option "Autoriser les flux de clients publics" définie sur **Oui**.
*   **Type de compte** : Assurez-vous d'avoir sélectionné "Comptes dans n'importe quel annuaire organisationnel et comptes Microsoft personnels" lors de l'enregistrement.

### Supabase : "Invalid API Key"
*   **La solution** : Utilisez toujours la clé **anon (public)**. La clé **service_role** sera rejetée par l'application pour des raisons de sécurité.

---

## 🤖 Intégration IA et RealTimeX

### L'IA est lente ou ne répond pas
*   **Modèles locaux** : Si vous utilisez Ollama ou LM Studio, assurez-vous que votre machine a suffisamment de RAM et que votre GPU n'est pas trop sollicité.
*   **Découverte** : Si aucun modèle n'apparaît dans la liste déroulante, assurez-vous que **RealTimeX Desktop** est en cours d'exécution et que vous y avez configuré au moins un fournisseur d'IA.

### Les "Brouillons intelligents" ne sont pas créés
*   **Interrupteur système** : Assurez-vous que l'option **Smart Drafts** est activée (ON) dans l'onglet Auto-Pilot.
*   **Conflit de règles** : Vérifiez que la règle correspondant à l'e-mail inclut bien l'action **Draft** (Brouillon).
*   **Filtre de sécurité** : L'IA ignore automatiquement la rédaction de brouillons pour les adresses `no-reply` et certaines notifications automatisées pour éviter les "boucles de robots".

---

## 🗄️ Base de données et Migrations

### Bannière "Mise à jour de la base de données requise"
*   **Pourquoi cela arrive** : Votre application locale a été mise à jour et le schéma de votre base de données Supabase doit être actualisé pour prendre en charge les nouvelles fonctionnalités.
*   **La solution** : Cliquez sur **Update Now** dans la bannière. Vous aurez besoin de votre **Jeton d'accès Supabase** pour exécuter la mise à jour automatiquement.

### Le Terminal en direct est vide ou affiche "404"
*   **Autorisations Realtime** : Assurez-vous d'avoir exécuté les dernières migrations. La table `processing_events` doit exister et avoir les politiques RLS (Row Level Security) correctes activées.

---

## 🆘 Besoin d'aide supplémentaire ?

Si votre problème n'est pas répertorié ici :
1.  Consultez les **Journaux système** (System Logs) dans les Paramètres du compte pour les traces techniques.
2.  Consultez la [Documentation développeur](../docs-dev/README.md) pour les détails de configuration avancés.
3.  Ouvrez un ticket ou une discussion sur le dépôt du projet.