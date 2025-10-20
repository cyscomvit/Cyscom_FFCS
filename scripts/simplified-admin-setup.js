// simplified-admin-setup.js
// This script focuses solely on setting up admin roles in Firestore
// assuming the authentication is handled through the Firebase console
require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Read service account file
const serviceAccountPath = path.resolve(__dirname, '../service-account.json');
console.log('Looking for service account at:', serviceAccountPath);
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ service-account.json not found at:', serviceAccountPath);
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

// Admin credentials - these should match the users you create in Firebase console
const adminEmail = 'admin@vitstudent.ac.in';
const superAdminEmail = 'superadmin@vitstudent.ac.in';

// Initialize Firebase Admin SDK
try {
  console.log('Initializing Firebase Admin SDK...');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  console.log('✅ Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin SDK:', error);
  process.exit(1);
}

// Function to setup admin role in Firestore
async function setupAdminRole(email, role) {
  try {
    console.log(`Setting up ${role} role for ${email}...`);
    
    // Get user by email
    const userRecord = await admin.auth().getUserByEmail(email)
      .catch(error => {
        if (error.code === 'auth/user-not-found') {
          console.error(`❌ User ${email} not found. Please create this user in the Firebase console first.`);
          return null;
        }
        throw error;
      });
    
    if (!userRecord) return false;
    
    console.log(`✅ Found user with UID: ${userRecord.uid}`);
    
    // Set custom claims (optional)
    await admin.auth().setCustomUserClaims(userRecord.uid, { role });
    console.log(`✅ Set custom claims for ${email}`);
    
    // Update Firestore document
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      userId: userRecord.uid,
      email: email,
      role: role,
      name: role === 'admin' ? 'Cyscom Admin' : 'Cyscom Super Admin',
      departments: [],
      totalPoints: 0,
      projectId: null
    }, { merge: true });
    
    console.log(`✅ Updated Firestore document for ${email}`);
    return true;
  } catch (error) {
    console.error(`❌ Error setting up ${role} for ${email}:`, error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting admin role setup...');
  
  let successCount = 0;
  const results = await Promise.all([
    setupAdminRole(adminEmail, 'admin'),
    setupAdminRole(superAdminEmail, 'superadmin')
  ]);
  
  successCount = results.filter(Boolean).length;
  
  console.log('\n📊 Summary:');
  console.log(`✅ ${successCount} of 2 admin roles set up successfully`);
  
  if (successCount === 2) {
    console.log('\n🎉 Admin setup complete!');
  } else {
    console.log('\n⚠️ Admin setup incomplete. Please follow these steps:');
    console.log('1. Go to Firebase Console: https://console.firebase.google.com/');
    console.log('2. Navigate to Authentication > Users');
    console.log('3. Click "Add user" and create these accounts:');
    console.log(`   - Email: ${adminEmail}`);
    console.log('   - Password: cyscom2025admin');
    console.log(`   - Email: ${superAdminEmail}`);
    console.log('   - Password: cyscom2025superadmin');
    console.log('4. Run this script again to set up the roles in Firestore');
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });