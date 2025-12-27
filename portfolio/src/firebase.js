import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDwU8k5bixNnt3lp2EbqYIQjc_3w-iSzj0",
  authDomain: "portfolio-d996c.firebaseapp.com",
  projectId: "portfolio-d996c",
  storageBucket: "portfolio-d996c.firebasestorage.app",
  messagingSenderId: "738419257176",
  appId: "1:738419257176:web:d976300cb9ee6ca8853f2d",
  measurementId: "G-BSJ66V2C2L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);