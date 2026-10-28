"use client"
import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
const FaceSetup = dynamic(() => import("@/components/FaceSetup").then(mod => mod.FaceSetup), { ssr: false })

export default function StudentFaceSetupPage() {
  const [sessionData, setSessionData] = useState<{ id: string, name: string } | null>(null)

  useEffect(() => {
    const sessionStr = typeof window !== 'undefined' ? localStorage.getItem('student_session') : null
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr)
        if (session.studentId) {
          setSessionData({ 
            id: session.studentId, 
            name: session.studentName || session.studentId 
          })
        }
      } catch (e) {}
    }
  }, [])

  if (!sessionData) return <div className="p-8 text-center text-black font-bold animate-pulse">Initializing Biometric Credentials...</div>

  return (
    <main className="flex-1 p-4 md:p-8">
      <FaceSetup 
        defaultRole="Student" 
        defaultId={sessionData.id} 
        defaultName={sessionData.name} 
        autoSkipLogin={true} 
      />
    </main>
  )
}
