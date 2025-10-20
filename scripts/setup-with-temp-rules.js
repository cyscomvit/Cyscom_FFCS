// setup-with-temp-rules.js
// This script temporarily modifies Firebase rules to allow admin setup
require('dotenv').config({ path: '.env.local' });
const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

// Firebase configuration from environment
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Admin credentials
const adminEmail = 'admin@vitstudent.ac.in';
const adminPassword = 'cyscom2025admin';
const superAdminEmail = 'superadmin@vitstudent.ac.in';
const superAdminPassword = 'cyscom2025superadmin';

console.log('Firebase Config:');
console.log('  apiKey:', firebaseConfig.apiKey ? '✓ Set' : '✗ Missing');
console.log('  authDomain:', firebaseConfig.authDomain);
console.log('  projectId:', firebaseConfig.projectId);
console.log('  storageBucket:', firebaseConfig.storageBucket);
console.log('  messagingSenderId:', firebaseConfig.messagingSenderId ? '✓ Set' : '✗ Missing');
console.log('  appId:', firebaseConfig.appId ? '✓ Set' : '✗ Missing');

// Initialize Firebase
console.log('\n📋 Setup Instructions:');
console.log('1. Go to Firebase Console: https://console.firebase.google.com/');
console.log('2. Select your project:', firebaseConfig.projectId);
console.log('3. Go to Firestore Database > Rules');
console.log('4. Temporarily update the rules to:');
console.log('```');
console.log(`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Temporarily allow all reads and writes for setup
    match /users/{userId} {
      allow read, write: if true;
    }
    
    // Keep other rules as they are...
    // ...
  }
}`);
console.log('```');
console.log('5. Click "Publish"');
console.log('6. After publishing the temporary rules, run this script again with the "apply" parameter:');
console.log('   npm run setup-temp -- apply');
console.log('\n⚠️ IMPORTANT: After running this setup, remember to restore your original security rules!');

// Check if we should apply the changes
const shouldApply = process.argv.includes('apply');

if (!shouldApply) {
  console.log('\n❗ Run with "apply" parameter when ready to proceed');
  process.exit(0);
}

// Initialize Firebase
console.log('\nInitializing Firebase...');
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function createUser(email, password, role, displayName) {
  console.log(`\nCreating ${role} user: ${email}`);
  try {
    // Try to create the user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log(`✅ User created successfully with UID: ${userCredential.user.uid}`);
    
    // Set role in Firestore
    try {
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        userId: userCredential.user.uid,
        email,
        role,
        name: displayName,
        departments: [],
        totalPoints: 0,
        projectId: null
      });
      console.log(`✅ User role set to ${role} in Firestore`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to set user role: ${error.message}`);
      console.error(error);
      return false;
    }
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('⚠️ User already exists, trying to sign in and update role...');
      try {
        // Try to sign in and update role
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          userId: userCredential.user.uid,
          email,
          role,
          name: displayName,
          departments: [],
          totalPoints: 0,
          projectId: null
        }, { merge: true });
        console.log(`✅ User role updated to ${role} in Firestore`);
        return true;
      } catch (signInError) {
        console.error(`❌ Failed to sign in: ${signInError.message}`);
        console.error(signInError);
        return false;
      }
    } else {
      console.error(`❌ Failed to create user: ${error.message} (${error.code})`);
      console.error(error);
      return false;
    }
  }
}

async function main() {
  console.log('🚀 Starting admin user creation process...');
  
  let successCount = 0;
  
  // Create admin user
  const adminSuccess = await createUser(
    adminEmail, 
    adminPassword, 
    'admin',
    'Cyscom Admin'
  );
  if (adminSuccess) successCount++;
  
  // Create super admin user
  const superAdminSuccess = await createUser(
    superAdminEmail, 
    superAdminPassword, 
    'superadmin',
    'Cyscom Super Admin'
  );
  if (superAdminSuccess) successCount++;
  
  console.log('\n📊 Summary:');
  console.log(`✅ ${successCount} of 2 users created/updated successfully`);
  
  if (successCount === 2) {
    console.log('\n🎉 All admin users are ready!');
    console.log('\nℹ️ Admin credentials:');
    console.log('   - Email: admin@vitstudent.ac.in');
    console.log('   - Password: cyscom2025admin');
    console.log('   - Access: /admin route');
    console.log('\nℹ️ Super Admin credentials:');
    console.log('   - Email: superadmin@vitstudent.ac.in');
    console.log('   - Password: cyscom2025superadmin');
    console.log('   - Access: /admin and /superadmin routes');
    
    console.log('\n⚠️ IMPORTANT: Remember to restore your original security rules!');
    console.log('Go to Firebase Console > Firestore Database > Rules and restore your previous rules.');
  } else {
    console.log('\n⚠️ Some users could not be created. Check the logs above for details.');
  }
}

main()
  .then(() => {
    console.log('\nSetup process completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ An unexpected error occurred:', error);
    process.exit(1);
  });