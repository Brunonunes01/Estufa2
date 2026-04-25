// src/services/firebaseConfig.ts
import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';

// Voltamos ao código original que funcionava bem no mobile
// @ts-ignore
import { initializeAuth, getReactNativePersistence } from 'firebase/auth'; 
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyDNGftBmPuHi2wSbIGyE3qu20i0AsQ3HQk",
  authDomain: "sge-app-9ffb8.firebaseapp.com",
  projectId: "sge-app-9ffb8",
  storageBucket: "sge-app-9ffb8.firebasestorage.app",
  messagingSenderId: "878004575186",
  appId: "1:878004575186:web:58cbe34633e63232d3c60b"
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

export const db = initializeFirestore(app, {
  // Habilitando a persistência para funcionamento offline, alinhado com a web.
  localCache: persistentLocalCache({ })
});

export default app;
