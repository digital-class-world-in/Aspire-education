
"use client"

import { useState, useEffect, useMemo } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Search, 
  MessageSquare, 
  Clock, 
  History, 
  Trash2,
  Phone,
  User,
  ArrowRight,
  Download
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, off, remove } from "firebase/database"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

export default function WebsiteInquiryInboxPage() {
  const { database } = useFirebase()
  const { user } = useUser()
  const [inquiries, setInquiries] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    if (!database || !user) return
    const dbRef = ref(database, `Institutes/${user.uid}/website_inquiries`)
    
    onValue(dbRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setInquiries(Object.keys(data).map(k => ({ ...data[k], id: k })).reverse())
      } else {
        setInquiries([])
      }
      setIsLoading(false)
    })
    return () => off(dbRef)
  }, [database, user])

  const filtered = useMemo(() => {
    return inquiries.filter(i => 
      i.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.phone?.includes(searchTerm)
    )
  }, [inquiries, searchTerm])

  const handleDelete = (id: string) => {
    if (!database || !user) return
    if (confirm("Permanently remove this inquiry from the inbox?")) {
      remove(ref(database, `Institutes/${user.uid}/website_inquiries/${id}`))
    }
  }

  if (isLoading) return <div className="p-20 text-center font-black text-zinc-300 animate-pulse">Syncing inquiry inbox...</div>

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans">
      <Sidebar />
      <div className="lg:pl-[300px] flex flex-col flex-1 w-full overflow-x-hidden">
        <TopNav />
        <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-500 max-w-7xl mx-auto w-full pb-32 font-public-sans text-[15px] font-bold text-black">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
            <div>
              <h2 className="text-[26px] font-normal text-black font-public-sans tracking-tight leading-none">Website inquiries</h2>
              <p className="text-[14px] text-black font-medium mt-1">Review student leads captured from your public portal</p>
            </div>
            <Button variant="outline" className="h-11 px-6 rounded-xl font-bold text-[14px] gap-2 border-zinc-200 bg-white shadow-sm text-black transition-all">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>

          <Card className="border border-zinc-100 shadow-sm rounded-2xl bg-white p-6">
            <div className="relative group max-w-md">
              <Search className="absolute left-4 top-3.5 h-4 w-4 text-zinc-300 group-focus-within:text-black transition-colors" />
              <Input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or mobile..." 
                className="pl-12 h-12 rounded-xl border-zinc-100 bg-zinc-50/50 shadow-inner font-bold text-black focus-visible:ring-1 focus-visible:ring-black text-[15px]" 
              />
            </div>
          </Card>

          <Card className="border border-zinc-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-zinc-50/50">
                  <TableRow className="border-zinc-100 hover:bg-transparent">
                    <TableHead className="text-[15px] font-bold text-black tracking-widest h-14 pl-10 w-20">SR NO.</TableHead>
                    <TableHead className="text-[15px] font-bold text-black tracking-widest h-14">CANDIDATE</TableHead>
                    <TableHead className="text-[15px] font-bold text-black tracking-widest h-14">MESSAGE / INQUIRY</TableHead>
                    <TableHead className="text-[15px] font-bold text-black tracking-widest h-14">DATE</TableHead>
                    <TableHead className="text-right pr-10 text-[15px] font-bold text-black tracking-widest h-14">ACTION</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item, idx) => (
                    <TableRow key={item.id} className="border-zinc-50 hover:bg-zinc-50/30 transition-none group">
                      <TableCell className="text-[15px] font-bold text-black pl-10">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5 py-2">
                          <span className="text-[15px] font-bold text-black">{item.name}</span>
                          <span className="text-[11px] font-bold text-black flex items-center gap-1.5"><Phone className="w-3 h-3" /> {item.phone}</span>
                          {item.course && <Badge className="w-fit mt-1 text-[9px] tracking-widest bg-primary/10 text-primary border-none">{item.course}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-md">
                          <p className="text-[15px] text-black font-bold leading-relaxed line-clamp-2">"{item.message}"</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-[15px] font-bold text-black">{item.submittedAt ? format(new Date(item.submittedAt), "PP") : '-'}</span>
                          <span className="text-[11px] font-bold text-zinc-300 tracking-widest">{item.submittedAt ? format(new Date(item.submittedAt), "p") : '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-10">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => window.open(`https://wa.me/${item.phone?.replace(/\D/g, '')}`, '_blank')} className="p-2 hover:bg-zinc-100 rounded-xl transition-all">
                            <img src="https://img.icons8.com/color/48/whatsapp--v1.png" className="w-5 h-5" alt="WA" />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="p-2 text-zinc-300 hover:text-rose-500 rounded-xl hover:bg-rose-50 transition-all border-none bg-transparent cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center space-y-4">
                          <div className="w-16 h-16 rounded-[24px] bg-zinc-50 flex items-center justify-center text-zinc-200 shadow-inner">
                            <History className="w-8 h-8" />
                          </div>
                          <p className="text-[15px] font-bold text-zinc-300 tracking-widest">No inquiries received yet</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </main>
      </div>
    </div>
  )
}
