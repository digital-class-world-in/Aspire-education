
"use client"

import { useState, useEffect, useMemo } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { 
  Search, 
  Trash2, 
  MessageSquareShare, 
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  History,
  Info,
  ShieldAlert,
  Send,
  User,
  Filter
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, update, remove, off, push } from "firebase/database"
import { useResolvedId } from "@/hooks/use-resolved-id"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import { usePathname } from "next/navigation"
import { format } from "date-fns"

export default function ConcernsManagementPage() {
  const pathname = usePathname()
  const isPortal = (pathname.startsWith('/branch') && !pathname.startsWith('/branch-management')) || 
                   pathname.startsWith('/staff') || 
                   (pathname.startsWith('/student') && !pathname.startsWith('/student-information'))

  const { database } = useFirebase()
  const { user } = useUser()
  const { resolvedId, isBranch, branchId } = useResolvedId()

  const [items, setItems] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  
  const [replyingItem, setReplyingItem] = useState<any>(null)
  const [replyText, setReplyText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    if (!database || !resolvedId) return
    const rootPath = `Institutes/${resolvedId}/concerns`
    
    onValue(ref(database, rootPath), (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setItems(Object.keys(data).map(key => ({ ...data[key], id: key })).reverse())
      } else {
        setItems([])
      }
      setIsLoading(false)
    })
    return () => off(ref(database, rootPath))
  }, [database, resolvedId])

  const filteredItems = useMemo(() => {
    let list = items
    if (isBranch && branchId) list = list.filter(i => i.branchId === branchId)

    return list.filter(item => {
      const name = item.isAnonymous ? "ANONYMOUS" : item.studentName
      const matchSearch = !searchTerm || 
        name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.subject?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchStatus = filterStatus === 'all' || item.status === filterStatus
      return matchSearch && matchStatus
    })
  }, [items, searchTerm, filterStatus, isBranch, branchId])

  const paginated = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage)

  const handleSendReply = async () => {
    if (!database || !resolvedId || !replyingItem || !replyText.trim()) return
    setIsSubmitting(true)
    
    try {
      const updates = {
        adminReply: replyText.trim(),
        status: "Replied",
        repliedAt: new Date().toISOString(),
        repliedBy: user?.displayName || "Administrator",
        updatedAt: Date.now()
      }
      
      await update(ref(database, `Institutes/${resolvedId}/concerns/${replyingItem.id}`), updates)
      
      // Notify Student Node
      await push(ref(database, `Institutes/${resolvedId}/notifications/${replyingItem.studentId}`), {
        title: "Concern Replied",
        message: `Your query regarding "${replyingItem.subject}" has received a response from the administration.`,
        type: 'Concern',
        read: false,
        timestamp: new Date().toISOString()
      })

      toast({ title: "Response Recorded", description: "The student has been notified of your reply." })
      setReplyingItem(null); setReplyText("");
    } catch (e) {
      toast({ variant: "destructive", title: "Error" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = (id: string) => {
    if (!database || !resolvedId) return
    if (confirm("Permanently purge this concern record?")) {
      remove(ref(database, `Institutes/${resolvedId}/concerns/${id}`))
        .then(() => toast({ title: "Record Deleted" }))
    }
  }

  if (isLoading) return <div className="p-20 text-center font-black text-zinc-300 animate-pulse">Scanning Concern Nodes...</div>

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans">
      {!isPortal && <Sidebar />}
      <div className={cn("flex flex-col flex-1 min-w-0", !isPortal && "lg:pl-[300px]")}>
        <TopNav />
        <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-500 w-full overflow-x-hidden text-black font-public-sans text-[14px]">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
            <div>
              <h2 className="text-3xl font-black text-black tracking-tight font-public-sans leading-none">Concerns Hub</h2>
              <p className="text-[14px] text-black font-medium mt-1">Review student grievances and provide official institutional responses</p>
            </div>
          </div>

          <Card className="border border-zinc-100 shadow-sm rounded-2xl bg-white p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-black tracking-widest ml-1">Search Candidates</Label>
                <div className="relative group">
                  <Search className="absolute left-4 top-3.5 h-4 w-4 text-zinc-300 group-focus-within:text-primary transition-colors" />
                  <Input 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Name or Subject..." 
                    className="pl-12 h-12 rounded-xl border-zinc-100 bg-zinc-50/50 shadow-inner font-bold" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-black tracking-widest ml-1">Status Filter</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-12 rounded-xl bg-zinc-50/50 border-zinc-100 font-bold text-[11px]"><SelectValue placeholder="All Concerns" /></SelectTrigger>
                  <SelectContent className="rounded-xl border-zinc-100 shadow-xl">
                    <SelectItem value="all" className="font-bold">ALL CONCERNS</SelectItem>
                    <SelectItem value="Pending" className="font-bold text-amber-600">PENDING</SelectItem>
                    <SelectItem value="Replied" className="font-bold text-emerald-600">REPLIED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          <Card className="border border-zinc-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
            <div className="overflow-x-auto scrollbar-thin">
              <Table className="min-w-[1400px]">
                <TableHeader className="bg-zinc-50/50">
                  <TableRow className="border-zinc-100">
                    <TableHead className="pl-10 text-[11px] font-black text-black h-14 w-20">#</TableHead>
                    <TableHead className="text-[11px] font-black text-black h-14">Action</TableHead>
                    <TableHead className="text-[11px] font-black text-black h-14">Candidate</TableHead>
                    <TableHead className="text-[11px] font-black text-black h-14">Concern Context</TableHead>
                    <TableHead className="text-[11px] font-black text-black h-14 text-center">Status</TableHead>
                    <TableHead className="text-right pr-10 text-[11px] font-black text-black h-14">Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((row, index) => (
                    <TableRow key={row.id} className="border-zinc-50 hover:bg-zinc-50/30 transition-none group">
                      <TableCell className="pl-10 text-[14px] font-bold text-zinc-300">{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button 
                            onClick={() => { setReplyingItem(row); setReplyText(row.adminReply || ""); }}
                            className="bg-primary hover:opacity-90 text-white h-8 px-4 rounded-xl font-black text-[9px] tracking-widest border-none shadow-sm transition-all"
                          >
                            {row.adminReply ? 'Update Reply' : 'Send Reply'}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(row.id)} className="h-8 w-8 text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3 py-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shadow-inner font-black text-[14px] ",
                            row.isAnonymous ? "bg-rose-50 text-rose-500 border border-rose-100" : "bg-zinc-50 text-primary"
                          )}>
                            {row.isAnonymous ? <ShieldAlert className="w-5 h-5" /> : row.studentName?.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[14px] font-black text-black tracking-tight">
                              {row.isAnonymous ? "ANONYMOUS" : row.studentName}
                            </span>
                            {!row.isAnonymous && <span className="text-[9px] font-bold text-black tracking-widest">Candidate UID: {row.studentId?.substring(0,8)}</span>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 max-w-md">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="rounded-lg border-zinc-100 text-black font-bold text-[8px]">{row.category}</Badge>
                            <span className="text-[14px] font-black text-black tracking-tight">{row.subject}</span>
                          </div>
                          <p className="text-[14px] text-black font-medium line-clamp-1 italic">"{row.message}"</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn(
                          "rounded-lg px-2.5 py-0.5 text-[9px] font-black  border-none shadow-none",
                          row.status === 'Replied' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                        )}>{row.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right pr-10 text-[14px] font-bold text-black font-public-sans">
                        {row.createdAt ? format(new Date(row.createdAt), "PPp") : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredItems.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="h-64 text-center text-zinc-300 italic font-bold tracking-widest">No concerns found in registry</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button variant="ghost" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-10 px-6 rounded-xl font-black text-[10px] tracking-widest transition-all"><ChevronLeft className="w-4 h-4 mr-2" /> Previous</Button>
              <div className="flex items-center gap-2">{[...Array(totalPages)].map((_, i) => (<button key={i} onClick={() => setCurrentPage(i + 1)} className={cn("w-10 h-10 rounded-xl text-[10px] font-black transition-all", currentPage === i + 1 ? "bg-primary text-white shadow-xl scale-110" : "bg-white text-black border border-zinc-100")}>{i + 1}</button>))}</div>
              <Button variant="ghost" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-10 px-6 rounded-xl font-black text-[10px] tracking-widest transition-all">Next <ChevronRight className="w-4 h-4 ml-2" /></Button>
            </div>
          )}

          <Dialog open={!!replyingItem} onOpenChange={(o) => { if(!o) setReplyingItem(null); }}>
            <DialogContent className="max-w-xl p-0 border-none rounded-[40px] overflow-hidden bg-white shadow-2xl">
              <div className="bg-zinc-900 p-10 text-white relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                
                <div className="space-y-4">
                  <Badge className="bg-primary/20 text-primary border-none text-[9px] font-black tracking-widest px-3">Reply Hub</Badge>
                  <DialogTitle className="text-2xl font-black tracking-tight leading-tight">Institutional Response</DialogTitle>
                  <p className="text-[14px] text-black font-medium tracking-widest">Topic: {replyingItem?.subject}</p>
                </div>
              </div>
              <div className="p-10 space-y-8">
                <div className="bg-zinc-50 p-6 rounded-3xl border border-zinc-100">
                  <p className="text-[10px] font-black text-black tracking-widest mb-3">Student Concern:</p>
                  <p className="text-[14px] font-medium text-black leading-relaxed italic">"{replyingItem?.message}"</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-black tracking-widest ml-1">Your Response (Short & Direct) *</Label>
                  <Textarea 
                    value={replyText} 
                    onChange={e => setReplyText(e.target.value)} 
                    placeholder="Provide a professional institutional response..." 
                    className="rounded-2xl border-zinc-100 bg-zinc-50/50 min-h-[150px] font-medium" 
                  />
                </div>
                <Button 
                  onClick={handleSendReply} 
                  disabled={isSubmitting || !replyText.trim()} 
                  className="w-full h-16 bg-primary text-white rounded-2xl font-black text-[14px] tracking-[0.2em] shadow-xl transition-all active:scale-95 border-none"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />} Synchronize Reply
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  )
}
