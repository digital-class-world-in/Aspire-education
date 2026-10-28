
"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft, 
  Settings2, 
  Calendar, 
  CreditCard, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Loader2,
  DollarSign
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, update, off } from "firebase/database"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { addMonths, format } from "date-fns"

export default function FeeSetupPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center font-black text-zinc-300 animate-pulse">Loading Setup Node...</div>}>
      <FeeSetupContent />
    </Suspense>
  )
}

function FeeSetupContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const studentIdFromUrl = searchParams.get("studentId")
  
  const { database } = useFirebase()
  const { user } = useUser()

  const [students, setStudents] = useState<any[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<string>(studentIdFromUrl || "")
  const [totalAmount, setTotalAmount] = useState<number>(0)
  const [numEmis, setNumEmis] = useState<number>(1)
  const [startDate, setStartDate] = useState<string>(format(new Date(), "yyyy-MM-dd"))
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!database || !user) return
    const studentsRef = ref(database, `Institutes/${user.uid}/admissions`)
    const unsubscribe = onValue(studentsRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list = Object.keys(data).map(key => ({ ...data[key], id: key }))
        setStudents(list)
        
        // Auto-load student data if selected
        if (selectedStudentId) {
          const s = list.find(student => student.id === selectedStudentId)
          if (s) {
            setTotalAmount(Number(s.netFees) || 0)
            if (s.emiSchedule) {
              setNumEmis(s.emiSchedule.length)
              setStartDate(s.emiSchedule[0]?.dueDate || format(new Date(), "yyyy-MM-dd"))
            }
          }
        }
      }
      else setStudents([])
    })
    return () => off(studentsRef)
  }, [database, user, selectedStudentId])

  const emiSchedule = useMemo(() => {
    if (!totalAmount || numEmis <= 0) return []
    const emiValue = Math.round(totalAmount / numEmis)
    const schedule = []
    let currentTotal = 0

    for (let i = 0; i < numEmis; i++) {
      const dueDate = format(addMonths(new Date(startDate), i), "yyyy-MM-dd")
      const amount = (i === numEmis - 1) ? (totalAmount - currentTotal) : emiValue
      currentTotal += amount
      
      schedule.push({
        installmentNo: i + 1,
        dueDate,
        amount,
        status: "Pending"
      })
    }
    return schedule
  }, [totalAmount, numEmis, startDate])

  const handleSaveSetup = async () => {
    if (!database || !user || !selectedStudentId) {
      toast({ variant: "destructive", title: "Selection Missing", description: "Please select a student first." })
      return
    }

    setIsSaving(true)
    try {
      const dbPath = `Institutes/${user.uid}/admissions/${selectedStudentId}`
      await update(ref(database, dbPath), {
        netFees: totalAmount,
        emiSetupDate: new Date().toISOString(),
        emiSchedule: emiSchedule,
        feeDueDate: emiSchedule[0]?.dueDate || startDate
      })
      toast({ title: "Setup Complete", description: "Fee schedule has been generated successfully." })
      router.push("/fees-collections")
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save setup." })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans text-black">
      <Sidebar />
      <div className="lg:pl-[280px] flex flex-col flex-1 w-full overflow-x-hidden">
        <TopNav />
        <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-500">
          
          <div className="flex items-center gap-4 px-2">
            <Button variant="ghost" onClick={() => router.back()} className="h-10 w-10 p-0 rounded-full border border-zinc-100 bg-white text-black hover:text-black shadow-sm transition-all">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h2 className="text-[26px] font-normal text-black tracking-tight leading-none">Fee & EMI Setup</h2>
              <p className="text-[14px] text-black font-medium mt-1">Personalize payment structures for institutional enrollment</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-5 space-y-10">
              <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white overflow-hidden">
                <div className="bg-zinc-900 p-8 text-white space-y-1 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
                  <div className="relative z-10">
                    <p className="text-[10px] font-black tracking-[0.2em] text-primary">Configuration Panel</p>
                    <h3 className="text-xl font-normal">Setup Parameters</h3>
                  </div>
                </div>
                <div className="p-8 space-y-8">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-black tracking-widest ml-1">Target Student</Label>
                    <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                      <SelectTrigger className="h-12 rounded-xl border-zinc-200 bg-zinc-50/50 font-bold text-black">
                        <SelectValue placeholder="Select student..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-zinc-100 shadow-2xl">
                        {students.map(s => <SelectItem key={s.id} value={s.id} className="font-bold text-[11px]">{s.studentName} ({s.admissionNo})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-black tracking-widest ml-1">Total Academic Fee (₹)</Label>
                    <div className="relative">
                      <img src="https://img.icons8.com/external-kiranshastry-lineal-kiranshastry/64/external-rupee-banking-and-finance-kiranshastry-lineal-kiranshastry.png" className="absolute left-4 top-4 w-4 h-4 opacity-30" alt="₹" />
                      <Input 
                        type="number" 
                        value={totalAmount}
                        onChange={(e) => setTotalAmount(Number(e.target.value))}
                        className="pl-11 h-12 rounded-xl border-zinc-200 font-black text-black text-lg shadow-inner" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black text-black tracking-widest ml-1">Installments</Label>
                      <Input 
                        type="number" 
                        min="1" 
                        max="24"
                        value={numEmis}
                        onChange={(e) => setNumEmis(Number(e.target.value))}
                        className="h-12 rounded-xl border-zinc-200 font-bold text-black" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black text-black tracking-widest ml-1">Start Date</Label>
                      <Input 
                        type="date" 
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-12 rounded-xl border-zinc-200 font-bold text-[14px]" 
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={handleSaveSetup} 
                    disabled={isSaving || !selectedStudentId || totalAmount <= 0}
                    className="w-full h-16 bg-primary hover:opacity-90 text-white rounded-3xl font-black text-[14px] tracking-[0.2em] shadow-xl border-none active:scale-95 transition-all mt-4"
                  >
                    {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <CheckCircle2 className="h-5 w-5 mr-2" />}
                    {isSaving ? "Synchronizing..." : "Finalize & Sync Setup"}
                  </Button>
                </div>
              </Card>
            </div>

            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-[14px] font-black text-black tracking-widest">Schedule Preview</h3>
                <p className="text-[14px] font-bold text-black">Projected Net: <span className="text-emerald-600 font-black">₹ {totalAmount.toLocaleString()}</span></p>
              </div>

              <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-zinc-50/50">
                      <TableRow className="border-zinc-100 hover:bg-transparent">
                        <TableHead className="text-[11px] font-black text-black h-14 pl-10">NO.</TableHead>
                        <TableHead className="text-[11px] font-black text-black h-14">DUE DATE</TableHead>
                        <TableHead className="text-[11px] font-black text-black h-14">AMOUNT (INR)</TableHead>
                        <TableHead className="text-right pr-10 text-[11px] font-black text-black h-14">STATUS</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {emiSchedule.map((emi) => (
                        <TableRow key={emi.installmentNo} className="border-zinc-50 hover:bg-zinc-50/20 transition-none">
                          <TableCell className="pl-10 text-[14px] font-bold text-black">#{emi.installmentNo}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-[14px] font-bold text-black font-public-sans tracking-tighter">
                              <Calendar className="w-3.5 h-3.5 text-zinc-300" />
                              {emi.dueDate}
                            </div>
                          </TableCell>
                          <TableCell className="text-[14px] font-black text-black">₹ {emi.amount.toLocaleString()}</TableCell>
                          <TableCell className="text-right pr-10">
                            <Badge className="bg-amber-50 text-amber-600 border-none text-[9px] font-black px-3 py-1">Scheduled</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {emiSchedule.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="h-64 text-center">
                            <div className="flex flex-col items-center justify-center space-y-4">
                              <div className="p-10 rounded-[40px] bg-zinc-50 text-zinc-200">
                                <CreditCard className="h-12 w-12" />
                              </div>
                              <p className="text-[14px] font-black text-zinc-300 tracking-widest">Select student and parameters to generate node</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}
