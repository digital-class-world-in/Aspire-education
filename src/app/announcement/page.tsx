
"use client"

import { useState, useEffect, useMemo } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Megaphone, Send, Search, Trash2, User, Loader2, Calendar } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, push, set, remove, off } from "firebase/database"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { usePathname } from "next/navigation"
import { useResolvedId } from "@/hooks/use-resolved-id"

export default function AnnouncementPage() {
  const pathname = usePathname()
  const isPortal = pathname.startsWith('/branch') || pathname.startsWith('/staff') || pathname.startsWith('/student')

  const { database } = useFirebase()
  const { user } = useUser()
  const { resolvedId, isStaff } = useResolvedId()
  
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    if (!database || !resolvedId) return
    
    // Listen to the central institute announcement node
    const dbRef = ref(database, `Institutes/${resolvedId}/announcements`)
    const unsubscribe = onValue(dbRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list = Object.keys(data).map(key => ({ ...data[key], id: key }))
        
        // If staff, filter for 'Everyone' or 'Staff'
        if (isPortal && isStaff) {
          setAnnouncements(list.filter(a => a.target === 'Everyone' || a.target === 'Staff').reverse())
        } else {
          setAnnouncements(list.reverse())
        }
      } else {
        setAnnouncements([])
      }
      setIsLoading(false)
    })
    return () => off(dbRef)
  }, [database, resolvedId, isStaff, isPortal])

  const filteredAnnouncements = useMemo(() => {
    if (!searchTerm) return announcements
    const lower = searchTerm.toLowerCase()
    return announcements.filter(a => a.title?.toLowerCase().includes(lower) || a.message?.toLowerCase().includes(lower))
  }, [announcements, searchTerm])

  const handleSendBroadcast = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!resolvedId || !database || isSubmitting) return
    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)
    const data = { 
      title: formData.get("title"), 
      message: formData.get("message"), 
      target: formData.get("target"), 
      date: format(new Date(), "MMM dd, yyyy"), 
      timestamp: Date.now(), 
      sender: user?.displayName || "Administrator" 
    }
    try {
      await set(push(ref(database, `Institutes/${resolvedId}/announcements`)), data)
      toast({ title: "Broadcast Sent" })
      ;(e.target as HTMLFormElement).reset()
    } catch (err) { 
      toast({ variant: "destructive", title: "Error" }) 
    } finally { 
      setIsSubmitting(false) 
    }
  }

  const content = (
    <main className="flex-1 p-8 space-y-8 animate-in fade-in duration-500 w-full overflow-x-hidden font-public-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div>
          <h2 className="text-3xl font-black text-black font-public-sans tracking-tight leading-none">Announcements</h2>
          <p className="text-[14px] text-black font-medium mt-1">Broadcast news to the entire community</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        {!isPortal && (
          <div className="xl:col-span-5">
            <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white overflow-hidden sticky top-28">
              <div className="bg-zinc-50 px-8 py-5 border-b flex items-center gap-3">
                <Megaphone className="w-5 h-5 text-primary" />
                <h3 className="font-black text-black text-[10px] tracking-[0.2em]">New Broadcast Node</h3>
              </div>
              <form onSubmit={handleSendBroadcast} className="p-8 space-y-6">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black text-black tracking-widest ml-1">Target Audience</Label>
                  <Select name="target" defaultValue="Everyone" required>
                    <SelectTrigger className="rounded-xl h-12 bg-zinc-50/50 border-zinc-100 font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-zinc-100 shadow-xl">
                      <SelectItem value="Everyone" className="font-bold">Everyone</SelectItem>
                      <SelectItem value="Students" className="font-bold">Students Only</SelectItem>
                      <SelectItem value="Staff" className="font-bold">Staff Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black text-black tracking-widest ml-1">Broadcast Title</Label>
                  <Input name="title" required className="rounded-xl h-12 border-zinc-100 bg-zinc-50/50 font-bold" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black text-black tracking-widest ml-1">Message Body</Label>
                  <Textarea name="message" required className="rounded-2xl min-h-[180px] border-zinc-100 bg-zinc-50/50 font-medium" />
                </div>
                <Button type="submit" disabled={isSubmitting} className="w-full bg-primary text-white rounded-2xl h-14 font-black text-[14px] tracking-widest shadow-xl active:scale-95 transition-all border-none">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />} 
                  Initiate Broadcast
                </Button>
              </form>
            </Card>
          </div>
        )}

        <div className={cn("space-y-6", !isPortal ? "xl:col-span-7" : "xl:col-span-12")}>
          <div className="flex items-center justify-between px-2">
            <h3 className="font-black text-black text-[10px] tracking-[0.2em]">Broadcast History</h3>
            <div className="relative w-64">
              <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-300" />
              <Input 
                placeholder="Search history..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="pl-10 h-10 text-[14px] rounded-xl bg-zinc-50 border-none font-bold shadow-inner" 
              />
            </div>
          </div>
          
          <div className="space-y-4">
            {filteredAnnouncements.map((item) => (
              <Card key={item.id} className="border border-zinc-100 shadow-sm rounded-[32px] bg-white p-8 group transition-all relative overflow-hidden">
                <div className="flex items-start gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-50 flex items-center justify-center shrink-0 text-primary shadow-inner">
                    <Megaphone className="w-7 h-7" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-black text-black text-lg tracking-tight">{item.title}</h4>
                        <div className="flex items-center gap-3 pt-1">
                          <p className="text-[9px] font-black text-zinc-300 flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {item.date}</p>
                          <Badge variant="outline" className="text-[8px] font-black border-zinc-100 text-black">{item.target}</Badge>
                        </div>
                      </div>
                      {!isPortal && (
                        <Button variant="ghost" size="icon" onClick={() => remove(ref(database!, `Institutes/${resolvedId}/announcements/${item.id}`))} className="text-rose-500 hover:bg-rose-50 rounded-xl">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <p className="text-black text-[14px] leading-relaxed font-medium bg-zinc-50/50 p-6 rounded-2xl border border-zinc-100/50">
                      {item.message}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
            {filteredAnnouncements.length === 0 && (
              <div className="py-24 text-center space-y-4 bg-zinc-50 rounded-[40px] border-2 border-dashed border-zinc-100">
                <p className="text-[14px] font-black text-zinc-300 tracking-widest">No broadcasts found in your registry</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )

  if (isPortal) return content

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans overflow-x-hidden">
      <Sidebar />
      <div className="lg:pl-[280px] flex flex-col flex-1 w-full overflow-x-hidden">
        <TopNav />
        {content}
      </div>
    </div>
  )
}
