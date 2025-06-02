// firebase-config.js

// IMPORTANT: No 'import' statements here for Firebase SDKs
// The 'firebase' global object is available because of firebase-app-compat.js in index.html

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAb5zCWatRwNQc9_ty_9O9eYjVaBx8AXWc",
  authDomain: "nba-challenger-d8e2c.firebaseapp.com",
  databaseURL: "https://nba-challenger-d8e2c-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "nba-challenger-d8e2c",
  storageBucket: "nba-challenger-d8e2c.firebasestorage.app",
  messagingSenderId: "324218206944",
  appId: "1:324218206944:web:c55f19f5a07ac11ba4ae85",
  measurementId: "G-S1JZ1JLVB3" // Remove if you don't use analytics
};

// Initialize Firebase and make the 'app' instance GLOBAL
window.app = firebase.initializeApp(firebaseConfig);

// You can get references to auth and firestore here if you want them
// globally available, or get them in script.js (recommended for organization)
// const auth = app.auth();
// const db = app.firestore();


