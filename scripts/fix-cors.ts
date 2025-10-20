#!/usr/bin/env ts-node
/**
 * scripts/fix-cors.ts
 *
 * Usage (from repo root):
 * 1. npm install @google-cloud/storage dotenv
 * 2. npx ts-node --project tsconfig.scripts.json ./scripts/fix-cors.ts
 *
 * This script uses environment variables to authenticate and sets a
 * CORS policy on the configured storage bucket from env or firebase config.
 */

import { Storage } from '@google-cloud/storage'
import * as dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function main() {
  // Try alternative service account first (for Storage/CORS), fallback to primary
  const useAltAccount = process.env.FIREBASE_CLIENT_EMAIL_ALT && process.env.FIREBASE_PRIVATE_KEY_ALT;
  
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

  console.log(`Using ${useAltAccount ? 'alternative' : 'primary'} service account for CORS configuration`);

  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET
  if (!bucketName) {
    console.error('Storage bucket not configured. Set NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET in your environment or provide FIREBASE_STORAGE_BUCKET.')
    process.exit(1)
  }

  const storage = new Storage({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey?.replace(/\\n/g, '\n')
    },
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  })
  const bucket = storage.bucket(bucketName)

  const cors = [
    {
      origin: ['http://localhost:3000', 'http://127.0.0.1:3000', '*'],
      method: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD'],
      responseHeader: ['Content-Type', 'Authorization'],
      maxAgeSeconds: 3600,
    },
  ]

  try {
    console.log(`Setting CORS for bucket: ${bucketName}`)
    await bucket.setMetadata({ cors })
    console.log('CORS updated successfully. New CORS policy:')
    console.log(JSON.stringify(cors, null, 2))
  } catch (err) {
    console.error('Failed to update CORS:', err)
    process.exitCode = 2
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
