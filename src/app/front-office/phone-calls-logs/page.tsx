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
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { 
  Search, 
  Trash2, 
  Edit2, 
  PhoneIncoming, 
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  FileText,
  Clock,
  Calendar,
  Settings2,
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
import { useResolvedId } from "@/hooks/use-resolved-id"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import { usePathname } from "next/navigation"
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from "date-fns"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"

export default function PhoneCallsLogsPage() {
  const pathname = usePathname()
  const isPortal = (pathname.startsWith('/branch') && !pathname.startsWith('/branch-management')) || 
                   pathname.startsWith('/staff') || 
                   (pathname.startsWith('/student') && !pathname.startsWith('/student-information'))

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [items, setItems] = useState<any[]>([])
  const [editingItem, setEditingItem] = useState<any>(null)
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCallTypes, setFilterCallTypes] = useState<string[]>([])
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  
  const [instituteName, setInstituteName] = useState("Your Institute")
  const [dropdownData, setDropdownData] = useState<any[]>([])
  const [isManageOpen, setIsManageOpen] = useState(false)
  const [newOptionValue, setNewOptionValue] = useState("")
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  
  // Action States
  const [itemToDelete, setItemToDelete] = useState<any>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { database } = useFirebase()
  const { resolvedId, staffId, branchId, isStaff, isBranch } = useResolvedId()

  const today = useMemo(() => new Date().toISOString().split('T')[0], [])

  useEffect(() => {
    if (!database || !resolvedId) return
    const rootPath = `Institutes/${resolvedId}`
    
    const dbRef = ref(database, `${rootPath}/call-logs`)
    const unsubscribeLogs = onValue(dbRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setItems(Object.keys(data).map(key => ({ ...data[key], id: key })).reverse())
      } else {
        setItems([])
      }
    })

    const dropdownRef = ref(database, `${rootPath}/dropdowns/callType`)
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
      off(dbRef)
      off(dropdownRef)
      off(profileRef)
    }
  }, [database, resolvedId])

  const hasActiveFilters = useMemo(() => {
    return filterCallTypes.length > 0 || fromDate !== "" || toDate !== "" || searchTerm !== ""
  }, [filterCallTypes, fromDate, toDate, searchTerm])

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
        item.phone?.includes(searchTerm)

      const matchType = filterCallTypes.length === 0 || filterCallTypes.includes(item.callType)

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
  }, [items, searchTerm, filterCallTypes, fromDate, toDate, isStaff, staffId, isBranch, branchId])

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
    const data = {
      name: formData.get("name") as string,
      phone: formData.get("phone") as string,
      callType: formData.get("callType") as string,
      duration: formData.get("duration") as string,
      date: formData.get("date") as string,
      nextFollowUpDate: formData.get("nextFollowUpDate") as string,
      description: formData.get("description") as string,
      notes: formData.get("notes") as string,
      branchId: isBranch ? branchId : (editingItem?.branchId || null),
      createdBy: isStaff ? staffId : isBranch ? branchId : 'admin',
      updatedAt: Date.now()
    }

    const dbPath = `Institutes/${resolvedId}/call-logs`
    try {
      if (editingItem) {
        await update(ref(database, `${dbPath}/${editingItem.id}`), data)
        toast({ title: "Updated", description: "Call log updated." })
      } else {
        await push(ref(database, dbPath), { ...data, createdAt: Date.now() })
        toast({ title: "Logged", description: "Phone call entry recorded." })
      }
      setIsModalOpen(false)
      setEditingItem(null)
    } catch (err) {
      toast({ variant: "destructive", title: "Error" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveOption = () => {
    if (!newOptionValue.trim() || !resolvedId || !database) return
    const dbPath = `Institutes/${resolvedId}/dropdowns/callType`
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
      await set(push(ref(database, `${rootPath}/trash/call-logs`)), { ...itemToDelete, deletedAt: Date.now() })
      await remove(ref(database, `${rootPath}/call-logs/${itemToDelete.id}`))
      toast({ title: "Moved to Trash" })
    } catch (err) {
      toast({ variant: "destructive", title: "Error" })
    } finally {
      setIsDeleting(false); setItemToDelete(null);
    }
  }

  const downloadSampleCSV = () => {
    const ws = XLSX.utils.json_to_sheet([{ 
      Name: "John Smith", 
      Phone: "9876543210", 
      Call_Type: "Incoming", 
      Duration: "5m 30s", 
      Date: today, 
      Next_FollowUp: today,
      Topic: "Fee Inquiry",
      Notes: "Wants detailed structure"
    }])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Sample")
    XLSX.writeFile(wb, "call_log_sample.csv")
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
      const dbPath = `Institutes/${resolvedId}/call-logs`
      for (const row of data as any[]) {
        await push(ref(database, dbPath), {
          name: row.Name || "Imported",
          phone: row.Phone?.toString() || "",
          callType: row.Call_Type || "Incoming",
          duration: row.Duration || "",
          date: row.Date || today,
          nextFollowUpDate: row.Next_FollowUp || "",
          description: row.Topic || "",
          notes: row.Notes || "",
          createdAt: Date.now(),
          branchId: isBranch ? branchId : null,
          createdBy: isStaff ? staffId : isBranch ? branchId : 'admin'
        })
      }
      toast({ title: "Import Successful", description: `${data.length} logs imported.` })
    }
    reader.readAsBinaryString(file)
    e.target.value = ""
  }

  const exportToExcel = () => {
    if (!filteredItems.length) return
    const data = filteredItems.map((c, i) => ({
      "Sr No": i + 1,
      "Name": c.name,
      "Phone": c.phone,
      "Type": c.callType,
      "Duration": c.duration,
      "Date": c.date,
      "Next Follow-up": c.nextFollowUpDate || '-',
      "Topic": c.description,
      "Notes": c.notes || '-'
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "CallLogs")
    XLSX.writeFile(wb, `phone_call_logs_${format(new Date(), "yyyy-MM-dd")}.xlsx`)
  }

  const exportToPdf = () => {
    if (!filteredItems.length) return
    const doc = new jsPDF('l', 'mm', 'a4')
    doc.setFontSize(20).setTextColor(13, 148, 136).text(instituteName, 14, 20)
    doc.setFontSize(12).setTextColor(100).text('Institutional Phone Call Records', 14, 30)
    
    const tableData = filteredItems.map((c, i) => [
      i + 1,
      c.name,
      c.phone,
      c.callType,
      c.duration,
      c.date,
      c.nextFollowUpDate || '-',
      c.description
    ])

    autoTable(doc, {
      startY: 35,
      head: [['#', 'Name', 'Phone', 'Type', 'Dur.', 'Date', 'Follow-up', 'Topic']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [13, 148, 136] },
      styles: { fontSize: 8 }
    })

    doc.save(`call_logs_${format(new Date(), "yyyy-MM-dd")}.pdf`)
  }

  const resetFilters = () => {
    setFilterCallTypes([]); setFromDate(""); setToDate(""); setSearchTerm(""); setCurrentPage(1);
  }

  const toggleCallTypeFilter = (value: string) => {
    setFilterCallTypes(prev => 
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    )
    setCurrentPage(1)
  }

  const allCallTypes = useMemo(() => {
    const defaultTypes = ["Incoming", "Outgoing"]
    const dynamicTypes = dropdownData.map(d => d.value)
    return Array.from(new Set([...defaultTypes, ...dynamicTypes]))
  }, [dropdownData])

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans overflow-x-hidden">
      <Sidebar />
      <div className={cn("flex flex-col flex-1 min-w-0", !isPortal && "lg:pl-[280px]")}>
        <TopNav />
        <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-500 w-full overflow-x-hidden">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
            <h2 className="text-3xl font-normal text-black font-public-sans leading-none">Phone Call Log ({filteredItems.length})</h2>
            <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if(!open) setEditingItem(null); }}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingItem(null)} className="bg-primary hover:opacity-90 text-white rounded-xl h-11 px-10 font-medium text-[14px] border-none shadow-lg active:scale-95 transition-all">
                  Add New
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl p-0 border border-zinc-200 rounded-2xl overflow-hidden bg-white shadow-2xl">
                <div className="bg-white px-8 py-4 border-b border-zinc-100">
                  <DialogTitle className="text-lg font-bold text-black">New Call Record</DialogTitle>
                </div>
                <ScrollArea className="max-h-[75vh]">
                  <form onSubmit={handleSave} className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5"><Label className="text-[10px] font-bold text-black tracking-widest ml-1">Name</Label><Input name="name" defaultValue={editingItem?.name} required className="rounded-xl h-11" /></div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-black tracking-widest ml-1">Phone</Label>
                        <Input name="phone" type="text" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} onInput={(e) => e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, '')} defaultValue={editingItem?.phone} required placeholder="Phone" className="rounded-xl h-11" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between px-1"><Label className="text-[10px] font-bold text-black tracking-widest">Call Type</Label><button type="button" onClick={() => setIsManageOpen(true)} className="text-[9px] font-bold text-blue-600 hover:underline">Manage <Settings2 className="w-2.5 h-2.5 inline" /></button></div>
                        <Select name="callType" defaultValue={editingItem?.callType || ""}>
                          <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Select Type" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Incoming">Incoming</SelectItem>
                            <SelectItem value="Outgoing">Outgoing</SelectItem>
                            {dropdownData.map(opt => <SelectItem key={opt.id} value={opt.value}>{opt.value}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5"><Label className="text-[10px] font-bold text-black tracking-widest ml-1">Duration</Label><Input name="duration" defaultValue={editingItem?.duration} placeholder="e.g. 5m 20s" className="rounded-xl h-11" /></div>
                      <div className="space-y-1.5"><Label className="text-[10px] font-bold text-black tracking-widest ml-1">Date</Label><Input name="date" type="date" defaultValue={editingItem?.date || today} required className="rounded-xl h-11" /></div>
                      <div className="space-y-1.5"><Label className="text-[10px] font-bold text-black tracking-widest ml-1">Next Follow-up</Label><Input name="nextFollowUpDate" type="date" defaultValue={editingItem?.nextFollowUpDate} className="rounded-xl h-11" /></div>
                      <div className="md:col-span-2 space-y-1.5"><Label className="text-[10px] font-bold text-black tracking-widest ml-1">Topic / Description</Label><Input name="description" defaultValue={editingItem?.description} required placeholder="Reason for call..." className="rounded-xl h-11" /></div>
                      <div className="md:col-span-2 space-y-1.5"><Label className="text-[10px] font-bold text-black tracking-widest ml-1">Internal Notes</Label><Textarea name="notes" defaultValue={editingItem?.notes} placeholder="Additional context..." className="rounded-xl min-h-[100px]" /></div>
                    </div>
                    <div className="pt-4"><Button type="submit" disabled={isSubmitting} className="w-fit h-10 px-10 bg-primary hover:opacity-90 text-white rounded-xl font-medium text-[10px] tracking-widest shadow-lg border-none active:scale-95 transition-all">{isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Submit Record"}</Button></div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="space-y-2">
                <Label className="text-[12px] font-medium text-black tracking-widest ml-1">Call Type</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="w-full h-11 px-4 rounded-xl border border-zinc-200 bg-white flex items-center justify-between text-[14px] font-bold text-black shadow-inner group hover:border-primary transition-colors transition-none">
                      <span className="truncate">{filterCallTypes.length > 0 ? `${filterCallTypes.length} Types Selected` : "Select Call Types"}</span>
                      <Filter className="w-3.5 h-3.5 text-zinc-300 group-hover:text-primary" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0 rounded-2xl overflow-hidden border-zinc-100 shadow-2xl">
                    <div className="bg-zinc-50 p-4 border-b border-zinc-100 flex justify-between items-center">
                      <p className="text-[9px] font-black text-black tracking-widest">Multi-Select Type</p>
                      <button onClick={() => setIsManageOpen(true)} className="text-[9px] font-bold text-blue-600 hover:underline">Manage</button>
                    </div>
                    <ScrollArea className="h-64">
                      <div className="p-2 space-y-1">
                        {allCallTypes.map(type => (
                          <div key={type} onClick={() => toggleCallTypeFilter(type)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-50 cursor-pointer transition-colors group">
                            <Checkbox checked={filterCallTypes.includes(type)} onCheckedChange={() => toggleCallTypeFilter(type)} className="data-[state=checked]:bg-primary" />
                            <span className="text-[14px] font-bold text-black group-hover:text-black">{type}</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
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
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-black group-focus-within:text-primary transition-colors" />
                <Input placeholder="Search..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="pl-11 h-11 bg-white border-zinc-200 rounded-full text-[14px] font-medium transition-none focus-visible:ring-primary shadow-sm" />
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <Button variant="outline" onClick={downloadSampleCSV} className="h-11 px-5 text-[hsl(var(--primary))] border-[hsl(var(--primary))]/20 rounded-xl transition-none gap-2 font-bold text-[14px] bg-white hover:bg-emerald-50 shadow-sm"><Download className="h-4 w-4" /> Sample CSV</Button>
                <input type="file" ref={fileInputRef} onChange={handleImportCSV} className="hidden" accept=".csv" />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="h-11 px-5 text-indigo-600 border-indigo-100 rounded-xl transition-none gap-2 font-bold text-[14px] bg-white hover:bg-indigo-50 shadow-sm"><Upload className="h-4 w-4" /> Import CSV</Button>
                <Button variant="outline" onClick={exportToExcel} className="h-11 px-4 text-emerald-600 border-emerald-100 rounded-xl transition-none gap-2.5 font-bold text-[14px] bg-white hover:bg-emerald-50 shadow-sm"><FileSpreadsheet className="h-4 w-4" /> Export Excel</Button>
                <Button variant="outline" onClick={exportToPdf} className="h-11 px-4 text-rose-600 border-rose-100 rounded-xl transition-none gap-2.5 font-bold text-[14px] shadow-sm bg-white hover:bg-rose-50"><FileText className="h-4 w-4" /> Export PDF</Button>
              </div>
            </div>

            <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
              <div className="overflow-x-auto scrollbar-thin">
                <Table className="min-w-[1600px]">
                  <TableHeader className="bg-zinc-50/50">
                    <TableRow className="border-zinc-100 hover:bg-transparent">
                      <TableHead className="text-[13px] font-medium text-black h-14 pl-8 w-20">Sr No</TableHead>
                      <TableHead className="text-[13px] font-medium text-black h-14">Actions</TableHead>
                      <TableHead className="text-[13px] font-medium text-black h-14">Type</TableHead>
                      <TableHead className="text-[13px] font-medium text-black h-14">Name</TableHead>
                      <TableHead className="text-[13px] font-medium text-black h-14">Phone</TableHead>
                      <TableHead className="text-[13px] font-medium text-black h-14 text-center">Duration</TableHead>
                      <TableHead className="text-[13px] font-medium text-black h-14">Date</TableHead>
                      <TableHead className="text-[13px] font-medium text-black h-14">Follow-up</TableHead>
                      <TableHead className="text-right pr-8 text-[13px] font-medium text-black h-14">Topic</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedItems.map((row, index) => (
                      <TableRow key={row.id} className="border-zinc-50 hover:bg-zinc-50/30 transition-none group">
                        <TableCell className="text-[14px] font-medium text-black pl-8">{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                        <TableCell><div className="flex items-center gap-1"><Button variant="ghost" size="icon" onClick={() => { setEditingItem(row); setIsModalOpen(true); }} className="h-8 w-8 text-blue-500 hover:bg-blue-50 transition-none"><Edit2 className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" onClick={() => setItemToDelete(row)} className="h-8 w-8 text-rose-500 hover:bg-rose-50 transition-none"><Trash2 className="h-3.5 w-3.5" /></Button></div></TableCell>
                        <TableCell><Badge className={cn("rounded-lg px-2.5 py-0.5 text-[9px] font-black  border-none shadow-none", row.callType === 'Incoming' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600")}>{row.callType}</Badge></TableCell>
                        <TableCell><span className="text-[14px] font-bold text-black font-public-sans tracking-tighter">{row.name}</span></TableCell>
                        <TableCell><span className="text-[14px] font-bold text-black font-public-sans tracking-tighter">{row.phone}</span></TableCell>
                        <TableCell className="text-center text-[14px] font-bold text-black font-public-sans tracking-tighter">{row.duration || '-'}</TableCell>
                        <TableCell className="text-[14px] font-medium text-black">{row.date}</TableCell>
                        <TableCell className="text-[14px] font-medium text-black">{row.nextFollowUpDate || '-'}</TableCell>
                        <TableCell className="text-right pr-8"><div className="flex flex-col items-end"><span className="text-[14px] font-bold text-black">{row.description}</span><span className="text-[10px] text-black italic line-clamp-1 max-w-[300px]">{row.notes || 'No extra notes'}</span></div></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>

            <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-2">
              <p className="text-[10px] font-black text-black tracking-widest">Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length} entries</p>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 pt-4">
                  <Button variant="ghost" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-9 rounded-xl font-bold text-[10px] tracking-widest transition-none"><ChevronLeft className="w-4 h-4 mr-2" /> Previous</Button>
                  <div className="flex items-center gap-2">{[...Array(totalPages)].map((_, i) => (<button key={i} onClick={() => setCurrentPage(i + 1)} className={cn("w-10 h-10 rounded-xl text-[10px] font-black transition-all", currentPage === i + 1 ? "bg-primary text-white shadow-xl scale-110" : "bg-white text-black border border-zinc-100")}>{i + 1}</button>))}</div>
                  <Button variant="ghost" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-9 rounded-xl font-bold text-[10px] tracking-widest transition-none">Next <ChevronRight className="w-4 h-4 ml-2" /></Button>
                </div>
              )}
            </div>
          </div>

          <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
            <DialogContent className="max-w-md rounded-[32px] p-10 bg-white border-none shadow-2xl">
              <div className="flex items-center justify-between mb-8"><DialogTitle className="text-xl font-bold tracking-tight">Call Type Management</DialogTitle></div>
              <div className="flex gap-2 mb-8"><Input value={newOptionValue} onChange={(e) => setNewOptionValue(e.target.value)} placeholder="New type..." className="rounded-xl h-12" /><Button onClick={handleSaveOption} className="bg-primary text-white rounded-xl px-8 h-12 border-none">Add</Button></div>
              <ScrollArea className="h-64 pr-4"><div className="space-y-2">{dropdownData.map(opt => (<div key={opt.id} className="flex items-center justify-between p-4 rounded-xl border border-zinc-100 hover:bg-zinc-50 transition-all"><span className="text-[14px] font-bold text-black">{opt.value}</span><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => { setEditingOptionId(opt.id); setNewOptionValue(opt.value); }} className="text-blue-500 h-8 w-8"><Edit2 className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" onClick={() => remove(ref(database!, `Institutes/${resolvedId}/dropdowns/callType/${opt.id}`))} className="text-rose-500 h-8 w-8"><Trash2 className="h-3.5 w-3.5" /></Button></div></div>))}</div></ScrollArea>
            </DialogContent>
          </Dialog>

          <AlertDialog open={!!itemToDelete} onOpenChange={(o) => { if(!o) setItemToDelete(null) }}>
            <AlertDialogContent className="rounded-3xl border-none shadow-2xl bg-white p-10">
              <AlertDialogHeader><div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-rose-50 text-rose-500"><AlertCircle className="w-8 h-8" /></div><AlertDialogTitle className="text-xl font-bold text-black">Move to Trash?</AlertDialogTitle><AlertDialogDescription className="text-black text-[14px] leading-relaxed">Are you sure you want to move the call log for <span className="font-bold text-black">"{itemToDelete?.name}"</span> to the institutional trash bin?</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter className="mt-6 gap-3"><AlertDialogCancel className="rounded-xl border-zinc-100 text-black font-bold h-11 px-6">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl border-none font-bold h-11 px-8 active:scale-95 transition-all">{isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Move to Trash"}</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </main>
      </div>
    </div>
  )
}

function MultiCriteriaBox({ label, selected, onToggle, options }: { label: string, selected: string[], onToggle: (v: string) => void, options: any[] }) {
  return (
    <div className="space-y-2">
      <Label className="text-[10px] font-bold text-black tracking-widest">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <button className="w-full h-11 px-4 rounded-xl border border-zinc-200 bg-white flex items-center justify-between text-[14px] font-bold text-black shadow-inner group hover:border-primary transition-colors transition-none">
            <span className="truncate">{selected.length > 0 ? `${selected.length} Selected` : "Select Options"}</span>
            <Filter className="w-3.5 h-3.5 text-zinc-300 group-hover:text-primary" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0 rounded-2xl overflow-hidden border-zinc-100 shadow-2xl">
          <div className="bg-zinc-50 p-4 border-b border-zinc-100"><p className="text-[9px] font-black text-black tracking-widest">Select Multiple</p></div>
          <ScrollArea className="h-64">
            <div className="p-2 space-y-1">
              {options.map(opt => (
                <div key={opt.id} onClick={() => onToggle(opt.value)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-50 cursor-pointer transition-colors group">
                  <Checkbox checked={selected.includes(opt.value)} onCheckedChange={() => onToggle(opt.value)} className="data-[state=checked]:bg-primary" />
                  <span className="text-[14px] font-bold text-black group-hover:text-black">{opt.value}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  )
}
