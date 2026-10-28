"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  Trash2,
  Edit,
  PlayCircle,
  Video,
  Layers,
  Building2,
  Save,
  X,
  PlusCircle,
  MinusCircle,
  ExternalLink,
  ChevronRight,
  MoreVertical,
  Search,
  Check
} from "lucide-react"
import { useFirebase } from "@/firebase"
import { ref, onValue, off, remove, update, push, set } from "firebase/database"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"

interface VideoEntry {
  title: string
  url: string
}

interface StepEntry {
  title: string
  videos: VideoEntry[]
}

interface TrainingModule {
  id: string
  title: string
  assignedInstitutes: string[]
  steps: StepEntry[]
  createdAt: string
  updatedAt: string
}

export default function TrainingVideosPage() {
  const { database } = useFirebase()
  const [modules, setModules] = useState<TrainingModule[]>([])
  const [institutes, setInstitutes] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  // Form State
  const [editingModule, setEditingModule] = useState<Partial<TrainingModule> | null>(null)

  useEffect(() => {
    if (!database) return

    // Fetch Training Modules
    const modulesRef = ref(database, 'TrainingVideos')
    onValue(modulesRef, (snapshot) => {
      const data = snapshot.val() || {}
      const list = Object.keys(data).map(k => ({
        ...data[k],
        id: k
      }))
      setModules(list)
      setIsLoading(false)
    })

    // Fetch Institutes for assignment
    const instRef = ref(database, 'Institutes')
    onValue(instRef, (snapshot) => {
      const data = snapshot.val() || {}
      const list = Object.keys(data).map(k => ({
        id: k,
        name: data[k].profile?.instituteName || "Unnamed Institute"
      }))
      setInstitutes(list)
    })

    return () => {
      off(modulesRef)
      off(instRef)
    }
  }, [database])

  const handleOpenCreate = () => {
    setEditingModule({
      title: "",
      assignedInstitutes: [],
      steps: [
        {
          title: "Step 1",
          videos: [{ title: "", url: "" }]
        }
      ]
    })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (mod: TrainingModule) => {
    setEditingModule({ ...mod })
    setIsModalOpen(true)
  }

  const handleAddStep = () => {
    if (!editingModule) return
    const steps = [...(editingModule.steps || [])]
    steps.push({
      title: `Step ${steps.length + 1}`,
      videos: [{ title: "", url: "" }]
    })
    setEditingModule({ ...editingModule, steps })
  }

  const handleRemoveStep = (idx: number) => {
    if (!editingModule) return
    const steps = editingModule.steps?.filter((_, i) => i !== idx)
    setEditingModule({ ...editingModule, steps })
  }

  const handleAddVideo = (stepIdx: number) => {
    if (!editingModule) return
    const steps = [...(editingModule.steps || [])]
    steps[stepIdx].videos.push({ title: "", url: "" })
    setEditingModule({ ...editingModule, steps })
  }

  const handleRemoveVideo = (stepIdx: number, videoIdx: number) => {
    if (!editingModule) return
    const steps = [...(editingModule.steps || [])]
    steps[stepIdx].videos = steps[stepIdx].videos.filter((_, i) => i !== videoIdx)
    setEditingModule({ ...editingModule, steps })
  }

  const handleSave = async () => {
    if (!database || !editingModule) return
    if (!editingModule.title) {
      toast({ variant: "destructive", title: "Missing Title", description: "Please enter a module title." })
      return
    }

    setIsProcessing(true)
    try {
      const now = new Date().toISOString()
      const data = {
        ...editingModule,
        updatedAt: now,
        createdAt: editingModule.createdAt || now
      }

      if (editingModule.id) {
        await set(ref(database, `TrainingVideos/${editingModule.id}`), data)
      } else {
        const newRef = push(ref(database, 'TrainingVideos'))
        await set(newRef, { ...data, id: newRef.key })
      }

      toast({ title: "Module Saved", description: "Training module has been updated successfully." })
      setIsModalOpen(false)
    } catch (e) {
      console.error(e)
      toast({ variant: "destructive", title: "Save Failed", description: "There was an error saving the module." })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!database) return
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return

    try {
      await remove(ref(database, `TrainingVideos/${id}`))
      toast({ title: "Module Deleted", description: "Training module removed successfully." })
    } catch (e) {
      toast({ variant: "destructive", title: "Delete Failed" })
    }
  }

  const filtered = modules.filter(m => 
    m.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const toggleInstitute = (instId: string) => {
    if (!editingModule) return
    const current = editingModule.assignedInstitutes || []
    if (current.includes(instId)) {
      setEditingModule({
        ...editingModule,
        assignedInstitutes: current.filter(id => id !== instId)
      })
    } else {
      setEditingModule({
        ...editingModule,
        assignedInstitutes: [...current, instId]
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 font-public-sans">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Training Modules</h1>
          <p className="text-slate-500 font-medium">Create and assign training video series for institutes.</p>
        </div>
        <Button onClick={handleOpenCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 h-12 shadow-lg shadow-indigo-100 transition-all active:scale-95 gap-2">
          <PlusCircle className="w-5 h-5" />
          Create New Module
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search modules..."
              className="pl-10 h-10 rounded-xl border-slate-200 bg-white"
            />
          </div>
        </div>
        <Table>
          <TableHeader className="bg-slate-50/80">
            <TableRow>
              <TableHead className="font-bold text-slate-800">Module Title</TableHead>
              <TableHead className="font-bold text-slate-800">Steps</TableHead>
              <TableHead className="font-bold text-slate-800">Assigned Institutes</TableHead>
              <TableHead className="font-bold text-slate-800">Created At</TableHead>
              <TableHead className="text-right font-bold text-slate-800">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-slate-400 font-medium">
                  No training modules found.
                </TableCell>
              </TableRow>
            ) : filtered.map((mod) => (
              <TableRow key={mod.id} className="group hover:bg-slate-50 transition-colors">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
                      <PlayCircle className="w-6 h-6" />
                    </div>
                    <span className="font-semibold text-slate-900">{mod.title}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-none font-bold">
                    {mod.steps?.length || 0} Steps
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-none font-bold">
                    {mod.assignedInstitutes?.length || 0} Institutes
                  </Badge>
                </TableCell>
                <TableCell className="text-slate-500 font-medium whitespace-nowrap">
                  {new Date(mod.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(mod)} className="h-9 w-9 rounded-lg text-blue-600 hover:bg-blue-50">
                      <Edit className="w-4.5 h-4.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(mod.id, mod.title)} className="h-9 w-9 rounded-lg text-rose-600 hover:bg-rose-50">
                      <Trash2 className="w-4.5 h-4.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-y-auto rounded-[24px] border-slate-200">
          <DialogHeader className="p-6 border-b border-slate-100 bg-white sticky top-0 z-10">
            <DialogTitle className="text-2xl font-bold text-slate-900">{editingModule?.id ? "Edit Training Module" : "Create Training Module"}</DialogTitle>
            <DialogDescription>Setup your training steps and assign them to institutes.</DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-8">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <Label className="text-sm font-bold text-slate-900">Module Title</Label>
                  <Input 
                    value={editingModule?.title}
                    onChange={e => setEditingModule(prev => ({ ...prev!, title: e.target.value }))}
                    placeholder="e.g. ERP Onboarding Guide"
                    className="h-12 rounded-xl border-slate-200 bg-slate-50 focus:bg-white transition-all"
                  />
                  
                  <div className="space-y-4 pt-4">
                    <Label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                       <Building2 className="w-4 h-4 text-indigo-500" />
                       Assign to Institutes
                    </Label>
                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                       <div className="bg-slate-50 p-3 border-b border-slate-200">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Institutes</p>
                       </div>
                       <ScrollArea className="h-[200px] p-2">
                          <div className="space-y-1">
                             {institutes.map((inst) => (
                                <div 
                                   key={inst.id} 
                                   onClick={() => toggleInstitute(inst.id)}
                                   className={cn(
                                      "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all",
                                      editingModule?.assignedInstitutes?.includes(inst.id) 
                                         ? "bg-indigo-50 text-indigo-700" 
                                         : "hover:bg-slate-50 text-slate-600"
                                   )}
                                >
                                   <div className={cn(
                                      "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                                      editingModule?.assignedInstitutes?.includes(inst.id)
                                         ? "bg-indigo-600 border-indigo-600"
                                         : "border-slate-300 bg-white"
                                   )}>
                                      {editingModule?.assignedInstitutes?.includes(inst.id) && <Check className="w-3.5 h-3.5 text-white" />}
                                   </div>
                                   <span className="text-sm font-semibold">{inst.name}</span>
                                </div>
                             ))}
                          </div>
                       </ScrollArea>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200">
                   <div className="flex items-center gap-3 mb-4 text-indigo-600">
                      <PlayCircle className="w-6 h-6" />
                      <h3 className="font-bold">Summary</h3>
                   </div>
                   <div className="space-y-3">
                      <div className="flex justify-between text-sm py-2 border-b border-slate-200/60">
                         <span className="text-slate-500 font-medium">Total Steps</span>
                         <span className="font-bold text-slate-900">{editingModule?.steps?.length || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm py-2 border-b border-slate-200/60">
                         <span className="text-slate-500 font-medium">Total Videos</span>
                         <span className="font-bold text-slate-900">
                            {editingModule?.steps?.reduce((acc, s) => acc + (s.videos?.length || 0), 0) || 0}
                         </span>
                      </div>
                      <div className="flex justify-between text-sm py-2">
                         <span className="text-slate-500 font-medium">Assigned To</span>
                         <span className="font-bold text-slate-900">{editingModule?.assignedInstitutes?.length || 0} Institutes</span>
                      </div>
                   </div>
                </div>
              </div>

              {/* Steps Management */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-indigo-500" />
                    Training Steps
                  </h3>
                  <Button type="button" onClick={handleAddStep} variant="outline" className="rounded-xl border-dashed border-2 hover:border-indigo-500 hover:bg-indigo-50 transition-all font-bold gap-2">
                    <Plus className="w-4 h-4" /> Add Next Step
                  </Button>
                </div>

                <div className="space-y-4">
                  {editingModule?.steps?.map((step, sIdx) => (
                    <Card key={sIdx} className="border-slate-200 rounded-[20px] overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <div className="bg-slate-50 p-4 flex items-center justify-between border-b border-slate-100">
                        <div className="flex items-center gap-4 flex-1 max-w-md">
                           <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                              {sIdx + 1}
                           </div>
                           <Input 
                              value={step.title}
                              onChange={e => {
                                const steps = [...editingModule.steps!]
                                steps[sIdx].title = e.target.value
                                setEditingModule({ ...editingModule, steps })
                              }}
                              className="h-9 rounded-lg border-slate-200 font-bold text-sm bg-white"
                              placeholder={`Step ${sIdx + 1} Title`}
                           />
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveStep(sIdx)} className="text-rose-500 hover:bg-rose-50 rounded-xl h-9 w-9">
                          <Trash2 className="w-4.5 h-4.5" />
                        </Button>
                      </div>
                      <CardContent className="p-6 space-y-4 bg-white">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {step.videos.map((vid, vIdx) => (
                               <div key={vIdx} className="group relative bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                                  <div className="flex items-center justify-between">
                                     <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
                                        <Video className="w-3.5 h-3.5" /> Video {vIdx + 1}
                                     </span>
                                     <button onClick={() => handleRemoveVideo(sIdx, vIdx)} className="text-slate-400 hover:text-rose-500 transition-colors">
                                        <MinusCircle className="w-4 h-4" />
                                     </button>
                                  </div>
                                  <div className="space-y-2">
                                     <Input 
                                        value={vid.title}
                                        onChange={e => {
                                           const steps = [...editingModule.steps!]
                                           steps[sIdx].videos[vIdx].title = e.target.value
                                           setEditingModule({ ...editingModule, steps })
                                        }}
                                        placeholder="Video Title (e.g. Part 1: Getting Started)"
                                        className="h-9 rounded-lg border-slate-200 text-xs font-semibold bg-white"
                                     />
                                     <Input 
                                        value={vid.url}
                                        onChange={e => {
                                           const steps = [...editingModule.steps!]
                                           steps[sIdx].videos[vIdx].url = e.target.value
                                           setEditingModule({ ...editingModule, steps })
                                        }}
                                        placeholder="YouTube Link (e.g. https://youtube.com/watch?...)"
                                        className="h-9 rounded-lg border-slate-200 text-xs text-blue-600 bg-white"
                                     />
                                  </div>
                               </div>
                            ))}
                            <button 
                               onClick={() => handleAddVideo(sIdx)}
                               className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-2xl p-6 hover:bg-indigo-50/50 hover:border-indigo-300 group transition-all"
                            >
                               <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                                  <Plus className="w-5 h-5 text-slate-400 group-hover:text-indigo-600" />
                               </div>
                               <span className="text-xs font-bold text-slate-400 group-hover:text-indigo-600">Add More Video</span>
                            </button>
                         </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="p-6 bg-white border-t border-slate-100 sticky bottom-0 z-10">
             <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="rounded-xl px-8 h-12 font-bold text-slate-500">Cancel</Button>
             <Button 
                onClick={handleSave} 
                disabled={isProcessing}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-10 h-12 font-bold shadow-lg shadow-indigo-100 transition-all active:scale-95 gap-2"
             >
                {isProcessing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                {editingModule?.id ? "Sync Module" : "Deploy Module"}
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
