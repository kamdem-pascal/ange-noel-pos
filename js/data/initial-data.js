/**
 * Données initiales et Référentiel des Rôles & Permissions
 * Les Gourmandises de Ange Noël
 */

export const PERMISSIONS = {
  POS_SALE: { id: 'pos_sale', label: 'Encaisser les ventes (Caisse)', desc: 'Accès au point de vente et création de tickets' },
  POS_DISCOUNT: { id: 'pos_discount', label: 'Appliquer des remises', desc: 'Accorder des réductions commerciales sur le panier' },
  EXPENSES_MANAGE: { id: 'expenses_manage', label: 'Enregistrer des dépenses', desc: 'Saisir les achats et sorties de caisse' },
  CASH_CLOSURE: { id: 'cash_closure', label: 'Clôture de Caisse (Z)', desc: 'Effectuer et valider la clôture journalière' },
  CATALOG_MANAGE: { id: 'catalog_manage', label: 'Gérer le Catalogue', desc: 'Ajouter, modifier ou supprimer produits et catégories' },
  HISTORY_EDIT: { id: 'history_edit', label: 'Modifier / Annuler opérations', desc: 'Modifier l’historique des ventes et dépenses' },
  REPORTS_VIEW: { id: 'reports_view', label: 'Consulter les Rapports', desc: 'Visualiser les bilans financiers et exporter vers Excel' },
  USERS_MANAGE: { id: 'users_manage', label: 'Gérer les Utilisateurs', desc: 'Créer des comptes, attribuer rôles et permissions' },
  SETTINGS_MANAGE: { id: 'settings_manage', label: 'Modifier les Paramètres', desc: 'Coordonnées de l’établissement et sécurité' }
};

export const ROLES = {
  admin: {
    id: 'admin',
    name: 'Administrateur',
    badgeClass: 'badge-rev',
    description: 'Accès total sans restriction à toutes les fonctionnalités et réglages de l’établissement.',
    permissions: [
      'pos_sale', 'pos_discount', 'expenses_manage', 'cash_closure',
      'catalog_manage', 'history_edit', 'reports_view', 'users_manage', 'settings_manage'
    ]
  },
  manager: {
    id: 'manager',
    name: 'Gérant / Superviseur',
    badgeClass: 'badge-cash',
    description: 'Gestion opérationnelle : ventes, dépenses, clôtures, catalogue et consultation des rapports.',
    permissions: [
      'pos_sale', 'pos_discount', 'expenses_manage', 'cash_closure',
      'catalog_manage', 'reports_view'
    ]
  },
  staff: {
    id: 'staff',
    name: 'Caissier / Vendeur',
    badgeClass: 'badge-exp',
    description: 'Encaissement des commandes clients et consultation des stocks et gourmandises.',
    permissions: [
      'pos_sale'
    ]
  }
};

export const DEFAULT_USERS = [
  {
    id: 'user_admin',
    name: 'Ange Noël (Direction)',
    email: 'admin@angenoel.cm',
    role: 'admin',
    pin: '1234',
    phone: '657 268 246',
    active: true,
    permissions: [...ROLES.admin.permissions]
  },
  {
    id: 'user_manager',
    name: 'Pascal (Gérant)',
    email: 'gerant@angenoel.cm',
    role: 'manager',
    pin: '1111',
    phone: '657 268 246',
    active: true,
    permissions: [...ROLES.manager.permissions]
  },
  {
    id: 'user_staff',
    name: 'Caissière Vendeuse',
    email: 'caisse@angenoel.cm',
    role: 'staff',
    pin: '0000',
    phone: '657 268 246',
    active: true,
    permissions: [...ROLES.staff.permissions]
  }
];

export const DEFAULT_CATEGORIES = [
  { id: 'cat_magnums', name: 'Magnums', description: 'Bâtonnets glacés enrobés de chocolat croustillant', imageUrl: '' },
  { id: 'cat_panees', name: 'Glaces panées', description: 'Glaces artisanales avec panure croustillante', imageUrl: '' },
  { id: 'cat_cremes', name: 'Crèmes glacées', description: 'Pots et bacs de crèmes glacées onctueuses classiques', imageUrl: '' },
  { id: 'cat_crush', name: 'Glace Ange Crush', description: 'Créations gourmandes garnies de toppings généreux', imageUrl: '' },
  { id: 'cat_alcool', name: 'Glace Alcoolisée', description: 'Gourmandises parfumées aux liqueurs fines (Baillys)', imageUrl: '' },
  { id: 'cat_spec', name: 'Commandes spéciales', description: 'Gâteaux glacés personnalisés et créations sur-mesure', imageUrl: '' },
  { id: 'cat_livr', name: 'Livraisons', description: 'Frais de livraison à domicile partout à Douala', imageUrl: '' },
  { id: 'cat_boiss', name: 'Boissons & Extras', description: 'Smoothies frais, jus naturels et accompagnements', imageUrl: '' },
  { id: 'cat_autres', name: 'Autres', description: 'Autres articles et prestations diverses', imageUrl: '' }
];

export const DEFAULT_PRODUCTS = [
  // ═══ MAGNUMS (1 à 800F · 2 à 1500F · 3 à 1000F) ═══
  { id: 'mag1', name: 'Magnum Vanille', category: 'Magnums', price: 800, stock: 30, trackStock: true, active: true, imageUrl: '', description: 'Magnum enrobé saveur vanille' },
  { id: 'mag2', name: 'Magnum Fraise', category: 'Magnums', price: 800, stock: 30, trackStock: true, active: true, imageUrl: '', description: 'Magnum onctueux à la fraise' },
  { id: 'mag3', name: 'Magnum Menthe', category: 'Magnums', price: 800, stock: 30, trackStock: true, active: true, imageUrl: '', description: 'Magnum saveur menthe fraîche' },
  { id: 'mag4', name: 'Magnum Baillys', category: 'Magnums', price: 800, stock: 30, trackStock: true, active: true, imageUrl: '', description: 'Magnum liqueur Baillys' },
  { id: 'mag5', name: 'Magnum Ananas', category: 'Magnums', price: 800, stock: 30, trackStock: true, active: true, imageUrl: '', description: 'Magnum fruité ananas' },
  { id: 'mag6', name: 'Magnum Cocktail', category: 'Magnums', price: 800, stock: 30, trackStock: true, active: true, imageUrl: '', description: 'Magnum cocktail tropical' },
  { id: 'mag7', name: 'Magnum Passion', category: 'Magnums', price: 800, stock: 30, trackStock: true, active: true, imageUrl: '', description: 'Magnum fruit de la passion' },

  // ═══ GLACES PANÉES (1 à 1000F · 3 à 2500F · 7 à 5000F) ═══
  { id: 'gp1', name: 'Glace Panée Vanille', category: 'Glaces panées', price: 1000, stock: 30, trackStock: true, active: true, imageUrl: '', description: 'Glace panée croustillante vanille' },
  { id: 'gp2', name: 'Glace Panée Fraise', category: 'Glaces panées', price: 1000, stock: 30, trackStock: true, active: true, imageUrl: '', description: 'Glace panée croustillante fraise' },
  { id: 'gp3', name: 'Glace Panée Menthe', category: 'Glaces panées', price: 1000, stock: 30, trackStock: true, active: true, imageUrl: '', description: 'Glace panée croustillante menthe' },
  { id: 'gp4', name: 'Glace Panée Spéculos', category: 'Glaces panées', price: 1000, stock: 30, trackStock: true, active: true, imageUrl: '', description: 'Glace panée brisures de spéculos' },
  { id: 'gp5', name: 'Glace Panée Baillys', category: 'Glaces panées', price: 1000, stock: 30, trackStock: true, active: true, imageUrl: '', description: 'Glace panée parfum Baillys' },
  { id: 'gp6', name: 'Glace Panée Café', category: 'Glaces panées', price: 1000, stock: 30, trackStock: true, active: true, imageUrl: '', description: 'Glace panée arôme café' },
  { id: 'gp7', name: 'Glace Panée Nutella', category: 'Glaces panées', price: 1000, stock: 30, trackStock: true, active: true, imageUrl: '', description: 'Glace panée cœur Nutella' },
  { id: 'gp8', name: 'Glace Panée Oreo', category: 'Glaces panées', price: 1000, stock: 30, trackStock: true, active: true, imageUrl: '', description: 'Glace panée miettes Oreo' },

  // ═══ CRÈMES GLACÉES (90ml 750F · 250ml 1500F · 1L 3500F) ═══
  { id: 'cg1', name: 'Double-Chocolat 90ml', category: 'Crèmes glacées', price: 750, stock: 20, trackStock: true, active: true, imageUrl: '', description: 'Crème glacée double chocolat 90ml' },
  { id: 'cg2', name: 'Double-Chocolat 250ml', category: 'Crèmes glacées', price: 1500, stock: 15, trackStock: true, active: true, imageUrl: '', description: 'Crème glacée double chocolat 250ml' },
  { id: 'cg3', name: 'Double-Chocolat 1L', category: 'Crèmes glacées', price: 3500, stock: 10, trackStock: true, active: true, imageUrl: '', description: 'Bac familial double chocolat 1L' },
  { id: 'cg4', name: 'Vanille-Chocolat 90ml', category: 'Crèmes glacées', price: 750, stock: 20, trackStock: true, active: true, imageUrl: '', description: 'Duo vanille et chocolat 90ml' },
  { id: 'cg5', name: 'Vanille-Chocolat 250ml', category: 'Crèmes glacées', price: 1500, stock: 15, trackStock: true, active: true, imageUrl: '', description: 'Duo vanille et chocolat 250ml' },
  { id: 'cg6', name: 'Vanille-Chocolat 1L', category: 'Crèmes glacées', price: 3500, stock: 10, trackStock: true, active: true, imageUrl: '', description: 'Bac duo vanille chocolat 1L' },
  { id: 'cg7', name: 'Glace au Café 90ml', category: 'Crèmes glacées', price: 750, stock: 20, trackStock: true, active: true, imageUrl: '', description: 'Crème glacée café doux 90ml' },
  { id: 'cg8', name: 'Glace au Café 250ml', category: 'Crèmes glacées', price: 1500, stock: 15, trackStock: true, active: true, imageUrl: '', description: 'Crème glacée café doux 250ml' },
  { id: 'cg9', name: 'Glace au Café 1L', category: 'Crèmes glacées', price: 3500, stock: 10, trackStock: true, active: true, imageUrl: '', description: 'Bac crème glacée café 1L' },

  // ═══ GLACE ANGE CRUSH (90ml 850F · 250ml 2000F · 1L 4500F) ═══
  { id: 'ac1', name: 'Caramel Beurre Salé 90ml', category: 'Glace Ange Crush', price: 850, stock: 15, trackStock: true, active: true, imageUrl: '', description: 'Ange Crush caramel beurre salé 90ml' },
  { id: 'ac2', name: 'Caramel Beurre Salé 250ml', category: 'Glace Ange Crush', price: 2000, stock: 10, trackStock: true, active: true, imageUrl: '', description: 'Ange Crush caramel beurre salé 250ml' },
  { id: 'ac3', name: 'Caramel Beurre Salé 1L', category: 'Glace Ange Crush', price: 4500, stock: 8, trackStock: true, active: true, imageUrl: '', description: 'Ange Crush caramel beurre salé 1L' },
  { id: 'ac4', name: 'Glace au Nutella 90ml', category: 'Glace Ange Crush', price: 850, stock: 15, trackStock: true, active: true, imageUrl: '', description: 'Ange Crush coulis Nutella 90ml' },
  { id: 'ac5', name: 'Glace au Nutella 250ml', category: 'Glace Ange Crush', price: 2000, stock: 10, trackStock: true, active: true, imageUrl: '', description: 'Ange Crush coulis Nutella 250ml' },
  { id: 'ac6', name: 'Glace au Nutella 1L', category: 'Glace Ange Crush', price: 4500, stock: 8, trackStock: true, active: true, imageUrl: '', description: 'Ange Crush grand bac Nutella 1L' },
  { id: 'ac7', name: 'Glace au Spéculos 90ml', category: 'Glace Ange Crush', price: 850, stock: 15, trackStock: true, active: true, imageUrl: '', description: 'Ange Crush éclats spéculos 90ml' },
  { id: 'ac8', name: 'Glace au Spéculos 250ml', category: 'Glace Ange Crush', price: 2000, stock: 10, trackStock: true, active: true, imageUrl: '', description: 'Ange Crush éclats spéculos 250ml' },
  { id: 'ac9', name: 'Glace au Spéculos 1L', category: 'Glace Ange Crush', price: 4500, stock: 8, trackStock: true, active: true, imageUrl: '', description: 'Ange Crush pot familial spéculos 1L' },
  { id: 'ac10', name: 'Glace Oreo + Nutella 90ml', category: 'Glace Ange Crush', price: 850, stock: 15, trackStock: true, active: true, imageUrl: '', description: 'Crush duo Oreo et Nutella 90ml' },
  { id: 'ac11', name: 'Glace Oreo + Nutella 250ml', category: 'Glace Ange Crush', price: 2000, stock: 10, trackStock: true, active: true, imageUrl: '', description: 'Crush duo Oreo et Nutella 250ml' },
  { id: 'ac12', name: 'Glace Oreo + Nutella 1L', category: 'Glace Ange Crush', price: 4500, stock: 8, trackStock: true, active: true, imageUrl: '', description: 'Crush familial Oreo Nutella 1L' },
  { id: 'ac13', name: 'Vanille-Kinder 90ml', category: 'Glace Ange Crush', price: 850, stock: 15, trackStock: true, active: true, imageUrl: '', description: 'Ange Crush vanille et Kinder 90ml' },
  { id: 'ac14', name: 'Vanille-Kinder 250ml', category: 'Glace Ange Crush', price: 2000, stock: 10, trackStock: true, active: true, imageUrl: '', description: 'Ange Crush vanille et Kinder 250ml' },
  { id: 'ac15', name: 'Vanille-Kinder 1L', category: 'Glace Ange Crush', price: 4500, stock: 8, trackStock: true, active: true, imageUrl: '', description: 'Ange Crush bac vanille Kinder 1L' },
  { id: 'ac16', name: 'Noix de Coco Râpée 90ml', category: 'Glace Ange Crush', price: 850, stock: 15, trackStock: true, active: true, imageUrl: '', description: 'Ange Crush noix de coco râpée 90ml' },
  { id: 'ac17', name: 'Noix de Coco Râpée 250ml', category: 'Glace Ange Crush', price: 2000, stock: 10, trackStock: true, active: true, imageUrl: '', description: 'Ange Crush noix de coco râpée 250ml' },
  { id: 'ac18', name: 'Noix de Coco Râpée 1L', category: 'Glace Ange Crush', price: 4500, stock: 8, trackStock: true, active: true, imageUrl: '', description: 'Ange Crush bac noix de coco 1L' },
  { id: 'ac19', name: 'Glace à la Pistache 90ml', category: 'Glace Ange Crush', price: 850, stock: 15, trackStock: true, active: true, imageUrl: '', description: 'Ange Crush pistache d’Italie 90ml' },
  { id: 'ac20', name: 'Glace à la Pistache 250ml', category: 'Glace Ange Crush', price: 2000, stock: 10, trackStock: true, active: true, imageUrl: '', description: 'Ange Crush pistache d’Italie 250ml' },
  { id: 'ac21', name: 'Glace à la Pistache 1L', category: 'Glace Ange Crush', price: 4500, stock: 8, trackStock: true, active: true, imageUrl: '', description: 'Ange Crush grand bac pistache 1L' },

  // ═══ GLACE ALCOOLISÉE (90ml 800F · 250ml 2000F · 1L 4500F) ═══
  { id: 'ga1', name: 'Glace au Baillys 90ml', category: 'Glace Alcoolisée', price: 800, stock: 15, trackStock: true, active: true, imageUrl: '', description: 'Glace alcoolisée crème de Baillys 90ml' },
  { id: 'ga2', name: 'Glace au Baillys 250ml', category: 'Glace Alcoolisée', price: 2000, stock: 10, trackStock: true, active: true, imageUrl: '', description: 'Glace alcoolisée crème de Baillys 250ml' },
  { id: 'ga3', name: 'Glace au Baillys 1L', category: 'Glace Alcoolisée', price: 4500, stock: 8, trackStock: true, active: true, imageUrl: '', description: 'Grand bac glace Baillys 1L' },

  // ═══ COMMANDES SPÉCIALES ═══
  { id: 'cs1', name: 'Gâteau Glacé Personnalisé', category: 'Commandes spéciales', price: 12000, stock: 10, trackStock: false, active: true, imageUrl: '', description: 'Gâteau glacé sur-mesure pour anniversaires et fêtes' },
  { id: 'cs2', name: 'Boîte 6 Cupcakes', category: 'Commandes spéciales', price: 5000, stock: 15, trackStock: true, active: true, imageUrl: '', description: 'Assortiment de 6 cupcakes gourmands faits maison' },

  // ═══ BOISSONS & EXTRAS ═══
  { id: 'bx1', name: 'Smoothie / Jus Naturel', category: 'Boissons & Extras', price: 1000, stock: 30, trackStock: true, active: true, imageUrl: '', description: 'Smoothie frais pressé minute ou jus de fruits locaux' },

  // ═══ LIVRAISONS ═══
  { id: 'lv1', name: 'Frais de Livraison Douala', category: 'Livraisons', price: 1000, stock: 99, trackStock: false, active: true, imageUrl: '', description: 'Livraison express par coursier partout à Douala' }
];

export const DEFAULT_SHOP_INFO = {
  name: "Les Gourmandises de Ange Noël",
  subtitle: "Pâtisserie & Glacerie Artisanale",
  address: "Nyalla Rail – Douala, Cameroun",
  phone: "657 268 246",
  receiptFooter: "Merci pour votre gourmandise ! À très bientôt."
};
