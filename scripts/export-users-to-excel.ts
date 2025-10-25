import admin from 'firebase-admin'
import fs from 'fs'
import path from 'path'
import * as XLSX from 'xlsx'
import { initializeApp } from '../lib/firebase-admin'

async function main() {
  // initialize firebase-admin
  initializeApp()
  const db = admin.firestore()

  console.log('Fetching departments...')
  const deptsSnap = await db.collection('departments').get()
  const departments = new Map<string, any>()
  deptsSnap.forEach(d => departments.set(d.id, d.data()))

  console.log('Fetching projects...')
  const projectsSnap = await db.collection('projects').get()
  const projects = new Map<string, any>()
  projectsSnap.forEach(p => projects.set(p.id, p.data()))

  console.log('Fetching users...')
  const usersSnap = await db.collection('users').get()

  const rows: Record<string, any>[] = []

  usersSnap.forEach(u => {
    const data = u.data() as any
    const userId = u.id
    const name = data.name || data.displayName || ''
    const email = data.email || ''
    const role = data.role || ''

    // departments may be stored as array of ids
    const deptIds: string[] = Array.isArray(data.departments) ? data.departments : []
    const deptNames = deptIds.map(id => {
      const d = departments.get(id)
      return d ? d.name || id : id
    })

    // user's assigned project (if stored on user doc as projectId or project)
    const assignedProjectId = data.projectId || data.project || null
    const assignedProjectName = assignedProjectId ? (projects.get(assignedProjectId)?.name || assignedProjectId) : ''

    // find projects where this user is a member (projects may store members array)
    const memberProjectNames: string[] = []
    for (const [pid, p] of projects.entries()) {
      const members = p.members || []
      if (Array.isArray(members) && members.includes(userId)) {
        memberProjectNames.push(p.name || pid)
      }
    }

    rows.push({
      userId,
      name,
      email,
      role,
      department1Id: deptIds[0] || '',
      department1Name: deptNames[0] || '',
      department2Id: deptIds[1] || '',
      department2Name: deptNames[1] || '',
      allDepartmentIds: deptIds.join(', '),
      allDepartments: deptNames.join(', '),
      assignedProjectId: assignedProjectId || '',
      assignedProjectName,
      memberProjects: memberProjectNames.join(', '),
      totalPoints: data.totalPoints ?? ''
    })
  })

  // prepare output dir
  const outDir = path.resolve(__dirname, '..', 'exports')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

  const outPath = path.join(outDir, `users_with_depts_projects_${Date.now()}.xlsx`)

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Users')
  XLSX.writeFile(wb, outPath)

  console.log('Wrote', outPath)
}

main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)})
