import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBWerC9rn8Gtr7XWtrxDu7268-a-Jn6ljs",
  authDomain: "machinichi-6759c.firebaseapp.com",
  projectId: "machinichi-6759c",
  storageBucket: "machinichi-6759c.firebasestorage.app",
  messagingSenderId: "722381449854",
  appId: "1:722381449854:web:35a8de725c3a162376062f",
  measurementId: "G-H5JHKB3469"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export { RecaptchaVerifier, signInWithPhoneNumber, GoogleAuthProvider, signInWithPopup };
