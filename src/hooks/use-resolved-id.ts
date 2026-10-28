
"use client"

import { useState, useEffect } from "react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, off, get } from "firebase/database"
import { usePathname } from "next/navigation"

export function useResolvedId() {
  const { database } = useFirebase()
  const { user } = useUser()
  const pathname = usePathname()
  
  const [resolvedId, setResolvedId] = useState<string | null>(null)
  const [staffId, setStaffId] = useState<string | null>(null)
  const [branchId, setBranchId] = useState<string | null>(null)
  const [isStaff, setIsStaff] = useState(false)
  const [isBranch, setIsBranch] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // SAFE KEY UTILITY: Replace dots with underscores for Firebase paths
  const getSafeKey = (val: string) => val.replace(/\./g, '_')

  useEffect(() => {
    if (!database) return

    const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
    const erpDomains = ['erp.digitalclassworld.in', 'localhost']
    const isCentralHub = erpDomains.some(d => hostname === d || hostname.includes('webstation-'))

    const resolveVisitorContext = async () => {
      if (pathname && (pathname.startsWith('/sites/') || (!isCentralHub && pathname === '/'))) {
        const parts = pathname.split('/')
        const siteId = pathname === '/' 
          ? hostname.replace('www.', '').split('.')[0] 
          : parts[2] 

        if (siteId) {
          const safeSiteId = getSafeKey(siteId)
          const slugRef = ref(database, `Slugs/${safeSiteId}`)
          
          try {
            const snap = await get(slugRef)
            if (snap.exists()) {
              setResolvedId(snap.val())
              setIsLoading(false)
              return true
            } else {
              const fullHostname = hostname.replace('www.', '')
              const safeKey = getSafeKey(fullHostname)
              const domainRef = ref(database, `Slugs/${safeKey}`)
              
              const dSnap = await get(domainRef)
              if (dSnap.exists()) {
                setResolvedId(dSnap.val())
                setIsLoading(false)
                return true
              }
            }
          } catch (e) {
            console.error("Resolution failed")
          }
        }
      }
      return false
    }

    const resolveAuthenticatedContext = async () => {
      // 1. Check Staff Manual Session
      const staffSessionStr = typeof window !== 'undefined' ? localStorage.getItem('staff_session') : null
      if (staffSessionStr) {
        try {
          const session = JSON.parse(staffSessionStr)
          setResolvedId(session.adminUid)
          setStaffId(session.staffId)
          setIsStaff(true)
          setIsBranch(false)
          setIsLoading(false)
          return true
        } catch (e) {}
      }

      // 2. Check Branch Manual Session
      const branchSessionStr = typeof window !== 'undefined' ? localStorage.getItem('branch_session') : null
      if (branchSessionStr) {
        try {
          const session = JSON.parse(branchSessionStr)
          setResolvedId(session.adminUid)
          setBranchId(session.branchId)
          setIsBranch(true)
          setIsStaff(false)
          setIsLoading(false)
          return true
        } catch (e) {}
      }

      // 3. Check Student Manual Session
      const studentSessionStr = typeof window !== 'undefined' ? localStorage.getItem('student_session') : null
      if (studentSessionStr) {
        try {
          const session = JSON.parse(studentSessionStr)
          setResolvedId(session.adminUid)
          setStaffId(session.studentId)
          setIsLoading(false)
          return true
        } catch (e) {}
      }

      // 4. Fallback to Firebase Auth
      if (user) {
        const profileRef = ref(database, `Institutes/${user.uid}/profile`)
        const snapshot = await get(profileRef)
        if (snapshot.exists()) {
          setResolvedId(user.uid)
          setStaffId(null)
          setBranchId(null)
          setIsStaff(false)
          setIsBranch(false)
          setIsLoading(false)
          return true
        } else {
          const instRef = ref(database, `Institutes`)
          const snap = await get(instRef)
          const institutes = snap.val() || {}
          let found = false
          Object.keys(institutes).forEach(id => {
            const adms = institutes[id].admissions || {}
            Object.keys(adms).forEach(aid => {
              if (adms[aid].email?.toLowerCase() === user.email?.toLowerCase()) {
                setResolvedId(id)
                setStaffId(aid)
                found = true
              }
            })
          })
          if (found) {
            setIsLoading(false)
            return true
          }
        }
      }
      return false
    }

    const runResolution = async () => {
      const visitorResolved = await resolveVisitorContext()
      if (!visitorResolved) {
        const authResolved = await resolveAuthenticatedContext()
        if (!authResolved) {
          const fallbackId = process.env.NEXT_PUBLIC_DB_ID || "FYQRMChCqPb64iM5hFvVlr2omyu2"
          setResolvedId(fallbackId)
        }
      }
      setIsLoading(false)
    }

    runResolution()
  }, [database, user, pathname])

  return { resolvedId, staffId, branchId, isStaff, isBranch, isLoading }
}
