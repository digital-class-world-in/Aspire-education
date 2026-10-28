"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  Library, 
  BookOpen, 
  Book, 
  Upload, 
  Download, 
  Settings2, 
  X, 
  Save, 
  Loader2, 
  History, 
  UserCheck, 
  RotateCcw, 
  Eye, 
  PlusCircle,
  FileSpreadsheet,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Bookmark
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, push, update, remove, off, set } from "firebase/database"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import { useResolvedId } from "@/hooks/use-resolved-id"
import { format, differenceInDays, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns"
import * as XLSX from "xlsx"
import { useToast } from "@/hooks/use-toast"

export default function LibraryManagementPage() {
  const pathname = usePathname()
  const isPortal = (pathname.startsWith('/branch') && !pathname.startsWith('/branch-management')) || 
                   pathname.startsWith('/staff') || 
                   (pathname.startsWith('/student') && !pathname.startsWith('/student-information'))

  const { database } = useFirebase()
  const { resolvedId, branchId, isBranch, isStaff, staffId } = useResolvedId()
  const { toast } = useToast()

  // Main States
  const [books, setBooks] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [issues, setIssues] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [libSettings, setLibSettings] = useState({ finePerDay: 5, maxIssueDays: 7 })
  
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("books")
  
  // Modal States
  const [isBookModalOpen, setIsBookModalOpen] = useState(false)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false)
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false)
  
  const [editingBook, setEditingBook] = useState<any>(null)
  const [selectedBookForIssue, setSelectedBookForIssue] = useState<any>(null)
  const [selectedIssueForReturn, setSelectedIssueForReturn] = useState<any>(null)
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState("")
  const [filterFromDate, setFilterFromDate] = useState("")
  const [filterToDate, setFilterToDate] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterCategory, setFilterCategory] = useState("all")
  const [filterAuthor, setFilterAuthor] = useState("all")
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), [])

  useEffect(() => {
    if (!database || !resolvedId) return
    const rootPath = `Institutes/${resolvedId}/library`
    
    // Fetch Books
    onValue(ref(database, `${rootPath}/books`), (s) => {
      const data = s.val() || {}
      setBooks(Object.keys(data).map(k => ({ ...data[k], id: k })).reverse())
    })

    // Fetch Categories
    onValue(ref(database, `${rootPath}/categories`), (s) => {
      const data = s.val() || {}
      setCategories(Object.keys(data).map(k => ({ ...data[k], id: k })))
    })

    // Fetch Issues
    onValue(ref(database, `${rootPath}/issues`), (s) => {
      const data = s.val() || {}
      setIssues(Object.keys(data).map(k => ({ ...data[k], id: k })).reverse())
    })

    // Fetch Settings
    onValue(ref(database, `${rootPath}/settings`), (s) => {
      if (s.exists()) setLibSettings(s.val())
    })

    // Fetch Users for Issuing
    onValue(ref(database, `Institutes/${resolvedId}/admissions`), (s) => {
      const data = s.val() || {}
      setStudents(Object.keys(data).map(k => ({ id: k, name: data[k].studentName, type: 'Student', details: `${data[k].admissionNo} - ${data[k].course}` })))
    })
    onValue(ref(database, `Institutes/${resolvedId}/employees`), (s) => {
      const data = s.val() || {}
      setEmployees(Object.keys(data).map(k => ({ id: k, name: `${data[k].firstName} ${data[k].lastName}`, type: 'Staff', details: data[k].designation })))
    })

    setIsLoading(false)
  }, [database, resolvedId])

  const filteredBooks = useMemo(() => {
    return books.filter(b => {
      const matchSearch = !searchTerm || b.name?.toLowerCase().includes(searchTerm.toLowerCase()) || b.bookNo?.toString().includes(searchTerm)
      const matchStatus = filterStatus === 'all' || b.status === filterStatus
      const matchCat = filterCategory === 'all' || b.category === filterCategory
      const matchAuthor = filterAuthor === 'all' || b.author === filterAuthor
      
      let matchDate = true
      if (filterFromDate || filterToDate) {
        const itemDate = b.postDate || ""
        if (filterFromDate && itemDate < filterFromDate) matchDate = false
        if (filterToDate && itemDate > filterToDate) matchDate = false
      }
      return matchSearch && matchStatus && matchCat && matchAuthor && matchDate
    })
  }, [books, searchTerm, filterStatus, filterCategory, filterAuthor, filterFromDate, filterToDate])

  const stats = useMemo(() => {
    return {
      total: books.length,
      issued: books.filter(b => b.status === 'Issued').length,
      available: books.filter(b => b.status === 'Available').length
    }
  }, [books])

  const resetFilters = () => {
    setSearchTerm("")
    setFilterFromDate("")
    setFilterToDate("")
    setFilterStatus("all")
    setFilterCategory("all")
    setFilterAuthor("all")
  }

  const handleSaveBook = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!resolvedId || !database || isSubmitting) return
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const qty = Number(formData.get("qty"))
    const data = {
      name: formData.get("name") as string,
      bookNo: formData.get("bookNo") as string,
      isbnNo: formData.get("isbnNo") as string,
      publisher: formData.get("publisher") as string,
      author: formData.get("author") as string,
      subject: formData.get("subject") as string,
      rackNo: formData.get("rackNo") as string,
      qty: qty,
      availableQty: editingBook ? (qty - (editingBook.qty - editingBook.availableQty)) : qty,
      price: formData.get("price") as string,
      category: formData.get("category") as string,
      postDate: formData.get("postDate") as string || today,
      description: formData.get("description") as string,
      status: qty > 0 ? "Available" : "Issued",
      updatedAt: Date.now()
    }

    const dbPath = `Institutes/${resolvedId}/library/books`
    try {
      if (editingBook) await update(ref(database, `${dbPath}/${editingBook.id}`), data)
      else await push(ref(database, dbPath), { ...data, createdAt: Date.now() })
      setIsBookModalOpen(false); setEditingBook(null);
      toast({ title: editingBook ? "Book Updated" : "Book Added" })
    } catch (err) { toast({ variant: "destructive", title: "Error" }) }
    finally { setIsSubmitting(false) }
  }

  const handleIssueBook = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!database || !resolvedId || !selectedBookForIssue) return
    
    const formData = new FormData(e.currentTarget)
    const userId = formData.get("userId") as string
    const userItem = [...students, ...employees].find(u => u.id === userId)
    
    const issueData = {
      bookId: selectedBookForIssue.id,
      bookTitle: selectedBookForIssue.name,
      userId,
      userName: userItem?.name,
      userType: userItem?.type,
      issueDate: formData.get("issueDate") as string || today,
      dueDate: formData.get("dueDate") as string,
      remarks: formData.get("remarks") as string,
      status: "Issued",
      createdAt: Date.now()
    }

    try {
      const rootPath = `Institutes/${resolvedId}/library`
      await push(ref(database, `${rootPath}/issues`), issueData)
      
      const newAvail = Math.max(0, selectedBookForIssue.availableQty - 1)
      await update(ref(database, `${rootPath}/books/${selectedBookForIssue.id}`), {
        availableQty: newAvail,
        status: newAvail === 0 ? "Issued" : "Available"
      })

      setIsIssueModalOpen(false)
      toast({ title: "Book Issued" })
    } catch (e) { toast({ variant: "destructive", title: "Sync Failed" }) }
  }

  const handleReturnBook = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!database || !resolvedId || !selectedIssueForReturn) return
    
    const formData = new FormData(e.currentTarget)
    const returnDate = today
    const fine = Number(formData.get("fineAmount")) || 0
    
    try {
      const rootPath = `Institutes/${resolvedId}/library`
      
      // Update Issue Record
      await update(ref(database, `${rootPath}/issues/${selectedIssueForReturn.id}`), {
        returnDate,
        fineAmount: fine,
        condition: formData.get("condition"),
        returnRemarks: formData.get("remarks"),
        status: "Returned"
      })

      // Update Book Inventory
      const book = books.find(b => b.id === selectedIssueForReturn.bookId)
      if (book) {
        const newAvail = book.availableQty + 1
        await update(ref(database, `${rootPath}/books/${book.id}`), {
          availableQty: newAvail,
          status: "Available"
        })
      }

      setIsReturnModalOpen(false)
      toast({ title: "Book Returned Successfully" })
    } catch (e) { toast({ variant: "destructive", title: "Error" }) }
  }

  const handleAddCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!database || !resolvedId) return
    const formData = new FormData(e.currentTarget)
    const name = formData.get("name") as string
    try {
      await push(ref(database, `Institutes/${resolvedId}/library/categories`), {
        name,
        description: formData.get("description"),
        createdAt: Date.now()
      })
      setIsCategoryModalOpen(false)
      toast({ title: "Category Created" })
    } catch (e) { toast({ variant: "destructive", title: "Error" }) }
  }

  const exportExcel = () => {
    const data = filteredBooks.map((b, i) => ({
      "SR NO": i + 1,
      "Title": b.name,
      "Book No": b.bookNo,
      "ISBN": b.isbnNo,
      "Category": b.category,
      "Author": b.author,
      "Price": b.price,
      "Status": b.status
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Library")
    XLSX.writeFile(wb, `Library_Inventory_${today}.xlsx`)
  }

  const calculateLateFine = (dueDate: string) => {
    if (!dueDate) return { days: 0, fine: 0 }
    const diff = differenceInDays(new Date(), parseISO(dueDate))
    if (diff <= 0) return { days: 0, fine: 0 }
    return { days: diff, fine: diff * libSettings.finePerDay }
  }

  const mainContent = (
    <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-500 w-full overflow-x-hidden text-black font-public-sans text-[14px]">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div>
          <h2 className="text-[26px] font-normal text-black font-public-sans tracking-tight leading-none">E-Library Management</h2>
          <p className="text-[14px] text-black font-medium mt-1.5">Manage digital and physical book repositories</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setIsCategoryModalOpen(true)} variant="outline" className="h-9 px-4 rounded-xl border-zinc-200 text-black font-black text-[10px] gap-2 transition-all">
            <Settings2 className="w-3.5 h-3.5" /> Manage Category
          </Button>
          <Button onClick={exportExcel} variant="outline" className="h-9 px-4 rounded-xl border-emerald-100 text-emerald-600 bg-white hover:bg-emerald-50 font-black text-[10px] gap-2 transition-all">
            <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
          </Button>
          <Button onClick={() => { setEditingBook(null); setIsBookModalOpen(true); }} className="bg-primary hover:opacity-90 text-white rounded-xl h-9 px-6 font-black text-[10px] tracking-widest border-none shadow-lg active:scale-95 transition-all">
            <Plus className="h-3.5 w-3.5 mr-2" /> Add New Book
          </Button>
        </div>
      </div>

      <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white p-8">
        <div className="flex items-center justify-between mb-8 px-2">
          <h3 className="text-lg font-normal tracking-tight">Select Criteria</h3>
          <Button variant="ghost" onClick={resetFilters} className="text-[10px] font-black text-black hover:text-rose-500">Reset <X className="w-3 h-3 ml-1" /></Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
          <CriteriaItem label="From Date"><Input type="date" value={filterFromDate} onChange={e => setFilterFromDate(e.target.value)} className="h-11 rounded-xl bg-zinc-50 border-none font-bold" /></CriteriaItem>
          <CriteriaItem label="To Date"><Input type="date" value={filterToDate} onChange={e => setFilterToDate(e.target.value)} className="h-11 rounded-xl bg-zinc-50 border-none font-bold" /></CriteriaItem>
          <CriteriaItem label="Status">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-11 rounded-xl bg-zinc-50 border-none font-bold"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Available">Available</SelectItem>
                <SelectItem value="Issued">Issued</SelectItem>
                <SelectItem value="Reserved">Reserved</SelectItem>
                <SelectItem value="Lost">Lost</SelectItem>
              </SelectContent>
            </Select>
          </CriteriaItem>
          <CriteriaItem label="Category">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-11 rounded-xl bg-zinc-50 border-none font-bold"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </CriteriaItem>
          <CriteriaItem label="Search">
            <div className="relative">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-300" />
              <Input placeholder="Title / Book No..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 h-11 rounded-xl bg-zinc-50 border-none font-bold" />
            </div>
          </CriteriaItem>
          <div className="flex items-end pb-0.5"><Button className="w-full bg-black hover:bg-zinc-800 text-white rounded-xl h-11 font-black text-[10px] tracking-widest">Search Node</Button></div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatSummaryCard title="Total Books" value={stats.total} icon={<Library className="text-indigo-500" />} />
        <StatSummaryCard title="Books Issued" value={stats.issued} icon={<BookOpen className="text-amber-500" />} />
        <StatSummaryCard title="Available QTY" value={stats.available} icon={<CheckCircle2 className="text-emerald-500" />} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="bg-white p-1.5 rounded-2xl h-14 shadow-sm border border-zinc-100 flex items-center w-fit">
          <TabsTrigger value="books" className="rounded-xl px-8 h-11 data-[state=active]:bg-primary data-[state=active]:text-white font-bold text-[14px] tracking-widest transition-all">Registry Table</TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl px-8 h-11 data-[state=active]:bg-primary data-[state=active]:text-white font-bold text-[14px] tracking-widest transition-all">Issue History</TabsTrigger>
        </TabsList>

        <TabsContent value="books" className="mt-0">
          <Card className="border border-zinc-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
            <div className="overflow-x-auto scrollbar-thin">
              <Table className="min-w-[1800px]">
                <TableHeader className="bg-zinc-50/50">
                  <TableRow className="border-zinc-100">
                    <TableHead className="pl-10 text-[11px] font-black text-black h-14 w-20">#</TableHead>
                    <TableHead className="text-[11px] font-black text-black h-14">Action</TableHead>
                    <TableHead className="text-[11px] font-black text-black h-14">Book Title</TableHead>
                    <TableHead className="text-[11px] font-black text-black h-14">Book No</TableHead>
                    <TableHead className="text-[11px] font-black text-black h-14">ISBN No</TableHead>
                    <TableHead className="text-[11px] font-black text-black h-14">Category</TableHead>
                    <TableHead className="text-[11px] font-black text-black h-14">Author</TableHead>
                    <TableHead className="text-center text-[11px] font-black text-black h-14">QTY</TableHead>
                    <TableHead className="text-center text-[11px] font-black text-black h-14">Avail</TableHead>
                    <TableHead className="text-[11px] font-black text-black h-14">Price</TableHead>
                    <TableHead className="text-[11px] font-black text-black h-14">Status</TableHead>
                    <TableHead className="text-right pr-10 text-[11px] font-black text-black h-14">Post Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBooks.map((row, index) => (
                    <TableRow key={row.id} className="border-zinc-50 hover:bg-zinc-50/30 transition-none group">
                      <TableCell className="pl-10 font-bold text-black">{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {row.availableQty > 0 && (
                            <Button variant="ghost" size="icon" onClick={() => { setSelectedBookForIssue(row); setIsIssueModalOpen(true); }} className="h-8 w-8 text-emerald-500 hover:bg-emerald-50" title="Issue"><BookOpen className="h-3.5 w-3.5" /></Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => { setEditingBook(row); setIsBookModalOpen(true); }} className="h-8 w-8 text-blue-500 hover:bg-blue-50" title="Edit"><Edit2 className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => remove(ref(database!, `Institutes/${resolvedId}/library/books/${row.id}`))} className="h-8 w-8 text-rose-500 hover:bg-rose-50" title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                      <TableCell><span className="text-[14px] font-black text-black font-public-sans">{row.name}</span></TableCell>
                      <TableCell className="font-bold text-black font-public-sans tracking-tighter">{row.bookNo}</TableCell>
                      <TableCell className="text-[14px] text-black font-public-sans">{row.isbnNo || '-'}</TableCell>
                      <TableCell><Badge variant="outline" className="rounded-lg border-zinc-100 text-[9px] font-bold text-black">{row.category}</Badge></TableCell>
                      <TableCell className="text-[14px] font-bold text-black">{row.author}</TableCell>
                      <TableCell className="text-center font-black text-black">{row.qty}</TableCell>
                      <TableCell className="text-center font-black text-emerald-600">{row.availableQty}</TableCell>
                      <TableCell className="font-black text-black">₹{row.price}</TableCell>
                      <TableCell>
                        <Badge className={cn(
                          "rounded-lg px-2.5 py-0.5 text-[9px] font-black  border-none shadow-none transition-none",
                          row.status === 'Available' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                        )}>{row.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right pr-10 text-[14px] font-bold text-black">{row.postDate}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-0">
          <Card className="border border-zinc-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <Table className="min-w-[1200px]">
                <TableHeader className="bg-zinc-50/50">
                  <TableRow>
                    <TableHead className="pl-10 text-[11px] font-black text-black h-14 w-20">#</TableHead>
                    <TableHead className="text-[11px] font-black text-black h-14">Action</TableHead>
                    <TableHead className="text-[11px] font-black text-black h-14">Book Title</TableHead>
                    <TableHead className="text-[11px] font-black text-black h-14">Issued To</TableHead>
                    <TableHead className="text-[11px] font-black text-black h-14">Issue Date</TableHead>
                    <TableHead className="text-[11px] font-black text-black h-14">Due Date</TableHead>
                    <TableHead className="text-[11px] font-black text-black h-14">Return Date</TableHead>
                    <TableHead className="text-right pr-10 text-[11px] font-black text-black h-14">Fine</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issues.map((iss, i) => (
                    <TableRow key={iss.id} className="border-zinc-50">
                      <TableCell className="pl-10 font-bold text-black">{i + 1}</TableCell>
                      <TableCell>
                        {iss.status === 'Issued' ? (
                          <Button size="sm" onClick={() => { setSelectedIssueForReturn(iss); setIsReturnModalOpen(true); }} className="bg-primary text-white h-7 px-3 text-[10px] font-black rounded-lg">Return Book</Button>
                        ) : (
                          <Badge className="bg-emerald-50 text-emerald-600 text-[9px] font-black">Returned</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-bold text-black">{iss.bookTitle}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-[14px] font-bold text-black">{iss.userName}</span>
                          <span className="text-[9px] font-bold text-black tracking-widest">{iss.userType}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-public-sans text-black">{iss.issueDate}</TableCell>
                      <TableCell className="font-public-sans text-rose-400">{iss.dueDate}</TableCell>
                      <TableCell className="font-public-sans text-emerald-400">{iss.returnDate || '-'}</TableCell>
                      <TableCell className="text-right pr-10 font-black text-rose-600">₹{iss.fineAmount || 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 📚 ADD/EDIT BOOK MODAL */}
      <Dialog open={isBookModalOpen} onOpenChange={setIsBookModalOpen}>
        <DialogContent className="max-w-3xl p-0 border-none rounded-[40px] overflow-hidden bg-white shadow-2xl">
          <div className="bg-[#1e3a8a] px-10 py-8 text-white relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
            <DialogTitle className="text-3xl font-black tracking-tight font-public-sans">{editingBook ? 'Update Volume' : 'New Accession'}</DialogTitle>
            <p className="text-blue-200 text-[14px] font-bold tracking-widest mt-1">Institutional Resource Provisioning</p>
            
          </div>
          <ScrollArea className="max-h-[80vh]">
            <form onSubmit={handleSaveBook} className="p-10 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                <FormGroup label="Book Title *" name="name" defaultValue={editingBook?.name} required />
                <FormGroup label="Book Number *" name="bookNo" defaultValue={editingBook?.bookNo} required />
                <FormGroup label="ISBN Number" name="isbnNo" defaultValue={editingBook?.isbnNo} />
                <FormGroup label="Publisher" name="publisher" defaultValue={editingBook?.publisher} />
                <FormGroup label="Author" name="author" defaultValue={editingBook?.author} />
                <FormGroup label="Subject" name="subject" defaultValue={editingBook?.subject} />
                <FormGroup label="Rack Number" name="rackNo" defaultValue={editingBook?.rackNo} />
                <FormGroup label="Quantity *" name="qty" type="number" defaultValue={editingBook?.qty || 1} required />
                <FormGroup label="Book Price (INR)" name="price" type="number" defaultValue={editingBook?.price} />
                <FormGroup label="Accession Date" name="postDate" type="date" defaultValue={editingBook?.postDate || today} />
                
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center px-1">
                    <Label className="text-[11px] font-black text-black tracking-widest">Category</Label>
                    <button type="button" onClick={() => setIsCategoryModalOpen(true)} className="text-primary hover:underline text-[9px] font-black tracking-widest flex items-center gap-1"><PlusCircle className="w-3 h-3" /> New</button>
                  </div>
                  <Select name="category" defaultValue={editingBook?.category}>
                    <SelectTrigger className="h-12 rounded-xl border-zinc-100 bg-zinc-50/50 font-bold text-[14px]"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {categories.map(c => <SelectItem key={c.id} value={c.name} className="font-bold text-[14px]">{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <Label className="text-[11px] font-black text-black tracking-widest ml-1">Volume Description</Label>
                  <Textarea name="description" defaultValue={editingBook?.description} className="rounded-2xl border-zinc-100 bg-zinc-50/50 min-h-[100px] font-medium" />
                </div>
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full h-16 bg-zinc-900 hover:bg-black text-white rounded-3xl font-black text-[14px] tracking-[0.2em] shadow-xl border-none active:scale-95 transition-all">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} {editingBook ? 'Commit Update' : 'Initialize Record'}
              </Button>
            </form>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* 📖 ISSUE MODAL */}
      <Dialog open={isIssueModalOpen} onOpenChange={setIsIssueModalOpen}>
        <DialogContent className="max-w-md p-0 border-none rounded-[40px] overflow-hidden bg-white shadow-2xl">
          <div className="bg-emerald-600 px-8 py-6 text-white"><DialogTitle className="text-xl font-black tracking-tight">Circulation Desk</DialogTitle><p className="text-[10px] text-emerald-100 font-bold tracking-widest mt-1">Issue: {selectedBookForIssue?.name}</p></div>
          <form onSubmit={handleIssueBook} className="p-8 space-y-6">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-black tracking-widest ml-1">Select Recipient</Label>
              <Select name="userId" required>
                <SelectTrigger className="h-12 rounded-xl border-zinc-100 bg-zinc-50/50 font-bold"><SelectValue placeholder="Search student/staff..." /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <ScrollArea className="h-64">
                    <div className="p-2 space-y-4">
                      <p className="text-[9px] font-black text-primary px-2">Students</p>
                      {students.map(s => <SelectItem key={s.id} value={s.id} className="font-bold text-[11px]">{s.name} ({s.details})</SelectItem>)}
                      <p className="text-[9px] font-black text-primary px-2 pt-4">Staff Members</p>
                      {employees.map(e => <SelectItem key={e.id} value={e.id} className="font-bold text-[11px]">{e.name} ({e.details})</SelectItem>)}
                    </div>
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-[10px] font-black text-black tracking-widest ml-1">Issue Date</Label><Input name="issueDate" type="date" defaultValue={today} required className="h-11 rounded-xl" /></div>
              <div className="space-y-1.5"><Label className="text-[10px] font-black text-black tracking-widest ml-1">Return Due</Label><Input name="dueDate" type="date" required className="h-11 rounded-xl" /></div>
            </div>
            <div className="space-y-1.5"><Label className="text-[10px] font-black text-black tracking-widest ml-1">Desk Remarks</Label><Textarea name="remarks" className="rounded-xl min-h-[80px]" /></div>
            <Button type="submit" className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-[14px] tracking-widest shadow-lg border-none transition-all active:scale-95">Authorize Circulation</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* 🔄 RETURN MODAL */}
      <Dialog open={isReturnModalOpen} onOpenChange={setIsReturnModalOpen}>
        <DialogContent className="max-w-md p-0 border-none rounded-[40px] overflow-hidden bg-white shadow-2xl">
          <div className="bg-zinc-900 px-8 py-6 text-white">
            <DialogTitle className="text-xl font-black tracking-tight">Return Protocol</DialogTitle>
            <p className="text-[10px] text-black font-bold tracking-widest mt-1">{selectedIssueForReturn?.bookTitle}</p>
          </div>
          <form onSubmit={handleReturnBook} className="p-8 space-y-8">
            <div className="space-y-6">
              <div className="flex justify-between items-center text-[14px] font-bold border-b pb-4">
                <span className="text-black text-[10px]">Issued To</span>
                <span className="text-black">{selectedIssueForReturn?.userName}</span>
              </div>
              <div className="flex justify-between items-center text-[14px] font-bold border-b pb-4">
                <span className="text-black text-[10px]">Due Date</span>
                <span className="text-rose-500 font-public-sans">{selectedIssueForReturn?.dueDate}</span>
              </div>
              
              {selectedIssueForReturn && (
                <div className="bg-zinc-50 p-6 rounded-3xl border border-zinc-100 flex justify-between items-center">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-black tracking-widest">Late Fee Auto-calc</p>
                    <p className="text-[14px] font-black text-rose-600">
                      {calculateLateFine(selectedIssueForReturn.dueDate).days} Days Delay
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-black tracking-widest">Calculated Fine</p>
                    <p className="text-xl font-black text-black">₹{calculateLateFine(selectedIssueForReturn.dueDate).fine}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black text-black tracking-widest ml-1">Final Fine Amount</Label>
                  <Input name="fineAmount" type="number" defaultValue={selectedIssueForReturn ? calculateLateFine(selectedIssueForReturn.dueDate).fine : 0} className="h-11 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black text-black tracking-widest ml-1">Condition</Label>
                  <Select name="condition" defaultValue="Good">
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Good">Good</SelectItem>
                      <SelectItem value="Damaged">Damaged</SelectItem>
                      <SelectItem value="Lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <Button type="submit" className="w-full h-14 bg-zinc-900 text-white rounded-2xl font-black text-[14px] tracking-widest shadow-xl border-none">Sync Return Node</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* 🗂 CATEGORY MODAL */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="max-w-md p-0 border-none rounded-[32px] overflow-hidden bg-white shadow-2xl">
          <div className="bg-zinc-50 p-8 border-b"><DialogTitle className="text-xl font-black tracking-tight">Manage Categories</DialogTitle></div>
          <form onSubmit={handleAddCategory} className="p-8 space-y-6">
            <FormGroup label="Category Name" name="name" required />
            <div className="space-y-1.5"><Label className="text-[10px] font-black text-black tracking-widest ml-1">Description</Label><Textarea name="description" className="rounded-xl min-h-[80px]" /></div>
            <Button type="submit" className="w-full h-14 bg-primary text-white rounded-2xl font-black text-[14px] tracking-widest shadow-xl border-none">Save Category</Button>
            <ScrollArea className="h-48 pt-4">
              <div className="space-y-2">
                {categories.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100 group">
                    <span className="text-[14px] font-bold text-black">{c.name}</span>
                    <button type="button" onClick={() => remove(ref(database!, `Institutes/${resolvedId}/library/categories/${c.id}`))} className="text-rose-500 opacity-0 group-hover:opacity-100 transition-all border-none bg-transparent cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </form>
        </DialogContent>
      </Dialog>

    </main>
  )

  if (isPortal) return mainContent

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans overflow-x-hidden">
      <Sidebar />
      <div className="lg:pl-[280px] flex flex-col flex-1 min-w-0 overflow-x-hidden">
        <TopNav />
        {mainContent}
      </div>
    </div>
  )
}

function StatSummaryCard({ title, value, icon }: any) {
  return (
    <Card className="border border-zinc-100 shadow-sm rounded-[24px] p-6 bg-white flex items-center gap-5 group hover:shadow-md transition-all">
      <div className="w-12 h-12 bg-zinc-50 rounded-xl flex items-center justify-center shadow-inner group-hover:bg-white transition-all">{icon}</div>
      <div><p className="text-[10px] font-black text-black tracking-widest mb-0.5">{title}</p><h3 className="text-2xl font-black text-black tracking-tight leading-none">{value}</h3></div>
    </Card>
  )
}

function CriteriaItem({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] font-black text-black tracking-widest ml-1">{label}</Label>
      {children}
    </div>
  )
}

function FormGroup({ label, name, type = "text", required = false, defaultValue }: any) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-black text-black tracking-widest ml-1">{label}</Label>
      <Input name={name} type={type} required={required} defaultValue={defaultValue} className="rounded-xl border-zinc-100 bg-zinc-50/50 h-12 font-bold text-black text-[14px] shadow-inner focus-visible:ring-primary" />
    </div>
  )
}
