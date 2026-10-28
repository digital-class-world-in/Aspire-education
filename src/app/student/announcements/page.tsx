
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Megaphone, 
  Search, 
  Calendar, 
  User, 
  X, 
  ChevronRight, 
  Info,
  History,
  MessageSquare,
  Sparkles
} from "lucide-react"
import { Dialog, DialogContent, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, off } from "firebase/database"
import { useResolvedId } from "@/hooks/use-resolved-id"
import { format } from "date-fns"

export default function StudentAnnouncementsPage() {
  const { database } = useFirebase()
  const { user } = useUser()
  const { resolvedId, isLoading: idLoading } = useResolvedId()
  
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [selectedNotice, setSelectedNotice] = useState<any>(null)

  useEffect(() => {
    if (!database || !resolvedId) return
    
    setIsLoading(true)
    const dbRef = ref(database, `Institutes/${resolvedId}/announcements`)
    const unsubscribe = onValue(dbRef, (snapshot) => {
      const data = snapshot.val() || {}
      const list = Object.keys(data)
        .map(k => ({ ...data[k], id: k }))
        .filter(a => a.target === 'Everyone' || a.target === 'Students')
      setAnnouncements(list.reverse())
      setIsLoading(false)
    })

    return () => off(dbRef)
  }, [database, resolvedId])

  const filtered = useMemo(() => {
    if (!searchTerm) return announcements
    const lower = searchTerm.toLowerCase()
    return announcements.filter(a => 
      a.title?.toLowerCase().includes(lower) || 
      a.message?.toLowerCase().includes(lower)
    )
  }, [announcements, searchTerm])

  if (isLoading || idLoading) return <div className="p-20 text-center font-black text-zinc-300 tracking-[0.2em] animate-pulse">Syncing Official Broadcasts...</div>

  return (
    <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-700 max-w-7xl mx-auto pb-32 font-public-sans text-black">
      
      {/* 📣 HEADER SECTION */}
      <Card className="border-none shadow-xl rounded-[40px] bg-white overflow-hidden p-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-8">
            <div className="w-20 h-20 rounded-[28px] bg-blue-50 flex items-center justify-center text-[#1e3a8a] shadow-inner">
              <Megaphone className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-black tracking-tight leading-none">Institutional News</h2>
              <p className="text-[10px] font-bold text-black tracking-[0.2em]">Official Announcements & Academic Broadcasts</p>
            </div>
          </div>

          <div className="relative w-full md:w-80 group">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-zinc-300 group-focus-within:text-primary transition-colors" />
            <Input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search announcements..." 
              className="pl-12 h-12 rounded-2xl border-zinc-100 bg-zinc-50/50 focus-visible:ring-primary shadow-inner text-[14px] font-bold" 
            />
          </div>
        </div>
      </Card>

      {/* 📣 NEWS FEED GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map((item) => (
          <Card 
            key={item.id} 
            onClick={() => setSelectedNotice(item)}
            className="border-none shadow-sm rounded-[32px] bg-white p-8 group hover:shadow-2xl transition-all duration-500 cursor-pointer relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-700">
              <Sparkles className="w-24 h-24 text-primary" />
            </div>
            
            <div className="space-y-6 relative z-10">
              <div className="flex justify-between items-start">
                <Badge className="bg-blue-50 text-[#1e3a8a] border-none text-[9px] font-black tracking-widest px-3 py-1">New Update</Badge>
                <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-300 group-hover:bg-blue-50 group-hover:text-primary transition-all shadow-inner">
                  <MessageSquare className="w-5 h-5" />
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xl font-black text-black tracking-tight line-clamp-2 group-hover:text-primary transition-colors leading-tight">{item.title}</h4>
                <p className="text-[10px] font-bold text-black tracking-widest flex items-center gap-2">
                  <User className="w-3 h-3" /> By {item.sender || 'Academic Board'}
                </p>
              </div>

              <p className="text-[14px] text-black leading-relaxed line-clamp-3 font-medium">{item.message}</p>

              <div className="pt-6 border-t border-zinc-50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[9px] font-black text-zinc-300 tracking-widest">
                  <Calendar className="w-3.5 h-3.5" /> {item.date}
                </div>
                <div className="text-[#1e3a8a] group-hover:translate-x-1 transition-transform">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
            </div>
          </Card>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-24 text-center space-y-6 bg-white rounded-[40px] border-2 border-dashed border-zinc-100">
            <div className="w-20 h-20 bg-zinc-50 rounded-[28px] flex items-center justify-center mx-auto text-zinc-200 shadow-inner">
              <History className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-black tracking-tight">Feed is Quiet</h3>
              <p className="text-[14px] text-black max-w-xs mx-auto font-medium tracking-widest leading-relaxed">No new broadcasts have been published for your session.</p>
            </div>
          </div>
        )}
      </div>

      {/* 📥 ANNOUNCEMENT DETAIL DIALOG */}
      <Dialog open={!!selectedNotice} onOpenChange={() => setSelectedNotice(null)}>
        <DialogContent className="max-w-2xl p-0 border-none rounded-[40px] overflow-hidden bg-white shadow-2xl">
          {selectedNotice && (
            <>
              <div className="bg-[#1e3a8a] p-12 text-white relative">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24 blur-3xl" />
                
                <div className="space-y-6">
                  <Badge className="bg-white/20 text-white border-none text-[10px] font-black tracking-widest px-4 py-1">Official Publication</Badge>
                  <DialogTitle className="text-4xl font-black tracking-tight leading-tight">{selectedNotice.title}</DialogTitle>
                  <div className="flex items-center gap-6 text-[14px] font-black text-white/60 tracking-widest">
                    <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {selectedNotice.date}</span>
                    <span className="flex items-center gap-2"><User className="w-4 h-4" /> {selectedNotice.sender || 'Academic Board'}</span>
                  </div>
                </div>
              </div>
              
              <ScrollArea className="max-h-[60vh]">
                <div className="p-12 space-y-10">
                  <div className="space-y-4">
                    <h5 className="text-[10px] font-black text-black tracking-[0.2em] border-b border-zinc-50 pb-2">Full Notice</h5>
                    <div className="bg-zinc-50 p-10 rounded-[32px] border border-zinc-100/50 text-lg text-black font-medium leading-relaxed">
                      {selectedNotice.message}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-zinc-50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-[#1e3a8a]">
                        <Info className="w-6 h-6" />
                      </div>
                      <p className="text-[14px] font-bold text-black max-w-[250px] leading-relaxed">This notice was verified by the institutional central node.</p>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>

    </main>
  )
}
