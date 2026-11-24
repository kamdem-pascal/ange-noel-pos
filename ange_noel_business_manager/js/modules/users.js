/**
 * Module Gestion des Utilisateurs, Rôles et Permissions
 * Les Gourmandises de Ange Noël
 */
import { authService } from "../services/auth-service.js";
import { dbService } from "../services/db-service.js";
import { ROLES, PERMISSIONS } from "../data/initial-data.js";
import { showToast, escapeHtml, openModal, closeModal } from "./ui.js";

export function renderUsersTable() {
  const tbody = document.getElementById('usersTableRows');
  if (!tbody) return;

  const users = authService.getUsers();
  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:25px; color:var(--text-muted);">Aucun utilisateur enregistré.</td></tr>';
    return;
  }

  tbody.innerHTML = users.map(u => {
    const roleDef = ROLES[u.role] || ROLES.staff;
    const perms = Array.isArray(u.permissions) ? u.permissions : (roleDef.permissions || []);
    const permBadges = perms.map(pKey => {
      const p = PERMISSIONS[pKey.toUpperCase()] || { label: pKey };
      return `<span class="badge" style="background:#f3ece6; color:var(--primary); font-size:11px; margin:2px;">${p.label}</span>`;
    }).join('');

    return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            <div class="user-avatar-circle">${escapeHtml((u.name || 'U').charAt(0).toUpperCase())}</div>
            <div>
              <div style="font-weight:700; color:var(--primary); font-size:14px;">${escapeHtml(u.name)}</div>
              <div style="color:var(--text-muted); font-size:12px;">${escapeHtml(u.email || '—')}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="badge ${roleDef.badgeClass}" style="font-weight:700; font-size:12px;">
            ${escapeHtml(roleDef.name)}
          </span>
        </td>
        <td>
          <span class="badge badge-cash" style="font-family:monospace; letter-spacing:2px; font-size:12px;">
            ${escapeHtml(u.pin || '••••')}
          </span>
        </td>
        <td style="max-width:320px;">
          <div style="display:flex; flex-wrap:wrap; gap:3px;">
            ${permBadges}
          </div>
        </td>
        <td>
          <span class="badge ${u.active ? 'badge-rev' : 'badge-exp'}">
            ${u.active ? '✓ Actif' : 'Désactivé'}
          </span>
        </td>
        <td style="text-align:right;">
          <div style="display:inline-flex; gap:6px;">
            <button class="btn btn-secondary btn-sm" title="Modifier" onclick="window.openEditUserModal('${u.id}')">✏️ Modifier</button>
            <button class="btn btn-secondary btn-sm" title="${u.active ? 'Désactiver' : 'Activer'}" onclick="window.toggleUserActive('${u.id}')">
              ${u.active ? '🚫' : '✓'}
            </button>
            ${users.length > 1 ? `<button class="btn btn-danger btn-sm" title="Supprimer" onclick="window.deleteUserRecord('${u.id}')">🗑️</button>` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

export function renderRolesGuide() {
  const container = document.getElementById('rolesGuideContainer');
  if (!container) return;

  container.innerHTML = Object.values(ROLES).map(r => `
    <div class="card" style="margin-bottom:12px; border-left:4px solid var(--accent);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        <h4 style="margin:0; font-size:15px; color:var(--primary);">${escapeHtml(r.name)}</h4>
        <span class="badge ${r.badgeClass}">${r.permissions.length} permissions</span>
      </div>
      <p style="font-size:13px; color:var(--text-muted); margin-bottom:10px;">${escapeHtml(r.description)}</p>
      <div style="display:flex; flex-wrap:wrap; gap:4px;">
        ${r.permissions.map(pKey => {
          const p = PERMISSIONS[pKey.toUpperCase()] || { label: pKey };
          return `<span class="badge" style="background:#faf2eb; font-size:11px;">✓ ${escapeHtml(p.label)}</span>`;
        }).join('')}
      </div>
    </div>
  `).join('');
}

export function openNewUserModal() {
  if (!authService.hasPermission('users_manage')) {
    alert("Accès refusé : Vous n'avez pas la permission de gérer les utilisateurs.");
    return;
  }

  document.getElementById('userModalTitle').textContent = 'Nouvel Utilisateur';
  document.getElementById('userEditId').value = '';
  document.getElementById('userName').value = '';
  document.getElementById('userEmail').value = '';
  document.getElementById('userPin').value = '0000';
  document.getElementById('userPhone').value = '';
  document.getElementById('userRole').value = 'staff';
  updatePermissionsCheckboxes('staff');
  openModal('modalUserForm');
}

export function openEditUserModal(userId) {
  if (!authService.hasPermission('users_manage')) {
    alert("Accès refusé : Vous n'avez pas la permission de modifier les utilisateurs.");
    return;
  }

  const user = authService.getUsers().find(u => u.id === userId);
  if (!user) return;

  document.getElementById('userModalTitle').textContent = 'Modifier l’Utilisateur';
  document.getElementById('userEditId').value = user.id;
  document.getElementById('userName').value = user.name || '';
  document.getElementById('userEmail').value = user.email || '';
  document.getElementById('userPin').value = user.pin || '0000';
  document.getElementById('userPhone').value = user.phone || '';
  document.getElementById('userRole').value = user.role || 'staff';
  
  // Remplir checkboxes
  renderPermissionsCheckboxes(user.permissions || ROLES[user.role]?.permissions || []);
  openModal('modalUserForm');
}

export function renderPermissionsCheckboxes(selectedPerms = []) {
  const container = document.getElementById('userPermissionsList');
  if (!container) return;

  container.innerHTML = Object.values(PERMISSIONS).map(p => {
    const isChecked = selectedPerms.includes(p.id);
    return `
      <label style="display:flex; align-items:flex-start; gap:8px; font-size:13px; margin-bottom:8px; cursor:pointer;">
        <input type="checkbox" name="userPermCheckbox" value="${p.id}" ${isChecked ? 'checked' : ''} style="width:17px; height:17px; margin-top:2px;">
        <div>
          <b style="color:var(--primary);">${escapeHtml(p.label)}</b>
          <div style="font-size:11.5px; color:var(--text-muted);">${escapeHtml(p.desc)}</div>
        </div>
      </label>
    `;
  }).join('');
}

export function updatePermissionsCheckboxes(roleId) {
  const role = ROLES[roleId];
  if (role) {
    renderPermissionsCheckboxes(role.permissions);
  }
}

export function saveUserForm() {
  const id = document.getElementById('userEditId').value;
  const name = document.getElementById('userName').value.trim();
  const email = document.getElementById('userEmail').value.trim();
  const pin = document.getElementById('userPin').value.trim() || '0000';
  const phone = document.getElementById('userPhone').value.trim();
  const role = document.getElementById('userRole').value;

  if (!name) {
    alert('Veuillez saisir un nom.');
    return;
  }

  const selectedPerms = [];
  document.querySelectorAll('input[name="userPermCheckbox"]:checked').forEach(cb => {
    selectedPerms.push(cb.value);
  });

  const userData = {
    id: id || undefined,
    name,
    email,
    pin,
    phone,
    role,
    permissions: selectedPerms
  };

  authService.saveUser(userData);
  closeModal('modalUserForm');
  renderUsersTable();
  showToast(`Utilisateur "${name}" enregistré !`, 'success');
}

export function toggleUserActive(userId) {
  authService.toggleUserStatus(userId);
  renderUsersTable();
  showToast('Statut utilisateur modifié', 'info');
}

export function deleteUserRecord(userId) {
  const user = authService.getUsers().find(u => u.id === userId);
  if (!user) return;
  if (!confirm(`Supprimer l'utilisateur "${user.name}" ?`)) return;

  authService.deleteUser(userId);
  renderUsersTable();
  showToast('Utilisateur supprimé', 'info');
}

// In-App Seed trigger
export async function triggerInAppSeed() {
  if (!confirm("Voulez-vous synchroniser et initialiser la base Firestore avec les 60 saveurs de glaces, 9 catégories et utilisateurs par défaut ?")) {
    return;
  }

  showToast("🌱 Initialisation Firestore en cours...", "info");
  const res = await dbService.seedFirestore((done, total, label) => {
    console.log(`[Seed Firestore] ${done}/${total} - ${label}`);
  });

  if (res.success) {
    showToast(`✅ Firestore initialisé avec succès (${res.count} documents) !`, "success");
    renderUsersTable();
  } else {
    showToast(`⚠️ Erreur : ${res.error}`, "error");
  }
}
