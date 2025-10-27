import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCux1mq0YJ_s_ZMuut8oR7D1p9UqR7ptUQ",
  authDomain: "controlepecas-3f149.firebaseapp.com",
  projectId: "controlepecas-3f149",
  storageBucket: "controlepecas-3f149.firebasestorage.app",
  messagingSenderId: "3614338897",
  appId: "1:3614338897:web:0a7ccacc07290fed02ed70"
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export const db = getFirestore(app);
export const storage = getStorage(app);