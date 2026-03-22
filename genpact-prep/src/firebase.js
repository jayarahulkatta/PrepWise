import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBb6UizNNkT8qUsgeodrf1OTG71t8eEFBM",
  authDomain: "prepwise-680d3.firebaseapp.com",
  projectId: "prepwise-680d3",
  storageBucket: "prepwise-680d3.firebasestorage.app",
  messagingSenderId: "845452945164",
  appId: "1:845452945164:web:0380e5ea11a1ceafd44b29",
  measurementId: "G-Y9EZE1CZBK"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider };
export default app;
