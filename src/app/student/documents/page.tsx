
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  FileText, 
  Download, 
  Eye, 
  ShieldCheck, 
  Clock, 
  Search,
  History,
  FolderOpen
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, off } from "firebase/database"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

export default function StudentDocumentsPage() {
  const { database } = useFirebase()
  const { user } = useUser()
  const [student, setStudent] = useState<any>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!database || !user) return
    
    const instRef = ref(database, `Institutes`)
    onValue(instRef, (snap) => {
      const institutes = snap.val() || {}
      let foundStudent = null
      let adminUid = null

      Object.keys(institutes).forEach(id => {
        const adms = institutes[id].admissions || {}
        Object.keys(adms).forEach(aid => {
          if (adms[aid].email?.toLowerCase() === user.email?.toLowerCase()) {
            foundStudent = { ...adms[aid], id: aid }
            adminUid = id
          }
        })
      })

      if (foundStudent && adminUid) {
        setStudent(foundStudent)
        const docRef = ref(database, `Institutes/${adminUid}/student-documents/${foundStudent.id}`)
        onValue(docRef, (snapshot) => {
          const data = snapshot.val() || {}
          setDocuments(Object.keys(data).map(k => ({ ...data[k], id: k })).reverse())
        })
      }
      setIsLoading(false)
    })
  }, [database, user])

  const filtered = useMemo(() => {
    if (!searchTerm) return documents
    return documents.filter(d => d.documentName?.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [documents, searchTerm])

  if (isLoading) return <div className="p-20 text-center font-black text-zinc-300 animate-pulse">Syncing Secure Vault...</div>

  return (
    <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-700 max-w-7xl mx-auto">
      
      <Card className="border-none shadow-xl rounded-[40px] bg-white overflow-hidden p-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-[28px] bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner">
              <FolderOpen className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-black tracking-tight">Document Vault</h2>
              <p className="text-[10px] font-bold text-black tracking-widest">Verified Institutional Records</p>
            </div>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-3 h-4 w-4 text-zinc-300" />
            <input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search records..." 
              className="w-full pl-12 h-11 rounded-2xl border-zinc-100 bg-zinc-50 focus:ring-2 focus:ring-emerald-500/20 outline-none text-[14px] font-bold" 
            />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map((doc) => (
          <Card key={doc.id} className="border-none shadow-sm rounded-[32px] bg-white p-8 group hover:shadow-xl transition-all duration-500">
            <div className="flex items-start justify-between mb-8">
              <div className="w-14 h-14 rounded-2xl bg-zinc-50 flex items-center justify-center text-black group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-all">
                <FileText className="w-7 h-7" />
              </div>
              <Badge className={cn(
                "rounded-lg px-2.5 py-1 text-[9px] font-black  border-none shadow-none",
                doc.status === 'Verified' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
              )}>
                {doc.status}
              </Badge>
            </div>
            <div className="space-y-1 mb-8">
              <h4 className="text-lg font-black text-black tracking-tight line-clamp-1">{doc.documentName}</h4>
              <p className="text-[10px] font-bold text-black tracking-widest flex items-center gap-2">
                <Clock className="w-3 h-3" /> Uploaded on {doc.uploadedDate ? format(new Date(doc.uploadedDate), "PP") : '-'}
              </p>
            </div>
            <div className="flex gap-3 pt-6 border-t border-zinc-50">
              <Button variant="ghost" onClick={() => window.open(doc.fileUrl, '_blank')} className="flex-1 h-11 rounded-2xl bg-zinc-50 text-black font-black text-[9px] tracking-widest gap-2 hover:bg-zinc-100">
                <Eye className="w-3.5 h-3.5" /> Preview
              </Button>
              <Button onClick={() => window.open(doc.fileUrl, '_blank')} className="flex-1 h-11 rounded-2xl bg-primary text-white font-black text-[9px] tracking-widest shadow-lg shadow-teal-900/20 border-none active:scale-95">
                <Download className="w-3.5 h-3.5" /> Download
              </Button>
            </div>
          </Card>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-24 text-center space-y-6 bg-white rounded-[40px] border-2 border-dashed border-zinc-100">
            <div className="w-20 h-20 bg-zinc-50 rounded-[28px] flex items-center justify-center mx-auto text-zinc-200">
              <History className="w-10 h-10" />
            </div>
            <p className="text-[14px] font-bold text-black tracking-widest">No documents found in your vault</p>
          </div>
        )}
      </div>
    </main>
  )
}
