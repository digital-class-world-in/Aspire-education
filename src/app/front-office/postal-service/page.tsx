
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
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { 
  Search, 
  Trash2, 
  Edit2, 
  Mail, 
  X,
  Settings2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  FileText,
  Paperclip,
  Download,
  Upload,
  Filter,
  Info
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
import { uploadFileToImageKit, deleteFileFromImageKit } from "@/lib/imagekit"
import { useResolvedId } from "@/hooks/use-resolved-id"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import { usePathname } from "next/navigation"
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from "date-fns"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"

export default function PostalServicePage() {
  const pathname = usePathname()
  const isPortal = (pathname.startsWith('/branch') && !pathname.startsWith('/branch-management')) || 
                   pathname.startsWith('/staff') || 
                   (pathname.startsWith('/student') && !pathname.startsWith('/student-information'))

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [items, setItems] = useState<any[]>([])
  const [editingItem, setEditingItem] = useState<any>(null)
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState("")
  const [filterParcelType, setFilterParcelType] = useState("all")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [instituteName, setInstituteName] = useState("Your Institute")
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  
  // Dynamic Dropdown Management
  const [isManageOpen, setIsManageOpen] = useState(false)
  const [newOptionValue, setNewOptionValue] = useState("")
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null)
  const [dropdownData, setDropdownData] = useState<any[]>([])
  
  // Action States
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
    
    const dbRef = ref(database, `${rootPath}/postal`)
    const unsubscribeLogs = onValue(dbRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setItems(Object.keys(data).map(key => ({ ...data[key], id: key })).reverse())
      } else {
        setItems([])
      }
    })

    const dropdownRef = ref(database, `${rootPath}/dropdowns/parcelType`)
    onValue(dropdownRef, (snapshot) => {
      const data = snapshot.val() || {}
      setDropdownData(Object.keys(data).map(id => ({ id, value: data[id].value })))
    })

    const profileRef = ref(database, `${rootPath}/profile`)
    onValue(profileRef, (snapshot) => {
      const data = snapshot.val()
      if (data?.instituteName) setInstituteName(data.instituteName)
    })

    return () => { 
      off(dbRef); 
      off(dropdownRef); 
      off(profileRef);
    }
  }, [database, resolvedId])

  const hasActiveFilters = useMemo(() => {
    return filterParcelType !== 'all' || fromDate !== "" || toDate !== "" || searchTerm !== ""
  }, [filterParcelType, fromDate, toDate, searchTerm])

  const filteredItems = useMemo(() => {
    let list = items
    
    if (isStaff && staffId) {
      list = list.filter(item => item.createdBy === staffId)
    } else if (isBranch && branchId) {
      list = list.filter(item => item.branchId === branchId)
    }

    return list.filter(item => {
      const matchSearch = !searchTerm || 
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.refNo?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchType = filterParcelType === 'all' || item.parcelType === filterParcelType

      let matchDate = true
      if (fromDate || toDate) {
        try {
          const itemDate = parseISO(item.date)
          const start = fromDate ? startOfDay(parseISO(fromDate)) : null
          const end = toDate ? endOfDay(parseISO(toDate)) : null
          
          if (start && end) matchDate = isWithinInterval(itemDate, { start, end })
          else if (start) matchDate = itemDate >= start
          else if (end) matchDate = itemDate <= end
        } catch (e) {
          matchDate = true
        }
      }

      return matchSearch && matchType && matchDate
    })
  }, [items, searchTerm, filterParcelType, fromDate, toDate, isStaff, staffId, isBranch, branchId])

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
        const res = await uploadFileToImageKit(selectedFile, `/postal/${resolvedId}`)
        attachmentUrl = res.url
      } catch (err: any) {
        toast({ variant: "destructive", title: "Upload Failed", description: err.message })
      }
    }

    const data = {
      name: formData.get("name") as string,
      parcelType: formData.get("parcelType") as string,
      refNo: formData.get("refNo") as string,
      date: formData.get("date") as string,
      address: formData.get("address") as string,
      notes: formData.get("notes") as string,
      attachmentUrl,
      branchId: isBranch ? branchId : (editingItem?.branchId || null),
      createdBy: isStaff ? staffId : isBranch ? branchId : 'admin',
      updatedAt: Date.now()
    }

    const dbPath = `Institutes/${resolvedId}/postal`
    try {
      if (editingItem) {
        await update(ref(database, `${dbPath}/${editingItem.id}`), data)
        toast({ title: "Updated", description: "Dispatch log updated successfully." })
      } else {
        await push(ref(database, dbPath), { ...data, createdAt: Date.now() })
        toast({ title: "Recorded", description: "New postal entry registered." })
      }
      setIsModalOpen(false)
      setEditingItem(null)
      setSelectedFile(null)
    } catch (err) {
      toast({ variant: "destructive", title: "Error" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveOption = () => {
    if (!newOptionValue.trim() || !resolvedId || !database) return
    const dbPath = `Institutes/${resolvedId}/dropdowns/parcelType`
    if (editingOptionId) {
      update(ref(database, `${dbPath}/${editingOptionId}`), { value: newOptionValue.trim() })
        .then(() => { setNewOptionValue(""); setEditingOptionId(null); })
    } else {
      push(ref(database, dbPath), { value: newOptionValue.trim() }).then(() => setNewOptionValue(""))
    }
  }

  const handleDelete = async () => {
    if (!database || !resolvedId || !itemToDelete) return
    setIsDeleting(true)
    try {
      const rootPath = `Institutes/${resolvedId}`
      await set(push(ref(database, `${rootPath}/trash/postal`)), { ...itemToDelete, deletedAt: Date.now() })
      await remove(ref(database, `${rootPath}/postal/${itemToDelete.id}`))
      toast({ title: "Moved to Trash" })
    } catch (err) {
      toast({ variant: "destructive", title: "Error" })
    } finally {
      setIsDeleting(false); setItemToDelete(null);
    }
  }

  const openManageModal = (key: string, label: string) => { 
    setActiveManageField({ key, label }); 
    setNewOptionValue(""); 
    setEditingOptionId(null); 
    setIsManageOpen(true); 
  }

  const downloadSampleCSV = () => {
    const ws = XLSX.utils.json_to_sheet([{ 
      Name: "John Doe", 
      Ref_No: "POST-12345",
      Parcel_Type: "Speed Post",
      Date: today,
      Address: "123 Academic Block, Education City",
      Notes: "Official certificates"
    }])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Sample")
    XLSX.writeFile(wb, "postal_import_sample.csv")
  }

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !resolvedId || !database) return
    const reader = new FileReader()
    reader.onload = async (evt) => {
      const bstr = evt.target?.result
      const wb = XLSX.read(bstr, { type: 'binary' })
      const wsname = wb.SheetNames[0]
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wsname])
      const dbPath = `Institutes/${resolvedId}/postal`
      for (const row of data as any[]) {
        await push(ref(database, dbPath), {
          name: row.Name || "Imported",
          refNo: row.Ref_No?.toString() || "",
          parcelType: row.Parcel_Type || "General",
          date: row.Date || today,
          address: row.Address || "",
          notes: row.Notes || "",
          createdAt: Date.now(),
          branchId: isBranch ? branchId : null,
          createdBy: isStaff ? staffId : isBranch ? branchId : 'admin'
        })
      }
      toast({ title: "Import Successful", description: `${data.length} records processed.` })
    }
    reader.readAsBinaryString(file)
    e.target.value = ""
  }

  const exportToExcel = () => {
    if (!filteredItems.length) return
    const data = filteredItems.map((p, i) => ({
      "Sr No": i + 1,
      "Name": p.name,
      "Reference No": p.refNo,
      "Parcel Type": p.parcelType,
      "Date": p.date,
      "Address": p.address,
      "Notes": p.notes
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "PostalLogs")
    XLSX.writeFile(wb, `postal_service_logs_${format(new Date(), "yyyy-MM-dd")}.xlsx`)
  }

  const exportToPdf = () => {
    if (!filteredItems.length) return
    const doc = new jsPDF('l', 'mm', 'a4')
    doc.setFontSize(20).setTextColor(13, 148, 136).text(instituteName, 14, 20)
    doc.setFontSize(12).setTextColor(100).text('Institutional Postal & Dispatch Report', 14, 30)
    
    const tableData = filteredItems.map((p, i) => [
      i + 1,
      p.name,
      p.refNo,
      p.parcelType,
      p.date,
      p.address || '-',
      p.notes || '-'
    ])

    autoTable(doc, {
      startY: 35,
      head: [['#', 'Name', 'Ref No', 'Type', 'Date', 'Address', 'Notes']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [13, 148, 136] },
      styles: { fontSize: 8 }
    })

    doc.save(`postal_report_${format(new Date(), "yyyy-MM-dd")}.pdf`)
  }

  const resetFilters = () => {
    setSearchTerm(""); setFilterParcelType("all"); setFromDate(""); setToDate(""); setCurrentPage(1);
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans">
      <Sidebar />
      <div className={cn("flex flex-col flex-1 min-w-0", !isPortal && "lg:pl-[280px]")}>
        <TopNav />
        <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-500 w-full overflow-x-hidden">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
            <div>
              <h2 className="text-[26px] font-normal text-black font-public-sans tracking-tight leading-none">Postal Service ({filteredItems.length})</h2>
              <p className="text-[14px] text-black font-medium mt-1">Manage institutional dispatch and parcel logs</p>
            </div>
            <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if(!open) { setEditingItem(null); setSelectedFile(null); } }}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingItem(null)} className="bg-primary hover:opacity-90 text-white rounded-xl h-11 px-10 font-medium text-[14px] border-none shadow-lg active:scale-95 transition-all">
                  Add New
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl p-0 border border-zinc-200 rounded-2xl overflow-hidden bg-white shadow-2xl">
                <div className="bg-white px-8 py-4 border-b border-zinc-100">
                  <DialogTitle className="text-lg font-bold text-black">{editingItem ? 'Update' : 'New'} Postal Record</DialogTitle>
                </div>
                <ScrollArea className="max-h-[75vh]">
                  <form onSubmit={handleSave} className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5"><Label className="text-[10px] font-bold text-black tracking-widest ml-1">Recipient / Sender Name</Label><Input name="name" defaultValue={editingItem?.name} required className="rounded-xl h-11" /></div>
                      <div className="space-y-1.5"><Label className="text-[10px] font-bold text-black tracking-widest ml-1">Reference No.</Label><Input name="refNo" defaultValue={editingItem?.refNo} required className="rounded-xl h-11" /></div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between px-1"><Label className="text-[10px] font-bold text-black tracking-widest">Parcel Type</Label><button type="button" onClick={() => setIsManageOpen(true)} className="text-[9px] font-bold text-blue-600 hover:underline">Manage <Settings2 className="w-2.5 h-2.5 inline" /></button></div>
                        <Select name="parcelType" defaultValue={editingItem?.parcelType || ""}>
                          <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Select Type" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="General">General</SelectItem>
                            {dropdownData.map(opt => (<SelectItem key={opt.id} value={opt.value}>{opt.value}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5"><Label className="text-[10px] font-bold text-black tracking-widest ml-1">Date</Label><Input name="date" type="date" defaultValue={editingItem?.date || today} required className="rounded-xl h-11" /></div>
                      <div className="md:col-span-2 space-y-1.5"><Label className="text-[10px] font-bold text-black tracking-widest ml-1">Physical Address</Label><Input name="address" defaultValue={editingItem?.address} required placeholder="Full shipping address..." className="rounded-xl h-11" /></div>
                      <div className="md:col-span-2 space-y-1.5"><Label className="text-[10px] font-bold text-black tracking-widest ml-1">Internal Notes</Label><Textarea name="notes" defaultValue={editingItem?.notes} placeholder="Additional parcel details..." className="rounded-xl min-h-[100px]" /></div>
                      <div className="md:col-span-2 space-y-1.5">
                        <Label className="text-[10px] font-bold text-black tracking-widest ml-1">Attach Receipt / Document</Label>
                        <div className="flex items-center gap-4">
                          <Input type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="rounded-xl h-11 border-dashed" accept="image/*,.pdf" />
                          {editingItem?.attachmentUrl && <Button variant="outline" asChild size="icon" className="h-11 w-11 shrink-0"><a href={editingItem.attachmentUrl} target="_blank"><Download className="w-4 h-4" /></a></Button>}
                        </div>
                      </div>
                    </div>
                    <div className="pt-4"><Button type="submit" disabled={isSubmitting} className="w-fit h-10 px-10 bg-primary hover:opacity-90 text-white rounded-xl font-normal text-[10px] tracking-widest shadow-lg border-none active:scale-95 transition-all">{isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} {editingItem ? 'Update' : 'Submit'}</Button></div>
                  </form>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="border-none shadow-sm rounded-3xl bg-white p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-black font-inter" style={{ fontWeight: 500 }}>Select Criteria</h3>
              {hasActiveFilters && (
                <Button onClick={resetFilters} variant="ghost" className="h-8 px-4 text-rose-500 hover:bg-rose-50 rounded-lg text-[10px] font-black tracking-widest transition-all">
                  Reset Filters <X className="ml-2 w-3 h-3" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="space-y-2">
                <div className="flex justify-between px-1"><Label className="text-[12px] font-medium text-black tracking-widest">Parcel Type</Label><button onClick={() => openManageModal('parcelType', 'Parcel Type')} className="text-[9px] font-bold text-blue-600 hover:underline">Manage</button></div>
                <Select value={filterParcelType} onValueChange={(v) => { setFilterParcelType(v); setCurrentPage(1); }}>
                  <SelectTrigger className="h-11 rounded-xl bg-white border-zinc-200 font-bold text-black shadow-sm text-[14px] transition-none">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="General">General</SelectItem>
                    {dropdownData.map(opt => (<SelectItem key={opt.id} value={opt.value}>{opt.value}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[12px] font-medium text-black tracking-widest ml-1">From Date</Label>
                <Input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setCurrentPage(1); }} className="h-11 rounded-xl bg-white border-zinc-200 text-[14px] font-bold text-black shadow-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-[12px] font-medium text-black tracking-widest ml-1">To Date</Label>
                <Input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setCurrentPage(1); }} className="h-11 rounded-xl bg-white border-zinc-200 text-[14px] font-bold text-black shadow-sm" />
              </div>
            </div>
          </Card>

          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
              <div className="relative group w-full md:w-80">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-300 group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="pl-10 h-11 border-zinc-200 rounded-lg text-[14px] font-normal text-black focus-visible:ring-primary shadow-sm transition-none bg-white"
                />
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <Button variant="outline" onClick={downloadSampleCSV} className="h-11 px-5 text-[hsl(var(--primary))] border-[hsl(var(--primary))]/20 rounded-xl transition-none gap-2 font-normal text-[14px] bg-white hover:bg-emerald-50 shadow-sm"><Download className="h-4 w-4" /> Sample CSV</Button>
                <input type="file" ref={fileInputRef} onChange={handleImportCSV} className="hidden" accept=".csv" />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="h-11 px-5 text-indigo-600 border-indigo-100 rounded-xl transition-none gap-2 font-bold text-[14px] bg-white hover:bg-indigo-50 shadow-sm"><Upload className="h-4 w-4" /> Import CSV</Button>
                <Button variant="outline" onClick={exportToExcel} className="h-11 px-5 text-emerald-600 border-emerald-100 rounded-xl transition-none gap-2.5 font-bold text-[14px] bg-white hover:bg-emerald-50 shadow-sm"><FileSpreadsheet className="h-4 w-4" /> Export Excel</Button>
                <Button variant="outline" onClick={exportToPdf} className="h-11 px-5 text-rose-600 border-rose-100 rounded-xl transition-none gap-2.5 font-bold text-[14px] shadow-sm bg-white hover:bg-rose-50"><FileText className="h-4 w-4" /> Export PDF</Button>
              </div>
            </div>

            <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
              <div className="overflow-x-auto scrollbar-thin">
                <Table className="min-w-[1800px]">
                  <TableHeader className="bg-zinc-50/50">
                    <TableRow className="border-zinc-100 hover:bg-transparent">
                      <TableHead className="pl-8 text-[14px] font-medium text-black h-14 w-20" style={{ fontWeight: 500 }}>Sr No.</TableHead>
                      <TableHead className="text-[14px] font-medium text-black h-14" style={{ fontWeight: 500 }}>Actions</TableHead>
                      <TableHead className="text-[14px] font-medium text-black h-14" style={{ fontWeight: 500 }}>Recipient / Sender Name</TableHead>
                      <TableHead className="text-[14px] font-medium text-black h-14" style={{ fontWeight: 500 }}>Reference No.</TableHead>
                      <TableHead className="text-[14px] font-medium text-black h-14" style={{ fontWeight: 500 }}>Type</TableHead>
                      <TableHead className="text-[14px] font-medium text-black h-14" style={{ fontWeight: 500 }}>Notes</TableHead>
                      <TableHead className="text-right pr-8 text-[14px] font-medium text-black h-14" style={{ fontWeight: 500 }}>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedItems.map((row, index) => (
                      <TableRow key={row.id} className="border-zinc-50 hover:bg-zinc-50/30 transition-none group">
                        <TableCell className="text-[14px] font-medium text-black pl-8">{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                        <TableCell><div className="flex items-center gap-1"><Button variant="ghost" size="icon" onClick={() => { setEditingItem(row); setIsModalOpen(true); }} className="h-8 w-8 text-blue-500 hover:bg-blue-50 transition-none"><Edit2 className="h-3.5 w-3.5" /></Button><button onClick={() => setItemToDelete(row)} className="p-1 text-black hover:text-rose-500 transition-none"><Trash2 className="h-4 w-4" /></button>{row.attachmentUrl && (<Button variant="ghost" size="icon" asChild className="h-8 w-8 text-emerald-500 hover:bg-emerald-50 rounded-xl"><a href={row.attachmentUrl} target="_blank"><Paperclip className="h-4 w-4" /></a></Button>)}</div></TableCell>
                        <TableCell><div className="flex flex-col py-2"><span className="text-[14px] font-bold text-black font-public-sans tracking-tighter">{row.name}</span><span className="text-[14px] text-black font-medium truncate max-w-[300px]">{row.address || 'No Address Provided'}</span></div></TableCell>
                        <TableCell className="text-[14px] font-bold text-primary font-public-sans tracking-tighter">{row.refNo}</TableCell>
                        <TableCell><Badge variant="outline" className="rounded-lg text-[9px] font-black border-zinc-100 text-black">{row.parcelType}</Badge></TableCell>
                        <TableCell className="max-w-[300px] truncate text-[14px] text-black font-medium italic">"{row.notes || '-'}"</TableCell>
                        <TableCell className="text-right pr-8 text-[14px] text-black font-medium">{row.date}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>

            <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-2 pt-4">
              <p className="text-[10px] font-black text-black tracking-widest">Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length} entries</p>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4">
                  <Button variant="ghost" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-9 rounded-xl font-bold text-[10px] tracking-widest transition-none"><ChevronLeft className="w-4 h-4 mr-2" /> Previous</Button>
                  <div className="flex items-center gap-2">{[...Array(totalPages)].map((_, i) => (<button key={i} onClick={() => setCurrentPage(i + 1)} className={cn("w-10 h-10 rounded-xl text-[10px] font-black transition-all", currentPage === i + 1 ? "bg-primary text-white shadow-xl scale-110" : "bg-white text-black border border-zinc-100 hover:bg-zinc-50")}>{i + 1}</button>))}</div>
                  <Button variant="ghost" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-9 rounded-xl font-bold text-[10px] tracking-widest transition-none">Next <ChevronRight className="w-4 h-4 ml-2" /></Button>
                </div>
              )}
            </div>
          </div>

          <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
            <DialogContent className="max-w-md rounded-[32px] p-10 bg-white border-none shadow-2xl">
              <div className="flex items-center justify-between mb-6"><DialogTitle className="text-xl font-bold tracking-tight">Parcel Types</DialogTitle></div>
              <div className="flex gap-2 mb-6"><Input value={newOptionValue} onChange={(e) => setNewOptionValue(e.target.value)} placeholder="New type..." className="rounded-xl h-11 border-zinc-100" /><Button onClick={handleSaveOption} className="bg-primary text-white rounded-xl px-6 font-bold text-[14px] tracking-widest">Add</Button></div>
              <ScrollArea className="h-64 pr-4"><div className="space-y-2">{(dropdownData['parcelType'] || []).map(opt => (<div key={opt.id} className="flex items-center justify-between p-3 rounded-xl border border-zinc-100 hover:bg-zinc-50 transition-all"><span className="text-[14px] font-bold text-black">{opt.value}</span><div className="flex items-center gap-1"><Button variant="ghost" size="icon" onClick={() => { setEditingOptionId(opt.id); setNewOptionValue(opt.value); }} className="text-blue-500 h-8 w-8"><Edit2 className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" onClick={() => remove(ref(database!, `Institutes/${resolvedId}/dropdowns/parcelType/${opt.id}`))} className="text-rose-500 h-8 w-8"><Trash2 className="h-3.5 w-3.5" /></Button></div></div>))}</div></ScrollArea>
            </DialogContent>
          </Dialog>

          <AlertDialog open={!!itemToDelete} onOpenChange={(o) => { if(!o) setItemToDelete(null) }}>
            <AlertDialogContent className="rounded-3xl border-none shadow-2xl bg-white p-10">
              <AlertDialogHeader><div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-rose-50 text-rose-500"><AlertCircle className="w-8 h-8" /></div><AlertDialogTitle className="text-xl font-bold text-black">Move To Trash?</AlertDialogTitle><AlertDialogDescription className="text-black text-[14px] leading-relaxed font-medium">Are you sure you want to move the record for <span className="font-bold text-black">"{itemToDelete?.name}"</span> to the institutional trash bin?</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter className="mt-6 gap-3"><AlertDialogCancel className="rounded-xl border-zinc-100 text-black font-bold h-11 px-6">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl border-none font-bold h-11 px-8 active:scale-95 transition-all">Move To Trash</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </main>
      </div>
    </div>
  )
}
