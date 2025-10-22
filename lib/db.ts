import type { Project } from '../types'
import { getRealtimeDbClient } from './firebase'
import { getAdminRealtimeDb } from './firebase-admin'
import { ref as rtdbRef, get as rtdbGet, set as rtdbSet, push as rtdbPush } from 'firebase/database'

// Note: this file is a light compatibility layer to start moving operations
// from Firestore to Realtime Database. It intentionally implements only the
// core operations needed for projects and joinRequests used by the UI. More
// operations can be added as migration proceeds.

export async function listProjectsRealtime() : Promise<Project[]> {
  const db = getRealtimeDbClient()
  const projectsRef = rtdbRef(db, 'projects')
  const snap = await rtdbGet(projectsRef)
  const val = snap.val() || {}
  return Object.keys(val).map(key => ({ projectId: key, ...(val[key] as any) }))
}

export async function createProjectRealtime(p: Partial<Project>) {
  const db = getRealtimeDbClient()
  const projectsRef = rtdbRef(db, 'projects')
  const newRef = await rtdbPush(projectsRef, p)
  return newRef.key
}

export async function getProjectRealtime(projectId: string) {
  const db = getRealtimeDbClient()
  const projectRef = rtdbRef(db, `projects/${projectId}`)
  const snap = await rtdbGet(projectRef)
  return snap.exists() ? { projectId, ...(snap.val() as any) } : null
}

export async function addJoinRequestRealtime(req: { userId: string, projectId: string, message?: string }) {
  const db = getRealtimeDbClient()
  const jref = rtdbRef(db, 'joinRequests')
  const newRef = await rtdbPush(jref, { ...req, createdAt: Date.now() })
  return newRef.key
}

export async function approveJoinRequestRealtime(requestId: string, approverId: string) {
  // This operation requires transactional semantics: ensure project members
  // array length vs membersLimit before adding. Use RTDB transaction on
  // /projects/{id}/members where possible.
  const adminDb = getAdminRealtimeDb() as any
  const requestRef = adminDb.ref(`joinRequests/${requestId}`)
  const reqSnap = await requestRef.get()
  if (!reqSnap.exists()) throw new Error('JoinRequest not found')
  const req = reqSnap.val()
  const projectRef = adminDb.ref(`projects/${req.projectId}`)

  // Use admin SDK transaction
  await new Promise((resolve, reject) => {
    projectRef.transaction((proj: any) => {
      if (!proj) return proj
      proj.members = proj.members || []
      const limit = proj.membersLimit || 4
      if (proj.members.length >= limit) {
        // abort transaction by returning undefined
        return undefined
      }
      if (!proj.members.includes(req.userId)) proj.members.push(req.userId)
      return proj
    }, (error: any, committed: boolean, snapshot: any) => {
      if (error) return reject(error)
      if (!committed) return reject(new Error('Project is full or transaction aborted'))
      return resolve(snapshot)
    })
  })

  // remove the join request
  await requestRef.set(null)
}

export default {
  listProjectsRealtime,
  createProjectRealtime,
  getProjectRealtime,
  addJoinRequestRealtime,
  approveJoinRequestRealtime
}
