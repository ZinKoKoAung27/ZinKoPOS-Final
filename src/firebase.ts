import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC2SH9peJvn_-KEdqUUipB4xhjp39n1LjM",
  authDomain: "zinkopos.firebaseapp.com",
  projectId: "zinkopos",
  storageBucket: "zinkopos.firebasestorage.app",
  messagingSenderId: "447470355037",
  appId: "1:447470355037:web:042d9e3f698c095d4383b4",
  measurementId: "G-QLKLXDD9D8"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
