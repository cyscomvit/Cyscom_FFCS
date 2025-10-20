// create-admin.js - A simplified script to create admin users
// This script uses the client-side Firebase SDK and works with minimal configuration
const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Admin credentials
const adminEmail = 'admin@vitstudent.ac.in';
const adminPassword = 'cyscom2025admin';
const adminName = 'Cyscom Admin';

// Super admin credentials
const superAdminEmail = 'superadmin@vitstudent.ac.in';
const superAdminPassword = 'cyscom2025superadmin';
const superAdminName = 'Cyscom Super Admin';

// Hardcoded Firebase config - only use this for setup scripts
// In a real app, always use environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Print config for debugging (mask sensitive parts)
console.log('Firebase Config:');
console.log('  apiKey:', firebaseConfig.apiKey ? '✓ Set' : '✗ Missing');
console.log('  authDomain:', firebaseConfig.authDomain);
console.log('  projectId:', firebaseConfig.projectId);
console.log('  storageBucket:', firebaseConfig.storageBucket);
console.log('  messagingSenderId:', firebaseConfig.messagingSenderId ? '✓ Set' : '✗ Missing');
console.log('  appId:', firebaseConfig.appId ? '✓ Set' : '✗ Missing');

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('ERROR: Missing required Firebase configuration in .env.local file.');
  console.error('Please ensure the following variables are set:');
  console.error('  NEXT_PUBLIC_FIREBASE_API_KEY');
  console.error('  NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  process.exit(1);
}

// Initialize Firebase
console.log('Initializing Firebase...');
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function createUserIfNotExists(email, password, displayName, role) {
  console.log(`Creating/updating user: ${email}`);
  
  try {
    // Try to create the user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const userId = userCredential.user.uid;
    console.log(`Created new user with UID: ${userId}`);
    
    // Create user document
    await setDoc(doc(db, 'users', userId), {
      userId: userId,
      name: displayName,
      email: email,
      role: role,
      departments: [],
      totalPoints: 0,
      projectId: null
    });
    
    console.log(`Created Firestore document for user: ${userId}`);
    return userId;
  } catch (error) {
    // If user already exists, try to sign in and update
    if (error.code === 'auth/email-already-in-use') {
      console.log(`User ${email} already exists, signing in to update`);
      
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userId = userCredential.user.uid;
        
        // Update the Firestore document
        await setDoc(doc(db, 'users', userId), {
          userId: userId,
          name: displayName,
          email: email,
          role: role,
          departments: [],
          totalPoints: 0,
          projectId: null
        }, { merge: true });
        
        console.log(`Updated Firestore document for user: ${userId}`);
        return userId;
      } catch (signInError) {
        console.error(`Error signing in as ${email}:`, signInError);
        console.error(`Error code: ${signInError.code}`);
        console.error(`Error message: ${signInError.message}`);
        throw signInError;
      }
    } else {
      console.error(`Error creating user ${email}:`, error);
      console.error(`Error code: ${error.code}`);
      console.error(`Error message: ${error.message}`);
      throw error;
    }
  }
}

async function setupAdmin() {
  try {
    console.log('Starting admin setup...');
    
    // Create or update admin user
    const adminUid = await createUserIfNotExists(adminEmail, adminPassword, adminName, 'admin');
    
    // Create or update super admin user
    const superAdminUid = await createUserIfNotExists(superAdminEmail, superAdminPassword, superAdminName, 'superadmin');
    
    console.log('\nAdmin credentials:');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log(`Role: admin`);
    
    console.log('\nSuper Admin credentials:');
    console.log(`Email: ${superAdminEmail}`);
    console.log(`Password: ${superAdminPassword}`);
    console.log(`Role: superadmin`);
    
    console.log('\nNote: In production, use more secure passwords!');
    console.log('Admin setup complete');
    
    // Sign out after setup
    await auth.signOut();
    
    return { adminUid, superAdminUid };
  } catch (error) {
    console.error('Error setting up admin users:', error);
    throw error;
  }
}

// Run the setup
setupAdmin()
  .then(() => {
    console.log('Setup complete!');
    setTimeout(() => process.exit(0), 1000); // Give time for Firebase connections to close
  })
  .catch((error) => {
    console.error('Setup failed:', error);
    setTimeout(() => process.exit(1), 1000); // Give time for Firebase connections to close
  });