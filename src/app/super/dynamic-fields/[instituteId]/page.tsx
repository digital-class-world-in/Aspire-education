"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, Settings, Trash2, Edit, Save, Loader2, ShieldCheck, Database, FileText } from "lucide-react"
import { useFirebase } from "@/firebase"
import { ref, onValue, off, update, remove, get } from "firebase/database"
import { toast } from "@/hooks/use-toast"
import { DEFAULT_DYNAMIC_FIELDS, DynamicField } from "@/lib/default-dynamic-fields"
import { cn } from "@/lib/utils"

const MODULES = [
  { 
    id: "front_office", 
    label: "Front Office",
    submodules: [
      { id: "admission_enquiry", label: "Admission Enquiry" },
      { id: "visitor_books", label: "Visitor Books" },
      { id: "phone_calls_logs", label: "Phone Call Logs" },
      { id: "complains", label: "Complaints" },
      { id: "postal_service", label: "Postal Service" },
    ]
  },
  { 
    id: "student_info", 
    label: "Student Info",
    submodules: [
      { id: "student_admission", label: "Student Admission" }
    ]
  }
]

const FIELD_TYPES = [
  { value: "text", label: "Text (Short)" },
  { value: "textarea", label: "Textarea (Long)" },
  { value: "number", label: "Number" },
  { value: "email", label: "Email" },
  { value: "tel", label: "Phone Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Dropdown Select" },
  { value: "checkbox", label: "Checkbox (Yes/No)" }
]

export default function InstituteDynamicFieldsPage() {
  const { instituteId } = useParams()
  const router = useRouter()
  const { database } = useFirebase()

  const [instituteDetails, setInstituteDetails] = useState<any>(null)
  const [selectedModule, setSelectedModule] = useState("front_office")
  const [selectedSubmodule, setSelectedSubmodule] = useState("admission_enquiry")
  
  const [customFields, setCustomFields] = useState<DynamicField[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    label: "",
    type: "text",
    required: false,
    options: "" // comma separated for select
  })
  const [isSaving, setIsSaving] = useState(false)

  // Fetch institute and fields
  useEffect(() => {
    if (!database || !instituteId) return
    
    // Get institute info
    get(ref(database, `Institutes/${instituteId}/profile`)).then(snap => {
      if (snap.exists()) setInstituteDetails(snap.val())
    })

    const customFieldsRef = ref(database, `Institutes/${instituteId}/dynamicFields/${selectedModule}/${selectedSubmodule}`)
    
    const unsubscribe = onValue(customFieldsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        const customParsed = Object.keys(data).map(key => ({
          id: key,
          ...data[key],
          isDefault: false
        }))
        setCustomFields(customParsed)
      } else {
        setCustomFields([])
      }
      setIsLoading(false)
    })

    return () => off(customFieldsRef)
  }, [database, instituteId, selectedModule, selectedSubmodule])

  // Combine Default System Fields + Custom Fields
  const systemFields = DEFAULT_DYNAMIC_FIELDS[selectedModule]?.[selectedSubmodule] || []
  const allFields = [...systemFields, ...customFields]

  const handleOpenModal = (field?: DynamicField) => {
    if (field) {
      if (field.isDefault) {
        toast({ title: "System Field", description: "Default system fields cannot be edited.", variant: "destructive" })
        return
      }
      setEditingFieldId(field.id)
      setFormData({
        label: field.label,
        type: field.type,
        required: field.required || false,
        options: field.options ? field.options.join(", ") : ""
      })
    } else {
      setEditingFieldId(null)
      setFormData({ label: "", type: "text", required: false, options: "" })
    }
    setIsModalOpen(true)
  }

  const handleSaveField = async () => {
    if (!database || !instituteId) return
    if (!formData.label.trim()) {
      toast({ title: "Validation Error", description: "Field label is required.", variant: "destructive" })
      return
    }

    setIsSaving(true)
    try {
      let fieldId = editingFieldId
      if (!fieldId) {
        // Generate camelCase ID from label e.g., "Parent Phone" -> "parentPhone"
        fieldId = formData.label
          .toLowerCase()
          .replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase())
          .replace(/[^a-zA-Z0-9]/g, "")
          + "_" + Date.now().toString().slice(-4)
      }

      const payload: any = {
        label: formData.label,
        type: formData.type,
        required: formData.required,
        updatedAt: Date.now()
      }

      if (formData.type === 'select' && formData.options.trim()) {
        payload.options = formData.options.split(",").map(s => s.trim()).filter(Boolean)
      } else {
        payload.options = null // Clear options if not select
      }

      const path = `Institutes/${instituteId}/dynamicFields/${selectedModule}/${selectedSubmodule}/${fieldId}`
      await update(ref(database), { [path]: payload })
      
      toast({ title: "Field Saved", description: `Field ${formData.label} has been saved.` })
      setIsModalOpen(false)
    } catch (e) {
      toast({ title: "Error", description: "Could not save field", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteField = async (field: DynamicField) => {
    if (!database || !instituteId) return
    if (field.isDefault) {
      toast({ title: "Prohibited", description: "Default system fields cannot be deleted.", variant: "destructive" })
      return
    }
    
    if (confirm(`Are you sure you want to delete the custom field "${field.label}"?`)) {
      try {
        await remove(ref(database, `Institutes/${instituteId}/dynamicFields/${selectedModule}/${selectedSubmodule}/${field.id}`))
        toast({ title: "Field Deleted" })
      } catch (e) {
        toast({ title: "Error", description: "Could not delete field", variant: "destructive" })
      }
    }
  }

  return (
    <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-500 max-w-7xl mx-auto w-full pb-32">
      <div className="flex items-center gap-6 border-b border-zinc-100 pb-6">
        <Button variant="ghost" onClick={() => router.back()} className="h-10 w-10 p-0 rounded-xl bg-white border border-zinc-200 shadow-sm">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-black text-black tracking-tight">Dynamic Configurator</h2>
          <p className="text-[14px] font-bold text-black tracking-widest mt-1">Tenant: {instituteDetails?.instituteName || instituteId}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Selector */}
        <Card className="lg:col-span-1 border border-zinc-200 shadow-sm bg-white p-6 space-y-6 self-start sticky top-6">
          <div className="flex items-center gap-3 border-b border-zinc-50 pb-4">
             <Database className="w-5 h-5 text-primary" />
             <h3 className="font-black text-[14px] text-black tracking-widest">Select Hierarchy</h3>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-black tracking-widest ml-1">Module</Label>
              <Select value={selectedModule} onValueChange={(val) => {
                setSelectedModule(val)
                const firstSub = MODULES.find(m => m.id === val)?.submodules?.[0]?.id
                if (firstSub) setSelectedSubmodule(firstSub)
              }}>
                <SelectTrigger className="w-full h-12 bg-zinc-50 font-bold border-zinc-200 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODULES.map(m => (
                    <SelectItem key={m.id} value={m.id} className="font-bold">{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black text-black tracking-widest ml-1">Submodule</Label>
              <Select value={selectedSubmodule} onValueChange={setSelectedSubmodule}>
                <SelectTrigger className="w-full h-12 bg-zinc-50 font-bold border-zinc-200 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODULES.find(m => m.id === selectedModule)?.submodules?.map(sub => (
                    <SelectItem key={sub.id} value={sub.id} className="font-bold">{sub.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Board */}
        <div className="lg:col-span-3 space-y-8">
          <Card className="border border-zinc-200 shadow-sm bg-white overflow-hidden">
            <div className="flex items-center justify-between p-6 bg-zinc-50 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="text-[14px] font-black text-black tracking-widest">Form Structure</h3>
              </div>
              <Button onClick={() => handleOpenModal()} className="h-10 px-4 rounded-xl font-bold text-[10px] tracking-widest gap-2">
                <Plus className="w-4 h-4" /> Add Custom Field
              </Button>
            </div>
            
            {isLoading ? (
              <div className="p-20 text-center font-bold text-black tracking-widest text-[14px]">Fetching Schema...</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-zinc-50/50 hover:bg-zinc-50/50">
                      <TableHead className="text-[10px] font-black text-black tracking-widest pl-8 w-1/3">Field Label</TableHead>
                      <TableHead className="text-[10px] font-black text-black tracking-widest w-1/4">Type</TableHead>
                      <TableHead className="text-[10px] font-black text-black tracking-widest w-1/6">Origin</TableHead>
                      <TableHead className="text-right text-[10px] font-black text-black tracking-widest pr-8">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allFields.map((field, idx) => (
                      <TableRow key={field.id} className={cn("border-b border-zinc-50 group transition-colors", field.isDefault ? "bg-zinc-50/30" : "hover:bg-zinc-50/80")}>
                        <TableCell className="pl-8">
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-bold text-black">{field.label}</span>
                            {field.required && <span className="text-rose-500 font-black text-lg leading-none">*</span>}
                          </div>
                          {field.options && field.options.length > 0 && field.type === 'select' && (
                            <p className="text-[10px] font-medium text-black mt-1 max-w-[200px] truncate">Options: {field.options.join(", ")}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-bold tracking-widest bg-white">
                            {FIELD_TYPES.find(t => t.value === field.type)?.label || field.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {field.isDefault ? (
                            <Badge className="bg-emerald-50 text-emerald-600 border-none shadow-none text-[9px] font-black px-2 py-0.5">System Core</Badge>
                          ) : (
                            <Badge className="bg-primary/10 text-primary border-none shadow-none text-[9px] font-black px-2 py-0.5">Custom Appended</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          {field.isDefault ? (
                            <ShieldCheck className="w-4 h-4 text-emerald-600 ml-auto mr-4 opacity-50" />
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <Button 
                                onClick={() => handleOpenModal(field)} 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-primary hover:bg-primary/10"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                onClick={() => handleDeleteField(field)} 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-rose-500 hover:bg-rose-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {allFields.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-10 font-bold text-black text-[14px] tracking-widest">
                          No fields defined for this module
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md bg-white border-none shadow-2xl rounded-3xl p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              {editingFieldId ? "Edit Custom Field" : "Create Custom Field"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-black tracking-widest ml-1">Field Label (Visible Name)</Label>
              <Input 
                value={formData.label} 
                onChange={e => setFormData(prev => ({ ...prev, label: e.target.value }))} 
                className="h-12 bg-zinc-50 border-zinc-200 font-bold rounded-xl"
                placeholder="e.g. Reference Code"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-black tracking-widest ml-1">Input Type</Label>
              <Select value={formData.type} onValueChange={v => setFormData(prev => ({ ...prev, type: v }))}>
                <SelectTrigger className="h-12 bg-zinc-50 border-zinc-200 font-bold rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value} className="font-bold">{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.type === 'select' && (
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-black tracking-widest ml-1">Dropdown Options</Label>
                <Input 
                  value={formData.options} 
                  onChange={e => setFormData(prev => ({ ...prev, options: e.target.value }))} 
                  className="h-12 bg-zinc-50 border-zinc-200 font-bold rounded-xl"
                  placeholder="Option 1, Option 2, Option 3 (comma separated)"
                />
              </div>
            )}

            <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
              <div>
                <p className="text-[14px] font-black text-black">Make Required</p>
                <p className="text-[10px] font-bold text-black tracking-widest">Mandatory for form submission</p>
              </div>
              <Switch 
                checked={formData.required}
                onCheckedChange={v => setFormData(prev => ({ ...prev, required: v }))}
                className="data-[state=checked]:bg-rose-500"
              />
            </div>

            <Button onClick={handleSaveField} disabled={isSaving} className="w-full h-14 bg-primary text-white rounded-xl font-black tracking-widest text-[11px] shadow-lg border-none hover:opacity-90 transition-all">
               {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
               Commit Schema
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}
