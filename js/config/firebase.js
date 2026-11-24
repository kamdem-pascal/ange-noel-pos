/**
 * Configuration et Initialisation du SDK Firebase v10
 * Les Gourmandises de Ange Noël
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";

export const firebaseConfig = {
  apiKey: "AIzaSyD7kLdv06sE4oybCRSzBrGIsaQ9Ohu_GZ8",
  authDomain: "an-gourmandise.firebaseapp.com",
  projectId: "an-gourmandise",
  storageBucket: "an-gourmandise.firebasestorage.app",
  messagingSenderId: "777308476778",
  appId: "1:777308476778:web:ecfd503544cbd95ffbc113",
  measurementId: "G-E7BF75BNFL"
};

// Initialisation de l'application Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialisation d'Analytics si supporté dans l'environnement
export let analytics = null;
try {
  if (typeof window !== 'undefined') {
    analytics = getAnalytics(app);
  }
} catch (e) {
  console.warn("Firebase Analytics non activé dans cet environnement :", e.message);
}

// Activer la persistance locale Firestore pour le fonctionnement hors-ligne
try {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn("Persistance Firestore : plusieurs onglets ouverts simultanément.");
    } else if (err.code === 'unimplemented') {
      console.warn("Persistance Firestore non supportée par ce navigateur.");
    }
  });
} catch (e) {
  // Ignorer si non supporté
}
