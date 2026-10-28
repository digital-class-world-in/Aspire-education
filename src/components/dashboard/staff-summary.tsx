
"use client"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Users, MoreHorizontal, History } from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, off } from "firebase/database"

export function StaffSummary() {
  const { database } = useFirebase()
  const { user } = useUser()
  const [staff, setStaff] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!database || !user) return
    const staffRef = ref(database, `Institutes/${user.uid}/employees`)
    
    const unsubscribe = onValue(staffRef, (snapshot) => {
      const data = snapshot.val() || {}
      setStaff(Object.keys(data).map(k => ({ ...data[k], id: k })).slice(0, 5))
      setIsLoading(false)
    })

    return () => off(staffRef)
  }, [database, user])

  return (
    <Card className="border-none shadow-sm bg-white rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Staff Directory
        </CardTitle>
        <button className="text-black hover:text-primary transition-colors border-none bg-transparent">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </CardHeader>
      <CardContent className="space-y-4">
        {staff.map((member) => (
          <div key={member.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 border-2 border-zinc-50">
                <AvatarFallback className="bg-primary/5 text-primary font-black text-[10px]">{member.firstName?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-[14px] font-bold text-black">{member.firstName} {member.lastName}</p>
                <p className="text-[10px] text-black font-bold tracking-widest">{member.designation}</p>
              </div>
            </div>
            <Badge className="bg-emerald-50 text-emerald-600 border-none text-[8px] font-black">Active</Badge>
          </div>
        ))}
        {!isLoading && staff.length === 0 && (
          <div className="py-10 text-center text-zinc-300 italic text-[14px] tracking-widest">No staff records found</div>
        )}
      </CardContent>
    </Card>
  )
}
