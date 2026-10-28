
"use client"

import { useState, useEffect } from "react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, off } from "firebase/database"
import { Cake, History } from "lucide-react"

export function BirthdayList() {
  const { database } = useFirebase()
  const { user } = useUser()
  const [birthdays, setBirthdays] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!database || !user) return
    const admRef = ref(database, `Institutes/${user.uid}/admissions`)
    
    const unsubscribe = onValue(admRef, (snapshot) => {
      const data = snapshot.val() || {}
      const today = new Date()
      const tDay = today.getDate()
      const tMonth = today.getMonth()

      const list = Object.values(data).filter((s: any) => {
        if (!s.dob) return false
        const dob = new Date(s.dob)
        // Check if birthday falls in current week
        return dob.getMonth() === tMonth && dob.getDate() >= tDay && dob.getDate() <= tDay + 7
      })
      
      setBirthdays(list)
      setIsLoading(false)
    })

    return () => off(admRef)
  }, [database, user])

  return (
    <div className="space-y-4">
      {birthdays.map((student, i) => (
        <div key={i} className="flex items-center gap-4 py-3 border-b border-zinc-50 last:border-0 group">
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 shadow-inner group-hover:scale-110 transition-transform">
            <Cake className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-black text-black tracking-tight truncate">{student.studentName}</p>
            <p className="text-[10px] font-bold text-black tracking-widest">on {student.dob ? student.dob.split('-')[2] : '-'}</p>
          </div>
        </div>
      ))}
      {!isLoading && birthdays.length === 0 && (
        <div className="py-8 text-center text-zinc-200 font-bold text-[10px] tracking-[0.2em] italic">No Birthdays This Week</div>
      )}
    </div>
  )
}
