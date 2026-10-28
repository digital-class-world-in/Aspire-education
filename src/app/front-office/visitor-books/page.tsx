"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Search, 
  Trash2, 
  Edit2, 
  UserCheck, 
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  Upload,
  FileText,
  Download,
  FileSpreadsheet,
  Calendar,
  Filter,
  Info,
  Paperclip
} from "lucide-react"
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, push, set, remove, off, update } from "firebase/database"
import { uploadFileToImageKit } from "@/lib/imagekit"
import { useResolvedId } from "@/hooks/use-resolved-id"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import { usePathname } from "next/navigation"
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from "date-fns"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"

export default function VisitorBooksPage() {
  const pathname = usePathname()
  const isPortal = (pathname.startsWith('/branch') && !pathname.startsWith('/branch-management')) || 
                   pathname.startsWith('/staff') || 
                   (pathname.startsWith('/student') && !pathname.startsWith('/student-information'))

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [items, setItems] = useState<any[]>([])
  const [editingItem, setEditingItem] = useState<any>(null)
  
  const [searchTerm, setSearchTerm] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [instituteName, setInstituteName] = useState("Your Institute")
  
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<any>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { database, storage } = useFirebase()
  const { resolvedId, staffId, branchId, isStaff, isBranch } = useResolvedId()

  const today = useMemo(() => new Date().toISOString().split('T')[0], [])

  useEffect(() => {
    if (!database || !resolvedId) return
    const rootPath = `Institutes/${resolvedId}`
    onValue(ref(database, `${rootPath}/visitors`), (snapshot) => {
      const data = snapshot.val()
      if (data) setItems(Object.keys(data).map(key => ({ ...data[key], id: key })).reverse())
      else setItems([])
    })
    onValue(ref(database, `${rootPath}/profile`), (snapshot) => {
      if (snapshot.val()?.instituteName) setInstituteName(snapshot.val().instituteName)
    })
  }, [database, resolvedId])

  const hasActiveFilters = useMemo(() => {
    return fromDate !== "" || toDate !== "" || searchTerm !== ""
  }, [fromDate, toDate, searchTerm])

  const filteredItems = useMemo(() => {
    let list = items
    if (isStaff && staffId) list = list.filter(item => item.createdBy === staffId)
    else if (isBranch && branchId) list = list.filter(item => item.branchId === branchId)

    return list.filter(item => {
      const matchSearch = !searchTerm || 
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.purpose?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.phone?.includes(searchTerm)

      let matchDate = true
      if (fromDate || toDate) {
        try {
          const itemDate = parseISO(item.date)
          const start = fromDate ? startOfDay(parseISO(fromDate)) : null
          const end = toDate ? endOfDay(parseISO(toDate)) : null
          if (start && end) matchDate = isWithinInterval(itemDate, { start, end })
          else if (start) matchDate = itemDate >= start
          else if (end) matchDate = itemDate <= end
        } catch (e) { matchDate = true }
      }
      return matchSearch && matchDate
    })
  }, [items, searchTerm, fromDate, toDate, isStaff, staffId, isBranch, branchId])

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage)
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredItems.slice(start, start + itemsPerPage)
  }, [filteredItems, currentPage])

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!resolvedId || !database || isSubmitting) return
    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)
    let attachmentUrl = editingItem?.attachmentUrl || ""
    if (selectedFile) {
      try {
        const res = await uploadFileToImageKit(selectedFile, `/visitors/${resolvedId}`)
        attachmentUrl = res.url
      } catch (err: any) {
        toast({ variant: "destructive", title: "Upload Failed", description: err.message })
      }
    }
    const data = {
      name: formData.get("name") as string,
      idCardNo: formData.get("idCardNo") as string,
      phone: formData.get("phone") as string,
      meetingWith: formData.get("meetingWith") as string,
      totalPerson: formData.get("totalPerson") as string,
      date: formData.get("date") as string,
      purpose: formData.get("purpose") as string,
      inTime: formData.get("inTime") as string,
      outTime: formData.get("outTime") as string,
      attachmentUrl,
      branchId: isBranch ? branchId : (editingItem?.branchId || null),
      createdBy: isStaff ? staffId : isBranch ? branchId : 'admin',
      updatedAt: Date.now()
    }
    const dbPath = `Institutes/${resolvedId}/visitors`
    try {
      if (editingItem) await update(ref(database, `${dbPath}/${editingItem.id}`), data)
      else await push(ref(database, dbPath), { ...data, createdAt: Date.now() })
      setIsModalOpen(false); setEditingItem(null); setSelectedFile(null);
    } catch (err) { toast({ variant: "destructive", title: "Error" }) }
    finally { setIsSubmitting(false) }
  }

  const handleDelete = async () => {
    if (!database || !resolvedId || !itemToDelete) return
    setIsDeleting(true)
    try {
      const rootPath = `Institutes/${resolvedId}`
      await set(push(ref(database, `${rootPath}/trash/visitors`)), { ...itemToDelete, deletedAt: Date.now() })
      await remove(ref(database, `${rootPath}/visitors/${itemToDelete.id}`))
      toast({ title: "Moved to Trash" })
    } catch (err) { toast({ variant: "destructive", title: "Error" }) }
    finally { setIsDeleting(false); setItemToDelete(null); }
  }

  const resetFilters = () => {
    setFromDate("")
    setToDate("")
    setSearchTerm("")
    setCurrentPage(1)
  }

  const exportPDF = () => {
    if (!filteredItems.length) return
    const doc = new jsPDF('l', 'mm', 'a4')
    doc.setFontSize(20).setTextColor(13, 148, 136).text(instituteName, 14, 20)
    doc.setFontSize(12).setTextColor(100).text(`Visitor Books Registry - ${format(new Date(), "PP")}`, 14, 30)
    
    const tableData = filteredItems.map((v, i) => [
      i + 1,
      v.name,
      v.phone,
      v.meetingWith,
      v.purpose,
      v.date,
      `${v.inTime} - ${v.outTime || 'N/A'}`
    ])

    autoTable(doc, {
      startY: 40,
      head: [['#', 'Visitor Name', 'Phone', 'Meeting With', 'Purpose', 'Date', 'Time Slot']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [13, 148, 136] },
      styles: { fontSize: 9 }
    })

    doc.save(`Visitor_Registry_${today}.pdf`)
  }

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredItems.map((v, i) => ({
      "Sr No": i + 1,
      "Visitor Name": v.name,
      "Phone": v.phone,
      "Meeting With": v.meetingWith,
      "Purpose": v.purpose,
      "Date": v.date,
      "In Time": v.inTime,
      "Out Time": v.outTime || '-'
    })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Visitors")
    XLSX.writeFile(wb, `Visitor_Registry_${today}.xlsx`)
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans overflow-x-hidden">
      <Sidebar />
      <div className={cn("flex flex-col flex-1 min-w-0", !isPortal && "lg:pl-[280px]")}>
        <TopNav />
        <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-500 w-full overflow-x-hidden">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
            <div>
              <h2 className="text-3xl font-medium text-black font-public-sans tracking-tight leading-none">Visitor Books ({filteredItems.length})</h2>
              <p className="text-[14px] text-black font-medium mt-1">Record daily institutional visitor logs</p>
            </div>
            <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if(!open) { setEditingItem(null); setSelectedFile(null); } }}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingItem(null)} className="bg-primary hover:opacity-90 text-white rounded-xl h-11 px-10 font-bold text-[14px] border-none shadow-lg active:scale-95 transition-all">
                  Add New
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl p-0 border border-zinc-200 rounded-2xl overflow-hidden bg-white shadow-2xl">
                <div className="bg-white px-8 py-4 border-b border-zinc-100">
                  <DialogTitle className="text-lg font-bold text-black">New Visitor Entry</DialogTitle>
                </div>
                <ScrollArea className="max-h-[75vh]">
                  <form onSubmit={handleSave} className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5"><Label className="text-[12px] font-medium text-black ml-1">Visitor Name</Label><Input name="name" defaultValue={editingItem?.name} required className="rounded-xl h-11 font-medium text-black" /></div>
                      <div className="space-y-1.5"><Label className="text-[12px] font-medium text-black ml-1">Phone Number</Label><Input name="phone" type="text" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} onInput={(e) => e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, '')} defaultValue={editingItem?.phone} required placeholder="Phone" className="rounded-xl h-11 font-medium text-black" /></div>
                      <div className="space-y-1.5"><Label className="text-[12px] font-medium text-black ml-1">Id Card No.</Label><Input name="idCardNo" defaultValue={editingItem?.idCardNo} className="rounded-xl h-11 font-medium text-black" /></div>
                      <div className="space-y-1.5"><Label className="text-[12px] font-medium text-black ml-1">Meeting With</Label><Input name="meetingWith" defaultValue={editingItem?.meetingWith} required className="rounded-xl h-11 font-medium text-black" /></div>
                      <div className="space-y-1.5"><Label className="text-[12px] font-medium text-black ml-1">Total Person</Label><Input name="totalPerson" type="number" defaultValue={editingItem?.totalPerson || "1"} required className="rounded-xl h-11 font-medium text-black" /></div>
                      <div className="space-y-1.5"><Label className="text-[12px] font-medium text-black ml-1">Date</Label><Input name="date" type="date" defaultValue={editingItem?.date || today} required className="rounded-xl h-11 font-medium text-black" /></div>
                      <div className="md:col-span-2 space-y-1.5"><Label className="text-[12px] font-medium text-black ml-1">Purpose of Visit</Label><Input name="purpose" defaultValue={editingItem?.purpose} required className="rounded-xl h-11 font-medium text-black" /></div>
                      <div className="space-y-1.5"><Label className="text-[12px] font-medium text-black ml-1">In Time</Label><Input name="inTime" type="time" defaultValue={editingItem?.inTime} required className="rounded-xl h-11 font-medium text-black" /></div>
                      <div className="space-y-1.5"><Label className="text-[12px] font-medium text-black ml-1">Out Time</Label><Input name="outTime" type="time" defaultValue={editingItem?.outTime} className="rounded-xl h-11 font-medium text-black" /></div>
                      <div className="md:col-span-2 space-y-1.5"><Label className="text-[12px] font-medium text-black ml-1">Attachment</Label><div className="flex items-center gap-4"><Input type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="rounded-xl h-11 border-dashed" accept="image/*,.pdf" />{editingItem?.attachmentUrl && <Button variant="outline" asChild size="icon" className="h-11 w-11 shrink-0"><a href={editingItem.attachmentUrl} target="_blank"><Download className="w-4 h-4" /></a></Button>}</div></div>
                    </div>
                    <div className="pt-4"><Button type="submit" disabled={isSubmitting} className="w-fit h-14 px-12 bg-primary hover:opacity-90 text-white rounded-2xl font-bold text-[14px] shadow-xl border-none active:scale-95 transition-all">{isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Authorize Entry"}</Button></div>
                  </form>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="border-none shadow-sm rounded-3xl bg-white p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-black font-inter" style={{ fontWeight: 500 }}>Select Criteria</h3>
              {hasActiveFilters && (
                <Button onClick={resetFilters} variant="ghost" className="h-8 px-4 text-rose-500 hover:bg-rose-50 rounded-lg text-[10px] font-bold gap-2">
                  Reset Filters <X className="ml-2 w-3 h-3" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="space-y-2">
                <Label className="text-[12px] font-medium text-black">From Date</Label>
                <Input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setCurrentPage(1); }} className="h-11 rounded-xl bg-white border-zinc-200 text-[14px] font-bold text-black shadow-inner" />
              </div>
              <div className="space-y-2">
                <Label className="text-[12px] font-medium text-black">To Date</Label>
                <Input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setCurrentPage(1); }} className="h-11 rounded-xl bg-white border-zinc-200 text-[14px] font-bold text-black shadow-inner" />
              </div>
            </div>
          </Card>

          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
              <div className="relative group w-full md:w-80">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-black group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="Search visitor..." 
                  value={searchTerm} 
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
                  className="pl-11 h-11 bg-white border-zinc-200 rounded-full text-[14px] font-bold text-black shadow-sm transition-none focus-visible:ring-primary" 
                />
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <Button variant="outline" onClick={() => XLSX.writeFile(XLSX.utils.book_new(), "sample.csv")} className="h-11 px-5 text-[hsl(var(--primary))] border-[hsl(var(--primary))]/20 rounded-xl transition-none gap-2 font-bold text-[14px] bg-white hover:bg-emerald-50 shadow-sm"><Download className="h-4 w-4" /> Sample CSV</Button>
                <input type="file" ref={fileInputRef} className="hidden" accept=".csv" />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="h-11 px-5 text-indigo-600 border-indigo-100 rounded-xl transition-none gap-2 font-bold text-[14px] bg-white hover:bg-indigo-50 shadow-sm"><Upload className="h-4 w-4" /> Import CSV</Button>
                <Button variant="outline" onClick={exportExcel} className="h-11 px-5 text-emerald-600 border-emerald-100 rounded-xl transition-none gap-2.5 font-bold text-[14px] bg-white hover:bg-emerald-50 shadow-sm"><FileSpreadsheet className="h-4 w-4" /> Export Excel</Button>
                <Button variant="outline" onClick={exportPDF} className="h-11 px-4 text-rose-600 border-rose-100 rounded-xl transition-none gap-2.5 font-bold text-[14px] bg-white hover:bg-rose-50 shadow-sm"><FileText className="h-4 w-4" /> Export PDF</Button>
              </div>
            </div>

            <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
              <div className="overflow-x-auto scrollbar-thin">
                <Table className="min-w-[1800px]">
                  <TableHeader className="bg-zinc-50/50">
                    <TableRow className="border-zinc-100 hover:bg-transparent">
                      <TableHead className="pl-10 text-[13px] font-medium text-black h-14 w-20" style={{ fontWeight: 500 }}>Sr No</TableHead>
                      <TableHead className="text-[13px] font-medium text-black h-14" style={{ fontWeight: 500 }}>Operations</TableHead>
                      <TableHead className="text-[13px] font-medium text-black h-14" style={{ fontWeight: 500 }}>Visitor Name</TableHead>
                      <TableHead className="text-[13px] font-medium text-black h-14" style={{ fontWeight: 500 }}>Phone</TableHead>
                      <TableHead className="text-[13px] font-medium text-black h-14" style={{ fontWeight: 500 }}>Id Card No</TableHead>
                      <TableHead className="text-[13px] font-medium text-black h-14" style={{ fontWeight: 500 }}>Meeting With</TableHead>
                      <TableHead className="text-[13px] font-medium text-black h-14 text-center" style={{ fontWeight: 500 }}>Person Count</TableHead>
                      <TableHead className="text-[13px] font-medium text-black h-14" style={{ fontWeight: 500 }}>Purpose</TableHead>
                      <TableHead className="text-[13px] font-medium text-black h-14" style={{ fontWeight: 500 }}>In Time</TableHead>
                      <TableHead className="text-[13px] font-medium text-black h-14" style={{ fontWeight: 500 }}>Out Time</TableHead>
                      <TableHead className="text-right pr-10 text-[13px] font-medium text-black h-14" style={{ fontWeight: 500 }}>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedItems.map((row, index) => (
                      <TableRow key={row.id} className="border-zinc-50 hover:bg-zinc-50/30 transition-none group">
                        <TableCell className="text-[14px] font-medium text-black pl-10">{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => { setEditingItem(row); setIsModalOpen(true); }} className="h-8 w-8 text-blue-500 hover:bg-blue-50 transition-none"><Edit2 className="h-3.5 w-3.5" /></Button>
                            <button onClick={() => setItemToDelete(row)} className="p-1 text-zinc-300 hover:text-rose-500 transition-none border-none bg-transparent cursor-pointer"><Trash2 className="h-4 w-4" /></button>
                            {row.attachmentUrl && (<Button variant="ghost" size="icon" asChild className="h-8 w-8 text-emerald-500 hover:bg-emerald-50 rounded-xl"><a href={row.attachmentUrl} target="_blank"><Paperclip className="h-4 w-4" /></a></Button>)}
                          </div>
                        </TableCell>
                        <TableCell><span className="text-[14px] font-bold text-black font-public-sans tracking-tighter">{row.name}</span></TableCell>
                        <TableCell><span className="text-[14px] font-bold text-black font-public-sans tracking-tighter">{row.phone}</span></TableCell>
                        <TableCell><span className="text-[14px] font-bold text-black font-public-sans">{row.idCardNo || '-'}</span></TableCell>
                        <TableCell><span className="text-[14px] font-bold text-black">{row.meetingWith}</span></TableCell>
                        <TableCell className="text-[14px] font-bold text-black text-center">{row.totalPerson}</TableCell>
                        <TableCell className="text-[14px] font-bold text-black italic max-w-[200px] truncate">"{row.purpose}"</TableCell>
                        <TableCell className="text-[14px] font-bold text-black font-public-sans">{row.inTime}</TableCell>
                        <TableCell className="text-[14px] font-bold text-black font-public-sans">{row.outTime || 'N/A'}</TableCell>
                        <TableCell className="text-right pr-10 text-[14px] font-bold text-black font-public-sans">{row.date}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>

            <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-2 pt-4">
              <p className="text-[10px] font-medium text-black">Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length} entries</p>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4">
                  <Button variant="ghost" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-9 rounded-xl font-bold text-[10px] tracking-widest transition-all"><ChevronLeft className="w-4 h-4 mr-2" /> Previous</Button>
                  <div className="flex items-center gap-2">{[...Array(totalPages)].map((_, i) => (<button key={i} onClick={() => setCurrentPage(i + 1)} className={cn("w-10 h-10 rounded-xl text-[10px] font-bold transition-all", currentPage === i + 1 ? "bg-primary text-white shadow-xl scale-110" : "bg-white text-black border border-zinc-100 hover:bg-zinc-50")}>{i + 1}</button>))}</div>
                  <Button variant="ghost" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-9 rounded-xl font-bold text-[10px] tracking-widest transition-all">Next <ChevronRight className="w-4 h-4 ml-2" /></Button>
                </div>
              )}
            </div>
          </div>

          <AlertDialog open={!!itemToDelete} onOpenChange={(o) => { if(!o) setItemToDelete(null) }}>
            <AlertDialogContent className="rounded-3xl border-none shadow-2xl p-10 bg-white">
              <AlertDialogHeader><div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-rose-50 text-rose-500"><AlertCircle className="w-8 h-8" /></div><AlertDialogTitle className="text-xl font-bold text-black">Move to Trash?</AlertDialogTitle><AlertDialogDescription className="text-black text-[14px] leading-relaxed font-bold">Are you sure you want to move the visitor record for <span className="text-black">"{itemToDelete?.name}"</span> to the institutional trash bin?</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter className="mt-6 gap-3"><AlertDialogCancel className="rounded-xl border-zinc-100 text-black font-bold h-11 px-6">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl border-none font-bold h-11 px-8 transition-all active:scale-95 shadow-xl shadow-rose-900/20">Move to Trash</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </main>
      </div>
    </div>
  )
}
