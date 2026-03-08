// src/services/firebaseConfig.web.ts
import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';
// Na Web, importamos apenas o getAuth padrão, que já usa persistência local do browser automaticamente
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDNGftBmPuHi2wSbIGyE3qu20i0AsQ3HQk",
  authDomain: "sge-app-9ffb8.firebaseapp.com",
  projectId: "sge-app-9ffb8",
  storageBucket: "sge-app-9ffb8.firebasestorage.app",
  messagingSenderId: "878004575186",
  appId: "1:878004575186:web:58cbe34633e63232d3c60b"
};

const app = initializeApp(firebaseConfig);

// A Web trata a persistência de forma nativa e automática
export const auth = getAuth(app);

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({})
});

export default app;