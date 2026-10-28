"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Trash2, 
  RotateCcw, 
  Search, 
  History, 
  Loader2, 
  MessageSquare, 
  PhoneIncoming, 
  UserCheck, 
  Briefcase,
  Layers,
  Info,
  UserPlus
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, set, remove, off, push } from "firebase/database"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Input } from "@/components/ui/input"

const TRASH_CATEGORIES = [
  { id: 'admissions', label: 'Admissions', icon: UserPlus, dbPath: 'admissions' },
  { id: 'complains', label: 'Complains', icon: MessageSquare, dbPath: 'complains' },
  { id: 'call-logs', label: 'Call Logs', icon: PhoneIncoming, dbPath: 'call-logs' },
  { id: 'visitors', label: 'Visitors', icon: UserCheck, dbPath: 'visitors' },
]

export default function TrashPage() {
  const { database } = useFirebase()
  const { user } = useUser()
  
  const [activeTab, setActiveTab] = useState("admissions")
  const [trashData, setTrashData] = useState<Record<string, any[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [restoringId, setRestoringId] = useState<string | null>(null)

  useEffect(() => {
    if (!database || !user) return
    
    const rootPath = `Institutes/${user.uid}/trash`
    const unsubscribes: any[] = []

    TRASH_CATEGORIES.forEach(cat => {
      const dbRef = ref(database, `${rootPath}/${cat.id}`)
      const unsub = onValue(dbRef, (snapshot) => {
        const data = snapshot.val() || {}
        setTrashData(prev => ({
          ...prev,
          [cat.id]: Object.keys(data).map(k => ({ ...data[k], id: k }))
        }))
      })
      unsubscribes.push(unsub)
    })

    setIsLoading(false)
    return () => unsubscribes.forEach(u => u())
  }, [database, user])

  const handleRestore = async (item: any, category: typeof TRASH_CATEGORIES[0]) => {
    if (!database || !user) return
    setRestoringId(item.id)
    
    try {
      const rootPath = `Institutes/${user.uid}`
      // 1. Move back to original collection
      const { deletedAt, ...originalData } = item
      await set(ref(database, `${rootPath}/${category.dbPath}/${item.id}`), originalData)
      
      // 2. Remove from trash
      await remove(ref(database, `${rootPath}/trash/${category.id}/${item.id}`))
      
      toast({ title: "Restored Successfully", description: "The record has been returned to its original module." })
    } catch (e) {
      toast({ variant: "destructive", title: "Restore Failed" })
    } finally {
      setRestoringId(null)
    }
  }

  const handleDeletePermanently = async (item: any, category: typeof TRASH_CATEGORIES[0]) => {
    if (!database || !user) return
    if (!confirm("Are you sure? This action cannot be undone.")) return

    try {
      await remove(ref(database, `Institutes/${user.uid}/trash/${category.id}/${item.id}`))
      toast({ title: "Permanently Deleted" })
    } catch (e) {
      toast({ variant: "destructive", title: "Delete Failed" })
    }
  }

  const currentList = (trashData[activeTab] || []).filter(item => 
    JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans">
      <Sidebar />
      <div className="lg:pl-[280px] flex flex-col flex-1 w-full overflow-x-hidden">
        <TopNav />
        <main className="flex-1 p-8 space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto w-full">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-3xl font-bold text-black font-public-sans tracking-tight">Institutional Trash</h2>
              <p className="text-[14px] text-black font-medium">Review and restore recently deleted records</p>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-black" />
              <Input 
                placeholder="Search trash records..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-11 h-11 bg-white border-zinc-200 rounded-xl text-[14px] font-medium focus-visible:ring-primary shadow-sm"
              />
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-white p-1.5 rounded-2xl h-auto flex-wrap justify-start gap-2 shadow-sm border border-zinc-100 mb-8">
              {TRASH_CATEGORIES.map(cat => (
                <TabsTrigger 
                  key={cat.id} 
                  value={cat.id}
                  className="rounded-xl px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white text-black font-black text-[10px] tracking-widest gap-2 transition-all"
                >
                  <cat.icon className="w-4 h-4" /> {cat.label} ({trashData[cat.id]?.length || 0})
                </TabsTrigger>
              ))}
            </TabsList>

            {TRASH_CATEGORIES.map(cat => (
              <TabsContent key={cat.id} value={cat.id} className="mt-0 space-y-6">
                <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-zinc-50/50">
                        <TableRow className="border-zinc-100 hover:bg-transparent">
                          <TableHead className="text-[10px] font-black text-black tracking-widest h-14 pl-8 w-20">SR NO.</TableHead>
                          <TableHead className="text-[10px] font-black text-black tracking-widest h-14">Record Detail</TableHead>
                          <TableHead className="text-[10px] font-black text-black tracking-widest h-14">Deleted On</TableHead>
                          <TableHead className="text-right pr-8 text-[10px] font-black text-black tracking-widest h-14">Operations</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentList.length > 0 ? (
                          currentList.map((item, idx) => (
                            <TableRow key={item.id} className="border-zinc-50 hover:bg-zinc-50/30 transition-none group">
                              <TableCell className="text-[14px] font-medium text-black pl-8">{idx + 1}</TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-0.5 py-2">
                                  <span className="text-[14px] font-bold text-black">{item.studentName || item.name || item.complainBy || item.title || 'Untitled Record'}</span>
                                  <span className="text-[10px] text-black font-medium tracking-tighter line-clamp-1">{item.admissionNo || item.purpose || item.type || item.message || '-'}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 text-black">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span className="text-[14px] font-bold font-public-sans">{item.deletedAt ? format(new Date(item.deletedAt), "PP p") : '-'}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right pr-6">
                                <div className="flex items-center justify-end gap-2">
                                  <Button 
                                    onClick={() => handleRestore(item, cat)} 
                                    disabled={restoringId === item.id}
                                    variant="ghost" 
                                    className="h-9 px-4 rounded-xl text-emerald-600 bg-emerald-50 hover:bg-emerald-100 font-black text-[9px] tracking-widest gap-2 transition-all border-none"
                                  >
                                    {restoringId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                                    Restore
                                  </Button>
                                  <Button 
                                    onClick={() => handleDeletePermanently(item, cat)}
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-9 w-9 rounded-xl text-rose-500 hover:bg-rose-50 transition-none"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="h-64 text-center">
                              <div className="flex flex-col items-center justify-center space-y-4">
                                <div className="p-6 rounded-3xl bg-zinc-50 text-zinc-200">
                                  <Trash2 className="h-12 w-12" />
                                </div>
                                <p className="text-[14px] font-medium text-black tracking-widest">Trash is empty for this category</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </TabsContent>
            ))}
          </Tabs>

          <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex items-start gap-4">
            <Info className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <h4 className="text-[14px] font-black text-amber-800 tracking-tight">Trash Management Policy</h4>
              <p className="text-[11px] text-amber-700/70 font-medium leading-relaxed">Items in the trash will remain here until manually restored or permanently deleted. Restoring an item returns it to its original data collection with all previous metadata intact.</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
