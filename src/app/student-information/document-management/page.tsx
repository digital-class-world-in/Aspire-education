
"use client"

import { useState, useEffect, useMemo } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  FileUp, 
  Search, 
  Trash2, 
  Eye, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  FileText,
  Loader2,
  Clock,
  User,
  ShieldCheck
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, push, set, remove, off, update } from "firebase/database"
import { uploadFileToImageKit, deleteFileFromImageKit } from "@/lib/imagekit"
import { ref as storageRef, deleteObject } from "firebase/storage"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { usePathname } from "next/navigation"

const REQUIRED_DOCUMENTS = [
  "Aadhar Card",
  "Passport Photo",
  "10th Marksheet",
  "12th Marksheet",
  "Leaving Certificate",
  "Address Proof"
]

export default function DocumentManagementPage() {
  const pathname = usePathname()
  // Robust portal check to avoid catching admin routes like /student-information
  const isPortal = (pathname.startsWith('/branch') && !pathname.startsWith('/branch-management')) || 
                   pathname.startsWith('/staff') || 
                   (pathname.startsWith('/student') && !pathname.startsWith('/student-information'))

  const [selectedStudentId, setSelectedStudentId] = useState<string>("")
  const [students, setStudents] = useState<any[]>([])
  const [uploadedDocs, setUploadedDocs] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isUploading, setIsUploadLoading] = useState(false)
  
  const { database, storage } = useFirebase()
  const { user } = useUser()

  useEffect(() => {
    if (!database || !user) return
    const studentsRef = ref(database, `Institutes/${user.uid}/admissions`)
    const unsubscribe = onValue(studentsRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setStudents(Object.keys(data).map(key => ({ ...data[key], id: key })))
      } else {
        setStudents([])
      }
      setIsLoading(false)
    })
    return () => off(studentsRef)
  }, [database, user])

  useEffect(() => {
    if (!database || !user || !selectedStudentId) {
      setUploadedDocs([])
      return
    }
    const docsRef = ref(database, `Institutes/${user.uid}/student-documents/${selectedStudentId}`)
    const unsubscribe = onValue(docsRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setUploadedDocs(Object.keys(data).map(key => ({ ...data[key], id: key })))
      } else {
        setUploadedDocs([])
      }
    })
    return () => off(docsRef)
  }, [database, user, selectedStudentId])

  const selectedStudent = useMemo(() => 
    students.find(s => s.id === selectedStudentId), 
  [students, selectedStudentId])

  const missingDocuments = useMemo(() => {
    const uploadedNames = uploadedDocs.map(d => d.documentName)
    return REQUIRED_DOCUMENTS.filter(name => !uploadedNames.includes(name))
  }, [uploadedDocs])

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!user || !selectedStudentId) return

    setIsUploadLoading(true)
    const formData = new FormData(e.currentTarget)
    const file = formData.get("file") as File
    const docName = formData.get("docName") as string
    const remarks = formData.get("remarks") as string

    try {
      const res = await uploadFileToImageKit(file, `/student-documents/${selectedStudentId}`)
      const downloadUrl = res.url

      const docData = {
        documentName: docName,
        fileName: res.name || file.name,
        fileType: file.type,
        fileUrl: downloadUrl,
        fileId: res.fileId || "",
        uploadedDate: new Date().toISOString(),
        status: "Pending",
        remarks: remarks || "",
        uploadedBy: user.email
      }

      await set(push(ref(database, `Institutes/${user.uid}/student-documents/${selectedStudentId}`)), docData)
      toast({ title: "Success", description: "Document uploaded to ImageKit successfully." })
      setIsUploadModalOpen(false)
    } catch (err: any) {
      toast({ variant: "destructive", title: "Upload Failed", description: err.message || "Failed to upload to ImageKit" })
    } finally {
      setIsUploadLoading(false)
    }
  }

  const handleDelete = async (doc: any) => {
    if (!user || !database || !selectedStudentId) return
    try {
      if (doc.fileUrl && doc.fileUrl.includes("imagekit.io")) {
        await deleteFileFromImageKit(doc.fileId || doc.fileUrl)
      } else if (storage && doc.fileName) {
        await deleteObject(storageRef(storage, `student-documents/${selectedStudentId}/${doc.fileName}`)).catch(() => {})
      }
      await remove(ref(database, `Institutes/${user.uid}/student-documents/${selectedStudentId}/${doc.id}`))
      toast({ title: "Deleted" })
    } catch (err) {
      toast({ variant: "destructive", title: "Error" })
    }
  }

  const mainContent = (
    <main className="flex-1 p-8 space-y-8 animate-in fade-in duration-500 w-full overflow-x-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-black font-public-sans tracking-tight">Document Management</h2>
          <p className="text-[14px] text-black font-medium">Manage student compliance and digital records</p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex-1 md:w-72">
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger className="rounded-xl h-11 bg-white border-zinc-200">
                <SelectValue placeholder="Select a student..." />
              </SelectTrigger>
              <SelectContent>
                {students.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.studentName} ({s.admissionNo})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button disabled={!selectedStudentId} onClick={() => setIsUploadModalOpen(true)} className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-white rounded-xl h-11 px-6 font-bold text-[14px] gap-2 border-none shadow-sm transition-none"><FileUp className="h-4 w-4" /> Upload</Button>
        </div>
      </div>

      {!selectedStudentId ? (
        <Card className="border-none shadow-sm rounded-2xl p-20 flex flex-col items-center justify-center text-center space-y-6 bg-white">
          <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-300"><User className="w-10 h-10" /></div>
          <div className="space-y-2"><h3 className="text-xl font-bold text-black">No Student Selected</h3><p className="text-[14px] text-black max-w-xs mx-auto">Please select a student from the dropdown to manage their records.</p></div>
        </Card>
      ) : (
        <div className="space-y-8">
          <Card className="border-none shadow-sm rounded-2xl p-6 bg-white flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-[hsl(var(--primary))]"><ShieldCheck className="w-6 h-6" /></div>
              <div><h3 className="text-lg font-bold text-black font-public-sans">{selectedStudent?.studentName}</h3><p className="text-[14px] text-black font-medium">ADMISSION NO: {selectedStudent?.admissionNo} • {selectedStudent?.course}</p></div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center px-6 border-r border-zinc-50"><p className="text-[10px] font-bold text-black tracking-widest">Total Uploaded</p><p className="text-xl font-black text-black">{uploadedDocs.length}</p></div>
              <div className="text-center px-6"><p className="text-[10px] font-bold text-black tracking-widest">Pending Missing</p><p className="text-xl font-black text-rose-500">{missingDocuments.length}</p></div>
            </div>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {REQUIRED_DOCUMENTS.map(doc => {
              const uploaded = uploadedDocs.find(d => d.documentName === doc)
              return (
                <Card key={doc} className={cn("border-none shadow-sm rounded-xl p-4 flex flex-col gap-3 transition-all", uploaded ? "bg-white" : "bg-rose-50/30")}>
                  <div className="flex items-center justify-between">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", uploaded?.status === 'Verified' ? "bg-emerald-50 text-emerald-600" : uploaded ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-500")}>
                      {uploaded?.status === 'Verified' ? <CheckCircle2 className="w-4 h-4" /> : uploaded ? <Clock className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    </div>
                    <Badge className={cn("text-[9px] font-bold  border-none shadow-none", uploaded?.status === 'Verified' ? "bg-emerald-100 text-emerald-700" : uploaded ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700")}>{uploaded?.status || "Missing"}</Badge>
                  </div>
                  <p className="text-[11px] font-bold text-black line-clamp-1">{doc}</p>
                </Card>
              )
            })}
          </div>

          <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
            <div className="overflow-x-auto"><Table><TableHeader className="bg-zinc-50/50"><TableRow className="border-zinc-100 hover:bg-transparent"><TableHead className="text-[11px] font-bold text-black tracking-widest h-14 pl-8">SR NO.</TableHead><TableHead className="text-[11px] font-bold text-black tracking-widest h-14">Document Name</TableHead><TableHead className="text-[11px] font-bold text-black tracking-widest h-14">File Type</TableHead><TableHead className="text-[11px] font-bold text-black tracking-widest h-14">Uploaded Date</TableHead><TableHead className="text-[11px] font-bold text-black tracking-widest h-14">Status</TableHead><TableHead className="text-right pr-8 text-[11px] font-bold text-black tracking-widest h-14">Actions</TableHead></TableRow></TableHeader><TableBody>{uploadedDocs.map((doc, idx) => (<TableRow key={doc.id} className="border-zinc-50 hover:bg-zinc-50/20 transition-none"><TableCell className="text-[14px] font-medium text-black pl-8">{idx + 1}</TableCell><TableCell><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center text-black"><FileText className="w-4 h-4" /></div><span className="text-[14px] font-bold text-black">{doc.documentName}</span></div></TableCell><TableCell className="text-[14px] text-black font-public-sans">{doc.fileType.split('/')[1]}</TableCell><TableCell className="text-[14px] text-black">{format(new Date(doc.uploadedDate), "PP")}</TableCell><TableCell><Badge className={cn("rounded-lg px-2.5 py-0.5 text-[10px] font-bold ", doc.status === 'Verified' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600")}>{doc.status}</Badge></TableCell><TableCell className="text-right pr-6"><div className="flex items-center justify-end gap-1"><Button variant="ghost" size="icon" onClick={() => window.open(doc.fileUrl, '_blank')} className="h-8 w-8 text-blue-500 transition-none"><Eye className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => handleDelete(doc)} className="h-8 w-8 text-rose-500 transition-none"><Trash2 className="h-4 w-4" /></Button></div></TableCell></TableRow>))}</TableBody></Table></div>
          </Card>
        </div>
      )}

      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="max-w-md w-[95vw] p-0 border border-zinc-200 rounded-3xl overflow-hidden bg-white max-h-[95vh] flex flex-col">
          <div className="bg-zinc-50 px-8 py-5 border-b border-zinc-100 flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-black">Upload Student Document</DialogTitle>
          </div>
          <ScrollArea className="flex-1 w-full text-black" type="always">
            <form onSubmit={handleUpload} className="p-8 space-y-6">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-black tracking-widest">Document Type</Label>
                <Select name="docName" required>
                  <SelectTrigger className="h-12 rounded-xl border-zinc-200"><SelectValue placeholder="Select type..." /></SelectTrigger>
                  <SelectContent>{REQUIRED_DOCUMENTS.map(doc => (<SelectItem key={doc} value={doc}>{doc}</SelectItem>))}<SelectItem value="Other">Other</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-[10px] font-bold text-black tracking-widest">File (PDF, JPG, PNG)</Label><Input type="file" name="file" required accept=".pdf,.jpg,.jpeg,.png" className="h-12 rounded-xl border-zinc-200" /></div>
              <div className="space-y-1.5"><Label className="text-[10px] font-bold text-black tracking-widest">Remarks</Label><Input name="remarks" placeholder="Optional notes..." className="h-12 rounded-xl border-zinc-200" /></div>
              <Button type="submit" disabled={isUploading} className="w-full bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-white rounded-xl h-14 font-bold shadow-lg transition-none border-none">{isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Submit Document"}</Button>
            </form>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </main>
  )

  if (isPortal) return mainContent

  return (
    <div className="min-h-screen bg-[#a0a0a00d] flex font-public-sans overflow-x-hidden">
      <Sidebar />
      <div className="lg:pl-[280px] flex flex-col flex-1 min-w-0">
        <TopNav />
        {mainContent}
      </div>
    </div>
  )
}
