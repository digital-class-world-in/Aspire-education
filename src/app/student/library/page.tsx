
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { 
  Library, 
  Search, 
  Book, 
  User, 
  Download, 
  BookOpen, 
  Languages, 
  X, 
  Maximize, 
  ZoomIn, 
  ZoomOut,
  Star,
  Info,
  ChevronRight,
  Filter,
  History,
  Archive,
  FileText,
  Clock,
  AlertCircle
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, off } from "firebase/database"
import { cn } from "@/lib/utils"
import { format, parseISO, isAfter } from "date-fns"

export default function StudentLibraryPage() {
  const { database } = useFirebase()
  const { user } = useUser()
  const [student, setStudent] = useState<any>(null)
  const [books, setBooks] = useState<any[]>([])
  const [issues, setIssues] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [activeTab, setActiveTab] = useState("catalog")
  const [isLoading, setIsLoading] = useState(true)
  const [readingBook, setReadingBook] = useState<any>(null)
  const [isReaderOpen, setIsReaderOpen] = useState(false)

  useEffect(() => {
    if (!database || !user) return
    
    // Resolve Student context
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
        const rootPath = `Institutes/${adminUid}/library`
        
        // Fetch Catalog
        onValue(ref(database, `${rootPath}/books`), (s) => {
          const data = s.val() || {}
          setBooks(Object.keys(data).map(k => ({ ...data[k], id: k })).reverse())
        })

        // Fetch My Issues
        onValue(ref(database, `${rootPath}/issues`), (s) => {
          const data = s.val() || {}
          const list = Object.keys(data)
            .map(k => ({ ...data[k], id: k }))
            .filter(i => i.userId === foundStudent.id)
          setIssues(list.reverse())
        })
      }
      setIsLoading(false)
    })
  }, [database, user])

  const categories = useMemo(() => {
    const cats = Array.from(new Set(books.map(b => b.category).filter(Boolean)))
    return ["all", ...cats]
  }, [books])

  const filtered = useMemo(() => {
    return books.filter(b => {
      const matchSearch = b.name?.toLowerCase().includes(searchTerm.toLowerCase()) || b.author?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchCat = selectedCategory === 'all' || b.category === selectedCategory
      return matchSearch && matchCat
    })
  }, [books, searchTerm, selectedCategory])

  if (isLoading) return <div className="p-20 text-center font-black text-zinc-300 tracking-[0.3em] animate-pulse">Browsing Digital Stacks...</div>

  return (
    <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-700 max-w-7xl mx-auto pb-32 font-public-sans text-black text-[14px]">
      
      {/* 📚 HEADER & SEARCH */}
      <Card className="border-none shadow-xl rounded-[40px] bg-white overflow-hidden p-10">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-8">
            <div className="w-20 h-20 rounded-[28px] bg-indigo-50 flex items-center justify-center text-[#1e3a8a] shadow-inner">
              <Library className="w-10 h-10" />
            </div>
            <div className="space-y-2 text-center md:text-left">
              <h2 className="text-3xl font-black text-black tracking-tight leading-none">Institutional Library</h2>
              <p className="text-[10px] font-bold text-black tracking-[0.2em]">Curated Digital & Physical Knowledge Hub</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4 w-full lg:w-auto">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-3.5 h-4 w-4 text-zinc-300" />
              <Input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search Title or Author..." 
                className="pl-12 h-12 rounded-2xl border-zinc-100 bg-zinc-50/50 shadow-inner text-[14px] font-bold" 
              />
            </div>
          </div>
        </div>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-8">
        <TabsList className="bg-white p-1.5 rounded-2xl h-14 shadow-sm border border-zinc-100 flex items-center w-fit">
          <TabsTrigger value="catalog" className="rounded-xl px-8 h-11 data-[state=active]:bg-primary data-[state=active]:text-white font-bold text-[14px] tracking-widest transition-all">Browse Catalog</TabsTrigger>
          <TabsTrigger value="issues" className="rounded-xl px-8 h-11 data-[state=active]:bg-primary data-[state=active]:text-white font-bold text-[14px] tracking-widest transition-all">My Issued Books ({issues.filter(i => i.status === 'Issued').length})</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
            {filtered.map((b) => (
              <Card key={b.id} className="border-none shadow-sm rounded-[32px] bg-white overflow-hidden group hover:shadow-2xl transition-all duration-500 flex flex-col">
                <div className="h-64 bg-zinc-100 relative overflow-hidden flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10" />
                  <img 
                    src={`https://picsum.photos/seed/${b.id}/300/400`} 
                    alt={b.name} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 z-20 scale-90 group-hover:scale-100 transition-all duration-500">
                    <Button 
                      onClick={() => { setReadingBook(b); setIsReaderOpen(true); }}
                      className="bg-white text-black rounded-2xl h-14 px-8 font-black text-[10px] tracking-widest shadow-xl border-none hover:bg-[#1e3a8a] hover:text-white transition-all"
                    >
                      <BookOpen className="w-4 h-4 mr-2" /> Read Preview
                    </Button>
                  </div>
                  <Badge className="absolute top-4 left-4 z-30 bg-white/90 backdrop-blur-md text-black border-none text-[8px] font-black px-3 shadow-md">{b.category || 'General'}</Badge>
                </div>
                
                <CardContent className="p-8 flex-1 flex flex-col justify-between space-y-6">
                  <div className="space-y-2">
                    <h4 className="text-[14px] font-black text-black tracking-tight line-clamp-2 leading-tight group-hover:text-[#1e3a8a] transition-colors">{b.name}</h4>
                    <div className="flex items-center gap-2 text-[10px] font-black text-black tracking-widest">
                      <User className="w-3 h-3" /> {b.author || 'Anonymous'}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-zinc-50 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[9px] font-black text-zinc-300 tracking-widest">
                      <Languages className="w-3 h-3" /> English
                    </div>
                    <Badge className={cn(
                      "rounded-md border-none text-[8px] font-black  px-2 shadow-none",
                      b.status === 'Issued' ? "bg-rose-50 text-rose-500" : "bg-emerald-50 text-emerald-600"
                    )}>
                      {b.status || 'Available'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="issues" className="mt-0">
          <Card className="border border-zinc-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
            <div className="p-8 border-b border-zinc-50 flex items-center justify-between">
              <h3 className="font-black text-black text-[10px] tracking-[0.2em]">My Circulation History</h3>
              <Badge className="bg-emerald-50 text-emerald-600 border-none text-[10px] font-black">Verified Ledger</Badge>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-zinc-50/50">
                  <TableRow>
                    <TableHead className="pl-10 text-[10px] font-black h-14">Book Details</TableHead>
                    <TableHead className="text-[10px] font-black">Issue Date</TableHead>
                    <TableHead className="text-[10px] font-black">Due Date</TableHead>
                    <TableHead className="text-[10px] font-black">Return Date</TableHead>
                    <TableHead className="text-center text-[10px] font-black">Status</TableHead>
                    <TableHead className="text-right pr-10 text-[10px] font-black">Fine (INR)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issues.map((iss, i) => {
                    const isLate = iss.status === 'Issued' && isAfter(new Date(), parseISO(iss.dueDate))
                    return (
                      <TableRow key={i} className="border-zinc-50 hover:bg-zinc-50/20 transition-all group">
                        <TableCell className="pl-10 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-300 group-hover:text-primary transition-colors shadow-inner">
                              <Book className="w-5 h-5" />
                            </div>
                            <span className="text-[14px] font-bold text-black tracking-tight">{iss.bookTitle}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-[14px] font-bold text-black font-public-sans">{iss.issueDate}</TableCell>
                        <TableCell className="text-[14px] font-bold text-rose-400 font-public-sans">{iss.dueDate}</TableCell>
                        <TableCell className="text-[14px] font-bold text-emerald-400 font-public-sans">{iss.returnDate || '-'}</TableCell>
                        <TableCell className="text-center">
                          <Badge className={cn(
                            "rounded-lg px-2.5 py-0.5 text-[9px] font-black  border-none shadow-none transition-none",
                            iss.status === 'Returned' ? "bg-emerald-50 text-emerald-600" : isLate ? "bg-rose-50 text-rose-600 animate-pulse" : "bg-blue-50 text-[#1e3a8a]"
                          )}>
                            {isLate ? 'Overdue' : iss.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-10 font-black text-rose-600">₹{iss.fineAmount || 0}</TableCell>
                      </TableRow>
                    )
                  })}
                  {issues.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="h-64 text-center text-zinc-300 italic text-[10px] tracking-widest">No books issued to your registry</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 📖 DIGITAL READER MODAL */}
      <Dialog open={isReaderOpen} onOpenChange={setIsReaderOpen}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[95vh] p-0 border-none rounded-[40px] overflow-hidden bg-zinc-900 shadow-2xl flex flex-col">
          <div className="h-20 bg-white/5 border-b border-white/5 px-10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-6">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white"><BookOpen className="w-5 h-5" /></div>
              <div>
                <h3 className="text-white font-black tracking-tight leading-none text-[14px]">{readingBook?.name}</h3>
                <p className="text-[10px] font-bold text-black tracking-widest mt-1">Author: {readingBook?.author}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-white/5 rounded-xl px-4 py-2 flex items-center gap-6 text-white/40">
                <button className="hover:text-white transition-colors"><ZoomOut className="w-4 h-4" /></button>
                <span className="text-[10px] font-black">100%</span>
                <button className="hover:text-white transition-colors"><ZoomIn className="w-4 h-4" /></button>
              </div>
              <Button variant="ghost" onClick={() => setIsReaderOpen(false)} className="rounded-full w-10 h-10 p-0 text-white/40 hover:bg-white/10 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </Button>
            </div>
          </div>
          
          <div className="flex-1 bg-zinc-800 overflow-hidden relative flex items-center justify-center p-10">
            <div className="w-full max-w-4xl h-full bg-white rounded-2xl shadow-2xl flex flex-col items-center justify-center text-center p-20 space-y-8">
              <div className="w-32 h-32 bg-zinc-50 rounded-[40px] flex items-center justify-center text-zinc-200">
                <FileText className="w-16 h-16" />
              </div>
              <div className="space-y-2">
                <h4 className="text-2xl font-black text-black tracking-tight">Secure E-Reader Viewer</h4>
                <p className="text-[14px] text-black font-medium max-w-sm mx-auto leading-relaxed">Integrated reading experience is active. This is a secure preview of the requested institutional volume.</p>
              </div>
              <Button className="h-14 px-12 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl font-black text-[10px] tracking-widest shadow-xl active:scale-95 transition-all border-none">
                <Download className="w-4 h-4 mr-2" /> Download Full Copy
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </main>
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
