
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
import { Textarea } from "@/components/ui/textarea"
import { Plus, Search, Trash2, Edit2, Bell, X, Calendar, Megaphone } from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, push, set, remove, off } from "firebase/database"
import { toast } from "@/hooks/use-toast"
import { usePathname } from "next/navigation"

export default function NoticeBoardPage() {
  const pathname = usePathname()
  const isPortal = pathname.startsWith('/staff') || pathname.startsWith('/student') || pathname.startsWith('/branch')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [items, setItems] = useState<any[]>([])
  const [editingItem, setEditingItem] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  
  const { database } = useFirebase()
  const { user } = useUser()

  useEffect(() => {
    if (!database || !user) return
    const dbRef = ref(database, `Institutes/${user.uid}/notices`)
    const unsubscribe = onValue(dbRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setItems(Object.keys(data).map(key => ({ ...data[key], id: key })).reverse())
      } else {
        setItems([])
      }
    })
    return () => off(dbRef)
  }, [database, user])

  const filteredItems = useMemo(() => {
    return items.filter(item => 
      item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.message?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [items, searchTerm])

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!user || !database) return

    const formData = new FormData(e.currentTarget)
    const data = {
      title: formData.get("title") as string,
      message: formData.get("message") as string,
      date: formData.get("date") as string,
      targetAudience: formData.get("targetAudience") as string || "All",
      updatedAt: Date.now()
    }

    const dbPath = `Institutes/${user.uid}/notices`
    if (editingItem) {
      set(ref(database, `${dbPath}/${editingItem.id}`), { ...editingItem, ...data })
        .then(() => toast({ title: "Notice Updated" }))
    } else {
      push(ref(database, dbPath), { ...data, createdAt: Date.now() })
        .then(() => toast({ title: "Notice Published" }))
    }
    setIsModalOpen(false)
    setEditingItem(null)
  }

  const mainContent = (
    <main className="flex-1 p-8 space-y-8 animate-in fade-in duration-500 w-full overflow-x-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-black font-public-sans tracking-tight leading-none">Notice Board</h2>
          <p className="text-[14px] text-black font-medium">Publish announcements and circulars for students & staff</p>
        </div>
        
        <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if(!open) setEditingItem(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingItem(null)} className="bg-[hsl(var(--primary))] text-white rounded-lg h-11 px-6 font-bold text-[14px] gap-2 border-none shadow-sm transition-none active:scale-95">
              <Plus className="h-4 w-4" /> Add Notice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg p-0 border border-zinc-200 rounded-2xl overflow-hidden bg-white shadow-2xl">
            <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-zinc-100">
              <DialogTitle className="text-lg font-bold text-black">
                {editingItem ? 'Edit Notice' : 'New Notice Announcement'}
              </DialogTitle>
              <DialogDescription className="sr-only">Form to publish a public notice.</DialogDescription>
              
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-black tracking-widest">Title</Label>
                <Input name="title" defaultValue={editingItem?.title} required placeholder="Annual Sports Day 2024" className="rounded-lg h-11 border-zinc-200 focus-visible:ring-[hsl(var(--primary))] transition-none" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-black tracking-widest">Message Content</Label>
                <Textarea name="message" defaultValue={editingItem?.message} required placeholder="Details about the event or announcement..." className="rounded-lg min-h-[140px] border-zinc-200 focus-visible:ring-[hsl(var(--primary))] transition-none" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-black tracking-widest">Date</Label>
                <Input name="date" type="date" defaultValue={editingItem?.date || new Date().toISOString().split('T')[0]} required className="rounded-lg h-11 border-zinc-200 focus-visible:ring-[hsl(var(--primary))] transition-none text-[14px]" />
              </div>
              <Button type="submit" className="bg-[hsl(var(--primary))] text-white rounded-lg h-12 w-full font-bold shadow-md border-none transition-none mt-2 active:scale-95">Publish Notice</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative w-full max-w-xs group">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-black group-focus-within:text-[hsl(var(--primary))] transition-colors" />
          <Input 
            placeholder="Search notices..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-11 h-11 bg-white border-zinc-200 rounded-lg text-[14px] shadow-sm transition-none focus-visible:ring-primary"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredItems.map((notice) => (
          <Card key={notice.id} className="border-none shadow-sm rounded-xl p-6 bg-white space-y-5 group hover:shadow-md transition-all duration-300 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-[hsl(var(--primary))]">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <Megaphone className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold tracking-wider">{notice.date}</span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" onClick={() => { setEditingItem(notice); setIsModalOpen(true); }} className="h-8 w-8 text-blue-500 hover:bg-blue-50 transition-none">
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => remove(ref(database!, `Institutes/${user?.uid}/notices/${notice.id}`))} className="h-8 w-8 text-rose-500 hover:bg-rose-50 transition-none">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-black leading-tight tracking-tight">{notice.title}</h3>
              <p className="text-[13px] text-black leading-relaxed font-medium line-clamp-4">{notice.message}</p>
            </div>
            <div className="pt-4 border-t border-zinc-50 flex items-center gap-2 text-black">
              <Calendar className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold tracking-widest">Posted on {notice.date}</span>
            </div>
          </Card>
        ))}
        {filteredItems.length === 0 && (
          <div className="col-span-full h-80 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-200">
              <Bell className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <p className="text-[14px] font-bold text-black tracking-tight">No notices published yet</p>
              <p className="text-[14px] text-black font-medium">Use the button above to post your first announcement.</p>
            </div>
          </div>
        )}
      </div>
    </main>
  )

  if (isPortal) return mainContent

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans overflow-x-hidden">
      <Sidebar />
      <div className="lg:pl-[300px] flex flex-col flex-1 w-full overflow-x-hidden">
        <TopNav />
        {mainContent}
      </div>
    </div>
  )
}
