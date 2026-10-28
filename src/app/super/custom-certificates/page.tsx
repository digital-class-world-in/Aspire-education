"use client"

import { useState, useEffect, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Award, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Building2, 
  CheckCircle2, 
  Loader2, 
  ExternalLink,
  Filter
} from "lucide-react"
import { useFirebase } from "@/firebase"
import { ref, onValue, off, remove, update } from "firebase/database"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import { CertificateConfigurator } from "@/components/certificates/CertificateConfigurator"

export default function CustomCertificatesPage() {
  const { database } = useFirebase()
  
  // Data States
  const [templates, setTemplates] = useState<any[]>([])
  const [institutes, setInstitutes] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // UI States
  const [activeTab, setActiveTab] = useState<'templates' | 'assignments'>('templates')
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    if (!database) return
    
    // Fetch Templates
    const templatesRef = ref(database, 'GlobalSettings/CustomCertificates')
    onValue(templatesRef, (snapshot) => {
      const data = snapshot.val() || {}
      setTemplates(Object.keys(data).map(k => ({ ...data[k], id: k })).reverse())
    })

    // Fetch Institutes
    const instRef = ref(database, 'Institutes')
    onValue(instRef, (snapshot) => {
      const data = snapshot.val() || {}
      setInstitutes(Object.keys(data).map(k => ({ 
        ...data[k].profile, 
        id: k,
        assignedTemplate: data[k].profile?.certificateTemplateId || ""
      })))
      setIsLoading(false)
    })

    return () => {
      off(templatesRef)
      off(instRef)
    }
  }, [database])

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template? Institutes using it will lose their custom design.")) return
    await remove(ref(database!, `GlobalSettings/CustomCertificates/${id}`))
    toast({ title: "Template Deleted" })
  }

  const handleAssignTemplate = async (instituteId: string, templateId: string) => {
    if (!database) return
    try {
      await update(ref(database, `Institutes/${instituteId}/profile`), {
        certificateTemplateId: templateId || null
      })
      toast({ title: "Template Assigned", description: "The institute's certificate design has been updated." })
    } catch (e) {
      toast({ variant: "destructive", title: "Assignment Failed" })
    }
  }

  const filteredInstitutes = useMemo(() => {
    return institutes.filter(i => 
      i.instituteName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.id?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [institutes, searchTerm])

  const mainContent = (
    <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-700 font-public-sans max-w-7xl mx-auto w-full">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-zinc-900 flex items-center gap-3 underline decoration-amber-500/30">
            <Award className="w-8 h-8 text-amber-500" />
            VIRTUAL CERTIFICATE HUB
          </h1>
          <p className="text-zinc-500 font-bold text-[13px] mt-1  ">Global Template Architecture & Provisioning</p>
        </div>

        <div className="flex bg-zinc-100 p-1.5 rounded-[22px] border border-zinc-200">
           <button 
             onClick={() => setActiveTab('templates')}
             className={cn("px-8 py-3 rounded-[18px] text-[10px] font-black  transition-all", activeTab === 'templates' ? "bg-white text-black shadow-sm" : "text-zinc-400 hover:text-zinc-600")}
           >
             TEMPLATES
           </button>
           <button 
             onClick={() => setActiveTab('assignments')}
             className={cn("px-8 py-3 rounded-[18px] text-[10px] font-black  transition-all", activeTab === 'assignments' ? "bg-white text-black shadow-sm" : "text-zinc-400 hover:text-zinc-600")}
           >
             ASSIGNMENTS
           </button>
        </div>
      </div>

      {activeTab === 'templates' ? (
        <div className="space-y-10">
            {/* Create New Template Card */}
            <Card className="p-1 border-none shadow-xl rounded-[40px] bg-gradient-to-br from-amber-500 to-amber-600 group active:scale-[0.99] transition-all cursor-pointer overflow-hidden" onClick={() => { setSelectedTemplateId(null); setIsConfigModalOpen(true); }}>
                <div className="bg-white m-1 rounded-[36px] p-10 flex flex-col items-center justify-center text-center space-y-4 border border-amber-100 group-hover:bg-amber-50/10 transition-colors">
                    <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 shadow-inner group-hover:scale-110 transition-transform">
                        <Plus className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-black">CRAFT UNIQUE DESIGN</h3>
                        <p className="text-[10px] font-bold text-zinc-400  mt-1">START FROM BLANK FRAME</p>
                    </div>
                </div>
            </Card>

            {/* Existing Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {templates.map((t) => (
                    <Card key={t.id} className="border border-zinc-100 shadow-sm rounded-[32px] overflow-hidden group hover:shadow-2xl transition-all">
                        <div className="aspect-[1.4] relative bg-zinc-50 border-b border-zinc-100 p-2">
                             <img src={t.frameUrl} className="w-full h-full object-contain rounded-xl shadow-inner bg-white" />
                             <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                <Button onClick={() => { setSelectedTemplateId(t.id); setIsConfigModalOpen(true); }} size="icon" className="h-12 w-12 rounded-xl bg-white text-black hover:bg-zinc-100 shadow-xl scale-90 group-hover:scale-100 transition-transform">
                                    <Edit3 className="w-5 h-5" />
                                </Button>
                                <Button onClick={() => handleDeleteTemplate(t.id)} size="icon" className="h-12 w-12 rounded-xl bg-rose-500 text-white hover:bg-rose-600 shadow-xl scale-90 group-hover:scale-100 transition-transform">
                                    <Trash2 className="w-5 h-5" />
                                </Button>
                             </div>
                        </div>
                        <div className="p-6 flex items-center justify-between">
                            <div>
                                <h4 className="font-black text-[14px] text-zinc-800">{t.name}</h4>
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {institutes.filter(inst => inst.assignedTemplate === t.id).map(inst => (
                                        <Badge key={inst.id} variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[8px] font-black  px-2 py-0.5 rounded-md">
                                            {inst.instituteName}
                                        </Badge>
                                    ))}
                                    {institutes.filter(inst => inst.assignedTemplate === t.id).length === 0 && (
                                        <span className="text-[9px] font-bold text-zinc-300 italic ">NOT ASSIGNED</span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge className="bg-zinc-50 text-amber-600 border-none text-[9px] font-black">{t.fields?.length || 0} FIELDS</Badge>
                            </div>
                        </div>
                    </Card>
                ))}
                {!isLoading && templates.length === 0 && (
                    <div className="col-span-full py-20 text-center border-2 border-dashed border-zinc-100 rounded-[40px] text-zinc-200 font-black  italic">
                        NO GLOBAL TEMPLATES RECORDED
                    </div>
                )}
            </div>
        </div>
      ) : (
        <Card className="border-none shadow-2xl rounded-[40px] bg-white overflow-hidden">
            <div className="p-10 border-b border-zinc-50 flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                     <h3 className="text-xl font-black text-black flex items-center gap-3">
                        ASSIGNMENT MATRIX
                        <Badge className="bg-emerald-50 text-emerald-600 border-none text-[9px] font-black ">LIVE SYNC</Badge>
                     </h3>
                     <p className="text-zinc-400 font-bold text-[11px]  mt-1 ">DISTRIBUTE CUSTOM FRAMES TO NODES</p>
                </div>
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-3.5 w-4 h-4 text-zinc-300" />
                    <Input 
                        placeholder="SEARCH INSTITUTE..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-12 h-12 rounded-2xl bg-zinc-50 border-none font-bold placeholder:text-zinc-300 shadow-inner"
                    />
                </div>
            </div>

            <div className="overflow-x-auto min-h-[400px]">
                <Table>
                    <TableHeader className="bg-zinc-50/50">
                        <TableRow className="border-zinc-50">
                            <TableHead className="pl-10 h-16 text-[11px] font-black  text-zinc-400">NODE NAME</TableHead>
                            <TableHead className="h-16 text-[11px] font-black  text-zinc-400">ASSIGNED TEMPLATE</TableHead>
                            <TableHead className="h-16 text-right pr-10 text-[11px] font-black  text-zinc-400">ACTIONS</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredInstitutes.map((inst) => (
                            <TableRow key={inst.id} className="border-zinc-50 hover:bg-zinc-50/50 transition-colors group">
                                <TableCell className="pl-10 py-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400 font-black shadow-inner shadow-black/5">
                                            {inst.instituteName?.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-[14px] font-black text-zinc-800">{inst.instituteName}</p>
                                            <p className="text-[10px] font-bold text-zinc-400 tracking-wider">UID: {inst.id?.substring(0, 12)}</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Select 
                                        value={inst.assignedTemplate} 
                                        onValueChange={(val) => handleAssignTemplate(inst.id, val)}
                                    >
                                        <SelectTrigger className="h-12 w-64 rounded-xl border-zinc-100 bg-white font-bold text-[13px] shadow-sm">
                                            <SelectValue placeholder="Standard Layout (Default)" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl shadow-2xl border-none">
                                            <SelectItem value="standard" className="font-bold text-zinc-400">Standard Layout (Default)</SelectItem>
                                            {templates.map(t => (
                                                <SelectItem key={t.id} value={t.id} className="font-bold">{t.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell className="text-right pr-10">
                                    {inst.assignedTemplate ? (
                                        <Badge className="bg-amber-50 text-amber-600 border-none font-black text-[9px]  h-8 px-4 flex items-center gap-2 ml-auto w-fit italic">
                                            <CheckCircle2 className="w-3 h-3" /> CUSTOM DESIGN ACTIVE
                                        </Badge>
                                    ) : (
                                        <span className="text-[10px] font-bold text-zinc-300 italic ">USING SYSTEM DEFAULT</span>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </Card>
      )}

      {/* Configuration Modal */}
      <Dialog open={isConfigModalOpen} onOpenChange={setIsConfigModalOpen}>
        <DialogContent className="max-w-[90vw] w-full h-[90vh] p-0 border-none rounded-[40px] overflow-y-auto bg-white shadow-2xl flex flex-col">
            <div className="bg-black px-10 py-6 flex items-center justify-between shrink-0">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black text-white flex items-center gap-3">
                        TEMPLATE ENGINE
                        <Badge className="bg-amber-500 text-black border-none text-[9px] font-black">STAGING</Badge>
                    </DialogTitle>
                </DialogHeader>
                <DialogClose asChild>
                    <Button variant="ghost" className="h-10 w-10 p-0 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800">
                        <Plus className="w-6 h-6 rotate-45" />
                    </Button>
                </DialogClose>
            </div>
            <div className="flex-1 overflow-y-auto p-10 bg-zinc-50">
                <CertificateConfigurator 
                    templateId={selectedTemplateId || undefined} 
                    onSaveComplete={() => setIsConfigModalOpen(false)}
                />
            </div>
        </DialogContent>
      </Dialog>

    </main>
  )

  return (
    <div className="min-h-screen bg-white">
      {mainContent}
    </div>
  )
}
