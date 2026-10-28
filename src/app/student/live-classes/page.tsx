
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Video, 
  Clock, 
  Calendar, 
  ExternalLink, 
  MonitorPlay,
  History,
  ShieldCheck,
  Info
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, off } from "firebase/database"
import { useResolvedId } from "@/hooks/use-resolved-id"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"

export default function StudentLiveClassesPage() {
  const { toast } = useToast()
  const { database } = useFirebase()
  const { user } = useUser()
  const { resolvedId, staffId: studentId, isLoading: idLoading } = useResolvedId()
  
  const [student, setStudent] = useState<any>(null)
  const [classes, setClasses] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const sessionStr = typeof window !== 'undefined' ? localStorage.getItem('student_session') : null
    const session = sessionStr ? JSON.parse(sessionStr) : null
    const currentResolvedId = resolvedId || session?.adminUid
    const currentStudentId = studentId || session?.studentId

    if (!database || !currentResolvedId || !currentStudentId) {
      if (!idLoading && !currentStudentId) setIsLoading(false)
      return
    }

    const rootPath = `Institutes/${currentResolvedId}`
    
    // 1. Fetch Student Profile to get Batch Assignment
    const studentRef = ref(database, `${rootPath}/admissions/${currentStudentId}`)
    onValue(studentRef, (snapshot) => {
      const studentData = snapshot.val()
      if (studentData) {
        setStudent({ ...studentData, id: currentStudentId })
        
        // 2. Fetch Live Classes and filter precisely by Batch
        onValue(ref(database, `${rootPath}/live-classes`), (s) => {
          const data = s.val() || {}
          const list = Object.keys(data).map(k => ({ ...data[k], id: k }))
          
          // BRANCH & BATCH-WISE FILTERING
          const filtered = list.filter((c: any) => {
            const sBatch = (studentData.batch || "").trim().toLowerCase();
            const cBatch = (c.targetBatch || "").trim().toLowerCase();
            const sCourse = (studentData.course || "").trim().toLowerCase();
            const cClass = (c.targetClass || "").trim().toLowerCase();
            const sSection = (studentData.section || "A").trim().toLowerCase();
            const cSection = (c.targetSection || "A").trim().toLowerCase();

            const matchesBatch = (cBatch === sBatch && sBatch !== "") || 
                               (cClass === sCourse && cSection === sSection && sCourse !== "");
            
            const matchesBranch = !c.branchId || 
                                 c.branchId === "null" || 
                                 c.branchId === studentData.branchId;
                                 
            return matchesBatch && matchesBranch;
          })
          
          setClasses(filtered.sort((a: any, b: any) => new Date(b.date + ' ' + b.time).getTime() - new Date(a.date + ' ' + a.time).getTime()))
        })
      }
      setIsLoading(false)
    })

    return () => off(studentRef)
  }, [database, resolvedId, studentId, idLoading])

  const handleJoinClass = (c: any) => {
    if (!c.meetingUrl) {
      toast({ variant: "destructive", title: "Missing Link", description: "The instructor has not provided a join URL." })
      return
    }
    window.open(c.meetingUrl, '_blank')
  }

  if (isLoading || idLoading) return <div className="p-20 text-center font-black text-zinc-300 animate-pulse">Establishing Secure Stream...</div>
  
  const todayStr = format(new Date(), "yyyy-MM-dd")

  return (
    <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-700 max-w-7xl mx-auto pb-32 font-public-sans text-black">
      
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 px-2">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-black tracking-tight">Live Classrooms</h2>
          <p className="text-[14px] text-black font-medium">Assigned Sessions for {student?.batch || student?.course || 'Regular Batch'}</p>
        </div>
        <Badge className="bg-emerald-50 text-emerald-600 border-none px-4 py-1.5 rounded-xl font-black text-[10px] tracking-widest">
          {classes.filter(c => c.date === todayStr).length} Sessions Today
        </Badge>
      </div>

      <Card className="border border-zinc-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
        <div className="p-8 border-b border-zinc-50 flex items-center justify-between">
          <h3 className="font-black text-black text-[10px] tracking-[0.2em]">Academic Stream Registry</h3>
          <ShieldCheck className="w-4 h-4 text-zinc-200" />
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <Table className="min-w-[1400px]">
            <TableHeader className="bg-zinc-50/50">
              <TableRow className="border-zinc-100">
                <TableHead className="pl-10 text-[11px] font-bold text-black h-14 w-20">SR NO</TableHead>
                <TableHead className="text-[11px] font-bold text-black h-14">TOPIC / SUBJECT</TableHead>
                <TableHead className="text-[11px] font-bold text-black h-14">SCHEDULE</TableHead>
                <TableHead className="text-[11px] font-bold text-black h-14 text-center">DURATION</TableHead>
                <TableHead className="text-[11px] font-bold text-black h-14">PLATFORM</TableHead>
                <TableHead className="text-right pr-10 text-[11px] font-bold text-black h-14">ACTION</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes.map((row, index) => {
                const isToday = row.date === todayStr
                const isUpcoming = new Date(row.date) >= new Date(todayStr)
                return (
                  <TableRow key={row.id} className="border-zinc-50 hover:bg-zinc-50/30 transition-none group">
                    <TableCell className="pl-10 text-[14px] font-bold text-zinc-300">
                      {index + 1}
                    </TableCell>
                    <TableCell className="py-6">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shadow-inner transition-transform group-hover:scale-110",
                          isToday ? "bg-primary text-white" : "bg-zinc-50 text-zinc-300"
                        )}>
                          <Video className="w-5 h-5" />
                        </div>
                        <span className="text-[14px] font-bold text-black tracking-tight">{row.topic}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-[14px] font-bold text-black font-public-sans">{row.date}</span>
                        <span className="text-[10px] font-black text-primary tracking-widest">{row.time}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-bold text-black text-[14px]">
                      {row.duration} Mins
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="rounded-lg border-zinc-100 text-black font-bold text-[9px]">
                        {row.platform}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-10">
                      {(isToday || isUpcoming) ? (
                        <Button 
                          onClick={() => handleJoinClass(row)}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-10 px-6 font-black text-[10px] tracking-widest shadow-lg active:scale-95 border-none"
                        >
                          Join Class
                        </Button>
                      ) : (
                        <Badge className="bg-zinc-50 text-zinc-300 border-none text-[9px] font-black px-3">Completed</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
              {classes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="w-16 h-16 rounded-[24px] bg-zinc-50 flex items-center justify-center text-zinc-200 shadow-inner">
                        <MonitorPlay className="w-8 h-8" />
                      </div>
                      <p className="text-[14px] font-bold text-black tracking-widest">No classes assigned to your batch</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </main>
  )
}
