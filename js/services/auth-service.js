/**
 * Service d'Authentification et Gestion des Droits / Permissions
 * Les Gourmandises de Ange Noël
 */
import { auth } from "../config/firebase.js";
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { ROLES, DEFAULT_USERS } from "../data/initial-data.js";

class AuthService {
  constructor() {
    this.firebaseUser = null;
    this.currentUser = null;
    this.users = [];
    this.listeners = [];
    this.loadLocalUsers();
  }

  loadLocalUsers() {
    try {
      const stored = localStorage.getItem('an_pos_users');
      if (stored) {
        this.users = JSON.parse(stored);
      } else {
        this.users = [...DEFAULT_USERS];
        this.saveLocalUsers();
      }
    } catch (e) {
      this.users = [...DEFAULT_USERS];
    }
    // Set default active operator
    this.currentUser = this.users[0] || null;
  }

  saveLocalUsers() {
    try {
      localStorage.setItem('an_pos_users', JSON.stringify(this.users));
    } catch (e) {
      console.error("Erreur sauvegarde locale des utilisateurs :", e);
    }
  }

  init(onAuthChangeCallback) {
    if (onAuthChangeCallback) this.listeners.push(onAuthChangeCallback);

    // Écoute de l'état Firebase Auth
    onAuthStateChanged(auth, (fbUser) => {
      this.firebaseUser = fbUser;
      if (fbUser) {
        // Trouver l'utilisateur correspondant dans notre référentiel
        const matched = this.users.find(u => u.email.toLowerCase() === fbUser.email.toLowerCase());
        if (matched) {
          this.currentUser = matched;
        } else {
          // Créer profil de base si non présent
          const newUser = {
            id: fbUser.uid,
            name: fbUser.displayName || fbUser.email.split('@')[0],
            email: fbUser.email,
            role: 'staff',
            pin: '0000',
            active: true,
            permissions: [...ROLES.staff.permissions]
          };
          this.users.push(newUser);
          this.saveLocalUsers();
          this.currentUser = newUser;
        }
      }
      this.notifyListeners();
    });
  }

  notifyListeners() {
    this.listeners.forEach(cb => {
      try { cb(this.currentUser, this.firebaseUser); } catch (e) { console.error(e); }
    });
  }

  getCurrentUser() {
    return this.currentUser;
  }

  getUsers() {
    return this.users;
  }

  /**
   * Vérifie si l'utilisateur en cours détient une permission donnée
   */
  hasPermission(permissionId) {
    if (!this.currentUser) return false;
    // L'administrateur a toujours accès
    if (this.currentUser.role === 'admin') return true;
    
    // Vérifier les permissions explicites
    if (Array.isArray(this.currentUser.permissions)) {
      return this.currentUser.permissions.includes(permissionId);
    }

    // Repli sur le rôle standard
    const roleDef = ROLES[this.currentUser.role];
    return roleDef ? roleDef.permissions.includes(permissionId) : false;
  }

  /**
   * Connexion par email / mot de passe Firebase
   */
  async loginWithEmail(email, password) {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      this.firebaseUser = cred.user;
      const matched = this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (matched) this.currentUser = matched;
      this.notifyListeners();
      return { success: true, user: this.currentUser };
    } catch (err) {
      console.warn("Échec connexion Firebase, tentative de session locale :", err.message);
      // Mode secours hors-ligne / fallback local
      const matched = this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (matched) {
        this.currentUser = matched;
        this.notifyListeners();
        return { success: true, user: matched, offline: true };
      }
      return { success: false, error: err.message };
    }
  }

  /**
   * Déconnexion
   */
  async logout() {
    try {
      await signOut(auth);
    } catch (e) {}
    this.firebaseUser = null;
    // Basculer sur le premier utilisateur actif
    this.currentUser = this.users.find(u => u.active) || null;
    this.notifyListeners();
  }

  /**
   * Changement rapide d'opérateur par PIN (Pratique pour la caisse tactile)
   */
  switchUserByPin(pin) {
    const user = this.users.find(u => u.pin === pin && u.active);
    if (user) {
      this.currentUser = user;
      this.notifyListeners();
      return { success: true, user };
    }
    return { success: false, error: "Code PIN incorrect ou compte désactivé" };
  }

  /**
   * Sélection manuelle de l'opérateur (si autorisé)
   */
  switchUserById(userId) {
    const user = this.users.find(u => u.id === userId && u.active);
    if (user) {
      this.currentUser = user;
      this.notifyListeners();
      return true;
    }
    return false;
  }

  /**
   * Création ou mise à jour d'un utilisateur
   */
  saveUser(userData) {
    if (userData.id) {
      const idx = this.users.findIndex(u => u.id === userData.id);
      if (idx !== -1) {
        this.users[idx] = { ...this.users[idx], ...userData };
        if (this.currentUser && this.currentUser.id === userData.id) {
          this.currentUser = this.users[idx];
        }
      }
    } else {
      const newUser = {
        id: 'u_' + Date.now(),
        name: userData.name,
        email: userData.email,
        role: userData.role || 'staff',
        pin: userData.pin || '0000',
        phone: userData.phone || '',
        active: userData.active !== false,
        permissions: userData.permissions || (ROLES[userData.role]?.permissions || [])
      };
      this.users.push(newUser);
    }
    this.saveLocalUsers();
    this.notifyListeners();
    return true;
  }

  /**
   * Activer / Désactiver un utilisateur
   */
  toggleUserStatus(userId) {
    const user = this.users.find(u => u.id === userId);
    if (!user) return false;
    user.active = !user.active;
    this.saveLocalUsers();
    this.notifyListeners();
    return true;
  }

  /**
   * Supprimer un utilisateur
   */
  deleteUser(userId) {
    if (this.users.length <= 1) return false;
    this.users = this.users.filter(u => u.id !== userId);
    if (this.currentUser && this.currentUser.id === userId) {
      this.currentUser = this.users[0];
    }
    this.saveLocalUsers();
    this.notifyListeners();
    return true;
  }
}

export const authService = new AuthService();
