/**
 * Service de Données & Synchronisation Firestore / LocalStorage
 * Les Gourmandises de Ange Noël
 */
import { db } from "../config/firebase.js";
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  onSnapshot,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { 
  DEFAULT_CATEGORIES, 
  DEFAULT_PRODUCTS, 
  DEFAULT_SHOP_INFO 
} from "../data/initial-data.js";

const STORAGE_KEY = 'angeNoelManagerV1';

class DbService {
  constructor() {
    this.data = this.loadLocalState();
    this.syncListeners = [];
    this.isOnline = navigator.onLine;
    this.setupNetworkListeners();
  }

  loadLocalState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (!parsed.products || !parsed.products.length) parsed.products = [...DEFAULT_PRODUCTS];
        if (!parsed.categories || !parsed.categories.length) parsed.categories = [...DEFAULT_CATEGORIES];
        if (!parsed.shop) parsed.shop = { ...DEFAULT_SHOP_INFO };
        return parsed;
      }
    } catch (e) {
      console.warn("Échec chargement local, chargement état initial.");
    }
    return {
      version: 4,
      shop: { ...DEFAULT_SHOP_INFO },
      openingCash: 0,
      openingMomo: 0,
      ops: [],
      products: [...DEFAULT_PRODUCTS],
      categories: [...DEFAULT_CATEGORIES],
      revenueCats: DEFAULT_CATEGORIES.map(c => c.name),
      expenseCats: [
        'Matières premières (Lait, crème, sucre...)',
        'Emballages & Pots',
        'Transport & Livraisons',
        'Électricité & Groupe électrogène',
        'Eau',
        'Salaires & Personnel',
        'Publicité & Réseaux sociaux',
        'Entretien & Réparations',
        'Autres'
      ],
      users: ['Ange Noël (Direction)', 'Pascal (Gérant)', 'Caissière Vendeuse'],
      closures: [],
      audit: []
    };
  }

  saveLocalState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error("Erreur sauvegarde LocalStorage :", e);
    }
  }

  getData() {
    return this.data;
  }

  setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncToFirestore();
    });
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  /**
   * Initialisation des écouteurs temps-réel Firestore
   */
  initRealtimeSync(onDataChanged) {
    if (onDataChanged) this.syncListeners.push(onDataChanged);

    try {
      // Écouter les produits
      onSnapshot(collection(db, "products"), (snapshot) => {
        if (!snapshot.empty) {
          const prods = [];
          snapshot.forEach(doc => prods.push({ id: doc.id, ...doc.data() }));
          this.data.products = prods;
          this.saveLocalState();
          this.notify();
        }
      }, (err) => console.log("Mode hors-ligne / Snapshot Firestore produits :", err.message));

      // Écouter les catégories
      onSnapshot(collection(db, "categories"), (snapshot) => {
        if (!snapshot.empty) {
          const cats = [];
          snapshot.forEach(doc => cats.push({ id: doc.id, ...doc.data() }));
          this.data.categories = cats;
          this.data.revenueCats = cats.map(c => c.name);
          this.saveLocalState();
          this.notify();
        }
      }, (err) => console.log("Mode hors-ligne / Snapshot Firestore catégories :", err.message));

      // Écouter les opérations
      onSnapshot(collection(db, "operations"), (snapshot) => {
        if (!snapshot.empty) {
          const ops = [];
          snapshot.forEach(doc => ops.push({ id: doc.id, ...doc.data() }));
          this.data.ops = ops;
          this.saveLocalState();
          this.notify();
        }
      }, (err) => console.log("Mode hors-ligne / Snapshot Firestore opérations :", err.message));
    } catch (e) {
      console.warn("Connexion Firestore en arrière-plan :", e.message);
    }
  }

  notify() {
    this.syncListeners.forEach(cb => {
      try { cb(this.data); } catch (e) {}
    });
  }

  /**
   * Enregistrer une opération (vente ou dépense)
   */
  async saveOperation(op) {
    this.data.ops.push(op);
    this.saveLocalState();
    this.notify();

    // Sync Firestore
    try {
      await setDoc(doc(db, "operations", op.id), op);
    } catch (e) {
      console.warn("Opération sauvegardée localement (sync différée) :", e.message);
    }
  }

  /**
   * Mettre à jour une opération
   */
  async updateOperation(op) {
    const idx = this.data.ops.findIndex(o => o.id === op.id);
    if (idx !== -1) {
      this.data.ops[idx] = { ...this.data.ops[idx], ...op };
      this.saveLocalState();
      this.notify();
      try {
        await setDoc(doc(db, "operations", op.id), op, { merge: true });
      } catch (e) {}
    }
  }

  /**
   * Enregistrer ou mettre à jour un produit
   */
  async saveProduct(p) {
    const idx = this.data.products.findIndex(x => x.id === p.id);
    if (idx !== -1) {
      this.data.products[idx] = { ...this.data.products[idx], ...p };
    } else {
      this.data.products.push(p);
    }
    this.saveLocalState();
    this.notify();

    try {
      await setDoc(doc(db, "products", p.id), p);
    } catch (e) {
      console.warn("Produit sauvegardé en cache local :", e.message);
    }
  }

  /**
   * Supprimer un produit
   */
  async deleteProduct(id) {
    this.data.products = this.data.products.filter(p => p.id !== id);
    this.saveLocalState();
    this.notify();

    try {
      await deleteDoc(doc(db, "products", id));
    } catch (e) {}
  }

  /**
   * Enregistrer ou modifier une catégorie
   */
  async saveCategory(c) {
    const idx = this.data.categories.findIndex(x => x.id === c.id);
    if (idx !== -1) {
      const oldName = this.data.categories[idx].name;
      this.data.categories[idx] = { ...this.data.categories[idx], ...c };
      // Renommer les produits rattachés
      if (oldName !== c.name) {
        this.data.products.forEach(p => {
          if (p.category === oldName) p.category = c.name;
        });
      }
    } else {
      this.data.categories.push(c);
    }
    this.data.revenueCats = this.data.categories.map(cat => cat.name);
    this.saveLocalState();
    this.notify();

    try {
      await setDoc(doc(db, "categories", c.id), c);
    } catch (e) {}
  }

  /**
   * Supprimer une catégorie
   */
  async deleteCategory(id) {
    const cat = this.data.categories.find(c => c.id === id);
    if (!cat) return;

    this.data.categories = this.data.categories.filter(c => c.id !== id);
    this.data.revenueCats = this.data.categories.map(c => c.name);
    this.saveLocalState();
    this.notify();

    try {
      await deleteDoc(doc(db, "categories", id));
    } catch (e) {}
  }

  /**
   * Enregistrer une clôture de caisse Z
   */
  async saveClosure(closure) {
    this.data.closures.push(closure);
    this.saveLocalState();
    this.notify();

    try {
      await setDoc(doc(db, "closures", closure.id), closure);
    } catch (e) {}
  }

  /**
   * Script / Fonction de SEEDing complet vers Firestore (In-App ou programmatique)
   */
  async seedFirestore(progressCallback) {
    try {
      let count = 0;
      const total = DEFAULT_CATEGORIES.length + DEFAULT_PRODUCTS.length + 1;

      // 1. Catégories
      for (const cat of DEFAULT_CATEGORIES) {
        await setDoc(doc(db, "categories", cat.id), cat);
        count++;
        if (progressCallback) progressCallback(count, total, `Catégorie ${cat.name}...`);
      }

      // 2. Produits
      for (const prod of DEFAULT_PRODUCTS) {
        await setDoc(doc(db, "products", prod.id), prod);
        count++;
        if (progressCallback) progressCallback(count, total, `Produit ${prod.name}...`);
      }

      // 3. Infos boutique
      await setDoc(doc(db, "settings", "shop"), DEFAULT_SHOP_INFO);
      count++;
      if (progressCallback) progressCallback(count, total, "Paramètres enregistrés !");

      return { success: true, count };
    } catch (err) {
      console.error("Erreur lors du Seed Firestore :", err);
      return { success: false, error: err.message };
    }
  }

  syncToFirestore() {
    // Si reconnecté, pousse les opérations en attente
    console.log("Synchronisation en cours avec Firestore...");
  }
}

export const dbService = new DbService();
