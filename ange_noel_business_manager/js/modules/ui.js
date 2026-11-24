/**
 * Module UI — Utilitaires, Modals, Toasts et Helpers
 * Les Gourmandises de Ange Noël
 */

export function el(id) {
  return document.getElementById(id);
}

export function val(id) {
  const elem = el(id);
  return elem ? elem.value : '';
}

export function money(amount) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('fr-FR').format(num) + ' F CFA';
}

export function today() {
  return new Date().toISOString().split('T')[0];
}

export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function showToast(message, type = 'info') {
  const container = el('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${escapeHtml(message)}</span>
    <button style="border:0; background:transparent; cursor:pointer; color:inherit; font-size:16px;">✕</button>
  `;

  toast.querySelector('button').addEventListener('click', () => toast.remove());
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

export function openModal(id) {
  const modal = el(id);
  if (modal) modal.classList.add('open');
}

export function closeModal(id) {
  const modal = el(id);
  if (modal) modal.classList.remove('open');
}

export function openMobileDrawer() {
  const sb = el('appSidebar');
  const bd = el('drawerBackdrop');
  if (sb) sb.classList.add('open');
  if (bd) bd.classList.add('open');
  document.body.style.overflow = 'hidden';
}

export function closeMobileDrawer() {
  const sb = el('appSidebar');
  const bd = el('drawerBackdrop');
  if (sb) sb.classList.remove('open');
  if (bd) bd.classList.remove('open');
  document.body.style.overflow = '';
}

export function toggleMobileDrawer() {
  const sb = el('appSidebar');
  if (sb && sb.classList.contains('open')) {
    closeMobileDrawer();
  } else {
    openMobileDrawer();
  }
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
