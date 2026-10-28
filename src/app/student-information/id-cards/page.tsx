
"use client"

import { useState, useEffect, useMemo } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Search, 
  Printer, 
  Download, 
  Loader2, 
  Check, 
  ChevronLeft, 
  ChevronRight,
  ShieldCheck,
  School,
  ChevronDown
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue } from "firebase/database"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { toPng } from 'html-to-image'
import { format } from "date-fns"
import { usePathname } from "next/navigation"

const ID_FRAMES = [
  { id: 'frame1', name: 'NAVY PROFESSIONAL', primary: '#1e3a8a', secondary: '#ffffff', accent: '#1e3a8a' },
  { id: 'frame2', name: 'EMERALD ACADEMIC', primary: 'hsl(var(--primary))', secondary: '#ffffff', accent: 'hsl(var(--primary))' },
  { id: 'frame3', name: 'CLASSIC WHITE', primary: '#f4f4f5', secondary: '#000000', accent: '#1e3a8a' },
  { id: 'frame4', name: 'DARK ENTERPRISE', primary: '#18181b', secondary: '#ffffff', accent: '#fbbf24' },
]

export default function StudentIdCardsPage() {
  const pathname = usePathname()
  const isPortal = pathname.startsWith('/staff') || pathname.startsWith('/student') || pathname.startsWith('/branch')

  const { database } = useFirebase()
  const { user } = useUser()
  
  const [students, setStudents] = useState<any[]>([])
  const [batches, setBatches] = useState<any[]>([])
  const [selectedBatch, setSelectedBatch] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedFrame, setSelectedFrame] = useState(ID_FRAMES[1]) 
  const [instituteName, setInstituteName] = useState("Your Institute")
  const [instituteProfile, setInstituteProfile] = useState<any>(null)
  const [isDownloading, setIsDownloading] = useState<string | null>(null)
  
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    if (!database || !user) return
    const rootPath = `Institutes/${user.uid}`
    
    onValue(ref(database, `${rootPath}/admissions`), (s) => {
      const data = s.val()
      if (data) setStudents(Object.keys(data).map(k => ({ ...data[k], id: k })))
    })
    
    onValue(ref(database, `${rootPath}/batches`), (s) => {
      const data = s.val()
      if (data) setBatches(Object.keys(data).map(k => ({ ...data[k], id: k })))
    })
    
    onValue(ref(database, `${rootPath}/profile`), (s) => {
      const data = s.val()
      if (data) {
        setInstituteProfile(data)
        setInstituteName(data.instituteName || "Your Institute")
      }
    })
  }, [database, user])

  const filtered = useMemo(() => {
    return students.filter(s => {
      const matchBatch = selectedBatch === 'all' || s.course === selectedBatch
      const matchSearch = !searchTerm || 
        s.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.admissionNo?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      return matchBatch && matchSearch
    }).reverse()
  }, [students, selectedBatch, searchTerm])

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const handleDownloadPNG = async (student: any) => {
    const node = document.getElementById(`id-card-render-${student.id}`)
    if (!node) return

    setIsDownloading(student.id)
    try {
      node.style.display = 'flex'
      const dataUrl = await toPng(node, { 
        quality: 1.0, 
        pixelRatio: 3,
        width: 350,
        height: 550,
        skipFonts: true,
        cacheBust: true
      })
      node.style.display = 'none'
      
      const link = document.createElement('a')
      link.download = `ID_CARD_${student.studentName.replace(/\s+/g, '_')}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error(err)
    } finally {
      setIsDownloading(null)
    }
  }

  const mainContent = (
    <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-500 w-full overflow-x-hidden pb-32 font-public-sans text-black">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div>
          <h2 className="text-3xl font-black text-black tracking-tight font-public-sans">ID Card Studio</h2>
          <p className="text-[14px] text-black font-medium mt-1">Select a design frame and process student credentials</p>
        </div>
        <Button onClick={() => window.print()} className="bg-zinc-900 text-white rounded-xl h-11 px-8 font-bold text-[14px] flex items-center gap-2 print:hidden shadow-lg border-none active:scale-95 transition-all">
          <Printer className="h-4 w-4" /> Bulk Print All
        </Button>
      </div>

      <section className="space-y-6 print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {ID_FRAMES.map((frame) => (
            <div 
              key={frame.id} 
              onClick={() => setSelectedFrame(frame)}
              className={cn(
                "cursor-pointer group relative flex flex-col gap-4 p-4 rounded-[40px] border-2 transition-all bg-white",
                selectedFrame.id === frame.id ? "border-primary shadow-2xl scale-[1.02]" : "border-transparent hover:border-zinc-100"
              )}
            >
              <div className="aspect-[3/4.8] w-full rounded-[32px] overflow-hidden shadow-inner relative flex flex-col bg-white border border-zinc-100">
                <div className="h-[40%] w-full flex flex-col items-center justify-center p-4 text-center relative overflow-hidden" style={{ backgroundColor: frame.primary }}>
                   <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12" />
                   <div className="relative z-10 space-y-1">
                     <div className="text-[7px] font-black tracking-widest opacity-60" style={{ color: frame.secondary }}>{instituteName}</div>
                     <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center mx-auto mb-2">
                       <School className="w-4 h-4 opacity-40" style={{ color: frame.secondary }} />
                     </div>
                     <div className="text-[10px] font-black text-white tracking-tight">SAMPLE STUDENT</div>
                     <div className="text-[7px] font-bold text-white/60">Roll No: 101</div>
                   </div>
                </div>
                <div className="flex-1 p-6 space-y-3">
                   <div className="flex justify-between items-center text-[8px] font-bold"><span className="text-black">ADM NO.</span><span className="text-black">ADM-001</span></div>
                   <div className="flex justify-between items-center text-[8px] font-bold"><span className="text-black">CLASS</span><span className="text-black">SCIENCE</span></div>
                   <div className="flex justify-between items-center text-[8px] font-bold"><span className="text-black">BATCH</span><span className="text-black">MORNING</span></div>
                   <div className="flex justify-between items-center text-[8px] font-bold"><span className="text-black">VALIDITY</span><span className="text-black">2024-25</span></div>
                </div>
                <div className="h-2 w-full" style={{ backgroundColor: frame.primary }} />
              </div>
              <span className={cn(
                "text-[11px] font-black  tracking-[0.2em] text-center",
                selectedFrame.id === frame.id ? "text-primary" : "text-zinc-300"
              )}>{frame.name}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            <div className="relative group w-full md:w-80">
              <Search className="absolute left-4 top-3.5 h-4 w-4 text-zinc-300 group-focus-within:text-primary transition-colors" />
              <Input 
                value={searchTerm} 
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
                placeholder="Search name or ID..." 
                className="pl-12 h-12 rounded-xl border-zinc-200 bg-white shadow-sm text-[14px] font-bold" 
              />
            </div>
            <Select value={selectedBatch} onValueChange={(val) => { setSelectedBatch(val); setCurrentPage(1); }}>
              <SelectTrigger className="rounded-xl h-12 border-zinc-200 w-full md:w-64 bg-white font-bold text-black">
                <SelectValue placeholder="All Admissions" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-zinc-100 shadow-2xl">
                <SelectItem value="all" className="font-bold">All Admissions</SelectItem>
                {batches.map(b => <SelectItem key={b.id} value={b.courseName} className="font-bold">{b.batchName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card className="border border-zinc-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-zinc-50/50">
                <TableRow className="border-zinc-100">
                  <TableHead className="text-[11px] font-black text-black h-14 pl-10 w-20">#</TableHead>
                  <TableHead className="text-[11px] font-black text-black h-14">STUDENT IDENTITY</TableHead>
                  <TableHead className="text-[11px] font-black text-black h-14">ADM NO.</TableHead>
                  <TableHead className="text-[11px] font-black text-black h-14">COURSE / BATCH</TableHead>
                  <TableHead className="text-right pr-10 text-[11px] font-black text-black h-14">ACTION</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((s, idx) => (
                  <TableRow key={s.id} className="border-zinc-50 hover:bg-zinc-50/30 transition-none group">
                    <TableCell className="text-[14px] font-black text-black">
                      {(currentPage - 1) * itemsPerPage + idx + 1}
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10 border-2 border-white shadow-sm ring-1 ring-zinc-100">
                          <AvatarImage src={s.studentPhotoUrl} />
                          <AvatarFallback className="bg-zinc-100 text-black font-black text-[14px]">{s.studentName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-[14px] font-black text-black tracking-tight font-public-sans">{s.studentName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-[14px] font-bold text-black font-public-sans tracking-tighter">{s.admissionNo}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-[14px] font-bold text-black">{s.course}</span>
                        <span className="text-[10px] font-bold text-black tracking-widest">{s.batch || 'Regular'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-10">
                      <Button 
                        onClick={() => handleDownloadPNG(s)} 
                        disabled={isDownloading === s.id} 
                        className="bg-primary hover:opacity-90 text-white rounded-xl h-10 px-8 font-black text-[10px] tracking-widest shadow-lg border-none transition-all active:scale-95"
                      >
                        {isDownloading === s.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                        Download PNG
                      </Button>

                      {/* 💳 HIDDEN CAPTURE BLOCK */}
                      <div id={`id-card-render-${s.id}`} className="hidden w-[350px] h-[550px] bg-white flex-col relative shadow-none border border-zinc-100 overflow-hidden" style={{ display: 'none', fontFamily: 'sans-serif' }}>
                        <div className="h-[45%] w-full relative flex flex-col items-center justify-center pt-8 overflow-hidden" style={{ backgroundColor: selectedFrame.primary }}>
                           <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
                           <div className="absolute bottom-0 left-0 w-full h-24 bg-white" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
                           <div className="relative z-10 text-center space-y-1 mb-4 w-full px-6">
                             <h3 className="text-white font-black text-[14px] tracking-widest leading-tight truncate">{instituteName}</h3>
                             <p className="text-white/60 text-[9px] font-bold tracking-[0.3em]">STUDENT IDENTITY CARD</p>
                           </div>
                           <div className="relative z-20 mt-4">
                             <div className="w-32 h-32 rounded-full border-[6px] border-white shadow-2xl overflow-hidden bg-zinc-50 flex items-center justify-center">
                               {s.studentPhotoUrl ? (
                                 <img src={s.studentPhotoUrl} className="w-full h-full object-cover" alt="Student" />
                               ) : (
                                 <span className="text-4xl font-black text-zinc-200">{s.studentName?.charAt(0)}</span>
                               )}
                             </div>
                             <div className="absolute -bottom-2 right-2 bg-emerald-500 text-white p-1.5 rounded-lg shadow-lg border-2 border-white flex items-center justify-center">
                               <ShieldCheck className="w-4 h-4" />
                             </div>
                           </div>
                        </div>
                        <div className="flex-1 p-10 flex flex-col justify-between">
                          <div className="space-y-4">
                            <CardDetailRow label="ADM NO." value={s.admissionNo} />
                            <CardDetailRow label="ROLL NO." value={s.rollNo || '-'} />
                            <CardDetailRow label="STUDENT NAME" value={s.studentName} />
                            <CardDetailRow label="FATHER NAME" value={s.fatherName || '-'} />
                            <CardDetailRow label="CLASS / SEC" value={`${s.course} - ${s.section || 'A'}`} />
                            <CardDetailRow label="EMERGENCY" value={s.mobile || '-'} />
                          </div>
                          <div className="pt-6 border-t border-zinc-100 text-center">
                            <p className="text-[9px] font-bold text-black leading-relaxed max-w-[250px] mx-auto">
                              {instituteProfile?.address || 'Main Campus, Academic Block'}
                            </p>
                          </div>
                        </div>
                        <div className="h-2 w-full" style={{ backgroundColor: selectedFrame.primary }} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 pt-4 print:hidden">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
              disabled={currentPage === 1} 
              className="h-10 px-6 rounded-xl font-black text-[10px] tracking-widest transition-all"
            >
              <ChevronLeft className="w-4 h-4 mr-2" /> Previous
            </Button>
            <div className="flex items-center gap-2">
              {[...Array(totalPages)].map((_, i) => (
                <button 
                  key={i} 
                  onClick={() => setCurrentPage(i + 1)} 
                  className={cn(
                    "w-10 h-10 rounded-xl text-[10px] font-black transition-all border-2",
                    currentPage === i + 1 
                      ? "bg-zinc-900 border-zinc-900 text-white shadow-xl scale-110" 
                      : "bg-white border-zinc-100 text-black hover:bg-zinc-50"
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
              disabled={currentPage === totalPages} 
              className="h-10 px-6 rounded-xl font-black text-[10px] tracking-widest transition-all"
            >
              Next <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </main>
  )

  if (isPortal) return mainContent

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans text-black">
      <Sidebar />
      <div className="lg:pl-[300px] flex flex-col flex-1 min-w-0">
        <TopNav />
        {mainContent}
      </div>
    </div>
  )
}

function CardDetailRow({ label, value }: { label: string, value: string | number }) {
  return (
    <div className="flex items-baseline gap-4 group">
      <span className="text-[10px] font-bold text-black tracking-widest min-w-[110px]">{label}</span>
      <span className="text-[10px] text-black">:</span>
      <span className="text-[11px] font-black text-black tracking-tight flex-1 truncate">{value}</span>
    </div>
  )
}
