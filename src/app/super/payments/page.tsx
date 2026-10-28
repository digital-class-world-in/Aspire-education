
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  Wallet, 
  Search, 
  Plus, 
  Filter, 
  ArrowUpRight, 
  History, 
  DollarSign, 
  ChevronLeft, 
  ChevronRight,
  Landmark,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  Loader2,
  X,
  CreditCard
} from "lucide-react"
import { useFirebase } from "@/firebase"
import { ref, onValue, off, push, set } from "firebase/database"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogDescription, 
  DialogClose 
} from "@/components/ui/dialog"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"

export default function SuperPaymentsPage() {
  const { database } = useFirebase()
  const [institutes, setInstitutes] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    if (!database) return
    
    const instRef = ref(database, 'Institutes')
    const unsubInst = onValue(instRef, (snapshot) => {
      const data = snapshot.val() || {}
      setInstitutes(Object.keys(data).map(k => ({ ...data[k].profile, id: k })))
    })

    const masterPaymentsRef = ref(database, 'MasterPayments')
    const unsubPay = onValue(masterPaymentsRef, (snapshot) => {
      const data = snapshot.val() || {}
      setPayments(Object.keys(data).map(k => ({ ...data[k], id: k })).reverse())
      setIsLoading(false)
    })

    return () => {
      off(instRef)
      off(masterPaymentsRef)
    }
  }, [database])

  const filtered = useMemo(() => {
    return payments.filter(p => 
      p.instituteName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.txId?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [payments, searchTerm])

  const stats = useMemo(() => {
    const totalRev = payments.reduce((sum, p) => sum + (Number(p.paidAmount) || 0), 0)
    const totalDue = payments.reduce((sum, p) => sum + (Number(p.dueAmount) || 0), 0)
    return { totalRev, totalDue, paidCount: payments.filter(p => p.status === 'Paid').length }
  }, [payments])

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const handleAddPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!database || isSubmitting) return
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const instId = formData.get("instId") as string
    const inst = institutes.find(i => i.id === instId)
    
    const planAmount = Number(formData.get("planAmount"))
    const paidAmount = Number(formData.get("paidAmount"))
    const dueAmount = Math.max(0, planAmount - paidAmount)

    const paymentData = {
      instId,
      instituteName: inst?.instituteName || "Unknown",
      planType: formData.get("planType"),
      planAmount,
      paidAmount,
      dueAmount,
      status: dueAmount === 0 ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Due',
      paymentDate: formData.get("date") || format(new Date(), "yyyy-MM-dd"),
      expiryDate: formData.get("expiry"),
      txId: `SAAS-${Date.now()}`,
      notes: formData.get("notes"),
      createdAt: Date.now()
    }

    try {
      await push(ref(database, 'MasterPayments'), paymentData)
      toast({ title: "Master Ledger Updated" })
      setIsModalOpen(false)
    } catch (e) {
      toast({ variant: "destructive", title: "Sync Failed" })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) return <div className="p-20 text-center font-black text-black animate-pulse ">Opening Enterprise Ledger...</div>

  return (
    <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-500 max-w-7xl mx-auto w-full pb-32 bg-white min-h-screen">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div>
          <h2 className="text-3xl font-black text-black tracking-tight font-public-sans">Enterprise Finance</h2>
          <p className="text-[14px] text-black font-medium  mt-1">Global SaaS Revenue & Receivables</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#EAB308] hover:bg-[#FACC15] text-black rounded-xl h-11 px-8 font-black text-[14px] gap-2 border-none shadow-sm active:scale-95 transition-all ">
              <Plus className="h-4 w-4" /> Log Transaction
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl p-0 border border-zinc-200 rounded-2xl overflow-y-auto bg-white shadow-2xl">
            <div className="bg-zinc-50 p-8 border-b border-zinc-100 flex items-center justify-between">
              <DialogTitle className="text-xl font-black text-black tracking-tight">Manual Payment Entry</DialogTitle>
              
            </div>
            <form onSubmit={handleAddPayment} className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-[10px] font-black text-black  ml-1">Target Node</Label>
                  <Select name="instId" required>
                    <SelectTrigger className="h-12 bg-zinc-50/50 border-zinc-200 rounded-xl font-bold"><SelectValue placeholder="Select Institute..." /></SelectTrigger>
                    <SelectContent>{institutes.map(i => <SelectItem key={i.id} value={i.id}>{i.instituteName}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black text-black  ml-1">Total Bill (INR)</Label>
                  <Input name="planAmount" type="number" required className="h-12 border-zinc-200 rounded-xl font-bold" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black text-black  ml-1">Amount Paid</Label>
                  <Input name="paidAmount" type="number" required className="h-12 border-zinc-200 rounded-xl font-black text-emerald-600" />
                </div>
                <div className="space-y-1.5"><Label className="text-[10px] font-black text-black  ml-1">Payment Date</Label><Input name="date" type="date" required defaultValue={format(new Date(), "yyyy-MM-dd")} className="h-12 rounded-xl" /></div>
                <div className="space-y-1.5"><Label className="text-[10px] font-black text-black  ml-1">Expiry Adjustment</Label><Input name="expiry" type="date" className="h-12 rounded-xl" /></div>
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full h-14 bg-[#1e3a8a] text-white rounded-2xl font-black text-[14px]  shadow-xl border-none">
                {isSubmitting ? <Loader2 className="animate-spin h-5 w-5" /> : "Authorize Transaction"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <MetricCard label="Revenue Received" value={`₹${stats.totalRev.toLocaleString()}`} icon={<CheckCircle2 className="text-emerald-500" />} />
        <MetricCard label="Total Arrears" value={`₹${stats.totalDue.toLocaleString()}`} icon={<AlertCircle className="text-rose-500" />} />
        <MetricCard label="Active Billing" value={stats.paidCount} icon={<CreditCard className="text-indigo-500" />} />
      </div>

      <Card className="border border-zinc-200 shadow-sm rounded-2xl overflow-hidden bg-white">
        <div className="p-8 border-b border-zinc-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-zinc-300" />
            <Input 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              placeholder="Filter Global Transactions..." 
              className="pl-12 h-11 bg-zinc-50 border-none rounded-xl text-[14px] font-bold shadow-inner" 
            />
          </div>
          <Button variant="ghost" className="text-[10px] font-black  text-black gap-2 border-none transition-none">
            <Download className="w-4 h-4" /> Download Statement
          </Button>
        </div>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-50/50">
              <TableRow className="border-zinc-200">
                <TableHead className="text-[10px] font-black text-black h-14 pl-10">ENTITY</TableHead>
                <TableHead className="text-[10px] font-black text-black h-14">TX IDENTIFIER</TableHead>
                <TableHead className="text-[10px] font-black text-black h-14 text-center">PAID (INR)</TableHead>
                <TableHead className="text-[10px] font-black text-black h-14 text-center">DUE</TableHead>
                <TableHead className="text-[10px] font-black text-black h-14">STATUS</TableHead>
                <TableHead className="text-right pr-10 text-[10px] font-black text-black h-14">DATE</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((p) => (
                <TableRow key={p.id} className="border-zinc-100 group hover:bg-zinc-50/30 transition-none">
                  <TableCell className="pl-10 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-300 shadow-inner group-hover:text-primary transition-colors">
                        <Landmark className="w-5 h-5" />
                      </div>
                      <span className="text-[14px] font-black text-black tracking-tight">{p.instituteName}</span>
                    </div>
                  </TableCell>
                  <TableCell><span className="text-[9px] font-bold text-black font-public-sans tracking-tighter">{p.txId}</span></TableCell>
                  <TableCell className="text-center font-black text-black">₹{Number(p.paidAmount).toLocaleString()}</TableCell>
                  <TableCell className="text-center">
                    <span className={cn("text-[14px] font-black", Number(p.dueAmount) > 0 ? "text-rose-500" : "text-zinc-300")}>
                      {Number(p.dueAmount) > 0 ? `₹${Number(p.dueAmount).toLocaleString()}` : '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn(
                      "rounded-lg px-3 py-1 text-[9px] font-black  border-none shadow-none transition-none",
                      p.status === 'Paid' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    )}>{p.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right pr-10 font-bold text-black font-public-sans">{p.paymentDate}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <Button variant="ghost" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-10 px-6 rounded-xl font-black text-[10px]  text-black hover:text-primary transition-all">
            <ChevronLeft className="w-4 h-4 mr-2" /> Prev
          </Button>
          <div className="flex items-center gap-2">
            {[...Array(totalPages)].map((_, i) => (
              <button key={i} onClick={() => setCurrentPage(i + 1)} className={cn("w-10 h-10 rounded-xl text-[10px] font-black transition-all", currentPage === i + 1 ? "bg-primary text-white shadow-xl" : "bg-white border border-zinc-100 text-black")}>{i + 1}</button>
            ))}
          </div>
          <Button variant="ghost" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="h-10 px-6 rounded-xl font-black text-[10px]  text-black hover:text-primary transition-all">
            Next <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </main>
  )
}

function MetricCard({ label, value, icon }: any) {
  return (
    <Card className="border border-zinc-200 shadow-sm rounded-2xl bg-white p-8 flex items-center gap-6 group hover:shadow-md transition-all">
      <div className="w-14 h-14 rounded-2xl bg-zinc-50 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black text-black  mb-1">{label}</p>
        <h4 className="text-2xl font-black text-black tracking-tighter">{value}</h4>
      </div>
    </Card>
  )
}
