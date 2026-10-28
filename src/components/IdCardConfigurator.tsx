"use client"

import { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Upload, Plus, Save, Trash2, IdCard, Loader2, GripHorizontal } from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref as dbRef, onValue, off, update } from "firebase/database"
import { uploadFileToImageKit } from "@/lib/imagekit"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export type IdCardField = {
  id: string
  key: string
  label: string
  type: 'text' | 'image' | 'qr'
  x: number // percentage
  y: number // percentage
  width?: number // percentage
  height?: number // percentage
  fontSize?: number // px
  color?: string
  fontWeight?: string
}

const AVAILABLE_VARIABLES = [
  { key: 'studentName', label: 'Student Name', type: 'text' },
  { key: 'admissionNo', label: 'Admission No / ID', type: 'text' },
  { key: 'course', label: 'Course', type: 'text' },
  { key: 'dob', label: 'Date of Birth', type: 'text' },
  { key: 'bloodGroup', label: 'Blood Group', type: 'text' },
  { key: 'phone', label: 'Phone Number', type: 'text' },
  { key: 'address', label: 'Address', type: 'text' },
  { key: 'photo', label: 'Student Photo', type: 'image' },
  { key: 'qrCode', label: 'QR Code', type: 'qr' },
]

export function IdCardConfigurator({ instituteId }: { instituteId?: string }) {
  const { database, storage } = useFirebase()
  const { user } = useUser()
  
  const targetId = instituteId || user?.uid
  
  const [frameUrl, setFrameUrl] = useState<string>("")
  const [fields, setFields] = useState<IdCardField[]>([])
  
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const containerRef = useRef<HTMLDivElement>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  
  useEffect(() => {
    if (!database || !targetId) return
    const configPath = `Institutes/${targetId}/profile/idCardTemplate`
    const unsubscribe = onValue(dbRef(database, configPath), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        setFrameUrl(data.frameUrl || "")
        setFields(data.fields || [])
      }
      setIsLoading(false)
    })
    return () => off(dbRef(database, configPath))
  }, [database, user])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !targetId) return
    
    // Check file size (5MB max)
    const sizeKB = file.size / 1024
    if (sizeKB > 5 * 1024) {
      toast({ variant: "destructive", title: "File Too Large", description: "ID card frame must be less than 5MB." })
      return
    }

    setIsUploading(true)
    try {
      const res = await uploadFileToImageKit(file, `/id-cards/${targetId}`)
      setFrameUrl(res.url)
      toast({ title: "Frame Uploaded Successfully", description: "Stored in ImageKit." })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Upload Failed", description: error.message || "Failed to upload to ImageKit" })
    } finally {
      setIsUploading(false)
    }
  }

  const handleAddField = (variableKey: string) => {
    const variableDef = AVAILABLE_VARIABLES.find(v => v.key === variableKey)
    if (!variableDef) return
    
    // Check if already exists (usually we want only 1 mapping per variable)
    if (fields.some(f => f.key === variableKey)) {
      toast({ title: "Duplicate Variable", description: "This variable is already mapped.", variant: "destructive" })
      return
    }

    const newField: IdCardField = {
      id: `field_${Date.now()}`,
      key: variableDef.key,
      label: variableDef.label,
      type: variableDef.type as any,
      x: 10,
      y: 10,
      width: variableDef.type === 'image' || variableDef.type === 'qr' ? 25 : undefined,
      height: variableDef.type === 'image' || variableDef.type === 'qr' ? 30 : undefined,
      fontSize: 14,
      color: '#000000',
      fontWeight: 'bold'
    }

    setFields([...fields, newField])
  }

  const handleRemoveField = (id: string) => {
    setFields(fields.filter(f => f.id !== id))
  }

  const handleSaveConfig = async () => {
    if (!database || !targetId) return
    setIsSaving(true)
    try {
      const configPath = `Institutes/${targetId}/profile/idCardTemplate`
      await update(dbRef(database, configPath), {
        frameUrl,
        fields,
        updatedAt: Date.now()
      })
      toast({ title: "ID Card Configuration Saved" })
    } catch (e) {
      toast({ variant: "destructive", title: "Save Failed" })
    } finally {
      setIsSaving(false)
    }
  }

  // Handle Dragging
  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    e.preventDefault()
    setDraggingId(id)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingId || !containerRef.current) return
    
    const containerRect = containerRef.current.getBoundingClientRect()
    
    // Calculate new position as percentage
    let newX = ((e.clientX - containerRect.left) / containerRect.width) * 100
    let newY = ((e.clientY - containerRect.top) / containerRect.height) * 100
    
    // Clamp to bounds
    newX = Math.max(0, Math.min(100, newX))
    newY = Math.max(0, Math.min(100, newY))

    setFields(fields.map(f => {
      if (f.id === draggingId) {
        return { ...f, x: newX, y: newY }
      }
      return f
    }))
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingId) {
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
      setDraggingId(null)
    }
  }

  if (isLoading) return <div className="p-8 text-center text-black font-bold animate-pulse">Loading Configurator...</div>

  return (
    <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white overflow-hidden font-public-sans">
      <div className="bg-zinc-50 px-10 py-6 border-b border-zinc-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <IdCard className="w-5 h-5 text-indigo-600" />
          <h3 className="font-black text-black text-[14px] tracking-widest">ID Card Frame Configurator</h3>
        </div>
        <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 border-none font-bold tracking-widest text-[9px]">Map Dynamics</Badge>
      </div>

      <div className="p-10 space-y-10">
        
        {/* Step 1: Upload Frame */}
        <div className="space-y-4">
          <Label className="text-[10px] font-black text-black tracking-[0.2em]">Step 1: Upload Blank Template</Label>
          <div className="flex items-center gap-6">
            <div className="relative group">
              <Button asChild disabled={isUploading} className="bg-white border border-zinc-200 text-black hover:bg-zinc-50 rounded-xl h-12 px-6 font-bold text-[10px] tracking-widest shadow-sm">
                <label className="cursor-pointer">
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                  {frameUrl ? 'Change Template (Max 1MB)' : 'Upload Vertical Frame (Max 1MB)'}
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                </label>
              </Button>
            </div>
            {frameUrl && <Button onClick={() => setFrameUrl("")} variant="ghost" className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 h-12 text-[10px] tracking-widest font-black rounded-xl">Remove Frame</Button>}
          </div>
        </div>

        {/* Step 2: Map Variables */}
        {frameUrl && (
          <div className="space-y-6 pt-6 border-t border-zinc-50">
            <Label className="text-[10px] font-black text-black tracking-[0.2em]">Step 2: Map Dynamic Fields</Label>
            
            <div className="flex flex-col xl:flex-row gap-10">
              
              {/* Mapping Canvas */}
              <div className="flex-1 bg-zinc-50/50 p-6 flex justify-center rounded-[32px] border border-zinc-100 shadow-inner overflow-hidden">
                <div 
                  ref={containerRef}
                  className="relative w-full max-w-[320px] aspect-[2/3] bg-white rounded-xl shadow-lg border border-zinc-200 overflow-hidden"
                  onPointerMove={handlePointerMove}
                >
                  <img src={frameUrl} alt="ID Frame" className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none" />
                  
                  {fields.map(field => (
                    <div
                      key={field.id}
                      onPointerDown={(e) => handlePointerDown(e, field.id)}
                      onPointerUp={handlePointerUp}
                      style={{
                        left: `${field.x}%`,
                        top: `${field.y}%`,
                        color: field.color || '#000',
                        fontSize: field.type === 'text' ? `${field.fontSize || 14}px` : undefined,
                        fontWeight: field.fontWeight || 'bold',
                        minWidth: field.type === 'text' ? undefined : `${field.width || 25}%`,
                        minHeight: field.type === 'text' ? undefined : `${field.height || 30}%`,
                        width: field.type === 'text' ? undefined : `${field.width || 25}%`,
                        height: field.type === 'text' ? undefined : `${field.height || 30}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      className={cn(
                        "absolute cursor-move select-none flex items-center justify-center p-1 rounded transition-shadow touch-none whitespace-nowrap",
                        draggingId === field.id ? "ring-2 ring-primary bg-primary/10 shadow-lg z-50" : "hover:ring-1 hover:ring-zinc-400 z-10",
                        field.type !== 'text' && "bg-black/10 border-2 border-dashed border-zinc-400"
                      )}
                    >
                      {field.type === 'text' ? `{${field.key}}` : `[${field.label}]`}
                    </div>
                  ))}
                </div>
              </div>

              {/* Field Controls */}
              <div className="w-full xl:w-[450px] space-y-6">
                <div className="flex items-center gap-3">
                  <Select onValueChange={(val) => handleAddField(val)}>
                    <SelectTrigger className="h-12 bg-white font-bold border-zinc-200 rounded-xl flex-1">
                      <SelectValue placeholder="Add new variable to map..." />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_VARIABLES.filter(v => !fields.some(f => f.key === v.key)).map(v => (
                        <SelectItem key={v.key} value={v.key} className="font-bold">{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
                  {fields.length === 0 && (
                    <div className="text-center p-6 border-2 border-dashed border-zinc-100 rounded-2xl text-[10px] font-bold tracking-widest text-black">
                      No variables mapped yet
                    </div>
                  )}
                  {fields.map((field) => (
                    <div key={field.id} className="p-4 bg-white border border-zinc-200 rounded-2xl shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-zinc-50 pb-2">
                        <div className="flex items-center gap-2">
                          <GripHorizontal className="w-4 h-4 text-zinc-300" />
                          <span className="text-[11px] font-black text-black tracking-wide">{field.label} <span className="text-primary font-public-sans ml-1">({field.x.toFixed(0)}%, {field.y.toFixed(0)}%)</span></span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveField(field.id)} className="h-6 w-6 text-rose-500 hover:bg-rose-50">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      {field.type === 'text' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-[9px] font-black tracking-widest text-black">Font Size (px)</Label>
                            <input 
                              type="number" 
                              value={field.fontSize} 
                              onChange={(e) => setFields(fields.map(f => f.id === field.id ? { ...f, fontSize: Number(e.target.value) } : f))}
                              className="w-full h-10 border border-zinc-200 rounded-lg px-3 text-[14px] font-bold"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[9px] font-black tracking-widest text-black">Color (Hex)</Label>
                            <div className="flex items-center gap-2 h-10 border border-zinc-200 rounded-lg px-2">
                              <input type="color" value={field.color} onChange={(e) => setFields(fields.map(f => f.id === field.id ? { ...f, color: e.target.value } : f))} className="w-6 h-6 rounded cursor-pointer border-none bg-transparent" />
                              <input type="text" value={field.color} onChange={(e) => setFields(fields.map(f => f.id === field.id ? { ...f, color: e.target.value } : f))} className="w-full text-[14px] font-bold border-none outline-none" />
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {(field.type === 'image' || field.type === 'qr') && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-[9px] font-black tracking-widest text-black">Width (%)</Label>
                            <input 
                              type="number" 
                              value={field.width} 
                              onChange={(e) => setFields(fields.map(f => f.id === field.id ? { ...f, width: Number(e.target.value) } : f))}
                              className="w-full h-10 border border-zinc-200 rounded-lg px-3 text-[14px] font-bold"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[9px] font-black tracking-widest text-black">Height (%)</Label>
                            <input 
                              type="number" 
                              value={field.height} 
                              onChange={(e) => setFields(fields.map(f => f.id === field.id ? { ...f, height: Number(e.target.value) } : f))}
                              className="w-full h-10 border border-zinc-200 rounded-lg px-3 text-[14px] font-bold"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <Button onClick={handleSaveConfig} disabled={isSaving} className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black tracking-widest text-[11px] shadow-lg border-none active:scale-95 transition-all">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Save ID Card Frame
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
