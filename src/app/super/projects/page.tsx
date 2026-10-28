
"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { 
  Search, 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  Loader2, 
  Eye, 
  History, 
  Settings2,
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Briefcase, 
  User, 
  ShieldCheck, 
  CreditCard, 
  Save, 
  Wallet,
  PlusCircle,
  MinusCircle,
  Link as LinkIcon,
  Layers,
  Building2,
  FileText,
  Calendar,
  Code,
  Info,
  MapPin,
  Download,
  FileDown,
  Globe,
  Smartphone,
  ExternalLink,
  Upload,
  Check,
  Printer,
  TrendingUp,
  Landmark,
  Copy,
  Receipt,
  Phone,
  FileSearch,
  Mail
} from "lucide-react"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { useFirebase } from "@/firebase"
import { ref, onValue, push, update, remove, off, set, get } from "firebase/database"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

const PROJECT_STATUSES = [
  "Yet not Started",
  "On Going",
  "Delivery Completed",
  "In Client Revision",
  "Stopped by DC",
  "Client Side Hold",
  "Client Side Requirement Pending",
  "Bug Solving"
]

export default function SuperProjectsPage() {
  const { database } = useFirebase()
  const [projects, setProjects] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [isManageOpen, setIsManageOpen] = useState(false)
  
  const [selectedProject, setSelectedProject] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  
  const [dropdownData, setDropdownData] = useState<Record<string, any[]>>({
    ASMs: [],
    Developers: [],
    PlanTypes: []
  })
  
  const [newOptionValue, setNewOptionValue] = useState("")
  const [activeManageField, setActiveManageField] = useState<{key: string, label: string} | null>(null)
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null)

  const [origPrice, setOrigPrice] = useState<string>("")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), [])

  useEffect(() => {
    if (!database) return
    const rootRef = ref(database, 'MasterProjects')
    const unsub = onValue(rootRef, (snapshot) => {
      const data = snapshot.val() || {}
      setProjects(Object.keys(data).map(k => ({ ...data[k], id: k })).reverse())
      setIsLoading(false)
    })

    const configRef = ref(database, 'MasterConfig')
    onValue(configRef, (snapshot) => {
      const data = snapshot.val() || {}
      const processed: Record<string, any[]> = {}
      Object.keys(data).forEach(key => {
        processed[key] = Object.keys(data[key]).map(id => ({ id, value: data[key][id].value }))
      })
      setDropdownData(prev => ({ ...prev, ...processed }))
    })

    return () => { off(rootRef); off(configRef); }
  }, [database])

  const filtered = useMemo(() => projects.filter(p => 
    p.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.id?.toLowerCase().includes(searchTerm.toLowerCase())
  ), [projects, searchTerm])

  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  const totalPages = Math.ceil(filtered.length / itemsPerPage)

  const generateReceipt = (p: any, proj: any, action: 'download' | 'view' = 'download') => {
    const doc = new jsPDF();
    const bizName = proj.businessName || "ENTERPRISE NODE";
    
    doc.setFillColor(186, 230, 253); 
    doc.triangle(210, 0, 210, 40, 170, 0, 'F');
    doc.triangle(0, 297, 0, 257, 40, 297, 'F');

    doc.setTextColor(239, 68, 68); 
    doc.setFontSize(22).setFont("helvetica", "bold").text("Digital Class", 20, 25);
    doc.setTextColor(100).setFontSize(8).setFont("helvetica", "normal").text("Educational World", 20, 30);
    
    doc.setTextColor(0).setFontSize(28).setFont("helvetica", "bold").text("INVOICE", 140, 25);
    doc.setFontSize(8).setTextColor(80).setFont("helvetica", "normal").text("Mohkar Educom India Pvt.Ltd\nEmail: sales@digitalclassworld.com\nWebsite: www.digitalclassworld.com\nLocation: Gujarat, India", 140, 32);
    
    doc.setTextColor(150).setFontSize(9).setFont("helvetica", "bold").text("RECEIVED FROM:", 20, 65);
    doc.setTextColor(0).setFontSize(12).text(proj.clientName || "-", 20, 72);
    doc.setFontSize(8).setFont("helvetica", "normal").text(`Email: ${proj.clientEmail || "-"}\nPhone: ${proj.clientPhone || "-"}`, 20, 78);
    
    doc.setTextColor(150).setFontSize(9).setFont("helvetica", "bold").text("PAYMENT DETAILS:", 20, 100);
    autoTable(doc, { 
      startY: 105, 
      head: [['Sr No', 'Description', 'Amount', 'Receipt Date']], 
      body: [[1, `Infrastructure Setup & Licensing: ${proj.planType}`, `INR ${(Number(p.amount) || 0).toLocaleString()}`, p.date]], 
      theme: 'striped', 
      headStyles: { fillColor: [241, 245, 249], textColor: [100], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { textColor: [0, 0, 0], fontSize: 8 },
      columnStyles: { 2: { halign: 'right' } }
    });
    
    const finalY = (doc as any).lastAutoTable.finalY;
    doc.setFillColor(248, 250, 252).rect(20, finalY, 170, 10, 'F');
    doc.setFontSize(9).setFont("helvetica", "bold").text("Total Payment", 120, finalY + 7);
    doc.text(`INR ${(Number(p.amount) || 0).toLocaleString()}`, 170, finalY + 7);

    doc.setTextColor(150).setFontSize(9).setFont("helvetica", "bold").text("PAYMENT METHOD:", 20, finalY + 25);
    doc.setTextColor(0).setFontSize(10).text(p.method || "Razorpay", 20, finalY + 32);
    
    doc.setTextColor(150).setFontSize(9).setFont("helvetica", "bold").text("TRANSACTION DETAILS:", 20, finalY + 45);
    doc.setTextColor(0).setFontSize(8).text(p.txId || "Razorpay", 20, finalY + 52);

    doc.setFillColor(248, 250, 252).roundedRect(110, finalY + 25, 80, 25, 3, 3, 'F');
    doc.setTextColor(100).setFontSize(8).setFont("helvetica", "bold").text("NOTE:", 115, finalY + 32);
    doc.setFont("helvetica", "normal").text("Your Payment has been received successfully and is non-\nrefundable. Please keep this receipt for your records.", 115, finalY + 37);

    doc.setTextColor(150).setFontSize(9).setFont("helvetica", "bold").text("COMPANY BANK DETAILS", 20, 240);
    doc.setTextColor(100).setFontSize(7).setFont("helvetica", "normal").text("MOHKAR EDUCOM INDIA PVT.LTD\nBank Name: Bank of Baroda\nAccount No: 27370200001147\nIFSC Code: BARB0SAIAHM\nBranch: Satellite Area Branch", 20, 246);
    
    doc.setTextColor(0).setFontSize(10).setFont("helvetica", "bold").text("Regards,\nTeam Digital Class", 160, 275, { align: 'center' });
    
    if (action === 'view') {
      window.open(doc.output('bloburl'), '_blank');
    } else {
      doc.save(`Invoice_${bizName.replace(/\s+/g, '_')}_${p.date}.pdf`);
    }
  };

  const handleSaveProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!database || isSubmitting) return
    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)
    
    try {
      const totalAmount = Number(origPrice);
      const recAmount = selectedProject ? Number(selectedProject.receivedAmount) : 0;
      
      const data = { 
        businessName: formData.get("businessName"), 
        clientName: formData.get("clientName"), 
        clientPhone: formData.get("clientPhone"), 
        clientEmail: formData.get("clientEmail"), 
        planType: formData.get("planType"), 
        totalAmount, 
        receivedAmount: recAmount, 
        dueAmount: Math.max(0, totalAmount - recAmount), 
        projectDate: formData.get("projectDate") || today, 
        expectedDeliveryDate: formData.get("expectedDeliveryDate") || "", 
        renewalDate: formData.get("renewalDate") || "", 
        renewalAmount: Number(formData.get("renewalAmount") || 0), 
        status: formData.get("status") || "Yet not Started", 
        asmName: formData.get("asmName") || "", 
        developerName: formData.get("developerName") || "", 
        address: formData.get("address") || "", 
        updatedAt: Date.now() 
      }

      if (selectedProject?.id) await update(ref(database, `MasterProjects/${selectedProject.id}`), data)
      else await push(ref(database, 'MasterProjects'), { ...data, createdAt: Date.now(), payments: {} })
      
      setIsModalOpen(false); setSelectedProject(null); toast({ title: "Registry synchronized" })
    } catch (e) { toast({ variant: "destructive", title: "Sync failed" }) }
    finally { setIsSubmitting(false) }
  }

  const handleDeleteProject = async (id: string) => {
    if (!database) return
    if (!confirm("Are you sure you want to permanently purge this project node? This action is irreversible.")) return
    
    try {
      await remove(ref(database, `MasterProjects/${id}`))
      toast({ title: "Node purged from cloud" })
    } catch (e) {
      toast({ variant: "destructive", title: "Purge failed" })
    }
  }

  const handleAddPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!database || !selectedProject || isSubmitting) return
    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)
    const amount = Number(formData.get("amount"))
    const method = formData.get("method")
    const txId = `SAAS-${Date.now()}`
    const pData = { amount, date: formData.get("date") || today, method, notes: formData.get("notes"), txId, createdAt: Date.now() }
    
    try {
      const projectRef = ref(database, `MasterProjects/${selectedProject.id}`)
      const snapshot = await get(projectRef)
      const currentProject = snapshot.val()
      
      await push(ref(database, `MasterProjects/${selectedProject.id}/payments`), pData)
      const newRec = (Number(currentProject.receivedAmount) || 0) + amount
      await update(projectRef, { 
        receivedAmount: newRec, 
        dueAmount: Math.max(0, (Number(currentProject.totalAmount) || 0) - newRec) 
      })
      
      generateReceipt(pData, currentProject)
      setIsPaymentOpen(false); toast({ title: "Ledger updated" })
    } catch (e) { toast({ variant: "destructive", title: "Error" }) }
    finally { setIsSubmitting(false) }
  }

  const handleSaveOption = async () => {
    if (!newOptionValue.trim() || !database || !activeManageField) return
    const dbPath = `MasterConfig/${activeManageField.key}`
    if (editingOptionId) await update(ref(database, `${dbPath}/${editingOptionId}`), { value: newOptionValue.trim() })
    else await push(ref(database, dbPath), { value: newOptionValue.trim() })
    setNewOptionValue(""); setEditingOptionId(null); toast({ title: "Config updated" })
  }

  const openManageModal = (key: string, label: string) => { 
    setActiveManageField({ key, label }); 
    setNewOptionValue(""); 
    setEditingOptionId(null); 
    setIsManageOpen(true); 
  }

  return (
    <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-500 max-w-7xl mx-auto w-full pb-32 bg-white min-h-screen font-public-sans text-[14px] text-black">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div><h2 className="text-3xl font-black text-black font-public-sans">Enterprise Projects</h2><p className="text-[14px] text-black font-medium mt-1">Lifecycle Management Node</p></div>
        <div className="flex items-center gap-3">
          <Button onClick={() => { setSelectedProject(null); setOrigPrice(""); setIsModalOpen(true); }} className="bg-primary hover:opacity-90 text-white rounded-xl h-11 px-10 font-bold text-[14px] border-none shadow-lg active:scale-95 transition-all "><Plus className="h-4 w-4" /> Initialize project</Button>
        </div>
      </div>

      <Card className="border border-zinc-200 shadow-sm rounded-[32px] overflow-hidden bg-white">
        <div className="p-8 border-b border-zinc-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="relative group w-full md:w-80">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-zinc-300 group-focus-within:text-primary transition-colors" />
            <Input value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} placeholder="Search Node ID or Identity..." className="pl-12 h-12 rounded-xl border-zinc-100 bg-zinc-50/50 shadow-inner font-bold" />
          </div>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <Table className="min-w-[1600px]">
            <TableHeader className="bg-zinc-50/50">
              <TableRow className="border-zinc-200 hover:bg-transparent">
                <TableHead className="text-[10px] font-black text-black h-14 pl-10 w-20">Sr No.</TableHead>
                <TableHead className="text-[10px] font-black text-black h-14">Entity Identity</TableHead>
                <TableHead className="text-[10px] font-black text-black h-14">Lifecycle Status</TableHead>
                <TableHead className="text-center text-[10px] font-black text-black h-14">Total Budget</TableHead>
                <TableHead className="text-center text-[10px] font-black text-black h-14">Received</TableHead>
                <TableHead className="text-center text-[10px] font-black text-black h-14">Arrears</TableHead>
                <TableHead className="text-right pr-10 text-[10px] font-black text-black h-14">Node Operations</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((p, idx) => (
                <TableRow key={p.id} className="border-zinc-100 group hover:bg-zinc-50/30 transition-none">
                  <TableCell className="pl-10 py-6 text-[14px] font-black text-zinc-300">{(currentPage - 1) * itemsPerPage + idx + 1}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-[15px] font-black text-black tracking-tight">{p.businessName}</span>
                      <span className="text-[10px] text-black font-bold">{p.clientName} • {p.planType}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge className="rounded-lg px-3 py-1 text-[9px] font-black border-none shadow-none">{p.status}</Badge></TableCell>
                  <TableCell className="text-center font-black text-black">₹{Number(p.totalAmount || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-center font-black text-emerald-600">₹{Number(p.receivedAmount || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-center font-black text-rose-500">₹{Number(p.dueAmount || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-right pr-10">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedProject(p); setIsDetailsOpen(true); }} className="h-9 w-9 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="View Dossier"><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedProject(p); setIsPaymentOpen(true); }} className="h-9 w-9 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all" title="Record Payment"><Wallet className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedProject(p); setOrigPrice(p.totalAmount?.toString() || ""); setIsModalOpen(true); }} className="h-9 w-9 text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Edit Parameters"><Edit2 className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteProject(p.id)} className="h-9 w-9 text-rose-500 hover:bg-rose-50 rounded-xl transition-all" title="Purge Node"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[65vw] p-0 border-none rounded-[40px] overflow-y-auto bg-white shadow-2xl flex flex-col max-h-[95vh]">
          {selectedProject && (
            <>
              <div className="bg-zinc-900 px-10 py-10 text-white flex justify-between items-end relative shrink-0">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24 blur-3xl" />
                <div className="space-y-2 relative z-10">
                  <Badge className="bg-primary/20 text-primary border-none text-[9px] font-black  px-3">Secure Registry</Badge>
                  <DialogTitle className="text-4xl font-black tracking-tight font-public-sans">{selectedProject.businessName}</DialogTitle>
                  <p className="text-black font-bold text-[10px] ">{selectedProject.planType} • Status: {selectedProject.status}</p>
                </div>
                
              </div>

              <ScrollArea className="flex-1 overflow-y-auto">
                <div className="p-10 space-y-12 pb-24">
                  <div className="space-y-8">
                    <h3 className="text-[14px] font-black text-primary  border-b pb-2">1. Client Identity & Communication</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                      <ProjectMeta label="Client Name" value={selectedProject.clientName} icon={<User className="w-4 h-4" />} />
                      <ProjectMeta label="Contact Phone" value={selectedProject.clientPhone} icon={<Phone className="w-4 h-4" />} />
                      <ProjectMeta label="Client Email" value={selectedProject.clientEmail} icon={<Mail className="w-4 h-4" />} />
                      <ProjectMeta label="Project Start" value={selectedProject.projectDate || '-'} icon={<Calendar className="w-4 h-4" />} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-black  ml-1">Official Address</Label>
                      <div className="p-6 bg-zinc-50 border border-zinc-100 rounded-2xl flex items-start gap-4">
                        <MapPin className="w-5 h-5 text-zinc-300 mt-0.5" />
                        <p className="text-[14px] font-bold text-black leading-relaxed">{selectedProject.address || 'No address provided in registry.'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <h3 className="text-[14px] font-black text-indigo-600  border-b pb-2">2. Node Assignment & Lifecycle</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                      <ProjectMeta label="Primary Asm" value={selectedProject.asmName || 'UNASSIGNED'} icon={<ShieldCheck className="w-4 h-4" />} />
                      <ProjectMeta label="Lead Developer" value={selectedProject.developerName || 'UNASSIGNED'} icon={<Code className="w-4 h-4" />} />
                      <ProjectMeta label="Delivery Target" value={selectedProject.expectedDeliveryDate || 'NOT SET'} icon={<CheckCircle2 className="w-4 h-4" />} />
                      <ProjectMeta label="Renewal Cycle" value={selectedProject.renewalDate || 'NOT SET'} icon={<History className="w-4 h-4" />} />
                    </div>
                  </div>

                  <div className="space-y-8">
                    <h3 className="text-[14px] font-black text-emerald-600  border-b pb-2">3. Financial Ledger Overview</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-zinc-900 p-8 rounded-[32px] text-white relative overflow-hidden shadow-xl">
                      <div className="absolute top-0 right-0 p-8 opacity-5"><Wallet className="w-32 h-32" /></div>
                      <div className="text-center space-y-1 border-r border-white/5"><p className="text-[9px] font-black text-black ">Master Budget</p><p className="text-xl font-black text-white">₹{Number(selectedProject.totalAmount).toLocaleString()}</p></div>
                      <div className="text-center space-y-1 border-r border-white/5"><p className="text-[9px] font-black text-emerald-400 ">Received</p><p className="text-xl font-black text-emerald-400">₹{Number(selectedProject.receivedAmount).toLocaleString()}</p></div>
                      <div className="text-center space-y-1 border-r border-white/5"><p className="text-[9px] font-black text-rose-400 ">Outstanding</p><p className="text-xl font-black text-rose-400">₹{Number(selectedProject.dueAmount).toLocaleString()}</p></div>
                      <div className="text-center space-y-1"><p className="text-[9px] font-black text-amber-400 ">Renewal Cost</p><p className="text-xl font-black text-amber-400">₹{Number(selectedProject.renewalAmount || 0).toLocaleString()}</p></div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-zinc-50 pb-2">
                      <h4 className="text-[10px] font-black text-black ">Transaction Registry</h4>
                      <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[9px] px-3">Verified Nodes</Badge>
                    </div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-zinc-50/50">
                          <TableRow className="border-zinc-100 hover:bg-transparent">
                            <TableHead className="pl-6 text-[10px] font-black h-12">Date</TableHead>
                            <TableHead className="text-[10px] font-black">Method</TableHead>
                            <TableHead className="text-center text-[10px] font-black">Amount</TableHead>
                            <TableHead className="text-right pr-6 text-[10px] font-black">Receipt Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedProject.payments ? Object.keys(selectedProject.payments).map(k => {
                            const p = selectedProject.payments[k];
                            return (
                              <TableRow key={k} className="border-zinc-50 group hover:bg-zinc-50/20 transition-all">
                                <TableCell className="pl-6 font-bold text-black font-public-sans text-[14px]">{p.date}</TableCell>
                                <TableCell className="text-[14px] font-black text-black">{p.method}</TableCell>
                                <TableCell className="text-center font-black text-emerald-600">₹{Number(p.amount).toLocaleString()}</TableCell>
                                <TableCell className="text-right pr-6">
                                  <div className="flex items-center justify-end gap-2">
                                    <Button onClick={() => generateReceipt(p, selectedProject, 'view')} variant="ghost" size="icon" className="h-8 w-8 text-[#1e3a8a] bg-blue-50 opacity-0 group-hover:opacity-100 transition-all" title="View Receipt">
                                      <FileSearch className="w-4 h-4" />
                                    </Button>
                                    <Button onClick={() => generateReceipt(p, selectedProject, 'download')} variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 bg-emerald-50 opacity-0 group-hover:opacity-100 transition-all" title="Download PDF">
                                      <Download className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          }) : (
                            <TableRow><TableCell colSpan={4} className="h-32 text-center text-zinc-300 italic text-[10px] ">No transactions registered</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-5xl p-0 border-none rounded-[40px] overflow-y-auto bg-white shadow-2xl">
          <div className="bg-[#1e3a8a] px-10 py-8 text-white relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
            <DialogTitle className="text-3xl font-black tracking-tight leading-none">
              {selectedProject ? 'Refine project parameters' : 'Initialize project'}
            </DialogTitle>
            <p className="text-blue-200 text-[14px] font-bold  mt-1">Infrastructure Provisioning Node</p>
          </div>
          <ScrollArea className="max-h-[80vh]">
            <form onSubmit={handleSaveProject} className="p-10 space-y-12 pb-24">
              <div className="space-y-8">
                <h3 className="text-[14px] font-black text-[#1e3a8a]  border-b pb-2">1. Client Identity Registry</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-3 space-y-1.5"><Label className="text-[11px] font-black text-black  ml-1">Business Name *</Label><Input name="businessName" defaultValue={selectedProject?.businessName} required className="h-14 rounded-2xl border-zinc-100 bg-zinc-50/50 font-bold" /></div>
                  <div className="space-y-1.5"><Label className="text-[11px] font-black text-black  ml-1">Client Name</Label><Input name="clientName" defaultValue={selectedProject?.clientName} required className="h-12 rounded-xl" /></div>
                  <div className="space-y-1.5"><Label className="text-[11px] font-black text-black  ml-1">Phone</Label><Input name="clientPhone" defaultValue={selectedProject?.clientPhone} required className="h-12 rounded-xl" /></div>
                  <div className="space-y-1.5"><Label className="text-[11px] font-black text-black  ml-1">Email</Label><Input name="clientEmail" type="email" defaultValue={selectedProject?.clientEmail} required className="h-12 rounded-xl" /></div>
                </div>
              </div>

              <div className="space-y-8">
                <h3 className="text-[14px] font-black text-indigo-600  border-b pb-2">2. Stakeholder Registry</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center ml-1"><Label className="text-[11px] font-black text-black ">Service Tier</Label><button type="button" onClick={() => openManageModal('PlanTypes', 'Service Tier')} className="text-[9px] font-black text-primary hover:underline">Manage</button></div>
                    <Select name="planType" defaultValue={selectedProject?.planType || "Starter Website"}>
                      <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>{(dropdownData['PlanTypes'] || []).map(p => <SelectItem key={p.id} value={p.value} className="font-bold text-[14px]">{p.value}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center ml-1"><Label className="text-[11px] font-black text-black ">Asm Node</Label><button type="button" onClick={() => openManageModal('ASMs', 'ASM Node')} className="text-[9px] font-black text-primary hover:underline">Manage</button></div>
                    <Select name="asmName" defaultValue={selectedProject?.asmName}>
                      <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Select ASM..." /></SelectTrigger>
                      <SelectContent>{(dropdownData['ASMs'] || []).map(a => <SelectItem key={a.id} value={a.value} className="font-bold text-[14px]">{a.value}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center ml-1"><Label className="text-[11px] font-black text-black ">Primary Developer</Label><button type="button" onClick={() => openManageModal('Developers', 'Developer')} className="text-[9px] font-black text-primary hover:underline">Manage</button></div>
                    <Select name="developerName" defaultValue={selectedProject?.developerName}>
                      <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Select Dev..." /></SelectTrigger>
                      <SelectContent>{(dropdownData['Developers'] || []).map(d => <SelectItem key={d.id} value={d.value} className="font-bold text-[14px]">{d.value}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <h3 className="text-[14px] font-black text-emerald-600  border-b pb-2">3. Financial Matrix</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  <div className="space-y-1.5"><Label className="text-[11px] font-black text-black  ml-1">Total Amount</Label><Input value={origPrice} onChange={e => setOrigPrice(e.target.value)} type="number" required className="h-12 rounded-xl font-black text-lg" /></div>
                  <div className="space-y-1.5"><Label className="text-[11px] font-black text-black  ml-1">Renewal Amount</Label><Input name="renewalAmount" type="number" defaultValue={selectedProject?.renewalAmount} className="h-12 rounded-xl font-black text-black" /></div>
                  <div className="space-y-1.5"><Label className="text-[11px] font-black text-black  ml-1">Renewal Date</Label><Input name="renewalDate" type="date" defaultValue={selectedProject?.renewalDate} className="h-12 rounded-xl" /></div>
                  <div className="space-y-1.5"><Label className="text-[11px] font-black text-black  ml-1">Initial Status</Label>
                    <Select name="status" defaultValue={selectedProject?.status || "Yet not Started"}>
                      <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>{PROJECT_STATUSES.map(s => <SelectItem key={s} value={s} className="font-bold text-[14px]">{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <h3 className="text-[14px] font-black text-black  border-b pb-2">4. Document & Provisioning</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <div className="space-y-1.5"><Label className="text-[11px] font-black text-black  ml-1">Project Start</Label><Input name="projectDate" type="date" defaultValue={selectedProject?.projectDate || today} className="h-12 rounded-xl" /></div>
                  <div className="space-y-1.5"><Label className="text-[11px] font-black text-black  ml-1">Delivery Date</Label><Input name="expectedDeliveryDate" type="date" defaultValue={selectedProject?.expectedDeliveryDate} className="h-12 rounded-xl" /></div>
                  <div className="md:col-span-3 space-y-1.5"><Label className="text-[11px] font-black text-black  ml-1">Official Address</Label><Textarea name="address" defaultValue={selectedProject?.address} className="rounded-2xl border-zinc-100 bg-zinc-50/50 min-h-[100px] font-bold" /></div>
                </div>
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full h-16 bg-zinc-900 hover:bg-black text-white rounded-3xl font-black text-[14px]  shadow-xl border-none active:scale-95 transition-all">
                {isSubmitting ? <Loader2 className="animate-spin" /> : <Save className="w-5 h-5 mr-3" />} Commit Node Synchronization
              </Button>
            </form>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent className="max-w-md p-0 border-none rounded-[40px] overflow-y-auto bg-white shadow-2xl">
          <div className="bg-emerald-600 p-8 text-white relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
            <DialogTitle className="text-xl font-black leading-tight">Authorize Receipt</DialogTitle>
            <p className="text-[10px] font-bold text-emerald-100  mt-1">{selectedProject?.businessName}</p>
          </div>
          <form onSubmit={handleAddPayment} className="p-8 space-y-6">
            <div className="space-y-1.5"><Label className="text-[11px] font-black text-black  ml-1">Amount Received (INR)</Label><Input name="amount" type="number" required defaultValue={selectedProject?.dueAmount} className="h-14 rounded-2xl border-emerald-100 bg-emerald-50/30 font-black text-emerald-600 text-lg shadow-inner" /></div>
            <div className="space-y-1.5"><Label className="text-[11px] font-black text-black  ml-1">Payment Date</Label><Input name="date" type="date" required defaultValue={today} className="h-12 rounded-xl font-bold" /></div>
            <div className="space-y-1.5"><Label className="text-[11px] font-black text-black  ml-1">Method</Label>
              <Select name="method" defaultValue="Online">
                <SelectTrigger className="h-12 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Online">Online Transfer</SelectItem><SelectItem value="Cash">Cash Payment</SelectItem><SelectItem value="Bank">Direct Bank</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-[11px] font-black text-black  ml-1">Internal Notes</Label><Input name="notes" placeholder="Ref No / Reason..." className="h-12 rounded-xl" /></div>
            <Button type="submit" disabled={isSubmitting} className="w-full h-14 bg-emerald-600 text-white rounded-2xl font-black text-[14px]  shadow-xl border-none active:scale-95 transition-all">Authorize Ledger Record</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
        <DialogContent className="max-w-md rounded-[32px] p-10 bg-white border-none shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8"><DialogTitle className="text-xl font-normal">Manage {activeManageField?.label}</DialogTitle></div>
          <div className="flex gap-2 mb-8"><Input value={newOptionValue} onChange={(e) => setNewOptionValue(e.target.value)} placeholder="Enter entry name..." className="rounded-xl h-12 font-bold" /><Button onClick={handleSaveOption} className="bg-primary text-white rounded-xl px-8 h-12 border-none shadow-lg active:scale-95 transition-all">Add</Button></div>
          <ScrollArea className="h-64 pr-4">
            <div className="space-y-2">
              {(dropdownData[activeManageField?.key || ''] || []).map(opt => (
                <div key={opt.id} className="flex items-center justify-between p-4 rounded-xl border border-zinc-100 hover:bg-zinc-50 transition-all group">
                  <span className="text-[14px] font-bold text-black">{opt.value}</span>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingOptionId(opt.id); setNewOptionValue(opt.value); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all border-none bg-transparent cursor-pointer"><Edit2 className="h-3.5 w-3.5" /></button>
                    <button onClick={() => remove(ref(database!, `MasterConfig/${activeManageField!.key}/${opt.id}`))} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all border-none bg-transparent cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-center gap-4 pt-4">
        <Button variant="ghost" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-10 px-6 rounded-xl font-black text-[10px]  text-black hover:text-primary transition-all">
          <ChevronLeft className="w-4 h-4 mr-2" /> Prev
        </Button>
        <div className="flex items-center gap-2">
          {[...Array(totalPages)].map((_, i) => (
            <button key={i} onClick={() => setCurrentPage(i + 1)} className={cn("w-10 h-10 rounded-xl text-[10px] font-black transition-all", currentPage === i + 1 ? "bg-[#1e3a8a] text-white shadow-xl" : "bg-white border border-zinc-100 text-black")}>{i + 1}</button>
          ))}
        </div>
        <Button variant="ghost" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="h-10 px-6 rounded-xl font-black text-[10px]  text-black hover:text-primary transition-all">
          Next <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </main>
  )
}

function ProjectMeta({ label, value, icon }: any) {
  return (
    <div className="flex items-center gap-4 group">
      <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-300 group-hover:bg-white group-hover:text-primary transition-all shadow-inner">{icon || <Info className="w-4 h-4" />}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-black text-black  mb-1">{label}</p>
        <p className="text-[14px] font-black text-black tracking-tight truncate">{value || '---'}</p>
      </div>
    </div>
  )
}
