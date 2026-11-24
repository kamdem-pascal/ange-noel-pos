/**
 * Script de Seed Firestore — Les Gourmandises de Ange Noël
 * Exécutable directement avec : node seed.js
 * Fonctionne de façon autonome sans dépendances lourdes via l'API REST officielle Firestore.
 */

import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, DEFAULT_USERS, DEFAULT_SHOP_INFO } from './js/data/initial-data.js';

const PROJECT_ID = "an-gourmandise";
const API_KEY = "AIzaSyD7kLdv06sE4oybCRSzBrGIsaQ9Ohu_GZ8";
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// Convertit un objet JavaScript standard en format Firestore Document Value
function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function toFirestoreDoc(data) {
  const fields = {};
  for (const [key, value] of Object.entries(data)) {
    fields[key] = toFirestoreValue(value);
  }
  return { fields };
}

async function saveDoc(collection, docId, data) {
  const url = `${BASE_URL}/${collection}/${docId}?key=${API_KEY}`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toFirestoreDoc(data))
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Erreur [${response.status}] sur ${collection}/${docId}: ${text}`);
  }
  return response.json();
}

async function runSeed() {
  console.log("======================================================================");
  console.log(" 🍨 LES GOURMANDISES DE ANGE NOËL — SEED DE LA BASE FIRESTORE 🍨");
  console.log(` Projet : ${PROJECT_ID}`);
  console.log("======================================================================\n");

  try {
    // 1. Catégories (9)
    console.log(`📦 1. Enregistrement des catégories (${DEFAULT_CATEGORIES.length})...`);
    for (const cat of DEFAULT_CATEGORIES) {
      process.stdout.write(`   ▶ Catégorie : ${cat.name.padEnd(25)}`);
      await saveDoc('categories', cat.id, cat);
      console.log("✅ OK");
    }

    // 2. Produits réels (60)
    console.log(`\n🍦 2. Enregistrement des 60 gourmandises & prix réels...`);
    for (const prod of DEFAULT_PRODUCTS) {
      process.stdout.write(`   ▶ [${prod.category}] ${prod.name.padEnd(32)} ${prod.price} F... `);
      await saveDoc('products', prod.id, prod);
      console.log("✅");
    }

    // 3. Utilisateurs & Rôles
    console.log(`\n👥 3. Enregistrement des utilisateurs & permissions (${DEFAULT_USERS.length})...`);
    for (const user of DEFAULT_USERS) {
      process.stdout.write(`   ▶ ${user.name.padEnd(25)} (${user.role.toUpperCase()}) PIN: ${user.pin}... `);
      await saveDoc('users', user.id, user);
      console.log("✅");
    }

    // 4. Coordonnées de la boutique
    console.log(`\n🏪 4. Enregistrement des coordonnées de la boutique...`);
    await saveDoc('settings', 'shop', DEFAULT_SHOP_INFO);
    console.log("   ▶ Informations boutique enregistrées avec succès ✅");

    console.log("\n======================================================================");
    console.log(" ✨ FÉLICITATIONS ! SEED TERMINÉ AVEC SUCCÈS DANS FIRESTORE ✨");
    console.log(" Votre base de données Firebase est prête et synchronisée.");
    console.log("======================================================================");
  } catch (err) {
    console.error("\n❌ ERREUR LORS DU SEED :", err.message);
    process.exit(1);
  }
}

runSeed();
