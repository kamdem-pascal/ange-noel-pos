# 🍨 Les Gourmandises de Ange Noël — Business Manager & Caisse POS (v4.0 Cloud & Multi-Utilisateurs)

**Application web progressive (PWA) modulaire de gestion commerciale, encaissement tactile, point de vente (POS), contrôle des stocks, multi-utilisateurs et comptabilité pour pâtisseries, glaceries et commerces gourmands.**
*Conçue spécialement pour « Les Gourmandises de Ange Noël » (Nyalla Rail – Douala, Cameroun | Tel : 657 268 246).*

---

## 🌟 Nouveautés Majeures de la Version 4.0

1. **🔥 Intégration Firebase Cloud & Synchronisation Temps Réel Multi-Appareils** :
   - Connecté au projet Firebase `an-gourmandise`.
   - Synchronisation automatique et bidirectionnelle temps réel via **Cloud Firestore**.
   - Mode hors-ligne avec cache local résilient : l'application continue de fonctionner sans interruption en cas de coupure Internet à Douala, puis synchronise automatiquement dès le retour de la connexion.

2. **👥 Gestion Complète des Utilisateurs, Rôles & Permissions** :
   - Nouvelle rubrique dédiée **« Utilisateurs & Droits »**.
   - 3 Rôles par défaut :
     - 👑 **Administrateur** (`admin`) : Accès total à la comptabilité, configuration, catalogue et personnel.
     - 💼 **Gérant / Superviseur** (`manager`) : Clôture de caisse, réassort, dépenses, gestion du catalogue.
     - 👤 **Caissier / Vendeur** (`staff`) : Caisse express, encaissement, consultation des stocks.
   - Système de **Permissions granulaires** (Ventes, Remises, Dépenses, Clôtures, Catalogue, Utilisateurs, Sauvegardes).
   - **Changement rapide d'opérateur par code PIN à 4 chiffres** en un clic sur le comptoir sans déconnexion lourde.

3. **🌱 Script de Seed & Initialisation Automatique** :
   - Script Node.js autonome `seed.js` sans dépendance externe : injecte directement les 9 familles de gourmandises, les 60 saveurs officielles (Magnums, Glaces Panées, Crèmes Glacées, Glaces Ange Crush, Glaces Alcoolisées...) et les 3 utilisateurs initiaux dans Cloud Firestore.
   - Bouton d'initialisation en 1 clic **« 🌱 Réinitialiser / Seed Firestore »** accessible directement dans l'interface.

4. **🍨 Catalogue Produits en TabLayout Dynamique (Mobile First)** :
   - Navigation par onglets tactiles : **« Produits »** et **« Catégories »**.
   - Gestion dynamique complète (CRUD) des catégories : Nom, Description, URL d'image/bannière, aperçu instantané, suppression et édition.
   - Gestion dynamique complète (CRUD) des produits : Nom, Catégorie dynamique, Prix, Stock avec suivi d'alerte, Description et URL d'image.

5. **🏗️ Architecture Modulaire (SOLID, DRY & ES Modules Nouveaux)** :
   - `js/config/firebase.js` : Configuration centralisée Firebase SDK.
   - `js/data/initial-data.js` : Définitions des catégories, produits de prospectus, rôles et permissions.
   - `js/services/auth-service.js` : Service d'authentification et contrôle des permissions.
   - `js/services/db-service.js` : Service de données unifié Firestore + fallback LocalStorage.
   - `js/modules/ui.js` : Utilitaires d'interface réutilisables (toasts, modals, formatage FCFA).
   - `js/modules/users.js` : Module de gestion des utilisateurs et matrice des droits.
   - `js/app.js` : Contrôleur applicatif et orchestrateur d'événements.
   - `css/` : Feuilles de style scindées et optimisées (`base.css`, `pos.css`, `mobile.css`, `style.css`).

---

## 🔑 Utilisateurs et Codes PIN par Défaut

| Utilisateur | Rôle | Code PIN Caisse | Email par défaut |
|---|---|:---:|---|
| **Ange Noël (Directeur)** | Administrateur | `1234` | admin@an-gourmandise.cm |
| **Gérant de Boutique** | Superviseur | `1111` | gerant@an-gourmandise.cm |
| **Vendeur Caisse** | Caissier | `0000` | caisse@an-gourmandise.cm |

---

## 🚀 Utilisation & Déploiement

### 1. Accès en Ligne (Recommandé - Mobile & PC)
L'application est déployée en ligne sur GitHub Pages avec support PWA complet :
🔗 **https://kamdem-pascal.github.io/ange-noel-pos/**

Elle s'ouvre sur n'importe quel smartphone (Android / iPhone), tablette ou ordinateur sans aucune installation complexe.

### 2. Exécution du Script de Seed Firestore
Pour re-peupler ou initialiser Firestore depuis la ligne de commande :
```bash
node seed.js
```
*(Ou cliquez sur le bouton « 🌱 Réinitialiser / Seed Firestore » dans la rubrique Utilisateurs de l'application).*

### 3. Exécution en Réseau Local Wi-Fi
- Double-cliquez sur `LANCER_APPLICATION.bat`.
- Ouvrez l'adresse affichée (ex: `http://192.168.1.XX:8080`) sur tous les smartphones des vendeuses connectés au même réseau Wi-Fi.

---
*Développé pour Les Gourmandises de Ange Noël — Douala, Cameroun.*
