"use client"

import { useState, useEffect } from "react"
import { useFirebase } from "@/firebase"
import { ref, onValue } from "firebase/database"
import { usePathname } from "next/navigation"
import { useResolvedId } from "@/hooks/use-resolved-id"
import { hexToHslValues } from "@/lib/theme-utils"

/**
 * BrandingManager handles real-time synchronization of:
 * 1. Page Title & Favicon
 * 2. CSS Variables (Primary color, Font family)
 * 
 * Consolidating these avoids duplicate Firebase listeners on the same path.
 */
export function BrandingManager() {
  const { database } = useFirebase()
  const { resolvedId } = useResolvedId()
  const pathname = usePathname()
  const [profile, setProfile] = useState<any>(null)

  // Single listener for profile data
  useEffect(() => {
    if (!database || !resolvedId) return

    const profileRef = ref(database, `Institutes/${resolvedId}/profile`)
    
    // Subscribe once
    const unsubscribe = onValue(profileRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setProfile(data)
        
        // 1. Apply Theme Variables immediately on data change
        if (data.themeColor) {
          const hslValues = hexToHslValues(data.themeColor)
          document.documentElement.style.setProperty('--primary', hslValues)
          document.documentElement.style.setProperty('--ring', hslValues)
          document.documentElement.style.setProperty('--chart-1', hslValues)
        }

        if (data.fontFamily) {
          document.documentElement.style.setProperty('--font-dynamic', `'${data.fontFamily}', sans-serif`)
          
          // Dynamically load the requested font if not already present
          const fontId = `dynamic-font-${data.fontFamily.replace(/\s+/g, '-').toLowerCase()}`
          if (!document.getElementById(fontId)) {
            const link = document.createElement('link')
            link.id = fontId
            link.rel = 'stylesheet'
            link.href = `https://fonts.googleapis.com/css2?family=${data.fontFamily.replace(/\s+/g, '+')}:wght@300;400;500;600;700;800;900&display=swap`
            document.head.appendChild(link)
          }
        }
      }
    }, (error) => {
      console.error("BrandingManager listener error:", error)
    })

    return () => unsubscribe()
  }, [database, resolvedId])

  // UI side effects (Title & Favicon) triggered by profile OR navigation
  useEffect(() => {
    if (!profile) return

    const instituteName = process.env.NEXT_PUBLIC_INSTITUTE_NAME || profile.instituteName || "Academic Portal"
    const logoUrl = process.env.NEXT_PUBLIC_LOGO_URL || profile.logoUrl || ""
    const pageName = getPageTitle(pathname)
    
    if (typeof document !== 'undefined') {
      document.title = `${pageName} - ${instituteName}`

      if (logoUrl) {
        const iconLinks = document.querySelectorAll("link[rel~='icon'], link[rel='apple-touch-icon']")
        iconLinks.forEach((link: any) => {
          link.href = logoUrl
        })
      }
    }
  }, [profile, pathname])

  return null
}

function getPageTitle(path: string): string {
  if (path === "/" || path === "/student/dashboard" || path === "/staff/dashboard" || path === "/branch/dashboard" || path === "/super/dashboard") {
    return "Dashboard"
  }
  const parts = path.split('/').filter(Boolean)
  const lastPart = parts[parts.length - 1] || "Home"
  return lastPart.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}
