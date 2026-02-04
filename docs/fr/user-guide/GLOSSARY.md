# Glossaire

Définitions des termes courants utilisés dans Email Automator et l'Assistant de configuration.

## Supabase
Une plateforme backend qui fournit une base de données Postgres hébergée, l'authentification, le stockage et des API. Email Automator utilise Supabase comme base de données et couche d'authentification.

## BYOK (Bring Your Own Key)
Un modèle de configuration où vous connectez votre propre projet Supabase au lieu d'utiliser un backend partagé. Cela conserve vos données dans votre propre infrastructure.

## ID de projet Supabase
L'identifiant unique de votre projet Supabase (souvent affiché dans l'URL du projet ou les paramètres).

## URL de projet Supabase
L'URL de base de votre projet Supabase, utilisée par l'application pour se connecter à la base de données et aux API.

## Clé Anon (Clé API publique)
La clé API publique de votre projet Supabase. Elle est sûre pour une utilisation côté client mais reste soumise à la sécurité au niveau des lignes (RLS).

## Jeton d'accès (Access Token)
Un jeton de votre compte Supabase qui permet à l'Assistant de configuration de créer ou de gérer des projets en votre nom (utilisé dans le démarrage rapide).

## Provisionnement géré (Démarrage rapide)
L'Assistant de configuration utilise votre jeton d'accès pour créer automatiquement un projet Supabase, appliquer les migrations, déployer les Edge Functions et intégrer la base de connaissances.

## Synchronisation manuelle (Connecter un projet existant)
Vous connectez un projet Supabase existant en fournissant l'URL du projet et la clé Anon. Les migrations peuvent être exécutées par l'assistant si un jeton d'accès est fourni.

## Provisionnement géré vs Synchronisation manuelle
**Le provisionnement géré** crée un nouveau projet Supabase pour vous à l'aide d'un jeton d'accès.
**La synchronisation manuelle** se connecte à un projet Supabase existant à l'aide de votre URL de projet et de votre clé Anon.

## Migration
Changements de base de données qui créent ou mettent à jour des tables, des vues, des fonctions et des politiques. Les migrations maintiennent le schéma de votre base de données aligné avec l'application.

## Schéma
La structure de votre base de données : tables, colonnes, types, index, fonctions et politiques.

## SQL
Le langage utilisé pour définir et interroger les structures et les données de la base de données.

## Incohérence de version (Version Mismatch)
Lorsque la version du schéma attendue par l'application diffère de la version réelle de la base de données. L'Assistant de configuration ou l'outil de migration vous invitera à normaliser.

## Version de la base de données (Paramètres du compte)
La version majeure de la base de données affichée dans les Paramètres du compte. Elle est utilisée pour guider les migrations et doit correspondre à la version Postgres de votre projet Supabase.

## Rollback
Annulation d'une migration. Dans Supabase, les rollbacks sont manuels et doivent être utilisés avec précaution.

## RLS (Row Level Security)
Une fonctionnalité de sécurité Postgres qui restreint les lignes qu'un utilisateur peut lire ou écrire. Supabase utilise la RLS pour protéger les données.

## Edge Functions
Fonctions sans serveur (serverless) hébergées par Supabase. Email Automator les utilise pour les flux OAuth et les opérations sécurisées.

## Clé de rôle de service (Service Role Key)
Une clé Supabase puissante qui contourne la RLS. Elle ne doit jamais être exposée aux clients.

## Clé Anon vs Clé de rôle de service
La **clé anon** est sûre pour l'utilisation client et respecte la RLS. La **clé de rôle de service** contourne la RLS et ne doit être utilisée que sur des serveurs de confiance.

## RealTimeX Desktop
L'application locale qui fournit des services d'IA (LLM, embeddings, TTS) utilisés par Email Automator.

## Persona numérique
Un profil qui définit votre ton, votre style et vos préférences pour les brouillons et les réponses générés par l'IA.

## Ton du Persona
Le caractère émotionnel des réponses (ex : amical, formel, direct).

## Style du Persona
Les préférences de style d'écriture (ex : concis, détaillé, points clés).

## Voix du Persona
Le "son" global de votre écriture, incluant le phrasé et le rythme.

## Signature du Persona
Une formule de politesse standardisée utilisée dans les réponses (nom, titre, entreprise).

## Rôle du Persona
Votre titre de poste ou rôle, utilisé pour façonner le cadre de la réponse.

## Entreprise du Persona
Le nom de l'organisation utilisé dans les réponses lorsque c'est approprié.

## Langue du Persona
La langue principale pour les brouillons générés.

## API Express
Le backend local qui gère la synchronisation des e-mails, le traitement de l'IA et l'exécution de l'automatisation.

## Realtime (Supabase)
Mises à jour en direct de la base de données vers l'application. Utilisé pour refléter les nouveaux e-mails, le statut de synchronisation ou l'activité sans rafraîchir la page.

## LLM (Large Language Model)
Un modèle d'IA utilisé pour l'analyse et la génération de réponses (ex : catégorisation, rédaction de brouillons).

## Modèle d'intégration (Embedding Model)
Un modèle qui convertit le texte en vecteurs pour la recherche sémantique. Utilisé par la base de connaissances et le RAG.

## Embeddings (Intégrations vectorielles)
Représentations vectorielles de texte utilisées pour la recherche sémantique dans la base de connaissances.

## RAG (Retrieval-Augmented Generation)
Une méthode qui récupère la documentation pertinente et la transmet à l'IA pour que les réponses restent basées sur vos documents.

## Ingestion de la base de connaissances
Le processus de conversion de la documentation en embeddings consultables et leur stockage dans la base de données.

## TTS (Text-to-Speech)
Convertit les réponses de l'IA en audio parlé (synthèse vocale).

## Fournisseur TTS vs Voix
Le fournisseur est le service qui génère la parole ; la voix est le locuteur/persona spécifique au sein de ce fournisseur.

## OAuth
Une norme d'autorisation qui permet à l'application d'accéder à votre compte e-mail sans stocker votre mot de passe.

## Écran de consentement OAuth
L'écran où vous accordez à Email Automator la permission d'accéder à votre compte de messagerie.

## Jeton d'accès (OAuth Access Token)
Un jeton à courte durée de vie utilisé pour appeler les API des fournisseurs de messagerie. Il expire et est renouvelé automatiquement.

## Jeton de rafraîchissement (Refresh Token)
Un jeton à longue durée de vie utilisé pour obtenir de nouveaux jetons d'accès sans se ré-authentifier.

## API Gmail
L'API officielle de Google pour accéder aux données Gmail et envoyer des e-mails.

## Microsoft Graph
L'API de Microsoft pour les données Outlook et Microsoft 365 (courrier, calendrier, contacts).

## IMAP / SMTP
Protocoles de messagerie. IMAP lit le courrier ; SMTP envoie le courrier. (Email Automator utilise les API des fournisseurs plutôt que l'IMAP/SMTP brut.)

## Enregistrement d'application (Microsoft)
Une configuration d'application dans Azure qui fournit des identifiants pour l'accès à Microsoft Graph.

## ID Client (Client ID)
L'identifiant public de votre application OAuth (Google/Microsoft).

## Secret Client (Client Secret)
Un secret privé pour votre application OAuth. Traitez-le comme un mot de passe.

## URI de redirection
L'URL de rappel où le fournisseur de messagerie renvoie les utilisateurs après l'autorisation OAuth.

## Flux de code d'appareil (Device Code Flow)
Un flux OAuth où vous vous authentifiez dans un navigateur à l'aide d'un code court, souvent utilisé pour les applications de bureau.

## ID de locataire (Tenant ID)
L'identifiant de locataire Microsoft. Utilisez "common" pour le multi-locataire ou un ID spécifique pour un accès réservé à une organisation.

## Portée de synchronisation (Sync Scope)
Définit l'historique à synchroniser (ex : les X derniers jours) et les comptes inclus.

## Libellés (Gmail) / Dossiers (Outlook)
Constructions d'organisation chez les fournisseurs de messagerie. Les libellés marquent les messages ; les dossiers les organisent dans des conteneurs.