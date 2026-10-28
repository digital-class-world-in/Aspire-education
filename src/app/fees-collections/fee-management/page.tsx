"use client"

import { useState, useEffect, useMemo } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
  Wallet,
  Plus,
  Trash2,
  Edit2,
  X,
  Search,
  Save,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Settings2,
  Receipt
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, push, set, off, update, remove } from "firebase/database"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import { useResolvedId } from "@/hooks/use-resolved-id"

export default function FeeManagementPage() {
  const pathname = usePathname()
  const isPortal = (pathname.startsWith('/branch') && !pathname.startsWith('/branch-management')) ||
    pathname.startsWith('/staff') ||
    (pathname.startsWith('/student') && !pathname.startsWith('/student-information'))

  const [rules, setRules] = useState<any[]>([])
  const [dropdownData, setDropdownData] = useState<Record<string, any[]>>({})
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<any>(null)

  const { database } = useFirebase()
  const { resolvedId } = useResolvedId()

  useEffect(() => {
    if (!database || !resolvedId) return

    const rootPath = `Institutes/${resolvedId}`
    const rulesRef = ref(database, `${rootPath}/fee-structure`)
    const dropdownsRef = ref(database, `${rootPath}/dropdowns`)

    setIsLoading(true)

    onValue(rulesRef, (snapshot) => {
      const data = snapshot.val()
      if (data) setRules(Object.keys(data).map(key => ({ ...data[key], id: key })))
      else setRules([])
      setIsLoading(false)
    })

    onValue(dropdownsRef, (snapshot) => {
      const data = snapshot.val() || {}
      const processed: Record<string, any[]> = {}
      Object.keys(data).forEach(key => {
        processed[key] = Object.keys(data[key]).map(id => ({ id, value: data[key][id].value }))
      })
      setDropdownData(processed)
    })

    return () => {
      off(rulesRef)
      off(dropdownsRef)
    }
  }, [database, resolvedId])

  const filteredRules = useMemo(() => {
    return rules.filter(r => 
      r.std?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.board?.toLowerCase().includes(searchTerm.toLowerCase())
    ).reverse()
  }, [rules, searchTerm])

  const handleSaveRule = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!resolvedId || !database || isSubmitting) return
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const ruleData = {
      std: formData.get("std"),
      board: formData.get("board"),
      amount: Number(formData.get("amount")),
      notes: formData.get("notes") || "",
      updatedAt: Date.now()
    }

    try {
      if (editingRule) {
        await update(ref(database, `Institutes/${resolvedId}/fee-structure/${editingRule.id}`), ruleData)
      } else {
        await push(ref(database, `Institutes/${resolvedId}/fee-structure`), {
          ...ruleData,
          createdAt: Date.now()
        })
      }
      toast({ title: editingRule ? "Rule Updated" : "Rule Added" })
      setIsModalOpen(false)
      setEditingRule(null)
    } catch (err) {
      toast({ variant: "destructive", title: "Error" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteRule = async (id: string) => {
    if (!confirm("Are you sure you want to delete this fee rule?")) return
    try {
      await remove(ref(database!, `Institutes/${resolvedId}/fee-structure/${id}`))
      toast({ title: "Rule Deleted" })
    } catch (err) {
      toast({ variant: "destructive", title: "Delete Failed" })
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans text-black">
      <Sidebar />
      <div className={cn("flex flex-col flex-1 min-w-0", !isPortal && "lg:pl-[300px]")}>
        <TopNav />
        <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-500 w-full overflow-x-hidden">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
            <div>
              <h2 className="text-[26px] font-normal text-black tracking-tight leading-none">Fee Structure Management</h2>
              <p className="text-[14px] text-black font-medium mt-1.5">Define and maintain institutional fee variants by Standard and Board</p>
            </div>
            <Button 
                onClick={() => { setEditingRule(null); setIsModalOpen(true); }} 
                className="bg-primary hover:opacity-90 text-white rounded-xl h-11 px-8 font-black text-[12px] tracking-widest border-none shadow-lg active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4 mr-2" /> CREATE NEW RULE
            </Button>
          </div>

          <Card className="border border-zinc-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
            <div className="p-8 border-b flex items-center justify-between gap-4">
               <div className="relative w-full max-w-md group">
                 <Search className="absolute left-4 top-3.5 h-4 w-4 text-zinc-300 group-focus-within:text-primary transition-colors" />
                 <Input 
                    placeholder="Search standard or board..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="h-11 rounded-xl pl-12 border-zinc-100 bg-zinc-50/50 font-bold text-black text-[14px] focus-visible:ring-1" 
                 />
               </div>
               <div className="flex items-center gap-2 text-zinc-400 text-[12px] font-bold tracking-widest">
                  <Receipt className="w-4 h-4" /> {filteredRules.length} CONFIGURED RULES
               </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-zinc-50/50">
                  <TableRow className="border-zinc-100 hover:bg-transparent">
                    <TableHead className="text-[12px] font-black text-black h-14 pl-8 w-20">#</TableHead>
                    <TableHead className="text-[12px] font-black text-black h-14">STANDARD (STD)</TableHead>
                    <TableHead className="text-[12px] font-black text-black h-14">BOARD</TableHead>
                    <TableHead className="text-[12px] font-black text-black h-14">FEE AMOUNT (₹)</TableHead>
                    <TableHead className="text-[12px] font-black text-black h-14">RESTRICTIONS / NOTES</TableHead>
                    <TableHead className="text-[12px] font-black text-black h-14 text-center w-32">ACTION</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-64 text-center font-bold text-zinc-300 animate-pulse">Loading secure fee clusters...</TableCell>
                    </TableRow>
                  ) : filteredRules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-64 text-center font-medium text-zinc-400">No fee rules defined yet. Create your first rule to enable auto-calculation.</TableCell>
                    </TableRow>
                  ) : filteredRules.map((rule, idx) => (
                    <TableRow key={rule.id} className="border-zinc-50 hover:bg-zinc-50/20 transition-none group text-black font-public-sans">
                      <TableCell className="text-[14px] font-bold text-zinc-400 pl-8">{idx + 1}</TableCell>
                      <TableCell className="text-[15px] font-black text-black">{rule.std}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                            "rounded-lg font-black text-[10px] px-3 py-1 border-none tracking-widest",
                            rule.board === 'All' ? "bg-zinc-100 text-zinc-600" : "bg-primary/10 text-primary"
                        )}>
                          {rule.board?.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[16px] font-black text-emerald-600">₹ {rule.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-[13px] text-zinc-500 font-medium italic">{rule.notes || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                           <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => { setEditingRule(rule); setIsModalOpen(true); }}
                              className="h-8 w-8 text-blue-500 hover:bg-blue-50 rounded-xl"
                           >
                              <Edit2 className="h-4 w-4" />
                           </Button>
                           <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDeleteRule(rule.id)}
                              className="h-8 w-8 text-rose-500 hover:bg-rose-50 rounded-xl"
                           >
                              <Trash2 className="h-4 w-4" />
                           </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) setEditingRule(null); }}>
            <DialogContent className="max-w-xl p-0 border-none rounded-[32px] overflow-hidden bg-white shadow-2xl">
              <div className="bg-white px-10 py-8 text-black border-b flex items-center justify-between">
                <DialogTitle className="text-2xl font-normal tracking-tight">{editingRule ? 'Edit Fee Rule' : 'New Fee Rule Definition'}</DialogTitle>
                <DialogClose className="rounded-xl p-2 hover:bg-zinc-50 transition-colors"><X className="w-5 h-5" /></DialogClose>
              </div>
              <form onSubmit={handleSaveRule} className="p-10 space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-black text-black tracking-widest ml-1 uppercase">Standard (Std) *</Label>
                    <Select name="std" defaultValue={editingRule?.std} required>
                      <SelectTrigger className="h-12 border-zinc-100 rounded-xl font-bold bg-zinc-50/50">
                        <SelectValue placeholder="Select Std" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-zinc-100 shadow-2xl">
                         {(dropdownData['course'] || []).map(opt => (
                           <SelectItem key={opt.id} value={opt.value} className="font-bold">{opt.value}</SelectItem>
                         ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-black text-black tracking-widest ml-1 uppercase">Board</Label>
                    <Select name="board" defaultValue={editingRule?.board || "All"}>
                      <SelectTrigger className="h-12 border-zinc-100 rounded-xl font-bold bg-zinc-50/50">
                        <SelectValue placeholder="Select Board" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-zinc-100 shadow-2xl">
                         <SelectItem value="All" className="font-bold">All Boards</SelectItem>
                         {(dropdownData['board'] || []).map(opt => (
                           <SelectItem key={opt.id} value={opt.value} className="font-bold">{opt.value}</SelectItem>
                         ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                   <Label className="text-[11px] font-black text-black tracking-widest ml-1 uppercase">Annual Fee Amount (INR) *</Label>
                   <Input 
                      name="amount" 
                      type="number" 
                      required 
                      defaultValue={editingRule?.amount} 
                      className="h-14 rounded-xl border-zinc-100 bg-zinc-50/50 font-black text-emerald-600 text-xl shadow-inner pr-12 focus-visible:ring-primary" 
                      placeholder="0.00"
                   />
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-black text-black tracking-widest ml-1 uppercase">Additional Notes</Label>
                  <Input 
                    name="notes" 
                    defaultValue={editingRule?.notes} 
                    className="h-12 border-zinc-100 rounded-xl font-medium bg-zinc-100/30" 
                    placeholder="e.g. Per Subject, One time only..." 
                  />
                </div>

                <Button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="w-full h-14 bg-primary hover:opacity-90 text-white rounded-2xl font-black text-[13px] tracking-widest border-none shadow-xl active:scale-95 transition-all mt-4"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-3" /> : <Save className="w-4 h-4 mr-3" />}
                  {editingRule ? 'UPDATE FEE CONFIGURATION' : 'SAVE FEE CONFIGURATION'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  )
}
