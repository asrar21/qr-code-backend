// src/config/firebase.js
const { initializeApp } = require("firebase/app");
const { getDatabase, ref, set, get, update, remove } = require("firebase/database");

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAq4B3Ogwgj9fp2HOpyGasuh5NoZOymyPA",
  authDomain: "canvascore-27bd4.firebaseapp.com",
  databaseURL: "https://canvascore-27bd4-default-rtdb.firebaseio.com",
  projectId: "canvascore-27bd4",
  storageBucket: "canvascore-27bd4.firebasestorage.app",
  messagingSenderId: "685681574017",
  appId: "1:685681574017:web:c9b7f0bbcb3263311b0d80",
  measurementId: "G-X0Q8R9Z5FY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Helper functions for Realtime Database
const db = {
  // Write data
  set: async (path, data) => {
    try {
      await set(ref(database, path), data);
      return { success: true, path };
    } catch (error) {
      throw new Error(`Database set error: ${error.message}`);
    }
  },

  // Read data
  get: async (path) => {
    try {
      const snapshot = await get(ref(database, path));
      return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
      throw new Error(`Database get error: ${error.message}`);
    }
  },

  // Update data
  update: async (path, data) => {
    try {
      await update(ref(database, path), data);
      return { success: true, path };
    } catch (error) {
      throw new Error(`Database update error: ${error.message}`);
    }
  },

  // Delete data
  delete: async (path) => {
    try {
      await remove(ref(database, path));
      return { success: true, path };
    } catch (error) {
      throw new Error(`Database delete error: ${error.message}`);
    }
  },

  // Query by child value
  queryByChild: async (path, childKey, childValue) => {
    try {
      const snapshot = await get(ref(database, path));
      if (!snapshot.exists()) return [];
      
      const data = snapshot.val();
      const results = [];
      
      Object.keys(data).forEach(key => {
        if (data[key][childKey] === childValue) {
          results.push({ id: key, ...data[key] });
        }
      });
      
      return results;
    } catch (error) {
      throw new Error(`Database query error: ${error.message}`);
    }
  }
};

console.log('✅ Firebase Realtime Database connected successfully');

module.exports = { db };