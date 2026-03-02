

# Plan de Migration : Frontend + Backend Centralise

## Vue d'ensemble

Migration de l'architecture actuelle (frontend Lovable + backend n8n/ngrok) vers une architecture entierement centralisee sur Lovable Cloud avec Edge Functions Deno, authentification securisee, et appels IA via AWS Bedrock.

## Architecture Cible

```text
+------------------+      +------------------------+      +-------------+
|   Frontend       |      |   Lovable Cloud        |      |  Services   |
|   (React/Vite)   | ---> |   Edge Functions (Deno) | ---> |  Externes   |
|                  |      |                        |      |             |
| - Login Page     |      | - auth (Supabase Auth) |      | - Jira API  |
| - Dashboard/Home |      | - generate-testplan    |      | - QMetry API|
| - Test Plan View |      | - approve-testplan     |      | - Bedrock   |
| - QMetry Export  |      | - export-to-qmetry     |      | - Figma API |
+------------------+      | - get-qmetry-folders   |      +-------------+
                           | - parse-test-cases     |
                           | - generate-details     |
                           +------------------------+
                                     |
                           +------------------------+
                           |   Supabase Database    |
                           | - profiles             |
                           | - user_api_keys (chiffre)|
                           | - test_plans           |
                           | - test_cases           |
                           +------------------------+
```

## Phase 1 : Infrastructure et Authentification

### 1.1 Activer Lovable Cloud
- Activer Cloud pour obtenir Supabase (DB, Auth, Edge Functions, Secrets)

### 1.2 Base de donnees - Tables

**Table `profiles`** (liee a `auth.users`)
- `id` (uuid, FK vers auth.users)
- `username` (text, unique)
- `display_name` (text)
- `created_at`, `updated_at`

**Table `user_api_keys`** (cles API chiffrees par utilisateur)
- `id` (uuid)
- `user_id` (FK vers auth.users)
- `jira_base_url` (text) - ex: company.atlassian.net
- `jira_email` (text)
- `jira_api_token` (text, chiffre)
- `qmetry_api_token` (text, chiffre)
- `aws_access_key_id` (text, chiffre)
- `aws_secret_access_key` (text, chiffre)
- `aws_region` (text, default 'us-east-1')
- `aws_session_token` (text, nullable, chiffre) - pour credentials temporaires SSO
- RLS : chaque utilisateur ne voit/modifie que ses propres cles

**Table `user_roles`** (securite)
- `id`, `user_id`, `role` (enum: admin, user)

### 1.3 Authentification Frontend
- Creer une page `/login` avec email/mot de passe (Supabase Auth)
- Politique de mot de passe forte (min 12 chars, majuscules, chiffres, caracteres speciaux)
- Route protegee : redirection vers `/login` si non authentifie
- Page `/settings` pour que l'utilisateur saisisse ses cles API (Jira, QMetry, AWS)

## Phase 2 : Edge Functions Backend

### 2.1 Edge Function `read-jira-story`
- Recoit l'URL Jira + user_id
- Recupere les cles Jira de l'utilisateur depuis `user_api_keys`
- Appelle l'API REST Jira v3 pour lire :
  - Description de la story
  - Commentaires
  - Pieces jointes (images, liens Figma)
- Si lien Figma detecte : appelle l'API Figma pour extraire les nodes pertinents
- Retourne le contexte complet de la story

### 2.2 Edge Function `generate-testplan`
- Recoit le contexte story + parametres utilisateur
- Recupere les credentials AWS de l'utilisateur
- Signe la requete avec AWS Signature v4 (implementation manuelle en Deno)
- Appelle Bedrock `InvokeModel` (modele a definir, ex: Claude via Bedrock)
- Le prompt systeme sera fourni ulterieurement par l'utilisateur
- Retourne : test plan (markdown), analyse agent, metriques

### 2.3 Edge Function `approve-testplan`
- Cree une sous-tache QA dans Jira via l'API REST
- Ajoute le test plan comme description de la sous-tache

### 2.4 Edge Function `generate-test-case-details`
- Prend les test cases selectionnes + contexte story
- Appelle Bedrock pour generer les details au format QMetry
- Retourne les test cases structures

### 2.5 Edge Function `get-qmetry-folders`
- Appelle l'API QMetry pour lister les dossiers disponibles

### 2.6 Edge Function `export-to-qmetry`
- Exporte les test cases detailles vers QMetry via son API REST
- Cree les test cases dans le dossier selectionne

### 2.7 Utilitaire AWS Signature v4
- Module partage pour signer les requetes Bedrock
- Implemente le protocole de signature AWS v4 en pur Deno (sans SDK)
- Gere les credentials temporaires (session token) si SSO

## Phase 3 : Migration du Frontend

### 3.1 Refactoring de `Index.tsx`
- Remplacer tous les appels `axios.post(API_BASE_URL/webhook/...)` par `supabase.functions.invoke(...)`
- Supprimer la dependance a ngrok et les headers associes
- Passer le `user_id` authentifie dans chaque requete (via le JWT Supabase)

### 3.2 Nouvelles pages
- `/login` : connexion securisee
- `/settings` : gestion des cles API (Jira, QMetry, AWS)
- `/` : page d'accueil actuelle (protegee)

### 3.3 Contexte d'authentification
- Creer `AuthContext` avec Supabase Auth
- Hook `useAuth()` pour l'etat de connexion
- Composant `ProtectedRoute` pour securiser les pages

## Phase 4 : Gestion AWS SSO (Optionnel/Futur)

Pour le renouvellement automatique des credentials AWS :
- L'utilisateur entre ses credentials temporaires dans `/settings`
- Quand une requete Bedrock echoue (403/ExpiredToken), le frontend affiche un message demandant de renouveler les credentials
- L'utilisateur se reconnecte via AWS SSO (page externe), copie les nouvelles credentials dans l'app
- Alternative future : implementation OIDC avec AWS IAM Identity Center

## Secrets Cloud necessaires

Aucun secret global n'est necessaire au niveau Cloud car toutes les cles API sont stockees par utilisateur dans la base de donnees. Seule exception possible :
- Une cle de chiffrement pour les tokens stockes en DB (optionnel, Supabase chiffre deja au repos)

## Ordre d'implementation recommande

1. Activer Lovable Cloud
2. Creer les tables DB + RLS
3. Implementer l'authentification (login + AuthContext + ProtectedRoute)
4. Creer la page Settings (saisie des cles API)
5. Implementer l'Edge Function `read-jira-story`
6. Implementer le module AWS Signature v4
7. Implementer l'Edge Function `generate-testplan` (Bedrock)
8. Migrer les appels frontend vers Edge Functions
9. Implementer les Edge Functions restantes (approve, QMetry, etc.)
10. Tests end-to-end

## Points en attente

- **Prompt systeme** : sera fourni par l'utilisateur pour guider la generation des test plans et test cases
- **Modele Bedrock** : a confirmer (Claude 3.5 Sonnet, Claude 3 Haiku, etc.)
- **Region AWS** : a confirmer pour le endpoint Bedrock

