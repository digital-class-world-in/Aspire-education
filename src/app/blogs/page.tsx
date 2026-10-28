
"use client"

import { useState, useEffect, useMemo } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Search, Trash2, Edit2, FileText, Calendar, X, PenTool, ExternalLink } from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, push, set, remove, off, update } from "firebase/database"
import { toast } from "@/hooks/use-toast"
import { format } from "date-fns"

export default function BlogsManagementPage() {
  const { database } = useFirebase()
  const { user } = useUser()
  
  const [blogs, setBlogs] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!database || !user) return
    const dbRef = ref(database, `Institutes/${user.uid}/blogs`)
    
    onValue(dbRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setBlogs(Object.keys(data).map(key => ({ ...data[key], id: key })).reverse())
      } else {
        setBlogs([])
      }
      setIsLoading(false)
    })
    return () => off(dbRef)
  }, [database, user])

  const filtered = useMemo(() => {
    return blogs.filter(b => b.title?.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [blogs, searchTerm])

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!user || !database) return
    const formData = new FormData(e.currentTarget)
    const data = {
      title: formData.get("title") as string,
      author: formData.get("author") as string,
      date: format(new Date(), "PP"),
      content: formData.get("content") as string,
      excerpt: (formData.get("content") as string).substring(0, 150) + "...",
      updatedAt: Date.now()
    }

    const dbPath = `Institutes/${user.uid}/blogs`
    if (editingItem) {
      update(ref(database, `${dbPath}/${editingItem.id}`), data)
    } else {
      push(ref(database, dbPath), { ...data, createdAt: Date.now() })
    }
    setIsModalOpen(false)
    setEditingItem(null)
    toast({ title: "Article Published" })
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans">
      <Sidebar />
      <div className="lg:pl-[280px] flex flex-col flex-1 w-full overflow-x-hidden">
        <TopNav />
        <main className="flex-1 p-8 space-y-8 animate-in fade-in duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-3xl font-black text-black tracking-tight font-public-sans">Institutional Blog</h2>
              <p className="text-[14px] text-black font-medium">Publish news, updates and academic articles</p>
            </div>
            <Button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="bg-primary hover:opacity-90 text-white rounded-xl h-11 px-8 font-bold text-[14px] gap-2 border-none shadow-lg active:scale-95 transition-all">
              <PenTool className="h-4 w-4" /> New Article
            </Button>
          </div>

          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="w-[95vw] sm:max-w-2xl p-0 border border-zinc-200 rounded-[32px] overflow-hidden bg-white shadow-2xl max-h-[95vh] flex flex-col">
              <div className="bg-white px-8 py-6 border-b border-zinc-100 flex justify-between items-center sticky top-0 z-50">
                <DialogTitle className="text-xl font-black tracking-tight">{editingItem ? 'Edit Article' : 'Compose News'}</DialogTitle>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-200 text-black">
                <form onSubmit={handleSave} className="p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5"><Label className="text-[10px] font-black text-black tracking-widest ml-1">Article Title</Label><Input name="title" defaultValue={editingItem?.title} required className="rounded-xl h-12 border-zinc-200 font-bold" /></div>
                    <div className="space-y-1.5"><Label className="text-[10px] font-black text-black tracking-widest ml-1">Author Name</Label><Input name="author" defaultValue={editingItem?.author} placeholder="e.g. Admin Board" required className="rounded-xl h-12 border-zinc-200 font-bold" /></div>
                  </div>
                  <div className="space-y-1.5"><Label className="text-[10px] font-black text-black tracking-widest ml-1">Full Content</Label><Textarea name="content" defaultValue={editingItem?.content} className="rounded-xl h-64 border-zinc-200 font-medium" required /></div>
                  <Button type="submit" className="w-full bg-primary text-white h-14 rounded-2xl font-black text-[14px] tracking-widest shadow-xl border-none hover:opacity-90 transition-all active:scale-95">Publish Now</Button>
                </form>
              </div>
            </DialogContent>
          </Dialog>

          <div className="relative group w-full md:max-w-xs">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-black" />
            <Input placeholder="Search articles..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-11 h-11 bg-white border-zinc-200 rounded-full text-[14px] shadow-sm" />
          </div>

          <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <Table className="min-w-[1000px]">
                <TableHeader className="bg-zinc-50/50">
                  <TableRow className="border-zinc-100 hover:bg-transparent">
                    <TableHead className="text-[11px] font-black text-black tracking-widest h-14 pl-8">Article Title</TableHead>
                    <TableHead className="text-[11px] font-black text-black tracking-widest h-14">Author</TableHead>
                    <TableHead className="text-[11px] font-black text-black tracking-widest h-14 text-right pr-8">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow key={item.id} className="border-zinc-50 hover:bg-zinc-50/20 transition-none group">
                      <TableCell className="pl-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center text-primary"><FileText className="w-5 h-5" /></div>
                          <div>
                            <span className="text-[14px] font-bold text-black font-public-sans line-clamp-1">{item.title}</span>
                            <p className="text-[10px] text-black font-bold">{item.date}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-[14px] font-bold text-black">{item.author}</TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-9 w-9 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-none"><ExternalLink className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="h-9 w-9 text-blue-500 hover:bg-blue-50 rounded-xl transition-none"><Edit2 className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => remove(ref(database!, `Institutes/${user?.uid}/blogs/${item.id}`))} className="h-9 w-9 text-rose-500 hover:bg-rose-50 rounded-xl transition-none"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </main>
      </div>
    </div>
  )
}
