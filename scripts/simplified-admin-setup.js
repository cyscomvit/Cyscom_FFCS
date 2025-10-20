// simplified-admin-setup.js
// This script focuses solely on setting up admin roles in Firestore
// assuming the authentication is handled through the Firebase console
require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

// Try primary service account first, fallback to alternative
const useAltAccount = !process.env.FIREBASE_CLIENT_EMAIL && 
                      process.env.FIREBASE_CLIENT_EMAIL_ALT && 
                      process.env.FIREBASE_PRIVATE_KEY_ALT;

const clientEmail = useAltAccount 
  ? process.env.FIREBASE_CLIENT_EMAIL_ALT 
  : process.env.FIREBASE_CLIENT_EMAIL;

const privateKey = useAltAccount 
  ? process.env.FIREBASE_PRIVATE_KEY_ALT 
  : process.env.FIREBASE_PRIVATE_KEY;

if (!clientEmail || !privateKey || !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
  console.error('❌ Missing required environment variables');
  console.error('Required: NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  console.error('Required (at least one set): FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY');
  console.error('Or: FIREBASE_CLIENT_EMAIL_ALT + FIREBASE_PRIVATE_KEY_ALT');
  process.exit(1);
}

console.log(`Using ${useAltAccount ? 'alternative' : 'primary'} service account for admin setup`);

// Admin credentials - these should match the users you create in Firebase console
const adminEmail = 'admin@vitstudent.ac.in';
const superAdminEmail = 'superadmin@vitstudent.ac.in';

// Initialize Firebase Admin SDK
try {
  console.log('Initializing Firebase Admin SDK with environment variables...');
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n')
    })
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