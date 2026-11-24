# 🍨 Les Gourmandises de Ange Noël — Business Manager & Caisse POS (v3.0)

**Application complète de gestion commerciale, encaissement, point de vente (POS), contrôle des stocks et comptabilité pour pâtisseries, glaceries et commerces gourmands.**
*Conçue spécialement pour « Les Gourmandises de Ange Noël » (Nyalla Rail – Douala, Cameroun | Tel : 657 268 246).*

---

## ✨ Nouveautés & Améliorations de la Version 3.0

1. **📦 Suivi des Stocks & Alertes de Stock Faible** :
   - Décompte automatique du stock disponible à chaque vente en caisse.
   - Badges visuels en temps réel sur les boutons de caisse (*Stock disponible*, *⚠️ Reste X (Stock faible)*, *❌ Épuisé*).
   - Bannière d'alerte automatique sur le Tableau de Bord dès qu'un produit passe sous le seuil critique (≤ 5 unités).
   - Réassort express en 1 clic (+10 unités) et modification du stock dans le Catalogue Produits.

2. **📲 Partage Direct du Reçu par WhatsApp** :
   - Bouton **« 📲 Envoyer par WhatsApp »** sur l'écran du ticket de caisse et dans l'historique des ventes.
   - Génération automatique d'un message formaté professionnel avec détail des gourmandises achetées, remise éventuelle, mode de règlement et message de remerciement.
   - Formatage automatique pour le Cameroun (`+237`).

3. **🔒 Sécurité Renforcée par Code PIN Administrateur** :
   - Clavier PIN numérique virtuel et physique pour sécuriser les opérations sensibles.
   - Protection de la **Clôture de caisse journalière (Z de caisse)**, de la **modification ou archivage d'une vente passée**, et de la **réinitialisation de la base**.
   - Code PIN modifiable dans les Paramètres (Code par défaut : `1234`).

4. **🕒 Points de Restauration Locaux Automatiques (Snapshots)** :
   - Enregistrement automatique de sauvegardes de secours horodatées dans le navigateur (à chaque clôture et automatiquement toutes les 4 heures).
   - Module de restauration en 1 clic dans les Paramètres pour récupérer l'historique en cas de fausse manipulation.
   - Sauvegarde complète téléchargeable en fichier JSON externe.

5. **🏷️ Remises Commerciales en Caisse** :
   - Champ de saisie d'une remise commerciale directement dans le panier.
   - Calcul instantané du total net et affichage de la réduction sur le ticket de caisse.

6. **🚀 Serveur Local Intégré & Déploiement Réseau Wi-Fi** :
   - Fichier `LANCER_APPLICATION.bat` : double-cliquez pour démarrer l'application et ouvrir automatiquement le navigateur.
   - Serveur Python `serveur.py` : affiche l'adresse IP locale pour utiliser la caisse depuis n'importe quel smartphone ou tablette connecté au Wi-Fi de la boutique.

---

## 🚀 Comment Lancer l'Application

### Option A : Sur cet ordinateur (Mode le plus simple)
- Double-cliquez sur `LANCER_APPLICATION.bat` ou ouvrez directement [index.html](file:///c:/Users/GENIUS%20ELECTRONICS/Documents/Applications/AN%20gourmandise/index.html) dans Google Chrome ou Edge.

### Option B : Sur plusieurs téléphones / tablettes (Réseau Wi-Fi de la boutique)
1. Double-cliquez sur `LANCER_APPLICATION.bat` sur l'ordinateur principal.
2. Une fenêtre noire s'ouvre et affiche l'adresse locale, par exemple : `http://192.168.1.XX:8080`.
3. Sur les téléphones des vendeuses ou sur la tablette du comptoir (connectés au même Wi-Fi), ouvrez cette adresse dans Chrome ou Safari.
4. L'application s'ouvre immédiatement !

---

## 📱 Installation sur Téléphone Mobile (PWA)

1. Ouvrez l'adresse de l'application dans Chrome (Android) ou Safari (iPhone).
2. Cliquez sur les 3 points du menu (ou bouton de partage sur iPhone).
3. Choisissez **« Ajouter à l'écran d'accueil »** ou **« Installer l'application »**.
4. L'icône de l'établissement apparaît sur l'écran d'accueil et fonctionne même sans connexion Internet !

---

## 🌐 Déploiement Gratuit sur Internet (HTTPS)

Si vous souhaitez rendre l'application accessible depuis n'importe où dans le monde (hors du réseau local Wi-Fi) :
- **Netlify Drop** : Glissez-déposez le dossier de l'application sur [app.netlify.com/drop](https://app.netlify.com/drop) pour obtenir un lien sécurisé HTTPS en 30 secondes.
- **GitHub Pages / Vercel / Cloudflare Pages** : Déployez directement le dépôt Git créé dans ce dossier.
