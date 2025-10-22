import { initializeApp, getAdminRealtimeDb } from '../lib/firebase-admin'
import admin from 'firebase-admin'

async function main() {
  const app = initializeApp()
  const fs = admin.firestore()
  const rtdb = getAdminRealtimeDb()

  const collections = ['users','departments','projects','joinRequests','contributions','reviews','analytics','activityLog']

  for (const col of collections) {
    console.log('Migrating collection:', col)
    const snap = await fs.collection(col).get()
    for (const doc of snap.docs) {
      const data = doc.data()
      // apply small normalization
      if (col === 'projects') {
        if (data.membersLimit == null) data.membersLimit = 4
      }
      await rtdb.ref(`${col}/${doc.id}`).set({ ...data })
    }
  }

  console.log('Migration complete')
}

main().catch(err => {
  console.error('Migration failed', err)
  process.exit(1)
})
