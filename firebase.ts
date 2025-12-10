import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA6gY-3M0BfnUDH0jWjxpZNS_DBYTqbeTU",
    authDomain: "kampanya-d75df.firebaseapp.com",
    projectId: "kampanya-d75df",
    storageBucket: "kampanya-d75df.firebasestorage.app",
    messagingSenderId: "484829374542",
    appId: "1:484829374542:web:5e6617703de76e69317b1f",
    measurementId: "G-WTGSZ93H4T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Export Firestore database and Auth instances
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
