"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Award,
  Plus,
  Loader2,
  Download,
  Calendar,
  User,
  Search,
  CheckCircle2,
  X,
  Trash2,
  ArrowRight
} from "lucide-react"

import { useFirebase } from "@/firebase"
import { ref, onValue, off, push, set, remove } from "firebase/database"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { useResolvedId } from "@/hooks/use-resolved-id"
import { usePathname } from "next/navigation"

// PDF Generation
import jsPDF from "jspdf"
import html2canvas from "html2canvas"

// Certificate Template Component
import CertificateTemplate from "@/components/certificates/CertificateTemplate"

export default function CertificatesPage() {
  const pathname = usePathname()
  const isPortal = pathname.startsWith('/staff') || pathname.startsWith('/student') || pathname.startsWith('/branch')

  const { database } = useFirebase()
  const { resolvedId } = useResolvedId()
  const { toast } = useToast()

  const certRef = useRef<HTMLDivElement>(null)

  // Data States
  const [issuedCertificates, setIssuedCertificates] = useState<any[]>([])
  const [batches, setBatches] = useState<any[]>([])
  const [admissions, setAdmissions] = useState<any[]>([])
  const [instituteProfile, setInstituteProfile] = useState<any>(null)

  // UI States
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedCertForDownload, setSelectedCertForDownload] = useState<any>(null)
  const [customTemplate, setCustomTemplate] = useState<any>(null)

  const [formData, setFormData] = useState({
    batchId: "",
    studentId: "",
    academicYear: "2024-2025",
    courseName: "",
    fontFamily: "'Inter', sans-serif",
    baseFontSize: "Default"
  })

  // Fetch Data
  useEffect(() => {
    if (!database || !resolvedId) return

    const rootPath = `Institutes/${resolvedId}`

    onValue(ref(database, `${rootPath}/issued-certificates`), (s) => {
      const data = s.val() || {}
      setIssuedCertificates(Object.keys(data).map(k => ({ ...data[k], id: k })).reverse())
      setIsLoading(false)
    })

    onValue(ref(database, `${rootPath}/batches`), (s) => {
      const data = s.val() || {}
      setBatches(Object.keys(data).map(k => ({ ...data[k], id: k })))
    })

    onValue(ref(database, `${rootPath}/admissions`), (s) => {
      const data = s.val() || {}
      setAdmissions(Object.keys(data).map(k => ({ ...data[k], id: k })))
    })

    onValue(ref(database, `${rootPath}/profile`), (s) => {
      setInstituteProfile(s.val())
    })

    return () => {
      off(ref(database, `${rootPath}/issued-certificates`))
      off(ref(database, `${rootPath}/batches`))
      off(ref(database, `${rootPath}/admissions`))
      off(ref(database, `${rootPath}/profile`))
    }
  }, [database, resolvedId])

  // Fetch Custom Template if assigned
  useEffect(() => {
    if (!database || !instituteProfile?.certificateTemplateId) {
      setCustomTemplate(null)
      return
    }

    onValue(ref(database, `GlobalSettings/CustomCertificates/${instituteProfile.certificateTemplateId}`), (snapshot) => {
      setCustomTemplate(snapshot.val())
    })

    return () => off(ref(database, `GlobalSettings/CustomCertificates/${instituteProfile.certificateTemplateId}`))
  }, [database, instituteProfile?.certificateTemplateId])

  const filteredStudents = useMemo(() => {
    if (!formData.batchId) return []
    const selectedBatch = batches.find(b => b.id === formData.batchId)
    if (!selectedBatch) return []
    
    return admissions.filter(s => 
      s.batchId === formData.batchId || 
      (s.batch && s.batch === selectedBatch.batchName) ||
      (selectedBatch.assignedStudents && selectedBatch.assignedStudents[s.id])
    ).sort((a, b) => a.studentName.localeCompare(b.studentName))
  }, [admissions, formData.batchId, batches])

  useEffect(() => {
    if (formData.studentId) {
      const student = admissions.find(s => s.id === formData.studentId)
      if (student) {
        setFormData(prev => ({ ...prev, courseName: student.course || "Professional Training Course" }))
      }
    }
  }, [formData.studentId, admissions])

  // PDF Download Trigger from Table
  const handleDownloadPDF = async (cert: any) => {
    setSelectedCertForDownload(cert)
    setIsGenerating(true)

    // Delay to let template render
    setTimeout(async () => {
      try {
        if (!certRef.current) throw new Error("Template not found")
        
        const canvas = await html2canvas(certRef.current, {
          scale: 4,
          useCORS: true,
          backgroundColor: "#FDFBF7"
        })

        const imgData = canvas.toDataURL("image/png", 1.0)
        const pdf = new jsPDF({
          orientation: "landscape",
          unit: "mm",
          format: "a4"
        })

        pdf.addImage(imgData, "PNG", 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight())
        pdf.save(`Certificate_${cert.studentName.replace(/\s+/g, "_")}.pdf`)

        toast({ title: "Success", description: "Certificate downloaded!" })
      } catch (err) {
        toast({ variant: "destructive", title: "Error", description: "PDF generation failed." })
      } finally {
        setIsGenerating(false)
        setSelectedCertForDownload(null)
      }
    }, 2000)
  }

  // Handle Save (Add to Registry)
  const handleSubmitIssuance = async () => {
    if (!formData.studentId || !database || !resolvedId) return

    const student = admissions.find(s => s.id === formData.studentId)
    if (!student) return

    const certificateNo = `CERT-${Date.now().toString().slice(-8)}`
    const newRecord = {
      certificateNo,
      studentId: student.id,
      studentName: student.studentName,
      courseName: formData.courseName,
      academicYear: formData.academicYear,
      fontFamily: formData.fontFamily,
      baseFontSize: formData.baseFontSize,
      issuedAt: new Date().toISOString(),
      issueDate: format(new Date(), "yyyy-MM-dd")
    }

    const newRef = push(ref(database, `Institutes/${resolvedId}/issued-certificates`))
    await set(newRef, { ...newRecord, id: newRef.key })
    
    toast({ title: "Added to Registry", description: `${student.studentName}'s record has been created.` })
    setIsAddModalOpen(false)
    setFormData({ batchId: "", studentId: "", academicYear: "2024-2025", courseName: "", fontFamily: "'Inter', sans-serif", baseFontSize: "Default" })
  }

  const handleDelete = async (cert: any) => {
    if (!confirm("Remove this certificate record from the registry?")) return
    await remove(ref(database!, `Institutes/${resolvedId}/issued-certificates/${cert.id}`))
    toast({ title: "Record Deleted" })
  }

  const filteredHistory = issuedCertificates.filter(c =>
    c.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.certificateNo?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const mainContent = (
    <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-700 font-public-sans">
      
      {/* Header with Title and Add Button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-violet-200">
                <Award className="w-6 h-6" />
             </div>
             <h1 className="text-3xl font-black tracking-tight text-zinc-900">Certificate Studio</h1>
          </div>
          <p className="text-zinc-500 font-medium text-[15px] ml-1">Manage and issue high-fidelity training credentials</p>
        </div>

        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button className="h-14 px-10 bg-black hover:bg-zinc-800 text-white rounded-[22px] font-black tracking-widest shadow-xl flex items-center gap-3 active:scale-95 transition-all outline-none border-none">
              <Plus className="w-5 h-5" />
              ADD NEW CERTIFICATE
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl p-0 border-none rounded-[40px] overflow-hidden bg-white shadow-2xl">
            <div className="bg-zinc-900 p-10 text-white">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black tracking-tight">Issue New Credential</DialogTitle>
                <div className="text-zinc-400 text-sm mt-1">Select participant and verify details to generate</div>
              </DialogHeader>
            </div>
            
            <div className="p-10 space-y-8">
               <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Select Batch</Label>
                    <Select value={formData.batchId} onValueChange={(v) => setFormData({...formData, batchId: v, studentId: ""})}>
                      <SelectTrigger className="h-14 rounded-2xl border-zinc-100 bg-zinc-50/50 font-bold text-[15px]">
                        <SelectValue placeholder="Choose a batch" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl shadow-2xl">
                        {batches.map(b => <SelectItem key={b.id} value={b.id} className="font-bold">{b.batchName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Select Student</Label>
                    <Select value={formData.studentId} onValueChange={(v) => setFormData({...formData, studentId: v})} disabled={!formData.batchId}>
                      <SelectTrigger className="h-14 rounded-2xl border-zinc-100 bg-zinc-50/50 font-bold text-[15px]">
                        <SelectValue placeholder="Choose student" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl shadow-2xl max-h-80">
                        {filteredStudents.map(s => <SelectItem key={s.id} value={s.id} className="font-bold">{s.studentName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.studentId && (
                    <div className="space-y-6 animate-in slide-in-from-top-2 duration-300">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Course Title</Label>
                        <Input value={formData.courseName} onChange={(e) => setFormData({...formData, courseName: e.target.value})} className="h-14 rounded-2xl border-zinc-100 font-bold" />
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Academic Year</Label>
                            <Select value={formData.academicYear} onValueChange={(v) => setFormData({...formData, academicYear: v})}>
                            <SelectTrigger className="h-14 rounded-2xl border-zinc-100 bg-zinc-50/50 font-bold">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl shadow-2xl">
                                <SelectItem value="2023-2024" className="font-bold">2023 - 2024</SelectItem>
                                <SelectItem value="2024-2025" className="font-bold">2024 - 2025</SelectItem>
                                <SelectItem value="2025-2026" className="font-bold">2025 - 2026</SelectItem>
                            </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Font Style</Label>
                            <Select value={formData.fontFamily} onValueChange={(v) => setFormData({...formData, fontFamily: v})}>
                            <SelectTrigger className="h-14 rounded-2xl border-zinc-100 bg-zinc-50/50 font-bold overflow-hidden text-ellipsis whitespace-nowrap">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl shadow-2xl">
                                <SelectItem value="'Inter', sans-serif" className="font-bold">Modern (Inter)</SelectItem>
                                <SelectItem value="'Playfair Display', serif" className="font-bold" style={{fontFamily: "'Playfair Display', serif"}}>Elegant (Playfair)</SelectItem>
                                <SelectItem value="'Great Vibes', cursive" className="font-bold text-lg" style={{fontFamily: "'Great Vibes', cursive"}}>Classic (Great Vibes)</SelectItem>
                                <SelectItem value="'Cormorant Garamond', serif" className="font-bold" style={{fontFamily: "'Cormorant Garamond', serif"}}>Vintage (Cormorant)</SelectItem>
                                <SelectItem value="'Montserrat', sans-serif" className="font-bold" style={{fontFamily: "'Montserrat', sans-serif"}}>Clean (Montserrat)</SelectItem>
                                <SelectItem value="'Dancing Script', cursive" className="font-bold text-lg" style={{fontFamily: "'Dancing Script', cursive"}}>Casual (Dancing)</SelectItem>
                            </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Font Size</Label>
                            <Select value={formData.baseFontSize} onValueChange={(v) => setFormData({...formData, baseFontSize: v})}>
                            <SelectTrigger className="h-14 rounded-2xl border-zinc-100 bg-zinc-50/50 font-bold overflow-hidden text-ellipsis whitespace-nowrap">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl shadow-2xl">
                                <SelectItem value="Default" className="font-bold text-zinc-500">Template Default</SelectItem>
                                <SelectItem value="16px" className="font-bold">Small (16px)</SelectItem>
                                <SelectItem value="24px" className="font-bold">Medium (24px)</SelectItem>
                                <SelectItem value="36px" className="font-bold">Large (36px)</SelectItem>
                                <SelectItem value="48px" className="font-bold">X-Large (48px)</SelectItem>
                                <SelectItem value="64px" className="font-bold">Huge (64px)</SelectItem>
                                <SelectItem value="80px" className="font-bold">Giant (80px)</SelectItem>
                            </SelectContent>
                            </Select>
                        </div>
                      </div>
                    </div>
                  )}
               </div>

               <div className="flex gap-4 pt-4">
                  <DialogClose asChild>
                    <Button variant="outline" className="flex-1 h-14 rounded-[20px] font-black text-zinc-400 uppercase tracking-widest border-zinc-100">Cancel</Button>
                  </DialogClose>
                  <Button 
                    onClick={handleSubmitIssuance} 
                    disabled={!formData.studentId}
                    className="flex-[2] h-14 bg-violet-600 hover:bg-violet-700 text-white rounded-[20px] font-black tracking-[0.25em] shadow-xl"
                  >
                    SUBMIT & SAVE
                  </Button>
               </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Registry / Table Section */}
      <Card className="rounded-[40px] border-none shadow-[0_20px_60px_rgba(0,0,0,0.03)] bg-white overflow-hidden">
        <div className="p-8 border-b border-zinc-50 flex flex-col md:flex-row justify-between items-center gap-6">
           <h2 className="text-xl font-black tracking-tight text-zinc-800">Credential Registry</h2>
           <div className="relative w-full md:w-96 group">
              <Search className="absolute left-4 top-3.5 w-4 h-4 text-zinc-300 group-focus-within:text-violet-600 transition-colors" />
              <Input 
                placeholder="Search by participant or ID..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 bg-zinc-50/50 border-none rounded-2xl font-bold placeholder:text-zinc-300 focus-visible:ring-1" 
              />
           </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
             <TableHeader className="bg-zinc-50/30">
               <TableRow className="border-zinc-50">
                 <TableHead className="pl-10 h-16 text-[11px] font-black text-zinc-400 uppercase tracking-widest">Record #</TableHead>
                 <TableHead className="h-16 text-[11px] font-black text-zinc-400 uppercase tracking-widest">Participant</TableHead>
                 <TableHead className="h-16 text-[11px] font-black text-zinc-400 uppercase tracking-widest">Professional Course</TableHead>
                 <TableHead className="h-16 text-[11px] font-black text-zinc-400 uppercase tracking-widest">Year</TableHead>
                 <TableHead className="h-16 text-right pr-10 text-[11px] font-black text-zinc-400 uppercase tracking-widest">Download</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               {isLoading ? (
                 <TableRow><TableCell colSpan={5} className="py-32 text-center text-zinc-300 font-bold animate-pulse">Synchronizing archives...</TableCell></TableRow>
               ) : filteredHistory.length > 0 ? (
                 filteredHistory.map(cert => (
                   <TableRow key={cert.id} className="group border-zinc-50/50 hover:bg-zinc-50/50 transition-colors">
                     <TableCell className="pl-10 font-mono font-bold text-zinc-400 text-[13px]">{cert.certificateNo}</TableCell>
                     <TableCell>
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-black">
                              {cert.studentName?.charAt(0)}
                           </div>
                           <div className="font-black text-[15px]">{cert.studentName}</div>
                        </div>
                     </TableCell>
                     <TableCell className="font-bold text-zinc-600">{cert.courseName}</TableCell>
                     <TableCell>
                        <Badge className="bg-zinc-100 text-zinc-600 font-black rounded-lg border-none shadow-none">{cert.academicYear}</Badge>
                     </TableCell>
                     <TableCell className="text-right pr-10">
                        <div className="flex items-center justify-end gap-2">
                           <Button 
                             onClick={() => handleDownloadPDF(cert)}
                             disabled={isGenerating}
                             className="h-11 w-11 p-0 bg-violet-600/10 hover:bg-violet-600 text-violet-600 hover:text-white rounded-xl shadow-none border-none transition-all active:scale-95"
                           >
                             {isGenerating && selectedCertForDownload?.id === cert.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                           </Button>
                           <Button 
                             onClick={() => handleDelete(cert)}
                             className="h-11 w-11 p-0 bg-rose-50 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl shadow-none border-none transition-all active:scale-95 opacity-0 group-hover:opacity-100"
                           >
                             <Trash2 className="w-4 h-4" />
                           </Button>
                        </div>
                     </TableCell>
                   </TableRow>
                 ))
               ) : (
                 <TableRow><TableCell colSpan={5} className="py-40 text-center font-bold text-zinc-300 italic">No records found in registry.</TableCell></TableRow>
               )}
             </TableBody>
          </Table>
        </div>
      </Card>

      {/* Hidden Captured View (Matching Vintage Design) */}
      <div className="fixed -left-[4000px] -top-[4000px]">
         {selectedCertForDownload && (
            <div ref={certRef}>
              <CertificateTemplate 
                studentName={selectedCertForDownload.studentName}
                achievementTitle={`For Outstanding Academic Achievement in ${selectedCertForDownload.courseName || "Studies"}.`}
                academicYear={selectedCertForDownload.academicYear}
                instituteName={instituteProfile?.instituteName || "Your Institute"}
                certificateNo={selectedCertForDownload.certificateNo}
                config={customTemplate}
                fontFamily={selectedCertForDownload.fontFamily || "'Inter', sans-serif"}
                baseFontSize={selectedCertForDownload.baseFontSize || "Default"}
              />
            </div>
         )}
      </div>

    </main>
  )

  if (isPortal) return mainContent

  return (
    <div className="min-h-screen bg-[#FDFCFB] flex font-public-sans text-black">
      <Sidebar />
      <div className={cn("flex flex-col flex-1 min-w-0", !isPortal && "lg:pl-[300px]")}>
        <TopNav />
        {mainContent}
      </div>
    </div>
  )
}