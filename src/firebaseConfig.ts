// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCt-iUY6FWetnJhFrKEOpIK2UfkrRgnYf0",
  authDomain: "multimedia-icvp.firebaseapp.com",
  projectId: "multimedia-icvp",
  storageBucket: "multimedia-icvp.firebasestorage.app",
  messagingSenderId: "384649245",
  appId: "1:384649245:web:7c73542c2817d600a0def4",
  measurementId: "G-R9WTHXWL82"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };