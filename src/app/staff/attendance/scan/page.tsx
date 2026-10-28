"use client"
import { useState, useEffect } from "react"
import { BioScanner } from "@/components/BioScanner"

export default function StaffFaceScanPage() {
  const [sessionData, setSessionData] = useState<{ id: string, name: string } | null>(null)

  useEffect(() => {
    const sessionStr = typeof window !== 'undefined' ? localStorage.getItem('staff_session') : null
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr)
        if (session.staffId) {
          setSessionData({ 
            id: session.staffId, 
            name: session.staffName || session.staffId 
          })
        }
      } catch (e) {}
    }
  }, [])

  if (!sessionData) return <div className="p-8 text-center text-black font-bold animate-pulse">Initializing Biometric Credentials...</div>

  return (
    <main className="flex-1 p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-6">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-black">Attendance Scanner</h2>
          <p className="text-[14px] font-medium text-black mt-1">Look directly at the camera to log your daily presence.</p>
        </div>
        <BioScanner 
          role="Staff" 
          userId={sessionData.id} 
          userName={sessionData.name} 
          groupId="General"
        />
      </div>
    </main>
  )
}
