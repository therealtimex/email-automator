# Compte et Confidentialité

Gérez votre profil, votre persona IA et vos paramètres de sécurité dans la page **Paramètres du compte** (accessible via l'icône de profil en haut à droite).

---

## 👤 Profil et Expérience
Personnalisez votre interaction avec l'application :
*   **Identité** : Mettez à jour votre nom d'affichage et téléchargez un avatar personnalisé.
*   **Retour sensoriel** : Activez ou désactivez les **Effets sonores** et le **Retour haptique** pour les activités en arrière-plan (comme l'analyse de nouveaux e-mails ou la fin de synchronisation).

---

## 🧬 Votre Persona IA
Le **Persona** est le paramètre le plus critique pour obtenir des **Brouillons intelligents** de haute qualité. Il agit comme l'identité que l'IA utilise lors de la rédaction de réponses.

*   **Rôle et Contexte** : Définissez votre titre professionnel et le secteur dans lequel vous travaillez.
*   **Ton de voix** : Spécifiez comment vous souhaitez sonner (ex : "Professionnel mais amical", "Concis et direct").
*   **Style de réponse** : Définissez vos préférences pour la longueur des réponses et l'utilisation de la signature.
*   **Entités de confiance** : Listez les expéditeurs VIP et les domaines de confiance pour aider l'IA à prioriser correctement.

---

## 🗄️ Connexion Supabase (BYOK)
Dans le cadre du modèle **"Bring Your Own Key"**, vous pouvez surveiller et gérer votre connexion à votre base de données dédiée :
*   **Statut** : Visualisez l'URL de votre projet Supabase actuel et la version du schéma.
*   **Centre de migration** : Vérifiez si le schéma de votre base de données est à jour.
*   **Déconnexion** : Si vous devez changer de projet, vous pouvez effacer votre configuration ici (cela vous déconnectera et réinitialisera l'état local de l'application).

---

## 🔐 Sécurité
*   **Gestion du mot de passe** : Mettez à jour le mot de passe de votre compte local à tout moment.
*   **Chiffrement** : Tous les identifiants de fournisseur de messagerie (jetons Gmail/Outlook) sont chiffrés avant d'être stockés dans votre projet Supabase.

---

## 🛡️ Confidentialité et souveraineté des données
Email Automator est conçu avec une architecture **priorisant la confidentialité**. Vos données sont réparties comme suit :

| Type de donnée | Emplacement | Accès |
| :--- | :--- | :--- |
| **Métadonnées e-mail et journaux** | Votre projet Supabase | Privé pour vous |
| **Fichiers e-mail bruts (.eml)** | Votre machine locale | Accès hors ligne uniquement |
| **Pièces jointes aux règles** | Votre stockage Supabase | Privé pour vous |
| **Traitement IA** | RealTimeX Desktop | Local / API direct |

**Important** : Email Automator (l'entreprise) n'a jamais accès à vos e-mails, vos identifiants ou vos journaux d'IA. Tout reste au sein de votre propre infrastructure privée.

---

**Étape suivante :** [Dépannage et Support](./TROUBLESHOOTING.md)