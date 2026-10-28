// lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
    apiKey: "AIzaSyCEquearQ_9ILChSrEtg_wco_uy80WeisU",
    authDomain: "tb-ims.firebaseapp.com",
    databaseURL: "https://tb-ims-default-rtdb.firebaseio.com",
    projectId: "tb-ims",
    storageBucket: "tb-ims.firebasestorage.app",
    messagingSenderId: "220094352882",
    appId: "1:220094352882:web:5e0a13eb45a92596636f6b",
    measurementId: "G-TQYNSGTDLG"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
