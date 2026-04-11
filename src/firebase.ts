import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import firebaseConfig from "../firebase-applet-config.json";

console.log("Firebase Config:", { ...firebaseConfig, apiKey: "REDACTED" });

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Test connection to Firestore
async function testConnection() {
  try {
    // Attempt to fetch a non-existent document to test connectivity
    await getDocFromServer(doc(db, '_connection_test_', 'ping'));
    console.log("Firestore connection successful.");
  } catch (error: any) {
    if (error.message && error.message.includes('the client is offline')) {
      console.error("Firestore connection failed: The client is offline. Please check your Firebase configuration and internet connection.");
    } else if (error.code === 'permission-denied') {
      console.error("Firestore connection failed: Permission denied. Please check your security rules.");
    } else {
      console.error("Firestore connection test error:", error);
    }
  }
}

testConnection();
