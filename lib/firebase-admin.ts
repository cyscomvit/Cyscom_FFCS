import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local if it exists
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
}

export function initializeApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  try {
    // Try primary service account first, fallback to alternative
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL_ALT || '';
    const privateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY_ALT || '';
    
    console.log('Initializing Firebase Admin with environment variables');
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
        clientEmail: clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n')
      })
    });
  } catch (error) {
    // If environment variables fail, log the error and try databaseURL method
    console.error('Firebase admin init (env creds) error:', error instanceof Error ? error.message : String(error));
    console.log('Failed to initialize with credentials, using databaseURL method for emulator');
    
    return admin.initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com`
    });
  }
}

// Convenience helper to get the Admin Realtime Database instance.
export function getAdminRealtimeDb() {
  const app = initializeApp()
  try {
    return admin.database(app)
  } catch (e) {
    throw new Error('Failed to get Admin Realtime Database client: ' + (e instanceof Error ? e.message : String(e)))
  }
}