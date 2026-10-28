
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
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  Package, 
  X,
  Settings2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  FileText,
  Download,
  Upload,
  Filter,
  Info,
  Calendar,
  User,
  History
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

export default function InventoryPage() {
  const pathname = usePathname()
  const isPortal = (pathname.startsWith('/branch') && !pathname.startsWith('/branch-management')) || 
                   pathname.startsWith('/staff') || 
                   (pathname.startsWith('/student') && !pathname.startsWith('/student-information'))

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [items, setItems] = useState<any[]>([])
  const [editingItem, setEditingItem] = useState<any>(null)
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategory, setFilterCategory] = useState("all")
  const [filterIssuedTo, setFilterIssuedTo] = useState("all")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  
  const [instituteName, setInstituteName] = useState("Your Institute")
  const [dropdownData, setDropdownData] = useState<Record<string, any[]>>({})
  const [isManageOpen, setIsManageOpen] = useState(false)
  const [activeManageField, setActiveManageField] = useState<{key: string, label: string} | null>(null)
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
  const { database, storage } = useFirebase()
  const { resolvedId, staffId, branchId, isStaff, isBranch } = useResolvedId()

  const today = useMemo(() => new Date().toISOString().split('T')[0], [])

  useEffect(() => {
    if (!database || !resolvedId) return
    const rootPath = `Institutes/${resolvedId}`
    
    // Fetch Inventory
    const dbRef = ref(database, `${rootPath}/inventory`)
    const unsubscribeInventory = onValue(dbRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setItems(Object.keys(data).map(key => ({ ...data[key], id: key })).reverse())
      } else {
        setItems([])
      }
    })

    // Fetch Dropdowns
    const dropdownsRef = ref(database, `${rootPath}/dropdowns`)
    onValue(dropdownsRef, (snapshot) => {
      const data = snapshot.val() || {}
      const processed: Record<string, any[]> = {}
      Object.keys(data).forEach(key => {
        processed[key] = Object.keys(data[key]).map(id => ({ id, value: data[key][id].value }))
      })
      setDropdownData(processed)
    })

    const profileRef = ref(database, `${rootPath}/profile`)
    onValue(profileRef, (snapshot) => {
      const data = snapshot.val()
      if (data?.instituteName) setInstituteName(data.instituteName)
    })

    return () => { 
      off(dbRef); 
      off(dropdownsRef); 
      off(profileRef);
    }
  }, [database, resolvedId])

  const hasActiveFilters = useMemo(() => {
    return filterCategory !== 'all' || filterIssuedTo !== 'all' || fromDate !== "" || toDate !== "" || searchTerm !== ""
  }, [filterCategory, filterIssuedTo, fromDate, toDate, searchTerm])

  const filteredItems = useMemo(() => {
    let list = items
    
    if (isStaff && staffId) {
      list = list.filter(item => item.createdBy === staffId)
    } else if (isBranch && branchId) {
      list = list.filter(item => item.branchId === branchId)
    }

    return list.filter(item => {
      const matchSearch = !searchTerm || 
        item.itemName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.itemId?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchCategory = filterCategory === 'all' || item.category === filterCategory
      const matchIssuedTo = filterIssuedTo === 'all' || item.issuedTo === filterIssuedTo

      let matchDate = true
      if (fromDate || toDate) {
        try {
          const itemDate = parseISO(item.issueDate)
          const start = fromDate ? startOfDay(parseISO(fromDate)) : null
          const end = toDate ? endOfDay(parseISO(toDate)) : null
          
          if (start && end) matchDate = isWithinInterval(itemDate, { start, end })
          else if (start) matchDate = itemDate >= start
          else if (end) matchDate = itemDate <= end
        } catch (e) {
          matchDate = true
        }
      }

      return matchSearch && matchCategory && matchIssuedTo && matchDate
    })
  }, [items, searchTerm, filterCategory, filterIssuedTo, fromDate, toDate, isStaff, staffId, isBranch, branchId])

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
      itemId: formData.get("itemId") as string,
      itemName: formData.get("itemName") as string,
      category: formData.get("category") as string,
      description: formData.get("description") as string,
      quantityAvailable: formData.get("quantityAvailable") as string,
      quantityAllotted: formData.get("quantityAllotted") as string,
      issueDate: formData.get("issueDate") as string,
      issuedTo: formData.get("issuedTo") as string,
      issuedBy: formData.get("issuedBy") as string,
      remarks: formData.get("remarks") as string,
      branchId: isBranch ? branchId : (editingItem?.branchId || null),
      createdBy: isStaff ? staffId : isBranch ? branchId : 'admin',
      updatedAt: Date.now()
    }

    const dbPath = `Institutes/${resolvedId}/inventory`
    try {
      if (editingItem) {
        await update(ref(database, `${dbPath}/${editingItem.id}`), data)
        toast({ title: "Updated", description: "Inventory item updated successfully." })
      } else {
        await push(ref(database, dbPath), { ...data, createdAt: Date.now() })
        toast({ title: "Added", description: "New inventory item registered." })
      }
      setIsModalOpen(false)
      setEditingItem(null)
    } catch (err) {
      toast({ variant: "destructive", title: "Error" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const openManageModal = (key: string, label: string) => { 
    setActiveManageField({ key, label }); 
    setNewOptionValue(""); 
    setEditingOptionId(null); 
    setIsManageOpen(true); 
  }

  const handleSaveOption = () => {
    if (!newOptionValue.trim() || !resolvedId || !database || !activeManageField) return
    const dbPath = `Institutes/${resolvedId}/dropdowns/${activeManageField.key}`
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
      await set(push(ref(database, `${rootPath}/trash/inventory`)), { ...itemToDelete, deletedAt: Date.now() })
      await remove(ref(database, `${rootPath}/inventory/${itemToDelete.id}`))
      toast({ title: "Moved to Trash" })
    } catch (err) {
      toast({ variant: "destructive", title: "Error" })
    } finally {
      setIsDeleting(false); setItemToDelete(null);
    }
  }

  const downloadSampleCSV = () => {
    const ws = XLSX.utils.json_to_sheet([{ 
      Item_ID: "INV-001", 
      Item_Name: "Educational Kit", 
      Category: "Uniform", 
      Quantity_Available: "100", 
      Quantity_Allotted: "1", 
      Issue_Date: today, 
      Issued_To: "John Smith",
      Issued_By: "Admin",
      Description: "School bag + t-shirt",
      Remarks: "Once allotted, can't be reversed"
    }])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Sample")
    XLSX.writeFile(wb, "inventory_sample.csv")
  }

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (evt) => {
      const bstr = evt.target?.result
      const wb = XLSX.read(bstr, { type: 'binary' })
      const wsname = wb.SheetNames[0]
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wsname])
      const dbPath = `Institutes/${resolvedId}/inventory`
      for (const row of data as any[]) {
        await push(ref(database!, dbPath), {
          itemId: row.Item_ID || `AUTO-${Date.now()}`,
          itemName: row.Item_Name || "Imported Item",
          category: row.Category || "General",
          quantityAvailable: row.Quantity_Available || "0",
          quantityAllotted: row.Quantity_Allotted || "0",
          issueDate: row.Issue_Date || today,
          issuedTo: row.Issued_To || "General",
          issuedBy: row.Issued_By || "Admin",
          description: row.Description || "",
          remarks: row.Remarks || "",
          createdAt: Date.now(),
          branchId: isBranch ? branchId : null,
          createdBy: isStaff ? staffId : isBranch ? branchId : 'admin'
        })
      }
      toast({ title: "Import Successful", description: `${data.length} items processed.` })
    }
    reader.readAsBinaryString(file)
    e.target.value = ""
  }

  const exportToExcel = () => {
    if (!filteredItems.length) return
    const data = filteredItems.map((item, i) => ({
      "Sr No": i + 1,
      "Item Id": item.itemId,
      "Item Name": item.itemName,
      "Category": item.category,
      "Description": item.description,
      "Qty Available": item.quantityAvailable,
      "Qty Allotted": item.quantityAllotted,
      "Issue Date": item.issueDate,
      "Issued To": item.issuedTo,
      "Issued By": item.issuedBy,
      "Remarks": item.remarks
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Inventory")
    XLSX.writeFile(wb, `inventory_report_${format(new Date(), "yyyy-MM-dd")}.xlsx`)
  }

  const exportToPdf = () => {
    if (!filteredItems.length) return
    const doc = new jsPDF('l', 'mm', [450, 210])
    doc.setFontSize(20).setTextColor(13, 148, 136).text(instituteName, 14, 20)
    doc.setFontSize(12).setTextColor(100).text('Institutional Inventory & Asset Audit Report', 14, 30)
    
    const tableData = filteredItems.map((item, i) => [
      i + 1,
      item.itemId,
      item.itemName,
      item.category,
      item.quantityAvailable,
      item.quantityAllotted,
      item.issueDate,
      item.issuedTo,
      item.issuedBy,
      item.description
    ])

    autoTable(doc, {
      startY: 35,
      head: [['#', 'Id', 'Name', 'Category', 'Avail', 'Allotted', 'Date', 'To', 'By', 'Desc']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [13, 148, 136] },
      styles: { fontSize: 8 }
    })

    doc.save(`inventory_audit_${format(new Date(), "yyyy-MM-dd")}.pdf`)
  }

  const resetFilters = () => {
    setSearchTerm(""); setFilterCategory("all"); setFilterIssuedTo("all"); setFromDate(""); setToDate(""); setCurrentPage(1);
  }

  const mainContent = (
    <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-500 w-full overflow-x-hidden">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div>
          <h2 className="text-3xl font-normal text-black font-public-sans tracking-tight leading-none">Inventory Management ({filteredItems.length})</h2>
          <p className="text-[14px] text-black font-medium mt-1">Audit and track institutional assets & supplies</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if(!open) setEditingItem(null); }}>
          <DialogTrigger asChild>
            <button onClick={() => setEditingItem(null)} className="bg-primary hover:opacity-90 text-white rounded-2xl h-11 px-10 font-medium text-[14px] border-none shadow-lg active:scale-95 transition-all">
              Add New
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl p-0 border border-zinc-200 rounded-3xl overflow-hidden bg-white shadow-2xl">
            <div className="bg-white px-8 py-4 border-b border-zinc-100">
              <DialogTitle className="text-lg font- public-sans text-black">{editingItem ? 'Edit' : 'Add New'} Inventory Item</DialogTitle>
            </div>
            <ScrollArea className="max-h-[85vh]">
              <form onSubmit={handleSave} className="p-8 space-y-8 pb-20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <div className="space-y-1.5"><Label className="text-[10px] font- public-sans text-black tracking-widest ml-1">Item Id</Label><Input name="itemId" defaultValue={editingItem?.itemId} required placeholder="Unique Item Id" className="rounded-xl h-11 font-medium text-black" /></div>
                  <div className="space-y-1.5"><Label className="text-[10px] font- public-sans text-black tracking-widest ml-1">Item Name</Label><Input name="itemName" defaultValue={editingItem?.itemName} required placeholder="e.g., Educational Kit" className="rounded-xl h-11 font-medium text-black" /></div>
                  
                  <FormSelect label="Category" name="category" defaultValue={editingItem?.category} options={dropdownData['category'] || []} onManage={() => openManageModal('category', 'Category')} required />
                  
                  <div className="space-y-1.5"><Label className="text-[10px] font- public-sans text-black tracking-widest ml-1">Description</Label><Input name="description" defaultValue={editingItem?.description} placeholder="e.g., bag + t-shirt" className="rounded-xl h-11 font-medium text-black" /></div>
                  
                  <div className="space-y-1.5"><Label className="text-[10px] font- public-sans text-black tracking-widest ml-1">Quantity Available</Label><Input name="quantityAvailable" type="number" defaultValue={editingItem?.quantityAvailable} required placeholder="Total available" className="rounded-xl h-11 font-medium text-black" /></div>
                  <div className="space-y-1.5"><Label className="text-[10px] font- public-sans text-black tracking-widest ml-1">Quantity Allotted</Label><Input name="quantityAllotted" type="number" defaultValue={editingItem?.quantityAllotted} required placeholder="Allotted quantity" className="rounded-xl h-11 font-medium text-black" /></div>
                  
                  <div className="space-y-1.5"><Label className="text-[10px] font- public-sans text-black tracking-widest ml-1">Issue Date</Label><Input name="issueDate" type="date" defaultValue={editingItem?.issueDate || today} required className="rounded-xl h-11 font-medium text-black" /></div>
                  
                  <FormSelect label="Issued To" name="issuedTo" defaultValue={editingItem?.issuedTo} options={dropdownData['issuedTo'] || []} onManage={() => openManageModal('issuedTo', 'Recipient')} />
                  
                  <div className="space-y-1.5"><Label className="text-[10px] font- public-sans text-black tracking-widest ml-1">Issued By</Label><Input name="issuedBy" defaultValue={editingItem?.issuedBy} required placeholder="Admin/Staff Name" className="rounded-xl h-11 font-medium text-black" /></div>
                  
                  <div className="md:col-span-2 space-y-1.5">
                    <Label className="text-[10px] font- public-sans text-black tracking-widest ml-1">Remarks</Label>
                    <Textarea name="remarks" defaultValue={editingItem?.remarks} placeholder="e.g., Once allotted, can't be reversed" className="rounded-xl min-h-[100px] border-zinc-200" />
                  </div>
                </div>
                <div className="pt-4">
                  <Button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="w-fit h-12 px-12 bg-[#6366F1] hover:bg-[#4F46E5] text-white rounded-xl font- public-sans text-[11px] tracking-widest shadow-lg border-none active:scale-95 transition-all"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Submit Now
                  </Button>
                </div>
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
            <div className="flex justify-between px-1"><Label className="text-[12px] font-medium text-black tracking-widest">Category</Label><button onClick={() => openManageModal('category', 'Category')} className="text-[9px] font- public-sans text-blue-600 hover:underline">Manage</button></div>
            <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v); setCurrentPage(1); }}>
              <SelectTrigger className="h-11 rounded-xl bg-white border-zinc-200 font- public-sans text-black shadow-inner text-[14px] transition-none"><SelectValue placeholder="All Categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {(dropdownData['category'] || []).map(opt => <SelectItem key={opt.id} value={opt.value}>{opt.value}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between px-1"><Label className="text-[12px] font-medium text-black tracking-widest">Issued To</Label><button onClick={() => openManageModal('issuedTo', 'Recipient')} className="text-[9px] font- public-sans text-blue-600 hover:underline">Manage</button></div>
            <Select value={filterIssuedTo} onValueChange={(v) => { setFilterIssuedTo(v); setCurrentPage(1); }}>
              <SelectTrigger className="h-11 rounded-xl bg-white border-zinc-200 font- public-sans text-black shadow-inner text-[14px] transition-none"><SelectValue placeholder="All Recipients" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Recipients</SelectItem>
                {(dropdownData['issuedTo'] || []).map(opt => <SelectItem key={opt.id} value={opt.value}>{opt.value}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-[12px] font-medium text-black tracking-widest ml-1">From Date</Label>
            <Input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setCurrentPage(1); }} className="h-11 rounded-xl bg-white border-zinc-200 text-[14px] font- public-sans text-black shadow-sm" />
          </div>
          <div className="space-y-2">
            <Label className="text-[12px] font-medium text-black tracking-widest ml-1">To Date</Label>
            <Input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setCurrentPage(1); }} className="h-11 rounded-xl bg-white border-zinc-200 text-[14px] font- public-sans text-black shadow-sm" />
          </div>
        </div>
      </Card>

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
          <div className="relative group w-full md:w-96">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-black group-focus-within:text-primary transition-colors" />
            <Input placeholder="Search..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="pl-12 h-11 bg-white border-zinc-200 rounded-full text-[14px] shadow-sm focus-visible:ring-primary transition-none" />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="outline" onClick={downloadSampleCSV} className="h-11 px-5 text-[hsl(var(--primary))] border-[hsl(var(--primary))]/20 rounded-xl transition-none gap-2 font- public-sans text-[14px] bg-white hover:bg-emerald-50 shadow-sm"><Download className="h-4 w-4" /> Sample CSV</Button>
            <input type="file" ref={fileInputRef} onChange={handleImportCSV} className="hidden" accept=".csv" />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="h-11 px-5 text-indigo-600 border-indigo-100 rounded-xl transition-none gap-2 font- public-sans text-[14px] bg-white hover:bg-indigo-50 shadow-sm"><Upload className="h-4 w-4" /> Import CSV</Button>
            <Button variant="outline" onClick={exportToExcel} className="h-11 px-5 text-emerald-600 border-emerald-100 rounded-xl transition-none gap-2 font- public-sans text-[14px] bg-white hover:bg-emerald-50 shadow-sm"><FileSpreadsheet className="h-4 w-4" /> Export Excel</Button>
            <Button variant="outline" onClick={exportToPdf} className="h-11 px-4 text-rose-600 border-rose-100 rounded-xl transition-none gap-2 font- public-sans text-[14px] bg-white hover:bg-rose-50 shadow-sm"><FileText className="h-4 w-4" /> Export PDF</Button>
          </div>
        </div>

        <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
          <div className="overflow-x-auto scrollbar-thin">
            <Table className="min-w-[2200px]">
              <TableHeader className="bg-zinc-50/50">
                <TableRow className="border-zinc-100 hover:bg-transparent">
                  <TableHead className="pl-8 text-[14px] font-medium text-black h-14 w-20">Sr No</TableHead>
                  <TableHead className="text-[14px] font-medium text-black h-14">Actions</TableHead>
                  <TableHead className="text-[14px] font-medium text-black h-14">Item Id</TableHead>
                  <TableHead className="text-[14px] font-medium text-black h-14">Item Name</TableHead>
                  <TableHead className="text-[14px] font-medium text-black h-14">Category</TableHead>
                  <TableHead className="text-[14px] font-medium text-black h-14">Qty Available</TableHead>
                  <TableHead className="text-[14px] font-medium text-black h-14 text-center">Allotted</TableHead>
                  <TableHead className="text-[14px] font-medium text-black h-14">Issue Date</TableHead>
                  <TableHead className="text-[14px] font-medium text-black h-14">Issued To</TableHead>
                  <TableHead className="text-[14px] font-medium text-black h-14">Issued By</TableHead>
                  <TableHead className="text-right pr-8 text-[14px] font-medium text-black h-14">Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((row, index) => (
                  <TableRow key={row.id} className="border-zinc-50 hover:bg-zinc-50/30 transition-none group">
                    <TableCell className="text-[14px] font-medium text-black pl-8">{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingItem(row); setIsModalOpen(true); }} className="h-8 w-8 text-blue-500 hover:bg-blue-50 transition-none"><Edit2 className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setItemToDelete(row)} className="h-8 w-8 text-rose-500 hover:bg-rose-50 transition-none"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-[14px] font- public-sans text-primary font-public-sans tracking-tighter">{row.itemId}</TableCell>
                    <TableCell><span className="text-[14px] font-medium text-black font-public-sans">{row.itemName}</span></TableCell>
                    <TableCell className="text-[14px] font- public-sans text-black">{row.category || '-'}</TableCell>
                    <TableCell className="text-[14px] font-black text-black">{row.quantityAvailable}</TableCell>
                    <TableCell className="text-center font-black text-indigo-600">{row.quantityAllotted}</TableCell>
                    <TableCell className="text-[14px] font-medium text-black">{row.issueDate}</TableCell>
                    <TableCell className="text-[14px] font- public-sans text-black">{row.issuedTo || '-'}</TableCell>
                    <TableCell className="text-[14px] font- public-sans text-black">{row.issuedBy || '-'}</TableCell>
                    <TableCell className="text-right pr-8 text-[14px] text-black italic max-w-[250px] truncate" title={row.remarks}>"{row.remarks || '-'}"</TableCell>
                  </TableRow>
                ))}
                {paginatedItems.length === 0 && (
                  <TableRow><TableCell colSpan={11} className="h-64 text-center text-zinc-300 italic">No inventory logs found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 pt-4">
            <Button variant="ghost" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-9 rounded-xl font- public-sans text-[10px] tracking-widest"><ChevronLeft className="w-4 h-4 mr-2" /> Previous</Button>
            <div className="flex items-center gap-2">{[...Array(totalPages)].map((_, i) => (<button key={i} onClick={() => setCurrentPage(i + 1)} className={cn("w-10 h-10 rounded-xl text-[10px] font-black transition-all", currentPage === i + 1 ? "bg-primary text-white shadow-xl scale-110" : "bg-white text-black border border-zinc-100")}>{i + 1}</button>))}</div>
            <Button variant="ghost" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-9 rounded-xl font- public-sans text-[10px] tracking-widest">Next <ChevronRight className="w-4 h-4 ml-2" /></Button>
          </div>
        )}
      </div>

      <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
        <DialogContent className="max-w-md rounded-[32px] p-10 bg-white border-none shadow-2xl">
          <div className="flex items-center justify-between mb-8"><DialogTitle className="text-xl font- public-sans tracking-tight">Manage {activeManageField?.label}</DialogTitle></div>
          <div className="flex gap-2 mb-8"><Input value={newOptionValue} onChange={(e) => setNewOptionValue(e.target.value)} placeholder="New type..." className="rounded-xl h-12" /><Button onClick={handleSaveOption} className="bg-primary text-white rounded-xl px-8 h-12 border-none shadow-lg">Add</Button></div>
          <ScrollArea className="h-64 pr-4">
            <div className="space-y-2">
              {(dropdownData[activeManageField?.key || ''] || []).map(opt => (
                <div key={opt.id} className="flex items-center justify-between p-4 rounded-xl border border-zinc-100 hover:bg-zinc-50 transition-all">
                  <span className="text-[14px] font- public-sans text-black">{opt.value}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setEditingOptionId(opt.id); setNewOptionValue(opt.value); }} className="text-blue-500 h-8 w-8"><Edit2 className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(ref(database!, `Institutes/${resolvedId}/dropdowns/${activeManageField!.key}/${opt.id}`))} className="text-rose-500 h-8 w-8"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!itemToDelete} onOpenChange={(o) => { if(!o) setItemToDelete(null) }}>
        <AlertDialogContent className="rounded-3xl border-none shadow-2xl bg-white p-10">
          <AlertDialogHeader>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-rose-50 text-rose-500"><AlertCircle className="w-8 h-8" /></div>
            <AlertDialogTitle className="text-xl font- public-sans text-black">Move to Trash?</AlertDialogTitle>
            <AlertDialogDescription className="text-black text-[14px] leading-relaxed font-medium">Are you sure you want to move <span className="font- public-sans text-black">"{itemToDelete?.itemName}"</span> to the institutional trash bin?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-3">
            <AlertDialogCancel className="rounded-xl border-zinc-100 text-black font- public-sans h-11 px-6">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl border-none font- public-sans h-11 px-8 active:scale-95 transition-all">Move To Trash</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )

  if (isPortal) return mainContent

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans overflow-x-hidden">
      <Sidebar />
      <div className="lg:pl-[280px] flex flex-col flex-1 min-w-0">
        <TopNav />
        {mainContent}
      </div>
    </div>
  )
}

function FormSelect({ label, name, options, onManage, defaultValue, required = false }: any) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center px-1">
        <Label className="text-[10px] font- public-sans text-black tracking-widest">{label} {required && "*"}</Label>
        <button type="button" onClick={onManage} className="text-[9px] font- public-sans text-blue-600 hover:underline">Manage <Settings2 className="w-2.5 h-2.5 inline" /></button>
      </div>
      <Select name={name} defaultValue={defaultValue} required={required}>
        <SelectTrigger className="h-11 rounded-xl border-zinc-200 font-medium text-black focus:ring-primary transition-none bg-white"><SelectValue placeholder="Select" /></SelectTrigger>
        <SelectContent className="rounded-xl border-zinc-100 shadow-xl">{options.map((opt: any) => (<SelectItem key={opt.id} value={opt.value} className="rounded-lg">{opt.value}</SelectItem>))}</SelectContent>
      </Select>
    </div>
  )
}
