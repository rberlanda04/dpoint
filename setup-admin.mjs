import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCM7KqXBBjKrKHCsURCY4XVWLU6DDBGfaM",
  authDomain: "dpoint-d138c.firebaseapp.com",
  projectId: "dpoint-d138c",
  storageBucket: "dpoint-d138c.firebasestorage.app",
  messagingSenderId: "731392781248",
  appId: "1:731392781248:web:e2ec832677db39152a3625"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// We can't look up users by email without admin SDK
// But we can check if the user exists by trying to read the doc
console.log("Need to find UID for r.berlanda04@gmail.com");
console.log("Checking existing super_admins and empresa_admins...");

import { getFirestore, collection, getDocs } from 'firebase/firestore';
const db = getFirestore(app);

try {
  const snap = await getDocs(collection(db, 'super_admins'));
  console.log('super_admins docs:', snap.size);
  snap.forEach(doc => console.log('  -', doc.id, JSON.stringify(doc.data())));
} catch(e) {
  console.log('super_admins error:', e.message);
}

try {
  const snap2 = await getDocs(collection(db, 'empresa_admins'));
  console.log('empresa_admins docs:', snap2.size);
  snap2.forEach(doc => console.log('  -', doc.id, JSON.stringify(doc.data())));
} catch(e) {
  console.log('empresa_admins error:', e.message);
}

try {
  const snap3 = await getDocs(collection(db, 'funcionarios'));
  console.log('funcionarios docs:', snap3.size);
  snap3.forEach(doc => console.log('  -', doc.id, JSON.stringify(doc.data())));
} catch(e) {
  console.log('funcionarios error:', e.message);
}
