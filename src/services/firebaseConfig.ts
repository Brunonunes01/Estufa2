// src/services/firebaseConfig.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Esta é a importação que o SEU LOG (v 12.6.0) pediu
import { initializeAuth, getReactNativePersistence } from 'firebase/auth'; 

import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Suas chaves corretas do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDNGftBmPuHi2wSbIGyE3qu20i0AsQ3HQk",
  authDomain: "sge-app-9ffb8.firebaseapp.com",
  projectId: "sge-app-9ffb8",
  storageBucket: "sge-app-9ffb8.firebasestorage.app",
  messagingSenderId: "878004575186",
  appId: "1:878004575186:web:58cbe34633e63232d3c60b"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta as instâncias dos serviços
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

// O DB continua o mesmo
export const db = getFirestore(app);

export default app;