# Tableau de bord et activité en direct

Le **Tableau de bord** est votre interface principale pour surveiller l'activité de votre agent IA et gérer votre boîte de réception analysée. Il est conçu pour offrir une transparence totale sur la façon dont l'IA pense et agit.

---

## 📊 Le flux d'analyse

À mesure que l'IA traite votre boîte de réception, les e-mails apparaissent dans le flux avec des mises à jour de statut en temps réel et des informations intelligentes.

*   **Recherche intelligente** : Trouvez rapidement des e-mails par mot-clé ou par expéditeur.
*   **Filtres IA** : Filtrez votre vue par catégorie (par exemple, Newsletter, Personnel), sentiment ou priorité.
*   **Tri dynamique** : Basculez entre l'heure de *réception* de l'e-mail et l'heure à laquelle il a été *traité* par l'IA.

### 📌 Volet latéral des détails de l'e-mail
Cliquer sur une carte d'e-mail ouvre un panneau latéral détaillé contenant :
*   **Résumé IA** : Un aperçu concis du contenu de l'e-mail.
*   **Points clés** : Les points forts extraits par l'IA.
*   **Aperçu du brouillon** : Si une réponse a été générée, vous pouvez la consulter ici avant qu'elle ne soit envoyée.
*   **Liens rapides** : Accédez directement à l'e-mail original dans votre interface web Gmail ou Outlook.

---

## 🛡️ Confiance et Transparence

Email Automator repose sur le principe de l'**"IA Boîte de Verre"**. Vous devriez toujours savoir *pourquoi* une action a été entreprise.

### 📟 Terminal d'activité en direct
Cliquez sur le bouton **Live Activity** (Activité en direct) dans le coin inférieur droit pour ouvrir le flux de traitement en temps réel.
*   **Journaux de réflexion** : Observez l'IA analyser le contenu, évaluer les règles et décider des actions.
*   **Détails techniques** : Consultez les appels API bruts, les durées de traitement et les statuts de synchronisation en arrière-plan.
*   **Contrôle** : Vous pouvez arrêter manuellement une synchronisation active directement depuis le terminal.

### 🕵️ Trace IA (AI Trace)
Cliquez sur l'**icône Œil** sur n'importe quelle carte d'e-mail pour ouvrir le **Modal Trace IA**.
*   **Logique de décision** : Consultez une décomposition étape par étape de la raison pour laquelle l'IA a attribué une catégorie ou une priorité spécifique.
*   **Données brutes** : Visualisez le prompt exact envoyé au LLM et la réponse JSON brute qu'il a retournée.
*   **Stats de performance** : Consultez l'utilisation des jetons et le temps de traitement pour cet e-mail spécifique.

---

## ⚡ Actions rapides

Prenez le contrôle avec des actions en un clic disponibles sur chaque carte d'e-mail :
*   🗑️ **Supprimer / 📦 Archiver** : Nettoyage instantané.
*   ⭐ **Suivre / Signaler** : Marquez les éléments importants pour plus tard.
*   🔄 **Retraiter** : Si vous avez mis à jour vos règles, vous pouvez demander à l'IA d'analyser à nouveau un e-mail.
*   💬 **Feedback** : Aidez l'IA à apprendre en signalant les erreurs de catégorisation ou d'analyse de sentiment.

---

## 🔔 Notifications et retours

L'application utilise un retour multi-sensoriel pour vous tenir informé de l'activité en arrière-plan :
*   **Visual** : Badges de statut en direct et notifications toast.
*   **Audio** : Carillons subtils de haute qualité pour les nouveaux e-mails, les alertes de haute priorité et la fin de synchronisation.
*   **Haptique** : Retour physique sur les appareils compatibles.

> **Note** : Les paramètres sonores et haptiques peuvent être personnalisés dans les [**Paramètres du compte**](./ACCOUNT.md).

---

## 📈 Analyses et historique

Restez informé des performances de votre agent :
*   **Historique de synchronisation** : Consultez un journal des cycles de synchronisation récents, incluant le nombre d'e-mails traités et les actions entreprises.
*   **Stats d'efficacité** : Visualisez le total des suppressions, archivages et brouillons automatisés au fil du temps.

---

**Étape suivante :** [Création de règles d'automatisation](./AUTOMATION.md)