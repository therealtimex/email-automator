# Automatisation et Auto-Pilot

L'onglet **Auto-Pilot** est le centre névralgique pour la gestion du comportement de votre agent IA. Il regroupe les "Règles Système" (interrupteurs globaux) et une bibliothèque de **26 règles intelligentes intégrées** ainsi que vos propres "Règles Personnalisées".

---

## 🛡️ Règles système intégrées

Email Automator est livré avec 26 règles pré-configurées conçues par des experts en IA pour gérer les défis courants de la boîte de réception. Elles sont organisées en catégories fonctionnelles pour vous aider à rester organisé.

### 📧 Organisation des e-mails
*   **Newsletter Sweeper** : Archive automatiquement les newsletters et e-mails marketing pour garder votre boîte propre.
*   **Receipt Organizer** : Classe automatiquement les reçus et confirmations de commande.
*   **CC Organizer** : Étiquette les e-mails où vous êtes en copie (CC) pour un tri rapide.
*   **Cold Outreach Filter** : Déplace les e-mails de vente non sollicités vers un dossier séparé.
*   **Social Noise** : Minimise les notifications de LinkedIn et des réseaux sociaux.
*   **Stack Overflow Digests** : Archive les résumés techniques à moins qu'ils ne nécessitent une attention immédiate.

### 🚨 Priorité et alertes
*   **VIP Urgent Messages** : Marque d'une étoile les messages urgents des parties prenantes clés (PDG, membres du conseil).
*   **Critical Alerts** : Fait ressortir les incidents de production et les alertes critiques P0/P1.
*   **Urgent Support Tickets** : Met en évidence les problèmes clients de haute priorité nécessitant une action immédiate.

### 💻 Développement
*   **GitHub Mentions** : Suit quand vous êtes spécifiquement mentionné dans des Pull Requests ou des Issues.
*   **Échecs CI/CD** : Met en évidence les échecs de build et de déploiement d'outils comme CircleCI ou GitHub Actions.
*   **Demandes de revue de code** : Organise les demandes entrantes pour les revues de code.
*   **Bruit Dependabot** : Archive les mises à jour de dépendances de faible priorité tout en gardant les alertes de sécurité visibles.
*   **Alertes de monitoring** : Organise les alertes de surveillance et de journalisation non urgentes.

### 💼 Ventes et affaires
*   **Hot Leads** : Priorise les réponses de prospects à fort intérêt basées sur un sentiment positif.
*   **Rappels de suivi** : Suit les réponses des prospects qui demandent spécifiquement un suivi.
*   **Referrals & Intros** : Garantit que vous ne manquez jamais une introduction ou une recommandation chaleureuse.
*   **Contrats et propositions** : Met en évidence les communications contractuelles importantes et les documents juridiques.
*   **Objections et préoccupations** : Signale les e-mails exprimant des préoccupations ou des hésitations pour un traitement attentif.
*   **Nurture Campaigns** : Archive les e-mails de campagnes automatisées pour prioriser les réponses personnelles.
*   **Mises à jour financières** : Garde les rapports de revenus et les mises à jour budgétaires trimestrielles facilement accessibles.

### ⚙️ Opérations
*   **Demandes internes** : Organise les demandes entre équipes et les éléments d'action.
*   **Communications fournisseurs** : Suit les factures, les expéditions et les mises à jour liées aux fournisseurs.
*   **Alertes système** : Organise les notifications d'infrastructure et de système.
*   **Invitations aux réunions** : Sépare les invitations de calendrier pour une gestion plus facile de l'emploi du temps.
*   **Rapports hebdomadaires** : Classe automatiquement les rapports de statut réguliers et les mises à jour de progression.

---

## 🛠️ Créer des règles personnalisées

Les règles personnalisées vous permettent de créer des workflows précis pilotés par l'IA. Vous pouvez les créer, les éditer et les gérer directement dans l'onglet **Auto-Pilot**.

### 1. Conditions (Le "Si")
Vous pouvez combiner des métadonnées et des conditions basées sur l'IA :
*   **Analyses IA** : Catégorie (ex: Newsletter, Reçu, Personnel), Sentiment (Positif, Négatif, Neutre) ou Priorité (Haute, Moyenne, Basse).
*   **Métadonnées** : Domaine de l'expéditeur (ex: `github.com`), mots-clés spécifiques dans le sujet ou nom de l'expéditeur.
*   **Filtre de rétention** : "N'agir que si l'e-mail a plus de X jours." C'est parfait pour nettoyer les vieilles newsletters ou notifications.

### 2. Actions (Le "Alors")
Choisissez ce qui se passe lorsqu'un e-mail correspond à vos conditions :
*   **Archiver / Supprimer** : Gardez votre boîte propre automatiquement.
*   **Suivre / Signaler** : Mettez en évidence les éléments importants pour une revue manuelle.
*   **Brouillon** : L'action la plus puissante. Elle demande à l'IA de préparer une réponse.

---

## ✍️ Contexte intelligent et Ghostwriting

Lorsque vous utilisez l'action **Brouillon**, vous pouvez fournir à l'IA des instructions spécifiques pour garantir que la réponse correspond à vos besoins :

*   **Instructions de Ghostwriting** : Dites à l'IA *comment* répondre (ex: "Soyez poli mais ferme pour décliner l'invitation," ou "Demandez leurs disponibilités pour mardi prochain").
*   **Pièces jointes aux règles** : Vous pouvez télécharger des documents standards (comme une fiche tarifaire ou une bio) que l'IA inclura automatiquement en tant que pièces jointes chaque fois que cette règle déclenche un brouillon.

---

## 🚀 L'onglet Auto-Pilot

L'onglet **Auto-Pilot** offre une vue d'ensemble de votre moteur d'automatisation.
*   **Vue groupée** : Les règles sont organisées par leur intention principale.
*   **Interrupteurs rapides** : Activez ou désactivez les règles instantanément sans les supprimer.
*   **Indicateurs de statut** : Voyez quelles règles sont actuellement actives et combien d'e-mails elles ont traités.

---

## 💡 Bonnes pratiques

*   **Commencez passivement** : Configurez vos premières règles pour **Suivre** ou **Archiver** au lieu de **Supprimer** jusqu'à ce que vous soyez confiant dans la catégorisation de l'IA.
*   **Utilisez la rétention pour le bruit** : Utilisez une règle comme : `Si Catégorie = Newsletter ET Âge > 30 Jours ALORS Supprimer`. Cela évite que vos newsletters "lues" n'encombrent votre archive pour toujours.
*   **Affinez avec le feedback** : Si une règle ne correspond pas correctement, utilisez l'icône **Feedback** sur le Tableau de bord pour améliorer la compréhension de l'IA pour ce type d'e-mail spécifique.

---

**Étape suivante :** [Gestion du compte et de la sécurité](./ACCOUNT.md)