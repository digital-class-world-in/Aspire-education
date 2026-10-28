"use client"

import { useState, useEffect } from "react"
import { useFirebase } from "@/firebase"
import { ref, onValue, off, get, DatabaseReference } from "firebase/database"

const refsCache: Record<string, DatabaseReference> = {};
function getCachedRef(database: any, path: string) {
  if (!refsCache[path]) {
    refsCache[path] = ref(database, path);
  }
  return refsCache[path];
}

export function useInstituteData(overrideUid?: string) {
  const defaultUid = "FYQRMChCqPb64iM5hFvVlr2omyu2"
  const defaultSlug = "aspire-education-1rbp"
  const slug = process.env.NEXT_PUBLIC_DB_SLUG || process.env.NEXT_PUBLIC_DB_ID || defaultSlug
  const { database, resolvedAdminId } = useFirebase()

  const [resolvedUid, setResolvedUid] = useState<string | null>(overrideUid || null)
  const [profile, setProfile] = useState<any>(null)
  const [settings, setSettings] = useState<any>(null)
  const [courses, setCourses] = useState<any[]>([])
  const [blogs, setBlogs] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!database) return

    // 0. If overrideUid is provided, use it directly
    if (overrideUid) {
      setResolvedUid(overrideUid)
      return
    }

    // 1. If user is logged in (Admin, Staff, or Student), always preview their institute
    if (resolvedAdminId) {
      setResolvedUid(resolvedAdminId)
      return
    }

    // 2. Otherwise, attempt URL-based multitenancy or environment fallback
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname
      const erpDomains = ['erp.digitalclassworld.in', 'localhost', '127.0.0.1']
      const isCentralHub = erpDomains.some(d => hostname === d || hostname.includes('webstation-'))

      if (!isCentralHub) {
        const fullHostname = hostname.replace('www.', '')
        const safeKey = fullHostname.replace(/\./g, '_')
        
        get(ref(database, `Slugs/${safeKey}`)).then(domainSnap => {
          if (domainSnap.exists() && domainSnap.val()) {
            setResolvedUid(domainSnap.val())
          } else {
            const slugPart = fullHostname.split('.')[0]
            get(ref(database, `Slugs/${slugPart}`)).then(slugSnap => {
              if (slugSnap.exists() && slugSnap.val()) {
                setResolvedUid(slugSnap.val())
              } else {
                get(ref(database, `Slugs/${slug}`)).then(snap => setResolvedUid(snap.val() || process.env.NEXT_PUBLIC_DB_ID || defaultUid)).catch(() => setResolvedUid(process.env.NEXT_PUBLIC_DB_ID || defaultUid))
              }
            }).catch(() => setResolvedUid(process.env.NEXT_PUBLIC_DB_ID || defaultUid))
          }
        }).catch(() => setResolvedUid(process.env.NEXT_PUBLIC_DB_ID || defaultUid))
        return
      }
    }

    // 3. Ultimate Fallback to basic environment variables
    get(ref(database, `Slugs/${slug}`))
      .then((snapshot) => setResolvedUid(snapshot.val() || process.env.NEXT_PUBLIC_DB_ID || defaultUid))
      .catch(() => setResolvedUid(process.env.NEXT_PUBLIC_DB_ID || defaultUid))
  }, [database, slug, resolvedAdminId])

  useEffect(() => {
    if (!database || !resolvedUid) return

    const rootPath = `Institutes/${resolvedUid}`
    const safetyTimer = setTimeout(() => {
      setIsLoading(false)
    }, 2000)
    const unsubs: Array<() => void> = []

    unsubs.push(onValue(getCachedRef(database, `${rootPath}/profile`), (snap) => {
      if (snap.exists()) setProfile(snap.val())
    }))

    unsubs.push(onValue(getCachedRef(database, `${rootPath}/website_settings`), (snap) => {
      if (snap.exists()) setSettings(snap.val())
      setIsLoading(false)
    }))

    unsubs.push(onValue(getCachedRef(database, `${rootPath}/website_courses`), (snap) => {
      const data = snap.val() || {}
      const list = Object.entries(data).map(([id, val]: [string, any]) => ({ ...val, id }))
        .filter(c => c.status !== 'Draft')
      setCourses(list)
    }))

    unsubs.push(onValue(getCachedRef(database, `${rootPath}/website_blogs`), (snap) => {
      const data = snap.val() || {}
      const list = Object.entries(data).map(([id, val]: [string, any]) => ({ ...val, id }))
      setBlogs(list)
    }))

    unsubs.push(onValue(getCachedRef(database, `${rootPath}/branches`), (snap) => {
      const data = snap.val() || {}
      const list = Object.entries(data).map(([id, val]: [string, any]) => ({ ...val, id }))
      setBranches(list)
    }))

    return () => {
      clearTimeout(safetyTimer)
      unsubs.forEach(fn => fn())
    }
  }, [database, resolvedUid])

  const publicContact = {
    phone: profile?.contactPhone || profile?.phone || settings?.contact?.phone || "",
    email: profile?.contactEmail || profile?.email || settings?.contact?.email || "",
    address: profile?.address || settings?.contact?.address || ""
  }

  return {
    profile,
    settings,
    courses,
    blogs,
    branches,
    isLoading,
    resolvedUid,
    publicContact,
    instituteName: profile?.instituteName || "Our Institute"
  }
}
