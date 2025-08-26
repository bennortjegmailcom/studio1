// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAwIGg1kH7JgiBK4IFM0rKDk9c0tSc8zag",
  authDomain: "phonic-cinema-304121.firebaseapp.com",
  projectId: "phonic-cinema-304121",
  storageBucket: "phonic-cinema-304121.appspot.com",
  messagingSenderId: "1009296154659",
  appId: "1:1009296154659:web:0a068541028039d7a09196",
  measurementId: "G-D70JMWSZ62"
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
