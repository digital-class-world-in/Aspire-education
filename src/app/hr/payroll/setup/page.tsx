
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Save, 
  Search, 
  X, 
  Calculator, 
  ShieldCheck, 
  TrendingUp, 
  TrendingDown,
  Info,
  Users,
  Loader2,
  Landmark
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, update, off } from "firebase/database"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useRouter, usePathname } from "next/navigation"

interface SalaryComponent {
  id: string
  name: string
  type: "Earning" | "Deduction"
  calcType: "Fixed" | "Percentage"
  value: number
}

const DEFAULT_COMPONENTS: SalaryComponent[] = [
  { id: 'basic', name: 'Basic Pay', type: 'Earning', calcType: 'Fixed', value: 0 },
  { id: 'hra', name: 'House Rent Allowance (HRA)', type: 'Earning', calcType: 'Percentage', value: 0 },
  { id: 'pf', name: 'Provident Fund (PF)', type: 'Deduction', calcType: 'Fixed', value: 0 },
  { id: 'esic', name: 'ESIC Deduction', type: 'Deduction', calcType: 'Fixed', value: 0 },
  { id: 'pt', name: 'Professional Tax (PT)', type: 'Deduction', calcType: 'Fixed', value: 0 },
]

export default function SalarySetupPage() {
  const router = useRouter()
  const pathname = usePathname()
  const isPortal = pathname.startsWith('/staff') || pathname.startsWith('/student') || pathname.startsWith('/branch')

  const { database } = useFirebase()
  const { user } = useUser()
  const [employees, setEmployees] = useState<any[]>([])
  const [selectedStaff, setSelectedStaff] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [components, setComponents] = useState<SalaryComponent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    if (!database || !user) return
    const rootPath = `Institutes/${user.uid}`
    
    setIsLoading(true)
    const employeesRef = ref(database, `${rootPath}/employees`)
    const unsubEmployees = onValue(employeesRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setEmployees(Object.keys(data).map(key => ({ ...data[key], id: key })))
      } else {
        setEmployees([])
      }
      setIsLoading(false)
    })

    return () => off(employeesRef)
  }, [database, user])

  const handleOpenSetup = (emp: any) => {
    setSelectedStaff(emp)
    if (emp.salarySetup && Array.isArray(emp.salarySetup)) {
      setComponents(emp.salarySetup)
    } else {
      setComponents(DEFAULT_COMPONENTS)
    }
    setIsModalOpen(true)
  }

  const addComponent = () => {
    setComponents([
      ...components,
      { id: Date.now().toString(), name: "New Component", type: "Earning", calcType: "Fixed", value: 0 }
    ])
  }

  const removeComponent = (id: string) => {
    setComponents(components.filter(c => c.id !== id))
  }

  const updateComponent = (id: string, field: keyof SalaryComponent, value: any) => {
    setComponents(components.map(c => c.id === id ? { ...c, [field]: value } : c))
  }

  const summary = useMemo(() => {
    const basicComponent = components.find(c => c.id === 'basic')
    const basic = basicComponent?.value || 0
    
    let gross = 0
    let deduct = 0

    components.forEach(c => {
      let val = 0
      if (c.calcType === 'Percentage') {
        val = (basic * c.value) / 100
      } else {
        val = Number(c.value) || 0
      }

      if (c.type === 'Earning') gross += val
      else deduct += val
    })

    return {
      gross,
      deductions: deduct,
      net: Math.max(0, gross - deduct)
    }
  }, [components])

  const handleSaveSetup = async () => {
    if (!database || !user || !selectedStaff) return
    setIsSaving(true)
    try {
      const rootPath = `Institutes/${user.uid}`
      await update(ref(database, `${rootPath}/employees/${selectedStaff.id}`), {
        salarySetup: components,
        netSalaryBase: summary.net,
        grossSalaryBase: summary.gross,
        totalDeductionsBase: summary.deductions,
        salarySetupDate: new Date().toISOString()
      })
      toast({ title: "Setup Saved", description: `Salary structure for ${selectedStaff.firstName} has been updated.` })
      setIsModalOpen(false)
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save configuration." })
    } finally {
      setIsSaving(false)
    }
  }

  const filteredEmployees = employees.filter(e => 
    `${e.firstName} ${e.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const mainContent = (
    <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-500 w-full overflow-x-hidden font-public-sans text-black text-[14px]">
      <div className="flex items-center gap-4 px-2">
        <Button variant="ghost" onClick={() => router.back()} className="h-10 w-10 p-0 rounded-full border border-zinc-100 hover:bg-zinc-50">
          <ArrowLeft className="w-4 h-4 text-black" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-black tracking-tight font-public-sans">Salary Structure Setup</h2>
          <p className="text-[14px] text-black font-medium tracking-widest">Configure earnings and deductions for staff</p>
        </div>
      </div>

      <Card className="border border-zinc-100 shadow-sm rounded-2xl bg-white p-6">
        <div className="relative max-w-sm group">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-300 group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Search staff members..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-11 h-11 bg-zinc-50 border-none rounded-xl text-[14px] font-bold shadow-inner"
          />
        </div>
      </Card>

      <Card className="border border-zinc-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-50/50">
              <TableRow className="hover:bg-transparent border-zinc-100">
                <TableHead className="text-[11px] font-bold text-black tracking-widest h-14 pl-8">Employee</TableHead>
                <TableHead className="text-[11px] font-bold text-black tracking-widest h-14">ID</TableHead>
                <TableHead className="text-[11px] font-bold text-black tracking-widest h-14 text-center">Gross Pay</TableHead>
                <TableHead className="text-[11px] font-bold text-black tracking-widest h-14 text-center">Deductions</TableHead>
                <TableHead className="text-[11px] font-bold text-black tracking-widest h-14 text-center">Base Net Salary</TableHead>
                <TableHead className="text-right pr-8 text-[11px] font-bold text-black tracking-widest h-14">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((emp) => (
                <TableRow key={emp.id} className="border-zinc-50 hover:bg-zinc-50/20 transition-none group text-black font-public-sans">
                  <TableCell className="pl-8 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-[14px] shadow-inner">
                        {emp.firstName?.charAt(0)}
                      </div>
                      <span className="text-[14px] font-bold text-black">{emp.firstName} {emp.lastName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-[14px] font-bold text-primary font-public-sans">{emp.employeeId || '-'}</TableCell>
                  <TableCell className="text-center text-[14px] font-bold text-black">₹{Number(emp.grossSalaryBase || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-center text-[14px] font-bold text-rose-500">₹{Number(emp.totalDeductionsBase || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-center text-[14px] font-black text-emerald-600">
                    {emp.netSalaryBase ? `₹${Number(emp.netSalaryBase).toLocaleString()}` : '-'}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <Button onClick={() => handleOpenSetup(emp)} size="sm" variant="outline" className="h-8 rounded-lg text-[10px] font-bold tracking-widest transition-all hover:bg-primary hover:text-white border-primary/20 text-primary bg-white shadow-sm">
                      {emp.salarySetup ? "Edit Setup" : "Setup Now"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-[950px] p-0 border-none rounded-[40px] overflow-hidden bg-[#F8FAFC] shadow-2xl">
          <div className="bg-white px-10 py-6 border-b border-zinc-100 flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-black text-black font-public-sans">Salary Components for {selectedStaff?.firstName}</DialogTitle>
              <DialogDescription className="text-[14px] text-black font-medium">Define custom earnings and deductions for this node.</DialogDescription>
            </div>
            
          </div>
          
          <ScrollArea className="max-h-[70vh]">
            <div className="p-10 space-y-10">
              <div className="space-y-4">
                {components.map((c) => (
                  <div key={c.id} className="grid grid-cols-12 gap-4 items-center animate-in slide-in-from-left-2 duration-300">
                    <div className="col-span-3">
                      <Input 
                        value={c.name} 
                        onChange={(e) => updateComponent(c.id, 'name', e.target.value)} 
                        placeholder="Component Name"
                        className="h-12 rounded-xl bg-white border-zinc-200 font-bold" 
                      />
                    </div>
                    <div className="col-span-2">
                      <Select value={c.type} onValueChange={(val: any) => updateComponent(c.id, 'type', val)}>
                        <SelectTrigger className="h-12 rounded-xl bg-white border-zinc-200 font-bold"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl shadow-xl">
                          <SelectItem value="Earning" className="font-bold">Earning</SelectItem>
                          <SelectItem value="Deduction" className="font-bold">Deduction</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <Select value={c.calcType} onValueChange={(val: any) => updateComponent(c.id, 'calcType', val)}>
                        <SelectTrigger className="h-12 rounded-xl bg-white border-zinc-200 font-bold"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl shadow-xl">
                          <SelectItem value="Fixed" className="font-bold">Fixed Amount</SelectItem>
                          <SelectItem value="Percentage" className="font-bold">Percentage of Basic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <div className="relative group">
                        <span className="absolute left-3.5 top-3.5 text-black text-[14px] font-bold group-focus-within:text-primary transition-colors">{c.calcType === 'Fixed' ? '₹' : '%'}</span>
                        <Input 
                          type="number" 
                          value={c.value} 
                          onChange={(e) => updateComponent(c.id, 'value', Number(e.target.value))}
                          className="pl-8 h-12 rounded-xl bg-white border-zinc-200 font-bold text-black" 
                        />
                      </div>
                    </div>
                    <div className="col-span-1 text-right">
                      {c.id !== 'basic' && (
                        <Button variant="ghost" size="icon" onClick={() => removeComponent(c.id)} className="h-12 w-12 text-rose-500 hover:bg-rose-50 transition-none border-none bg-transparent">
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <Button variant="outline" onClick={addComponent} className="h-11 rounded-xl px-6 gap-2 border-dashed border-2 border-zinc-200 font-bold text-black hover:border-primary hover:text-primary transition-all bg-white">
                <Plus className="h-4 w-4" /> Add Component Node
              </Button>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10 border-t border-zinc-100">
                <SummaryDisplay label="Total Gross Earnings" value={summary.gross} color="text-black" />
                <SummaryDisplay label="Total Deductions" value={summary.deductions} color="text-rose-600" />
                <SummaryDisplay label="Calculated Net Salary" value={summary.net} color="text-emerald-600" isNet />
              </div>
            </div>
          </ScrollArea>

          <div className="bg-white p-10 flex justify-end border-t border-zinc-50">
            <button 
              onClick={handleSaveSetup}
              className="bg-primary hover:opacity-90 text-white rounded-2xl h-14 px-16 font-black text-[14px] shadow-xl shadow-primary/10 transition-all active:scale-95 border-none flex items-center gap-3 tracking-widest"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Sync Configuration
            </button>
          </div>
        </DialogContent>
      </Dialog>
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

function SummaryDisplay({ label, value, color, isNet = false }: { label: string, value: number, color: string, isNet?: boolean }) {
  return (
    <div className={cn("p-6 rounded-[24px] bg-white border border-zinc-100 shadow-sm", isNet && "border-emerald-100 bg-emerald-50/10")}>
      <p className="text-[10px] font-black text-black tracking-widest mb-1">{label}</p>
      <h4 className={cn("text-2xl font-black font-public-sans", color)}>₹{value.toLocaleString()}</h4>
    </div>
  )
}
