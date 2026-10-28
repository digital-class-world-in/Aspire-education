  "use client"

  import { useState, useEffect } from "react"
  import { Card } from "@/components/ui/card"
  import { Button } from "@/components/ui/button"
  import { Input } from "@/components/ui/input"
  import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
  import { Badge } from "@/components/ui/badge"
  import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
  import { 
    Search, 
    Loader2,
    CheckCircle2,
    AlertCircle,
    ScanFace,
    ChevronLeft,
    ChevronRight,
    Trash2,
    ShieldAlert
  } from "lucide-react"
  import { useFirebase } from "@/firebase"
  import { ref, onValue, off, remove } from "firebase/database"
  import { format } from "date-fns"
  import { useResolvedId } from "@/hooks/use-resolved-id"
  import { toast } from "@/hooks/use-toast"
  import { cn } from "@/lib/utils"

  interface BiometricLog {
    id: string
    name: string
    identifier: string
    role: string
    time: string
    timestamp: string
    branchId: string
    photoUrl?: string
  }

  export function FaceRecords() {
    const { database } = useFirebase()
    const { resolvedId, branchId, isBranch } = useResolvedId()

    const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"))
    const [searchTerm, setSearchTerm] = useState("")
    
    const [logs, setLogs] = useState<BiometricLog[]>([])
    const [enrolledProfiles, setEnrolledProfiles] = useState<any[]>([])
    
    const [isLoading, setIsLoading] = useState(true)
    const [isProfilesLoading, setIsProfilesLoading] = useState(true)

    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 15
    
    const [activeTab, setActiveTab] = useState("logs")

    // Fetch Logs
    useEffect(() => {
      if (!database || !resolvedId) return
      setIsLoading(true)

      const logsRef = ref(database, `Institutes/${resolvedId}/face-attendance-logs/${selectedDate}`)
      
      const listener = onValue(logsRef, (snapshot) => {
        const data = snapshot.val()
        if (data) {
          let list = Object.keys(data).map(key => ({ ...data[key], id: key }))
          
          // If branch logged in, only show branch logs. If admin, show all
          if (isBranch && branchId) {
            list = list.filter(l => l.branchId === branchId)
          }
          
          // Sort by timestamp descending
          list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          setLogs(list)
        } else {
          setLogs([])
        }
        setIsLoading(false)
      })

      return () => off(logsRef, "value", listener)
    }, [database, resolvedId, selectedDate, isBranch, branchId])

    // Fetch Registered Profiles
    useEffect(() => {
      if (!database || !resolvedId) return
      setIsProfilesLoading(true)
      
      const profilesRef = ref(database, `Institutes/${resolvedId}/face-descriptors`)
      
      const listener = onValue(profilesRef, (snapshot) => {
        const data = snapshot.val()
        if (data) {
          setEnrolledProfiles(Object.keys(data).map(key => ({ ...data[key], id: key })))
        } else {
          setEnrolledProfiles([])
        }
        setIsProfilesLoading(false)
      })
      return () => off(profilesRef, "value", listener)
    }, [database, resolvedId])

    const handleResetProfile = async (id: string, name: string) => {
      if (!database || !resolvedId) return
      if (!window.confirm(`Are you sure you want to delete biometric data for ${name}? They will need to re-enroll.`)) return
      
      try {
        await remove(ref(database, `Institutes/${resolvedId}/face-descriptors/${id}`))
        toast({ title: "Profile Reset Successful", description: `${name}'s biometric profile was deleted.` })
      } catch (e) {
        toast({ variant: "destructive", title: "Action Failed", description: "Could not wipe biometric data." })
      }
    }

    const filteredLogs = logs.filter(l => 
      l.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      l.identifier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.role?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage)

    const filteredProfiles = enrolledProfiles.filter(p => 
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.identifier?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const totalRecords = logs.length
    const studentRecords = logs.filter(l => l.role === "Student").length
    const staffRecords = logs.filter(l => l.role === "Staff").length

    return (
      <div className="space-y-10 animate-in fade-in duration-500 w-full font-public-sans text-black">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
          <div>
            <h2 className="text-[26px] font-normal tracking-tight leading-none flex items-center gap-3">
              <ScanFace className="w-8 h-8 text-primary" />
              Biometric Engine
            </h2>
            <p className="text-[14px] text-black font-medium mt-1.5">Audit trail and profile management of automated face recognition attendance</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <SummaryCard title="Total Scans Today" value={totalRecords} icon={<ScanFace className="text-indigo-500" />} />
          <SummaryCard title="Student Scans" value={studentRecords} icon={<CheckCircle2 className="text-emerald-500" />} />
          <SummaryCard title="Staff Scans" value={staffRecords} icon={<CheckCircle2 className="text-blue-500" />} />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-white p-2 rounded-[24px] h-auto flex-wrap justify-start gap-2 shadow-sm border border-zinc-100">
            <TabsTrigger value="logs" className="h-11 px-6 text-[10px] font-black rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-xl transition-all">Audit Trail & Logs</TabsTrigger>
            <TabsTrigger value="profiles" className="h-11 px-6 text-[10px] font-black rounded-xl data-[state=active]:bg-zinc-900 data-[state=active]:text-white data-[state=active]:shadow-xl transition-all">Manage Registered Profiles</TabsTrigger>
          </TabsList>

          <div className="mt-8">
            <TabsContent value="logs" className="mt-0 space-y-6">
              <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-black tracking-widest ml-1">Log Date</label>
                    <Input type="date" value={selectedDate} onChange={(e) => { setSelectedDate(e.target.value); setCurrentPage(1); }} className="h-11 rounded-xl bg-zinc-50 border-none font-bold text-black" />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-black text-black tracking-widest ml-1">Search Records</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3.5 h-4 w-4 text-zinc-300" />
                      <Input 
                        placeholder="Search by name, ID, or role..." 
                        value={searchTerm} 
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
                        className="pl-10 h-11 rounded-xl bg-zinc-50 border-none font-bold text-black" 
                      />
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="border border-zinc-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
                <div className="overflow-x-auto scrollbar-thin">
                  <Table className="min-w-[1000px]">
                    <TableHeader className="bg-zinc-50/50">
                      <TableRow className="border-zinc-100 hover:bg-transparent">
                        <TableHead className="text-[13px] font-black text-black h-14 pl-10 w-20">#</TableHead>
                        <TableHead className="text-[13px] font-black text-black h-14">VERIFIED NAME</TableHead>
                        <TableHead className="text-[13px] font-black text-black h-14">ID / ROLL NO</TableHead>
                        <TableHead className="text-[13px] font-black text-black h-14">PROFILE TYPE</TableHead>
                        <TableHead className="text-[13px] font-black text-black h-14 text-right pr-10">LOG TIMESTAMP</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        [...Array(5)].map((_, i) => (<TableRow key={i}><TableCell colSpan={5} className="p-6"><div className="h-10 w-full bg-zinc-50 animate-pulse rounded-xl" /></TableCell></TableRow>))
                      ) : paginatedLogs.length > 0 ? (
                        paginatedLogs.map((log, index) => (
                          <TableRow key={log.id} className="border-zinc-50 hover:bg-zinc-50/50 transition-colors">
                            <TableCell className="text-[14px] font-bold text-black pl-10">{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {log.photoUrl ? (
                                  <img src={log.photoUrl} alt={log.name} className="w-8 h-8 rounded-full object-cover ring-1 ring-emerald-200 shadow-sm" />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm">
                                    <CheckCircle2 className="w-4 h-4" />
                                  </div>
                                )}
                                <span className="text-[14px] font-black text-black">{log.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-[14px] font-bold text-black font-public-sans tracking-tighter">{log.identifier}</TableCell>
                            <TableCell>
                              <Badge className={cn("text-[10px] font-black  tracking-widest px-3 py-1 border-none", log.role === "Student" ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600")}>
                                {log.role}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right pr-10">
                              <span className="text-[13px] font-bold text-black bg-zinc-50 px-3 py-1.5 rounded-xl border border-zinc-100">
                                {format(new Date(log.timestamp), "MMM dd, yyyy - hh:mm:ss a")}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="h-64 text-center">
                            <div className="flex flex-col items-center justify-center space-y-4">
                              <div className="p-6 rounded-[32px] bg-zinc-50"><AlertCircle className="h-10 w-10 text-zinc-300" /></div>
                              <p className="text-[14px] font-black text-black tracking-widest">No Biometric Logs Found</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 pt-4">
                  <Button variant="ghost" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-10 px-6 rounded-xl font-black text-[10px] tracking-widest"><ChevronLeft className="w-4 h-4 mr-2" /> Prev</Button>
                  <div className="flex gap-2 text-[14px] font-bold text-black">Page {currentPage} of {totalPages}</div>
                  <Button variant="ghost" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-10 px-6 rounded-xl font-black text-[10px] tracking-widest">Next <ChevronRight className="w-4 h-4 ml-2" /></Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="profiles" className="mt-0 space-y-6">
              <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white p-8">
                <div className="space-y-1.5 max-w-md">
                  <label className="text-[10px] font-black text-black tracking-widest ml-1">Search Database</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3.5 h-4 w-4 text-zinc-300" />
                    <Input 
                      placeholder="Search by profile name or System ID..." 
                      value={searchTerm} 
                      onChange={(e) => setSearchTerm(e.target.value)} 
                      className="pl-10 h-11 rounded-xl bg-zinc-50 border-none font-bold text-black" 
                    />
                  </div>
                </div>
              </Card>

              <Card className="border border-zinc-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
                <div className="overflow-x-auto scrollbar-thin">
                  <Table className="min-w-[1000px]">
                    <TableHeader className="bg-zinc-50/50">
                      <TableRow className="border-zinc-100 hover:bg-transparent">
                        <TableHead className="text-[13px] font-black text-black pl-10 h-14">PROFILE DETAILS</TableHead>
                        <TableHead className="text-[13px] font-black text-black h-14">SYSTEM ID</TableHead>
                        <TableHead className="text-[13px] font-black text-black h-14">ROLE</TableHead>
                        <TableHead className="text-[13px] font-black text-black h-14">LAST UPDATED</TableHead>
                        <TableHead className="text-[13px] font-black text-black text-right pr-10 h-14">ACTIONS</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isProfilesLoading ? (
                        [...Array(5)].map((_, i) => (<TableRow key={i}><TableCell colSpan={5} className="p-6"><div className="h-10 w-full bg-zinc-50 animate-pulse rounded-xl" /></TableCell></TableRow>))
                      ) : filteredProfiles.length > 0 ? (
                        filteredProfiles.map(p => (
                          <TableRow key={p.id} className="border-zinc-50 hover:bg-zinc-50/50 transition-colors">
                            <TableCell className="pl-10">
                              <div className="flex items-center gap-4">
                                {p.imageUrl ? (
                                  <img src={p.imageUrl} alt={p.name} className="w-10 h-10 rounded-xl object-cover shadow-sm ring-1 ring-zinc-200" />
                                ) : (
                                  <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center font-black text-black">{p.name?.charAt(0) || '?'}</div>
                                )}
                                <span className="text-[14px] font-black text-black">{p.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-public-sans text-black font-bold">{p.identifier}</TableCell>
                            <TableCell>
                              <Badge className={cn("text-[10px] font-black  tracking-widest px-3 py-1 border-none", p.role === "Student" ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600")}>
                                {p.role}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-black text-[14px] font-bold bg-zinc-50 px-3 py-1 rounded-xl mx-auto w-fit">
                              {p.updatedAt ? format(new Date(p.updatedAt), "MMM dd, yyyy") : '-'}
                            </TableCell>
                            <TableCell className="text-right pr-10">
                              <Button 
                                variant="ghost" 
                                onClick={() => handleResetProfile(p.id, p.name)}
                                className="h-9 px-4 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-600 font-black text-[10px] tracking-widest gap-2"
                              >
                                <Trash2 className="w-4 h-4" /> Revoke Face ID
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="h-64 text-center">
                            <div className="flex flex-col items-center justify-center space-y-4">
                              <div className="p-6 rounded-[32px] bg-zinc-50"><ShieldAlert className="h-10 w-10 text-zinc-300" /></div>
                              <p className="text-[14px] font-black text-black tracking-widest">No Biometric Profiles Enrolled</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    )
  }

  function SummaryCard({ title, value, icon }: { title: string, value: number | string, icon: React.ReactNode }) {
    return (
      <Card className="border border-zinc-100 shadow-sm rounded-[24px] p-6 bg-white flex items-center gap-5">
        <div className="w-12 h-12 bg-zinc-50 rounded-xl flex items-center justify-center shadow-inner">{icon}</div>
        <div>
          <p className="text-[10px] font-black text-black tracking-widest mb-0.5">{title}</p>
          <h3 className="text-3xl font-black text-black tracking-tight leading-none">{value}</h3>
        </div>
      </Card>
    )
  }
