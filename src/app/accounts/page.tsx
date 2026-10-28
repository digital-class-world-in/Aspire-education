
"use client"

import { useState, useEffect, useMemo } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { 
  Search, 
  Trash2, 
  Edit2, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  FileSpreadsheet, 
  Settings2,
  Loader2,
  Paperclip,
  X,
  FileText
} from "lucide-react"
import { useFirebase } from "@/firebase"
import { ref, onValue, push, remove, update } from "firebase/database"
import { uploadFileToImageKit } from "@/lib/imagekit"
import { cn } from "@/lib/utils"
import { parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns"
import { usePathname } from "next/navigation"
import { useResolvedId } from "@/hooks/use-resolved-id"
import { useToast } from "@/hooks/use-toast"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

const RUPEE_ICON_URL = "https://img.icons8.com/external-kiranshastry-lineal-kiranshastry/64/external-rupee-banking-and-finance-kiranshastry-lineal-kiranshastry.png"

export default function AccountManagementPage() {
  const pathname = usePathname()
  const isPortal = (pathname.startsWith('/branch') && !pathname.startsWith('/branch-management')) || 
                   pathname.startsWith('/staff') || 
                   (pathname.startsWith('/student') && !pathname.startsWith('/student-information'))

  const [activeTab, setActiveTab] = useState("income")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [entryType, setEntryType] = useState<string>("income")
  
  const [incomeItems, setIncomeItems] = useState<any[]>([])
  const [expenseItems, setExpenseItems] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  
  // Filter States
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [filterCategory, setFilterCategory] = useState("all")

  // Dynamic Dropdown States
  const [isManageOpen, setIsManageOpen] = useState(false)
  const [incomeDropdownData, setIncomeDropdownData] = useState<any[]>([])
  const [expenseDropdownData, setExpenseDropdownData] = useState<any[]>([])
  const [newOptionValue, setNewOptionValue] = useState("")
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null)
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [instituteName, setInstituteName] = useState("Your Institute")

  const { database, storage } = useFirebase()
  const { resolvedId, branchId, isBranch, isStaff, staffId } = useResolvedId()
  const { toast } = useToast()

  const today = useMemo(() => new Date().toISOString().split('T')[0], [])

  useEffect(() => {
    if (!database || !resolvedId) return
    const rootPath = `Institutes/${resolvedId}`
    
    // Fetch Income
    onValue(ref(database, `${rootPath}/income`), (s) => {
      const data = s.val() || {}
      setIncomeItems(Object.keys(data).map(k => ({ ...data[k], id: k, type: 'income' })).reverse())
    })

    // Fetch Expenses
    onValue(ref(database, `${rootPath}/expenses`), (s) => {
      const data = s.val() || {}
      setExpenseItems(Object.keys(data).map(k => ({ ...data[k], id: k, type: 'expense' })).reverse())
    })

    // Fetch Categories
    onValue(ref(database, `${rootPath}/dropdowns/incomeCategory`), (snapshot) => {
      const data = snapshot.val() || {}
      setIncomeDropdownData(Object.keys(data).map(id => ({ id, value: data[id].value })))
    })
    onValue(ref(database, `${rootPath}/dropdowns/expenseCategory`), (snapshot) => {
      const data = snapshot.val() || {}
      setExpenseDropdownData(Object.keys(data).map(id => ({ id, value: data[id].value })))
    })

    onValue(ref(database, `${rootPath}/profile/instituteName`), (snapshot) => {
      if (snapshot.exists()) setInstituteName(snapshot.val())
    })
  }, [database, resolvedId])

  const filteredIncome = useMemo(() => {
    let list = incomeItems
    if (isBranch && branchId) list = list.filter(i => i.branchId === branchId)
    return list.filter(item => {
      const matchSearch = !searchTerm || 
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.invoiceNo?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchCategory = filterCategory === 'all' || item.incomeHead === filterCategory
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
      return matchSearch && matchCategory && matchDate
    })
  }, [incomeItems, searchTerm, filterCategory, fromDate, toDate, isBranch, branchId])

  const filteredExpenses = useMemo(() => {
    let list = expenseItems
    if (isBranch && branchId) list = list.filter(e => e.branchId === branchId)
    return list.filter(item => {
      const matchSearch = !searchTerm || 
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.invoiceNo?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchCategory = filterCategory === 'all' || item.incomeHead === filterCategory
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
      return matchSearch && matchCategory && matchDate
    })
  }, [expenseItems, searchTerm, filterCategory, fromDate, toDate, isBranch, branchId])

  const totals = useMemo(() => {
    const inc = filteredIncome.reduce((s, i) => s + (Number(i.amount) || 0), 0)
    const exp = filteredExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)
    return { inc, exp, net: inc - exp }
  }, [filteredIncome, filteredExpenses])

  const handleAddEntry = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!resolvedId || !database || isSubmitting) return
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const type = entryType
    const file = formData.get("attachment") as File
    
    let attachmentUrl = editingItem?.attachmentUrl || ""
    if (file && file.size > 0) {
      try {
        const res = await uploadFileToImageKit(file, `/accounts/${resolvedId}`)
        attachmentUrl = res.url
      } catch (err) {
        console.error("Upload error:", err)
      }
    }

    const data = { 
      incomeHead: formData.get("incomeHead") as string,
      name: formData.get("name") as string, 
      invoiceNo: formData.get("invoiceNo") as string,
      amount: formData.get("amount") as string, 
      date: formData.get("date") as string, 
      description: formData.get("description") as string,
      attachmentUrl,
      branchId: isBranch ? branchId : (editingItem?.branchId || null),
      createdBy: isStaff ? staffId : isBranch ? branchId : 'admin',
      updatedAt: Date.now() 
    }

    const dbPath = `Institutes/${resolvedId}/${type === 'income' ? 'income' : 'expenses'}`
    try {
      if (editingItem) await update(ref(database, `${dbPath}/${editingItem.id}`), data)
      else await push(ref(database, dbPath), { ...data, createdAt: Date.now() })
      setIsModalOpen(false); setEditingItem(null);
      toast({ title: editingItem ? "Entry Updated" : "Entry Added" })
    } catch (err) { toast({ variant: "destructive", title: "Error" }) }
    finally { setIsSubmitting(false) }
  }

  const handleSaveOption = () => {
    if (!newOptionValue.trim() || !resolvedId || !database) return
    const subPath = entryType === 'income' ? 'incomeCategory' : 'expenseCategory'
    const dbPath = `Institutes/${resolvedId}/dropdowns/${subPath}`
    
    if (editingOptionId) {
      update(ref(database, `${dbPath}/${editingOptionId}`), { value: newOptionValue.trim() })
        .then(() => { setNewOptionValue(""); setEditingOptionId(null); })
    } else {
      push(ref(database, dbPath), { value: newOptionValue.trim() }).then(() => setNewOptionValue(""))
    }
  }

  const handleDelete = (id: string, type: string) => {
    if (!resolvedId || !database) return
    if (confirm("Permanently remove this financial record?")) {
      remove(ref(database, `Institutes/${resolvedId}/${type}/${id}`))
        .then(() => toast({ title: "Entry Removed" }))
    }
  }

  const exportToExcel = () => {
    const list = activeTab === 'income' ? filteredIncome : filteredExpenses
    const data = list.map((item, i) => ({
      "Sr No": i + 1,
      "Name": item.name,
      "Category": item.incomeHead,
      "Invoice No": item.invoiceNo || '-',
      "Amount": item.amount,
      "Date": item.date,
      "Description": item.description || '-',
      "Type": activeTab.charAt(0).toUpperCase() + activeTab.slice(1)
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, activeTab === 'income' ? "Income" : "Expenses")
    XLSX.writeFile(wb, `Accounts_${activeTab}_${today}.xlsx`)
  }

  const exportToPdf = () => {
    const doc = new jsPDF('l', 'mm', 'a4')
    doc.setFontSize(20).setTextColor(13, 148, 136).text(instituteName, 14, 20)
    doc.setFontSize(12).setTextColor(100).text(`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Registry - ${today}`, 14, 30)
    
    const list = activeTab === 'income' ? filteredIncome : filteredExpenses
    const tableData = list.map((item, i) => [
      i + 1,
      item.name,
      item.incomeHead || 'General',
      item.invoiceNo || '-',
      item.date,
      `INR ${Number(item.amount).toLocaleString()}`
    ])

    autoTable(doc, {
      startY: 40,
      head: [['#', 'Name / Particulars', 'Category', 'Invoice No', 'Date', 'Amount']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [13, 148, 136] },
      styles: { fontSize: 9 }
    })

    doc.save(`Accounts_${activeTab}_${today}.pdf`)
  }

  const activeCategories = entryType === 'income' ? incomeDropdownData : expenseDropdownData
  const filterDropdownData = activeTab === 'income' ? incomeDropdownData : expenseDropdownData
  const tableItems = activeTab === 'income' ? filteredIncome : filteredExpenses

  const mainContent = (
    <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-500 w-full overflow-x-hidden">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div>
          <h2 className="text-[26px] font-medium text-black font-public-sans tracking-tight leading-none">Account Management</h2>
          <p className="text-[14px] text-black font-medium mt-1">Consolidated institutional financial tracking</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={(o) => { setIsModalOpen(o); if(!o) setEditingItem(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingItem(null); setEntryType(activeTab); }} className="bg-primary hover:opacity-90 text-white rounded-xl h-11 px-10 font-medium text-[14px] border-none shadow-lg active:scale-95 transition-all">
              Add New
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl p-0 border border-zinc-200 rounded-[32px] overflow-hidden bg-white shadow-2xl sm:max-w-[55vw]">
            <div className="bg-white px-10 py-6 border-b border-zinc-100 flex items-center justify-between">
              <DialogTitle className="text-xl font-medium text-black">Add Financial Entry</DialogTitle>
              <DialogDescription className="sr-only">Form to record income or expense transactions.</DialogDescription>
            </div>
            <ScrollArea className="max-h-[80vh]">
              <form onSubmit={handleAddEntry} className="p-10 space-y-10">
                <div className="space-y-4">
                  <Label className="text-[12px] font-medium text-black ml-1">Entry Type</Label>
                  <RadioGroup value={entryType} onValueChange={setEntryType} className="flex gap-8">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="income" id="r-income" className="text-primary border-zinc-300" />
                      <Label htmlFor="r-income" className="text-[14px] font-medium text-black cursor-pointer">Income</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="expense" id="r-expense" className="text-rose-500 border-zinc-300" />
                      <Label htmlFor="r-expense" className="text-[14px] font-medium text-black cursor-pointer">Expense</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                  <div className="space-y-1.5">
                    <div className="flex justify-between px-1">
                      <Label className="text-[12px] font-medium text-black">Head / Category</Label>
                      <button type="button" onClick={() => setIsManageOpen(true)} className="text-[9px] font- public-sans text-blue-600 hover:underline">Manage <Settings2 className="w-2.5 h-2.5 inline" /></button>
                    </div>
                    <Select name="incomeHead" defaultValue={editingItem?.incomeHead || ""}>
                      <SelectTrigger className="h-12 rounded-xl border-zinc-200 font-normal text-black"><SelectValue placeholder="Select Category" /></SelectTrigger>
                      <SelectContent>
                        {activeCategories.map(opt => <SelectItem key={opt.id} value={opt.value}>{opt.value}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-medium text-black ml-1">Name / Particulars</Label>
                    <Input name="name" defaultValue={editingItem?.name} required className="h-12 rounded-xl border-zinc-200 font-medium text-black text-[14px]" />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-medium text-black ml-1">Invoice No.</Label>
                    <Input name="invoiceNo" defaultValue={editingItem?.invoiceNo} className="h-12 rounded-xl border-zinc-200 font-medium text-black text-[14px]" />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-medium text-black ml-1">Date</Label>
                    <Input name="date" type="date" defaultValue={editingItem?.date || today} required className="rounded-xl h-12 border-zinc-200 font-normal text-black text-[14px]" />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-medium text-black ml-1">Amount</Label>
                    <div className="relative">
                      <img src={RUPEE_ICON_URL} alt="₹" className="absolute left-4 top-4 w-4 h-4 opacity-40" />
                      <Input name="amount" type="number" defaultValue={editingItem?.amount} required className="pl-10 rounded-xl h-12 border-zinc-200 font-medium text-primary text-lg" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-medium text-black ml-1">Attach Document</Label>
                    <Input name="attachment" type="file" className="rounded-xl h-12 border-zinc-200 pt-2.5 text-[14px] font-normal" />
                  </div>

                  <div className="md:col-span-2 space-y-1.5">
                    <Label className="text-[12px] font-medium text-black ml-1">Description</Label>
                    <Textarea name="description" defaultValue={editingItem?.description} className="rounded-xl min-h-[100px] border-zinc-200 focus-visible:ring-primary font-medium" />
                  </div>
                </div>

                <div className="pt-4">
                  <Button type="submit" disabled={isSubmitting} className="w-fit h-11 px-12 bg-primary hover:opacity-90 text-white rounded-xl font-medium text-[14px] active:scale-95 shadow-md border-none transition-all">
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Submit Now
                  </Button>
                </div>
              </form>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <SummaryCard label="Total Income" value={totals.inc} color="text-emerald-600" />
        <SummaryCard label="Total Expense" value={totals.exp} color="text-rose-600" />
        <SummaryCard label="Net Balance" value={totals.net} color="text-indigo-600" />
      </div>

      <Card className="border-none shadow-sm rounded-3xl bg-white p-6">
        <div className="flex items-center justify-between mb-6 px-2">
          <h3 className="text-lg font-medium text-black" style={{ fontWeight: 500 }}>Select Criteria</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6">
          <div className="space-y-2">
            <Label className="text-[11px] font-medium text-black ml-1">From Date</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-11 rounded-xl bg-white border-zinc-200 text-[14px] font-medium shadow-inner" />
          </div>
          <div className="space-y-2">
            <Label className="text-[11px] font-medium text-black ml-1">To Date</Label>
            <Input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); }} className="h-11 rounded-xl bg-white border-zinc-200 text-[14px] font-medium shadow-inner" />
          </div>
          <div className="space-y-2">
            <Label className="text-[11px] font-medium text-black ml-1">Head / Category</Label>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-11 rounded-xl bg-white border-zinc-200 font-medium text-black shadow-inner">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Heads</SelectItem>
                {filterDropdownData.map(opt => <SelectItem key={opt.id} value={opt.value}>{opt.value}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
          <TabsList className="bg-white p-1.5 rounded-2xl h-14 shadow-sm border border-zinc-100 flex items-center">
            <TabsTrigger value="income" className="rounded-xl px-8 h-11 data-[state=active]:bg-primary data-[state=active]:text-white font-medium text-[14px] transition-none">Income Registry</TabsTrigger>
            <TabsTrigger value="expense" className="rounded-xl px-8 h-11 data-[state=active]:bg-rose-500 data-[state=active]:text-white font-medium text-[14px] transition-none">Expense Ledger</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-3">
            <div className="relative w-64 group">
              <Search className="absolute left-4 top-3 h-4 w-4 text-black group-focus-within:text-primary transition-colors" />
              <Input placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-11 h-11 bg-white border-zinc-200 rounded-full text-[14px] font-medium shadow-sm transition-none focus-visible:ring-primary" />
            </div>
            <Button variant="outline" onClick={exportToExcel} className="h-11 px-5 text-emerald-600 border-emerald-100 rounded-xl transition-none gap-2 font-medium text-[14px] bg-white hover:bg-emerald-50 shadow-sm"><FileSpreadsheet className="h-4 w-4" /> Export Excel</Button>
            <Button variant="outline" onClick={exportToPdf} className="h-11 px-5 text-rose-600 border-rose-100 rounded-xl transition-none gap-2 font-medium text-[14px] bg-white hover:bg-rose-50 shadow-sm"><FileText className="h-4 w-4" /> Export PDF</Button>
          </div>
        </div>

        <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
          <div className="overflow-x-auto scrollbar-thin">
            <Table className="min-w-[1400px]">
              <TableHeader className="bg-zinc-50/50">
                <TableRow className="border-zinc-100 hover:bg-transparent">
                  <TableHead className="text-[13px] font-medium text-black h-14 pl-8 w-20" style={{ fontWeight: 500 }}>Sr No</TableHead>
                  <TableHead className="text-[13px] font-medium text-black h-14" style={{ fontWeight: 500 }}>Action</TableHead>
                  <TableHead className="text-[13px] font-medium text-black h-14" style={{ fontWeight: 500 }}>Name / Particulars</TableHead>
                  <TableHead className="text-[13px] font-medium text-black h-14" style={{ fontWeight: 500 }}>Category</TableHead>
                  <TableHead className="text-[13px] font-medium text-black h-14" style={{ fontWeight: 500 }}>Invoice No</TableHead>
                  <TableHead className="text-[13px] font-medium text-black h-14" style={{ fontWeight: 500 }}>Date</TableHead>
                  <TableHead className="text-right pr-10 text-[13px] font-medium text-black h-14" style={{ fontWeight: 500 }}>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableItems.map((row, index) => (
                  <TableRow key={row.id} className="border-zinc-50 hover:bg-zinc-50/20 transition-none group">
                    <TableCell className="text-[14px] font-medium text-black pl-8">{index + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingItem(row); setEntryType(activeTab); setIsModalOpen(true); }} className="h-8 w-8 text-blue-500 hover:bg-blue-50 transition-none"><Edit2 className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(row.id, activeTab === 'income' ? 'income' : 'expenses')} className="h-8 w-8 text-rose-500 hover:bg-rose-50 transition-none"><Trash2 className="h-3.5 w-3.5" /></Button>
                        {row.attachmentUrl && (
                          <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-none">
                            <a href={row.attachmentUrl} target="_blank" rel="noopener noreferrer"><Paperclip className="h-3.5 w-3.5" /></a>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell><span className="text-[14px] font-medium text-black font-public-sans">{row.name}</span></TableCell>
                    <TableCell><Badge variant="outline" className="rounded-lg text-[10px] font-medium border-zinc-100 text-black">{row.incomeHead || 'General'}</Badge></TableCell>
                    <TableCell className="text-[14px] font-medium text-black font-public-sans tracking-tighter">{row.invoiceNo || '-'}</TableCell>
                    <TableCell className="text-[14px] font-medium text-black">{row.date}</TableCell>
                    <TableCell className={cn("text-right pr-10 font-medium text-[14px]", activeTab === 'income' ? "text-emerald-600" : "text-rose-600")}>₹ {Number(row.amount).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                {tableItems.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="h-64 text-center text-zinc-300 italic">No matching financial records found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </Tabs>

      <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
        <DialogContent className="max-w-md rounded-[32px] p-10 bg-white border-none shadow-2xl">
          <div className="flex items-center justify-between mb-8">
            <DialogTitle className="text-xl font-medium tracking-tight">Ledger Heads - {entryType.charAt(0).toUpperCase() + entryType.slice(1)}</DialogTitle>
          </div>
          <div className="flex gap-2 mb-8">
            <Input value={newOptionValue} onChange={(e) => setNewOptionValue(e.target.value)} placeholder="Enter new head..." className="rounded-xl h-12" />
            <Button onClick={handleSaveOption} className="bg-primary text-white rounded-xl px-8 h-12 border-none transition-all active:scale-95 shadow-md">Add</Button>
          </div>
          <ScrollArea className="h-64 pr-4">
            <div className="space-y-2">
              {activeCategories.map(opt => (
                <div key={opt.id} className="flex items-center justify-between p-4 rounded-xl border border-zinc-100 hover:bg-zinc-50 transition-all">
                  <span className="text-[14px] font-medium text-black">{opt.value}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setEditingOptionId(opt.id); setNewOptionValue(opt.value); }} className="text-blue-500 h-8 w-8"><Edit2 className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => {
                      const subPath = entryType === 'income' ? 'incomeCategory' : 'expenseCategory'
                      remove(ref(database!, `Institutes/${resolvedId}/dropdowns/${subPath}/${opt.id}`))
                    }} className="text-rose-500 h-8 w-8"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </main>
  )

  if (isPortal) return mainContent

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans overflow-x-hidden">
      <Sidebar />
      <div className="lg:pl-[280px] flex flex-col flex-1 w-full overflow-x-hidden">
        <TopNav />
        {mainContent}
      </div>
    </div>
  )
}

function SummaryCard({ label, value, color }: any) {
  return (
    <Card className="border-none shadow-sm rounded-3xl bg-white p-6 flex items-center gap-6 group hover:shadow-md transition-all">
      <div className="w-14 h-14 rounded-2xl bg-zinc-50 flex items-center justify-center text-black group-hover:bg-white group-hover:shadow-inner transition-all shadow-inner">
        <img src={RUPEE_ICON_URL} alt="₹" className="w-5 h-5 opacity-80" />
      </div>
      <div><p className="text-[11px] font-medium text-black mb-1">{label}</p><h3 className={cn("text-2xl font-medium", color)}>₹ {value.toLocaleString()}</h3></div>
    </Card>
  )
}
