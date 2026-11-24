/**
 * Application Orchestrator & Event Controller
 * Les Gourmandises de Ange Noël — v4.0.0 Firebase Edition
 */

import { authService } from "./services/auth-service.js";
import { dbService } from "./services/db-service.js";
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, DEFAULT_SHOP_INFO, ROLES, PERMISSIONS } from "./data/initial-data.js";
import { 
  el, val, money, today, escapeHtml, showToast, 
  openModal, closeModal, openMobileDrawer, closeMobileDrawer, 
  toggleMobileDrawer, downloadBlob 
} from "./modules/ui.js";
import { 
  renderUsersTable, renderRolesGuide, openNewUserModal, 
  openEditUserModal, saveUserForm, toggleUserActive, 
  deleteUserRecord, triggerInAppSeed, updatePermissionsCheckboxes 
} from "./modules/users.js";

// Global in-memory reference to data
let data = dbService.getData();

// Cart in-memory state
let cart = [];
let selectedPosCategory = 'all';
let currentCatalogTab = 'products';
let currentPosMobileView = 'catalog';
let pinActionCallback = null;
let deferredPrompt = null;

/* =========================================================================
   AUTHENTICATION & USER PROFILE UI
   ========================================================================= */

function updateAuthUI() {
  const user = authService.getCurrentUser();
  const userName = user ? user.name : 'Non connecté';
  const userRole = user ? (ROLES[user.role]?.name || user.role) : '';

  if (el('curUserNameBadge')) el('curUserNameBadge').textContent = userName;
  if (el('curUserRoleBadge')) el('curUserRoleBadge').textContent = userRole;
  if (el('mobileCurOperator')) el('mobileCurOperator').textContent = user ? user.name.split(' ')[0] : 'Opérateur';

  // Synchronize operator selects
  const users = authService.getUsers().filter(u => u.active);
  const options = users.map(u => `<option value="${u.id}" ${user && user.id === u.id ? 'selected' : ''}>${escapeHtml(u.name)} (${ROLES[u.role]?.name || u.role})</option>`).join('');

  if (el('operatorSelect')) el('operatorSelect').innerHTML = options;
  if (el('operatorSelectMobile')) el('operatorSelectMobile').innerHTML = options;
}

function handleOperatorChange(userId) {
  authService.switchUserById(userId);
  updateAuthUI();
  showToast(`Session active : ${authService.getCurrentUser().name}`, 'info');
}

function openQuickPinModal() {
  el('quickPinInput').value = '';
  openModal('modalQuickPin');
  setTimeout(() => el('quickPinInput')?.focus(), 150);
}

function submitQuickPin() {
  const pin = val('quickPinInput').trim();
  const res = authService.switchUserByPin(pin);
  if (res.success) {
    closeModal('modalQuickPin');
    updateAuthUI();
    showToast(`Bienvenue ${res.user.name} !`, 'success');
  } else {
    alert(res.error || "Code PIN invalide");
  }
}

function openLoginModal() {
  openModal('modalLogin');
}

async function handleFirebaseLogin() {
  const email = val('loginEmail').trim();
  const pass = val('loginPassword').trim();
  if (!email || !pass) {
    alert("Veuillez saisir votre email et mot de passe.");
    return;
  }

  showToast("Connexion à Firebase...", "info");
  const res = await authService.loginWithEmail(email, pass);
  if (res.success) {
    closeModal('modalLogin');
    updateAuthUI();
    showToast(`Connecté : ${res.user.name}`, 'success');
  } else {
    alert(`Erreur de connexion : ${res.error}`);
  }
}

async function handleLogout() {
  if (confirm("Voulez-vous vous déconnecter ?")) {
    await authService.logout();
    updateAuthUI();
    showToast("Déconnexion effectuée", "info");
  }
}

/* =========================================================================
   PIN & PERMISSION SECURITY
   ========================================================================= */

function requestPermissionOrPin(permissionKey, actionTitle, onSuccess) {
  // 1. Si l'utilisateur actuel détient la permission, exécuter directement
  if (authService.hasPermission(permissionKey)) {
    onSuccess();
    return;
  }

  // 2. Sinon, demander le PIN d'un administrateur/superviseur
  pinActionCallback = onSuccess;
  el('pinModalActionTitle').textContent = actionTitle || '🔒 Autorisation Requise';
  el('pinInput').value = '';
  openModal('modalPinCheck');
  setTimeout(() => el('pinInput')?.focus(), 150);
}

function appendPinDigit(d) {
  const input = el('pinInput');
  if (input && input.value.length < 8) input.value += d;
}

function clearPinInput() {
  if (el('pinInput')) el('pinInput').value = '';
}

function backspacePinDigit() {
  const input = el('pinInput');
  if (input) input.value = input.value.slice(0, -1);
}

function verifyPinInput() {
  const typedPin = val('pinInput').trim();
  const adminOrManager = authService.getUsers().find(u => u.active && u.pin === typedPin && (u.role === 'admin' || u.role === 'manager'));

  if (adminOrManager || typedPin === (data.adminPin || '1234')) {
    closeModal('modalPinCheck');
    if (typeof pinActionCallback === 'function') {
      const cb = pinActionCallback;
      pinActionCallback = null;
      cb();
    }
  } else {
    alert('Code PIN invalide ou droits insuffisants.');
    clearPinInput();
  }
}

function openChangePinModal() {
  const cur = prompt("Entrez votre code PIN actuel :", "");
  if (cur === null) return;
  const admin = authService.getUsers().find(u => u.role === 'admin' && u.pin === cur);
  if (!admin && cur !== (data.adminPin || '1234')) {
    alert("Code PIN actuel incorrect.");
    return;
  }
  const nouveau = prompt("Entrez le NOUVEAU code PIN (4 à 6 chiffres) :", "");
  if (!nouveau || nouveau.length < 4) {
    alert("Le code PIN doit comporter au moins 4 chiffres.");
    return;
  }
  data.adminPin = nouveau;
  if (admin) admin.pin = nouveau;
  authService.saveLocalUsers();
  persist();
  showToast("Code PIN administrateur mis à jour !", "success");
}

/* =========================================================================
   DATA PERSISTENCE & AUTO-SNAPSHOTS
   ========================================================================= */

function persist(skipSnapshot = false) {
  dbService.saveLocalState();
  if (!skipSnapshot) maybeAutoSnapshot();
  refreshUI();
}

function getLocalSnapshots() {
  try {
    return JSON.parse(localStorage.getItem('an_snapshots') || '[]');
  } catch (e) {
    return [];
  }
}

function saveLocalSnapshots(list) {
  try {
    localStorage.setItem('an_snapshots', JSON.stringify(list.slice(0, 10)));
  } catch (e) {}
}

function createSnapshot(reason = 'Automatique') {
  const list = getLocalSnapshots();
  list.unshift({
    id: 'snap_' + Date.now(),
    date: new Date().toISOString(),
    reason,
    opsCount: (data.ops || []).length,
    payload: JSON.stringify(data)
  });
  saveLocalSnapshots(list);
  renderSnapshotsTable();
}

function maybeAutoSnapshot() {
  const list = getLocalSnapshots();
  const last = list[0];
  const now = Date.now();
  if (!last || (now - new Date(last.date).getTime() > 4 * 3600 * 1000)) {
    createSnapshot('Sauvegarde 4h');
  }
}

function createManualSnapshot() {
  createSnapshot('Sauvegarde manuelle');
  showToast('Point de restauration créé !', 'success');
}

function restoreSnapshot(snapId) {
  requestPermissionOrPin('settings_manage', 'Restaurer une sauvegarde', () => {
    const list = getLocalSnapshots();
    const snap = list.find(s => s.id === snapId);
    if (!snap) return;
    if (!confirm(`Restaurer l'état du ${new Date(snap.date).toLocaleString('fr-FR')} ?`)) return;
    try {
      data = JSON.parse(snap.payload);
      dbService.data = data;
      persist(true);
      showToast('Données restaurées !', 'success');
    } catch (e) {
      alert("Erreur lors de la restauration.");
    }
  });
}

function deleteSnapshot(snapId) {
  let list = getLocalSnapshots().filter(s => s.id !== snapId);
  saveLocalSnapshots(list);
  renderSnapshotsTable();
  showToast('Sauvegarde supprimée', 'info');
}

function renderSnapshotsTable() {
  const tbody = el('snapshotsTableRows');
  if (!tbody) return;
  const list = getLocalSnapshots();
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:15px; color:var(--text-muted);">Aucune sauvegarde locale.</td></tr>';
    return;
  }
  tbody.innerHTML = list.map(s => `
    <tr>
      <td><b>${new Date(s.date).toLocaleString('fr-FR')}</b></td>
      <td><span class="badge badge-cash">${escapeHtml(s.reason)}</span></td>
      <td>${s.opsCount} opérations</td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="window.restoreSnapshot('${s.id}')">Restaurer</button>
        <button class="btn btn-danger btn-sm" onclick="window.deleteSnapshot('${s.id}')">✕</button>
      </td>
    </tr>
  `).join('');
}

/* =========================================================================
   POS (POINT DE VENTE & CAISSE)
   ========================================================================= */

function renderPosCategoryPills() {
  const container = el('posCatPills');
  if (!container) return;
  const cats = ['all', ...data.revenueCats];
  container.innerHTML = cats.map(c => `
    <button class="cat-btn ${c === selectedPosCategory ? 'active' : ''}" onclick="window.setPosCatFilter('${escapeHtml(c)}')">
      ${c === 'all' ? '✨ Tout afficher' : escapeHtml(c)}
    </button>
  `).join('');
}

function setPosCatFilter(cat) {
  selectedPosCategory = cat;
  renderPosCategoryPills();
  renderPosCatalog();
}

function renderPosCatalog() {
  const container = el('posProductsGrid');
  if (!container) return;
  const query = (val('posSearch') || '').toLowerCase().trim();

  const filtered = data.products.filter(p => {
    if (!p.active) return false;
    const matchesCat = selectedPosCategory === 'all' || p.category === selectedPosCategory;
    const matchesQuery = !query || p.name.toLowerCase().includes(query) || p.category.toLowerCase().includes(query);
    return matchesCat && matchesQuery;
  });

  if (!filtered.length) {
    container.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:30px; color:var(--text-muted);">Aucune gourmandise trouvée.</div>`;
    return;
  }

  container.innerHTML = filtered.map(p => {
    const stockQty = p.stock !== undefined ? p.stock : 25;
    const isOutOfStock = p.trackStock && stockQty <= 0;
    const stockClass = !p.trackStock ? 'stock-ok' : (stockQty <= 0 ? 'stock-empty' : (stockQty <= 5 ? 'stock-low' : 'stock-ok'));
    const stockText = !p.trackStock ? '' : (stockQty <= 0 ? '❌ Épuisé' : (stockQty <= 5 ? `⚠️ Reste ${stockQty}` : `📦 Stock: ${stockQty}`));
    const imgBlock = p.imageUrl ? `<img src="${escapeHtml(p.imageUrl)}" alt="${escapeHtml(p.name)}" class="product-pos-thumb" onerror="this.style.display='none'">` : '';
    const descBlock = p.description ? `<div style="font-size:11.5px; color:var(--text-muted); margin-bottom:4px; max-height:28px; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">${escapeHtml(p.description)}</div>` : '';

    return `
      <div class="product-card ${isOutOfStock ? 'disabled-card' : ''}" onclick="${isOutOfStock ? "window.showToast('Produit actuellement épuisé !', 'error')" : `window.addToCart('${p.id}')`}">
        ${imgBlock}
        <div>
          <div class="product-card-cat">${escapeHtml(p.category)}</div>
          <div class="product-card-title">${escapeHtml(p.name)}</div>
          ${descBlock}
          ${p.trackStock ? `<div class="stock-badge ${stockClass}">${stockText}</div>` : ''}
        </div>
        <div class="product-card-price">${money(p.price)}</div>
      </div>
    `;
  }).join('');
}

function addToCart(productId) {
  const prod = data.products.find(p => p.id === productId);
  if (!prod) return;

  const existing = cart.find(item => item.productId === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      productId: prod.id,
      name: prod.name,
      category: prod.category,
      price: prod.price,
      qty: 1
    });
  }
  renderCart();
  showToast(`+1 ${prod.name}`, 'info');
}

function updateCartQty(idx, delta) {
  if (!cart[idx]) return;
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  renderCart();
}

function clearCart() {
  if (!cart.length) return;
  cart = [];
  if (el('cartCustomer')) el('cartCustomer').value = '';
  if (el('cartPhone')) el('cartPhone').value = '';
  if (el('cartDiscount')) el('cartDiscount').value = '';
  renderCart();
}

function renderCart() {
  const container = el('cartItemsList');
  if (!container) return;

  if (!cart.length) {
    container.innerHTML = `
      <div style="text-align:center; padding:35px 10px; color:var(--text-muted);">
        <p style="font-size:32px; margin-bottom:8px;">🍨</p>
        <p>Le ticket est vide.</p>
        <small>Touchez un produit à gauche pour l'ajouter.</small>
      </div>
    `;
    if (el('cartCount')) el('cartCount').textContent = '0';
    if (el('cartGrandTotal')) el('cartGrandTotal').textContent = '0 F CFA';
    if (el('bottomNavCartBadge')) el('bottomNavCartBadge').style.display = 'none';
    if (el('cartCountBadge')) el('cartCountBadge').textContent = '0';
    if (el('cartTotalSummary')) el('cartTotalSummary').textContent = '0 F';
    if (el('posFloatingCartBar')) el('posFloatingCartBar').style.display = 'none';
    return;
  }

  let total = 0;
  let totalQty = 0;

  container.innerHTML = cart.map((item, idx) => {
    const lineTotal = item.price * item.qty;
    total += lineTotal;
    totalQty += item.qty;
    return `
      <div class="cart-item">
        <div class="cart-item-info">
          <div class="cart-item-name">${escapeHtml(item.name)}</div>
          <div class="cart-item-sub">${money(item.price)} unitaire</div>
        </div>
        <div class="cart-item-qty">
          <button class="qty-btn" onclick="window.updateCartQty(${idx}, -1)">−</button>
          <span style="font-weight:700; min-width:20px; text-align:center;">${item.qty}</span>
          <button class="qty-btn" onclick="window.updateCartQty(${idx}, 1)">＋</button>
        </div>
        <div class="cart-item-total">${money(lineTotal)}</div>
      </div>
    `;
  }).join('');

  const rawDiscount = Number(val('cartDiscount')) || 0;
  const discount = Math.min(rawDiscount, total);
  const grandTotal = Math.max(0, total - discount);

  if (el('cartCount')) el('cartCount').textContent = String(totalQty);
  if (el('cartGrandTotal')) el('cartGrandTotal').textContent = money(grandTotal);

  // Synchronisation des badges mobiles
  const bNavBadge = el('bottomNavCartBadge');
  if (bNavBadge) {
    bNavBadge.style.display = totalQty > 0 ? 'flex' : 'none';
    bNavBadge.textContent = String(totalQty);
  }
  if (el('cartCountBadge')) el('cartCountBadge').textContent = String(totalQty);
  if (el('cartTotalSummary')) el('cartTotalSummary').textContent = money(grandTotal);

  const floatBar = el('posFloatingCartBar');
  if (floatBar) {
    if (totalQty > 0 && currentPosMobileView === 'catalog') {
      floatBar.style.display = 'flex';
      el('floatingCartCount').textContent = `${totalQty} article${totalQty > 1 ? 's' : ''}`;
      el('floatingCartTotal').textContent = money(grandTotal);
    } else {
      floatBar.style.display = 'none';
    }
  }
}

function openCustomItemModal() {
  el('customItemName').value = '';
  el('customItemPrice').value = '';
  el('customItemQty').value = 1;
  el('customItemCat').innerHTML = data.revenueCats.map(c => `<option>${escapeHtml(c)}</option>`).join('');
  openModal('modalCustomItem');
}

function addCustomItemToCart() {
  const name = val('customItemName').trim();
  const cat = val('customItemCat');
  const qty = Number(val('customItemQty')) || 1;
  const totalAmount = Number(val('customItemPrice'));

  if (!name || totalAmount <= 0) {
    alert('Veuillez saisir un nom et un montant valide.');
    return;
  }

  cart.push({
    productId: 'custom_' + Date.now(),
    name: name,
    category: cat,
    price: Math.round(totalAmount / qty),
    qty: qty
  });

  closeModal('modalCustomItem');
  renderCart();
  showToast(`Article personnalisé "${name}" ajouté !`, 'success');
}

async function checkoutSale() {
  if (!authService.hasPermission('pos_sale')) {
    alert("Accès refusé : Vous n'avez pas les droits pour encaisser une vente.");
    return;
  }

  if (!cart.length) {
    alert('Le ticket est vide. Ajoutez au moins une gourmandise.');
    return;
  }

  const paymentInput = document.querySelector('input[name="posPayment"]:checked');
  const payment = paymentInput ? paymentInput.value : 'Espèces';
  const customerName = val('cartCustomer').trim();
  const customerPhone = val('cartPhone').trim();

  let subtotal = 0;
  cart.forEach(item => subtotal += item.price * item.qty);
  const rawDiscount = Number(val('cartDiscount')) || 0;
  const discount = Math.min(rawDiscount, subtotal);
  const totalAmount = Math.max(0, subtotal - discount);

  // Décrémenter les stocks
  cart.forEach(item => {
    if (item.productId && !item.productId.startsWith('custom_')) {
      const p = data.products.find(x => x.id === item.productId);
      if (p && p.trackStock) {
        p.stock = Math.max(0, (p.stock !== undefined ? p.stock : 25) - item.qty);
      }
    }
  });

  const activeOp = authService.getCurrentUser()?.name || 'Vendeur';
  const op = {
    id: 'op_' + Date.now(),
    type: 'revenue',
    date: today(),
    time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    amount: totalAmount,
    subtotal: subtotal,
    discount: discount,
    payment: payment,
    paymentStatus: payment === 'Crédit' ? 'credit' : 'paid',
    category: cart[0].category || 'Gourmandises',
    detail: cart.map(i => `${i.qty}x ${i.name}`).join(', '),
    customerName: customerName,
    customerPhone: customerPhone,
    user: activeOp,
    items: JSON.parse(JSON.stringify(cart)),
    note: discount > 0 ? `Remise commerciale de ${money(discount)}` : ''
  };

  // Enregistrement via dbService (sauvegarde locale + Firestore)
  await dbService.saveOperation(op);

  // Affichage du ticket
  generateReceiptPreview(op);
  openModal('modalReceipt');

  // Réinitialiser le panier
  clearCart();
  showToast(`Vente de ${money(totalAmount)} validée avec succès !`, 'success');
}

function generateReceiptPreview(op) {
  const shop = data.shop || DEFAULT_SHOP_INFO;
  const items = op.items || [{ name: op.detail || op.category, qty: 1, price: op.amount }];
  
  let rowsHtml = items.map(it => `
    <tr>
      <td>${escapeHtml(it.name)}</td>
      <td style="text-align:center;">${it.qty}</td>
      <td style="text-align:right;">${money(it.price * it.qty)}</td>
    </tr>
  `).join('');

  el('receiptPrintArea').innerHTML = `
    <div style="text-align:center; margin-bottom:12px;">
      <h3 style="margin:0; font-size:18px; color:var(--primary); font-family:Georgia, serif;">${escapeHtml(shop.name)}</h3>
      <div style="font-size:11.5px; color:var(--text-muted);">${escapeHtml(shop.subtitle)}</div>
      <div style="font-size:12px; margin-top:4px;">${escapeHtml(shop.address)}</div>
      <div style="font-size:12px; font-weight:bold;">Tél : ${escapeHtml(shop.phone)}</div>
    </div>
    <hr style="border:0; border-top:1px dashed var(--border); margin:10px 0;">
    <div style="font-size:12px; display:flex; justify-content:space-between;">
      <span>Ticket : #${op.id.slice(-6)}</span>
      <span>${op.date} ${op.time || ''}</span>
    </div>
    <div style="font-size:12px; margin-top:2px;">
      <span>Vendeur : ${escapeHtml(op.user || 'Ange Noël')}</span>
    </div>
    ${op.customerName ? `<div style="font-size:12px;">Client : ${escapeHtml(op.customerName)} ${op.customerPhone ? '(' + escapeHtml(op.customerPhone) + ')' : ''}</div>` : ''}
    <hr style="border:0; border-top:1px dashed var(--border); margin:10px 0;">
    <table style="width:100%; font-size:12px;">
      <thead>
        <tr>
          <th>Article</th>
          <th style="text-align:center;">Qté</th>
          <th style="text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    <hr style="border:0; border-top:1px dashed var(--border); margin:10px 0;">
    ${op.discount > 0 ? `
      <div style="display:flex; justify-content:space-between; font-size:12px; color:var(--text-muted);">
        <span>Sous-total :</span>
        <span>${money(op.subtotal || op.amount)}</span>
      </div>
      <div style="display:flex; justify-content:space-between; font-size:12px; color:var(--accent);">
        <span>Remise :</span>
        <span>−${money(op.discount)}</span>
      </div>
    ` : ''}
    <div style="display:flex; justify-content:space-between; font-size:16px; font-weight:800; color:var(--primary); margin:8px 0;">
      <span>TOTAL :</span>
      <span>${money(op.amount)}</span>
    </div>
    <div style="font-size:12px; text-align:right; font-weight:600;">
      Règlement : ${escapeHtml(op.payment)} ${op.paymentStatus === 'credit' ? '(À CRÉDIT)' : ''}
    </div>
    <div style="text-align:center; margin-top:16px; font-size:11.5px; color:var(--text-muted); font-style:italic;">
      ${escapeHtml(shop.receiptFooter || "Merci pour votre gourmandise !")}
    </div>
  `;

  // Préparer bouton WhatsApp
  el('btnWhatsAppShare').onclick = () => shareTicketWhatsApp(op);
}

function shareTicketWhatsApp(op) {
  const shop = data.shop || DEFAULT_SHOP_INFO;
  const items = op.items || [{ name: op.detail || op.category, qty: 1, price: op.amount }];
  
  let msg = `🍨 *${shop.name.toUpperCase()}*\n`;
  msg += `📍 ${shop.address} | 📞 ${shop.phone}\n`;
  msg += `--------------------------------\n`;
  msg += `🧾 *REÇU DE CAISSE #${op.id.slice(-6)}*\n`;
  msg += `📅 Date : ${op.date} ${op.time || ''}\n`;
  if (op.customerName) msg += `👤 Client : ${op.customerName}\n`;
  msg += `--------------------------------\n`;
  items.forEach(it => {
    msg += `• ${it.qty}x ${it.name} = ${money(it.price * it.qty)}\n`;
  });
  if (op.discount > 0) msg += `🎁 Remise : -${money(op.discount)}\n`;
  msg += `--------------------------------\n`;
  msg += `💰 *TOTAL PAYÉ : ${money(op.amount)}*\n`;
  msg += `💳 Mode : ${op.payment}\n`;
  msg += `--------------------------------\n`;
  msg += `_Merci pour votre gourmandise et à très bientôt !_`;

  let phone = (op.customerPhone || '').replace(/[^0-9]/g, '');
  if (phone.length === 9) phone = '237' + phone;

  const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

function printReceiptDirect() {
  window.print();
}

/* =========================================================================
   DÉPENSES
   ========================================================================= */

async function saveExpense() {
  if (!authService.hasPermission('expenses_manage')) {
    alert("Accès refusé : Vous n'avez pas la permission de saisir une dépense.");
    return;
  }

  const date = val('expDate') || today();
  const category = val('expCategory');
  const amount = Number(val('expAmount'));
  const source = val('expSource');
  const note = val('expNote').trim();

  if (amount <= 0) {
    alert('Veuillez saisir un montant supérieur à 0.');
    return;
  }

  const op = {
    id: 'exp_' + Date.now(),
    type: 'expense',
    date: date,
    time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    amount: amount,
    category: category,
    payment: source,
    note: note,
    user: authService.getCurrentUser()?.name || 'Opérateur'
  };

  await dbService.saveOperation(op);
  resetExpenseForm();
  showToast(`Dépense de ${money(amount)} enregistrée !`, 'success');
}

function resetExpenseForm() {
  if (el('expDate')) el('expDate').value = today();
  if (el('expAmount')) el('expAmount').value = '';
  if (el('expNote')) el('expNote').value = '';
}

function renderRecentExpensesTable() {
  const tbody = el('recentExpensesTableRows');
  if (!tbody) return;
  const expenses = data.ops.filter(o => o.type === 'expense' && !o.deleted).slice(-8).reverse();
  if (!expenses.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--text-muted);">Aucune dépense enregistrée.</td></tr>';
    return;
  }
  tbody.innerHTML = expenses.map(e => `
    <tr>
      <td>${e.date}</td>
      <td><span class="badge badge-exp">${escapeHtml(e.category)}</span></td>
      <td><b style="color:var(--danger);">${money(e.amount)}</b></td>
      <td>${escapeHtml(e.payment)}</td>
      <td>${escapeHtml(e.note || '—')}</td>
    </tr>
  `).join('');
}

/* =========================================================================
   CAISSE & CLÔTURE (Z)
   ========================================================================= */

function getCashBalances() {
  const activeOps = data.ops.filter(o => !o.deleted);
  let cashIn = 0, cashOut = 0;
  let momoIn = 0, momoOut = 0;
  let bankIn = 0, bankOut = 0;

  activeOps.forEach(o => {
    const amt = Number(o.amount) || 0;
    if (o.type === 'revenue' && o.paymentStatus !== 'credit') {
      if (o.payment === 'Espèces') cashIn += amt;
      else if (o.payment === 'Orange Money' || o.payment === 'MTN MoMo') momoIn += amt;
      else if (o.payment === 'Virement') bankIn += amt;
    } else if (o.type === 'expense') {
      if (o.payment === 'Espèces') cashOut += amt;
      else if (o.payment === 'Mobile Money') momoOut += amt;
    }
  });

  const initCash = Number(data.openingCash) || 0;
  const initMomo = Number(data.openingMomo) || 0;

  return {
    cash: { initial: initCash, in: cashIn, out: cashOut, balance: initCash + cashIn - cashOut },
    momo: { initial: initMomo, in: momoIn, out: momoOut, balance: initMomo + momoIn - momoOut },
    bank: { initial: 0, in: bankIn, out: bankOut, balance: bankIn - bankOut }
  };
}

function calculateClosingPreview() {
  const t = today();
  const todayOps = data.ops.filter(o => o.date === t && !o.deleted);
  const rev = todayOps.filter(o => o.type === 'revenue' && o.paymentStatus !== 'credit').reduce((s, o) => s + Number(o.amount), 0);
  const exp = todayOps.filter(o => o.type === 'expense').reduce((s, o) => s + Number(o.amount), 0);
  const bal = getCashBalances();

  if (el('closeRevDay')) el('closeRevDay').textContent = money(rev);
  if (el('closeExpDay')) el('closeExpDay').textContent = money(exp);
  if (el('closeNetDay')) el('closeNetDay').textContent = money(rev - exp);
  if (el('closeCashTheoretical')) el('closeCashTheoretical').textContent = money(bal.cash.balance);
  if (el('closeMomoTheoretical')) el('closeMomoTheoretical').textContent = money(bal.momo.balance);
}

function submitCashClosing() {
  requestPermissionOrPin('cash_closure', 'Clôture de Caisse (Z)', async () => {
    const t = today();
    const bal = getCashBalances();
    const physicalCash = Number(val('closePhysicalCash')) || bal.cash.balance;
    const diff = physicalCash - bal.cash.balance;

    const closure = {
      id: 'close_' + Date.now(),
      date: t,
      time: new Date().toLocaleTimeString('fr-FR'),
      theoriqueCash: bal.cash.balance,
      reelCash: physicalCash,
      ecart: diff,
      momoBalance: bal.momo.balance,
      user: authService.getCurrentUser()?.name || 'Gérant'
    };

    await dbService.saveClosure(closure);
    createSnapshot('Clôture Journalière (Z)');
    showToast('Clôture de caisse enregistrée avec succès !', 'success');
    renderClosuresHistory();
  });
}

function renderClosuresHistory() {
  const tbody = el('closuresTableRows');
  if (!tbody) return;
  const list = data.closures.slice(-8).reverse();
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:15px; color:var(--text-muted);">Aucune clôture enregistrée.</td></tr>';
    return;
  }
  tbody.innerHTML = list.map(c => `
    <tr>
      <td>${c.date} ${c.time || ''}</td>
      <td><b>${money(c.theoriqueCash)}</b></td>
      <td><b>${money(c.reelCash)}</b></td>
      <td><span class="badge ${c.ecart >= 0 ? 'badge-rev' : 'badge-exp'}">${c.ecart >= 0 ? '+' : ''}${money(c.ecart)}</span></td>
      <td>${money(c.momoBalance)}</td>
      <td>${escapeHtml(c.user || '—')}</td>
    </tr>
  `).join('');
}

/* =========================================================================
   HISTORIQUE, VENTES À CRÉDIT & RAPPORTS
   ========================================================================= */

function renderCredits() {
  const tbody = el('creditsTableRows');
  if (!tbody) return;
  const credits = data.ops.filter(o => o.type === 'revenue' && o.paymentStatus === 'credit' && !o.deleted);
  
  if (el('badgeCredits')) {
    el('badgeCredits').textContent = String(credits.length);
    el('badgeCredits').style.display = credits.length ? 'inline-block' : 'none';
  }

  if (!credits.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:25px; color:var(--text-muted);">Aucune vente à crédit en attente. Félicitations !</td></tr>';
    return;
  }

  tbody.innerHTML = credits.map(c => `
    <tr>
      <td>${c.date}</td>
      <td><b>${escapeHtml(c.customerName || 'Client')}</b> ${c.customerPhone ? `<br><small style="color:var(--text-muted);">${escapeHtml(c.customerPhone)}</small>` : ''}</td>
      <td><b style="color:var(--accent);">${money(c.amount)}</b></td>
      <td><span class="badge badge-exp">⏳ Non réglé</span></td>
      <td>${escapeHtml(c.detail || c.category)}</td>
      <td>
        <button class="btn btn-primary btn-sm" onclick="window.openSettleCreditModal('${c.id}')">💵 Encaisser</button>
      </td>
    </tr>
  `).join('');
}

function openSettleCreditModal(opId) {
  const op = data.ops.find(o => o.id === opId);
  if (!op) return;
  el('settleCreditOpId').value = op.id;
  el('settleCreditCustomer').textContent = `${op.customerName || 'Client'} (${money(op.amount)})`;
  openModal('modalSettleCredit');
}

async function applySettleCredit() {
  const id = val('settleCreditOpId');
  const payment = val('settleCreditPayment');
  const op = data.ops.find(o => o.id === id);
  if (!op) return;

  op.payment = payment;
  op.paymentStatus = 'paid';
  op.settledDate = today();

  await dbService.updateOperation(op);
  closeModal('modalSettleCredit');
  renderCredits();
  showToast('Crédit encaissé avec succès !', 'success');
}

function renderHistory() {
  const tbody = el('historyTableRows');
  if (!tbody) return;
  const ops = data.ops.filter(o => !o.deleted).slice(-40).reverse();
  if (!ops.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-muted);">Aucune opération dans l\'historique.</td></tr>';
    return;
  }
  tbody.innerHTML = ops.map(o => `
    <tr>
      <td>${o.date} ${o.time || ''}</td>
      <td><span class="badge ${o.type === 'revenue' ? 'badge-rev' : 'badge-exp'}">${o.type === 'revenue' ? 'Vente' : 'Dépense'}</span></td>
      <td><b>${escapeHtml(o.detail || o.category)}</b></td>
      <td><b style="color:${o.type === 'revenue' ? 'var(--primary)' : 'var(--danger)'};">${money(o.amount)}</b></td>
      <td>${escapeHtml(o.payment)}</td>
      <td>${escapeHtml(o.user || '—')}</td>
      <td style="text-align:right;">
        <div style="display:inline-flex; gap:4px;">
          ${o.type === 'revenue' ? `<button class="btn btn-secondary btn-sm" title="Reçu" onclick="window.reprintOp('${o.id}')">🧾</button>` : ''}
          <button class="btn btn-secondary btn-sm" title="Modifier" onclick="window.openEditOpModal('${o.id}')">✏️</button>
          <button class="btn btn-danger btn-sm" title="Archiver" onclick="window.archiveOp('${o.id}')">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function reprintOp(opId) {
  const op = data.ops.find(o => o.id === opId);
  if (!op) return;
  generateReceiptPreview(op);
  openModal('modalReceipt');
}

function openEditOpModal(opId) {
  requestPermissionOrPin('history_edit', 'Modifier une opération', () => {
    const op = data.ops.find(o => o.id === opId);
    if (!op) return;
    el('editOpId').value = op.id;
    el('editOpDate').value = op.date;
    el('editOpPayment').value = op.payment;
    el('editOpCat').value = op.category;
    el('editOpAmount').value = op.amount;
    el('editOpNote').value = op.note || '';
    openModal('modalEditOp');
  });
}

async function applyEditOp() {
  const id = val('editOpId');
  const op = data.ops.find(o => o.id === id);
  if (!op) return;

  op.date = val('editOpDate');
  op.payment = val('editOpPayment');
  op.category = val('editOpCat');
  op.amount = Number(val('editOpAmount')) || op.amount;
  op.note = val('editOpNote');

  await dbService.updateOperation(op);
  closeModal('modalEditOp');
  renderHistory();
  showToast('Opération modifiée !', 'success');
}

async function archiveOp(opId) {
  requestPermissionOrPin('history_edit', 'Supprimer une opération', async () => {
    const op = data.ops.find(o => o.id === opId);
    if (!op) return;
    if (!confirm(`Supprimer définitivement cette opération de ${money(op.amount)} ?`)) return;
    op.deleted = true;
    await dbService.updateOperation(op);
    renderHistory();
    showToast('Opération supprimée', 'info');
  });
}

/* =========================================================================
   DASHBOARD CHARTS & RECENT SALES
   ========================================================================= */

function renderWeeklyChart() {
  const container = el('weeklyChart');
  if (!container) return;

  const days = [];
  const t = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(t);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }

  const totals = days.map(d => {
    return data.ops
      .filter(o => o.date === d && o.type === 'revenue' && o.paymentStatus !== 'credit' && !o.deleted)
      .reduce((s, o) => s + Number(o.amount), 0);
  });

  const max = Math.max(...totals, 10000);
  container.innerHTML = days.map((d, idx) => {
    const amt = totals[idx];
    const pct = Math.round((amt / max) * 100);
    const dayLabel = new Date(d).toLocaleDateString('fr-FR', { weekday: 'short' });
    return `
      <div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:6px; height:100%;">
        <div style="font-size:10px; color:var(--text-muted); font-weight:700;">${amt > 0 ? (amt >= 1000 ? Math.round(amt/1000) + 'k' : amt) : ''}</div>
        <div style="flex:1; width:100%; display:flex; align-items:flex-end; justify-content:center;">
          <div style="width:70%; max-width:32px; background:linear-gradient(to top, var(--primary), var(--accent)); border-radius:6px 6px 0 0; height:${Math.max(pct, 6)}%;"></div>
        </div>
        <div style="font-size:11px; font-weight:600; text-transform:capitalize;">${dayLabel}</div>
      </div>
    `;
  }).join('');
}

function renderCategoryChart() {
  const container = el('categoryDonutChart');
  if (!container) return;

  const t = today();
  const todayRevOps = data.ops.filter(o => o.date === t && o.type === 'revenue' && !o.deleted);
  const catTotals = {};
  todayRevOps.forEach(o => catTotals[o.category] = (catTotals[o.category] || 0) + Number(o.amount));

  const entries = Object.entries(catTotals);
  if (!entries.length) {
    container.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted); font-size:13px;">Aucune vente aujourd'hui pour générer la répartition.</div>`;
    return;
  }

  const total = entries.reduce((s, e) => s + e[1], 0);
  container.innerHTML = entries.map(([cat, amt]) => {
    const pct = Math.round((amt / total) * 100);
    return `
      <div style="margin-bottom:8px;">
        <div style="display:flex; justify-content:space-between; font-size:12.5px; margin-bottom:3px;">
          <span><b>${escapeHtml(cat)}</b></span>
          <span>${money(amt)} (${pct}%)</span>
        </div>
        <div style="height:7px; background:#f0e1d8; border-radius:10px; overflow:hidden;">
          <div style="height:100%; width:${pct}%; background:var(--accent);"></div>
        </div>
      </div>
    `;
  }).join('');
}

function renderRecentOpsTable() {
  const tbody = el('recentOpsRows');
  if (!tbody) return;
  const list = data.ops.filter(o => !o.deleted).slice(-6).reverse();
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:15px; color:var(--text-muted);">Aucune opération aujourd\'hui.</td></tr>';
    return;
  }
  tbody.innerHTML = list.map(o => `
    <tr>
      <td>${o.time || o.date}</td>
      <td><span class="badge ${o.type === 'revenue' ? 'badge-rev' : 'badge-exp'}">${o.type === 'revenue' ? 'Vente' : 'Dépense'}</span></td>
      <td>${escapeHtml(o.detail || o.category)}</td>
      <td><b style="color:${o.type === 'revenue' ? 'var(--primary)' : 'var(--danger)'};">${money(o.amount)}</b></td>
      <td>${escapeHtml(o.payment)}</td>
      <td>${escapeHtml(o.user || '—')}</td>
    </tr>
  `).join('');
}

/* =========================================================================
   UI REFRESH & ROUTING
   ========================================================================= */

function refreshUI() {
  data = dbService.getData();
  const activeOps = data.ops.filter(o => !o.deleted);
  const t = today();
  const todayOps = activeOps.filter(o => o.date === t);

  // KPIs
  const todayRevOps = todayOps.filter(o => o.type === 'revenue' && o.paymentStatus !== 'credit');
  const todayExpOps = todayOps.filter(o => o.type === 'expense');
  const revToday = todayRevOps.reduce((s, o) => s + Number(o.amount), 0);
  const expToday = todayExpOps.reduce((s, o) => s + Number(o.amount), 0);
  const profitToday = revToday - expToday;

  if (el('kpiRev')) el('kpiRev').textContent = money(revToday);
  if (el('kpiRevCount')) el('kpiRevCount').textContent = `${todayRevOps.length} vente${todayRevOps.length > 1 ? 's' : ''}`;
  if (el('kpiExp')) el('kpiExp').textContent = money(expToday);
  if (el('kpiExpCount')) el('kpiExpCount').textContent = `${todayExpOps.length} dépense${todayExpOps.length > 1 ? 's' : ''}`;
  if (el('kpiProfit')) {
    el('kpiProfit').textContent = money(profitToday);
    el('kpiProfit').style.color = profitToday >= 0 ? 'white' : '#fca5a5';
  }

  // Soldes
  const balances = getCashBalances();
  if (el('kpiCash')) el('kpiCash').textContent = money(balances.cash.balance);
  if (el('kpiMomo')) el('kpiMomo').textContent = money(balances.momo.balance);
  if (el('cashDrawerBalance')) el('cashDrawerBalance').textContent = money(balances.cash.balance);
  if (el('cashMomoBalance')) el('cashMomoBalance').textContent = money(balances.momo.balance);

  // Alerte stock faible
  const lowStock = data.products.filter(p => p.active && p.trackStock && (p.stock !== undefined ? p.stock : 25) <= 5);
  const banner = el('lowStockAlertBanner');
  if (banner) {
    if (lowStock.length > 0) {
      banner.style.display = 'block';
      el('lowStockItemsList').innerHTML = lowStock.map(p => `<b>${escapeHtml(p.name)}</b> (reste ${p.stock !== undefined ? p.stock : 0})`).join(', ');
    } else {
      banner.style.display = 'none';
    }
  }

  // Dépenses dropdown
  if (el('expCategory')) el('expCategory').innerHTML = data.expenseCats.map(c => `<option>${escapeHtml(c)}</option>`).join('');

  // Rendu des vues
  renderPosCategoryPills();
  renderPosCatalog();
  renderWeeklyChart();
  renderCategoryChart();
  renderRecentOpsTable();
  renderRecentExpensesTable();
  renderCredits();
  renderSnapshotsTable();
  updateAuthUI();
}

function navigateTo(pageId) {
  document.querySelectorAll('.view-section').forEach(sec => {
    sec.classList.toggle('active', sec.id === 'sec-' + pageId);
  });

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === pageId);
  });

  document.querySelectorAll('.bottom-nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === pageId);
  });

  closeMobileDrawer();

  const titles = {
    dashboard: ['Tableau de Bord', 'Gestion financière et commerciale au quotidien'],
    pos: ['Caisse Express & Ventes', 'Point de vente rapide et impression de ticket'],
    expenses: ['Enregistrer une Dépense', 'Suivi des sorties de caisse et achats'],
    cash: ['Caisse & Clôture', 'Contrôle des espèces, Mobile Money et Z journalier'],
    credits: ['Ventes à Crédit', 'Suivi des créances et recouvrements clients'],
    history: ['Historique des Opérations', 'Consultation, modification et journal d\'audit'],
    reports: ['Rapports & Statistiques', 'Bilan d\'activité, exports Excel et impressions'],
    products: ['Catalogue des Produits', 'Configuration des gourmandises et prix'],
    users: ['Gestion des Utilisateurs', 'Gestion des comptes, rôles et permissions d\'accès'],
    settings: ['Paramètres de l\'Établissement', 'Coordonnées de boutique, sauvegardes et seed']
  };

  const [heading, sub] = titles[pageId] || ['Ange Noël Manager', ''];
  if (el('pageHeading')) el('pageHeading').textContent = heading;
  if (el('pageSubHeading')) el('pageSubHeading').textContent = sub;
  // Mettre à jour le titre dans le header mobile
  if (el('mobileBrandTitle')) el('mobileBrandTitle').textContent = heading.split(' ').slice(0, 2).join(' ');

  if (pageId === 'history') renderHistory();
  if (pageId === 'reports') renderReport();
  if (pageId === 'credits') renderCredits();
  if (pageId === 'products') window.switchCatalogTab(currentCatalogTab);
  if (pageId === 'cash') calculateClosingPreview();
  if (pageId === 'users') { renderUsersTable(); renderRolesGuide(); }
  if (pageId === 'pos') switchPosMobileView('catalog');

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function switchPosMobileView(view) {
  currentPosMobileView = view;
  const tabCat = el('tabPosCatalogBtn');
  const tabCart = el('tabPosCartBtn');
  const posContainer = document.querySelector('.pos-container');
  const floatBar = el('posFloatingCartBar');

  if (!tabCat || !tabCart || !posContainer) return;

  if (view === 'cart') {
    tabCart.classList.add('active');
    tabCat.classList.remove('active');
    posContainer.classList.add('mobile-show-cart');
    if (floatBar) floatBar.style.display = 'none';
  } else {
    tabCat.classList.add('active');
    tabCart.classList.remove('active');
    posContainer.classList.remove('mobile-show-cart');
    if (floatBar && cart.length > 0) floatBar.style.display = 'flex';
  }
}

/* =========================================================================
   CATALOGUE PRODUITS & CATÉGORIES (TABLAYOUT)
   ========================================================================= */

function switchCatalogTab(tab) {
  currentCatalogTab = tab;
  const btnProd = el('tabBtnProducts');
  const btnCat = el('tabBtnCategories');
  const paneProd = el('paneProducts');
  const paneCat = el('paneCategories');

  if (!btnProd || !btnCat || !paneProd || !paneCat) return;

  if (tab === 'products') {
    btnProd.classList.add('active');
    btnCat.classList.remove('active');
    paneProd.style.display = 'block';
    paneCat.style.display = 'none';
    renderProductsTable();
  } else {
    btnCat.classList.add('active');
    btnProd.classList.remove('active');
    paneCat.style.display = 'block';
    paneProd.style.display = 'none';
    renderCategoriesView();
  }
}

function renderProductsTable() {
  const tbody = el('productsTableRows');
  if (!tbody) return;

  const catFilter = el('catalogProductCatFilter');
  if (catFilter) {
    const curVal = catFilter.value;
    catFilter.innerHTML = '<option value="all">Toutes catégories</option>' + 
      data.categories.map(c => `<option value="${escapeHtml(c.name)}" ${c.name === curVal ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('');
  }

  if (el('countProductsBadge')) el('countProductsBadge').textContent = data.products.length;

  const q = (val('catalogProductSearch') || '').toLowerCase().trim();
  const selCat = val('catalogProductCatFilter') || 'all';
  const selStock = val('catalogProductStockFilter') || 'all';

  const filtered = data.products.filter(p => {
    const matchesQuery = !q || p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q)) || p.category.toLowerCase().includes(q);
    const matchesCat = selCat === 'all' || p.category === selCat;
    const stockQty = p.stock !== undefined ? p.stock : 25;
    let matchesStock = true;
    if (selStock === 'in_stock') matchesStock = !p.trackStock || stockQty > 5;
    else if (selStock === 'low_stock') matchesStock = p.trackStock && stockQty > 0 && stockQty <= 5;
    else if (selStock === 'out_stock') matchesStock = p.trackStock && stockQty <= 0;
    return matchesQuery && matchesCat && matchesStock;
  });

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-muted);">Aucun produit ne correspond aux filtres.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    const stockQty = p.stock !== undefined ? p.stock : 25;
    const stockClass = !p.trackStock ? 'stock-ok' : (stockQty <= 0 ? 'stock-empty' : (stockQty <= 5 ? 'stock-low' : 'stock-ok'));
    const stockLabel = !p.trackStock ? 'Non suivi' : (stockQty <= 0 ? '❌ Épuisé (0)' : (stockQty <= 5 ? `⚠️ Faible (${stockQty})` : `📦 ${stockQty} en stock`));
    const imgThumb = p.imageUrl ? `<img src="${escapeHtml(p.imageUrl)}" alt="${escapeHtml(p.name)}" onerror="this.onerror=null; this.parentElement.innerHTML='🍨';">` : '🍨';

    return `
      <tr>
        <td><div class="img-thumb">${imgThumb}</div></td>
        <td>
          <div style="font-weight:700; color:var(--primary); font-size:14px;">${escapeHtml(p.name)}</div>
          ${p.description ? `<div style="color:var(--text-muted); font-size:12px; margin-top:2px; max-width:280px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(p.description)}</div>` : ''}
        </td>
        <td><span class="badge badge-cash">${escapeHtml(p.category)}</span></td>
        <td><b style="color:var(--accent); font-size:14px;">${money(p.price)}</b></td>
        <td>
          <span class="stock-badge ${stockClass}">${stockLabel}</span>
          ${p.trackStock ? `<button class="btn btn-secondary btn-sm" style="margin-left:6px; padding:2px 7px; font-size:11px;" onclick="window.quickRestock('${p.id}', 10)">+10</button>` : ''}
        </td>
        <td><span class="badge ${p.active ? 'badge-rev' : 'badge-exp'}">${p.active ? '✓ Actif' : 'Désactivé'}</span></td>
        <td style="text-align:right;">
          <div style="display:inline-flex; gap:4px;">
            <button class="btn btn-secondary btn-sm" title="Fiche" onclick="window.openViewProductModal('${p.id}')">👁️</button>
            <button class="btn btn-secondary btn-sm" title="Modifier" onclick="window.openEditProductModal('${p.id}')">✏️</button>
            <button class="btn btn-secondary btn-sm" title="${p.active ? 'Désactiver' : 'Activer'}" onclick="window.toggleProductActive('${p.id}')">${p.active ? '🚫' : '✓'}</button>
            <button class="btn btn-danger btn-sm" title="Supprimer" onclick="window.deleteProduct('${p.id}')">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function quickRestock(id, qty = 10) {
  const p = data.products.find(x => x.id === id);
  if (!p) return;
  p.stock = (Number(p.stock) || 0) + qty;
  dbService.saveProduct(p);
  showToast(`+${qty} à "${p.name}" (Stock: ${p.stock})`, 'success');
}

function openNewProductModal() {
  if (!authService.hasPermission('catalog_manage')) {
    alert("Accès refusé : Droits insuffisants pour gérer le catalogue.");
    return;
  }
  el('productModalTitle').textContent = 'Nouveau Produit';
  el('prodEditId').value = '';
  el('prodName').value = '';
  el('prodPrice').value = '';
  el('prodStock').value = '30';
  el('prodTrackStock').checked = true;
  el('prodImageUrl').value = '';
  el('prodDesc').value = '';
  previewImgBox('', 'prodImgPreview');
  el('prodCategory').innerHTML = data.categories.map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('');
  openModal('modalProductForm');
}

function openEditProductModal(id) {
  if (!authService.hasPermission('catalog_manage')) {
    alert("Accès refusé : Droits insuffisants pour modifier ce produit.");
    return;
  }
  const p = data.products.find(x => x.id === id);
  if (!p) return;
  el('productModalTitle').textContent = 'Modifier le Produit';
  el('prodEditId').value = p.id;
  el('prodName').value = p.name;
  el('prodPrice').value = p.price;
  el('prodStock').value = p.stock !== undefined ? p.stock : 25;
  el('prodTrackStock').checked = p.trackStock !== false;
  el('prodImageUrl').value = p.imageUrl || '';
  el('prodDesc').value = p.description || '';
  previewImgBox(p.imageUrl || '', 'prodImgPreview');
  el('prodCategory').innerHTML = data.categories.map(c => `<option value="${escapeHtml(c.name)}" ${c.name === p.category ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('');
  openModal('modalProductForm');
}

function openViewProductModal(id) {
  const p = data.products.find(x => x.id === id);
  if (!p) return;
  const stockQty = p.stock !== undefined ? p.stock : 25;
  const stockClass = !p.trackStock ? 'stock-ok' : (stockQty <= 0 ? 'stock-empty' : (stockQty <= 5 ? 'stock-low' : 'stock-ok'));
  const stockLabel = !p.trackStock ? 'Non suivi' : (stockQty <= 0 ? '❌ Épuisé (0)' : (stockQty <= 5 ? `⚠️ Faible (${stockQty})` : `📦 ${stockQty} en stock`));
  
  el('viewProductBody').innerHTML = `
    <div class="view-detail-card">
      ${p.imageUrl ? `<div style="width:100%; height:180px; border-radius:8px; overflow:hidden; margin-bottom:14px; background:#f5eee8;"><img src="${escapeHtml(p.imageUrl)}" style="width:100%; height:100%; object-fit:cover;" onerror="this.parentElement.style.display='none'"></div>` : ''}
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
        <div>
          <span class="badge badge-cash" style="font-size:12px; margin-bottom:6px; display:inline-block;">${escapeHtml(p.category)}</span>
          <h2 style="font-size:18px; color:var(--primary); font-weight:800; margin:0;">${escapeHtml(p.name)}</h2>
        </div>
        <div style="font-size:18px; font-weight:800; color:var(--accent);">${money(p.price)}</div>
      </div>
      ${p.description ? `<p style="font-size:13.5px; color:var(--text); background:#fff; padding:10px 12px; border-radius:6px; border:1px solid var(--border); margin:12px 0;">${escapeHtml(p.description)}</p>` : ''}
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:12px; font-size:13px;">
        <div style="background:white; padding:8px 10px; border-radius:6px; border:1px solid var(--border);">
          <span style="color:var(--text-muted); display:block; font-size:11px;">Stock</span>
          <span class="stock-badge ${stockClass}">${stockLabel}</span>
        </div>
        <div style="background:white; padding:8px 10px; border-radius:6px; border:1px solid var(--border);">
          <span style="color:var(--text-muted); display:block; font-size:11px;">Statut</span>
          <span class="badge ${p.active ? 'badge-rev' : 'badge-exp'}">${p.active ? '✓ Actif' : 'Désactivé'}</span>
        </div>
      </div>
    </div>
  `;
  el('viewProductEditBtn').onclick = () => { closeModal('modalViewProduct'); openEditProductModal(p.id); };
  openModal('modalViewProduct');
}

async function saveProductForm() {
  const id = val('prodEditId');
  const name = val('prodName').trim();
  const cat = val('prodCategory');
  const price = Number(val('prodPrice'));
  const stock = Math.max(0, Number(val('prodStock')) || 0);
  const trackStock = el('prodTrackStock').checked;
  const imageUrl = val('prodImageUrl').trim();
  const description = val('prodDesc').trim();

  if (!name || price <= 0) {
    alert('Veuillez saisir un nom et un prix valide (> 0 F CFA).');
    return;
  }

  const p = {
    id: id || ('prod_' + Date.now()),
    name, category: cat, price, stock, trackStock, imageUrl, description, active: true
  };

  await dbService.saveProduct(p);
  closeModal('modalProductForm');
  renderProductsTable();
  showToast(`Produit "${name}" enregistré !`, 'success');
}

async function deleteProduct(id) {
  if (!authService.hasPermission('catalog_manage')) {
    alert("Accès refusé : Droits insuffisants.");
    return;
  }
  const p = data.products.find(x => x.id === id);
  if (!p) return;
  if (!confirm(`Supprimer définitivement le produit "${p.name}" ?`)) return;

  await dbService.deleteProduct(id);
  renderProductsTable();
  showToast(`Produit "${p.name}" supprimé !`, 'info');
}

function toggleProductActive(id) {
  const p = data.products.find(x => x.id === id);
  if (!p) return;
  p.active = !p.active;
  dbService.saveProduct(p);
  renderProductsTable();
}

function renderCategoriesView() {
  const tbody = el('categoriesTableRows');
  if (!tbody) return;
  if (el('countCategoriesBadge')) el('countCategoriesBadge').textContent = data.categories.length;

  const q = (val('catalogCategorySearch') || '').toLowerCase().trim();
  const filtered = data.categories.filter(c => !q || c.name.toLowerCase().includes(q) || (c.description && c.description.toLowerCase().includes(q)));

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--text-muted);">Aucune catégorie trouvée.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(c => {
    const count = data.products.filter(p => p.category === c.name).length;
    const imgThumb = c.imageUrl ? `<img src="${escapeHtml(c.imageUrl)}" alt="${escapeHtml(c.name)}" onerror="this.onerror=null; this.parentElement.innerHTML='🏷️';">` : '🏷️';
    return `
      <tr>
        <td><div class="img-thumb">${imgThumb}</div></td>
        <td><b style="color:var(--primary); font-size:14px;">${escapeHtml(c.name)}</b></td>
        <td style="color:var(--text-muted); font-size:13px; max-width:280px;">${escapeHtml(c.description || '—')}</td>
        <td><span class="badge badge-cash" style="font-weight:700;">${count} produit${count > 1 ? 's' : ''}</span></td>
        <td style="text-align:right;">
          <div style="display:inline-flex; gap:4px;">
            <button class="btn btn-secondary btn-sm" title="Fiche" onclick="window.openViewCategoryModal('${c.id}')">👁️</button>
            <button class="btn btn-secondary btn-sm" title="Modifier" onclick="window.openEditCategoryModal('${c.id}')">✏️</button>
            <button class="btn btn-danger btn-sm" title="Supprimer" onclick="window.deleteCategory('${c.id}')">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openNewCategoryModal() {
  if (!authService.hasPermission('catalog_manage')) {
    alert("Accès refusé : Droits insuffisants.");
    return;
  }
  el('categoryModalTitle').textContent = 'Nouvelle Catégorie';
  el('catEditId').value = '';
  el('catName').value = '';
  el('catDescription').value = '';
  el('catImageUrl').value = '';
  previewImgBox('', 'catImgPreview');
  openModal('modalCategoryForm');
}

function openEditCategoryModal(id) {
  if (!authService.hasPermission('catalog_manage')) {
    alert("Accès refusé : Droits insuffisants.");
    return;
  }
  const c = data.categories.find(x => x.id === id);
  if (!c) return;
  el('categoryModalTitle').textContent = 'Modifier la Catégorie';
  el('catEditId').value = c.id;
  el('catName').value = c.name;
  el('catDescription').value = c.description || '';
  el('catImageUrl').value = c.imageUrl || '';
  previewImgBox(c.imageUrl || '', 'catImgPreview');
  openModal('modalCategoryForm');
}

function openViewCategoryModal(id) {
  const c = data.categories.find(x => x.id === id);
  if (!c) return;
  const prods = data.products.filter(p => p.category === c.name);
  el('viewCategoryBody').innerHTML = `
    <div class="view-detail-card">
      ${c.imageUrl ? `<div style="width:100%; height:160px; border-radius:8px; overflow:hidden; margin-bottom:14px; background:#f5eee8;"><img src="${escapeHtml(c.imageUrl)}" style="width:100%; height:100%; object-fit:cover;" onerror="this.parentElement.style.display='none'"></div>` : ''}
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <h2 style="font-size:18px; color:var(--primary); font-weight:800; margin:0;">🏷️ ${escapeHtml(c.name)}</h2>
        <span class="badge badge-cash" style="font-size:13px; font-weight:700;">${prods.length} produit${prods.length > 1 ? 's' : ''}</span>
      </div>
      ${c.description ? `<p style="font-size:13.5px; color:var(--text); background:white; padding:10px 12px; border-radius:6px; border:1px solid var(--border); margin:10px 0 16px 0;">${escapeHtml(c.description)}</p>` : ''}
      <h4 style="font-size:13px; text-transform:uppercase; color:var(--text-muted); margin-bottom:8px;">Produits dans cette catégorie :</h4>
      ${prods.length ? `
        <div style="max-height:220px; overflow-y:auto; border:1px solid var(--border); border-radius:6px; background:white;">
          ${prods.map(p => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; border-bottom:1px solid var(--border);">
              <div style="font-weight:600; font-size:13px;">${escapeHtml(p.name)}</div>
              <div style="font-weight:700; color:var(--accent); font-size:13px;">${money(p.price)}</div>
            </div>
          `).join('')}
        </div>
      ` : '<div style="color:var(--text-muted); font-size:13px; font-style:italic;">Aucun produit dans cette catégorie.</div>'}
    </div>
  `;
  el('viewCategoryEditBtn').onclick = () => { closeModal('modalViewCategory'); openEditCategoryModal(c.id); };
  openModal('modalViewCategory');
}

async function saveCategoryForm() {
  const id = val('catEditId');
  const name = val('catName').trim();
  const description = val('catDescription').trim();
  const imageUrl = val('catImageUrl').trim();

  if (!name) {
    alert('Veuillez saisir un nom pour la catégorie.');
    return;
  }

  const c = { id: id || ('cat_' + Date.now()), name, description, imageUrl };
  await dbService.saveCategory(c);
  closeModal('modalCategoryForm');
  renderCategoriesView();
  renderProductsTable();
  showToast(`Catégorie "${name}" enregistrée !`, 'success');
}

async function deleteCategory(id) {
  if (!authService.hasPermission('catalog_manage')) {
    alert("Accès refusé : Droits insuffisants.");
    return;
  }
  const c = data.categories.find(x => x.id === id);
  if (!c) return;
  if (!confirm(`Supprimer la catégorie "${c.name}" ?`)) return;

  await dbService.deleteCategory(id);
  renderCategoriesView();
  renderProductsTable();
  showToast(`Catégorie "${c.name}" supprimée !`, 'info');
}

function previewImgBox(url, boxId) {
  const box = el(boxId);
  if (!box) return;
  const clean = (url || '').trim();
  if (!clean) {
    box.innerHTML = `<span style="color:var(--text-muted); font-size:12px;">📷 Aucun aperçu d'image</span>`;
    return;
  }
  box.innerHTML = `<img src="${escapeHtml(clean)}" onerror="this.onerror=null; this.parentElement.innerHTML='<span style=\\'color:#ef4444; font-size:12px;\\'>⚠️ Image inaccessible</span>';">`;
}

/* =========================================================================
   REPORTS & STATS
   ========================================================================= */

function setReportPeriod(period) {
  const t = today();
  let from = t, to = t;
  if (period === 'yesterday') {
    const d = new Date(); d.setDate(d.getDate() - 1);
    from = to = d.toISOString().split('T')[0];
  } else if (period === 'week') {
    const d = new Date(); d.setDate(d.getDate() - 6);
    from = d.toISOString().split('T')[0];
  } else if (period === 'month') {
    const d = new Date(); d.setDate(1);
    from = d.toISOString().split('T')[0];
  }
  el('repFrom').value = from;
  el('repTo').value = to;
  renderReport();
}

function renderReport() {
  const from = val('repFrom') || today();
  const to = val('repTo') || today();
  const rangeOps = data.ops.filter(o => o.date >= from && o.date <= to && !o.deleted);

  const revOps = rangeOps.filter(o => o.type === 'revenue' && o.paymentStatus !== 'credit');
  const expOps = rangeOps.filter(o => o.type === 'expense');
  const totalRev = revOps.reduce((s, o) => s + Number(o.amount), 0);
  const totalExp = expOps.reduce((s, o) => s + Number(o.amount), 0);
  const profit = totalRev - totalExp;

  if (el('repTotalRev')) el('repTotalRev').textContent = money(totalRev);
  if (el('repTotalExp')) el('repTotalExp').textContent = money(totalExp);
  if (el('repNetProfit')) {
    el('repNetProfit').textContent = money(profit);
    el('repNetProfit').style.color = profit >= 0 ? 'var(--primary)' : 'var(--danger)';
  }
}

function exportExcelCSV() {
  const from = val('repFrom') || today();
  const to = val('repTo') || today();
  const rangeOps = data.ops.filter(o => o.date >= from && o.date <= to && !o.deleted);

  const headers = ['ID', 'Date', 'Heure', 'Type', 'Catégorie', 'Détails', 'Montant (F CFA)', 'Paiement', 'Client', 'Vendeur'];
  const rows = [
    headers,
    ...rangeOps.map(o => [
      o.id, o.date, o.time || '', o.type === 'revenue' ? 'Vente' : 'Dépense',
      o.category || '', o.detail || '', o.amount, o.payment || '',
      o.customerName || '', o.user || ''
    ])
  ];

  const csv = '\ufeff' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `Rapport_${from}_au_${to}.csv`);
  showToast('Fichier Excel CSV généré !', 'success');
}

function printFullReport() {
  window.print();
}

/* =========================================================================
   SETTINGS & SHOP
   ========================================================================= */

function saveShopInfo() {
  data.shop.name = val('shopName') || DEFAULT_SHOP_INFO.name;
  data.shop.subtitle = val('shopSubtitle') || DEFAULT_SHOP_INFO.subtitle;
  data.shop.phone = val('shopPhone') || DEFAULT_SHOP_INFO.phone;
  data.shop.address = val('shopAddress') || DEFAULT_SHOP_INFO.address;
  data.shop.receiptFooter = val('shopFooter') || DEFAULT_SHOP_INFO.receiptFooter;
  persist();
  showToast('Informations de la boutique enregistrées !', 'success');
}

function exportBackupJSON() {
  const json = JSON.stringify(data, null, 2);
  downloadBlob(new Blob([json], { type: 'application/json' }), `Sauvegarde_Ange_Noel_${today()}.json`);
  showToast('Sauvegarde JSON téléchargée !', 'success');
}

function importBackupJSON(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const parsed = JSON.parse(event.target.result);
      if (confirm("Remplacer les données actuelles par cette sauvegarde ?")) {
        data = parsed;
        dbService.data = data;
        persist();
        showToast('Données importées avec succès !', 'success');
      }
    } catch (err) {
      alert("Fichier de sauvegarde invalide.");
    }
  };
  reader.readAsText(file);
}

function confirmResetDatabase() {
  requestPermissionOrPin('settings_manage', 'Réinitialisation de la base', () => {
    if (confirm("⚠️ ATTENTION : Voulez-vous vraiment réinitialiser toutes les données ?")) {
      localStorage.removeItem('angeNoelManagerV1');
      location.reload();
    }
  });
}

function loadSampleDemoData() {
  if (confirm("Charger les données d'essai ?")) {
    location.reload();
  }
}

function installPWA() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => { deferredPrompt = null; });
  }
}

/* =========================================================================
   BINDING GLOBAL WINDOW FUNCTIONS FOR HTML ONCLICK HANDLERS
   ========================================================================= */

window.navigateTo = navigateTo;
window.openModal = openModal;
window.closeModal = closeModal;
window.openMobileDrawer = openMobileDrawer;
window.closeMobileDrawer = closeMobileDrawer;
window.toggleMobileDrawer = toggleMobileDrawer;
window.switchCatalogTab = switchCatalogTab;
window.switchPosMobileView = switchPosMobileView;
window.syncMobileOperator = (v) => { handleOperatorChange(v); };

// POS
window.setPosCatFilter = setPosCatFilter;
window.renderPosCatalog = renderPosCatalog;
window.addToCart = addToCart;
window.updateCartQty = updateCartQty;
window.clearCart = clearCart;
window.renderCart = renderCart;
window.openCustomItemModal = openCustomItemModal;
window.addCustomItemToCart = addCustomItemToCart;
window.checkoutSale = checkoutSale;
window.printReceiptDirect = printReceiptDirect;

// Dépenses & Caisse
window.saveExpense = saveExpense;
window.submitCashClosing = submitCashClosing;
window.openSettleCreditModal = openSettleCreditModal;
window.applySettleCredit = applySettleCredit;
window.reprintOp = reprintOp;
window.openEditOpModal = openEditOpModal;
window.applyEditOp = applyEditOp;
window.archiveOp = archiveOp;

// Catalogue
window.renderProductsTable = renderProductsTable;
window.quickRestock = quickRestock;
window.openNewProductModal = openNewProductModal;
window.openEditProductModal = openEditProductModal;
window.openViewProductModal = openViewProductModal;
window.saveProductForm = saveProductForm;
window.deleteProduct = deleteProduct;
window.toggleProductActive = toggleProductActive;
window.renderCategoriesView = renderCategoriesView;
window.openNewCategoryModal = openNewCategoryModal;
window.openEditCategoryModal = openEditCategoryModal;
window.openViewCategoryModal = openViewCategoryModal;
window.saveCategoryForm = saveCategoryForm;
window.deleteCategory = deleteCategory;
window.previewImgBox = previewImgBox;

// Utilisateurs & Sécurité
window.openNewUserModal = openNewUserModal;
window.openEditUserModal = openEditUserModal;
window.saveUserForm = saveUserForm;
window.toggleUserActive = toggleUserActive;
window.deleteUserRecord = deleteUserRecord;
window.triggerInAppSeed = triggerInAppSeed;
window.updatePermissionsCheckboxes = updatePermissionsCheckboxes;
window.openQuickPinModal = openQuickPinModal;
window.submitQuickPin = submitQuickPin;
window.openLoginModal = openLoginModal;
window.handleFirebaseLogin = handleFirebaseLogin;
window.handleLogout = handleLogout;
window.appendPinDigit = appendPinDigit;
window.clearPinInput = clearPinInput;
window.backspacePinDigit = backspacePinDigit;
window.verifyPinInput = verifyPinInput;
window.openChangePinModal = openChangePinModal;

// Snapshots & Rapports
window.createManualSnapshot = createManualSnapshot;
window.restoreSnapshot = restoreSnapshot;
window.deleteSnapshot = deleteSnapshot;
window.setReportPeriod = setReportPeriod;
window.renderReport = renderReport;
window.exportExcelCSV = exportExcelCSV;
window.printFullReport = printFullReport;
window.saveShopInfo = saveShopInfo;
window.exportBackupJSON = exportBackupJSON;
window.importBackupJSON = importBackupJSON;
window.confirmResetDatabase = confirmResetDatabase;
window.loadSampleDemoData = loadSampleDemoData;
window.installPWA = installPWA;
window.showToast = showToast;

/* =========================================================================
   INITIAL BOOTSTRAP
   ========================================================================= */

document.addEventListener('DOMContentLoaded', () => {
  // Navigation event listeners
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.page));
  });

  // Modal backdrop click
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('open');
    });
  });

  // Operator selector change
  if (el('operatorSelect')) {
    el('operatorSelect').addEventListener('change', (e) => handleOperatorChange(e.target.value));
  }
  if (el('operatorSelectMobile')) {
    el('operatorSelectMobile').addEventListener('change', (e) => handleOperatorChange(e.target.value));
  }

  // PWA install prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (el('btnInstallPwa')) el('btnInstallPwa').style.display = 'inline-flex';
  });

  // Initialisation Firestore Realtime Sync
  dbService.initRealtimeSync(() => refreshUI());

  // Initialisation AuthService
  authService.init(() => {
    updateAuthUI();
    refreshUI();
  });

  // Initial UI refresh
  refreshUI();
  updateAuthUI();
});
